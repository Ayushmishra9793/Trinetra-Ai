from rest_framework.views import APIView

from rest_framework.response import Response


from ai_scanner.url_detector.service import scan_url


from ai_scanner.email_detector.service import scan_email
from .models import ScanRecord




class ScanView(APIView):



    def post(self,request):


        data = request.data



        url = data.get(
            "url"
        )


        email = data.get(
            "email"
        )



        result = {}




        if url:


            url_result = scan_url(
                url
            )


            result["url_analysis"] = {


                "label":
                url_result.label,


                "risk_score":
                url_result.risk_score,


                "confidence":
                url_result.confidence

            }





        if email:


            email_result = scan_email(
                email
            )


        result["email_analysis"] = {

            "label": email_result.label,

            "risk_score": float(
                email_result.risk_score
            ),

            "confidence": float(
                email_result.confidence
            ),

            "model": email_result.model,

            "explanation": email_result.explanation,

            "metadata": email_result.metadata

        }



        risks=[]



        if "url_analysis" in result:

            risks.append(
                result["url_analysis"]["risk_score"]
            )


        if "email_analysis" in result:

            risks.append(
                result["email_analysis"]["risk_score"]
            )



        if risks:


            final_score=max(
                risks
            )


        else:

            final_score=0




        result["final_risk_score"]=final_score




        return Response(
            result
        )
        
class ScanHistoryView(APIView):


    def get(self, request):

        records = ScanRecord.objects.all().order_by(
            "-id"
        )


        history = []


        for record in records:

            history.append(

                {
                    "id": record.id,

                    "url": record.url,

                    "wallet_address": record.wallet_address,

                    "ai_risk_score": record.ai_risk_score,

                    "web3_risk_status": record.web3_risk_status,

                    "unified_threat_score": record.unified_threat_score,

                    "final_verdict": record.final_verdict,

                    "gemini_explanation": record.gemini_explanation

                }

            )

        return Response(
            history
        )