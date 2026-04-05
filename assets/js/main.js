/**
 * Suvarmax Main JavaScript
 * Mobil menyu, lightbox və form funksionallığı
 */

var SUMAX_CF = {
    errName: 'Ad Soyad xanası mütləq doldurulmalıdır',
    errPhone: 'Telefon xanası mütləq doldurulmalıdır',
    errFileProtocol:
        'Səhifəni fayl kimi (file://) açmısınız — /api/contact işləmir. Terminalda npm start edin və brauzerdə http://localhost:3000 (və ya göstərilən port) ünvanından açın.',
    okSent: 'Mesajınız uğurla göndərildi! Tezliklə sizinlə əlaqə saxlayacağıq.',
    errSubmit: 'Xəta baş verdi. Birbaşa telefon və ya email ilə əlaqə saxlayın.',
    errNetwork: 'Bağlantı xətası. İnternet bağlantınızı yoxlayın və yenidən cəhd edin.',
    sending: 'Göndərilir...',
};

document.addEventListener('suvarmax:home-i18n', function (ev) {
    var cf = ev.detail && ev.detail.home && ev.detail.home.contactForm;
    if (cf && typeof cf === 'object') {
        for (var k in cf) {
            if (Object.prototype.hasOwnProperty.call(cf, k)) SUMAX_CF[k] = cf[k];
        }
    }
});

// DOM yükləndikdən sonra
document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initNavActiveHighlight();
    initLightbox();
    initContactForm();
    initLazyLoading();
    initCurrentYear();
});

/**
 * Footer-də cari ili göstərmə
 */
function initCurrentYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

/** Mobil menyuda əlavə olunub-silinən siniflər (yalnız md-dən kiçik ekranlar) */
var SUMAX_MOBILE_MENU_PANEL_CLASSES = [
    'flex',
    'flex-col',
    'absolute',
    'top-full',
    'left-0',
    'right-0',
    'w-full',
    'bg-white',
    'shadow-lg',
    'p-4',
    'space-y-1',
    'z-40',
    'border-b',
    'border-gray-100',
    'max-h-[min(72vh,calc(100dvh-4.5rem))]',
    'overflow-y-auto',
    'overscroll-y-contain',
    'pb-[max(1rem,env(safe-area-inset-bottom))]',
];

function closeMobileMenu(btn, menu) {
    var b = btn || document.getElementById('mobile-menu-btn');
    var m = menu || document.getElementById('mobile-menu');
    if (!m) return;
    m.classList.add('hidden');
    for (var i = 0; i < SUMAX_MOBILE_MENU_PANEL_CLASSES.length; i++) {
        m.classList.remove(SUMAX_MOBILE_MENU_PANEL_CLASSES[i]);
    }
    if (b) b.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
}

function openMobileMenu(btn, menu) {
    var b = btn || document.getElementById('mobile-menu-btn');
    var m = menu || document.getElementById('mobile-menu');
    if (!m || !b) return;
    m.classList.remove('hidden');
    for (var j = 0; j < SUMAX_MOBILE_MENU_PANEL_CLASSES.length; j++) {
        m.classList.add(SUMAX_MOBILE_MENU_PANEL_CLASSES[j]);
    }
    b.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}

/**
 * Üst menyu: cari bölməyə görə yalnız rəng (font qalınlığı dəyişmir).
 * Scroll-spy: yalnız geniş masaüstü (≥1280px); tablet/iPad Pro-da yalnız hash/klik.
 */
function initNavActiveHighlight() {
    var menu = document.getElementById('mobile-menu');
    if (!menu) return;

    var textLinks = menu.querySelectorAll('a.nav-top-link[data-nav]');
    var contactBtn = menu.querySelector('a.nav-contact-btn[data-nav="contact"]');
    if (!textLinks.length) return;

    function applyTextActive(el, on) {
        if (on) {
            el.classList.add('text-primary', 'hover:text-primary-dark');
            el.classList.remove('text-gray-700', 'hover:text-primary');
        } else {
            el.classList.remove('text-primary', 'hover:text-primary-dark');
            el.classList.add('text-gray-700', 'hover:text-primary');
        }
    }

    function setAriaCurrent(key) {
        textLinks.forEach(function (a) {
            a.removeAttribute('aria-current');
        });
        if (contactBtn) contactBtn.removeAttribute('aria-current');
        var cur = menu.querySelector('[data-nav="' + key + '"]');
        if (cur) cur.setAttribute('aria-current', 'page');
    }

    function highlight(key) {
        textLinks.forEach(function (a) {
            var nav = a.getAttribute('data-nav');
            if (!nav || nav === 'contact') return;
            applyTextActive(a, nav === key);
        });
        if (contactBtn) {
            if (key === 'contact') {
                contactBtn.classList.add('bg-primary-dark');
                contactBtn.classList.remove('bg-primary');
            } else {
                contactBtn.classList.add('bg-primary');
                contactBtn.classList.remove('bg-primary-dark');
            }
        }
        setAriaCurrent(key);
    }

    function navFile() {
        var p = (window.location.pathname || '').replace(/\\/g, '/');
        return p.split('/').pop() || '';
    }

    function hashSectionKey() {
        var h = (window.location.hash || '').replace(/^#/, '').trim();
        if (!h) return null;
        if (/^(home|about|services|partners|contact)$/.test(h)) return h;
        return null;
    }

    var file = navFile();
    var isIndex = !file || file === 'index.html';
    var isWorks = file === 'works.html';
    var isDetail = file === 'work-detail.html';

    if (isWorks || isDetail) {
        highlight('works');
        return;
    }

    if (!isIndex) {
        highlight('home');
        return;
    }

    var navBar = document.querySelector('body > nav') || document.querySelector('nav');
    if (!navBar) {
        highlight(hashSectionKey() || 'home');
        return;
    }

    /** Tailwind xl (1280px) — iPad Pro və planşetlərdə scroll ilə avtomatik dəyişmə olmasın */
    var NAV_SCROLL_SPY_MIN_PX = 1280;

    function isDesktopNavScrollSpy() {
        return (
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(min-width: ' + NAV_SCROLL_SPY_MIN_PX + 'px)').matches
        );
    }

    function highlightFromHashOrHome() {
        highlight(hashSectionKey() || 'home');
    }

    /** index.html section ardıcıllığı — yalnız masaüstü scroll-spy */
    var SECTION_IDS = ['home', 'services', 'about', 'partners', 'contact'];
    var THRESHOLDS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
    var NAV_CLICK_LOCK_MS = 550;

    var ratios = new Map();
    var io = null;
    var navigatingUntil = 0;
    var rafPick = null;
    var vpResizeRaf = null;

    function headerOffsetPx() {
        return Math.ceil(navBar.getBoundingClientRect().height) + 8;
    }

    function sectionFromHeaderLine() {
        var line = headerOffsetPx();
        var cur = 'home';
        for (var i = 0; i < SECTION_IDS.length; i++) {
            var el = document.getElementById(SECTION_IDS[i]);
            if (el && el.getBoundingClientRect().top <= line) {
                cur = SECTION_IDS[i];
            }
        }
        return cur;
    }

    function tickFromHashOrLine() {
        var hk = hashSectionKey();
        highlight(hk != null ? hk : sectionFromHeaderLine());
    }

    function syncNavScrollSpy() {
        if (!isDesktopNavScrollSpy()) {
            if (io) {
                io.disconnect();
                io = null;
            }
            ratios.clear();
            highlightFromHashOrHome();
            return;
        }
        remakeObserverAndPick();
    }

    function pickActiveFromRatios() {
        if (!isDesktopNavScrollSpy()) return;
        if (performance.now() < navigatingUntil) return;

        var anyPositive = false;
        for (var i = 0; i < SECTION_IDS.length; i++) {
            var r = ratios.get(SECTION_IDS[i]);
            if (r != null && r > 0) {
                anyPositive = true;
                break;
            }
        }

        if (!anyPositive) {
            highlight(sectionFromHeaderLine());
            return;
        }

        var best = 'home';
        var bestScore = -1;
        var bestIdx = -1;
        for (var j = 0; j < SECTION_IDS.length; j++) {
            var id = SECTION_IDS[j];
            var score = ratios.has(id) ? ratios.get(id) : 0;
            if (score > bestScore || (score === bestScore && score > 0 && j > bestIdx)) {
                bestScore = score;
                best = id;
                bestIdx = j;
            }
        }
        highlight(best);
    }

    function schedulePick() {
        if (rafPick != null) return;
        rafPick = requestAnimationFrame(function () {
            rafPick = null;
            pickActiveFromRatios();
        });
    }

    function onIo(entries) {
        if (!isDesktopNavScrollSpy()) return;
        for (var i = 0; i < entries.length; i++) {
            var en = entries[i];
            var id = en.target.id;
            if (SECTION_IDS.indexOf(id) === -1) continue;
            ratios.set(id, en.isIntersecting ? en.intersectionRatio : 0);
        }
        schedulePick();
    }

    function makeObserver() {
        if (io) {
            io.disconnect();
            io = null;
        }
        var top = headerOffsetPx();
        var margin = '-' + top + 'px 0px -45% 0px';
        try {
            io = new IntersectionObserver(onIo, {
                root: null,
                rootMargin: margin,
                threshold: THRESHOLDS,
            });
            for (var s = 0; s < SECTION_IDS.length; s++) {
                var el = document.getElementById(SECTION_IDS[s]);
                if (el) io.observe(el);
            }
        } catch (e) {
            io = null;
        }
    }

    function remakeObserverAndPick() {
        if (!isDesktopNavScrollSpy()) return;
        makeObserver();
        requestAnimationFrame(function () {
            if (performance.now() < navigatingUntil) return;
            pickActiveFromRatios();
        });
    }

    var mqlScrollSpy = window.matchMedia('(min-width: ' + NAV_SCROLL_SPY_MIN_PX + 'px)');
    function onScrollSpyBreakpointChange() {
        syncNavScrollSpy();
    }
    if (mqlScrollSpy.addEventListener) {
        mqlScrollSpy.addEventListener('change', onScrollSpyBreakpointChange);
    } else if (mqlScrollSpy.addListener) {
        mqlScrollSpy.addListener(onScrollSpyBreakpointChange);
    }

    navBar.addEventListener(
        'click',
        function (e) {
            var t = e.target && e.target.closest && e.target.closest('a[href^="#"]');
            if (!t || !navBar.contains(t)) return;
            var href = t.getAttribute('href') || '';
            if (href === '#' || href.length < 2) return;
            var key = href.replace(/^#/, '').trim();
            if (!/^(home|about|services|partners|contact)$/.test(key)) return;
            navigatingUntil = performance.now() + NAV_CLICK_LOCK_MS;
            highlight(key);
        },
        true
    );

    window.addEventListener('hashchange', function () {
        navigatingUntil = performance.now() + NAV_CLICK_LOCK_MS;
        window.setTimeout(function () {
            if (isDesktopNavScrollSpy()) {
                tickFromHashOrLine();
            } else {
                highlightFromHashOrHome();
            }
        }, 80);
    });

    window.addEventListener('load', function () {
        syncNavScrollSpy();
    });

    var ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () {
        if (isDesktopNavScrollSpy()) remakeObserverAndPick();
    }) : null;
    if (ro) ro.observe(navBar);

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function () {
            if (vpResizeRaf != null) return;
            vpResizeRaf = requestAnimationFrame(function () {
                vpResizeRaf = null;
                if (isDesktopNavScrollSpy()) remakeObserverAndPick();
            });
        });
    }

    syncNavScrollSpy();

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            if (isDesktopNavScrollSpy()) {
                tickFromHashOrLine();
                schedulePick();
            } else {
                highlightFromHashOrHome();
            }
        });
    });
}

/**
 * Mobil menyu funksionallığı
 */
function initMobileMenu() {
    var mobileMenuBtn = document.getElementById('mobile-menu-btn');
    var mobileMenu = document.getElementById('mobile-menu');
    if (!mobileMenuBtn || !mobileMenu) return;

    mobileMenuBtn.addEventListener('click', function () {
        if (mobileMenu.classList.contains('hidden')) {
            openMobileMenu(mobileMenuBtn, mobileMenu);
        } else {
            closeMobileMenu(mobileMenuBtn, mobileMenu);
        }
    });

    mobileMenu.addEventListener('click', function (e) {
        var a = e.target && e.target.closest && e.target.closest('a[href]');
        if (a && mobileMenu.contains(a)) {
            closeMobileMenu(mobileMenuBtn, mobileMenu);
        }
    });

    var mql = window.matchMedia('(min-width: 1024px)');
    function onViewportChange() {
        if (mql.matches) {
            closeMobileMenu(mobileMenuBtn, mobileMenu);
        }
    }
    if (mql.addEventListener) {
        mql.addEventListener('change', onViewportChange);
    } else if (mql.addListener) {
        mql.addListener(onViewportChange);
    }

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (mobileMenu.classList.contains('hidden')) return;
        closeMobileMenu(mobileMenuBtn, mobileMenu);
    });
}

/**
 * Lightbox funksionallığı (layihə qalereyası üçün)
 */
function initLightbox() {
    const projectItems = document.querySelectorAll('.project-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDescription = document.getElementById('lightbox-description');
    const lightboxClose = document.getElementById('lightbox-close');
    
    if (!lightbox) return;
    
    // Hər layihəyə klik eventi əlavə et
    projectItems.forEach(item => {
        item.addEventListener('click', function() {
            const image = this.dataset.image;
            const title = this.dataset.title;
            const description = this.dataset.description;
            
            if (lightboxImage) lightboxImage.src = image;
            if (lightboxImage) lightboxImage.alt = title;
            if (lightboxTitle) lightboxTitle.textContent = title;
            if (lightboxDescription) lightboxDescription.textContent = description;
            
            lightbox.classList.add('show');
            lightbox.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Scroll-u blokla
        });
    });
    
    // Lightbox bağlama
    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }
    
    // ESC düyməsi ilə bağlama
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lightbox && !lightbox.classList.contains('hidden')) {
            closeLightbox();
        }
    });
    
    // Lightbox arxafonuna klik edəndə bağlama
    if (lightbox) {
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }
    
    function closeLightbox() {
        if (lightbox) {
            lightbox.classList.remove('show');
            lightbox.classList.add('hidden');
            document.body.style.overflow = ''; // Scroll-u aktivləşdir
        }
    }
}

/**
 * Əlaqə formu — sorğu serverə göndərilir (/api/contact), Telegram token yalnız serverdə (admin panel).
 */
function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    
    if (!contactForm) return;
    
    // Xəta mesajlarını gizlətmə funksiyası
    function clearErrors() {
        const errorElements = contactForm.querySelectorAll('[id$="-error"]');
        errorElements.forEach(error => {
            error.textContent = '';
            error.style.display = 'none';
        });
    }
    
    // Xəta mesajı göstərmə funksiyası
    function showError(fieldId, message) {
        const errorElement = document.getElementById(fieldId + '-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            console.error('Error element tapılmadı:', fieldId + '-error');
        }
    }
    
    // Form validasiyası
    function validateForm() {
        let isValid = true;
        clearErrors();
        
        // Ad Soyad validasiyası
        const name = document.getElementById('name').value.trim();
        if (!name) {
            showError('name', SUMAX_CF.errName || 'Ad Soyad xanası mütləq doldurulmalıdır');
            isValid = false;
        }
        
        // Telefon validasiyası
        const phone = document.getElementById('phone').value.trim();
        if (!phone) {
            showError('phone', SUMAX_CF.errPhone || 'Telefon xanası mütləq doldurulmalıdır');
            isValid = false;
        }
        
        return isValid;
    }
    
    // Input sahələri üçün real-time xəta təmizləmə
    const requiredFields = ['name', 'phone'];
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', function() {
                if (this.value.trim()) {
                    const errorElement = document.getElementById(fieldId + '-error');
                    if (errorElement) {
                        errorElement.textContent = '';
                        errorElement.style.display = 'none';
                    }
                }
            });
        }
    });
    
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Form validasiyası
        if (!validateForm()) {
            return;
        }

        if (window.location.protocol === 'file:') {
            showNotification('❌ ' + (SUMAX_CF.errFileProtocol || 'file:// xətası'), 'error');
            return;
        }
        
        // Submit düyməsini deaktiv et
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = SUMAX_CF.sending || 'Göndərilir...';
        
        // Form məlumatlarını topla
        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            message: document.getElementById('message').value.trim()
        };
        
        fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(function (response) {
            return response.json().then(function (data) {
                return { ok: response.ok, status: response.status, data: data };
            });
        })
        .then(function (result) {
            if (result.ok && result.data && result.data.ok) {
                showNotification('✅ ' + (SUMAX_CF.okSent || 'Mesaj göndərildi.'), 'success');
                contactForm.reset();
                clearErrors();
            } else {
                var msg = (result.data && result.data.error) || SUMAX_CF.errSubmit || 'Xəta baş verdi.';
                console.error('Əlaqə formu:', result.status, result.data);
                showNotification('❌ ' + msg, 'error');
            }
        })
        .catch(function (error) {
            console.error('Network xətası:', error);
            showNotification('❌ ' + (SUMAX_CF.errNetwork || 'Bağlantı xətası'), 'error');
        })
        .finally(() => {
            // Submit düyməsini yenidən aktivləşdir
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    });
}

/**
 * Bildiriş göstərmə funksiyası
 */
function showNotification(message, type = 'success') {
    // Mövcud bildirişi sil
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Yeni bildiriş yarat
    const notification = document.createElement('div');
    notification.className = `notification fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-lg shadow-2xl max-w-md ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.textContent = message;
    
    // Animasiya əlavə et
    notification.style.opacity = '0';
    notification.style.transform = 'translate(-50%, -20px)';
    document.body.appendChild(notification);
    
    // Fade-in animasiyası
    setTimeout(() => {
        notification.style.transition = 'all 0.3s ease';
        notification.style.opacity = '1';
        notification.style.transform = 'translate(-50%, 0)';
    }, 10);
    
    // 5 saniyədən sonra sil
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

/**
 * Lazy loading funksionallığı
 * API-dən sonra əlavə olunan şəkillər (məs. İşlərimiz səhifəsi) üçün MutationObserver
 */
function initLazyLoading() {
    function markLoaded(img) {
        img.classList.add('loaded');
    }

    function observeLazyImg(img, imageObserver) {
        if (!img.matches || !img.matches('img[loading="lazy"]')) return;
        if (img.classList.contains('loaded')) return;
        if (imageObserver) {
            imageObserver.observe(img);
        } else {
            markLoaded(img);
        }
    }

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    markLoaded(img);
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '80px' });

        document.querySelectorAll('img[loading="lazy"]').forEach(img => observeLazyImg(img, imageObserver));

        const mo = new MutationObserver(mutations => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.matches && node.matches('img[loading="lazy"]')) {
                        observeLazyImg(node, imageObserver);
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll('img[loading="lazy"]').forEach(img => observeLazyImg(img, imageObserver));
                    }
                });
            });
        });
        mo.observe(document.body, { childList: true, subtree: true });
    } else {
        document.querySelectorAll('img[loading="lazy"]').forEach(markLoaded);
        const mo = new MutationObserver(() => {
            document.querySelectorAll('img[loading="lazy"]:not(.loaded)').forEach(markLoaded);
        });
        mo.observe(document.body, { childList: true, subtree: true });
    }
}

/**
 * Smooth scroll funksionallığı (anchor linklər üçün)
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href') || '';
        /** Dinamik href (məs. nav PDF /assets/...pdf) — yalnız # ilə başlayan anchor-ları idarə et */
        if (!href.startsWith('#')) return;
        if (href !== '#' && href.length > 1) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

/**
 * Partnyorlar slider — site-content.js məzmunu yüklədikdən sonra çağırılır
 */
window.initPartnersSwiper = function initPartnersSwiper() {
    const partnersEl = document.querySelector('.partners-swiper');
    const wrapper = document.getElementById('partners-swiper-wrapper');
    if (!partnersEl || !wrapper || !wrapper.children.length) return;

    if (window._partnersSwiperInstance) {
        window._partnersSwiperInstance.destroy(true, true);
        window._partnersSwiperInstance = null;
    }

    const slideCount = wrapper.children.length;
    const swiper = new Swiper('.partners-swiper', {
        slidesPerView: 1,
        spaceBetween: 24,
        loop: slideCount >= 6,
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
        speed: 800,
        navigation: {
            nextEl: '.partners-nav-next',
            prevEl: '.partners-nav-prev',
        },
        breakpoints: {
            640: {
                slidesPerView: 2,
                spaceBetween: 24,
            },
            740: {
                slidesPerView: 3,
                spaceBetween: 20,
            },
            1024: {
                slidesPerView: 4,
                spaceBetween: 24,
            },
        },
    });
    window._partnersSwiperInstance = swiper;
};

