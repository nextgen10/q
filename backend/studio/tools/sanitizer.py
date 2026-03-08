import re
import os

def sanitize_script(input_file: str):
    """
    Reads a python script and sanitizes potential sensitive data in .fill() methods.
    It looks for 'password', 'secret', or 'key' in the preceding locator or context 
    and replaces the filled value with '<REDACTED>'.
    """
    if not os.path.exists(input_file):
        print(f"File {input_file} not found.")
        return

    with open(input_file, 'r') as f:
        content = f.read()

    # Regex to find .fill("value") where the line might contain sensitive keywords
    # This is a naive implementation. A robust one would parse AST.
    # We look for lines like: page.locator("#password").fill("Secret123")
    
    # Strategy: split by lines, check if line has 'password' etc and .fill
    lines = content.split('\n')
    sanitized_lines = []
    
    sensitive_keywords = ['password', 'secret', 'api_key', 'token']
    
    for line in lines:
        if any(keyword in line.lower() for keyword in sensitive_keywords) and '.fill(' in line:
            # Replace content inside .fill("...") or .fill('...')
            # Regex to capture the content inside .fill
            pattern = r'(.fill\([\"\'])(.*?)([\"\']\))'
            line = re.sub(pattern, r'\1<REDACTED>\3', line)
            print(f"Sanitized line: {line.strip()}")
            
        sanitized_lines.append(line)
    
    with open(input_file, 'w') as f:
        f.write('\n'.join(sanitized_lines))
    
    print(f"Sanitization complete for {input_file}")

if __name__ == "__main__":
    import sys
    file_to_clean = "raw_recorded.py"
    if len(sys.argv) > 1:
        file_to_clean = sys.argv[1]
    
    sanitize_script(file_to_clean)
