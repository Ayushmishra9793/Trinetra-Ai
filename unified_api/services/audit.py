"""
Audit Service

Stores every scan in database.

Future:

SIEM

SOC Dashboard

Analytics

Threat Hunting
"""

from unified_api.models import ScanRecord


class AuditService:

    @staticmethod

    def save(

        scan_type,

        data,

        prediction

    ):

        return ScanRecord.objects.create(

            scan_type=scan_type,

            input_data=data,

            verdict=prediction.label,

            risk_score=prediction.risk_score,

            confidence=prediction.confidence,

            model_used=prediction.model,

            explanation=prediction.explanation,

            metadata=prediction.metadata

        )