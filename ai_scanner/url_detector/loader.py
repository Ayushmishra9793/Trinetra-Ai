"""
=========================================================
URL Model Loader

Loads trained ML models only once.

Singleton pattern used for performance.
=========================================================
"""


import joblib

from .config import (
    RF_MODEL,
    DT_MODEL,
    LR_MODEL,
    TFIDF_MODEL
)


from .logger import logger



class URLModelLoader:



    _loaded = False


    rf_model = None

    dt_model = None

    lr_model = None

    tfidf = None




    @classmethod
    def load(cls):


        if cls._loaded:

            return



        try:


            logger.info(
                "Loading URL detection models"
            )



            cls.rf_model = joblib.load(
                RF_MODEL
            )


            cls.dt_model = joblib.load(
                DT_MODEL
            )


            cls.lr_model = joblib.load(
                LR_MODEL
            )


            cls.tfidf = joblib.load(
                TFIDF_MODEL
            )



            cls._loaded = True



            logger.info(
                "URL models loaded successfully"
            )



        except Exception as e:


            logger.exception(
                f"Model loading failed : {e}"
            )


            raise





    @classmethod
    def get_rf_model(cls):


        if not cls._loaded:

            cls.load()


        return cls.rf_model




    @classmethod
    def get_vectorizer(cls):


        if not cls._loaded:

            cls.load()


        return cls.tfidf