from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class RAGMetrics(BaseModel):
    # RAG Triad
    faithfulness: float = 0.0
    answer_relevancy: float = 0.0
    context_precision: float = 0.0
    context_recall: float = 0.0
    
    # NLP Core
    semantic_similarity: float = 0.0
    bert_f1: float = 0.0
    rouge_l: float = 0.0
    bleu: float = 0.0
    
    # Ethics & Safety
    toxicity: float = 0.0
    
    # Efficiency
    rqs: float = 0.0
    latency_ms: float = 0.0
    total_tokens: int = 0

class TestCase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str
    bot_responses: Dict[str, str]
    bot_contexts: Dict[str, List[str]]
    ground_truth: Optional[str] = None
    metadata: Dict[str, Any] = {}

class EvaluationResult(BaseModel):
    id: str
    name: str
    timestamp: datetime = Field(default_factory=datetime.now)
    status: str = "completed"
    test_cases: List[TestCase]
    bot_metrics: Dict[str, Dict[str, RAGMetrics]]  # bot_id -> {case_id -> metrics}
    summaries: Dict[str, Any]
    leaderboard: List[Dict[str, Any]]
    winner: Optional[str] = None
    config: Dict[str, Any] = {}

class EvaluationSummary(BaseModel):
    id: str
    name: str
    timestamp: datetime = Field(default_factory=datetime.now)
    status: str = "completed"
    summaries: Dict[str, Any] # High-level stats per bot
    leaderboard: List[Dict[str, Any]] # Pre-calculated winner/ranks
    winner: Optional[str] = None
    total_test_cases: int = 0

class EvaluationRequest(BaseModel):
    name: str
    dataset: List[TestCase]
    alpha: float = 0.4
    beta: float = 0.3
    gamma: float = 0.3
    temperature: float = 0.0
