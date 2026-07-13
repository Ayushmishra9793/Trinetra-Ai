"""
============================================================
URL Detection Service

Responsibilities:
-----------------
1. Trusted domain whitelist check
2. Machine Learning based URL prediction
3. Unified URL threat response

Flow:

URL
 |
 |
Whitelist Check
 |
 |---- Trusted Domain
 |          |
 |          ---> Safe
 |
 |
ML Predictor
 |
 |
Risk Prediction

============================================================
"""


from urllib.parse import urlparse


from .predictor import URLPredictor
from .schema import URLPredictionResponse



# ------------------------------------------------------------
# Trusted Safe Domains
# ------------------------------------------------------------
# These domains are considered safe because they are globally
# trusted platforms.
# ------------------------------------------------------------


SAFE_DOMAINS = [

    "google.com",

    "youtube.com",

    "github.com",

    "microsoft.com",

    "apple.com",

    "amazon.com",

]



# ------------------------------------------------------------
# Predictor Singleton
# ------------------------------------------------------------

_predictor = None



def get_predictor():

    """
    Load ML model only once.

    Avoids loading pickle models
    on every request.
    """

    global _predictor


    if _predictor is None:

        _predictor = URLPredictor()


    return _predictor





def scan_url(url: str):


    """
    Main URL Scanner.


    Parameters:
        url:
            URL string


    Returns:
        URLPredictionResponse


    """


    # --------------------------------------------------------
    # Extract Domain
    # --------------------------------------------------------

    parsed = urlparse(url)


    domain = parsed.netloc.lower()


    # remove www
    domain = domain.replace(
        "www.",
        ""
    )



    # --------------------------------------------------------
    # Whitelist Detection
    # --------------------------------------------------------

    if domain in SAFE_DOMAINS:


        return URLPredictionResponse(

            label="Safe",

            risk_score=0.0,

            confidence=99.0,

            url=url,

            model_used="Whitelist"

        )



    # --------------------------------------------------------
    # Machine Learning Prediction
    # --------------------------------------------------------

    predictor = get_predictor()


    prediction = predictor.predict(
        url
    )


    return prediction