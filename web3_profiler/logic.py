from web3 import Web3
import requests

# 1. API Setup (Aapki Alchemy aur Etherscan keys yahan aayengi)
ALCHEMY_URL = "https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
ETHERSCAN_API_KEY = "YOUR_ETHERSCAN_KEY"

# Web3 Node se connect karna
w3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))

def evaluate_web3_address(target_address):
    """
    Trinetra AI: Second Eye (Web3 Profiler)
    Yeh function address check karega aur Risk Score batayega.
    """
    # Step 1: Address to correct formate
    try:
        checksum_address = w3.to_checksum_address(target_address)
    except ValueError:
        return {"risk_level": "CRITICAL", "reason": "Invalid Ethereum Address format."}

    address_code = w3.eth.get_code(checksum_address)
    
    if address_code == b'':
        return {"risk_level": "LOW", "reason": "Standard user wallet detected. No contract logic found."}
    
    etherscan_url = f"https://api.etherscan.io/api?module=contract&action=getabi&address={checksum_address}&apikey={ETHERSCAN_API_KEY}"
    response = requests.get(etherscan_url).json()

    if response['status'] == '1':
        # Status mean status verified and secure
        return {"risk_level": "MEDIUM", "reason": "Verified Smart Contract. Proceed with standard caution."}
    else:
        # Status 0 means headen formate  (Unverified) -> MAXIMUM DANGER
        return {"risk_level": "CRITICAL", "reason": "UNVERIFIED Smart Contract Detected! High risk of drainer script."}

# --- TEST ---
if __name__ == "__main__":
    # Test ke liye ek address
    test_target = "0xdAC17F958D2ee523a2206206994597C13D831ec7" # Tether (USDT) 
    result = evaluate_web3_address(test_target)
    print(result)