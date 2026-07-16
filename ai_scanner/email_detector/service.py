"""
=========================================================
Email Detector Service

Entry point for Django / API layer.

This module connects:
Django
   |
   v
EmailPredictor
   |
   v
ML Models
=========================================================
"""


import json
from google import genai
from ai_scanner.shared.exceptions import InvalidInputException
from .config import MODEL_NAME
from .validator import EmailValidator

class EmailScanResult:
    """Standardized response format for the Unified API"""
    def __init__(self, label, risk_score, confidence, explanation):
        self.label = label
        self.risk_score = risk_score
        self.confidence = confidence
        self.model = MODEL_NAME
        self.explanation = explanation
        self.metadata = {"engine": "Gemini GenAI"}

def scan_email(email_text: str):
    """
    Run email phishing detection using the latest Gemini SDK.
    """
    # 1. Validation Check
    try:
        validated_text = EmailValidator.validate(email_text)
    except InvalidInputException as e:
        return EmailScanResult(
            label="SAFE", 
            risk_score=0.0, 
            confidence=100.0, 
            explanation=str(e)
        )

    # 2. Initialize the NEW Client
    client = genai.Client()

    # 3. Prompt Engineering
    prompt = f"""
    You are an elite cybersecurity AI. Analyze the following email content for phishing, spam, or malicious intent.
    Return ONLY a valid JSON object. Do not include markdown code blocks like ```json or any other text.
    The JSON must contain exactly these keys:
    - "label": strictly "SAFE", "SUSPICIOUS", or "PHISHING"
    - "risk_score": a float between 0.0 and 100.0 (100 being extreme risk)
    - "confidence": a float between 0.0 and 100.0 (how confident are you)
    - "explanation": a concise 1-2 sentence reason for your verdict.

    Email Content:
    {validated_text}
    """

    try:
        # 4. Call Gemini API using the new interactions.create syntax
        interaction = client.interactions.create(
            model=MODEL_NAME,
            input=prompt
        )
        
        # 5. Clean and parse JSON response
        raw_text = interaction.output_text.strip()
        
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
            
        result_dict = json.loads(raw_text.strip())

        # 6. Return Structured Result
        return EmailScanResult(
            label=result_dict.get("label", "SUSPICIOUS"),
            risk_score=float(result_dict.get("risk_score", 50.0)),
            confidence=float(result_dict.get("confidence", 80.0)),
            explanation=result_dict.get("explanation", "Analyzed by Gemini 3.5 Flash.")
        )

    except Exception as e:
        # Fallback if API fails
        return EmailScanResult(
            label="SUSPICIOUS",
            risk_score=50.0,
            confidence=0.0,
            explanation=f"Error analyzing email with Gemini API: {str(e)}"
        )