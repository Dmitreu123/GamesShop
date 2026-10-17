import { formatPrice, escapeHTML, showToast } from './utils.js';

const STORAGE_KEY = 'games_shop_cart';
let cart = [];

function load() {
    try { cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { cart = []; }
}
function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateBadge();
}
export function addToCart(product) {
    const ex = cart.find(i => i.id === product.id);
    if (ex) { ex.qty += 1; showToast(`"${product.title}" — теперь ${ex.qty} шт.`, 'success'); }
    else { cart.push({ id: product.id, title: product.title, price: product.price, icon: product.icon, qty: 1 }); showToast(`"${product.title}" добавлен в корзину`, 'success'); }
    save(); renderCart();
}
export function removeFromCart(id) { cart = cart.filter(i => i.id !== id); save(); renderCart(); showToast('Удалено', 'info'); }
export function clearCart() { cart = []; save(); renderCart(); }
export function getCart() { return cart; }
export function getTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
export function getCount() { return cart.reduce((s, i) => s + i.qty, 0); }

function updateBadge() {
    const badge = document.getElementById('cartCount');
    if (!badge) return;
    const count = getCount();
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
}

export function renderCart() {
    const container = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = `<div class="cart-empty"><i class="fas fa-shopping-basket"></i>Корзина пуста</div>`;
        totalEl.textContent = '0 ₽';
        return;
    }
    container.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="item-icon"><i class="${escapeHTML(item.icon)}"></i></div>
            <div class="item-info">
                <h4>${escapeHTML(item.title)}</h4>
                <p>${item.qty} × ${formatPrice(item.price)}</p>
            </div>
            <div class="item-price">${formatPrice(item.price * item.qty)}</div>
            <button class="item-remove" data-remove="${item.id}"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join('');
    totalEl.textContent = formatPrice(getTotal());
}

export function initCart() {
    load(); updateBadge(); renderCart();
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-remove]');
        if (btn) { e.stopPropagation(); removeFromCart(Number(btn.dataset.remove)); }
    });
}