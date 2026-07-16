"""
=========================================================
URL Detector Logger
=========================================================
"""
import logging

logger = logging.getLogger("URL_DETECTOR")
logger.setLevel(logging.INFO)

# Create console handler
handler = logging.StreamHandler()

# Create formatter and add it to the handler
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)

# Add the handler to the logger (Check to avoid duplicate logs)
if not logger.handlers:
    logger.addHandler(handler)