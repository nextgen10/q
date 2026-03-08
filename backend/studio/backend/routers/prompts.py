from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import shutil

router = APIRouter(prefix="/api/prompts", tags=["prompts"])

def get_root_dir():
    current = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(os.path.dirname(current)))

def get_prompts_dir():
    return os.path.join(get_root_dir(), "studio", "backend", "prompts")

class PromptUpdate(BaseModel):
    content: str

@router.get("/list")
def list_prompts():
    """List all prompt files."""
    prompts_dir = get_prompts_dir()
    if not os.path.exists(prompts_dir):
        return []
    
    files = [f for f in os.listdir(prompts_dir) if f.endswith(".txt")]
    return sorted(files)

@router.get("/{filename}")
def get_prompt(filename: str):
    """Get the content of a specific prompt file."""
    prompts_dir = get_prompts_dir()
    file_path = os.path.join(prompts_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Prompt file not found")
    
    try:
        with open(file_path, "r") as f:
            content = f.read()
        return {"filename": filename, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{filename}")
def update_prompt(filename: str, request: PromptUpdate):
    """Update the content of a specific prompt file."""
    prompts_dir = get_prompts_dir()
    file_path = os.path.join(prompts_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Prompt file not found")
    
    try:
        # Create a backup first
        backup_path = file_path + ".bak"
        shutil.copy2(file_path, backup_path)
        
        with open(file_path, "w") as f:
            f.write(request.content)
            
        return {"status": "success", "message": f"Prompt '{filename}' updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
