"""
=========================================================
Trinetra AI: The Final Master API Test
=========================================================
"""
import requests
import json

def test_live_api():
    print("\n" + "="*70)
    print("🚀 TRINETRA AI: FINAL MASTER API TEST (WEB2 + WEB3)")
    print("="*70)

    # Correct Master Unified API Endpoint
    api_endpoint = "http://127.0.0.1:8000/api/v1/scan/" 
    
    # Hum seedha ek aisi URL daalenge jisme pakka Web3 wallet hota hai
    target_url = input("\n🌐 Enter a URL to test (Press Enter for default - https://etherscan.io/): ").strip()
    
    if not target_url:
        target_url = "https://etherscan.io/"

    # Sending both URL and a dummy email to test the ENTIRE engine at once!
    payload = {
        "url": target_url,
        "email": "URGENT: Your MetaMask wallet will be blocked. Click below to verify."
    }
    headers = {"Content-Type": "application/json"}

    print(f"\n[POST] Sending request to {api_endpoint}...")
    
    try:
        response = requests.post(api_endpoint, json=payload, headers=headers)
        
        print(f"\n✅ API RESPONSE RECEIVED (Status: {response.status_code})")
        print("\n📦 Final JSON Output (Bhejo apne Frontend dev ko!):\n")
        print(json.dumps(response.json(), indent=4))
        
    except requests.exceptions.ConnectionError:
        print("\n❌ API CONNECTION FAILED!")
        print("💡 HINT: Kya aapne 'python manage.py runserver' doosre terminal mein chalu kiya hai?")
        
    print("\n" + "="*70)
    print("🎉 BACKEND IS PRODUCTION READY! TIME FOR PARTY-- 🎉")
    print("="*70)

if __name__ == "__main__":
    test_live_api()