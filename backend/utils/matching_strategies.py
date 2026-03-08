import json
from utils.llm_similarity import llm_fuzzy_similarity, llm_semantic_similarity
from utils.field_detector import detect_type


def is_null(value) -> bool:
    """A value is null if it is None, empty string, or whitespace-only."""
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    return False


def resolve_strategy(field_name: str, gt_value, config) -> str:
    """
    Determine the matching strategy for a field.
    Priority: explicit field_strategies config > auto-detect from value type.
    Returns one of: 'EXACT', 'FUZZY', 'SEMANTIC', 'IGNORE'
    """
    raw = config.field_strategies.get(field_name, "")
    explicit = str(raw).upper() if isinstance(raw, str) else ""
    if explicit in ("EXACT", "FUZZY", "SEMANTIC", "IGNORE"):
        return explicit

    field_type = detect_type(gt_value)
    if field_type in ('numeric', 'boolean', 'date', 'email'):
        return 'EXACT'
    if field_type in ('array', 'object'):
        return 'EXACT'
    if field_type == 'text':
        return 'SEMANTIC'
    return 'EXACT'


async def calculate_similarity(gt_value, aio_value, strategy: str, config):
    """
    Calculates similarity score using the given strategy.
    Returns: (score (0.0 or 1.0), similarity (0.0-1.0), strategy_name)
    """
    strategy = strategy.upper()

    if strategy == 'IGNORE':
        return 1.0, 1.0, 'ignore'

    if strategy == 'EXACT':
        try:
            gt_str = json.dumps(gt_value, sort_keys=True, allow_nan=False) if isinstance(gt_value, (dict, list)) else str(gt_value).strip().lower()
            aio_str = json.dumps(aio_value, sort_keys=True, allow_nan=False) if isinstance(aio_value, (dict, list)) else str(aio_value).strip().lower()
        except (ValueError, TypeError):
            return 0.0, 0.0, 'exact'
        is_match = (gt_str == aio_str)
        return (1.0 if is_match else 0.0), (1.0 if is_match else 0.0), 'exact'

    if strategy == 'FUZZY':
        similarity = await llm_fuzzy_similarity(str(gt_value), str(aio_value))
        if similarity >= config.fuzzy_threshold:
            return 1.0, similarity, 'fuzzy'
        else:
            return 0.0, similarity, 'fuzzy'

    if strategy == 'SEMANTIC':
        similarity = await llm_semantic_similarity(str(gt_value), str(aio_value))
        if similarity >= config.semantic_threshold:
            return 1.0, similarity, 'semantic'
        else:
            return 0.0, similarity, 'semantic'

    return 0.0, 0.0, 'unknown'
