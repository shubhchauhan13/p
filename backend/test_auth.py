import requests
try:
    res = requests.post("http://localhost:8000/api/auth/register", json={"email": "test@example.com", "username": "testuser", "password": "password123"})
    print(res.status_code)
    print(res.text)
except Exception as e:
    print(f"Error: {e}")
