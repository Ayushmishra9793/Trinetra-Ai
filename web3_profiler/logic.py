# ============================================================
# web3_profiler/logic.py  (Member B's file — STUB for demo/testing
# purposes. Replace get_wallet_risk() with Member B's real
# Etherscan/Alchemy-backed implementation.)
# ============================================================

def get_wallet_risk(address: str) -> dict:
    """
    Placeholder. Real version checks Etherscan (contract verified?)
    and Alchemy (wallet age, tx count) then returns a heuristic score.
    """
    if not address:
        return None

    # Fake heuristic just for demo wiring:
    risk_points = 0
    if address.lower().endswith("dead"):
        risk_points = 90

    status = "SAFE"
    if risk_points >= 70:
        status = "CRITICAL"
    elif risk_points >= 40:
        status = "SUSPICIOUS"

    return {
        "wallet_status": status,
        "reason": "Unverified contract, wallet created recently" if risk_points >= 70 else "No red flags",
        "risk_points": risk_points,
    }
