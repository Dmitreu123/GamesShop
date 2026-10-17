/* ==========================================================
   Страница сделки /deal.html?id=X
   ========================================================== */

import './auth.js';
import './nav.js';
import { getToken, getUser, isLoggedIn } from './auth.js';
import { escapeHTML, formatPrice, showToast } from './utils.js';

let deal = null;
let product = null;
let partner = null;
let review = null;

/* ---------- Получить deal_id из URL ---------- */

function getDealId() {
    const params = new URLSearchParams(location.search);
    return Number(params.get('id'));
}

/* ---------- Загрузка ---------- */

async function loadDeal() {
    if (!isLoggedIn()) {
        location.href = '/login.html';
        return;
    }

    const id = getDealId();
    if (!id) {
        renderError('Сделка не указана');
        return;
    }

    try {
        const token = getToken();
        const res = await fetch(`/api/deals/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Сделка не найдена');
        const data = await res.json();

        deal = data.deal;
        product = data.product;
        partner = data.partner;
        review = data.review;

        renderDeal();
    } catch (err) {
        renderError(err.message);
    }
}

/* ---------- Ошибка ---------- */

function renderError(msg) {
    document.getElementById('dealMain').innerHTML = `
        <div class="container" style="padding:60px 20px;text-align:center;">
            <i class="fas fa-exclamation-triangle" style="font-size:48px;color:var(--danger);margin-bottom:16px;"></i>
            <h2 style="color:white;margin-bottom:8px;">${escapeHTML(msg)}</h2>
            <a href="/profile.html" class="btn btn-primary" style="margin-top:20px;">
                <i class="fas fa-user"></i> В профиль
            </a>
        </div>
    `;
}

/* ---------- Рендер ---------- */

function renderDeal() {
    // Заголовок
    const headerTitle = deal.status === 'completed'
        ? 'Завершённая сделка'
        : (deal.status === 'pending' ? 'Активная сделка' : 'Отменённая сделка');
    document.getElementById('dealHeaderTitle').textContent = headerTitle;

    // Иконка статуса
    let statusIcon = '⏳';
    let statusColor = '#fbbf24';
    let statusTitle = 'Ожидает подтверждения';
    let statusDesc = '';

    if (deal.status === 'completed') {
        statusIcon = '✅';
        statusColor = '#10b981';
        statusTitle = 'Завершено';
        statusDesc = deal.is_buyer
            ? 'Вы подтвердили получение товара'
            : `Покупатель подтвердил получение. Оплата зачислена на ваш баланс`;
    } else if (deal.status === 'pending') {
        statusIcon = '⏳';
        statusColor = '#fbbf24';
        statusTitle = deal.is_buyer ? 'Ожидает вашего подтверждения' : 'Ожидает подтверждения покупателя';
        statusDesc = deal.is_buyer
            ? 'Проверьте товар и нажмите «Подтвердить получение»'
            : 'Передайте товар покупателю через чат и нажмите «Я выполнил»';
    } else if (deal.status === 'cancelled') {
        statusIcon = '❌';
        statusColor = '#ef4444';
        statusTitle = 'Сделка отменена';
        statusDesc = 'Средства возвращены покупателю';
    }

    const main = document.getElementById('dealMain');

    // Фото товара
    const productImage = product && product.images && product.images.length > 0
        ? `<img src="${product.images[0].url}" alt="">`
        : `<div class="deal-product-icon"><i class="${product?.icon || 'fas fa-box'}"></i></div>`;

    // Партнёр
    const partnerAvatar = partner?.avatar
        ? `<img src="${partner.avatar}" alt="">`
        : escapeHTML((partner?.username || '?')[0].toUpperCase());

    main.innerHTML = `
        <div class="container deal-page">

            <!-- Статус -->
            <div class="deal-status-block" style="border-color: ${statusColor}30; background: ${statusColor}10;">
                <div class="deal-status-icon">${statusIcon}</div>
                <div class="deal-status-title" style="color: ${statusColor};">${statusTitle}</div>
                ${statusDesc ? `<div class="deal-status-desc">${escapeHTML(statusDesc)}</div>` : ''}
            </div>

            <!-- Прогресс-бар -->
            <div class="deal-progress">
                <div class="deal-step ${deal.status === 'pending' ? 'active' : 'done'}">
                    <div class="deal-step-dot">1</div>
                    <div class="deal-step-label">Оплата</div>
                </div>
                <div class="deal-step-line"></div>
                <div class="deal-step ${deal.status === 'completed' ? 'done' : (deal.is_seller ? 'active' : '')}">
                    <div class="deal-step-dot">2</div>
                    <div class="deal-step-label">Выполнение</div>
                </div>
                <div class="deal-step-line"></div>
                <div class="deal-step ${deal.status === 'completed' ? 'done' : ''}">
                    <div class="deal-step-dot">3</div>
                    <div class="deal-step-label">Подтверждение</div>
                </div>
            </div>

            <!-- Партнёр + чат -->
            <div class="deal-partner-row">
                <a href="/profile.html?u=${escapeHTML(partner?.username || '')}" class="deal-partner">
                    <div class="deal-partner-avatar">${partnerAvatar}</div>
                    <div class="deal-partner-info">
                        <div class="deal-partner-role">${deal.is_buyer ? 'Продавец' : 'Покупатель'}</div>
                        <div class="deal-partner-name">${escapeHTML(partner?.username || '—')}</div>
                    </div>
                </a>
                <a href="/chat.html?deal=${deal.id}" class="deal-chat-btn">
                    <i class="fas fa-comments"></i> Чат
                </a>
            </div>

            <!-- Товар -->
            <div class="deal-product-card">
                <div class="deal-product-image">${productImage}</div>
                <div class="deal-product-info">
                    <div class="deal-product-title">${escapeHTML(product?.title || 'Товар удалён')}</div>
                    <div class="deal-product-price">${formatPrice(deal.amount)}</div>
                    <div class="deal-product-status">
                        <i class="fas fa-circle" style="color: ${statusColor}; font-size: 8px;"></i>
                        ${deal.status === 'completed' ? 'Завершено' : (deal.status === 'pending' ? 'В процессе' : 'Отменено')}
                    </div>
                </div>
            </div>

            <!-- Кнопки действий -->
            ${renderActions()}

            <!-- Данные товара (только покупателю) -->
            ${deal.is_buyer && product && product.login ? `
                <div class="deal-section">
                    <div class="deal-section-header">
                        <h3 class="deal-section-title">
                            <i class="fas fa-lock" style="color:#f59e0b;"></i> Данные товара
                        </h3>
                        <button class="deal-data-toggle" id="dataToggle">Показать</button>
                    </div>
                    <div class="deal-data-block" id="dataBlock" style="display:none;">
                        <div class="deal-data-row"><span>Логин:</span> <b>${escapeHTML(product.login)}</b></div>
                        <div class="deal-data-row"><span>Пароль:</span> <b>${escapeHTML(product.password || '—')}</b></div>
                        ${product.account_id ? `<div class="deal-data-row"><span>ID аккаунта:</span> <b>${escapeHTML(product.account_id)}</b></div>` : ''}
                        ${product.comment ? `<div class="deal-data-row"><span>Комментарий:</span> <b>${escapeHTML(product.comment)}</b></div>` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- Отзыв (если оставлен) -->
            ${review ? `
                <div class="deal-section">
                    <h3 class="deal-section-title">Ваш отзыв</h3>
                    <div class="deal-review">
                        <div class="deal-review-stars">
                            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                        </div>
                        ${review.text ? `<div class="deal-review-text">${escapeHTML(review.text)}</div>` : ''}
                    </div>
                </div>
            ` : ''}

        </div>
    `;

    bindEvents();
}

/* ---------- Кнопки действий ---------- */

function renderActions() {
    if (deal.status === 'completed') {
        // Отзыв
        if (deal.is_buyer && !review) {
            return `
                <button class="deal-action-btn primary" id="leaveReviewBtn">
                    <i class="fas fa-star"></i> Оставить отзыв
                </button>
            `;
        }
        return '';
    }

    if (deal.status === 'pending') {
        // Покупатель может подтвердить или отменить
        if (deal.is_buyer) {
            return `
                <button class="deal-action-btn primary" id="confirmBtn">
                    <i class="fas fa-check"></i> Подтвердить получение
                </button>
                <button class="deal-action-btn danger" id="cancelBtn">
                    <i class="fas fa-times"></i> Отменить сделку
                </button>
            `;
        }
        // Продавец — ждёт или отменяет
        return `
            <div class="deal-hint">
                Ожидайте подтверждения от покупателя или отмените сделку
            </div>
            <button class="deal-action-btn danger" id="cancelBtn">
                <i class="fas fa-times"></i> Отменить сделку
            </button>
        `;
    }

    return '';
}

/* ---------- Модалка отзыва ---------- */

function openReviewModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.id = 'dealReviewModal';
    modal.innerHTML = `
        <div class="modal" style="max-width:420px;">
            <button class="modal-close" id="dealReviewClose"><i class="fas fa-times"></i></button>
            <h2 class="modal-title">Оставить отзыв</h2>
            <div class="star-picker" id="starPicker" style="font-size:32px;margin-bottom:14px;display:flex;gap:6px;justify-content:center;">
                <i class="fas fa-star" data-v="1"></i>
                <i class="fas fa-star" data-v="2"></i>
                <i class="fas fa-star" data-v="3"></i>
                <i class="fas fa-star" data-v="4"></i>
                <i class="fas fa-star" data-v="5"></i>
            </div>
            <textarea id="reviewText" rows="4" placeholder="Расскажите о сделке..." maxlength="500"
                style="width:100%;padding:12px;background:#0e141d;border:1px solid var(--border);border-radius:12px;color:white;font-size:15px;resize:vertical;font-family:inherit;"></textarea>
            <button class="btn btn-primary" id="submitDealReview" style="width:100%;justify-content:center;margin-top:14px;">
                Отправить отзыв
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    let rating = 5;
    const updateStars = () => {
        modal.querySelectorAll('#starPicker i').forEach(i => {
            i.style.color = Number(i.dataset.v) <= rating ? '#fbbf24' : '#4a5568';
        });
    };
    updateStars();

    modal.querySelector('#starPicker').onclick = (e) => {
        const s = e.target.closest('i');
        if (!s) return;
        rating = Number(s.dataset.v);
        updateStars();
    };

    const close = () => {
        modal.remove();
        document.body.style.overflow = '';
    };

    modal.querySelector('#dealReviewClose').onclick = close;
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    modal.querySelector('#submitDealReview').onclick = async () => {
        const text = modal.querySelector('#reviewText').value;
        try {
            const token = getToken();
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ deal_id: deal.id, rating, text })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            showToast('Спасибо за отзыв!', 'success');
            close();
            loadDeal();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };
}

/* ---------- Обработчики ---------- */

function bindEvents() {
    // Показать/скрыть данные
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

    // Подтвердить
    document.getElementById('confirmBtn')?.addEventListener('click', async () => {
        if (!confirm('Подтвердить получение товара?\n\nПосле этого продавец получит оплату.')) return;
        try {
            const token = getToken();
            const res = await fetch(`/api/deals/${deal.id}/confirm`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Ошибка');
            showToast('Сделка подтверждена!', 'success');
            loadDeal();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Отменить
    document.getElementById('cancelBtn')?.addEventListener('click', async () => {
        if (!confirm('Отменить сделку?')) return;
        try {
            const token = getToken();
            const res = await fetch(`/api/deals/${deal.id}/cancel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Ошибка');
            showToast('Сделка отменена', 'info');
            loadDeal();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Отзыв
    document.getElementById('leaveReviewBtn')?.addEventListener('click', openReviewModal);
}

/* ---------- Старт ---------- */

document.addEventListener('DOMContentLoaded', loadDeal);
