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

    def get_pom_prompts(self, raw_script: str, shared_context: str = "") -> tuple:
        """Helper to get prompts for POM generation."""
        system_prompt = self.load_prompt("pom_generation_system.txt")
        user_prompt_template = self.load_prompt("pom_generation_user.txt")
        
        user_prompt = user_prompt_template.format(
            raw_script=raw_script,
            shared_flows_context=shared_context
        )

        return system_prompt, user_prompt

    def get_shared_flows_context(self) -> str:
        """Extract method names and docstrings from shared_flows.py for AI context."""
        import ast
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
        shared_flows_path = os.path.join(root_dir, "flows", "shared_flows.py")
        
        if not os.path.exists(shared_flows_path):
            return "No shared flows currently available."
            
        try:
            with open(shared_flows_path, "r") as f:
                tree = ast.parse(f.read())
            
            flows = []
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef) and node.name == "SharedFlows":
                    for item in node.body:
                        if isinstance(item, ast.FunctionDef) and item.name != "__init__":
                            docstring = ast.get_docstring(item) or "No description."
                            flows.append(f"- self.shared.{item.name}(data) # {docstring}")
            
            if not flows:
                return "No shared flows currently available."
            return "\n".join(flows)
        except Exception as e:
            print(f"Error parsing shared flows: {e}")
            return "Error reading shared flows."
    
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
        
    def load_prompt(self, prompt_name: str) -> str:
        """Load a prompt from the studio/backend/prompts directory."""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up to backend dir
        backend_dir = os.path.dirname(current_dir)
        prompt_path = os.path.join(backend_dir, "prompts", prompt_name)
        
        try:
            with open(prompt_path, "r") as f:
                return f.read().strip()
        except Exception as e:
            print(f"⚠️ Failed to load prompt {prompt_name}: {e}")
            return ""
    
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
    


    def review_and_fix_pom(self, raw_script: str, locators_code: str, page_code: str, test_code: str, test_data: str, error_message: str) -> dict:
        """
        Review AST generated code that failed and provide a fix.
        """
        system_prompt = self.load_prompt("pom_generation_system.txt")
        user_prompt_template = self.load_prompt("pom_review_user.txt")
        
        user_prompt = user_prompt_template.format(
            raw_script=raw_script,
            locators_code=locators_code,
            page_code=page_code,
            test_code=test_code,
            test_data=test_data,
            error_message=error_message
        )

        try:
            response = self.generate_with_system_prompt(
                system_prompt, 
                user_prompt, 
                max_tokens=4096,
                temperature=0.1
            )
            
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
            print(f"❌ AI POM Review failed: {e}")
            raise

    def refactor_playwright_script(self, raw_script: str, return_prompts_only: bool = False) -> dict:
        """
        Use AI to refactor a raw Playwright script into a clean POM structure.
        """
        shared_context = self.get_shared_flows_context()
        system_prompt, user_prompt = self.get_pom_prompts(raw_script, shared_context)

        if return_prompts_only:
            return {
                "system_prompt": system_prompt,
                "user_prompt": user_prompt
            }

        try:
            response = self.generate_with_system_prompt(
                system_prompt, 
                user_prompt, 
                max_tokens=4096,
                temperature=0.1  # Very low temperature for high consistency
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
            try:
                return json.loads(cleaned.strip())
            except json.JSONDecodeError as e:
                print(f"❌ JSON Parse Error: {e}")
                print(f"RAW RESPONSE: {cleaned}")
                raise ValueError(f"AI returned invalid JSON: {e}")
            
        except Exception as e:
            print(f"❌ AI refactoring failed: {e}")
            raise


    def heal_locator(self, failed_line: str, error_message: str, dom_snapshot: str) -> str:
        """
        Analyze the failed line, error, and DOM to infer a corrected Playwright line.
        """
        system_prompt = self.load_prompt("healing_system.txt")
        user_prompt_template = self.load_prompt("healing_user.txt")
        
        # Truncate DOM
        truncated_dom = dom_snapshot[:100000]
        
        user_prompt = user_prompt_template.format(
            failed_line=failed_line,
            error_message=error_message,
            truncated_dom=truncated_dom
        )
        try:
            response = self.generate_with_system_prompt(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=200,
                temperature=0.1
            )
            
            # Clean up
            fix = response.strip()
            if fix.startswith("```"): fix = fix.replace("```python", "").replace("```", "")
            return fix.strip()
            
        except Exception as e:
            print(f"Heal failed: {e}")
            return None        

    def get_healing_prompts(self, failed_line: str, error_message: str, dom_snapshot: str) -> dict:
        """Get the prompts that would be sent for healing."""
        system_prompt = self.load_prompt("healing_system.txt")
        user_prompt_template = self.load_prompt("healing_user.txt")
        
        truncated_dom = dom_snapshot[:100000] if dom_snapshot else "(No DOM snapshot available)"
        
        user_prompt = user_prompt_template.format(
            failed_line=failed_line,
            error_message=error_message,
            truncated_dom=truncated_dom
        )
        
        return {
            "system_prompt": system_prompt,
            "user_prompt": user_prompt
        }

    def chat(self, messages: list, context: str = "") -> str:
        """
        Chat with the AI, providing optional code context.
        Messages is a list of {"role": "user"|"assistant", "content": "..."}
        """
        system_prompt_template = self.load_prompt("chat_system.txt")
        
        context_section = ""
        if context:
            context_section = f"Here is the current code context:\n```python\n{context}\n```"

        try:
            system_prompt = system_prompt_template.format(context_section=context_section)
        except KeyError:
            # Fallback if the prompt file doesn't have the placeholder
            system_prompt = system_prompt_template
            if context:
                system_prompt += f"\n\nHere is the current code context:\n```python\n{context}\n```\n"

        # Prepend system prompt to messages logic
        # Azure OpenAI accepts a list of messages.
        # We'll construct the final list.
        final_messages = [{"role": "system", "content": system_prompt}] + messages

        try:
             response = self.client.chat.completions.create(
                model=self.deployment,
                messages=final_messages,
                max_tokens=2000,
                temperature=0.7
            )
             return response.choices[0].message.content
        except Exception as e:
            print(f"Chat failed: {e}")
            raise e

# Singleton instance getter
def get_ai_service() -> AIService:
    """Get the singleton AI service instance."""
    return AIService()
