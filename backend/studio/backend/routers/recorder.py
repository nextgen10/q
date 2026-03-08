from fastapi import APIRouter, HTTPException
import os
from studio.backend.services.recorder_service import RecorderService
from studio.backend.models import SaveContentRequest, SaveAsRequest

router = APIRouter(prefix="/api/record", tags=["recorder"])

def get_root_dir():
    # studio/backend/routers -> studio/backend -> studio
    current = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(current))

@router.post("/start")
def start_recording():
    try:
        return RecorderService.start(get_root_dir())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
def stop_recording():
    return RecorderService.stop(get_root_dir())

@router.get("/content")
def get_recorded_content():
    return {"content": RecorderService.get_content(get_root_dir())}

@router.post("/save")
def save_recorded_content(request: SaveContentRequest):
    try:
        return RecorderService.save_content(get_root_dir(), request.content, request.filepath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files")
def list_recordings():
    """List all available recordings from the recordings folder"""
    try:
        return RecorderService.list_recordings(get_root_dir())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-as")
def save_as(request: SaveAsRequest):
    """Save content with a custom filename, optionally in a subfolder"""
    try:
        return RecorderService.save_as(get_root_dir(), request.content, request.filename, request.folder_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/load/{filepath:path}")
def load_file(filepath: str):
    """Load content from a specific recording file"""
    try:
        return RecorderService.load_file(get_root_dir(), filepath)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/delete/{filepath:path}")
def delete_recording(filepath: str):
    """Delete a specific recording file"""
    try:
        return RecorderService.delete_file(get_root_dir(), filepath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/run")
def run_recording(request: SaveContentRequest):
    """Run the raw recorded script"""
    try:
        # We reuse SaveContentRequest as it contains the 'content' field we need
        return RecorderService.run_raw_script(get_root_dir(), request.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/run/logs")
def get_raw_run_logs(offset: int = 0):
    """Get live logs for raw run"""
    try:
        return RecorderService.get_raw_logs(get_root_dir(), offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
