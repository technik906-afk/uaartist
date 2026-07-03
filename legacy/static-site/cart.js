/**
 * ========================================
 * CART MODULE - Единый модуль корзины
 * ========================================
 * Используется на всех страницах сайта
 */

// Cart State
let cart = [];

// DOM Elements (инициализируются в initCart)
let cartModal, orderModal, cartItemsContainer, cartTotalElement;
let orderSummaryContainer, checkoutForm, cartHeaderBtn, cartCountElement;
let clearCartBtn, mobileCartBtn, mobileCartCount, submitOrderBtn;
let continueShoppingBtn, notificationsContainer;

/**
 * Инициализация DOM элементов корзины
 */
function initCartElements() {
    cartModal = document.getElementById('cartModal');
    orderModal = document.getElementById('orderModal');
    cartItemsContainer = document.getElementById('cartItems');
    cartTotalElement = document.getElementById('cartTotal');
    orderSummaryContainer = document.getElementById('orderSummary');
    checkoutForm = document.getElementById('checkoutForm');
    cartHeaderBtn = document.getElementById('cartHeaderBtn');
    cartCountElement = document.getElementById('cartCount');
    clearCartBtn = document.getElementById('clearCartBtn');
    mobileCartBtn = document.getElementById('mobileCartBtn');
    mobileCartCount = document.getElementById('mobileCartCount');
    submitOrderBtn = document.getElementById('submitOrderBtn');
    continueShoppingBtn = document.getElementById('continueShopping');
    notificationsContainer = document.getElementById('notifications');
}

/**
 * Загрузка корзины из localStorage
 */
function loadCart() {
    const savedCart = localStorage.getItem('uaartist_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        // Добавляем quantity=1 для старых товаров без количества
        cart = cart.map(item => ({
            ...item,
            quantity: item.quantity || 1
        }));
        saveCart();
    }
    updateCartCount();
}

/**
 * Сохранение корзины в localStorage
 */
function saveCart() {
    localStorage.setItem('uaartist_cart', JSON.stringify(cart));
}

/**
 * Обновление счётчика корзины
 */
function updateCartCount() {
    if (cartCountElement) {
        const count = cart.length;
        cartCountElement.textContent = count;

        if (count > 0) {
            cartCountElement.classList.add('bump');
            setTimeout(() => {
                cartCountElement.classList.remove('bump');
            }, 300);
        }
    }

    if (mobileCartCount) {
        mobileCartCount.textContent = cart.length;
    }
}

/**
 * Открытие модального окна корзины
 */
function openCartModal() {
    if (cartModal) {
        cartModal.classList.add('active');
        document.body.classList.add('menu-open');
        renderCart();
    }
}

/**
 * Закрытие модального окна корзины
 */
function closeCartModal() {
    if (cartModal) {
        cartModal.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
}

/**
 * Открытие модального окна оформления заказа
 */
function openOrderModal() {
    if (orderModal) {
        orderModal.classList.add('active');
        document.body.classList.add('menu-open');
        renderOrderSummary();
    }
}

/**
 * Закрытие модального окна оформления заказа
 */
function closeOrderModal() {
    if (orderModal) {
        orderModal.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
}

/**
 * Notification System
 */
function showNotification(options) {
    const { type = 'info', title, message, duration = 5000 } = options;

    if (!notificationsContainer) {
        alert(`${title}\n\n${message}`);
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const icons = {
        success: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
        error: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/></svg>',
        info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
    };

    notification.innerHTML = `
        <div class="notification-icon">${icons[type]}</div>
        <div class="notification-content">
            <p class="notification-title">${title}</p>
            <p class="notification-message">${message}</p>
        </div>
        <button class="notification-close" aria-label="Закрыть">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
        </button>
    `;

    notificationsContainer.appendChild(notification);

    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => removeNotification(notification));

    if (duration > 0) {
        setTimeout(() => removeNotification(notification), duration);
    }

    return notification;
}

function removeNotification(notification) {
    if (!notification) return;
    notification.classList.add('hiding');
    notification.addEventListener('animationend', () => {
        notification.remove();
    });
}

/**
 * Добавление товара в корзину
 */
function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        showNotification({
            type: 'info',
            title: 'Уже в корзине',
            message: 'Этот товар уже добавлен в корзину',
            duration: 3000
        });
    } else {
        cart.push(product);
        saveCart();
        updateCartCount();
        showNotification({
            type: 'success',
            title: 'Добавлено в корзину',
            message: `${product.name} добавлен в корзину`,
            duration: 3000
        });
    }
}

/**
 * Добавление товара из конструктора
 */
function addToCartCustom(product) {
    addToCart(product);
}

/**
 * Удаление товара из корзины
 */
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
    renderCart();
}

/**
 * Обновление количества товара
 */
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = (item.quantity || 1) + change;
        if (item.quantity < 1) item.quantity = 1;
        saveCart();
        updateCartCount();
        renderCart();
    }
}

/**
 * Очистка корзины
 */
function clearCart() {
    if (cart.length === 0) {
        showNotification({
            type: 'info',
            title: 'Корзина пуста',
            message: 'В корзине нет товаров',
            duration: 3000
        });
        return;
    }

    if (confirm('Вы уверены, что хотите очистить корзину?')) {
        cart = [];
        saveCart();
        updateCartCount();
        renderCart();
        showNotification({
            type: 'success',
            title: 'Корзина очищена',
            message: 'Все товары удалены из корзины',
            duration: 3000
        });
    }
}

/**
 * Отрисовка корзины
 */
function renderCart() {
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="cart-empty">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px; color: var(--color-accent);">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <p>Ваша корзина пуста</p>
                <p style="font-size: 0.875rem; margin-top: 8px;">Выберите товары из каталога</p>
            </div>
        `;
        cartTotalElement.textContent = '0 ₽';
        return;
    }

    // Гарантируем что quantity существует
    cart = cart.map(item => ({
        ...item,
        quantity: item.quantity || 1
    }));

    const total = cart.reduce((sum, item) => {
        const price = item.price || 0;
        const quantity = item.quantity || 1;
        return sum + (price * quantity);
    }, 0);

    cartItemsContainer.innerHTML = cart.map(item => {
        const price = item.price || 0;
        const quantity = item.quantity || 1;
        const itemTotal = price * quantity;

        // Custom product from constructor
        let customOptionsHtml = '';
        if (item.isCustom && item.customOptions) {
            customOptionsHtml = `
                <div style="font-size: 0.75rem; color: var(--color-text-gray); margin-top: 4px;">
                    <div>Размер: ${item.customOptions.sizeName || 'Н/Д'}</div>
                    <div>Цвет: ${item.customOptions.bagColorName || 'Н/Д'}</div>
                    <div>Молния: ${item.customOptions.zipperColorName || 'Н/Д'}</div>
                    <div>Кисточка: ${item.customOptions.hasTassel ? 'да' : 'нет'}</div>
                </div>
            `;
        }

        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.image || ''}" alt="${item.name || 'Товар'}">
                </div>
                <div class="cart-item-info">
                    <p class="cart-item-title">${item.name || 'Товар'}</p>
                    <p class="cart-item-desc">${item.description || ''}</p>
                    ${customOptionsHtml}
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                        <button class="btn-quantity" onclick="updateQuantity('${item.id}', -1)" ${quantity <= 1 ? 'style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 12h14"/>
                            </svg>
                        </button>
                        <span style="font-size: 1rem; font-weight: 500; min-width: 24px; text-align: center;">${quantity}</span>
                        <button class="btn-quantity" onclick="updateQuantity('${item.id}', 1)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 5v14"/><path d="M5 12h14"/>
                            </svg>
                        </button>
                    </div>
                    <p class="cart-item-price">${price.toLocaleString('ru-RU')} ₽ × ${quantity} = ${itemTotal.toLocaleString('ru-RU')} ₽</p>
                </div>
                <button class="cart-item-remove" aria-label="Удалить" onclick="removeFromCart('${item.id}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                </button>
            </div>
        `;
    }).join('');

    cartTotalElement.textContent = `${total.toLocaleString('ru-RU')} ₽`;
}

/**
 * Отрисовка краткого содержимого заказа
 */
function renderOrderSummary() {
    if (!orderSummaryContainer) return;

    if (cart.length === 0) {
        orderSummaryContainer.innerHTML = `
            <div class="cart-empty">
                <p>Ваша корзина пуста</p>
            </div>
        `;
        return;
    }

    const total = cart.reduce((sum, item) => {
        const price = item.price || 0;
        const quantity = item.quantity || 1;
        return sum + (price * quantity);
    }, 0);

    orderSummaryContainer.innerHTML = `
        <div class="order-summary">
            ${cart.map(item => `
                <div class="order-summary-row">
                    <span>${item.name}</span>
                    <span>${item.price.toLocaleString('ru-RU')} ₽ × ${item.quantity || 1}</span>
                </div>
            `).join('')}
            <div class="order-summary-row total">
                <span>Итого:</span>
                <span>${total.toLocaleString('ru-RU')} ₽</span>
            </div>
        </div>
    `;
}

/**
 * Отправка заказа в Telegram
 * Через Google Apps Script (токен скрыт в скрипте)
 */
async function sendOrderToTelegram(orderData) {
    // URL вашего Google Apps Script Web App
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzk8EiwMJ-ZYJS6ObM4qBc4OQeDOAkEeGsKpo4maLPvj_2UkOQHASNM_Ei9DE0o5RBwLw/exec';
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            return true;
        } else {
            console.error('Telegram error:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Ошибка отправки в Telegram:', error);
        return false;
    }
}

/**
 * Обработка отправки заказа
 */
async function submitOrder() {
    const name = document.getElementById('orderName').value.trim();
    const phone = document.getElementById('orderPhone').value.trim();
    const email = document.getElementById('orderEmail').value.trim();
    const comment = document.getElementById('orderComment').value.trim();

    // Validation
    if (!name || name.length < 2) {
        showNotification({
            type: 'error',
            title: 'Ошибка',
            message: 'Пожалуйста, введите корректное имя'
        });
        document.getElementById('orderName').focus();
        return;
    }

    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(phone)) {
        showNotification({
            type: 'error',
            title: 'Ошибка',
            message: 'Пожалуйста, введите корректный номер телефона'
        });
        document.getElementById('orderPhone').focus();
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification({
            type: 'error',
            title: 'Ошибка',
            message: 'Пожалуйста, введите корректный email'
        });
        document.getElementById('orderEmail').focus();
        return;
    }

    if (cart.length === 0) {
        showNotification({
            type: 'error',
            title: 'Ошибка',
            message: 'Корзина пуста'
        });
        return;
    }

    const total = cart.reduce((sum, item) => {
        const price = item.price || 0;
        const quantity = item.quantity || 1;
        return sum + (price * quantity);
    }, 0);

    const orderData = {
        items: cart,
        total: total,
        customer: { name, phone, email, comment },
        timestamp: Date.now()
    };

    // Отправка в Telegram
    const telegramSent = await sendOrderToTelegram(orderData);

    // Save order for thank-you page
    localStorage.setItem('uaartist_last_order', JSON.stringify(orderData));
    localStorage.setItem('uaartist_last_order_time', Date.now().toString());

    // Clear cart
    cart = [];
    saveCart();
    updateCartCount();
    closeOrderModal();
    closeCartModal();
    if (checkoutForm) checkoutForm.reset();

    // Redirect to thank-you page
    if (telegramSent) {
        showNotification({
            type: 'success',
            title: 'Заказ отправлен!',
            message: 'Мы свяжемся с вами в ближайшее время',
            duration: 3000
        });
        setTimeout(() => {
            window.location.href = 'thank-you.html';
        }, 1000);
    } else {
        showNotification({
            type: 'error',
            title: 'Ошибка отправки',
            message: 'Попробуйте позже или свяжитесь напрямую',
            duration: 5000
        });
    }
}

/**
 * Установка обработчиков событий корзины
 */
function initCartEventListeners() {
    // Cart header button
    if (cartHeaderBtn) {
        cartHeaderBtn.addEventListener('click', openCartModal);
    }

    // Mobile cart button
    if (mobileCartBtn) {
        mobileCartBtn.addEventListener('click', openCartModal);
    }

    // Clear cart button
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }

    // Checkout button - открывает форму оформления заказа
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                showNotification({
                    type: 'error',
                    title: 'Ошибка',
                    message: 'Корзина пуста'
                });
                return;
            }
            closeCartModal();
            openOrderModal();
        });
    }

    // Continue shopping button
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', () => {
            closeCartModal();
            window.location.href = 'catalog.html';
        });
    }

    // Submit order button - отправляет заказ
    if (submitOrderBtn) {
        submitOrderBtn.addEventListener('click', submitOrder);
    }

    // Cart modal close on overlay click
    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) {
                closeCartModal();
            }
        });
    }

    // Order modal close on overlay click
    if (orderModal) {
        orderModal.addEventListener('click', (e) => {
            if (e.target === orderModal) {
                closeOrderModal();
            }
        });
    }

    // Close modal on close button click
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeCartModal();
            closeOrderModal();
        });
    });
}

/**
 * Главная функция инициализации корзины
 * Вызывать после загрузки DOM
 */
function initCart() {
    initCartElements();
    loadCart();
    initCartEventListeners();
}

// Экспорт функций (для использования в других модулях)
window.cartModule = {
    initCart,
    initCartElements,
    loadCart,
    saveCart,
    updateCartCount,
    openCartModal,
    closeCartModal,
    openOrderModal,
    closeOrderModal,
    addToCart,
    addToCartCustom,
    removeFromCart,
    updateQuantity,
    clearCart,
    renderCart,
    renderOrderSummary,
    submitOrder,
    sendOrderToTelegram,
    showNotification,
    removeNotification,
    getCart: () => cart,
    setCart: (newCart) => { cart = newCart; }
};

// ========================================
// Auto-initialize on DOMContentLoaded
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initCart();
});
