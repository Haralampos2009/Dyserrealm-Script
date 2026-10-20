/* Dyserrealm consent-aware, privacy-minimal page analytics. */
(() => {
  "use strict";
  const SUPABASE_URL = "https://krractyhrblivsejrpdm.supabase.co";
  const SUPABASE_KEY = "sb_publishable_tFu5Dd07GWrVAS7p6_rcFQ_rgKhNqSg";
  const SITE_ID = "dyserrealm-script";
  const CONSENT_COOKIE = "dyserrealm_analytics_consent";
  const SIX_MONTHS = 60 * 60 * 24 * 180;
  let sentForThisPage = false;

  function readConsent() {
    const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + CONSENT_COOKIE + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  }
  function saveConsent(value) {
    document.cookie = CONSENT_COOKIE + "=" + encodeURIComponent(value) +
      "; Path=/; Max-Age=" + SIX_MONTHS + "; SameSite=Lax; Secure";
  }
  function browserFamily() {
    const ua = navigator.userAgent || "";
    if (/Edg\//.test(ua)) return "Edge";
    if (/Firefox\//.test(ua)) return "Firefox";
    if (/OPR\//.test(ua)) return "Opera";
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
    return "Other";
  }
  function deviceCategory() {
    const width = Math.min(window.innerWidth || 0, screen.width || 0) || window.innerWidth || 0;
    if (width < 700) return "mobile";
    if (width < 1100) return "tablet";
    return "desktop";
  }
  function referrerOrigin() {
    try { return document.referrer ? new URL(document.referrer).origin.slice(0, 200) : null; }
    catch (_) { return null; }
  }
  function recordPageView() {
    if (sentForThisPage || readConsent() !== "analytics") return;
    sentForThisPage = true;
    const record = {
      site: SITE_ID,
      event_type: "page_view",
      page_path: (location.pathname || "/").slice(0, 500),
      referrer_origin: referrerOrigin(),
      device_type: deviceCategory(),
      browser_family: browserFamily(),
      language: (navigator.language || "unknown").slice(0, 20),
      viewport_width_bucket: Math.round((window.innerWidth || 0) / 100) * 100
    };
    fetch(SUPABASE_URL + "/rest/v1/site_analytics_events", {
      method: "POST",
      mode: "cors",
      keepalive: true,
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(record)
    }).catch(() => {});
  }

  const styles = `
    #dya-cookie-banner,#dya-cookie-settings{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}
    #dya-cookie-banner *,#dya-cookie-settings *{box-sizing:border-box}
    #dya-cookie-banner{position:fixed;z-index:2147483000;right:20px;bottom:20px;width:min(470px,calc(100vw - 28px));padding:22px;border:1px solid rgba(183,243,107,.28);border-radius:16px;background:rgba(9,13,18,.97);color:#f3f6fb;box-shadow:0 22px 80px rgba(0,0,0,.55);backdrop-filter:blur(18px)}
    #dya-cookie-banner .dya-kicker{font:600 10px/1.3 ui-monospace,monospace;letter-spacing:2px;color:#b7f36b;text-transform:uppercase;margin-bottom:9px}
    #dya-cookie-banner h2{font-size:20px;line-height:1.2;margin:0 0 9px;font-weight:700;color:#fff}
    #dya-cookie-banner p{font-size:13px;line-height:1.65;color:#bdc5d0;margin:0 0 17px}
    #dya-cookie-banner .dya-actions{display:flex;gap:8px;flex-wrap:wrap}
    #dya-cookie-banner button,#dya-cookie-settings button{font:600 12px/1.2 Inter,system-ui,sans-serif;border:1px solid #394553;border-radius:8px;padding:11px 12px;cursor:pointer}
    #dya-cookie-banner .dya-accept{background:#b7f36b;border-color:#b7f36b;color:#10150b}
    #dya-cookie-banner .dya-reject{background:transparent;color:#f3f6fb}
    #dya-cookie-banner .dya-settings{background:transparent;color:#bdc5d0;border-color:transparent;text-decoration:underline;text-underline-offset:3px}
    #dya-cookie-banner button:focus-visible,#dya-cookie-settings button:focus-visible,#dya-cookie-settings input:focus-visible{outline:2px solid #b7f36b;outline-offset:3px}
    #dya-cookie-settings{position:fixed;z-index:2147483001;inset:0;background:rgba(0,0,0,.7);display:grid;place-items:center;padding:18px;color:#f3f6fb}
    #dya-cookie-settings .dya-dialog{width:min(450px,100%);padding:22px;border:1px solid #394553;border-radius:16px;background:#0d1219;box-shadow:0 20px 80px #0009}
    #dya-cookie-settings h2{font-size:20px;margin:0 0 10px}
    #dya-cookie-settings p{font-size:13px;line-height:1.65;color:#bdc5d0;margin:0 0 16px}
    #dya-cookie-settings label{display:flex;align-items:center;gap:10px;padding:13px 0;font-size:13px;color:#f3f6fb}
    #dya-cookie-settings input{accent-color:#b7f36b;width:17px;height:17px}
    #dya-cookie-settings .dya-settings-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}
    #dya-cookie-settings .dya-save{background:#b7f36b;border-color:#b7f36b;color:#10150b}
    #dya-cookie-settings .dya-cancel{background:transparent;color:#f3f6fb}
    #dya-cookie-reopen{position:fixed;z-index:2147482999;right:16px;bottom:14px;border:1px solid #ffffff25;border-radius:999px;padding:8px 11px;background:#0b1018eF;color:#cbd5df;font:11px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 5px 25px #0004}
    #dya-cookie-reopen:hover{border-color:#b7f36b;color:#fff}
    @media(max-width:520px){#dya-cookie-banner{right:10px;bottom:10px;width:calc(100vw - 20px);padding:18px}#dya-cookie-banner .dya-actions{display:grid;grid-template-columns:1fr 1fr}#dya-cookie-banner .dya-settings{grid-column:1/-1}#dya-cookie-banner button{min-height:42px}}
  `;
  function buildUI() {
    if (document.getElementById("dya-cookie-banner")) return;
    const style = document.createElement("style");
    style.textContent = styles;
    document.head.appendChild(style);

    const reopen = document.createElement("button");
    reopen.id = "dya-cookie-reopen";
    reopen.type = "button";
    reopen.textContent = "Cookie settings";
    reopen.setAttribute("aria-label", "Open cookie and analytics settings");
    reopen.addEventListener("click", openSettings);
    document.body.appendChild(reopen);

    const banner = document.createElement("aside");
    banner.id = "dya-cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie preferences");
    banner.setAttribute("aria-live", "polite");
    banner.innerHTML = `
      <div class="dya-kicker">Privacy preferences</div>
      <h2>Cookies &amp; site analytics</h2>
      <p>We use one necessary cookie to remember your choice. If you allow analytics, we record page visits, the page path, referring site domain, broad device category, browser family and language. We do not put names, account IDs, passwords or full URLs into this analytics dataset. Analytics starts only after you allow it.</p>
      <div class="dya-actions">
        <button type="button" class="dya-accept">Accept analytics</button>
        <button type="button" class="dya-reject">Essential only</button>
        <button type="button" class="dya-settings">Settings</button>
      </div>`;
    banner.querySelector(".dya-accept").addEventListener("click", () => choose("analytics"));
    banner.querySelector(".dya-reject").addEventListener("click", () => choose("essential"));
    banner.querySelector(".dya-settings").addEventListener("click", openSettings);
    document.body.appendChild(banner);

    const current = readConsent();
    if (current === "analytics" || current === "essential") banner.hidden = true;
    reopen.hidden = !banner.hidden;
  }
  function choose(value) {
    saveConsent(value);
    const banner = document.getElementById("dya-cookie-banner");
    const reopen = document.getElementById("dya-cookie-reopen");
    if (banner) banner.hidden = true;
    if (reopen) reopen.hidden = false;
    closeSettings();
    if (value === "analytics") recordPageView();
  }
  function openSettings() {
    if (document.getElementById("dya-cookie-settings")) return;
    const current = readConsent();
    const settings = document.createElement("div");
    settings.id = "dya-cookie-settings";
    settings.setAttribute("role", "dialog");
    settings.setAttribute("aria-modal", "true");
    settings.setAttribute("aria-labelledby", "dya-cookie-settings-title");
    settings.innerHTML = `
      <section class="dya-dialog">
        <h2 id="dya-cookie-settings-title">Cookie settings</h2>
        <p>The preference cookie is always used to remember your choice. Analytics is optional. You can change this choice at any time using the “Cookie settings” button.</p>
        <label><input id="dya-analytics-toggle" type="checkbox" ${current === "analytics" ? "checked" : ""}> Allow anonymous page analytics</label>
        <div class="dya-settings-actions">
          <button type="button" class="dya-save">Save preferences</button>
          <button type="button" class="dya-cancel">Cancel</button>
        </div>
      </section>`;
    settings.querySelector(".dya-save").addEventListener("click", () =>
      choose(settings.querySelector("#dya-analytics-toggle").checked ? "analytics" : "essential"));
    settings.querySelector(".dya-cancel").addEventListener("click", closeSettings);
    settings.addEventListener("click", e => { if (e.target === settings) closeSettings(); });
    document.body.appendChild(settings);
    settings.querySelector("input").focus();
  }
  function closeSettings() {
    const settings = document.getElementById("dya-cookie-settings");
    if (settings) settings.remove();
  }

  function start() {
    buildUI();
    if (readConsent() === "analytics") recordPageView();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
