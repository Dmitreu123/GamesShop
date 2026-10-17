/* ==========================================================
   Страница товара /product.html?id=X
   ========================================================== */

import './auth.js';
import './nav.js';
import { getToken, isLoggedIn, getUser } from './auth.js';
import { escapeHTML, formatPrice, showToast } from './utils.js';
import { deals } from './deals.js';

let product = null;
let isOwner = false;

/* ---------- Получить ID из URL ---------- */

function getProductId() {
    const params = new URLSearchParams(location.search);
    return Number(params.get('id'));
}

/* ---------- Загрузка товара ---------- */

async function loadProduct() {
    const id = getProductId();
    if (!id) {
        renderError('Товар не указан');
        return;
    }

    try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error('Товар не найден');
product = await res.json();
renderProduct();

// Счётчик просмотров (только для чужих товаров)
const me = getUser();
if (!me || me.id !== product.seller_id) {
    fetch(`/api/products/${product.id}/view`, { method: 'POST' }).catch(() => {});
}
    } catch (err) {
        renderError(err.message);
    }
}

/* ---------- Ошибка ---------- */

function renderError(msg) {
    document.getElementById('productMain').innerHTML = `
        <div class="container" style="padding:60px 20px;text-align:center;">
            <i class="fas fa-exclamation-triangle" style="font-size:48px;color:var(--danger);margin-bottom:16px;"></i>
            <h2 style="color:white;margin-bottom:8px;">${escapeHTML(msg)}</h2>
            <p style="color:var(--text-dim);margin-bottom:24px;">Возможно, товар был удалён или продан</p>
            <a href="/" class="btn btn-primary"><i class="fas fa-home"></i> На главную</a>
        </div>
    `;
}

/* ---------- Рендер страницы ---------- */

function renderProduct() {
    const me = getUser();
isOwner = me && me.id === product.seller_id;

    const main = document.getElementById('productMain');
    main.innerHTML = `
        <div class="container product-page">
            <!-- Галерея -->
            <div class="product-gallery-block">
                <div class="gallery-main" id="galleryMain">
                    ${product.images && product.images.length > 0
                        ? `<img src="${product.images[0].url}" alt="" id="galleryBigImg">`
                        : `<div class="gallery-placeholder"><i class="${product.icon || 'fas fa-box'}"></i></div>`
                    }
                    ${product.is_premium ? '<div class="gallery-premium">🚀 ТОП</div>' : ''}
                </div>
                ${product.images && product.images.length > 1 ? `
                    <div class="gallery-thumbs">
                        ${product.images.map((img, i) => `
                            <div class="gallery-thumb ${i === 0 ? 'active' : ''}" data-idx="${i}">
                                <img src="${img.url}" alt="">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>

            <!-- Основная информация -->
            <div class="product-info-block">
                <h1 class="product-page-title">${escapeHTML(product.title)}</h1>

                <div class="product-rating-row">
                    ${renderStars(product.seller?.rating || 0)}
                    <span class="product-rating-num">${(product.seller?.rating || 0).toFixed(1)}</span>
                    <span class="product-rating-count">${product.seller?.reviews_count || 0} отзывов</span>
                </div>

                <div class="product-price-row">
                    <span class="product-page-price">${formatPrice(product.price)}</span>
                    ${product.old_price && product.old_price > product.price
                        ? `<span class="product-page-old">${formatPrice(product.old_price)}</span>
                           <span class="product-page-discount">-${Math.round((1 - product.price / product.old_price) * 100)}%</span>`
                        : ''
                    }
                </div>

${!isOwner ? `
    <button class="product-buy-btn" id="buyBtn">
        <i class="fas fa-shopping-cart"></i> Купить
    </button>
` : `
    <div class="seller-panel">
        <div class="seller-status">
            <div class="seller-status-label">В продаже</div>
            <div class="seller-status-time">
                ${product.premium_until
                    ? `Премиум до ${new Date(product.premium_until).toLocaleDateString('ru-RU')}`
                    : 'Обычное размещение'
                }
            </div>
        </div>

        <div class="seller-views">
            <i class="fas fa-eye"></i>
            <span id="viewsCount">${product.views || 0}</span> просмотров
        </div>

        ${!product.is_premium ? `
            <button class="seller-btn-boost" id="boostBtn">
                <i class="fas fa-rocket"></i> Повысить статус
            </button>
        ` : `
            <div class="seller-premium-active">
                <i class="fas fa-rocket"></i> Премиум активен
            </div>
        `}

        <div class="seller-autoboost">
            <div class="seller-autoboost-info">
                <div class="seller-autoboost-title">
                    <i class="fas fa-sync-alt"></i> Оставлять в продаже
                </div>
                <div class="seller-autoboost-desc">Авто-поднятие раз в 24 часа</div>
            </div>
            <label class="sell-switch">
                <input type="checkbox" id="autoBoostToggle" ${product.auto_boost ? 'checked' : ''}>
                <span class="sell-switch-slider"></span>
            </label>
        </div>

        <button class="seller-btn-edit" id="editBtn">
            <i class="fas fa-pen"></i> Редактировать
        </button>

        <button class="seller-btn-remove" id="removeBtn">
            <i class="fas fa-trash"></i> Снять с продажи
        </button>
    </div>
`}

                <!-- Гарантия -->
                <div class="product-guarantee">
                    <i class="fas fa-shield-alt"></i>
                    <div>
                        <div class="guarantee-title">Гарантия Games Shop</div>
                        <div class="guarantee-desc">Возврат средств, если товар не соответствует описанию</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="container">
            <!-- Описание -->
            <section class="product-section">
                <h2 class="product-section-title">Описание</h2>
                ${product.subcategory ? `
                    <div class="product-subcategory">
                        <span class="subcategory-label">Тип</span>
                        <span class="subcategory-value">${escapeHTML(product.subcategory)}</span>
                    </div>
                ` : ''}
                <div class="product-description-text">
                    ${escapeHTML(product.description || 'Описание отсутствует')}
                </div>
            </section>

            <!-- Способ передачи -->
            <section class="product-section">
                <h2 class="product-section-title">📦 Способ передачи</h2>
                <div class="product-transfer">
                    <div class="transfer-title">
                        ${product.transfer_type === 'full' ? 'Полный доступ' : 'Частичный доступ'}
                    </div>
                    <div class="transfer-desc">
                        ${product.transfer_type === 'full'
                            ? 'Личный аккаунт с доступом ко всем привязкам'
                            : 'Без смены некоторых привязок'
                        }
                    </div>
                </div>
            </section>

            <!-- Инструкция после продажи -->
            <section class="product-section">
                <h2 class="product-section-title">
                    <i class="fas fa-info-circle" style="color:var(--primary);"></i>
                    Инструкция после продажи
                </h2>
                <div class="product-instructions">
                    <ul>
                        <li><b>Удержание средств:</b> средства удерживаются на стороне площадки для безопасности сделки.</li>
                        <li><b>Выполнение заказа:</b> продавец должен предоставить товар в течение 24 часов.</li>
                        <li><b>Проверка товара:</b> если всё в порядке, покупатель подтверждает получение.</li>
                        <li><b>Завершение сделки:</b> после подтверждения оплата перечисляется продавцу.</li>
                    </ul>
                </div>
            </section>

<!-- Приватные данные (только для продавца) -->
${isOwner ? `
    <section class="product-section">
        <div class="product-section-header">
            <h2 class="product-section-title">
                <i class="fas fa-lock" style="color:#f59e0b;"></i>
                Данные товара
            </h2>
            <button class="product-data-toggle" id="dataToggle">Показать</button>
        </div>
        <div class="product-data-block" id="dataBlock" style="display:none;">
            <div class="data-row"><span>Логин:</span> <b>${escapeHTML(product.login || '—')}</b></div>
            <div class="data-row"><span>Пароль:</span> <b>${escapeHTML(product.password || '—')}</b></div>
            <div class="data-row"><span>ID аккаунта:</span> <b>${escapeHTML(product.account_id || '—')}</b></div>
            ${product.comment ? `<div class="data-row"><span>Комментарий:</span> <b>${escapeHTML(product.comment)}</b></div>` : ''}
            <div class="data-hint">
                <i class="fas fa-lock"></i> Данные шифруются и будут переданы покупателю после оплаты.
            </div>
        </div>
    </section>
` : ''}

            <!-- Продавец -->
            ${product.seller ? `
                <section class="product-section">
                    <h2 class="product-section-title">Продавец</h2>
                    <a href="/profile.html?u=${escapeHTML(product.seller.username)}" class="product-seller-card">
                        <div class="seller-avatar-lg">
                            ${product.seller.avatar
                                ? `<img src="${product.seller.avatar}" alt="">`
                                : escapeHTML(product.seller.username[0].toUpperCase())
                            }
                        </div>
                        <div class="seller-info-lg">
                            <div class="seller-name-lg">${escapeHTML(product.seller.username)}</div>
                            <div class="seller-rating-lg">
                                ${renderStars(product.seller.rating || 0)}
                                <span>${(product.seller.rating || 0).toFixed(1)}</span>
                                <span class="seller-reviews-lg">${product.seller.reviews_count || 0} отзывов</span>
                            </div>
                        </div>
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </section>
            ` : ''}

            <!-- Отзывы -->
            ${product.reviews && product.reviews.length > 0 ? `
                <section class="product-section">
                    <div class="product-section-header">
                        <h2 class="product-section-title">Отзывы о продавце</h2>
                        <a href="/reviews.html?u=${escapeHTML(product.seller.username)}" class="product-section-link">
                            Все отзывы <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                    <div class="reviews-list">
                        ${product.reviews.map(r => `
                            <div class="review-card">
                                <div class="review-header">
                                    <div class="review-author">
                                        <div class="review-avatar">
                                            ${r.author_avatar
                                                ? `<img src="${r.author_avatar}" alt="">`
                                                : escapeHTML(r.author_name[0].toUpperCase())
                                            }
                                        </div>
                                        <div>
                                            <div class="review-author-name">${escapeHTML(r.author_name)}</div>
                                            <div class="review-stars">${renderStars(r.rating)}</div>
                                        </div>
                                    </div>
                                    <div class="review-date">${new Date(r.created_at).toLocaleDateString('ru-RU')}</div>
                                </div>
                                ${r.text ? `<div class="review-text">${escapeHTML(r.text)}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </section>
            ` : ''}

            <!-- Похожие товары -->
            ${product.similar && product.similar.length > 0 ? `
                <section class="product-section">
                    <h2 class="product-section-title">🔍 Похожие товары</h2>
                    <div class="similar-grid">
                        ${product.similar.map(p => `
                            <a href="/product.html?id=${p.id}" class="similar-card">
                                <div class="similar-image">
                                    ${p.image
                                        ? `<img src="${p.image}" alt="">`
                                        : `<div class="similar-icon"><i class="${p.icon || 'fas fa-box'}"></i></div>`
                                    }
                                    ${p.is_premium ? '<div class="similar-premium">🚀</div>' : ''}
                                </div>
                                <div class="similar-title">${escapeHTML(p.title)}</div>
                                <div class="similar-price">
                                    ${formatPrice(p.price)}
                                    ${p.old_price && p.old_price > p.price
                                        ? `<span class="similar-old">${formatPrice(p.old_price)}</span>`
                                        : ''
                                    }
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </section>
            ` : ''}
        </div>
    `;

    bindEvents();
}

/* ---------- Звёзды ---------- */

function renderStars(rating) {
    const full = Math.round(rating);
    return `<span class="stars-inline">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span>`;
}

/* ---------- События ---------- */

function bindEvents() {
    // Галерея
    document.querySelectorAll('.gallery-thumb').forEach(thumb => {
        thumb.onclick = () => {
            const idx = Number(thumb.dataset.idx);
            const img = product.images[idx];
            const bigImg = document.getElementById('galleryBigImg');
            if (bigImg) bigImg.src = img.url;
            document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        };
    });

    // Кнопка «Купить»
    const buyBtn = document.getElementById('buyBtn');
    if (buyBtn) {
        buyBtn.onclick = async () => {
            if (!isLoggedIn()) {
                localStorage.setItem('return_to', `/product.html?id=${product.id}`);
                location.href = '/login.html';
                return;
            }

            if (!confirm(`Купить "${product.title}" за ${formatPrice(product.price)}?\n\nДеньги будут в блокировке до подтверждения.`)) return;

            buyBtn.disabled = true;
            buyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Оформление...';

            try {
                await deals.create(product.id);
                showToast('Сделка создана! Проверьте вкладку «Сделки»', 'success');
                setTimeout(() => location.href = '/dashboard.html', 1200);
            } catch (err) {
                showToast(err.message, 'error');
                buyBtn.disabled = false;
                buyBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Купить';
            }
        };
    }

// ===== Seller view =====
if (isOwner) {
    document.getElementById('boostBtn')?.addEventListener('click', async () => {
        if (!confirm('Поднять товар в топ?')) return;
        try {
            const token = getToken();
            const res = await fetch(`/api/products/${product.id}/boost`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Ошибка');
            showToast('Товар поднят в топ!', 'success');
            setTimeout(() => location.reload(), 800);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    document.getElementById('autoBoostToggle')?.addEventListener('change', async (e) => {
        try {
            const token = getToken();
            const res = await fetch(`/api/products/${product.id}/auto-boost`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast(data.auto_boost ? 'Авто-поднятие включено' : 'Авто-поднятие отключено', 'success');
        } catch (err) {
            showToast(err.message, 'error');
            e.target.checked = !e.target.checked;
        }
    });

    document.getElementById('editBtn')?.addEventListener('click', () => {
        location.href = `/dashboard.html?sell=${product.game}&edit=${product.id}`;
    });

    document.getElementById('removeBtn')?.addEventListener('click', async () => {
        if (!confirm('Снять товар с продажи?')) return;
        try {
            const token = getToken();
            const res = await fetch(`/api/products/${product.id}/remove`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Ошибка');
            showToast('Товар снят с продажи', 'success');
            setTimeout(() => location.href = '/dashboard.html', 1000);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    document.getElementById('dataToggle')?.addEventListener('click', () => {
        const block = document.getElementById('dataBlock');
        const btn = document.getElementById('dataToggle');
        if (block.style.display === 'none') {
            block.style.display = 'block';
            btn.textContent = 'Скрыть';
        } else {
            block.style.display = 'none';
            btn.textContent = 'Показать';
        }
    });
}


    // Поиск в шапке
    document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            location.href = `/?q=${encodeURIComponent(e.target.value)}`;
        }
    });
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', loadProduct);
