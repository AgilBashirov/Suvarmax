(function () {
  const grid = document.getElementById('works-grid');
  const loading = document.getElementById('works-loading');
  const errEl = document.getElementById('works-error');
  const empty = document.getElementById('works-empty');

  function showError(msg) {
    loading.classList.add('hidden');
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
  }

  fetch('/api/works')
    .then((r) => {
      if (!r.ok) throw new Error('Serverə qoşulmaq mümkün olmadı. npm start ilə serveri işə salın.');
      return r.json();
    })
    .then((data) => {
      const works = data.works || [];
      loading.classList.add('hidden');
      if (!works.length) {
        empty.classList.remove('hidden');
        return;
      }
      grid.classList.remove('hidden');
      works.forEach((w) => {
        const imgPath = (w.images && w.images[0]) || 'assets/images/logo.svg';
        const card = document.createElement('a');
        card.href = 'work-detail.html?id=' + encodeURIComponent(w.id);
        card.className =
          'work-card block bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition';
        card.innerHTML =
          '<div class="aspect-video bg-gray-100 overflow-hidden">' +
          '<img src="' +
          escapeAttr(imgPath) +
          '" alt="" class="w-full h-full object-cover" loading="lazy">' +
          '</div>' +
          '<div class="p-5">' +
          '<h2 class="text-lg font-semibold text-gray-800">' +
          escapeHtml(w.title) +
          '</h2>' +
          '</div>';
        grid.appendChild(card);
      });
    })
    .catch(() => {
      showError('Məlumat yüklənmədi. Layihə qovluğunda npm install və npm start əmrlərini işlədin.');
    });

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function escapeAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }
})();
