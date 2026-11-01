import './auth.js';
import { getToken, isLoggedIn, getUser } from './auth.js';
import { formatPrice, escapeHTML, showToast } from './utils.js';

const me = getUser();
if (!isLoggedIn() || !me || me.is_admin !== 1) {
    alert('Доступ запрещен. Вы не администратор.');
    location.href = '/';
}

async function fetchAdminData() {
    const token = getToken();
    const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
    };

    try {
        // 1. Статистика
        const statsRes = await fetch('/api/admin/stats', { headers });
        
        if (statsRes.status === 401) {
            localStorage.clear();
            location.href = '/login.html';
            return;
        }
        if (statsRes.status === 403) {
            alert('Нет прав. Войдите как админ.');
            location.href = '/';
            return;
        }
        
        if (statsRes.ok) {
            const stats = await statsRes.json();
            const cards = document.querySelectorAll('.admin-card h3');
            if (cards.length >= 4) {
                cards[0].textContent = stats.users;
                cards[1].textContent = stats.deals;
                cards[2].textContent = formatPrice(stats.commission);
                cards[3].textContent = stats.activeProducts;
            }
        } else {
            const err = await statsRes.json();
            showToast('Ошибка API: ' + (err.error || statsRes.status), 'error');
        }

        // 2. Список юзеров
        const usersRes = await fetch('/api/admin/users', { headers });
        if (usersRes.ok) {
            const users = await usersRes.json();
            const list = document.getElementById('usersList');
            
            list.innerHTML = users.map(u => `
                <div class="admin-user-row">
                    <div class="admin-user-info">
                        <h4>${escapeHTML(u.username)} ${u.is_admin ? '👑' : ''}</h4>
                        <p>${escapeHTML(u.email)}</p>
                    </div>
                    <div style="text-align:right;">
                        <div style="color:#10b981; font-weight:700;">${formatPrice(u.balance)}</div>
                        <div style="font-size:12px; color:var(--text-dim);">ID: ${u.id}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error(err);
        showToast('Ошибка сети. Проверьте сервер.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', fetchAdminData);
