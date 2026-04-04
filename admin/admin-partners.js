(function () {
  const {
    credentials,
    requireAdmin,
    bindLogout,
    runWithButtonBusy,
    showAdminToast,
    dismissAdminToasts,
  } = window.AdminCommon;

  /** Partnyor siyahısı yalnız bu dil dilimində (ictimai saytda hər lang üçün eyni) */
  const PARTNERS_LOCALE = 'az';

  let siteFull = null;
  let siteDraft = null;

  function showErr(msg) {
    showAdminToast(msg, 'error');
  }

  function showOk(msg) {
    showAdminToast(msg, 'success');
  }

  function hideGlobals() {
    dismissAdminToasts();
  }

  function nextPartnerIdFromDraft() {
    if (!siteDraft || !siteDraft.partners.length) return 1;
    return Math.max(0, ...siteDraft.partners.map((p) => Number(p.id) || 0)) + 1;
  }

  function collectPartnersPage() {
    const partners = [];
    document.querySelectorAll('.adm-site-partner').forEach((row) => {
      partners.push({
        id: Number(row.dataset.id) || 0,
        name: row.querySelector('.adm-p-name').value.trim(),
        url: row.querySelector('.adm-p-url').value.trim() || '#',
      });
    });
    return { partners };
  }

  function syncDraftFromDom() {
    Object.assign(siteDraft, collectPartnersPage());
  }

  function persistPartnersToAz() {
    if (!siteFull || !siteFull.locales) return;
    syncDraftFromDom();
    siteFull.locales[PARTNERS_LOCALE] = siteFull.locales[PARTNERS_LOCALE] || {};
    siteFull.locales[PARTNERS_LOCALE].partners = siteDraft.partners;
  }

  function loadDraftFromAz() {
    const slice = (siteFull && siteFull.locales && siteFull.locales[PARTNERS_LOCALE]) || {};
    siteDraft = { partners: normalizePartnersFromApi(slice.partners || []) };
    renderPartnersForm();
  }

  function buildPartnerRow(p) {
    const div = document.createElement('div');
    div.className = 'adm-site-partner border border-gray-200 rounded-lg p-4 mb-3 space-y-2';
    div.dataset.id = String(p.id);

    const row1 = document.createElement('div');
    row1.className = 'grid sm:grid-cols-2 gap-2';
    const nameInp = document.createElement('input');
    nameInp.type = 'text';
    nameInp.className = 'adm-p-name w-full px-3 py-2 border border-gray-300 rounded-lg text-sm';
    nameInp.placeholder = 'Partnyor adı';
    nameInp.value = p.name || '';
    const urlInp = document.createElement('input');
    urlInp.type = 'text';
    urlInp.className = 'adm-p-url w-full px-3 py-2 border border-gray-300 rounded-lg text-sm';
    urlInp.placeholder = 'https://...';
    urlInp.value = p.url && p.url !== '#' ? p.url : '';
    row1.appendChild(nameInp);
    row1.appendChild(urlInp);

    const btns = document.createElement('div');
    btns.className = 'flex flex-wrap gap-2';

    function partnerIndex() {
      return siteDraft.partners.findIndex((x) => Number(x.id) === Number(div.dataset.id));
    }

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className =
      'px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40';
    btnUp.textContent = '↑';
    btnUp.title = 'Yuxarı';
    btnUp.addEventListener('click', () => {
      syncDraftFromDom();
      const i = partnerIndex();
      if (i <= 0) return;
      const t = siteDraft.partners[i];
      siteDraft.partners[i] = siteDraft.partners[i - 1];
      siteDraft.partners[i - 1] = t;
      renderPartnersForm();
    });

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className =
      'px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40';
    btnDown.textContent = '↓';
    btnDown.title = 'Aşağı';
    btnDown.addEventListener('click', () => {
      syncDraftFromDom();
      const i = partnerIndex();
      if (i < 0 || i >= siteDraft.partners.length - 1) return;
      const t = siteDraft.partners[i];
      siteDraft.partners[i] = siteDraft.partners[i + 1];
      siteDraft.partners[i + 1] = t;
      renderPartnersForm();
    });

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'text-sm text-red-600 hover:text-red-800';
    btnDel.textContent = 'Sil';
    btnDel.addEventListener('click', () => {
      syncDraftFromDom();
      const id = Number(div.dataset.id);
      siteDraft.partners = siteDraft.partners.filter((x) => Number(x.id) !== id);
      renderPartnersForm();
    });

    btns.appendChild(btnUp);
    btns.appendChild(btnDown);
    btns.appendChild(btnDel);

    div.appendChild(row1);
    div.appendChild(btns);
    return div;
  }

  function renderPartnersForm() {
    if (!siteDraft) return;
    const plist = document.getElementById('admin-site-partners-list');
    if (!plist) return;
    plist.innerHTML = '';
    const rows = siteDraft.partners || [];
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-gray-500 py-2';
      empty.textContent =
        'Hələ partnyor yoxdur — «+ Partnyor» ilə əlavə edin. Məlumat serverdən gəlmirsə, yuxarıdakı xəbərdarlığa baxın.';
      plist.appendChild(empty);
      return;
    }
    rows.forEach((p) => plist.appendChild(buildPartnerRow(p)));
  }

  function normalizePartnersFromApi(list) {
    const arr = Array.isArray(list) ? list : [];
    return arr.map((p, i) => ({
      id: Number(p.id) > 0 ? Number(p.id) : i + 1,
      name: String(p.name || '').trim(),
      url: String(p.url || '').trim() || '#',
    }));
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
        hideGlobals();
        siteFull = data.site ? JSON.parse(JSON.stringify(data.site)) : {};
        if (!siteFull.locales || typeof siteFull.locales !== 'object') {
          siteFull.locales = { az: {}, ru: {}, en: {} };
        }
        ['az', 'ru', 'en'].forEach((loc) => {
          if (!siteFull.locales[loc]) siteFull.locales[loc] = {};
        });
        loadDraftFromAz();
      })
      .catch(() => {
        showErr(
          'Məlumat yüklənmədi. Layihə qovluğunda «npm start» ilə serveri işə salın və admin/login.html vasitəsilə daxil olun (səhifəni brauzerdə http://localhost:PORT/admin/... ünvanından açın).'
        );
        siteFull = { locales: { az: {}, ru: {}, en: {} }, telegramBotToken: '', telegramChatId: '' };
        loadDraftFromAz();
      });
  }

  requireAdmin(document.getElementById('admin-user')).then((ok) => {
    if (!ok) return;
    bindLogout(document.getElementById('btn-logout'));
    loadSite();
  });

  document.getElementById('adm-site-add-partner').addEventListener('click', () => {
    syncDraftFromDom();
    siteDraft.partners.push({
      id: nextPartnerIdFromDraft(),
      name: '',
      url: '#',
    });
    renderPartnersForm();
  });

  document.getElementById('admin-save-site').addEventListener('click', () => {
    hideGlobals();
    persistPartnersToAz();
    const site = JSON.parse(JSON.stringify(siteFull));
    const saveBtn = document.getElementById('admin-save-site');
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
          if (!siteFull.locales) siteFull.locales = { az: {}, ru: {}, en: {} };
          loadDraftFromAz();
        })
        .catch(() => showErr('Şəbəkə xətası'))
    );
  });
})();
