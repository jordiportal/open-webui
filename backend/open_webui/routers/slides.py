"""
Slides Router

Provides endpoints for converting HTML slides to PPTX format
and integrating with OnlyOffice Document Server.
"""

import logging
import uuid
import time
import io
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from open_webui.internal.db import get_session
from open_webui.models.files import Files, FileForm
from open_webui.storage.provider import Storage
from open_webui.utils.auth import get_verified_user
from open_webui.utils.slides_converter import html_to_pptx
from open_webui.utils.onlyoffice import (
    is_onlyoffice_enabled,
    generate_editor_config,
    process_callback,
    verify_callback_token,
)
from open_webui.config import WEBUI_URL

log = logging.getLogger(__name__)

router = APIRouter()


############################
# Request/Response Models
############################

class ConvertSlidesRequest(BaseModel):
    html: str
    title: str = "Presentation"


class ConvertSlidesResponse(BaseModel):
    file_id: str
    filename: str
    download_url: str


class OnlyOfficeConfigResponse(BaseModel):
    enabled: bool
    config: Optional[dict] = None
    onlyoffice_url: Optional[str] = None
    api_url: Optional[str] = None
    error: Optional[str] = None


class OnlyOfficeCallbackRequest(BaseModel):
    key: str
    status: int
    url: Optional[str] = None
    users: Optional[list] = None
    actions: Optional[list] = None
    token: Optional[str] = None


############################
# Endpoints
############################

@router.post("/convert", response_model=ConvertSlidesResponse)
async def convert_slides_to_pptx(
    request: ConvertSlidesRequest,
    user=Depends(get_verified_user),
    db: Session = Depends(get_session),
):
    """
    Convert HTML slides to PPTX format.
    
    Takes HTML content containing slide divs and converts them to a PowerPoint file.
    The file is stored and can be downloaded or opened in OnlyOffice.
    """
    try:
        # Generate PPTX from HTML
        pptx_bytes = html_to_pptx(request.html, request.title)
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        safe_title = "".join(c for c in request.title if c.isalnum() or c in (' ', '-', '_')).strip()
        if not safe_title:
            safe_title = "presentation"
        filename = f"{file_id}_{safe_title}.pptx"
        
        # Upload to storage
        file_stream = io.BytesIO(pptx_bytes)
        contents, file_path = Storage.upload_file(
            file_stream,
            filename,
            {
                "OpenWebUI-User-Email": user.email,
                "OpenWebUI-User-Id": user.id,
                "OpenWebUI-User-Name": user.name,
                "OpenWebUI-File-Id": file_id,
                "OpenWebUI-File-Type": "slides_export",
            },
        )
        
        # Create file record in database
        file_form = FileForm(
            id=file_id,
            filename=f"{safe_title}.pptx",
            path=file_path,
            data={
                "type": "slides_export",
                "source": "brain_artifact",
            },
            meta={
                "name": f"{safe_title}.pptx",
                "content_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "size": len(pptx_bytes),
            },
        )
        
        file_record = Files.insert_new_file(user.id, file_form, db=db)
        
        if not file_record:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create file record",
            )
        
        # Generate download URL
        download_url = f"/api/v1/slides/{file_id}/download"
        
        log.info(f"Created PPTX file: {filename} for user {user.id}")
        
        return ConvertSlidesResponse(
            file_id=file_id,
            filename=f"{safe_title}.pptx",
            download_url=download_url,
        )
        
    except Exception as e:
        log.error(f"Error converting slides to PPTX: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to convert slides: {str(e)}",
        )


@router.get("/{file_id}/download")
async def download_pptx(
    file_id: str,
    user=Depends(get_verified_user),
    db: Session = Depends(get_session),
):
    """
    Download a converted PPTX file.
    """
    # Get file record
    file_record = Files.get_file_by_id(file_id, db=db)
    
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    
    # Check ownership or admin
    if file_record.user_id != user.id and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    # Get file from storage
    try:
        file_path = Storage.get_file(file_record.path)
    except Exception as e:
        log.error(f"Error retrieving file from storage: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage",
        )
    
    # Return file
    return FileResponse(
        path=file_path,
        filename=file_record.filename,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": f'attachment; filename="{file_record.filename}"'
        },
    )


@router.get("/{file_id}/onlyoffice", response_model=OnlyOfficeConfigResponse)
async def get_onlyoffice_config(
    file_id: str,
    user=Depends(get_verified_user),
    db: Session = Depends(get_session),
):
    """
    Get OnlyOffice editor configuration for a PPTX file.
    
    Returns the configuration needed to embed OnlyOffice Document Editor.
    """
    # Check if OnlyOffice is enabled
    if not is_onlyoffice_enabled():
        return OnlyOfficeConfigResponse(
            enabled=False,
            error="OnlyOffice is not configured. Set ONLYOFFICE_URL and ONLYOFFICE_SECRET environment variables.",
        )
    
    # Get file record
    file_record = Files.get_file_by_id(file_id, db=db)
    
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    
    # Check ownership or admin
    if file_record.user_id != user.id and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    try:
        # Build file URL (must be accessible by OnlyOffice server)
        base_url = WEBUI_URL or "http://localhost:8080"
        file_url = f"{base_url}/api/v1/slides/{file_id}/content"
        callback_url = f"{base_url}/api/v1/slides/callback"
        
        # Generate editor config
        config_data = generate_editor_config(
            file_id=file_id,
            filename=file_record.filename,
            file_url=file_url,
            user_id=user.id,
            user_name=user.name or user.email,
            callback_url=callback_url,
            mode="edit",
            lang="es",
        )
        
        return OnlyOfficeConfigResponse(
            enabled=True,
            config=config_data["config"],
            onlyoffice_url=config_data["onlyoffice_url"],
            api_url=config_data["api_url"],
        )
        
    except Exception as e:
        log.error(f"Error generating OnlyOffice config: {e}")
        return OnlyOfficeConfigResponse(
            enabled=False,
            error=str(e),
        )


@router.get("/{file_id}/content")
async def get_file_content(
    file_id: str,
    db: Session = Depends(get_session),
):
    """
    Get file content for OnlyOffice to download.
    
    This endpoint is called by OnlyOffice Document Server to fetch the file.
    No auth required as OnlyOffice server needs direct access.
    """
    # Get file record
    file_record = Files.get_file_by_id(file_id, db=db)
    
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    
    # Get file from storage
    try:
        file_path = Storage.get_file(file_record.path)
    except Exception as e:
        log.error(f"Error retrieving file from storage: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found in storage",
        )
    
    # Return file
    return FileResponse(
        path=file_path,
        filename=file_record.filename,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )


@router.post("/callback")
async def onlyoffice_callback(
    request: OnlyOfficeCallbackRequest,
):
    """
    Callback endpoint for OnlyOffice Document Server.
    
    Called by OnlyOffice when document status changes (editing, saving, etc.).
    """
    log.info(f"OnlyOffice callback: status={request.status}, key={request.key}")
    
    # Verify token if provided
    if request.token:
        payload = verify_callback_token(request.token)
        if not payload:
            log.warning("Invalid callback token")
            # Still return success to avoid OnlyOffice retries
            return {"error": 0}
    
    # Process callback
    result = process_callback(request.model_dump())
    
    return result


@router.get("/onlyoffice/status")
async def get_onlyoffice_status(
    user=Depends(get_verified_user),
):
    """
    Check if OnlyOffice integration is enabled.
    """
    return {
        "enabled": is_onlyoffice_enabled(),
    }
