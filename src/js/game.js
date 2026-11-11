import './auth.js';
import './nav.js';
import { escapeHTML, formatPrice } from './utils.js';

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');

if (!gameId) window.location.href = '/';

let currentCategory = 'all';

// 1. Загружаем информацию об игре и категориях
async function loadGameData() {
    try {
        const res = await fetch(`/api/games/${gameId}/categories`);
        const data = await res.json();

        if (data.game) {
            document.getElementById('gameTitle').textContent = data.game.name;
        }

        // Рисуем вкладки категорий (Все, Аккаунты, Валюта и т.д.)
        const catContainer = document.getElementById('gameCategories');
        const categories = data.categories || [];
        
        let html = `<button class="gs-segment active" onclick="filterCategory('all', this)">Все товары</button>`;
        categories.forEach(cat => {
            html += `<button class="gs-segment" onclick="filterCategory('${cat.id}', this)">${escapeHTML(cat.title)}</button>`;
        });
        catContainer.innerHTML = html;

    } catch (err) {
        console.error(err);
    }
}

// 2. Загружаем товары этой игры
async function loadProducts() {
    const grid = document.getElementById('gameProductsGrid');
    try {
        const res = await fetch(`/api/products?game=${gameId}`);
        let products = await res.json();

        if (currentCategory !== 'all') {
            products = products.filter(p => p.category === currentCategory || p.category === currentCategory.toString());
        }

        if (products.length === 0) {
            grid.innerHTML = `<div style="text-align: center; width: 100%; color: #888; padding: 40px;">В этой категории пока нет товаров</div>`;
            return;
        }

        // Рисуем карточки (используем ту же логику, что и на главной)
        grid.innerHTML = products.map(p => `
            <a href="/product.html?id=${p.id}" class="product-card" style="text-decoration:none;">
                <div class="product-badges-top">
                    <span class="badge-game">${gameId.toUpperCase()}</span>
                </div>
                <div class="product-image-main">
                    ${p.images && p.images.length > 0 
                        ? `<img src="${p.images[0].url}" alt="">` 
                        : `<div style="height:100%; display:flex; align-items:center; justify-content:center; color:#333;"><i class="fas fa-box" style="font-size:40px;"></i></div>`
                    }
                </div>
                <div class="product-title">${escapeHTML(p.title)}</div>
                <div class="product-price">
                    <span class="price-value">${formatPrice(p.price)}</span>
                </div>
            </a>
        `).join('');

    } catch (err) {
        grid.innerHTML = `<div style="text-align: center; width: 100%; color: red;">Ошибка загрузки товаров</div>`;
    }
}

// Глобальная функция для фильтрации
window.filterCategory = (catId, btn) => {
    currentCategory = catId;
    document.querySelectorAll('#gameCategories .gs-segment').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadProducts();
};

// Запуск
loadGameData();
loadProducts();
