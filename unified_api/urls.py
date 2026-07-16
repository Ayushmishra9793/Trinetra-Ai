from django.urls import path
from .views import ScanView, ScanHistoryView

urlpatterns = [
    path("scan/", ScanView.as_view(), name="scan"),
    path("history/", ScanHistoryView.as_view(), name="history"),
]