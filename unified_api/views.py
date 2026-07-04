# ============================================================
# unified_api/views.py
# ------------------------------------------------------------
# THIS is the /api/v1/scan/ endpoint the Chrome extension talks to.
# It is the single point where everyone's work meets:
#   - Member A's ai_scanner.logic
#   - Member B's web3_profiler.logic
#   - The correlation_engine (this section)
#   - The gemini_service (this section)
# ============================================================

import concurrent.futures

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ai_scanner.logic import get_ai_risk_score
from web3_profiler.logic import get_wallet_risk

from .serializers import ScanRequestSerializer, ScanRecordSerializer
from .models import ScanRecord
from .services.correlation_engine import compute_unified_threat_score
from .services.gemini_service import generate_explanation


class ScanView(APIView):
    """
    POST /api/v1/scan/
    Body: { "url": "...", "wallet_address": "0x..." (optional) }
    """

    def post(self, request):
        serializer = ScanRequestSerializer(data=request.data)
        if not serializer.is_valid():
            # Fail fast on bad input — never let garbage reach the
            # ML model or waste an external API call.
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        url = serializer.validated_data["url"]
        wallet_address = serializer.validated_data.get("wallet_address")

        # ------------------------------------------------------------
        # WHY concurrent.futures here:
        # The workflow diagram says the AI scan and the Web3 scan run
        # "simultaneously". If we called them one after another
        # (sequentially), the user waits for BOTH network round trips
        # (Etherscan/Alchemy) AND the ML inference back-to-back.
        # Running them in parallel threads means total latency is
        # roughly max(ai_time, web3_time) instead of ai_time + web3_time.
        # This matters a lot here because the user is actively waiting
        # to connect their wallet — every extra millisecond of lag is
        # a worse user experience and a bigger temptation to just
        # click through the warning.
        # ------------------------------------------------------------
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            ai_future = executor.submit(get_ai_risk_score, url)
            web3_future = executor.submit(get_wallet_risk, wallet_address)

            ai_risk_score = ai_future.result()
            web3_result = web3_future.result()

        correlation = compute_unified_threat_score(ai_risk_score, web3_result)

        gemini_text = generate_explanation(
            correlation["unified_score"], correlation["verdict"], correlation["reason"]
        )

        # Persist for the audit trail / dashboard
        record = ScanRecord.objects.create(
            url=url,
            wallet_address=wallet_address,
            ai_risk_score=ai_risk_score,
            web3_risk_status=web3_result.get("wallet_status") if web3_result else None,
            web3_reason=web3_result.get("reason") if web3_result else None,
            unified_threat_score=correlation["unified_score"],
            final_verdict=correlation["verdict"],
            gemini_explanation=gemini_text,
        )

        # This exact JSON shape is what content.js (Member D) parses
        # to decide whether to throw up the Red Screen of Death.
        return Response(
            {
                "verdict": correlation["verdict"],
                "unified_score": correlation["unified_score"],
                "ai_risk_score": ai_risk_score,
                "web3_result": web3_result,
                "explanation": gemini_text,
            },
            status=status.HTTP_200_OK,
        )


class ScanHistoryView(APIView):
    """
    GET /api/v1/history/
    Bonus endpoint — not in the original doc, but useful for a
    dashboard slide: shows the last 20 scans stored in the DB.
    """

    def get(self, request):
        records = ScanRecord.objects.all()[:20]
        serializer = ScanRecordSerializer(records, many=True)
        return Response(serializer.data)