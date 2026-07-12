from rest_framework.views import APIView

from rest_framework.response import Response


from ai_scanner.url_detector.service import scan_url


from ai_scanner.email_detector.service import scan_email





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


                "label":
                email_result.label,


                "risk_score":
                email_result.risk_score,


                "confidence":
                email_result.confidence

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