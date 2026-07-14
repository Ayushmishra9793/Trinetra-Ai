import os
import requests
from web3 import Web3
from dotenv import load_dotenv

# 1. Load Environment Variables (.env file se data read karne ke liye)
# Django environment se bahar independent test karne ke liye baseline path setup
load_dotenv()

# 2. Fetch Keys Securely
ALCHEMY_URL = os.getenv("ALCHEMY_URL")
ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY")

# Fail-safe check
if not ALCHEMY_URL or not ETHERSCAN_API_KEY:
    raise ValueError("⚠️ ERROR: API Keys missing! Please check your .env file setup.")

# 3. Initialize Web3 Provider
w3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))

def evaluate_web3_address(target_address):
    """
    Trinetra AI: Second Eye (Web3 Profiler Engine)
    Checks for Address Validity, Contract Presence, Source Code Verification, and Burner Wallets.
    """
    # Check 1: Verify Address Format (Checksum Validation)
    try:
        checksum_address = w3.to_checksum_address(target_address)
    except ValueError:
        return {
            "risk_level": "CRITICAL", 
            "reason": "Invalid Ethereum Address format. Suspected malformed threat."
        }

    # Check 2: Node Connection Check
    if not w3.is_connected():
         return {
             "risk_level": "UNKNOWN", 
             "reason": "Blockchain network connection timeout. Unable to verify."
         }

    # Check 3: Differentiate between Normal Wallet (EOA) and Smart Contract
    try:
        address_code = w3.eth.get_code(checksum_address)
    except Exception as e:
        return {
            "risk_level": "UNKNOWN", 
            "reason": f"RPC Node query failed: {str(e)}"
        }
    
    # CASE A: It is a Standard User Wallet (No code deployed on this address)
    if address_code == b'' or address_code.hex() == '0x':
        try:
            balance_wei = w3.eth.get_balance(checksum_address)
            balance_eth = w3.from_wei(balance_wei, 'ether')
            
            # Enhanced Logic: Scammers use fresh burner wallets with 0 ETH to collect assets
            if balance_eth == 0:
                return {
                    "risk_level": "HIGH", 
                    "reason": "Inactive/Burner Wallet detected (0 ETH balance). Highly suspicious for direct phishing transfers."
                }
            else:
                return {
                    "risk_level": "LOW", 
                    "reason": f"Active standard wallet verified with {balance_eth:.4f} ETH balance."
                }
        except Exception:
            return {
                "risk_level": "MEDIUM", 
                "reason": "Standard wallet detected, but failed to fetch balance parameters."
            }
    
# CASE B: It is a Smart Contract (Bytecode exists)
    etherscan_url = f"https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getabi&address={checksum_address}&apikey={ETHERSCAN_API_KEY}"
    
    try:
        response = requests.get(etherscan_url, timeout=5).json()
        
        # FIX: Pehle check karo ki Etherscan API ne koi error toh nahi diya (jaise Invalid API Key)
        if response.get('message') == 'NOTOK':
            return {
                "risk_level": "UNKNOWN",
                "reason": f"Etherscan API Error: {response.get('result')}. Please check API Key in .env"
            }
            
        # Etherscan returns status '1' if the Contract ABI/Source Code is verified
        elif response.get('status') == '1':
            return {
                "risk_level": "MEDIUM", 
                "reason": "Verified Smart Contract detected. Checked via Etherscan directory."
            }
        else:
            # Status '0' means code is unverified/hidden -> MAXIMUM DANGER (Phishing Drainer)
            return {
                "risk_level": "CRITICAL", 
                "reason": "UNVERIFIED Smart Contract detected! The code is hidden. High risk of asset drainer logic."
            }
            
    except requests.exceptions.RequestException:
         return {
             "risk_level": "UNKNOWN", 
             "reason": "External security verification database (Etherscan) unreachable."
         }

# --- LOCAL INDEPENDENT TESTING ---
if __name__ == "__main__":
    print("\n=== TRINETRA AI: RUNNING WEB3 PROFILER TESTING SCRIPT ===")
    
    # Test Case 1: Tether (USDT) Official Verified Smart Contract
    print("\n[TEST 1] Testing Verified Contract (USDT Official Address):")
    usdt_address = "0xdAC17F958D2ee523a2206206994597C13D831ec7" 
    print(evaluate_web3_address(usdt_address))
    
    # Test Case 2: A REAL Empty/Burner Wallet Address (Fixed!)
    print("\n[TEST 2] Testing Burner/Zero Balance Wallet:")
    burner_address = "0x89D24A6b4CcB1B6fAA2625fE562bDD9a23260359" 
    print(evaluate_web3_address(burner_address))
    
    print("\n=========================================================")