/* ==========================================================
   Страница кошелька /dashboard.html
   ========================================================== */

import './auth.js';
import './nav.js';
import { getToken, getUser, isLoggedIn } from './auth.js';
import { formatPrice, escapeHTML, showToast } from './utils.js';

let allTx = [];
let currentSort = 'new';
let currentTab = 'deposit';

/* ---------- Проверка входа ---------- */

if (!isLoggedIn()) {
    localStorage.setItem('return_to', '/dashboard.html');
    location.href = '/login.html';
}

/* ---------- API ---------- */

async function api(url, options = {}) {
    const token = getToken();
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
    if (res.status === 401) {
        localStorage.clear();
        location.href = '/login.html';
        return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

/* ---------- Баланс ---------- */

async function loadBalance() {
    try {
        const data = await api('/api/wallet/balance');
        if (!data) return;
        const balEl = document.getElementById('balanceValue');
        const availEl = document.getElementById('availableValue');
        if (balEl) balEl.textContent = formatPrice(data.balance);
        if (availEl) availEl.textContent = formatPrice(data.balance);
    } catch (err) {
        console.error('loadBalance:', err);
    }
}

/* ---------- История ---------- */

async function loadTransactions() {
    try {
        allTx = await api('/api/wallet/transactions');
        if (!allTx) return;
        renderTx();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/* ---------- Рендер истории ---------- */

const TX_META = {
    deposit:            { icon: '💰', label: 'Пополнение',       color: '#10b981' },
    withdraw:           { icon: '💸', label: 'Выплата',           color: '#ef4444' },
    purchase_hold:      { icon: '🛒', label: 'Покупка',           color: '#f59e0b' },
    purchase_confirmed: { icon: '✅', label: 'Подтверждение',    color: '#10b981' },
    payout:             { icon: '💵', label: 'Продажа',           color: '#10b981' },
    refund:             { icon: '↩️', label: 'Возврат',           color: '#3b82f6' },
    premium_purchase:   { icon: '🚀', label: 'Премиум',           color: '#f59e0b' },
    premium_boost:      { icon: '🚀', label: 'Поднятие в топ',    color: '#f59e0b' },
    auto_boost_on:      { icon: '⏱',  label: 'Авто-поднятие',     color: '#f59e0b' },
    auto_confirm:       { icon: '⏰', label: 'Автоподтверждение', color: '#8b5cf6' }
};

const STATUS_LABEL = {
    success: 'Успешно',
    processing: 'В обработке',
    refund: 'Возврат',
    pending: 'Ожидает',
    cancelled: 'Отменено'
};

const METHOD_LABEL = {
    sbp: 'СБП',
    card: 'Карта',
    balance: 'Баланс',
    premium: 'Премиум',
    '': '—'
};

function renderTx() {
    const list = document.getElementById('txList');
    if (!list) return;

    let txs = [...allTx];
    if (currentSort === 'old') txs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else txs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (txs.length === 0) {
        list.innerHTML = '<div class="wallet-empty">Пока нет операций</div>';
        return;
    }

list.innerHTML = txs.map(t => {
    const originalIdx = allTx.findIndex(x => x.id === t.id);
    const meta = TX_META[t.type] || { icon: '💳', label: t.type, color: '#8a99b0' };
        const isPositive = t.amount > 0;
        const amountClass = isPositive ? 'positive' : 'negative';
        const sign = isPositive ? '+' : '';
        const status = STATUS_LABEL[t.status] || t.status;
        const method = METHOD_LABEL[t.method] || t.method || '—';
        const statusClass = t.status === 'refund' ? 'refund' : (t.status === 'processing' ? 'processing' : '');

        return `
<div class="wallet-tx" data-idx="${originalIdx}">
                <div class="wallet-tx-icon">
                    ${meta.icon}
                </div>
                <div class="wallet-tx-info">
                    <div class="wallet-tx-title">${escapeHTML(meta.label)}</div>
                    <div class="wallet-tx-sub">${escapeHTML(method)}</div>
                </div>
                <div class="wallet-tx-right">
                    <div class="wallet-tx-amount ${amountClass}">${sign}${formatPrice(t.amount)}</div>
                    <div class="wallet-tx-status ${statusClass}">${escapeHTML(status)}</div>
                </div>
            </div>
        `;
    }).join('');
}

/* ---------- UI ---------- */

function initWalletUI() {
    // Табы
    document.querySelectorAll('.wallet-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.wallet-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.walletTab;
            document.querySelectorAll('.wallet-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('walletPanel-' + currentTab)?.classList.add('active');
        });
    });

    // Сортировка
    document.getElementById('walletSortBtn')?.addEventListener('click', () => {
        currentSort = currentSort === 'new' ? 'old' : 'new';
        const icon = document.getElementById('walletSortIcon');
        if (icon) icon.className = currentSort === 'new' ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
        renderTx();
    });

    // Пополнение
    document.getElementById('depositBtn')?.addEventListener('click', async () => {
        const input = document.getElementById('depositAmount');
        const amount = Number(input.value);
        if (!amount || amount <= 0) return showToast('Введите сумму', 'error');
        try {
            await api('/api/wallet/deposit', {
                method: 'POST',
                body: JSON.stringify({ amount, method: 'card' })
            });
            input.value = '';
            showToast('Баланс пополнен', 'success');
            await loadBalance();
            await loadTransactions();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Выплата
    document.getElementById('withdrawBtn')?.addEventListener('click', async () => {
        const input = document.getElementById('withdrawAmount');
        const amount = Number(input.value);
        if (!amount || amount < 100) return showToast('Минимум 100 ₽', 'error');
        try {
            await api('/api/wallet/withdraw', {
                method: 'POST',
                body: JSON.stringify({ amount, method: 'sbp' })
            });
            input.value = '';
            showToast('Выплата создана', 'success');
            await loadBalance();
            await loadTransactions();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

// Клик на транзакцию → модалка
document.getElementById('txList')?.addEventListener('click', (e) => {
    const row = e.target.closest('.wallet-tx');
    if (!row) return;
    const idx = Number(row.dataset.idx);
    if (isNaN(idx)) return;
    openTxModal(allTx[idx]);
});

// Закрытие модалки
document.getElementById('txModalClose')?.addEventListener('click', closeTxModal);
document.getElementById('txModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'txModal') closeTxModal();
});
}


/* ---------- Модалка транзакции ---------- */

function openTxModal(tx) {
    if (!tx) return;
    const meta = TX_META[tx.type] || { icon: '💳', label: tx.type };

    document.getElementById('txDate').textContent = new Date(tx.created_at).toLocaleString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    document.getElementById('txIcon').textContent = meta.icon;
    document.getElementById('txTitle').textContent = meta.label;

    const amountEl = document.getElementById('txAmount');
    amountEl.textContent = (tx.amount > 0 ? '+' : '') + formatPrice(tx.amount);
    amountEl.className = 'tx-modal-amount ' + (tx.amount > 0 ? 'positive' : 'negative');

    document.getElementById('txMethod').textContent = METHOD_LABEL[tx.method] || tx.method || '—';
    document.getElementById('txStatus').textContent = STATUS_LABEL[tx.status] || tx.status;
    document.getElementById('txType').textContent = meta.label;

    const footer = document.getElementById('txFooter');
    if (tx.type === 'deposit') footer.textContent = 'Средства зачислены на баланс';
    else if (tx.type === 'withdraw') footer.textContent = 'Средства отправлены на указанный способ вывода';
    else if (tx.type === 'payout') footer.textContent = 'Средства зачислены от продажи';
    else if (tx.type === 'refund') footer.textContent = 'Средства возвращены покупателю';
    else if (tx.type === 'purchase_hold') footer.textContent = 'Средства заморожены до подтверждения';
    else footer.textContent = '';

    document.getElementById('txModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeTxModal() {
    document.getElementById('txModal')?.classList.remove('open');
    document.body.style.overflow = '';
}

/* ---------- Ссылка «назад» на профиль ---------- */

function initBackLink() {
    const user = getUser();
    const backEl = document.getElementById('walletBack');
    if (backEl && user && user.username) {
        backEl.href = `/profile.html?u=${user.username}`;
    }
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
    initBackLink();
    initWalletUI();
    loadBalance();
    loadTransactions();
});
