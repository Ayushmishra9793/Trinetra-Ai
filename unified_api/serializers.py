# ============================================================
# unified_api/serializers.py
# ------------------------------------------------------------
# Why serializers, not just reading request.POST directly:
# 1. Validation — reject malformed requests BEFORE they hit your
#    ML model or waste an Etherscan/Alchemy API call.
# 2. Security — the extension is an untrusted client. Never trust
#    raw input from a browser extension without validating shape.

# 3. "Initially I only checked that the address started with 0x because it was a prototype. For a production-ready implementation, I would validate the full Ethereum address format (40 hexadecimal characters) to reject malformed inputs before they reach the Web3 APIs."
# ============================================================

from rest_framework import serializers
from .models import ScanRecord
import re


class ScanRequestSerializer(serializers.Serializer):
    """
    Validates the incoming payload from content.js / background.js.
    'url' is always required (passive monitoring stage).
    'wallet_address' is optional (only present once the user clicks
    "Connect Wallet" — the active interception stage).
    """
    url = serializers.URLField(max_length=2048)
    wallet_address = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True
    )

    def validate_wallet_address(self, value):
        if value in (None, ""):
            return value

        if not re.match(r"^0x[a-fA-F0-9]{40}$", value):
            raise serializers.ValidationError(
                "wallet_address must be a valid Ethereum address like 0x followed by 40 hex characters"
            )

        return value


class ScanRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScanRecord
        fields = '__all__'
