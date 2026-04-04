(function () {
  function detailLang() {
    return window.SuvarmaxLang && window.SuvarmaxLang.getLang ? window.SuvarmaxLang.getLang() : 'az';
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const loading = document.getElementById('detail-loading');
  const errEl = document.getElementById('detail-error');
  const content = document.getElementById('detail-content');
  const titleEl = document.getElementById('detail-title');
  const descEl = document.getElementById('detail-description');
  const singleWrap = document.getElementById('detail-single-image');
  const sliderEl = document.getElementById('detail-slider');
  const track = document.getElementById('work-slider-track');
  const dotsWrap = document.getElementById('slider-dots');
  const btnPrev = document.getElementById('slider-prev');
  const btnNext = document.getElementById('slider-next');

  function showError(msg) {
    loading.classList.add('hidden');
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
  }

  if (!id) {
    showError('İş tapılmadı (id yoxdur).');
    return;
  }

  fetch('/api/works/' + encodeURIComponent(id) + '?lang=' + encodeURIComponent(detailLang()), {
    cache: 'no-store',
  })
    .then((r) => {
      if (r.status === 404) throw new Error('Bu iş mövcud deyil.');
      if (!r.ok) throw new Error('Serverə qoşulmaq mümkün olmadı.');
      return r.json();
    })
    .then((data) => {
      const work = data.work;
      if (!work) throw new Error('Məlumat yoxdur.');

      loading.classList.add('hidden');
      content.classList.remove('hidden');
      const wd = (window.__SUMAX_HOME_LAST && window.__SUMAX_HOME_LAST.workDetailPage) || {};
      const suf = wd.documentTitleSuffix != null ? String(wd.documentTitleSuffix) : ' — Suvarmax';
      document.title = work.title + suf;

      const backToWorks = document.querySelector('a[href="works.html"]');
      if (backToWorks && window.SuvarmaxLang && window.SuvarmaxLang.withLang) {
        backToWorks.setAttribute('href', window.SuvarmaxLang.withLang('works.html'));
      }

      titleEl.textContent = work.title;
      descEl.textContent = work.description || '';

      const images = Array.isArray(work.images) ? work.images.filter(Boolean) : [];
      if (!images.length) {
        images.push('assets/images/logo.svg');
      }

      if (images.length === 1) {
        singleWrap.classList.remove('hidden');
        singleWrap.innerHTML =
          '<img src="' +
          escapeAttr(images[0]) +
          '" alt="" class="w-full h-auto object-contain max-h-[70vh] mx-auto" loading="eager">';
      } else {
        sliderEl.classList.remove('hidden');
        track.innerHTML = '';
        const total = images.length;
        track.style.width = total * 100 + '%';
        track.style.display = 'flex';

        images.forEach((src, i) => {
          const slide = document.createElement('div');
          slide.className = 'work-slider-slide h-full flex items-center justify-center bg-gray-100';
          slide.style.flex = '0 0 ' + 100 / total + '%';
          slide.style.width = 100 / total + '%';
          slide.innerHTML =
            '<img src="' +
            escapeAttr(src) +
            '" alt="" class="max-w-full max-h-full object-contain loaded" loading="' +
            (i === 0 ? 'eager' : 'lazy') +
            '">';
          track.appendChild(slide);
        });

        let index = 0;

        function go(i) {
          index = ((i % total) + total) % total;
          track.style.transform = 'translateX(-' + (index * 100) / total + '%)';
          updateDots();
        }

        function updateDots() {
          dotsWrap.innerHTML = '';
          for (let i = 0; i < total; i++) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className =
              'w-2.5 h-2.5 rounded-full transition ' +
              (i === index ? 'bg-primary scale-110' : 'bg-gray-300 hover:bg-gray-400');
            b.setAttribute('aria-label', 'Şəkil ' + (i + 1));
            b.addEventListener('click', () => go(i));
            dotsWrap.appendChild(b);
          }
        }

        btnPrev.addEventListener('click', () => go(index - 1));
        btnNext.addEventListener('click', () => go(index + 1));
        updateDots();

        document.addEventListener('keydown', function (e) {
          if (!sliderEl.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') go(index - 1);
            if (e.key === 'ArrowRight') go(index + 1);
          }
        });
      }
    })
    .catch((e) => {
      showError(e.message || 'Xəta baş verdi.');
    });

  function escapeAttr(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  window.addEventListener('suvarmax:lang-changed', function () {
    window.location.reload();
  });
})();
