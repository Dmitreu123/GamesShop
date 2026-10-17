/* ==========================================================
   Страница чатов — список диалогов
   ========================================================== */

import './auth.js';
import './nav.js';
import { getToken, getUser, isLoggedIn } from './auth.js';
import { escapeHTML, formatPrice, showToast } from './utils.js';

/* ---------- Загрузка чатов ---------- */

async function loadChats() {
    if (!isLoggedIn()) {
        location.href = '/login.html';
        return;
    }

    try {
        const token = getToken();
        const res = await fetch('/api/chats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Не удалось загрузить чаты');

        const chats = await res.json();
        renderChats(chats);
    } catch (err) {
        console.error(err);
        document.getElementById('chatsList').innerHTML = `
            <div class="chats-empty">
                <i class="fas fa-exclamation-triangle" style="color:var(--danger);"></i>
                <div>${escapeHTML(err.message)}</div>
            </div>
        `;
    }
}

/* ---------- Рендер списка ---------- */

function renderChats(chats) {
    const container = document.getElementById('chatsList');

    if (chats.length === 0) {
        container.innerHTML = `
            <div class="chats-empty">
                <div class="chats-empty-emoji">💬</div>
                <div class="chats-empty-title">Пока нет чатов</div>
                <div class="chats-empty-subtitle">Чаты появляются после покупки товаров</div>
                <a href="/" class="btn btn-primary" style="margin-top:20px;">
                    <i class="fas fa-search"></i> Найти товар
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = chats.map(c => {
        const avatarHTML = c.partner_avatar
            ? `<img src="${c.partner_avatar}" alt="">`
            : escapeHTML(c.partner_name[0].toUpperCase());

        const lastMsg = c.last_message
            ? (c.last_message_mine ? 'Вы: ' : '') + escapeHTML(c.last_message)
            : 'Начните диалог';

        const time = formatTime(c.last_message_at);
        const unreadBadge = c.unread > 0 ? `<span class="chat-unread">${c.unread}</span>` : '';

        const statusClass = c.deal_status === 'completed' ? 'status-completed' : 'status-active';

        return `
            <a href="/chat.html?deal=${c.deal_id}" class="chat-item">
                <div class="chat-avatar">
                    ${avatarHTML}
                    ${c.unread > 0 ? '<div class="chat-avatar-dot"></div>' : ''}
                </div>
                <div class="chat-info">
                    <div class="chat-top">
                        <div class="chat-name">${escapeHTML(c.partner_name)}</div>
                        <div class="chat-time">${time}</div>
                    </div>
                    <div class="chat-bottom">
                        <div class="chat-last">${lastMsg}</div>
                        ${unreadBadge}
                    </div>
                </div>
            </a>
        `;
    }).join('');
}

/* ---------- Время ---------- */

function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    const day = 24 * 60 * 60 * 1000;

    if (diff < day && d.getDate() === now.getDate()) {
        return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 7 * day) {
        const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
        return days[d.getDay()];
    }
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
    // Поиск
    document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            location.href = `/?q=${encodeURIComponent(e.target.value)}`;
        }
    });

    loadChats();
});
