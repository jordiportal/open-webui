"""
Brain API Client for conversation management.

Calls Brain's /api/v1/conversations endpoints using the configured
API key and X-Brain-User-Email header for user impersonation.
"""

import logging
import os
from typing import Optional

import aiohttp

log = logging.getLogger(__name__)

BRAIN_API_URL: Optional[str] = os.environ.get("BRAIN_API_URL")
BRAIN_API_KEY: Optional[str] = os.environ.get("BRAIN_API_KEY")


def _resolve_brain_config_from_app(app_state) -> tuple[Optional[str], Optional[str]]:
    urls = getattr(app_state.config, "OPENAI_API_BASE_URLS", [])
    keys = getattr(app_state.config, "OPENAI_API_KEYS", [])
    for i, key in enumerate(keys):
        if key.startswith("sk-brain") and i < len(urls):
            url = urls[i].rstrip("/")
            if url.endswith("/v1"):
                url = url[:-3]
            return f"{url}/api/v1", key
    if urls and keys:
        url = urls[0].rstrip("/")
        if url.endswith("/v1"):
            url = url[:-3]
        return f"{url}/api/v1", keys[0]
    return None, None


class BrainClient:
    """HTTP client for Brain's conversation REST API."""

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        self._base_url = base_url or BRAIN_API_URL
        self._api_key = api_key or BRAIN_API_KEY

    def configure_from_app(self, app_state):
        if not self._base_url or not self._api_key:
            url, key = _resolve_brain_config_from_app(app_state)
            self._base_url = self._base_url or url
            self._api_key = self._api_key or key

    @property
    def is_configured(self) -> bool:
        return bool(self._base_url and self._api_key)

    def _headers(self, user_email: str) -> dict:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "X-Brain-User-Email": user_email,
            "Content-Type": "application/json",
        }

    async def list_conversations(
        self, user_email: str, limit: int = 50, offset: int = 0
    ) -> dict:
        url = f"{self._base_url}/conversations?limit={limit}&offset={offset}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=self._headers(user_email)) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    log.warning(f"Brain list_conversations failed: {resp.status} - {body}")
                    return {"conversations": [], "total": 0}
                return await resp.json()

    async def get_conversation(self, conversation_id: str, user_email: str) -> Optional[dict]:
        url = f"{self._base_url}/conversations/{conversation_id}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=self._headers(user_email)) as resp:
                if resp.status != 200:
                    log.warning(f"Brain get_conversation failed: {resp.status} for {conversation_id}")
                    return None
                return await resp.json()

    async def delete_conversation(self, conversation_id: str, user_email: str) -> bool:
        url = f"{self._base_url}/conversations/{conversation_id}"
        async with aiohttp.ClientSession() as session:
            async with session.delete(url, headers=self._headers(user_email)) as resp:
                return resp.status == 200

    async def update_title(self, conversation_id: str, title: str, user_email: str) -> bool:
        url = f"{self._base_url}/conversations/{conversation_id}"
        import json
        async with aiohttp.ClientSession() as session:
            async with session.patch(
                url,
                headers=self._headers(user_email),
                data=json.dumps({"title": title}),
            ) as resp:
                return resp.status == 200


brain_client = BrainClient()
