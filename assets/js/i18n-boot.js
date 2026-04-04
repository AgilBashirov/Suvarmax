/**
 * Seçilmiş dilə uyğun statik mətnləri API-dan əvvəl tətbiq edir (FOUC / AZ flash əleyhinə).
 * head-də sinxron XHR + DOMContentLoaded-da apply; göstərməzdən əvvəl body gizlədilir.
 */
(function () {
  var STYLE_ID = 'suvarmax-i18n-boot-style';
  if (!document.getElementById(STYLE_ID)) {
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = 'html.i18n-boot-pending body{visibility:hidden!important}';
    document.head.appendChild(st);
  }
  document.documentElement.classList.add('i18n-boot-pending');

  function jsonUrl() {
    try {
      return new URL('data/static-home-by-locale.json', window.location.href).href;
    } catch (e) {
      return '/data/static-home-by-locale.json';
    }
  }

  /** Deploydan sonra brauzerin köhnə JSON keşindən hero/stat və s. qayıtmasının qarşısı */
  function withNoCacheParam(url) {
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    return url + sep + 'nocache=' + String(Date.now());
  }

  function isIndexPage() {
    var p = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    return p === '/' || p.endsWith('/index.html');
  }

  function homeBlocksUrl() {
    try {
      return new URL('data/home-blocks-by-locale.json', window.location.href).href;
    } catch (e) {
      return '/data/home-blocks-by-locale.json';
    }
  }

  var L =
    window.SuvarmaxLang && window.SuvarmaxLang.getLang ? window.SuvarmaxLang.getLang() : 'az';

  window.__SUMAX_BOOTSTRAP_HOME = null;
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', withNoCacheParam(jsonUrl()), false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
      var all = JSON.parse(xhr.responseText);
      var shell = all[L] || all.az || null;
      if (shell && isIndexPage()) {
        try {
          var xb = new XMLHttpRequest();
          xb.open('GET', withNoCacheParam(homeBlocksUrl()), false);
          xb.send(null);
          if (xb.status >= 200 && xb.status < 300 && xb.responseText) {
            var blocks = JSON.parse(xb.responseText);
            var blk = blocks[L] || blocks.az;
            if (blk && blk.services) shell.services = blk.services;
            if (blk && blk.about) shell.about = blk.about;
          }
        } catch (e2) {}
      }
      window.__SUMAX_BOOTSTRAP_HOME = shell;
    }
  } catch (e) {
    window.__SUMAX_BOOTSTRAP_HOME = null;
  }

  function setHtmlLang() {
    var L =
      window.SuvarmaxLang && window.SuvarmaxLang.getLang ? window.SuvarmaxLang.getLang() : 'az';
    document.documentElement.lang = L === 'ru' ? 'ru' : L === 'en' ? 'en' : 'az';
  }

  function finishBoot() {
    var shell = window.__SUMAX_BOOTSTRAP_HOME;
    var path = (window.location.pathname || '').replace(/\\/g, '/');

    setHtmlLang();

    if (shell && typeof window.applyShellTexts === 'function') {
      window.applyShellTexts(shell);
    }

    if (isIndexPage() && shell && shell.partnersSection) {
      var ps = shell.partnersSection;
      var pt = document.getElementById('site-partners-title');
      var psub = document.getElementById('site-partners-subtitle');
      if (pt && ps.title != null) pt.textContent = String(ps.title);
      if (psub && ps.subtitle != null) psub.textContent = String(ps.subtitle);
    }

    if (path.indexOf('works.html') !== -1 && shell && shell.worksPage && window.applyWorksPageLabels) {
      window.applyWorksPageLabels(shell.worksPage);
    }
    if (
      path.indexOf('work-detail.html') !== -1 &&
      shell &&
      shell.workDetailPage &&
      window.applyWorkDetailLabels
    ) {
      window.applyWorkDetailLabels(shell.workDetailPage);
    }

    if (shell && window.SuvarmaxLang && window.SuvarmaxLang.getLang) {
      window.__SUMAX_HOME_CONTENT_LANG = window.SuvarmaxLang.getLang();
      window.__SUMAX_HOME_LAST = shell;
    }

    if (window.SuvarmaxLang && window.SuvarmaxLang.patchDocumentLinks) {
      window.SuvarmaxLang.patchDocumentLinks();
    }
    if (window.SuvarmaxLang && window.SuvarmaxLang.syncLangToggleUI) {
      window.SuvarmaxLang.syncLangToggleUI();
    }

    document.documentElement.classList.remove('i18n-boot-pending');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', finishBoot);
  } else {
    finishBoot();
  }
})();
