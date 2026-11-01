import './auth.js';
import './nav.js';
import { getToken, isLoggedIn, getUser } from './auth.js';
import { escapeHTML, showToast } from './utils.js';

if (!isLoggedIn()) {
    location.href = '/login.html';
}

const token = getToken();
const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
const messagesContainer = document.getElementById('supportMessages');
const input = document.getElementById('supportInput');
const sendBtn = document.getElementById('supportSendBtn');

let currentChatId = null;

// Инициализация чата
async function initSupport() {
    try {
        const res = await fetch('/api/support/chat', { headers });
        const data = await res.json();
        if (data.chat) {
            currentChatId = data.chat.id;
            loadMessages();
            // Обновляем сообщения каждые 3 секунды
            setInterval(loadMessages, 3000);
        }
    } catch (e) {
        showToast('Ошибка подключения к поддержке', 'error');
    }
}

// Загрузка сообщений
async function loadMessages() {
    if (!currentChatId) return;
    try {
        const res = await fetch('/api/support/messages', { headers });
        const data = await res.json();
        
        if (data.messages && data.messages.length > 0) {
            const myId = getUser()?.id;
            
            messagesContainer.innerHTML = data.messages.map(m => {
                const isMine = m.sender_id === myId;
                const time = new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                
                return `
                    <div class="msg ${isMine ? 'mine' : 'theirs'}">
                        ${!isMine ? `<div style="font-size: 11px; color: #2196f3; margin-bottom: 4px; font-weight: bold;">${escapeHTML(m.username)} ${m.role === 'admin' ? '(Админ)' : m.role === 'moderator' ? '(Модератор)' : ''}</div>` : ''}
                        <div>${escapeHTML(m.text)}</div>
                        <div style="font-size: 10px; text-align: right; margin-top: 4px; opacity: 0.7;">${time}</div>
                    </div>
                `;
            }).join('');
            
            // Скролл вниз
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    } catch (e) {
        console.error(e);
    }
}

// Отправка сообщения
async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    try {
        await fetch('/api/support/message', {
            method: 'POST',
            headers,
            body: JSON.stringify({ text })
        });
        loadMessages();
    } catch (e) {
        showToast('Ошибка отправки', 'error');
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

initSupport();
