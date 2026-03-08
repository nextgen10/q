import re

def detect_type(value) -> str:
    """
    Detects the field type of a value.
    Returns: 'boolean', 'numeric', 'date', 'email', 'text', 'array', 'object', 'null', 'unknown'
    """
    if value is None:
        return 'null'
    
    if isinstance(value, bool):
        return 'boolean'
    
    if isinstance(value, (int, float)):
        return 'numeric'
    
    if isinstance(value, list):
        return 'array'
    
    if isinstance(value, dict):
        return 'object'
    
    if isinstance(value, str):
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if re.match(email_pattern, value):
            return 'email'
            
        date_pattern = r'^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$'
        if re.match(date_pattern, value):
            return 'date'

        numeric_pattern = r'^-?\d+(\.\d+)?$'
        if re.match(numeric_pattern, value.strip()):
            return 'numeric'

        return 'text'
            
    return 'unknown'
