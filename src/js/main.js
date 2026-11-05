import { api } from './api.js';
import './auth.js';
import './nav.js';
import { initCart, addToCart, getCart } from './cart.js';
import { initModals, openProductModal } from './modal.js';
import { Pagination } from './pagination.js';
import { renderProducts, renderSellers } from './render.js';
import { debounce, showToast, escapeHTML, formatPrice } from './utils.js';
import { deals } from './deals.js';
import { getViewed, addViewed, clearViewed } from './viewed.js';
import { isLoggedIn } from './auth.js';

let allProducts = [];
let currentFilter = {
    category: 'all',
    query: '',
    game: null,
    sort: 'default',
    priceMin: null,
    priceMax: null,
    onlyPremium: false
};
const PER_PAGE = 6;

const pagination = new Pagination({
    container: document.getElementById('pagination'),
    perPage: PER_PAGE,
    onPageChange: () => applyFilter()
});

function applyFilter() {
    let filtered = allProducts;

    if (currentFilter.game) {
        filtered = filtered.filter(p => p.game === currentFilter.game);
    }

    if (currentFilter.category !== 'all') {
        filtered = filtered.filter(p => p.category === currentFilter.category);
    }

    if (currentFilter.query) {
        const q = currentFilter.query.toLowerCase();
        filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q)
        );
    }

    if (currentFilter.priceMin != null) {
        filtered = filtered.filter(p => p.price >= currentFilter.priceMin);
    }
    if (currentFilter.priceMax != null) {
        filtered = filtered.filter(p => p.price <= currentFilter.priceMax);
    }

    if (currentFilter.onlyPremium) {
        filtered = filtered.filter(p => p.is_premium);
    }

    filtered = sortProducts(filtered);

    pagination.setTotal(filtered.length);
    const pageItems = filtered.slice(pagination.getOffset(), pagination.getOffset() + PER_PAGE);
    renderProducts(pageItems, document.getElementById('productGrid'));

    updateUrl();
    updateResetBtn();
}

async function loadData() {
    try {
        const [products, sellers, games] = await Promise.all([
            api.getProducts(),
            api.getSellers(),
            api.getGames()
        ]);
        allProducts = products;
        renderSellers(sellers, document.getElementById('sellersRow'));
        renderGamesStrip(games);
        applyFilter();
} catch (err) {
    alert('❌ ОШИБКА ЗАГРУЗКИ: ' + err.message); // <-- Покажет ошибку!
    console.error(err);
    showToast('Ошибка загрузки данных', 'error');
}
}

/* ---------- Иконки игр (горизонтальный скролл) ---------- */

function renderGamesStrip(games) {
    const strip = document.getElementById('gamesStrip');
    if (!strip) return;

    const sorted = [...games].sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));

    // ПРАВИЛЬНАЯ ГЕНЕРАЦИЯ HTML (добавлена обертка с data-game)
    strip.innerHTML = sorted.map(g => `
        <div class="game-strip-item" data-game="${g.id}" style="cursor: pointer;">
            <div class="game-strip-icon" style="background: ${g.color ? g.color + '20' : 'rgba(255,255,255,0.05)'}; color: ${g.color || 'var(--primary)'}; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                ${g.icon && (g.icon.includes('http') || g.icon.startsWith('/')) 
                    ? `<img src="${g.icon}" style="width: 100%; height: 100%; object-fit: cover;">` 
                    : `<i class="${g.icon || 'fas fa-gamepad'}" style="font-size: 24px;"></i>`
                }
            </div>
            <div class="game-strip-name">${g.name}</div>
        </div>
    `).join('');

    // Обработчик клика (он у тебя уже написан правильно, оставляем как есть)
    strip.addEventListener('click', (e) => {
        const item = e.target.closest('[data-game]');
        if (!item) return;

        const gameId = item.dataset.game;
        
        // Визуально выделяем выбранную игру
        strip.querySelectorAll('.game-strip-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        currentFilter.game = gameId;
        currentFilter.category = 'all';
        pagination.currentPage = 1;
        applyFilter();

        document.querySelector('.product-grid')?.scrollIntoView({ behavior: 'smooth' });
    });
}



/* ---------- Сортировка ---------- */

function sortProducts(list) {
    const sorted = [...list];
    switch (currentFilter.sort) {
        case 'price_asc':
            return sorted.sort((a, b) => a.price - b.price);
        case 'price_desc':
            return sorted.sort((a, b) => b.price - a.price);
        case 'new':
            return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        case 'popular':
            return sorted.sort((a, b) => (b.seller_rating || 0) - (a.seller_rating || 0));
        default:
            return sorted.sort((a, b) => {
                if (a.is_premium && !b.is_premium) return -1;
                if (!a.is_premium && b.is_premium) return 1;
                return new Date(b.created_at) - new Date(a.created_at);
            });
    }
}

/* ---------- URL ---------- */

function updateUrl() {
    const params = new URLSearchParams();
    if (currentFilter.game)     params.set('game', currentFilter.game);
    if (currentFilter.category !== 'all') params.set('category', currentFilter.category);
    if (currentFilter.query)    params.set('q', currentFilter.query);
    if (currentFilter.sort !== 'default') params.set('sort', currentFilter.sort);
    if (currentFilter.priceMin != null) params.set('min', currentFilter.priceMin);
    if (currentFilter.priceMax != null) params.set('max', currentFilter.priceMax);
    if (currentFilter.onlyPremium) params.set('top', '1');

    const qs = params.toString();
    const url = qs ? `?${qs}` : location.pathname;
    history.replaceState({}, '', url);
}

function loadFromUrl() {
    const params = new URLSearchParams(location.search);
    const hasAnyParam = params.toString().length > 0;

    // Если URL пустой — сбрасываем все фильтры
    if (!hasAnyParam) {
        currentFilter = {
            category: 'all',
            query: '',
            game: null,
            sort: 'default',
            priceMin: null,
            priceMax: null,
            onlyPremium: false
        };
        return;
    }

    if (params.get('game'))     currentFilter.game = params.get('game');
    if (params.get('category')) currentFilter.category = params.get('category');
    if (params.get('q'))        currentFilter.query = params.get('q');
    if (params.get('sort'))     currentFilter.sort = params.get('sort');
    if (params.get('min'))      currentFilter.priceMin = Number(params.get('min'));
    if (params.get('max'))      currentFilter.priceMax = Number(params.get('max'));
    if (params.get('top') === '1') currentFilter.onlyPremium = true;
}

function updateResetBtn() {
    const btn = document.getElementById('filterResetBtn');
    if (!btn) return;
    const active = currentFilter.game
        || currentFilter.category !== 'all'
        || currentFilter.query
        || currentFilter.sort !== 'default'
        || currentFilter.priceMin != null
        || currentFilter.priceMax != null
        || currentFilter.onlyPremium;
    btn.style.display = active ? 'inline-flex' : 'none';

    const label = document.getElementById('sortLabel');
    if (label) {
        const map = {
            default: 'По умолчанию',
            price_asc: 'Дешевле',
            price_desc: 'Дороже',
            new: 'Новые',
            popular: 'По рейтингу'
        };
        label.textContent = map[currentFilter.sort] || 'По умолчанию';
    }
}


function initCategories() {
    const grid = document.getElementById('categoryGrid');
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.category-card');
        if (!card) return;
        grid.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
currentFilter.category = card.dataset.category;
currentFilter.game = null;
document.querySelectorAll('.game-strip-item').forEach(i => i.classList.remove('active'));
pagination.currentPage = 1;
applyFilter();
    });
}

function initSearch() {
    const input = document.getElementById('searchInput');
    input.addEventListener('input', debounce((e) => {
        currentFilter.query = e.target.value.trim();
        pagination.currentPage = 1;
        applyFilter();
    }, 300));
}

function initProductClicks() {
    const grid = document.getElementById('productGrid');
    grid.addEventListener('click', async (e) => {
        const card = e.target.closest('.product-card');
        if (!card) return;
        const id = Number(card.dataset.id);
        const product = allProducts.find(p => p.id === id);
        if (!product) return;

        if (e.target.closest('.buy-btn')) {
            e.stopPropagation();
            if (isLoggedIn()) {
                if (!confirm(`Купить "${product.title}" за ${product.price} ₽?\n\nДеньги будут в блокировке 7 дней до подтверждения получения.`)) return;
                try {
                    await deals.create(product.id);
                    showToast('Сделка создана! Деньги в блокировке 7 дней.', 'success');
                    loadData();
                } catch (err) { showToast(err.message, 'error'); }
            } else {
                addToCart(product);
            }
            return;
        }
// Сохраняем в историю
addViewed(product);

// Переход на страницу товара
location.href = `/product.html?id=${product.id}`;
    });
}

function initCheckout() {
    const btn = document.getElementById('checkoutBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const cart = getCart();
        if (cart.length === 0) return showToast('Корзина пуста', 'error');
        if (!isLoggedIn()) { location.href = '/login.html'; return; }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Оформление...';
        try {
            for (const item of cart) {
                await deals.create(item.id);
            }
            const { clearCart } = await import('./cart.js');
            clearCart();
            showToast('Все заказы оформлены!', 'success');
            document.getElementById('cartModalClose')?.click();
        } catch (err) { showToast(err.message, 'error'); }
        finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-credit-card"></i> Оформить заказ';
        }
    });
}

/* ---------- «Вы смотрели» ---------- */

function renderViewed() {
    const section = document.getElementById('viewedSection');
    const strip = document.getElementById('viewedStrip');
    if (!section || !strip) return;

    const items = getViewed();
    if (items.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    strip.innerHTML = items.map(p => `
        <div class="viewed-item" data-id="${p.id}">
            <div class="viewed-image">
                ${p.image
                    ? `<img src="${p.image}" alt="">`
                    : `<div class="viewed-icon" style="color:var(--primary);"><i class="${p.icon}"></i></div>`
                }
                ${p.is_premium ? '<div class="viewed-premium">🚀</div>' : ''}
            </div>
            <div class="viewed-title">${escapeHTML(p.title)}</div>
            <div class="viewed-price">
                ${formatPrice(p.price)}
                ${p.oldPrice ? `<span class="viewed-old">${formatPrice(p.oldPrice)}</span>` : ''}
            </div>
        </div>
    `).join('');

    strip.onclick = (e) => {
        const item = e.target.closest('[data-id]');
        if (!item) return;
        const id = Number(item.dataset.id);
        const product = allProducts.find(p => p.id === id);
        if (product) openProductModal(product);
    };
}

/* ---------- Фильтры ---------- */

function initFilters() {
    document.getElementById('filterSortBtn')?.addEventListener('click', openSortModal);

    const priceBtn = document.getElementById('filterPriceBtn');
    const pricePanel = document.getElementById('filterPricePanel');
    priceBtn?.addEventListener('click', () => {
        pricePanel.style.display = pricePanel.style.display === 'none' ? 'flex' : 'none';
    });

    document.getElementById('priceApply')?.addEventListener('click', () => {
        const min = Number(document.getElementById('priceMin').value);
        const max = Number(document.getElementById('priceMax').value);
        currentFilter.priceMin = min > 0 ? min : null;
        currentFilter.priceMax = max > 0 ? max : null;
        pagination.currentPage = 1;
        pricePanel.style.display = 'none';
        applyFilter();
    });

    const premiumBtn = document.getElementById('filterPremiumBtn');
    premiumBtn?.addEventListener('click', () => {
        currentFilter.onlyPremium = !currentFilter.onlyPremium;
        premiumBtn.classList.toggle('active', currentFilter.onlyPremium);
        pagination.currentPage = 1;
        applyFilter();
    });

    document.getElementById('filterResetBtn')?.addEventListener('click', () => {
        currentFilter = {
            category: 'all',
            query: '',
            game: null,
            sort: 'default',
            priceMin: null,
            priceMax: null,
            onlyPremium: false
        };
        document.getElementById('priceMin').value = '';
        document.getElementById('priceMax').value = '';
        premiumBtn?.classList.remove('active');
        document.querySelectorAll('.category-card').forEach(c => c.classList.remove('active'));
        document.querySelector('.category-card[data-category="all"]')?.classList.add('active');
        document.querySelectorAll('.game-strip-item').forEach(i => i.classList.remove('active'));
        document.getElementById('searchInput').value = '';
        pagination.currentPage = 1;
        applyFilter();
    });
}

function openSortModal() {
    const options = [
        { value: 'default',    label: 'По умолчанию',          icon: 'fa-th-large' },
        { value: 'price_asc',  label: 'Сначала дешёвые',       icon: 'fa-arrow-up' },
        { value: 'price_desc', label: 'Сначала дорогие',       icon: 'fa-arrow-down' },
        { value: 'new',        label: 'Сначала новые',         icon: 'fa-clock' },
        { value: 'popular',    label: 'По рейтингу продавца',  icon: 'fa-star' }
    ];

    const html = `
        <div class="modal-overlay open" id="sortModal">
            <div class="modal" style="max-width:420px;">
                <button class="modal-close" id="sortModalClose"><i class="fas fa-times"></i></button>
                <h2 class="modal-title">Сортировка</h2>
                <div class="sort-options">
                    ${options.map(o => `
                        <div class="sort-option ${currentFilter.sort === o.value ? 'active' : ''}" data-sort="${o.value}">
                            <i class="fas ${o.icon}"></i>
                            <span>${o.label}</span>
                            ${currentFilter.sort === o.value ? '<i class="fas fa-check" style="margin-left:auto;color:var(--primary);"></i>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = html;
    const modal = div.firstElementChild;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const close = () => { modal.remove(); document.body.style.overflow = ''; };

    document.getElementById('sortModalClose').onclick = close;
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    modal.querySelectorAll('[data-sort]').forEach(el => {
        el.onclick = () => {
            currentFilter.sort = el.dataset.sort;
            pagination.currentPage = 1;
            close();
            applyFilter();
        };
    });
}


function initViewed() {
    renderViewed();

    document.getElementById('viewedClear')?.addEventListener('click', () => {
        clearViewed();
        renderViewed();
        showToast('История очищена', 'info');
    });
}


function initBannerButton() {
    const btn = document.getElementById('bannerBtn');
    if (!btn) return;
    btn.onclick = () => {
        currentFilter.game = 'pubg';
        currentFilter.category = 'all';
        pagination.currentPage = 1;
        applyFilter();
        document.querySelector('.product-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
}


function initSellButton() {
    document.getElementById('sellBtn')?.addEventListener('click', () => {
        if (isLoggedIn()) location.href = '/sell.html';
        else location.href = '/login.html';
    });
}

document.addEventListener('DOMContentLoaded', () => {
initCart(); initModals(); initCategories(); initSearch(); initProductClicks(); initCheckout(); initSellButton(); initBannerButton(); initViewed(); initFilters();
loadFromUrl();
loadData();
});
