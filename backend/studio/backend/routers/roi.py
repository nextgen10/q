from fastapi import APIRouter
from studio.backend.services.roi_service import ROIService, RunRecord, RoiSettings, RoiStats

router = APIRouter(prefix="/api/roi", tags=["roi"])

@router.get("/settings", response_model=RoiSettings)
def get_settings():
    return ROIService.get_settings()

@router.post("/settings")
def update_settings(settings: RoiSettings):
    ROIService.update_settings(settings)
    return {"status": "success"}

@router.post("/record")
def record_run(run: RunRecord):
    ROIService.record_run(run.test_count, run.duration_seconds)
    return {"status": "recorded"}

@router.get("/stats", response_model=RoiStats)
def get_stats():
    return ROIService.get_stats()

