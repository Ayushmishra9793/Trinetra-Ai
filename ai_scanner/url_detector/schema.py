from dataclasses import dataclass



@dataclass
class URLPredictionResponse:


    label:str

    risk_score:float

    confidence:float

    url:str

    model_used:str