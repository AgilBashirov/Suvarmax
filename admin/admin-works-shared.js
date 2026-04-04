(function () {
  const LOCALES = ['az', 'ru', 'en'];
  const DEFAULT_LOCALE = 'az';

  function workImageSrc(path) {
    if (!path) return '';
    const p = String(path).trim();
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    const rel = p.replace(/^\//, '');
    let out = '../' + rel;
    try {
      if (typeof window !== 'undefined' && window.location && window.location.href) {
        out = new URL('../' + rel, window.location.href).href;
      }
    } catch (_) {}
    return out;
  }

  function workDisplayTitle(w) {
    const order = [DEFAULT_LOCALE, 'ru', 'en'];
    const i18n = (w && w.i18n) || {};
    for (let i = 0; i < order.length; i++) {
      const b = i18n[order[i]];
      if (b && String(b.title || '').trim()) return String(b.title).trim();
    }
    return '(başlıqsız)';
  }

  function normalizeWorkFromApi(w) {
    const i18n = {};
    LOCALES.forEach((loc) => {
      const b = w.i18n && w.i18n[loc];
      if (b && typeof b === 'object') {
        i18n[loc] = {
          title: String(b.title || '').trim(),
          description: String(b.description || '').trim(),
        };
      }
    });
    if ((w.title != null || w.description != null) && !i18n[DEFAULT_LOCALE]) {
      i18n[DEFAULT_LOCALE] = {
        title: String(w.title != null ? w.title : '').trim(),
        description: String(w.description != null ? w.description : '').trim(),
      };
    }
    return {
      id: Number(w.id),
      images: Array.isArray(w.images) ? w.images.slice() : [],
      i18n,
    };
  }

  function completenessFromTitleDesc(title, desc) {
    const t = String(title || '').trim();
    const d = String(desc || '').trim();
    if (!t && !d) return 'empty';
    if (t && d) return 'full';
    return 'partial';
  }

  function localeStateForWorkRow(w, loc) {
    const i18n = (w && w.i18n) || {};
    let b = i18n[loc];
    if (!b && loc === DEFAULT_LOCALE && (w.title != null || w.description != null)) {
      b = { title: w.title, description: w.description };
    }
    if (!b || typeof b !== 'object') return 'empty';
    return completenessFromTitleDesc(b.title, b.description);
  }

  function renderLocalePillsForRow(w) {
    return LOCALES.map((loc) => {
      const st = localeStateForWorkRow(w, loc);
      const label = loc.toUpperCase();
      let cls =
        'inline-flex items-center justify-center min-w-[1.75rem] px-1 py-0.5 rounded text-[10px] font-bold ';
      if (st === 'empty') cls += 'bg-gray-100 text-gray-500';
      else if (st === 'partial') cls += 'bg-amber-100 text-amber-800';
      else cls += 'bg-green-100 text-green-800';
      return '<span class="' + cls + '" title="' + st + '">' + label + '</span>';
    }).join('');
  }

  window.AdminWorksShared = {
    LOCALES,
    DEFAULT_LOCALE,
    workImageSrc,
    workDisplayTitle,
    normalizeWorkFromApi,
    completenessFromTitleDesc,
    localeStateForWorkRow,
    renderLocalePillsForRow,
  };
})();
