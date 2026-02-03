"""
OnlyOffice Document Server Integration

Provides utilities for integrating with OnlyOffice Document Server
for editing Office documents (PPTX, DOCX, XLSX) in the browser.
"""

import logging
import time
import jwt
from typing import Optional, Dict, Any

from open_webui.config import (
    ONLYOFFICE_URL,
    ONLYOFFICE_SECRET,
    WEBUI_URL,
)

log = logging.getLogger(__name__)


def is_onlyoffice_enabled() -> bool:
    """Check if OnlyOffice integration is configured"""
    return bool(ONLYOFFICE_URL and ONLYOFFICE_SECRET)


def get_document_type(filename: str) -> str:
    """Get OnlyOffice document type based on file extension"""
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    
    if ext in ('pptx', 'ppt', 'ppsx', 'pps', 'potx', 'pot', 'odp'):
        return 'slide'
    elif ext in ('xlsx', 'xls', 'csv', 'ods'):
        return 'cell'
    elif ext in ('docx', 'doc', 'odt', 'rtf', 'txt'):
        return 'word'
    else:
        return 'word'  # Default


def get_file_type(filename: str) -> str:
    """Get file type/extension"""
    return filename.lower().split('.')[-1] if '.' in filename else 'pptx'


def generate_editor_config(
    file_id: str,
    filename: str,
    file_url: str,
    user_id: str,
    user_name: str,
    callback_url: Optional[str] = None,
    mode: str = "edit",
    lang: str = "es",
) -> Dict[str, Any]:
    """
    Generate OnlyOffice editor configuration.
    
    Args:
        file_id: Unique file identifier
        filename: Name of the file
        file_url: URL to download the file
        user_id: Current user's ID
        user_name: Current user's display name
        callback_url: URL for OnlyOffice to call when saving (optional)
        mode: "edit" or "view"
        lang: Language code (default: "es" for Spanish)
    
    Returns:
        Configuration dict with JWT token for OnlyOffice
    """
    if not is_onlyoffice_enabled():
        raise ValueError("OnlyOffice is not configured. Set ONLYOFFICE_URL and ONLYOFFICE_SECRET.")
    
    document_type = get_document_type(filename)
    file_type = get_file_type(filename)
    
    # Build the configuration
    config = {
        "document": {
            "fileType": file_type,
            "key": f"{file_id}_{int(time.time())}",  # Unique key for version control
            "title": filename,
            "url": file_url,
        },
        "documentType": document_type,
        "editorConfig": {
            "callbackUrl": callback_url,
            "lang": lang,
            "mode": mode,
            "user": {
                "id": user_id,
                "name": user_name,
            },
            "customization": {
                "autosave": True,
                "chat": False,
                "comments": False,
                "compactHeader": False,
                "compactToolbar": False,
                "feedback": False,
                "forcesave": True,
                "help": False,
                "hideRightMenu": False,
                "hideRulers": False,
                "logo": {
                    "image": "",
                    "imageEmbedded": "",
                    "url": "",
                },
                "toolbarNoTabs": False,
                "zoom": 100,
            },
        },
    }
    
    # Remove callback URL if not provided (view mode)
    if not callback_url:
        del config["editorConfig"]["callbackUrl"]
    
    # Sign with JWT
    token = jwt.encode(config, ONLYOFFICE_SECRET, algorithm="HS256")
    config["token"] = token
    
    return {
        "config": config,
        "onlyoffice_url": ONLYOFFICE_URL,
        "api_url": f"{ONLYOFFICE_URL}/web-apps/apps/api/documents/api.js",
    }


def verify_callback_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify JWT token from OnlyOffice callback.
    
    Args:
        token: JWT token from OnlyOffice
    
    Returns:
        Decoded payload if valid, None otherwise
    """
    if not ONLYOFFICE_SECRET:
        log.error("ONLYOFFICE_SECRET not configured")
        return None
    
    try:
        payload = jwt.decode(token, ONLYOFFICE_SECRET, algorithms=["HS256"])
        return payload
    except jwt.InvalidTokenError as e:
        log.error(f"Invalid OnlyOffice callback token: {e}")
        return None


def process_callback(data: Dict[str, Any]) -> Dict[str, int]:
    """
    Process OnlyOffice callback data.
    
    Status codes from OnlyOffice:
    - 0: No changes
    - 1: Document is being edited
    - 2: Document is ready for saving
    - 3: Document saving error
    - 4: Document closed with no changes
    - 6: Document is being edited, but saved
    - 7: Error force saving document
    
    Args:
        data: Callback data from OnlyOffice
    
    Returns:
        Response dict with error code (0 = success)
    """
    status = data.get("status", 0)
    
    if status == 2 or status == 6:
        # Document ready for saving or force saved
        download_url = data.get("url")
        if download_url:
            log.info(f"Document saved, download URL: {download_url}")
            # TODO: Download and save the updated document
            # This would be implemented when we add full editing support
        return {"error": 0}
    
    elif status == 4:
        # Document closed without changes
        log.info("Document closed without changes")
        return {"error": 0}
    
    elif status in (3, 7):
        # Error saving
        log.error(f"OnlyOffice save error, status: {status}")
        return {"error": 1}
    
    # For other statuses (0, 1), just acknowledge
    return {"error": 0}
