from django.urls import path
from .views import Web3ScanView

urlpatterns = [
    path('scan/', Web3ScanView.as_view()),
]