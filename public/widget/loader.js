(function () {
  try {
    if (window !== window.top) return;
    var s = document.currentScript;
    var id = s && s.getAttribute('data-startup-id');
    if (!id) return;
    var origin = new URL(s.src).origin;
    // Keep optional signup reporting isolated from rendering and supporter mode.
    // It is enabled by owner settings and never stores a referral without consent.
    try {
      if (!window.__sbConversionScriptRequested && document.head) {
        window.__sbConversionScriptRequested = true;
        var conversionScript = document.createElement('script');
        conversionScript.src = origin + '/widget/conversions.js';
        conversionScript.async = true;
        conversionScript.setAttribute('data-startup-id', id);
        if (s.getAttribute('data-conversion-consent') === 'granted') conversionScript.setAttribute('data-conversion-consent', 'granted');
        document.head.appendChild(conversionScript);
      }
    } catch (conversionError) {}

    // Supporter mode: render nothing at all. No bar, no spacing, no layout
    // shift — only the anonymous pageview beacon so the founder's dashboard
    // globe and on-site stats work.
    if (s.getAttribute('data-mode') === 'track') {
      var sbSid = '';
      try {
        sbSid = sessionStorage.getItem('startupbar:sid') || '';
        if (!sbSid) {
          sbSid = Math.random().toString(36).slice(2) + Date.now().toString(36);
          sessionStorage.setItem('startupbar:sid', sbSid);
        }
      } catch (e) {}

      var sbLastPath = null;
      var sbBeacon = function () {
        try {
          var p = (window.location.pathname || '/') + (window.location.search || '');
          if (p.length > 200) p = p.slice(0, 200);
          if (p === sbLastPath) return;
          sbLastPath = p;
          var ref = '';
          try { ref = document.referrer || ''; } catch (e2) {}
          var img = new Image();
          img.src =
            origin + '/api/public/track/supporter?id=' + encodeURIComponent(id) +
            '&path=' + encodeURIComponent(p) +
            (ref ? '&ref=' + encodeURIComponent(ref.slice(0, 500)) : '') +
            (sbSid ? '&sid=' + encodeURIComponent(sbSid) : '');
        } catch (e2) {}
      };

      var sbWrap = function (name) {
        var orig = history[name];
        if (typeof orig !== 'function') return;
        history[name] = function () {
          var ret = orig.apply(this, arguments);
          try { window.dispatchEvent(new Event('startupbar:locationchange')); } catch (e2) {}
          return ret;
        };
      };
      try {
        sbWrap('pushState');
        sbWrap('replaceState');
        window.addEventListener('popstate', sbBeacon);
        window.addEventListener('startupbar:locationchange', sbBeacon);
        document.addEventListener('turbo:load', sbBeacon);
        document.addEventListener('astro:page-load', sbBeacon);
        document.addEventListener('livewire:navigated', sbBeacon);
      } catch (e) {}

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', sbBeacon);
      } else {
        sbBeacon();
      }
      return;
    }


    function detectTheme() {
      // The script's own data-theme attribute no longer overrides anything:
      // the bar always blends with the site's real rendered colors.

      var roots = [document.documentElement, document.body];
      for (var i = 0; i < roots.length; i++) {
        var el = roots[i];
        if (!el) continue;
        var attrs = ['data-theme', 'data-color-scheme', 'data-mode', 'color-scheme'];
        for (var j = 0; j < attrs.length; j++) {
          var val = el.getAttribute(attrs[j]);
          if (val && val.toLowerCase().includes('dark')) return 'dark';
          if (val && val.toLowerCase().includes('light')) return 'light';
        }
        if (el.classList && el.classList.contains('dark')) return 'dark';
        if (el.classList && el.classList.contains('light')) return 'light';
      }

      try {
        var bg = window.getComputedStyle(document.body).backgroundColor;
        var rgb = bg.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          var luminance = (0.299 * parseInt(rgb[0]) + 0.587 * parseInt(rgb[1]) + 0.114 * parseInt(rgb[2])) / 255;
          if (luminance < 0.5) return 'dark';
          if (luminance > 0.5) return 'light';
        }
      } catch (e) {}

      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }

    // Read only computed presentation colors; no host content leaves the page.
    function readColor(value) {
      if (!value || value === 'transparent') return null;
      var match = value.match(/^rgba?\(([^)]+)\)$/);
      if (match) {
        var parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        if (parts.length >= 3 && parts.every(isFinite)) return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
      }
      try {
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, 1, 1);
        var pixel = ctx.getImageData(0, 0, 1, 1).data;
        return [pixel[0], pixel[1], pixel[2], pixel[3] / 255];
      } catch (e) { return null; }
    }
    function colorHex(rgb) {
      return '#' + rgb.slice(0, 3).map(function(c) { return Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0'); }).join('');
    }
    function detectPalette() {
      var mode = detectTheme();
      var fallback = mode === 'dark' ? [24, 24, 27, 1] : [255, 255, 255, 1];
      // Auto-blend is always authoritative: computed host colors win over any
      // legacy data-theme attribute on the script tag.
      try {
        var rootStyle = window.getComputedStyle(document.documentElement);
        var bodyStyle = document.body && window.getComputedStyle(document.body);
        var rootBg = readColor(rootStyle.backgroundColor);
        var bodyBg = bodyStyle && readColor(bodyStyle.backgroundColor);
        var composite = function(top, bottom) {
          if (!top) return bottom;
          return top.slice(0, 3).map(function(c, i) { return c * top[3] + bottom[i] * (1 - top[3]); }).concat(1);
        };
        var background = composite(bodyBg, composite(rootBg, fallback));
        var foreground = bodyStyle && readColor(bodyStyle.color) || readColor(rootStyle.color);
        return { theme: mode, background: colorHex(background), foreground: foreground ? colorHex(composite(foreground, background)) : (mode === 'dark' ? '#f4f4f5' : '#0f172a') };
      } catch (e) {
        return { theme: mode, background: colorHex(fallback), foreground: mode === 'dark' ? '#f4f4f5' : '#0f172a' };
      }
    }
    var palette = detectPalette();
    var theme = palette.theme;
    var bg = palette.background;

    var ua = navigator.userAgent || '';
    var isIphoneSafari = /iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);
    var isMobile = (window.innerWidth || screen.width || 0) < 640;

    // Placement is owned by the host in their StartupBar account. The pick
    // response carries it, but that arrives after the iframe loads — so we
    // cache the last known value to position the bar instantly on repeat
    // visits and avoid a visible jump.
    var placement = 'top';
    try {
      if (localStorage.getItem('startupbar:placement:' + id) === 'bottom') placement = 'bottom';
    } catch (e) {}

    // Only ever one bar per page. Client-side routers (Livewire wire:navigate,
    // Turbo, Astro) re-execute scripts after a navigation; without this guard a
    // second instance is created and it treats the first instance's iframe as a
    // host fixed element, pushing the bar down by its own height.
    var existingFrame = document.querySelector('iframe[data-startupbar-frame="1"]');
    if (window.__startupbarLoaded && existingFrame) {
      try {
        existingFrame.style.top = existingFrame.style.bottom === '0px' ? 'auto' : '0px';
        try { delete existingFrame.dataset.startupbarShifted; } catch (e2) {}
        try { delete existingFrame.dataset.startupbarOriginalTop; } catch (e2) {}
        window.dispatchEvent(new Event('startupbar:reinit'));
      } catch (e) {}
      return;
    }
    window.__startupbarLoaded = true;

    var iframe = document.createElement('iframe');
    iframe.setAttribute('data-startupbar-frame', '1');


    var iframeSrc = origin + '/widget/bar?host=' + encodeURIComponent(id) + '&theme=' + theme + '&bg=' + encodeURIComponent(palette.background) + '&fg=' + encodeURIComponent(palette.foreground) + '&domain=' + encodeURIComponent(window.location.hostname) + '&path=' + encodeURIComponent(window.location.pathname) + (isMobile ? '&mobile=1' : '');
    try {
      var pref = document.referrer || '';
      if (pref && pref.length > 0) {
        if (pref.length > 500) pref = pref.slice(0, 500);
        iframeSrc += '&pref=' + encodeURIComponent(pref);
      }
    } catch (e) {}
    try {
      var lp = new URLSearchParams(window.location.search);
      if (lp.get('utm_source') === 'startupbar') {
        var sbvia = lp.get('_sbvia');
        iframeSrc += '&sbref=' + encodeURIComponent('startupbar' + (sbvia ? ':' + sbvia : ''));
      }
    } catch (e) {}
    // Per-visit session id so repeat pageviews by the same visitor don't
    // inflate impression counts (one impression per session per startup).
    try {
      var sid = sessionStorage.getItem('startupbar:sid');
      if (!sid) {
        sid = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
        sessionStorage.setItem('startupbar:sid', sid);
      }
      iframeSrc += '&sid=' + encodeURIComponent(sid);
    } catch (e) {}
    iframe.src = iframeSrc;
    iframe.setAttribute('title', 'StartupBar');
    iframe.setAttribute('scrolling', 'no');
    function applyIframeStyle() {
      if (placement === 'bottom') {
        iframe.style.cssText = ['position:fixed','bottom:0','top:auto','left:0','width:100%','height:' + currentHeight + 'px','border:0','margin:0','padding:0','z-index:2147483647','background:' + bg,'display:block'].join(';');
      } else if (isIphoneSafari) {
        iframe.style.cssText = ['position:static','top:auto','left:auto','width:100%','height:' + currentHeight + 'px','border:0','margin:0','padding:0','background:' + bg,'display:block'].join(';');
      } else {
        iframe.style.cssText = ['position:fixed','top:0','left:0','width:100%','height:' + currentHeight + 'px','border:0','margin:0','padding:0','z-index:2147483647','background:' + bg,'display:block'].join(';');
      }
    }

    var currentHeight = 36;
    var overlayClip = '';
    var exitReady = false;
    var exitShown = false;
    var exitStartedAt = Date.now();
    var exitPointerSeen = false;
    var dismissed = false;
    var injected = false;
    var originalBodyPaddingTop = null;
    var originalBodyPaddingBottom = null;
    var originalScrollPaddingTop = null;

    applyIframeStyle();

    // Desktop-only intent: no scroll, back-button or touch interception.
    // Fires immediately when the cursor leaves the top edge — the visible
    // checks below (tab hidden, focus in an input) still block bad moments.
    document.addEventListener('mousemove', function () { exitPointerSeen = true; }, { passive: true });
    document.addEventListener('mouseleave', function (e) {
      if (s.getAttribute('data-exit-intent') === 'off' || dismissed || exitShown || !exitReady) return;
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      if (!exitPointerSeen || e.clientY > 8 || Date.now() - exitStartedAt < 15000) return;
      if (document.visibilityState !== 'visible') return;
      var active = document.activeElement;
      if (active && (active.matches('input, textarea, select, [contenteditable="true"]') || active.closest('[role="dialog"], dialog[open]'))) return;
      try { if (sessionStorage.getItem('startupbar:exit-shown') === '1') return; } catch (err) {}
      if (dismissed || exitShown) return;
      iframe.contentWindow.postMessage({ type: 'startupbar:exit' }, origin);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') iframe.contentWindow.postMessage({ type: 'startupbar:exit-close' }, origin);
    });

    function unshiftFixedElements() {
      try {
        var nodes = document.querySelectorAll('[data-startupbar-shifted="1"]');
        for (var i = 0; i < nodes.length; i++) {
          var el = nodes[i];
          try {
            el.style.top = el.dataset.startupbarOriginalTop || '';
            delete el.dataset.startupbarOriginalTop;
            delete el.dataset.startupbarShifted;
          } catch (e) {}
        }
      } catch (e) {}
    }

    function restoreSpacing() {
      try {
        // Prefer removing exactly what we added: after a client-side body swap
        // the captured "original" values belong to a body that no longer
        // exists, and blindly reapplying them stacks a second 36px gap.
        var body = document.body;
        if (body) {
          var addedT = parseFloat(body.getAttribute('data-startupbar-pad-top') || '');
          var addedB = parseFloat(body.getAttribute('data-startupbar-pad-bottom') || '');
          if (!isNaN(addedT)) {
            var curT = parseFloat(getComputedStyle(body).paddingTop) || 0;
            body.style.paddingTop = Math.max(0, curT - addedT) + 'px';
            body.removeAttribute('data-startupbar-pad-top');
          } else if (originalBodyPaddingTop !== null) {
            body.style.paddingTop = originalBodyPaddingTop;
          }
          if (!isNaN(addedB)) {
            var curB = parseFloat(getComputedStyle(body).paddingBottom) || 0;
            body.style.paddingBottom = Math.max(0, curB - addedB) + 'px';
            body.removeAttribute('data-startupbar-pad-bottom');
          } else if (originalBodyPaddingBottom !== null) {
            body.style.paddingBottom = originalBodyPaddingBottom;
          }
        }
        if (document.documentElement) {
          document.documentElement.style.scrollPaddingTop = originalScrollPaddingTop || '';
        }
        unshiftFixedElements();
      } catch (e) {}
    }

    // Reserve room for the bar so it never covers host content.
    function applySpacing() {
      if (dismissed || !document.body) return;
      restoreSpacing();
      try {
        if (placement === 'bottom') {
          var padB = parseInt(getComputedStyle(document.body).paddingBottom) || 0;
           document.body.style.paddingBottom = (padB + 36) + 'px';
           document.body.setAttribute('data-startupbar-pad-bottom', '36');
          return;
        }
         if (document.documentElement) document.documentElement.style.scrollPaddingTop = '36px';
        if (!isIphoneSafari) {
          var padT = parseInt(getComputedStyle(document.body).paddingTop) || 0;
           document.body.style.paddingTop = (padT + 36) + 'px';
           document.body.setAttribute('data-startupbar-pad-top', '36');
          sweepFixedElements();
        }
      } catch (e) {}
    }


    function setPlacement(next) {
      if (next !== 'top' && next !== 'bottom') return;
      try { localStorage.setItem('startupbar:placement:' + id, next); } catch (e) {}
      if (next === placement) return;
      placement = next;
      applyIframeStyle();
      if (injected && !dismissed) {
        // Bottom bars never shift fixed headers; top bars do.
        if (placement === 'bottom') unshiftFixedElements();
        applySpacing();
        if (isIphoneSafari) {
          // Move the node: static-in-flow for top, fixed overlay for bottom.
          try {
            if (placement === 'bottom') document.body.appendChild(iframe);
            else document.body.insertBefore(iframe, document.body.firstChild);
          } catch (e) {}
        }
      }
    }

    function teardown() {
      if (dismissed) return;
      dismissed = true;
      try {
        restoreSpacing();
        iframe.style.display = 'none';
        iframe.style.height = '0px';
      } catch (e) {}
      try { sessionStorage.setItem('startupbar:dismissed', '1'); } catch (e) {}
    }

    window.addEventListener('message', function(e) {
      if (e.source !== iframe.contentWindow || e.origin !== origin) return;
      if (!e.data) return;
      if (e.data.type === 'startupbar:exit-ready') { exitReady = e.data.ready === true; return; }
      if (e.data.type === 'startupbar:exit-opened') {
        exitShown = true;
        try { sessionStorage.setItem('startupbar:exit-shown', '1'); } catch (err) {}
        return;
      }
      if (e.data.type === 'startupbar:placement') {
        setPlacement(e.data.placement);
        return;
      }
      if (e.data.type === 'startupbar:resize') {
        var next = Math.round(e.data.height);
        if (next === 0) { teardown(); return; }
        if (dismissed) return;
        if (!isFinite(next) || next < 36 || next > window.innerHeight) return;
        overlayClip = '';
        // The recommendation now extends the entire bar. Its measured height
        // limits pointer interception to the visible band, not a floating card.
        iframe.style.clipPath = overlayClip;
        iframe.style.background = e.data.overlay ? 'transparent' : bg;
        if (next === currentHeight) return;
        currentHeight = next;
        iframe.style.height = next + 'px';
      }
    });


    function shiftFixedElement(el) {
      try {
        if (!el || el.nodeType !== 1) return;
        // Never shift our own bar. Match by attribute, not identity: after a
        // client-side navigation a re-executed loader can hold a different
        // reference to an older StartupBar iframe still in the DOM.
        if (el === iframe || (iframe.contains && iframe.contains(el))) return;
        if (el.getAttribute && el.getAttribute('data-startupbar-frame') === '1') return;
        if (el.dataset && el.dataset.startupbarShifted === '1') return;
        var cs = getComputedStyle(el);
        if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
        var topRaw = cs.top;
        if (!topRaw || topRaw === 'auto') return;
        if (!/px$/.test(topRaw)) return;
        var originalPx = parseFloat(topRaw);
        if (isNaN(originalPx)) return;
        if (originalPx !== 0) return;
        el.dataset.startupbarOriginalTop = el.style.top || '';
        el.style.top = '36px';
        el.dataset.startupbarShifted = '1';
      } catch (e) {}
    }

    function sweepFixedElements(root) {
      if (dismissed || placement === 'bottom') return;
      try {
        var nodes = (root || document).querySelectorAll('*');
        for (var i = 0; i < nodes.length; i++) shiftFixedElement(nodes[i]);
      } catch (e) {}
    }

    function syncPalette(force) {
      if (dismissed) return;
      var next = detectPalette();
      if (!force && JSON.stringify(next) === JSON.stringify(palette)) return;
      palette = next;
      bg = next.background;
      iframe.style.background = overlayClip ? 'transparent' : bg;
      iframe.contentWindow.postMessage({ type: 'startupbar:theme', theme: next.theme, background: next.background, foreground: next.foreground }, origin);
    }
    function startObserver() {
      var pending;
      var schedule = function() {
        clearTimeout(pending);
        pending = setTimeout(function() { syncPalette(false); }, 150);
      };
      var observer = new MutationObserver(function(records) {
        if (records.some(function(record) {
          return record.target !== iframe && (record.type === 'childList' || record.target === document.documentElement || record.target === document.body || (record.target.closest && record.target.closest('head')));
        })) schedule();
      });
      observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-color-scheme', 'data-mode', 'color-scheme', 'media', 'href', 'disabled'] });
      iframe.addEventListener('load', function() { syncPalette(true); });
      window.addEventListener('startupbar:reinit', schedule);
      window.addEventListener('startupbar:locationchange', schedule);
      window.addEventListener('load', schedule);
      document.addEventListener('transitionend', schedule);
      document.addEventListener('load', schedule, true);
      var media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      if (media && media.addEventListener) media.addEventListener('change', schedule);
      syncPalette(true);
    }

    function isWidgetVisible() {
      try {
        var el = iframe;
        if (!el) return false;
        var style = getComputedStyle(el);
        if (style.display === 'none') return false;
        if (style.visibility === 'hidden') return false;
        if (parseFloat(style.opacity) === 0) return false;
        var rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        if (rect.right < 0 || rect.bottom < 0) return false;
        var parent = el.parentElement;
        while (parent) {
          var ps = getComputedStyle(parent);
          if (ps.display === 'none' || ps.visibility === 'hidden' || parseFloat(ps.opacity) === 0) return false;
          parent = parent.parentElement;
        }
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        if (cx >= 0 && cy >= 0) {
          var top = document.elementFromPoint(cx, cy);
          if (top && top !== el && !el.contains(top)) {
            try {
              var ts = getComputedStyle(top);
              var transient = ts.pointerEvents === 'none'
                || parseFloat(ts.opacity) < 0.1
                || top.getAttribute('aria-hidden') === 'true';
              if (!transient) return false;
            } catch (e) {}
          }
        }
        var inlineLeft = el.style.left;
        var inlineTop = el.style.top;
        if (inlineLeft && parseInt(inlineLeft) < -500) return false;
        if (inlineTop && parseInt(inlineTop) < -500) return false;
        return true;
      } catch (e) {
        return true;
      }
    }

    var lastSample = null;
    function sendHeartbeat() {
      try {
        if (dismissed) return;
        if (document.visibilityState && document.visibilityState !== 'visible') return;
        var sample = isWidgetVisible();
        var report;
        if (sample) {
          report = true;
        } else if (lastSample === false) {
          report = false;
        } else {
          lastSample = false;
          return;
        }
        lastSample = sample;
        var img = new Image();
        var pathPart = '';
        try {
          var p = window.location.pathname || '/';
          if (p.length > 200) p = p.slice(0, 200);
          pathPart = '&path=' + encodeURIComponent(p);
        } catch (e) {}
        img.src = origin + '/api/public/widget/heartbeat?id=' + encodeURIComponent(id) + '&visible=' + report + pathPart;
      } catch (e) {}
    }

    function scheduleHeartbeats() {
      var started = false;
      var start = function () {
        if (started) return;
        started = true;
        setTimeout(sendHeartbeat, 2500);
        setTimeout(sendHeartbeat, 30000);
        setInterval(sendHeartbeat, 5 * 60 * 1000);
      };
      try { iframe.addEventListener('load', start); } catch (e) {}
      setTimeout(start, 10000);
    }

    function inject() {
      if (document.documentElement && document.documentElement.getAttribute('data-startupbar-injected') === '1') return;
      try { if (sessionStorage.getItem('startupbar:dismissed') === '1') { dismissed = true; return; } } catch (e) {}
      var html = document.documentElement;
      if (html) originalScrollPaddingTop = html.style.scrollPaddingTop || '';
      if (document.body) {
        originalBodyPaddingTop = document.body.style.paddingTop || '';
        originalBodyPaddingBottom = document.body.style.paddingBottom || '';
      }
      injected = true;

      if (placement === 'top' && isIphoneSafari) {
        if (document.body) {
          if (document.body.firstChild) {
            document.body.insertBefore(iframe, document.body.firstChild);
          } else {
            document.body.appendChild(iframe);
          }
        }
        if (html) html.setAttribute('data-startupbar-injected', '1');
        applySpacing();
        startObserver();
        scheduleHeartbeats();
        return;
      }

      // Mount on <html>, not <body>: client-side routers (Livewire
      // wire:navigate, Turbo, Astro) replace the body, which would destroy and
      // reload the frame on every navigation (blank bar, then generic bar,
      // then the startup). Parented to <html> the bar simply survives.
      var mountTarget = html || document.body;
      mountTarget && mountTarget.appendChild(iframe);
      if (html) html.setAttribute('data-startupbar-injected', '1');
      applySpacing();
      startObserver();

      try {
        var resweep = function () {
          sweepFixedElements();
          setTimeout(sweepFixedElements, 250);
          setTimeout(sweepFixedElements, 800);
        };
        // Client-side routers (Livewire wire:navigate, Turbo, Astro) swap the
        // body. Re-attach the bar, reset it to its own placement and rebuild
        // spacing from a clean base so nothing stacks.
        var reassert = function () {
          if (dismissed) return;
          try {
            if (placement === 'top' && isIphoneSafari) {
              if (document.body && iframe.parentNode !== document.body) {
                if (document.body.firstChild) document.body.insertBefore(iframe, document.body.firstChild);
                else document.body.appendChild(iframe);
              }
            } else if (!iframe.parentNode || !document.contains(iframe)) {
              (document.documentElement || document.body).appendChild(iframe);
            }
            try { delete iframe.dataset.startupbarShifted; } catch (e2) {}
            try { delete iframe.dataset.startupbarOriginalTop; } catch (e2) {}
            applyIframeStyle();
            iframe.style.clipPath = overlayClip;
            if (overlayClip) iframe.style.background = 'transparent';
            if (document.documentElement) document.documentElement.setAttribute('data-startupbar-injected', '1');
            applySpacing();
          } catch (e2) {}
          resweep();
        };
        var wrap = function (name) {
          var orig = history[name];
          if (typeof orig !== 'function') return;
          history[name] = function () {
            var ret = orig.apply(this, arguments);
            try { window.dispatchEvent(new Event('startupbar:locationchange')); } catch (e) {}
            return ret;
          };
        };
        wrap('pushState');
        wrap('replaceState');
        window.addEventListener('popstate', reassert);
        window.addEventListener('hashchange', resweep);
        window.addEventListener('startupbar:locationchange', reassert);
        window.addEventListener('load', resweep);
        document.addEventListener('livewire:navigated', reassert);
        document.addEventListener('livewire:navigate', reassert);
        document.addEventListener('turbo:load', reassert);
        document.addEventListener('astro:page-load', reassert);
        window.addEventListener('startupbar:reinit', reassert);
      } catch (e) {}

      scheduleHeartbeats();
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', inject); } else { inject(); }
  } catch (e) {}
})();
