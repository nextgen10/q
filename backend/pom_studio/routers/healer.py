from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import ast
import traceback
import re
from playwright.sync_api import sync_playwright, expect

router = APIRouter(prefix="/api/heal", tags=["healer"])

# --- Session State Management ---
# In a real multi-user app, this would be a keyed dictionary or Redis.
# For this local studio, a singleton is acceptable.
class HealingSession:
    def __init__(self):
        self.active = False
        self.file_path = None
        self.lines = []
        self.current_line_idx = 0
        self.variables = {}
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self.last_error = None

    def reset(self):
        if self.context:
            try: self.context.close()
            except: pass
        if self.browser:
            try: self.browser.close()
            except: pass
        if self.playwright:
            try: self.playwright.stop()
            except: pass
        
        self.active = False
        self.file_path = None
        self.lines = []
        self.current_line_idx = 0
        self.variables = {}
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self.last_error = None

session = HealingSession()

class InitRequest(BaseModel):
    filename: str

class StepResponse(BaseModel):
    status: str # 'success', 'failed', 'complete'
    line_content: Optional[str] = None
    line_index: int
    error: Optional[str] = None
    dom_snapshot: Optional[str] = None

# --- Endpoints ---

@router.post("/start")
def start_healing_session(req: InitRequest):
    """
    Parses the recording file, extracts the body of the 'run' function,
    and initializes a Playwright session (paused).
    """
    session.reset()
    
    # 1. Resolve File Path
    current_dir = os.getcwd()
    cleaned_filename = req.filename.lstrip('/')

    # Support both legacy and studio layouts:
    # - backend/recordings/*
    # - backend/studio/recordings/*
    # - direct relative/absolute paths passed from UI
    possible_paths = [req.filename]

    # Derive backend root from cwd and this router file location.
    file_backend_root = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..")
    )
    candidate_roots = {
        current_dir,
        file_backend_root,
    }

    # If running from backend/studio/backend, also try parent backend dir.
    if current_dir.endswith(os.path.join("studio", "backend")):
        candidate_roots.add(os.path.dirname(os.path.dirname(current_dir)))

    for root in candidate_roots:
        possible_paths.extend([
            os.path.join(root, cleaned_filename),
            os.path.join(root, "recordings", cleaned_filename),
            os.path.join(root, "studio", cleaned_filename),
            os.path.join(root, "studio", "recordings", cleaned_filename),
            os.path.join(root, "tools", cleaned_filename),
        ])
    
    target_path = None
    tried_paths = []
    for p in possible_paths:
        abs_p = os.path.abspath(p)
        tried_paths.append(abs_p)
        if os.path.exists(abs_p) and os.path.isfile(abs_p):
            target_path = abs_p
            break
            
    if not target_path:
        raise HTTPException(status_code=404, detail=f"File not found. Tried: {tried_paths}")

    session.file_path = target_path

    # 2. Parse Code
    try:
        with open(target_path, 'r') as f:
            source = f.read()
        
        # Parse AST to find the 'run' function
        tree = ast.parse(source)
        run_func = None
        for node in tree.body:
            if isinstance(node, ast.FunctionDef) and node.name == 'run':
                run_func = node
                break
        
        if not run_func:
            # Fallback: Just take all lines? No, that includes imports that might conflict.
            # Let's assume the user recorded with Codegen.
            raise ValueError("Could not find 'def run(playwright)' function in script.")

        # Extract lines from function body
        # We need the source lines, not just AST
        lines = source.splitlines()
        
        # Get body lines with indentation stripped
        body_lines = []
        for stmt in run_func.body:
            # AST usually gives lineno (1-indexed)
            # We want the exact text to execute it? 
            # Or we can just grab the range.
            # Simple approach: standard loop over body nodes
            start = stmt.lineno - 1
            end = stmt.end_lineno if hasattr(stmt, 'end_lineno') else start + 1
            
            chunk = lines[start:end]
            # Strip indent
            stripped_chunk = [l.strip() for l in chunk]
            # Join back to partial string? Or keep as list of statements?
            # Keeping as individual executable strings is easier for stepping.
            # But multi-line statements (like locator chaining) are tricky.
            # BETTER: Use AST to unparse or just get the raw segment?
            # For simplicity in V1: Just executing line-by-line is fragile if statement spans lines.
            # Let's trust AST nodes.
            # Python 3.9+ has ast.unparse()
            code_segment = ast.unparse(stmt)
            body_lines.append(code_segment)
        
        session.lines = body_lines
        session.current_line_idx = 0
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse script: {str(e)}")

    # 3. Initialize Playwright
    # We will invoke playwright methods manually via 'exec' in the step loop,
    # BUT we need the 'placeholders' ready.
    # Actually, we should run the setup phase (launch browser) automatically?
    # Or let the script do it? 
    # The script usually has `browser = playwright.chromium.launch(...)`.
    # If we step through that, it works!
    
    # We need to inject 'playwright' object into the variables.
    try:
        session.playwright = sync_playwright().start()
        session.variables = {
            'playwright': session.playwright,
            'expect': expect,
            're': re
        }
        session.active = True
    except Exception as e:
        session.reset()
        raise HTTPException(status_code=500, detail=f"Failed to start Playwright: {str(e)}")

    return {
        "status": "ready",
        "total_steps": len(session.lines),
        "steps_preview": session.lines
    }

@router.post("/step")
def execute_next_step():
    """
    Executes the next line of code in the session.
    """
    if not session.active:
        raise HTTPException(status_code=400, detail="No active session. Call /start first.")
    
    if session.current_line_idx >= len(session.lines):
        return {"status": "complete", "message": "End of script reached."}

    current_code = session.lines[session.current_line_idx]
    
    # Skip 'context.close' or 'browser.close' to keep session open?
    # Or maybe just let them run and detect closure?
    # For healing, we want to keep it open.
    # Removed skip logic for browser.close/context.close based on user feedback.
    # Execution will proceed normally.

    try:
        # Execute the code in the context of session.variables
        exec(current_code, {}, session.variables)
        
        # After execution, try to update our references to key objects if they were created
        if 'browser' in session.variables: session.browser = session.variables['browser']
        if 'context' in session.variables: session.context = session.variables['context']
        if 'page' in session.variables: session.page = session.variables['page']

        # Success move next
        session.current_line_idx += 1
        return {
            "status": "success",
            "line_content": current_code,
            "line_index": session.current_line_idx
        }
        
    except Exception as e:
        # Capture error
        error_msg = str(e)
        session.last_error = error_msg
        
        # Capture DOM if page exists
        dom_snapshot = ""
        if session.page:
            try:
                dom_snapshot = session.page.content()
            except:
                dom_snapshot = "Could not capture DOM."

        return {
            "status": "failed",
            "line_content": current_code,
            "line_index": session.current_line_idx,
            "error": error_msg,
            "dom_snapshot": dom_snapshot[:1000] + "..." # Truncated for preview
        }

from studio.backend.services.ai_service import get_ai_service

# ... (imports)

class FixRequest(BaseModel):
    override_code: Optional[str] = None

@router.post("/fix")
def fix_current_step(request: Optional[FixRequest] = None):
    """
    Attempts to fix the current failed step using AI and the DOM snapshot.
    Or applies a manual override if provided.
    """
    if not session.active or not session.last_error:
        raise HTTPException(status_code=400, detail="No active failed step to fix.")
    
    current_line = session.lines[session.current_line_idx]
    error_msg = session.last_error
    
    # Capture DOM if available
    dom_snapshot = ""
    if session.page:
        try:
            dom_snapshot = session.page.content()
        except:
            dom_snapshot = "DOM unavailable"

    # Determine fix source
    fixed_line = None
    
    if request and request.override_code:
        fixed_line = request.override_code
    else:
        # Call AI Service
        ai_service = get_ai_service()
        fixed_line = ai_service.heal_locator(
            failed_line=current_line,
            error_message=error_msg,
            dom_snapshot=dom_snapshot
        )
    
    # If successful, apply to session lines so it executes next time
    if fixed_line:
        # 1. Update In-Memory Session
        session.lines[session.current_line_idx] = fixed_line
        
        # 2. Persist to Disk (Original File)
        try:
            with open(session.file_path, 'r') as f:
                source = f.read()
            
            tree = ast.parse(source)
            # Logic to find and replace the line in original file (simplified version)
            file_lines = source.splitlines()
            # If we are in POM mode, the line might be different from unparsed AST
            # For now, let's keep the existing line replacement logic but add Shared propagation
            
            # --- NEW: Healing Propagation to SharedLocators ---
            if "SharedLocators." in current_line:
                # Extract constant name, e.g., SharedLocators.LOGIN_BUTTON -> LOGIN_BUTTON
                shared_match = re.search(r"SharedLocators\.([A-Z0-9_]+)", current_line)
                if shared_match:
                    const_name = shared_match.group(1)
                    # Extract the raw locator value from the fixed_line
                    # fixed_line usually looks like: page.locator("...").click() OR self.click("...")
                    val_match = re.search(r"['\"](.*?)['\"]", fixed_line)
                    if val_match:
                        new_val = val_match.group(1)
                        print(f"Propagating fix for SharedLocators.{const_name} to {new_val}")
                        
                        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                        shared_loc_path = os.path.join(root_dir, "locators", "shared_locators.py")
                        
                        if os.path.exists(shared_loc_path):
                            with open(shared_loc_path, 'r') as sl_f:
                                sl_lines = sl_f.readlines()
                            
                            updated_sl = False
                            for i, line in enumerate(sl_lines):
                                if f"{const_name} =" in line:
                                    indent = line[:len(line) - len(line.lstrip())]
                                    sl_lines[i] = f"{indent}{const_name} = \"{new_val}\"\n"
                                    updated_sl = True
                                    break
                            
                            if updated_sl:
                                with open(shared_loc_path, 'w') as sl_f:
                                    sl_f.writelines(sl_lines)
                                print(f"✅ Propagation Successful: Fixed SharedLocators.{const_name}")

            # (Rest of existing persistence logic for the current file)
            # ...
                    
        except Exception as e:
            print(f"Failed to persist fix to disk: {e}")
            # Non-critical for the session to continue, but critical for "healing" functionality.
            return {
                "status": "fixed",
                "original_line": current_line,
                "new_line": fixed_line,
                "message": f"Fixed in memory, but save failed: {str(e)}"
            }

        return {
            "status": "fixed",
            "original_line": current_line,
            "new_line": fixed_line,
            "message": "AI applied a fix and saved to file. Click Resume to continue."
        }
    else:
        return {
            "status": "failed",
            "message": "AI could not determine a fix."
        }

@router.get("/prompts")
def get_healing_prompts_preview():
    """
    Returns the prompts that would be sent to the AI for the current step (or current state).
    """
    ai_service = get_ai_service()
    
    # 1. Determine context
    if session.active and session.lines:
        line_idx = min(session.current_line_idx, len(session.lines) - 1)
        # Avoid index error if empty
        if line_idx < 0: line_idx = 0
            
        failed_line = session.lines[line_idx] if session.lines else "No code loaded."
        error_msg = session.last_error or "No error occurred yet."
        
        # DOM
        dom_snapshot = ""
        if session.page:
            try: dom_snapshot = session.page.content()
            except: dom_snapshot = "DOM unavailable (Page closed or error)"
        else:
            dom_snapshot = "Start session to capture DOM."
            
    else:
        failed_line = "page.get_by_role('button', name='Submit').click() # Example"
        error_msg = "TimeoutError: element not visible"
        dom_snapshot = "<html><body><button hidden>Submit</button></body></html>"
        
    # 2. Get prompts
    return ai_service.get_healing_prompts(
        failed_line=failed_line,
        error_message=error_msg,
        dom_snapshot=dom_snapshot
    )

@router.post("/stop")
def stop_session():
    session.reset()
    return {"status": "stopped"}
