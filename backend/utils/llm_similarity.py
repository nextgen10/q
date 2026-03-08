"""
LLM-based similarity scoring — replaces sentence-transformers embeddings.
Uses OpenAI / Azure OpenAI to score semantic and fuzzy similarity between texts.
Prompts are loaded from the SQLite prompts table (managed via the Prompts API).
Returns a float 0.0–1.0.
"""
import math
import os
import json
import logging
from typing import Optional

from agent_database import get_prompt


def _safe_score(val: float) -> float:
    """Clamp to [0.0, 1.0] and replace NaN/Inf with 0.0."""
    if not math.isfinite(val):
        return 0.0
    return max(0.0, min(1.0, val))


async def _get_llm_client():
    """Returns (client, model_name) using Azure or standard OpenAI."""
    az_key = os.getenv("AZURE_OPENAI_API_KEY")
    az_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    az_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    az_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
    openai_key = os.getenv("OPENAI_API_KEY")

    if az_key and az_endpoint and az_deployment:
        from openai import AsyncAzureOpenAI
        client = AsyncAzureOpenAI(
            api_key=az_key,
            api_version=az_version,
            azure_endpoint=az_endpoint,
        )
        return client, az_deployment

    if openai_key:
        from openai import AsyncOpenAI
        return AsyncOpenAI(api_key=openai_key), "gpt-4o"

    return None, None


def _load_prompt(prompt_key: str) -> dict:
    """Load prompt config from DB, returns dict with system_message and user_message_template."""
    row = get_prompt(prompt_key)
    if row:
        return row
    return {}


async def llm_semantic_similarity(text_a: str, text_b: str) -> float:
    """
    Ask the LLM to score how semantically similar two texts are (0.0–1.0).
    Prompt is loaded from the 'semantic' entry in the prompts table.
    """
    client, model = await _get_llm_client()
    if client is None:
        return 0.0

    cfg = _load_prompt("semantic")
    system_msg = cfg.get("system_message", "You score text similarity. Respond ONLY with JSON.")
    template = cfg.get("user_message_template", 'Score the semantic similarity between Text A and Text B.\nReturn ONLY a JSON object: {{"score": <float 0.0 to 1.0>}}\n\nText A: """{text_a}"""\nText B: """{text_b}"""')
    temperature = cfg.get("temperature", 0.0)
    max_tokens = cfg.get("max_tokens", 50)

    prompt = template.replace("{text_a}", text_a[:2000]).replace("{text_b}", text_b[:2000])

    try:
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if not resp.choices:
            return 0.0
        content = (resp.choices[0].message.content or "").strip()
        data = json.loads(content)
        return _safe_score(float(data.get("score", 0.0)))
    except Exception as e:
        logging.getLogger(__name__).warning("[llm_semantic_similarity] Error: %s", e)
        return 0.0


async def llm_fuzzy_similarity(text_a: str, text_b: str) -> float:
    """
    Ask the LLM to score how similar two short texts are (0.0–1.0).
    Prompt is loaded from the 'fuzzy' entry in the prompts table.
    """
    client, model = await _get_llm_client()
    if client is None:
        return 0.0

    cfg = _load_prompt("fuzzy")
    system_msg = cfg.get("system_message", "You score text similarity. Respond ONLY with JSON.")
    template = cfg.get("user_message_template", 'Score how similar these two short texts are.\nReturn ONLY a JSON object: {{"score": <float 0.0 to 1.0>}}\n\nText A: """{text_a}"""\nText B: """{text_b}"""')
    temperature = cfg.get("temperature", 0.0)
    max_tokens = cfg.get("max_tokens", 50)

    prompt = template.replace("{text_a}", text_a[:500]).replace("{text_b}", text_b[:500])

    try:
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if not resp.choices:
            return 0.0
        content = (resp.choices[0].message.content or "").strip()
        data = json.loads(content)
        return _safe_score(float(data.get("score", 0.0)))
    except Exception as e:
        logging.getLogger(__name__).warning("[llm_fuzzy_similarity] Error: %s", e)
        return 0.0


async def llm_consistency_score(texts: list[str]) -> float:
    """
    Ask the LLM to score the consistency across multiple outputs (0.0–1.0).
    Prompt is loaded from the 'consistency' entry in the prompts table.
    """
    if len(texts) <= 1:
        return 1.0

    client, model = await _get_llm_client()
    if client is None:
        return 0.0

    cfg = _load_prompt("consistency")
    system_msg = cfg.get("system_message", "You evaluate output consistency. Respond ONLY with JSON.")
    template = cfg.get("user_message_template", 'Score the consistency across these AI outputs.\nReturn ONLY a JSON object: {{"score": <float 0.0 to 1.0>}}\n\n{numbered_outputs}')
    temperature = cfg.get("temperature", 0.0)
    max_tokens = cfg.get("max_tokens", 50)

    numbered = "\n".join(f"Output {i+1}: \"\"\"{t[:800]}\"\"\"" for i, t in enumerate(texts[:10]))
    prompt = template.replace("{numbered_outputs}", numbered)

    try:
        resp = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        if not resp.choices:
            return 0.0
        content = (resp.choices[0].message.content or "").strip()
        data = json.loads(content)
        return _safe_score(float(data.get("score", 0.0)))
    except Exception as e:
        logging.getLogger(__name__).warning("[llm_consistency_score] Error: %s", e)
        return 0.0
