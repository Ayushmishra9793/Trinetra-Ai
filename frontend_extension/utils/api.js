/**
 * ============================================================
 * utils/api.js
 * ------------------------------------------------------------
 * The ONLY file allowed to fetch() the Trinetra AI backend.
 *
 * WHY THIS MATTERS:
 * Per the project architecture, popup.js must NEVER call the
 * backend directly — only background.js may, and it does so
 * exclusively through the functions exported here. This file has
 * no knowledge of chrome.storage, chrome.runtime messaging, or the
 * DOM — it only knows how to talk to the Django API and hand back
 * a predictable, normalized result.
 *
 * NORMALIZED RETURN SHAPE (every function here returns this):
 * {
 *   success: boolean,
 *   data: object | null,   // raw backend JSON on success, else null
 *   error: {
 *     type: "VALIDATION" | "SERVER" | "NETWORK" | "TIMEOUT" | "PARSE",
 *     message: string,
 *     details: object | null  // raw validation error body, if any
 *   } | null
 * }
 *
 * This shape means background.js never has to guess what went
 * wrong — it can branch on error.type directly.
 *
 * FIELD ASSUMPTIONS:
 * Only fields confirmed in unified_api/views.py and serializers.py
 * are referenced anywhere in this file:
 *   scan response: verdict, unified_score, ai_risk_score,
 *                  web3_result, explanation
 *   history response: array of ScanRecord fields (id, url,
 *                  wallet_address, ai_risk_score, web3_risk_status,
 *                  web3_reason, unified_threat_score, final_verdict,
 *                  gemini_explanation, created_at)
 * No field is invented or assumed beyond this contract.
 * ============================================================
 */

import { API_CONFIG, TIMEOUTS } from "./constants.js";

/**
 * Performs a fetch() with a hard timeout using AbortController,
 * since the native fetch API has no built-in timeout option.
 *
 * @param {string} url - Full request URL.
 * @param {object} options - Standard fetch options (method, body, headers).
 * @param {number} timeoutMs - Milliseconds before the request is aborted.
 * @returns {Promise<Response>} The raw fetch Response, if it completes in time.
 * @throws {DOMException} Named "AbortError" if the timeout is hit.
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Safely parses a Response body as JSON. The backend does not
 * guarantee a JSON body on every status code -- an unhandled 500
 * can return an HTML debug page, and json() will throw in that
 * case. This wrapper turns that throw into a controlled result
 * instead of letting it bubble up as an unhandled rejection.
 *
 * @param {Response} response - The fetch Response to parse.
 * @returns {Promise<{ ok: boolean, body: object|null }>}
 */
async function safeParseJson(response) {
  try {
    const body = await response.json();
    return { ok: true, body };
  } catch {
    return { ok: false, body: null };
  }
}

/**
 * Builds a normalized error result. Kept private so every failure
 * path in this file produces an identically-shaped object.
 *
 * @param {"VALIDATION"|"SERVER"|"NETWORK"|"TIMEOUT"|"PARSE"} type
 * @param {string} message - Human-readable summary.
 * @param {object|null} details - Raw error body, if available.
 * @returns {object} Normalized failure envelope.
 */
function buildErrorResult(type, message, details = null) {
  return {
    success: false,
    data: null,
    error: { type, message, details },
  };
}

/**
 * Builds a normalized success result. Kept private for the same
 * consistency reason as buildErrorResult.
 *
 * @param {object} data - Parsed backend response body.
 * @returns {object} Normalized success envelope.
 */
function buildSuccessResult(data) {
  return { success: true, data, error: null };
}

/**
 * Calls POST /api/v1/scan/ to scan a URL, optionally including a
 * wallet address for the active-interception stage.
 *
 * @param {string} url - The full URL to scan. Required by the backend.
 * @param {string|null} [walletAddress] - Optional Ethereum wallet
 *   address. Must match ^0x[a-fA-F0-9]{40}$ or the backend will
 *   reject the entire request with a 400 -- omit it entirely for
 *   normal passive/automatic browsing scans.
 * @returns {Promise<object>} Normalized result. On success, `data`
 *   contains exactly: verdict, unified_score, ai_risk_score,
 *   web3_result, explanation -- as returned by ScanView.
 */
export async function scanWebsite(url, walletAddress = null) {
  if (!url || typeof url !== "string") {
    return buildErrorResult(
      "VALIDATION",
      "A valid url string is required to scan a website."
    );
  }

  const requestBody = { url };
  if (walletAddress) {
    requestBody.wallet_address = walletAddress;
  }

  const endpoint = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SCAN}`;

  let response;
  try {
    response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
      TIMEOUTS.API_REQUEST_TIMEOUT_MS
    );
  } catch (err) {
    if (err.name === "AbortError") {
      return buildErrorResult(
        "TIMEOUT",
        "The scan request took too long and was cancelled."
      );
    }
    // Any other thrown error here is a network-level failure
    // (offline, DNS failure, backend unreachable, CORS block, etc.)
    return buildErrorResult(
      "NETWORK",
      "Could not reach the Trinetra AI backend. Check your connection."
    );
  }

  const { ok: parsedOk, body } = await safeParseJson(response);

  if (!parsedOk) {
    // Response was not valid JSON -- e.g. Django's HTML debug page
    // on an unhandled 500. We know something is wrong, but cannot
    // trust the body shape at all.
    return buildErrorResult(
      "PARSE",
      "The server returned an unexpected response that could not be read."
    );
  }

  if (response.status === 400) {
    // Serializer validation failure. body is DRF's default
    // { field_name: ["error message"] } shape.
    return buildErrorResult(
      "VALIDATION",
      "The scan request was rejected as invalid.",
      body
    );
  }

  if (!response.ok) {
    // Any other non-2xx status (e.g. 500) that still happened to
    // return parseable JSON.
    return buildErrorResult(
      "SERVER",
      `The backend returned an unexpected error (status ${response.status}).`,
      body
    );
  }

  return buildSuccessResult(body);
}

/**
 * Calls GET /api/v1/history/ to fetch the last 20 stored scan
 * records. Note: this endpoint is NOT filtered by URL, domain, or
 * tab -- it returns the most recent 20 scans across all activity.
 * Per the finalized project scope, this is not wired into the
 * popup for v1 and is exposed here only for potential future use.
 *
 * @returns {Promise<object>} Normalized result. On success, `data`
 *   is an array of ScanRecord objects.
 */
export async function getScanHistory() {
  const endpoint = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HISTORY}`;

  let response;
  try {
    response = await fetchWithTimeout(
      endpoint,
      { method: "GET" },
      TIMEOUTS.API_REQUEST_TIMEOUT_MS
    );
  } catch (err) {
    if (err.name === "AbortError") {
      return buildErrorResult(
        "TIMEOUT",
        "The history request took too long and was cancelled."
      );
    }
    return buildErrorResult(
      "NETWORK",
      "Could not reach the Trinetra AI backend. Check your connection."
    );
  }

  const { ok: parsedOk, body } = await safeParseJson(response);

  if (!parsedOk) {
    return buildErrorResult(
      "PARSE",
      "The server returned an unexpected response that could not be read."
    );
  }

  if (!response.ok) {
    return buildErrorResult(
      "SERVER",
      `The backend returned an unexpected error (status ${response.status}).`,
      body
    );
  }

  return buildSuccessResult(body);
}