import sqlite3
import json
import logging
import re
from datetime import datetime
from typing import Optional, Dict, Any, List
import math

logger = logging.getLogger(__name__)

DB_NAME = "evaluations.db"

def sanitize_floats(obj):
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0.0
        return obj
    elif isinstance(obj, dict):
        return {k: sanitize_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_floats(v) for v in obj]
    return obj

def init_db():
    """Initialize the SQLite database and create the table if it doesn't exist."""
    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='evaluations'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            cursor.execute('''
                CREATE TABLE evaluations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    result_json TEXT NOT NULL,
                    events_json TEXT,
                    run_id TEXT,
                    app_id TEXT
                )
            ''')
        else:
            cursor.execute("PRAGMA table_info(evaluations)")
            columns = {info[1]: info[2] for info in cursor.fetchall()}
            
            if 'name' in columns and 'result_json' not in columns:
                logger.info("Detected old schema. Migrating to new schema...")
                cursor.execute("ALTER TABLE evaluations RENAME TO evaluations_old")
                cursor.execute('''
                    CREATE TABLE evaluations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        result_json TEXT NOT NULL,
                        events_json TEXT,
                        run_id TEXT,
                        app_id TEXT
                    )
                ''')
                logger.info("Migration complete. Old data preserved in evaluations_old table.")
            else:
                if "events_json" not in columns:
                    cursor.execute("ALTER TABLE evaluations ADD COLUMN events_json TEXT")
                if "run_id" not in columns:
                    cursor.execute("ALTER TABLE evaluations ADD COLUMN run_id TEXT")
                if "app_id" not in columns:
                    cursor.execute("ALTER TABLE evaluations ADD COLUMN app_id TEXT")
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='feedback'")
        feedback_table_exists = cursor.fetchone()
        
        if not feedback_table_exists:
            cursor.execute('''
                CREATE TABLE feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    rating INTEGER NOT NULL,
                    suggestion TEXT,
                    app_id TEXT
                )
            ''')
        else:
            cursor.execute("PRAGMA table_info(feedback)")
            fb_columns = {info[1]: info[2] for info in cursor.fetchall()}
            if "app_id" not in fb_columns:
                cursor.execute("ALTER TABLE feedback ADD COLUMN app_id TEXT")
            if "admin_response" not in fb_columns:
                cursor.execute("ALTER TABLE feedback ADD COLUMN admin_response TEXT")
            if "admin_responded_at" not in fb_columns:
                cursor.execute("ALTER TABLE feedback ADD COLUMN admin_responded_at TEXT")

        conn.commit()
    finally:
        conn.close()


# --------------- Prompts (file-based) ---------------

import os as _os

_PROMPTS_DIR = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "prompts")

_SAFE_KEY_RE = re.compile(r'^[a-zA-Z0-9_-]+$')


def _validate_prompt_key(prompt_key: str) -> bool:
    """Reject keys with path separators or directory traversal."""
    return bool(_SAFE_KEY_RE.match(prompt_key))


def get_prompt(prompt_key: str) -> Optional[Dict[str, Any]]:
    """Load a single prompt from its JSON file in the prompts/ folder."""
    if not _validate_prompt_key(prompt_key):
        logger.warning("Rejected invalid prompt key: %s", prompt_key)
        return None
    path = _os.path.join(_PROMPTS_DIR, f"{prompt_key}.json")
    if not _os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.error("Failed to load prompt '%s': %s", prompt_key, e)
        return None


def get_all_prompts() -> List[Dict[str, Any]]:
    """Load all prompt JSON files from the prompts/ folder, sorted by filename."""
    results = []
    if not _os.path.isdir(_PROMPTS_DIR):
        return results
    for fname in sorted(_os.listdir(_PROMPTS_DIR)):
        if fname.endswith(".json"):
            path = _os.path.join(_PROMPTS_DIR, fname)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    data.setdefault("prompt_key", fname.replace(".json", ""))
                    results.append(data)
            except Exception as e:
                logger.error("Error loading prompt %s: %s", fname, e)
    return results


def update_prompt(prompt_key: str, updates: Dict[str, Any]) -> bool:
    """Update a prompt JSON file. Merges updates into the existing file."""
    if not _validate_prompt_key(prompt_key):
        logger.warning("Rejected invalid prompt key for update: %s", prompt_key)
        return False
    path = _os.path.join(_PROMPTS_DIR, f"{prompt_key}.json")
    if not _os.path.isfile(path):
        return False
    allowed = {"title", "description", "model", "temperature", "max_tokens",
               "response_format", "used_in", "system_message", "user_message_template"}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.error("Failed to read prompt '%s' for update: %s", prompt_key, e)
        return False
    changed = False
    for k, v in updates.items():
        if k in allowed and data.get(k) != v:
            data[k] = v
            changed = True
    if changed:
        data["updated_at"] = datetime.now().isoformat()
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
    return changed

    

def save_result(result_json: str, events_json: str = "[]", run_id: Optional[str] = None, app_id: Optional[str] = None):
    """Save a batch test result and events to the database."""
    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        timestamp = datetime.now().isoformat()
        cursor.execute(
            'INSERT INTO evaluations (timestamp, result_json, events_json, run_id, app_id) VALUES (?, ?, ?, ?, ?)',
            (timestamp, result_json, events_json, run_id, app_id),
        )
        new_id = cursor.lastrowid
        conn.commit()
        return new_id
    finally:
        conn.close()

def get_latest_result(app_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieve the most recent evaluation result and events, optionally scoped by app_id."""
    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        if app_id:
            cursor.execute('SELECT id, result_json, events_json FROM evaluations WHERE app_id = ? ORDER BY id DESC LIMIT 1', (app_id,))
        else:
            cursor.execute('SELECT id, result_json, events_json FROM evaluations ORDER BY id DESC LIMIT 1')
        row = cursor.fetchone()
        
        if row:
            try:
                result = json.loads(row[1])
            except (json.JSONDecodeError, TypeError) as e:
                logger.error("Corrupt result_json in record %s: %s", row[0], e)
                return None
            events = json.loads(row[2]) if row[2] else []
            result['id'] = row[0] 
            return sanitize_floats({"result": result, "events": events})
        return None
    finally:
        conn.close()

def get_all_results(app_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve all historical evaluation results, optionally scoped by app_id."""
    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        if app_id:
            cursor.execute('SELECT id, timestamp, result_json, run_id FROM evaluations WHERE app_id = ? ORDER BY id DESC', (app_id,))
        else:
            cursor.execute('SELECT id, timestamp, result_json, run_id FROM evaluations ORDER BY id DESC')
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            try:
                res_data = json.loads(row[2])
                if isinstance(res_data, dict):
                    res_data['id'] = row[0]
                    res_data['timestamp'] = row[1]
                    res_data['run_id'] = row[3] if len(row) > 3 else None
                    results.append(res_data)
                else:
                    results.append({
                        "id": row[0],
                        "timestamp": row[1],
                        "result_json": res_data,
                        "run_id": row[3] if len(row) > 3 else None
                    })
            except Exception as e:
                logger.error("Error parsing record %s: %s", row[0], e)
                continue
                
        return sanitize_floats(results)
    except Exception as e:
        logger.error("Database error in get_all_results: %s", e, exc_info=True)
        return []
    finally:
        conn.close()

def save_feedback(rating: int, suggestion: str, app_id: Optional[str] = None):
    """Save user feedback to the database."""
    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        timestamp = datetime.now().isoformat()
        cursor.execute(
            'INSERT INTO feedback (timestamp, rating, suggestion, app_id) VALUES (?, ?, ?, ?)',
            (timestamp, rating, suggestion, app_id),
        )
        conn.commit()
    finally:
        conn.close()

def get_all_feedback(app_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve all feedback entries, optionally scoped by app_id."""
    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        if app_id:
            cursor.execute('SELECT id, timestamp, rating, suggestion, admin_response, admin_responded_at FROM feedback WHERE app_id = ? ORDER BY id DESC', (app_id,))
        else:
            cursor.execute('SELECT id, timestamp, rating, suggestion, admin_response, admin_responded_at FROM feedback ORDER BY id DESC')
        rows = cursor.fetchall()
        
        feedback_list = []
        for row in rows:
            feedback_list.append({
                "id": row[0],
                "timestamp": row[1],
                "rating": row[2],
                "suggestion": row[3],
                "admin_response": row[4],
                "admin_responded_at": row[5],
            })
        return feedback_list
    finally:
        conn.close()


def respond_to_feedback(feedback_id: int, response_text: str) -> bool:
    """Add an admin response to a feedback entry."""
    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE feedback SET admin_response = ?, admin_responded_at = ? WHERE id = ?',
            (response_text, datetime.now().isoformat(), feedback_id),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()
