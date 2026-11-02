const TOKEN_KEY = 'games_shop_token';
const USER_KEY = 'games_shop_user';
let currentUser = null;
let pendingEmail = '';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
export function clearAuth() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); currentUser = null; }
export function isLoggedIn() { return !!getToken(); }

export function getUser() {
    if (currentUser) return currentUser;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
}

function setUser(user) {
    currentUser = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

async function request(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

export async function register(username, email, password) {
    const data = await request('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
    });

    // Сохраняем почту
    localStorage.setItem('games_shop_pending_email', email);

    // Переключаем формы ТОЛЬКО если сервер ответил успешно
    const registerForm = document.getElementById('registerForm');
    const verifyForm = document.getElementById('verifyForm');

    if (registerForm && verifyForm) {
        registerForm.classList.remove('active');
        registerForm.style.display = 'none';
        verifyForm.style.display = 'block';
        verifyForm.classList.add('active');
    }
    return data;
}

export async function verifyEmail(code) {
    const email = localStorage.getItem('games_shop_pending_email');
    if (!email) throw new Error('Почта не найдена. Начните заново.');

    const data = await request('/api/users/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code })
    });

    localStorage.removeItem('games_shop_pending_email');
    
    // Возвращаем форму входа
    const verifyForm = document.getElementById('verifyForm');
    const loginForm = document.getElementById('loginForm');
    if (verifyForm && loginForm) {
        verifyForm.style.display = 'none';
        verifyForm.classList.remove('active');
        loginForm.style.display = 'block';
        loginForm.classList.add('active');
    }
    
    return data;
}

export async function login(email, password) {
    const data = await request('/api/users/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
}

export async function refreshUser() {
    if (!isLoggedIn()) return null;
    try {
        const user = await request('/api/users/me');
        setUser(user);
        return user;
    } catch {
        clearAuth();
        return null;
    }
}

export function logout() {
    clearAuth();
    location.href = '/';
}

export function updateAuthUI() {
    const user = getUser();
    const slot = document.getElementById('authSlot');
    if (!slot) return;

    if (user) {
        const adminBtn = user.is_admin === 1
            ? `<a href="/admin.html" class="admin-btn" title="Админ-панель"><i class="fas fa-crown"></i></a>`
            : '';

        const avatarHTML = user.avatar
            ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : user.username[0].toUpperCase();

        slot.innerHTML = `
            <div class="auth-chip-group" style="display:flex; align-items:center; gap:10px;">
                ${adminBtn}
                <a href="/profile.html?u=${user.username}" class="user-chip" style="display:flex; align-items:center; gap:8px; text-decoration:none; color:#fff; background:#1e1e1e; padding:5px 12px; border-radius:20px; font-size:14px;">
                    <div class="user-avatar" style="width:24px; height:24px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">${avatarHTML}</div>
                    <div class="user-balance">${(user.balance || 0).toLocaleString('ru-RU')} ₽</div>
                </a>
            </div>
        `;
    } else {
        slot.innerHTML = `<a href="/login.html" class="btn btn-outline" style="text-decoration:none;"><i class="far fa-user"></i> Войти</a>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    if (isLoggedIn()) {
        refreshUser().then(updateAuthUI).catch(() => {});
    }
});
