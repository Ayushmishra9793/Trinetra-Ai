"""
====================================================================
Email Predictor

Runs phishing prediction on email text.

Responsibilities
----------------
1. Clean email text
2. Convert text into TF-IDF features
3. Predict using ML model
4. Return standardized PredictionResponse

This module NEVER communicates with Django.
====================================================================
"""

from ai_scanner.email_detector.loader import ModelLoader
from ai_scanner.email_detector.preprocessing import preprocessor
from ai_scanner.email_detector.feature_extractor import FeatureExtractor

from ai_scanner.shared.logger import logger
from ai_scanner.shared.response import PredictionResponse

from ai_scanner.email_detector.validator import EmailValidator

from ai_scanner.shared.constants import (
    EMAIL_SCAN,
    PHISHING,
    SAFE,
    MODEL_RANDOM_FOREST
)


class EmailPredictor:
    """
    Email phishing inference engine.
    """

    def __init__(self):
        """
        Load trained models only once.
        """

        ModelLoader.load()

    def predict(
        self,
        email_text: str
    ) -> PredictionResponse:

        logger.info(
            "Running Email Prediction"
        )

        # ----------------------------------------
        # Step 1
        # Clean Email
        # ----------------------------------------

        cleaned = (
            preprocessor
            .preprocess(
                email_text
            )
        )

        # ----------------------------------------
        # Step 2
        # Feature Extraction
        # ----------------------------------------

        vector = (
            FeatureExtractor
            .transform(
                cleaned
            )
        )

        # ----------------------------------------
        # Step 3
        # ML Prediction
        # ----------------------------------------
        
        

        EmailValidator.validate(
            email_text
        )

        prediction = (
            ModelLoader
            .rf_model
            .predict(vector)[0]
        )

        probability = (
            ModelLoader
            .rf_model
            .predict_proba(vector)[0]
        )

        confidence = round(
            max(probability) * 100,
            2
        )

        # ----------------------------------------
        # Step 4
        # Build Response
        # ----------------------------------------

        if prediction == 1:

            label = PHISHING
            risk_score = confidence

        else:

            label = SAFE
            risk_score = 0.0

        logger.info(
            f"Prediction={label} Confidence={confidence}"
        )

        return PredictionResponse(

            scan_type=EMAIL_SCAN,

            label=label,

            risk_score=risk_score,

            confidence=confidence,

            model=MODEL_RANDOM_FOREST,

            explanation=None,

            metadata={}

        )