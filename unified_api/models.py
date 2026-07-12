from django.db import models


class ScanRecord(models.Model):

    SCAN_TYPES=(

        ("email","Email"),

        ("url","URL"),

        ("wallet","Wallet"),

        ("website","Website"),

    )


    scan_type=models.CharField(

        max_length=20,

        choices=SCAN_TYPES

    )


    input_data=models.TextField()


    verdict=models.CharField(

        max_length=50

    )


    risk_score=models.FloatField()


    confidence=models.FloatField()


    model_used=models.CharField(

        max_length=100

    )


    explanation=models.TextField(

        blank=True

    )


    metadata=models.JSONField(

        default=dict

    )


    created_at=models.DateTimeField(

        auto_now_add=True

    )


    updated_at=models.DateTimeField(

        auto_now=True

    )


    class Meta:

        ordering=["-created_at"]

        verbose_name="Threat Scan"

        verbose_name_plural="Threat Scans"


    def __str__(self):

        return f"{self.scan_type} | {self.verdict}"