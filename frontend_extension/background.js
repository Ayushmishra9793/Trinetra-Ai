// ============================================================
// TRINETRA AI — background.js
// Zero Trust Web3 Security Shield
// Responsibility: Tab detection, backend communication,
// message routing between content.js and popup.js
// ============================================================

// ------------------------------------------------------------
// 1. CONSTANTS & CONFIGURATION
// ------------------------------------------------------------

// TODO: Backend team (unified_api) se final base URL confirm karo.
// Development ke liye localhost, production ke liye actual domain.
const CONFIG = {
  BACKEND_BASE_URL: "http://localhost:8000/api", // TODO: update for production
  ENDPOINTS: {
    SCAN_URL: "/scan/url/",        // TODO: confirm exact path from unified_api team
    SCAN_WALLET: "/scan/wallet/",  // TODO: confirm exact path from unified_api team
  },
  STORAGE_KEY_PREFIX: "trinetra_scan_",
  RISK_LEVELS: {
    SAFE: "SAFE",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
  },
  BADGE_COLORS: {
    SAFE: "#2ecc71",
    LOW: "#f1c40f",
    MEDIUM: "#e67e22",
    HIGH: "#e74c3c",
    CRITICAL: "#8e0000",
  },
  FETCH_TIMEOUT_MS: 10000, // 10 seconds - agar backend slow ho to request cancel karo
};

// Sirf http/https URLs scan karenge, chrome:// ya extension:// pages skip honge
const VALID_URL_PATTERN = /^https?:\/\//i;

console.log("[Trinetra AI] background.js service worker loaded.");

// ------------------------------------------------------------
// 2. EXTENSION INSTALLATION LISTENER
// ------------------------------------------------------------

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[Trinetra AI] Extension installed/updated. Reason:", details.reason);

  if (details.reason === "install") {
    // Fresh install - default settings initialize karo
    chrome.storage.local.set({
      trinetra_settings: {
        autoScanEnabled: true,
        notificationsEnabled: true,
      },
    });
    console.log("[Trinetra AI] Default settings initialized.");
  }
});

// ------------------------------------------------------------
// 3. URL VALIDATION HELPER
// ------------------------------------------------------------

/**
 * Check karta hai ki URL scan karne layak hai ya nahi.
 * chrome://, extension pages, local files ko skip karte hain.
 */
function isValidUrlForScanning(url) {
  if (!url) return false;
  if (!VALID_URL_PATTERN.test(url)) return false;

  // Chrome ke internal pages skip karo
  const blockedPrefixes = ["chrome://", "chrome-extension://", "about:", "edge://"];
  return !blockedPrefixes.some((prefix) => url.startsWith(prefix));
}

// ------------------------------------------------------------
// 4. STORAGE HELPER FUNCTIONS
// ------------------------------------------------------------

/**
 * Ek tab ke scan result ko chrome.storage.local mein save karta hai.
 * Key format: trinetra_scan_<tabId>
 */
async function saveScanResult(tabId, resultData) {
  const key = `${CONFIG.STORAGE_KEY_PREFIX}${tabId}`;
  try {
    await chrome.storage.local.set({ [key]: resultData });
    console.log(`[Trinetra AI] Scan result saved for tab ${tabId}:`, resultData);
  } catch (error) {
    console.error("[Trinetra AI] Failed to save scan result:", error);
  }
}

/**
 * Ek tab ka saved scan result read karta hai.
 */
async function getScanResult(tabId) {
  const key = `${CONFIG.STORAGE_KEY_PREFIX}${tabId}`;
  try {
    const data = await chrome.storage.local.get(key);
    return data[key] || null;
  } catch (error) {
    console.error("[Trinetra AI] Failed to read scan result:", error);
    return null;
  }
}

// ------------------------------------------------------------
// 5. BACKEND COMMUNICATION (fetch with timeout + error handling)
// ------------------------------------------------------------

/**
 * Generic helper jo fetch() ko timeout aur error handling ke saath wrap karta hai.
 * Isse har jagah try/catch + timeout logic repeat nahi karni padti.
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Backend returned status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timed out - backend not responding.");
    }
    throw error;
  }
}

/**
 * URL ko Django backend (ai_scanner via unified_api) ko bhejta hai
 * aur website risk score wapas laata hai.
 */
async function scanUrlWithBackend(url) {
  const endpoint = `${CONFIG.BACKEND_BASE_URL}${CONFIG.ENDPOINTS.SCAN_URL}`;

  // TODO: Confirm exact request payload structure with backend team
  const requestBody = {
    url: url,
    timestamp: new Date().toISOString(),
    source: "chrome_extension",
  };

  try {
    const data = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
      CONFIG.FETCH_TIMEOUT_MS
    );
    console.log("[Trinetra AI] URL scan response:", data);
    return data;
  } catch (error) {
    console.error("[Trinetra AI] URL scan failed:", error.message);
    // Consistent error shape return karo taaki calling code crash na ho
    return {
      status: "error",
      error_message: error.message,
      risk_level: null,
    };
  }
}

/**
 * Wallet/contract address ko Django backend (web3_profiler via unified_api)
 * ko bhejta hai aur wallet risk score wapas laata hai.
 */
async function scanWalletWithBackend(url, walletAddress, contractAddress) {
  const endpoint = `${CONFIG.BACKEND_BASE_URL}${CONFIG.ENDPOINTS.SCAN_WALLET}`;

  // TODO: Confirm exact request payload structure with backend team
  const requestBody = {
    url: url,
    wallet_address: walletAddress || null,
    contract_address: contractAddress || null,
    source: "chrome_extension",
  };

  try {
    const data = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
      CONFIG.FETCH_TIMEOUT_MS
    );
    console.log("[Trinetra AI] Wallet scan response:", data);
    return data;
  } catch (error) {
    console.error("[Trinetra AI] Wallet scan failed:", error.message);
    return {
      status: "error",
      error_message: error.message,
      risk_level: null,
    };
  }
}

// ------------------------------------------------------------
// 6. BADGE UPDATE LOGIC
// ------------------------------------------------------------

/**
 * Toolbar icon ka badge update karta hai risk level ke hisaab se.
 * Example: CRITICAL hone par red badge "!" dikhega.
 */
async function updateBadge(tabId, riskLevel) {
  if (!riskLevel || !CONFIG.BADGE_COLORS[riskLevel]) {
    // Unknown/no risk - badge clear karo
    await chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }

  const badgeText =
    riskLevel === CONFIG.RISK_LEVELS.CRITICAL || riskLevel === CONFIG.RISK_LEVELS.HIGH
      ? "!"
      : "";

  await chrome.action.setBadgeText({ tabId, text: badgeText });
  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: CONFIG.BADGE_COLORS[riskLevel],
  });

  console.log(`[Trinetra AI] Badge updated for tab ${tabId}: ${riskLevel}`);
}

// ------------------------------------------------------------
// 7. MAIN SCAN ORCHESTRATION (URL scan → save → badge → notify)
// ------------------------------------------------------------

/**
 * Ek tab ke liye poora scan process chalata hai:
 * URL scan -> result save -> badge update -> agar CRITICAL to content.js ko batao
 */
async function handleTabScan(tabId, url) {
  if (!isValidUrlForScanning(url)) {
    console.log(`[Trinetra AI] Skipping invalid/internal URL: ${url}`);
    return;
  }

  console.log(`[Trinetra AI] Scanning URL for tab ${tabId}: ${url}`);

  const result = await scanUrlWithBackend(url);

  // Result mein tab/url context bhi add kar dete hain, popup.js ke liye useful hoga
  const enrichedResult = {
    ...result,
    scanned_url: url,
    scanned_at: new Date().toISOString(),
  };

  await saveScanResult(tabId, enrichedResult);
  await updateBadge(tabId, result.risk_level);

  // Agar risk CRITICAL hai, content.js ko bolo fullscreen overlay dikhao
  if (result.risk_level === CONFIG.RISK_LEVELS.CRITICAL) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "SHOW_CRITICAL_WARNING",
        payload: enrichedResult,
      });
    } catch (error) {
      // content.js abhi tak inject nahi hua ho sakta - safe to ignore
      console.warn("[Trinetra AI] Could not message content.js (may not be ready yet):", error.message);
    }
  }
}

// ------------------------------------------------------------
// 8. TAB UPDATE LISTENER (Active tab detection)
// ------------------------------------------------------------

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Sirf tab jab poora load ho jaye (status === "complete") tabhi scan karo
  // Isse duplicate/incomplete scans avoid hote hain
  if (changeInfo.status === "complete" && tab.url) {
    handleTabScan(tabId, tab.url).catch((error) => {
      console.error("[Trinetra AI] Unexpected error in handleTabScan:", error);
    });
  }
});

// Optional: jab user tab switch kare (activate), tab bhi latest data check ho sake
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    console.log(`[Trinetra AI] Tab activated: ${tab.url}`);
    // Note: Yahan dobara scan nahi kar rahe, sirf log kar rahe hain.
    // Agar cached result chahiye popup ke liye, wo already storage mein hai.
  } catch (error) {
    console.error("[Trinetra AI] Error getting activated tab info:", error);
  }
});

// ------------------------------------------------------------
// 9. MESSAGE PASSING — content.js aur popup.js dono se
// ------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Trinetra AI] Message received:", message, "from:", sender);

  // -------- Case A: content.js ne wallet/contract address bheja --------
  if (message.type === "WALLET_DETECTED") {
    const { walletAddress, contractAddress, url } = message.payload || {};
    const tabId = sender.tab?.id;

    if (!tabId) {
      sendResponse({ status: "error", error_message: "No tab ID found in sender." });
      return false;
    }

    // Async work karna hai, isliye true return karenge (neeche explain kiya hai)
    (async () => {
      const walletResult = await scanWalletWithBackend(url, walletAddress, contractAddress);

      // Existing scan result ke saath merge karo
      const existingResult = (await getScanResult(tabId)) || {};
      const mergedResult = {
        ...existingResult,
        wallet_risk_score: walletResult.wallet_risk_score ?? null,
        wallet_risk_level: walletResult.risk_level ?? null,
        unified_threat_score:
          walletResult.unified_threat_score ?? existingResult.unified_threat_score ?? null,
        ai_explanation: walletResult.ai_explanation ?? existingResult.ai_explanation ?? null,
      };

      await saveScanResult(tabId, mergedResult);
      await updateBadge(tabId, walletResult.risk_level || existingResult.risk_level);

      if (walletResult.risk_level === CONFIG.RISK_LEVELS.CRITICAL) {
        chrome.tabs.sendMessage(tabId, {
          type: "SHOW_CRITICAL_WARNING",
          payload: mergedResult,
        }).catch((error) => {
          console.warn("[Trinetra AI] Could not send critical warning to content.js:", error.message);
        });
      }

      sendResponse({ status: "success", data: mergedResult });
    })();

    return true; // async response ke liye channel open rakho
  }

  // -------- Case B: popup.js ne current tab ka scan result maanga --------
  if (message.type === "GET_SCAN_RESULT") {
    const tabId = message.payload?.tabId;

    if (!tabId) {
      sendResponse({ status: "error", error_message: "tabId is required." });
      return false;
    }

    (async () => {
      const result = await getScanResult(tabId);
      sendResponse({ status: "success", data: result });
    })();

    return true; // async response
  }

  // -------- Case C: popup.js ne manual re-scan request kiya --------
  if (message.type === "MANUAL_RESCAN") {
    const tabId = message.payload?.tabId;
    const url = message.payload?.url;

    if (!tabId || !url) {
      sendResponse({ status: "error", error_message: "tabId and url required." });
      return false;
    }

    (async () => {
      await handleTabScan(tabId, url);
      const result = await getScanResult(tabId);
      sendResponse({ status: "success", data: result });
    })();

    return true;
  }

  // Unknown message type
  console.warn("[Trinetra AI] Unknown message type received:", message.type);
  return false;
});

console.log("[Trinetra AI] background.js fully initialized and listening.");