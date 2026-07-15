/* ============================================================
   Trinetra AI — content.js
   UNCHANGED — no bug found here.
   ============================================================ */

let lastScannedText = "";
let scanTimeout = null;
let bannerEl = null;
let bannerDismissTimer = null;

function extractPageText() {
  try {
    return document.body.innerText.trim();
  } catch (error) {
    console.error("Text extraction failed:", error);
    return "";
  }
}

function cleanContent(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").substring(0, 5000).trim();
}

function looksLikeEmail(text) {
  const lower = text.toLowerCase();
  let score = 0;

  const suspiciousPatterns = [
    "your account has been suspended",
    "verify your account immediately",
    "confirm your password",
    "your bank account is blocked",
    "click here to login",
    "urgent action required",
    "security alert",
    "reset your password",
    "claim your reward",
    "you have won",
  ];

  suspiciousPatterns.forEach((pattern) => {
    if (lower.includes(pattern)) score += 2;
  });

  if (lower.match(/https?:\/\/[^\s]+/)) score += 2;
  if (lower.includes("dear customer")) score += 1;
  if (lower.includes("otp")) score += 1;

  return score >= 3;
}

function generateHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
}

function sendEmailForScanning(text) {
  const cleaned = cleanContent(text);
  if (cleaned.length < 20) return;

  const hash = generateHash(cleaned);
  if (hash === lastScannedText) return;
  lastScannedText = hash;

  chrome.runtime.sendMessage(
    { type: "SCAN_EMAIL", content: cleaned },
    (response) => {
      console.log("Trinetra Scan:", response);
    }
  );
}

function scanCurrentPage() {
  const pageText = extractPageText();
  if (!pageText) return;
  if (looksLikeEmail(pageText)) {
    sendEmailForScanning(pageText);
  }
}

const observer = new MutationObserver(() => {
  clearTimeout(scanTimeout);
  scanTimeout = setTimeout(() => {
    scanCurrentPage();
  }, 3000);
});

observer.observe(document.body, { childList: true, subtree: true });

setTimeout(() => {
  scanCurrentPage();
}, 5000);

const BANNER_STYLE_ID = "trinetra-notification-styles";

const BANNER_CSS = `
.trinetra-notification {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2147483647;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: #fff;
  background: #12141b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  animation: trinetra-notif-in 200ms cubic-bezier(0.4, 0, 0.2, 1);
  max-width: 320px;
}
.trinetra-notification--safe {
  border-color: rgba(34, 211, 168, 0.35);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(34, 211, 168, 0.12);
}
.trinetra-notification--safe .trinetra-notification__icon { color: #22d3a8; }
.trinetra-notification--medium {
  border-color: rgba(245, 165, 36, 0.4);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(245, 165, 36, 0.14);
}
.trinetra-notification--medium .trinetra-notification__icon { color: #f5a524; }
.trinetra-notification--high {
  border-color: rgba(239, 68, 68, 0.5);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(239, 68, 68, 0.22);
  animation: trinetra-notif-in 200ms cubic-bezier(0.4, 0, 0.2, 1),
             trinetra-notif-pulse 2.2s ease-in-out 400ms infinite;
}
.trinetra-notification--high .trinetra-notification__icon { color: #ef4444; }
.trinetra-notification__icon { width: 20px; height: 20px; flex: 0 0 auto; }
.trinetra-notification__body { flex: 1 1 auto; min-width: 0; }
.trinetra-notification__title { margin: 0; font-weight: 600; }
.trinetra-notification__detail { margin: 2px 0 0; opacity: 0.75; }
.trinetra-notification__actions { display: flex; gap: 8px; margin-top: 8px; }
.trinetra-notification__actions button {
  font: inherit;
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
}
.trinetra-notification__actions button:first-child {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border: none;
}
.trinetra-notification__actions button:last-child {
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.18);
}
@keyframes trinetra-notif-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes trinetra-notif-pulse {
  0%, 100% { box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,68,68,0.22); }
  50% { box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,68,68,0.5); }
}
@media (prefers-reduced-motion: reduce) {
  .trinetra-notification, .trinetra-notification--high { animation: none !important; }
}
`;

function ensureBannerStyles() {
  if (document.getElementById(BANNER_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = BANNER_STYLE_ID;
  style.textContent = BANNER_CSS;
  document.documentElement.appendChild(style);
}

function removeBanner() {
  clearTimeout(bannerDismissTimer);
  if (bannerEl && bannerEl.parentNode) {
    bannerEl.parentNode.removeChild(bannerEl);
  }
  bannerEl = null;
}

const TIER_ICON_PATH = {
  safe: '<path d="M9 12.3l2.1 2 3.9-4.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  medium: '<path d="M12 3.5 2 20.5h20L12 3.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 10v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/>',
  high: '<circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1.1" fill="currentColor"/>',
};

const TIER_COPY = {
  safe: { className: "safe", title: "Site Verified Safe" },
  medium: { className: "medium", title: "Suspicious Activity Detected" },
  high: { className: "high", title: "Threat Detected" },
};

function showRiskBanner(tier, result) {
  ensureBannerStyles();
  removeBanner();

  const uiTier = tier === "low" ? "safe" : tier === "medium" ? "medium" : "high";
  const copy = TIER_COPY[uiTier];
  const label =
    result.email_analysis?.label || result.url_analysis?.label || null;
  const score = result.final_risk_score;

  bannerEl = document.createElement("div");
  bannerEl.className = `trinetra-notification trinetra-notification--${copy.className}`;
  bannerEl.setAttribute("role", "status");

  const showActions = uiTier !== "safe";

  bannerEl.innerHTML = `
    <svg class="trinetra-notification__icon" viewBox="0 0 24 24" aria-hidden="true">${TIER_ICON_PATH[uiTier]}</svg>
    <div class="trinetra-notification__body">
      <p class="trinetra-notification__title">${copy.title}</p>
      <p class="trinetra-notification__detail">${
        label ? `${label} · ` : ""
      }Risk score ${typeof score === "number" ? score : "—"}</p>
      ${
        showActions
          ? `<div class="trinetra-notification__actions">
               <button type="button" data-trinetra-action="open">Open Extension</button>
               <button type="button" data-trinetra-action="dismiss">Dismiss</button>
             </div>`
          : ""
      }
    </div>
  `;

  document.documentElement.appendChild(bannerEl);

  bannerEl.querySelector('[data-trinetra-action="open"]')?.addEventListener(
    "click",
    () => {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
    }
  );
  bannerEl.querySelector('[data-trinetra-action="dismiss"]')?.addEventListener(
    "click",
    () => {
      removeBanner();
    }
  );

  if (uiTier === "safe") {
    bannerDismissTimer = setTimeout(removeBanner, 3500);
  } else if (uiTier === "medium") {
    bannerDismissTimer = setTimeout(removeBanner, 8000);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TRINETRA_RISK_UPDATE") {
    showRiskBanner(message.tier, message.result);
  }
});

console.log("Trinetra AI Content Script Loaded");