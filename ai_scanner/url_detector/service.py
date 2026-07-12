"""
=========================================================
URL Detection Service Layer

Single entry point for URL scanning
=========================================================
"""


from .predictor import URLPredictor



_predictor = None



def get_predictor():

    global _predictor


    if _predictor is None:

        _predictor = URLPredictor()


    return _predictor





def scan_url(url:str):


    predictor = get_predictor()


    return predictor.predict(
        url
    )