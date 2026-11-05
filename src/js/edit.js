import { getToken, isLoggedIn } from './auth.js';
import { showToast } from './utils.js';

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId || !isLoggedIn()) {
    window.location.href = '/';
}

const btnSave = document.getElementById('saveBtn');

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

btnSave.addEventListener('click', async () => {
    btnSave.disabled = true;
    btnSave.textContent = 'Сохранение...';

    // Собираем данные в обычный объект
    const payload = {
        title: document.getElementById('title').value,
        price: Number(document.getElementById('price').value),
        description: document.getElementById('description').value,
        login: document.getElementById('login').value,
        password: document.getElementById('password').value
    };

    try {
        const res = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json' // <-- Говорим, что отправляем JSON
            },
            body: JSON.stringify(payload) // <-- Превращаем объект в строку
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');

        showToast('Товар обновлен!', 'success');
        setTimeout(() => { window.location.href = `/product.html?id=${productId}`; }, 1000);
        
    } catch (err) {
        showToast(err.message, 'error');
        btnSave.disabled = false;
        btnSave.textContent = 'Сохранить изменения';
    }
});

loadProduct();
