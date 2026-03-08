from nexus_database import SessionLocal, EvaluationRecord
from nexus_models import TestCase
import uuid
from datetime import datetime
import json

def populate():
    db = SessionLocal()
    NUM_ROWS = 500
    
    print(f"Generating {NUM_ROWS} dummy rows...")

    # Generate dummy test cases
    test_cases = []
    bot_metrics = {"Bot A": {}, "Bot B": {}}

    for i in range(NUM_ROWS):
        tc = TestCase(
            query=f"Stress test query {i} for pagination check",
            bot_responses={
                "Bot A": f"This is a simulated response number {i} from Bot A. It is long enough to look real.",
                "Bot B": f"This is a simulated response number {i} from Bot B. It differs slightly."
            },
            bot_contexts={
                "Bot A": ["Context chunk 1", "Context chunk 2"], 
                "Bot B": ["Context chunk 1"]
            },
            ground_truth=f"The expected answer is {i}."
        )
        test_cases.append(tc.dict())
        
        # Metrics
        for bot in ["Bot A", "Bot B"]:
            bot_metrics[bot][tc.id] = {
                "faithfulness": 0.95,
                "answer_relevancy": 0.88,
                "context_precision": 0.76, 
                "context_recall": 0.92,
                "semantic_similarity": 0.85,
                "latency_ms": 120.5,
                "rqs": 0.892
            }

    # Summaries
    summaries = {
        "Bot A": {
            "avg_rqs": 0.892, "gt_alignment": 0.85, "avg_faithfulness": 0.95, 
            "avg_relevancy": 0.88, "avg_context_precision": 0.76, "retrieval_success": 0.92
        },
        "Bot B": {
            "avg_rqs": 0.892, "gt_alignment": 0.85, "avg_faithfulness": 0.95, 
            "avg_relevancy": 0.88, "avg_context_precision": 0.76, "retrieval_success": 0.92
        }
    }
    
    leaderboard = [
        {"bot_id": "Bot A", "rank": 1, "avg_rqs": 0.892, "gt_alignment": 0.85, "avg_faithfulness": 0.95, "avg_relevancy": 0.88, "avg_context_precision": 0.76, "retrieval_success": 0.92},
        {"bot_id": "Bot B", "rank": 2, "avg_rqs": 0.892, "gt_alignment": 0.85, "avg_faithfulness": 0.95, "avg_relevancy": 0.88, "avg_context_precision": 0.76, "retrieval_success": 0.92}
    ]

    # Create Record
    record = EvaluationRecord(
        id=str(uuid.uuid4()),
        name=f"Stress Test 500 Rows ({datetime.now().strftime('%H:%M:%S')})",
        timestamp=datetime.now(),
        test_cases=test_cases,
        bot_metrics=bot_metrics,
        summaries=summaries,
        leaderboard=leaderboard,
        winner="Bot A"
    )

    # Insert
    db.add(record)
    db.commit()
    print("✅ Injected 500-row dummy evaluation into DB.")
    db.close()

if __name__ == "__main__":
    populate()
