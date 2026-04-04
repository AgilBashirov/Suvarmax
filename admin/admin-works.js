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

  const btnNewWork = document.getElementById('btn-new-work');
  const worksLoading = document.getElementById('works-loading');
  const worksEmpty = document.getElementById('works-empty');
  const worksTableWrap = document.getElementById('works-table-wrap');
  const worksTableBody = document.getElementById('works-table-body');

  function showErr(msg) {
    showAdminToast(msg, 'error');
  }

  function showOk(msg) {
    showAdminToast(msg, 'success');
  }

  function hideGlobals() {
    dismissAdminToasts();
  }

  function setWorksLoading(on) {
    if (!worksLoading) return;
    worksLoading.classList.toggle('hidden', !on);
  }

  function showWorksListState(works) {
    if (!worksEmpty || !worksTableWrap) return;
    const empty = !works || works.length === 0;
    worksEmpty.classList.toggle('hidden', !empty);
    worksTableWrap.classList.toggle('hidden', empty);
  }

  function loadWorks() {
    setWorksLoading(true);
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
        setWorksLoading(false);
        const works = data.works || [];
        showWorksListState(works);
        worksTableBody.innerHTML = '';
        works.forEach((w) => {
          const firstImg = w.images && w.images.length ? w.images[0] : '';
          const thumbSrc = S.workImageSrc(firstImg);
          const tr = document.createElement('tr');
          tr.className = 'border-b border-gray-100 hover:bg-gray-50';
          const thumbCell = thumbSrc
            ? '<img src="' +
              escapeHtml(thumbSrc) +
              '" alt="" class="w-12 h-12 object-cover rounded border border-gray-200" width="48" height="48" loading="lazy">'
            : '<div class="w-12 h-12 rounded border border-dashed border-gray-200 bg-gray-50" title="Şəkil yoxdur"></div>';
          tr.innerHTML =
            '<td class="px-3 py-2 align-middle">' +
            thumbCell +
            '</td>' +
            '<td class="px-4 py-3 align-middle">' +
            w.id +
            '</td>' +
            '<td class="px-4 py-3 font-medium text-gray-800 align-middle">' +
            escapeHtml(S.workDisplayTitle(w)) +
            '</td>' +
            '<td class="px-4 py-3 align-middle"><div class="flex flex-wrap gap-1">' +
            S.renderLocalePillsForRow(w) +
            '</div></td>' +
            '<td class="px-4 py-3 align-middle">' +
            (w.images ? w.images.length : 0) +
            '</td>' +
            '<td class="px-4 py-3 space-x-2 align-middle">' +
            '<a href="panel-works-edit.html?id=' +
            encodeURIComponent(String(w.id)) +
            '" class="text-primary hover:text-primary-dark text-sm">Redaktə</a>' +
            '<button type="button" class="text-red-600 hover:text-red-800 text-sm btn-del-work" data-id="' +
            w.id +
            '">Sil</button>' +
            '</td>';
          worksTableBody.appendChild(tr);
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
                  return loadWorks();
                })
                .catch(() => showErr('Şəbəkə xətası'))
            );
          });
        });
      })
      .catch(() => {
        setWorksLoading(false);
        showErr('Məlumat yüklənmədi');
      });
  }

  requireAdmin(document.getElementById('admin-user')).then((ok) => {
    if (!ok) return;
    bindLogout(document.getElementById('btn-logout'));
    loadWorks();
  });

  if (btnNewWork) {
    btnNewWork.addEventListener('click', () => {
      window.location.href = 'panel-works-edit.html';
    });
  }
})();
