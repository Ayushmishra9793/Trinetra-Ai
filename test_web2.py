import os
from dotenv import load_dotenv

# Load Environment Variables (Ensure your GEMINI_API_KEY is in the .env file)
load_dotenv()

# Import our newly built SaaS services
from ai_scanner.url_detector.service import URLScannerService
from ai_scanner.email_detector.service import EmailScannerService

def test_trinetra_web2():
    print("\n" + "="*70)
    print("🚀 TRINETRA AI: WEB2 ENGINE LIVE TEST (GEMINI 3.5 LATEST API)")
    print("="*70)

    # ---------------------------------------------------------
    # TEST 1: URL Scanner
    # ---------------------------------------------------------
    print("\n[TEST 1] Initializing URL Scanner...")
    url_service = URLScannerService()
    test_url = "http://paypal-security-update-urgent.com/login"
    
    try:
        print(f"Scanning URL: {test_url}")
        url_result = url_service.scan(test_url)
        print("\n✅ URL SCAN SUCCESSFUL!")
        print(f"   -> Scan Type:   {url_result.scan_type}")
        print(f"   -> Label:       {url_result.label}")
        print(f"   -> Risk Score:  {url_result.risk_score}")
        print(f"   -> Confidence:  {url_result.confidence}")
        print(f"   -> Model Used:  {url_result.model}")
    except Exception as e:
        print(f"\n❌ URL SCAN FAILED: {str(e)}")

    # ---------------------------------------------------------
    # TEST 2: Email Scanner
    # ---------------------------------------------------------
    print("\n" + "-"*70)
    print("[TEST 2] Initializing Email Scanner...")
    email_service = EmailScannerService()
    test_email = "URGENT: Your account will be suspended in 2 hours. Please click the link below to verify your identity and avoid permanent block."
    
    try:
        print(f"Scanning Email snippet...")
        email_result = email_service.scan(test_email)
        print("\n✅ EMAIL SCAN SUCCESSFUL!")
        print(f"   -> Scan Type:   {email_result.scan_type}")
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