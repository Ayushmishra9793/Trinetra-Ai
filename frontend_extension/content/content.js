/**
 * ============================================================
 * content/content.js
 * ------------------------------------------------------------
 * Injected into every http(s) page. Renders either a small corner
 * TOAST (Scanning / Safe / Suspicious / Failed) or a full-page
 * blocking OVERLAY (Critical only). Driven entirely by messages
 * from background.js -- no backend calls, no storage access, no
 * business logic.
 *
 * MESSAGING ARCHITECTURE IS UNCHANGED from the previous version:
 * same MESSAGE_TYPES, same payload shape from background.js. Only
 * the visual presentation layer below has been redesigned.
 *
 * TECHNICAL NOTE ON THE CONSTANTS BELOW:
 * Content scripts cannot use static ES `import` statements, unlike
 * background.js. These values are mirrored exactly from
 * utils/constants.js, which remains the single source of truth.
 * ============================================================
 */

// ---- Mirrored from utils/constants.js: MESSAGE_TYPES ----
const MESSAGE_TYPES = {
  SCAN_RESULT_READY: "SCAN_RESULT_READY",
  SCAN_STARTED: "SCAN_STARTED",
  NOTIFICATION_DISMISSED: "NOTIFICATION_DISMISSED",
};

// ---- Mirrored from utils/constants.js: VERDICT ----
const VERDICT = {
  SAFE: "SAFE",
  SUSPICIOUS: "SUSPICIOUS",
  CRITICAL: "CRITICAL",
};

// ---- Mirrored from utils/constants.js: TIMEOUTS.NOTIFICATION_AUTO_DISMISS_MS ----
// Only applies to toast states -- the Critical overlay never auto-dismisses.
const AUTO_DISMISS_MS = {
  SAFE: 3000,
  FAILED: 5000,
};

// Must match notification.css transition durations so elements are
// only removed from the DOM after they've visually finished fading.
// Toast: .trinetra-notification's opacity/transform exit transition
// (the properties that change when --visible is removed) runs 260ms.
// Overlay: .trinetra-overlay itself fades over 320ms, but
// .trinetra-overlay__card -- the visually dominant piece -- animates
// transform over 380ms, the longest-running property in the
// overlay's exit sequence, so removal waits for that instead.
const TOAST_FADE_OUT_MS = 260;
const OVERLAY_FADE_OUT_MS = 380;

/**
 * ------------------------------------------------------------
 * MODULE STATE
 * ------------------------------------------------------------
 * Two independent root elements. Only one is ever visible at a
 * time -- showing one always hides the other first.
 */
let toastElement = null;
let toastAutoHideTimerId = null;
let overlayElement = null;

/**
 * ------------------------------------------------------------
 * NUMERIC COERCION HELPER
 * ------------------------------------------------------------
 * Mirrors popup.js's toFiniteNumber(). WHY THIS EXISTS: DRF's
 * DecimalField (commonly used for score fields to preserve
 * precision) serializes to JSON as a STRING by default (e.g.
 * "78.00", not 78). A strict `typeof x === "number"` check
 * silently treats that as "not a number" and drops the value --
 * this was causing the overlay's threat score to render as "—"
 * and the AI-risk reason to be silently omitted from the reasons
 * list, even though the backend returned a perfectly valid score.
 * Anything that genuinely isn't numeric (null, undefined, an
 * object, garbage text) still safely falls back.
 *
 * @param {*} value
 * @returns {number|null} The finite number, or null if not numeric.
 */
function toFiniteNumberOrNull(value) {
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * ------------------------------------------------------------
 * TOAST: STATE -> DISPLAY MAPPING
 * ------------------------------------------------------------
 * Critical is intentionally absent here -- it never renders as a
 * toast, only as the full-page overlay (see showOverlay below).
 *
 * @param {"scanning"|"completed"|"failed"} scanStatus
 * @param {string|null} verdict
 * @param {string|null} explanation
 */
function resolveToastState(scanStatus, verdict, explanation) {
  if (scanStatus === "scanning") {
    return {
      stateClass: "trinetra-notification--scanning",
      positionClass: "", // default bottom-right
      title: "Scanning Website\u2026",
      message: "Analyzing this page for threats.",
      autoDismissMs: null,
    };
  }

  if (scanStatus === "failed") {
    return {
      stateClass: "trinetra-notification--failed",
      positionClass: "",
      title: "Scan Failed",
      message: explanation || "Unable to complete the scan.",
      autoDismissMs: AUTO_DISMISS_MS.FAILED,
    };
  }

  if (verdict === VERDICT.SUSPICIOUS) {
    return {
      stateClass: "trinetra-notification--warning",
      positionClass: "trinetra-notification--pos-top-right",
      title: "Suspicious Activity",
      message: explanation || "This site was flagged as suspicious.",
      autoDismissMs: null, // persistent until dismissed
    };
  }

  // Default / VERDICT.SAFE
  return {
    stateClass: "trinetra-notification--safe",
    positionClass: "",
    title: "Site is Safe",
    message: explanation || "No threats detected.",
    autoDismissMs: AUTO_DISMISS_MS.SAFE,
  };
}

/**
 * ------------------------------------------------------------
 * TOAST: DOM CREATION
 * ------------------------------------------------------------
 */
function buildToastElement() {
  const card = document.createElement("div");
  card.id = "trinetra-notification";
  card.className = "trinetra-notification";

  const icon = document.createElement("div");
  icon.className = "trinetra-notification__icon";
  // Icon glyph is rendered entirely via CSS ::before, keyed to the
  // state modifier class -- no markup needed here.

  const body = document.createElement("div");
  body.className = "trinetra-notification__body";

  const title = document.createElement("p");
  title.className = "trinetra-notification__title";

  const message = document.createElement("p");
  message.className = "trinetra-notification__message";

  body.appendChild(title);
  body.appendChild(message);

  const dismissButton = document.createElement("button");
  dismissButton.type = "button";
  dismissButton.className = "trinetra-notification__dismiss";
  dismissButton.setAttribute("aria-label", "Dismiss notification");
  dismissButton.textContent = "\u00D7";

  dismissButton.addEventListener("click", (event) => {
    event.stopPropagation();
    hideToast();
    notifyBackgroundOfDismissal();
  });

  card.appendChild(icon);
  card.appendChild(body);
  card.appendChild(dismissButton);

  return card;
}

/**
 * Creates the toast if needed, or updates the existing one in
 * place -- guarantees only one toast ever exists at once.
 *
 * @param {"scanning"|"completed"|"failed"} scanStatus
 * @param {string|null} verdict
 * @param {string|null} explanation
 */
function showOrUpdateToast(scanStatus, verdict, explanation) {
  hideOverlay(); // toast and overlay are mutually exclusive

  const { stateClass, positionClass, title, message, autoDismissMs } =
    resolveToastState(scanStatus, verdict, explanation);

  const isAttached = toastElement && document.body.contains(toastElement);
  if (!isAttached) {
    toastElement = buildToastElement();
    document.body.appendChild(toastElement);
  }

  toastElement.classList.remove(
    "trinetra-notification--scanning",
    "trinetra-notification--safe",
    "trinetra-notification--warning",
    "trinetra-notification--failed",
    "trinetra-notification--pos-top-right"
  );
  toastElement.classList.add(stateClass);
  if (positionClass) {
    toastElement.classList.add(positionClass);
  }

  toastElement.querySelector(".trinetra-notification__title").textContent = title;
  toastElement.querySelector(".trinetra-notification__message").textContent = message;

  requestAnimationFrame(() => {
    toastElement.classList.add("trinetra-notification--visible");
  });

  if (toastAutoHideTimerId !== null) {
    clearTimeout(toastAutoHideTimerId);
    toastAutoHideTimerId = null;
  }

  if (autoDismissMs !== null) {
    toastAutoHideTimerId = setTimeout(hideToast, autoDismissMs);
  }
}

function hideToast() {
  if (toastAutoHideTimerId !== null) {
    clearTimeout(toastAutoHideTimerId);
    toastAutoHideTimerId = null;
  }

  if (!toastElement || !document.body.contains(toastElement)) {
    toastElement = null;
    return;
  }

  toastElement.classList.remove("trinetra-notification--visible");

  const elementToRemove = toastElement;
  setTimeout(() => {
    if (elementToRemove.parentNode) {
      elementToRemove.parentNode.removeChild(elementToRemove);
    }
  }, TOAST_FADE_OUT_MS);

  toastElement = null;
}

/**
 * ------------------------------------------------------------
 * OVERLAY: DOM CREATION (Critical state only)
 * ------------------------------------------------------------
 */
function buildOverlayElement() {
  const overlay = document.createElement("div");
  overlay.id = "trinetra-overlay";
  overlay.className = "trinetra-overlay";

  const card = document.createElement("div");
  card.className = "trinetra-overlay__card";
  card.setAttribute("role", "alertdialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-labelledby", "trinetra-overlay-title");
  card.setAttribute("aria-describedby", "trinetra-overlay-desc");

  const iconWrap = document.createElement("div");
  iconWrap.className = "trinetra-overlay__icon-wrap";
  const icon = document.createElement("div");
  icon.className = "trinetra-overlay__icon";
  iconWrap.appendChild(icon);

  const title = document.createElement("h1");
  title.id = "trinetra-overlay-title";
  title.className = "trinetra-overlay__title";
  title.textContent = "Dangerous Website Blocked";

  const subtitle = document.createElement("p");
  subtitle.className = "trinetra-overlay__subtitle";
  subtitle.textContent =
    "Trinetra AI has detected a critical security threat on this page.";

  const scoreBlock = document.createElement("div");
  scoreBlock.className = "trinetra-overlay__score";
  const scoreNumbers = document.createElement("div");
  scoreNumbers.className = "trinetra-overlay__score-numbers";
  const scoreValue = document.createElement("span");
  scoreValue.className = "trinetra-overlay__score-value";
  const scoreMax = document.createElement("span");
  scoreMax.className = "trinetra-overlay__score-max";
  scoreMax.textContent = "/100";
  scoreNumbers.appendChild(scoreValue);
  scoreNumbers.appendChild(scoreMax);
  const scoreLabel = document.createElement("span");
  scoreLabel.className = "trinetra-overlay__score-label";
  scoreLabel.textContent = "Threat Score";
  scoreBlock.appendChild(scoreNumbers);
  scoreBlock.appendChild(scoreLabel);

  const explanationBlock = document.createElement("div");
  explanationBlock.className = "trinetra-overlay__explanation";
  const explanationText = document.createElement("p");
  explanationText.id = "trinetra-overlay-desc";
  explanationText.className = "trinetra-overlay__explanation-text";
  explanationBlock.appendChild(explanationText);

  const reasonsList = document.createElement("ul");
  reasonsList.className = "trinetra-overlay__reasons";

  const actions = document.createElement("div");
  actions.className = "trinetra-overlay__actions";

  const leaveBtn = document.createElement("button");
  leaveBtn.type = "button";
  leaveBtn.className = "trinetra-overlay__btn trinetra-overlay__btn--primary";
  leaveBtn.textContent = "Leave Website";
  leaveBtn.addEventListener("click", handleLeaveWebsite);

  const disconnectBtn = document.createElement("button");
  disconnectBtn.type = "button";
  disconnectBtn.className = "trinetra-overlay__btn trinetra-overlay__btn--secondary";
  disconnectBtn.textContent = "Disconnect Wallet";
  disconnectBtn.addEventListener("click", handleDisconnectWallet);

  const continueBtn = document.createElement("button");
  continueBtn.type = "button";
  continueBtn.className = "trinetra-overlay__btn trinetra-overlay__btn--ghost";
  continueBtn.textContent = "Continue Anyway";
  continueBtn.addEventListener("click", handleContinueAnyway);

  actions.appendChild(leaveBtn);
  actions.appendChild(disconnectBtn);
  actions.appendChild(continueBtn);

  const statusText = document.createElement("p");
  statusText.className = "trinetra-overlay__status";
  statusText.setAttribute("aria-live", "polite");

  card.appendChild(iconWrap);
  card.appendChild(title);
  card.appendChild(subtitle);
  card.appendChild(scoreBlock);
  card.appendChild(explanationBlock);
  card.appendChild(reasonsList);
  card.appendChild(actions);
  card.appendChild(statusText);

  overlay.appendChild(card);
  return overlay;
}

/**
 * Builds the "Reasons" list from confirmed backend fields only
 * (ai_risk_score, web3_result). No field not present in the
 * backend contract is invented here.
 *
 * @param {object} result - Stored scan record (camelCase per storage.js).
 * @returns {string[]}
 */
function buildReasonsList(result) {
  const reasons = [];

  // toFiniteNumberOrNull (not a strict typeof check) so scores sent
  // as numeric strings by the backend (e.g. DRF DecimalField ->
  // "72.00") still produce a reason instead of being silently
  // dropped.
  const aiRiskScore = toFiniteNumberOrNull(result.aiRiskScore);
  if (aiRiskScore !== null) {
    reasons.push(`AI flagged this URL with ${Math.round(aiRiskScore)}% phishing probability.`);
  }

  const web3 = result.web3Result;
  if (web3 && web3.wallet_status && web3.wallet_status !== VERDICT.SAFE) {
    reasons.push(web3.reason || `Wallet flagged as ${web3.wallet_status}.`);
  }

  if (reasons.length === 0) {
    reasons.push("This site matched known high-risk threat patterns.");
  }

  return reasons;
}

/**
 * Creates the overlay if needed, or updates it in place, then
 * fades it in, blurs the page, and locks page scroll.
 *
 * @param {object} result - Stored scan record.
 */
function showOverlay(result) {
  hideToast(); // toast and overlay are mutually exclusive

  const isAttached = overlayElement && document.body.contains(overlayElement);
  if (!isAttached) {
    overlayElement = buildOverlayElement();
    document.body.appendChild(overlayElement);
  }

  // toFiniteNumberOrNull (not a strict typeof check) so a unified
  // score sent as a numeric string by the backend (e.g. DRF
  // DecimalField -> "78.00") still renders the real score instead
  // of silently falling back to "—".
  const unifiedScore = toFiniteNumberOrNull(result.unifiedScore);
  overlayElement.querySelector(".trinetra-overlay__score-value").textContent =
    unifiedScore !== null ? Math.round(unifiedScore) : "\u2014";

  overlayElement.querySelector(".trinetra-overlay__explanation-text").textContent =
    result.explanation || "This website was blocked due to a critical security risk.";

  const reasonsListEl = overlayElement.querySelector(".trinetra-overlay__reasons");
  reasonsListEl.innerHTML = "";
  buildReasonsList(result).forEach((reasonText) => {
    const li = document.createElement("li");
    li.textContent = reasonText;
    reasonsListEl.appendChild(li);
  });

  overlayElement.querySelector(".trinetra-overlay__status").textContent = "";

  // Blur/interaction-block only takes effect once this class is
  // present -- see the scroll-lock rule in notification.css.
  document.documentElement.classList.add("trinetra-scroll-locked");

  requestAnimationFrame(() => {
    overlayElement.classList.add("trinetra-overlay--visible");
  });
}

function hideOverlay() {
  if (!overlayElement || !document.body.contains(overlayElement)) {
    overlayElement = null;
    document.documentElement.classList.remove("trinetra-scroll-locked");
    return;
  }

  overlayElement.classList.remove("trinetra-overlay--visible");
  document.documentElement.classList.remove("trinetra-scroll-locked");

  const elementToRemove = overlayElement;
  setTimeout(() => {
    if (elementToRemove.parentNode) {
      elementToRemove.parentNode.removeChild(elementToRemove);
    }
  }, OVERLAY_FADE_OUT_MS);

  overlayElement = null;
}

/**
 * ------------------------------------------------------------
 * OVERLAY BUTTON HANDLERS
 * ------------------------------------------------------------
 */

/**
 * "Leave Website" -- navigates away from the dangerous page.
 * Content scripts cannot close a browser tab (that requires
 * chrome.tabs, only available to background.js), so this is
 * implemented as the strongest safe action content.js itself can
 * take: go back in history if possible, otherwise navigate to a
 * neutral blank page.
 */
function handleLeaveWebsite() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "about:blank";
  }
}

/**
 * "Disconnect Wallet" -- best effort only. Content scripts run in
 * an ISOLATED JavaScript world, so window.ethereum (injected by
 * wallet extensions into the PAGE's world) is not visible here.
 * This honestly reports that limitation rather than pretending to
 * succeed. A real implementation would require a main-world script
 * injection triggered from background.js, which is out of scope
 * for this change.
 */
function handleDisconnectWallet() {
  const statusEl = overlayElement?.querySelector(".trinetra-overlay__status");
  if (!statusEl) return;

  if (typeof window.ethereum === "undefined") {
    statusEl.textContent = "No wallet connection detected on this page.";
    return;
  }

  try {
    // Best-effort call -- not all wallet providers support this,
    // and content scripts have limited visibility into the page's
    // actual wallet state regardless.
    window.ethereum
      .request?.({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] })
      .then(() => {
        statusEl.textContent = "Wallet disconnect requested.";
      })
      .catch(() => {
        statusEl.textContent = "Could not disconnect automatically. Please disconnect manually from your wallet extension.";
      });
  } catch {
    statusEl.textContent = "Could not disconnect automatically. Please disconnect manually from your wallet extension.";
  }
}

/**
 * "Continue Anyway" -- dismisses the overlay and restores normal
 * page interaction. Reuses the existing NOTIFICATION_DISMISSED
 * message type -- no new messaging contract needed.
 */
function handleContinueAnyway() {
  hideOverlay();
  notifyBackgroundOfDismissal();
}

/**
 * Fire-and-forget message to background.js. Wrapped in a try/catch
 * since the service worker may be briefly asleep.
 */
function notifyBackgroundOfDismissal() {
  try {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.NOTIFICATION_DISMISSED });
  } catch {
    // Non-critical -- safe to ignore.
  }
}

/**
 * ------------------------------------------------------------
 * MESSAGE LISTENER
 * ------------------------------------------------------------
 */
chrome.runtime.onMessage.addListener((message, sender) => {
  if (!sender || sender.id !== chrome.runtime.id) return;

  if (message.type === MESSAGE_TYPES.SCAN_STARTED) {
    showOrUpdateToast("scanning", null, null);
    return;
  }

  if (message.type === MESSAGE_TYPES.SCAN_RESULT_READY) {
    const result = message.payload?.result;
    if (!result) return;

    const isCriticalCompleted =
      result.scanStatus === "completed" && result.verdict === VERDICT.CRITICAL;

    if (isCriticalCompleted) {
      showOverlay(result);
    } else {
      showOrUpdateToast(result.scanStatus, result.verdict, result.explanation);
    }
  }
});