/**
 * Ana səhifə: partnyorlar, əlaqə, footer sosial — /api/site
 * Qeyd: partnyorlar yalnız API-dan gəlir. Statik serverdə (Live Server və s.)
 * /api/site olmaz — o zaman aşağıdakı fallback işləyir. Tam idarə üçün: npm start
 */
(function () {
  /** Express işləmədikdə (404 / şəbəkə) göstəriləcək nümunə məzmun */
  var SITE_OFFLINE_FALLBACK = {
    partnersTitle: 'Partnyorlarımız',
    partnersSubtitle: 'Bizimlə əməkdaşlıq edən etibarlı partnyorlarımız',
    partners: [
      { id: 1, name: 'LandPro', url: 'https://landpro.az' },
      { id: 2, name: 'ParkLand', url: 'https://parkland.az' },
      { id: 3, name: 'Green Garden', url: 'https://greengarden.az' },
    ],
    contact: {
      phoneTel: '+994556485658',
      phoneLabel: '+994 55 648 56 58',
      email: 'info@suvarmax.az',
      address: 'Bakı, Azərbaycan',
    },
    social: [
      { id: 1, name: 'Facebook', url: 'https://www.facebook.com/', icon: 'assets/images/social/facebook.svg' },
      { id: 2, name: 'Instagram', url: 'https://www.instagram.com/suvarmax', icon: 'assets/images/social/instagram.svg' },
      { id: 3, name: 'LinkedIn', url: 'https://www.linkedin.com/', icon: 'assets/images/social/linkedin.svg' },
    ],
  };

  function applySite(site) {
    if (!site) return;

    const pt = document.getElementById('site-partners-title');
    const ps = document.getElementById('site-partners-subtitle');
    if (pt) pt.textContent = site.partnersTitle || '';
    if (ps) ps.textContent = site.partnersSubtitle || '';

    const c = site.contact || {};
    const tel = c.phoneTel || '';
    const telLabel = c.phoneLabel || tel;
    const mail = c.email || '';
    const addr = c.address || '';

    const phoneLink = document.getElementById('site-contact-phone-link');
    if (phoneLink) {
      phoneLink.href = tel ? 'tel:' + tel.replace(/\s/g, '') : '#';
      phoneLink.textContent = telLabel;
    }
    const emailLink = document.getElementById('site-contact-email-link');
    if (emailLink) {
      emailLink.href = mail ? 'mailto:' + mail : '#';
      emailLink.textContent = mail || '—';
    }
    const addrEl = document.getElementById('site-contact-address');
    if (addrEl) addrEl.textContent = addr;

    const fp = document.getElementById('site-footer-phone');
    const fe = document.getElementById('site-footer-email');
    const fa = document.getElementById('site-footer-address');
    if (fp) {
      fp.href = tel ? 'tel:' + tel.replace(/\s/g, '') : '#';
      fp.textContent = telLabel;
    }
    if (fe) {
      fe.href = mail ? 'mailto:' + mail : '#';
      fe.textContent = mail || '—';
    }
    if (fa) fa.textContent = addr;

    const wrap = document.getElementById('partners-swiper-wrapper');
    if (wrap) {
      wrap.innerHTML = '';
      const partners = site.partners || [];
      partners.forEach(function (p) {
        const name = p.name || '';
        const url = p.url && p.url !== '#' ? p.url : '#';
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        const card = document.createElement('div');
        card.className =
          'bg-primary rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group h-full partner-card';
        card.setAttribute('data-partner-name', name);
        const a = document.createElement('a');
        a.href = url;
        a.className =
          'block h-full min-h-[120px] px-6 py-8 flex items-center justify-center text-center relative';
        if (url !== '#') {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        const label = document.createElement('span');
        label.className =
          'partner-card-name text-white text-lg md:text-xl font-semibold leading-snug';
        label.textContent = name;
        a.appendChild(label);
        card.appendChild(a);
        slide.appendChild(card);
        wrap.appendChild(slide);
      });
    }

    const socialRoot = document.getElementById('site-footer-social');
    if (socialRoot) {
      socialRoot.innerHTML = '';
      (site.social || []).forEach(function (s) {
        const a = document.createElement('a');
        const href = s.url && s.url !== '#' ? s.url : '#';
        a.href = href;
        a.className = 'inline-flex items-center rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50';
        a.setAttribute('aria-label', s.name || 'Sosial');
        if (href !== '#') {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        const img = document.createElement('img');
        img.src = s.icon || '';
        img.alt = '';
        img.className = 'w-6 h-6 object-contain';
        a.appendChild(img);
        socialRoot.appendChild(a);
      });
    }

    if (typeof window.initPartnersSwiper === 'function') {
      window.initPartnersSwiper();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetch('/api/site')
      .then(function (r) {
        if (!r.ok) throw new Error('site');
        return r.json();
      })
      .then(function (data) {
        applySite(data.site);
      })
      .catch(function () {
        console.warn(
          '[Suvarmax] /api/site əlçatan deyil — partnyor/əlaqə üçün layihə qovluğunda "npm start" işə salın (Express). İndi müvəqqəti məzmun göstərilir.'
        );
        applySite(SITE_OFFLINE_FALLBACK);
      });
  });
})();
