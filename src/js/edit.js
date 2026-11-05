import { getToken, isLoggedIn } from './auth.js';
import { showToast } from './utils.js';

const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId || !isLoggedIn()) window.location.href = '/';

const COMMISSION_RATE = 0.15;
let maxAllowedPrice = 0;

const btnSave = document.getElementById('saveBtn');
const priceInput = document.getElementById('price');
const oldPriceDisplay = document.getElementById('oldPriceDisplay');
const payoutDisplay = document.getElementById('payoutDisplay');
const imagesContainer = document.getElementById('currentImages');

async function loadProduct() {
    try {
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) throw new Error('Ошибка загрузки');
        const data = await res.json();

        maxAllowedPrice = data.old_price || data.price;

        document.getElementById('title').value = data.title || '';
        document.getElementById('description').value = data.description || '';
        document.getElementById('price').value = data.price || '';
        document.getElementById('login').value = data.login || '';
        document.getElementById('password').value = data.password || '';

        updatePriceUI();

        if (data.images && data.images.length > 0) {
            imagesContainer.innerHTML = data.images.map(img => `
                <img src="${img.url}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
            `).join('');
        } else {
            imagesContainer.innerHTML = '<span style="color: #666;">Нет фото</span>';
        }
    } catch (err) {
        showToast('Не удалось загрузить товар', 'error');
    }
}

function updatePriceUI() {
    const price = Number(priceInput.value) || 0;
    const payout = Math.round(price * (1 - COMMISSION_RATE));
    
    payoutDisplay.textContent = payout;
    
    if (price < maxAllowedPrice) {
        oldPriceDisplay.textContent = maxAllowedPrice + ' ₽';
        oldPriceDisplay.style.color = '#f44336';
    } else {
        oldPriceDisplay.textContent = '';
    }

    if (price > maxAllowedPrice) {
        oldPriceDisplay.textContent = 'Нельзя выше ' + maxAllowedPrice + ' ₽';
        oldPriceDisplay.style.color = '#f44336';
        btnSave.disabled = true;
        btnSave.style.opacity = '0.5';
    } else {
        btnSave.disabled = false;
        btnSave.style.opacity = '1';
    }
}

priceInput.addEventListener('input', updatePriceUI);

btnSave.addEventListener('click', async () => {
    const price = Number(priceInput.value);
    if (price > maxAllowedPrice) {
        return showToast('Нельзя завышать цену!', 'error');
    }

    btnSave.disabled = true;
    btnSave.textContent = 'Сохранение...';

    const fd = new FormData();
    fd.append('title', document.getElementById('title').value);
    fd.append('price', price);
    fd.append('description', document.getElementById('description').value);
    fd.append('login', document.getElementById('login').value);
    fd.append('password', document.getElementById('password').value);

    const files = document.getElementById('newImages').files;
    for (let i = 0; i < files.length; i++) {
        fd.append('images', files[i]);
    }

    try {
        const res = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getToken()}` },
            body: fd
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
