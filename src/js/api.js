import { getToken } from './auth.js';

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
    const token = getToken();
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

export const api = {
    getProducts:  (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return request(`/products${q ? '?' + q : ''}`);
    },
    getProduct:   (id) => request(`/products/${id}`),
    getSellers:   () => request('/sellers'),
    getGames:     () => request('/games'),
    createOrder:  (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
    getProfile:   (username) => request(`/users/${username}`),
    updateBio:    (bio) => request('/users/me/bio', { method: 'PATCH', body: JSON.stringify({ bio }) }),
    leaveReview:  (deal_id, rating, text) => request('/reviews', { method: 'POST', body: JSON.stringify({ deal_id, rating, text }) }),
    uploadAvatar: async (file) => {
        const fd = new FormData();
        fd.append('avatar', file);
        const token = getToken();
        const res = await fetch('/api/users/me/avatar', {
            method: 'POST',
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: fd
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
        return data;
    }
};