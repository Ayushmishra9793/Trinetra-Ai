"""
==========================================================
Detector Registry

Purpose
-------
Keeps all AI detectors in one place.

New detector?

Just register here.

No changes required inside logic.py
==========================================================
"""

from ai_scanner.email_detector.predictor import EmailPredictor
from ai_scanner.url_detector.predictor import URLPredictor


class DetectorRegistry:

    _registry = {

        "email": EmailPredictor,

        "url": URLPredictor,

    }

    @classmethod
    def get_detector(
        cls,
        detector_name
    ):

        detector = cls._registry.get(
            detector_name
        )

        if detector is None:

            raise ValueError(
                f"{detector_name} detector not registered."
            )

        return detector()