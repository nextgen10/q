"""
Multi-tenant authentication module.
Manages application registration, API key validation, and tenant scoping.
"""
import hashlib
import re
import secrets
import sqlite3
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import Header, HTTPException, Depends, Query

logger = logging.getLogger(__name__)

MAX_APP_NAME_LENGTH = 128
MAX_EMAIL_LENGTH = 256
MAX_API_KEY_LENGTH = 512
_VALID_APP_ID_RE = re.compile(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$')
_VALID_APP_NAME_RE = re.compile(r'^[A-Za-z0-9]{1,15}$')

DB_NAME = "evaluations.db"


def _hash_key(api_key: str) -> str:
    if not isinstance(api_key, str) or len(api_key) > MAX_API_KEY_LENGTH:
        return ""
    return hashlib.sha256(api_key.encode()).hexdigest()


def init_auth_tables():
    """Create the applications table if it doesn't exist."""
    conn = sqlite3.connect(DB_NAME, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS applications (
                app_id TEXT PRIMARY KEY,
                app_name TEXT NOT NULL,
                api_key_hash TEXT NOT NULL UNIQUE,
                owner_email TEXT,
                created_at TEXT NOT NULL,
                is_active INTEGER DEFAULT 1
            )
        ''')
        conn.commit()
    finally:
        conn.close()


def register_application(app_name: str, owner_email: str = "") -> Dict[str, str]:
    """Register a new application and return its credentials."""
    if not isinstance(app_name, str):
        raise ValueError("Application name is required")
    app_name = app_name.strip()[:MAX_APP_NAME_LENGTH]
    owner_email = (owner_email or "").strip()[:MAX_EMAIL_LENGTH]

    if not _VALID_APP_NAME_RE.match(app_name):
        raise ValueError("Application name must be alphanumeric and 1-15 characters")

    raw_id = app_name.lower()
    if not raw_id or len(raw_id) > 64 or not _VALID_APP_ID_RE.match(raw_id):
        raise ValueError("Application name must contain at least one alphanumeric character")
    app_id = raw_id

    api_key = f"nxe_{secrets.token_urlsafe(32)}"
    api_key_hash = _hash_key(api_key)

    conn = sqlite3.connect(DB_NAME, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT app_id FROM applications WHERE app_id = ?", (app_id,))
        if cursor.fetchone():
            raise ValueError(f"Application '{app_id}' already exists")

        cursor.execute(
            "INSERT INTO applications (app_id, app_name, api_key_hash, owner_email, created_at) VALUES (?, ?, ?, ?, ?)",
            (app_id, app_name, api_key_hash, owner_email, datetime.now().isoformat()),
        )
        conn.commit()
        return {"app_id": app_id, "app_name": app_name, "api_key": api_key}
    except sqlite3.IntegrityError:
        raise ValueError(f"Application '{app_id}' already exists")
    except sqlite3.Error as e:
        logger.error("Database error during registration: %s", e)
        raise ValueError("Registration failed due to a server error. Please try again.")
    finally:
        conn.close()


def validate_api_key(api_key: str) -> Optional[Dict[str, Any]]:
    """Validate an API key and return the app record, or None."""
    if not isinstance(api_key, str) or not api_key or len(api_key) > MAX_API_KEY_LENGTH:
        return None
    key_hash = _hash_key(api_key)
    if not key_hash:
        return None
    conn = sqlite3.connect(DB_NAME, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT app_id, app_name, owner_email, is_active FROM applications WHERE api_key_hash = ?",
            (key_hash,),
        )
        row = cursor.fetchone()
        if row and row[3]:  # is_active
            return {"app_id": row[0], "app_name": row[1], "owner_email": row[2]}
        return None
    except sqlite3.Error as e:
        logger.error("Database error during API key validation: %s", e)
        return None
    finally:
        conn.close()


def rotate_api_key(app_id: str) -> Optional[str]:
    """Generate a new API key for an existing application."""
    if not isinstance(app_id, str) or not _VALID_APP_ID_RE.match(app_id):
        return None
    new_key = f"nxe_{secrets.token_urlsafe(32)}"
    new_hash = _hash_key(new_key)
    conn = sqlite3.connect(DB_NAME, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE applications SET api_key_hash = ? WHERE app_id = ? AND is_active = 1",
            (new_hash, app_id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return None
        return new_key
    except sqlite3.Error as e:
        logger.error("Database error during key rotation: %s", e)
        return None
    finally:
        conn.close()


def list_applications() -> List[Dict[str, Any]]:
    """List all active registered applications (no secrets)."""
    conn = sqlite3.connect(DB_NAME, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT app_id, app_name, owner_email, created_at FROM applications WHERE is_active = 1 ORDER BY created_at DESC"
        )
        rows = cursor.fetchall()
        return [
            {"app_id": r[0], "app_name": r[1], "owner_email": r[2], "created_at": r[3]}
            for r in rows
        ]
    finally:
        conn.close()


def delete_application(app_id: str) -> bool:
    """Soft-delete an application (deactivate)."""
    if not isinstance(app_id, str) or not _VALID_APP_ID_RE.match(app_id):
        return False
    conn = sqlite3.connect(DB_NAME, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE applications SET is_active = 0 WHERE app_id = ? AND is_active = 1", (app_id,))
        conn.commit()
        return cursor.rowcount > 0
    except sqlite3.Error as e:
        logger.error("Database error during app deactivation: %s", e)
        return False
    finally:
        conn.close()


def is_admin(app_id: str) -> bool:
    """Check if the given app is the admin (first registered application)."""
    conn = sqlite3.connect(DB_NAME, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT app_id FROM applications WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1"
        )
        row = cursor.fetchone()
        return row is not None and row[0] == app_id
    except sqlite3.Error:
        return False
    finally:
        conn.close()


def login_with_key(api_key: str) -> Optional[Dict[str, Any]]:
    """Validate credentials and return app info for UI login."""
    return validate_api_key(api_key)


# --- FastAPI Dependency ---

async def get_current_app(x_api_key: Optional[str] = Header(None, alias="X-API-Key")) -> Dict[str, Any]:
    """FastAPI dependency: extract and validate app from API key header."""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")
    app_info = validate_api_key(x_api_key)
    if not app_info:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    return app_info


async def get_optional_app(x_api_key: Optional[str] = Header(None, alias="X-API-Key")) -> Optional[Dict[str, Any]]:
    """FastAPI dependency: optionally extract app - returns None if no key provided."""
    if not x_api_key:
        return None
    return validate_api_key(x_api_key)
