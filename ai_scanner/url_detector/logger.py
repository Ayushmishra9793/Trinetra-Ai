"""
=========================================================
URL Detector Logger
=========================================================
"""


import logging



logger = logging.getLogger(
    "URL_DETECTOR"
)


logger.setLevel(
    logging.INFO
)



handler = logging.StreamHandler()



formatter = logging.Formatter(
    "%(asctime)s - %(levelname)s - %(message)s"
)



handler.setFormatter(
    formatter
)



logger.addHandler(
    handler
)