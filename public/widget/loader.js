(function () {
  try {
    if (window !== window.top) return;
    var s = document.currentScript;
    var id = s && s.getAttribute('data-startup-id');
    if (!id) return;
    var origin = new URL(s.src).origin;

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

    // iPhone/iPod Safari has a collapsing address bar that recalculates the
    // visual viewport on scroll. A fixed iframe at top:0 combined with body
    // padding-top triggers a WebKit bug (bug 297779 / iOS 26 regression) where
    // fixed/sticky elements shift vertically every few seconds. On that subset
    // only, we render the bar as an in-flow block at the top of <body> instead
    // of a fixed overlay, and skip mutating host padding/headers.
    var ua = navigator.userAgent || '';
    var isIphoneSafari = /iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);

    var iframe = document.createElement('iframe');
    iframe.src = origin + '/widget/bar?host=' + encodeURIComponent(id) + '&theme=' + theme + '&domain=' + encodeURIComponent(window.location.hostname);
    iframe.setAttribute('title', 'StartupBar');
    iframe.setAttribute('scrolling', 'no');
    if (isIphoneSafari) {
      iframe.style.cssText = ['position:static','top:auto','left:auto','width:100%','height:36px','border:0','margin:0','padding:0','background:' + bg,'display:block'].join(';');
    } else {
      iframe.style.cssText = ['position:fixed','top:0','left:0','width:100%','height:36px','border:0','margin:0','padding:0','z-index:2147483647','background:' + bg,'display:block'].join(';');
    }

    var currentHeight = 36;
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'startupbar:resize') {
        var next = Math.round(e.data.height);
        if (next === currentHeight) return;
        currentHeight = next;
        iframe.style.height = next + 'px';
      }
    });

    function shiftFixedElement(el) {
      try {
        if (!el || el.nodeType !== 1) return;
        if (el === iframe || (iframe.contains && iframe.contains(el))) return;
        if (el.dataset && el.dataset.startupbarShifted === '1') return;
        var cs = getComputedStyle(el);
        if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
        var topRaw = cs.top;
        if (!topRaw || topRaw === 'auto') return;
        if (!/px$/.test(topRaw)) return;
        var originalPx = parseFloat(topRaw);
        if (isNaN(originalPx)) return;
        // Only shift elements truly anchored to the very top; leave banners/toasts alone.
        if (originalPx !== 0) return;
        el.dataset.startupbarOriginalTop = el.style.top || '';
        el.style.top = '36px';
        el.dataset.startupbarShifted = '1';
      } catch (e) {}
    }

    function sweepFixedElements(root) {
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
          // Intentionally do NOT bail on overflow:hidden parents with
          // non-zero size — that produced many false positives on normal
          // page wrappers.
          parent = parent.parentElement;
        }
        // Point-hit test: only treat as hidden if a solid, interactive
        // element is truly covering the bar. Ignore transparent / decorative
        // overlays (splash screens, cookie banners fading out, aria-hidden).
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

    // Two-sample confirmation: only report visible=false when two
    // consecutive local samples agree the widget is hidden. Kills
    // single-snapshot false positives from splash screens, hydration,
    // and transient overlays.
    var lastSample = null;
    function sendHeartbeat() {
      try {
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
        img.src = origin + '/api/public/widget/heartbeat?id=' + encodeURIComponent(id) + '&visible=' + report;
      } catch (e) {}
    }

    function scheduleHeartbeats() {
      var started = false;
      var start = function () {
        if (started) return;
        started = true;
        // First sample after page + widget have settled (splash screens,
        // hydration, cookie banners). 8s, confirmation at 30s, then every
        // 5 minutes while the tab is visible.
        setTimeout(sendHeartbeat, 8000);
        setTimeout(sendHeartbeat, 30000);
        setInterval(sendHeartbeat, 5 * 60 * 1000);
      };
      try { iframe.addEventListener('load', start); } catch (e) {}
      setTimeout(start, 10000);
    }

    function inject() {
      if (document.documentElement && document.documentElement.getAttribute('data-startupbar-injected') === '1') return;
      var html = document.documentElement;
      if (isIphoneSafari) {
        // In-flow: prepend as first child of <body> so page content flows below.
        // No body padding, no host header shifting — avoids the iOS Safari
        // scroll-jump caused by fixed+padding recalculations.
        if (document.body) {
          if (document.body.firstChild) {
            document.body.insertBefore(iframe, document.body.firstChild);
          } else {
            document.body.appendChild(iframe);
          }
        }
        if (html) {
          html.setAttribute('data-startupbar-injected', '1');
          html.style.scrollPaddingTop = '36px';
        }
        startObserver();
        scheduleHeartbeats();
        return;
      }

      document.body && document.body.appendChild(iframe);
      if (html) {
        html.setAttribute('data-startupbar-injected', '1');
        html.style.scrollPaddingTop = '36px';
        if (document.body) {
          var existingPad = parseInt(getComputedStyle(document.body).paddingTop) || 0;
          document.body.style.paddingTop = (existingPad + 36) + 'px';
        }
      }
      startObserver();
      sweepFixedElements();
      // no MutationObserver-based re-shifting: causes iOS Safari jump on DOM churn.
      // Instead, re-sweep only on discrete navigation events (SPA route changes,
      // back/forward, hash changes, full load) so newly mounted fixed headers
      // get shifted below the bar without polling the DOM.
      try {
        var resweep = function () {
          sweepFixedElements();
          setTimeout(sweepFixedElements, 250);
          setTimeout(sweepFixedElements, 800);
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
        window.addEventListener('popstate', resweep);
        window.addEventListener('hashchange', resweep);
        window.addEventListener('startupbar:locationchange', resweep);
        window.addEventListener('load', resweep);
      } catch (e) {}
      scheduleHeartbeats();
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', inject); } else { inject(); }
  } catch (e) {}
})();
