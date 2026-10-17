const TOKEN_KEY = 'games_shop_token';
const USER_KEY  = 'games_shop_user';
let currentUser = null;

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
export function clearAuth() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); currentUser = null; }
export function isLoggedIn() { return !!getToken(); }
export function getUser() {
    if (currentUser) return currentUser;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
}
function setUser(user) { currentUser = user; localStorage.setItem(USER_KEY, JSON.stringify(user)); }

async function request(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

export async function register(username, email, password) {
    const data = await request('/api/users/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
    setToken(data.token); setUser(data.user);
    return data.user;
}

export async function login(email, password) {
    const data = await request('/api/users/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(data.token); setUser(data.user);
    return data.user;
}

export async function refreshUser() {
    if (!isLoggedIn()) return null;
    const user = await request('/api/users/me');
    setUser(user);
    return user;
}

export function logout() { clearAuth(); location.href = '/'; }

export function updateAuthUI() {
    const user = getUser();
    const slot = document.getElementById('authSlot');
    if (!slot) return;
    if (user) {
        const avatarHTML = user.avatar
            ? `<img src="${user.avatar}" alt="">`
            : user.username[0].toUpperCase();
        slot.innerHTML = `
            <a href="/dashboard.html" class="user-chip">
                <div class="user-avatar">${avatarHTML}</div>
                <div class="user-balance">${(+user.balance || 0).toLocaleString('ru-RU')} ₽</div>
            </a>
        `;
    } else {
        slot.innerHTML = `<a href="/login.html" class="btn btn-outline" style="text-decoration:none;"><i class="far fa-user"></i> <span>Войти</span></a>`;
    }
}
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    if (isLoggedIn()) refreshUser().then(updateAuthUI).catch(() => {});
});
