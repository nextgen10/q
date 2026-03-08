"""
Seed script: Inserts 15-question demo evaluation into the nexus_evaluations.db.
Run once:  python seed_demo_data.py
Delete after use — this file is only for demo purposes.
"""

import random, uuid
from datetime import datetime
from nexus_database import SessionLocal, EvaluationRecord, Base, engine

Base.metadata.create_all(bind=engine)

QUESTIONS = [
    {
        "q": "What is the capital of France?",
        "gt": "The capital of France is Paris.",
        "ctx": {"Bot_A": ["France is a country in Western Europe. Its capital is Paris."], "Bot_B": ["Paris is the capital and most populous city of France."], "Bot_C": ["Lyon is the third-largest city in France."]},
        "r": {"Bot_A": "Paris is the capital of France.", "Bot_B": "The capital city of France is Paris, known for the Eiffel Tower.", "Bot_C": "France's capital is Lyon."},
    },
    {
        "q": "Explain how photosynthesis works.",
        "gt": "Photosynthesis converts sunlight, water, and CO2 into glucose and oxygen using chlorophyll.",
        "ctx": {"Bot_A": ["Photosynthesis occurs in chloroplasts.", "6CO2 + 6H2O → C6H12O6 + 6O2"], "Bot_B": ["Chlorophyll absorbs light to synthesize glucose."], "Bot_C": ["Respiration occurs in mitochondria."]},
        "r": {"Bot_A": "Photosynthesis uses sunlight, water, and CO2 to produce glucose and oxygen in chloroplasts.", "Bot_B": "Plants absorb sunlight through chlorophyll and combine CO2 with water to create sugar.", "Bot_C": "Photosynthesis happens in the mitochondria converting oxygen to CO2."},
    },
    {
        "q": "What are the benefits of portfolio diversification?",
        "gt": "Diversification reduces risk by spreading investments across asset classes, sectors, and geographies.",
        "ctx": {"Bot_A": ["Modern Portfolio Theory optimizes risk-return tradeoff.", "Allocation across equities and bonds reduces risk."], "Bot_B": ["Geographic diversification protects against country-specific downturns."], "Bot_C": ["S&P 500 averaged 10% annually."]},
        "r": {"Bot_A": "Diversified portfolios reduce risk by allocating across equities, bonds, and commodities.", "Bot_B": "Diversification helps manage risk across sectors and geographies.", "Bot_C": "Putting all money into tech stocks gives the best results."},
    },
    {
        "q": "What is the difference between SQL and NoSQL?",
        "gt": "SQL databases are relational with structured schemas. NoSQL are non-relational with flexible schemas for horizontal scaling.",
        "ctx": {"Bot_A": ["Relational databases use predefined schemas.", "NoSQL includes MongoDB, Redis, Neo4j."], "Bot_B": ["NoSQL handles large volumes of unstructured data."], "Bot_C": ["Databases store data."]},
        "r": {"Bot_A": "SQL enforces structured schemas. NoSQL supports flexible data models for horizontal scaling.", "Bot_B": "SQL uses rigid schemas. NoSQL offers document, key-value, and graph models.", "Bot_C": "SQL is older, NoSQL is newer and faster in all cases."},
    },
    {
        "q": "How does the ECB set interest rates?",
        "gt": "The ECB Governing Council sets rates based on inflation outlook, economic growth, meeting every six weeks.",
        "ctx": {"Bot_A": ["The Governing Council is the main ECB decision body.", "ECB targets 2% inflation."], "Bot_B": ["ECB conducts policy for 20 Eurozone states."], "Bot_C": ["Central banks control monetary policy."]},
        "r": {"Bot_A": "The ECB Governing Council meets every six weeks to decide rates based on inflation and growth.", "Bot_B": "The ECB sets rates considering inflation targets and financial stability.", "Bot_C": "The ECB president decides the rate each month."},
    },
    {
        "q": "What is machine learning?",
        "gt": "Machine learning is a subset of AI where systems learn from data to improve performance without explicit programming.",
        "ctx": {"Bot_A": ["ML algorithms build models from sample data.", "Supervised, unsupervised, and reinforcement learning are key paradigms."], "Bot_B": ["ML enables computers to learn from experience."], "Bot_C": ["Computers follow instructions."]},
        "r": {"Bot_A": "Machine learning is a branch of AI enabling systems to learn from data and improve without being explicitly programmed.", "Bot_B": "ML lets computers learn from experience to improve at tasks over time.", "Bot_C": "Machine learning is when computers are programmed to do tasks."},
    },
    {
        "q": "Explain the concept of blockchain technology.",
        "gt": "Blockchain is a distributed ledger recording transactions across many computers so records cannot be altered retroactively.",
        "ctx": {"Bot_A": ["Blockchain uses cryptographic hashing and consensus mechanisms.", "Each block contains a hash of the previous block."], "Bot_B": ["Distributed ledger technology ensures transparency."], "Bot_C": ["Bitcoin is a cryptocurrency."]},
        "r": {"Bot_A": "Blockchain is a decentralized distributed ledger using cryptographic hashing where each block references the previous.", "Bot_B": "Blockchain is a distributed ledger ensuring transparent, immutable transaction records.", "Bot_C": "Blockchain is what Bitcoin uses to make money."},
    },
    {
        "q": "What causes inflation in an economy?",
        "gt": "Inflation is caused by demand-pull factors, cost-push factors, and monetary expansion exceeding economic growth.",
        "ctx": {"Bot_A": ["Demand-pull inflation occurs when demand exceeds supply.", "Cost-push inflation arises from rising production costs."], "Bot_B": ["Monetary expansion beyond GDP growth can cause inflation."], "Bot_C": ["Prices go up sometimes."]},
        "r": {"Bot_A": "Inflation arises from demand-pull (excess demand), cost-push (rising production costs), and excessive monetary expansion.", "Bot_B": "Inflation is driven by monetary expansion, demand exceeding supply, and rising costs.", "Bot_C": "Inflation happens when the government prints too much money."},
    },
    {
        "q": "How does HTTPS differ from HTTP?",
        "gt": "HTTPS encrypts data using TLS/SSL, providing authentication and data integrity, while HTTP transmits data in plain text.",
        "ctx": {"Bot_A": ["TLS provides encryption, authentication, and integrity.", "HTTPS uses port 443 by default."], "Bot_B": ["SSL/TLS certificates verify server identity."], "Bot_C": ["Websites use HTTP."]},
        "r": {"Bot_A": "HTTPS uses TLS/SSL to encrypt data in transit, authenticate servers, and ensure integrity. HTTP sends plaintext.", "Bot_B": "HTTPS adds SSL/TLS encryption and certificate authentication on top of HTTP.", "Bot_C": "HTTPS has an S which means it is secure. HTTP does not."},
    },
    {
        "q": "What is the role of the Federal Reserve?",
        "gt": "The Fed conducts monetary policy, supervises banks, maintains financial stability, and provides financial services.",
        "ctx": {"Bot_A": ["The Fed uses open market operations, discount rate, and reserve requirements.", "Dual mandate: maximum employment and stable prices."], "Bot_B": ["The Federal Reserve System was created in 1913."], "Bot_C": ["The Fed is a US bank."]},
        "r": {"Bot_A": "The Federal Reserve conducts monetary policy via open market operations, supervises banks, and maintains stability under its dual mandate.", "Bot_B": "The Fed manages monetary policy, regulates banks, and works toward maximum employment and price stability.", "Bot_C": "The Federal Reserve prints dollars and sets rates."},
    },
    {
        "q": "Explain the concept of containerization in software.",
        "gt": "Containerization packages applications with dependencies into isolated containers that run consistently across environments using tools like Docker.",
        "ctx": {"Bot_A": ["Docker containers share the host OS kernel.", "Containers are lighter than virtual machines."], "Bot_B": ["Kubernetes orchestrates container deployments."], "Bot_C": ["Software runs on computers."]},
        "r": {"Bot_A": "Containerization uses Docker to package apps with all dependencies into lightweight, isolated containers sharing the host OS kernel.", "Bot_B": "Containers package applications with dependencies for consistent cross-environment execution, orchestrated by tools like Kubernetes.", "Bot_C": "Containers are like virtual machines but smaller."},
    },
    {
        "q": "What is the Basel III regulatory framework?",
        "gt": "Basel III strengthens bank capital requirements, introduces leverage ratios, and adds liquidity requirements to improve financial system resilience.",
        "ctx": {"Bot_A": ["Basel III requires higher Tier 1 capital ratios.", "LCR and NSFR are key liquidity metrics."], "Bot_B": ["Basel III was developed after the 2008 financial crisis."], "Bot_C": ["Banks have rules."]},
        "r": {"Bot_A": "Basel III strengthens capital requirements with higher Tier 1 ratios, introduces leverage constraints, and mandates LCR and NSFR liquidity coverage.", "Bot_B": "Basel III improves bank resilience through stricter capital and liquidity requirements post-2008 crisis.", "Bot_C": "Basel III is a set of banking regulations from Europe."},
    },
    {
        "q": "How do neural networks learn?",
        "gt": "Neural networks learn by adjusting weights through backpropagation, minimizing a loss function using gradient descent across training epochs.",
        "ctx": {"Bot_A": ["Backpropagation computes gradients of the loss function.", "Gradient descent updates weights to minimize error."], "Bot_B": ["Deep learning uses multiple hidden layers."], "Bot_C": ["AI is smart computers."]},
        "r": {"Bot_A": "Neural networks adjust weights via backpropagation, computing loss gradients and applying gradient descent to minimize error across epochs.", "Bot_B": "Networks learn through backpropagation and gradient descent over multiple training epochs to reduce prediction error.", "Bot_C": "Neural networks learn by looking at data and getting smarter over time."},
    },
    {
        "q": "What is the difference between ETFs and mutual funds?",
        "gt": "ETFs trade on exchanges like stocks with real-time pricing and lower fees. Mutual funds trade once daily at NAV and often have higher expense ratios.",
        "ctx": {"Bot_A": ["ETFs offer intraday trading and tax efficiency.", "Mutual funds are actively or passively managed."], "Bot_B": ["Expense ratios for ETFs are typically lower than mutual funds."], "Bot_C": ["Both are investments."]},
        "r": {"Bot_A": "ETFs trade on exchanges intraday with real-time pricing and generally lower expense ratios. Mutual funds trade once daily at NAV.", "Bot_B": "ETFs offer exchange trading, lower fees, and tax efficiency while mutual funds price once daily with higher expense ratios.", "Bot_C": "ETFs and mutual funds are both ways to invest money in the stock market."},
    },
    {
        "q": "Explain the CAP theorem in distributed systems.",
        "gt": "CAP theorem states a distributed system can guarantee at most two of: Consistency, Availability, and Partition tolerance simultaneously.",
        "ctx": {"Bot_A": ["Brewer's theorem was proven in 2002.", "CP systems sacrifice availability; AP systems sacrifice consistency."], "Bot_B": ["Distributed databases must handle network partitions."], "Bot_C": ["Distributed means multiple computers."]},
        "r": {"Bot_A": "The CAP theorem (Brewer's theorem) states distributed systems can provide at most two of Consistency, Availability, and Partition tolerance. CP sacrifices A; AP sacrifices C.", "Bot_B": "CAP theorem says distributed databases must choose between consistency and availability during network partitions.", "Bot_C": "CAP theorem is about computer networks being fast and reliable."},
    },
]

BOTS = ["Bot_A", "Bot_B", "Bot_C"]
BASES = {"Bot_A": 0.92, "Bot_B": 0.85, "Bot_C": 0.38}

def mk(base, variance=0.1):
    return round(min(1.0, max(0.0, base + (random.random() - 0.5) * variance)), 4)

def build_demo():
    random.seed(42)
    eval_id = f"demo-{uuid.uuid4().hex[:8]}"
    test_cases = []
    bot_metrics = {b: {} for b in BOTS}

    for i, q in enumerate(QUESTIONS):
        tc_id = f"tc-{str(i+1).zfill(3)}"
        test_cases.append({
            "id": tc_id,
            "query": q["q"],
            "ground_truth": q["gt"],
            "bot_responses": q["r"],
            "bot_contexts": q["ctx"],
            "metadata": {},
        })
        for bot in BOTS:
            b = BASES[bot]
            f = mk(b); r = mk(b); cp = mk(b - 0.03); cr = mk(b - 0.05); ss = mk(b + 0.02)
            bot_metrics[bot][tc_id] = {
                "faithfulness": f,
                "answer_relevancy": r,
                "context_precision": cp,
                "context_recall": cr,
                "semantic_similarity": ss,
                "bert_f1": 0.0, "rouge_l": 0.0, "bleu": 0.0, "toxicity": 0.0,
                "rqs": round(f * 0.3 + r * 0.3 + ss * 0.4, 4),
                "latency_ms": 0.0, "total_tokens": 0,
            }

    summaries = {
        "Bot_A": {"avg_rqs": 0.912, "gt_alignment": 0.95, "avg_faithfulness": 0.94, "avg_relevancy": 0.91, "avg_context_precision": 0.88, "retrieval_success": 0.96},
        "Bot_B": {"avg_rqs": 0.856, "gt_alignment": 0.88, "avg_faithfulness": 0.87, "avg_relevancy": 0.89, "avg_context_precision": 0.82, "retrieval_success": 0.90},
        "Bot_C": {"avg_rqs": 0.421, "gt_alignment": 0.35, "avg_faithfulness": 0.32, "avg_relevancy": 0.45, "avg_context_precision": 0.28, "retrieval_success": 0.40},
    }
    leaderboard = [
        {"id": "Bot_A", "rank": 1, "avg_rqs": 0.912},
        {"id": "Bot_B", "rank": 2, "avg_rqs": 0.856},
        {"id": "Bot_C", "rank": 3, "avg_rqs": 0.421},
    ]

    return eval_id, test_cases, bot_metrics, summaries, leaderboard


def main():
    eval_id, test_cases, bot_metrics, summaries, leaderboard = build_demo()
    db = SessionLocal()
    try:
        record = EvaluationRecord(
            id=eval_id,
            name="Demo Evaluation — 15 Questions",
            timestamp=datetime.utcnow(),
            test_cases=test_cases,
            bot_metrics=bot_metrics,
            summaries=summaries,
            leaderboard=leaderboard,
            winner="Bot_A",
        )
        db.add(record)
        db.commit()
        print(f"Inserted demo evaluation: id={eval_id}, test_cases={len(test_cases)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
