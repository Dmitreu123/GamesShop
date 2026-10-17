/* ==========================================================
   Страница выбора игры и категории для продажи
   ========================================================== */

import './auth.js';
import './nav.js';
import { isLoggedIn, getToken } from './auth.js';
import { escapeHTML, showToast } from './utils.js';
import { openSellModal } from './sell-form.js';

let allGames = [];
let currentType = 'all';
let searchQuery = '';
let currentGame = null;
let categoriesData = null;

/* ---------- Загрузка игр ---------- */

async function loadGames() {
    try {
        const res = await fetch('/api/games');
        allGames = await res.json();
        renderGames();
    } catch (err) {
        document.getElementById('gamesGrid').innerHTML =
            '<div style="color:var(--danger);text-align:center;padding:40px 0;grid-column:1/-1;">Не удалось загрузить игры</div>';
        showToast('Ошибка загрузки игр', 'error');
    }
}

/* ---------- Загрузка категорий для игры ---------- */

async function loadCategories(gameId) {
    try {
        const res = await fetch(`/api/games/${gameId}/categories`);
        if (!res.ok) throw new Error('Игра не найдена');
        categoriesData = await res.json();
        renderCategories();
    } catch (err) {
        showToast('Не удалось загрузить категории', 'error');
        showGameSelection();
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
            <div style="color:var(--text-dim);text-align:center;padding:40px 0;grid-column:1/-1;">
                <i class="fas fa-search" style="font-size:32px;display:block;margin-bottom:12px;opacity:0.5;"></i>
                Ничего не найдено
            </div>
        `;
        return;
    }

    grid.innerHTML = games.map(g => `
        <a href="?game=${g.id}" class="game-card" data-game="${g.id}">
            <div class="game-icon" style="background: ${g.color}20; color: ${g.color};">
                <i class="${escapeHTML(g.icon)}"></i>
            </div>
            <div class="game-name">${escapeHTML(g.name)}</div>
            ${g.popular ? '<div class="game-popular">🔥 Топ</div>' : ''}
        </a>
    `).join('');
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
            <div class="sell-game-icon" style="background: ${game.color}20; color: ${game.color};">
                <i class="${escapeHTML(game.icon)}"></i>
            </div>
            <h1>${escapeHTML(game.name)}</h1>
        </div>

        <h2 style="font-size:18px;margin-bottom:14px;color:white;">Что вы хотите продать?</h2>

        <div class="categories-list" id="categoriesList">
            ${categories.map(c => `
                <div class="category-row" data-category="${c.id}">
                    <div class="category-row-icon" style="background: ${c.color}20; color: ${c.color};">
                        <i class="${escapeHTML(c.icon)}"></i>
                    </div>
                    <div class="category-row-name">${escapeHTML(c.name)}</div>
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
        openRulesModal(row.dataset.category);
    });
}

/* ---------- Модалка с правилами ---------- */

function openRulesModal(categoryId) {
    const { game, categories, rules } = categoriesData;
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    // Проверяем, не соглашался ли пользователь уже
    const agreedKey = `rules_agreed_${game.id}_${categoryId}`;
    if (localStorage.getItem(agreedKey) === '1') {
        // Сразу идём на dashboard с параметрами
        goToDashboard(game.id, categoryId);
        return;
    }

    // Создаём модалку
    const modal = document.createElement('div');
    modal.className = 'modal-overlay open';
    modal.id = 'rulesModal';
    modal.innerHTML = `
        <div class="modal" style="max-width:520px;">
            <button class="modal-close" id="rulesModalClose"><i class="fas fa-times"></i></button>

            <div class="rules-header">
                <h2>Условия категории</h2>
                <div style="color:var(--text-dim);font-size:13px;margin-top:4px;">
                    ${escapeHTML(game.name)} • ${escapeHTML(category.name)}
                </div>
            </div>

            <div class="rules-block rules-ok">
                <div class="rules-block-title">
                    <span class="rules-icon-ok">✓</span> Требования
                </div>
                ${(rules.requirements || []).map(r => `
                    <div class="rules-item">
                        <span class="rules-dot"></span>
                        <span>${escapeHTML(r)}</span>
                        <i class="fas fa-check rules-check"></i>
                    </div>
                `).join('')}
            </div>

            <div class="rules-block rules-no">
                <div class="rules-block-title">
                    <span class="rules-icon-no">✕</span> Запрещено
                </div>
                ${(rules.forbidden || []).map(r => `
                    <div class="rules-item">
                        <span class="rules-dot rules-dot-red"></span>
                        <span>${escapeHTML(r)}</span>
                        <i class="fas fa-check rules-check"></i>
                    </div>
                `).join('')}
            </div>

            <label class="rules-agree">
                <input type="checkbox" id="rulesDontShow">
                <span>Больше не показывать это предупреждение</span>
            </label>

            <p style="color:var(--text-dim);font-size:12px;text-align:center;margin-top:12px;">
                Продолжая, вы принимаете <a href="#" style="color:var(--primary);">условия продажи</a>
            </p>

            <button class="btn btn-primary" id="rulesAccept" style="width:100%;justify-content:center;margin-top:16px;">
                Принять
            </button>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Закрытие
    const close = () => {
        modal.remove();
        document.body.style.overflow = '';
    };

    document.getElementById('rulesModalClose').onclick = close;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });

    // Принять
    document.getElementById('rulesAccept').onclick = () => {
        if (document.getElementById('rulesDontShow').checked) {
            localStorage.setItem(agreedKey, '1');
        }
        close();
        goToDashboard(game.id, categoryId);
    };
}

/* ---------- Переход в кабинет ---------- */

function goToDashboard(gameId, categoryId) {
    if (!isLoggedIn()) {
        localStorage.setItem('return_to', `/sell.html?game=${gameId}&category=${categoryId}`);
        location.href = '/login.html';
        return;
    }
    // Открываем модалку продажи прямо здесь
    openSellModal({ gameId, categoryId });
}

/* ---------- Возврат к играм ---------- */

function showGameSelection() {
    history.pushState({}, '', '/sell.html');
    location.reload();
}

/* ---------- События ---------- */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    const gameId = params.get('game');

    if (gameId) {
        loadCategories(gameId);
    } else {
        // Табы и поиск
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
