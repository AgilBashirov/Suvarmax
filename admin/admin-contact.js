(function () {
  const {
    credentials,
    requireAdmin,
    bindLogout,
    runWithButtonBusy,
    showAdminToast,
    dismissAdminToasts,
  } = window.AdminCommon;

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

  function nextSocialIdFromDraft() {
    if (!siteDraft || !siteDraft.social.length) return 1;
    return Math.max(0, ...siteDraft.social.map((p) => Number(p.id) || 0)) + 1;
  }

  function collectContactPage() {
    const contact = {
      phoneTel: document.getElementById('adm-site-phone-tel').value.trim(),
      phoneLabel: document.getElementById('adm-site-phone-label').value.trim(),
      email: document.getElementById('adm-site-email').value.trim(),
      address: document.getElementById('adm-site-address').value.trim(),
    };
    const social = [];
    document.querySelectorAll('.adm-site-social').forEach((row) => {
      social.push({
        id: Number(row.dataset.id) || 0,
        name: row.querySelector('.adm-s-name').value.trim(),
        url: row.querySelector('.adm-s-url').value.trim() || '#',
        icon: row.querySelector('.adm-s-icon').value.trim(),
      });
    });
    return { contact, social };
  }

  function syncDraftFromDom() {
    Object.assign(siteDraft, collectContactPage());
  }

  function setLogoPreview(img, path) {
    img.style.display = '';
    if (!path) {
      img.removeAttribute('src');
      img.style.display = 'none';
      return;
    }
    if (/^https?:\/\//i.test(path)) {
      img.src = path;
    } else {
      img.src = '/' + String(path).replace(/^\//, '');
    }
    img.onerror = function () {
      img.style.display = 'none';
    };
  }

  function buildSocialRow(s) {
    const div = document.createElement('div');
    div.className = 'adm-site-social border border-gray-200 rounded-lg p-4 mb-3 space-y-2';
    div.dataset.id = String(s.id);

    const row1 = document.createElement('div');
    row1.className = 'grid sm:grid-cols-2 gap-2';
    const nameInp = document.createElement('input');
    nameInp.type = 'text';
    nameInp.className = 'adm-s-name w-full px-3 py-2 border border-gray-300 rounded-lg text-sm';
    nameInp.placeholder = 'Ad (məs. Instagram)';
    nameInp.value = s.name || '';
    const urlInp = document.createElement('input');
    urlInp.type = 'text';
    urlInp.className = 'adm-s-url w-full px-3 py-2 border border-gray-300 rounded-lg text-sm';
    urlInp.placeholder = 'https://...';
    urlInp.value = s.url && s.url !== '#' ? s.url : '';
    row1.appendChild(nameInp);
    row1.appendChild(urlInp);

    const iconRow = document.createElement('div');
    iconRow.className = 'flex flex-wrap items-center gap-2';
    const iconInp = document.createElement('input');
    iconInp.type = 'text';
    iconInp.className =
      'adm-s-icon flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono';
    iconInp.placeholder = 'İkon: assets/images/social/…';
    iconInp.value = s.icon || '';
    iconInp.addEventListener('input', () => setLogoPreview(prev, iconInp.value.trim()));

    const fileInp = document.createElement('input');
    fileInp.type = 'file';
    fileInp.accept = 'image/*';
    fileInp.className = 'hidden adm-s-file';

    const btnUl = document.createElement('button');
    btnUl.type = 'button';
    btnUl.className = 'text-sm bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg';
    btnUl.textContent = 'İkon yüklə';
    btnUl.addEventListener('click', () => fileInp.click());

    fileInp.addEventListener('change', function () {
      if (!this.files || !this.files[0]) return;
      const fd = new FormData();
      fd.append('file', this.files[0]);
      runWithButtonBusy(btnUl, 'Yüklənir…', () =>
        fetch('/api/admin/upload/social', { method: 'POST', body: fd, ...credentials })
          .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
          .then(({ ok, d }) => {
            if (!ok) {
              if (d && d.error === 'Giriş tələb olunur') {
                window.location.href = 'login.html';
                return;
              }
              showErr((d && d.error) || 'Yükləmə alınmadı');
              return;
            }
            const rowEl = fileInp.closest('.adm-site-social');
            const inp = rowEl.querySelector('.adm-s-icon');
            const im = rowEl.querySelector('.adm-s-icon-preview');
            inp.value = d.path || '';
            setLogoPreview(im, inp.value.trim());
            fileInp.value = '';
            showOk('Dəyişiklik saxlanıldı.');
          })
          .catch(() => showErr('Şəbəkə xətası'))
      );
    });

    const prev = document.createElement('img');
    prev.className =
      'adm-s-icon-preview h-9 w-9 object-contain border border-gray-200 rounded bg-gray-50 p-1';
    prev.alt = '';
    setLogoPreview(prev, (s.icon || '').trim());

    iconRow.appendChild(iconInp);
    iconRow.appendChild(btnUl);
    iconRow.appendChild(fileInp);
    iconRow.appendChild(prev);

    const btns = document.createElement('div');
    btns.className = 'flex flex-wrap gap-2';

    function socialIndex() {
      return siteDraft.social.findIndex((x) => Number(x.id) === Number(div.dataset.id));
    }

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className =
      'px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40';
    btnUp.textContent = '↑';
    btnUp.addEventListener('click', () => {
      syncDraftFromDom();
      const i = socialIndex();
      if (i <= 0) return;
      const t = siteDraft.social[i];
      siteDraft.social[i] = siteDraft.social[i - 1];
      siteDraft.social[i - 1] = t;
      renderContactForm();
    });

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className =
      'px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40';
    btnDown.textContent = '↓';
    btnDown.addEventListener('click', () => {
      syncDraftFromDom();
      const i = socialIndex();
      if (i < 0 || i >= siteDraft.social.length - 1) return;
      const t = siteDraft.social[i];
      siteDraft.social[i] = siteDraft.social[i + 1];
      siteDraft.social[i + 1] = t;
      renderContactForm();
    });

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'text-sm text-red-600 hover:text-red-800';
    btnDel.textContent = 'Sil';
    btnDel.addEventListener('click', () => {
      syncDraftFromDom();
      const id = Number(div.dataset.id);
      siteDraft.social = siteDraft.social.filter((x) => Number(x.id) !== id);
      renderContactForm();
    });

    btns.appendChild(btnUp);
    btns.appendChild(btnDown);
    btns.appendChild(btnDel);

    div.appendChild(row1);
    div.appendChild(iconRow);
    div.appendChild(btns);
    return div;
  }

  function renderContactForm() {
    if (!siteDraft) return;
    const c = siteDraft.contact || {};
    document.getElementById('adm-site-phone-tel').value = c.phoneTel || '';
    document.getElementById('adm-site-phone-label').value = c.phoneLabel || '';
    document.getElementById('adm-site-email').value = c.email || '';
    document.getElementById('adm-site-address').value = c.address || '';

    const slist = document.getElementById('admin-site-social-list');
    slist.innerHTML = '';
    (siteDraft.social || []).forEach((s) => slist.appendChild(buildSocialRow(s)));
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
        siteDraft = JSON.parse(JSON.stringify(siteFull));
        if (!siteDraft.contact) siteDraft.contact = {};
        if (!Array.isArray(siteDraft.social)) siteDraft.social = [];
        renderContactForm();
      });
  }

  requireAdmin(document.getElementById('admin-user')).then((ok) => {
    if (!ok) return;
    bindLogout(document.getElementById('btn-logout'));
    loadSite();
  });

  document.getElementById('adm-site-add-social').addEventListener('click', () => {
    syncDraftFromDom();
    siteDraft.social.push({
      id: nextSocialIdFromDraft(),
      name: '',
      url: '#',
      icon: '',
    });
    renderContactForm();
  });

  document.getElementById('admin-save-site').addEventListener('click', () => {
    hideGlobals();
    const patch = collectContactPage();
    const site = {
      ...siteFull,
      contact: patch.contact,
      social: patch.social,
    };
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
          siteDraft = JSON.parse(JSON.stringify(siteFull));
          renderContactForm();
        })
        .catch(() => showErr('Şəbəkə xətası'))
    );
  });
})();
