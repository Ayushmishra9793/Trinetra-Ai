"""
=========================================================
Trinetra AI: Web3 Engine Live Test
=========================================================
"""
import os
from dotenv import load_dotenv

# Apni Django app ki logic file se main function import kar rahe hain
from web3_profiler.logic import evaluate_web3_address

# Load Environment Variables
load_dotenv()

def test_trinetra_web3():
    print("\n" + "="*70)
    print("🚀 TRINETRA AI: WEB3 ENGINE LIVE TEST")
    print("="*70)

    # ---------------------------------------------------------
    # TEST 1: USDT Official Verified Smart Contract
    # ---------------------------------------------------------
    print("\n[TEST 1] Scanning Verified Contract (USDT)...")
    usdt_address = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    
    try:
        result1 = evaluate_web3_address(usdt_address)
        print("✅ WEB3 SCAN SUCCESSFUL!")
        print(f"   -> Target Address: {usdt_address}")
        print(f"   -> Status:         {result1.get('status')}")
        print(f"   -> Risk Score:     {result1.get('risk_score')}")
        print(f"   -> Details:        {result1.get('message')}")
    except Exception as e:
        print(f"\n❌ WEB3 SCAN FAILED: {str(e)}")

    # ---------------------------------------------------------
    # TEST 2: Burner / Zero Balance Wallet
    # ---------------------------------------------------------
    print("\n" + "-"*70)
    print("[TEST 2] Scanning Burner/Zero Balance Wallet...")
    burner_address = "0x32Be343B94f860124dC4fEe278FDCBD38C102D88"
    
    try:
        result2 = evaluate_web3_address(burner_address)
        print("✅ WEB3 SCAN SUCCESSFUL!")
        print(f"   -> Target Address: {burner_address}")
        print(f"   -> Status:         {result2.get('status')}")
        print(f"   -> Risk Score:     {result2.get('risk_score')}")
        print(f"   -> Details:        {result2.get('message')}")
    except Exception as e:
        print(f"\n❌ WEB3 SCAN FAILED: {str(e)}")

    print("\n" + "="*70)
    print("🎯 WEB3 TESTING COMPLETE")
    print("="*70 + "\n")

if __name__ == "__main__":
    test_trinetra_web3()