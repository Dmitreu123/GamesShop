/* ==========================================================
   Games Shop — логика страницы
   ========================================================== */

/* ---------- ДАННЫЕ ---------- */

// Товары (имитация базы данных)
const PRODUCTS = [
    {
        id: 1,
        title: 'Steam аккаунт + 500 игр',
        desc: 'Полный доступ, смена почты, гарантия 30 дней.',
        price: 2490,
        oldPrice: 3200,
        icon: 'fab fa-steam',
        badge: { text: 'ХИТ', type: 'hit' },
        category: 'accounts'
    },
    {
        id: 2,
        title: '1000 золота WoW',
        desc: 'Быстрая передача на ваш сервер, любые фракции.',
        price: 1190,
        oldPrice: 1490,
        icon: 'fas fa-coins',
        badge: { text: '-20%', type: 'sale' },
        category: 'currency'
    },
    {
        id: 3,
        title: 'Скин AWP | Dragon Lore',
        desc: 'CS2, идеальное состояние, моментальная выдача.',
        price: 89900,
        oldPrice: null,
        icon: 'fas fa-gem',
        badge: null,
        category: 'items'
    },
    {
        id: 4,
        title: 'Буст рейтинга Dota 2',
        desc: 'От 1000 до 6000 MMR. Опытные бустеры.',
        price: 2500,
        oldPrice: null,
        icon: 'fas fa-shield-alt',
        badge: { text: 'NEW', type: '' },
        category: 'boosts'
    },
    {
        id: 5,
        title: "Ключ Baldur's Gate 3",
        desc: 'Steam, глобальная активация, регион free.',
        price: 1990,
        oldPrice: 2790,
        icon: 'fas fa-key',
        badge: { text: 'ХИТ', type: 'hit' },
        category: 'keys'
    },
    {
        id: 6,
        title: 'Прокачка уровня PoE',
        desc: '1-100 за 24 часа, без банов, стрим процесса.',
        price: 4200,
        oldPrice: null,
        icon: 'fas fa-user-plus',
        badge: null,
        category: 'services'
    }
];

// Продавцы
const SELLERS = [
    { name: 'Alex_Games',  rating: '4.9', deals: '1 340' },
    { name: 'MegaStore',   rating: '5.0', deals: '980' },
    { name: 'GameKeyPro',  rating: '4.8', deals: '2 170' },
    { name: 'NinjaBoost',  rating: '4.9', deals: '760' }
];

/* ---------- УТИЛИТЫ ---------- */

// Форматирование цены: 2490 → "2 490 ₽"
function formatPrice(value) {
    return value.toLocaleString('ru-RU') + ' ₽';
}

// Безопасное экранирование строк (защита от XSS)
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ---------- РЕНДЕР ---------- */

// Карточка товара
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.category = product.category;

    const badgeHTML = product.badge
        ? `<div class="product-badge ${product.badge.type}">${escapeHTML(product.badge.text)}</div>`
        : '';

    const oldPriceHTML = product.oldPrice
        ? `<span class="price-old">${formatPrice(product.oldPrice)}</span>`
        : '';

    card.innerHTML = `
        ${badgeHTML}
        <div class="product-icon"><i class="${product.icon}"></i></div>
        <div class="product-title">${escapeHTML(product.title)}</div>
        <div class="product-desc">${escapeHTML(product.desc)}</div>
        <div class="product-price">
            <div>
                <span class="price-value">${formatPrice(product.price)}</span>
                ${oldPriceHTML}
            </div>
            <button class="buy-btn" data-id="${product.id}" title="Купить">
                <i class="fas fa-shopping-cart"></i>
            </button>
        </div>
    `;

    return card;
}

// Рендер всех товаров
function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = '<p style="color:#8a99b0;grid-column:1/-1;text-align:center;padding:40px 0;">Ничего не найдено</p>';
        return;
    }

    products.forEach(p => grid.appendChild(createProductCard(p)));
}

// Карточка продавца
function createSellerCard(seller) {
    const card = document.createElement('div');
    card.className = 'seller-card';
    card.innerHTML = `
        <div class="seller-avatar">${escapeHTML(seller.name.charAt(0))}</div>
        <div class="seller-info">
            <h4>${escapeHTML(seller.name)}</h4>
            <p><i class="fas fa-star"></i> ${seller.rating} • ${seller.deals} сделок</p>
        </div>
    `;
    return card;
}

// Рендер продавцов
function renderSellers(sellers) {
    const row = document.getElementById('sellersRow');
    row.innerHTML = '';
    sellers.forEach(s => row.appendChild(createSellerCard(s)));
}

/* ---------- ЛОГИКА ---------- */

// Обработка клика по категории
function initCategories() {
    const grid = document.getElementById('categoryGrid');

    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.category-card');
        if (!card) return;

        // снять активность со всех
        grid.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const category = card.dataset.category;
        const filtered = PRODUCTS.filter(p => p.category === category);
        renderProducts(filtered);
    });
}

// Обработка клика по кнопке "Купить"
function initBuyButtons() {
    const grid = document.getElementById('productGrid');

    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.buy-btn');
        if (!btn) return;

        const id = Number(btn.dataset.id);
        const product = PRODUCTS.find(p => p.id === id);
        if (!product) return;

        // здесь можно открыть модалку / отправить запрос
        alert(`Товар "${product.title}" добавлен в корзину за ${formatPrice(product.price)}`);
    });
}

// Обработка поиска
function initSearch() {
    const input = document.getElementById('searchInput');

    input.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        // сбрасываем активную категорию
        document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));

        if (query === '') {
            renderProducts(PRODUCTS);
            return;
        }

        const filtered = PRODUCTS.filter(p =>
            p.title.toLowerCase().includes(query) ||
            p.desc.toLowerCase().includes(query)
        );
        renderProducts(filtered);
    });
}

// Кнопка "Продать"
function initSellButton() {
    const btn = document.getElementById('sellBtn');
    btn.addEventListener('click', () => {
        alert('Форма размещения товара скоро появится!');
    });
}

/* ---------- ИНИЦИАЛИЗАЦИЯ ---------- */

document.addEventListener('DOMContentLoaded', () => {
    // Первый рендер — только категория "accounts" активна, показываем все товары
    renderProducts(PRODUCTS);
    renderSellers(SELLERS);

    initCategories();
    initBuyButtons();
    initSearch();
    initSellButton();
});