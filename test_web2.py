"""
=========================================================
Trinetra AI: Web2 Engine Live Test
=========================================================
"""
import os
from dotenv import load_dotenv

# Load Environment Variables (Ensure your GEMINI_API_KEY is in the .env file)
load_dotenv()

# Import our newly updated functional GenAI services
from ai_scanner.url_detector.service import scan_url
from ai_scanner.email_detector.service import scan_email

def test_trinetra_web2():
    print("\n" + "="*70)
    print("🚀 TRINETRA AI: WEB2 ENGINE LIVE TEST (GEMINI GENAI)")
    print("="*70)

    # ---------------------------------------------------------
    # TEST 1: URL Scanner
    # ---------------------------------------------------------
    print("\n[TEST 1] Initializing URL Scanner...")
    test_url = "http://paypal-security-update-urgent.com/login"
    
    try:
        print(f"Scanning URL: {test_url}")
        # Seedha function call kar rahe hain ab
        url_result = scan_url(test_url)
        
        print("\n✅ URL SCAN SUCCESSFUL!")
        print(f"   -> Label:       {url_result.label}")
        print(f"   -> Risk Score:  {url_result.risk_score}")
        print(f"   -> Confidence:  {url_result.confidence}")
        print(f"   -> Model Used:  {url_result.model_used}")
        print(f"   -> Explanation: {url_result.explanation}")
    except Exception as e:
        print(f"\n❌ URL SCAN FAILED: {str(e)}")

    # ---------------------------------------------------------
    # TEST 2: Email Scanner
    # ---------------------------------------------------------
    print("\n" + "-"*70)
    print("[TEST 2] Initializing Email Scanner...")
    test_email = "URGENT: Your account will be suspended in 2 hours. Please click the link below to verify your identity and avoid permanent block."
    
    try:
        print(f"Scanning Email snippet...")
        # Seedha function call kar rahe hain ab
        email_result = scan_email(test_email)
        
        print("\n✅ EMAIL SCAN SUCCESSFUL!")
        print(f"   -> Label:       {email_result.label}")
        print(f"   -> Risk Score:  {email_result.risk_score}")
        print(f"   -> Confidence:  {email_result.confidence}")
        print(f"   -> Explanation: {email_result.explanation}")
        print(f"   -> Model Used:  {email_result.model}")
    except Exception as e:
        print(f"\n❌ EMAIL SCAN FAILED: {str(e)}")

    print("\n" + "="*70)
    print("🎯 TESTING COMPLETE")
    print("="*70 + "\n")

if __name__ == "__main__":
    test_trinetra_web2()