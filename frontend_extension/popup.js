// ============================================================
// TRINETRA AI — popup.js
// Zero Trust Web3 Security Shield
// Responsibility: Fetch scan result from background.js and
// render it into popup.html. No business logic, no direct
// backend calls — display + interaction layer only.
// ============================================================

// ------------------------------------------------------------
// 1. DOM ELEMENT REFERENCES (cached once, popup ke lifetime ke liye)
// ------------------------------------------------------------

const elements = {
  connectionDot: document.getElementById("connection-dot"),

  emptyState: document.getElementById("empty-state"),
  loadingState: document.getElementById("loading-state"),
  errorState: document.getElementById("error-state"),
  errorMessage: document.getElementById("error-message"),
  resultsView: document.getElementById("results-view"),

  currentUrl: document.getElementById("current-url"),

  verdictCard: document.getElementById("verdict-card"),
  verdictIcon: document.getElementById("verdict-icon"),
  verdictLabel: document.getElementById("verdict-label"),
  verdictSub: document.getElementById("verdict-sub"),

  scoreNumber: document.getElementById("score-number"),
  scoreBarFill: document.getElementById("score-bar-fill"),

  web2Pill: document.getElementById("web2-pill"),
  web2Https: document.getElementById("web2-https"),
  web2UrlRisk: document.getElementById("web2-url-risk"),

  web3Pill: document.getElementById("web3-pill"),
  web3WalletAge: document.getElementById("web3-wallet-age"),
  web3Contract: document.getElementById("web3-contract"),

  aiExplanation: document.getElementById("ai-explanation"),
  recommendationText: document.getElementById("recommendation-text"),
  lastScanTime: document.getElementById("last-scan-time"),

  scanAgainBtn: document.getElementById("scan-again-btn"),
  versionText: document.getElementById("version-text"),
};

// ------------------------------------------------------------
// 2. CONSTANTS
// ------------------------------------------------------------

// Backend/background.js ke risk_level strings ko humare CSS
// data-level attributes ke saath map karta hai (lowercase).
const RISK_LEVEL_MAP = {
  SAFE: { level: "safe", icon: "✓", label: "SAFE" },
  LOW: { level: "low", icon: "ℹ", label: "LOW RISK" },
  MEDIUM: { level: "medium", icon: "!", label: "MEDIUM RISK" },
  HIGH: { level: "high", icon: "⚠", label: "HIGH RISK" },
  CRITICAL: { level: "critical", icon: "⛔", label: "CRITICAL" },
};

const SCORE_ANIMATION_DURATION_MS = 700;

// ------------------------------------------------------------
// 3. STATE VIEW SWITCHER
// ------------------------------------------------------------

/**
 * Sirf ek state panel dikhata hai, baaki sab hide karta hai.
 * "empty" | "loading" | "results" | "error"
 */
function showState(stateName) {
  elements.emptyState.hidden = stateName !== "empty";
  elements.loadingState.hidden = stateName !== "loading";
  elements.resultsView.hidden = stateName !== "results";
  elements.errorState.hidden = stateName !== "error";
}

// ------------------------------------------------------------
// 4. GET CURRENT ACTIVE TAB
// ------------------------------------------------------------

/**
 * Current window ke active tab ki info leke aata hai.
 * Returns null agar koi tab na mile (edge case).
 */
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

// ------------------------------------------------------------
// 5. MESSAGE HELPERS — background.js se baat karna
// ------------------------------------------------------------

/**
 * Background.js ko "GET_SCAN_RESULT" message bhejta hai
 * aur uska response wapas laata hai.
 */
async function requestScanResult(tabId) {
  return chrome.runtime.sendMessage({
    type: "GET_SCAN_RESULT",
    payload: { tabId },
  });
}

/**
 * Background.js ko "MANUAL_RESCAN" message bhejta hai
 * (Scan Again button ke liye).
 */
async function requestManualRescan(tabId, url) {
  return chrome.runtime.sendMessage({
    type: "MANUAL_RESCAN",
    payload: { tabId, url },
  });
}

// ------------------------------------------------------------
// 6. SCORE COUNT-UP ANIMATION
// ------------------------------------------------------------

/**
 * Score number ko 0 se targetScore tak animate karke count karta hai,
 * saath hi progress bar bhi fill karta hai. Isse UI "alive" feel deti hai.
 */
function animateScoreTo(targetScore) {
  const safeTarget = Math.max(0, Math.min(100, Number(targetScore) || 0));
  const startTime = performance.now();

  // Bar fill ko turant CSS transition ke through animate hone dete hain
  elements.scoreBarFill.style.width = `${safeTarget}%`;

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / SCORE_ANIMATION_DURATION_MS, 1);
    // Ease-out curve — shuru mein fast, end mein slow (natural feel)
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(eased * safeTarget);

    elements.scoreNumber.textContent = currentValue;

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      elements.scoreNumber.textContent = safeTarget; // exact final value
    }
  }

  requestAnimationFrame(tick);
}

// ------------------------------------------------------------
// 7. RELATIVE TIME FORMATTER (Last Scan Time)
// ------------------------------------------------------------

/**
 * ISO timestamp ko human-readable "2 minutes ago" jaisa banata hai.
 */
function formatRelativeTime(isoString) {
  if (!isoString) return "Last scan: --";

  const scannedAt = new Date(isoString);
  if (Number.isNaN(scannedAt.getTime())) return "Last scan: --";

  const diffSeconds = Math.floor((Date.now() - scannedAt.getTime()) / 1000);

  if (diffSeconds < 10) return "Last scan: just now";
  if (diffSeconds < 60) return `Last scan: ${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `Last scan: ${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Last scan: ${diffHours}h ago`;

  return `Last scan: ${scannedAt.toLocaleDateString()}`;
}

// ------------------------------------------------------------
// 8. RENDER SCAN RESULT INTO UI
// ------------------------------------------------------------

/**
 * Backend/background.js se aaya scan result data leke poori UI
 * populate karta hai — saare cards, colors, score, text.
 */
function renderScanResult(data) {
  if (!data) {
    showState("empty");
    return;
  }

  // -------- Current Website --------
  elements.currentUrl.textContent = data.scanned_url || "Unknown URL";

  // -------- Verdict Card (dynamic color via data-level) --------
  const riskKey = (data.risk_level || "SAFE").toUpperCase();
  const riskInfo = RISK_LEVEL_MAP[riskKey] || RISK_LEVEL_MAP.SAFE;

  elements.verdictCard.setAttribute("data-level", riskInfo.level);
  elements.verdictIcon.textContent = riskInfo.icon;
  elements.verdictLabel.textContent = riskInfo.label;
  elements.verdictSub.textContent = getVerdictSubtitle(riskInfo.level);

  // Connection dot bhi verdict level reflect kare (chhota polish touch)
  elements.connectionDot.style.background = getComputedLevelColor(riskInfo.level);
  elements.connectionDot.style.boxShadow = `0 0 8px ${getComputedLevelColor(riskInfo.level)}`;

  // -------- Unified Threat Score --------
  animateScoreTo(data.unified_threat_score);

  // -------- Web2 Security --------
  // TODO: Backend se exact field names confirm karo (ai_scanner team se).
  // Abhi optional-chaining se safe defaults use kar rahe hain.
  elements.web2Pill.textContent = data.web2_status || riskInfo.label;
  elements.web2Https.textContent = data.https_valid === false ? "Not Secure" : "Valid";
  elements.web2UrlRisk.textContent =
    typeof data.website_risk_score === "number" ? `${data.website_risk_score}/100` : "--";

  // -------- Web3 Security --------
  // TODO: Backend se exact field names confirm karo (web3_profiler team se).
  elements.web3Pill.textContent = data.wallet_risk_level || (data.wallet_risk_score != null ? riskInfo.label : "N/A");
  elements.web3WalletAge.textContent = data.wallet_age || "--";
  elements.web3Contract.textContent = data.contract_verified === true ? "Verified" :
    data.contract_verified === false ? "Unverified" : "--";

  // -------- AI Explanation & Recommendation --------
  elements.aiExplanation.textContent =
    data.ai_explanation || "Trinetra AI could not generate an explanation for this scan.";
  elements.recommendationText.textContent =
    data.recommendation || "No specific recommendation available for this website.";

  // -------- Last Scan Time --------
  elements.lastScanTime.textContent = formatRelativeTime(data.scanned_at);

  showState("results");
}

/**
 * Verdict ke level ke hisaab se subtitle text return karta hai.
 */
function getVerdictSubtitle(level) {
  const subtitles = {
    safe: "No threats detected",
    low: "Minor risk indicators found",
    medium: "Some suspicious signals detected",
    high: "Significant threat indicators found",
    critical: "Dangerous site — avoid interaction",
  };
  return subtitles[level] || "Status unknown";
}

/**
 * CSS variable se computed color nikalta hai (JS mein use karne ke liye,
 * jaise connection-dot ka color set karna).
 */
function getComputedLevelColor(level) {
  const varMap = {
    safe: "--level-safe",
    low: "--level-low",
    medium: "--level-medium",
    high: "--level-high",
    critical: "--level-critical",
  };
  const cssVar = varMap[level] || "--level-safe";
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
}

// ------------------------------------------------------------
// 9. ERROR STATE RENDERER
// ------------------------------------------------------------

function renderError(message) {
  elements.errorMessage.textContent =
    message || "Could not reach Trinetra AI backend. Please try again.";
  showState("error");
}

// ------------------------------------------------------------
// 10. MAIN LOAD FLOW — popup open hote hi ye chalta hai
// ------------------------------------------------------------

/**
 * Popup khulte hi poora flow: tab detect -> loading dikhao ->
 * background.js se result maango -> UI render karo.
 */
async function loadPopupData() {
  showState("loading");

  try {
    const tab = await getCurrentTab();

    if (!tab || !tab.id) {
      renderError("No active tab detected.");
      return;
    }

    // Current URL turant dikhao (result aane se pehle bhi useful hai)
    elements.currentUrl.textContent = tab.url || "Unknown URL";

    const response = await requestScanResult(tab.id);

    if (!response || response.status === "error") {
      renderError(response?.error_message);
      return;
    }

    if (!response.data) {
      // Backend/background.js ne is tab ka koi scan result save nahi kiya abhi tak
      showState("empty");
      return;
    }

    renderScanResult(response.data);
  } catch (error) {
    console.error("[Trinetra AI] popup.js failed to load scan data:", error);
    renderError("Unexpected error while loading scan data.");
  }
}

// ------------------------------------------------------------
// 11. SCAN AGAIN BUTTON HANDLER
// ------------------------------------------------------------

async function handleScanAgainClick() {
  const btn = elements.scanAgainBtn;

  try {
    btn.disabled = true;
    btn.classList.add("is-scanning");
    showState("loading");

    const tab = await getCurrentTab();
    if (!tab || !tab.id || !tab.url) {
      renderError("Cannot rescan — no active tab URL found.");
      return;
    }

    const response = await requestManualRescan(tab.id, tab.url);

    if (!response || response.status === "error") {
      renderError(response?.error_message);
      return;
    }

    if (!response.data) {
      showState("empty");
      return;
    }

    renderScanResult(response.data);
  } catch (error) {
    console.error("[Trinetra AI] Manual rescan failed:", error);
    renderError("Rescan failed. Please try again.");
  } finally {
    btn.disabled = false;
    btn.classList.remove("is-scanning");
  }
}

// ------------------------------------------------------------
// 12. LIVE STORAGE UPDATES — popup open rehte hue naya data aaye
// ------------------------------------------------------------

/**
 * Agar popup open hai aur background.js ne background mein
 * (jaise wallet scan complete hone ke baad) storage update kar diya,
 * ye listener automatically UI refresh kar dega — user ko manually
 * dobara popup open/close nahi karna padega.
 */
function attachStorageListener(tabId) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;

    const expectedKey = `trinetra_scan_${tabId}`;
    if (changes[expectedKey]) {
      console.log("[Trinetra AI] Storage updated for current tab, refreshing popup UI.");
      renderScanResult(changes[expectedKey].newValue);
    }
  });
}

// ------------------------------------------------------------
// 13. VERSION DISPLAY
// ------------------------------------------------------------

function displayExtensionVersion() {
  const manifestData = chrome.runtime.getManifest();
  elements.versionText.textContent = `v${manifestData.version}`;
}

// ------------------------------------------------------------
// 14. INITIALIZATION — DOMContentLoaded
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Trinetra AI] popup.js initialized.");

  displayExtensionVersion();

  elements.scanAgainBtn.addEventListener("click", handleScanAgainClick);

  await loadPopupData();

  // Storage listener sirf tab detect hone ke baad attach karna better hai
  const tab = await getCurrentTab();
  if (tab && tab.id) {
    attachStorageListener(tab.id);
  }
});