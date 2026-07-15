/* ============================================================
   Trinetra AI — background.js (service worker)
   FIXED: settings are now kept in a live in-memory cache that is
   synced via chrome.storage.onChanged, instead of being re-read
   from chrome.storage.local on every single event. This makes
   chrome.storage.local the single source of truth, with the
   in-memory cache as a fast, always-fresh mirror of it.
   ============================================================ */

const API_URL = "http://127.0.0.1:8000/api/v1/scan/";

const DEFAULT_SETTINGS = {
  autoScan: true,
  scanOnTabChange: true,
  floatingAlerts: true,
};

// Live in-memory mirror of chrome.storage.local's "trinetra_settings".
// Always kept in sync via chrome.storage.onChanged (see listener below).
let settingsCache = null;

function loadSettingsCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["trinetra_settings"], (data) => {
      settingsCache = { ...DEFAULT_SETTINGS, ...(data.trinetra_settings || {}) };
      resolve(settingsCache);
    });
  });
}

function getSettings() {
  if (settingsCache) return Promise.resolve(settingsCache);
  return loadSettingsCache();
}

// Prime the cache as soon as the service worker spins up.
loadSettingsCache();

// Keep the cache correct the instant popup.js writes new settings —
// this is what makes every toggle affect background.js immediately,
// with no re-fetch and no stale reads.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.trinetra_settings) {
    settingsCache = {
      ...DEFAULT_SETTINGS,
      ...(changes.trinetra_settings.newValue || {}),
    };
    console.log("Trinetra settings updated (background):", settingsCache);
  }
});

function classifyRisk(score) {
  if (typeof score !== "number") return null;
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

async function sendScanRequest(payload) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error("API Error : " + response.status);
    }

    return await response.json();
  } catch (error) {
    console.error("Trinetra API Error:", error);
    return { error: true, message: error.message };
  }
}

async function scanURL(url, tabId) {
  console.log("Scanning URL:", url);
  const result = await sendScanRequest({ url });
  await handleScanResult(result, url, tabId);
  return result;
}

async function scanEmail(emailText, tabId) {
  console.log("Scanning Email");
  const result = await sendScanRequest({ email: emailText });
  await handleScanResult(result, emailText, tabId);
  return result;
}

async function handleScanResult(result, source, tabId) {
  if (!result || result.error) {
    console.log("Scan Failed", result);
    return;
  }

  const risk = result.final_risk_score;
  console.log("Risk Score:", risk);

  chrome.storage.local.get(["scan_history"], (data) => {
    let history = data.scan_history || [];
    history.unshift({
      source,
      result,
      timestamp: new Date().toISOString(),
    });
    history = history.slice(0, 50);
    chrome.storage.local.set({ scan_history: history });
  });

  const tier = classifyRisk(risk);
  if (!tier) return;

  // Read settings ONCE, up front, before triggering either
  // notification channel. Both the native OS notification and the
  // in-page banner message are gated on the SAME settings.floatingAlerts
  // value, read at the same moment — no code path may fire either one
  // unconditionally.
  const settings = await getSettings();

  if (settings.floatingAlerts) {
    if (risk >= 70) {
      showThreatNotification("High Risk Threat Detected", result);
    } else if (risk >= 40) {
      showThreatNotification("Suspicious Activity Detected", result);
    }
  }

  if (tabId) {
    if (risk >= 40) {
      chrome.action.setBadgeText({ text: "!", tabId });
      chrome.action.setBadgeBackgroundColor({
        color: risk >= 70 ? "#EF4444" : "#F5A524",
        tabId,
      });
    } else {
      chrome.action.setBadgeText({ text: "", tabId });
    }
  }

  if (tabId && settings.floatingAlerts) {
    chrome.tabs
      .sendMessage(tabId, {
        type: "TRINETRA_RISK_UPDATE",
        tier,
        result,
      })
      .catch(() => {});
  }
}

function showThreatNotification(title, result) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message: `Threat: ${
      result.email_analysis?.label || result.url_analysis?.label || "Unknown"
    }\nRisk Score: ${result.final_risk_score}`,
  });
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;
  if (!changeInfo.url.startsWith("http")) return;

  const settings = await getSettings();
  if (!settings.autoScan) return;

  scanURL(changeInfo.url, tabId);
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const settings = await getSettings();
  if (!settings.scanOnTabChange) return;

  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;
    if (!tab.url.startsWith("http")) return;
    scanURL(tab.url, tab.id);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCAN_EMAIL") {
    scanEmail(message.content, sender.tab?.id);
    sendResponse({ status: "Email scan started" });
    return true;
  }

  if (message.type === "MANUAL_SCAN") {
    (async () => {
      const result = await sendScanRequest({ url: message.url });

      if (result && result.error) {
        const isOffline = /fetch|network|abort/i.test(result.message || "");
        sendResponse({
          status: isOffline ? "offline" : "error",
          message: result.message,
        });
        return;
      }

      await handleScanResult(result, message.url, message.tabId);
      sendResponse({ status: "ready", result });
    })();
    return true;
  }

  if (message.type === "OPEN_POPUP") {
    try {
      chrome.action.openPopup();
      sendResponse({ opened: true });
    } catch (error) {
      sendResponse({ opened: false });
    }
    return true;
  }

  if (message.type === "CLEAR_BADGE" && sender.tab?.id) {
    chrome.action.setBadgeText({ text: "", tabId: sender.tab.id });
    sendResponse({ cleared: true });
    return true;
  }

  return true;
});

chrome.runtime.onStartup.addListener(() => {
  console.log("Trinetra AI Extension Started");
  loadSettingsCache();
});