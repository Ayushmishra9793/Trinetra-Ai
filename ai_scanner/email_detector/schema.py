from dataclasses import dataclass


@dataclass
class PredictionResponse:

    label: str

    risk_score: float

    confidence: float

    model_used: str