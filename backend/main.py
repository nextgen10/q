from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, Depends
from typing import List, Dict
from fastapi.middleware.cors import CORSMiddleware
from nexus_models import EvaluationRequest, EvaluationResult, TestCase, EvaluationSummary
from nexus_evaluator import RagEvaluator
import uuid
from datetime import datetime
from dotenv import load_dotenv
import os
import sys

env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
    print(f"DEBUG: Loaded .env from {env_path}")
else:
    load_dotenv() # Fallback
    print(f"DEBUG: .env not found at {env_path}, using default load_dotenv()")

# Load source Playwright Studio env to preserve source behavior.
studio_env_path = os.path.join(os.path.dirname(__file__), "studio", "backend", ".env")
if os.path.exists(studio_env_path):
    load_dotenv(studio_env_path, override=False)

# Make source-style studio packages resolve first (config/base/tools/etc).
studio_root = os.path.join(os.path.dirname(__file__), "studio")
if studio_root not in sys.path:
    sys.path.insert(0, studio_root)

import pandas as pd
import io
import math

def sanitize_floats(obj):
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0.0
        return obj
    elif isinstance(obj, dict):
        return {k: sanitize_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_floats(v) for v in obj]
    return obj

app = FastAPI(title="RagEval Backend")

_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
for origin in [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
]:
    if origin not in _cors_origins:
        _cors_origins.append(origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from agent_router import router as agent_router
app.include_router(agent_router)

from studio.backend.routers import recorder, generator, runner, workflow, settings, ai, locators, feedback, prompts, test_design, healer, roi, data

app.include_router(recorder.router)
app.include_router(generator.router)
app.include_router(runner.router)
app.include_router(workflow.router)
app.include_router(settings.router)
app.include_router(ai.router)
app.include_router(locators.router)
app.include_router(feedback.router)
app.include_router(prompts.router)
app.include_router(test_design.router)
app.include_router(healer.router)
app.include_router(roi.router)
app.include_router(data.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Studio Backend is running (Modular)"}

from nexus_database import SessionLocal, EvaluationRecord
from auth import get_current_app
import json
import logging

logger = logging.getLogger(__name__)

def save_to_db(result: EvaluationResult, app_id: str | None = None):
    db = SessionLocal()
    try:
        res_data = result.model_dump()
        record = EvaluationRecord(
            id=res_data["id"],
            name=res_data["name"],
            timestamp=res_data["timestamp"],
            test_cases=res_data["test_cases"],
            bot_metrics=res_data["bot_metrics"],
            summaries=res_data["summaries"],
            leaderboard=res_data["leaderboard"],
            winner=res_data["winner"],
            app_id=app_id,
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

@app.get("/latest", response_model=EvaluationResult)
async def get_latest_evaluation(app: Dict = Depends(get_current_app)):
    db = SessionLocal()
    try:
        record = (
            db.query(EvaluationRecord)
            .filter(EvaluationRecord.app_id == app["app_id"])
            .order_by(EvaluationRecord.timestamp.desc())
            .first()
        )
        if not record:
            raise HTTPException(status_code=404, detail="No evaluations found")
        
        return EvaluationResult(
            id=record.id,
            name=record.name,
            timestamp=record.timestamp,
            test_cases=record.test_cases,
            bot_metrics=record.bot_metrics,
            summaries=record.summaries,
            leaderboard=record.leaderboard,
            winner=record.winner
        )
    finally:
        db.close()

@app.post("/evaluate-excel", response_model=EvaluationResult)
async def evaluate_excel(
    file: UploadFile = File(...),
    alpha: float = Form(0.4),
    beta: float = Form(0.3),
    gamma: float = Form(0.3),
    model: str = Form("gpt-4o"),
    max_rows: int = Form(200),
    temperature: float = Form(0.0),
    background_tasks: BackgroundTasks = None,
    app: Dict = Depends(get_current_app),
):
    if background_tasks:
        background_tasks.add_task(cleanup_cache)
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        # --- Strict Validation ---
        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded file is empty or contains no data.")
            
        if len(df) > max_rows:
            raise HTTPException(status_code=400, detail=f"Dataset exceeds the safety limit of {max_rows} rows. Received: {len(df)} rows.")
        
        # Dynamically detect bots based on column prefixes
        bot_columns = [col for col in df.columns if col.startswith("Bot_")]
        
        # Create a mapping from column name to standardized Bot Name (Bot A, Bot B, ...)
        bot_mapping = {}
        for idx, col in enumerate(bot_columns):
            # Generate "Bot A", "Bot B", ...
            suffix = chr(65 + idx) if idx < 26 else f"{chr(65 + (idx // 26) - 1)}{chr(65 + (idx % 26))}"
            bot_mapping[col] = f"Bot {suffix}"

        # Flexible column detection
        def find_col(possible_names):
            for col in df.columns:
                if any(p.lower() in col.lower().replace(" ", "_") for p in possible_names):
                    return col
            return None

        gt_col = find_col(["ground_truth", "reference", "target", "gt", "expected"])
        query_col = find_col(["query", "question", "input", "prompt"])

        if not query_col:
            raise HTTPException(status_code=400, detail="Critical Error: Missing required 'Query' column in dataset.")

        test_cases = []
        for _, row in df.iterrows():
            bot_responses = {}
            bot_contexts = {}
            
            for bot_col in bot_columns:
                bot_id = bot_mapping[bot_col]
                resp_val = row.get(bot_col)
                bot_responses[bot_id] = str(resp_val) if not pd.isna(resp_val) else ""
                
                # Context detection: specific Context_BotName > BotName_Context > specific Context_A > general Context
                # bot_col is like "Bot_A"
                specific_ctx_1 = bot_col.replace("Bot_", "Context_")
                specific_ctx_2 = bot_col.replace("Bot_", "") + "_Context"
                
                ctx_val = None
                if specific_ctx_1 in df.columns:
                    ctx_val = row.get(specific_ctx_1)
                elif specific_ctx_2 in df.columns:
                    ctx_val = row.get(specific_ctx_2)
                elif "Context" in df.columns:
                    ctx_val = row.get("Context")
                elif "context" in df.columns:
                    ctx_val = row.get("context")
                
                # Sanitize context (handle NaN/None)
                if pd.isna(ctx_val) or ctx_val is None:
                    bot_contexts[bot_id] = []
                else:
                    bot_contexts[bot_id] = [str(ctx_val)]
            
            query_val = row.get(query_col if query_col else "Query")
            gt_val = row.get(gt_col if gt_col else "Ground_Truth")

            test_cases.append(TestCase(
                query=str(query_val) if not pd.isna(query_val) else "N/A",
                bot_responses=bot_responses,
                bot_contexts=bot_contexts,
                ground_truth=str(gt_val) if not pd.isna(gt_val) else None
            ))

        evaluator = RagEvaluator(alpha=alpha, beta=beta, gamma=gamma, model_name=model, temperature=temperature)
        print(f"DEBUG: Starting evaluation for {len(bot_columns)} models...")
        results = await evaluator.run_multi_bot_evaluation(test_cases)
        print("DEBUG: Evaluation successful!")
        
        eval_id = str(uuid.uuid4())
        result = EvaluationResult(
            id=eval_id,
            name=f"Excel Upload - {file.filename}",
            timestamp=datetime.now(),
            test_cases=test_cases,
            bot_metrics=results["bot_metrics"],
            summaries=results["summaries"],
            leaderboard=results["leaderboard"],
            winner=results["winner"]
        )
        
        # Sanitize for JSON compliance
        sanitized_result_data = sanitize_floats(result.model_dump())
        sanitized_result = EvaluationResult(**sanitized_result_data)
        
        save_to_db(sanitized_result, app_id=app["app_id"])
        return sanitized_result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Excel processing failed")
        raise HTTPException(status_code=400, detail="Excel processing failed. Check file format and try again.")

@app.post("/evaluate", response_model=EvaluationResult)
async def run_evaluation(request: EvaluationRequest, background_tasks: BackgroundTasks, app: Dict = Depends(get_current_app)):
    if not request.dataset:
        raise HTTPException(status_code=400, detail="Dataset is empty. Provide at least one test case.")

    if background_tasks:
        background_tasks.add_task(cleanup_cache)

    try:
        evaluator = RagEvaluator(
            alpha=request.alpha, 
            beta=request.beta, 
            gamma=request.gamma, 
            temperature=request.temperature
        )
        results = await evaluator.run_multi_bot_evaluation(request.dataset)

        if "error" in results:
            raise HTTPException(status_code=400, detail=results["error"])

        eval_id = str(uuid.uuid4())
        result = EvaluationResult(
            id=eval_id,
            name=request.name,
            timestamp=datetime.now(),
            test_cases=request.dataset,
            bot_metrics=results["bot_metrics"],
            summaries=results["summaries"],
            leaderboard=results["leaderboard"],
            winner=results["winner"]
        )
        
        sanitized_result_data = sanitize_floats(result.model_dump())
        sanitized_result = EvaluationResult(**sanitized_result_data)
        
        save_to_db(sanitized_result, app_id=app["app_id"])
        return sanitized_result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Evaluation failed")
        raise HTTPException(status_code=500, detail="Evaluation failed. Please try again.")

@app.get("/evaluations", response_model=List[EvaluationSummary])
async def get_all_evaluations(app: Dict = Depends(get_current_app)):
    db = SessionLocal()
    try:
        records = (
            db.query(EvaluationRecord)
            .filter(EvaluationRecord.app_id == app["app_id"])
            .order_by(EvaluationRecord.timestamp.desc())
            .all()
        )
        return [
            EvaluationSummary(
                id=record.id,
                name=record.name,
                timestamp=record.timestamp,
                status="completed",
                summaries=sanitize_floats(record.summaries),
                leaderboard=sanitize_floats(record.leaderboard),
                winner=record.winner,
                total_test_cases=len(record.test_cases) if record.test_cases else 0
            ) for record in records
        ]
    finally:
        db.close()

@app.delete("/cache/cleanup")
async def cleanup_cache(app: Dict = Depends(get_current_app)):
    """Removes metric cache entries older than 30 days."""
    db = SessionLocal()
    from nexus_database import MetricCache
    from datetime import timedelta
    try:
        limit = datetime.now() - timedelta(days=30)
        deleted = db.query(MetricCache).filter(MetricCache.timestamp < limit).delete()
        db.commit()
        return {"status": "success", "deleted_records": deleted}
    finally:
        db.close()

@app.get("/evaluations/{eval_id}")
async def get_evaluation(eval_id: str, app: Dict = Depends(get_current_app)):
    db = SessionLocal()
    try:
        record = (
            db.query(EvaluationRecord)
            .filter(EvaluationRecord.id == eval_id, EvaluationRecord.app_id == app["app_id"])
            .first()
        )
        if not record:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        return record
    finally:
        db.close()

@app.get("/rag/prompts")
async def get_rag_prompts():
    """Get all RAG evaluation prompts"""
    import glob
    import json as json_lib
    
    prompts_dir = os.path.join(os.path.dirname(__file__), "prompts")
    rag_prompt_files = glob.glob(os.path.join(prompts_dir, "rag_*.json"))
    
    prompts = []
    for file_path in rag_prompt_files:
        try:
            with open(file_path, 'r') as f:
                prompt_data = json_lib.load(f)
                prompts.append(prompt_data)
        except Exception as e:
            logger.error(f"Failed to load prompt file {file_path}: {e}")
    
    # Sort by prompt_key for consistent ordering
    prompts.sort(key=lambda x: x.get('prompt_key', ''))
    return prompts

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, loop="asyncio")
