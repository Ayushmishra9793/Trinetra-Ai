"""
=========================================================
Serializers

Responsible for:

1. Validate Request
2. Convert Model -> JSON
=========================================================
"""

from rest_framework import serializers

from .models import ScanRecord


class ScanRequestSerializer(serializers.Serializer):

    scan_type = serializers.ChoiceField(

        choices=[

            "email",

            "url",

            "wallet",

            "website"

        ]

    )

    data = serializers.CharField()


class ScanRecordSerializer(serializers.ModelSerializer):

    class Meta:

        model = ScanRecord

        fields = "__all__"