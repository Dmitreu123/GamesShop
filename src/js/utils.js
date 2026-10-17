export function formatPrice(value) {
    return (+value).toLocaleString('ru-RU') + ' ₽';
}

export function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

export function debounce(fn, delay = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

export function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' }[type] || 'fa-info-circle';
    toast.innerHTML = `<i class="fas ${icon}"></i> ${escapeHTML(message)}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideIn 0.3s reverse'; setTimeout(() => toast.remove(), 300); }, 3000);
}