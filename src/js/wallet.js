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

export const wallet = {
    getBalance:      () => request('/api/wallet/balance'),
    getTransactions: () => request('/api/wallet/transactions'),
    deposit:  (amount) => request('/api/wallet/deposit',  { method: 'POST', body: JSON.stringify({ amount }) }),
    withdraw: (amount) => request('/api/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount }) })
};