# ============================================================
# unified_api/services/gemini_service.py
# ------------------------------------------------------------
# NOTE: the old `google-generativeai` package is fully deprecated
# (Google ended all support for it). This uses the current
# official `google-genai` SDK instead. Model used: gemini-3.5-flash-lite
# — cheap, fast, stable GA model, good fit for a one-sentence warning.
#
# WHY we only call Gemini when the score is already risky:
# Gemini calls cost money and add latency (network round trip).
# There is no value in generating an explanation for a SAFE site,
# so we skip the call entirely — this is a deliberate cost/latency
# optimization, worth mentioning in your presentation.
# ============================================================

from google import genai
from django.conf import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)


def generate_explanation(unified_score: float, verdict: str, reason: str) -> str:
    """
    Calls Gemini to turn raw scores into a single plain-English
    warning sentence for the "Red Screen of Death" the frontend
    (Member D) displays to the end user.
    """
    if verdict == "SAFE":
        return "No threats detected. This site and wallet appear safe."

    prompt = (
        "Act as a Web3 security tool speaking directly to a non-technical user. "
        f"The unified threat score is {unified_score}/100 (verdict: {verdict}). "
        f"Technical reason: {reason}. "
        "Write exactly ONE short, urgent, plain-English warning sentence "
        "explaining why they should not proceed. No jargon, no disclaimers."
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        # TEMP DEBUG — remove this print once you've found the issue
        print("GEMINI ERROR:", repr(e))
        # FAIL-SAFE DESIGN: if Gemini is down or the API key is
        # exhausted, we must NOT crash the whole scan pipeline —
        # security tooling should degrade gracefully, not fail open
        # silently. We fall back to a generic but still useful warning.
        return (
            f"Warning: this site/wallet was flagged as {verdict} "
            f"(score {unified_score}/100). Reason: {reason}."
        )