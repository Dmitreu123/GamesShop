/* ==========================================================
   UI кошелька — табы, фильтры, история
   ========================================================== */

import { getToken } from './auth.js';
import { formatPrice, escapeHTML, showToast } from './utils.js';

let allTx = [];
let currentSort = 'new';
let currentTab = 'deposit';

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
        throw new Error('Сессия устарела');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

/* ---------- Загрузка баланса ---------- */

export async function loadBalance() {
    try {
        const data = await api('/api/wallet/balance');
        document.getElementById('balanceValue').textContent = formatPrice(data.balance);
        document.getElementById('frozenValue').textContent = formatPrice(data.frozen);
        const availableEl = document.getElementById('availableValue');
        if (availableEl) availableEl.textContent = formatPrice(data.balance);
    } catch (err) {
        console.error('loadBalance:', err);
    }
}

/* ---------- Загрузка истории ---------- */

export async function loadTransactions() {
    try {
        allTx = await api('/api/wallet/transactions');
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

    // Сортировка
    if (currentSort === 'old') txs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else txs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (txs.length === 0) {
        list.innerHTML = '<div class="empty">Пока нет операций</div>';
        return;
    }

    list.innerHTML = txs.map(t => {
        const meta = TX_META[t.type] || { icon: '💳', label: t.type, color: '#8a99b0' };
        const isPositive = t.amount > 0;
        const amountClass = isPositive ? 'positive' : 'negative';
        const sign = isPositive ? '+' : '';
        const status = STATUS_LABEL[t.status] || t.status;
        const method = METHOD_LABEL[t.method] || t.method || '—';

        return `
            <div class="wallet-tx">
                <div class="wallet-tx-icon" style="background: ${meta.color}15; color: ${meta.color};">
                    ${meta.icon}
                </div>
                <div class="wallet-tx-info">
                    <div class="wallet-tx-title">${escapeHTML(meta.label)}</div>
                    <div class="wallet-tx-sub">${escapeHTML(method)}</div>
                </div>
                <div class="wallet-tx-right">
                    <div class="wallet-tx-amount ${amountClass}">${sign}${formatPrice(t.amount)}</div>
                    <div class="wallet-tx-status">${escapeHTML(status)}</div>
                </div>
            </div>
        `;
    }).join('');
}

/* ---------- Инициализация UI ---------- */

export function initWalletUI() {
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
}
