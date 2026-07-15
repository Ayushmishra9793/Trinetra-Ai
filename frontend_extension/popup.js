/* ============================================================
   Trinetra AI — popup.js
   UNCHANGED — confirmed bug-free by trace in prior turn.
   Binds the popup UI to real chrome.storage.local scan_history
   and the current active tab. Talks to background.js via
   chrome.runtime.sendMessage (MANUAL_SCAN, CLEAR_BADGE).
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  const appMain = document.getElementById("appMain");
  const body = document.body;

  const el = {
    headerBackButton: document.getElementById("headerBackButton"),
    headerTitle: document.getElementById("headerTitle"),

    panelReady: document.getElementById("panelReady"),
    stateLoading: document.getElementById("stateLoading"),
    stateScanning: document.getElementById("stateScanning"),
    stateOffline: document.getElementById("stateOffline"),
    stateError: document.getElementById("stateError"),
    stateEmpty: document.getElementById("stateEmpty"),

    viewHome: document.getElementById("viewHome"),
    viewSettings: document.getElementById("viewSettings"),
    viewHistory: document.getElementById("viewHistory"),

    navHomeTab: document.getElementById("navHomeTab"),
    navSettingsTab: document.getElementById("navSettingsTab"),
    navHistoryTab: document.getElementById("navHistoryTab"),

    protectionStatus: document.getElementById("protectionStatus"),
    protectionStatusLabel: document.getElementById("protectionStatusLabel"),

    siteFavicon: document.getElementById("siteFavicon"),
    siteFaviconFallback: document.getElementById("siteFaviconFallback"),
    siteDomain: document.getElementById("siteDomain"),
    lastScanTime: document.getElementById("lastScanTime"),

    riskMeter: document.getElementById("riskMeter"),
    riskMeterArc: document.getElementById("riskMeterArc"),
    riskScoreValue: document.getElementById("riskScoreValue"),

    verdictText: document.getElementById("verdictText"),
    verdictExplanation: document.getElementById("verdictExplanation"),
    verdictConfidence: document.getElementById("verdictConfidence"),
    verdictEngine: document.getElementById("verdictEngine"),

    factScanTypeValue: document.getElementById("factScanTypeValue"),
    factRiskTierValue: document.getElementById("factRiskTierValue"),

    scanAgainButton: document.getElementById("scanAgainButton"),
    offlineRetryButton: document.getElementById("offlineRetryButton"),
    errorRetryButton: document.getElementById("errorRetryButton"),
    emptyScanButton: document.getElementById("emptyScanButton"),

    historyList: document.getElementById("historyList"),
    historyEmptyState: document.getElementById("historyEmptyState"),
    historyItemTemplate: document.getElementById("historyItemTemplate"),
    historyCountBadge: document.getElementById("historyCountBadge"),

    settingsForm: document.getElementById("settingsForm"),
    autoScanToggle: document.getElementById("autoScanToggle"),
    scanOnTabChangeToggle: document.getElementById("scanOnTabChangeToggle"),
    floatingAlertsToggle: document.getElementById("floatingAlertsToggle"),
    themeSelect: document.getElementById("themeSelect"),
    clearHistoryButton: document.getElementById("clearHistoryButton"),
  };

  for (const [key, node] of Object.entries(el)) {
    if (!node) console.error(`[Trinetra popup.js] Missing element: #${key}`);
  }

  const STATE_PANELS = {
    loading: el.stateLoading,
    scanning: el.stateScanning,
    ready: el.panelReady,
    offline: el.stateOffline,
    error: el.stateError,
    empty: el.stateEmpty,
  };

  const VIEWS = {
    home: el.viewHome,
    settings: el.viewSettings,
    history: el.viewHistory,
  };

  const VIEW_TITLES = {
    home: "Trinetra AI",
    settings: "Settings",
    history: "Scan History",
  };

  const NAV_TABS = {
    home: el.navHomeTab,
    settings: el.navSettingsTab,
    history: el.navHistoryTab,
  };

  const RISK_LABELS = {
    low: "Protected",
    medium: "Suspicious Activity",
    high: "Threat Detected",
  };

  const RISK_TIER_DISPLAY = { low: "Low", medium: "Medium", high: "High" };

  const DEFAULT_SETTINGS = {
    autoScan: true,
    scanOnTabChange: true,
    floatingAlerts: true,
    theme: "dark",
  };

  let currentTab = null;

  function setAppState(state) {
    if (!STATE_PANELS[state]) {
      console.error(`[Trinetra popup.js] Unknown state: "${state}"`);
      return;
    }
    appMain.setAttribute("data-state", state);
    for (const [key, panel] of Object.entries(STATE_PANELS)) {
      if (panel) panel.hidden = key !== state;
    }
  }

  function setActiveView(view) {
    if (!VIEWS[view]) {
      console.error(`[Trinetra popup.js] Unknown view: "${view}"`);
      return;
    }
    appMain.setAttribute("data-view", view);
    for (const [key, viewEl] of Object.entries(VIEWS)) {
      if (viewEl) viewEl.hidden = key !== view;
    }
    for (const [key, tab] of Object.entries(NAV_TABS)) {
      if (tab) tab.setAttribute("aria-selected", key === view ? "true" : "false");
    }
    if (el.headerTitle) el.headerTitle.textContent = VIEW_TITLES[view];
    if (el.headerBackButton) el.headerBackButton.hidden = view === "home";

    if (view === "history") renderHistory();
  }

  function setRiskLevel(tier) {
    if (!RISK_LABELS[tier]) return;
    body.setAttribute("data-risk-level", tier);
    if (el.protectionStatusLabel) el.protectionStatusLabel.textContent = RISK_LABELS[tier];
    if (el.protectionStatus) {
      el.protectionStatus.setAttribute("aria-label", `Protection status: ${RISK_LABELS[tier]}`);
    }
  }

  function classifyRisk(score) {
    if (typeof score !== "number") return null;
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  el.navHomeTab?.addEventListener("click", () => setActiveView("home"));
  el.navSettingsTab?.addEventListener("click", () => setActiveView("settings"));
  el.navHistoryTab?.addEventListener("click", () => setActiveView("history"));
  el.headerBackButton?.addEventListener("click", () => setActiveView("home"));

  function relativeTime(isoString) {
    const then = new Date(isoString).getTime();
    const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (diffSec < 5) return "just now";
    if (diffSec < 60) return `scanned ${diffSec}s ago`;
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `scanned ${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    return `scanned ${diffHr}h ago`;
  }

  function hostnameOf(value) {
    try {
      return new URL(value).hostname;
    } catch {
      return null;
    }
  }

  function setRingScore(score) {
    const clamped = Math.max(0, Math.min(100, score));
    if (el.riskMeterArc) {
      el.riskMeterArc.setAttribute("stroke-dasharray", `${clamped} 100`);
    }
    if (el.riskScoreValue) {
      el.riskScoreValue.textContent = String(Math.round(clamped));
    }
    if (el.riskMeter) {
      el.riskMeter.setAttribute("aria-label", `Risk score ${Math.round(clamped)} out of 100`);
    }
  }

  function renderReady(tab, entry) {
    const result = entry.result;
    const analysis = result.email_analysis || result.url_analysis || {};
    const scanType = result.email_analysis ? "Email" : result.url_analysis ? "URL" : "—";
    const label = analysis.label || result.verdict || result.label || null;
    const confidence = analysis.confidence ?? result.confidence;
    const engine = analysis.model || analysis.model_used || result.model || result.model_used;
    const explanation = analysis.explanation || result.explanation;
    const score = result.final_risk_score;
    const tier = classifyRisk(score) || "low";

    setRiskLevel(tier);
    setRingScore(typeof score === "number" ? score : 0);

    if (el.verdictText) {
      el.verdictText.textContent = label || "Scan complete — no verdict label returned.";
    }

    if (el.verdictExplanation) {
      if (explanation) {
        el.verdictExplanation.textContent = explanation;
        el.verdictExplanation.hidden = false;
      } else {
        el.verdictExplanation.hidden = true;
        el.verdictExplanation.textContent = "";
      }
    }

    if (el.verdictConfidence) {
      el.verdictConfidence.textContent =
        typeof confidence === "number" ? `${Math.round(confidence * (confidence <= 1 ? 100 : 1))}%` : "—";
    }
    if (el.verdictEngine) {
      el.verdictEngine.textContent = engine ? `Engine: ${engine}` : "Engine: —";
    }

    if (el.factScanTypeValue) el.factScanTypeValue.textContent = scanType;
    if (el.factRiskTierValue) el.factRiskTierValue.textContent = RISK_TIER_DISPLAY[tier];

    if (el.siteDomain) {
      const host = hostnameOf(tab.url) || hostnameOf(entry.source) || tab.url || "—";
      el.siteDomain.textContent = host;
    }
    if (el.lastScanTime) el.lastScanTime.textContent = relativeTime(entry.timestamp);

    setFavicon(tab);
    setAppState("ready");
  }

  function setFavicon(tab) {
    if (!el.siteFavicon || !el.siteFaviconFallback) return;
    if (tab.favIconUrl) {
      el.siteFavicon.src = tab.favIconUrl;
      el.siteFavicon.hidden = false;
      el.siteFaviconFallback.hidden = true;
      el.siteFavicon.onerror = () => {
        el.siteFavicon.hidden = true;
        el.siteFaviconFallback.hidden = false;
      };
    } else {
      el.siteFavicon.hidden = true;
      el.siteFaviconFallback.hidden = false;
    }
  }

  function loadHome() {
    setAppState("loading");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      currentTab = tab || null;

      if (!tab || !tab.url || !tab.url.startsWith("http")) {
        setAppState("empty");
        if (el.siteDomain) el.siteDomain.textContent = tab?.url ? hostnameOf(tab.url) || tab.url : "—";
        return;
      }

      chrome.storage.local.get(["scan_history"], (data) => {
        const history = data.scan_history || [];
        const host = hostnameOf(tab.url);
        const match = history.find((entry) => hostnameOf(entry.source) === host);

        if (!match) {
          setFavicon(tab);
          if (el.siteDomain) el.siteDomain.textContent = host || tab.url;
          setAppState("empty");
          return;
        }

        renderReady(tab, match);
      });
    });
  }

  function renderHistory() {
    chrome.storage.local.get(["scan_history"], (data) => {
      const history = data.scan_history || [];

      if (el.historyCountBadge) {
        if (history.length > 0) {
          el.historyCountBadge.hidden = false;
          el.historyCountBadge.textContent = String(history.length);
        } else {
          el.historyCountBadge.hidden = true;
        }
      }

      if (!el.historyList || !el.historyItemTemplate) return;
      el.historyList.innerHTML = "";

      if (history.length === 0) {
        if (el.historyEmptyState) el.historyEmptyState.hidden = false;
        return;
      }
      if (el.historyEmptyState) el.historyEmptyState.hidden = true;

      history.slice(0, 5).forEach((entry) => {
        const node = el.historyItemTemplate.content.cloneNode(true);
        const score = entry.result?.final_risk_score;
        const tier = classifyRisk(score) || "low";
        const analysis = entry.result?.email_analysis || entry.result?.url_analysis || {};
        const label = analysis.label || entry.result?.verdict || "—";
        const host = hostnameOf(entry.source) || (entry.source || "").slice(0, 40);

        node.querySelector(".history-item__dot").style.background = `var(--color-accent)`;
        node.querySelector(".history-item__dot").setAttribute("data-tier", tier);
        node.querySelector(".history-item__domain").textContent = host;
        node.querySelector(".history-item__verdict").textContent = label;
        node.querySelector(".history-item__score").textContent =
          typeof score === "number" ? `${score}%` : "—";
        node.querySelector(".history-item__time").textContent = relativeTime(entry.timestamp);

        el.historyList.appendChild(node);
      });
    });
  }

  function loadSettings() {
    chrome.storage.local.get(["trinetra_settings"], (data) => {
      const settings = { ...DEFAULT_SETTINGS, ...(data.trinetra_settings || {}) };
      if (el.autoScanToggle) el.autoScanToggle.checked = settings.autoScan;
      if (el.scanOnTabChangeToggle) el.scanOnTabChangeToggle.checked = settings.scanOnTabChange;
      if (el.floatingAlertsToggle) el.floatingAlertsToggle.checked = settings.floatingAlerts;
      if (el.themeSelect) el.themeSelect.value = settings.theme;
      body.setAttribute("data-theme", settings.theme);
    });
  }

  function saveSettings(partial) {
    chrome.storage.local.get(["trinetra_settings"], (data) => {
      const merged = { ...DEFAULT_SETTINGS, ...(data.trinetra_settings || {}), ...partial };
      chrome.storage.local.set({ trinetra_settings: merged });
    });
  }

  el.autoScanToggle?.addEventListener("change", () =>
    saveSettings({ autoScan: el.autoScanToggle.checked })
  );
  el.scanOnTabChangeToggle?.addEventListener("change", () =>
    saveSettings({ scanOnTabChange: el.scanOnTabChangeToggle.checked })
  );
  el.floatingAlertsToggle?.addEventListener("change", () =>
    saveSettings({ floatingAlerts: el.floatingAlertsToggle.checked })
  );
  el.themeSelect?.addEventListener("change", () => {
    body.setAttribute("data-theme", el.themeSelect.value);
    saveSettings({ theme: el.themeSelect.value });
  });
  el.clearHistoryButton?.addEventListener("click", () => {
    chrome.storage.local.set({ scan_history: [] }, () => {
      renderHistory();
    });
  });

  function runManualScan() {
    if (!currentTab || !currentTab.url || !currentTab.url.startsWith("http")) {
      setAppState("empty");
      return;
    }

    setAppState("scanning");

    chrome.runtime.sendMessage(
      { type: "MANUAL_SCAN", url: currentTab.url, tabId: currentTab.id },
      (response) => {
        if (chrome.runtime.lastError || !response) {
          setAppState("offline");
          return;
        }
        if (response.status === "offline") {
          setAppState("offline");
          return;
        }
        if (response.status === "error") {
          setAppState("error");
          return;
        }
        loadHome();
      }
    );
  }

  el.scanAgainButton?.addEventListener("click", runManualScan);
  el.offlineRetryButton?.addEventListener("click", runManualScan);
  el.errorRetryButton?.addEventListener("click", runManualScan);
  el.emptyScanButton?.addEventListener("click", runManualScan);

  loadSettings();
  loadHome();
  setActiveView("home");

  if (currentTab?.id) {
    chrome.runtime.sendMessage({ type: "CLEAR_BADGE" });
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, () => {
      chrome.runtime.sendMessage({ type: "CLEAR_BADGE" });
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.scan_history && appMain.getAttribute("data-view") === "home") {
      loadHome();
    }
    if (changes.scan_history && appMain.getAttribute("data-view") === "history") {
      renderHistory();
    }
  });
});