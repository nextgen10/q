"""
Adds a single test case with very long Query and Ground Truth to the latest demo evaluation.
Run once:  python3 seed_long_text.py
Delete after use.
"""

import random, json
from nexus_database import SessionLocal, EvaluationRecord

LONG_QUERY = (
    "Provide a comprehensive and detailed explanation of the historical evolution of the European banking regulatory framework, "
    "starting from the original Basel I accord introduced in 1988 by the Basel Committee on Banking Supervision, through the "
    "subsequent revisions in Basel II which introduced the three-pillar structure encompassing minimum capital requirements, "
    "supervisory review processes, and market discipline, and continuing through to the Basel III reforms that were developed "
    "in direct response to the 2007-2008 global financial crisis. In your explanation, please address the specific capital "
    "adequacy ratios that were mandated under each iteration, the introduction of the leverage ratio and liquidity coverage "
    "ratio under Basel III, the role of the European Central Bank and the Single Supervisory Mechanism in enforcing these "
    "standards across Eurozone member states, the impact of the Capital Requirements Directive IV and Capital Requirements "
    "Regulation on European financial institutions, the challenges faced by smaller regional banks in meeting these increasingly "
    "stringent requirements, and the ongoing debates surrounding the finalization of Basel III.1 reforms, sometimes referred "
    "to as Basel IV, including the revised standardized approaches for credit risk, the output floor constraints, and the "
    "implications for risk-weighted asset calculations across different asset classes. Additionally, discuss how these "
    "regulatory changes have influenced the competitive landscape of European banking, the consolidation trends observed "
    "among mid-tier institutions, and the broader macroeconomic implications of tighter capital requirements on lending "
    "capacity, economic growth, and financial stability within the European Union and beyond."
)

LONG_GROUND_TRUTH = (
    "The European banking regulatory framework has undergone significant transformation over the past three decades. "
    "Basel I, introduced in 1988, established the first international standard for bank capital adequacy, requiring banks "
    "to maintain a minimum capital-to-risk-weighted-assets ratio of 8%. While groundbreaking, Basel I was criticized for "
    "its simplistic risk categorization. Basel II, finalized in 2004, addressed these limitations through a three-pillar "
    "approach: Pillar 1 refined minimum capital requirements with more granular risk weightings using either standardized "
    "or internal ratings-based approaches; Pillar 2 introduced supervisory review processes requiring banks to assess their "
    "own capital adequacy; and Pillar 3 mandated market discipline through enhanced disclosure requirements. However, the "
    "2007-2008 global financial crisis exposed critical weaknesses in the Basel II framework, particularly regarding "
    "insufficient capital quality, excessive leverage, and inadequate liquidity buffers. In response, the Basel Committee "
    "developed Basel III, which was phased in starting from 2013. Key reforms included raising the Common Equity Tier 1 "
    "capital ratio to 4.5%, introducing a capital conservation buffer of 2.5%, establishing a countercyclical buffer of "
    "up to 2.5%, and creating additional surcharges for globally systemically important banks. Basel III also introduced "
    "the Leverage Ratio at a minimum of 3% to constrain excessive balance sheet growth, the Liquidity Coverage Ratio "
    "requiring banks to hold sufficient high-quality liquid assets to cover 30-day net cash outflows, and the Net Stable "
    "Funding Ratio to promote longer-term funding stability. In Europe, these standards were transposed through the "
    "Capital Requirements Directive IV and the Capital Requirements Regulation, creating a single rulebook for all EU "
    "financial institutions. The European Central Bank, through the Single Supervisory Mechanism established in 2014, "
    "assumed direct supervision of significant Eurozone banks, ensuring consistent application of prudential standards. "
    "Smaller regional banks have faced disproportionate compliance costs, contributing to consolidation trends across "
    "the sector. The finalization of Basel III.1, often called Basel IV, introduces revised standardized approaches for "
    "credit risk measurement, an output floor limiting the benefits of internal models to no less than 72.5% of "
    "standardized approach calculations, and revised operational risk frameworks. These changes have significant "
    "implications for risk-weighted asset calculations, potentially increasing capital requirements for banks heavily "
    "reliant on internal models. The broader macroeconomic impact includes potential constraints on lending capacity, "
    "though proponents argue that stronger capitalization enhances long-term financial stability and reduces the "
    "likelihood and severity of future financial crises. The competitive landscape has shifted, with larger banks "
    "better positioned to absorb compliance costs while smaller institutions explore mergers, digital transformation, "
    "and niche strategies to maintain viability in an increasingly regulated environment."
)

LONG_CTX = {
    "Bot_A": [
        "Basel I (1988) set the first international capital standard at 8% of risk-weighted assets.",
        "Basel II (2004) introduced three pillars: minimum capital, supervisory review, and market discipline.",
        "Basel III responded to the 2008 crisis with higher CET1 ratios, leverage ratio, LCR, and NSFR.",
        "CRD IV and CRR transposed Basel III into EU law, creating a single rulebook.",
        "The ECB's SSM directly supervises significant Eurozone banks since 2014.",
    ],
    "Bot_B": [
        "The Basel Committee on Banking Supervision has iteratively strengthened global banking standards.",
        "Basel III.1 (Basel IV) introduces output floors and revised standardized approaches.",
        "European banking consolidation has accelerated due to regulatory compliance costs.",
    ],
    "Bot_C": [
        "Banks are regulated by governments.",
        "Capital requirements mean banks need to hold money.",
    ],
}

LONG_RESP = {
    "Bot_A": (
        "The European banking regulatory framework evolved from Basel I's simple 8% capital ratio through "
        "Basel II's three-pillar structure to Basel III's comprehensive reforms including higher CET1 requirements "
        "of 4.5%, capital conservation buffers of 2.5%, the Leverage Ratio at 3% minimum, and the LCR and NSFR "
        "liquidity standards. CRD IV/CRR transposed these into EU law, while the ECB's SSM ensures consistent "
        "supervision. Basel III.1 introduces output floors at 72.5% and revised standardized approaches."
    ),
    "Bot_B": (
        "Banking regulations in Europe started with Basel I and progressed to Basel III after the financial crisis. "
        "Basel III increased capital requirements and introduced new liquidity standards. The EU implemented these "
        "through CRD IV and CRR. Smaller banks face higher compliance costs, leading to consolidation."
    ),
    "Bot_C": (
        "European banks have rules from Basel. Basel III made them hold more capital after the 2008 crisis. "
        "The ECB watches big banks."
    ),
}


def main():
    random.seed(99)
    mk = lambda base: round(min(1.0, max(0.0, base + (random.random() - 0.5) * 0.1)), 4)

    db = SessionLocal()
    try:
        record = db.query(EvaluationRecord).order_by(EvaluationRecord.timestamp.desc()).first()
        if not record:
            print("No evaluation found in DB.")
            return

        test_cases = list(record.test_cases)
        bot_metrics = dict(record.bot_metrics)

        tc_id = f"tc-{str(len(test_cases) + 1).zfill(3)}"
        test_cases.append({
            "id": tc_id,
            "query": LONG_QUERY,
            "ground_truth": LONG_GROUND_TRUTH,
            "bot_responses": LONG_RESP,
            "bot_contexts": LONG_CTX,
            "metadata": {},
        })

        bases = {"Bot_A": 0.92, "Bot_B": 0.85, "Bot_C": 0.38}
        for bot in ["Bot_A", "Bot_B", "Bot_C"]:
            b = bases[bot]
            f = mk(b); r = mk(b); cp = mk(b - 0.03); cr = mk(b - 0.05); ss = mk(b + 0.02)
            if bot not in bot_metrics:
                bot_metrics[bot] = {}
            bot_metrics[bot][tc_id] = {
                "faithfulness": f, "answer_relevancy": r,
                "context_precision": cp, "context_recall": cr,
                "semantic_similarity": ss,
                "bert_f1": 0.0, "rouge_l": 0.0, "bleu": 0.0, "toxicity": 0.0,
                "rqs": round(f * 0.3 + r * 0.3 + ss * 0.4, 4),
                "latency_ms": 0.0, "total_tokens": 0,
            }

        record.test_cases = test_cases
        record.bot_metrics = bot_metrics
        db.commit()

        print(f"Added long-text test case {tc_id} to evaluation {record.id}. Total test cases: {len(test_cases)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
