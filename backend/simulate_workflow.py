import pandas as pd
import asyncio
from nexus_evaluator import RagEvaluator
from nexus_models import TestCase, RAGMetrics
import time
from nexus_database import SessionLocal, MetricCache
import sys

# Suppress async warnings which clutter output
import warnings
warnings.filterwarnings("ignore")

async def main():
    print("--- [STEP 1] LOADING DATASET ---")
    df = pd.read_excel('large_dataset.xlsx').head(5)
    
    # SETUP: Manually populate the cache for rows 1-4
    evaluator = RagEvaluator()
    db = SessionLocal()
    
    print("--- [STEP 2] POPULATING CACHE FOR ROWS 1-4 ---")
    for i, row in df.iterrows():
        if i == 0: continue # Skip row 0 to simulate "update"
        
        q = str(row['Query']).strip()
        a = str(row['Bot_A']).strip()
        c = [str(row['Context']).strip()]
        gt = str(row['Ground Truth']).strip()
        
        ckey = evaluator._generate_cache_key(q, a, c, gt)
        
        # Inject Fake Metrics
        fake_metrics = RAGMetrics(rqs=0.9, latency_ms=50).model_dump()
        new_cache = MetricCache(cache_key=ckey, metrics=fake_metrics)
        db.merge(new_cache)
        print(f" -> Initialized Cache for Row {i} | Hash: {ckey[:12]}")
        
    db.commit()
    
    print("\n--- [STEP 3] PREPARING TEST DATA (With Updated Row 0) ---")
    cases = []
    for i, row in df.iterrows():
        cases.append(TestCase(
            query=str(row['Query']),
            bot_responses={"Bot A": str(row['Bot_A'])},
            bot_contexts={"Bot A": [str(row['Context'])]},
            ground_truth=str(row['Ground Truth']) 
        ))

    print(f" -> Row 0 Query: {cases[0].query[:40]}... (This should trigger MISS)")
    print(f" -> Row 1 Query: {cases[1].query[:40]}... (This should trigger HIT)")

    print("\n--- [STEP 4] RUNNING EVALUATOR LOGIC ---")
    # This calls the actual logic in evaluator.py that prints DEBUG logs
    # We wrap in try/except because we don't want to actually call OpenAI API here (it would fail/cost money)
    try:
        await evaluator._evaluate_bot("Bot A", cases)
    except Exception as e:
        # We expect it to fail when it tries to call 'evaluate' on the 1 missing row
        # But before it fails, it prints the HITS!
        print("\n(Stopping simulation before API call)")

if __name__ == "__main__":
    asyncio.run(main())
