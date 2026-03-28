(function () {
  const {
    credentials,
    requireAdmin,
    bindLogout,
    runWithButtonBusy,
    showAdminToast,
    dismissAdminToasts,
  } = window.AdminCommon;

  const adminsList = document.getElementById('admins-list');

  function showErr(msg) {
    showAdminToast(msg, 'error');
  }

  function showOk(msg) {
    showAdminToast(msg, 'success');
  }

  function hideGlobals() {
    dismissAdminToasts();
  }

  function loadAdmins() {
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
        const admins = data.admins || [];
        adminsList.innerHTML = '';
        admins.forEach((a) => {
          const enc = encodeURIComponent(a.username);
          const li = document.createElement('li');
          li.className =
            'px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 last:border-0';

          const nameSpan = document.createElement('span');
          nameSpan.className = 'font-medium text-gray-800 shrink-0';
          nameSpan.textContent = a.username;

          const row = document.createElement('div');
          row.className = 'flex flex-wrap items-center gap-2';

          const passInput = document.createElement('input');
          passInput.type = 'password';
          passInput.className =
            'text-sm border border-gray-300 rounded-lg px-3 py-2 w-full sm:w-44 focus:ring-2 focus:ring-primary focus:border-primary outline-none';
          passInput.placeholder = 'Yeni şifrə';
          passInput.autocomplete = 'new-password';
          passInput.setAttribute('aria-label', 'Yeni şifrə — ' + a.username);

          const btnPass = document.createElement('button');
          btnPass.type = 'button';
          btnPass.className =
            'text-sm bg-primary text-white px-3 py-2 rounded-lg hover:bg-primary-dark whitespace-nowrap';
          btnPass.textContent = 'Şifrəni yenilə';
          btnPass.addEventListener('click', () => {
            const pw = passInput.value.trim();
            if (!pw) {
              showErr('Yeni şifrə daxil edin.');
              return;
            }
            runWithButtonBusy(btnPass, 'Yenilənir…', () =>
              fetch('/api/admin/admins/' + enc, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pw }),
                ...credentials,
              })
                .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
                .then(({ ok, d }) => {
                  if (!ok) {
                    showErr((d && d.error) || 'Yenilənmədi');
                    return;
                  }
                  passInput.value = '';
                  showOk('Dəyişiklik saxlanıldı.');
                  loadAdmins();
                })
                .catch(() => showErr('Şəbəkə xətası'))
            );
          });

          const btnDel = document.createElement('button');
          btnDel.type = 'button';
          btnDel.className = 'text-sm text-red-600 hover:text-red-800 whitespace-nowrap';
          btnDel.textContent = 'Sil';
          btnDel.addEventListener('click', () => {
            if (!confirm('Admin ' + a.username + ' silinsin?')) return;
            runWithButtonBusy(btnDel, 'Silinir…', () =>
              fetch('/api/admin/admins/' + enc, { method: 'DELETE', ...credentials })
                .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
                .then(({ ok, d }) => {
                  if (!ok) {
                    showErr((d && d.error) || 'Silinmədi');
                    return;
                  }
                  showOk('İstifadəçi silindi.');
                  loadAdmins();
                })
                .catch(() => showErr('Şəbəkə xətası'))
            );
          });

          row.appendChild(passInput);
          row.appendChild(btnPass);
          row.appendChild(btnDel);
          li.appendChild(nameSpan);
          li.appendChild(row);
          adminsList.appendChild(li);
        });
      });
  }

  requireAdmin(document.getElementById('admin-user')).then((ok) => {
    if (!ok) return;
    bindLogout(document.getElementById('btn-logout'));
    loadAdmins();
  });

  document.getElementById('admin-add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const username = document.getElementById('new-admin-user').value.trim();
    const password = document.getElementById('new-admin-pass').value;
    const submitBtn = this.querySelector('button[type="submit"]');
    runWithButtonBusy(submitBtn, 'Əlavə edilir…', () =>
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
          showOk('Dəyişiklik saxlanıldı.');
          loadAdmins();
        })
        .catch(() => showErr('Şəbəkə xətası'))
    );
  });
})();
