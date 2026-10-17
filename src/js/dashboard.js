import { getUser, getToken, logout, isLoggedIn, refreshUser } from './auth.js';
import { loadBalance as loadWalletBalance, loadTransactions, initWalletUI } from './wallet-ui.js';
import { deals } from './deals.js';
import { api } from './api.js';
import { formatPrice, escapeHTML, showToast } from './utils.js'
import { openChat, initChat } from './chat.js';
import { openSellModal } from './sell-form.js';
import './nav.js';

if (!isLoggedIn()) location.href = '/login.html';

let currentUser = null;

function renderHeader(user) {
    const avatarHTML = user.avatar
        ? `<img src="${user.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;">`
        : escapeHTML(user.username[0].toUpperCase());

    document.getElementById('userSlot').innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
            <a href="/" class="btn btn-outline"><i class="fas fa-store"></i></a>
            <div class="user-chip">
                <div class="user-avatar">${avatarHTML}</div>
                <div>
                    <div style="font-weight:700;">${escapeHTML(user.username)}</div>
                    <div class="user-balance">${formatPrice(user.balance ?? 0)}</div>
                </div>
            </div>
            <button class="btn btn-outline" id="logoutBtn"><i class="fas fa-sign-out-alt"></i></button>
        </div>
    `;
    document.getElementById('logoutBtn').onclick = logout;
}

document.querySelectorAll('.dash-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');

        const t = tab.dataset.tab;
        if (t === 'products') loadMyProducts();
        if (t === 'deals')    loadDeals();
        if (t === 'profile')  loadProfile();
    });
});



async function loadMyProducts() {
    const container = document.getElementById('myProducts');
    container.innerHTML = '<div class="empty">Загрузка...</div>';
    try {
        const token = getToken();
        const res = await fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } });
        const all = await res.json();
        const me = getUser();
        const mine = all.filter(p => p.seller_id === me?.id);

        if (mine.length === 0) { container.innerHTML = '<div class="empty">У вас нет товаров</div>'; return; }

        container.innerHTML = mine.map(p => `
            <div class="list-item">
                <div class="info">
                    <h4>${escapeHTML(p.title)}</h4>
                    <p>${escapeHTML(p.game)} • ${formatPrice(p.price)}</p>
                </div>
                <button class="btn btn-outline" data-delete="${p.id}"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');

        container.querySelectorAll('[data-delete]').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.dataset.delete;
                const r = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
                if (r.ok) { showToast('Удалено', 'success'); loadMyProducts(); }
                else showToast('Ошибка', 'error');
            };
        });
    } catch (err) { showToast(err.message, 'error'); }
}

async function loadDeals() {
    const container = document.getElementById('dealsList');
    container.innerHTML = '<div class="empty">Загрузка...</div>';
    try {
        const list = await deals.list();
        const me = getUser();
        if (list.length === 0) { container.innerHTML = '<div class="empty">Сделок нет</div>'; return; }

        container.innerHTML = list.map(d => {
            const isBuyer = d.buyer_id === me.id;
            const role = isBuyer ? 'Покупка' : 'Продажа';
            const counterparty = isBuyer ? d.seller_name : d.buyer_name;
            const canConfirm = isBuyer && d.status === 'pending';
            const canReview  = isBuyer && d.status === 'completed' && !d.review_id;
            const canCancel  = d.status === 'pending';
            const daysLeft = d.status === 'pending' && d.auto_confirm
                ? Math.max(0, Math.ceil((new Date(d.auto_confirm) - new Date()) / (1000 * 60 * 60 * 24)))
                : 0;

            return `
                <div class="list-item">
                    <div class="info">
                        <h4>#${d.id} — ${escapeHTML(d.product_title)}</h4>
                        <p>${role} • ${escapeHTML(counterparty)} • ${formatPrice(d.amount)}</p>
                    </div>
                    <div class="actions" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <span class="tag ${d.status}">${d.status}</span>
                        ${d.status === 'pending' ? `<span class="tag pending">${daysLeft} дн.</span>` : ''}
                        ${canConfirm ? `<button class="btn btn-primary" data-confirm="${d.id}">Подтвердить</button>` : ''}
                        ${canReview  ? `<button class="btn btn-primary" data-review="${d.id}">Отзыв</button>` : ''}
                        ${canCancel  ? `<button class="btn btn-outline" data-cancel="${d.id}">Отменить</button>` : ''}
<button class="btn btn-outline" data-chat="${d.id}"><i class="fas fa-comments"></i></button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('[data-confirm]').forEach(btn => {
            btn.onclick = async () => {
                try { await deals.confirm(btn.dataset.confirm); showToast('Сделка завершена!', 'success'); await refreshUser(); loadDeals(); }
                catch (err) { showToast(err.message, 'error'); }
            };
        });
        container.querySelectorAll('[data-cancel]').forEach(btn => {
            btn.onclick = async () => {
                try { await deals.cancel(btn.dataset.cancel); showToast('Отменено', 'info'); await refreshUser(); loadDeals(); }
                catch (err) { showToast(err.message, 'error'); }
            };
        });
        container.querySelectorAll('[data-review]').forEach(btn => {
            btn.onclick = () => openReviewModal(Number(btn.dataset.review));
        });
container.querySelectorAll('[data-chat]').forEach(btn => {
    btn.onclick = () => {
        const dealId = Number(btn.dataset.chat);
        const deal = list.find(x => x.id === dealId);
        openChat(dealId, deal);
    };
});
    } catch (err) { showToast(err.message, 'error'); }
}

async function loadProfile() {
    const user = await refreshUser();
    renderProfile(user);
    renderHeader(user);
    loadReviews(user.username);
}

function renderProfile(user) {
    document.getElementById('profileUsername').textContent = user.username;
    const rounded = Math.round(user.rating);
    document.getElementById('profileRating').innerHTML =
        '★'.repeat(rounded) + '☆'.repeat(5 - rounded) +
        ` <span style="color:var(--text-dim);font-size:13px;letter-spacing:0;">${user.rating} (${user.reviews_count} отзывов)</span>`;
    document.getElementById('profileStats').textContent =
        `Сделок: ${user.deals_count} • На сайте с ${new Date(user.created_at).toLocaleDateString('ru-RU')}`;
    document.getElementById('bioInput').value = user.bio || '';

    const wrap = document.getElementById('avatarWrap');
    const avatarHTML = user.avatar
        ? `<img src="${user.avatar}" alt="avatar">`
        : `<div class="avatar-placeholder">${user.username[0].toUpperCase()}</div>`;

    wrap.innerHTML = `
        ${avatarHTML}
        <label class="avatar-upload" title="Сменить аватар">
            <i class="fas fa-camera"></i>
            <input type="file" id="avatarInput" accept="image/*">
        </label>
    `;

document.getElementById('avatarInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await api.uploadAvatar(file);
            await refreshUser();
            loadProfile();
            showToast('Аватар обновлён', 'success');
        } catch (err) { showToast(err.message, 'error'); }
    });
}

async function loadReviews(username) {
    const container = document.getElementById('myReviews');
    try {
        const { reviews } = await api.getProfile(username);
        if (!reviews.length) { container.innerHTML = '<div class="empty">Отзывов пока нет</div>'; return; }
        container.innerHTML = reviews.map(r => `
            <div class="list-item">
                <div class="info" style="flex:1;">
                    <h4>${escapeHTML(r.author_name)}</h4>
                    <div style="color:#fbbf24;letter-spacing:2px;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                    ${r.text ? `<p style="margin-top:6px;color:var(--text-dim);">${escapeHTML(r.text)}</p>` : ''}
                </div>
                <div style="color:var(--text-dim);font-size:12px;">${new Date(r.created_at).toLocaleDateString('ru-RU')}</div>
            </div>
        `).join('');
    } catch (err) { container.innerHTML = '<div class="empty">Не удалось загрузить</div>'; }
}

const _saveBioBtn = document.getElementById('saveBioBtn');
if (_saveBioBtn) _saveBioBtn.onclick = async () => {
    try { await api.updateBio(document.getElementById('bioInput').value); showToast('Сохранено', 'success'); await refreshUser(); }
    catch (err) { showToast(err.message, 'error'); }
};

let reviewDealId = null, reviewRating = 5;

function openReviewModal(dealId) {
    reviewDealId = dealId;
    reviewRating = 5;
    updateStars();
    document.getElementById('reviewText').value = '';
    document.getElementById('reviewModal').classList.add('open');
}

function updateStars() {
    document.querySelectorAll('#starPicker i').forEach(i => {
        i.classList.toggle('active', Number(i.dataset.v) <= reviewRating);
    });
}

document.getElementById('starPicker')?.addEventListener('click', (e) => {
    const s = e.target.closest('i');
    if (!s) return;
    reviewRating = Number(s.dataset.v);
    updateStars();
});

document.getElementById('submitReview')?.addEventListener('click', async () => {
    try {
        await api.leaveReview(reviewDealId, reviewRating, document.getElementById('reviewText').value);
        showToast('Спасибо за отзыв!', 'success');
        document.getElementById('reviewModal').classList.remove('open');
        loadDeals(); await refreshUser();
    } catch (err) { showToast(err.message, 'error'); }
});

document.getElementById('reviewModalClose')?.addEventListener('click', () => {
    document.getElementById('reviewModal').classList.remove('open');
});

/* ---------- Продажа: открытие модалки ---------- */

function handleSellFromUrl() {
    const params = new URLSearchParams(location.search);
    const gameId = params.get('sell');
    const categoryId = params.get('category');
    if (gameId) {
        // Даём странице догрузиться
        setTimeout(() => {
            openSellModal({ gameId, categoryId });
        }, 300);
    }
}

/* Обработчик кнопки «Продать» в кабинете (если она есть) */
const sellBtnTop = document.getElementById('sellBtnTop');
if (sellBtnTop) {
    sellBtnTop.onclick = () => openSellModal();
}

/* ---------- Инициализация ---------- */

(async () => {
    try {
        currentUser = await refreshUser();
        renderHeader(currentUser);
    } catch (err) {
        console.error('refreshUser error:', err);
    }

    try { loadWalletBalance(); } catch (err) { console.error('loadWalletBalance:', err); }
    try { loadTransactions(); } catch (err) { console.error('loadTransactions:', err); }
    try { initWalletUI(); } catch (err) { console.error('initWalletUI:', err); }
    try { loadGames(); } catch (err) { console.error('loadGames:', err); }
    try { initChat(); } catch (err) { console.error('initChat:', err); }
    try { handleSellFromUrl(); } catch (err) { console.error('handleSellFromUrl:', err); }
})();
