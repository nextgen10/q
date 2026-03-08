import requests
import os

# Configuration
API_URL = "http://localhost:8000/evaluate-excel"
FILE_PATH = "large_dataset.xlsx"
MAX_ROWS = 1000

def inject_data():
    if not os.path.exists(FILE_PATH):
        print(f"Error: {FILE_PATH} not found.")
        return

    print(f"Injecting {FILE_PATH} into {API_URL}...")
    
    with open(FILE_PATH, "rb") as f:
        files = {"file": (FILE_PATH, f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        data = {
            "model": "gpt-4o",
            "alpha": 0.4,
            "beta": 0.3,
            "gamma": 0.3,
            "max_rows": MAX_ROWS,
            "safety": "true"
        }
        
        try:
            response = requests.post(API_URL, files=files, data=data)
            
            if response.status_code == 200:
                print("✅ Success! Large dataset injected.")
                print("Response summary:", response.json().get("id"))
            else:
                print(f"❌ Failed: {response.status_code}")
                print(response.text)
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    inject_data()
