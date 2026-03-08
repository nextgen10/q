from .base_agent import BaseAgent
import json


class TargetAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Target Agent")
        # self.llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
        # self.parser = JsonOutputParser()

    async def run(self, prompt: str) -> dict:
        # Mock response logic to avoid OpenAI dependency if key is missing
        # In a real app, this would call the LLM.
        
        prompt_lower = prompt.lower()
        
        if "alice" in prompt_lower:
            return {"name": "Alice", "age": 25}
        elif "exercise" in prompt_lower:
            return {"summary": "Regular physical activity improves cardiovascular health, boosts mood, and helps maintain weight."}
        elif "capital of france" in prompt_lower:
            return {"capital": "Paris"}
        elif "id and price" in prompt_lower:
            # Intentionally missing category for "Structure Failure" scenario if that's what we want?
            # The scenario expects: {"id": 123, "price": 99.99, "category": "electronics"}
            # But the prompt says "Generate a product with id and price."
            # The scenario description says "Missing required keys".
            # So let's return something that triggers the failure.
            return {"id": 123, "price": 99.99} 
        elif "2 + 2" in prompt_lower:
            return {"result": 4}
        elif "quantum" in prompt_lower:
            return {"explanation": "Quantum entanglement is a phenomenon where particles become correlated in such a way that the state of one cannot be described independently of the other, even when separated by large distances."}
        
        # Default fallback
        return {"message": "This is a mock response.", "data": {}}
