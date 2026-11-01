/* ==========================================================
   Страница чатов — список диалогов (Playerok Style)
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
        // Бэкенд теперь отдает unread_count
        const isUnread = c.unread_count > 0; 
        const time = formatTime(c.last_message_at);
        
        // Берем последнее сообщение. Если его нет - заглушка
        const lastMsg = c.last_message 
            ? escapeHTML(c.last_message) 
            : 'Начните диалог';

        // Аватарка
        const avatarHTML = c.partner_avatar
            ? `<img src="${c.partner_avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : `<div style="width:100%;height:100%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:20px;border-radius:50%;">${escapeHTML((c.partner_name || '?')[0].toUpperCase())}</div>`;

        // Если есть непрочитанные, чат подсвечивается, текст белый и жирный
        return `
            <a href="/chat.html?deal=${c.id}" class="chat-item" style="display:flex;align-items:center;padding:15px;border-bottom:1px solid #2a2a2a;text-decoration:none;${isUnread ? 'background:rgba(33,150,243,0.08);' : ''}">
                <div style="width:50px;height:50px;margin-right:15px;position:relative;flex-shrink:0;">
                    ${avatarHTML}
                    ${isUnread ? `<div style="position:absolute;bottom:0;right:0;width:14px;height:14px;background:#2196f3;border-radius:50%;border:2px solid #121212;"></div>` : ''}
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <div style="color:${isUnread ? '#fff' : '#e0e0e0'};font-weight:${isUnread ? 'bold' : '500'};font-size:16px;">${escapeHTML(c.partner_name || 'Пользователь')}</div>
                        <div style="color:${isUnread ? '#2196f3' : '#888'};font-size:12px;font-weight:${isUnread ? 'bold' : 'normal'};">${time}</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div style="color:${isUnread ? '#fff' : '#888'};font-weight:${isUnread ? '600' : 'normal'};font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${lastMsg}</div>
                        ${isUnread ? `<div style="background:#2196f3;color:#fff;font-size:11px;font-weight:bold;padding:2px 7px;border-radius:10px;margin-left:8px;">${c.unread_count}</div>` : ''}
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
