"""
=========================================================
Web3 Profiler Logic
Analyzes Ethereum/Crypto wallet addresses for risk.
=========================================================
"""
import os
import requests
from web3 import Web3
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()

ALCHEMY_URL = os.getenv("ALCHEMY_URL")
ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY")

if not ALCHEMY_URL or not ETHERSCAN_API_KEY:
    raise ValueError("⚠️ ERROR: API Keys missing! Please check your .env file setup.")

w3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))

def evaluate_web3_address(target_address):
    """
    Trinetra AI: Second Eye (Web3 Profiler Engine)
    Checks for Address Validity, Contract Presence, Source Code Verification, and Burner Wallets.
    Returns: dict with 'status', 'risk_score', and 'message'
    """
    try:
        checksum_address = w3.to_checksum_address(target_address)
    except ValueError:
        return {
            "status": "PHISHING", 
            "risk_score": 95.0, 
            "message": "Invalid Ethereum Address format. Suspected malformed threat."
        }

    if not w3.is_connected():
         return {
             "status": "UNKNOWN", 
             "risk_score": 0.0, 
             "message": "Blockchain network connection timeout. Unable to verify."
         }

    try:
        address_code = w3.eth.get_code(checksum_address)
    except Exception as e:
        return {
            "status": "UNKNOWN", 
            "risk_score": 0.0, 
            "message": f"RPC Node query failed: {str(e)}"
        }
    
    # CASE A: Standard User Wallet (EOA)
    if address_code == b'' or address_code.hex() == '0x':
        try:
            balance_wei = w3.eth.get_balance(checksum_address)
            # FIX: Converted to float aur Dust Balance check (< 0.01) add kiya
            balance_eth = float(w3.from_wei(balance_wei, 'ether'))
            
            if balance_eth < 0.01:
                return {
                    "status": "SUSPICIOUS", 
                    "risk_score": 80.0, 
                    "message": f"Low balance / Burner Wallet detected ({balance_eth:.4f} ETH). Highly suspicious for direct phishing transfers."
                }
            else:
                return {
                    "status": "SAFE", 
                    "risk_score": 10.0, 
                    "message": f"Active standard wallet verified with {balance_eth:.4f} ETH balance."
                }
        except Exception:
            return {
                "status": "WARNING", 
                "risk_score": 50.0, 
                "message": "Standard wallet detected, but failed to fetch balance parameters."
            }
    
    # CASE B: Smart Contract
    etherscan_url = f"https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getabi&address={checksum_address}&apikey={ETHERSCAN_API_KEY}"
    
    try:
        response = requests.get(etherscan_url, timeout=5).json()
        
        if response.get('message') == 'NOTOK':
            return {
                "status": "UNKNOWN",
                "risk_score": 0.0,
                "message": f"Etherscan API Error: {response.get('result')}. Please check API Key."
            }
            
        elif response.get('status') == '1':
            return {
                "status": "SAFE", 
                "risk_score": 20.0, 
                "message": "Verified Smart Contract detected. Checked via Etherscan directory."
            }
        else:
            return {
                "status": "PHISHING", 
                "risk_score": 95.0, 
                "message": "UNVERIFIED Smart Contract detected! The code is hidden. High risk of asset drainer logic."
            }
            
    except requests.exceptions.RequestException:
         return {
             "status": "UNKNOWN", 
             "risk_score": 0.0, 
             "message": "External security verification database (Etherscan) unreachable."
         }

# --- LOCAL INDEPENDENT TESTING ---
if __name__ == "__main__":
    print("\n=== TRINETRA AI: RUNNING WEB3 PROFILER TESTING SCRIPT ===")
    
    print("\n[TEST 1] Testing Verified Contract (USDT Official Address):")
    usdt_address = "0xdAC17F958D2ee523a2206206994597C13D831ec7" 
    print(evaluate_web3_address(usdt_address))
    
    print("\n[TEST 2] Testing Burner/Zero Balance Wallet:")
    # Real burner wallet address for proper testing!
    burner_address = "0x32Be343B94f860124dC4fEe278FDCBD38C102D88" 
    print(evaluate_web3_address(burner_address))
    
    print("\n=========================================================")