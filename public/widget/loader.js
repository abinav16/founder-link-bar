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

    var iframe = document.createElement('iframe');
    iframe.src = origin + '/widget/bar?host=' + encodeURIComponent(id) + '&theme=' + theme + '&domain=' + encodeURIComponent(window.location.hostname);
    iframe.setAttribute('title', 'StartupBar');
    iframe.setAttribute('scrolling', 'no');
    iframe.style.cssText = ['position:fixed','top:0','left:0','width:100%','height:36px','border:0','margin:0','padding:0','z-index:2147483647','background:' + bg,'display:block'].join(';');

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
          if (ps.overflow === 'hidden') {
            var pr = parent.getBoundingClientRect();
            if (pr.width === 0 || pr.height === 0) return false;
          }
          parent = parent.parentElement;
        }
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        if (cx >= 0 && cy >= 0) {
          var top = document.elementFromPoint(cx, cy);
          if (top && top !== el && !el.contains(top)) return false;
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

    function sendHeartbeat() {
      try {
        var visible = isWidgetVisible();
        var img = new Image();
        img.src = origin + '/api/public/widget/heartbeat?id=' + encodeURIComponent(id) + '&visible=' + visible;
      } catch (e) {}
    }

    function inject() {
      if (document.documentElement && document.documentElement.getAttribute('data-startupbar-injected') === '1') return;
      document.body && document.body.appendChild(iframe);
      var html = document.documentElement;
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
      setTimeout(sendHeartbeat, 1500);
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', inject); } else { inject(); }
  } catch (e) {}
})();
