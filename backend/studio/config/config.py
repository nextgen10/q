import os

class Config:
    BASE_URL = "https://example.com"
    BROWSER_TYPE = "chromium"
    HEADLESS = True
    TIMEOUT = 20000
    SLOW_MO = 200
    
    # Advanced Options
    SCREENSHOT_ON_FAILURE = True
    VIDEO_RETENTION = "on"
    TRACE_RETENTION = "on"
    RETRIES = 0
    MARKERS = ['api', 'smoke', 'regression', 'e2e', 'sanity']
    HIGHLIGHT_ELEMENTS = True 
    VIEWPORT_WIDTH = 1280
    VIEWPORT_WIDTH = 1280
    VIEWPORT_HEIGHT = 720
    DEFAULT_PARALLEL_WORKERS = 4
    SELF_HEALING = True # Enable AI Self-Healing for locators
    
    # Paths
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    REPORTS_DIR = os.path.join(PROJECT_ROOT, "reports")
    DATA_DIR = os.path.join(PROJECT_ROOT, "data")
    SCREENSHOTS_DIR = os.path.join(REPORTS_DIR, "screenshots")
    
    # Ensure directories exist
    os.makedirs(REPORTS_DIR, exist_ok=True)
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)
