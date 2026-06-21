(function () {
  try {
    var s = document.currentScript;
    var id = s && s.getAttribute('data-startup-id');
    if (!id) return;
    var origin = new URL(s.src).origin;

    function detectTheme() {
      // 1. Explicit override on the script tag wins
      var dataTheme = s.getAttribute('data-theme');
      if (dataTheme === 'dark' || dataTheme === 'light') return dataTheme;

      // 2. Check <html> and <body> for common dark-mode attributes
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
        // 3. Check for 'dark' CSS class on root elements
        if (el.classList && el.classList.contains('dark')) return 'dark';
        if (el.classList && el.classList.contains('light')) return 'light';
      }

      // 4. Try to compute luminance from body background color
      try {
        var bg = window.getComputedStyle(document.body).backgroundColor;
        var rgb = bg.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          var luminance = (0.299 * parseInt(rgb[0]) + 0.587 * parseInt(rgb[1]) + 0.114 * parseInt(rgb[2])) / 255;
          if (luminance < 0.5) return 'dark';
          if (luminance > 0.5) return 'light';
        }
      } catch (e) {}

      // 5. Fall back to OS preference
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }

    var theme = detectTheme();
    var bg = theme === 'dark' ? '#18181b' : '#ffffff';

    var iframe = document.createElement('iframe');
    iframe.src = origin + '/widget/bar?host=' + encodeURIComponent(id) + '&theme=' + theme;
    iframe.setAttribute('title', 'StartupBar');
    iframe.setAttribute('scrolling', 'no');
    iframe.style.cssText = ['position:fixed','top:0','left:0','width:100%','height:36px','border:0','margin:0','padding:0','z-index:2147483647','background:' + bg,'display:block'].join(';');
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'startupbar:resize') {
        iframe.style.height = e.data.height + 'px';
      }
    });
    function inject() {
      document.body && document.body.appendChild(iframe);
      var html = document.documentElement;
      if (html) {
        html.style.scrollPaddingTop = '36px';
        if (document.body) document.body.style.marginTop = (parseInt(getComputedStyle(document.body).marginTop) || 0) + 36 + 'px';
      }
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', inject); } else { inject(); }
  } catch (e) {}
})();
