(function () {
  try {
    if (window !== window.top) return;
    var s = document.currentScript;
    var id = s && s.getAttribute('data-startup-id');
    if (!id) return;
    var origin = new URL(s.src).origin;

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
      var dataTheme = s.getAttribute('data-theme');
      if (dataTheme === 'dark' || dataTheme === 'light') return dataTheme;

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

    var theme = detectTheme();
    var currentTheme = theme;
    var bg = theme === 'dark' ? '#18181b' : '#ffffff';

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


    var iframeSrc = origin + '/widget/bar?host=' + encodeURIComponent(id) + '&theme=' + theme + '&domain=' + encodeURIComponent(window.location.hostname) + '&path=' + encodeURIComponent(window.location.pathname) + (isMobile ? '&mobile=1' : '');
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
    var dismissed = false;
    var injected = false;
    var originalBodyPaddingTop = null;
    var originalBodyPaddingBottom = null;
    var originalScrollPaddingTop = null;

    applyIframeStyle();

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
          document.body.style.paddingBottom = (padB + currentHeight) + 'px';
          document.body.setAttribute('data-startupbar-pad-bottom', String(currentHeight));
          return;
        }
        if (document.documentElement) document.documentElement.style.scrollPaddingTop = currentHeight + 'px';
        if (!isIphoneSafari) {
          var padT = parseInt(getComputedStyle(document.body).paddingTop) || 0;
          document.body.style.paddingTop = (padT + currentHeight) + 'px';
          document.body.setAttribute('data-startupbar-pad-top', String(currentHeight));
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
      if (!e.data) return;
      if (e.data.type === 'startupbar:placement') {
        setPlacement(e.data.placement);
        return;
      }
      if (e.data.type === 'startupbar:resize') {
        var next = Math.round(e.data.height);
        if (next === 0) { teardown(); return; }
        if (dismissed) return;
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

    function startObserver() {
      var observer = new MutationObserver(function() {
        var newTheme = detectTheme();
        if (newTheme !== currentTheme) {
          currentTheme = newTheme;
          iframe.style.background = newTheme === 'dark' ? '#18181b' : '#ffffff';
          iframe.contentWindow.postMessage({ type: 'startupbar:theme', theme: newTheme }, '*');
        }
      });
      var opts = { attributes: true, attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'data-mode', 'color-scheme'] };
      observer.observe(document.documentElement, opts);
      if (document.body) observer.observe(document.body, opts);
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
