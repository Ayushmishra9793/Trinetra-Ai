"""
============================================================
Trinetra AI

Shared Constants

Purpose
-------
This module contains all constants used across
the complete AI Scanner package.

Every detector (Email, URL, Website, Wallet)
imports values from here.

Never hardcode strings inside business logic.
============================================================
"""

# ---------------------------------------------------------
# Prediction Labels
# ---------------------------------------------------------

SAFE = "Safe"

PHISHING = "Phishing"

UNKNOWN = "Unknown"


# ---------------------------------------------------------
# Risk Levels
# ---------------------------------------------------------

LOW_RISK = "Low"

MEDIUM_RISK = "Medium"

HIGH_RISK = "High"


# ---------------------------------------------------------
# Scan Types
# ---------------------------------------------------------

EMAIL_SCAN = "email"

URL_SCAN = "url"

WEBSITE_SCAN = "website"

WALLET_SCAN = "wallet"


# ---------------------------------------------------------
# Supported ML Models
# ---------------------------------------------------------

MODEL_RANDOM_FOREST = "RandomForest"

MODEL_LOGISTIC_REGRESSION = "LogisticRegression"

MODEL_DECISION_TREE = "DecisionTree"