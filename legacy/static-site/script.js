// ========================================
// Filter Functionality
// ========================================
const filterBtns = document.querySelectorAll('.filter-btn');
const productCards = document.querySelectorAll('.product-card');

// Load wishlist from localStorage
function getWishlist() {
    const wishlist = localStorage.getItem('uaartist_wishlist');
    return wishlist ? JSON.parse(wishlist) : [];
}

// Save wishlist to localStorage
function saveWishlist(wishlist) {
    localStorage.setItem('uaartist_wishlist', JSON.stringify(wishlist));
}

// Toggle wishlist item
function toggleWishlist(productName) {
    const wishlist = getWishlist();
    const index = wishlist.indexOf(productName);

    if (index > -1) {
        wishlist.splice(index, 1);
        window.cartModule.showNotification({
            type: 'info',
            title: 'Удалено из избранного',
            message: productName,
            duration: 3000
        });
    } else {
        wishlist.push(productName);
        window.cartModule.showNotification({
            type: 'success',
            title: 'Добавлено в избранное',
            message: productName,
            duration: 3000
        });
    }

    saveWishlist(wishlist);
    updateWishlistIcons();

    // Обновить текущий фильтр
    const activeFilter = document.querySelector('.filter-btn.active');
    if (activeFilter) {
        filterProducts(activeFilter.dataset.filter);
    }

    return wishlist;
}

// Update wishlist icons on cards
function updateWishlistIcons() {
    const wishlist = getWishlist();
    document.querySelectorAll('.product-wishlist').forEach(btn => {
        const productName = btn.dataset.product;
        const svg = btn.querySelector('svg');
        const isInWishlist = wishlist.includes(productName);

        if (isInWishlist) {
            svg.setAttribute('fill', '#C4B5A0');
            svg.style.color = '#C4B5A0';
        } else {
            svg.setAttribute('fill', 'none');
            svg.style.color = '';
        }
    });
}

// Filter products
function filterProducts(filter) {
    const wishlist = getWishlist();
    let visibleCount = 0;

    productCards.forEach(card => {
        let shouldShow = false;

        if (filter === 'all') {
            shouldShow = true;
        } else if (filter === 'wishlist') {
            const productName = card.dataset.name || '';
            shouldShow = wishlist.includes(productName);
        } else {
            shouldShow = card.dataset.category === filter;
        }

        if (shouldShow) {
            card.style.display = 'block';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50);
            visibleCount++;
        } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.display = 'none';
            }, 300);
        }
    });

    // Показываем сообщение при пустом избранном
    const wishlistEmptyMessage = document.getElementById('wishlistEmptyMessage');
    if (wishlistEmptyMessage) {
        if (filter === 'wishlist' && visibleCount === 0) {
            wishlistEmptyMessage.style.display = 'block';
        } else {
            wishlistEmptyMessage.style.display = 'none';
        }
    }
}

// ========================================
// Initialize on DOM Load
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelectorAll('.nav a');

    if (mobileMenuBtn && nav) {
        mobileMenuBtn.addEventListener('click', () => {
            nav.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
            document.body.classList.toggle('menu-open', nav.classList.contains('active'));
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
                document.body.classList.remove('menu-open');
            });
        });

        document.addEventListener('click', (e) => {
            if (nav.classList.contains('active') &&
                !nav.contains(e.target) &&
                !mobileMenuBtn.contains(e.target)) {
                nav.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });

        // Сброс мобильного меню при изменении размера окна
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (window.innerWidth > 768 && nav.classList.contains('active')) {
                    nav.classList.remove('active');
                    mobileMenuBtn.classList.remove('active');
                    document.body.classList.remove('menu-open');
                }
            }, 250);
        });
    }

    // Add loaded class for any initial animations
    document.body.classList.add('loaded');

    // Highlight active nav link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Initialize wishlist icons
    updateWishlistIcons();

    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterProducts(this.dataset.filter);
        });
    });

    // Wishlist button handlers
    document.querySelectorAll('.product-wishlist').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const productName = this.dataset.product;
            toggleWishlist(productName);
        });
    });

    // Add to cart buttons (desktop)
    document.querySelectorAll('.btn-cart').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const productCard = this.closest('.product-card');
            if (!productCard) return;

            const name = productCard.querySelector('.product-title')?.textContent.trim() || 'Товар';
            const description = productCard.querySelector('.product-desc')?.textContent.trim() || '';
            const priceText = productCard.querySelector('.product-price')?.textContent.trim() || '0 ₽';
            const price = parseInt(priceText.replace(/\D/g, '')) || 0;
            const image = productCard.querySelector('img')?.src || '';

            const product = {
                id: name.toLowerCase().replace(/\s+/g, '-'),
                name,
                description,
                price,
                image
            };

            window.cartModule.addToCart(product);
        });
    });

    // Add to cart buttons (mobile)
    document.querySelectorAll('.btn-cart-mobile').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const productCard = this.closest('.product-card');
            if (!productCard) return;

            const name = productCard.querySelector('.product-title')?.textContent.trim() || 'Товар';
            const description = productCard.querySelector('.product-desc')?.textContent.trim() || '';
            const priceText = productCard.querySelector('.product-price')?.textContent.trim() || '0 ₽';
            const price = parseInt(priceText.replace(/\D/g, '')) || 0;
            const image = productCard.querySelector('img')?.src || '';

            const product = {
                id: name.toLowerCase().replace(/\s+/g, '-'),
                name,
                description,
                price,
                image
            };

            window.cartModule.addToCart(product);
        });
    });
});

// ========================================
// Smooth Scroll for Anchor Links
// ========================================
document.querySelectorAll('a[href^="#"], a[href*="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        const hash = href.includes('#') ? href.split('#')[1] : null;

        if (hash && hash.length > 0) {
            if (href.includes('.html#')) {
                const targetPage = href.split('#')[0];
                const currentPage = window.location.pathname.split('/').pop() || 'index.html';

                if (targetPage === currentPage || (targetPage === '' && currentPage === 'index.html')) {
                    e.preventDefault();
                    scrollToElement(hash);
                } else {
                    sessionStorage.setItem('scrollToAnchor', hash);
                }
            } else if (href.startsWith('#')) {
                e.preventDefault();
                scrollToElement(hash);
            }
        }
    });
});

function scrollToElement(hash) {
    const target = document.getElementById(hash);
    if (target) {
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const anchor = sessionStorage.getItem('scrollToAnchor');
    if (anchor) {
        setTimeout(() => {
            scrollToElement(anchor);
            sessionStorage.removeItem('scrollToAnchor');
        }, 100);
    }
});

// ========================================
// Header Scroll Effect
// ========================================
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.boxShadow = 'none';
    }
});

// ========================================
// Animation on Scroll
// ========================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .product-card, .testimonial-card, .contact-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ========================================
// Contact Form
// ========================================
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const nameInput = this.querySelector('input[type="text"]');
        const emailInput = this.querySelector('input[type="email"]');
        const phoneInput = this.querySelector('input[type="tel"]');
        const messageInput = this.querySelector('textarea');

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();
        const message = messageInput.value.trim();

        if (name.length < 2) {
            window.cartModule.showNotification({
                type: 'error',
                title: 'Ошибка',
                message: 'Пожалуйста, введите корректное имя (минимум 2 символа)'
            });
            nameInput.focus();
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            window.cartModule.showNotification({
                type: 'error',
                title: 'Ошибка',
                message: 'Пожалуйста, введите корректный email'
            });
            emailInput.focus();
            return;
        }

        if (phone && !/^[\d\s\+\-\(\)]+$/.test(phone)) {
            window.cartModule.showNotification({
                type: 'error',
                title: 'Ошибка',
                message: 'Пожалуйста, введите корректный номер телефона'
            });
            phoneInput.focus();
            return;
        }

        if (message.length < 10) {
            window.cartModule.showNotification({
                type: 'error',
                title: 'Ошибка',
                message: 'Сообщение должно содержать минимум 10 символов'
            });
            messageInput.focus();
            return;
        }

        sendToTelegram(name, email, phone, message, 'contactForm')
            .then(() => {
                window.cartModule.showNotification({
                    type: 'success',
                    title: 'Сообщение отправлено!',
                    message: 'Мы свяжемся с вами в ближайшее время.',
                    duration: 5000
                });
                this.reset();
            })
            .catch((error) => {
                console.error('Ошибка отправки:', error);
                window.cartModule.showNotification({
                    type: 'error',
                    title: 'Ошибка отправки',
                    message: 'Попробуйте позже или свяжитесь напрямую',
                    duration: 5000
                });
            });
    });
}

// ========================================
// Newsletter Form
// ========================================
const newsletterForm = document.getElementById('newsletterForm');

if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const emailInput = this.querySelector('input[type="email"]');
        const email = emailInput.value.trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            window.cartModule.showNotification({
                type: 'error',
                title: 'Ошибка',
                message: 'Пожалуйста, введите корректный email'
            });
            emailInput.focus();
            return;
        }

        window.cartModule.showNotification({
            type: 'success',
            title: 'Подписка оформлена!',
            message: 'Проверьте вашу почту для подтверждения.',
            duration: 5000
        });

        this.reset();
    });
}

// ========================================
// Telegram Integration (Contact Form)
// ========================================
async function sendToTelegram(name, email, phone, message, formType) {
    if (typeof TELEGRAM_CONFIG === 'undefined') {
        console.warn('TELEGRAM_CONFIG не найден');
        return Promise.resolve();
    }

    const { botToken, chatId, apiUrl } = TELEGRAM_CONFIG;

    let text = '';
    if (formType === 'contactForm') {
        text = `
📬 <b>Новое сообщение с сайта</b>

👤 <b>Имя:</b> ${name}
📧 <b>Email:</b> ${email}
📱 <b>Телефон:</b> ${phone || 'Не указан'}
💬 <b>Сообщение:</b>
${message}
        `.trim();
    } else if (formType === 'order') {
        text = `
🛒 <b>Новый заказ</b>

👤 <b>Имя:</b> ${name}
📧 <b>Email:</b> ${email}
📱 <b>Телефон:</b> ${phone}
📝 <b>Комментарий:</b> ${message || 'Без комментария'}
        `.trim();
    }

    const url = `${apiUrl}${botToken}/sendMessage`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        })
    });

    if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
    }

    return response.json();
}

// ========================================
// Button Click Effects (Ripple)
// ========================================
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');

        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
});

const style = document.createElement('style');
style.textContent = `
    .btn {
        position: relative;
        overflow: hidden;
    }
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
