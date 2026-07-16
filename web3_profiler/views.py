from django.shortcuts import render

# Create your views here.
"""
=========================================================
Web3 Profiler Views (Standalone API)
=========================================================
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .logic import evaluate_web3_address

class Web3ScanView(APIView):
    """
    POST /api/v1/web3/scan/
    Accepts a wallet address and returns the risk profile.
    """
    def post(self, request):
        wallet_address = request.data.get("wallet_address")
        
        if not wallet_address:
            return Response(
                {"status": "ERROR", "message": "wallet_address parameter is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Call your killer Web3 logic
        try:
            result = evaluate_web3_address(wallet_address)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"status": "ERROR", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )