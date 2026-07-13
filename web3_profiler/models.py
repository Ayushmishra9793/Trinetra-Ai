from django.db import models


class WalletProfile(models.Model):

    wallet_address = models.CharField(
        max_length=255,
        unique=True
    )

    risk_score = models.FloatField(
        default=0
    )

    risk_status = models.CharField(
        max_length=50,
        default="Unknown"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )


    def __str__(self):
        return self.wallet_address