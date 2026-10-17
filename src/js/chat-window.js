/* ==========================================================
   Окно диалога /chat.html?deal=X
   ========================================================== */

import './auth.js';
import { io } from 'socket.io-client';
import { getToken, getUser, isLoggedIn } from './auth.js';
import { escapeHTML, formatPrice, showToast } from './utils.js';

let socket = null;
let dealId = null;
let deal = null;
let partner = null;
let product = null;

/* ---------- Получить deal_id из URL ---------- */

function getDealId() {
    const params = new URLSearchParams(location.search);
    return Number(params.get('deal'));
}

/* ---------- Загрузка диалога ---------- */

async function loadChat() {
    if (!isLoggedIn()) {
        localStorage.setItem('return_to', `/chat.html?deal=${dealId}`);
        location.href = '/login.html';
        return;
    }

    dealId = getDealId();
    if (!dealId) {
        showToast('Чат не указан', 'error');
        setTimeout(() => location.href = '/chats.html', 1000);
        return;
    }

    try {
        const token = getToken();
        const res = await fetch(`/api/chats/${dealId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Чат не найден');

        const data = await res.json();
deal = data.deal;
partner = data.partner;

// Загружаем товар СНАЧАЛА
if (deal.product_id) {
    try {
        const pRes = await fetch(`/api/products/${deal.product_id}`);
        if (pRes.ok) product = await pRes.json();
    } catch {}
}

// ТЕПЕРЬ рендерим шапку (product уже есть)
renderHeader();

// Загружаем историю сообщений
await loadMessages();

        // Подключаем Socket.IO
        connectSocket();
    } catch (err) {
        showToast(err.message, 'error');
        setTimeout(() => location.href = '/chats.html', 1500);
    }
}

/* ---------- Шапка ---------- */

function renderHeader() {
    const avatarHTML = partner.avatar
        ? `<img src="${partner.avatar}" alt="">`
        : escapeHTML(partner.username[0].toUpperCase());

    document.getElementById('chatHeaderInfo').innerHTML = `
        <div class="chat-header-avatar">${avatarHTML}</div>
        <div class="chat-header-text">
            <div class="chat-header-name">${escapeHTML(partner.username)}</div>
            <div class="chat-header-status">Без отзыва</div>
        </div>
    `;

    if (product && product.images && product.images.length > 0) {
        document.getElementById('chatHeaderProduct').innerHTML = `
            <a href="/deal.html?id=${dealId}" class="chat-header-product-img">
                <img src="${product.images[0].url}" alt="">
            </a>
        `;
    } else if (product) {
        document.getElementById('chatHeaderProduct').innerHTML = `
            <a href="/deal.html?id=${dealId}" class="chat-header-product-icon">
                <i class="${product.icon || 'fas fa-box'}"></i>
            </a>
        `;
    }

    // Карточка заказа под сообщениями
    renderOrderCard();
}

/* ---------- Карточка заказа внизу ---------- */

function renderOrderCard() {
    const card = document.getElementById('chatOrderCard');
    if (!card) return;

    if (!product) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';

    const imageHTML = product.images && product.images.length > 0
        ? `<img src="${product.images[0].url}" alt="">`
        : `<div class="chat-order-icon"><i class="${product.icon || 'fas fa-box'}"></i></div>`;

    const statusText = deal.status === 'completed' ? 'Завершено' : 'В процессе';
    const statusColor = deal.status === 'completed' ? '#10b981' : '#fbbf24';

    card.innerHTML = `
        <a href="/deal.html?id=${dealId}" class="chat-order-inner">
            <div class="chat-order-img">${imageHTML}</div>
            <div class="chat-order-info">
                <div class="chat-order-title">${escapeHTML(product.title)}</div>
                <div class="chat-order-status" style="color:${statusColor};">
                    ● ${statusText}
                </div>
            </div>
            <div class="chat-order-price">${formatPrice(deal.amount)}</div>
            <i class="fas fa-chevron-right" style="color:var(--text-dim);"></i>
        </a>
    `;
}

/* ---------- История сообщений ---------- */

async function loadMessages() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-dim);"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const token = getToken();
        const res = await fetch(`/api/messages/${dealId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Не удалось загрузить сообщения');

        const messages = await res.json();
        container.innerHTML = '';

        // Если сделка завершена — показываем инфо-блок
        if (deal.status === 'completed') {
            appendSystemMessage('Получение подтверждено автоматически');
        }

        if (messages.length === 0) {
            appendSystemMessage('Начните диалог');
        } else {
            messages.forEach(m => appendMessage(m, false));
        }

        // Если сделка завершена — кнопка "Оставить отзыв"
        if (deal.status === 'completed' && deal.is_buyer) {
            appendReviewButton();
        }

        scrollBottom();
    } catch (err) {
        container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--danger);">${escapeHTML(err.message)}</div>`;
    }
}

/* ---------- Добавить сообщение ---------- */

function appendMessage(msg, scroll = true) {
    const container = document.getElementById('chatMessages');
    const me = getUser();
    const isMine = me && msg.sender_id === me.id;

    const div = document.createElement('div');
    div.className = `chat-msg ${isMine ? 'mine' : 'theirs'}`;
    div.innerHTML = `
        <div class="chat-msg-bubble">${escapeHTML(msg.text)}</div>
        <div class="chat-msg-time">${formatTime(msg.created_at)}</div>
    `;
    container.appendChild(div);

    if (scroll) scrollBottom();
}

/* ---------- Системное сообщение ---------- */

function appendSystemMessage(text) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg-system';
    div.textContent = text;
    container.appendChild(div);
    scrollBottom();
}

/* ---------- Кнопка "Оставить отзыв" ---------- */

function appendReviewButton() {
    const container = document.getElementById('chatMessages');
    const btn = document.createElement('button');
    btn.className = 'chat-review-btn';
    btn.innerHTML = '<i class="fas fa-star"></i> Оставить отзыв';
    btn.onclick = () => {
        location.href = '/dashboard.html';
    };
    container.appendChild(btn);
    scrollBottom();
}

/* ---------- Скролл ---------- */

function scrollBottom() {
    const container = document.getElementById('chatMessages');
    if (container) {
        setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
    }
}

/* ---------- Время ---------- */

function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/* ---------- Socket.IO ---------- */

function connectSocket() {
    const token = getToken();
    if (!token) return;

    socket = io({ auth: { token } });

    socket.on('connect', () => {
        console.log('💬 Socket подключён в чате');
        socket.emit('join_deal', { deal_id: dealId });
    });

    socket.on('new_message', (msg) => {
        appendMessage(msg);
    });

    socket.on('connect_error', (err) => {
        console.error('Socket error:', err.message);
    });
}

/* ---------- Отправка сообщения ---------- */

function initInput() {
    const form = document.getElementById('chatForm');
    const input = document.getElementById('chatInput');

    // Авто-высота
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Отправка по Enter
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });

    // Отправка
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        if (socket && socket.connected) {
            socket.emit('send_message', { deal_id: dealId, text });
        } else {
            // Fallback HTTP
            sendViaHTTP(text);
        }

        input.value = '';
        input.style.height = 'auto';
    });
}

async function sendViaHTTP(text) {
    try {
        const token = getToken();
        const res = await fetch(`/api/messages/${dealId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        });
        const msg = await res.json();
        if (!res.ok) throw new Error(msg.error);
        appendMessage(msg);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
    loadChat();
    initInput();
});
