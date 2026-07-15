import requests
import json

def test_live_api():
    print("\n" + "="*70)
    print("🚀 TRINETRA AI: TESTING LIVE WEB3 REST API")
    print("="*70)

    # Yeh aapke local Django server ka address hai
    api_endpoint = "http://127.0.0.1:8000/api/web3/scan/" 
    
    # Dummy URL testing ke liye
    target_url = input("\n🌐 Enter a URL to test the API (e.g., https://etherscan.io/): ").strip()
    
    if not target_url:
        print("⚠️ No URL provided. Exiting.")
        return

    payload = {"url": target_url}
    headers = {"Content-Type": "application/json"}

    print(f"\n[POST] Sending request to {api_endpoint}...")
    
    try:
        response = requests.post(api_endpoint, json=payload, headers=headers)
        
        print("\n✅ API RESPONSE RECEIVED:")
        print(f"   -> Status Code: {response.status_code}")
        
        formatted_json = json.dumps(response.json(), indent=4)
        print("\n📦 Response Data:\n")
        print(formatted_json)
        
    except requests.exceptions.ConnectionError:
        print("\n❌ API CONNECTION FAILED!")
        print("💡 HINT: Kya aapne 'python manage.py runserver' doosre terminal mein chalu kiya hai?")
        
    print("\n" + "="*70)

if __name__ == "__main__":
    test_live_api()