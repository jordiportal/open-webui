"""
BrainChatAdapter — Drop-in replacement for ChatTable that delegates
conversation storage to Brain's REST API.

Activated via BRAIN_CHAT_BACKEND=true environment variable.
"""

import asyncio
import logging
import os
import time
import uuid
from collections import OrderedDict
from datetime import datetime, timezone
from threading import Lock
from typing import Optional

from open_webui.models.chats import (
    ChatForm,
    ChatImportForm,
    ChatListResponse,
    ChatModel,
    ChatTitleIdResponse,
    SharedChatResponse,
)
from open_webui.utils.brain_client import brain_client

log = logging.getLogger(__name__)

_MAX_CACHE = 200


_email_map: dict[str, str] = {}
_email_cache: dict[str, str] = {}


def _load_email_map():
    """
    Parse BRAIN_USER_EMAIL_MAP env var.
    Format: "owui_email1:brain_email1,owui_email2:brain_email2"
    Maps OpenWebUI emails to the email Brain uses (OAuth preferred_username).
    """
    raw = os.environ.get("BRAIN_USER_EMAIL_MAP", "")
    for pair in raw.split(","):
        pair = pair.strip()
        if ":" in pair:
            owui, brain = pair.split(":", 1)
            _email_map[owui.strip().lower()] = brain.strip().lower()
    if _email_map:
        log.info(f"Brain email mappings loaded: {len(_email_map)} entries")


def _resolve_email(user_id: str) -> str:
    if user_id in _email_cache:
        return _email_cache[user_id]

    try:
        from open_webui.models.users import Users
        user = Users.get_user_by_id(user_id)
        if not user:
            return user_id
        owui_email = user.email.lower()

        brain_email = _email_map.get(owui_email, owui_email)
        _email_cache[user_id] = brain_email
        if brain_email != owui_email:
            log.info(f"Email mapped: {owui_email} -> {brain_email}")
        return brain_email
    except Exception:
        return user_id


def _run_async(coro):
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result(timeout=15)
    else:
        return asyncio.run(coro)


def _epoch(dt_val) -> int:
    if dt_val is None:
        return int(time.time())
    if isinstance(dt_val, (int, float)):
        return int(dt_val)
    if isinstance(dt_val, str):
        try:
            dt_val = datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
        except Exception:
            return int(time.time())
    if isinstance(dt_val, datetime):
        return int(dt_val.timestamp())
    return int(time.time())


_BRAIN_MODEL_ID = "brain-adaptive"


def _brain_messages_to_history(messages: list[dict]) -> dict:
    history = {"messages": {}, "currentId": None}
    prev_id = None
    for msg in messages:
        mid = msg.get("id", str(uuid.uuid4()))
        entry = {
            "id": mid,
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
            "parentId": prev_id,
            "childrenIds": [],
            "timestamp": _epoch(msg.get("created_at")),
        }
        if msg.get("role") == "assistant":
            entry["model"] = _BRAIN_MODEL_ID
            entry["modelName"] = "Brain"
            follow_ups = (msg.get("metadata") or {}).get("follow_ups")
            if follow_ups:
                entry["followUps"] = follow_ups
        history["messages"][mid] = entry
        if prev_id and prev_id in history["messages"]:
            history["messages"][prev_id]["childrenIds"].append(mid)
        prev_id = mid
    history["currentId"] = prev_id
    return history


def _brain_conv_to_chat_model(conv: dict, messages: Optional[list] = None) -> ChatModel:
    history = _brain_messages_to_history(messages or conv.get("messages", []))
    title = conv.get("title") or "New Chat"
    return ChatModel(
        id=conv["id"],
        user_id=conv.get("user_id", ""),
        title=title,
        chat={"title": title, "history": history, "models": [_BRAIN_MODEL_ID]},
        created_at=_epoch(conv.get("created_at")),
        updated_at=_epoch(conv.get("updated_at")),
        share_id=None,
        archived=False,
        pinned=False,
        meta={},
        folder_id=None,
    )


class BrainChatAdapter:
    """
    Adapter that satisfies the ChatTable interface but delegates
    storage to Brain's conversation API.  Unsupported features
    (pin, archive, share, folders, tags) return safe defaults.
    """

    def __init__(self):
        self._cache: OrderedDict[str, ChatModel] = OrderedDict()
        self._lock = Lock()
        _load_email_map()

    def _cache_put(self, chat: ChatModel):
        with self._lock:
            self._cache[chat.id] = chat
            self._cache.move_to_end(chat.id)
            while len(self._cache) > _MAX_CACHE:
                self._cache.popitem(last=False)

    def _cache_get(self, chat_id: str) -> Optional[ChatModel]:
        with self._lock:
            return self._cache.get(chat_id)

    def _cache_remove(self, chat_id: str):
        with self._lock:
            self._cache.pop(chat_id, None)

    # ------------------------------------------------------------------
    # Core read operations (delegate to Brain API)
    # ------------------------------------------------------------------

    def get_chat_title_id_list_by_user_id(
        self,
        user_id: str,
        include_archived: bool = False,
        include_folders: bool = False,
        include_pinned: bool = False,
        skip: Optional[int] = None,
        limit: Optional[int] = None,
        db=None,
    ) -> list[ChatTitleIdResponse]:
        email = _resolve_email(user_id)
        data = _run_async(brain_client.list_conversations(
            email, limit=limit or 50, offset=skip or 0,
        ))
        return [
            ChatTitleIdResponse(
                id=c["id"],
                title=c.get("title") or "New Chat",
                updated_at=_epoch(c.get("updated_at")),
                created_at=_epoch(c.get("created_at")),
            )
            for c in data.get("conversations", [])
        ]

    def get_chat_by_id(self, id: str, db=None) -> Optional[ChatModel]:
        cached = self._cache_get(id)
        if cached:
            return cached

        email = self._guess_email_for_chat(id)
        conv = _run_async(brain_client.get_conversation(id, email))
        if not conv:
            return None
        chat = _brain_conv_to_chat_model(conv)
        self._cache_put(chat)
        return chat

    def get_chat_by_id_and_user_id(self, id: str, user_id: str, db=None) -> Optional[ChatModel]:
        cached = self._cache_get(id)
        if cached:
            return cached

        email = _resolve_email(user_id)
        conv = _run_async(brain_client.get_conversation(id, email))
        if not conv:
            return None
        chat = _brain_conv_to_chat_model(conv)
        chat.user_id = user_id
        self._cache_put(chat)
        return chat

    def get_chat_list_by_user_id(
        self, user_id: str, include_archived: bool = False,
        filter: Optional[dict] = None, skip: int = 0, limit: int = 50, db=None,
    ) -> list[ChatModel]:
        email = _resolve_email(user_id)
        data = _run_async(brain_client.list_conversations(email, limit=limit, offset=skip))
        results = []
        for c in data.get("conversations", []):
            chat = _brain_conv_to_chat_model(c)
            chat.user_id = user_id
            results.append(chat)
        return results

    def get_chats_by_user_id(
        self, user_id: str, filter: Optional[dict] = None,
        skip: Optional[int] = None, limit: Optional[int] = None, db=None,
    ) -> ChatListResponse:
        chats = self.get_chat_list_by_user_id(
            user_id, skip=skip or 0, limit=limit or 50, db=db,
        )
        return ChatListResponse(items=chats, total=len(chats))

    def get_chats(self, skip: int = 0, limit: int = 50, db=None) -> list[ChatModel]:
        return []

    def get_chat_title_by_id(self, id: str) -> Optional[str]:
        chat = self.get_chat_by_id(id)
        return chat.title if chat else None

    def get_messages_map_by_chat_id(self, id: str) -> Optional[dict]:
        chat = self.get_chat_by_id(id)
        if chat is None:
            return None
        return chat.chat.get("history", {}).get("messages", {}) or {}

    def get_message_by_id_and_message_id(self, id: str, message_id: str) -> Optional[dict]:
        msgs = self.get_messages_map_by_chat_id(id)
        if msgs is None:
            return None
        return msgs.get(message_id, {})

    def is_chat_owner(self, id: str, user_id: str, db=None) -> bool:
        chat = self.get_chat_by_id_and_user_id(id, user_id)
        return chat is not None

    def get_chat_folder_id(self, id: str, user_id: str, db=None) -> Optional[str]:
        return None

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    def insert_new_chat(self, user_id: str, form_data: ChatForm, db=None) -> Optional[ChatModel]:
        chat_id = str(uuid.uuid4())
        title = form_data.chat.get("title", "New Chat") if form_data.chat else "New Chat"
        now = int(time.time())
        chat = ChatModel(
            id=chat_id,
            user_id=user_id,
            title=title,
            chat=form_data.chat or {"title": title, "history": {"messages": {}, "currentId": None}},
            created_at=now,
            updated_at=now,
            share_id=None,
            archived=False,
            pinned=False,
            meta={},
            folder_id=form_data.folder_id,
        )
        self._cache_put(chat)
        return chat

    def update_chat_by_id(self, id: str, chat: dict, db=None) -> Optional[ChatModel]:
        existing = self._cache_get(id)
        if not existing:
            existing = self.get_chat_by_id(id)
        if not existing:
            return None

        new_title = chat.get("title", existing.title)
        if new_title != existing.title:
            email = self._guess_email_for_chat(id) or _resolve_email(existing.user_id)
            try:
                _run_async(brain_client.update_title(id, new_title, email))
            except Exception as e:
                log.warning(f"Brain update_title failed: {e}")

        updated = ChatModel(
            id=existing.id,
            user_id=existing.user_id,
            title=new_title,
            chat=chat,
            created_at=existing.created_at,
            updated_at=int(time.time()),
            share_id=existing.share_id,
            archived=existing.archived,
            pinned=existing.pinned,
            meta=existing.meta,
            folder_id=existing.folder_id,
        )
        self._cache_put(updated)
        return updated

    def update_chat_title_by_id(self, id: str, title: str) -> Optional[ChatModel]:
        chat = self.get_chat_by_id(id)
        if not chat:
            return None
        chat_data = chat.chat.copy() if chat.chat else {}
        chat_data["title"] = title
        return self.update_chat_by_id(id, chat_data)

    def upsert_message_to_chat_by_id_and_message_id(
        self, id: str, message_id: str, message: dict,
    ) -> Optional[ChatModel]:
        chat = self.get_chat_by_id(id)
        if chat is None:
            return None

        chat_data = chat.chat.copy() if chat.chat else {}
        history = chat_data.get("history", {"messages": {}, "currentId": None})

        if message_id in history.get("messages", {}):
            history["messages"][message_id] = {
                **history["messages"][message_id],
                **message,
            }
        else:
            history["messages"][message_id] = message

        history["currentId"] = message_id
        chat_data["history"] = history
        chat_data["title"] = chat.title

        updated = ChatModel(
            id=chat.id,
            user_id=chat.user_id,
            title=chat.title,
            chat=chat_data,
            created_at=chat.created_at,
            updated_at=int(time.time()),
            share_id=chat.share_id,
            archived=chat.archived,
            pinned=chat.pinned,
            meta=chat.meta,
            folder_id=chat.folder_id,
        )
        self._cache_put(updated)
        return updated

    def add_message_status_to_chat_by_id_and_message_id(
        self, id: str, message_id: str, status: dict,
    ) -> Optional[ChatModel]:
        chat = self.get_chat_by_id(id)
        if chat is None:
            return None
        chat_data = chat.chat.copy() if chat.chat else {}
        history = chat_data.get("history", {})
        if message_id in history.get("messages", {}):
            status_history = history["messages"][message_id].get("statusHistory", [])
            status_history.append(status)
            history["messages"][message_id]["statusHistory"] = status_history
        chat_data["history"] = history
        return self.update_chat_by_id(id, chat_data)

    def add_message_files_by_id_and_message_id(
        self, id: str, message_id: str, files: list[dict],
    ) -> list[dict]:
        chat = self.get_chat_by_id(id)
        if chat is None:
            return []
        chat_data = chat.chat.copy() if chat.chat else {}
        history = chat_data.get("history", {})
        message_files = []
        if message_id in history.get("messages", {}):
            message_files = history["messages"][message_id].get("files", [])
            message_files = message_files + files
            history["messages"][message_id]["files"] = message_files
        chat_data["history"] = history
        self.update_chat_by_id(id, chat_data)
        return message_files

    # ------------------------------------------------------------------
    # Delete operations
    # ------------------------------------------------------------------

    def delete_chat_by_id(self, id: str, db=None) -> bool:
        email = self._guess_email_for_chat(id)
        self._cache_remove(id)
        try:
            return _run_async(brain_client.delete_conversation(id, email))
        except Exception as e:
            log.warning(f"Brain delete_conversation failed: {e}")
            return False

    def delete_chat_by_id_and_user_id(self, id: str, user_id: str, db=None) -> bool:
        email = _resolve_email(user_id)
        self._cache_remove(id)
        try:
            return _run_async(brain_client.delete_conversation(id, email))
        except Exception as e:
            log.warning(f"Brain delete_conversation failed: {e}")
            return False

    def delete_chats_by_user_id(self, user_id: str, db=None) -> bool:
        email = _resolve_email(user_id)
        data = _run_async(brain_client.list_conversations(email, limit=200))
        for c in data.get("conversations", []):
            try:
                _run_async(brain_client.delete_conversation(c["id"], email))
                self._cache_remove(c["id"])
            except Exception:
                pass
        return True

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def get_chats_by_user_id_and_search_text(
        self, user_id: str, search_text: str,
        include_archived: bool = False, skip: int = 0, limit: int = 60, db=None,
    ) -> list[ChatModel]:
        all_chats = self.get_chat_list_by_user_id(user_id, skip=0, limit=200, db=db)
        search_lower = search_text.lower()
        filtered = [c for c in all_chats if search_lower in (c.title or "").lower()]
        return filtered[skip:skip + limit]

    # ------------------------------------------------------------------
    # No-op / unsupported features (return safe defaults)
    # ------------------------------------------------------------------

    def get_pinned_chats_by_user_id(self, user_id: str, db=None) -> list[ChatTitleIdResponse]:
        return []

    def get_archived_chats_by_user_id(self, user_id: str, db=None) -> list[ChatModel]:
        return []

    def get_archived_chat_list_by_user_id(
        self, user_id: str, filter=None, skip: int = 0, limit: int = 50, db=None,
    ) -> list[ChatTitleIdResponse]:
        return []

    def get_shared_chat_list_by_user_id(
        self, user_id: str, filter=None, skip: int = 0, limit: int = 50, db=None,
    ) -> list[SharedChatResponse]:
        return []

    def get_chat_by_share_id(self, id: str, db=None) -> Optional[ChatModel]:
        return None

    def get_chats_by_folder_id_and_user_id(
        self, folder_id: str, user_id: str, skip: int = 0, limit: int = 60, db=None,
    ) -> list[ChatModel]:
        return []

    def get_chats_by_folder_ids_and_user_id(
        self, folder_ids: list[str], user_id: str, db=None,
    ) -> list[ChatModel]:
        return []

    def get_chat_list_by_user_id_and_tag_name(
        self, user_id: str, tag_name: str, skip: int = 0, limit: int = 50, db=None,
    ) -> list[ChatModel]:
        return []

    def get_chat_list_by_chat_ids(
        self, chat_ids: list[str], skip: int = 0, limit: int = 50, db=None,
    ) -> list[ChatModel]:
        results = []
        for cid in chat_ids:
            chat = self.get_chat_by_id(cid)
            if chat:
                results.append(chat)
        return results[skip:skip + limit]

    def toggle_chat_pinned_by_id(self, id: str, db=None) -> Optional[ChatModel]:
        return self.get_chat_by_id(id)

    def toggle_chat_archive_by_id(self, id: str, db=None) -> Optional[ChatModel]:
        return self.get_chat_by_id(id)

    def archive_all_chats_by_user_id(self, user_id: str, db=None) -> bool:
        return True

    def unarchive_all_chats_by_user_id(self, user_id: str, db=None) -> bool:
        return True

    def insert_shared_chat_by_chat_id(self, chat_id: str, db=None) -> Optional[ChatModel]:
        return self.get_chat_by_id(chat_id)

    def update_shared_chat_by_chat_id(self, chat_id: str, db=None) -> Optional[ChatModel]:
        return self.get_chat_by_id(chat_id)

    def delete_shared_chat_by_chat_id(self, chat_id: str, db=None) -> bool:
        return True

    def update_chat_share_id_by_id(self, id: str, share_id: Optional[str], db=None) -> Optional[ChatModel]:
        return self.get_chat_by_id(id)

    def update_chat_folder_id_by_id_and_user_id(
        self, id: str, user_id: str, folder_id: str, db=None,
    ) -> Optional[ChatModel]:
        return self.get_chat_by_id(id)

    def import_chats(self, user_id: str, chat_import_forms: list[ChatImportForm], db=None) -> list[ChatModel]:
        results = []
        for form in chat_import_forms:
            chat = self.insert_new_chat(user_id, ChatForm(chat=form.chat, folder_id=form.folder_id))
            if chat:
                results.append(chat)
        return results

    def update_chat_tags_by_id(self, id: str, tags: list[str], user) -> Optional[ChatModel]:
        return self.get_chat_by_id(id)

    def get_chat_tags_by_id_and_user_id(self, id: str, user_id: str, db=None) -> list:
        return []

    def add_chat_tag_by_id_and_user_id_and_tag_name(
        self, id: str, user_id: str, tag_name: str, db=None,
    ) -> Optional[ChatModel]:
        return self.get_chat_by_id(id)

    def delete_tag_by_id_and_user_id_and_tag_name(
        self, id: str, user_id: str, tag_name: str, db=None,
    ) -> bool:
        return True

    def delete_all_tags_by_id_and_user_id(self, id: str, user_id: str, db=None) -> bool:
        return True

    def count_chats_by_tag_name_and_user_id(self, tag_name: str, user_id: str, db=None) -> int:
        return 0

    def count_chats_by_folder_id_and_user_id(self, folder_id: str, user_id: str, db=None) -> int:
        return 0

    def delete_orphan_tags_for_user(self, tag_ids: list[str], user_id: str, threshold: int = 0, db=None):
        pass

    def delete_chats_by_user_id_and_folder_id(self, user_id: str, folder_id: str, db=None) -> bool:
        return True

    def move_chats_by_user_id_and_folder_id(
        self, user_id: str, folder_id: str, new_folder_id: Optional[str], db=None,
    ) -> bool:
        return True

    def delete_shared_chats_by_user_id(self, user_id: str, db=None) -> bool:
        return True

    def insert_chat_files(self, chat_id: str, message_id: str, file_ids: list[str], user_id: str, db=None):
        return None

    def get_chat_files_by_chat_id_and_message_id(self, chat_id: str, message_id: str, db=None) -> list:
        return []

    def delete_chat_file(self, chat_id: str, file_id: str, db=None) -> bool:
        return True

    def get_shared_chats_by_file_id(self, file_id: str, db=None) -> list[ChatModel]:
        return []

    def _clean_null_bytes(self, obj):
        return obj

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _guess_email_for_chat(self, chat_id: str) -> str:
        cached = self._cache_get(chat_id)
        if cached and cached.user_id:
            return _resolve_email(cached.user_id)
        return "anonymous"
