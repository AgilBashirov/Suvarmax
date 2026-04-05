(function () {
  const {
    credentials,
    requireAdmin,
    bindLogout,
    runWithButtonBusy,
    showAdminToast,
    dismissAdminToasts,
  } = window.AdminCommon;

  const PDF_LOCALES = [
    { code: 'az', pathKey: 'pathAz', emptyHint: 'Fayl yoxdur — AZ dilində navda PDF göstərilmir.' },
    { code: 'ru', pathKey: 'pathRu', emptyHint: 'Fayl yoxdur — RU dilində navda PDF göstərilmir.' },
    { code: 'en', pathKey: 'pathEn', emptyHint: 'Fayl yoxdur — EN dilində navda PDF göstərilmir.' },
  ];

  let siteFull = null;

  function showErr(msg) {
    showAdminToast(msg, 'error');
  }

  function showOk(msg) {
    showAdminToast(msg, 'success');
  }

  function renderLocaleRow(code, pathKey) {
    const p = String((siteFull.navPdf && siteFull.navPdf[pathKey]) || '').trim();
    document.getElementById('adm-navpdf-path-' + code).value = p;
    const hint = document.getElementById('adm-navpdf-hint-' + code);
    const cur = document.getElementById('adm-navpdf-current-' + code);
    if (p) {
      hint.textContent = 'Cari fayl: ' + p;
      cur.href = '/' + p.replace(/^\/+/, '');
      cur.classList.remove('hidden');
    } else {
      const meta = PDF_LOCALES.find((x) => x.code === code);
      hint.textContent = meta ? meta.emptyHint : '—';
      cur.classList.add('hidden');
      cur.removeAttribute('href');
    }
  }

  function render() {
    if (!siteFull) return;
    if (!siteFull.navPdf || typeof siteFull.navPdf !== 'object') {
      siteFull.navPdf = {
        pathAz: '',
        pathRu: '',
        pathEn: '',
        labelAz: '',
        labelRu: '',
        labelEn: '',
      };
    }
    PDF_LOCALES.forEach(({ code, pathKey }) => renderLocaleRow(code, pathKey));
    document.getElementById('adm-navpdf-az').value = siteFull.navPdf.labelAz || '';
    document.getElementById('adm-navpdf-ru').value = siteFull.navPdf.labelRu || '';
    document.getElementById('adm-navpdf-en').value = siteFull.navPdf.labelEn || '';
  }

  function collectFromDom() {
    return {
      pathAz: document.getElementById('adm-navpdf-path-az').value.trim(),
      pathRu: document.getElementById('adm-navpdf-path-ru').value.trim(),
      pathEn: document.getElementById('adm-navpdf-path-en').value.trim(),
      labelAz: document.getElementById('adm-navpdf-az').value.trim(),
      labelRu: document.getElementById('adm-navpdf-ru').value.trim(),
      labelEn: document.getElementById('adm-navpdf-en').value.trim(),
    };
  }

  function defaultNavPdf() {
    return {
      pathAz: '',
      pathRu: '',
      pathEn: '',
      labelAz: '',
      labelRu: '',
      labelEn: '',
    };
  }

  function loadSite() {
    return fetch('/api/admin/data', credentials)
      .then((r) => {
        if (r.status === 401) {
          window.location.href = 'login.html';
          return Promise.reject();
        }
        if (!r.ok) throw new Error('load');
        return r.json();
      })
      .then((data) => {
        dismissAdminToasts();
        siteFull = data.site ? JSON.parse(JSON.stringify(data.site)) : {};
        if (!siteFull.locales || typeof siteFull.locales !== 'object') {
          siteFull.locales = { az: {}, ru: {}, en: {} };
        }
        if (!siteFull.navPdf || typeof siteFull.navPdf !== 'object') {
          siteFull.navPdf = defaultNavPdf();
        }
        render();
      });
  }

  function saveSite() {
    siteFull.navPdf = collectFromDom();
    const saveBtn = document.getElementById('admin-save-navpdf');
    runWithButtonBusy(saveBtn, 'Saxlanır…', () =>
      fetch('/api/admin/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site: siteFull }),
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
          if (!siteFull.navPdf) siteFull.navPdf = defaultNavPdf();
          render();
        })
        .catch(() => showErr('Şəbəkə xətası'))
    );
  }

  function bindUpload(code, pathKey) {
    const input = document.getElementById('adm-navpdf-upload-' + code);
    if (!input) return;
    input.addEventListener('change', function () {
      const f = this.files && this.files[0];
      this.value = '';
      if (!f) return;
      const fd = new FormData();
      fd.append('file', f);
      fetch('/api/admin/upload/pdf', { method: 'POST', body: fd, ...credentials })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (!ok || !d.ok) {
            showErr((d && d.error) || 'PDF yüklənmədi');
            return;
          }
          const p = String(d.path || '').trim();
          document.getElementById('adm-navpdf-path-' + code).value = p;
          if (siteFull && siteFull.navPdf) siteFull.navPdf[pathKey] = p;
          renderLocaleRow(code, pathKey);
          const hint = document.getElementById('adm-navpdf-hint-' + code);
          if (p) hint.textContent = 'Cari fayl (saxlanmamış): ' + p;
          showOk('Fayl yükləndi. «Saxla» ilə təsdiqləyin.');
        })
        .catch(() => showErr('Şəbəkə xətası'));
    });
  }

  function bindRemove(code, pathKey) {
    const btn = document.getElementById('adm-navpdf-remove-' + code);
    if (!btn) return;
    btn.addEventListener('click', () => {
      document.getElementById('adm-navpdf-path-' + code).value = '';
      if (siteFull && siteFull.navPdf) siteFull.navPdf[pathKey] = '';
      document.getElementById('adm-navpdf-hint-' + code).textContent =
        'Fayl silinəcək — «Saxla» ilə təsdiqləyin.';
      document.getElementById('adm-navpdf-current-' + code).classList.add('hidden');
    });
  }

  PDF_LOCALES.forEach(({ code, pathKey }) => {
    bindUpload(code, pathKey);
    bindRemove(code, pathKey);
  });

  document.getElementById('admin-save-navpdf').addEventListener('click', saveSite);

  requireAdmin(document.getElementById('admin-user')).then((ok) => {
    if (!ok) return;
    bindLogout(document.getElementById('btn-logout'));
    loadSite();
  });
})();
