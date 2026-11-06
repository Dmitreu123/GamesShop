// ====================================================


/* ==========================================================
   Публичный профиль /profile.html?u=username
   ========================================================== */

import './auth.js';
import './nav.js';
import { getUser, isLoggedIn, getToken } from './auth.js';
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

// Если в ссылке нет ?u=..., берем ник из текущего залогиненного пользователя
if (!username) {
    const me = getUser();
    if (me && me.username) {
        username = me.username;
        // Подменяем ссылку в браузере, чтобы было красиво
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
            <a href="/" class="btn btn-primary" style="margin-top:20px;"><i class="fas fa-home"></i> На главную</a>
        </div>
    `;
}

/* ---------- Рендер профиля ---------- */

function renderProfile() {
    const main = document.getElementById('profileMain');
    const me = getUser();

    const avatarHTML = profileUser.avatar
        ? `<img src="${profileUser.avatar}" alt="">`
        : escapeHTML(profileUser.username[0].toUpperCase());

    const memberSince = new Date(profileUser.created_at).toLocaleDateString('ru-RU', {
        year: 'numeric', month: 'long'
    });

    const roundedRating = Math.round(profileUser.rating || 0);

main.innerHTML = `
  <div class="container profile-page" style="padding-top: 20px;">
    
    <!-- НОВЫЙ БЛОК БАЛАНСА -->
<!-- НОВАЯ КАРТОЧКА ПРОФИЛЯ -->
<div class="my-profile-header" style="display: flex; align-items: flex-start; gap: 15px; position: relative; background: #1a1a1a; padding: 20px; border-radius: 16px; border: 1px solid #2a2a2a; margin-bottom: 24px;">
    
    <!-- Аватарка -->
    <div class="my-avatar" style="width: 70px; height: 70px; flex-shrink: 0; font-size: 28px; border: 2px solid #333;">
        ${avatarHTML}
    </div>

    <!-- Информация -->
    <div class="my-info" style="flex: 1; min-width: 0; padding-right: 30px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
            <h1 style="margin: 0; font-size: 20px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(profileUser.username)}</h1>
            ${profileUser.role === 'moderator' ? '<span style="font-size:10px; background:#ff9800; color:#fff; padding:2px 6px; border-radius:4px; white-space:nowrap;">Модер</span>' : ''}
            ${profileUser.role === 'admin' || profileUser.email === 'admin@games.shop' ? '<span style="font-size:10px; background:#f44336; color:#fff; padding:2px 6px; border-radius:4px; white-space:nowrap;">Админ</span>' : ''}
        </div>
        
        <div style="display: flex; align-items: center; gap: 6px; font-size: 14px; color: #fff; margin-bottom: 6px;">
            <span style="color: #ffc107;">★</span> 
            <b>${(profileUser.rating || 0).toFixed(1)}</b>
            <a href="/reviews.html?user=${profileUser.username}" style="color: var(--primary); text-decoration: none; margin-left: 4px;">${profileUser.reviews_count || 0} отзывов</a>
        </div>
        
        <div style="color: #888; font-size: 13px;">На Games Shop с ${memberSince}</div>
    </div>

    <!-- Кнопка настроек (шестеренка) -->
    <button onclick="document.getElementById('profileMenuBtn').click()" style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; color: #666; font-size: 20px; cursor: pointer;">
        <i class="fas fa-cog"></i>
    </button>
</div>

    <!-- ВКЛАДКИ (Оставили как было, но стилизуем через CSS) -->
    <div class="profile-tabs-main">
        <button class="profile-tab-main ${currentTab === 'products' ? 'active' : ''}" data-main-tab="products">Товары</button>
        <button class="profile-tab-main ${currentTab === 'purchases' ? 'active' : ''}" data-main-tab="purchases">Покупки</button>
        <button class="profile-tab-main ${currentTab === 'sales' ? 'active' : ''}" data-main-tab="sales">Продажи</button>
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
            <button class="profile-tab-sub ${currentStatus === 'active' ? 'active' : ''}" data-sub-status="active">
                Активные <span class="tab-count">${counts.products_active || 0}</span>
            </button>
            <button class="profile-tab-sub ${currentStatus === 'sold' ? 'active' : ''}" data-sub-status="sold">
                Завершённые <span class="tab-count">${counts.products_sold || 0}</span>
            </button>
        `;
    }
    if (currentTab === 'purchases') {
        return `
            <button class="profile-tab-sub ${currentStatus === 'active' ? 'active' : ''}" data-sub-status="active">
                Активные <span class="tab-count">${counts.purchases_active || 0}</span>
            </button>
            <button class="profile-tab-sub ${currentStatus === 'done' ? 'active' : ''}" data-sub-status="done">
                Завершённые <span class="tab-count">${counts.purchases_done || 0}</span>
            </button>
        `;
    }
    if (currentTab === 'sales') {
        return `
            <button class="profile-tab-sub ${currentStatus === 'active' ? 'active' : ''}" data-sub-status="active">
                Активные <span class="tab-count">${counts.sales_active || 0}</span>
            </button>
            <button class="profile-tab-sub ${currentStatus === 'done' ? 'active' : ''}" data-sub-status="done">
                Завершённые <span class="tab-count">${counts.sales_done || 0}</span>
            </button>
        `;
    }
    return '';
}

/* ---------- Загрузка содержимого таба ---------- */

async function loadTabContent() {
    const container = document.getElementById('profileContent');
    container.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-dim);"><i class="fas fa-spinner fa-spin" style="font-size:24px;"></i></div>';

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
    renderDeals(data);
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
    let btn = '';

    if (currentTab === 'products' && currentStatus === 'active') {
        emoji = '😳';
        title = 'Нет товаров';
        subtitle = 'У пользователя пока нет активных товаров';
        if (isOwner) {
            btn = `<a href="/sell.html" class="btn btn-primary" style="margin-top:16px;"><i class="fas fa-plus-circle"></i> Разместить товар</a>`;
        }
    } else if (currentTab === 'products' && currentStatus === 'sold') {
        emoji = '📦';
        title = 'Нет проданных товаров';
        subtitle = 'Здесь появятся завершённые сделки';
    } else if (currentTab === 'purchases') {
        emoji = '😳';
        title = currentStatus === 'active' ? 'Нет активных покупок' : 'Нет завершённых покупок';
        subtitle = currentStatus === 'active' ? 'Давайте что-нибудь выберем' : 'Здесь появятся ваши покупки';
        if (isOwner && currentStatus === 'active') {
            btn = `<a href="/" class="btn btn-primary" style="margin-top:16px;"><i class="fas fa-search"></i> Выбрать игру</a>`;
        }
    } else if (currentTab === 'sales') {
        emoji = '😳';
        title = currentStatus === 'active' ? 'Нет активных продаж' : 'Нет завершённых продаж';
        subtitle = currentStatus === 'active' ? 'Что-то не так с товарами' : 'Здесь появятся продажи';
    }

    container.innerHTML = `
        <div class="profile-empty">
            <div class="empty-emoji">${emoji}</div>
            <div class="empty-title">${title}</div>
            <div class="empty-subtitle">${subtitle}</div>
            ${btn}
        </div>
    `;
}

/* ---------- Рендер товаров ---------- */

function renderProducts(list) {
    const container = document.getElementById('profileContent');
    container.innerHTML = `
        <div class="profile-products-grid">
            ${list.map(p => `
<a href="/product.html?id=${p.product_id || p.id}" class="profile-product-card
                    <div class="profile-product-image">
                        ${p.image
                            ? `<img src="${p.image}" alt="">`
                            : `<div class="profile-product-icon"><i class="${p.icon || 'fas fa-box'}"></i></div>`
                        }
                        ${p.is_premium ? '<div class="profile-product-premium">🚀</div>' : ''}
                        ${p.views ? `<div class="profile-product-views"><i class="fas fa-eye"></i> ${p.views}</div>` : ''}
                    </div>
                    <div class="profile-product-title">${escapeHTML(p.title)}</div>
<div class="profile-product-price">${formatPrice(p.price || p.amount || 0)}</div>
                </a>
            `).join('')}
        </div>
    `;
}

/* ---------- Рендер сделок (покупки/продажи) ---------- */

function renderDeals(list) {
    const container = document.getElementById('profileContent');
    container.innerHTML = `
        <div class="profile-deals-list">
            ${list.map(d => {
                const counterparty = currentTab === 'purchases' ? d.seller_name : d.buyer_name;
                const roleLabel = currentTab === 'purchases' ? 'Продавец' : 'Покупатель';

                return `
                    <div class="profile-deal-card" data-deal-id="${d.deal_id}">
                        <div class="profile-deal-image">
                            ${d.image
                                ? `<img src="${d.image}" alt="">`
                                : `<div class="profile-product-icon"><i class="fas fa-box"></i></div>`
                            }
                        </div>
                        <div class="profile-deal-info">
                            <div class="profile-deal-title">${escapeHTML(d.title)}</div>
                            <div class="profile-deal-meta">${roleLabel}: <b>${escapeHTML(counterparty || '—')}</b></div>
                            <div class="profile-deal-meta-small">${new Date(d.created_at).toLocaleDateString('ru-RU')}</div>
                        </div>
                        <div class="profile-deal-right">
                            <div class="profile-deal-price">${formatPrice(d.amount)}</div>
                            <span class="profile-deal-status status-${d.deal_status}">
                                ${d.deal_status === 'completed' ? 'Завершено' : 'Активно'}
                            </span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Клик → модалка сделки (позже) или просто подсказка
container.querySelectorAll('.profile-deal-card').forEach(card => {
    card.onclick = () => {
        const dealId = card.dataset.dealId;
        if (dealId) location.href = `/deal.html?id=${dealId}`;
    };
});
}

/* ---------- События ---------- */

function bindEvents() {
    // Главные табы
    document.querySelectorAll('.profile-tab-main').forEach(tab => {
        tab.onclick = () => {
            currentTab = tab.dataset.mainTab;
            currentStatus = 'active';
            document.querySelectorAll('.profile-tab-main').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const subTabs = document.getElementById('subTabs');
            if (subTabs) subTabs.innerHTML = renderSubTabs();
            bindSubTabs();

            loadTabContent();
        };
    });

    bindSubTabs();

// Меню профиля
initProfileMenu();
}

function bindSubTabs() {
    document.querySelectorAll('.profile-tab-sub').forEach(tab => {
        tab.onclick = () => {
            currentStatus = tab.dataset.subStatus;
            document.querySelectorAll('.profile-tab-sub').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadTabContent();
        };
    });
}

/* ---------- Инициализация ---------- */

/* ---------- Меню профиля ---------- */

function initProfileMenu() {
    const menuBtn = document.getElementById('profileMenuBtn');
    const menuOverlay = document.getElementById('profileMenu');
    const menuClose = document.getElementById('profileMenuClose');

    menuBtn?.addEventListener('click', openMenu);
    menuClose?.addEventListener('click', closeMenu);

    menuOverlay?.addEventListener('click', (e) => {
        if (e.target === menuOverlay) closeMenu();
    });

    document.getElementById('menuLogout')?.addEventListener('click', () => {
        if (!confirm('Выйти из профиля?')) return;
        localStorage.clear();
        location.href = '/login.html';
    });

    document.getElementById('menuChangeAvatar')?.addEventListener('click', () => {
        document.getElementById('menuAvatarInput')?.click();
    });

    document.getElementById('menuAvatarInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const fd = new FormData();
            fd.append('avatar', file);
            const token = getToken();
            const res = await fetch('/api/users/me/avatar', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd
            });
            if (!res.ok) throw new Error('Ошибка загрузки');
            showToast('Аватар обновлён', 'success');
            setTimeout(() => location.reload(), 800);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    document.getElementById('menuNotifToggle')?.addEventListener('click', function() {
        this.classList.toggle('active');
        this.textContent = this.classList.contains('active') ? 'Вкл.' : 'Выкл.';
    });

    document.getElementById('menuProtectionToggle')?.addEventListener('click', function() {
        this.classList.toggle('active');
        this.textContent = this.classList.contains('active') ? 'Вкл.' : 'Выкл.';
    });
}

function openMenu() {
    const overlay = document.getElementById('profileMenu');
    if (!overlay) return;

    const me = getUser();
    if (me) {
        const avatarEl = document.getElementById('menuAvatar');
        if (avatarEl) {
            avatarEl.innerHTML = me.avatar
                ? `<img src="${me.avatar}" alt="">`
                : (me.username[0].toUpperCase());
        }
        const emailEl = document.getElementById('menuEmail');
        if (emailEl) emailEl.textContent = me.email || '—';
    }

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeMenu() {
    const overlay = document.getElementById('profileMenu');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
}

// Инициализация кнопки уведомлений в меню
function initNotificationsToggle() {
    const notifToggle = document.getElementById('menuNotificationsToggle');
    if (notifToggle) {
        const isEnabled = localStorage.getItem('notifications_enabled') !== 'false';
        notifToggle.textContent = isEnabled ? 'Вкл.' : 'Выкл.';
        notifToggle.style.background = isEnabled ? 'var(--primary)' : '#333';

        notifToggle.onclick = () => {
            const current = localStorage.getItem('notifications_enabled') !== 'false';
            localStorage.setItem('notifications_enabled', !current);
            notifToggle.textContent = !current ? 'Вкл.' : 'Выкл.';
            notifToggle.style.background = !current ? 'var(--primary)' : '#333';
            showToast(!current ? 'Уведомления включены' : 'Уведомления отключены', 'success');
        };
    }
}

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    initNotificationsToggle();
});
