/* ============================================================
   Trinetra AI — background.js (service worker)
   UNCHANGED — no bug found here.
   ============================================================ */

const API_URL = "http://127.0.0.1:8000/api/v1/scan/";

const DEFAULT_SETTINGS = {
  autoScan: true,
  scanOnTabChange: true,
  floatingAlerts: true,
};

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["trinetra_settings"], (data) => {
      resolve({ ...DEFAULT_SETTINGS, ...(data.trinetra_settings || {}) });
    });
  });
}

function classifyRisk(score) {
  if (typeof score !== "number") return null;
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

async function sendScanRequest(payload) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

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

  if (risk >= 70) {
    showThreatNotification("High Risk Threat Detected", result);
  } else if (risk >= 40) {
    showThreatNotification("Suspicious Activity Detected", result);
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

  const settings = await getSettings();
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
});