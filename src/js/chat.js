/* ==========================================================
   Клиент Socket.IO — чат внутри сделки
   ========================================================== */

import { io } from 'socket.io-client';
import { getToken, getUser } from './auth.js';
import { escapeHTML, showToast } from './utils.js';

let socket = null;
let currentDealId = null;

/* ---------- Подключение ---------- */

export function connectSocket() {
  if (socket && socket.connected) return socket;
  const token = getToken();
  if (!token) return null;

  socket = io({
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('💬 Socket подключён');
    if (currentDealId) {
      socket.emit('join_deal', { deal_id: currentDealId });
    }
  });

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err.message);
  });

  socket.on('new_message', (msg) => {
    appendMessage(msg);
  });

  socket.on('user_typing', ({ username }) => {
    showTyping(username);
  });

  return socket;
}

/* ---------- Работа с комнатой сделки ---------- */

export function openChat(dealId, dealInfo) {
  currentDealId = dealId;

  // Показываем модалку
  const modal = document.getElementById('chatModal');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Заголовок
  document.getElementById('chatTitle').innerHTML = `
    <i class="fas fa-comments"></i> Чат по сделке #${dealId}
  `;
  document.getElementById('chatSubtitle').textContent = dealInfo?.product_title || '';

  // Очищаем и загружаем историю
  const messagesEl = document.getElementById('chatMessages');
  messagesEl.innerHTML = '<div class="chat-loading">Загрузка...</div>';

  loadHistory(dealId);

  // Подключаемся к сокету
  const s = connectSocket();
  if (s && s.connected) {
    s.emit('join_deal', { deal_id: dealId });
  }
}

export function closeChat() {
  const modal = document.getElementById('chatModal');
  modal.classList.remove('open');
  document.body.style.overflow = '';

  if (socket && currentDealId) {
    socket.emit('leave_deal', { deal_id: currentDealId });
  }
  currentDealId = null;
}

/* ---------- Загрузка истории ---------- */

async function loadHistory(dealId) {
  try {
    const token = getToken();
    const res = await fetch(`/api/messages/${dealId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Не удалось загрузить сообщения');
    const messages = await res.json();

    const container = document.getElementById('chatMessages');
    if (messages.length === 0) {
      container.innerHTML = '<div class="chat-empty">Сообщений пока нет.<br>Напишите первым!</div>';
      return;
    }

    container.innerHTML = '';
    messages.forEach(m => appendMessage(m, false));
    scrollBottom();
  } catch (err) {
    document.getElementById('chatMessages').innerHTML =
      `<div class="chat-empty" style="color:#ef4444;">${escapeHTML(err.message)}</div>`;
  }
}

/* ---------- Добавление сообщения ---------- */

function appendMessage(msg, scroll = true) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  // Убираем плейсхолдеры
  const empty = container.querySelector('.chat-empty, .chat-loading');
  if (empty) empty.remove();

  const me = getUser();
  const isMine = me && msg.sender_id === me.id;

  const avatarHTML = msg.sender_avatar
    ? `<img src="${msg.sender_avatar}" alt="">`
    : (msg.sender_name || '?')[0].toUpperCase();

  const div = document.createElement('div');
  div.className = `chat-message ${isMine ? 'mine' : 'theirs'}`;
  div.innerHTML = `
    <div class="chat-avatar">${avatarHTML}</div>
    <div class="chat-bubble">
      <div class="chat-author">${escapeHTML(msg.sender_name || '')}</div>
      <div class="chat-text">${escapeHTML(msg.text)}</div>
      <div class="chat-time">${new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  `;
  container.appendChild(div);

  if (scroll) scrollBottom();
}

function scrollBottom() {
  const container = document.getElementById('chatMessages');
  if (container) container.scrollTop = container.scrollHeight;
}

/* ---------- Индикатор "печатает..." ---------- */

let typingTimeout = null;
function showTyping(username) {
  const el = document.getElementById('chatTyping');
  if (!el) return;
  el.textContent = `${username} печатает...`;
  el.style.opacity = '1';
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

/* ---------- Отправка ---------- */

export function initChat() {
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const closeBtn = document.getElementById('chatClose');

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !currentDealId) return;

    if (socket && socket.connected) {
      socket.emit('send_message', { deal_id: currentDealId, text });
    } else {
      // Fallback: HTTP-запрос
      sendViaHTTP(currentDealId, text);
    }
    input.value = '';
  });

  // Отправка по Enter (не работает на телефоне, но на ПК — да)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

  // Индикатор "печатает..."
  input.addEventListener('input', () => {
    if (socket && currentDealId) {
      socket.emit('typing', { deal_id: currentDealId });
    }
  });

  if (closeBtn) closeBtn.onclick = closeChat;
}

async function sendViaHTTP(dealId, text) {
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
