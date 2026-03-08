import pandas as pd
import asyncio
from nexus_evaluator import RagEvaluator
from nexus_models import TestCase, RAGMetrics
from nexus_database import SessionLocal, MetricCache
import sys
import random

# Suppress warnings
import warnings
warnings.filterwarnings("ignore")

async def main():
    print("--- [STEP 0] CLEARING CACHE ---")
    db = SessionLocal()
    db.query(MetricCache).delete()
    db.commit()
    print("Cache cleared.")

    print("\n--- [STEP 1] LOADING LARGE DATASET (500 Rows) ---")
    # This is now the 500-row file
    df = pd.read_excel('sample_evaluation_data.xlsx')
    
    evaluator = RagEvaluator()
    
    print("\n--- [STEP 2] POPULATING CACHE FOR 499/500 ROWS ---")
    # We will "Pretend" we already evaluated 499 rows
    hits = 0
    for i, row in df.iterrows():
        if i == 0: continue # Skip row 0 (Simulate Update)
        
        q = str(row['Query']).strip()
        
        # Flexibly find columns
        bot_a_col = next((c for c in df.columns if 'Bot_A' in c or 'Bot A' in c), None)
        ctx_col = next((c for c in df.columns if 'Context' in c), None)
        gt_col = next((c for c in df.columns if 'Ground' in c or 'Truth' in c), None)
        
        if not bot_a_col: continue
            
        a = str(row[bot_a_col]).strip()
        c = [str(row[ctx_col]).strip()] if ctx_col else []
        gt = str(row[gt_col]).strip() if gt_col else ""
        
        ckey = evaluator._generate_cache_key(q, a, c, gt)
        
        # Inject Fake Metrics so we don't need OpenAI
        # Using varied numbers to make it look real
        fake_rqs = 0.7 + (random.random() * 0.2)
        fake_metrics = RAGMetrics(rqs=fake_rqs, latency_ms=100).model_dump()
        new_cache = MetricCache(cache_key=ckey, metrics=fake_metrics)
        db.merge(new_cache)
        hits += 1
        
        if hits % 100 == 0:
            print(f" -> Processed {hits} rows...")
        
    db.commit()
    print(f" -> Successfully pre-cached {hits} rows.")
    
    print("\n--- [STEP 3] RUNNING LIVE EVALUATION SIMULATION ---")
    
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

    print(f"Running evaluator on {len(cases)} total cases...")
    try:
        # We expect this to print 499 HITS and try to evaluate 1 NEW case
        await evaluator._evaluate_bot("Bot A", cases)
    except Exception as e:
        print("\n(Note: Evaluation stopped when trying to call OpenAI for the 1 missing row, which is EXPECTED)")

if __name__ == "__main__":
    asyncio.run(main())
