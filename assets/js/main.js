/**
 * Suvarmax Main JavaScript
 * Mobil menyu, lightbox və form funksionallığı
 */

// DOM yükləndikdən sonra
document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
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

/**
 * Mobil menyu funksionallığı
 */
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
            // Mobil menyu açıldıqda flex layout istifadə et
            if (!mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('flex', 'flex-col', 'absolute', 'top-full', 'left-0', 'right-0', 'bg-white', 'shadow-lg', 'p-4', 'space-y-4');
            } else {
                mobileMenu.classList.remove('flex', 'flex-col', 'absolute', 'top-full', 'left-0', 'right-0', 'bg-white', 'shadow-lg', 'p-4', 'space-y-4');
            }
        });
    }
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
            showError('name', 'Ad Soyad xanası mütləq doldurulmalıdır');
            isValid = false;
        }
        
        // Telefon validasiyası
        const phone = document.getElementById('phone').value.trim();
        if (!phone) {
            showError('phone', 'Telefon xanası mütləq doldurulmalıdır');
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
            showNotification(
                '❌ Səhifəni fayl kimi (file://) açmısınız — /api/contact işləmir. Terminalda npm start edin və brauzerdə http://localhost:3000 (və ya göstərilən port) ünvanından açın.',
                'error'
            );
            return;
        }
        
        // Submit düyməsini deaktiv et
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Göndərilir...';
        
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
                showNotification('✅ Mesajınız uğurla göndərildi! Tezliklə sizinlə əlaqə saxlayacağıq.', 'success');
                contactForm.reset();
                clearErrors();
            } else {
                var msg = (result.data && result.data.error) || 'Xəta baş verdi. Birbaşa telefon və ya email ilə əlaqə saxlayın.';
                console.error('Əlaqə formu:', result.status, result.data);
                showNotification('❌ ' + msg, 'error');
            }
        })
        .catch(function (error) {
            console.error('Network xətası:', error);
            showNotification('❌ Bağlantı xətası. İnternet bağlantınızı yoxlayın və yenidən cəhd edin.', 'error');
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
        const href = this.getAttribute('href');
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
            768: {
                slidesPerView: 3,
                spaceBetween: 24,
            },
            1024: {
                slidesPerView: 4,
                spaceBetween: 24,
            },
        },
    });
    window._partnersSwiperInstance = swiper;
};

