import asyncio
import logging
import os
import json
from typing import Dict, Any, List, Callable, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

from .base_agent import BaseAgent
from .consistency_agent import ConsistencyAgent
from .target_agent import TargetAgent
from .json_evaluator_agent import JsonEvaluatorAgent
from agent_models import (
    TestRequest, OutputDetail, AgentStatus, 
    AggregateMetrics, ErrorSummary, BatchTestResult, QueryResult
)

class OrchestratorAgent(BaseAgent):
    def __init__(self, event_callback: Optional[Callable[[AgentStatus], None]] = None, **kwargs):
        super().__init__(name="Orchestrator Agent")
        self.event_callback = event_callback
        
        # Initialize Sub-Agents (all LLM-based — no local embedding model)
        self.target_agent = TargetAgent()
        self.consistency_agent = ConsistencyAgent()
        self.json_evaluator = JsonEvaluatorAgent()
        
        from .metric_agents import (
            ExactMatchAgent, SemanticSimilarityAgent, SafetyAgent
        )
        from agent_convert_json import unflatten_json
        self.unflatten_json = unflatten_json

        self.metric_agents = {
            "exact": ExactMatchAgent(),
            "semantic": SemanticSimilarityAgent(),
            "safety": SafetyAgent(),
        }

    async def run(self, input_data: Any) -> Any:
        """
        Implementation of abstract run method.
        Routes to run_batch or run_single_test based on input type.
        """
        if isinstance(input_data, list):
            return await self.run_batch(input_data)
        elif isinstance(input_data, TestRequest):
            return await self.run_single_test(input_data)
        else:
            raise ValueError("Input must be TestRequest or List[TestRequest]")

    async def emit_status(self, agent_name: str, status: str, message: str, details: Dict[str, Any] = None):
        if self.event_callback:
            event = AgentStatus(
                agent_name=agent_name,
                status=status,
                message=message,
                details=details
            )
            await self.event_callback(event)
    
    async def _run_metric_agent(self, agent_key: str, input_data: Any) -> Any:
        agent = self.metric_agents[agent_key]
        await self.emit_status(agent.name, "working", f"Calculating {agent.name}...")
        try:
            result = await agent.run(input_data)
            score = result.get("score", 0.0)
            msg = f"{agent.name} finished (Score: {score:.2f})"
            
            await self.emit_status(agent.name, "completed", msg, details=result)
            return result
        except Exception as e:
            await self.emit_status(agent.name, "failed", f"{agent.name} failed: {str(e)}")
            return {"score": 0.0}

    async def run_batch_test(
        self, 
        requests: List[TestRequest],
        accuracy_threshold: float = 0.5,
        consistency_threshold: float = 0.5,
        hallucination_threshold: float = 0.5,
        rqs_threshold: float = 0.5,
        alpha: float = 0.6,
        beta: float = 0.2,
        gamma: float = 0.2,
        w_accuracy: float = 0.45,
        w_completeness: float = 0.25,
        w_hallucination: float = 0.15,
        w_safety: float = 0.15,
        aggregate_run_metrics: bool = True
    ) -> BatchTestResult:
        await self.emit_status("Orchestrator", "working", f"Starting batch evaluation of {len(requests)} queries")
        
        per_query = {}
        accuracy_per_query = {}
        consistency_per_query = {}
        
        total_accuracy = 0.0
        hallucinations = 0
        corrects = 0
        
        fail_reasons = []

        # Capture original flags before we potentially clear them in the loop
        any_safety_enabled = any(r.enable_safety for r in requests)

        for req in requests:
            if req.ground_truth:
                query_id = req.ground_truth.query_id
            else:
                query_id = f"q{len(per_query) + 1}"
                
            await self.emit_status("Orchestrator", "working", f"Processing Query {query_id}")
            
            effective_req = req
            if aggregate_run_metrics and req.enable_safety:
                effective_req = req.model_copy(update={"enable_safety": False})

            output_detail = await self.run_single_test(effective_req, query_id)
            
            if query_id not in per_query:
                per_query[query_id] = QueryResult(outputs=[], n_runs=0)
                accuracy_per_query[query_id] = 0.0
                consistency_per_query[query_id] = 0.0
            
            per_query[query_id].outputs.append(output_detail)
            per_query[query_id].n_runs += 1
            
            current_acc = accuracy_per_query[query_id]
            n = per_query[query_id].n_runs
            accuracy_per_query[query_id] = ((current_acc * (n - 1)) + output_detail.accuracy) / n
            
        total_accuracy = sum(accuracy_per_query.values())
        
        # --- NEW: Run Level Aggregate Metrics ---
        run_details = {}
        if aggregate_run_metrics:
            # 1. Group by Run ID
            runs_data = {} # run_id -> { aio_dict: {}, gt_dict: {}, outputs: [] }
            for qid, qres in per_query.items():
                for out in qres.outputs:
                    rid = out.run_id
                    if rid not in runs_data:
                        runs_data[rid] = {"aio": {}, "gt": {}, "outputs": []}
                    runs_data[rid]["aio"][qid] = out.output
                    runs_data[rid]["gt"][qid] = out.expected
                    runs_data[rid]["outputs"].append(out)

            # 2. Evaluate each run
            for rid, data in runs_data.items():
                await self.emit_status("Orchestrator", "working", f"Calculating Run-Level Metrics for {rid}")
                
                # Reconstruct JSON/Text
                def _safe_dumps(obj: Any) -> str:
                    try:
                        return json.dumps(obj, indent=2, default=str)
                    except (ValueError, TypeError):
                        return str(obj)

                try:
                    unflattened_aio = self.unflatten_json(data["aio"])
                    unflattened_gt = self.unflatten_json(data["gt"])
                    aio_text = _safe_dumps(unflattened_aio)
                    gt_text = _safe_dumps(unflattened_gt)
                except Exception:
                    aio_text = _safe_dumps(data["aio"])
                    gt_text = _safe_dumps(data["gt"])

                safe_res = {"score": 1.0, "issues": []}
                
                if any_safety_enabled:
                    logger.debug("Triggering run-level safety check for %s", rid)
                    safe_res = await self._run_metric_agent("safety", {"text": aio_text})
                    logger.debug("Safety result for %s: Score=%s", rid, safe_res.get('score'))
                
                run_details[rid] = {
                    "safety_score": safe_res.get("score", 1.0),
                    "safety_issues": safe_res.get("issues", []),
                    "reconstructed_aio": aio_text,
                    "reconstructed_gt": gt_text
                }

                for out in data["outputs"]:
                    is_field_toxic = False
                    if safe_res.get("score", 1.0) < 0.5:
                        hostile_words = ["idiot", "stupid", "hate", "dumb", "useless", "garbage", "trash", "retard", "moron"]
                        if any(w in out.output.lower() for w in hostile_words):
                            is_field_toxic = True
                    
                    if is_field_toxic:
                        out.safety_score = safe_res.get("score", 1.0)
                        out.toxicity = 1.0 - safe_res.get("score", 1.0)
                        out.toxicity_issues = safe_res.get("issues", [])
                    else:
                        out.safety_score = 1.0
                        out.toxicity = 0.0
                        out.toxicity_issues = []
        
        for query_id in per_query:
            all_outputs_text = [o.output for o in per_query[query_id].outputs]
            cons_res = await self.consistency_agent.run({"outputs": all_outputs_text})
            
            await self.emit_status("Consistency Agent", "completed", "Consistency check done")
            cons_score = cons_res.get("score", 0.0)
            
            consistency_per_query[query_id] = cons_score
            
            for out in per_query[query_id].outputs:
                if out.error_type == "hallucination":
                    hallucinations += 1
                elif out.error_type == "correct":
                    corrects += 1
                
        n_queries = len(per_query)
        avg_acc = total_accuracy / n_queries if n_queries > 0 else 0.0
        
        total_consistency = sum(consistency_per_query.values())
        avg_cons = total_consistency / n_queries if n_queries > 0 else 0.0

        total_completeness = 0.0
        total_hallucination = 0.0
        total_safety = 0.0
        total_rqs = 0.0
        total_outputs_count = 0
        
        for qid, qres in per_query.items():
            for out in qres.outputs:
                total_outputs_count += 1
                total_completeness += getattr(out, 'completeness', 0.0)
                total_hallucination += getattr(out, 'hallucination', 0.0)
                
                # IMPORTANT: Use the run-level safety score for the aggregate metric
                # even if the individual field was 'clean', the run as a whole might be toxic.
                r_det = run_details.get(out.run_id, {})
                s_score = r_det.get("safety_score", 1.0)
                total_safety += s_score
                
                # RQS consistency check: If run safety is 0, the RQS should ideally be lower.
                # However, for now we sum the existing out.rqs which were calculated during field evaluation.
                total_rqs += getattr(out, 'rqs', 0.0)
        
        avg_completeness = total_completeness / total_outputs_count if total_outputs_count > 0 else 0.0
        avg_hallucination = total_hallucination / total_outputs_count if total_outputs_count > 0 else 0.0
        avg_safety = total_safety / total_outputs_count if total_outputs_count > 0 else 1.0
        avg_rqs_val = total_rqs / total_outputs_count if total_outputs_count > 0 else 0.0

        agg = AggregateMetrics(
            accuracy=avg_acc,
            consistency=avg_cons,
            completeness=avg_completeness,
            hallucination=avg_hallucination,
            safety=avg_safety,
            rqs=avg_rqs_val,
            alpha=alpha, beta=beta, gamma=gamma,
            n_queries=n_queries
        )
        
        err_summary = ErrorSummary(hallucination=hallucinations, correct=corrects)
        passed = True
        
        if avg_acc < accuracy_threshold:
            passed = False
            fail_reasons.append(f"Accuracy {avg_acc:.2f} < Threshold {accuracy_threshold}")
            
        if avg_cons < consistency_threshold:
            passed = False
            fail_reasons.append(f"Consistency {avg_cons:.2f} < Threshold {consistency_threshold}")
            
        if avg_rqs_val < rqs_threshold:
            passed = False
            fail_reasons.append(f"RQS {avg_rqs_val:.2f} < Threshold {rqs_threshold}")
            
        hallucination_rate = hallucinations / total_outputs_count if total_outputs_count > 0 else 0.0
        
        if hallucination_rate > hallucination_threshold:
            passed = False
            fail_reasons.append(f"Hallucination Rate {hallucination_rate:.2f} > Threshold {hallucination_threshold}")
        
        await self.emit_status("Orchestrator", "completed", " Evaluation finished")
        
        return BatchTestResult(
            per_query=per_query,
            accuracy_per_query=accuracy_per_query,
            consistency_per_query=consistency_per_query,
            aggregate=agg,
            error_summary=err_summary,
            evaluation_status="PASS" if passed else "FAIL",
            fail_reasons=fail_reasons,
            run_details=run_details
        )

    async def run_single_test(self, request: TestRequest, query_id: str = "q1") -> OutputDetail:
        # 1. Get Target Output
        target_output = None
        found = True
        
        if request.pre_computed_output is not None:
            await self.emit_status("Target Agent", "working", "Using pre-computed output...")
            target_output = request.pre_computed_output
            await self.emit_status("Target Agent", "completed", "Output loaded")
        elif request.input_prompt:
            await self.emit_status("Target Agent", "working", f"Generating output for: {request.input_prompt[:30]}...")
            target_output = await self.target_agent.run(request.input_prompt)
            await self.emit_status("Target Agent", "completed", "Output generated")
        else:
            # Static evaluation but field is missing
            found = False
            target_output = ""
            await self.emit_status("Target Agent", "failed", "Field missing in output (static eval)")
        
        # Convert to string if dict/list
        if isinstance(target_output, (dict, list)):
            target_output_str = json.dumps(target_output)
        else:
            target_output_str = str(target_output)
        
        # 2. Determine Expected Output & Match Type
        expected_text = request.expected_output or ""
        match_type = "text"
        if request.ground_truth:
            expected_text = request.ground_truth.expected
            match_type = request.ground_truth.expected_type
        
        # 3. Resolve field strategy from config (flattened key = query_id)
        from agent_models_json import _flatten_strategies
        flat_strategies = _flatten_strategies(request.field_strategies) if request.field_strategies else {}
        field_strategy = flat_strategies.get(query_id, "").upper()

        # 4. Run Metric Agents in Parallel
        sem_res = {"score": 0.0}
        tox_res = {"score": 1.0, "issues": []}
        
        if found and field_strategy != "IGNORE":
            await self.emit_status("Orchestrator", "working", "Dispatching to metric agents")
            tasks = []
            
            if field_strategy == "FUZZY":
                from utils.llm_similarity import llm_fuzzy_similarity
                tasks.append(llm_fuzzy_similarity(expected_text, target_output_str))
            elif field_strategy != "EXACT":
                tasks.append(self._run_metric_agent("semantic", {"candidate": target_output_str, "reference": expected_text}))
            
            if request.enable_safety:
                tasks.append(self._run_metric_agent("safety", {"text": target_output_str}))
            
            results = await asyncio.gather(*tasks)
            
            result_idx = 0
            if field_strategy == "FUZZY" and results:
                sem_res = {"score": results[result_idx]}
                result_idx += 1
            elif field_strategy != "EXACT" and results:
                sem_res = results[result_idx]
                result_idx += 1
            
            if request.enable_safety and result_idx < len(results):
                tox_res = results[result_idx]
        
        # 5. Accuracy Logic — respects field_strategy override
        accuracy = 0.0
        similarity_value = 0.0
        used_strategy = field_strategy or ("EXACT" if match_type in ["email", "number", "date", "exact"] else "SEMANTIC")

        if not found:
            accuracy = 0.0
            similarity_value = 0.0
        elif field_strategy == "IGNORE":
            accuracy = 1.0
            similarity_value = 1.0
        elif used_strategy == "EXACT":
            normalized_expected = ' '.join(expected_text.split()).lower()
            normalized_output = ' '.join(target_output_str.split()).lower()
            is_match = normalized_expected == normalized_output
            accuracy = 1.0 if is_match else 0.0
            similarity_value = 1.0 if is_match else 0.0
        elif used_strategy == "FUZZY":
            raw_fuzzy = sem_res.get("score", 0.0)
            if raw_fuzzy >= request.fuzzy_threshold:
                accuracy = 1.0
                similarity_value = 1.0
            else:
                accuracy = 0.0
                similarity_value = raw_fuzzy
        else:
            normalized_expected = ' '.join(expected_text.split())
            normalized_output = ' '.join(target_output_str.split())
            similarity_value = sem_res.get("score", 0.0)
            
            if normalized_expected.lower() == normalized_output.lower():
                accuracy = 1.0
                similarity_value = 1.0
            elif sem_res.get("score") is not None and sem_res["score"] > request.semantic_threshold:
                accuracy = 1.0
        
        # 6. JSON Specific detailed evaluation
        json_meta = {
            "gt_keys": [query_id] if request.ground_truth else [],
            "aio_keys": [query_id] if found else [],
            "missing_keys": [query_id] if (request.ground_truth and not found) else [],
            "extra_keys": [query_id] if (found and not request.ground_truth) else []
        }
        
        if match_type == "json" and found:
            try:
                import json as json_lib
                from agent_models_json import JsonEvalConfig
                
                gt_dict = json_lib.loads(expected_text)
                aio_dict = json_lib.loads(target_output_str)
                
                json_config = JsonEvalConfig(
                    semantic_threshold=request.semantic_threshold,
                    fuzzy_threshold=request.fuzzy_threshold,
                    w_accuracy=request.w_accuracy,
                    w_completeness=request.w_completeness,
                    w_hallucination=request.w_hallucination,
                    w_safety=request.w_safety,
                    enable_safety=request.enable_safety,
                    llm_model=getattr(request, 'llm_model_name', 'gpt-4o'),
                    llm_api_key=os.getenv("OPENAI_API_KEY") or os.getenv("AZURE_OPENAI_API_KEY"),
                    field_strategies=getattr(request, 'field_strategies', {}) or {}
                )
                
                json_res = await self.json_evaluator.evaluate_single(gt_dict, aio_dict, json_config)
                
                accuracy = json_res.accuracy
                
                json_meta = {
                    "completeness": json_res.completeness,
                    "hallucination": json_res.hallucination,
                    "rqs": json_res.rqs,
                    "gt_keys": json_res.gt_keys,
                    "aio_keys": json_res.aio_keys,
                    "extra_keys": json_res.extra_keys,
                    "missing_keys": json_res.missing_keys,
                    "field_scores": {fs.field_name: fs.model_dump() for fs in json_res.field_scores},
                    "safety_score": json_res.safety_score,
                    "toxic_issues": [f"Tone: {json_res.tone}"],
                    "reason": f"Structure: {len(json_res.matching_keys)}/{len(json_res.gt_keys)} matched. Acc: {json_res.accuracy:.2f}"
                }
            except Exception as e:
                logger.debug("Json metadata extraction failed: %s", e)
        elif found and used_strategy != "IGNORE":
            display_field = query_id
            if request.ground_truth and request.ground_truth.metadata.get("column"):
                display_field = request.ground_truth.metadata["column"]

            json_meta["field_scores"] = {
                display_field: {
                    "match_strategy": used_strategy,
                    "similarity": similarity_value,
                    "score": accuracy,
                    "gt_value": expected_text,
                    "aio_value": target_output_str
                }
            }
        
        await self.emit_status("Orchestrator", "completed", f"Finished Query {query_id}")

        return OutputDetail(
            found=found,
            match_type=match_type,
            accuracy=accuracy,
            expected=expected_text,
            output=target_output_str,
            run_id=request.run_id or "r1",
            safety_score=json_meta.get("safety_score", tox_res.get("score", 1.0)),
            toxicity=1.0 - json_meta.get("safety_score", tox_res.get("score", 1.0)),
            error_type="correct" if accuracy == 1.0 else "hallucination",
            semantic_score=sem_res.get("score"),
            completeness=json_meta.get("completeness", 1.0 if found else 0.0),
            hallucination=json_meta.get("hallucination", 1.0 if (found and not request.ground_truth) else 0.0),
            rqs=json_meta.get("rqs", accuracy),
            gt_keys=json_meta.get("gt_keys"),
            aio_keys=json_meta.get("aio_keys"),
            extra_keys=json_meta.get("extra_keys"),
            missing_keys=json_meta.get("missing_keys"),
            field_scores=json_meta.get("field_scores"),
            reason=json_meta.get("reason") or (
                "Field missing" if not found else
                f"IGNORE strategy — skipped" if used_strategy == "IGNORE" else
                f"EXACT match — {'matched' if accuracy == 1.0 else 'mismatch'}" if used_strategy == "EXACT" else
                f"FUZZY match ({sem_res.get('score', 0.0):.3f} {'>' if accuracy == 1.0 else '<='} {request.fuzzy_threshold})" if used_strategy == "FUZZY" else
                f"SEMANTIC match ({sem_res.get('score', 0.0):.3f} {'>' if accuracy == 1.0 else '<='} {request.semantic_threshold})" if used_strategy == "SEMANTIC" else
                f"Success ({match_type} match)" if accuracy == 1.0 else f"Failed {match_type} comparison"
            ),
            toxicity_issues=json_meta.get("toxic_issues", tox_res.get("issues")),
        )
