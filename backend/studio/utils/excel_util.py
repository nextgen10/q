import pandas as pd
import os

class ExcelUtil:
    @staticmethod
    def read_excel(file_path: str, sheet_name: str = 0) -> list:
        """
        Reads an Excel file and returns a list of dictionaries.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Excel file not found at: {file_path}")
        
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            return df.to_dict(orient='records')
        except Exception as e:
            print(f"Error reading Excel file: {e}")
            return []
