# ============================================================
# ai_scanner/logic.py  (Member A's file — shown here only as a
# STUB so the backend can be demoed/tested before Member A's
# real .pkl model is ready. Replace get_ai_risk_score() with
# Member A's actual implementation.)
# ============================================================

def get_ai_risk_score(url: str) -> float:
    """
    Placeholder. Real version loads model.pkl and returns a
    0-100 phishing probability based on lexical features.
    """
    suspicious_keywords = ["claim", "airdrop", "verify", "wallet-connect"]
    score = 10.0
    if any(word in url.lower() for word in suspicious_keywords):
        score += 60
    if len(url) > 75:
        score += 15
    return min(score, 100.0)
