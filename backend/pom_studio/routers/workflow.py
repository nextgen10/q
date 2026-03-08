from fastapi import APIRouter, HTTPException
import os
from studio.backend.models import PublishRequest
from pydantic import BaseModel
import ast
import re
import json
import textwrap

router = APIRouter(prefix="/api", tags=["workflow"])

def get_root_dir():
    current = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(os.path.dirname(current)))

@router.get("/shared-flows")
def list_shared_flows():
    """Extract and list all methods in SharedFlows for the Studio Gallery."""
    root_dir = get_root_dir()
    shared_flows_path = os.path.join(root_dir, "flows", "shared_flows.py")
    
    if not os.path.exists(shared_flows_path):
        return {"flows": []}
        
    def parse_flows_with_ast(file_content: str):
        flows = []
        lines = file_content.splitlines()
        tree = ast.parse(file_content)
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name == "SharedFlows":
                for item in node.body:
                    if isinstance(item, ast.FunctionDef) and item.name != "__init__":
                        docstring = ast.get_docstring(item) or "No description provided."
                        method_code = ""
                        if hasattr(item, "lineno") and hasattr(item, "end_lineno"):
                            method_code = "\n".join(lines[item.lineno - 1:item.end_lineno]).rstrip()
                        flows.append({
                            "name": item.name,
                            "description": docstring,
                            "parameters": [arg.arg for arg in item.args.args if arg.arg != 'self'],
                            "code": method_code,
                        })
        return flows

    def parse_flows_fallback(file_content: str):
        """
        Best-effort parser for malformed files.
        Extracts method signatures/docstrings under class SharedFlows even if AST parsing fails.
        """
        flows = []
        lines = file_content.splitlines()
        in_shared_flows = False
        i = 0

        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            if stripped.startswith("class SharedFlows"):
                in_shared_flows = True
                i += 1
                continue

            if in_shared_flows and re.match(r"^class\s+\w+", stripped) and not stripped.startswith("class SharedFlows"):
                break

            def_match = re.match(r"^\s{4}def\s+([a-zA-Z_]\w*)\s*\((.*?)\)\s*:", line)
            if in_shared_flows and def_match:
                method_name = def_match.group(1)
                if method_name == "__init__":
                    i += 1
                    continue

                raw_args = def_match.group(2)
                parameters = []
                for token in [p.strip() for p in raw_args.split(",") if p.strip()]:
                    if token == "self":
                        continue
                    token = token.split(":")[0].strip()
                    token = token.split("=")[0].strip()
                    if token and token != "self":
                        parameters.append(token)

                description = "No description provided."
                j = i + 1
                if j < len(lines) and re.match(r'^\s{8}("""|\'\'\')', lines[j]):
                    quote = '"""' if '"""' in lines[j] else "'''"
                    doc_lines = []
                    first = lines[j].split(quote, 1)[1]
                    if quote in first:
                        description = first.split(quote, 1)[0].strip() or description
                    else:
                        if first.strip():
                            doc_lines.append(first.strip())
                        j += 1
                        while j < len(lines):
                            current = lines[j]
                            if quote in current:
                                before = current.split(quote, 1)[0].strip()
                                if before:
                                    doc_lines.append(before)
                                break
                            doc_lines.append(current.strip())
                            j += 1
                        joined = " ".join([d for d in doc_lines if d]).strip()
                        if joined:
                            description = joined

                code_start = i
                code_end = i + 1
                while code_end < len(lines):
                    next_line = lines[code_end]
                    next_stripped = next_line.strip()
                    if re.match(r"^\s{4}def\s+[a-zA-Z_]\w*\s*\(", next_line):
                        break
                    if re.match(r"^class\s+\w+", next_stripped):
                        break
                    code_end += 1
                method_code = "\n".join(lines[code_start:code_end]).rstrip()

                flows.append({
                    "name": method_name,
                    "description": description,
                    "parameters": parameters,
                    "code": method_code,
                })

            i += 1

        return flows

    try:
        with open(shared_flows_path, "r") as f:
            file_content = f.read()

        try:
            flows = parse_flows_with_ast(file_content)
        except SyntaxError:
            flows = parse_flows_fallback(file_content)

        return {"flows": flows}
    except Exception as e:
        return {"error": str(e), "flows": []}

class ExtractSnippetRequest(BaseModel):
    filename: str
    start_step: int
    end_step: int
    snippet_name: str
    target_flow_file: str = "flows/shared_flows.py"

@router.post("/extract-snippet")
def extract_snippet(request: ExtractSnippetRequest):
    """Extract a range of steps from a recording into a shared flow method."""
    root_dir = get_root_dir()
    
    # Smart path detection
    if request.filename.startswith("recordings/") or request.filename.startswith("tools/"):
        rec_path = os.path.join(root_dir, request.filename)
    elif request.filename == "raw_recorded.py":
        rec_path = os.path.join(root_dir, "tools", "raw_recorded.py")
    else:
        rec_path = os.path.join(root_dir, "recordings", request.filename)
    
    if not os.path.exists(rec_path):
        # Last ditch effort: search for it if it's just a filename
        if not os.path.dirname(request.filename):
             possible_path = os.path.join(root_dir, "recordings", "sample_flow", request.filename)
             if os.path.exists(possible_path):
                 rec_path = possible_path
                 
    if not os.path.exists(rec_path):
        raise HTTPException(status_code=404, detail=f"Recording not found at: {rec_path}")
        
    try:
        print(f"Extraction Request: {request}")
        print(f"Target Path: {rec_path}")
        with open(rec_path, "r") as f:
            lines = f.readlines()
            
        # 1. Parse recording to find the 'run' function body
        tree = ast.parse("".join(lines))
        run_func = None
        for node in tree.body:
            if isinstance(node, ast.FunctionDef) and node.name == 'run':
                run_func = node
                break
        
        if not run_func:
            raise ValueError("Could not find 'run' function")
            
        # 2. Extract selected steps
        # steps are 0-indexed nodes in run_func.body
        selected_nodes = run_func.body[request.start_step:request.end_step+1]
        
        # 3. Convert nodes back to code (using AST unparse)
        selected_code = []
        for node in selected_nodes:
            # Indent each unparsed node block safely to remain valid inside method body.
            selected_code.append(textwrap.indent(ast.unparse(node), "        "))

        snippet_body = "\n".join(selected_code)
        
        # 4. Format method
        method_name = request.snippet_name.lower().replace(" ", "_")
        new_method = (
            f"\n    def {method_name}(self, data: dict):\n"
            f"        \"\"\"\n"
            f"        Extracted snippet: {request.snippet_name}\n"
            f"        \"\"\"\n"
            f"{snippet_body}\n"
        )
        
        # 5. Append to target flow file
        target_path = os.path.join(root_dir, request.target_flow_file)
        if not os.path.exists(target_path):
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, "w") as f:
                f.write("from base.base_page import BasePage\nfrom playwright.sync_api import expect\nfrom locators.shared_locators import SharedLocators\n\nclass SharedFlows(BasePage):\n    \"\"\"\n    Experimental Flow Layer for reusable business processes.\n    \"\"\"\n")

        with open(target_path, "a") as f:
            f.write(new_method)
            
        return {"status": "success", "message": f"Snippet '{method_name}' extracted to {request.target_flow_file}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/publish")
def publish_test(request: PublishRequest):
    root_dir = get_root_dir()
    gen_dir = os.path.join(root_dir, "generated_pom")
    
    name = request.name.lower().replace(" ", "_")
    pascal_name = "".join(x.capitalize() for x in name.split("_"))
    
    # Prepare folder structure
    folder_path = ""
    if request.folder_name:
        folder_path = request.folder_name.lower().replace(" ", "_")
    
    if not os.path.exists(gen_dir):
        raise HTTPException(status_code=404, detail="No generated POM found.")

    try:
        if request.is_snippet:
            return handle_snippet_publish(root_dir, request, gen_dir, name)

        # Determine destination directories with optional folder structure
        pages_dest = os.path.join(root_dir, "pages", folder_path) if folder_path else os.path.join(root_dir, "pages")
        locators_dest = os.path.join(root_dir, "locators", folder_path) if folder_path else os.path.join(root_dir, "locators")
        tests_dest = os.path.join(root_dir, "tests", folder_path) if folder_path else os.path.join(root_dir, "tests")
        data_dest = os.path.join(root_dir, "data", folder_path) if folder_path else os.path.join(root_dir, "data")
        
        moves = [
            (
                os.path.join(gen_dir, "pages", "generated_page.py"), 
                pages_dest,
                f"{name}_page.py"
            ),
            (
                os.path.join(gen_dir, "locators", "generated_locators.py"), 
                locators_dest,
                f"{name}_locators.py"
            ),
            (
                os.path.join(gen_dir, "tests", "test_generated.py"), 
                tests_dest,
                f"test_{name}.py"
            ),
            (
                os.path.join(gen_dir, "data", "generated_data.json"), 
                data_dest,
                f"{name}_testdata.json"
            ),
            # Also save the raw recording!
            (
                os.path.join(root_dir, "tools", "raw_recorded.py"),
                os.path.join(root_dir, "recordings", folder_path) if folder_path else os.path.join(root_dir, "recordings"),
                f"{name}.py"
            )
        ]
        
        published_files = []
        
        for src, dest_dir, new_filename in moves:
            if os.path.exists(src):
                os.makedirs(dest_dir, exist_ok=True)
                dest = os.path.join(dest_dir, new_filename)
                
                with open(src, 'r') as f:
                    content = f.read()
                
                content = content.replace("GeneratedPage", f"{pascal_name}Page")
                content = content.replace("GeneratedLocators", f"{pascal_name}Locators")
                content = content.replace("TestGenerated", f"Test{pascal_name}")
                
                # Update imports based on folder structure
                if folder_path:
                    content = content.replace("generated_pom.pages.generated_page", f"pages.{folder_path}.{name}_page")
                    content = content.replace("generated_pom.locators.generated_locators", f"locators.{folder_path}.{name}_locators")
                else:
                    content = content.replace("generated_pom.pages.generated_page", f"pages.{name}_page")
                    content = content.replace("generated_pom.locators.generated_locators", f"locators.{name}_locators")
                
                content = content.replace("generated_data.json", f"{name}_testdata.json")

                # Fix path resolution for published tests
                if folder_path:
                    # If in subfolder, go up 3 levels instead of 2
                    content = content.replace(
                        "os.path.dirname(os.path.dirname(os.path.abspath(__file__)))",
                        "os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))"
                    )
                    # And include the folder in the data path
                    content = content.replace(
                        'os.path.join(base_dir, "data",',
                        f'os.path.join(base_dir, "data", "{folder_path}",'
                    )
                
                if dest.endswith(f"test_{name}.py") and request.marker:
                    # Add pytest import if missing
                    if "import pytest" not in content:
                         content = "import pytest\n" + content
                    
                    # Add marker before class definition
                    content = content.replace(f"class Test{pascal_name}", f"@pytest.mark.{request.marker}\nclass Test{pascal_name}")

                with open(dest, 'w') as f:
                    f.write(content)
                    
                published_files.append(dest)
                
        return {"status": "success", "published_files": published_files}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def handle_snippet_publish(root_dir, request, gen_dir, name):
    import re
    # 1. Read Generated Page
    page_src = os.path.join(gen_dir, "pages", "generated_page.py")
    if not os.path.exists(page_src):
        raise HTTPException(status_code=404, detail="Generated page not found for snippet extraction.")
    
    with open(page_src, "r") as f:
        src_content = f.read()

    # 2. Extract method body using regex
    # We look for the method run_generated_flow and take everything until the next def or end of class
    match = re.search(r"def run_generated_flow\(self, data: dict\):(.*?)(?=\n    def |\nclass |$)", src_content, re.DOTALL)
    if not match:
        raise HTTPException(status_code=400, detail="Could not find 'run_generated_flow' method in generated code.")
    
    method_body = match.group(1)
    
    # Refactor method body to use SharedLocators instead of GeneratedLocators
    method_body = method_body.replace("GeneratedLocators.", "SharedLocators.")
    
    # 3. Create the new method signature
    snippet_name = request.name.lower().replace(" ", "_")
    # Basic sanitize
    snippet_name = re.sub(r'[^\w]', '_', snippet_name)
    
    new_method = f"\n    def {snippet_name}_flow(self, data: dict):" + method_body
    
    # 4. Check for collisions in target flow file
    target_path = os.path.join(root_dir, request.target_flow_file)
    if os.path.exists(target_path):
        with open(target_path, "r") as f:
            existing_content = f.read()
            if f"def {snippet_name}_flow" in existing_content:
                raise HTTPException(status_code=400, detail=f"Method '{snippet_name}_flow' already exists in {request.target_flow_file}. Please choose a different name.")

    # 5. Append to target flow file
    if not os.path.exists(target_path):
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "w") as f:
            f.write("from base.base_page import BasePage\nfrom playwright.sync_api import expect\nfrom locators.shared_locators import SharedLocators\nfrom contextlib import contextmanager\n\nclass SharedFlows(BasePage):\n    \"\"\"\n    Experimental Flow Layer for reusable business processes.\n    \"\"\"\n")

    with open(target_path, "a") as f:
        f.write(new_method)

    # 6. Merge locators into shared_locators.py
    locators_src = os.path.join(gen_dir, "locators", "generated_locators.py")
    if os.path.exists(locators_src):
        loc_target = os.path.join(root_dir, "locators", "shared_locators.py")
        os.makedirs(os.path.dirname(loc_target), exist_ok=True)
        
        with open(locators_src, "r") as f:
            new_locs_src = f.read()
            
        # Extract individual locator definitions (lines like CONSTANT = "...")
        # Use regex to find all variable assignments inside the class
        loc_matches = re.findall(r"    ([A-Z0-9_]+)\s*=\s*(['\"].*?['\"])", new_locs_src)
        
        if loc_matches:
            if not os.path.exists(loc_target):
                with open(loc_target, "w") as f:
                    f.write("class SharedLocators:\n    \"\"\"Shared locators for reusable flows\"\"\"\n")
            
            with open(loc_target, "r") as f:
                existing_locs = f.read()
            
            with open(loc_target, "a") as f:
                for var_name, var_val in loc_matches:
                    if f"{var_name} =" not in existing_locs:
                        f.write(f"    {var_name} = {var_val}\n")


    # 7. Merge Data into shared_data.json
    data_src = os.path.join(gen_dir, "data", "generated_data.json")
    if os.path.exists(data_src):
        import json
        shared_data_path = os.path.join(root_dir, "data", "shared_data.json")
        os.makedirs(os.path.dirname(shared_data_path), exist_ok=True)
        
        with open(data_src, "r") as f:
            new_data = json.load(f)
            
        shared_data = {}
        if os.path.exists(shared_data_path):
            with open(shared_data_path, "r") as f:
                try:
                    shared_data = json.load(f)
                except:
                    shared_data = {}
        
        # Merge new keys into shared data (preserving existing ones)
        shared_data.update(new_data)
        
        with open(shared_data_path, "w") as f:
            json.dump(shared_data, f, indent=4)

    return {"status": "success", "message": f"Snippet '{snippet_name}' published to {request.target_flow_file} with shared data.", "published_files": [target_path, os.path.join(root_dir, "data", "shared_data.json")]}
