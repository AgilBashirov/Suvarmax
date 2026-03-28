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

  const workForm = document.getElementById('work-form');
  const workFormTitle = document.getElementById('work-form-title');
  const workEditId = document.getElementById('work-edit-id');
  const workTitle = document.getElementById('work-title');
  const workDesc = document.getElementById('work-desc');
  const workFiles = document.getElementById('work-files');
  const workImagesList = document.getElementById('work-images-list');
  const btnUpload = document.getElementById('btn-upload');
  const btnWorkCancel = document.getElementById('btn-work-cancel');
  const worksTableBody = document.getElementById('works-table-body');

  let imagePaths = [];

  function showErr(msg) {
    showAdminToast(msg, 'error');
  }

  function showOk(msg) {
    showAdminToast(msg, 'success');
  }

  function hideGlobals() {
    dismissAdminToasts();
  }

  function moveImage(index, delta) {
    const j = index + delta;
    if (j < 0 || j >= imagePaths.length) return;
    const t = imagePaths[index];
    imagePaths[index] = imagePaths[j];
    imagePaths[j] = t;
    renderImageList();
  }

  function renderImageList() {
    workImagesList.innerHTML = '';
    if (!imagePaths.length) {
      workImagesList.innerHTML = '<li class="text-gray-400">Hələ şəkil yoxdur — fayl seçib yükləyin.</li>';
      return;
    }
    imagePaths.forEach((p, i) => {
      const li = document.createElement('li');
      li.className =
        'flex flex-wrap items-center gap-2 py-2 border-b border-gray-100 last:border-0';

      const orderWrap = document.createElement('div');
      orderWrap.className = 'flex items-center gap-1 shrink-0';
      const btnUp = document.createElement('button');
      btnUp.type = 'button';
      btnUp.className =
        'px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed';
      btnUp.textContent = '↑';
      btnUp.title = 'Yuxarı';
      btnUp.disabled = i === 0;
      btnUp.addEventListener('click', () => moveImage(i, -1));

      const btnDown = document.createElement('button');
      btnDown.type = 'button';
      btnDown.className =
        'px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed';
      btnDown.textContent = '↓';
      btnDown.title = 'Aşağı';
      btnDown.disabled = i === imagePaths.length - 1;
      btnDown.addEventListener('click', () => moveImage(i, 1));

      orderWrap.appendChild(btnUp);
      orderWrap.appendChild(btnDown);

      const pathSpan = document.createElement('span');
      pathSpan.className = 'truncate font-mono text-xs flex-1 min-w-0';
      if (i === 0) {
        const badge = document.createElement('span');
        badge.className =
          'inline-block mr-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-primary text-white align-middle';
        badge.textContent = 'Əsas';
        pathSpan.appendChild(badge);
      }
      pathSpan.appendChild(document.createTextNode(p));

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'text-red-600 hover:text-red-800 shrink-0 text-sm';
      btnDel.textContent = 'Sil';
      btnDel.addEventListener('click', () => {
        imagePaths.splice(i, 1);
        renderImageList();
      });

      li.appendChild(orderWrap);
      li.appendChild(pathSpan);
      li.appendChild(btnDel);
      workImagesList.appendChild(li);
    });
  }

  function resetWorkForm() {
    workEditId.value = '';
    workFormTitle.textContent = 'Yeni iş əlavə et';
    workTitle.value = '';
    workDesc.value = '';
    workFiles.value = '';
    imagePaths = [];
    btnWorkCancel.classList.add('hidden');
    renderImageList();
  }

  function startEdit(work) {
    workEditId.value = String(work.id);
    workFormTitle.textContent = 'İşi redaktə et (ID: ' + work.id + ')';
    workTitle.value = work.title || '';
    workDesc.value = work.description || '';
    imagePaths = Array.isArray(work.images) ? work.images.slice() : [];
    workFiles.value = '';
    btnWorkCancel.classList.remove('hidden');
    renderImageList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function loadWorks() {
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
        const works = data.works || [];
        worksTableBody.innerHTML = '';
        works.forEach((w) => {
          const tr = document.createElement('tr');
          tr.className = 'border-b border-gray-100 hover:bg-gray-50';
          tr.innerHTML =
            '<td class="px-4 py-3">' +
            w.id +
            '</td>' +
            '<td class="px-4 py-3 font-medium text-gray-800">' +
            escapeHtml(w.title) +
            '</td>' +
            '<td class="px-4 py-3">' +
            (w.images ? w.images.length : 0) +
            '</td>' +
            '<td class="px-4 py-3 space-x-2">' +
            '<button type="button" class="text-primary hover:text-primary-dark text-sm btn-edit" data-id="' +
            w.id +
            '">Redaktə</button>' +
            '<button type="button" class="text-red-600 hover:text-red-800 text-sm btn-del-work" data-id="' +
            w.id +
            '">Sil</button>' +
            '</td>';
          worksTableBody.appendChild(tr);
        });

        worksTableBody.querySelectorAll('.btn-edit').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = Number(btn.getAttribute('data-id'));
            const w = works.find((x) => Number(x.id) === id);
            if (w) startEdit(w);
          });
        });

        worksTableBody.querySelectorAll('.btn-del-work').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = Number(btn.getAttribute('data-id'));
            if (!confirm('Bu işi silmək istədiyinizə əminsiniz?')) return;
            runWithButtonBusy(btn, 'Silinir…', () =>
              fetch('/api/admin/works/' + id, { method: 'DELETE', ...credentials })
                .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
                .then(({ ok, d }) => {
                  if (!ok) {
                    showErr((d && d.error) || 'Silinmədi');
                    return;
                  }
                  showOk('İş silindi');
                  if (Number(workEditId.value) === id) resetWorkForm();
                  return loadWorks();
                })
                .catch(() => showErr('Şəbəkə xətası'))
            );
          });
        });
      });
  }

  requireAdmin(document.getElementById('admin-user')).then((ok) => {
    if (!ok) return;
    bindLogout(document.getElementById('btn-logout'));
    imagePaths = [];
    renderImageList();
    loadWorks();
  });

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
          (d.paths || []).forEach((p) => imagePaths.push(p));
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
    const title = workTitle.value.trim();
    const description = workDesc.value.trim();
    if (!imagePaths.length) {
      showErr('Ən azı bir şəkil yolu olmalıdır (fayl yükləyin).');
      return;
    }
    const editId = workEditId.value.trim();
    const payload = { title, description, images: imagePaths };

    const url = editId ? '/api/admin/works/' + encodeURIComponent(editId) : '/api/admin/works';
    const method = editId ? 'PUT' : 'POST';
    const submitBtn = workForm.querySelector('button[type="submit"]');

    runWithButtonBusy(submitBtn, 'Saxlanır…', () =>
      fetch(url, {
        method,
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
          resetWorkForm();
          return loadWorks();
        })
        .catch(() => showErr('Şəbəkə xətası'))
    );
  });

  btnWorkCancel.addEventListener('click', resetWorkForm);
})();
