(function () {
  fetch('/api/admin/me', { credentials: 'include' })
    .then((r) => r.json())
    .then((data) => {
      if (data.loggedIn) {
        window.location.href = 'panel.html';
      }
    })
    .catch(() => {});

  const form = document.getElementById('login-form');
  const errEl = document.getElementById('login-error');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errEl.classList.add('hidden');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (ok && d.ok) {
          window.location.href = 'panel.html';
          return;
        }
        errEl.textContent = (d && d.error) || 'Giriş alınmadı';
        errEl.classList.remove('hidden');
      })
      .catch(() => {
        errEl.textContent = 'Serverə qoşulmaq mümkün olmadı (npm start).';
        errEl.classList.remove('hidden');
      });
  });
})();
