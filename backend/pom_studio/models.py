from pydantic import BaseModel
from typing import Optional

class GenerateRequest(BaseModel):
    input_file: str = "tools/raw_recorded.py"
    output_dir: str = "generated_pom"
    use_ai: bool = False  # If True, use Azure OpenAI for intelligent POM generation

class PublishRequest(BaseModel):
    name: str # e.g. "login_flow"
    folder_name: Optional[str] = None # e.g. "authentication" to create pages/authentication/login_page.py
    marker: Optional[str] = None # e.g. "smoke"
    is_snippet: bool = False
    target_flow_file: Optional[str] = "flows/shared_flows.py"

class TestRunRequest(BaseModel):
    test_file: Optional[str] = None # Legacy support or single file
    test_files: Optional[list[str]] = None # New support for multiple files
    headless: bool = False
    marker: Optional[str] = None # Run tests with specific marker
    parallel: bool = False
    parallel_workers: Optional[int] = None

class SaveContentRequest(BaseModel):
    content: str
    filepath: Optional[str] = None  # Optional filepath for saving to loaded recordings

class SaveAsRequest(BaseModel):
    content: str
    filename: str  # Custom filename without .py extension
    folder_name: Optional[str] = None  # Optional folder to organize recordings

class MarkerAssignRequest(BaseModel):
    test_files: list[str]
    marker: str
