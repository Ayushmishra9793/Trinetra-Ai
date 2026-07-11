/**
 * ============================================================
 * utils/storage.js
 * ------------------------------------------------------------
 * The ONLY file in this extension allowed to call
 * chrome.storage.local directly.
 *
 * WHY THIS MATTERS:
 * background.js writes scan results, popup.js reads them. If both
 * files called chrome.storage.local.get/set with their own hand-
 * rolled key strings, a single typo (or a later schema change)
 * would silently desync them. Every other file must go through
 * the functions exported here instead.
 *
 * STORAGE KEY STRATEGY:
 * Results are keyed by the FULL URL, not domain. This is a
 * deliberate decision: github.com/login and github.com/settings
 * can carry different risk profiles and must be scanned/cached
 * independently, not collapsed into one github.com entry.
 *
 * STORED SHAPE (per key):
 * {
 *   url: string,
 *   hostname: string,
 *   verdict: "SAFE" | "SUSPICIOUS" | "CRITICAL" | null,
 *   unifiedScore: number | null,
 *   aiRiskScore: number | null,
 *   web3Result: object | null,
 *   explanation: string | null,
 *   scanStatus: "idle" | "scanning" | "completed" | "failed",
 *   scannedAt: number (epoch ms) | null
 * }
 *
 * All functions are async and return Promises, matching MV3's
 * promise-based chrome.storage API (no callbacks needed in
 * modern Chrome, which this extension targets via
 * minimum_chrome_version in manifest.json).
 * ============================================================
 */

import { STORAGE_KEYS } from "./constants.js";

/**
 * Builds the full storage key for a given URL.
 * Kept private to this file so the prefix convention only lives
 * in one place.
 *
 * @param {string} url - Full URL of the scanned page.
 * @returns {string} The storage key, e.g. "scan:https://example.com/login"
 */
function buildScanKey(url) {
  if (!url || typeof url !== "string") {
    throw new TypeError("buildScanKey: url must be a non-empty string");
  }
  return `${STORAGE_KEYS.SCAN_RESULT_PREFIX}${url}`;
}

/**
 * Saves (creates or overwrites) the scan result for a given URL.
 *
 * @param {string} url - Full URL the result belongs to.
 * @param {object} scanData - Partial or complete scan record. Any
 *   fields not provided are filled with safe defaults so callers
 *   never have to pass a fully-formed object every time (e.g. when
 *   only updating scanStatus to "scanning").
 * @returns {Promise<object>} The complete record that was saved.
 */
export async function saveScanResult(url, scanData = {}) {
  const key = buildScanKey(url);

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    // If the URL is somehow malformed, fall back to an empty
    // hostname rather than throwing — a display concern, not
    // fatal to storage.
    hostname = "";
  }

  const record = {
    url,
    hostname,
    verdict: scanData.verdict ?? null,
    unifiedScore: scanData.unifiedScore ?? null,
    aiRiskScore: scanData.aiRiskScore ?? null,
    web3Result: scanData.web3Result ?? null,
    explanation: scanData.explanation ?? null,
    scanStatus: scanData.scanStatus ?? "idle",
    scannedAt: scanData.scannedAt ?? Date.now(),
  };

  await chrome.storage.local.set({ [key]: record });
  return record;
}

/**
 * Retrieves the stored scan result for a given URL.
 *
 * @param {string} url - Full URL to look up.
 * @returns {Promise<object|null>} The stored record, or null if
 *   nothing has ever been scanned for this URL (the "empty state"
 *   case the popup UI needs to detect).
 */
export async function getScanResult(url) {
  const key = buildScanKey(url);
  const result = await chrome.storage.local.get(key);
  return result[key] ?? null;
}

/**
 * Removes the stored scan result for a single URL.
 * Useful if a URL's cached result should be invalidated without
 * wiping every other stored scan.
 *
 * @param {string} url - Full URL to remove.
 * @returns {Promise<void>}
 */
export async function removeScanResult(url) {
  const key = buildScanKey(url);
  await chrome.storage.local.remove(key);
}

/**
 * Clears every scan result stored by this extension.
 *
 * NOTE: this only removes keys with the scan prefix — it does NOT
 * call chrome.storage.local.clear(), because that would wipe any
 * other extension data that might be added under a different key
 * namespace in the future (keeping this function safe even as the
 * project grows beyond scan results).
 *
 * @returns {Promise<void>}
 */
export async function clearAllScanResults() {
  const allItems = await chrome.storage.local.get(null);
  const scanKeys = Object.keys(allItems).filter((key) =>
    key.startsWith(STORAGE_KEYS.SCAN_RESULT_PREFIX)
  );

  if (scanKeys.length > 0) {
    await chrome.storage.local.remove(scanKeys);
  }
}