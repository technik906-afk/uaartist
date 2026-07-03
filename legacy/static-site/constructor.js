/**
 * ========================================
 * CONSTRUCTOR MODULE
 * ========================================
 * Логика конструктора косметичек
 * Использует cartModule для работы с корзиной
 */

// ========================================
// State
// ========================================
const state = {
    size: 'small',
    sizePrice: 2490,
    bagColor: 'beige',
    bagColorName: 'Бежевый',
    bagColorHex: '#E8E4D9',
    zipperColor: 'gold',
    zipperColorName: 'Золотая',
    zipperColorHex: '#D4AF37',
    hasTassel: true,
    tasselPrice: 200
};

// ========================================
// DOM Elements - Constructor
// ========================================
const bagBody = document.getElementById('bagBody');
const bagZipper = document.getElementById('bagZipper');
const bagTassel = document.getElementById('bagTassel');
const previewName = document.getElementById('previewName');
const previewDesc = document.getElementById('previewDesc');
const totalPriceElement = document.getElementById('totalPrice');
const bagColorName = document.getElementById('bagColorName');
const zipperColorName = document.getElementById('zipperColorName');
const tasselOption = document.getElementById('tasselOption');
const addToCartBtn = document.getElementById('addToCartBtn');

// ========================================
// Preview Functions
// ========================================
function updatePreview() {
    if (bagBody) bagBody.style.background = state.bagColorHex;
    if (bagZipper) bagZipper.style.background = state.zipperColorHex;
    if (bagTassel) bagTassel.style.background = state.zipperColorHex;

    const sizeNames = {
        small: 'Мини',
        medium: 'Стандарт',
        large: 'Макси'
    };

    if (previewName) {
        previewName.textContent = `Косметичка "${sizeNames[state.size]}"`;
    }
    if (previewDesc) {
        previewDesc.textContent = `${state.bagColorName} лён, ${state.zipperColorName.toLowerCase()} молния`;
    }
}

function updateTotal() {
    const total = state.sizePrice + (state.hasTassel ? state.tasselPrice : 0);
    if (totalPriceElement) {
        totalPriceElement.textContent = total.toLocaleString('ru-RU') + ' ₽';
    }
}

// ========================================
// Initialize on DOM Load
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize preview
    updatePreview();
    updateTotal();

    // Size cards
    const sizeCards = document.querySelectorAll('.size-card');
    sizeCards.forEach(card => {
        card.addEventListener('click', () => {
            sizeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            state.size = card.dataset.size;
            state.sizePrice = parseInt(card.dataset.price);
            updatePreview();
            updateTotal();
        });
    });

    // Bag color buttons
    const bagColorBtns = document.querySelectorAll('.color-btn:not(.zipper-btn)');
    bagColorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            bagColorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.bagColor = btn.dataset.color;
            state.bagColorName = btn.dataset.colorName;
            state.bagColorHex = btn.style.background;
            if (bagColorName) bagColorName.textContent = state.bagColorName;
            updatePreview();
        });
    });

    // Zipper color buttons
    const zipperBtns = document.querySelectorAll('.zipper-btn');
    zipperBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            zipperBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.zipperColor = btn.dataset.zipper;
            state.zipperColorName = btn.dataset.zipperName;
            state.zipperColorHex = btn.style.background;
            if (zipperColorName) zipperColorName.textContent = state.zipperColorName;
            updatePreview();
        });
    });

    // Tassel option
    if (tasselOption) {
        tasselOption.addEventListener('change', () => {
            state.hasTassel = tasselOption.checked;
            if (bagTassel) {
                bagTassel.style.display = state.hasTassel ? 'block' : 'none';
            }
            updateTotal();
        });
    }

    // Add to Cart Button
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const sizeNames = {
                small: 'Мини',
                medium: 'Стандарт',
                large: 'Макси'
            };

            const productName = `Косметичка "${sizeNames[state.size]}" (${state.bagColorName}, ${state.zipperColorName.toLowerCase()} молния${state.hasTassel ? ', с кисточкой' : ''})`;

            const customProduct = {
                id: `custom-${state.size}-${state.bagColor}-${state.zipperColor}-${state.hasTassel}`,
                name: productName,
                description: `Индивидуальная косметичка: ${state.bagColorName} лён, ${state.zipperColorName.toLowerCase()} молния, размер ${sizeNames[state.size]}`,
                price: state.sizePrice + (state.hasTassel ? state.tasselPrice : 0),
                image: 'img/IMG_6666.jpg',
                isCustom: true,
                customOptions: {
                    size: state.size,
                    sizeName: sizeNames[state.size],
                    bagColor: state.bagColor,
                    bagColorName: state.bagColorName,
                    zipperColor: state.zipperColor,
                    zipperColorName: state.zipperColorName,
                    hasTassel: state.hasTassel
                }
            };

            // Используем cartModule для добавления в корзину
            window.cartModule.addToCart(customProduct);
        });
    }

    // Mobile menu toggle
    const nav = document.querySelector('.nav');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    
    if (mobileMenuBtn && nav) {
        mobileMenuBtn.addEventListener('click', () => {
            nav.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });

        // Close menu when clicking on nav links
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
                document.body.classList.remove('menu-open');
            });
        });

        // Reset mobile menu on window resize
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
});
