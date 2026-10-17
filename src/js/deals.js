import { getToken } from './auth.js';

async function request(url, options = {}) {
    const token = getToken();
    const res = await fetch(url, {
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

export const deals = {
    list:    () => request('/api/deals'),
    create:  (product_id) => request('/api/deals', { method: 'POST', body: JSON.stringify({ product_id }) }),
    confirm: (id) => request(`/api/deals/${id}/confirm`, { method: 'POST' }),
    cancel:  (id) => request(`/api/deals/${id}/cancel`,  { method: 'POST' })
};