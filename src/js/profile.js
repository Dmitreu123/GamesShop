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

function renderProfile() {
    const main = document.getElementById('profileMain');
    
    const avatarHTML = profileUser.avatar
        ? `<img src="${profileUser.avatar}" alt="" style="width: 100%; height: 100%; object-fit: cover;">`
        : escapeHTML(profileUser.username[0].toUpperCase());

    const memberSince = new Date(profileUser.created_at).toLocaleDateString('ru-RU', {
        year: 'numeric', month: 'long'
    });

    const roundedRating = Math.round(profileUser.rating || 0);
    const starsHTML = '★'.repeat(roundedRating) + '☆'.repeat(5 - roundedRating);

    main.innerHTML = `
      <div class="container" style="padding: 0; padding-bottom: 80px;">
        
        <!-- ОБЛОЖКА И АВАТАР -->
        <div class="gs-profile-cover">
            <div class="gs-cover-gradient"></div>
            <div class="gs-avatar-box">
                ${avatarHTML}
            </div>
        </div>

        <div style="padding: 0 20px;">
            <!-- ИМЯ И СТАТУС -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 15px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <h1 style="margin: 0; font-size: 24px; color: #fff;">${escapeHTML(profileUser.username)}</h1>
                        ${profileUser.role === 'moderator' ? '<span class="gs-badge" style="background: #ff9800;">Модератор</span>' : ''}
                        ${profileUser.role === 'admin' || profileUser.email === 'admin@games.shop' ? '<span class="gs-badge" style="background: #f44336;">Админ</span>' : ''}
                    </div>
                    <div style="color: #888; font-size: 13px; margin-top: 4px;">На сайте с ${memberSince}</div>
                </div>
                <button onclick="document.getElementById('profileMenuBtn').click()" style="background: #1e1e1e; border: 1px solid #333; color: #fff; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                    <i class="fas fa-cog"></i>
                </button>
            </div>

            <!-- СТАТИСТИКА И БАЛАНС (Пилюли) -->
            <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                
                <!-- Рейтинг -->
<a href="/reviews.html?user=${profileUser.username}" class="gs-stat-pill" style="text-decoration: none; cursor: pointer;">
    <span style="color: #ffc107; letter-spacing: 1px;">${starsHTML}</span>
    <b style="color: #fff; margin-left: 5px;">${(profileUser.rating || 0).toFixed(1)}</b>
    <span style="color: #888; font-size: 12px; margin-left: 5px;">(${profileUser.reviews_count || 0})</span>
</a>

                <!-- Баланс (только для владельца) -->
                ${isOwner ? `
                <a href="/dashboard.html" class="gs-stat-pill" style="text-decoration: none; border-color: rgba(0, 229, 255, 0.3); background: rgba(0, 229, 255, 0.05);">
                    <i class="fas fa-wallet" style="color: #00e5ff;"></i>
                    <b style="color: #00e5ff; margin-left: 6px;">${formatPrice(profileUser.balance || 0)}</b>
                </a>
                ` : ''}
            </div>

            <!-- СЕГМЕНТИРОВАННЫЕ ВКЛАДКИ (Как в iOS) -->
            <div class="gs-segmented-control" style="margin-top: 25px;">
                <button class="gs-segment ${currentTab === 'products' ? 'active' : ''}" data-main-tab="products">Товары</button>
                <button class="gs-segment ${currentTab === 'purchases' ? 'active' : ''}" data-main-tab="purchases">Покупки</button>
                <button class="gs-segment ${currentTab === 'sales' ? 'active' : ''}" data-main-tab="sales">Продажи</button>
            </div>

            <!-- ПОДТАБЫ (Активные / Завершенные) -->
            <div class="profile-tabs-sub" id="subTabs" style="margin-top: 15px; display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px;">
                ${renderSubTabs()}
            </div>

            <!-- КОНТЕНТ -->
            <div class="profile-content" id="profileContent" style="margin-top: 15px;">
                <div style="text-align:center;padding:40px 0;color:var(--text-dim);">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                </div>
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


/* ---------- События ---------- */
function bindEvents() {
    // Обработчики для верхних вкладок (Товары, Покупки, Продажи)
    document.querySelectorAll('.gs-segment').forEach(tab => {
        tab.onclick = () => {
            currentTab = tab.dataset.mainTab;
            currentStatus = 'active'; // Сбрасываем на "Активные"
            renderProfile(); // Перерисовываем шапку и вкладки
            loadTabContent(); // Загружаем новые данные
        };
    });

    // Обработчики для нижних вкладок (Активные, Завершенные)
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

    // Если кнопка и меню есть на странице — вешаем клик
    if (menuBtn && menuOverlay) {
        menuBtn.onclick = () => {
            menuOverlay.style.display = 'flex'; // Открываем
            document.body.style.overflow = 'hidden';
            
            // Подгружаем данные (почта, аватар)
            const me = getUser() || profileUser;
            if (me) {
                const emailEl = document.getElementById('menuEmail');
                if (emailEl) emailEl.textContent = me.email || '—';
                
                const avatarEl = document.getElementById('menuAvatar');
                if (avatarEl) {
                    if (me.avatar) {
                        avatarEl.innerHTML = `<img src="${me.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
                    } else {
                        avatarEl.innerHTML = me.username ? me.username[0].toUpperCase() : '?';
                    }
                }
            }
        };
    } else {
        console.error("Кнопка меню или само меню не найдены в HTML!");
    }

    // Закрытие меню
    if (menuClose) {
        menuClose.onclick = () => {
            menuOverlay.style.display = 'none'; // Закрываем
            document.body.style.overflow = '';
        };
    }

    // Логика смены аватарки (оставь ту, что была)
    const avatarBtn = document.getElementById('menuChangeAvatar');
    const avatarInput = document.getElementById('menuAvatarInput');
    if (avatarBtn && avatarInput) {
        avatarBtn.onclick = () => avatarInput.click();
        avatarInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const fd = new FormData();
            fd.append('avatar', file);
            try {
                const res = await fetch('/api/users/me/avatar', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${getToken()}` },
                    body: fd
                });
                if (!res.ok) throw new Error('Ошибка');
                showToast('Аватар обновлен!', 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (err) {
                showToast('Не удалось загрузить аватар', 'error');
            }
        };
    }

    // Выход
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
