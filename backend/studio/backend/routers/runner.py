from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
import os
import sys
import subprocess
import traceback
import importlib
import re
import time
from studio.backend.models import TestRunRequest, MarkerAssignRequest
import config.config
from config.config import Config
from studio.backend.routers import roi

router = APIRouter(prefix="/api/tests", tags=["runner"])

def get_root_dir():
    current = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(current))

@router.get("/list")
def list_tests():
    """Lists all test files in the tests/ and generated_pom/tests/ directories."""
    root_dir = get_root_dir()
    
    test_locations = [
        {"dir": os.path.join(root_dir, "tests"), "prefix": ""}
    ]
    
    tests = []
    
    for loc in test_locations:
        tests_dir = loc["dir"]
        if not os.path.exists(tests_dir):
            continue
            
        # Walk through all subdirectories
        for root, dirs, files in os.walk(tests_dir):
            for file in files:
                if file.startswith("test_") and file.endswith(".py"):
                    # Get relative path from specific tests directory
                    sub_rel_path = os.path.relpath(os.path.join(root, file), tests_dir)
                    
                    # Full relative path from project root for running/previewing
                    full_rel_path = loc["prefix"] + sub_rel_path
                    
                    # Extract folder name (if in subdirectory)
                    folder = os.path.dirname(sub_rel_path) if os.path.dirname(sub_rel_path) else None
                    if loc["prefix"] == "generated_pom/tests/":
                        folder = f"generated_pom/{folder}" if folder else "generated_pom"
                        
                    # Peek into file for markers
                    markers = []
                    try:
                        full_path = os.path.join(root, file)
                        with open(full_path, 'r') as f:
                            content_peek = f.read(10000) 
                            matches = re.findall(r'@pytest\.mark\.(\w+)', content_peek)
                            if matches:
                                markers = list(set(matches))
                    except:
                        pass
    
                    tests.append({
                        "name": file,
                        "path": full_rel_path,
                        "folder": folder,
                        "markers": markers
                    })
    
    # Sort by folder first, then by name
    tests.sort(key=lambda x: (x['folder'] or '', x['name']))
    
    return {"tests": tests}

@router.post("/run")
def run_tests(request: TestRunRequest):
    root_dir = get_root_dir()
    
    # Determine which files to run
    files_to_run = []
    
    # Priority 1: request.test_files (List)
    if request.test_files:
        for f in request.test_files:
            if f == "generated_pom/tests/test_generated.py":
                files_to_run.append(os.path.join(root_dir, "generated_pom", "tests", "test_generated.py"))
            else:
                files_to_run.append(os.path.join(root_dir, "tests", f))

     # Priority 2: request.test_file (Single String - Legacy or "ALL")
    elif request.test_file:
        if request.test_file == "ALL":
             # Run everything in tests/ 
             # Only run the main test suite, do NOT include generated_pom/tests/test_generated.py
             files_to_run.append(os.path.join(root_dir, "tests"))
        elif request.test_file == "generated_pom/tests/test_generated.py":
             files_to_run.append(os.path.join(root_dir, "generated_pom", "tests", "test_generated.py"))
        else:
             files_to_run.append(os.path.join(root_dir, "tests", request.test_file))
    else:
        # If marker is provided but no files, run all tests in tests/
        if request.marker:
            files_to_run.append(os.path.join(root_dir, "tests"))
        else:
            # Default to generated test
            files_to_run.append(os.path.join(root_dir, "generated_pom", "tests", "test_generated.py"))
    
    # Remove duplicates while preserving order
    files_to_run = list(dict.fromkeys(files_to_run))

    # Validation
    valid_files = [f for f in files_to_run if os.path.exists(f)]
    if not valid_files:
        raise HTTPException(status_code=404, detail=f"No valid test files found: {files_to_run}")

    report_file = os.path.join(root_dir, "reports", "report.html")
    os.makedirs(os.path.dirname(report_file), exist_ok=True)
    
    # Live log file for streaming
    live_log_file = os.path.join(root_dir, "reports", "live_test_execution.log")
    # Clear previous log
    with open(live_log_file, 'w') as f:
        f.write("")

    try:
        # Reload config to pick up latest settings changes
        importlib.reload(config.config)
        from config.config import Config
        
        # Construct pytest command
        # Using self-contained-html only if using pytest-html, but we are using custom reporter now.
        # Removing --html arg to avoid conflict and double reporting.
        cmd = [sys.executable, "-m", "pytest"] + valid_files + ["-v"]
        
        # Override headless if requested, or fallback to Config
        # Note: request.headless defaults to False.
        # But Config.HEADLESS might be False.
        # Logic: If request specifies preference, use it? Or just stick to Config?
        # Let's stick to Config for consistency, or allow override.
        # The UI "Settings" usually controls Config, but let's assume Config is truth for now.
        
        if not Config.HEADLESS:
            cmd.append("--headed")
        if hasattr(Config, 'SLOW_MO') and Config.SLOW_MO:
            cmd.append(f"--slowmo={Config.SLOW_MO}")
            
        if request.marker:
            cmd.extend(["-m", request.marker])

        # Parallel Execution
        # Parallel Execution
        if request.parallel:
            # If workers explicitly provided in request, use it.
            # If request.parallel_workers is None, check Config.DEFAULT_PARALLEL_WORKERS.
            # If neither, default to "auto".
            if request.parallel_workers:
                workers = request.parallel_workers
            elif hasattr(Config, 'DEFAULT_PARALLEL_WORKERS') and Config.DEFAULT_PARALLEL_WORKERS:
                workers = Config.DEFAULT_PARALLEL_WORKERS
            else:
                workers = "auto"
                
            cmd.extend(["-n", str(workers)])
            print(f"DEBUG: Running in parallel with {workers} workers")
            
        print(f"DEBUG: Running test command: {cmd}")
        
        start_time = time.time()
        
        # Run with live output streaming to file
        with open(live_log_file, 'w') as log_f:
            process = subprocess.Popen(
                cmd, 
                cwd=root_dir, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            output_lines = []
            for line in process.stdout:
                log_f.write(line)
                log_f.flush()  # Ensure immediate write
                output_lines.append(line)
            
            process.wait()
            end_time = time.time()
            duration = end_time - start_time
            
            result_output = ''.join(output_lines)
            result_code = process.returncode
            
            # Record ROI Stats
            try:
                # Regex to find collected count (handles '1 item' or '2 items')
                # Standard: "collected 5 items"
                # xdist: "2 workers [5 items]"
                match = re.search(r'collected (\d+) item', result_output)
                if not match:
                    match = re.search(r'\[(\d+) item', result_output)
                
                count = int(match.group(1)) if match else len(valid_files) # Fallback to file count
                
                from studio.backend.services.roi_service import ROIService
                ROIService.record_run(
                    test_count=count,
                    duration_seconds=duration
                )
            except Exception as rx:
                print(f"Failed to record ROI stats: {rx}")
        
        return {
            "status": "success" if result_code == 0 else "failed",
            "output": result_output,
            "return_code": result_code,
            "report_path": "/api/tests/report/download" 
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "status": "error",
            "output": f"Internal Server Error: {str(e)}\n\n{traceback.format_exc()}",
            "return_code": 1
        }

@router.get("/logs")
def get_live_logs(offset: int = 0):
    """Stream live test execution logs incrementally."""
    root_dir = get_root_dir()
    live_log_file = os.path.join(root_dir, "reports", "live_test_execution.log")
    
    if not os.path.exists(live_log_file):
        return {"content": "", "offset": 0, "is_complete": True}
    
    try:
        with open(live_log_file, 'r') as f:
            # Seek to the offset
            f.seek(offset)
            # Read new content
            new_content = f.read()
            # Get new offset
            new_offset = f.tell()
        
        return {
            "content": new_content,
            "offset": new_offset,
            "is_complete": False  # Frontend will determine completion
        }
    except Exception as e:
        return {"content": "", "offset": offset, "is_complete": True, "error": str(e)}


@router.get("/report/exists")
def check_report_exists():
    root_dir = get_root_dir()
    report_file = os.path.join(root_dir, "reports", "extent_report.html")
    exists = os.path.exists(report_file)
    return {"exists": exists}

@router.get("/report/download")
def download_report():
    root_dir = get_root_dir()
    # User requested Extent Report explicitly
    report_file = os.path.join(root_dir, "reports", "extent_report.html")
    print(f"DEBUG: Download requested. Root: {root_dir}")
    print(f"DEBUG: Looking for report at: {report_file}")
    
    if os.path.exists(report_file):
        headers = {
            "Content-Disposition": 'attachment; filename="extent_report.html"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
        return FileResponse(
            report_file, 
            media_type="text/html", 
            filename="extent_report.html",
            headers=headers
        )
    else:
        # If no report, return simple HTML
        return FileResponse(path=os.path.join(root_dir, "pytest.ini"), status_code=404) # Mock 404
        # Better: raise exception
        raise HTTPException(status_code=404, detail="Report not generated yet.")

@router.delete("/delete/{filepath:path}")
def delete_test(filepath: str):
    """
    Delete a specific test file or folder.
    Also handles cascading deletion of associated framework files (pages, locators, data)
    and cleans up empty directories.
    """
    root_dir = get_root_dir()
    tests_dir = os.path.join(root_dir, "tests")
    target_path = os.path.join(tests_dir, filepath)

    # Security check: prevent ../ traversal
    real_tests_dir = os.path.realpath(tests_dir)
    real_target_path = os.path.realpath(target_path)
    if not real_target_path.startswith(real_tests_dir):
        raise HTTPException(status_code=403, detail="Access denied: Cannot delete outside tests directory")

    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="File or directory not found")

    import shutil

    deleted_log = []

    def clean_empty_dir(dir_path, base_limit):
        """Recursively delete empty parent directories up to base_limit"""
        if not dir_path or not os.path.exists(dir_path) or not os.path.isdir(dir_path):
            return
        
        # Security check: don't delete the base limit dir itself or anything above it
        real_dir = os.path.realpath(dir_path)
        real_limit = os.path.realpath(base_limit)
        if real_dir == real_limit or not real_dir.startswith(real_limit):
            return

        # Check contents
        items = os.listdir(dir_path)
        # We consider a directory "empty" if it only contains system files or empty __init__.py
        valid_items = []
        for item in items:
            if item in ['__pycache__', '.DS_Store']:
                continue
            if item == '__init__.py':
                # Check if it's empty
                init_path = os.path.join(dir_path, item)
                if os.path.getsize(init_path) == 0:
                    continue
            valid_items.append(item)
        
        if not valid_items:
            try:
                shutil.rmtree(dir_path)
                deleted_log.append(f"Cleaned empty dir: {os.path.relpath(dir_path, root_dir)}")
                # Recurse to parent
                parent = os.path.dirname(dir_path)
                clean_empty_dir(parent, base_limit)
            except Exception as e:
                print(f"Failed to clean dir {dir_path}: {e}")

    try:
        if os.path.isdir(target_path):
            # --- FOLDER DELETION ---
            # If deleting a folder in tests, delete corresponding folders in pages, locators, data
            folder_name = filepath # filepath is relative name of folder e.g. "auth"
            
            # 1. Delete the test folder
            shutil.rmtree(target_path)
            deleted_log.append(f"Deleted test folder: {filepath}")

            # 2. Delete associated folders
            framework_dirs = ["pages", "locators", "data", "recordings"]
            for f_type in framework_dirs:
                assoc_dir = os.path.join(root_dir, f_type, folder_name)
                if os.path.exists(assoc_dir) and os.path.isdir(assoc_dir):
                    shutil.rmtree(assoc_dir)
                    deleted_log.append(f"Deleted associated {f_type} folder: {folder_name}")

        else:
            # --- FILE DELETION ---
            # filepath is e.g., "auth/test_login.py" or "test_login.py"
            filename = os.path.basename(filepath)
            folder_part = os.path.dirname(filepath) # e.g. "auth" or ""

            if not filename.startswith("test_") or not filename.endswith(".py"):
                # Just delete the file if it doesn't match convention
                os.remove(target_path)
                deleted_log.append(f"Deleted file: {filepath}")
            else:
                # 1. Delete the test file
                os.remove(target_path)
                deleted_log.append(f"Deleted test file: {filepath}")

                # 2. Identify base name
                # test_login.py -> login
                base_name = filename[5:-3]

                # 3. Define associated patterns
                # pages/folder/base_name_page.py
                # locators/folder/base_name_locators.py
                # data/folder/base_name_testdata.json or .xlsx
                
                associations = [
                    (os.path.join(root_dir, "pages", folder_part, f"{base_name}_page.py"), "page"),
                    (os.path.join(root_dir, "locators", folder_part, f"{base_name}_locators.py"), "locator"),
                    (os.path.join(root_dir, "data", folder_part, f"{base_name}_testdata.json"), "data"),
                    (os.path.join(root_dir, "data", folder_part, f"{base_name}_testdata.xlsx"), "data"),
                    (os.path.join(root_dir, "recordings", folder_part, f"{base_name}.py"), "recording")
                ]

                for assoc_path, label in associations:
                    if os.path.exists(assoc_path):
                        os.remove(assoc_path)
                        deleted_log.append(f"Deleted associated {label}: {os.path.basename(assoc_path)}")
                        
                        # Check if parent folder matches the test folder part and is now empty
                        parent_dir = os.path.dirname(assoc_path)
                        label_map = {"page": "pages", "locator": "locators", "data": "data", "recording": "recordings"}
                        assoc_base = os.path.join(root_dir, label_map.get(label, label))
                        clean_empty_dir(parent_dir, assoc_base)

                # 4. Clean up the test folder if empty
                if folder_part:
                    clean_empty_dir(os.path.join(tests_dir, folder_part), tests_dir)

        return {"status": "success", "message": "Deletion complete", "details": deleted_log}
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assign-marker")
def assign_marker(request: MarkerAssignRequest):
    """
    Assign a marker to multiple test files.
    If the marker doesn't exist in config, it will be added.
    """
    root_dir = get_root_dir()
    tests_dir = os.path.join(root_dir, "tests")
    config_path = os.path.join(root_dir, "config", "config.py")
    
    marker = request.marker.strip().lower()
    if not marker:
        raise HTTPException(status_code=400, detail="Marker name cannot be empty")
    
    # Regular expression to match class definition
    class_pattern = re.compile(r'^class\s+Test\w+\s*\(?\w*\)?\s*:', re.MULTILINE)
    marker_decorator = f"@pytest.mark.{marker}\n"
    
    updated_files = []
    
    for rel_path in request.test_files:
        full_path = os.path.join(tests_dir, rel_path)
        if not os.path.exists(full_path):
            continue
            
        with open(full_path, 'r') as f:
            lines = f.readlines()
            
        content = "".join(lines)
        
        # Check if already has this exact marker
        if f"@pytest.mark.{marker}" in content:
            continue
            
        # Check limit: allow max 3 markers
        existing_markers = re.findall(r'@pytest\.mark\.\w+', content)
        if len(existing_markers) >= 3:
            continue
            
        # Add import if missing
        has_pytest_import = any("import pytest" in line for line in lines)
        
        # Find position to insert
        match = class_pattern.search(content)
        if match:
            insert_pos = match.start()
            new_content = content[:insert_pos] + marker_decorator + content[insert_pos:]
            
            if not has_pytest_import:
                new_content = "import pytest\n" + new_content
                
            with open(full_path, 'w') as f:
                f.write(new_content)
            updated_files.append(rel_path)

    # Update global config if marker is new
    try:
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config_content = f.read()
            
            # Extract current markers
            marker_match = re.search(r'MARKERS\s*=\s*\[(.*?)\]', config_content, re.DOTALL)
            if marker_match:
                current_markers_str = marker_match.group(1)
                current_markers = [m.strip().strip('"').strip("'") for m in current_markers_str.split(',') if m.strip()]
                
                if marker not in current_markers:
                    current_markers.append(marker)
                    new_markers_str = str(current_markers)
                    new_config_content = re.sub(r'MARKERS\s*=\s*\[.*?\]', f'MARKERS = {new_markers_str}', config_content)
                    with open(config_path, 'w') as f:
                        f.write(new_config_content)
    except Exception as e:
        print(f"Failed to update global config markers: {e}")

    return {
        "status": "success", 
        "message": f"Marker '{marker}' assigned to {len(updated_files)} files",
        "updated_files": updated_files
    }

@router.post("/remove-marker")
def remove_marker(request: MarkerAssignRequest):
    """
    Remove a specific marker from multiple test files.
    """
    root_dir = get_root_dir()
    tests_dir = os.path.join(root_dir, "tests")
    
    marker = request.marker.strip().lower()
    if not marker:
        raise HTTPException(status_code=400, detail="Marker name cannot be empty")
    
    marker_line = f"@pytest.mark.{marker}"
    updated_files = []
    
    for rel_path in request.test_files:
        full_path = os.path.join(tests_dir, rel_path)
        if not os.path.exists(full_path):
            continue
            
        with open(full_path, 'r') as f:
            lines = f.readlines()
            
        # Filter out lines that match the marker
        new_lines = [line for line in lines if not line.strip().startswith(marker_line)]
        
        if len(new_lines) < len(lines):
            with open(full_path, 'w') as f:
                f.writelines(new_lines)
            updated_files.append(rel_path)

    return {
        "status": "success", 
        "message": f"Marker '{marker}' removed from {len(updated_files)} files",
        "updated_files": updated_files
    }

@router.get("/preview")
def preview_test_code(test_path: str):
    """
    Fetch code for test, page, locator, and data components.
    """
    root_dir = get_root_dir()
    
    # Normalize path
    if test_path.startswith("generated_pom"):
        full_test_path = os.path.join(root_dir, test_path)
        base_prefix = "generated_pom"
        # rel_to_base will be something like "test_generated.py" or "test/test1.py"
        rel_to_base = os.path.relpath(test_path, "generated_pom/tests")
    else:
        full_test_path = os.path.join(root_dir, "tests", test_path)
        base_prefix = ""
        rel_to_base = test_path

    if not os.path.exists(full_test_path):
        raise HTTPException(status_code=404, detail=f"Test file not found: {test_path}")

    # Read test code
    with open(full_test_path, 'r') as f:
        test_code = f.read()

    # Determine subfolder and name for related files
    subfolder = os.path.dirname(rel_to_base)
    filename = os.path.basename(rel_to_base)
    
    # Extract name part: test_test1.py -> test1
    # Extract name part: test_test1.py -> test1 (only remove LEADING test_)
    name = filename
    if name.startswith("test_"):
        name = name[5:]
    name = name.replace(".py", "")

    def get_file_info(prefix, category, sub, name_suffix, ext=".py"):
        possible_paths = []
        if prefix:
            possible_paths.append(os.path.join(root_dir, prefix, category, f"{name}{name_suffix}{ext}"))
        else:
            possible_paths.append(os.path.join(root_dir, category, sub, f"{name}{name_suffix}{ext}"))
            possible_paths.append(os.path.join(root_dir, category, f"{name}{name_suffix}{ext}"))

        for path in possible_paths:
            if os.path.exists(path):
                try:
                    rel_path = os.path.relpath(path, root_dir)
                    with open(path, 'r') as f:
                        return f.read(), rel_path
                except:
                    pass
        return "", ""

    test_rel_path = os.path.relpath(full_test_path, root_dir)
    page_code, page_path = get_file_info(base_prefix, "pages", subfolder, "_page")
    locator_code, locator_path = get_file_info(base_prefix, "locators", subfolder, "_locators")
    data_code, data_path = get_file_info(base_prefix, "data", subfolder, "_testdata", ext=".json")
    
    if not data_code:
        data_code, data_path = get_file_info(base_prefix, "data", subfolder, "_data", ext=".json")

    return {
        "test": test_code,
        "page": page_code,
        "locator": locator_code,
        "data": data_code,
        "paths": {
            "test": test_rel_path,
            "page": page_path,
            "locator": locator_path,
            "data": data_path
        }
    }
