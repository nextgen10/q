import json
import os

class JsonUtil:
    @staticmethod
    def read_json(file_path: str) -> dict:
        """
        Reads a JSON file and returns the data.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"JSON file not found at: {file_path}")
        
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            return data
        except Exception as e:
            print(f"Error reading JSON file: {e}")
            return {}
