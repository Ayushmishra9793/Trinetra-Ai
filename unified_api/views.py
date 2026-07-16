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

import re
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ai_scanner.url_detector.service import scan_url
from ai_scanner.email_detector.service import scan_email
from .models import ScanRecord

# === EXACT IMPORT MATCHING YOUR logic.py ===
from web3_profiler.logic import evaluate_web3_address


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
                "risk_score": float(email_result.risk_score),
                "confidence": float(email_result.confidence),
                "model": email_result.model,
                "explanation": email_result.explanation,
                "metadata": email_result.metadata
            }
            result["email_analysis"] = email_analysis
            risk_scores.append(float(email_result.risk_score))

            ScanRecord.objects.create(
                scan_type="email",
                input_data=email,
                verdict=email_result.label,
                risk_score=float(email_result.risk_score),
                confidence=float(email_result.confidence),
                model_used=email_result.model,
                explanation=email_result.explanation or "",
                metadata=email_result.metadata or {}
            )

        # ==========================================
        # URL SCAN (WEB2 + WEB3 PARALLEL & OVERRIDE)
        # ==========================================
        if url:
            # --- 1. WEB2 SCAN (AI ENGINE) ---
            url_result = scan_url(url)

            # --- 2. WEB3 SCAN (WEBSITE SCRAPING) ---
            web3_report = {
                "status": "SAFE", 
                "message": "No crypto wallet addresses detected.", 
                "threats": []
            }
            
            page_html = ""  
            
            try:
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                page_resp = requests.get(url, headers=headers, timeout=10)
                page_html = page_resp.text
                
                eth_regex = r'0x[a-fA-F0-9]{40}'
                found_addresses = set(re.findall(eth_regex, page_html))
                
                if found_addresses:
                    threat_list = []
                    for address in found_addresses:
                        risk_data = evaluate_web3_address(address)
                        threat_list.append({
                            "wallet_address": address,
                            "risk_analysis": risk_data
                        })
                        
                    web3_report = {
                        "status": "WARNING", 
                        "message": f"Detected {len(found_addresses)} Web3 wallet(s).", 
                        "threats": threat_list
                    }
            except Exception as e:
                web3_report = {"status": "SAFE", "message": "Scraper unavailable.", "threats": []}

            # ==========================================
            # 🚀 STRICT RULE ENGINE (THE MASTER LOGIC)
            # ==========================================
            ai_score = float(url_result.risk_score)
            
            # RULE 1: Wallet Check
            has_wallet = len(web3_report.get("threats", [])) > 0
            
            # RULE 2: Open Redirect Check (URL inside URL)
            has_hidden_url = False
            lower_url = url.lower()
            first_proto = lower_url.find("://")
            if first_proto != -1:
                rest_of_url = lower_url[first_proto + 3:]
                if "http://" in rest_of_url or "https://" in rest_of_url or "%3a%2f%2f" in rest_of_url:
                    has_hidden_url = True

            # RULE 3: Form Detection Check
            has_form = False
            if page_html:
                html_lower = page_html.lower()
                if "<form" in html_lower or "<input" in html_lower:
                    has_form = True

            # 🌟 RULE 4: Trusted Domains (Whitelist)
            # Aap is list mein apni aur bhi trusted sites add kar sakte hain
            TRUSTED_DOMAINS = [
                "google.com", 
                "github.com", 
                "youtube.com", 
                "linkedin.com",
                "hackhalt.org",
                "theangaarbatch.in",
                "adhar.org.in",
                "gov.org",
                ".gov.in",

            ]
            is_trusted = any(domain in lower_url for domain in TRUSTED_DOMAINS)

            # --- DECISION TREE ---
            if has_wallet or has_hidden_url:
                # Sabse khatarnak! Seedha Phishing
                final_label = "PHISHING"
                final_score = 95.0
                
            elif has_form and not is_trusted:
                # Form mila AUR site trusted nahi hai -> Medium Risk
                final_label = "SUSPICIOUS"
                final_score = max(45.0, min(ai_score, 60.0)) 
                
            else:
                # Kuch suspicious nahi mila, YA phir site Trusted hai -> SAFE
                final_label = "SAFE"
                final_score = min(ai_score, 35.0)
                
                # Agar trusted site hai, toh risk score ekdum low (25.0) kar do
                if is_trusted:
                    final_score = min(final_score, 25.0)

            # Apply final scores
            url_analysis = {
                "label": final_label,
                "risk_score": final_score,
                "confidence": float(url_result.confidence)
            }

            result["url_analysis"] = url_analysis
            result["web3_analysis"] = web3_report
            risk_scores.append(final_score)

            ScanRecord.objects.create(
                scan_type="url",
                input_data=url,
                verdict=final_label,
                risk_score=final_score,
                confidence=float(url_result.confidence),
                model_used=url_result.model_used,
                explanation="",
                metadata={"web3": web3_report, "has_form": has_form, "is_trusted": is_trusted} 
            )

        # ==========================================
        # FINAL UNIFIED SCORE
        # ==========================================
        if risk_scores:
            final_score = max(risk_scores)
        else:
            final_score = 0

        result["final_risk_score"] = float(final_score)

        return Response(result, status=status.HTTP_200_OK)


class ScanHistoryView(APIView):
    """
    GET /api/v1/history/
    """
    def get(self, request):
        records = ScanRecord.objects.all().order_by("-id")
        history = []

        for record in records:
            history.append({
                "id": record.id,
                "scan_type": record.scan_type,
                "input_data": record.input_data,
                "verdict": record.verdict,
                "risk_score": record.risk_score,
                "confidence": record.confidence,
                "model_used": record.model_used,
                "explanation": record.explanation,
                "metadata": record.metadata,
                "created_at": record.created_at
            })

        return Response(history, status=status.HTTP_200_OK)