"""
============================================================
Central Logger

Every module uses the same logger.

Email Detector
URL Detector
Wallet
Website

all log here.
============================================================
"""

import logging
from pathlib import Path


LOG_DIR = Path(__file__).resolve().parent.parent / "logs"

LOG_DIR.mkdir(
    parents=True,
    exist_ok=True
)

LOG_FILE = LOG_DIR / "trinetra.log"


logging.basicConfig(

    level=logging.INFO,

    filename=LOG_FILE,

    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"

)


logger = logging.getLogger("Trinetra")