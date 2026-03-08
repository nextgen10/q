from typing import Dict, Any, List
import json

from agent_models_json import JsonEvalResult, JsonBatchEvalResponse, FieldScore, JsonEvalConfig
from utils.matching_strategies import is_null, resolve_strategy, calculate_similarity
from utils.toxicity_checker import check_toxicity, ToxicityResult


class JsonEvaluatorAgent:
    def __init__(self, **kwargs):
        pass

    async def evaluate_single(self, gt: Dict[str, Any], aio: Dict[str, Any], config: JsonEvalConfig) -> JsonEvalResult:
        """
        4-phase evaluation: Classification → Completeness → Hallucination → Accuracy
        IGNORE fields are excluded from ALL metrics.
        """
        gt_keys = set(gt.keys())
        aio_keys = set(aio.keys())
        all_keys = gt_keys | aio_keys

        # Collect explicitly-ignored fields upfront so they are invisible to every phase
        ignored_keys: List[str] = [
            k for k in sorted(all_keys)
            if str(config.field_strategies.get(k, "")).upper() == "IGNORE"
        ]
        ignored_set = set(ignored_keys)

        # --- Phase 0: Classification (skip IGNORE keys entirely) ---
        gt_non_null_keys: List[str] = []
        aio_missing_or_null_keys: List[str] = []
        extra_keys: List[str] = []
        gt_null_aio_has_value_keys: List[str] = []
        both_non_null_keys: List[str] = []

        for key in sorted(all_keys):
            if key in ignored_set:
                continue

            gt_val = gt.get(key)
            aio_val = aio.get(key)
            in_gt = key in gt_keys
            in_aio = key in aio_keys

            if not in_gt and in_aio:
                extra_keys.append(key)
                continue

            if in_gt and is_null(gt_val):
                if in_aio and not is_null(aio_val):
                    gt_null_aio_has_value_keys.append(key)
                continue

            # GT value is non-null from here
            gt_non_null_keys.append(key)

            if not in_aio or is_null(aio_val):
                aio_missing_or_null_keys.append(key)
            else:
                both_non_null_keys.append(key)

        matching_keys = sorted(gt_keys & aio_keys)
        missing_from_aio = sorted((gt_keys - aio_keys) - ignored_set)

        # --- Phase 1: Completeness (IGNORE keys excluded from denominator & numerator) ---
        gt_non_null_count = len(gt_non_null_keys)
        aio_matched_non_null_count = len(both_non_null_keys)

        if gt_non_null_count == 0:
            completeness_score = 1.0
        else:
            completeness_score = aio_matched_non_null_count / gt_non_null_count

        # --- Phase 2: Hallucination (IGNORE keys excluded from total distinct) ---
        active_keys = all_keys - ignored_set
        total_distinct = len(active_keys)
        hallucination_count = len(extra_keys) + len(gt_null_aio_has_value_keys)

        if total_distinct == 0:
            hallucination_score = 0.0
        else:
            hallucination_score = hallucination_count / total_distinct

        # --- Phase 3: Accuracy (only both_non_null, IGNORE already filtered out) ---
        field_scores: List[FieldScore] = []
        total_acc_score = 0.0
        scorable_count = 0

        for key in both_non_null_keys:
            gt_val = gt[key]
            aio_val = aio[key]

            strategy = resolve_strategy(key, gt_val, config)

            score, sim, strat_name = await calculate_similarity(gt_val, aio_val, strategy, config)

            field_scores.append(FieldScore(
                field_name=key,
                field_type=strategy.lower(),
                gt_value=gt_val,
                aio_value=aio_val,
                match_strategy=strat_name,
                score=score,
                similarity=sim
            ))
            total_acc_score += score
            scorable_count += 1

        if scorable_count == 0:
            accuracy_score = 1.0
        else:
            accuracy_score = total_acc_score / scorable_count

        # --- Safety Check (Optional) ---
        safety_res = ToxicityResult(toxicity_score=0.0, safety_score=1.0, tone="neutral", issues=[])
        if config.enable_safety and config.llm_api_key:
            text_to_check = json.dumps(aio)
            safety_res = await check_toxicity(text_to_check, config.llm_model, config.llm_api_key)

        # --- RQS Calculation ---
        rqs = (config.w_accuracy * accuracy_score) + \
              (config.w_completeness * completeness_score) + \
              (config.w_safety * safety_res.safety_score) - \
              (config.w_hallucination * hallucination_score)

        return JsonEvalResult(
            completeness=completeness_score,
            hallucination=hallucination_score,
            accuracy=accuracy_score,
            safety_score=safety_res.safety_score,
            toxicity=1.0 - safety_res.safety_score,
            tone=safety_res.tone,
            rqs=max(min(rqs, 1.0), 0.0),
            field_scores=field_scores,
            gt_keys=sorted(gt_keys),
            aio_keys=sorted(aio_keys),
            matching_keys=matching_keys,
            extra_keys=extra_keys,
            missing_keys=missing_from_aio,
            gt_null_aio_has_value=gt_null_aio_has_value_keys,
            aio_missing_or_null=aio_missing_or_null_keys,
            both_non_null=both_non_null_keys,
            ignored_keys=ignored_keys,
        )

    async def evaluate_batch(self, gt: Dict[str, Any], aio_list: List[Dict[str, Any]], config: JsonEvalConfig) -> JsonBatchEvalResponse:
        """
        Evaluates a batch of AI Outputs against a single Ground Truth.
        """
        results = []
        consistency_input_texts = []

        for aio in aio_list:
            res = await self.evaluate_single(gt, aio, config)
            results.append(res)
            consistency_input_texts.append(json.dumps(aio))

        from agents.consistency_agent import ConsistencyAgent
        consistency_agent = ConsistencyAgent()
        consistency_output = await consistency_agent.run({"outputs": consistency_input_texts})
        consistency_score = consistency_output.get("score", 0.0)

        rqs_scores = [r.rqs for r in results]
        mean_rqs = sum(rqs_scores) / len(rqs_scores) if rqs_scores else 0.0

        import numpy as np
        variance = np.var(rqs_scores) if rqs_scores else 0.0
        std_dev = np.std(rqs_scores) if rqs_scores else 0.0

        best_idx = int(np.argmax(rqs_scores)) if rqs_scores else -1
        ranking = list(np.argsort(rqs_scores)[::-1])

        return JsonBatchEvalResponse(
            results=results,
            best_response_idx=best_idx,
            best_rqs=max(rqs_scores) if rqs_scores else 0.0,
            mean_rqs=mean_rqs,
            variance=float(variance),
            std_dev=float(std_dev),
            ranking=[int(x) for x in ranking],
            consistency_score=consistency_score
        )
