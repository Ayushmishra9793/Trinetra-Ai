"""
=========================================================
Email Detector Configuration

Central place for every path used by
Email Detector.

Changing model locations requires editing
only this file.
=========================================================
"""

import os
from dotenv import load_dotenv

# .env file load karein
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("⚠️ GEMINI_API_KEY is missing in your .env file!")

# Set environment variable so the new Client() can pick it up automatically
os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY

# Updated to the latest model as per your docs!
MODEL_NAME = "gemini-3.5-flash"