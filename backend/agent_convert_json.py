import json
import re
from datetime import datetime
from typing import Any, Dict, List, Tuple

# -----------------------------------------------------------------------------
# Constants & Helpers for Ground Truth Inference
# -----------------------------------------------------------------------------

EMAIL_RE = re.compile(r"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", re.IGNORECASE)

# Simple ISO-like date and datetime patterns (no external deps)
DATE_PATTERNS = [
    "%Y-%m-%d",                     # 1991-04-18
]
DATETIME_PATTERNS = [
    "%Y-%m-%dT%H:%M:%SZ",           # 2024-12-01T10:30:00Z
    "%Y-%m-%dT%H:%M:%S.%fZ",        # 2024-12-01T10:30:00.123Z
    "%Y-%m-%dT%H:%M:%S%z",          # 2024-12-01T10:30:00+00:00
    "%Y-%m-%dT%H:%M:%S.%f%z",       # 2024-12-01T10:30:00.123+00:00
]

def try_parse_date(value: str) -> bool:
    for fmt in DATE_PATTERNS:
        try:
            datetime.strptime(value, fmt)
            return True
        except Exception:
            pass
    for fmt in DATETIME_PATTERNS:
        try:
            # allow trailing Z to be treated as UTC in %z formats
            if value.endswith("Z") and "%z" in fmt:
                continue
            datetime.strptime(value, fmt)
            return True
        except Exception:
            pass
    return False

def is_number_like(s: str) -> bool:
    s = s.strip()
    # allow leading +/-, decimals, and scientific notation
    return bool(re.fullmatch(r"[+\-]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+\-]?\d+)?", s))

def safe_json_dumps(v: Any) -> str:
    # Compact, stable string for json values
    return json.dumps(v, separators=(",", ":"), ensure_ascii=False)

def infer_type_from_value(key: str, value: Any) -> str:
    """
    Order of precedence:
    - json if original value is dict/list
    - email if string matches email pattern
    - date if string parses with our allowed formats
    - number if number or number-like string
    - text otherwise
    """
    # Check for ID fields first - they should be exact match
    lower_key = key.lower()
    if lower_key.endswith("id") or "_id_" in lower_key or lower_key == "id":
        return "exact"

    if isinstance(value, (dict, list)):
        return "json"

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return "number"

    if isinstance(value, str):
        if EMAIL_RE.match(value):
            return "email"
        if try_parse_date(value):
            return "date"
        if is_number_like(value):
            return "number"
        return "text"

    if value is None:
        # Treat nulls as empty text for comparison
        return "text"

    # booleans and other primitives default to text
    if isinstance(value, bool):
        return "text"

    # fallback
    return "text"

def normalize_leaf_value(value: Any) -> str:
    """
    Convert leaf to string for 'expected_output':
    - dict/list -> minified JSON string
    - None -> empty string
    - others -> str(value)
    """
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return safe_json_dumps(value)
    return str(value)

# -----------------------------------------------------------------------------
# Core Flattening Logic
# -----------------------------------------------------------------------------

def flatten_json(data: Any, parent_key: str = "", result: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Recursively flattens nested dict/list into a dict of {flat_key: leaf_value}.
    Lists are 1-indexed to match convention.
    """
    if result is None:
        result = {}

    if isinstance(data, dict):
        for k, v in data.items():
            new_key = f"{parent_key}_{k}" if parent_key else k
            flatten_json(v, new_key, result)
    elif isinstance(data, list):
        # Sort list items to ensure order independence (treat as set)
        try:
            sorted_data = sorted(data, key=lambda x: safe_json_dumps(x))
        except Exception:
            sorted_data = data

        for idx, v in enumerate(sorted_data, start=1):
            # Use # to clearly mark array indices and avoid collisions with keys ending in numbers
            new_key = f"{parent_key}#{idx}"
            flatten_json(v, new_key, result)
    else:
        # For ground truth logic, we keep the raw value to infer type later.
        # For AI output logic, we might convert to string immediately, but
        # keeping raw here is safer and more flexible.
        result[parent_key] = data

    return result

# -----------------------------------------------------------------------------
# Conversion Functions
# -----------------------------------------------------------------------------

def convert_to_expected_format(flat: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Convert flattened dict into a list of {query_id, expected_output, type}
    with type inference (Ground Truth format).
    """
    out: List[Dict[str, str]] = []
    for key, raw_value in flat.items():
        t = infer_type_from_value(key, raw_value)
        expected = normalize_leaf_value(raw_value)
        # Extract the actual field name, removing array index markers if present
        raw_field = key.split("_")[-1] if "_" in key else key
        source_field = raw_field.split("#")[0] if "#" in raw_field else raw_field
        
        out.append({
            "query_id": key,
            "expected_output": expected,
            "type": t,
            "source_field": source_field
        })
    # Stable ordering for reproducibility
    out.sort(key=lambda x: x["query_id"])
    return out

def convert_to_actual_format(flat_data: Dict[str, Any], run_id: str = "run_employee_test_1") -> List[Dict[str, str]]:
    """
    Builds the required format: query_id + actual_output + run_id (AI Output format).
    """
    output = []

    for key, value in flat_data.items():
        # AI output expects string values
        str_val = "" if value is None else str(value)
        
        output.append({
            "query_id": key,
            "actual_output": str_val,
            "run_id": run_id
        })
    
    # Sort for consistency
    output.sort(key=lambda x: x["query_id"])
    return output

# -----------------------------------------------------------------------------
# CLI Usage
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Flatten JSON and convert to expected (GT) or actual (AI) format.")
    parser.add_argument("input", help="Path to input JSON file")
    parser.add_argument("-o", "--output", default="output.json", help="Path to write output JSON")
    parser.add_argument("--mode", choices=["gt", "ai"], default="gt", help="Conversion mode: 'gt' (Ground Truth) or 'ai' (AI Output)")
    parser.add_argument("--run_id", default="run_employee_test_1", help="Run ID (only for AI mode)")
    
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)

    flat = flatten_json(data)

    if args.mode == "gt":
        result = convert_to_expected_format(flat)
    else:
        result = convert_to_actual_format(flat, run_id=args.run_id)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(result)} rows to {args.output} in {args.mode} mode")

def unflatten_json(flat_data: Dict[str, Any]) -> Any:
    """
    Reverses flatten_json. Reconstructs nested dicts and lists.
    Lists are detected by trailing numbers (1-indexed).
    """
    result = {}
    
    for key, value in sorted(flat_data.items()):
        parts = key.split("_")
        curr = result
        
        for i, part in enumerate(parts):
            # Detect if this part represents a list item (e.g., tags#1)
            # Use # as the specific delimiter to avoid collisions with fields like 'q23'
            match = re.match(r"^(.+?)#(\d+)$", part)
            
            if match:
                list_key = match.group(1)
                idx = int(match.group(2)) - 1 # 1-indexed to 0-indexed
                
                if list_key not in curr:
                    curr[list_key] = []
                
                if not isinstance(curr[list_key], list):
                    # Collision: if it was an object, just use it as a key
                    if i == len(parts) - 1:
                        curr[part] = value
                    else:
                        if part not in curr: curr[part] = {}
                        curr = curr[part]
                    continue

                # Ensure list is long enough
                while len(curr[list_key]) <= idx:
                    curr[list_key].append(None)
                
                if i == len(parts) - 1:
                    curr[list_key][idx] = value
                else:
                    if curr[list_key][idx] is None:
                        curr[list_key][idx] = {}
                    curr = curr[list_key][idx]
            else:
                if i == len(parts) - 1:
                    curr[part] = value
                else:
                    if part not in curr:
                        curr[part] = {}
                    curr = curr[part]
                    
    return result