# ============================================================
# unified_api/urls.py
# ============================================================

from django.urls import path
from .views import ScanView, ScanHistoryView

urlpatterns = [
    path('v1/scan/', ScanView.as_view(), name='scan'),
    path('v1/history/', ScanHistoryView.as_view(), name='scan-history'),
]
