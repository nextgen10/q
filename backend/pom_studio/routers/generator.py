from fastapi import APIRouter, HTTPException
import os
import sys
import subprocess
import json
import re
from studio.backend.models import GenerateRequest

router = APIRouter(prefix="/api/generate", tags=["generator"])

def get_root_dir():
    current = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(os.path.dirname(current)))


def generate_pom_with_ai(input_path: str, output_dir: str) -> dict:
    """
    Use Azure OpenAI to generate a clean POM structure from raw Playwright script.
    Returns a dictionary with generation results.
    """
    from studio.backend.services.ai_service import get_ai_service
    
    # Read the raw script
    with open(input_path, 'r') as f:
        raw_script = f.read()
    
    # Get AI service and refactor
    ai_service = get_ai_service()
    result = ai_service.refactor_playwright_script(raw_script)
    
    # Ensure output directories exist
    for subdir in ["locators", "pages", "data", "tests"]:
        path = os.path.join(output_dir, subdir)
        os.makedirs(path, exist_ok=True)
        # Create __init__.py
        init_path = os.path.join(path, "__init__.py")
        if not os.path.exists(init_path):
            with open(init_path, 'w') as f:
                pass
    
    # Create __init__.py in output_dir
    init_path = os.path.join(output_dir, "__init__.py")
    if not os.path.exists(init_path):
        with open(init_path, 'w') as f:
            pass
    
    # Write locators file
    locators_path = os.path.join(output_dir, "locators", "generated_locators.py")
    with open(locators_path, 'w') as f:
        f.write(result.get("locators_code", "class GeneratedLocators:\n    pass\n"))
    
    # Write page file
    page_path = os.path.join(output_dir, "pages", "generated_page.py")
    with open(page_path, 'w') as f:
        page_code = result.get("page_code", "")
        
        # Advanced Fix: Use regex to replace common Playwright calls with BasePage wrappers
        # self.page.click(...) -> self.click(...)
        page_code = re.sub(r"self\.page\.click\((.*?)\)", r"self.click(\1)", page_code)
        page_code = re.sub(r"self\.page\.fill\((.*?)\)", r"self.type_text(\1)", page_code)
        page_code = re.sub(r"self\.page\.goto\((.*?)\)", r"self.navigate_to(\1)", page_code)
        page_code = re.sub(r"expect\((.*?)\)\.to_be_visible\(\)", r"self.verify_element_visible(\1)", page_code)
        page_code = re.sub(r"expect\((.*?)\)\.to_have_text\((.*?)\)", r"self.verify_element_text(\1, \2)", page_code)

        # Cleanup lines with get_by_role which are the most common source of failure
        lines = page_code.split('\n')
        cleaned_lines = []
        for line in lines:
            if 'get_by_role' in line:
                cleaned_lines.append(f'        # AI Hallucination Fixed: {line.strip()}')
                # Attempt to extract just the name and role to suggest a locator constant name
                role_match = re.search(r"get_by_role\(['\"](\w+)['\"].*?name=['\"](.*?)['\"]", line)
                if role_match:
                    role, name = role_match.groups()
                    const_suggestion = f"INTERNAL_ROLE_{role.upper()}_NAME_{name.upper().replace(' ', '_')}"
                    cleaned_lines.append(f'        # Suggestion: Use GeneratedLocators.{const_suggestion}')
            else:
                cleaned_lines.append(line)
        
        page_code = '\n'.join(cleaned_lines)
        
        # Ensure proper imports if not present
        if "from base.base_page import BasePage" not in page_code:
            page_code = "from base.base_page import BasePage\nfrom generated_pom.locators.generated_locators import GeneratedLocators\nfrom playwright.sync_api import expect\n\n" + page_code
        f.write(page_code)
    
    # Write test data
    data_path = os.path.join(output_dir, "data", "generated_data.json")
    with open(data_path, 'w') as f:
        test_data = result.get("test_data", {})
        if isinstance(test_data, str):
            try:
                test_data = json.loads(test_data)
            except Exception as e:
                test_data = {}
        json.dump(test_data, f, indent=4)
    
    # Write test file
    test_path = os.path.join(output_dir, "tests", "test_generated.py")
    with open(test_path, 'w') as f:
        test_code = result.get("test_code", "")
        pkg_name = os.path.basename(output_dir)
        
        # Validate and fix common AI generation issues
        # Issue 1: Missing page fixture in test method
        test_code = re.sub(r"def (test_\w+)\(self\):", r"def \1(self, page):", test_code)
        test_code = re.sub(r"def (test_\w+)\(self, (?!page)", r"def \1(self, page, ", test_code)
        
        # Issue 2: Improper assignment of set_default_timeout (AI thinks it returns page)
        test_code = test_code.replace("page = page.set_default_timeout", "page.set_default_timeout")
        
        # Issue 3: GeneratedPage() called without page argument
        if "GeneratedPage()" in test_code:
            test_code = test_code.replace("GeneratedPage()", "GeneratedPage(page)")
        
        # Issue 4: POM method called on page object
        if "page_obj = GeneratedPage(page)" in test_code:
            test_code = test_code.replace("page.run_generated_flow", "page_obj.run_generated_flow")

        # Issue 5: Missing page.set_default_timeout
        if "GeneratedPage(page)" in test_code and "set_default_timeout" not in test_code:
            test_code = test_code.replace(
                "GeneratedPage(page)",
                "page.set_default_timeout(Config.TIMEOUT)\n        page_obj = GeneratedPage(page)"
            ).replace("page_obj = page_obj", "page_obj")  # Clean up if doubled

        # Ensure proper imports
        if "import pytest" not in test_code:
            test_code = f"import pytest\n" + test_code
        
        if f"from {pkg_name}.pages.generated_page" not in test_code:
            test_code = f"from {pkg_name}.pages.generated_page import GeneratedPage\n" + test_code
            
        if "from config.config import Config" not in test_code and "Config.TIMEOUT" in test_code:
            test_code = "from config.config import Config\n" + test_code
            
        f.write(test_code)
    
    return {
        "locators": locators_path,
        "page": page_path,
        "data": data_path,
        "test": test_path,
        "is_snippet": result.get("is_snippet", False),
        "snippet_method_name": result.get("snippet_method_name", "")
    }


def validate_generated_test(test_path: str, root_dir: str) -> str:
    """
    Runs the generated test in headless mode to verify it works.
    Returns None if success, or the error message if failure.
    """
    print(f"🧪 Validating generated test: {test_path}")
    try:
        # Run pytest on just this file, headless
        result = subprocess.run(
            [sys.executable, "-m", "pytest", test_path, "-v", "--headless"],
            cwd=root_dir,
            capture_output=True,
            text=True,
            timeout=60 # Safety timeout
        )
        if result.returncode == 0:
            print("✅ AST Code Passed Validation.")
            return None
        else:
            print("❌ AST Code Failed Validation.")
            # Return last 20 lines of output which usually contains the error
            lines = result.stdout.split('\n')
            return '\n'.join(lines[-30:]) if len(lines) > 30 else result.stdout
    except Exception as e:
        return str(e)


def save_ai_fix(output_dir: str, result: dict) -> dict:
    """Helper to save AI review results to disk."""
    # Ensure output directories exist
    for subdir in ["locators", "pages", "data", "tests"]:
        os.makedirs(os.path.join(output_dir, subdir), exist_ok=True)

    locators_path = os.path.join(output_dir, "locators", "generated_locators.py")
    with open(locators_path, 'w') as f:
        f.write(result.get("locators_code", ""))

    page_path = os.path.join(output_dir, "pages", "generated_page.py")
    with open(page_path, 'w') as f:
        f.write(result.get("page_code", ""))

    data_path = os.path.join(output_dir, "data", "generated_data.json")
    with open(data_path, 'w') as f:
        test_data = result.get("test_data", {})
        json.dump(test_data, f, indent=4)

    test_path = os.path.join(output_dir, "tests", "test_generated.py")
    with open(test_path, 'w') as f:
        f.write(result.get("test_code", ""))

    return {
        "locators": locators_path,
        "page": page_path,
        "data": data_path,
        "test": test_path,
        "is_snippet": result.get("is_snippet", False),
        "snippet_method_name": result.get("snippet_method_name", "")
    }


def generate_pom_traditional(root_dir: str, input_file: str, output_dir: str) -> dict:
    """
    Use the traditional AST-based POM converter.
    """
    converter_script = os.path.join(root_dir, "tools", "pom_converter.py")
    
    result = subprocess.run(
        [sys.executable, converter_script, input_file, output_dir],
        cwd=root_dir,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        raise Exception(result.stderr or "POM conversion failed")
    
    return {
        "locators": f"{output_dir}/locators/generated_locators.py",
        "page": f"{output_dir}/pages/generated_page.py",
        "data": f"{output_dir}/data/generated_data.json",
        "test": f"{output_dir}/tests/test_generated.py"
    }


@router.post("")
def generate_pom(request: GenerateRequest):
    """
    Generate POM from raw Playwright script.
    
    If use_ai=True, uses Azure OpenAI for intelligent refactoring with:
    - Semantic locator names (LOGIN_BUTTON instead of INTERNAL_ROLE_LINK_NAME_LOGIN)
    - Cleaner code structure
    - Better test case generation
    
    If use_ai=False (default), uses the traditional AST-based converter.
    """
    root_dir = get_root_dir()
    
    input_path = os.path.join(root_dir, request.input_file)
    output_path = os.path.join(root_dir, request.output_dir)

    # Security check: prevent traversal
    real_root = os.path.realpath(root_dir)
    try:
        real_input = os.path.realpath(input_path)
        real_output = os.path.realpath(output_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid path")
    
    if not real_input.startswith(real_root) or not real_output.startswith(real_root):
         raise HTTPException(status_code=403, detail="Access denied: Cannot generate outside project directory")

    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail=f"Input file not found: {request.input_file}")

    try:
        if request.use_ai:
            print(f"🤖 Hybrid AI Mode: Running AST first for {request.input_file}")
            try:
                # 1. AST First
                files_info = generate_pom_traditional(root_dir, request.input_file, request.output_dir)
                method = "Traditional (Hybrid)"
                
                # 2. Validate
                error = validate_generated_test(os.path.join(root_dir, files_info['test']), root_dir)
                
                if error:
                    print(f"🔄 AST Failed. Sending to AI for Review & Healing...")
                    from studio.backend.services.ai_service import get_ai_service
                    ai = get_ai_service()
                    
                    # Read inputs for AI review
                    with open(input_path, 'r') as f: raw_script = f.read()
                    with open(os.path.join(root_dir, files_info['locators']), 'r') as f: locs = f.read()
                    with open(os.path.join(root_dir, files_info['page']), 'r') as f: pg = f.read()
                    with open(os.path.join(root_dir, files_info['test']), 'r') as f: tst = f.read()
                    with open(os.path.join(root_dir, files_info['data']), 'r') as f: dt = f.read()
                    
                    ai_result = ai.review_and_fix_pom(raw_script, locs, pg, tst, dt, error)
                    save_ai_fix(output_path, ai_result)
                    method = "AI-Healed (Hybrid)"
                else:
                    print("✅ AST Code is solid. Skipping AI review to save cost.")
            except Exception as e:
                print(f"⚠️ AST crashed or failed. Falling back to Pure AI: {e}")
                generate_pom_with_ai(input_path, output_path)
                method = "AI-powered fallback"
        else:
            # Traditional AST-based generation
            print(f"🔧 Using traditional POM generation for {request.input_file}")
            generate_pom_traditional(root_dir, request.input_file, request.output_dir)
            method = "Traditional"
            
        return {
            "status": "success", 
            "message": f"POM Generated successfully ({method})",
            "method": method,
            "files": [
                f"{request.output_dir}/pages/generated_page.py",
                f"{request.output_dir}/locators/generated_locators.py",
                f"{request.output_dir}/data/generated_data.json",
                f"{request.output_dir}/tests/test_generated.py"
            ]
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files")
def list_generated_files():
    root_dir = get_root_dir()
    generated_dir = os.path.join(root_dir, "generated_pom")
    
    if not os.path.exists(generated_dir):
        return {"files": []}
        
    files_list = []
    for root, dirs, files in os.walk(generated_dir):
        for file in files:
            if file.endswith(('.py', '.json')) and not file.startswith('__'):
                # Return relative path from generated_pom root for display
                rel_dir = os.path.relpath(root, generated_dir)
                if rel_dir == ".":
                    files_list.append(file)
                else:
                    files_list.append(os.path.join(rel_dir, file))
    
    return {"files": sorted(files_list)}

