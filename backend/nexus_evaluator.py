import os

# Disable parallel tokenizers to prevent deadlocks/crashes on macOS
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import numpy as np
import pandas as pd
from typing import List, Dict, Any
from nexus_models import RAGMetrics, TestCase
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall, answer_correctness
from langchain_openai import AzureChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from dotenv import load_dotenv
import nest_asyncio
import asyncio

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)
if not os.getenv("AZURE_OPENAI_API_KEY"):
    load_dotenv() # Fallback

class RagEvaluator:
    def __init__(self, alpha: float = 0.4, beta: float = 0.3, gamma: float = 0.3, model_name: str = "gpt-4o", temperature: float = 0.0):
        nest_asyncio.apply()
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.temperature = temperature
        self.model_name = model_name
        
        az_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        az_key = os.getenv("AZURE_OPENAI_API_KEY")
        if not az_endpoint or not az_key:
            raise ValueError(
                "AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be set for RAG evaluation. "
                "Check your .env file."
            )
        self.llm = AzureChatOpenAI(
            azure_deployment=model_name,
            openai_api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
            azure_endpoint=az_endpoint,
            api_key=az_key,
            temperature=self.temperature
        )
        
        # Local Embedding Model path
        model_path = os.path.join(os.path.dirname(__file__), "EmbeddingModels", "all-MiniLM-L6-v2")
        self.embeddings = HuggingFaceEmbeddings(model_name=model_path)

    def calculate_rqs(self, metrics: RAGMetrics) -> float:
        """
        RQS Score (Production Grade):
        Weighted composite of Core NLP accuracy, RAG Triad, and Intent alignment.
        """
        # Distribute remaining weight between context precision and recall
        weight_sum = self.alpha + self.beta + self.gamma
        remaining = max(0, 1.0 - weight_sum)
        ctx_weight = remaining / 2 if remaining > 0 else 0.05
        
        # Normalize if necessary
        total_weight = weight_sum + (ctx_weight * 2)
        
        # Add epsilon to prevent division by zero
        if total_weight < 0.0001:
            total_weight = 1.0
            
        rqs = (self.alpha * metrics.semantic_similarity) + \
              (self.beta * metrics.faithfulness) + \
              (self.gamma * metrics.answer_relevancy) + \
              (ctx_weight * metrics.context_precision) + \
              (ctx_weight * metrics.context_recall)
              
        return round(rqs / total_weight, 4)

    def _safe_float(self, value) -> float:
        """Sanitizes float values to be JSON compliant (no NaN/Inf)"""
        try:
            val = float(value)
            return val if np.isfinite(val) else 0.0
        except (TypeError, ValueError):
            return 0.0

    def _generate_cache_key(self, query: str, answer: str, contexts: List[str], ground_truth: str) -> str:
        import hashlib
        import json
        # Robust hashing: include model name and temperature to ensure score consistency if params change
        payload = {
            "q": str(query).strip(),
            "a": str(answer).strip(),
            "c": sorted([str(ctx).strip() for ctx in contexts]),
            "gt": str(ground_truth or "").strip(),
            "m": str(self.model_name).lower().strip(),
            "t": f"{float(self.temperature):.3f}"
        }
        dump = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(dump.encode()).hexdigest()

    async def _evaluate_bot(self, bid: str, dataset: List[TestCase]) -> Dict[str, RAGMetrics]:
        """Worker task for parallel evaluation with DB lookup and toxicity checking"""
        from nexus_database import SessionLocal, MetricCache
        from utils.toxicity_checker import check_toxicity
        
        db = SessionLocal()
        try:
            print(f"DEBUG: Processing metrics for {bid}...")
            
            bot_results = {}
            pending_cases = []
            pending_indices = []
            
            # 1. First Pass: Check Database for existing triplets
            for i, case in enumerate(dataset):
                q = case.query
                a = case.bot_responses.get(bid, "")
                c = case.bot_contexts.get(bid, [])
                gt = case.ground_truth or ""
                
                ckey = self._generate_cache_key(q, a, c, gt)
                cached = db.query(MetricCache).filter(MetricCache.cache_key == ckey).first()
                
                if cached:
                    # Reuse cached metrics
                    print(f"DEBUG: [CACHE_HIT] {bid} | Hash: {ckey[:12]} | Scenario: {case.id}")
                    m_data = cached.metrics
                    metrics = RAGMetrics(**m_data)
                    # Recalculate RQS in case alpha/beta/gamma changed
                    metrics.rqs = self.calculate_rqs(metrics)
                    bot_results[case.id] = metrics
                else:
                    print(f"DEBUG: [CACHE_MISS] {bid} | Hash: {ckey[:12]} | Scenario: {case.id}")
                    pending_cases.append(case)
                    pending_indices.append(i)

            # 2. Second Pass: Evaluate only what's missing
            if pending_cases:
                print(f"DEBUG: Evaluating {len(pending_cases)} new cases for {bid}...")
                data = {
                    "question": [case.query for case in pending_cases],
                    "answer": [case.bot_responses.get(bid, "") for case in pending_cases],
                    "contexts": [case.bot_contexts.get(bid, []) for case in pending_cases],
                    "ground_truth": [case.ground_truth if case.ground_truth else "" for case in pending_cases]
                }
                rag_dataset = Dataset.from_dict(data)
                
                import time
                start_time = time.time()
                
                result = await asyncio.to_thread(
                    evaluate,
                    rag_dataset,
                    metrics=[faithfulness, answer_relevancy, context_recall, context_precision, answer_correctness],
                    llm=self.llm,
                    embeddings=self.embeddings
                )
                eval_latency = (time.time() - start_time) / len(pending_cases) * 1000
                
                df = result.to_pandas()
                for i, case in enumerate(pending_cases):
                    m = df.iloc[i]
                    response_text = case.bot_responses.get(bid, "")
                    
                    # Calculate toxicity for the response
                    toxicity_score = 0.0
                    try:
                        tox_result = await check_toxicity(response_text, self.model_name)
                        toxicity_score = self._safe_float(tox_result.toxicity_score)
                    except Exception as e:
                        print(f"WARNING: Toxicity check failed for {bid} case {case.id}: {e}")
                        toxicity_score = 0.0
                    
                    metrics = RAGMetrics(
                        faithfulness=self._safe_float(m.get('faithfulness', 0.0)),
                        answer_relevancy=self._safe_float(m.get('answer_relevancy', 0.0)),
                        context_recall=self._safe_float(m.get('context_recall', 0.0)),
                        context_precision=self._safe_float(m.get('context_precision', 0.0)),
                        semantic_similarity=self._safe_float(m.get('answer_correctness', 0.0)),
                        toxicity=toxicity_score,
                        latency_ms=self._safe_float(eval_latency)
                    )
                    token_est = int(len(response_text.split()) * 1.35) + 45
                    metrics.total_tokens = token_est
                    metrics.rqs = self.calculate_rqs(metrics)
                    
                    bot_results[case.id] = metrics
                    
                    # Store in DB for future lookup
                    q = case.query
                    a = case.bot_responses.get(bid, "")
                    c = case.bot_contexts.get(bid, [])
                    gt = case.ground_truth or ""
                    ckey = self._generate_cache_key(q, a, c, gt)
                    
                    new_cache = MetricCache(
                        cache_key=ckey,
                        metrics=metrics.model_dump()
                    )
                    db.merge(new_cache) # use merge to avoid primary key conflicts
                
                db.commit()

            hit_count = len(dataset) - len(pending_cases)
            print(f"DEBUG: Finalized {bid} | Hits: {hit_count}/{len(dataset)} | New: {len(pending_cases)}")
            return {bid: bot_results}
        except Exception as e:
            import traceback
            error_msg = f"CRITICAL ERROR evaluating {bid}: {str(e)}"
            print(error_msg)
            traceback.print_exc()
            
            # Log which specific test cases failed
            print(f"Failed test case IDs for {bid}: {[case.id for case in dataset]}")
            
            # Re-raise to propagate to main handler
            raise RuntimeError(f"Bot {bid} evaluation failed: {str(e)}") from e
        finally:
            db.close()

    async def run_multi_bot_evaluation(self, dataset: List[TestCase]) -> Dict[str, Any]:
        if not dataset: return {"error": "Empty dataset"}

        bot_ids = list(dataset[0].bot_responses.keys())
        
        # Sequential Execution to prevent memory corruption/double free on macOS
        worker_results = []
        for bid in bot_ids:
            res = await self._evaluate_bot(bid, dataset)
            worker_results.append(res)
        
        # Merge results
        bot_metrics_result = {}
        for res in worker_results:
            bot_metrics_result.update(res)

        # Summaries & Leaderboard
        summaries = {}
        leaderboard = []
        for bid in bot_ids:
            # FIX: Do not filter out 0 values, as it inflates the averages incorrectly.
            m_values = list(bot_metrics_result[bid].values())
            avg_rqs = self._safe_float(np.mean([m.rqs for m in m_values])) if m_values else 0.0
            avg_correctness = self._safe_float(np.mean([m.semantic_similarity for m in m_values])) if m_values else 0.0
            avg_recall = self._safe_float(np.mean([m.context_recall for m in m_values])) if m_values else 0.0
            avg_faith = self._safe_float(np.mean([m.faithfulness for m in m_values])) if m_values else 0.0
            avg_relevancy = self._safe_float(np.mean([m.answer_relevancy for m in m_values])) if m_values else 0.0
            avg_precision = self._safe_float(np.mean([m.context_precision for m in m_values])) if m_values else 0.0
            avg_toxicity = self._safe_float(np.mean([m.toxicity for m in m_values])) if m_values else 0.0
            avg_latency = self._safe_float(np.mean([m.latency_ms for m in m_values])) if m_values else 0.0
            
            summaries[bid] = {
                "avg_rqs": float(round(avg_rqs, 4)),
                "gt_alignment": float(round(avg_correctness, 4)),
                "retrieval_success": float(round(avg_recall, 4)),
                "avg_faithfulness": float(round(avg_faith, 4)),
                "avg_relevancy": float(round(avg_relevancy, 4)),
                "avg_context_precision": float(round(avg_precision, 4)),
                "avg_toxicity": float(round(avg_toxicity, 4)),
                "avg_latency": float(round(avg_latency, 2)),
                "avg_tokens": int(np.mean([m.total_tokens for m in m_values])) if m_values else 0,
                "total_queries": len(dataset)
            }
            leaderboard.append({
                "bot_id": bid,
                "avg_rqs": float(round(avg_rqs, 4)),
                "gt_alignment": float(round(avg_correctness, 4)),
                "retrieval_success": float(round(avg_recall, 4)),
                "avg_faithfulness": float(round(avg_faith, 4)),
                "avg_relevancy": float(round(avg_relevancy, 4)),
                "avg_context_precision": float(round(avg_precision, 4)),
                "avg_toxicity": float(round(avg_toxicity, 4)),
                "avg_latency": float(round(avg_latency, 2)),
                "avg_tokens": int(np.mean([m.total_tokens for m in m_values])) if m_values else 0
            })
            
        leaderboard.sort(key=lambda x: x["avg_rqs"], reverse=True)
        return {
            "bot_metrics": bot_metrics_result,
            "summaries": summaries,
            "leaderboard": leaderboard,
            "winner": leaderboard[0]["bot_id"] if leaderboard else None
        }
