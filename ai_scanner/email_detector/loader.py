"""
=========================================================
Model Loader

Loads trained ML models.

Uses Singleton Pattern so models
are loaded only once.
=========================================================
"""

import joblib

from ai_scanner.email_detector.config import (
    RF_MODEL,
    DT_MODEL,
    LR_MODEL,
    TFIDF,
)


class ModelLoader:

    _loaded = False

    rf_model = None

    dt_model = None

    lr_model = None

    tfidf = None

    @classmethod
    def load(cls):

        if cls._loaded:

            return

        cls.rf_model = joblib.load(RF_MODEL)

        cls.dt_model = joblib.load(DT_MODEL)

        cls.lr_model = joblib.load(LR_MODEL)

        cls.tfidf = joblib.load(TFIDF)

        cls._loaded = True