"""
Multi-tenant authentication module.
Manages application registration, API key validation, and tenant scoping.
"""
import hashlib
import re
import secrets
import sqlite3
import logging
import hmac
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import Header, HTTPException, Depends, Query

logger = logging.getLogger(__name__)

MAX_APP_NAME_LENGTH = 128
MAX_EMAIL_LENGTH = 256
MAX_API_KEY_LENGTH = 512
_VALID_APP_ID_RE = re.compile(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$')
_VALID_APP_NAME_RE = re.compile(r'^[A-Za-z0-9]{1,15}$')
_VALID_USERNAME_RE = re.compile(r'^[A-Za-z0-9]{1,32}$')
_ALLOWED_ACCESS = {"RAG_EVAL", "AGENT_EVAL", "GROUND_TRUTH", "PLAYWRIGHT_POM", "ALL"}

DB_NAME = "evaluations.db"


def _hash_key(api_key: str) -> str:
    if not isinstance(api_key, str) or len(api_key) > MAX_API_KEY_LENGTH:
        return ""
    return hashlib.sha256(api_key.encode()).hexdigest()


def _hash_password(password: str, salt_hex: Optional[str] = None) -> str:
    if salt_hex is None:
        salt_hex = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        100_000,
    ).hex()
    return f"{salt_hex}${derived}"


def _verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash or "$" not in stored_hash:
        return False
    salt_hex, expected = stored_hash.split("$", 1)
    computed = _hash_password(password, salt_hex).split("$", 1)[1]
    return hmac.compare_digest(expected, computed)


def _normalize_access(requested_access: str) -> str:
    normalized = (requested_access or "").strip().upper()
    if normalized not in _ALLOWED_ACCESS:
        raise ValueError("Requested access must be one of: RAG_EVAL, AGENT_EVAL, GROUND_TRUTH, PLAYWRIGHT_POM, ALL")
    return normalized


def _ensure_default_admin(cursor: sqlite3.Cursor):
    cursor.execute("SELECT id, app_id FROM user_accounts WHERE lower(username) = lower(?) LIMIT 1", ("Admin",))
    existing_admin = cursor.fetchone()
    if existing_admin:
        admin_id, app_id = existing_admin
        # Guarantee admin account always retains full access rights and known credentials.
        cursor.execute(
            "UPDATE user_accounts SET requested_access = 'ALL', is_active = 1, password_hash = ? WHERE id = ?",
            (_hash_password("Admin"), admin_id),
        )
        cursor.execute("SELECT api_key_hash FROM applications WHERE app_id = ?", (app_id,))
        key_row = cursor.fetchone()
        if not key_row:
            admin_key = f"nxe_{secrets.token_urlsafe(32)}"
            cursor.execute(
                "INSERT INTO applications (app_id, app_name, api_key_hash, api_key_value, owner_email, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    app_id,
                    "Admin",
                    _hash_key(admin_key),
                    admin_key,
                    "",
                    datetime.now().isoformat(),
                    1,
                ),
            )
        elif not key_row[0]:
            admin_key = f"nxe_{secrets.token_urlsafe(32)}"
            cursor.execute(
                "UPDATE applications SET api_key_hash = ?, api_key_value = ?, is_active = 1 WHERE app_id = ?",
                (_hash_key(admin_key), admin_key, app_id),
            )
        else:
            cursor.execute("UPDATE applications SET is_active = 1 WHERE app_id = ?", (app_id,))
        return

    cursor.execute("SELECT app_id FROM applications WHERE lower(app_name) = lower(?) LIMIT 1", ("Admin",))
    row = cursor.fetchone()
    if row:
        app_id = row[0]
        # Ensure app key exists for existing row.
        cursor.execute("SELECT api_key_hash FROM applications WHERE app_id = ?", (app_id,))
        key_row = cursor.fetchone()
        if not key_row or not key_row[0]:
            admin_key = f"nxe_{secrets.token_urlsafe(32)}"
            cursor.execute(
                "UPDATE applications SET api_key_hash = ?, api_key_value = ? WHERE app_id = ?",
                (_hash_key(admin_key), admin_key, app_id),
            )
    else:
        app_id = "admin"
        admin_key = f"nxe_{secrets.token_urlsafe(32)}"
        cursor.execute(
            "INSERT INTO applications (app_id, app_name, api_key_hash, api_key_value, owner_email, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                app_id,
                "Admin",
                _hash_key(admin_key),
                admin_key,
                "",
                datetime.now().isoformat(),
                1,
            ),
        )

    cursor.execute(
        """
        INSERT INTO user_accounts (username, password_hash, requested_access, owner_email, app_id, created_at, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "Admin",
            _hash_password("Admin"),
            "ALL",
            "",
            app_id,
            datetime.now().isoformat(),
            1,
        ),
    )


def init_auth_tables():
    """Create auth tables if they don't exist."""
    conn = sqlite3.connect(DB_NAME, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS applications (
                app_id TEXT PRIMARY KEY,
                app_name TEXT NOT NULL,
                api_key_hash TEXT NOT NULL UNIQUE,
                api_key_value TEXT,
                owner_email TEXT,
                created_at TEXT NOT NULL,
                is_active INTEGER DEFAULT 1
            )
        ''')
        cursor.execute("PRAGMA table_info(applications)")
        app_cols = [r[1] for r in cursor.fetchall()]
        if "api_key_value" not in app_cols:
            cursor.execute("ALTER TABLE applications ADD COLUMN api_key_value TEXT")

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                requested_access TEXT NOT NULL DEFAULT 'ALL',
                owner_email TEXT,
                app_id TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                FOREIGN KEY (app_id) REFERENCES applications(app_id)
            )
        ''')
        # Backward-compatible migration in case table exists without requested_access.
        cursor.execute("PRAGMA table_info(user_accounts)")
        user_cols = [r[1] for r in cursor.fetchall()]
        if "requested_access" not in user_cols:
            cursor.execute("ALTER TABLE user_accounts ADD COLUMN requested_access TEXT NOT NULL DEFAULT 'ALL'")

        _ensure_default_admin(cursor)
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
            "INSERT INTO applications (app_id, app_name, api_key_hash, api_key_value, owner_email, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (app_id, app_name, api_key_hash, api_key, owner_email, datetime.now().isoformat()),
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
            """
            SELECT a.app_id, a.app_name, a.owner_email, a.is_active,
                   u.username, u.requested_access
            FROM applications a
            LEFT JOIN user_accounts u ON u.app_id = a.app_id AND u.is_active = 1
            WHERE a.api_key_hash = ?
            """,
            (key_hash,),
        )
        row = cursor.fetchone()
        if row and row[3]:  # is_active
            return {
                "app_id": row[0],
                "app_name": row[1],
                "owner_email": row[2],
                "username": row[4],
                "requested_access": row[5] or "ALL",
            }
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
            "UPDATE applications SET api_key_hash = ?, api_key_value = ? WHERE app_id = ? AND is_active = 1",
            (new_hash, new_key, app_id),
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
    """Check if given app_id belongs to the Admin user."""
    conn = sqlite3.connect(DB_NAME, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT u.app_id
            FROM user_accounts u
            JOIN applications a ON a.app_id = u.app_id
            WHERE lower(u.username) = lower(?) AND u.is_active = 1 AND a.is_active = 1
            LIMIT 1
            """,
            ("Admin",),
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


def register_user(username: str, password: str, requested_access: str, owner_email: str = "") -> Dict[str, str]:
    if not isinstance(username, str):
        raise ValueError("Username is required")
    normalized_username = username.strip()
    if not _VALID_USERNAME_RE.match(normalized_username):
        raise ValueError("Username must be alphanumeric and 1-32 characters")
    if not isinstance(password, str) or len(password) < 4:
        raise ValueError("Password must be at least 4 characters")

    normalized_access = _normalize_access(requested_access)
    owner_email = (owner_email or "").strip()[:MAX_EMAIL_LENGTH]

    app_id = f"user-{uuid.uuid4().hex[:10]}"
    app_name = normalized_username[:15]
    api_key = f"nxe_{secrets.token_urlsafe(32)}"
    api_key_hash = _hash_key(api_key)
    password_hash = _hash_password(password)
    now = datetime.now().isoformat()

    conn = sqlite3.connect(DB_NAME, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM user_accounts WHERE lower(username) = lower(?)", (normalized_username,))
        if cursor.fetchone():
            raise ValueError("Username already exists")

        cursor.execute(
            "INSERT INTO applications (app_id, app_name, api_key_hash, api_key_value, owner_email, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (app_id, app_name, api_key_hash, api_key, owner_email, now, 1),
        )
        cursor.execute(
            """
            INSERT INTO user_accounts (username, password_hash, requested_access, owner_email, app_id, created_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (normalized_username, password_hash, normalized_access, owner_email, app_id, now, 1),
        )
        conn.commit()
        return {
            "app_id": app_id,
            "app_name": app_name,
            "api_key": api_key,
            "username": normalized_username,
            "requested_access": normalized_access,
        }
    except sqlite3.IntegrityError:
        raise ValueError("Username already exists")
    finally:
        conn.close()


def login_with_credentials(username: str, password: str) -> Optional[Dict[str, Any]]:
    if not isinstance(username, str) or not isinstance(password, str):
        return None
    normalized_username = username.strip()
    if not normalized_username:
        return None

    conn = sqlite3.connect(DB_NAME, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT u.username, u.password_hash, u.requested_access,
                   a.app_id, a.app_name, a.owner_email, a.api_key_value
            FROM user_accounts u
            JOIN applications a ON a.app_id = u.app_id
            WHERE lower(u.username) = lower(?) AND u.is_active = 1 AND a.is_active = 1
            """,
            (normalized_username,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        if not _verify_password(password, row[1]):
            return None
        api_key = row[6]
        if not api_key:
            api_key = f"nxe_{secrets.token_urlsafe(32)}"
            cursor.execute(
                "UPDATE applications SET api_key_hash = ?, api_key_value = ? WHERE app_id = ?",
                (_hash_key(api_key), api_key, row[3]),
            )
            conn.commit()

        return {
            "app_id": row[3],
            "app_name": row[4],
            "owner_email": row[5],
            "username": row[0],
            "requested_access": row[2] or "ALL",
            "api_key": api_key,
        }
    except sqlite3.Error:
        return None
    finally:
        conn.close()


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


def has_app_access(app: Dict[str, Any], required_access: str) -> bool:
    requested = (app.get("requested_access") or "ALL").upper()
    needed = (required_access or "").upper()
    return requested == "ALL" or requested == needed


def require_app_access(required_access: str):
    async def _dependency(app: Dict[str, Any] = Depends(get_current_app)) -> Dict[str, Any]:
        if not has_app_access(app, required_access):
            raise HTTPException(status_code=403, detail=f"Access denied for {required_access}")
        return app
    return _dependency
