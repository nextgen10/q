import os
import sys
import subprocess
import signal
import shutil
import re
from datetime import datetime

class RecorderService:
    _process = None

    @classmethod
    def start(cls, root_dir: str):
        if cls._process and cls._process.poll() is None:
            return {"status": "running", "message": "Recorder already running", "pid": cls._process.pid}

        target_file = os.path.join(root_dir, "tools", "raw_recorded.py")
        os.makedirs(os.path.dirname(target_file), exist_ok=True)

        try:
            cmd = [sys.executable, "-m", "playwright", "codegen", "-o", target_file, "about:blank"]
            print(f"DEBUG: Executing Recorder: {cmd}")
            cls._process = subprocess.Popen(cmd, cwd=root_dir)
            return {"status": "started", "pid": cls._process.pid}
        except Exception as e:
            raise Exception(f"Failed to launch recorder: {str(e)}")

    @classmethod
    def stop(cls, root_dir: str):
        if cls._process:
            # First terminate the codegen process
            if cls._process.poll() is None:
                print(f"DEBUG: Terminating process {cls._process.pid}")
                cls._process.terminate()
                try:
                    cls._process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    print("DEBUG: Process did not terminate, killing...")
                    cls._process.kill()
            cls._process = None

            # Forcefully cleanup any lingering Playwright browser windows
            # The browser is detached from the python process, so we must find it
            target_file = os.path.join(root_dir, "tools", "raw_recorded.py")
            try:
                # Find processes with the target file in their arguments
                # Using pgrep -f to match full command line
                cmd = f"pgrep -f '{target_file}'"
                result = subprocess.run(cmd, shell=True, text=True, capture_output=True)
                
                if result.stdout:
                    pids = result.stdout.strip().split('\n')
                    for pid in pids:
                        if pid:
                            print(f"DEBUG: Killing lingering recorder/browser process {pid}")
                            subprocess.run(["kill", "-9", pid])
            except Exception as e:
                print(f"DEBUG: Failed to cleanup browser processes: {e}")
            
            # Auto-Save Logic - REMOVED per user request
            # We don't want to spam recording files. User can save manually.
            pass
                
            return {"status": "stopped"}
        return {"status": "not_running"}

    @classmethod
    def get_content(cls, root_dir: str):
        target_file = os.path.join(root_dir, "tools", "raw_recorded.py")
        if not os.path.exists(target_file):
            return "# No recording found yet."
        with open(target_file, 'r') as f:
            return f.read()

    @classmethod
    def save_content(cls, root_dir: str, content: str, filepath: str = None):
        # If a specific filepath is provided (from loaded recording), save to that file
        if filepath and (filepath.startswith("recordings/") or filepath.startswith("generated_pom/")):
            target_file = os.path.join(root_dir, filepath)
            # Ensure the directory exists
            os.makedirs(os.path.dirname(target_file), exist_ok=True)
        else:
            # Default: save to raw_recorded.py for new recordings
            target_file = os.path.join(root_dir, "tools", "raw_recorded.py")
            os.makedirs(os.path.dirname(target_file), exist_ok=True)
        
        with open(target_file, 'w') as f:
            f.write(content)
        return {"status": "saved", "file": target_file}

    @classmethod
    def list_recordings(cls, root_dir: str):
        """List all available recordings from the recordings folder, including subfolders"""
        recordings_dir = os.path.join(root_dir, "recordings")
        if not os.path.exists(recordings_dir):
            return {"files": [], "folders": []}
        
        files = []
        folders = set()
        
        # Walk through all directories recursively
        for dirpath, dirnames, filenames in os.walk(recordings_dir):
            # Get relative path from recordings folder
            rel_dir = os.path.relpath(dirpath, recordings_dir)
            if rel_dir != '.':
                folders.add(rel_dir.split(os.sep)[0])  # Add top-level folder
            
            for f in filenames:
                if f.endswith('.py'):
                    filepath = os.path.join(dirpath, f)
                    rel_path = os.path.relpath(filepath, root_dir)
                    stat = os.stat(filepath)
                    
                    # Determine folder name
                    folder = None
                    if rel_dir != '.':
                        folder = rel_dir
                    
                    files.append({
                        "name": f,
                        "path": rel_path.replace(os.sep, '/'),
                        "folder": folder,
                        "size": stat.st_size,
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
        
        # Sort by modified date (newest first)
        files.sort(key=lambda x: x["modified"], reverse=True)
        return {"files": files, "folders": sorted(list(folders))}

    @classmethod
    def save_as(cls, root_dir: str, content: str, filename: str, folder_name: str = None):
        """Save content with a custom filename to the recordings folder, optionally in a subfolder"""
        # Sanitize filename - remove special chars, keep alphanumeric and underscores
        safe_name = re.sub(r'[^\w\-]', '_', filename)
        if not safe_name:
            safe_name = f"recording_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Ensure .py extension
        if not safe_name.endswith('.py'):
            safe_name = f"{safe_name}.py"
        
        # Build target directory
        recordings_dir = os.path.join(root_dir, "recordings")
        
        # If folder_name provided, create subfolder
        if folder_name:
            safe_folder = re.sub(r'[^\w\-]', '_', folder_name.lower())
            if safe_folder:
                recordings_dir = os.path.join(recordings_dir, safe_folder)
        
        os.makedirs(recordings_dir, exist_ok=True)
        
        target_file = os.path.join(recordings_dir, safe_name)
        with open(target_file, 'w') as f:
            f.write(content)
        
        # Build relative path for response
        rel_path = os.path.relpath(target_file, root_dir).replace(os.sep, '/')
        
        return {"status": "saved", "file": rel_path, "filename": safe_name, "folder": folder_name}

    @classmethod
    def load_file(cls, root_dir: str, filepath: str):
        """Load content from a specific recording file"""
        # Security check - ensure we're only loading from recordings folder or generated_pom
        if not (filepath.startswith("recordings/") or filepath.startswith("generated_pom/")):
            raise Exception("Invalid file path")
        
        full_path = os.path.join(root_dir, filepath)
        if not os.path.exists(full_path):
            raise Exception(f"File not found: {filepath}")
        
        with open(full_path, 'r') as f:
            content = f.read()
        
        return {"content": content, "file": filepath}

    @classmethod
    def delete_file(cls, root_dir: str, filepath: str):
        """Delete a specific recording file or folder"""
        if not (filepath.startswith("recordings/") or filepath.startswith("generated_pom/")):
            raise Exception("Invalid file path")
        
        full_path = os.path.join(root_dir, filepath)
        
        if not os.path.exists(full_path):
            raise Exception(f"Item not found: {filepath}")

        if os.path.isfile(full_path):
            os.remove(full_path)
            # Clean up parent folder if it becomes empty
            parent_dir = os.path.dirname(full_path)
            try:
                # Ensure we are modifying within the recordings or generated_pom directory
                abs_parent = os.path.abspath(parent_dir)
                is_safe = (abs_parent.startswith(os.path.abspath(os.path.join(root_dir, "recordings"))) or 
                           abs_parent.startswith(os.path.abspath(os.path.join(root_dir, "generated_pom"))))
                
                if is_safe:
                    if not os.listdir(parent_dir):
                        os.rmdir(parent_dir)
            except Exception:
                pass # Safe to ignore if folder not empty or other issues
            return {"status": "deleted", "type": "file", "path": filepath}
        elif os.path.isdir(full_path):
            shutil.rmtree(full_path)
            return {"status": "deleted", "type": "folder", "path": filepath}
        else:
            raise Exception("Invalid item type")

    @classmethod
    def run_raw_script(cls, root_dir: str, content: str):
        """Run the raw python script content and stream logs to file"""
        # Save to a temporary runner file to avoid overwriting raw_recorded.py if user hasn't saved
        target_file = os.path.join(root_dir, "tools", "temp_runner.py")
        os.makedirs(os.path.dirname(target_file), exist_ok=True)
        
        # Log file for live streaming
        log_file = os.path.join(root_dir, "reports", "live_raw.log")
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        # Clear previous log
        with open(log_file, 'w') as f:
            f.write("")

        with open(target_file, 'w') as f:
            f.write(content)
            
        try:
            cmd = [sys.executable, "-u", target_file]
            print(f"DEBUG: Running raw script: {cmd}")
            
            # Use custom environment to enable Playwright debugging output
            env = os.environ.copy()
            env["DEBUG"] = "pw:api"
            
            # Run with live output streaming to file
            import time
            start_time = time.time()
            
            with open(log_file, 'w') as log_f:
                process = subprocess.Popen(
                    cmd,
                    cwd=root_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    env=env
                )
                
                output_lines = []
                for line in process.stdout:
                    log_f.write(line)
                    log_f.flush()
                    output_lines.append(line)
                
                process.wait()
                end_time = time.time()
                duration = end_time - start_time
                
                result_output = ''.join(output_lines)
                result_code = process.returncode
            
            return {
                "status": "success" if result_code == 0 else "failed",
                "output": result_output,
                "return_code": result_code
            }
        except Exception as e:
            return {
                "status": "error",
                "output": f"Failed to execute script: {str(e)}",
                "return_code": 1
            }

    @classmethod
    def get_raw_logs(cls, root_dir: str, offset: int = 0):
        """Read live raw execution logs"""
        log_file = os.path.join(root_dir, "reports", "live_raw.log")
        
        if not os.path.exists(log_file):
            return {"content": "", "offset": 0}
        
        with open(log_file, 'r') as f:
            f.seek(offset)
            content = f.read()
            new_offset = f.tell()
            
        return {"content": content, "offset": new_offset}
