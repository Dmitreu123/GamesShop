import './auth.js';
import './nav.js';
import { getToken, getUser, isLoggedIn, clearAuth } from './auth.js';
import { escapeHTML, formatPrice, showToast } from './utils.js';

let profileUser = null;
let counts = {};
let isOwner = false;
let currentTab = 'products';
let currentStatus = 'active';

/* ---------- Получить username ---------- */
function getUsername() {
    const params = new URLSearchParams(location.search);
    return params.get('u');
}

/* ---------- Загрузка профиля ---------- */
async function loadProfile() {
    let username = getUsername();

    if (!username) {
        const me = getUser();
        if (me && me.username) {
            username = me.username;
            history.replaceState({}, '', `/profile.html?u=${encodeURIComponent(username)}`);
        } else {
            renderError('Пользователь не указан');
            return;
        }
    }

    try {
        const token = getToken();
        const res = await fetch(`/api/users/${username}/profile`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) throw new Error('Профиль не найден');
        const data = await res.json();
        
        profileUser = data.user;
        counts = data.counts;

        const me = getUser();
        isOwner = me && me.id === profileUser.id;

        // Сохраняем роль для админки
        if (isOwner) {
            localStorage.setItem('games_shop_role', profileUser.role || 'user');
        }

        // Добавляем кнопку Админки в шапку
        const headerAdminBtn = document.getElementById('headerAdminBtn');
        if (headerAdminBtn) {
            if (isOwner && (profileUser.role === 'admin' || profileUser.role === 'moderator' || profileUser.email === 'admin@games.shop')) {
                headerAdminBtn.innerHTML = `<a href="/admin.html" style="color: #ff2e63; font-size: 22px; text-decoration: none;" title="Админ-панель"><i class="fas fa-shield-alt"></i></a>`;
            } else {
                headerAdminBtn.innerHTML = '';
            }
        }

        renderProfile();
        loadTabContent();
    } catch (err) {
        renderError(err.message);
    }
}

/* ---------- Ошибка ---------- */
function renderError(msg) {
    document.getElementById('profileMain').innerHTML = `
        <div class="container" style="padding:60px 20px;text-align:center;">
            <i class="fas fa-user-slash" style="font-size:48px;color:var(--danger);margin-bottom:16px;"></i>
            <h2 style="color:white;margin-bottom:8px;">${escapeHTML(msg)}</h2>
            <a href="/" class="btn btn-primary" style="margin-top:20px;">На главную</a>
        </div>
    `;
}

/* ---------- Рендер профиля ---------- */
function renderProfile() {
    const main = document.getElementById('profileMain');
    
    const avatarHTML = profileUser.avatar
        ? `<img src="${profileUser.avatar}" alt="" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`
        : escapeHTML(profileUser.username[0].toUpperCase());

    const memberSince = new Date(profileUser.created_at).toLocaleDateString('ru-RU', {
        year: 'numeric', month: 'long'
    });

    const roundedRating = Math.round(profileUser.rating || 0);
    const starsHTML = '★'.repeat(roundedRating) + '☆'.repeat(5 - roundedRating);

    main.innerHTML = `
      <div class="container profile-page" style="padding-top: 20px;">
        
        <!-- БЛОК БАЛАНСА -->
        ${isOwner ? `
        <a href="/dashboard.html" class="my-balance-card" style="display: flex; align-items: center; background: linear-gradient(135deg, #1e1e1e, #151515); border: 1px solid #333; border-radius: 16px; padding: 16px 20px; margin-bottom: 20px; text-decoration: none; transition: 0.2s;">
            <div class="balance-icon-wrap" style="width: 44px; height: 44px; background: rgba(33, 150, 243, 0.15); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 20px; margin-right: 15px;">
                <i class="fas fa-wallet"></i>
            </div>
            <div class="balance-info" style="flex: 1;">
                <div class="balance-label" style="color: #888; font-size: 13px; margin-bottom: 2px;">Мой баланс</div>
                <div class="balance-value" style="color: #fff; font-size: 22px; font-weight: 700;">${formatPrice(profileUser.balance || 0)}</div>
            </div>
            <i class="fas fa-chevron-right" style="color: #666;"></i>
        </a>
        ` : ''}

        <!-- КАРТОЧКА ПРОФИЛЯ -->
        <div class="my-profile-header" style="display: flex; align-items: flex-start; gap: 15px; position: relative; background: #1a1a1a; padding: 20px; border-radius: 16px; border: 1px solid #2a2a2a; margin-bottom: 24px;">
            
            <div class="my-avatar" style="width: 70px; height: 70px; flex-shrink: 0; font-size: 28px; border: 2px solid #333; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; overflow: hidden;">
                ${avatarHTML}
            </div>

            <div class="my-info" style="flex: 1; min-width: 0; padding-right: 30px;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
                    <h1 style="margin: 0; font-size: 20px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(profileUser.username)}</h1>
                    ${profileUser.role === 'moderator' ? '<span style="font-size:10px; background:#ff9800; color:#fff; padding:2px 6px; border-radius:4px; white-space:nowrap;">Модер</span>' : ''}
                    ${profileUser.role === 'admin' || profileUser.email === 'admin@games.shop' ? '<span style="font-size:10px; background:#f44336; color:#fff; padding:2px 6px; border-radius:4px; white-space:nowrap;">Админ</span>' : ''}
                </div>
                
                <div style="display: flex; align-items: center; gap: 6px; font-size: 14px; color: #fff; margin-bottom: 6px;">
                    <span style="color: #ffc107; letter-spacing: 2px;">${starsHTML}</span>
                    <b>${(profileUser.rating || 0).toFixed(1)}</b>
                    <a href="/reviews.html?user=${profileUser.username}" style="color: var(--primary); text-decoration: none; margin-left: 4px;">${profileUser.reviews_count || 0} отзывов</a>
                </div>
                
                <div style="color: #888; font-size: 13px;">На Games Shop с ${memberSince}</div>
            </div>

            <button onclick="document.getElementById('profileMenuBtn').click()" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; color: #666; font-size: 20px; cursor: pointer;">
                <i class="fas fa-cog"></i>
            </button>
        </div>

        <!-- ВКЛАДКИ -->
        <div class="profile-tabs-main" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px;">
            <button class="profile-tab-main ${currentTab === 'products' ? 'active' : ''}" data-main-tab="products" style="background: transparent; border: none; color: ${currentTab === 'products' ? '#fff' : '#888'}; font-size: 16px; font-weight: 500; padding: 8px 12px; cursor: pointer; position: relative;">Товары</button>
            <button class="profile-tab-main ${currentTab === 'purchases' ? 'active' : ''}" data-main-tab="purchases" style="background: transparent; border: none; color: ${currentTab === 'purchases' ? '#fff' : '#888'}; font-size: 16px; font-weight: 500; padding: 8px 12px; cursor: pointer; position: relative;">Покупки</button>
            <button class="profile-tab-main ${currentTab === 'sales' ? 'active' : ''}" data-main-tab="sales" style="background: transparent; border: none; color: ${currentTab === 'sales' ? '#fff' : '#888'}; font-size: 16px; font-weight: 500; padding: 8px 12px; cursor: pointer; position: relative;">Продажи</button>
        </div>

        <div class="profile-tabs-sub" id="subTabs">
            ${renderSubTabs()}
        </div>

        <div class="profile-content" id="profileContent">
            <div style="text-align:center;padding:40px 0;color:var(--text-dim);">
                <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
            </div>
        </div>
      </div>
    `;
    bindEvents();
}

/* ---------- Подтабы ---------- */
function renderSubTabs() {
    if (currentTab === 'products') {
        return `
            <button class="profile-tab-sub ${currentStatus === 'active' ? 'active' : ''}" data-sub-status="active">Активные <span class="tab-count">${counts.products_active || 0}</span></button>
            <button class="profile-tab-sub ${currentStatus === 'sold' ? 'active' : ''}" data-sub-status="sold">Завершённые <span class="tab-count">${counts.products_sold || 0}</span></button>
        `;
    }
    if (currentTab === 'purchases') {
        return `
            <button class="profile-tab-sub ${currentStatus === 'active' ? 'active' : ''}" data-sub-status="active">Активные <span class="tab-count">${counts.purchases_active || 0}</span></button>
            <button class="profile-tab-sub ${currentStatus === 'done' ? 'active' : ''}" data-sub-status="done">Завершённые <span class="tab-count">${counts.purchases_done || 0}</span></button>
        `;
    }
    if (currentTab === 'sales') {
        return `
            <button class="profile-tab-sub ${currentStatus === 'active' ? 'active' : ''}" data-sub-status="active">Активные <span class="tab-count">${counts.sales_active || 0}</span></button>
            <button class="profile-tab-sub ${currentStatus === 'done' ? 'active' : ''}" data-sub-status="done">Завершённые <span class="tab-count">${counts.sales_done || 0}</span></button>
        `;
    }
    return '';
}

/* ---------- Загрузка контента ---------- */
async function loadTabContent() {
    const container = document.getElementById('profileContent');
    container.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--text-dim);"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i></div>`;

    try {
        let url = '';
        if (currentTab === 'products') {
            url = `/api/users/${profileUser.username}/products?status=${currentStatus}`;
        } else if (currentTab === 'purchases') {
            url = `/api/users/${profileUser.username}/purchases?status=${currentStatus}`;
        } else if (currentTab === 'sales') {
            url = `/api/users/${profileUser.username}/sales?status=${currentStatus}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (data.length === 0) {
            renderEmpty();
            return;
        }

        if (currentTab === 'products' && currentStatus === 'active') {
            renderProducts(data);
        } else {
            renderDealsList(data);
        }
    } catch (err) {
        container.innerHTML = `<div class="profile-empty">Ошибка загрузки</div>`;
    }
}

/* ---------- Пустое состояние ---------- */
function renderEmpty() {
    const container = document.getElementById('profileContent');
    let emoji = '😳';
    let title = '';
    let subtitle = '';

    if (currentTab === 'products' && currentStatus === 'active') {
        title = 'Нет товаров';
        subtitle = isOwner ? 'У вас пока нет активных товаров' : 'У пользователя пока нет активных товаров';
    } else if (currentTab === 'purchases') {
        emoji = '🛒';
        title = currentStatus === 'active' ? 'Нет активных покупок' : 'Нет завершённых покупок';
    } else if (currentTab === 'sales') {
        emoji = '💰';
        title = currentStatus === 'active' ? 'Нет активных продаж' : 'Нет завершённых продаж';
    }

    container.innerHTML = `
        <div class="profile-empty">
            <div class="empty-emoji">${emoji}</div>
            <div class="empty-title">${title}</div>
            <div class="empty-subtitle">${subtitle}</div>
        </div>
    `;
}

/* ---------- Рендер товаров ---------- */
function renderProducts(list) {
    const container = document.getElementById('profileContent');
    container.innerHTML = `
        <div class="profile-products-grid">
            ${list.map(p => `
                <a href="/product.html?id=${p.product_id || p.id}" class="profile-product-card">
                    <div class="profile-product-image">
                        ${p.image 
                            ? `<img src="${p.image}" alt="">` 
                            : `<div class="profile-product-icon"><i class="${p.icon || 'fas fa-box'}"></i></div>`
                        }
                        ${p.is_premium ? '<div class="profile-product-premium">🚀</div>' : ''}
                        ${p.views ? `<div class="profile-product-views"><i class="fas fa-eye"></i> ${p.views}</div>` : ''}
                    </div>
                    <div class="profile-product-title">${escapeHTML(p.title)}</div>
                    <div class="profile-product-price">${formatPrice(p.price || 0)}</div>
                </a>
            `).join('')}
        </div>
    `;
}

/* ---------- Рендер сделок ---------- */
function renderDealsList(list) {
    const container = document.getElementById('profileContent');
    container.innerHTML = `
        <div class="profile-deals-list">
            ${list.map(d => {
                const counterparty = currentTab === 'purchases' ? d.seller_name : d.buyer_name;
                const roleLabel = currentTab === 'purchases' ? 'Продавец' : 'Покупатель';

                return `
                    <div class="profile-deal-card" data-deal-id="${d.deal_id}">
                        <div class="profile-deal-image">
                            ${d.image ? `<img src="${d.image}" alt="">` : `<div class="profile-product-icon"><i class="fas fa-box"></i></div>`}
                        </div>
                        <div class="profile-deal-info">
                            <div class="profile-deal-title">${escapeHTML(d.title)}</div>
                            <div class="profile-deal-meta">${roleLabel}: <b>${escapeHTML(counterparty || '—')}</b></div>
                            <div class="profile-deal-meta-small">${new Date(d.created_at).toLocaleDateString('ru-RU')}</div>
                        </div>
                        <div class="profile-deal-right">
                            <div class="profile-deal-price">${formatPrice(d.amount)}</div>
                            <span class="profile-deal-status ${d.status === 'completed' ? 'status-completed' : ''}">${d.status === 'completed' ? 'Завершено' : 'Активно'}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.querySelectorAll('.profile-deal-card').forEach(card => {
        card.onclick = () => {
            const dealId = card.dataset.dealId;
            if (dealId) location.href = `/deal.html?id=${dealId}`;
        };
    });
}

/* ---------- События ---------- */
function bindEvents() {
    document.querySelectorAll('.profile-tab-main').forEach(tab => {
        tab.onclick = () => {
            currentTab = tab.dataset.mainTab;
            currentStatus = 'active';
            renderProfile();
            loadTabContent();
        };
    });

    bindSubTabs();
}

function bindSubTabs() {
    document.querySelectorAll('.profile-tab-sub').forEach(tab => {
        tab.onclick = () => {
            currentStatus = tab.dataset.subStatus;
            renderProfile();
            loadTabContent();
        };
    });
}

/* ---------- Меню (шторка) ---------- */
function initProfileMenu() {
    const menuBtn = document.getElementById('profileMenuBtn');
    const menuOverlay = document.getElementById('profileMenu');
    const menuClose = document.getElementById('profileMenuClose');

    if (menuBtn && menuOverlay && menuClose) {
        menuBtn.onclick = () => {
            menuOverlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            
            const me = getUser();
            if (me) {
                document.getElementById('menuEmail').textContent = me.email || '—';
                const avatarEl = document.getElementById('menuAvatar');
                if (me.avatar) {
                    avatarEl.innerHTML = `<img src="${me.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                } else {
                    avatarEl.innerHTML = me.username[0].toUpperCase();
                }
            }
        };
        menuClose.onclick = () => {
            menuOverlay.classList.remove('open');
            document.body.style.overflow = '';
        };
    }

    document.getElementById('menuLogout')?.addEventListener('click', () => {
        if (confirm('Выйти из профиля?')) {
            clearAuth();
            location.href = '/login.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    initProfileMenu();
});
