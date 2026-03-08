from pydantic import BaseModel, Field, model_validator
from typing import List, Dict, Any, Optional


def _flatten_strategies(data: Any, parent_key: str = "", result: Dict[str, str] = None) -> Dict[str, str]:
    """Flatten a nested strategy config into dot-path keys matching flatten_json convention."""
    if result is None:
        result = {}

    if isinstance(data, dict):
        all_str = all(isinstance(v, str) and v.upper() in ("EXACT", "FUZZY", "SEMANTIC", "IGNORE") for v in data.values())
        if parent_key and all_str:
            for k, v in data.items():
                flat_key = f"{parent_key}_{k}" if parent_key else k
                result[flat_key] = v
        else:
            for k, v in data.items():
                flat_key = f"{parent_key}_{k}" if parent_key else k
                if isinstance(v, str) and v.upper() in ("EXACT", "FUZZY", "SEMANTIC", "IGNORE"):
                    result[flat_key] = v
                else:
                    _flatten_strategies(v, flat_key, result)
    elif isinstance(data, list):
        for idx, v in enumerate(data, start=1):
            flat_key = f"{parent_key}#{idx}"
            _flatten_strategies(v, flat_key, result)
    elif isinstance(data, str) and data.upper() in ("EXACT", "FUZZY", "SEMANTIC", "IGNORE"):
        result[parent_key] = data

    return result


class JsonEvalConfig(BaseModel):
    semantic_threshold: float = 0.80
    fuzzy_threshold: float = 0.85
    w_accuracy: float = 0.45
    w_completeness: float = 0.25
    w_hallucination: float = 0.15
    w_safety: float = 0.15
    enable_safety: bool = True
    llm_model: str = "gpt-4o"
    llm_api_key: Optional[str] = None
    field_strategies: Dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def flatten_field_strategies(self):
        """Auto-flatten nested strategy configs so lookups match flattened GT/AIO keys."""
        raw = self.field_strategies
        if not raw:
            return self
        already_flat = all(
            isinstance(v, str) and v.upper() in ("EXACT", "FUZZY", "SEMANTIC", "IGNORE")
            for v in raw.values()
        )
        if already_flat:
            return self
        self.field_strategies = _flatten_strategies(raw)
        return self

class FieldScore(BaseModel):
    field_name: str
    field_type: str
    gt_value: Any
    aio_value: Any
    match_strategy: str
    score: float
    similarity: float

class JsonEvalResult(BaseModel):
    completeness: float
    hallucination: float
    accuracy: float
    safety_score: float
    toxicity: float = 0.0
    tone: str
    rqs: float
    consistency: Optional[float] = None
    field_scores: List[FieldScore]
    gt_keys: List[str]
    aio_keys: List[str]
    matching_keys: List[str]
    extra_keys: List[str]
    missing_keys: List[str]
    # Phase detail breakdowns
    gt_null_aio_has_value: List[str] = Field(default_factory=list)
    aio_missing_or_null: List[str] = Field(default_factory=list)
    both_non_null: List[str] = Field(default_factory=list)
    ignored_keys: List[str] = Field(default_factory=list)

class JsonEvalRequest(BaseModel):
    ground_truth: Dict[str, Any]
    agent_output: Dict[str, Any]
    config: Optional[JsonEvalConfig] = None

class JsonBatchEvalRequest(BaseModel):
    ground_truth: Dict[str, Any]
    agent_outputs: List[Dict[str, Any]]
    config: Optional[JsonEvalConfig] = None

class JsonBatchEvalResponse(BaseModel):
    results: List[JsonEvalResult]
    best_response_idx: int
    best_rqs: float
    mean_rqs: float
    variance: float
    std_dev: float
    ranking: List[int]
    consistency_score: Optional[float] = None
