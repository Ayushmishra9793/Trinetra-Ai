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


from ai_scanner.email_detector.predictor import (
    EmailPredictor
)


_predictor = EmailPredictor()



def scan_email(
    email_text: str
):
    """
    Run email phishing detection.

    Args:
        email_text: Email content

    Returns:
        PredictionResponse
    """


    return _predictor.predict(
        email_text
    )