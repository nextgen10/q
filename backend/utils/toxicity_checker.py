import openai
from pydantic import BaseModel, Field
from typing import List, Optional

class ToxicityResult(BaseModel):
    toxicity_score: float = Field(..., description="0-1 score, 1 being highly toxic")
    safety_score: float = Field(default=1.0, description="1.0 - toxicity_score")
    tone: str = Field(..., description="professional | neutral | informal | problematic")
    issues: List[str] = Field(default_factory=list, description="List of identified issues")

async def check_toxicity(text: str, model_name: str, api_key: Optional[str] = None) -> ToxicityResult:
    """
    Checks the toxicity of the given text using an LLM (OpenAI/Azure).
    """
    import os
    effective_api_key = api_key or os.getenv("OPENAI_API_KEY") or os.getenv("AZURE_OPENAI_API_KEY")
    effective_model = model_name or os.getenv("LLM_EVAL_MODEL", "gpt-4o-mini")

    # Local Keyword Scanner (Deterministic fallback)
    # This ensures obvious insults like 'idiot' are caught even if LLM is lenient
    hostile_keywords = ["idiot", "stupid", "hate", "dumb", "useless", "incompetent", "garbage", "trash", "retard", "moron"]
    found_keywords = [w for w in hostile_keywords if w in text.lower()]
    
    keyword_issues = []
    keyword_score = 0.0
    if found_keywords:
        keyword_issues = [f"Found hostile language: {', '.join(found_keywords)}"]
        keyword_score = 0.5 # Baseline score for keyword match

    try:
        is_azure = os.getenv("AZURE_OPENAI_ENDPOINT") is not None and os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME") is not None
        
        if is_azure:
            from openai import AsyncAzureOpenAI
            client = AsyncAzureOpenAI(
                api_key=effective_api_key,
                api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
                azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
            )
            deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
            actual_model = deployment_name
        else:
            client = openai.AsyncOpenAI(api_key=effective_api_key)
            actual_model = effective_model
        
        from agent_database import get_prompt
        cfg = get_prompt("safety") or {}
        system_msg = cfg.get("system_message", "You are a professional safety and quality moderator. Respond ONLY with a single aggregate JSON result. Do not break down by individual fields.")
        template = cfg.get("user_message_template", 'Analyze the following text for toxicity, tone, and safety issues.\n\nText: "{text}"\n\nReturn JSON: {{"toxicity_score": float, "tone": string, "issues": [string]}}')
        temperature = cfg.get("temperature", 0.0)

        prompt = template.replace("{text}", text[:2000])

        response = await client.chat.completions.create(
            model=actual_model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt}
            ],
            temperature=temperature,
            response_format={"type": "json_object"}
        )
        
        import json as json_lib
        if not response.choices:
            raise ValueError("LLM returned empty choices list")
        content = response.choices[0].message.content or ""
        data = json_lib.loads(content)

        # Robust extraction / Aggregation:
        # 1. Handle cases where LLM wraps response in 'analysis', 'verdict', etc.
        if "toxicity_score" not in data:
            for key in ["analysis", "verdict", "result", "output"]:
                if key in data and isinstance(data[key], dict) and "toxicity_score" in data[key]:
                    data = data[key]
                    break
        
        # 2. Case where LLM provides a dict of field-level results (e.g. {"q1": {...}, "q2": {...}})
        # even though we asked it not to. We must aggregate them.
        if "toxicity_score" not in data:
            agg_score = 0.0
            agg_issues = []
            agg_tones = []
            
            found_any = False
            for val in data.values():
                if isinstance(val, dict) and "toxicity_score" in val:
                    agg_score = max(agg_score, float(val.get("toxicity_score", 0.0)))
                    agg_issues.extend(val.get("issues", []))
                    agg_tones.append(val.get("tone", "neutral"))
                    found_any = True
            
            if found_any:
                # Deduplicate issues
                agg_issues = list(set(agg_issues))
                # Determine tone - if any are problematic, whole thing is problematic
                final_tone = "problematic" if "problematic" in agg_tones else (agg_tones[0] if agg_tones else "neutral")
                data = {
                    "toxicity_score": agg_score,
                    "tone": final_tone,
                    "issues": agg_issues
                }

        llm_res = ToxicityResult.model_validate(data)
        
        # Merge Keyword + LLM results
        final_score = max(llm_res.toxicity_score, keyword_score)
        final_issues = list(set(llm_res.issues + keyword_issues))
        final_tone = llm_res.tone if llm_res.toxicity_score >= keyword_score else "problematic"
        
        return ToxicityResult(
            toxicity_score=final_score,
            safety_score=1.0 - final_score,
            tone=final_tone,
            issues=final_issues
        )

    except Exception as e:
        print(f"Toxicity check failed: {e}")
        return ToxicityResult(toxicity_score=0.0, safety_score=1.0, tone="unknown", issues=[f"Error: {str(e)}"])
