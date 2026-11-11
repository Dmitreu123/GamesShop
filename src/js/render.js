import { formatPrice, escapeHTML } from './utils.js';

export function createProductCard(product) {
    const card = document.createElement('div');
    card.className = `product-card ${product.is_premium ? 'premium' : ''}`;
    card.dataset.id = product.id;

    // Бейдж премиум
    const premiumBadge = product.is_premium ? '<div class="product-badge premium-badge">🚀 ТОП</div>' : '';

    // Бейдж скидки (если есть old_price и он больше текущей)
    let discountBadge = '';
    if (product.old_price && product.old_price > product.price) {
        const discount = Math.round((1 - product.price / product.old_price) * 100);
        if (discount >= 5) {
            discountBadge = `<div class="product-badge discount-badge">-${discount}%</div>`;
        }
    }

    // Старая цена
    const oldPriceHTML = product.old_price && product.old_price > product.price
        ? `<span class="price-old">${formatPrice(product.old_price)}</span>`
        : '';

    // Звёзды рейтинга
    const rating = product.seller_rating || 0;
    const reviews = product.seller_reviews || 0;
    const fullStars = Math.round(rating);
    const starsHTML = `
        <div class="product-rating">
            <span class="stars">${'★'.repeat(fullStars)}${'☆'.repeat(5 - fullStars)}</span>
            <span class="rating-num">${rating.toFixed(1)}</span>
            <span class="reviews-count">${reviews}</span>
        </div>
    `;

    // Изображение
    const imageHTML = product.images && product.images.length > 0
        ? `<div class="product-image-main"><img src="${product.images[0].url}" alt=""></div>`
        : `<div class="product-image-main"><div style="height:100%; display:flex; align-items:center; justify-content:center; color:#333;"><i class="${product.icon || 'fas fa-box'}" style="font-size:40px;"></i></div></div>`;

    // Создаем бейджи игры и категории
    const gameName = product.game ? product.game.toUpperCase() : 'GAME';
    const categoryName = product.category === 'accounts' ? 'Аккаунт' : 
                        (product.category === 'uc' ? 'Валюта' : 
                        (product.category === 'boosts' ? 'Буст' : 'Услуга'));

    card.innerHTML = `
        <div class="product-badges-top">
            <span class="badge-game">${gameName}</span>
            <span class="badge-category">${categoryName}</span>
        </div>
        ${premiumBadge}
        ${discountBadge}
        ${imageHTML}
        <div class="product-title">${escapeHTML(product.title)}</div>
        <div class="product-desc">${escapeHTML(product.description || '')}</div>
        ${starsHTML}
        <div class="product-price">
            <div>
                <span class="price-value">${formatPrice(product.price)}</span>
                ${oldPriceHTML}
            </div>
            <button class="buy-btn" data-id="${product.id}">
                <i class="fas fa-shopping-cart"></i>
            </button>
        </div>
    `;

    return card;
}

export function renderProducts(products, container) {
    if (!container) return; // <-- ДОБАВЬ ЭТУ СТРОЧКУ
    container.innerHTML = '';
    // ... остальной код
    if (products.length === 0) {
        container.innerHTML = `<p style="color:#8a99b0;grid-column:1/-1;text-align:center;padding:40px 0;"><i class="fas fa-search" style="font-size:32px;display:block;margin-bottom:12px;opacity:0.5;"></i>Ничего не найдено</p>`;
        return;
    }
    products.forEach(p => container.appendChild(createProductCard(p)));
}

export function renderSellers(sellers, container) {
    if (!container) return; // <-- ДОБАВЬ ЭТУ СТРОЧКУ
    container.innerHTML = '';
    // ... остальной код
    sellers.forEach(s => {
        const card = document.createElement('div');
        card.className = 'seller-card';
        card.innerHTML = `
            <div class="seller-avatar">${s.avatar ? `<img src="${s.avatar}" alt="">` : escapeHTML(s.name.charAt(0))}</div>
            <div class="seller-info">
                <h4>${escapeHTML(s.name)}</h4>
                <p><i class="fas fa-star"></i> ${s.rating} • ${s.deals} сделок</p>
            </div>
        `;
        container.appendChild(card);
    });
}
