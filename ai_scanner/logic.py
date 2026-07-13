# """
# ======================================================================
# Trinetra AI Gateway

# Purpose
# -------
# Central routing layer for every AI detector.

# Flow
# ----
# views.py
#     ↓
# logic.py
#     ↓
# Email / URL / Website
#     ↓
# PredictionResponse
# ======================================================================
# """

# from ai_scanner.shared.logger import logger
# from ai_scanner.shared.exceptions import (
#     InvalidInputException,
#     PredictionException,
# )

# from ai_scanner.shared.constants import (
#     EMAIL_SCAN,
#     URL_SCAN,
#     WEBSITE_SCAN,
# )

# from ai_scanner.email_detector.predictor import EmailPredictor
# from ai_scanner.url_detector.predictor import URLPredictor

# # ------------------------------------------------------------
# # Lazy Instances
# # ------------------------------------------------------------

# _email_predictor = None
# _url_predictor = None


# def get_email_predictor():

#     global _email_predictor

#     if _email_predictor is None:

#         logger.info("Initializing Email Predictor")

#         _email_predictor = EmailPredictor()

#     return _email_predictor


# def get_url_predictor():

#     global _url_predictor

#     if _url_predictor is None:

#         logger.info("Initializing URL Predictor")

#         _url_predictor = URLPredictor()

#     return _url_predictor


# # ------------------------------------------------------------
# # Email Scanner
# # ------------------------------------------------------------

# def scan_email(email: str):

#     predictor = get_email_predictor()

#     return predictor.predict(email)


# # ------------------------------------------------------------
# # URL Scanner
# # ------------------------------------------------------------

# def scan_url(url: str):

#     predictor = get_url_predictor()

#     return predictor.predict(url)


# # ------------------------------------------------------------
# # Main AI Gateway
# # ------------------------------------------------------------

# def get_ai_risk_score(scan_type: str, data: str):

#     """
#     Main routing function.

#     Supported:

#         email
#         url

#     Future:

#         wallet
#         website
#         apk
#         qr
#     """

#     try:

#         if scan_type == EMAIL_SCAN:

#             return scan_email(data)

#         elif scan_type == URL_SCAN:

#             return scan_url(data)

#         else:

#             raise InvalidInputException(
#                 f"Unsupported scan type : {scan_type}"
#             )

#     except Exception as error:

#         logger.exception(error)

#         raise PredictionException(str(error))


"""
AI Gateway
"""

from ai_scanner.registry import DetectorRegistry

from ai_scanner.shared.logger import logger


def get_ai_risk_score(

    scan_type,

    data

):

    logger.info(

        f"Scan Type : {scan_type}"

    )

    detector = DetectorRegistry.get_detector(

        scan_type

    )

    return detector.predict(

        data

    )