(function () {
  const credentials = { credentials: 'include' };

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
  const adminsList = document.getElementById('admins-list');
  const errGlobal = document.getElementById('panel-global-error');
  const okGlobal = document.getElementById('panel-global-ok');
  const adminUserEl = document.getElementById('admin-user');

  let imagePaths = [];

  function showErr(msg) {
    errGlobal.textContent = msg;
    errGlobal.classList.remove('hidden');
    okGlobal.classList.add('hidden');
  }

  function showOk(msg) {
    okGlobal.textContent = msg;
    okGlobal.classList.remove('hidden');
    errGlobal.classList.add('hidden');
    setTimeout(() => okGlobal.classList.add('hidden'), 4000);
  }

  function hideGlobals() {
    errGlobal.classList.add('hidden');
    okGlobal.classList.add('hidden');
  }

  function renderImageList() {
    workImagesList.innerHTML = '';
    if (!imagePaths.length) {
      workImagesList.innerHTML = '<li class="text-gray-400">Hələ şəkil yoxdur — fayl seçib yükləyin.</li>';
      return;
    }
    imagePaths.forEach((p, i) => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between gap-2 py-1 border-b border-gray-100 last:border-0';
      li.innerHTML =
        '<span class="truncate font-mono text-xs">' +
        escapeHtml(p) +
        '</span><button type="button" data-i="' +
        i +
        '" class="text-red-600 hover:text-red-800 shrink-0 text-sm remove-img">Sil</button>';
      workImagesList.appendChild(li);
    });
    workImagesList.querySelectorAll('.remove-img').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-i'));
        imagePaths.splice(i, 1);
        renderImageList();
      });
    });
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
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

  function loadTable() {
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
            fetch('/api/admin/works/' + id, { method: 'DELETE', ...credentials })
              .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
              .then(({ ok, d }) => {
                if (!ok) {
                  showErr((d && d.error) || 'Silinmədi');
                  return;
                }
                showOk('İş silindi');
                if (Number(workEditId.value) === id) resetWorkForm();
                loadTable();
              })
              .catch(() => showErr('Şəbəkə xətası'));
          });
        });

        const admins = data.admins || [];
        adminsList.innerHTML = '';
        admins.forEach((a) => {
          const li = document.createElement('li');
          li.className = 'px-4 py-3 flex justify-between items-center';
          li.innerHTML =
            '<span class="font-medium text-gray-800">' +
            escapeHtml(a.username) +
            '</span>' +
            '<button type="button" class="text-sm text-red-600 hover:text-red-800 btn-del-admin" data-user="' +
            encodeURIComponent(a.username) +
            '">Sil</button>';
          adminsList.appendChild(li);
        });

        adminsList.querySelectorAll('.btn-del-admin').forEach((btn) => {
          btn.addEventListener('click', () => {
            const enc = btn.getAttribute('data-user');
            const username = decodeURIComponent(enc);
            if (!confirm('Admin ' + username + ' silinsin?')) return;
            fetch('/api/admin/admins/' + enc, { method: 'DELETE', ...credentials })
              .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
              .then(({ ok, d }) => {
                if (!ok) {
                  showErr((d && d.error) || 'Silinmədi');
                  return;
                }
                showOk('Admin silindi');
                loadTable();
              })
              .catch(() => showErr('Şəbəkə xətası'));
          });
        });
      });
  }

  fetch('/api/admin/me', credentials)
    .then((r) => r.json())
    .then((data) => {
      if (!data.loggedIn) {
        window.location.href = 'login.html';
        return;
      }
      adminUserEl.textContent = data.username || '';
      imagePaths = [];
      renderImageList();
      return loadTable();
    })
    .catch(() => {
      window.location.href = 'login.html';
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
      .catch(() => showErr('Yükləmə xətası'));
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
        showOk(editId ? 'İş yeniləndi' : 'İş əlavə edildi');
        resetWorkForm();
        loadTable();
      })
      .catch(() => showErr('Şəbəkə xətası'));
  });

  btnWorkCancel.addEventListener('click', resetWorkForm);

  document.getElementById('admin-add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('new-admin-user').value.trim();
    const password = document.getElementById('new-admin-pass').value;
    fetch('/api/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      ...credentials,
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) {
          showErr((d && d.error) || 'Əlavə olunmadı');
          return;
        }
        document.getElementById('new-admin-user').value = '';
        document.getElementById('new-admin-pass').value = '';
        showOk('Admin əlavə edildi');
        loadTable();
      })
      .catch(() => showErr('Şəbəkə xətası'));
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    fetch('/api/logout', { method: 'POST', ...credentials })
      .finally(() => {
        window.location.href = 'login.html';
      });
  });
})();
