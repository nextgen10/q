import os
from . import (
    enhanced_rag_helper,
    image_helper,
    figma_integration,
    enhanced_pdf_helper,
    optimized_prompt_engineering,
    prompt_engineering,
    requirement_analyzer
)

from .enhanced_rag_helper import rag_helper
from .requirement_analyzer import RequirementAnalyzer
from .image_helper import get_text_from_image, get_detailed_image_analysis
from .enhanced_pdf_helper import get_text_from_pdf

def build_enhanced_story_context(story: str) -> dict:
    """Build a comprehensive context for the user story"""
    import hashlib
    
    # Analyze requirements
    requirements = RequirementAnalyzer.extract_testable_requirements(story)
    
    # Generate story hash for tracking
    story_hash = hashlib.md5(story.encode()).hexdigest()
    
    # Extract domain
    domain = rag_helper._extract_domain(story)
    
    return {
        "story_hash": story_hash,
        "requirements": requirements,
        "domain": domain,
        "timestamp": "now"
    }

def call_azure_openai(prompt: str) -> dict:
    """Helper to call Azure OpenAI with environment variables"""
    import requests
    import json
    
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
    
    if not api_key or not endpoint or not deployment:
        raise Exception("Azure OpenAI environment variables not configured")
        
    url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
    
    headers = {
        "Content-Type": "application/json",
        "api-key": api_key
    }
    
    data = {
        "messages": [
            {"role": "system", "content": "You are a senior QA engineer specialized in test design."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 4096
    }
    
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()
    return response.json()

def compress_prompt_for_payload_limit(prompt: str, max_chars: int = 7000) -> str:
    """Compress prompt if it exceeds the character limit"""
    if len(prompt) <= max_chars:
        return prompt
    return prompt[:max_chars] + "\n\n[TRUNCATED]"

def parse_testcases_from_text(text: str) -> list:
    """Parse structured test cases from LLM markdown response"""
    import re
    
    test_cases = []
    # Split by TC_REQ_ or standard ID patterns
    sections = re.split(r'\*\*Test Case ID:\*\*', text)
    
    for section in sections[1:]:
        tc = {}
        # Simple extraction logic
        id_match = re.search(r'^\s*(TC_REQ_\d+)', section)
        title_match = re.search(r'\*\*Title:\*\*\s*(.+)', section)
        priority_match = re.search(r'\*\*Priority:\*\*\s*(\w+)', section)
        steps_match = re.search(r'\*\*Test Steps:\*\*\s*(.+?)(?=\*\*|$)', section, re.DOTALL)
        expected_match = re.search(r'\*\*Expected Result:\*\*\s*(.+?)(?=\*\*|$)', section, re.DOTALL)
        mapping_match = re.search(r'\*\*Requirement Mapping:\*\*\s*(.+)', section)
        
        if id_match: tc['id'] = id_match.group(1).strip()
        if title_match: tc['title'] = title_match.group(1).strip()
        if priority_match: tc['priority'] = priority_match.group(1).strip()
        if steps_match: tc['steps'] = steps_match.group(1).strip()
        if expected_match: tc['expected'] = expected_match.group(1).strip()
        if mapping_match: tc['requirement_mapping'] = mapping_match.group(1).strip()
        
        if tc: test_cases.append(tc)
        
    return test_cases

def validate_and_filter_test_cases(test_cases: list, story: str) -> list:
    """Validate each test case against the story requirements"""
    # Simple validation for now
    return test_cases
