(function () {
  const credentials = { credentials: 'include' };

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function bindLogout(btn) {
    if (!btn) return;
    btn.addEventListener('click', () => {
      fetch('/api/logout', { method: 'POST', ...credentials }).finally(() => {
        window.location.href = 'login.html';
      });
    });
  }

  function requireAdmin(userEl) {
    return fetch('/api/admin/me', credentials)
      .then((r) => r.json())
      .then((data) => {
        if (!data.loggedIn) {
          window.location.href = 'login.html';
          return false;
        }
        if (userEl) userEl.textContent = data.username || '';
        return true;
      })
      .catch(() => {
        window.location.href = 'login.html';
        return false;
      });
  }

  /**
   * Saxlama / sorğu gedərkən düyməni kilidləyir və mətni dəyişir (proses görünür).
   * fn() Promise qaytarmalıdır.
   */
  function runWithButtonBusy(btn, busyText, fn) {
    const run = () => Promise.resolve().then(fn);
    if (!btn || typeof btn.textContent !== 'string') {
      return run();
    }
    const prevText = btn.textContent;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('opacity-80', 'cursor-wait');
    btn.textContent = busyText || 'Gözləyin…';
    return run().finally(() => {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.classList.remove('opacity-80', 'cursor-wait');
      btn.textContent = prevText;
    });
  }

  let toastHost = null;
  let toastSeq = 0;

  function ensureToastHost() {
    if (toastHost && document.body.contains(toastHost)) return toastHost;
    toastHost = document.createElement('div');
    toastHost.id = 'admin-toast-host';
    toastHost.setAttribute('aria-live', 'polite');
    toastHost.setAttribute('aria-relevant', 'additions text');
    toastHost.className =
      'fixed bottom-4 right-4 z-[200] flex flex-col gap-2 items-end pointer-events-none max-w-[min(calc(100vw-2rem),22rem)]';
    document.body.appendChild(toastHost);
    return toastHost;
  }

  function removeToastEl(el) {
    if (!el || !el.parentNode) return;
    el.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => el.remove(), 280);
  }

  /**
   * @param {string} message
   * @param {'success'|'error'} variant
   */
  function showAdminToast(message, variant) {
    const host = ensureToastHost();
    const text = message == null || message === '' ? 'Xəta baş verdi.' : String(message);
    const el = document.createElement('div');
    el.className =
      'pointer-events-auto cursor-pointer rounded-xl shadow-lg border px-4 py-3 text-sm text-gray-800 bg-white transform transition-all duration-300 ease-out opacity-0 translate-y-2';
    if (variant === 'error') {
      el.classList.add('border-red-200', 'border-l-4', 'border-l-red-500');
      el.setAttribute('role', 'alert');
    } else {
      el.classList.add('border-green-100', 'border-l-4', 'border-l-primary');
      el.setAttribute('role', 'status');
    }
    el.textContent = text;
    el.title = 'Bağlamaq üçün klikləyin';
    host.appendChild(el);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.remove('opacity-0', 'translate-y-2');
      });
    });
    const ttl = variant === 'error' ? 9000 : 5500;
    let t = setTimeout(() => removeToastEl(el), ttl);
    el.addEventListener('click', () => {
      clearTimeout(t);
      removeToastEl(el);
    });
  }

  function dismissAdminToasts() {
    if (!toastHost) return;
    Array.from(toastHost.children).forEach((el) => removeToastEl(el));
  }

  window.AdminCommon = {
    credentials,
    escapeHtml,
    bindLogout,
    requireAdmin,
    runWithButtonBusy,
    showAdminToast,
    dismissAdminToasts,
  };
})();
