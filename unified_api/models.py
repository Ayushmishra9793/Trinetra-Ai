from django.db import models


class ScanRecord(models.Model):
    STATUS_CHOICES = [
        ('SAFE', 'Safe'),
        ('SUSPICIOUS', 'Suspicious'),
        ('CRITICAL', 'Critical'),
    ]

    url = models.URLField(max_length=2048)
    wallet_address = models.CharField(max_length=100, blank=True, null=True)

    ai_risk_score = models.FloatField(help_text="0-100 score from Member A's ML model")
    web3_risk_status = models.CharField(max_length=20, blank=True, null=True)
    web3_reason = models.TextField(blank=True, null=True)

    unified_threat_score = models.FloatField()
    final_verdict = models.CharField(max_length=20, choices=STATUS_CHOICES)

    gemini_explanation = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.url} -> {self.final_verdict} ({self.unified_threat_score})"