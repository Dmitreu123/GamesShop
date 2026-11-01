const token = localStorage.getItem('games_shop_token');
if (!token) { window.location.href = '/'; }

const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

// --- ЛОГИКА ВКЛАДОК ---
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');

  if (tabId === 'stats') loadStats();
  if (tabId === 'users') loadUsers();
  if (tabId === 'disputes') loadDisputes();
if (tabId === 'support') loadSupportChats();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// --- СТАТИСТИКА ---
async function loadStats() {
  try {
    const res = await fetch('/api/admin/stats', { headers });
    if (!res.ok) throw new Error('Ошибка');
    const data = await res.json();
    
    document.getElementById('stats-container').innerHTML = `
      <div class="card"><h3>Комиссии со сделок</h3><div class="value">${data.commission || 0} ₽</div></div>
      <div class="card"><h3>Всего юзеров</h3><div class="value">${data.users || 0}</div></div>
      <div class="card"><h3>Всего сделок</h3><div class="value">${data.deals || 0}</div></div>
      <div class="card"><h3>Активных товаров</h3><div class="value">${data.activeProducts || 0}</div></div>
    `;
  } catch (e) { console.error(e); }
}

// --- ПОЛЬЗОВАТЕЛИ ---
async function loadUsers() {
  const q = document.getElementById('search').value;
  const sortVal = document.getElementById('sort').value;
  const [sort, order] = sortVal.split('-');

  try {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}&sort=${sort}&order=${order}`, { headers });
    const data = await res.json();
    
    const tbody = document.getElementById('users-list');
    if (!data.users || data.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Пользователи не найдены</td></tr>';
      return;
    }

    tbody.innerHTML = data.users.map(u => `
      <tr class="${u.is_banned ? 'banned' : ''}">
        <td>${u.id}</td>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td>${u.balance} ₽</td>
        <td>${u.is_banned ? '🔴 Забанен' : (u.role === 'moderator' ? '🟠 Модератор' : '🟢 Активен')}</td>
        <td>
          ${u.role === 'admin' ? '👑' : 
            u.is_banned 
              ? `<button class="btn btn-unban" onclick="unban(${u.id})">Разбанить</button>`
              : `<button class="btn btn-ban" onclick="ban(${u.id})">Забанить</button>`
          }
          ${u.role !== 'admin' ? `
            <button class="btn btn-mod" style="margin-left:5px;" onclick="toggleModerator(${u.id}, '${u.role}')">
              ${u.role === 'moderator' ? 'Снять мод.' : 'Модератор'}
            </button>
          ` : ''}
        </td>
      </tr>
    `).join('');
  } catch (e) { console.error(e); }
}

// --- СПОРЫ ---
async function loadDisputes() {
  try {
    const res = await fetch('/api/admin/disputes', { headers });
    const data = await res.json();
    const tbody = document.getElementById('disputes-list');
    
    if (!data.disputes || data.disputes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Активных споров нет</td></tr>';
      return;
    }

    tbody.innerHTML = data.disputes.map(d => `
      <tr>
        <td>${d.id}</td>
        <td>${d.product_title}</td>
        <td>${d.buyer_name} <br><small style="color:#888">${d.buyer_email}</small></td>
        <td>${d.seller_name} <br><small style="color:#888">${d.seller_email}</small></td>
<td>${d.amount} ₽</td>
<td>
  <button class="btn" style="background:#2196f3; color:#fff; margin-right:5px;" onclick="window.open('/deal.html?id=${d.id}', '_blank')">💬 В чат</button>
  <button class="btn btn-ban" onclick="resolveDispute(${d.id}, 'buyer')">За покупателя</button>
  <button class="btn btn-unban" onclick="resolveDispute(${d.id}, 'seller')">За продавца</button>
</td>
      </tr>
    `).join('');
  } catch (e) { console.error(e); }
}

// --- ДЕЙСТВИЯ ---
window.ban = async (id) => {
  const reason = prompt('Причина бана:', 'Нарушение правил');
  if (reason === null) return;
  await fetch(`/api/admin/users/${id}/ban`, { method: 'POST', headers, body: JSON.stringify({ reason }) });
  loadUsers();
};

window.unban = async (id) => {
  if (!confirm('Разбанить пользователя?')) return;
  await fetch(`/api/admin/users/${id}/unban`, { method: 'POST', headers });
  loadUsers();
};

window.toggleModerator = async (id, currentRole) => {
  const newRole = currentRole === 'moderator' ? 'user' : 'moderator';
  if (!confirm(`Сменить роль на ${newRole}?`)) return;
  await fetch(`/api/admin/users/${id}/role`, { method: 'POST', headers, body: JSON.stringify({ role: newRole }) });
  loadUsers();
};

window.resolveDispute = async (dealId, winner) => {
  if (!confirm(`Решить спор в пользу ${winner === 'buyer' ? 'покупателя' : 'продавца'}?`)) return;
  await fetch(`/api/admin/disputes/${dealId}/resolve`, { method: 'POST', headers, body: JSON.stringify({ winner }) });
  loadDisputes();
};

// --- СОБЫТИЯ ПОИСКА И СОРТИРОВКИ ---
let searchTimeout;
document.getElementById('search')?.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadUsers, 500);
});
document.getElementById('sort')?.addEventListener('change', loadUsers);

// === ПРОВЕРКА РОЛИ ДЛЯ ИНТЕРФЕЙСА ===
const myRole = localStorage.getItem('games_shop_role');
if (myRole !== 'admin') {
  const usersTab = document.querySelector('.tab-btn[data-tab="users"]');
  if (usersTab) usersTab.style.display = 'none';
}
// Запуск
switchTab('stats');


// === ЛОГИКА ПОДДЕРЖКИ ===
let currentSupportChatId = null;
let supportInterval = null;

async function loadSupportChats() {
  try {
    const res = await fetch('/api/admin/support', { headers });
    const data = await res.json();
    const tbody = document.getElementById('support-list');
    
    if (!data.chats || data.chats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Нет активных обращений</td></tr>';
      return;
    }

    tbody.innerHTML = data.chats.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.username}</td>
        <td style="color:#aaa; font-size:13px;">${c.last_message || 'Нет сообщений'}</td>
        <td>
          <button class="btn" style="background:#2196f3; color:#fff;" onclick="openSupportChat(${c.id}, '${c.username}')">Открыть</button>
        </td>
      </tr>
    `).join('');
  } catch (e) { console.error(e); }
}

window.openSupportChat = async (chatId, username) => {
  currentSupportChatId = chatId;
  document.getElementById('supportUserName').innerText = `Чат с ${username}`;
  document.getElementById('supportModal').style.display = 'flex';
  
  await loadAdminMessages();
  
  // Очищаем старый интервал и запускаем новый (проверка каждые 3 сек)
  if (supportInterval) clearInterval(supportInterval);
  supportInterval = setInterval(loadAdminMessages, 3000);
};

async function loadAdminMessages() {
  if (!currentSupportChatId) return;
  try {
    const res = await fetch(`/api/admin/support/${currentSupportChatId}`, { headers });
    const data = await res.json();
    const container = document.getElementById('supportChatMessages');
    
    if (data.messages && data.messages.length > 0) {
      container.innerHTML = data.messages.map(m => {
        // Определяем, кто отправил: юзер или админ
        const isStaff = m.role === 'admin' || m.role === 'moderator';
        
        return `
          <div style="max-width:80%; padding:10px; border-radius:10px; font-size:13px; align-self:${isStaff ? 'flex-end' : 'flex-start'}; background:${isStaff ? '#2196f3' : '#333'}; color:#fff;">
            <div style="font-size:10px; color:#ddd; margin-bottom:4px;">${isStaff ? 'Вы' : m.username}</div>
            <div>${escapeHTML(m.text)}</div>
          </div>
        `;
      }).join('');
      container.scrollTop = container.scrollHeight;
    } else {
      container.innerHTML = '<div style="color:#888; text-align:center;">Нет сообщений</div>';
    }
  } catch (e) { console.error(e); }
}

document.getElementById('adminSupportSend')?.addEventListener('click', async () => {
  const input = document.getElementById('adminSupportInput');
  const text = input.value.trim();
  if (!text || !currentSupportChatId) return;
  
  input.value = '';
  try {
    await fetch(`/api/admin/support/${currentSupportChatId}/reply`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text })
    });
    loadAdminMessages();
  } catch (e) { console.error(e); }
});

// Функция экранирования (если ее нет в admin.js)
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}
