# """
# =========================================================
# URL Feature Extractor

# Extracts security related features from URLs.

# Features:

# - URL length
# - Number of dots
# - Number of special chars
# - HTTPS usage
# - Suspicious keywords
# - Digit count
# =========================================================
# """


# from .constants import SUSPICIOUS_KEYWORDS



# class FeatureExtractor:



#     @staticmethod
#     def extract(
#         url:str
#     )->dict:


#         url_lower = url.lower()



#         features = {}



#         # URL Length

#         features[
#             "url_length"
#         ] = len(url)



#         # Dot count

#         features[
#             "dot_count"
#         ] = url.count(".")




#         # Slash count

#         features[
#             "slash_count"
#         ] = url.count("/")



#         # Hyphen count

#         features[
#             "hyphen_count"
#         ] = url.count("-")



#         # Digit count

#         features[
#             "digit_count"
#         ] = sum(
#             c.isdigit()
#             for c in url
#         )



#         # Special characters

#         special_chars = [
#             "@",
#             "?",
#             "=",
#             "&",
#             "%"
#         ]


#         features[
#             "special_char_count"
#         ] = sum(
#             url.count(c)
#             for c in special_chars
#         )



#         # HTTPS

#         features[
#             "has_https"
#         ] = (
#             1
#             if url_lower.startswith("https")
#             else 0
#         )



#         # Suspicious keywords


#         features[
#             "suspicious_keyword_count"
#         ] = sum(

#             1

#             for keyword in SUSPICIOUS_KEYWORDS

#             if keyword in url_lower

#         )



#         return features

"""
=========================================================
URL Feature Extractor

Extracts ML features from URL text
=========================================================
"""


import re


from urllib.parse import urlparse



class FeatureExtractor:


    @staticmethod
    def extract_features(url:str)->dict:
        """
        Extract security related URL features
        """


        features = {}


        features["url_length"] = len(url)



        features["domain_length"] = len(
            urlparse(url).netloc
        )



        features["has_ip"] = int(
            bool(
                re.search(
                    r'\d+\.\d+\.\d+\.\d+',
                    url
                )
            )
        )



        features["has_https"] = int(
            "https" in url.lower()
        )



        features["count_dots"] = (
            url.count(".")
        )



        features["count_hyphen"] = (
            url.count("-")
        )



        features["count_slash"] = (
            url.count("/")
        )



        features["count_question"] = (
            url.count("?")
        )



        features["count_equal"] = (
            url.count("=")
        )



        features["count_at"] = (
            url.count("@")
        )


        return features