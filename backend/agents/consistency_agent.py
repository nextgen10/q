from typing import List, Dict, Any
from .base_agent import BaseAgent

class ConsistencyAgent(BaseAgent):
    """LLM-based consistency scoring — no local embedding model required."""

    def __init__(self, **kwargs):
        super().__init__(name="Consistency Agent")

    async def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Input:
            outputs: List[str] - List of outputs to check consistency for.
        """
        outputs = input_data.get("outputs", [])
        if not outputs:
            return {"score": 0.0}

        if len(outputs) > 1:
            return await self._calculate_cross_run_consistency(outputs)
        else:
            return await self._calculate_internal_consistency(outputs[0])

    async def _calculate_cross_run_consistency(self, outputs: List[str]) -> Dict[str, Any]:
        try:
            from utils.llm_similarity import llm_consistency_score
            score = await llm_consistency_score(outputs)
            return {"score": score, "type": "cross-run"}
        except Exception as e:
            print(f"Cross-run consistency error: {e}")
            return {"score": 0.0, "error": str(e)}

    async def _calculate_internal_consistency(self, text: str) -> Dict[str, Any]:
        sentences = [s.strip() for s in text.split('.') if s.strip()]

        if len(sentences) <= 1:
            return {"score": 1.0, "type": "internal"}

        try:
            from utils.llm_similarity import llm_consistency_score
            score = await llm_consistency_score(sentences)
            return {"score": score, "type": "internal"}
        except Exception as e:
            print(f"Internal consistency error: {e}")
            return {"score": 0.0, "error": str(e)}
