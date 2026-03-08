"""
Azure OpenAI Service for AI-powered features.
"""
import os
from dotenv import load_dotenv
from openai import AzureOpenAI

# Load environment variables from .env file
load_dotenv()


class AIService:
    """Singleton service for Azure OpenAI interactions."""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.api_key = os.getenv("AZURE_OPENAI_API_KEY")
        self.endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")
        self.deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")
        self.max_tokens = int(os.getenv("AZURE_OPENAI_MAX_TOKENS", "4096"))
        self.temperature = float(os.getenv("AZURE_OPENAI_TEMPERATURE", "0.7"))
        
        if not self.api_key or not self.endpoint:
            raise ValueError("Azure OpenAI credentials not configured. Check .env file.")
        
        self.client = AzureOpenAI(
            api_key=self.api_key,
            api_version=self.api_version,
            azure_endpoint=self.endpoint
        )
        
        self._initialized = True
        print(f"✅ AI Service initialized with deployment: {self.deployment}")
    
    def generate_completion(self, prompt: str, max_tokens: int = None, temperature: float = None) -> str:
        """Generate a completion using Azure OpenAI."""
        response = self.client.chat.completions.create(
            model=self.deployment,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens or self.max_tokens,
            temperature=temperature if temperature is not None else self.temperature
        )
        return response.choices[0].message.content
    
    def generate_with_system_prompt(
        self, 
        system_prompt: str, 
        user_prompt: str, 
        max_tokens: int = None,
        temperature: float = None
    ) -> str:
        """Generate a completion with a system prompt for more control."""
        response = self.client.chat.completions.create(
            model=self.deployment,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=max_tokens or self.max_tokens,
            temperature=temperature if temperature is not None else self.temperature
        )
        return response.choices[0].message.content
    
    def refactor_playwright_script(self, raw_script: str) -> dict:
        """
        Use AI to refactor a raw Playwright script into a clean POM structure.
        Returns a dictionary with locators, page class, test data, and test file.
        """
        system_prompt = """You are an expert Playwright automation engineer. 
Your task is to refactor raw Playwright scripts into a clean Page Object Model (POM) structure.

Follow these best practices:
1. Generate semantic, readable locator names (SCREAMING_SNAKE_CASE)
2. Use stable locator strategies (role > test-id > label > text > CSS)
3. Create clean page class methods with proper error handling
4. Extract test data into a separate data dictionary
5. Generate comprehensive test cases with assertions

CRITICAL: Always respond with ONLY a valid JSON object. No markdown, no explanations."""

        user_prompt = f"""Refactor this raw Playwright script into a clean POM structure.

RAW SCRIPT:
```python
{raw_script}
```

Generate a JSON response with these exact keys:

{{
    "locators_code": "<Python code for locators class>",
    "page_code": "<Python code for page class>",
    "test_data": {{"KEY": "value"}},
    "test_code": "<Python code for test class>"
}}

=== AVAILABLE BASEPAGE METHODS (USE ONLY THESE) ===
- self.navigate_to(url) - Navigate to URL
- self.click(selector) - Click element (selector is string from GeneratedLocators)
- self.type_text(selector, text) - Fill text input
- self.press_key(selector, key) - Press keyboard key
- self.verify_element_text(selector, expected_text) - Assert exact text
- self.verify_element_contains_text(selector, expected_text) - Assert contains text
- self.verify_element_value(selector, expected_value) - Assert input value
- self.verify_element_empty(selector) - Assert element is empty
- self.verify_element_visible(selector) - Assert element is visible

=== EXACT FORMAT FOR locators_code ===
```python
class GeneratedLocators:
    # Use Playwright's role selector format: role=type[name="value"]
    LOGIN_LINK = 'role=link[name="Login"]'
    LOGIN_BUTTON = 'role=button[name="Login"]'
    EMAIL_INPUT = 'role=textbox[name="email"]'
    PASSWORD_INPUT = 'role=textbox[name="password"]'
    # For CSS selectors, use standard format:
    SUBMIT_BTN = '[data-testid="submit"]'
    HEADER_H1 = 'h1'
    
    # CONVERSION RULES:
    # get_by_role("link", name="Login") -> 'role=link[name="Login"]'
    # get_by_role("button", name="Submit") -> 'role=button[name="Submit"]'
    # get_by_role("textbox", name="email") -> 'role=textbox[name="email"]'
    # get_by_role("textbox", name="password") -> 'role=textbox[name="password"]'
    # page.locator("h1") -> 'h1'
    # page.locator("[data-testid='x']") -> '[data-testid="x"]'
```

=== EXACT FORMAT FOR page_code ===
```python
from base.base_page import BasePage
from generated_pom.locators.generated_locators import GeneratedLocators
from playwright.sync_api import expect

class GeneratedPage(BasePage):
    def run_generated_flow(self, data: dict):
        self.navigate_to(data.get("BASE_URL", ""))
        self.click(GeneratedLocators.LOGIN_BUTTON)
        # For expect(...).to_be_empty() use:
        self.verify_element_empty(GeneratedLocators.EMAIL_INPUT)
        # NEVER use self.get_by_role() - it doesn't exist!
        # NEVER use expect(self.page.get_by_role(...)) - use verify methods instead!
```

=== EXACT FORMAT FOR test_code (CRITICAL - MUST USE page FIXTURE) ===
```python
import pytest
from generated_pom.pages.generated_page import GeneratedPage
from utils.json_util import JsonUtil
from config.config import Config
import os

class TestGenerated:
    @pytest.fixture
    def generated_data(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(base_dir, "data", "generated_data.json")
        if os.path.exists(path):
            return JsonUtil.read_json(path)
        return {{}}

    def test_flow(self, page, generated_data):
        page.set_default_timeout(Config.TIMEOUT)
        page_obj = GeneratedPage(page)
        page_obj.run_generated_flow(generated_data)
```

=== CRITICAL RULES ===
1. ALL selectors must be defined in GeneratedLocators class as string constants
2. Use Playwright role selector format: 'role=type[name="value"]' (e.g., 'role=link[name="Login"]')
3. NEVER use self.get_by_role(), self.page.get_by_role() or any get_by_* methods in page_code
4. Use ONLY the BasePage methods listed above for all actions and verifications
5. For expect(locator).to_be_empty() -> use self.verify_element_empty(GeneratedLocators.LOCATOR_NAME)
6. For expect(locator).to_be_visible() -> use self.verify_element_visible(GeneratedLocators.LOCATOR_NAME)
7. test_code MUST use 'page' fixture and pass it to GeneratedPage(page)
8. Distinguish between LINK and BUTTON: get_by_role("link") -> 'role=link[...]', get_by_role("button") -> 'role=button[...]'

Return ONLY the JSON object, nothing else."""

        try:
            response = self.generate_with_system_prompt(
                system_prompt, 
                user_prompt, 
                max_tokens=4000,
                temperature=0.3  # Lower temperature for more consistent code generation
            )
            
            # Clean up response - extract JSON if wrapped in markdown
            cleaned = response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            
            import json
            return json.loads(cleaned.strip())
            
        except Exception as e:
            print(f"❌ AI refactoring failed: {e}")
            raise


# Singleton instance getter
def get_ai_service() -> AIService:
    """Get the singleton AI service instance."""
    return AIService()
