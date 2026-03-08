import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List

router = APIRouter(prefix="/api/data", tags=["data"])

def get_root_dir():
    current = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(os.path.dirname(current)))

@router.get("/shared")
def get_shared_data():
    root_dir = get_root_dir()
    data_path = os.path.join(root_dir, "data", "shared_data.json")
    
    if not os.path.exists(data_path):
        return {}
        
    try:
        with open(data_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read shared data: {str(e)}")

@router.post("/shared")
def update_shared_data(data: Dict[str, List[str]]):
    root_dir = get_root_dir()
    data_path = os.path.join(root_dir, "data", "shared_data.json")
    
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    
    try:
        with open(data_path, 'w') as f:
            json.dump(data, f, indent=4)
        return {"status": "success", "message": "Shared data updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save shared data: {str(e)}")
