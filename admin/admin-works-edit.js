(function () {
  const {
    credentials,
    escapeHtml,
    requireAdmin,
    bindLogout,
    runWithButtonBusy,
    showAdminToast,
    dismissAdminToasts,
  } = window.AdminCommon;

  const S = window.AdminWorksShared;
  const LOCALES = S.LOCALES;
  const DEFAULT_LOCALE = S.DEFAULT_LOCALE;

  const workEditLoading = document.getElementById('work-edit-loading');
  const workEditNotFound = document.getElementById('work-edit-not-found');
  const workEditMain = document.getElementById('work-edit-main');
  const workEditStickyFooter = document.getElementById('work-edit-sticky-footer');
  const workEditBreadcrumb = document.getElementById('work-edit-breadcrumb');

  const workForm = document.getElementById('work-form');
  const workFormTitle = document.getElementById('work-form-title');
  const workEditId = document.getElementById('work-edit-id');
  const workTitle = document.getElementById('work-title');
  const workDesc = document.getElementById('work-desc');
  const workFiles = document.getElementById('work-files');
  const workImagesList = document.getElementById('work-images-list');
  const btnUpload = document.getElementById('btn-upload');
  const btnWorkCancel = document.getElementById('btn-work-cancel');
  const btnWorkSubmit = document.getElementById('btn-work-submit');
  /** @type {HTMLInputElement|null} */
  const workLocaleSel = document.getElementById('work-edit-locale');
  const btnRemoveLocale = document.getElementById('btn-remove-work-locale');
  const localeTabButtons = () =>
    Array.from(document.querySelectorAll('.work-locale-tab'));

  const params = new URLSearchParams(window.location.search);
  const urlWorkIdRaw = params.get('id');
  const urlWorkId = urlWorkIdRaw != null && String(urlWorkIdRaw).trim() !== ''
    ? Number(urlWorkIdRaw)
    : NaN;
  const isNewWork = !Number.isFinite(urlWorkId) || urlWorkId < 1;

  let imagePaths = [];
  let editBuffer = null;
  let lastWorkFormLocale = DEFAULT_LOCALE;
  let pageOpenSnapshot = null;
  let dragImageIndex = null;

  function showErr(msg) {
    showAdminToast(msg, 'error');
  }

  function showOk(msg) {
    showAdminToast(msg, 'success');
  }

  function hideGlobals() {
    dismissAdminToasts();
  }

  function getFormLocale() {
    return workLocaleSel && workLocaleSel.value ? workLocaleSel.value : DEFAULT_LOCALE;
  }

  function setFormLocale(loc) {
    if (!workLocaleSel) return;
    workLocaleSel.value = LOCALES.includes(loc) ? loc : DEFAULT_LOCALE;
    localeTabButtons().forEach((btn) => {
      const on = btn.getAttribute('data-locale') === workLocaleSel.value;
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.classList.toggle('bg-white', on);
      btn.classList.toggle('shadow-sm', on);
      btn.classList.toggle('text-primary', on);
      btn.classList.toggle('text-gray-500', !on);
    });
  }

  function computeLocaleStateInForm(loc) {
    if (editBuffer) {
      const b = (editBuffer.i18n && editBuffer.i18n[loc]) || {};
      return S.completenessFromTitleDesc(b.title, b.description);
    }
    if (loc === getFormLocale()) {
      return S.completenessFromTitleDesc(workTitle.value, workDesc.value);
    }
    return 'empty';
  }

  function updateLocaleTabIndicators() {
    localeTabButtons().forEach((btn) => {
      const loc = btn.getAttribute('data-locale');
      if (!loc) return;
      const st = computeLocaleStateInForm(loc);
      btn.classList.remove(
        'border-l-4',
        'border-l-gray-300',
        'border-l-amber-400',
        'border-l-green-600',
        'pl-2'
      );
      btn.classList.add('border-l-4', 'pl-2');
      if (st === 'empty') btn.classList.add('border-l-gray-300');
      else if (st === 'partial') btn.classList.add('border-l-amber-400');
      else btn.classList.add('border-l-green-600');
      const titles = { empty: 'Boş', partial: 'Qismən', full: 'Tam' };
      btn.title = loc.toUpperCase() + ' — ' + titles[st];
    });
  }

  function flushFormToBuffer(specificLocale) {
    if (!editBuffer) return;
    const loc =
      specificLocale != null && specificLocale !== ''
        ? specificLocale
        : lastWorkFormLocale || getFormLocale();
    editBuffer.i18n = editBuffer.i18n || {};
    editBuffer.i18n[loc] = {
      title: workTitle.value.trim(),
      description: workDesc.value.trim(),
    };
  }

  function fillFormFromBuffer() {
    if (!editBuffer) return;
    const loc = getFormLocale();
    const b = (editBuffer.i18n && editBuffer.i18n[loc]) || {};
    workTitle.value = b.title || '';
    workDesc.value = b.description || '';
  }

  function updateRemoveLocaleButton() {
    if (!btnRemoveLocale) return;
    const loc = getFormLocale();
    const editing = !!editBuffer && !!workEditId.value.trim();
    btnRemoveLocale.classList.toggle('hidden', !editing || loc === DEFAULT_LOCALE);
  }

  function updateBreadcrumb() {
    if (!workEditBreadcrumb) return;
    if (isNewWork && !workEditId.value.trim()) {
      workEditBreadcrumb.textContent = 'Yeni iş';
    } else {
      const id = workEditId.value.trim() || String(urlWorkId);
      workEditBreadcrumb.textContent = 'Redaktə #' + id;
    }
  }

  function moveImage(index, delta) {
    const j = index + delta;
    if (j < 0 || j >= imagePaths.length) return;
    const t = imagePaths[index];
    imagePaths[index] = imagePaths[j];
    imagePaths[j] = t;
    renderImageList();
  }

  function reorderImage(from, to) {
    if (from === to || from < 0 || to < 0 || from >= imagePaths.length || to >= imagePaths.length)
      return;
    const item = imagePaths.splice(from, 1)[0];
    imagePaths.splice(to, 0, item);
    renderImageList();
  }

  function renderImageList() {
    workImagesList.innerHTML = '';
    if (!imagePaths.length) {
      workImagesList.innerHTML =
        '<li class="text-gray-400">Hələ şəkil yoxdur — fayl seçib yükləyin.</li>';
      return;
    }
    imagePaths.forEach((p, i) => {
      const li = document.createElement('li');
      li.className =
        'work-image-row flex flex-wrap items-center gap-3 py-2 border-b border-gray-100 last:border-0 cursor-grab active:cursor-grabbing';
      li.draggable = true;
      li.dataset.index = String(i);

      li.addEventListener('dragstart', (e) => {
        dragImageIndex = i;
        li.classList.add('opacity-50');
        try {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(i));
        } catch (_) {}
      });
      li.addEventListener('dragend', () => {
        dragImageIndex = null;
        li.classList.remove('opacity-50');
        workImagesList.querySelectorAll('.work-image-row').forEach((row) => {
          row.classList.remove('ring-2', 'ring-primary', 'ring-inset');
        });
      });
      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        try {
          e.dataTransfer.dropEffect = 'move';
        } catch (_) {}
        li.classList.add('ring-2', 'ring-primary', 'ring-inset');
      });
      li.addEventListener('dragleave', () => {
        li.classList.remove('ring-2', 'ring-primary', 'ring-inset');
      });
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        li.classList.remove('ring-2', 'ring-primary', 'ring-inset');
        const from =
          dragImageIndex != null ? dragImageIndex : parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (Number.isNaN(from)) return;
        reorderImage(from, i);
      });

      const orderWrap = document.createElement('div');
      orderWrap.className = 'flex flex-col gap-1 shrink-0';
      const btnUp = document.createElement('button');
      btnUp.type = 'button';
      btnUp.className =
        'px-2 py-0.5 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed';
      btnUp.textContent = '↑';
      btnUp.title = 'Yuxarı';
      btnUp.disabled = i === 0;
      btnUp.addEventListener('click', () => moveImage(i, -1));

      const btnDown = document.createElement('button');
      btnDown.type = 'button';
      btnDown.className =
        'px-2 py-0.5 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed';
      btnDown.textContent = '↓';
      btnDown.title = 'Aşağı';
      btnDown.disabled = i === imagePaths.length - 1;
      btnDown.addEventListener('click', () => moveImage(i, 1));

      orderWrap.appendChild(btnUp);
      orderWrap.appendChild(btnDown);

      const thumbWrap = document.createElement('div');
      thumbWrap.className =
        'shrink-0 w-14 h-14 rounded-lg border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center';
      const src = S.workImageSrc(p);
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.className = 'w-full h-full object-cover';
        img.loading = 'eager';
        img.decoding = 'async';
        img.addEventListener('error', () => {
          thumbWrap.innerHTML = '';
          thumbWrap.classList.add('text-[10px]', 'text-gray-400', 'p-1', 'text-center');
          thumbWrap.textContent = 'Fayl';
        });
        thumbWrap.appendChild(img);
      }

      const pathCol = document.createElement('div');
      pathCol.className = 'flex-1 min-w-0';
      const pathRow = document.createElement('div');
      pathRow.className = 'truncate font-mono text-xs text-gray-700';
      if (i === 0) {
        const badge = document.createElement('span');
        badge.className =
          'inline-block mr-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-primary text-white align-middle';
        badge.textContent = 'Əsas';
        pathRow.appendChild(badge);
      }
      pathRow.appendChild(document.createTextNode(p));

      pathCol.appendChild(pathRow);

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'text-red-600 hover:text-red-800 shrink-0 text-sm self-center';
      btnDel.textContent = 'Sil';
      btnDel.addEventListener('click', () => {
        imagePaths.splice(i, 1);
        renderImageList();
      });

      li.appendChild(orderWrap);
      li.appendChild(thumbWrap);
      li.appendChild(pathCol);
      li.appendChild(btnDel);
      workImagesList.appendChild(li);
    });
  }

  function captureFormSnapshot() {
    const id = workEditId.value.trim();
    const loc = getFormLocale();
    if (editBuffer) flushFormToBuffer(loc);
    return JSON.stringify({
      id,
      locale: loc,
      images: imagePaths.slice(),
      i18n: editBuffer ? JSON.parse(JSON.stringify(editBuffer.i18n)) : null,
      title: workTitle.value.trim(),
      desc: workDesc.value.trim(),
      files: !!(workFiles.files && workFiles.files.length),
    });
  }

  function isPageDirty() {
    if (pageOpenSnapshot == null) return false;
    return captureFormSnapshot() !== pageOpenSnapshot;
  }

  function tryNavigateToList() {
    if (isPageDirty()) {
      if (!confirm('Saxlanmamış dəyişikliklər var. İşlər səhifəsinə keçilsin?')) return;
    }
    window.location.href = 'panel-works.html';
  }

  function showEditorChrome() {
    workEditLoading.classList.add('hidden');
    workEditNotFound.classList.add('hidden');
    workEditMain.classList.remove('hidden');
    workEditStickyFooter.classList.remove('hidden');
  }

  function clearNewWorkForm() {
    workEditId.value = '';
    workFormTitle.textContent = 'Yeni iş əlavə et';
    workTitle.value = '';
    workDesc.value = '';
    workFiles.value = '';
    imagePaths = [];
    editBuffer = null;
    setFormLocale(DEFAULT_LOCALE);
    lastWorkFormLocale = DEFAULT_LOCALE;
    renderImageList();
    updateRemoveLocaleButton();
    updateLocaleTabIndicators();
    updateBreadcrumb();
  }

  function applyWorkToForm(work) {
    editBuffer = S.normalizeWorkFromApi(work);
    workEditId.value = String(editBuffer.id);
    workFormTitle.textContent = 'İşi redaktə et (ID: ' + editBuffer.id + ')';
    setFormLocale(DEFAULT_LOCALE);
    lastWorkFormLocale = DEFAULT_LOCALE;
    fillFormFromBuffer();
    imagePaths = Array.isArray(editBuffer.images) ? editBuffer.images.slice() : [];
    workFiles.value = '';
    renderImageList();
    updateRemoveLocaleButton();
    updateLocaleTabIndicators();
    updateBreadcrumb();
  }

  function refreshPageSnapshot() {
    pageOpenSnapshot = captureFormSnapshot();
  }

  window.addEventListener('beforeunload', (e) => {
    if (isPageDirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  localeTabButtons().forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-locale');
      if (!next || next === getFormLocale()) return;
      const prev = lastWorkFormLocale;
      flushFormToBuffer(prev);
      setFormLocale(next);
      lastWorkFormLocale = next;
      if (editBuffer) fillFormFromBuffer();
      else {
        workTitle.value = '';
        workDesc.value = '';
      }
      updateRemoveLocaleButton();
      updateLocaleTabIndicators();
    });
  });

  workTitle.addEventListener('input', updateLocaleTabIndicators);
  workDesc.addEventListener('input', updateLocaleTabIndicators);

  if (btnRemoveLocale) {
    btnRemoveLocale.addEventListener('click', () => {
      const id = Number(workEditId.value);
      const loc = getFormLocale();
      if (!id || loc === DEFAULT_LOCALE) return;
      if (!confirm('Bu dil üçün tərcümə silinsin? (AZ silinmir)')) return;
      runWithButtonBusy(btnRemoveLocale, 'Silinir…', () =>
        fetch('/api/admin/works/' + id + '/locale/' + encodeURIComponent(loc), {
          method: 'DELETE',
          ...credentials,
        })
          .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
          .then(({ ok, d }) => {
            if (!ok) {
              showErr((d && d.error) || 'Silinmədi');
              return;
            }
            showOk('Tərcümə silindi');
            editBuffer = S.normalizeWorkFromApi(d.work);
            setFormLocale(DEFAULT_LOCALE);
            lastWorkFormLocale = DEFAULT_LOCALE;
            fillFormFromBuffer();
            updateRemoveLocaleButton();
            updateLocaleTabIndicators();
            refreshPageSnapshot();
          })
          .catch(() => showErr('Şəbəkə xətası'))
      );
    });
  }

  btnUpload.addEventListener('click', () => {
    const files = workFiles.files;
    if (!files || !files.length) {
      showErr('Əvvəlcə fayl seçin.');
      return;
    }
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) {
      fd.append('files', files[i]);
    }
    runWithButtonBusy(btnUpload, 'Yüklənir…', () =>
      fetch('/api/admin/upload', { method: 'POST', body: fd, ...credentials })
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
          (d.paths || []).forEach((path) => imagePaths.push(path));
          workFiles.value = '';
          renderImageList();
          showOk('Şəkil(lər) yükləndi');
        })
        .catch(() => showErr('Yükləmə xətası'))
    );
  });

  workForm.addEventListener('submit', function (e) {
    e.preventDefault();
    hideGlobals();
    if (!imagePaths.length) {
      showErr('Ən azı bir şəkil yolu olmalıdır (fayl yükləyin).');
      return;
    }
    const editId = workEditId.value.trim();
    const submitBtn = btnWorkSubmit;

    if (editId) {
      flushFormToBuffer(getFormLocale());
      const payload = { images: imagePaths, i18n: editBuffer.i18n };
      runWithButtonBusy(submitBtn, 'Saxlanır…', () =>
        fetch('/api/admin/works/' + encodeURIComponent(editId), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          ...credentials,
        })
          .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
          .then(({ ok, d }) => {
            if (!ok) {
              showErr((d && d.error) || 'Saxlanılmadı');
              return;
            }
            showOk('Dəyişiklik saxlanıldı.');
            applyWorkToForm(d.work);
            refreshPageSnapshot();
          })
          .catch(() => showErr('Şəbəkə xətası'))
      );
      return;
    }

    const title = workTitle.value.trim();
    const description = workDesc.value.trim();
    const locale = getFormLocale();
    const payload = { locale, title, description, images: imagePaths };

    runWithButtonBusy(submitBtn, 'Saxlanır…', () =>
      fetch('/api/admin/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        ...credentials,
      })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) {
            showErr((d && d.error) || 'Saxlanılmadı');
            return;
          }
          showOk('İş yaradıldı.');
          const w = d.work;
          if (w && w.id != null) {
            window.location.replace('panel-works-edit.html?id=' + encodeURIComponent(String(w.id)));
          } else {
            window.location.href = 'panel-works.html';
          }
        })
        .catch(() => showErr('Şəbəkə xətası'))
    );
  });

  btnWorkCancel.addEventListener('click', () => tryNavigateToList());

  requireAdmin(document.getElementById('admin-user')).then((ok) => {
    if (!ok) return;
    bindLogout(document.getElementById('btn-logout'));

    if (isNewWork) {
      clearNewWorkForm();
      showEditorChrome();
      refreshPageSnapshot();
      return;
    }

    workEditLoading.classList.remove('hidden');
    fetch('/api/admin/data', credentials)
      .then((r) => {
        if (r.status === 401) {
          window.location.href = 'login.html';
          return Promise.reject();
        }
        if (!r.ok) throw new Error('fail');
        return r.json();
      })
      .then((data) => {
        const works = data.works || [];
        const w = works.find((x) => Number(x.id) === urlWorkId);
        if (!w) {
          workEditLoading.classList.add('hidden');
          workEditNotFound.classList.remove('hidden');
          return;
        }
        showEditorChrome();
        applyWorkToForm(w);
        refreshPageSnapshot();
      })
      .catch(() => {
        workEditLoading.classList.add('hidden');
        showErr('Məlumat yüklənmədi');
      });
  });

  setFormLocale(DEFAULT_LOCALE);
  updateLocaleTabIndicators();
})();
