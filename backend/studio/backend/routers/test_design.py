from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from typing import List, Optional, Dict, Any
import os
import re
import tempfile
import requests
from datetime import datetime
import json
import shutil
from pathlib import Path
import traceback
from studio.backend.services.test_design import (
    enhanced_rag_helper,
    image_helper,
    figma_integration as figma_mod,
    enhanced_pdf_helper,
    optimized_prompt_engineering,
    prompt_engineering,
    requirement_analyzer
)

router = APIRouter(prefix="/api/v1/test-design", tags=["test-design"])

# Configuration
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
USE_OPTIMIZED_PROMPTS = os.getenv("USE_OPTIMIZED_PROMPTS", "true").lower() == "true"

# Initialize systems
rag_helper = enhanced_rag_helper.rag_helper
get_text_from_image = image_helper.get_text_from_image
get_text_from_pdf = enhanced_pdf_helper.get_text_from_pdf
get_detailed_pdf_content = enhanced_pdf_helper.get_detailed_pdf_content

figma_token = os.getenv('FIGMA_ACCESS_TOKEN')
figma_integration = figma_mod.FigmaIntegration(figma_token) if figma_token else None

def build_enhanced_story_context(user_story: str) -> dict:
    return {
        'story_hash': hash(user_story) % 10000,
        'timestamp': datetime.now().isoformat(),
        'word_count': len(user_story.split())
    }

def compress_prompt_for_payload_limit(prompt: str, max_chars: int = 8000) -> str:
    """
    Compress prompt to fit within API payload limits by keeping headers/footers
    """
    if len(prompt) <= max_chars:
        return prompt
    
    print(f"⚠️ Prompt too long ({len(prompt)} chars), compressing to {max_chars} chars")
    
    # Strategy: Keep the most important parts
    lines = prompt.split('\n')
    
    header_lines = []
    content_lines = []
    footer_lines = []
    
    in_header = True
    in_footer = False
    
    for line in lines:
        if in_header and ('User Story:' in line or 'SCOPE CONSTRAINTS:' in line or 'USER STORY TO ANALYZE:' in line):
            in_header = False
        elif 'Generate' in line and 'test case' in line.lower() or 'OUTPUT FORMAT' in line:
            in_footer = True
        
        if in_header:
            header_lines.append(line)
        elif in_footer:
            footer_lines.append(line)
        else:
            content_lines.append(line)
    
    # Reconstruct with compression
    compressed_prompt = '\n'.join(header_lines)
    
    # Add compressed content
    remaining_chars = max_chars - len(compressed_prompt) - len('\n'.join(footer_lines)) - 100
    
    if remaining_chars > 500:
        content_text = '\n'.join(content_lines)
        if len(content_text) > remaining_chars:
            content_text = content_text[:remaining_chars - 50] + '\n...[Content truncated for size limits]'
        compressed_prompt += '\n' + content_text
    
    compressed_prompt += '\n' + '\n'.join(footer_lines)
    
    print(f"✅ Compressed prompt from {len(prompt)} to {len(compressed_prompt)} chars")
    return compressed_prompt

def call_azure_openai(prompt: str):
    # Fetch at runtime to ensure dotenv changes are picked up
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
    
    if not endpoint or not deployment or not api_key:
        raise ValueError(f"Azure OpenAI configuration is missing: endpoint={'ok' if endpoint else 'MISSING'}, deployment={'ok' if deployment else 'MISSING'}, key={'ok' if api_key else 'MISSING'}")
        
    base_url = endpoint.rstrip('/')
    url = f"{base_url}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"
    
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json"
    }
    
    body = {
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 4096,
        "top_p": 0.95,
        "frequency_penalty": 0,
        "presence_penalty": 0
    }
    
    try:
        r = requests.post(url, headers=headers, json=body, timeout=60)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.HTTPError as e:
        if hasattr(e, 'response') and e.response is not None and e.response.status_code == 413:
            print(f"❌ Payload too large error (413). Prompt size: {len(prompt)} chars")
            # Try with a more aggressive compression
            compressed_prompt = compress_prompt_for_payload_limit(prompt, max_chars=4000)
            print(f"🔄 Retrying with more compressed prompt: {len(compressed_prompt)} chars")
            
            body["messages"][0]["content"] = compressed_prompt
            retry_response = requests.post(url, headers=headers, json=body, timeout=60)
            retry_response.raise_for_status()
            return retry_response.json()
        raise e

def parse_testcases_from_text(content: str):
    """
    Enhanced parser for test cases with support for multiple formats and markers
    """
    def clean(text):
        return text.replace("**", "").strip()
    
    def clean_id(text):
        cleaned = text.replace("**", "").strip()
        cleaned = cleaned.lstrip('-').strip()
        return cleaned

    print(f"Parsing LLM content of length {len(content)}")
    
    # Pre-clean content: remove excessive bolding or standard LLM boilerplate
    content = content.replace("### ", "").replace("## ", "")
    
    test_cases = []
    # Even more inclusive markers: "Test Case", "Scenario", "TC_", "Case ID"
    markers = [m.start() for m in re.finditer(r'(?i)test case|scenario|tc_|case id', content)]
    
    if not markers:
        print(f"No TC markers found in content of length {len(content)}. Falling back to separator-based parsing.")
        blocks = content.split("\n\n")
    else:
        print(f"Found {len(markers)} markers starting at {markers[:5]}...")
        blocks = []
        for i in range(len(markers)):
            start = markers[i]
            # If markers are too close (e.g. within 20 chars), they might be the same one or headers
            # Only add if it's a real block
            end = markers[i+1] if i+1 < len(markers) else len(content)
            if end - start > 20: 
                blocks.append(content[start:end])

    print(f"Found {len(blocks)} potential blocks")

    for block in blocks:
        current_tc = {}
        
        # Regex based field extraction is more robust than line-by-line state machine
        id_match = re.search(r'(?i)(?:test case id|id):\s*(.*)', block)
        title_match = re.search(r'(?i)title:\s*(.*)', block)
        priority_match = re.search(r'(?i)priority:\s*(.*)', block)
        precond_match = re.search(r'(?i)preconditions?:\s*(.*?)(?=\s*(?:test steps|steps|expected|title|priority|mapping)|$)', block, re.DOTALL | re.IGNORECASE)
        steps_match = re.search(r'(?i)(?:test steps|steps):\s*(.*?)(?=\s*(?:expected|mapping|technique|priority)|$)', block, re.DOTALL | re.IGNORECASE)
        expected_match = re.search(r'(?i)(?:expected result|expected|expected outcome):\s*(.*?)(?=\s*(?:mapping|technique|priority|status|test data|test type|test|notes|comments|preconditions|steps)|$)', block, re.DOTALL | re.IGNORECASE)
        mapping_match = re.search(r'(?i)(?:requirement mapping|mapping):\s*(.*)', block)
        status_match = re.search(r'(?i)status:\s*(.*)', block)
        
        if id_match: current_tc['id'] = clean_id(id_match.group(1))
        if title_match: current_tc['title'] = clean(title_match.group(1))
        if priority_match: current_tc['priority'] = clean(priority_match.group(1))
        if precond_match: current_tc['preconditions'] = clean(precond_match.group(1))
        if steps_match: current_tc['steps'] = clean(steps_match.group(1))
        if expected_match: 
            val = clean(expected_match.group(1))
            # Remove trailing "Test" word if it got captured (common artifact if next section is "Test Data")
            if val.lower().endswith("test"):
                val = val[:-4].strip()
            current_tc['expected'] = val
        if mapping_match: current_tc['requirement_mapping'] = clean(mapping_match.group(1))
        if status_match: current_tc['status'] = clean(status_match.group(1))
        
        if current_tc.get('id') or current_tc.get('title'):
            test_cases.append(current_tc)

    print(f"Parsed {len(test_cases)} test cases")

    normalized = []
    for i, tc in enumerate(test_cases, start=1):
        tc_id = tc.get("id")
        if tc_id:
            tc_id = clean_id(tc_id)
        if not tc_id or tc_id == "":
            tc_id = f"TC_{i:03}"
        
        normalized.append({
            "id": tc_id,
            "title": tc.get("title", ""),
            "preconditions": tc.get("preconditions", ""),
            "steps": tc.get("steps", ""),
            "expected": tc.get("expected", ""),
            "priority": tc.get("priority", "Medium"),
            "requirement_mapping": tc.get("requirement_mapping", ""),
            "status": tc.get("status", "Pending")
        })

    return normalized

def validate_and_filter_test_cases(test_cases: List[Dict], user_story: str) -> List[Dict]:
    try:
        from studio.backend.services.test_design.optimized_prompt_engineering import OptimizedPromptEngineer as PromptEngineer
        story_requirements = PromptEngineer.extract_requirements_from_story(user_story)
        validated_cases = []
        for test_case in test_cases:
            validation_result = PromptEngineer.validate_test_case_scope(test_case, story_requirements)
            if validation_result['is_valid']:
                test_case['validation_score'] = validation_result['score']
                validated_cases.append(test_case)
        return validated_cases or test_cases
    except Exception:
        return test_cases

@router.post("/generate")
async def generate_test_cases(
    story: str = Form(""),
    figma_url: str = Form(""),
    attachments: List[UploadFile] = File(None)
):
    try:
        extracted_texts = []
        
        if attachments:
            for attachment in attachments:
                ext = attachment.filename.lower().rsplit('.', 1)[-1] if '.' in attachment.filename else ''
                with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
                    shutil.copyfileobj(attachment.file, tmp)
                    tmp_path = tmp.name

                try:
                    if ext in ['png', 'jpg', 'jpeg', 'bmp', 'tiff', 'webp']:
                        # Use enhanced image analysis
                        try:
                            from studio.backend.services.test_design.image_helper import get_detailed_image_analysis, create_image_test_context
                            image_analysis = get_detailed_image_analysis(tmp_path)
                            if image_analysis.get('analysis_quality', 0) > 0:
                                image_context = create_image_test_context(image_analysis, max_length=1000)
                                extracted_texts.append(image_context)
                                print(f"🖼️ Enhanced image analysis successful (Quality: {image_analysis.get('analysis_quality')})")
                            else:
                                text = get_text_from_image(tmp_path)
                                if text:
                                    extracted_texts.append(f"## IMAGE CONTENT\n\n{text}")
                        except Exception as e:
                            print(f"Image analysis error: {e}")
                            text = get_text_from_image(tmp_path)
                            if text:
                                extracted_texts.append(f"## IMAGE CONTENT\n\n{text}")
                                
                    elif ext == 'pdf':
                        text = get_text_from_pdf(tmp_path)
                        if text:
                            extracted_texts.append(f"## PDF CONTENT\n\n{text}")
                finally:
                    if os.path.exists(tmp_path):
                        os.remove(tmp_path)

        if figma_url and figma_integration:
            try:
                figma_context = figma_integration.get_enhanced_design_context_with_images(figma_url)
                if 'error' not in figma_context:
                    # Choose context compression based on current total length
                    current_length = len(story) + sum(len(t) for t in extracted_texts)
                    
                    if current_length > 5000:
                        figma_prompt_context = figma_integration.generate_figma_micro_context(figma_context)
                        print("📦 Using micro-compressed Figma context")
                    elif current_length > 2000:
                        figma_prompt_context = figma_integration.generate_figma_summary_context(figma_context)
                        print("📦 Using compressed Figma context")
                    else:
                        figma_prompt_context = figma_integration.generate_figma_enhanced_prompt_context(figma_context)
                        print("📦 Using standard Figma context")
                        
                    extracted_texts.append(figma_prompt_context)
            except Exception as e:
                print(f"Figma error: {e}")

        full_story = "\n\n".join(filter(None, [story.strip()] + extracted_texts)).strip()
        if not full_story:
            raise HTTPException(status_code=400, detail="Missing story or attachments")

        if len(full_story) > 6000:
            full_story = full_story[:6000] + "\n\n[Content truncated]"

        # Retrieval
        try:
            print(f"Retrieving similarities for story: {full_story[:100]}...")
            similar_test_cases = rag_helper.retrieve_similar_with_context(full_story, top_k=5)
        except Exception as e:
            print(f"RAG error: {e}")
            similar_test_cases = []

        story_context = build_enhanced_story_context(full_story)
        
        try:
            from studio.backend.services.test_design.optimized_prompt_engineering import OptimizedPromptEngineer
            prompt = OptimizedPromptEngineer.build_enhanced_prompt(
                full_story, similar_test_cases[:3], story_context
            )
        except Exception as e:
            print(f"Prompt generation error: {e}")
            prompt = f"Generate test cases for this user story:\n\n{full_story}"

        print(f"Generated prompt length: {len(prompt)}")
        prompt = compress_prompt_for_payload_limit(prompt, max_chars=7000)
        
        try:
            print("Calling Azure OpenAI...")
            resp_json = call_azure_openai(prompt)
            
            # Extract content safely
            llm_content = None
            if "choices" in resp_json and len(resp_json["choices"]) > 0:
                choice = resp_json["choices"][0]
                if isinstance(choice, dict) and "message" in choice and "content" in choice["message"]:
                    llm_content = choice["message"]["content"]
                elif "text" in choice:
                    llm_content = choice["text"]
            
            if not llm_content:
                llm_content = str(resp_json)
                
        except Exception as e:
            error_details = str(e)
            if hasattr(e, 'response') and e.response is not None:
                error_details += f" | Response: {e.response.text}"
            print(f"Azure OpenAI Error: {error_details}")
            raise HTTPException(status_code=500, detail=f"LLM request failed: {error_details}")

        test_cases = parse_testcases_from_text(llm_content)
        print(f"DEBUG: Parsed {len(test_cases)} test cases from LLM text")
        
        test_cases = validate_and_filter_test_cases(test_cases, full_story)
        print(f"DEBUG: Final count after validation/filtering: {len(test_cases)}")

        if not test_cases:
            print("ERROR: No test cases found after parsing and filtering. Returning dummy case.")
            test_cases = [{"id": "TC_ERR_001", "title": "Check Requirements", "expected": "The AI generated content could not be parsed into test cases. Please try again with more detailed user story.", "status": "Error"}]
        
        # 🧠 LEARNING: Add this interaction to the knowledge base
        try:
            rag_helper.add_generated_story_context(
                user_story=full_story,
                generated_testcases=test_cases,
                feedback_score=None
            )
            print(f"✅ Added story to learning database: {story_context.get('story_hash')}")
        except Exception as e:
            print(f"⚠️ Learning system update failed: {e}")

        # Save to SQLite as latest
        save_latest_test_cases(
            test_cases, 
            {
                "story_id": story_context.get('story_hash'),
                "generated_count": len(test_cases),
                "similar_examples_used": len(similar_test_cases)
            },
            full_story
        )

        return {
            "test_cases": test_cases,
            "metadata": {
                "story_id": story_context.get('story_hash'),
                "generated_count": len(test_cases),
                "similar_examples_used": len(similar_test_cases),
                "extracted_content": extracted_texts, # List of strings
                "full_prompt": prompt # The actual prompt sent to AI
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        tb = traceback.format_exc()
        print(f"Unhandled endpoint error: {tb}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}\n{tb}")

import sqlite3

# ... existing imports ...

@router.post("/feedback")
async def submit_feedback(data: Dict[str, Any]):
    try:
        # Handle field mapping from frontend
        quality_score = float(data.get('quality_score') if 'quality_score' in data else data.get('rating', 5))
        user_feedback = data.get('feedback') if 'feedback' in data else data.get('comments', '')
        
        # 1. Update RAG System (AI Learning)
        rag_helper.add_feedback(
            story_id=str(data.get('story_id')),
            testcase_quality_score=quality_score,
            user_feedback=user_feedback,
            improved_testcases=data.get('improved_testcases', []),
            feedback_categories=data.get('feedback_categories', []),
            missing_scenarios=data.get('missing_scenarios', [])
        )
        
        # 2. Publish to Feedback Board (SQLite)
        try:
            # Calculate DB path (same logic as in feedback.py)
            db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "feedback.db")
            
            # Prepare data
            rating = int(quality_score)
            feedback_text = user_feedback
            missing = data.get('missing_scenarios', [])
            categories = data.get('feedback_categories', [])
            
            # Construct a rich message
            message_parts = []
            if feedback_text:
                message_parts.append(feedback_text)
            
            if missing:
                message_parts.append("\n\n**Missing Scenarios:**")
                for item in missing:
                    message_parts.append(f"- {item}")
                    
            if categories:
                message_parts.append(f"\n\n**Categories:** {', '.join(categories)}")
                
            full_message = "\n".join(message_parts).strip()
            if not full_message:
                full_message = "No text feedback provided."
                
            title = "Test Design Feedback"
            category = "ai_generation"
            category_label = "AI Generation"
            timestamp = datetime.now().isoformat()
            
            # Connect and Insert
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Ensure table exists (just in case)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,
                    category_label TEXT NOT NULL,
                    rating INTEGER NOT NULL,
                    title TEXT,
                    message TEXT,
                    timestamp TEXT NOT NULL
                )
            """)
            
            cursor.execute("""
                INSERT INTO feedback (category, category_label, rating, title, message, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (category, category_label, rating, title, full_message, timestamp))
            
            conn.commit()
            conn.close()
            print(f"✅ Also published AI feedback to global feedback board")
            
        except Exception as db_e:
            print(f"⚠️ Failed to publish to SQLite feedback DB: {db_e}")
            # Don't fail the whole request just because SQLite failed
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/initialize")
async def initialize_learning():
    try:
        sample_path = Path(__file__).parent / "sample_testcases.json"
        if not sample_path.exists():
            # Try current directory as fallback
            sample_path = Path("sample_testcases.json")
            
        if sample_path.exists():
            rag_helper.ingest_testcases_from_json(str(sample_path))
            return {"message": "Learning system initialized"}
        else:
            return {"message": "Sample data not found, but RAG initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_stats():
    try:
        return rag_helper.get_learning_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_db_path():
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "feedback.db")

def save_latest_test_cases(test_cases: List[Dict], metadata: Dict, user_story: str):
    try:
        db_path = get_db_path()
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create table if not exists - storing generic JSON blob for simplicity
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS latest_test_generation (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                test_cases_json TEXT NOT NULL,
                metadata_json TEXT NOT NULL,
                user_story TEXT,
                timestamp TEXT NOT NULL
            )
        """)
        
        # Using REPLACE to ensure we only have one row with ID=1
        cursor.execute("""
            REPLACE INTO latest_test_generation (id, test_cases_json, metadata_json, user_story, timestamp)
            VALUES (1, ?, ?, ?, ?)
        """, (
            json.dumps(test_cases), 
            json.dumps(metadata), 
            user_story, 
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        print("✅ Saved latest test generation to SQLite")
    except Exception as e:
        print(f"⚠️ Failed to save latest test generation: {e}")

@router.get("/latest")
async def get_latest_test_cases():
    try:
        db_path = get_db_path()
        if not os.path.exists(db_path):
            return {"test_cases": [], "metadata": None, "user_story": ""}
            
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='latest_test_generation'")
        if not cursor.fetchone():
            conn.close()
            return {"test_cases": [], "metadata": None, "user_story": ""}
            
        cursor.execute("SELECT * FROM latest_test_generation WHERE id = 1")
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "test_cases": json.loads(row['test_cases_json']),
                "metadata": json.loads(row['metadata_json']),
                "user_story": row['user_story'],
                "timestamp": row['timestamp']
            }
        else:
            return {"test_cases": [], "metadata": None, "user_story": ""}
            
    except Exception as e:
        print(f"Error fetching latest test cases: {e}")
        return {"test_cases": [], "metadata": None, "user_story": ""}
