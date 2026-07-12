"""
=========================================================
URL Preprocessing Module

Responsible for cleaning and normalizing URLs before
feature extraction and model prediction.
=========================================================
"""


import re

from urllib.parse import urlparse


class URLPreprocessor:


    def __init__(self):

        pass



    def normalize(self, url:str)->str:
        """
        Normalize URL.

        Example:
        HTTPS://Google.COM/Login

        becomes:

        https://google.com/login
        """


        if not url:

            return ""



        url = url.strip()


        url = url.lower()



        if not url.startswith(
            ("http://","https://")
        ):

            url = "http://" + url



        return url




    def remove_protocol(
        self,
        url:str
    )->str:

        """
        Remove http/https
        """


        return re.sub(
            r"https?://",
            "",
            url
        )





    def extract_domain(
        self,
        url:str
    )->str:


        try:

            parsed = urlparse(
                url
            )


            return parsed.netloc


        except Exception:

            return ""




    def preprocess(
        self,
        url:str
    )->str:


        url = self.normalize(
            url
        )


        url = self.remove_protocol(
            url
        )


        return url



# Singleton object

preprocessor = URLPreprocessor()