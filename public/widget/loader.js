(function () {
  try {
    var s = document.currentScript;
    var id = s && s.getAttribute('data-startup-id');
    if (!id) return;
    var origin = new URL(s.src).origin;
    var iframe = document.createElement('iframe');
    iframe.src = origin + '/widget/bar?host=' + encodeURIComponent(id);
    iframe.setAttribute('title', 'StartupBar');
    iframe.setAttribute('scrolling', 'no');
    iframe.style.cssText = ['position:fixed','top:0','left:0','width:100%','height:36px','border:0','margin:0','padding:0','z-index:2147483647','background:#ffffff','display:block'].join(';');
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
