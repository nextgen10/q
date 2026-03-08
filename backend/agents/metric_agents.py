import math
import re
from typing import Dict, Any, Optional, List
from .base_agent import BaseAgent
from utils.toxicity_checker import check_toxicity, ToxicityResult

class BaseMetricAgent(BaseAgent):
    def __init__(self, name: str):
        super().__init__(name=name)

    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

class ExactMatchAgent(BaseMetricAgent):
    def __init__(self):
        super().__init__(name="Exact Match Agent")

    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        candidate = input_data.get("candidate", "")
        reference = input_data.get("reference", "")
        match_type = input_data.get("match_type", "text")
        
        is_match = False
        if match_type == "text":
            is_match = candidate.strip().lower() == reference.strip().lower()
        elif match_type == "number":
            try:
                c = float(re.sub(r"[^\d\.\-eE]", "", str(candidate)))
                r = float(re.sub(r"[^\d\.\-eE]", "", str(reference)))
                is_match = math.isclose(c, r, rel_tol=0.01)
            except (ValueError, TypeError):
                is_match = False
        elif match_type == "email":
            is_match = self.normalize_email(candidate) == self.normalize_email(reference)
        elif match_type == "date":
            is_match = candidate.strip() == reference.strip()

        return {"score": 1.0 if is_match else 0.0, "success": is_match}

    def normalize_email(self, s: str) -> str:
        if not s: return ""
        s = s.strip().lower()
        s = s.replace(" at ", "@").replace(" dot ", ".")
        return s.replace("(at)", "@").replace("[at]", "@")

class SemanticSimilarityAgent(BaseMetricAgent):
    """LLM-based semantic similarity — no local embedding model required."""

    def __init__(self, **kwargs):
        super().__init__(name="Semantic Similarity Agent")

    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        candidate = input_data.get("candidate", "")
        reference = input_data.get("reference", "")
        
        if not candidate or not reference:
            return {"score": 0.0}

        from utils.llm_similarity import llm_semantic_similarity
        score = await llm_semantic_similarity(candidate, reference)
        return {"score": score}

class SafetyAgent(BaseMetricAgent):
    def __init__(self):
        super().__init__(name="Safety Agent")

    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        text = input_data.get("text", "")
        if not text:
            return {"score": 1.0, "safety_score": 1.0}
            
        import os
        llm_model = os.getenv("LLM_EVAL_MODEL", "gpt-4o")
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("AZURE_OPENAI_API_KEY")
        
        if not api_key:
             print("WARNING: Safety check requested but API key is missing!")
             return {"score": 1.0, "safety_score": 1.0, "note": "No API key for LLM-based safety check"}

        print(f"DEBUG [SafetyAgent]: Checking text (len={len(text)}): {text[:60]}...")
        res: ToxicityResult = await check_toxicity(text, llm_model, api_key)
        print(f"DEBUG [SafetyResult]: Score={res.safety_score}, Tone={res.tone}, Issues={res.issues}")
        
        return {
            "score": res.safety_score,
            "safety_score": res.safety_score,
            "toxicity_score": res.toxicity_score,
            "tone": res.tone,
            "issues": res.issues
        }