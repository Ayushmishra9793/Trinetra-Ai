"""
=========================================================
URL Detector Configuration
=========================================================
"""

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent


MODEL_DIR = BASE_DIR / "models"


RF_MODEL = MODEL_DIR / "rf_model.pkl"

DT_MODEL = MODEL_DIR / "dt_model.pkl"

LR_MODEL = MODEL_DIR / "lr_model.pkl"

TFIDF_MODEL = MODEL_DIR / "tfidf_vectorizer.pkl"