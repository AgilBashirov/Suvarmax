(function () {
  function workLang() {
    return window.SuvarmaxLang && window.SuvarmaxLang.getLang ? window.SuvarmaxLang.getLang() : 'az';
  }

  const grid = document.getElementById('works-grid');
  const loading = document.getElementById('works-loading');
  const errEl = document.getElementById('works-error');
  const empty = document.getElementById('works-empty');
  const pagNav = document.getElementById('works-pagination');

  const PAGE_SIZE = 9;

  /** API gecikəndə düymə mətnləri URL dilinə uyğun qalsın (static-home ilə eyni məzmun) */
  const PAGINATION_FALLBACK = {
    az: { prev: '← Əvvəlki', next: 'Növbəti →' },
    ru: { prev: '← Назад', next: 'Далее →' },
    en: { prev: '← Previous', next: 'Next →' },
  };

  function paginationButtonLabels() {
    var cur =
      window.SuvarmaxLang && window.SuvarmaxLang.getLang ? window.SuvarmaxLang.getLang() : 'az';
    var homeLang = window.__SUMAX_HOME_CONTENT_LANG;
    var wp = window.__SUMAX_HOME_LAST && window.__SUMAX_HOME_LAST.worksPage;
    if (
      wp &&
      homeLang === cur &&
      wp.paginationPrev != null &&
      wp.paginationNext != null
    ) {
      return { prev: String(wp.paginationPrev), next: String(wp.paginationNext) };
    }
    var fb = PAGINATION_FALLBACK[cur] || PAGINATION_FALLBACK.az;
    return { prev: fb.prev, next: fb.next };
  }

  /** Son uğurlu cavabın səhifələmə meta-sı — worksPage etiketləri gec gələndə yenidən çəkmək üçün */
  let lastPaginationMeta = null;

  function showError(msg) {
    loading.classList.add('hidden');
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
    empty.classList.add('hidden');
    grid.classList.add('hidden');
    pagNav.classList.add('hidden');
  }

  function getPageFromUrl() {
    const p = new URLSearchParams(window.location.search).get('page');
    const n = parseInt(p, 10);
    return n >= 1 ? n : 1;
  }

  function setUrlPage(page) {
    const url = new URL(window.location.href);
    if (page <= 1) {
      url.searchParams.delete('page');
    } else {
      url.searchParams.set('page', String(page));
    }
    window.history.pushState({ page }, '', url.pathname + url.search);
  }

  function renderCards(works, listLang) {
    var hrefLang = listLang || workLang();
    grid.innerHTML = '';
    works.forEach((w) => {
      const imgPath = (w.images && w.images[0]) || 'assets/images/logo.svg';
      const card = document.createElement('a');
      card.href =
        'work-detail.html?id=' +
        encodeURIComponent(w.id) +
        '&lang=' +
        encodeURIComponent(hrefLang);
      card.className =
        'work-card block bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition';
      const wrap = document.createElement('div');
      wrap.className = 'aspect-video bg-gray-100 overflow-hidden';
      const img = document.createElement('img');
      img.src = imgPath;
      img.alt = '';
      img.className = 'w-full h-full object-cover loaded';
      img.loading = 'lazy';
      img.onerror = function () {
        this.onerror = null;
        this.src = 'assets/images/logo.svg';
      };
      wrap.appendChild(img);
      const body = document.createElement('div');
      body.className = 'p-5';
      const h2 = document.createElement('h2');
      h2.className = 'text-lg font-semibold text-gray-800';
      h2.textContent = w.title || '';
      body.appendChild(h2);
      card.appendChild(wrap);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  function renderPagination(meta) {
    const { page, total, totalPages } = meta;
    pagNav.innerHTML = '';

    if (total === 0) {
      pagNav.classList.add('hidden');
      return;
    }

    if (totalPages <= 1) {
      pagNav.classList.add('hidden');
      return;
    }

    pagNav.classList.remove('hidden');

    const wrap = document.createElement('div');
    wrap.className =
      'flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6';

    const btnClass =
      'px-4 py-2 rounded-lg text-sm font-medium border transition disabled:opacity-40 disabled:cursor-not-allowed ';
    const btnActive = 'border-primary bg-primary text-white hover:bg-primary-dark';
    const btnIdle = 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50';

    var btnLab = paginationButtonLabels();
    const prevText = btnLab.prev;
    const nextText = btnLab.next;

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = btnClass + btnIdle;
    prev.textContent = prevText;
    prev.disabled = page <= 1;
    prev.addEventListener('click', () => {
      if (page > 1) {
        loadWorks(page - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    const nums = document.createElement('div');
    nums.className = 'flex flex-wrap items-center justify-center gap-1';
    const maxButtons = 7;
    let startP = Math.max(1, page - 3);
    let endP = Math.min(totalPages, startP + maxButtons - 1);
    if (endP - startP < maxButtons - 1) {
      startP = Math.max(1, endP - maxButtons + 1);
    }

    for (let p = startP; p <= endP; p++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className =
        'min-w-[2.25rem] px-2 py-2 rounded-lg text-sm font-medium border transition ' +
        (p === page ? btnActive : btnIdle + ' border-gray-200');
      b.textContent = String(p);
      b.setAttribute('aria-current', p === page ? 'page' : 'false');
      b.addEventListener('click', () => {
        if (p !== page) {
          loadWorks(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      nums.appendChild(b);
    }

    const next = document.createElement('button');
    next.type = 'button';
    next.className = btnClass + btnIdle;
    next.textContent = nextText;
    next.disabled = page >= totalPages;
    next.addEventListener('click', () => {
      if (page < totalPages) {
        loadWorks(page + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    wrap.appendChild(prev);
    wrap.appendChild(nums);
    wrap.appendChild(next);
    pagNav.appendChild(wrap);
  }

  function normalizeLangArg(x) {
    if (!x) return null;
    var s = String(x)
      .toLowerCase()
      .trim();
    return s === 'az' || s === 'ru' || s === 'en' ? s : null;
  }

  function loadWorks(page, langOverride) {
    loading.classList.remove('hidden');
    errEl.classList.add('hidden');
    empty.classList.add('hidden');
    grid.classList.add('hidden');
    pagNav.classList.add('hidden');

    var lang = normalizeLangArg(langOverride) || workLang();

    const url =
      '/api/works?page=' +
      encodeURIComponent(page) +
      '&limit=' +
      PAGE_SIZE +
      '&lang=' +
      encodeURIComponent(lang);
    fetch(url, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('Serverə qoşulmaq mümkün olmadı. npm start ilə serveri işə salın.');
        return r.json();
      })
      .then((data) => {
        const works = data.works || [];
        const pagination = data.pagination || {
          page: 1,
          limit: PAGE_SIZE,
          total: works.length,
          totalPages: 1,
        };

        loading.classList.add('hidden');
        setUrlPage(pagination.page);

        if (pagination.total === 0) {
          lastPaginationMeta = null;
          empty.classList.remove('hidden');
          return;
        }

        lastPaginationMeta = pagination;
        grid.classList.remove('hidden');
        renderCards(works, lang);
        renderPagination(pagination);
      })
      .catch(() => {
        showError('Məlumat yüklənmədi. Layihə qovluğunda npm install və npm start əmrlərini işlədin.');
      });
  }

  window.addEventListener('popstate', () => {
    loadWorks(getPageFromUrl());
  });

  window.__SUMAX_WORKS_RERENDER_PAGINATION = function () {
    if (lastPaginationMeta) renderPagination(lastPaginationMeta);
  };

  loadWorks(getPageFromUrl());

  window.addEventListener('suvarmax:lang-changed', function (ev) {
    var d = ev.detail && ev.detail.lang;
    loadWorks(getPageFromUrl(), d);
  });
})();
