/**
 * ============================================================
 * utils/constants.js
 * ------------------------------------------------------------
 * Single source of truth for every shared value in the extension.
 *
 * WHY THIS FILE EXISTS:
 * background.js, content.js, and popup.js run in three separate
 * execution contexts (service worker, content script, popup page)
 * and can ONLY talk to each other through chrome.runtime messages
 * and chrome.storage. If each file hardcodes its own string for
 * "scan complete" or its own storage key name, a single typo in
 * one file silently breaks communication with no error thrown.
 *
 * RULE: no other file should hardcode a message type, storage key,
 * verdict string, or timeout value. Always import from here.
 * ============================================================
 */

/**
 * Message types exchanged via chrome.runtime.sendMessage /
 * chrome.tabs.sendMessage between background.js, content.js,
 * and popup.js.
 *
 * Naming convention: <ACTOR>_<ACTION> so the sender's intent is
 * obvious from the constant name alone.
 */
export const MESSAGE_TYPES = Object.freeze({
  // Sent by background.js -> content.js when a scan finishes
  // (success or failure) and the page notification should update.
  SCAN_RESULT_READY: "SCAN_RESULT_READY",

  // Sent by background.js -> content.js immediately when a scan
  // starts, so the floating notification can show a loading state.
  SCAN_STARTED: "SCAN_STARTED",

  // Sent by popup.js -> background.js to request the latest stored
  // result for the currently active tab.
  POPUP_REQUEST_LATEST_SCAN: "POPUP_REQUEST_LATEST_SCAN",

  // Sent by popup.js -> background.js when the user clicks
  // "Scan Again" (manual re-scan, bypasses any cached result).
  POPUP_REQUEST_RESCAN: "POPUP_REQUEST_RESCAN",

  // Sent by content.js -> background.js when the user dismisses
  // the floating notification (optional analytics / state cleanup).
  NOTIFICATION_DISMISSED: "NOTIFICATION_DISMISSED",
});

/**
 * Lifecycle states for a single scan, independent of the final
 * verdict. Used to drive UI (loading spinner vs result vs error)
 * before a verdict even exists.
 */
export const SCAN_STATUS = Object.freeze({
  IDLE: "idle", // no scan has ever run for this tab/url
  SCANNING: "scanning", // request in flight
  COMPLETED: "completed", // request succeeded, verdict available
  FAILED: "failed", // request failed (network, timeout, server error)
});

/**
 * Verdict values as returned by the backend's unified_api ScanView.
 * These three strings are confirmed against correlation_engine.py's
 * threshold logic and ScanRecord.STATUS_CHOICES. Do not add values
 * here that are not confirmed by the backend contract.
 */
export const VERDICT = Object.freeze({
  SAFE: "SAFE",
  SUSPICIOUS: "SUSPICIOUS",
  CRITICAL: "CRITICAL",
});

/**
 * chrome.storage.local key naming.
 *
 * SCAN_RESULT_PREFIX: results are stored per full URL (not domain),
 * per the finalized decision that different pages on the same
 * domain (e.g. github.com vs github.com/login) can carry different
 * risk profiles and must be scanned/cached independently.
 *
 * Full key shape produced by storage.js: `${SCAN_RESULT_PREFIX}${url}`
 */
export const STORAGE_KEYS = Object.freeze({
  SCAN_RESULT_PREFIX: "scan:",
});

/**
 * Timeout and delay values (all in milliseconds) used across the
 * extension so tuning them later means editing one file, not
 * hunting through background.js/content.js/popup.js.
 */
export const TIMEOUTS = Object.freeze({
  // Max time to wait for the backend /scan/ request before treating
  // it as a failure. Generous because real AI/Web3 lookups (once
  // Member A/B's real implementations replace the stubs) may be
  // slower than the current placeholder logic.
  API_REQUEST_TIMEOUT_MS: 15000,

  // Minimum time the "scanning..." loading state is shown, even on
  // an instant cache hit, so the UI never flickers a result in
  // faster than the eye can register a state change.
  MIN_LOADING_STATE_MS: 200,

  // Auto-dismiss durations for the floating notification, per
  // verdict/status. SUSPICIOUS and CRITICAL are intentionally
  // absent here because they do not auto-dismiss (stay until the
  // user manually closes them).
  NOTIFICATION_AUTO_DISMISS_MS: Object.freeze({
    [VERDICT.SAFE]: 3000,
    FAILED: 5000,
  }),
});

/**
 * Badge background colors (chrome.action.setBadgeBackgroundColor),
 * keyed by verdict plus the two non-verdict states (scanning, failed).
 * Empty/idle state intentionally has no color — badge is left blank.
 */
export const BADGE_COLORS = Object.freeze({
  SCANNING: "#3B82F6", // blue
  [VERDICT.SAFE]: "#10B981", // green
  [VERDICT.SUSPICIOUS]: "#F59E0B", // amber
  [VERDICT.CRITICAL]: "#EF4444", // red
  FAILED: "#64748B", // neutral gray
});

/**
 * Backend API configuration. BASE_URL must be updated at deployment
 * time to match the host_permissions entry in manifest.json.
 */
export const API_CONFIG = Object.freeze({
  BASE_URL: "http://localhost:8000/api",
  ENDPOINTS: Object.freeze({
    SCAN: "/v1/scan/",
    HISTORY: "/v1/history/",
  }),
});