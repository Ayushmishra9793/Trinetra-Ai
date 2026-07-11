/**
 * ============================================================
 * background/background.js
 * ------------------------------------------------------------
 * The central controller ("brain") of the Trinetra AI extension.
 *
 * RESPONSIBILITIES:
 * - Detect tab activation, navigation, and refresh events.
 * - Filter out unsupported URLs (chrome://, file://, etc.).
 * - Avoid duplicate backend calls for the same URL.
 * - Drive the full scan cycle: mark scanning -> call backend ->
 *   normalize -> save -> update badge -> notify content -> notify popup.
 * - Respond to requests from popup.js (latest result, manual rescan).
 *
 * This is the ONLY file that calls chrome.tabs / chrome.action
 * event APIs and the ONLY file that calls api.js. content.js and
 * popup.js never talk to the backend directly.
 * ============================================================
 */

import { MESSAGE_TYPES, VERDICT, BADGE_COLORS } from "../utils/constants.js";
import {
  saveScanResult,
  getScanResult,
} from "../utils/storage.js";
import { scanWebsite } from "../utils/api.js";

/**
 * Tracks the last URL that was fully processed (scan started) for
 * each tab. Used to silently ignore duplicate Chrome events
 * (onActivated + onUpdated firing back-to-back for the same
 * navigation) WITHOUT relying on an artificial cooldown timer.
 *
 * Key: tabId (number) -> Value: url (string)
 * Intentionally in-memory only. If the service worker restarts,
 * the worst case is one harmless extra scan -- not worth
 * persisting to storage for.
 */
const lastProcessedUrlByTab = new Map();

/**
 * Tracks URLs that currently have a scan in flight, so that two
 * near-simultaneous events (e.g. two tabs opening the same URL at
 * once) don't both trigger a backend call for the same URL.
 */
const activeScanUrls = new Set();

/**
 * ------------------------------------------------------------
 * URL VALIDATION
 * ------------------------------------------------------------
 * Only http/https pages are scannable. This single check is
 * sufficient to reject chrome://, chrome-extension://, about:,
 * edge://, file://, and any other non-web scheme, because it
 * requires an explicit allow-list match rather than a deny-list.
 */
function isScannableUrl(url) {
  if (!url || typeof url !== "string") return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * ------------------------------------------------------------
 * BADGE MANAGEMENT
 * ------------------------------------------------------------
 * Single function that owns all badge visuals. If the badge
 * design changes later (colors, text, icons), only this function
 * needs to be edited.
 *
 * @param {"SCANNING"|"SAFE"|"SUSPICIOUS"|"CRITICAL"|"FAILED"|null} status
 * @param {number} tabId - The tab this badge update applies to.
 */
async function updateBadge(status, tabId) {
  if (!status) {
    // Idle / unsupported page -> no badge at all.
    await chrome.action.setBadgeText({ text: "", tabId });
    return;
  }

  const color = BADGE_COLORS[status] ?? BADGE_COLORS.FAILED;
  await chrome.action.setBadgeBackgroundColor({ color, tabId });

  // A single space renders as a small solid color dot rather than
  // visible characters -- keeps the badge minimal per the UI spec.
  await chrome.action.setBadgeText({ text: " ", tabId });
}

/**
 * ------------------------------------------------------------
 * MESSAGING HELPERS
 * ------------------------------------------------------------
 * Both wrappers swallow "no receiver" errors on purpose:
 * - content.js may not be injected yet (e.g. page still loading,
 *   or it's a page content scripts can't run on).
 * - popup.js is very often not open at all.
 * Neither case is a real error worth surfacing.
 */
async function notifyContentScript(tabId, type, payload) {
  try {
    await chrome.tabs.sendMessage(tabId, { type, payload });
  } catch {
    // No content script listening on this tab -- safe to ignore.
  }
}

async function notifyPopup(type, payload) {
  try {
    await chrome.runtime.sendMessage({ type, payload });
  } catch {
    // Popup is not currently open -- safe to ignore.
  }
}

/**
 * ------------------------------------------------------------
 * RESPONSE NORMALIZATION
 * ------------------------------------------------------------
 * Translates the backend's confirmed snake_case scan response
 * fields (verdict, unified_score, ai_risk_score, web3_result,
 * explanation) into the camelCase shape storage.js expects.
 * This is the single place that field-name translation happens.
 *
 * @param {object} data - Raw backend JSON from ScanView.
 * @returns {object} Fields matching storage.js's saveScanResult shape.
 */
function normalizeBackendResponse(data) {
  return {
    verdict: data.verdict ?? null,
    unifiedScore: data.unified_score ?? null,
    aiRiskScore: data.ai_risk_score ?? null,
    web3Result: data.web3_result ?? null,
    explanation: data.explanation ?? null,
  };
}

/**
 * ------------------------------------------------------------
 * CORE SCAN CYCLE
 * ------------------------------------------------------------
 * Runs the full scan for a single URL: mark scanning, call the
 * backend, save the result, update the badge, notify content.js
 * and popup.js. Every failure path (network, timeout, parse,
 * server, unexpected exception) still resolves to a saved
 * "failed" record and a badge update -- the user is never left
 * looking at a stuck "scanning" state.
 *
 * @param {number} tabId - The tab the scan result belongs to.
 * @param {string} url - The full URL being scanned.
 * @param {{ forceRescan?: boolean }} [options] - forceRescan
 *   bypasses the "already processed" dedupe cache, used by the
 *   popup's manual "Scan Again" button.
 */
async function runScan(tabId, url, { forceRescan = false } = {}) {
  // Guard against two near-simultaneous events scanning the exact
  // same URL at once (e.g. two tabs opening the same link).
  if (!forceRescan && activeScanUrls.has(url)) {
    return;
  }

  activeScanUrls.add(url);

  try {
    // 1. Mark as scanning immediately, before the network call,
    //    so the UI can show a loading state with no delay.
    await saveScanResult(url, { scanStatus: "scanning" });
    await updateBadge("SCANNING", tabId);
    await notifyContentScript(tabId, MESSAGE_TYPES.SCAN_STARTED, { url });
    await notifyPopup(MESSAGE_TYPES.SCAN_STARTED, { url });

    // 2. Call the backend. api.js already normalizes network,
    //    timeout, parse, and server errors into a single shape --
    //    we only need to branch on result.success here.
    const result = await scanWebsite(url);

    if (result.success) {
      const normalized = normalizeBackendResponse(result.data);
      const savedRecord = await saveScanResult(url, {
        ...normalized,
        scanStatus: "completed",
      });

      await updateBadge(savedRecord.verdict ?? VERDICT.SAFE, tabId);
      await notifyContentScript(tabId, MESSAGE_TYPES.SCAN_RESULT_READY, {
        url,
        result: savedRecord,
      });
      await notifyPopup(MESSAGE_TYPES.SCAN_RESULT_READY, {
        url,
        result: savedRecord,
      });
    } else {
      // Any api.js failure (NETWORK, TIMEOUT, PARSE, SERVER,
      // VALIDATION) lands here. We still save a complete record so
      // the popup/content script have something concrete to render
      // instead of an indefinite "scanning" state.
      const savedRecord = await saveScanResult(url, {
        scanStatus: "failed",
        explanation: result.error?.message ?? "Scan failed unexpectedly.",
      });

      await updateBadge("FAILED", tabId);
      await notifyContentScript(tabId, MESSAGE_TYPES.SCAN_RESULT_READY, {
        url,
        result: savedRecord,
      });
      await notifyPopup(MESSAGE_TYPES.SCAN_RESULT_READY, {
        url,
        result: savedRecord,
      });
    }
  } catch (unexpectedError) {
    // Final safety net for any exception not already caught inside
    // api.js or storage.js (e.g. a storage quota error). Security
    // tooling should degrade gracefully, never fail silently.
    const savedRecord = await saveScanResult(url, {
      scanStatus: "failed",
      explanation: "An unexpected error occurred while scanning.",
    });

    await updateBadge("FAILED", tabId);
    await notifyContentScript(tabId, MESSAGE_TYPES.SCAN_RESULT_READY, {
      url,
      result: savedRecord,
    });
    await notifyPopup(MESSAGE_TYPES.SCAN_RESULT_READY, {
      url,
      result: savedRecord,
    });
  } finally {
    activeScanUrls.delete(url);
  }
}

/**
 * ------------------------------------------------------------
 * DEDUPE GATE
 * ------------------------------------------------------------
 * Called by every tab event listener before runScan. Decides
 * whether this event represents a genuinely new page view for
 * this tab, or a duplicate Chrome event for a page already being
 * processed.
 *
 * @param {number} tabId
 * @param {string} url
 */
async function handleTabChange(tabId, url) {
  if (!isScannableUrl(url)) {
    // Unsupported page (chrome://, file://, etc.) -- clear any
    // stale badge and forget this tab's tracked URL.
    lastProcessedUrlByTab.delete(tabId);
    await updateBadge(null, tabId);
    return;
  }

  const lastUrl = lastProcessedUrlByTab.get(tabId);
  if (lastUrl === url) {
    // Same tab, same URL as last processed event -- this is a
    // duplicate Chrome event (e.g. onActivated followed by
    // onUpdated for the same navigation), not a new page view.
    return;
  }

  lastProcessedUrlByTab.set(tabId, url);
  await runScan(tabId, url);
}

/**
 * ------------------------------------------------------------
 * CHROME EVENT LISTENERS
 * ------------------------------------------------------------
 */

// Fired when the user switches to a different tab.
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await handleTabChange(tab.id, tab.url);
  } catch {
    // Tab may have closed between the event firing and chrome.tabs.get
    // resolving -- safe to ignore.
  }
});

// Fired on navigation, refresh, or page load completion within a tab.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only act once the page has fully finished loading -- acting on
  // "loading" status would fire a scan against a stale/blank URL.
  if (changeInfo.status === "complete") {
    await handleTabChange(tabId, tab.url);
  }
});

// Clean up in-memory tracking when a tab is closed, so the Map
// doesn't grow unbounded over a long browsing session.
chrome.tabs.onRemoved.addListener((tabId) => {
  lastProcessedUrlByTab.delete(tabId);
});

/**
 * ------------------------------------------------------------
 * MESSAGES FROM popup.js
 * ------------------------------------------------------------
 * popup.js never touches storage or the backend directly -- it
 * asks background.js for everything via these two message types.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MESSAGE_TYPES.POPUP_REQUEST_LATEST_SCAN) {
    (async () => {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!activeTab || !isScannableUrl(activeTab.url)) {
        sendResponse({ result: null });
        return;
      }

      const storedResult = await getScanResult(activeTab.url);
      sendResponse({ result: storedResult });
    })();
    return true; // Keep the message channel open for the async response.
  }

  if (message.type === MESSAGE_TYPES.POPUP_REQUEST_RESCAN) {
    (async () => {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!activeTab || !isScannableUrl(activeTab.url)) {
        sendResponse({ started: false });
        return;
      }

      // forceRescan bypasses the dedupe cache -- this is a
      // deliberate manual action, not a duplicate Chrome event.
      runScan(activeTab.id, activeTab.url, { forceRescan: true });
      sendResponse({ started: true });
    })();
    return true;
  }

  // Not a message type this listener handles.
  return false;
});