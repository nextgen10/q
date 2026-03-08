
import requests

url = "http://localhost:8000/api/v1/test-design/generate"
data = {
    "story": "As a user, I want to login so that I can see my dashboard."
}

try:
    response = requests.post(url, data=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
