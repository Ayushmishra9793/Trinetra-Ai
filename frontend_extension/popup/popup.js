/**
 * ============================================================
 * popup/popup.js
 * ------------------------------------------------------------
 * Pure presentation layer for the redesigned popup. No business
 * logic, no fetch(), no direct storage access -- everything comes
 * from background.js via messages, exactly as before. Only the
 * rendering target (new IDs, new body[data-state] contract) and
 * the animation polish are new.
 *
 * body[data-state] now takes one of SIX values, matching the
 * redesigned popup.html/popup.css directly:
 *   idle | scanning | safe | suspicious | critical | failed
 * ============================================================
 */

import { MESSAGE_TYPES, VERDICT } from "../utils/constants.js";

/**
 * ------------------------------------------------------------
 * DOM REFERENCES
 * ------------------------------------------------------------
 */
const dom = {
  body: document.getElementById("popup-body"),

  protectionStatusLabel: document.getElementById("protection-status-label"),

  websiteFavicon: document.getElementById("website-favicon"),
  websiteHostname: document.getElementById("website-hostname"),
  websiteProtocolBadge: document.getElementById("website-protocol-badge"),

  scoreRingProgress: document.getElementById("score-ring-progress"),
  scoreValue: document.getElementById("score-value"),
  verdictStatusText: document.getElementById("verdict-status-text"),

  aiAnalysisText: document.getElementById("ai-analysis-text"),

  aiRiskProgress: document.getElementById("ai-risk-progress"),
  aiRiskScore: document.getElementById("ai-risk-score"),
  web3RiskRow: document.getElementById("web3-risk-row"),
  web3RiskProgress: document.getElementById("web3-risk-progress"),
  web3RiskScore: document.getElementById("web3-risk-score"),

  recommendationText: document.getElementById("recommendation-text"),

  lastScanTimestamp: document.getElementById("last-scan-timestamp"),
  scanAgainBtn: document.getElementById("scan-again-btn"),
};

/** SVG ring circumference -- must match the 2*PI*52 value baked into popup.css. */
const RING_CIRCUMFERENCE = 326.7;

/** Duration (ms) used for both the ring fill and the number count-up, so they stay in sync. */
const SCORE_ANIMATION_MS = 600;

let currentTabUrl = null;
let currentScannedAt = null;

/** Remembers the last displayed numeric values so re-renders animate FROM there, not from zero. */
const previousValues = {
  score: 0,
  aiRisk: 0,
  web3Risk: 0,
};

/**
 * ------------------------------------------------------------
 * SMALL PRESENTATION HELPERS
 * ------------------------------------------------------------
 */

function isLikelyScannableUrl(url) {
  return typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
}

/**
 * Coerces a backend numeric field to a finite JS number, accepting
 * both real numbers and numeric strings.
 *
 * WHY THIS EXISTS: DRF's DecimalField (commonly used for score
 * fields to preserve precision) serializes to JSON as a STRING by
 * default (e.g. "78.00", not 78). A strict `typeof x === "number"`
 * check silently treats that as "not a number" and falls back to
 * 0/dash even though the value is perfectly valid -- this was
 * previously causing real scores to render as 0. Anything that
 * genuinely isn't numeric (null, undefined, an object, garbage
 * text) still safely falls back.
 *
 * @param {*} value
 * @param {number} [fallback]
 * @returns {number}
 */
function toFiniteNumber(value, fallback = 0) {
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "Not scanned yet";

  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSeconds < 5) return "Just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Fades an element's text out, swaps the content, fades it back
 * in. Uses the Web Animations API so no inline `style` attribute
 * or CSS class is left behind once the animation completes.
 *
 * @param {HTMLElement} el
 * @param {string} newText
 */
function fadeSwapText(el, newText) {
  if (el.textContent === newText) return;

  const fadeOut = el.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 120,
    easing: "ease-in",
    fill: "forwards",
  });

  fadeOut.onfinish = () => {
    el.textContent = newText;
    el.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 200,
      easing: "ease-out",
    });
  };
}

/**
 * Animates a numeric value from its previously displayed value up
 * (or down) to a new target, using requestAnimationFrame with an
 * ease-out curve. Used for the score and both risk-row values.
 *
 * @param {HTMLElement} el - Element whose textContent gets updated each frame.
 * @param {"score"|"aiRisk"|"web3Risk"} key - Which tracked value this is.
 * @param {number} toValue
 * @param {number} [duration]
 */
function animateNumber(el, key, toValue, duration = SCORE_ANIMATION_MS) {
  const fromValue = previousValues[key];
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = fromValue + (toValue - fromValue) * eased;

    el.textContent = Math.round(current);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = Math.round(toValue);
      previousValues[key] = toValue;
    }
  }

  requestAnimationFrame(step);
}

/**
 * Sets the score ring's fill for a known numeric score. Clearing
 * this inline style (see clearScoreRingInlineStyle) is what lets
 * popup.css's own scanning-state ring animation take back control
 * whenever the state isn't a completed result.
 *
 * @param {number} score - 0-100
 */
function setScoreRingFill(score) {
  const clamped = Math.max(0, Math.min(100, score));
  const offset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * clamped) / 100;
  dom.scoreRingProgress.style.strokeDashoffset = offset.toFixed(2);
}

/**
 * Removes the inline stroke-dashoffset so popup.css's own
 * state-driven rules (empty ring for idle/failed, sweeping
 * spinner for scanning) apply cleanly again.
 */
function clearScoreRingInlineStyle() {
  dom.scoreRingProgress.style.removeProperty("stroke-dashoffset");
}

/**
 * ------------------------------------------------------------
 * STATE RENDER FUNCTIONS
 * ------------------------------------------------------------
 */

function renderIdleState() {
  dom.body.dataset.state = "idle";
  clearScoreRingInlineStyle();

  dom.scoreValue.textContent = "\u2014";
  previousValues.score = 0;

  fadeSwapText(dom.protectionStatusLabel, "Idle");
  fadeSwapText(dom.verdictStatusText, "No Scan Yet");

  dom.aiRiskProgress.value = 0;
  dom.aiRiskScore.textContent = "\u2014";
  previousValues.aiRisk = 0;

  dom.web3RiskProgress.value = 0;
  dom.web3RiskScore.textContent = "Not Connected";
  dom.web3RiskRow.removeAttribute("title");
  previousValues.web3Risk = 0;

  fadeSwapText(dom.aiAnalysisText, "Open any website to see an AI-generated explanation here.");
  fadeSwapText(dom.recommendationText, "Open any website \u2014 Trinetra AI will scan it automatically.");

  currentScannedAt = null;
  dom.lastScanTimestamp.textContent = "Not scanned yet";

  dom.scanAgainBtn.disabled = !isLikelyScannableUrl(currentTabUrl);
}

function renderScanningState() {
  dom.body.dataset.state = "scanning";
  // Let popup.css's own indeterminate sweep animation take over.
  clearScoreRingInlineStyle();

  dom.scoreValue.textContent = "\u2014";
  previousValues.score = 0;

  fadeSwapText(dom.protectionStatusLabel, "Scanning");
  fadeSwapText(dom.verdictStatusText, "Scanning\u2026");

  fadeSwapText(dom.aiAnalysisText, "Analyzing this page for threats.");
  fadeSwapText(dom.recommendationText, "Please wait while Trinetra AI analyzes this page.");

  dom.scanAgainBtn.disabled = true;
}

function renderCompletedState(result) {
  const dataStateByVerdict = {
    [VERDICT.SAFE]: "safe",
    [VERDICT.SUSPICIOUS]: "suspicious",
    [VERDICT.CRITICAL]: "critical",
  };
  // Unknown/missing verdict never falls back to "safe" -- default
  // to the neutral "failed" treatment so the UI never implies a
  // false assurance.
  dom.body.dataset.state = dataStateByVerdict[result.verdict] ?? "failed";

  const statusLabelByVerdict = {
    [VERDICT.SAFE]: "Protected",
    [VERDICT.SUSPICIOUS]: "At Risk",
    [VERDICT.CRITICAL]: "Blocked",
  };
  fadeSwapText(
    dom.protectionStatusLabel,
    statusLabelByVerdict[result.verdict] ?? "Unknown"
  );
  fadeSwapText(dom.verdictStatusText, result.verdict ?? "Unknown");

  // toFiniteNumber (not a strict typeof check) so scores sent as
  // numeric strings by the backend still render correctly instead
  // of silently collapsing to 0.
  const unifiedScore = toFiniteNumber(result.unifiedScore, 0);
  setScoreRingFill(unifiedScore);
  animateNumber(dom.scoreValue, "score", unifiedScore);

  const aiRisk = toFiniteNumber(result.aiRiskScore, 0);
  dom.aiRiskProgress.value = aiRisk;
  animateNumber(dom.aiRiskScore, "aiRisk", aiRisk);

  // web3Result's outer key is camelCase (mapped by background.js),
  // but its inner keys remain the backend's original snake_case
  // (wallet_status, reason, risk_points) -- unchanged pass-through.
  const web3 = result.web3Result;
  if (web3) {
    const riskPoints = toFiniteNumber(web3.risk_points, 0);
    dom.web3RiskProgress.value = riskPoints;
    animateNumber(dom.web3RiskScore, "web3Risk", riskPoints);
    dom.web3RiskRow.title = web3.reason || "";
  } else {
    dom.web3RiskProgress.value = 0;
    previousValues.web3Risk = 0;
    dom.web3RiskScore.textContent = "Not Connected";
    dom.web3RiskRow.removeAttribute("title");
  }

  fadeSwapText(dom.aiAnalysisText, result.explanation || "No additional explanation was provided.");
  fadeSwapText(dom.recommendationText, deriveRecommendation(result.verdict));

  currentScannedAt = result.scannedAt ?? null;
  dom.lastScanTimestamp.textContent = formatRelativeTime(currentScannedAt);

  dom.scanAgainBtn.disabled = false;
}

function renderFailedState(result) {
  dom.body.dataset.state = "failed";
  clearScoreRingInlineStyle();

  dom.scoreValue.textContent = "\u2014";
  previousValues.score = 0;

  fadeSwapText(dom.protectionStatusLabel, "Offline");
  fadeSwapText(dom.verdictStatusText, "Scan Failed");

  dom.aiRiskProgress.value = 0;
  dom.aiRiskScore.textContent = "\u2014";
  previousValues.aiRisk = 0;

  dom.web3RiskProgress.value = 0;
  dom.web3RiskScore.textContent = "\u2014";
  dom.web3RiskRow.removeAttribute("title");
  previousValues.web3Risk = 0;

  // The AI Analysis card is visually dimmed in this state (per
  // popup.css), so it gets a muted placeholder -- the actionable
  // message goes in the Recommendation card instead, which stays
  // fully visible in the locked CSS.
  fadeSwapText(dom.aiAnalysisText, "No analysis available for this attempt.");
  fadeSwapText(
    dom.recommendationText,
    (result.explanation || "Unable to complete the scan.") + " Click Scan Again to retry."
  );

  currentScannedAt = result.scannedAt ?? null;
  dom.lastScanTimestamp.textContent = `Attempted ${formatRelativeTime(currentScannedAt)}`;

  dom.scanAgainBtn.disabled = false;
}

function deriveRecommendation(verdict) {
  switch (verdict) {
    case VERDICT.SAFE:
      return "This website appears safe.";
    case VERDICT.SUSPICIOUS:
      return "Proceed with caution.";
    case VERDICT.CRITICAL:
      return "Avoid interacting with this website.";
    default:
      return "No recommendation available.";
  }
}

/**
 * Single entry point that dispatches to the correct render
 * function based on the stored record's scanStatus.
 *
 * @param {object|null} result - A stored scan record, or null for "never scanned."
 */
function renderScanResult(result) {
  if (!result) {
    renderIdleState();
    return;
  }

  switch (result.scanStatus) {
    case "scanning":
      renderScanningState();
      break;
    case "completed":
      renderCompletedState(result);
      break;
    case "failed":
      renderFailedState(result);
      break;
    default:
      renderIdleState();
  }
}

/**
 * ------------------------------------------------------------
 * TAB METADATA (hostname / favicon / protocol)
 * ------------------------------------------------------------
 * Uses chrome.tabs directly -- browser tab metadata, not backend
 * or scan data, so it does not go through background.js.
 */
async function getActiveTabInfo() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab || !activeTab.url) return null;

  return { url: activeTab.url, favIconUrl: activeTab.favIconUrl || null };
}

function renderTabMeta(tabInfo) {
  if (!tabInfo) {
    dom.websiteHostname.textContent = "\u2014";
    dom.websiteFavicon.hidden = true;
    dom.websiteProtocolBadge.textContent = "";
    return;
  }

  let hostname = tabInfo.url;
  let isSecure = false;
  try {
    const parsed = new URL(tabInfo.url);
    hostname = parsed.hostname;
    isSecure = parsed.protocol === "https:";
  } catch {
    // Keep the raw string as a fallback -- still better than blank.
  }

  dom.websiteHostname.textContent = hostname;
  // Text reflects the real protocol; popup.css does not currently
  // define a color variant for this badge, so it always renders
  // in the same accent regardless of secure/insecure -- flagged
  // separately since popup.css is locked this turn.
  dom.websiteProtocolBadge.textContent = isSecure ? "HTTPS" : "HTTP";

  if (tabInfo.favIconUrl) {
    dom.websiteFavicon.src = tabInfo.favIconUrl;
    dom.websiteFavicon.hidden = false;
    dom.websiteFavicon.onerror = () => {
      dom.websiteFavicon.hidden = true;
    };
  } else {
    dom.websiteFavicon.hidden = true;
  }
}

/**
 * ------------------------------------------------------------
 * BACKGROUND.JS MESSAGING (unchanged contract)
 * ------------------------------------------------------------
 */
async function requestLatestScan() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.POPUP_REQUEST_LATEST_SCAN,
    });
    return response?.result ?? null;
  } catch {
    return null;
  }
}

async function requestRescan() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.POPUP_REQUEST_RESCAN,
    });
    if (!response?.started) {
      dom.scanAgainBtn.disabled = !isLikelyScannableUrl(currentTabUrl);
    }
  } catch {
    dom.scanAgainBtn.disabled = !isLikelyScannableUrl(currentTabUrl);
  }
}

function handleScanAgainClick() {
  // Immediate feedback: show the scanning state right away rather
  // than waiting for background.js's own SCAN_STARTED push, which
  // arrives a beat later. background.js's push will simply confirm
  // (and correctly override) this if anything differs.
  renderScanningState();
  requestRescan();
}

/**
 * Only applies updates that belong to the tab this popup instance
 * opened for -- a scan happening on a different tab must never
 * overwrite what's currently on screen.
 */
function handleRuntimeMessage(message, sender) {
  if (!sender || sender.id !== chrome.runtime.id) return;

  const messageUrl = message?.payload?.url;
  if (!messageUrl || messageUrl !== currentTabUrl) return;

  if (message.type === MESSAGE_TYPES.SCAN_STARTED) {
    renderScanningState();
    return;
  }

  if (message.type === MESSAGE_TYPES.SCAN_RESULT_READY) {
    renderScanResult(message.payload.result);
  }
}

/**
 * ------------------------------------------------------------
 * LIVE TIMESTAMP REFRESH
 * ------------------------------------------------------------
 */
function startRelativeTimeRefresh() {
  setInterval(() => {
    if (currentScannedAt === null) return;
    if (dom.body.dataset.state === "failed") {
      dom.lastScanTimestamp.textContent = `Attempted ${formatRelativeTime(currentScannedAt)}`;
    } else {
      dom.lastScanTimestamp.textContent = formatRelativeTime(currentScannedAt);
    }
  }, 1000);
}

/**
 * ------------------------------------------------------------
 * INITIALIZATION
 * ------------------------------------------------------------
 */
async function init() {
  const tabInfo = await getActiveTabInfo();
  currentTabUrl = tabInfo?.url ?? null;

  renderTabMeta(tabInfo);

  const latestResult = await requestLatestScan();
  renderScanResult(latestResult);

  dom.scanAgainBtn.addEventListener("click", handleScanAgainClick);
  chrome.runtime.onMessage.addListener(handleRuntimeMessage);

  startRelativeTimeRefresh();
}

init();