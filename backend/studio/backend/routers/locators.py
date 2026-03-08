import os
import ast
import json
import re
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

router = APIRouter(prefix="/api/locators", tags=["locators"])

def update_references(root_dir: str, locator_file_path: str, class_name: str, old_name: str, new_name: str):
    """
    Search for usages of ClassName.OLD_NAME and replace with ClassName.NEW_NAME
    ONLY in the corresponding page file (X_locators.py -> X_page.py).
    """
    
    # 1. Derive page path from locator path
    # Expected format: .../locators/subdir/name_locators.py -> .../pages/subdir/name_page.py
    
    # Normalize separators
    normalized_path = locator_file_path.replace("\\", "/")
    
    # Check if inside 'locators' dir
    if "/locators/" not in normalized_path and not normalized_path.startswith("locators/"):
         print(f"Skipping reference update: {locator_file_path} is not in a locators folder")
         return []
    
    # Replace 'locators' with 'pages' (handle both relative and absolute parts if needed)
    # Strategy: Split by 'locators/' and rebuild
    parts = normalized_path.split("/locators/")
    if len(parts) < 2:
         return []
         
    prefix = parts[0]
    suffix = parts[1] # e.g. ai/ai_test1_locators.py
    
    # Replace _locators.py with _page.py
    if suffix.endswith("_locators.py"):
        page_suffix = suffix.replace("_locators.py", "_page.py")
    elif suffix.endswith(".py"):
        # Fallback if strict naming isn't followed but strictly requested
        page_suffix = suffix 
    else:
        return []
        
    page_relative_path = os.path.join("pages", page_suffix)
    
    # Construct full path
    # If path was absolute, prefix has the root. If relative, we assume root_dir + pages + suffix
    if os.path.isabs(normalized_path):
        page_full_path = os.path.join(prefix, "pages", page_suffix)
    else:
        page_full_path = os.path.join(root_dir, "pages", page_suffix)

    if not os.path.exists(page_full_path):
        print(f"Corresponding page file not found: {page_full_path}")
        return []
        
    updated_files = []
    search_pattern = re.compile(rf"\b{class_name}\.{old_name}\b")
    
    try:
        with open(page_full_path, "r") as f:
            content = f.read()
        
        if search_pattern.search(content):
            # Replace
            new_content = search_pattern.sub(f"{class_name}.{new_name}", content)
            with open(page_full_path, "w") as f:
                f.write(new_content)
            updated_files.append(page_full_path)
            print(f"Updated references in {page_full_path}")
    except Exception as e:
        print(f"Failed to update references in {page_full_path}: {e}")
                        
    return updated_files

def get_root_dir():
    # Adjust this based on where main.py is or derived from __file__
    # studio/backend/routers/locators.py -> studio/backend/routers -> studio/backend -> studio -> root
    current = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(current))

class LocatorItem(BaseModel):
    name: str
    value: str
    line_number: int

class LocatorClass(BaseModel):
    name: str
    locators: List[LocatorItem]
    
class LocatorFile(BaseModel):
    file_path: str
    file_name: str
    classes: List[LocatorClass]
    content: Optional[str] = None # Include raw content

@router.get("/", response_model=List[LocatorFile])
async def get_locators():
    root_dir = get_root_dir()
    locators_dir = os.path.join(root_dir, "locators")
    results = []
    
    if not os.path.exists(locators_dir):
        return []
        
    for root, _, files in os.walk(locators_dir):
        for file in files:
            if file.endswith(".py") and not file.startswith("__"):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, locators_dir)
                
                try:
                    with open(full_path, "r") as f:
                        content = f.read()
                    
                    try:
                        tree = ast.parse(content)
                    except SyntaxError:
                        print(f"Syntax error in {full_path}")
                        continue
                        
                    classes = []
                    
                    for node in ast.walk(tree):
                        if isinstance(node, ast.ClassDef):
                            locators = []
                            for item in node.body:
                                if isinstance(item, ast.Assign):
                                    if len(item.targets) == 1 and isinstance(item.targets[0], ast.Name):
                                        # Handle different value types roughly
                                        val = "UNKNOWN"
                                        if isinstance(item.value, ast.Constant):
                                             val = item.value.value
                                        elif isinstance(item.value, ast.Str): # Python < 3.8
                                             val = item.value.s
                                        else:
                                             try:
                                                val = ast.get_source_segment(content, item.value)
                                             except Exception as e:
                                                pass
                                        
                                        locators.append(LocatorItem(
                                            name=item.targets[0].id,
                                            value=str(val),
                                            line_number=item.lineno
                                        ))
                            if locators:
                                classes.append(LocatorClass(name=node.name, locators=locators))
                    
                    if classes:
                        results.append(LocatorFile(file_path=full_path, file_name=rel_path, classes=classes, content=content))
                except Exception as e:
                    print(f"Error parsing {full_path}: {e}")
                    continue
    return results

class UpdateLocatorRequest(BaseModel):
    file_path: str
    class_name: str
    locator_name: str
    new_name: Optional[str] = None
    new_value: Optional[str] = None

@router.post("/update")
async def update_locator(req: UpdateLocatorRequest):
    root_dir = get_root_dir()
    
    # Locate file
    if os.path.exists(req.file_path):
        target_path = req.file_path
    elif os.path.exists(os.path.join(root_dir, req.file_path)):
        target_path = os.path.join(root_dir, req.file_path)
    # Check if relative to locators dir
    elif os.path.exists(os.path.join(root_dir, "locators", req.file_path)):
        target_path = os.path.join(root_dir, "locators", req.file_path)
    else:
        raise HTTPException(404, "File not found")
        
    with open(target_path, "r") as f:
        lines = f.readlines()
        
    content = "".join(lines)
    try:
        tree = ast.parse(content)
    except SyntaxError:
         raise HTTPException(400, "File has syntax errors, cannot update automatically")
    
    target_node = None
    
    # Only support updating the specific class/locator requested
    found = False
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == req.class_name:
            for item in node.body:
                if isinstance(item, ast.Assign):
                     if len(item.targets) == 1 and isinstance(item.targets[0], ast.Name):
                         if item.targets[0].id == req.locator_name:
                             target_node = item
                             found = True
                             break
            if found: break
            
    if found:
        # UPDATE existing
        lineno = target_node.lineno - 1
        original_line = lines[lineno]
        indent = original_line[:len(original_line) - len(original_line.lstrip())]
        
        final_name = req.new_name if req.new_name else req.locator_name
        final_value = req.new_value if req.new_value is not None else target_node.value.value
        
        # Use repr to properly quote string
        lines[lineno] = f"{indent}{final_name} = {repr(final_value)}\n"

    else:
        # CREATE new
        # Find the class node to determine insertion point
        class_node = None
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name == req.class_name:
                class_node = node
                break
        
        if not class_node:
             raise HTTPException(404, "Class not found in file")

        final_name = req.new_name if req.new_name else req.locator_name
        final_value = req.new_value if req.new_value is not None else "new_locator"

        # Check for existence one last time in case AST missed it or to prevent duplicate append
        # This is a basic string check to be safe
        check_pattern = re.compile(rf"^\s*{final_name}\s*=")
        exists_in_lines = any(check_pattern.match(line.strip()) for line in lines)
        
        if exists_in_lines:
            raise HTTPException(400, f"Locator '{final_name}' already exists in file. Cannot create duplicate.")

        # Determine indentation from the last statement in the class
        if class_node.body:
            last_item = class_node.body[-1]
            last_lineno = last_item.lineno
            # Get indentation of the last item
            if last_lineno <= len(lines):
                last_line_content = lines[last_lineno - 1]
                indent = last_line_content[:len(last_line_content) - len(last_line_content.lstrip())]
            else:
                indent = "    "
        else:
            # Empty class? Default to 4 spaces
            last_lineno = class_node.lineno
            indent = "    "
        
        # Insert after the last item
        new_line = f"{indent}{final_name} = {repr(final_value)}\n"
        
        # If we are appending to end of file or block, ensure newline check
        if last_lineno >= len(lines):
             if not lines[-1].endswith('\n'):
                 lines[-1] += '\n'
             lines.append(new_line)
             target_lineno = len(lines) - 1
        else:
             lines.insert(last_lineno, new_line)
             target_lineno = last_lineno
        
        print(f"Created new locator '{final_name}' in class '{req.class_name}'")

    
    if found:
         updated_line_content = lines[lineno]
    else:
         updated_line_content = new_line

    with open(target_path, "w") as f:
        f.writelines(lines)
        
    # Check if name changed and update references
    refs_updated = []
    if final_name != req.locator_name:
        refs_updated = update_references(root_dir, target_path, req.class_name, req.locator_name, final_name)
        
    return {"status": "success", "updated_line": updated_line_content, "refs_updated": refs_updated}

class AiSuggestRequest(BaseModel):
    file_path: str
    locator_name: Optional[str] = None 
    recording_content: Optional[str] = None

@router.post("/ai-suggest")
async def ai_suggest(req: AiSuggestRequest):
    from studio.backend.services.ai_service import get_ai_service
    ai_service = get_ai_service()
    
    root_dir = get_root_dir()
    if os.path.exists(req.file_path):
        target_path = req.file_path
    elif os.path.exists(os.path.join(root_dir, req.file_path)):
        target_path = os.path.join(root_dir, req.file_path)
    elif os.path.exists(os.path.join(root_dir, "locators", req.file_path)):
        target_path = os.path.join(root_dir, "locators", req.file_path)
    else:
         raise HTTPException(404, "File not found")
         
    with open(target_path, "r") as f:
        content = f.read()

    system_prompt = ai_service.load_prompt("locator_suggestion_system.txt")
    
    user_template = ai_service.load_prompt("locator_suggestion_user.txt")
    instructions = ai_service.load_prompt("locator_suggestion_instructions.txt")
    
    focus_instruction = f"Focus specifically on improving the locator named: '{req.locator_name}'" if req.locator_name else ""
    recording_context = f"Relevant Recording Reference:\n{req.recording_content}" if req.recording_content else ""
    
    user_prompt = user_template.format(
        content=content,
        focus_instruction=focus_instruction,
        recording_context=recording_context,
        instructions=instructions
    )
    
    try:
        response = ai_service.generate_with_system_prompt(system_prompt, user_prompt, max_tokens=2000, temperature=0.2)
        
        cleaned = response.strip()
        if cleaned.startswith("```json"): cleaned = cleaned[7:]
        if cleaned.startswith("```"): cleaned = cleaned[3:]
        if cleaned.endswith("```"): cleaned = cleaned[:-3]
        
        result = json.loads(cleaned)
        return result
    except Exception as e:
        print(f"AI Suggest Error: {e}")
        # Return empty suggestions on error with message
        return {"suggestions": [], "error": str(e), "raw_response": str(response) if 'response' in locals() else ""}
