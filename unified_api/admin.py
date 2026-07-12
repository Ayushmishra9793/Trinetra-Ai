from django.contrib import admin

from .models import ScanRecord


@admin.register(ScanRecord)
class ScanRecordAdmin(admin.ModelAdmin):

    list_display = (

        "id",

        "scan_type",

        "verdict",

        "risk_score",

        "confidence",

        "created_at",

    )

    search_fields = (

        "scan_type",

        "verdict",

        "input_data",

    )

    list_filter = (

        "scan_type",

        "verdict",

    )

    ordering = (

        "-created_at",

    )