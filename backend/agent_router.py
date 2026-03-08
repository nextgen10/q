from fastapi import APIRouter, HTTPException, Request, BackgroundTasks, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Literal, Optional
import os
import json
import asyncio
import logging
import uuid
import re
from datetime import datetime

from agent_models import (
    TestRequest, BatchTestResult, OutputDetail, QueryResult, 
    AggregateMetrics, ErrorSummary, AgentStatus, JsonEvaluationRequest, 
    BatchPathRequest, GroundTruthRecord, FeedbackRequest
)
from agent_models_json import (
    JsonEvalConfig, JsonEvalResult, JsonEvalRequest, 
    JsonBatchEvalRequest, JsonBatchEvalResponse
)
from agents.orchestrator_agent import OrchestratorAgent
from agent_convert_json import flatten_json, convert_to_expected_format, convert_to_actual_format, safe_json_dumps

from agent_database import init_db, save_result, get_latest_result, save_feedback, get_all_feedback, get_all_results, get_all_prompts, get_prompt, respond_to_feedback
from auth import (
    init_auth_tables, get_current_app, get_optional_app,
    register_application, list_applications, rotate_api_key, delete_application, login_with_key,
    is_admin,
)

logger = logging.getLogger(__name__)

init_db()
init_auth_tables()

router = APIRouter(prefix="/agent-eval", tags=["Agent Evaluation"])

# Allowed base directory for file-path-based evaluations
_ALLOWED_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class ConnectionManager:
    """Tenant-scoped SSE connection manager. Events are isolated per app_id."""
    MAX_QUEUE_SIZE = 256

    def __init__(self):
        self._lock = asyncio.Lock()
        self._connections: Dict[str, List[asyncio.Queue]] = {}

    async def connect(self, app_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue(maxsize=self.MAX_QUEUE_SIZE)
        async with self._lock:
            if app_id not in self._connections:
                self._connections[app_id] = []
            self._connections[app_id].append(queue)
        return queue

    async def disconnect(self, app_id: str, queue: asyncio.Queue):
        async with self._lock:
            conns = self._connections.get(app_id, [])
            if queue in conns:
                conns.remove(queue)
            if not conns and app_id in self._connections:
                del self._connections[app_id]

    async def broadcast(self, event: AgentStatus, app_id: str):
        async with self._lock:
            connections = list(self._connections.get(app_id, []))
        for queue in connections:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    pass

manager = ConnectionManager()

async def event_generator(request: Request, app_id: str):
    queue = await manager.connect(app_id)
    try:
        while True:
            if await request.is_disconnected():
                break
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
                continue
            if isinstance(event, dict):
                event_data = json.dumps(event)
            else:
                event_data = event.model_dump_json()
            yield f"data: {event_data}\n\n"
    finally:
        await manager.disconnect(app_id, queue)

@router.get("/events")
async def sse_endpoint(request: Request, token: Optional[str] = Query(None)):
    """
    Server-Sent Events endpoint to stream agent status updates.
    Accepts API key via ?token= query param (EventSource doesn't support headers).
    Events are scoped to the authenticated app only.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing token query parameter")
    from auth import validate_api_key
    app_info = validate_api_key(token)
    if not app_info:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    return StreamingResponse(event_generator(request, app_info["app_id"]), media_type="text/event-stream")

@router.get("/latest-result")
async def get_latest_evaluation_endpoint(app: Dict = Depends(get_current_app)):
    """Get the latest evaluation result, scoped to the caller's application."""
    result = get_latest_result(app_id=app["app_id"])
    if not result:
        return {"message": "No evaluations found"}
    return result

@router.get("/history")
async def get_history_endpoint(app: Dict = Depends(get_current_app)):
    """Get historical evaluation results, scoped to the caller's application."""
    return get_all_results(app_id=app["app_id"])

# Helper: Ensure value is string (serialize dict/list if needed)
def ensure_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return safe_json_dumps(value)
    if isinstance(value, str):
        return value
    return str(value)

from pydantic import BaseModel
class ConvertRequestModel(BaseModel):
    data: Any
    mode: Literal["gt", "ai"]
    run_id: str = "manual_run"

MAX_BATCH_SIZE = 500

@router.post("/run-batch", response_model=BatchTestResult)
async def run_batch(requests: List[TestRequest], app: Dict = Depends(get_current_app)):
    if len(requests) > MAX_BATCH_SIZE:
        raise HTTPException(status_code=400, detail=f"Batch size exceeds limit of {MAX_BATCH_SIZE}")
    app_id = app["app_id"]
    run_id = str(uuid.uuid4())
    
    events_log = []
    
    async def event_callback(event: AgentStatus):
        await manager.broadcast(event, app_id=app_id)
        events_log.append(event.model_dump(mode='json'))

    orchestrator = OrchestratorAgent(event_callback=event_callback)
    
    try:
        result = await orchestrator.run_batch_test(requests)
        
        result.run_id = run_id
        new_id = save_result(result.model_dump_json(), json.dumps(events_log), run_id=run_id, app_id=app_id)
        result.id = new_id
            
        return result
    except Exception as e:
        logger.exception("Batch execution failed")
        error_event = AgentStatus(
            agent_name="System",
            status="failed",
            message="Batch execution failed"
        )
        await event_callback(error_event)
        raise HTTPException(status_code=500, detail="Batch execution failed. Please check your inputs and try again.")

@router.post("/convert-json")
async def convert_json_endpoint(request: ConvertRequestModel, app: Dict = Depends(get_current_app)):
    try:
        data = request.data
        mode = request.mode

        # 1. Check if already normalized
        if isinstance(data, list) and len(data) > 0:
            first = data[0]
            if isinstance(first, dict):
                if mode == "gt" and "query_id" in first:
                    existing_output_key = next((k for k in ["expected_output", "output", "expected"] if k in first), None)
                    if existing_output_key:
                        standardized = []
                        for item in data:
                            standardized.append({
                                "query_id": str(item.get("query_id", "")),
                                "expected_output": ensure_string(item.get(existing_output_key, "")),
                                "type": str(item.get("type") or item.get("match_type") or "text"),
                                "source_field": str(item.get("source_field") or existing_output_key)
                            })
                        return standardized
                
                if mode == "ai" and "query_id" in first:
                    existing_output_key = next((k for k in ["actual_output", "output", "prediction"] if k in first), None)
                    if existing_output_key:
                        standardized = []
                        for item in data:
                            standardized.append({
                                "query_id": str(item.get("query_id", "")),
                                "actual_output": ensure_string(item.get(existing_output_key, "")),
                                "run_id": str(item.get("run_id") or request.run_id or "manual_run")
                            })
                        return standardized
        
        # 2. Perform Normalization
        flat = flatten_json(data)
        
        if mode == "gt":
            return convert_to_expected_format(flat)
        else:
            return convert_to_actual_format(flat, run_id=request.run_id)

    except Exception as e:
        logger.exception("JSON conversion failed")
        raise HTTPException(status_code=400, detail="JSON conversion failed. Check input format.")

@router.post("/evaluate-from-json", response_model=BatchTestResult)
async def evaluate_from_json(request: JsonEvaluationRequest, app: Dict = Depends(get_current_app)):
    if len(request.ground_truth) > MAX_BATCH_SIZE:
        raise HTTPException(status_code=400, detail=f"Ground truth size exceeds limit of {MAX_BATCH_SIZE}")
    if len(request.ai_outputs) > MAX_BATCH_SIZE:
        raise HTTPException(status_code=400, detail=f"AI outputs size exceeds limit of {MAX_BATCH_SIZE}")
    app_id = app["app_id"]
    run_id = str(uuid.uuid4())
    events_log = []
    
    async def event_callback(event: AgentStatus):
        await manager.broadcast(event, app_id=app_id)
        events_log.append(event.model_dump(mode='json'))

    orchestrator = OrchestratorAgent(event_callback=event_callback)
    
    test_requests = []
    gt_map = {}
    for item in request.ground_truth:
        qid = str(item.get(request.gt_query_id_key, ""))
        if qid:
            gt_map[qid] = GroundTruthRecord(
                query_id=qid,
                expected=ensure_string(item.get(request.gt_expected_key, "")),
                expected_type=str(item.get(request.gt_type_key, "text")),
                metadata={"column": str(item.get("source_field") or request.gt_expected_key)}
            )
            
    found_gt_keys = set()
    for item in request.ai_outputs:
        qid = str(item.get(request.pred_query_id_key, ""))
        if qid:
            gt_record = gt_map.get(qid)
            if gt_record:
                found_gt_keys.add(qid)
            
            req = TestRequest(
                input_prompt="", 
                pre_computed_output=ensure_string(item.get(request.pred_output_key, "")),
                ground_truth=gt_record,
                run_id=str(item.get(request.pred_run_id_key, "r1")),
                semantic_threshold=request.semantic_threshold,
                enable_safety=request.enable_safety,
                llm_model_name=request.llm_model_name,
                fuzzy_threshold=request.fuzzy_threshold,
                w_accuracy=request.w_accuracy,
                w_completeness=request.w_completeness,
                w_hallucination=request.w_hallucination,
                w_safety=request.w_safety,
                field_strategies=request.field_strategies,
            )
            test_requests.append(req)

    for qid, gt_record in gt_map.items():
        if qid not in found_gt_keys:
            req = TestRequest(
                input_prompt="", 
                pre_computed_output=None, 
                ground_truth=gt_record,
                run_id="manual_run",
                semantic_threshold=request.semantic_threshold,
                enable_safety=request.enable_safety,
                llm_model_name=request.llm_model_name,
                fuzzy_threshold=request.fuzzy_threshold,
                w_accuracy=request.w_accuracy,
                w_completeness=request.w_completeness,
                w_hallucination=request.w_hallucination,
                w_safety=request.w_safety,
                field_strategies=request.field_strategies,
            )
            test_requests.append(req)

    try:
        result = await orchestrator.run_batch_test(
            test_requests,
            accuracy_threshold=request.accuracy_threshold,
            consistency_threshold=request.consistency_threshold,
            hallucination_threshold=request.hallucination_threshold,
            rqs_threshold=request.rqs_threshold,
            alpha=request.alpha,
            beta=request.beta,
            gamma=request.gamma,
            w_accuracy=request.w_accuracy,
            w_completeness=request.w_completeness,
            w_hallucination=request.w_hallucination,
            w_safety=request.w_safety,
            aggregate_run_metrics=True
        )
        
        result.run_id = run_id
        result.evaluation_method = "JSON"
        
        result.normalized_ground_truth = [
            {
                "query_id": item.get(request.gt_query_id_key, ""),
                "expected_output": ensure_string(item.get(request.gt_expected_key, "")),
                "match_type": str(item.get(request.gt_type_key, "text"))
            }
            for item in request.ground_truth
        ]
        
        result.normalized_ai_outputs = [
            {
                "query_id": item.get(request.pred_query_id_key, ""),
                "actual_output": ensure_string(item.get(request.pred_output_key, "")),
                "run_id": str(item.get(request.pred_run_id_key, "r1"))
            }
            for item in request.ai_outputs
        ]
        
        result.ground_truth_source = "JSON Upload"
        
        new_id = save_result(result.model_dump_json(), json.dumps(events_log), run_id=run_id, app_id=app_id)
        result.id = new_id
        
        return result
    except Exception as e:
        logger.exception("JSON evaluation failed")
        await event_callback(AgentStatus(
            agent_name="System",
            status="failed",
            message="Evaluation failed"
        ))
        raise HTTPException(status_code=500, detail="Evaluation failed. Please check your inputs and try again.")

def _validate_file_path(path: str) -> str:
    """Resolve and validate that a file path stays within the allowed data directory."""
    resolved = os.path.abspath(path)
    if not resolved.startswith(_ALLOWED_DATA_DIR):
        raise HTTPException(status_code=400, detail=f"Path is outside allowed directory: {path}")
    return resolved

@router.post("/evaluate-from-paths", response_model=BatchTestResult)
async def evaluate_from_paths(request: BatchPathRequest, app: Dict = Depends(get_current_app)):
    """
    Evaluate from local file paths.
    """
    try:
        gt_path = _validate_file_path(request.ground_truth_path)
        ai_path = _validate_file_path(request.ai_outputs_path)

        if not os.path.exists(gt_path):
            raise HTTPException(status_code=400, detail=f"Ground Truth path not found: {request.ground_truth_path}")
        
        with open(gt_path, "r", encoding="utf-8") as f:
            gt_data = json.load(f)
            
        ai_outputs_data = []
        if os.path.isdir(ai_path):
            import glob
            files = glob.glob(os.path.join(ai_path, "*.json"))
            for fpath in files:
                with open(fpath, "r", encoding="utf-8") as f:
                    try:
                        content = json.load(f)
                        if isinstance(content, list):
                            ai_outputs_data.extend(content)
                        else:
                            ai_outputs_data.append(content)
                    except (json.JSONDecodeError, OSError) as e:
                        logger.warning("Skipping unreadable file %s: %s", fpath, e)
                        continue
        elif os.path.exists(ai_path):
            with open(ai_path, "r", encoding="utf-8") as f:
                ai_outputs_data = json.load(f)
        else:
            raise HTTPException(status_code=400, detail=f"AI Outputs path not found: {request.ai_outputs_path}")

        # Reuse evaluate-from-json logic
        json_req = JsonEvaluationRequest(
            ground_truth=gt_data if isinstance(gt_data, list) else [gt_data],
            ai_outputs=ai_outputs_data if isinstance(ai_outputs_data, list) else [ai_outputs_data],
            gt_query_id_key=request.gt_query_id_key,
            gt_expected_key=request.gt_expected_key,
            gt_type_key=request.gt_type_key,
            pred_query_id_key=request.pred_query_id_key,
            pred_output_key=request.pred_output_key,
            pred_run_id_key=request.pred_run_id_key,
            semantic_threshold=request.semantic_threshold,
            alpha=request.alpha,
            beta=request.beta,
            gamma=request.gamma,
            enable_safety=request.enable_safety,
            w_accuracy=request.w_accuracy,
            w_completeness=request.w_completeness,
            w_hallucination=request.w_hallucination,
            w_safety=request.w_safety,
            llm_model_name=request.llm_model_name,
            accuracy_threshold=request.accuracy_threshold,
            consistency_threshold=request.consistency_threshold,
            hallucination_threshold=request.hallucination_threshold,
            rqs_threshold=request.rqs_threshold,
            fuzzy_threshold=request.fuzzy_threshold,
            field_strategies=request.field_strategies
        )
        
        result = await evaluate_from_json(json_req, app=app)
        result.ground_truth_source = f"File Path: {os.path.basename(request.ground_truth_path)}"
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Path-based evaluation failed")
        raise HTTPException(status_code=500, detail="Evaluation failed. Please check file paths and try again.")


# ─── Prompts API ────────────────────────────────────────────

@router.get("/prompts")
async def list_prompts():
    # Agent Eval should only expose agent-specific prompts
    # (exclude RAG prompt files prefixed with "rag_").
    prompts = get_all_prompts()
    return [p for p in prompts if not str(p.get("prompt_key", "")).startswith("rag_")]


@router.get("/prompts/{prompt_key}")
async def read_prompt(prompt_key: str):
    p = get_prompt(prompt_key)
    if not p:
        raise HTTPException(status_code=404, detail=f"Prompt '{prompt_key}' not found")
    return p


# ─── Feedback API ────────────────────────────────────────────

@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest, app: Optional[Dict] = Depends(get_optional_app)):
    if not 1 <= request.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    app_id = app["app_id"] if app else None
    save_feedback(request.rating, request.suggestion or "", app_id=app_id)
    return {"status": "ok"}


@router.get("/feedback")
async def list_feedback():
    return get_all_feedback()


class FeedbackResponseRequest(BaseModel):
    response: str


@router.post("/feedback/{feedback_id}/respond")
async def admin_respond_feedback(feedback_id: int, req: FeedbackResponseRequest, app: Dict = Depends(get_current_app)):
    """Admin-only: add a response to a feedback entry."""
    if not is_admin(app["app_id"]):
        raise HTTPException(status_code=403, detail="Only the admin can respond to feedback")
    if not req.response or not req.response.strip():
        raise HTTPException(status_code=400, detail="Response cannot be empty")
    if not respond_to_feedback(feedback_id, req.response.strip()):
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"status": "ok", "feedback_id": feedback_id}


@router.get("/feedback/admin-check")
async def check_admin(app: Dict = Depends(get_current_app)):
    """Check if the authenticated app is the admin."""
    return {"is_admin": is_admin(app["app_id"])}


# ─── Application Auth API ────────────────────────────────────

class RegisterAppRequest(BaseModel):
    app_name: str
    owner_email: str = ""

class LoginRequest(BaseModel):
    api_key: str

APP_NAME_REGEX = re.compile(r'^[A-Za-z0-9]{1,15}$')

@router.post("/apps/register")
async def register_app(req: RegisterAppRequest):
    """Register a new application and receive an API key."""
    normalized_name = (req.app_name or "").strip()
    if not APP_NAME_REGEX.match(normalized_name):
        raise HTTPException(status_code=400, detail="Application name must be alphanumeric and 1-15 characters")
    try:
        creds = register_application(normalized_name, req.owner_email.strip())
        return creds
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.post("/apps/login")
async def login(req: LoginRequest):
    """Validate API key and return app info for UI session."""
    info = login_with_key(req.api_key)
    if not info:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return info

@router.get("/apps")
async def get_apps(app: Dict = Depends(get_current_app)):
    """Returns the authenticated application's info."""
    return [app]

@router.post("/apps/{app_id}/rotate-key")
async def rotate_key(app_id: str, app: Dict = Depends(get_current_app)):
    """Rotate API key. Requires the current valid key."""
    if app["app_id"] != app_id:
        raise HTTPException(status_code=403, detail="Can only rotate your own key")
    new_key = rotate_api_key(app_id)
    if not new_key:
        raise HTTPException(status_code=404, detail="Application not found or inactive")
    return {"app_id": app_id, "api_key": new_key}

@router.delete("/apps/{app_id}")
async def deactivate_app(app_id: str, app: Dict = Depends(get_current_app)):
    """Deactivate an application. Can only deactivate your own."""
    if app["app_id"] != app_id:
        raise HTTPException(status_code=403, detail="Can only deactivate your own application")
    if not delete_application(app_id):
        raise HTTPException(status_code=404, detail="Application not found")
    return {"status": "deactivated", "app_id": app_id}

@router.get("/apps/me")
async def get_my_app(app: Dict = Depends(get_current_app)):
    """Get current app info from API key."""
    return app
