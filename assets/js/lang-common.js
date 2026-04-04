(function (global) {
  var KEY = 'suvarmax_lang';
  var LOCALES = ['az', 'ru', 'en'];
  var DEF = 'az';

  function normalize(l) {
    var x = String(l || '')
      .toLowerCase()
      .trim();
    return LOCALES.indexOf(x) !== -1 ? x : null;
  }

  function getLang() {
    try {
      var u = new URLSearchParams(window.location.search).get('lang');
      var n = normalize(u);
      if (n) return n;
    } catch (e) {}
    try {
      var s = normalize(localStorage.getItem(KEY));
      if (s) return s;
    } catch (e2) {}
    return DEF;
  }

  function syncLangToggleUI() {
    var cur = getLang();
    try {
      document.querySelectorAll('[data-lang-set]').forEach(function (btn) {
        var v = normalize(btn.getAttribute('data-lang-set'));
        var active = v === cur;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    } catch (e) {}
  }

  function setLang(lang) {
    var n = normalize(lang) || DEF;
    try {
      localStorage.setItem(KEY, n);
    } catch (e) {}
    var next = '';
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('lang', n);
      next = url.pathname + url.search + url.hash;
      history.replaceState(null, '', next);
    } catch (e2) {}
    if (!next) {
      try {
        var u2 = new URL(window.location.href);
        u2.searchParams.set('lang', n);
        next = u2.pathname + u2.search + u2.hash;
      } catch (e2b) {}
    }
    /** URL hələ də köhnədirsə (file://, bəzi brauzerlər), sorğu getLang() ilə səhv dilə gedir — tam yeniləmə */
    var inUrl = normalize(new URLSearchParams(window.location.search).get('lang'));
    if (next && inUrl !== n) {
      try {
        window.location.href = next;
      } catch (e3) {}
      return;
    }
    syncLangToggleUI();
    try {
      window.dispatchEvent(new CustomEvent('suvarmax:lang-changed', { detail: { lang: n } }));
    } catch (e4) {}
  }

  function patchDocumentLinks() {
    var lang = getLang();
    document.querySelectorAll('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!h || h.charAt(0) === '#' || /^https?:/i.test(h) || /^mailto:/i.test(h) || /^tel:/i.test(h)) return;
      if (!/\.html/i.test(h)) return;
      try {
        var u = new URL(h, window.location.href);
        if (u.origin !== window.location.origin) return;
        u.searchParams.set('lang', lang);
        a.setAttribute('href', u.pathname + u.search + u.hash);
      } catch (e) {}
    });
  }

  function withLang(href) {
    if (!href || href.charAt(0) === '#' || /^https?:/i.test(href)) return href;
    try {
      var abs = href.indexOf('/') === 0 ? window.location.origin + href : new URL(href, window.location.href).href;
      var u = new URL(abs);
      u.searchParams.set('lang', getLang());
      if (u.origin === window.location.origin) {
        return u.pathname + u.search + u.hash;
      }
      return u.href;
    } catch (e) {
      return href;
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', syncLangToggleUI);
    window.addEventListener('suvarmax:lang-changed', syncLangToggleUI);
    if (document.readyState !== 'loading') {
      try {
        syncLangToggleUI();
      } catch (e5) {}
    }
  }

  global.SuvarmaxLang = {
    getLang: getLang,
    setLang: setLang,
    withLang: withLang,
    patchDocumentLinks: patchDocumentLinks,
    syncLangToggleUI: syncLangToggleUI,
    LOCALES: LOCALES,
    DEFAULT_LOCALE: DEF,
  };
})(typeof window !== 'undefined' ? window : globalThis);
