"""
Brain API Proxy Router

Proxies requests from the OpenWebUI frontend to the Brain API,
attaching the user's OAuth access_token for authentication.

This allows the Svelte frontend to fetch workspace files, artifacts,
and other Brain resources without exposing tokens client-side.
"""

import logging
from typing import Optional

import aiohttp
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from starlette.responses import StreamingResponse

from open_webui.utils.auth import get_verified_user

log = logging.getLogger(__name__)

router = APIRouter()


def _get_brain_connection(request: Request) -> tuple[Optional[str], Optional[str]]:
    """
    Resolve the Brain API base URL and API key from the configured OpenAI connections.
    Returns (base_url, api_key).  The api_key (sk-brain-*) is used as auth
    fallback when the user's OAuth token is expired or unavailable.
    """
    urls = getattr(request.app.state.config, "OPENAI_API_BASE_URLS", [])
    keys = getattr(request.app.state.config, "OPENAI_API_KEYS", [])

    for i, key in enumerate(keys):
        if key.startswith("sk-brain") and i < len(urls):
            url = urls[i].rstrip("/")
            if url.endswith("/v1"):
                url = url[:-3]
            return url, key

    configs = getattr(request.app.state.config, "OPENAI_API_CONFIGS", {})
    for i, url_raw in enumerate(urls):
        url_key = url_raw
        cfg = configs.get(url_key, {})
        if cfg.get("auth_type") == "system_oauth" and i < len(urls):
            url = url_raw.rstrip("/")
            if url.endswith("/v1"):
                url = url[:-3]
            api_key = keys[i] if i < len(keys) else None
            return url, api_key

    if urls:
        url = urls[0].rstrip("/")
        if url.endswith("/v1"):
            url = url[:-3]
        api_key = keys[0] if keys else None
        return url, api_key

    return None, None


async def _get_oauth_token(request: Request, user) -> Optional[str]:
    """Get the user's OAuth access_token from the session."""
    try:
        oauth_session_id = request.cookies.get("oauth_session_id")
        if oauth_session_id and hasattr(request.app.state, "oauth_manager"):
            token_data = await request.app.state.oauth_manager.get_oauth_token(
                user.id, oauth_session_id
            )
            if token_data:
                return token_data.get("access_token")
    except Exception as e:
        log.warning(f"Could not get OAuth token for brain proxy: {e}")
    return None


@router.api_route(
    "/api/brain-proxy/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE"],
)
async def brain_proxy(
    path: str,
    request: Request,
    user=Depends(get_verified_user),
):
    """
    Proxy requests to Brain API with OAuth token forwarding.
    Frontend calls /api/brain-proxy/workspace/files/media/img.png
    -> proxied to {BRAIN_URL}/api/v1/workspace/files/media/img.png
    """
    brain_url, brain_api_key = _get_brain_connection(request)
    if not brain_url:
        raise HTTPException(status_code=502, detail="Brain API URL not configured")

    oauth_token = await _get_oauth_token(request, user)

    headers = {}
    if oauth_token:
        headers["Authorization"] = f"Bearer {oauth_token}"
    elif brain_api_key:
        headers["Authorization"] = f"Bearer {brain_api_key}"
        headers["X-Brain-User-Email"] = getattr(user, "email", "") or ""

    target_url = f"{brain_url}/api/v1/{path}"

    qs = str(request.query_params)
    if qs:
        target_url += f"?{qs}"

    try:
        timeout = aiohttp.ClientTimeout(total=60)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            method = request.method.lower()

            kwargs = {"headers": headers}
            if method in ("post", "put"):
                kwargs["data"] = await request.body()
                if request.headers.get("content-type"):
                    kwargs["headers"]["Content-Type"] = request.headers["content-type"]

            async with getattr(session, method)(target_url, **kwargs) as resp:
                content_type = resp.headers.get("Content-Type", "application/octet-stream")

                if "text/event-stream" in content_type:
                    async def _stream():
                        async for chunk in resp.content.iter_any():
                            yield chunk

                    return StreamingResponse(
                        _stream(),
                        status_code=resp.status,
                        media_type=content_type,
                    )

                body = await resp.read()
                response_headers = {}
                for h in ("Content-Disposition",):
                    if h in resp.headers:
                        response_headers[h] = resp.headers[h]

                return Response(
                    content=body,
                    status_code=resp.status,
                    media_type=content_type,
                    headers=response_headers,
                )

    except aiohttp.ClientError as e:
        log.error(f"Brain proxy error: {e}")
        raise HTTPException(status_code=502, detail=f"Brain API unreachable: {e}")
