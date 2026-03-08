from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import re

router = APIRouter(prefix="/api/settings", tags=["settings"])

class SettingsUpdate(BaseModel):
    base_url: str
    browser_type: str = "chromium"
    headless: bool
    timeout: int
    slow_mo: int
    screenshot_on_failure: bool = True
    video_retention: str = "on-failure"
    trace_retention: str = "on-failure"
    retries: int = 0
    viewport_width: int = 1280
    viewport_height: int = 720
    default_parallel_workers: int = 4
    markers: list[str] = ["smoke", "regression", "sanity", "e2e"]

def get_config_path():
    current = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(os.path.dirname(os.path.dirname(current)))
    return os.path.join(root, "config", "config.py")

def read_current_settings():
    """Read current settings from config.py"""
    config_path = get_config_path()
    
    if not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail="Config file not found")
    
    with open(config_path, 'r') as f:
        content = f.read()
    
    settings = {}
    
    def extract_str(name, default=""):
        match = re.search(fr'{name}\s*=\s*["\']([^"\']+)["\']', content)
        return match.group(1) if match else default
    
    def extract_int(name, default=0):
        match = re.search(fr'{name}\s*=\s*(\d+)', content)
        return int(match.group(1)) if match else default
    
    def extract_bool(name, default=False):
        match = re.search(fr'{name}\s*=\s*(True|False)', content)
        return match.group(1) == "True" if match else default

    def extract_list(name, default=[]):
        match = re.search(fr'{name}\s*=\s*\[(.*?)\]', content, re.DOTALL)
        if match:
            items = match.group(1).split(',')
            return [i.strip().strip('"').strip("'") for i in items if i.strip()]
        return default

    settings['base_url'] = extract_str('BASE_URL')
    settings['browser_type'] = extract_str('BROWSER_TYPE', 'chromium')
    settings['headless'] = extract_bool('HEADLESS', False)
    settings['timeout'] = extract_int('TIMEOUT', 5000)
    settings['slow_mo'] = extract_int('SLOW_MO', 1000)
    
    # New fields
    settings['screenshot_on_failure'] = extract_bool('SCREENSHOT_ON_FAILURE', True)
    settings['video_retention'] = extract_str('VIDEO_RETENTION', 'on-failure')
    settings['trace_retention'] = extract_str('TRACE_RETENTION', 'on-failure')
    settings['retries'] = extract_int('RETRIES', 0)
    settings['viewport_width'] = extract_int('VIEWPORT_WIDTH', 1280)
    settings['viewport_height'] = extract_int('VIEWPORT_HEIGHT', 720)
    settings['default_parallel_workers'] = extract_int('DEFAULT_PARALLEL_WORKERS', 4)
    settings['markers'] = extract_list('MARKERS', ["smoke", "regression", "sanity", "e2e"])
    
    return settings

def write_settings(settings: SettingsUpdate):
    """Write updated settings to config.py securely using regex replacement"""
    config_path = get_config_path()
    
    if not os.path.exists(config_path):
         raise HTTPException(status_code=404, detail="Config file not found")
         
    with open(config_path, 'r') as f:
        content = f.read()
    
    def replace_setting(name, value, is_str=False):
        val_str = f'"{value}"' if is_str else str(value)
        pattern = fr'{name}\s*=\s*.*'
        replacement = f'{name} = {val_str}'
        
        if re.search(pattern, content):
            return re.sub(pattern, replacement, content)
        return content

    content = replace_setting("BASE_URL", settings.base_url, is_str=True)
    content = replace_setting("BROWSER_TYPE", settings.browser_type, is_str=True)
    content = replace_setting("HEADLESS", settings.headless)
    content = replace_setting("TIMEOUT", settings.timeout)
    content = replace_setting("SLOW_MO", settings.slow_mo)
    
    content = replace_setting("SCREENSHOT_ON_FAILURE", settings.screenshot_on_failure)
    content = replace_setting("VIDEO_RETENTION", settings.video_retention, is_str=True)
    content = replace_setting("TRACE_RETENTION", settings.trace_retention, is_str=True)
    content = replace_setting("RETRIES", settings.retries)
    content = replace_setting("VIEWPORT_WIDTH", settings.viewport_width)
    content = replace_setting("VIEWPORT_HEIGHT", settings.viewport_height)
    content = replace_setting("DEFAULT_PARALLEL_WORKERS", settings.default_parallel_workers)
    
    # Handle list separately
    markers_str = str(settings.markers)
    pattern = r'MARKERS\s*=\s*\[.*?\]'
    replacement = f'MARKERS = {markers_str}'
    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)
    else:
        # If not found, append it before HIGHLIGHT_ELEMENTS or at the end of class
        content = content.replace("class Config:", f"class Config:\n    MARKERS = {markers_str}")
    
    with open(config_path, 'w') as f:
        f.write(content)

@router.get("")
def get_settings():
    """Get current settings from config.py"""
    try:
        return read_current_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read settings: {str(e)}")

@router.post("")
def update_settings(settings: SettingsUpdate):
    """Update settings in config.py"""
    try:
        # Validate input
        if settings.timeout < 0:
            raise HTTPException(status_code=400, detail="Timeout cannot be negative")
        
        if settings.slow_mo < 0:
            raise HTTPException(status_code=400, detail="Slow motion cannot be negative")
        
        if settings.browser_type not in ["chromium", "firefox", "webkit"]:
            raise HTTPException(status_code=400, detail="Invalid browser type")
            
        if settings.video_retention not in ["off", "on", "on-failure"]:
             raise HTTPException(status_code=400, detail="Invalid video retention policy")

        # Get current markers to identify deleted ones
        old_settings = read_current_settings()
        old_markers = set(old_settings.get('markers', []))
        new_markers = set(settings.markers)
        deleted_markers = old_markers - new_markers

        # Write the updated settings
        write_settings(settings)

        # Cleanup deleted markers from test files
        if deleted_markers:
            root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            tests_dir = os.path.join(root_dir, "tests")
            
            # Additional check: also check generated_pom/tests
            gen_tests_dir = os.path.join(root_dir, "generated_pom", "tests")
            target_dirs = [tests_dir, gen_tests_dir]
            
            for marker in deleted_markers:
                marker_line = f"@pytest.mark.{marker}"
                for target_dir in target_dirs:
                    if not os.path.exists(target_dir):
                        continue
                    # Walk through tests directory
                    for root, dirs, files in os.walk(target_dir):
                        for file in files:
                            if file.endswith(".py"):
                                file_path = os.path.join(root, file)
                                with open(file_path, 'r') as f:
                                    lines = f.readlines()
                                
                                new_lines = [line for line in lines if not line.strip().startswith(marker_line)]
                                
                                if len(new_lines) < len(lines):
                                    with open(file_path, 'w') as f:
                                        f.writelines(new_lines)
        
        return {
            "status": "success",
            "message": "Settings updated successfully",
            "settings": settings.dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")
