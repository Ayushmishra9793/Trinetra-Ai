"""
============================================================
URL Detection Service

Responsibilities:
-----------------
1. Trusted domain whitelist check
2. Gemini GenAI based URL prediction
3. Unified URL threat response
============================================================
"""
import json
from urllib.parse import urlparse
from google import genai
from ai_scanner.shared.exceptions import InvalidInputException
from .config import MODEL_NAME
from .validator import URLValidator

# ------------------------------------------------------------
# Trusted Safe Domains
# ------------------------------------------------------------
SAFE_DOMAINS = [
    "google.com",
    "youtube.com",
    "github.com",
    "microsoft.com",
    "apple.com",
    "amazon.com",
    "hackhalt.org",
    "theangaarbatch.in"
]

class URLScanResult:
    def __init__(self, label, risk_score, confidence, model_used, explanation=""):
        self.label = label
        self.risk_score = risk_score
        self.confidence = confidence
        self.model_used = model_used
        self.explanation = explanation

def scan_url(url: str):
    """
    Main URL Scanner.
    First checks whitelist, then calls Gemini API if needed.
    """
    # 1. Input Validation
    try:
        validated_url = URLValidator.validate(url)
    except InvalidInputException as e:
        return URLScanResult("SAFE", 0.0, 100.0, "Validator", str(e))

    # 2. Extract Domain & Whitelist Check
    parsed = urlparse(validated_url)
    domain = parsed.netloc.lower().replace("www.", "")

    if domain in SAFE_DOMAINS:
        return URLScanResult(
            label="SAFE",
            risk_score=0.0,
            confidence=99.0,
            model_used="Whitelist",
            explanation="Domain is in the trusted whitelist."
        )

    # 3. Gemini GenAI Prediction
    client = genai.Client()
    
    prompt = f"""
    You are an elite cybersecurity AI. Analyze this URL for phishing, malware, or suspicious patterns.
    Return ONLY a valid JSON object. Do not include markdown code blocks like ```json or any other text.
    The JSON must contain exactly these keys:
    - "label": strictly "SAFE", "SUSPICIOUS", or "PHISHING"
    - "risk_score": a float between 0.0 and 100.0 (100 being extreme risk)
    - "confidence": a float between 0.0 and 100.0
    - "explanation": a concise 1-2 sentence reason.

    URL to Analyze:
    {validated_url}
    """

    try:
        interaction = client.interactions.create(
            model=MODEL_NAME,
            input=prompt
        )
        
        raw_text = interaction.output_text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        result_dict = json.loads(raw_text.strip())

        return URLScanResult(
            label=result_dict.get("label", "SUSPICIOUS"),
            risk_score=float(result_dict.get("risk_score", 50.0)),
            confidence=float(result_dict.get("confidence", 80.0)),
            model_used=MODEL_NAME,
            explanation=result_dict.get("explanation", "Analyzed by Gemini AI.")
        )

    except Exception as e:
        return URLScanResult(
            label="SUSPICIOUS",
            risk_score=50.0,
            confidence=0.0,
            model_used="Fallback",
            explanation=f"Error analyzing URL with Gemini API: {str(e)}"
        )