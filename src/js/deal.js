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

/* ---------- Универсальная функция показа модалки ---------- */
function showDealModal(title, text, iconClass, onConfirm) {
    const modal = document.getElementById('dealModal');
    const titleEl = document.getElementById('dealModalTitle');
    const textEl = document.getElementById('dealModalText');
    const iconEl = document.getElementById('dealModalIcon');
    const confirmBtn = document.getElementById('dealModalConfirmBtn');
    const cancelBtn = document.getElementById('dealModalCancelBtn');

    titleEl.textContent = title;
    textEl.innerHTML = text;
    iconEl.innerHTML = `<i class="fas ${iconClass}"></i>`;
    
    confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        await onConfirm();
        modal.style.display = 'none';
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'ОК';
    };

    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
}

/* ---------- Рендер ---------- */
function renderDeal() {
    const headerTitle = deal.status === 'completed'
        ? 'Завершённая сделка'
        : (deal.status === 'pending' || deal.status === 'waiting_confirmation' ? 'Активная сделка' : 'Отменённая сделка');
    document.getElementById('dealHeaderTitle').textContent = headerTitle;

    let statusIcon = '⏳';
    let statusColor = '#fbbf24';
    let statusText = 'В процессе';
    
    if (deal.status === 'completed') {
        statusIcon = '✅';
        statusColor = '#4caf50';
        statusText = 'Завершено';
    } else if (deal.status === 'cancelled') {
        statusIcon = '❌';
        statusColor = '#f44336';
        statusText = 'Отменено';
    }

    const productImage = product && product.image 
        ? `<img src="${product.image}" alt="">` 
        : `<div style="width:100%;height:100%;background:#1e1e1e;display:flex;align-items:center;justify-content:center;color:#555;"><i class="fas fa-box fa-2x"></i></div>`;

    document.getElementById('dealMain').innerHTML = `
        <div class="container" style="padding-bottom: 100px;">
            
            <!-- Статус бар -->
            <div style="background: ${statusColor}20; border: 1px solid ${statusColor}; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 20px;">
                <div style="font-size: 40px; margin-bottom: 10px;">${statusIcon}</div>
                <h2 style="color: ${statusColor}; margin: 0 0 5px 0; font-size: 20px;">${statusText}</h2>
                <p style="color: #aaa; margin: 0; font-size: 14px;">
                    ${deal.status === 'completed' ? 'Покупатель подтвердил получение. Оплата зачислена на ваш баланс' : 'Проверьте товар и нажмите «Подтвердить получение»'}
                </p>
            </div>

            <!-- Шаги -->
            <div class="deal-steps" style="display:flex; justify-content:space-between; margin-bottom: 20px; padding: 0 10px;">
                <div class="step ${deal.status !== 'cancelled' ? 'active' : ''}" style="text-align:center; color: #fff;">
                    <div style="width:30px;height:30px;border-radius:50%;background:${deal.status !== 'cancelled' ? '#4caf50' : '#555'};margin:0 auto 5px;display:flex;align-items:center;justify-content:center;font-weight:bold;">1</div>
                    <small>Оплата</small>
                </div>
                <div class="step ${deal.status === 'waiting_confirmation' || deal.status === 'completed' ? 'active' : ''}" style="text-align:center; color: #fff;">
                    <div style="width:30px;height:30px;border-radius:50%;background:${deal.status === 'waiting_confirmation' || deal.status === 'completed' ? '#4caf50' : '#555'};margin:0 auto 5px;display:flex;align-items:center;justify-content:center;font-weight:bold;">2</div>
                    <small>Выполнение</small>
                </div>
                <div class="step ${deal.status === 'completed' ? 'active' : ''}" style="text-align:center; color: #fff;">
                    <div style="width:30px;height:30px;border-radius:50%;background:${deal.status === 'completed' ? '#4caf50' : '#555'};margin:0 auto 5px;display:flex;align-items:center;justify-content:center;font-weight:bold;">3</div>
                    <small>Подтверждение</small>
                </div>
            </div>

            <!-- Партнер -->
            <div class="deal-partner-card" style="display:flex; align-items:center; background:#1a1a1a; padding:15px; border-radius:12px; margin-bottom:20px; border:1px solid #333;">
                <div style="width:50px;height:50px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;margin-right:15px;">
                    ${partner.avatar ? `<img src="${partner.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : (partner.username ? partner.username[0].toUpperCase() : '?')}
                </div>
                <div style="flex:1;">
                    <div style="color:#888;font-size:12px;">${deal.is_buyer ? 'Продавец' : 'Покупатель'}</div>
                    <div style="color:#fff;font-weight:bold;font-size:16px;">${escapeHTML(partner.username)}</div>
                </div>
                <a href="/chat.html?deal=${deal.id}" class="btn btn-primary" style="background:#7c3aed;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-weight:bold;">
                    <i class="fas fa-comments"></i> Чат
                </a>
            </div>

            <!-- Товар -->
            <div class="deal-product-card" style="display:flex; align-items:center; background:#1a1a1a; padding:15px; border-radius:12px; margin-bottom:20px; border:1px solid #333;">
                <div class="deal-product-image" style="width:80px;height:80px;border-radius:10px;overflow:hidden;margin-right:15px;flex-shrink:0;">
                    ${productImage}
                </div>
                <div class="deal-product-info" style="flex:1;">
                    <div class="deal-product-title" style="color:#fff;font-weight:bold;font-size:16px;margin-bottom:5px;">${escapeHTML(product.title)}</div>
                    <div class="deal-product-price" style="color:#00e5ff;font-weight:bold;font-size:18px;">${formatPrice(deal.amount)}</div>
                    <div class="deal-product-status" style="color:#888;font-size:12px;margin-top:5px;">
                        <i class="fas fa-circle" style="color: ${statusColor};font-size:8px;"></i> ${statusText}
                    </div>
                </div>
            </div>

            <!-- Кнопки действий -->
            ${renderActions()}

            <!-- Данные товара -->
            ${deal.is_buyer && product && product.login ? `
                <div class="deal-section" style="margin-top:20px;">
                    <div class="deal-section-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <h3 class="deal-section-title" style="color:#fff;margin:0;font-size:16px;"><i class="fas fa-lock" style="color:#ff9800;"></i> Данные товара</h3>
                        <button class="deal-data-toggle" id="dataToggle" style="background:none;border:none;color:#00e5ff;cursor:pointer;">Показать</button>
                    </div>
                    <div class="deal-data-block" id="dataBlock" style="display:none; background:#121212; padding:15px; border-radius:10px; border:1px solid #333;">
                        <div class="deal-data-row" style="margin-bottom:10px;"><span style="color:#888;">Логин:</span> <span style="color:#fff;">${escapeHTML(product.login)}</span></div>
                        <div class="deal-data-row" style="margin-bottom:10px;"><span style="color:#888;">Пароль:</span> <span style="color:#fff;">${escapeHTML(product.password)}</span></div>
                        ${product.account_id ? `<div class="deal-data-row" style="margin-bottom:10px;"><span style="color:#888;">ID:</span> <span style="color:#fff;">${escapeHTML(product.account_id)}</span></div>` : ''}
                        ${product.comment ? `<div class="deal-data-row"><span style="color:#888;">Комментарий:</span> <span style="color:#fff;">${escapeHTML(product.comment)}</span></div>` : ''}
                    </div>
                </div>
            ` : ''}

            <!-- Отзыв -->
            ${review ? `
                <div class="deal-section" style="margin-top:20px;">
                    <h3 class="deal-section-title" style="color:#fff;font-size:16px;margin-bottom:10px;">Ваш отзыв</h3>
                    <div class="deal-review" style="background:#1a1a1a;padding:15px;border-radius:10px;border:1px solid #333;">
                        <div class="deal-review-stars" style="color:#ffc107;font-size:18px;margin-bottom:5px;">
                            ${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}
                        </div>
                        ${review.text ? `<div class="deal-review-text" style="color:#ddd;font-size:14px;">${escapeHTML(review.text)}</div>` : ''}
                    </div>
                </div>
            ` : ''}

        </div>
    `;

    bindEvents();
}

/* ---------- Кнопки действий ---------- */
function renderActions() {
    const myRole = localStorage.getItem('games_shop_role');
    if (myRole === 'admin' || myRole === 'moderator') {
        return `<div style="text-align:center; color:#ff9800; font-weight:bold; padding:15px; background:rgba(255,152,0,0.1); border-radius:8px; margin-bottom:15px;">👑 Вы в режиме администратора</div>`;
    }

    if (!deal) return '';

    if (deal.status === 'pending' || deal.status === 'waiting_confirmation') {
        if (deal.is_buyer) {
            return `
                <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:15px;">
                    <button class="deal-action-btn" id="disputeBtn" style="background: transparent; border: 1px solid #ff2e63; color: #ff2e63; width: 100%; padding: 14px; border-radius: 8px; font-weight: bold; cursor: pointer;">
                        <i class="fas fa-exclamation-triangle"></i> Открыть спор
                    </button>
                    <button class="deal-action-btn primary" id="confirmBtn" style="width: 100%; padding: 14px; background: #00e5ff; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size:16px;">
                        <i class="fas fa-check"></i> Подтвердить получение
                    </button>
                </div>
            `;
        }
        
        if (deal.is_seller) {
            if (deal.status === 'pending') {
                return `
                    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:15px;">
                        <button class="deal-action-btn danger" id="cancelBtn" style="width: 100%; padding: 14px; background: transparent; border: 1px solid #f44336; color: #f44336; border-radius: 8px; font-weight: bold; cursor: pointer;">
                            <i class="fas fa-times"></i> Отменить сделку
                        </button>
                        <button class="deal-action-btn primary" id="sellerDoneBtn" style="width: 100%; padding: 14px; background: #00e5ff; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size:16px;">
                            <i class="fas fa-paper-plane"></i> Я выполнил
                        </button>
                    </div>
                `;
            } else {
                return `
                    <div style="text-align:center; padding:15px; background:rgba(255,193,7,0.1); border:1px solid #ffc107; border-radius:8px; color:#ffc107; font-size:14px; margin-bottom:15px;">
                        <i class="fas fa-hourglass-half"></i> Ожидайте подтверждения от покупателя
                    </div>
                `;
            }
        }
    }

    if (deal.status === 'completed') {
        return `
            <div style="text-align:center; color:#4caf50; font-weight:bold; padding:15px; background:rgba(76,175,80,0.1); border-radius:8px; margin-bottom:10px;">✅ Сделка успешно завершена</div>
            <button class="deal-action-btn" id="disputeBtn" style="background: transparent; border: 1px solid #ff2e63; color: #ff2e63; width: 100%; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom:15px;">
                <i class="fas fa-exclamation-triangle"></i> Открыть спор (возврат)
            </button>
        `;
    }

    return '';
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
    document.getElementById('confirmBtn')?.addEventListener('click', () => {
        showDealModal('Подтвердить получение?', 'После этого продавец получит оплату, а сделка будет завершена.', 'fa-check-circle', async () => {
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
    });

    // Отменить
    document.getElementById('cancelBtn')?.addEventListener('click', () => {
        showDealModal('Отменить сделку?', 'Деньги вернутся покупателю, а товар снова станет активным.', 'fa-times-circle', async () => {
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
    });

    // Открыть спор
    document.getElementById('disputeBtn')?.addEventListener('click', () => {
        showDealModal('Открыть спор?', 'Деньги останутся замороженными до решения администратора.', 'fa-exclamation-triangle', async () => {
            try {
                const token = getToken();
                const res = await fetch(`/api/deals/${deal.id}/dispute`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Ошибка');
                showToast('Спор открыт!', 'success');
                loadDeal();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    });

    // Я выполнил (Продавец)
    document.getElementById('sellerDoneBtn')?.addEventListener('click', () => {
        showDealModal('Подтвердить выполнение?', 'Убедитесь, что вы передали товар. Покупатель получит уведомление.', 'fa-paper-plane', async () => {
            try {
                const token = getToken();
                const res = await fetch(`/api/deals/${deal.id}/seller-done`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Ошибка');
                showToast('Статус обновлен!', 'success');
                loadDeal();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    });
}

// Запуск
document.addEventListener('DOMContentLoaded', loadDeal);
