"""
=========================================================
URL Phishing Prediction Engine

Loads ML models and predicts URL risk
=========================================================
"""


from __future__ import annotations


import joblib


from .config import (
    RF_MODEL,
    TFIDF_MODEL
)


from .constants import (
    PHISHING,
    PHISHING_LABEL,
    SAFE_LABEL
)


from .schema import (
    URLPredictionResponse
)


from .preprocessing import (
    preprocessor
)


from .logger import (
    logger
)



class URLPredictor:


    def __init__(self):

        self.model = None

        self.vectorizer = None


        self.load_models()



    def load_models(self):


        logger.info(
            "Loading URL detection models"
        )


        self.model = joblib.load(
            RF_MODEL
        )


        self.vectorizer = joblib.load(
            TFIDF_MODEL
        )



    def predict(
        self,
        url:str
    ):


        cleaned_url = (
            preprocessor
            .preprocess(
                url
            )
        )


        vector = (
            self.vectorizer
            .transform(
                [
                    cleaned_url
                ]
            )
        )



        prediction = (
            self.model
            .predict(
                vector
            )[0]
        )



        probabilities = (
            self.model
            .predict_proba(
                vector
            )[0]
        )



        confidence = (
            max(probabilities)
            *
            100
        )



        if prediction == PHISHING:


            label = PHISHING_LABEL


            risk_score = confidence



        else:


            label = SAFE_LABEL


            risk_score = (
                100-confidence
            )




        return URLPredictionResponse(

            label=label,

            risk_score=round(
                risk_score,
                2
            ),

            confidence=round(
                confidence,
                2
            ),

            url=url,

            model_used="RandomForest"

        )