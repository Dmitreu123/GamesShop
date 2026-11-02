/* ==========================================================
   Страница выбора игры и категории для продажи
   ========================================================== */

import './auth.js';
import './nav.js';
import { isLoggedIn, getToken } from './auth.js';
import { escapeHTML, showToast } from './utils.js';
import { openSellModal } from './sell-form.js';

// Делаем функцию глобальной для вызова
window.openSellModal = openSellModal;

let allGames = [];
let currentType = 'all';
let searchQuery = '';
let currentGame = null;
let categoriesData = null;

/* ---------- Загрузка игр ---------- */

async function loadGames() {
    try {
        const res = await fetch('/api/games');
        if (!res.ok) throw new Error('Ошибка сервера');
        allGames = await res.json();
        renderGames();
    } catch (err) {
        document.getElementById('gamesGrid').innerHTML = `
            <div style="color:var(--danger);text-align:center;padding:40px;grid-column:1/-1;">Не удалось загрузить игры</div>
        `;
        showToast('Ошибка загрузки игр', 'error');
        console.error(err);
    }
}

/* ---------- Фильтрация и рендер игр ---------- */

function getFiltered() {
    let list = allGames;
    if (currentType !== 'all') list = list.filter(g => g.type === currentType);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(g =>
            g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q)
        );
    }
    return list.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
}

function renderGames() {
    const grid = document.getElementById('gamesGrid');
    const games = getFiltered();

    if (games.length === 0) {
        grid.innerHTML = `
            <div style="color:var(--text-dim);text-align:center;padding:40px;grid-column:1/-1;">
                <i class="fas fa-search" style="font-size:32px;display:block;margin-bottom:10px;"></i>
                Ничего не найдено
            </div>
        `;
        return;
    }

    grid.innerHTML = games.map(g => `
        <a href="?game=${g.id}" class="game-card" data-game="${g.id}">
<div class="game-icon" style="background: ${g.color ? g.color + '20' : 'rgba(255,255,255,0.05)'}; color: ${g.color || 'var(--primary)'}; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative;">
${g.icon && (g.icon.includes('http') || g.icon.startsWith('/')) 
    ? `<img src="${g.icon}" style="width: 100%; height: 100%; object-fit: cover;">` 
    : `<i class="${escapeHTML(g.icon || 'fas fa-gamepad')}" style="font-size: 32px;"></i>`
}
</div>
            <div class="game-name">${escapeHTML(g.name)}</div>
            ${g.popular ? '<div class="game-popular">🔥 Топ</div>' : ''}
        </a>
    `).join('');
}

/* ---------- Загрузка категорий (БЕРЕМ ИЗ БАЗЫ) ---------- */

async function loadCategories(gameId) {
    try {
        const res = await fetch(`/api/games/${gameId}/categories`);
        if (!res.ok) throw new Error('Игра не найдена');
        
        const data = await res.json();
        
        categoriesData = {
            game: data.game || { id: gameId, name: 'Игра', color: '#2196f3', icon: 'fas fa-gamepad' },
            categories: data.categories || []
        };
        
        renderCategories();
    } catch (err) {
        showToast('Не удалось загрузить категории', 'error');
        console.error(err);
    }
}

/* ---------- Рендер категорий ---------- */

function renderCategories() {
    const { game, categories } = categoriesData;

    document.querySelector('main .container').innerHTML = `
        <div class="sell-back">
            <button class="btn btn-outline" id="backToGames">
                <i class="fas fa-arrow-left"></i> К выбору игры
            </button>
        </div>

<div class="sell-game-header">
    <div class="sell-game-icon" style="background: ${game.color ? game.color + '20' : 'rgba(255,255,255,0.05)'}; color: ${game.color || 'var(--primary)'}; overflow: hidden; display: flex; align-items: center; justify-content: center;">
        ${game.icon && game.icon.includes('http') 
            ? `<img src="${game.icon}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">` 
            : `<i class="${escapeHTML(game.icon || 'fas fa-gamepad')}" style="font-size: 32px;"></i>`
        }
    </div>
    <h1>${escapeHTML(game.name)}</h1>
</div>

        <h2 style="font-size:18px;margin-bottom:14px;color:white;">Что вы хотите продать?</h2>

        <div class="categories-list" id="categoriesList">
            ${categories.map(c => `
                <div class="category-row" data-category="${c.id}" data-title="${escapeHTML(c.title || c.name || '')}" style="cursor:pointer; margin-bottom: 10px;">
                    <div class="category-row-icon" style="background: ${c.color ? c.color + '20' : 'rgba(33,150,243,0.2)'}; color: ${c.color || '#2196f3'};">
                        <i class="${escapeHTML(c.icon || 'fas fa-box')}"></i>
                    </div>
                    <div class="category-row-name">${escapeHTML(c.title || c.name || 'Категория')}</div>
                    <i class="fas fa-chevron-right category-row-arrow"></i>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('backToGames').onclick = () => {
        history.pushState({}, '', '/sell.html');
        location.reload();
    };

    document.getElementById('categoriesList').addEventListener('click', (e) => {
        const row = e.target.closest('[data-category]');
        if (!row) return;
        
        window.openSellModal({ 
            gameId: game.id, 
            categoryId: row.dataset.category,
            categoryTitle: row.dataset.title // Передаем название категории!
        });
    });
}

/* ---------- Инициализация ---------- */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    const gameId = params.get('game');

    if (gameId) {
        loadCategories(gameId);
    } else {
        const tabsEl = document.getElementById('sellTabs');
        const searchEl = document.getElementById('gameSearch');

        if (tabsEl) {
            tabsEl.addEventListener('click', (e) => {
                const tab = e.target.closest('.sell-tab');
                if (!tab) return;
                document.querySelectorAll('.sell-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentType = tab.dataset.type;
                renderGames();
            });
        }

        if (searchEl) {
            searchEl.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim();
                renderGames();
            });
        }

        loadGames();
    }
});
