(function () {
  // Optional conversion tracking runs independently; a failure never affects the bar.
  try {
    var script = document.currentScript;
    var id = script && script.getAttribute('data-startup-id');
    if (!id || window !== window.top || window.__sbConversionsLoaded) return;
    window.__sbConversionsLoaded = true;
    var origin = new URL(script.src).origin;
    var key = 'startupbar:referral:' + id;
    var config = null, referral = null, sending = false, attempts = 0;
    var maxAge = 30 * 86400000;
    var consent = window.startupbarConversionConsent === true || script.getAttribute('data-conversion-consent') === 'granted';
    function storageRead() { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
    function storageWrite() { if (!consent) return; try { localStorage.setItem(key, JSON.stringify(referral)); } catch (e) {} }
    function valid(r) { return r && /^[a-f0-9]{64}$/.test(r.token) && Date.now() >= r.at && Date.now() - r.at <= maxAge; }
    function capture() {
      if (!consent) return;
      var token = new URLSearchParams(window.location.search).get('_sbref');
      if (token && /^[a-f0-9]{64}$/.test(token) && (!referral || token !== referral.token)) {
        referral = { token: token, at: Date.now(), completed: false };
        attempts = 0;
        storageWrite();
      }
      if (!referral) referral = storageRead();
      if (!valid(referral)) { referral = null; try { localStorage.removeItem(key); } catch (e) {} }
    }
    function check() {
      try {
        if (!consent || !config || !config.enabled || document.visibilityState === 'hidden' || sending) return;
        if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;
        capture();
        var path = window.location.pathname.replace(/\/$/, '') || '/';
        if (!valid(referral) || referral.completed || !config.success_path || path !== config.success_path || attempts >= 4) return;
        sending = true; attempts++;
        fetch(origin + '/api/public/signup/confirm', {
          method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startup_id: id, referral_token: referral.token, success_path: path, consent_granted: true })
        }).then(function (response) {
          if (!response.ok) { if (response.status >= 500 || response.status === 429) throw new Error('retry'); return { accepted: false }; }
          return response.json();
        }).then(function (result) {
          sending = false;
          if (result.accepted) { referral.completed = true; storageWrite(); window.dispatchEvent(new CustomEvent('startupbar:conversion-result', { detail: { accepted: true, test: result.test === true } })); }
        }).catch(function () { sending = false; setTimeout(check, Math.pow(2, attempts) * 1000); });
      } catch (e) { sending = false; }
    }
    window.addEventListener('startupbar:conversion-consent', function (event) {
      consent = !!(event.detail && event.detail.granted === true);
      if (!consent) { referral = null; try { localStorage.removeItem(key); } catch (e) {} } else check();
    });
    fetch(origin + '/api/public/signup/config?id=' + encodeURIComponent(id), { credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (r) { if (!r.ok) throw new Error('config'); return r.json(); })
      .then(function (c) {
        if (!c.enabled) { try { localStorage.removeItem(key); } catch (e) {} return; }
        var a = new URL(window.location.href), b = new URL(c.website_url);
        if (a.protocol !== 'https:' || a.hostname.replace(/^www\./, '') !== b.hostname.replace(/^www\./, '') || a.port !== b.port) return;
        config = c; check();
      }).catch(function () {});
    ['popstate', 'hashchange', 'startupbar:locationchange', 'pageshow'].forEach(function (name) { window.addEventListener(name, check); });
    ['DOMContentLoaded', 'turbo:load', 'astro:page-load', 'livewire:navigated', 'visibilitychange'].forEach(function (name) { document.addEventListener(name, check); });
    // Also covers router libraries that don't use the widget's location event.
    var lastPath = window.location.href;
    setInterval(function () { if (window.location.href !== lastPath) { lastPath = window.location.href; check(); } }, 2000);
  } catch (e) {}
})();