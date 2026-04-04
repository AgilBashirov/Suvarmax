(function () {
  const {
    credentials,
    requireAdmin,
    bindLogout,
    runWithButtonBusy,
    showAdminToast,
    dismissAdminToasts,
  } = window.AdminCommon;

  const LOCALES = ['az', 'ru', 'en'];
  const DEFAULT_LOCALE = 'az';
  const NUM_SERVICE_CARDS = 6;

  let siteFull = null;
  let activeLocale = 'az';
  let defaultPagesHome = null;
  let staticHomeByLocale = null;

  const localeSel = document.getElementById('admin-home-locale');
  const servicesCardsWrap = document.getElementById('services-cards-wrap');

  function showErr(msg) {
    showAdminToast(msg, 'error');
  }

  function showOk(msg) {
    showAdminToast(msg, 'success');
  }

  function mergeHomeLayer(left, right) {
    if (!right || typeof right !== 'object') return left;
    if (Array.isArray(right)) {
      if (!right.length) return left;
      if (!Array.isArray(left)) return right;
      return right.map((r, i) => {
        if (r && typeof r === 'object' && !Array.isArray(r) && left[i] && typeof left[i] === 'object') {
          return mergeHomeLayer(left[i], r);
        }
        const rs = r != null ? String(r).trim() : '';
        return rs !== '' ? r : left[i];
      });
    }
    const out = { ...left };
    for (const k of Object.keys(right)) {
      const rv = right[k];
      const lv = left[k];
      if (rv && typeof rv === 'object' && !Array.isArray(rv)) {
        out[k] = mergeHomeLayer(lv && typeof lv === 'object' && !Array.isArray(lv) ? lv : {}, rv);
      } else {
        const rs = rv != null ? String(rv).trim() : '';
        if (rs !== '') out[k] = rv;
        else if (lv !== undefined) out[k] = lv;
      }
    }
    return out;
  }

  function mergeHomeForPublic(norm, lang) {
    if (!defaultPagesHome || !staticHomeByLocale) return {};
    const L = LOCALES.includes(lang) ? lang : DEFAULT_LOCALE;
    const shellSrc = staticHomeByLocale[L] || staticHomeByLocale[DEFAULT_LOCALE] || {};
    const shell = JSON.parse(JSON.stringify(shellSrc));
    const def = JSON.parse(JSON.stringify(defaultPagesHome));
    const azH = (norm.locales.az.pages && norm.locales.az.pages.home) || {};
    const locSlice = norm.locales[L] || norm.locales[DEFAULT_LOCALE];
    const locH = (locSlice.pages && locSlice.pages.home) || {};
    const defS = def.services && typeof def.services === 'object' ? def.services : {};
    const defA = def.about && typeof def.about === 'object' ? def.about : {};
    const azS = azH.services && typeof azH.services === 'object' ? azH.services : {};
    const azA = azH.about && typeof azH.about === 'object' ? azH.about : {};
    const locS = locH.services && typeof locH.services === 'object' ? locH.services : {};
    const locA = locH.about && typeof locH.about === 'object' ? locH.about : {};
    return {
      ...shell,
      services: mergeHomeLayer(mergeHomeLayer(defS, azS), locS),
      about: mergeHomeLayer(mergeHomeLayer(defA, azA), locA),
    };
  }

  function getHomeObject() {
    if (!siteFull || !siteFull.locales || !siteFull.locales[activeLocale]) return {};
    const pages = siteFull.locales[activeLocale].pages || {};
    return pages.home && typeof pages.home === 'object' ? pages.home : {};
  }

  function setHomeObject(obj) {
    if (!siteFull.locales[activeLocale]) siteFull.locales[activeLocale] = {};
    siteFull.locales[activeLocale].pages = siteFull.locales[activeLocale].pages || {};
    siteFull.locales[activeLocale].pages.home = obj && typeof obj === 'object' ? obj : {};
  }

  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((o, k) => {
      if (o == null) return undefined;
      return o[/^\d+$/.test(k) ? Number(k) : k];
    }, obj);
  }

  function setByPath(obj, path, value) {
    const parts = String(path).split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      const keyIsIndex = /^\d+$/.test(key);
      if (keyIsIndex) {
        const idx = Number(key);
        while (cur.length <= idx) cur.push(undefined);
        if (cur[idx] == null || typeof cur[idx] !== 'object') {
          const nxt = parts[i + 1];
          cur[idx] = nxt !== undefined && /^\d+$/.test(nxt) ? [] : {};
        }
        cur = cur[idx];
      } else {
        const nxt = parts[i + 1];
        if (!cur[key] || typeof cur[key] !== 'object') {
          cur[key] = nxt !== undefined && /^\d+$/.test(nxt) ? [] : {};
        }
        cur = cur[key];
      }
    }
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) {
      const idx = Number(last);
      while (cur.length <= idx) cur.push(undefined);
      cur[idx] = value;
    } else {
      cur[last] = value;
    }
  }

  function buildServicesCardsMarkup() {
    if (!servicesCardsWrap) return;
    const parts = [];
    for (let i = 0; i < NUM_SERVICE_CARDS; i++) {
      parts.push(`
        <fieldset class="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
          <legend class="text-sm font-semibold text-gray-800 px-1">Kart ${i + 1}</legend>
          <div class="grid gap-3 mt-2">
            <label class="block text-xs text-gray-600">title <input type="text" data-home-path="services.cards.${i}.title" class="mt-0.5 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"></label>
            <label class="block text-xs text-gray-600">body <textarea data-home-path="services.cards.${i}.body" rows="3" class="mt-0.5 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"></textarea></label>
            <p class="text-xs font-medium text-gray-500">bullets</p>
            <label class="block text-xs text-gray-600">1 <input type="text" data-home-path="services.cards.${i}.bullets.0" class="mt-0.5 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"></label>
            <label class="block text-xs text-gray-600">2 <input type="text" data-home-path="services.cards.${i}.bullets.1" class="mt-0.5 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"></label>
            <label class="block text-xs text-gray-600">3 <input type="text" data-home-path="services.cards.${i}.bullets.2" class="mt-0.5 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"></label>
          </div>
        </fieldset>
      `);
    }
    servicesCardsWrap.innerHTML = parts.join('');
  }

  function fillFieldsFromHome(home) {
    const h = home || {};
    document.querySelectorAll('[data-home-path]').forEach((el) => {
      const p = el.dataset.homePath;
      if (!p) return;
      const v = getByPath(h, p);
      el.value = v != null && v !== undefined ? String(v) : '';
    });
  }

  function flushCurrentLocaleFormsToStored() {
    if (!siteFull) return;
    const next = {};
    document.querySelectorAll('[data-home-path]').forEach((el) => {
      const p = el.dataset.homePath;
      if (!p) return;
      setByPath(next, p, el.value.trim());
    });
    setHomeObject(next);
  }

  function refreshFormsFromMerged() {
    if (!siteFull || !defaultPagesHome || !staticHomeByLocale) return;
    const merged = mergeHomeForPublic(siteFull, activeLocale);
    fillFieldsFromHome(merged);
  }

  function loadDefaults() {
    return Promise.all([
      fetch('/data/static-home-by-locale.json').then((r) => {
        if (!r.ok) throw new Error('static');
        return r.json();
      }),
      fetch('/data/default-pages-home.json').then((r) => {
        if (!r.ok) throw new Error('default');
        return r.json();
      }),
    ])
      .then(([staticJ, defJ]) => {
        staticHomeByLocale = staticJ && typeof staticJ === 'object' ? staticJ : {};
        defaultPagesHome = defJ && typeof defJ === 'object' ? defJ : {};
      })
      .catch(() => {
        staticHomeByLocale = {};
        defaultPagesHome = {};
        showErr('Statik və ya standart fayl yüklənmədi (/data/static-home-by-locale.json, /data/default-pages-home.json).');
      });
  }

  function loadSite() {
    return fetch('/api/admin/data', credentials)
      .then((r) => {
        if (r.status === 401) {
          window.location.href = 'login.html';
          return Promise.reject();
        }
        if (!r.ok) throw new Error('Məlumat yüklənmədi');
        return r.json();
      })
      .then((data) => {
        dismissAdminToasts();
        siteFull = data.site ? JSON.parse(JSON.stringify(data.site)) : {};
        if (!siteFull.locales || typeof siteFull.locales !== 'object') {
          siteFull.locales = { az: {}, ru: {}, en: {} };
        }
        LOCALES.forEach((loc) => {
          if (!siteFull.locales[loc]) siteFull.locales[loc] = { pages: { home: {} } };
          if (!siteFull.locales[loc].pages) siteFull.locales[loc].pages = { home: {} };
          if (!siteFull.locales[loc].pages.home) siteFull.locales[loc].pages.home = {};
        });
        activeLocale = localeSel && localeSel.value ? localeSel.value : 'az';
        if (localeSel) localeSel.value = activeLocale;
        return loadDefaults();
      })
      .then(() => {
        refreshFormsFromMerged();
      })
      .catch(() => {
        showErr('Məlumat yüklənmədi.');
        siteFull = { locales: { az: {}, ru: {}, en: {} }, telegramBotToken: '', telegramChatId: '' };
        loadDefaults().then(() => refreshFormsFromMerged());
      });
  }

  function setActiveTab(id) {
    document.querySelectorAll('.home-tab').forEach((btn) => {
      const on = btn.getAttribute('data-home-tab') === id;
      btn.classList.toggle('bg-primary-light', on);
      btn.classList.toggle('text-primary', on);
      btn.classList.toggle('text-gray-600', !on);
      btn.classList.toggle('hover:bg-gray-200/80', !on);
    });
    document.querySelectorAll('.home-panel').forEach((p) => {
      const show = p.getAttribute('data-home-panel') === id;
      p.classList.toggle('hidden', !show);
    });
  }

  document.querySelectorAll('.home-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-home-tab');
      if (id) setActiveTab(id);
    });
  });

  requireAdmin(document.getElementById('admin-user')).then((ok) => {
    if (!ok) return;
    bindLogout(document.getElementById('btn-logout'));
    buildServicesCardsMarkup();
    setActiveTab('services');
    loadSite();
  });

  if (localeSel) {
    localeSel.addEventListener('change', () => {
      flushCurrentLocaleFormsToStored();
      activeLocale = localeSel.value;
      refreshFormsFromMerged();
    });
  }

  document.getElementById('admin-save-home').addEventListener('click', () => {
    dismissAdminToasts();
    flushCurrentLocaleFormsToStored();
    const site = JSON.parse(JSON.stringify(siteFull));
    const saveBtn = document.getElementById('admin-save-home');
    runWithButtonBusy(saveBtn, 'Saxlanır…', () =>
      fetch('/api/admin/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site }),
        ...credentials,
      })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) {
            if (d && d.error === 'Giriş tələb olunur') {
              window.location.href = 'login.html';
              return;
            }
            showErr((d && d.error) || 'Saxlanılmadı');
            return;
          }
          showOk('Dəyişiklik saxlanıldı.');
          siteFull = d.site ? JSON.parse(JSON.stringify(d.site)) : siteFull;
          refreshFormsFromMerged();
        })
        .catch(() => showErr('Şəbəkə xətası'))
    );
  });
})();
