// ============================================================
// TRINETRA AI — content.js
// Zero Trust Web3 Security Shield
// Responsibility: Render fullscreen warning overlay when
// background.js detects a CRITICAL threat. Runs inside webpage DOM.
// ============================================================

(() => {
  // Guard: agar ye script kisi wajah se dobara inject ho jaye
  // (SPA navigation, extension reload), purani instance ko skip karo.
  if (window.__trinetraContentScriptLoaded) {
    console.log("[Trinetra AI] content.js already loaded, skipping re-init.");
    return;
  }
  window.__trinetraContentScriptLoaded = true;

  console.log("[Trinetra AI] content.js injected and active on:", window.location.href);

  // ------------------------------------------------------------
  // 1. CONSTANTS
  // ------------------------------------------------------------

  const OVERLAY_ID = "trinetra-critical-overlay";
  const STYLE_TAG_ID = "trinetra-overlay-styles";

  // NOTE: Ye type background.js ke saath match hona chahiye.
  // Humare existing background.js mein "SHOW_CRITICAL_WARNING" use ho raha hai.
  // Agar future mein naam "SHOW_WARNING_OVERLAY" karna ho, dono files mein
  // sync karke change karna.
  const MESSAGE_TYPES = {
    SHOW_WARNING: "SHOW_CRITICAL_WARNING",
  };

  // ------------------------------------------------------------
  // 2. STYLE INJECTION (CSS via <style> tag)
  // ------------------------------------------------------------

  /**
   * Overlay ke liye CSS ko ek <style> tag ke through inject karta hai.
   * Inline styles ke bajaye <style> tag isliye use kiya kyunki:
   * - Animations (keyframes) ke liye zaroori hai
   * - Code readable aur maintainable rehta hai
   */
  function injectStylesOnce() {
    if (document.getElementById(STYLE_TAG_ID)) return; // duplicate mat banao

    const style = document.createElement("style");
    style.id = STYLE_TAG_ID;
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important; /* max possible z-index, scam site isse upar nahi ja sakti */
        background: radial-gradient(circle at center, rgba(20,0,0,0.95) 0%, rgba(0,0,0,0.98) 100%) !important;
        backdrop-filter: blur(14px) !important;
        -webkit-backdrop-filter: blur(14px) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: 'Segoe UI', Roboto, Arial, sans-serif !important;
        opacity: 0;
        animation: trinetra-fade-in 0.35s ease forwards;
        pointer-events: all !important;
      }

      @keyframes trinetra-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes trinetra-slide-up {
        from { transform: translateY(24px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes trinetra-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.55); }
        50% { box-shadow: 0 0 0 14px rgba(231, 76, 60, 0); }
      }

      .trinetra-card {
        width: min(560px, 90vw);
        max-height: 85vh;
        overflow-y: auto;
        background: linear-gradient(145deg, #12161c, #1a1f27);
        border: 1px solid rgba(231, 76, 60, 0.4);
        border-radius: 16px;
        padding: 32px;
        color: #e8e8e8;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        animation: trinetra-slide-up 0.4s ease 0.1s both;
      }

      .trinetra-icon-badge {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(231, 76, 60, 0.15);
        border: 2px solid #e74c3c;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 18px auto;
        font-size: 30px;
        animation: trinetra-pulse 2s infinite;
      }

      .trinetra-title {
        text-align: center;
        font-size: 21px;
        font-weight: 700;
        color: #ff5b4d;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }

      .trinetra-subtitle {
        text-align: center;
        font-size: 13px;
        color: #9aa0a8;
        margin-bottom: 22px;
      }

      .trinetra-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255,255,255,0.07);
        font-size: 13.5px;
      }

      .trinetra-row:last-of-type {
        border-bottom: none;
      }

      .trinetra-label {
        color: #9aa0a8;
        flex-shrink: 0;
      }

      .trinetra-value {
        color: #f1f1f1;
        text-align: right;
        word-break: break-all;
        font-weight: 500;
      }

      .trinetra-value.trinetra-score-critical {
        color: #ff5b4d;
        font-weight: 700;
      }

      .trinetra-explanation-box {
        margin-top: 18px;
        padding: 14px;
        background: rgba(255,255,255,0.04);
        border-left: 3px solid #e74c3c;
        border-radius: 6px;
        font-size: 13px;
        line-height: 1.55;
        color: #d6d6d6;
      }

      .trinetra-actions {
        display: flex;
        gap: 10px;
        margin-top: 24px;
      }

      .trinetra-btn {
        flex: 1;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13.5px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: transform 0.15s ease, opacity 0.15s ease;
      }

      .trinetra-btn:hover {
        transform: translateY(-1px);
        opacity: 0.92;
      }

      .trinetra-btn-primary {
        background: #e74c3c;
        color: #fff;
      }

      .trinetra-btn-secondary {
        background: transparent;
        color: #9aa0a8;
        border: 1px solid rgba(255,255,255,0.15) !important;
      }

      .trinetra-footer {
        text-align: center;
        margin-top: 18px;
        font-size: 11px;
        color: #5c626b;
      }

      /* Original page ko blur karne ke liye */
      body.trinetra-page-locked > *:not(#${OVERLAY_ID}) {
        filter: blur(6px) !important;
      }

      body.trinetra-page-locked {
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ------------------------------------------------------------
  // 3. HELPER — HTML escape (XSS prevention)
  // ------------------------------------------------------------

  /**
   * Backend se aaya hua text (jaise ai_explanation) ko HTML mein
   * daalne se pehle escape karta hai, taaki agar backend/Gemini se
   * accidentally koi HTML/script string aa jaye, wo execute na ho.
   * Security best practice — kabhi bhi external data ko raw innerHTML
   * mein mat daalo.
   */
  function escapeHtml(text) {
    if (typeof text !== "string") return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ------------------------------------------------------------
  // 4. PAGE LOCK / UNLOCK (blur + disable scroll + block interaction)
  // ------------------------------------------------------------

  function lockPage() {
    document.body.classList.add("trinetra-page-locked");
  }

  function unlockPage() {
    document.body.classList.remove("trinetra-page-locked");
  }

  // ------------------------------------------------------------
  // 5. OVERLAY BUILDER
  // ------------------------------------------------------------

  /**
   * Scan result data se overlay ka poora HTML content banata hai.
   * @param {Object} data - background.js se aaya scan result
   */
  function buildOverlayContent(data) {
    const {
      scanned_url: url,
      risk_level: riskLevel,
      unified_threat_score: threatScore,
      ai_explanation: aiExplanation,
      recommendation,
    } = data || {};

    const safeUrl = escapeHtml(url || "Unknown URL");
    const safeRiskLevel = escapeHtml(riskLevel || "CRITICAL");
    const safeScore =
      typeof threatScore === "number" ? `${threatScore} / 100` : "N/A";
    const safeExplanation = escapeHtml(
      aiExplanation || "This website has been flagged as a high-risk threat based on AI analysis."
    );
    const safeRecommendation = escapeHtml(
      recommendation || "Do not enter personal information or connect your wallet to this site."
    );

    return `
      <div class="trinetra-card" role="alertdialog" aria-labelledby="trinetra-title" aria-describedby="trinetra-desc">
        <div class="trinetra-icon-badge">⚠️</div>
        <div class="trinetra-title" id="trinetra-title">TRINETRA AI — CRITICAL THREAT DETECTED</div>
        <div class="trinetra-subtitle">This website has been blocked for your protection</div>

        <div class="trinetra-row">
          <span class="trinetra-label">Website URL</span>
          <span class="trinetra-value">${safeUrl}</span>
        </div>
        <div class="trinetra-row">
          <span class="trinetra-label">Threat Level</span>
          <span class="trinetra-value trinetra-score-critical">${safeRiskLevel}</span>
        </div>
        <div class="trinetra-row">
          <span class="trinetra-label">Unified Threat Score</span>
          <span class="trinetra-value trinetra-score-critical">${safeScore}</span>
        </div>

        <div class="trinetra-explanation-box" id="trinetra-desc">
          <strong>AI Explanation:</strong><br/>
          ${safeExplanation}
          <br/><br/>
          <strong>Recommendation:</strong><br/>
          ${safeRecommendation}
        </div>

        <div class="trinetra-actions">
          <button class="trinetra-btn trinetra-btn-secondary" id="trinetra-btn-leave">Leave This Site</button>
          <button class="trinetra-btn trinetra-btn-primary" id="trinetra-btn-proceed">Proceed Anyway (Not Recommended)</button>
        </div>

        <div class="trinetra-footer">Protected by Trinetra AI — Zero Trust Web3 Security Shield</div>
      </div>
    `;
  }

  // ------------------------------------------------------------
  // 6. SHOW OVERLAY (create or replace)
  // ------------------------------------------------------------

  /**
   * Fullscreen warning overlay dikhata hai. Agar overlay already
   * exist karta hai (purana scan), use naye data se replace karta hai.
   */
  function showWarningOverlay(data) {
    try {
      injectStylesOnce();

      let overlay = document.getElementById(OVERLAY_ID);

      if (overlay) {
        // Purana overlay already hai — sirf content replace karo (duplicate mat banao)
        console.log("[Trinetra AI] Overlay already exists, updating content.");
        overlay.innerHTML = buildOverlayContent(data);
      } else {
        overlay = document.createElement("div");
        overlay.id = OVERLAY_ID;
        overlay.innerHTML = buildOverlayContent(data);
        document.body.appendChild(overlay);
      }

      lockPage();
      attachOverlayActions(overlay, data);

      console.log("[Trinetra AI] Warning overlay displayed:", data);
    } catch (error) {
      // Agar kisi wajah se overlay creation fail ho (jaise weird page structure),
      // extension crash nahi hona chahiye — sirf error log karo.
      console.error("[Trinetra AI] Failed to display warning overlay:", error);
    }
  }

  // ------------------------------------------------------------
  // 7. OVERLAY ACTION BUTTONS
  // ------------------------------------------------------------

  /**
   * Overlay ke andar "Leave Site" aur "Proceed Anyway" buttons pe
   * click listeners lagata hai.
   */
  function attachOverlayActions(overlay, data) {
    const leaveBtn = overlay.querySelector("#trinetra-btn-leave");
    const proceedBtn = overlay.querySelector("#trinetra-btn-proceed");

    if (leaveBtn) {
      leaveBtn.addEventListener("click", () => {
        console.log("[Trinetra AI] User chose to leave the site.");
        // Safe redirect - user ko khatre se door le jao
        window.location.href = "https://www.google.com";
      });
    }

    if (proceedBtn) {
      proceedBtn.addEventListener("click", () => {
        console.log("[Trinetra AI] User chose to proceed despite warning.");
        removeOverlay();
      });
    }
  }

  // ------------------------------------------------------------
  // 8. REMOVE OVERLAY
  // ------------------------------------------------------------

  function removeOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.remove();
    }
    unlockPage();
  }

  // ------------------------------------------------------------
  // 9. MESSAGE LISTENER — background.js se messages sunna
  // ------------------------------------------------------------

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      console.log("[Trinetra AI] content.js received message:", message);

      if (message?.type === MESSAGE_TYPES.SHOW_WARNING) {
        showWarningOverlay(message.payload);
        sendResponse({ status: "success", action: "overlay_shown" });
        return true;
      }

      // TODO: Future message types yahan add karo (jaise "REMOVE_OVERLAY",
      // "UPDATE_BADGE_INFO", etc.) jab requirements badhein.

      sendResponse({ status: "ignored", reason: "Unknown message type" });
      return false;
    } catch (error) {
      console.error("[Trinetra AI] Error handling message in content.js:", error);
      sendResponse({ status: "error", error_message: error.message });
      return false;
    }
  });

  // ------------------------------------------------------------
  // 10. WEB3 WALLET DETECTION — MODULAR TODO SECTION
  // ------------------------------------------------------------
  // TODO (Web3 Team): Agar future mein wallet/contract address page se
  // extract karna ho, is section mein karna. Reliable site-specific
  // selectors use mat karna (har wallet UI alag hoti hai aur site
  // updates se selector tootenge). Iske bajaye in approaches consider karo:
  //   1. window.ethereum provider se connected account read karna
  //      (agar page pe MetaMask jaisa provider inject hua ho)
  //   2. Page ke visible text mein regex se wallet-address-jaisa
  //      pattern dhoondhna (0x... format), sirf as a weak signal
  //   3. User se manually confirm karwana popup.js ke through
  //
  // Jab ready ho, is function ko complete karke background.js ko
  // "WALLET_DETECTED" message bhejna (jaisa background.js already
  // expect kar raha hai):
  //
  // function detectWalletInfo() {
  //   const walletAddress = null; // TODO: implement detection logic
  //   const contractAddress = null; // TODO: implement detection logic
  //
  //   if (walletAddress) {
  //     chrome.runtime.sendMessage({
  //       type: "WALLET_DETECTED",
  //       payload: {
  //         walletAddress,
  //         contractAddress,
  //         url: window.location.href,
  //       },
  //     });
  //   }
  // }
  // detectWalletInfo();

  console.log("[Trinetra AI] content.js initialization complete.");
})();