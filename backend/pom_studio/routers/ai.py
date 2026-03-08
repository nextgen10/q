"""
AI-powered Test Healing Router
Analyzes test failures and suggests/applies fixes.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import json

router = APIRouter(prefix="/api/ai", tags=["ai"])


def get_root_dir():
    current = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(os.path.dirname(current)))


class HealRequest(BaseModel):
    error_message: str
    error_traceback: str
    test_file: str = "generated_pom/tests/test_generated.py"
    page_file: str = "generated_pom/pages/generated_page.py"
    locators_file: str = "generated_pom/locators/generated_locators.py"


class HealResponse(BaseModel):
    status: str
    analysis: str
    fixes_applied: bool
    fixed_locators: Optional[str] = None
    fixed_page: Optional[str] = None
    suggestions: list = []


@router.post("/heal", response_model=HealResponse)
def heal_test_failure(request: HealRequest):
    """
    Analyze a test failure and use AI to fix the issues.
    """
    from studio.backend.services.ai_service import get_ai_service
    
    root_dir = get_root_dir()
    
    # Read current files
    locators_path = os.path.join(root_dir, request.locators_file)
    page_path = os.path.join(root_dir, request.page_file)
    
    try:
        with open(locators_path, 'r') as f:
            current_locators = f.read()
    except Exception as e:
        current_locators = "# Could not read locators file"
    
    try:
        with open(page_path, 'r') as f:
            current_page = f.read()
    except Exception as e:
        current_page = "# Could not read page file"
    
    # Use AI to analyze and fix
    ai_service = get_ai_service()
    
    system_prompt = ai_service.load_prompt("healing_test_system.txt")
    user_prompt_template = ai_service.load_prompt("healing_test_user.txt")
    
    user_prompt = user_prompt_template.format(
        error_message=request.error_message,
        error_traceback=request.error_traceback,
        current_locators=current_locators,
        current_page=current_page
    )



    try:
        response = ai_service.generate_with_system_prompt(
            system_prompt,
            user_prompt,
            max_tokens=4000,
            temperature=0.3
        )
        
        # Clean up response
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        
        try:
            result = json.loads(cleaned.strip())
        except json.JSONDecodeError as e:
            print(f"❌ JSON Parse Error in Heal: {e}")
            print(f"RAW RESPONSE: {cleaned}")
            raise ValueError(f"AI returned invalid JSON: {e}")
        
        fixes_applied = False
        
        # Apply fixes if provided
        if result.get("fixed_locators"):
            with open(locators_path, 'w') as f:
                f.write(result["fixed_locators"])
            fixes_applied = True
            print(f"✅ Applied fixes to {locators_path}")
        
        if result.get("fixed_page"):
            with open(page_path, 'w') as f:
                f.write(result["fixed_page"])
            fixes_applied = True
            print(f"✅ Applied fixes to {page_path}")
        
        return HealResponse(
            status="success",
            analysis=f"{result.get('analysis', '')}\n\nRoot Cause: {result.get('root_cause', 'Unknown')}",
            fixes_applied=fixes_applied,
            fixed_locators=result.get("fixed_locators"),
            fixed_page=result.get("fixed_page"),
            suggestions=result.get("suggestions", [])
        )
        
    except Exception as e:
        print(f"❌ AI Healing failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
def ai_status():
    """Check if AI service is configured and working."""
    try:
        from studio.backend.services.ai_service import get_ai_service
        ai_service = get_ai_service()
        return {
            "status": "ok",
            "deployment": ai_service.deployment,
            "message": "AI Service is configured and ready"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@router.post("/prompts")
def get_ai_prompts(request: dict):
    """
    Get the prompts that will be sent to the AI.
    """
    from studio.backend.services.ai_service import get_ai_service
    ai_service = get_ai_service()
    
    raw_script = request.get("raw_script", "")
    prompts = ai_service.refactor_playwright_script(raw_script, return_prompts_only=True)
    
    return prompts




class ChatRequest(BaseModel):
    messages: list # List of {role, content}
    context: Optional[str] = None # Optional code context

@router.post("/chat")
def chat_with_ai(request: ChatRequest):
    """
    Chat with the AI Assistant.
    """
    try:
        from studio.backend.services.ai_service import get_ai_service
        ai_service = get_ai_service()
        response = ai_service.chat(request.messages, request.context)
        return {"response": response}
    except ValueError as e:
        # Configuration error (missing keys)
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        # Runtime/API error
        raise HTTPException(status_code=500, detail=str(e))
