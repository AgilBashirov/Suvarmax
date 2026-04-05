/**
 * Ana səhifə və ümumi UI mətnləri — /api/site cavabındakı pages.home
 */
(function () {
  function getPath(obj, path) {
    if (!obj || !path) return undefined;
    var parts = String(path).split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function setMetaByName(name, content) {
    if (content == null) return;
    var el = document.querySelector('meta[name="' + name + '"]');
    if (el) el.setAttribute('content', String(content));
  }

  /** Yalnız ana səhifədə shell documentTitle — işlər / iş detalı öz başlıqlarını təyin edir */
  function isShellDocumentTitlePage() {
    var p = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    return p === '/' || p.endsWith('/index.html');
  }

  /** Meta + data-i18n (API və ya statik JSON-dan — ilk rəsmə qədər boot üçün) */
  function applyShellTexts(home) {
    if (!home || typeof home !== 'object') return;

    var mt = home.meta || {};
    if (mt.documentTitle && isShellDocumentTitlePage()) document.title = String(mt.documentTitle);
    setMetaByName('description', mt.metaDescription);
    setMetaByName('keywords', mt.metaKeywords);
    var ogT = document.querySelector('meta[property="og:title"]');
    if (ogT && mt.ogTitle) ogT.setAttribute('content', String(mt.ogTitle));
    var ogD = document.querySelector('meta[property="og:description"]');
    if (ogD && mt.ogDescription) ogD.setAttribute('content', String(mt.ogDescription));

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var path = el.getAttribute('data-i18n');
      var v = getPath(home, path);
      if (v != null && typeof v !== 'object') el.textContent = String(v);
    });

    document.querySelectorAll('[data-i18n-meta]').forEach(function (el) {
      var path = el.getAttribute('data-i18n-meta');
      var v = getPath(home, path);
      if (v != null && typeof v !== 'object') el.setAttribute('content', String(v));
    });
  }

  function applyHomePageFromData(home) {
    if (!home || typeof home !== 'object') return;

    /** Hero yalnız statik JSON-dadır; köhnə /api/site və ya ayrı backend 98% qaytarsa, boot ilə eyni dildədirsə statik qalib gəlir */
    var curLang =
      window.SuvarmaxLang && window.SuvarmaxLang.getLang ? window.SuvarmaxLang.getLang() : 'az';
    var boot = window.__SUMAX_BOOTSTRAP_HOME;
    var bootLang = window.__SUMAX_BOOTSTRAP_LANG;
    if (
      boot &&
      boot.hero &&
      typeof boot.hero === 'object' &&
      bootLang === curLang
    ) {
      try {
        home = JSON.parse(JSON.stringify(home));
        home.hero = JSON.parse(JSON.stringify(boot.hero));
      } catch (e) {}
    }

    applyShellTexts(home);

    if (typeof document.documentElement.lang === 'string' || true) {
      var L = (window.SuvarmaxLang && window.SuvarmaxLang.getLang && window.SuvarmaxLang.getLang()) || 'az';
      document.documentElement.lang = L === 'ru' ? 'ru' : L === 'en' ? 'en' : 'az';
    }

    if (typeof window.SuvarmaxLang === 'object' && window.SuvarmaxLang.patchDocumentLinks) {
      window.SuvarmaxLang.patchDocumentLinks();
    }

    window.__SUMAX_HOME_LAST = home;
    window.__SUMAX_HOME_CONTENT_LANG =
      (window.SuvarmaxLang && window.SuvarmaxLang.getLang && window.SuvarmaxLang.getLang()) || 'az';
    document.dispatchEvent(new CustomEvent('suvarmax:home-i18n', { detail: { home: home } }));
  }

  function applyWorksPageLabels(wp) {
    if (!wp || typeof wp !== 'object') return;
    if (wp.documentTitle != null) document.title = String(wp.documentTitle);
    var map = [
      ['#i18n-works-heading', 'heading'],
      ['#i18n-works-subheading', 'subheading'],
      ['#works-loading', 'loading'],
      ['#works-empty', 'empty'],
    ];
    map.forEach(function (row) {
      var el = document.querySelector(row[0]);
      if (!el) return;
      var v = wp[row[1]];
      if (v != null) el.textContent = String(v);
    });
    var pag = document.getElementById('works-pagination');
    if (pag && wp.paginationLabel) pag.setAttribute('aria-label', String(wp.paginationLabel));

    var prevL =
      wp.paginationPrev != null
        ? String(wp.paginationPrev)
        : (window.__SUMAX_WORKSPAGE_LABELS && window.__SUMAX_WORKSPAGE_LABELS.paginationPrev) ||
          '← Əvvəlki';
    var nextL =
      wp.paginationNext != null
        ? String(wp.paginationNext)
        : (window.__SUMAX_WORKSPAGE_LABELS && window.__SUMAX_WORKSPAGE_LABELS.paginationNext) ||
          'Növbəti →';
    window.__SUMAX_WORKSPAGE_LABELS = { paginationPrev: prevL, paginationNext: nextL };

    if (typeof window.__SUMAX_WORKS_RERENDER_PAGINATION === 'function') {
      window.__SUMAX_WORKS_RERENDER_PAGINATION();
    }
  }

  function applyWorkDetailLabels(wd) {
    if (!wd || typeof wd !== 'object') return;
    var load = document.getElementById('detail-loading');
    if (load && wd.loading) load.textContent = String(wd.loading);
    var back = document.querySelector('#i18n-detail-back');
    if (back && wd.backLink) back.textContent = String(wd.backLink);
    var nav = document.querySelector('#detail-slider .work-slider-nav');
    if (nav && wd.sliderNavLabel) nav.setAttribute('aria-label', String(wd.sliderNavLabel));
    var prev = document.getElementById('slider-prev');
    if (prev && wd.prevImage) prev.setAttribute('aria-label', String(wd.prevImage));
    var next = document.getElementById('slider-next');
    if (next && wd.nextImage) next.setAttribute('aria-label', String(wd.nextImage));
    setMetaByName('description', wd.metaDescription);
  }

  window.applyShellTexts = applyShellTexts;
  window.applyHomePageFromData = applyHomePageFromData;
  window.applyWorksPageLabels = applyWorksPageLabels;
  window.applyWorkDetailLabels = applyWorkDetailLabels;
})();
