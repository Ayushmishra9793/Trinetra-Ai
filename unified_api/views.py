"""
============================================================
Unified API Views

Responsibilities
----------------
1. Receive scan requests
2. Trigger AI detectors
3. Store scan history
4. Return unified response

Supported Scans:
- Email
- URL

Architecture:

Client
  |
Unified API
  |
  +---- Email Detector
  |
  +---- URL Detector
  |
ScanRecord Database
============================================================
"""


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


from ai_scanner.url_detector.service import scan_url
from ai_scanner.email_detector.service import scan_email


from .models import ScanRecord





class ScanView(APIView):
    """
    Main Threat Scan API.

    POST /api/v1/scan/
    """



    def post(self, request):


        data = request.data


        url = data.get("url")

        email = data.get("email")



        result = {}

        risk_scores = []



        # ==========================================
        # EMAIL SCAN
        # ==========================================

        if email:


            email_result = scan_email(email)



            email_analysis = {


                "label": email_result.label,


                "risk_score": float(
                    email_result.risk_score
                ),


                "confidence": float(
                    email_result.confidence
                ),


                "model": email_result.model,


                "explanation":
                email_result.explanation,


                "metadata":
                email_result.metadata

            }



            result["email_analysis"] = email_analysis



            risk_scores.append(
                float(email_result.risk_score)
            )



            # Save Email History

            ScanRecord.objects.create(

                scan_type="email",

                input_data=email,

                verdict=email_result.label,

                risk_score=float(
                    email_result.risk_score
                ),

                confidence=float(
                    email_result.confidence
                ),

                model_used=email_result.model,

                explanation=email_result.explanation or "",

                metadata=email_result.metadata or {}

            )





        # ==========================================
        # URL SCAN
        # ==========================================

        if url:


            url_result = scan_url(url)



            url_analysis = {


                "label":
                url_result.label,


                "risk_score":
                float(url_result.risk_score),


                "confidence":
                float(url_result.confidence)

            }



            result["url_analysis"] = url_analysis



            risk_scores.append(

                float(
                    url_result.risk_score
                )

            )



            # Save URL History

            ScanRecord.objects.create(

                scan_type="url",

                input_data=url,

                verdict=url_result.label,

                risk_score=float(
                    url_result.risk_score
                ),

                confidence=float(
                    url_result.confidence
                ),

                model_used=url_result.model_used,

                explanation="",

                metadata={}

            )





        # ==========================================
        # FINAL UNIFIED SCORE
        # ==========================================

        if risk_scores:


            final_score = max(
                risk_scores
            )


        else:


            final_score = 0




        result["final_risk_score"] = float(
            final_score
        )



        return Response(

            result,

            status=status.HTTP_200_OK

        )







class ScanHistoryView(APIView):

    """
    GET /api/v1/history/
    """



    def get(self, request):


        records = ScanRecord.objects.all().order_by(
            "-id"
        )



        history = []



        for record in records:


            history.append({


                "id":
                record.id,


                "scan_type":
                record.scan_type,


                "input_data":
                record.input_data,


                "verdict":
                record.verdict,


                "risk_score":
                record.risk_score,


                "confidence":
                record.confidence,


                "model_used":
                record.model_used,


                "explanation":
                record.explanation,


                "metadata":
                record.metadata,


                "created_at":
                record.created_at

            })



        return Response(

            history,

            status=status.HTTP_200_OK

        )