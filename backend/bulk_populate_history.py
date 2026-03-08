from nexus_database import SessionLocal, EvaluationRecord
from nexus_models import TestCase
import uuid
from datetime import datetime, timedelta
import random

def bulk_populate(count=25):
    db = SessionLocal()
    print(f"Injecting {count} historical records...")

    for i in range(count):
        # Generate dummy data for one test case
        tc_id = str(uuid.uuid4())
        test_cases = [{
            "id": tc_id,
            "query": f"Sample Query {i}",
            "bot_responses": {"Bot A": "Response A", "Bot B": "Response B"},
            "bot_contexts": {"Bot A": ["Context A"], "Bot B": ["Context B"]},
            "ground_truth": "Expected Answer"
        }]
        
        bot_metrics = {
            "Bot A": {tc_id: {"rqs": random.uniform(0.7, 0.95), "latency_ms": 100}},
            "Bot B": {tc_id: {"rqs": random.uniform(0.6, 0.9), "latency_ms": 110}}
        }

        summaries = {
            "Bot A": {"avg_rqs": random.uniform(0.7, 0.95)},
            "Bot B": {"avg_rqs": random.uniform(0.6, 0.9)}
        }
        
        winner = "Bot A" if summaries["Bot A"]["avg_rqs"] > summaries["Bot B"]["avg_rqs"] else "Bot B"
        
        # Stagger timestamps back in time
        timestamp = datetime.now() - timedelta(hours=i)

        record = EvaluationRecord(
            id=str(uuid.uuid4()),
            name=f"Bulk History Test #{i+1}",
            timestamp=timestamp,
            test_cases=test_cases,
            bot_metrics=bot_metrics,
            summaries=summaries,
            leaderboard=[],
            winner=winner
        )
        db.add(record)
    
    db.commit()
    print(f"✅ Successfully injected {count} records.")
    db.close()

if __name__ == "__main__":
    bulk_populate(25)
