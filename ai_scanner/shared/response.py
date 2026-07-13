"""
============================================================
Prediction Response Schema

Every detector returns THIS object.

Email

↓

PredictionResponse

URL

↓

PredictionResponse

Wallet

↓

PredictionResponse

Website

↓

PredictionResponse

This keeps the architecture consistent.
============================================================
"""

from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class PredictionResponse:

    scan_type: str

    label: str

    risk_score: float

    confidence: float

    model: str

    explanation: str | None = None

    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self):

        return {

            "scan_type": self.scan_type,

            "label": self.label,

            "risk_score": self.risk_score,

            "confidence": self.confidence,

            "model": self.model,

            "explanation": self.explanation,

            "metadata": self.metadata

        }