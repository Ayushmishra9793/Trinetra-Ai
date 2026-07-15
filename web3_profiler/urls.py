from django.urls import path
from .views import scan_url_web3_api

urlpatterns = [
    path('scan/', scan_url_web3_api),
]