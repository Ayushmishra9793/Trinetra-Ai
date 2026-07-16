"""
=========================================================
URL Detector Validator
Validates URL input and tests Gemini AI behavior.
=========================================================
"""
import re
from ai_scanner.shared.exceptions import InvalidInputException

class URLValidator:
    MAX_LENGTH = 2048

    @classmethod
    def validate(cls, url: str):
        if url is None:
            raise InvalidInputException("URL cannot be None.")
        if not isinstance(url, str):
            raise InvalidInputException("URL must be string.")
            
        url = url.strip()
        
        if len(url) == 0:
            raise InvalidInputException("URL cannot be empty.")
        if len(url) > cls.MAX_LENGTH:
            raise InvalidInputException("URL is too large.")
            
        regex = re.compile(
            r'^(?:http|ftp)s?://'
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'
            r'localhost|'
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
            r'(?::\d+)?'
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
            
        if not re.match(regex, url):
            raise InvalidInputException("Invalid URL format.")
            
        return url

# =========================================================
# Old Test Script Logic Adapted for Gemini AI
# =========================================================

TEST_URLS = [
    "https://google.com",
    "https://github.com",
    "http://paypal-login-security.com",
    "http://metamask-wallet-airdrop.com",
    "http://verify-account-update.com"
]

def test_model_behavior():
    # Importing here to prevent circular import with service.py
    from .service import scan_url
    
    print("\nURL Detector Validation (Gemini AI)\n")
    
    for url in TEST_URLS:
        result = scan_url(url)
        print("URL:", url)
        print("Prediction:", result.label)
        print("Risk:", result.risk_score)
        print("Confidence:", result.confidence)
        if hasattr(result, 'explanation'):
            print("Reason:", result.explanation)
        print("--------------------")

if __name__ == "__main__":
    test_model_behavior()