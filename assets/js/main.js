/**
 * Suvarmax Main JavaScript
 * Mobile menu, contact form and partners slider functionality
 */

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initContactForm();
    initPartners();
    setCurrentYear();
});

/**
 * Set current year in footer copyright
 */
function setCurrentYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

/**
 * Mobile menu functionality
 */
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
            // Apply flex layout when mobile menu is opened
            if (!mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('flex', 'flex-col', 'absolute', 'top-full', 'left-0', 'right-0', 'bg-white', 'shadow-lg', 'p-4', 'space-y-4');
            } else {
                mobileMenu.classList.remove('flex', 'flex-col', 'absolute', 'top-full', 'left-0', 'right-0', 'bg-white', 'shadow-lg', 'p-4', 'space-y-4');
            }
        });
    }
}

/**
 * Contact form functionality
 * Sends messages to Telegram bot
 */
function initContactForm() {
    const contactForm = document.getElementById('contact-form');

    if (!contactForm) return;

    // Custom validation messages in Azerbaijani
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');

    if (nameInput) {
        nameInput.addEventListener('invalid', function() {
            if (this.validity.valueMissing) {
                this.setCustomValidity('Zəhmət olmasa ad və soyadınızı daxil edin');
            }
        });
        nameInput.addEventListener('input', function() {
            this.setCustomValidity('');
        });
    }

    if (phoneInput) {
        phoneInput.addEventListener('invalid', function() {
            if (this.validity.valueMissing) {
                this.setCustomValidity('Zəhmət olmasa telefon nömrənizi daxil edin');
            }
        });
        phoneInput.addEventListener('input', function() {
            this.setCustomValidity('');
        });
    }

    if (emailInput) {
        emailInput.addEventListener('invalid', function() {
            if (this.validity.typeMismatch) {
                this.setCustomValidity('Zəhmət olmasa düzgün email ünvanı daxil edin');
            }
        });
        emailInput.addEventListener('input', function() {
            this.setCustomValidity('');
        });
    }

    // Telegram Bot configuration
    // WARNING: Replace these with your own bot token and chat ID
    const TELEGRAM_BOT_TOKEN = '8554708256:AAGUJXtJjehvX4gvHMGphK6YI6L7zuQ6I1E';
    const TELEGRAM_CHAT_ID = '5449848409';

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Disable submit button
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Göndərilir...';

        // Collect form data
        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            message: document.getElementById('message').value.trim()
        };

        // Format Telegram message
        const telegramMessage = `🆕 *Yeni Sorğu - Suvarmax*\n\n` +
            `👤 *Ad Soyad:* ${formData.name}\n` +
            `📧 *Email:* ${formData.email || 'Göstərilməyib'}\n` +
            `📱 *Telefon:* ${formData.phone}\n\n` +
            `💬 *Mesaj:*\n${formData.message || 'Mesaj yoxdur'}\n\n` +
            `🕐 *Tarix:* ${new Date().toLocaleString('az-AZ')}`;

        // Send message to Telegram Bot API
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

        fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: telegramMessage,
                parse_mode: 'Markdown'
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.ok) {
                    // Success
                    showNotification('✅ Mesajınız uğurla göndərildi! Tezliklə sizinlə əlaqə saxlayacağıq.', 'success');
                    contactForm.reset();
                } else {
                    // Error
                    showNotification('❌ Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin və ya birbaşa telefon/email ilə əlaqə saxlayın.', 'error');
                }
            })
            .catch(error => {
                showNotification('❌ Bağlantı xətası. İnternet bağlantınızı yoxlayın və yenidən cəhd edin.', 'error');
            })
            .finally(() => {
                // Re-enable submit button
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            });
    });
}

/**
 * Show notification message with slide-in animation from right
 */
function showNotification(message, type = 'success') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.style.transform = 'translateX(120%)';
        setTimeout(() => existingNotification.remove(), 300);
    }

    // Check if mobile device
    const isMobile = window.innerWidth < 640;

    // Create notification container
    const notification = document.createElement('div');
    notification.className = `notification fixed z-50 ${
        isMobile
            ? 'top-4 left-4 right-4'
            : 'top-6 right-6 max-w-sm'
    }`;
    notification.style.transform = isMobile ? 'translateY(-120%)' : 'translateX(120%)';
    notification.style.transition = 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';

    // Create notification content
    notification.innerHTML = `
        <div class="flex items-start gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-sm ${
        type === 'success'
            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
            : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
    }">
            <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        type === 'success' ? 'bg-white/20' : 'bg-white/20'
    }">
                ${type === 'success'
        ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
        : '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
    }
            </div>
            <div class="flex-1 pt-0.5">
                <p class="font-semibold text-sm mb-1">${type === 'success' ? 'Uğurlu!' : 'Xəta!'}</p>
                <p class="text-sm opacity-90">${message}</p>
            </div>
            <button class="notification-close flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors" aria-label="Bağla">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
        <div class="notification-progress h-1 mt-1 rounded-full overflow-hidden bg-white/20">
            <div class="h-full bg-white/60 rounded-full" style="animation: notificationProgress 5s linear forwards;"></div>
        </div>
    `;

    document.body.appendChild(notification);

    // Slide-in animation
    setTimeout(() => {
        notification.style.transform = 'translate(0, 0)';
    }, 10);

    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    const hideNotification = () => {
        notification.style.transform = isMobile ? 'translateY(-120%)' : 'translateX(120%)';
        setTimeout(() => notification.remove(), 400);
    };

    closeBtn.addEventListener('click', hideNotification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            hideNotification();
        }
    }, 5000);
}

/**
 * Smooth scroll functionality for anchor links
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
 * Partners slider functionality using Swiper.js
 */
function initPartners() {
    const partnersSwiper = document.querySelector('.partners-swiper');
    if (!partnersSwiper) return;

    // Initialize Swiper
    new Swiper('.partners-swiper', {
        slidesPerView: 1,
        spaceBetween: 24,
        loop: true,
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
}
