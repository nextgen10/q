import pandas as pd
import asyncio
from nexus_evaluator import RagEvaluator
from nexus_models import TestCase, RAGMetrics
from nexus_database import SessionLocal, MetricCache
import sys

# Suppress warnings
import warnings
warnings.filterwarnings("ignore")

async def main():
    print("--- [STEP 0] CLEARING CACHE ---")
    db = SessionLocal()
    db.query(MetricCache).delete()
    db.commit()
    print("Cache cleared.")

    print("\n--- [STEP 1] LOADING SMALL 12-ROW DATASET ---")
    df = pd.read_excel('sample_evaluation_data.xlsx')
    
    # SETUP: Manually populate the cache for rows 1-11 (skipping row 0)
    # This simulates "We have run this successfully before"
    evaluator = RagEvaluator()
    
    print("\n--- [STEP 2] POPULATING CACHE FOR 11/12 ROWS ---")
    hits = 0
    for i, row in df.iterrows():
        if i == 0: continue # Skip row 0 (we pretend this is a "new/modified" row)
        
        q = str(row['Query']).strip()
        
        # Safe extraction of Bot A column
        bot_a_col = next((c for c in df.columns if 'Bot_A' in c or 'Bot A' in c), None)
        if not bot_a_col: continue
            
        a = str(row[bot_a_col]).strip()
        
        # Context extraction
        ctx_col = next((c for c in df.columns if 'Context' in c), None)
        c = [str(row[ctx_col]).strip()] if ctx_col else []
        
        # GT extraction
        gt_col = next((c for c in df.columns if 'Ground' in c or 'Truth' in c), None)
        gt = str(row[gt_col]).strip() if gt_col else ""
        
        ckey = evaluator._generate_cache_key(q, a, c, gt)
        
        # Inject Fake Metrics so we don't need OpenAI
        fake_metrics = RAGMetrics(rqs=0.88, latency_ms=10).model_dump()
        new_cache = MetricCache(cache_key=ckey, metrics=fake_metrics)
        db.merge(new_cache)
        hits += 1
        
    db.commit()
    print(f" -> Successfully pre-cached {hits} rows.")
    
    print("\n--- [STEP 3] RUNNING LIVE EVALUATION SIMULATION ---")
    # Now we run the evaluator. It should find 11 HITS and 1 MISS (row 0)
    
    cases = []
    for i, row in df.iterrows():
        bot_a_col = next((c for c in df.columns if 'Bot_A' in c or 'Bot A' in c), None)
        ctx_col = next((c for c in df.columns if 'Context' in c), None)
        gt_col = next((c for c in df.columns if 'Ground' in c or 'Truth' in c), None)
        
        cases.append(TestCase(
            id=f"row_{i}",
            query=str(row['Query']),
            bot_responses={"Bot A": str(row[bot_a_col])},
            bot_contexts={"Bot A": [str(row[ctx_col])]},
            ground_truth=str(row[gt_col]) if gt_col else ""
        ))

    # This calls the actual logic in evaluator.py that prints DEBUG logs
    try:
        # We need to hack the evaluate function lightly or just catch the error
        # Because row 0 is MISSING from cache, it WILL try to call OpenAI
        # We don't want to pay/wait, so we expect it to try and fail/print
        await evaluator._evaluate_bot("Bot A", cases)
    except Exception as e:
        print("\n(Note: Evaluation stopped when trying to call OpenAI for the 1 missing row, which is EXPECTED)")

if __name__ == "__main__":
    asyncio.run(main())
