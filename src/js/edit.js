import { getToken, isLoggedIn } from './auth.js';
import { showToast } from './utils.js';

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId || !isLoggedIn()) {
    window.location.href = '/';
}

const form = document.getElementById('saveBtn');

async function loadProduct() {
    try {
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) throw new Error('Ошибка загрузки');
        const data = await res.json();

        document.getElementById('title').value = data.title || '';
        document.getElementById('price').value = data.price || '';
        document.getElementById('description').value = data.description || '';
        document.getElementById('login').value = data.login || '';
        document.getElementById('password').value = data.password || '';
    } catch (err) {
        showToast('Не удалось загрузить товар', 'error');
    }
}

form.addEventListener('click', async () => {
    const btn = form;
    btn.disabled = true;
    btn.textContent = 'Сохранение...';

    const fd = new FormData();
    fd.append('title', document.getElementById('title').value);
    fd.append('price', document.getElementById('price').value);
    fd.append('description', document.getElementById('description').value);
    fd.append('login', document.getElementById('login').value);
    fd.append('password', document.getElementById('password').value);
    fd.append('game', 'other'); // Заглушка, чтобы сервер не ругался (если нужно)

    try {
        const res = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${getToken()}` },
            body: fd
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');

        showToast('Товар обновлен!', 'success');
        setTimeout(() => { window.location.href = `/product.html?id=${productId}`; }, 1000);
        
    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Сохранить изменения';
    }
});

loadProduct();
