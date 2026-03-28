(function () {
  const {
    credentials,
    requireAdmin,
    bindLogout,
    runWithButtonBusy,
    showAdminToast,
    dismissAdminToasts,
  } = window.AdminCommon;

  const tokenInp = document.getElementById('adm-tg-token');
  const chatInp = document.getElementById('adm-tg-chat-id');
  const toggleBtn = document.getElementById('adm-tg-toggle-token');

  let siteFull = null;
  let tokenMasked = true;

  function showErr(msg) {
    showAdminToast(msg, 'error');
  }

  function showOk(msg) {
    showAdminToast(msg, 'success');
  }

  function applyTokenVisibility() {
    tokenInp.type = tokenMasked ? 'password' : 'text';
    toggleBtn.textContent = tokenMasked ? 'Göstər' : 'Gizlət';
  }

  toggleBtn.addEventListener('click', () => {
    tokenMasked = !tokenMasked;
    applyTokenVisibility();
  });

  applyTokenVisibility();

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
        tokenInp.value = siteFull.telegramBotToken || '';
        chatInp.value = siteFull.telegramChatId || '';
        tokenMasked = true;
        applyTokenVisibility();
      })
      .catch(() => {
        showErr('Məlumat yüklənmədi.');
      });
  }

  requireAdmin(document.getElementById('admin-user')).then((ok) => {
    if (!ok) return;
    bindLogout(document.getElementById('btn-logout'));
    loadSite();
  });

  document.getElementById('admin-save-telegram').addEventListener('click', () => {
    if (!siteFull) return;
    dismissAdminToasts();
    const site = {
      ...siteFull,
      telegramBotToken: tokenInp.value,
      telegramChatId: chatInp.value.trim(),
    };
    const saveBtn = document.getElementById('admin-save-telegram');
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
          tokenInp.value = siteFull.telegramBotToken || '';
          chatInp.value = siteFull.telegramChatId || '';
          tokenMasked = true;
          applyTokenVisibility();
        })
        .catch(() => showErr('Şəbəkə xətası'))
    );
  });
})();
