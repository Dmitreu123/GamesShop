import { formatPrice, escapeHTML } from './utils.js';
import { addToCart } from './cart.js';

export function openProductModal(product) {
    const modal = document.getElementById('productModal');
    const body = document.getElementById('modalBody');
    const oldPriceHTML = product.oldPrice ? `<span class="price-old">${formatPrice(product.oldPrice)}</span>` : '';

body.innerHTML = `
    ${product.images && product.images.length > 0
        ? `<div class="product-gallery" style="display:grid;grid-template-columns:${product.images.length > 1 ? 'repeat(2,1fr)' : '1fr'};gap:8px;margin-bottom:20px;">
             ${product.images.map(img => `
                 <div style="height:${product.images.length === 1 ? '200px' : '140px'};border-radius:12px;overflow:hidden;background:#0e141d;">
                     <img src="${img.url}" alt="" style="width:100%;height:100%;object-fit:cover;">
                 </div>
             `).join('')}
           </div>`
        : ''
    }
    <div class="product-hero">
        <div class="product-icon"><i class="${product.icon || 'fas fa-box'}"></i></div>
        <div class="product-hero-info">
            <h2>${escapeHTML(product.title)}</h2>
            <div class="meta">
                <span><i class="fas fa-star"></i> 4.9 (${product.reviews || 47})</span>
                <span><i class="fas fa-shield-alt"></i> Гарантия 7 дней</span>
                <span><i class="fas fa-bolt"></i> Мгновенно</span>
            </div>
        </div>
    </div>
    <div class="description">${escapeHTML(product.desc || product.description || '')}</div>
    <div class="price-block">
        <span class="price-value">${formatPrice(product.price)}</span>
        ${product.oldPrice ? `<span class="price-old">${formatPrice(product.oldPrice)}</span>` : ''}
    </div>
    <div class="modal-actions">
        <button class="btn btn-primary" id="modalAddToCart"><i class="fas fa-shopping-cart"></i> В корзину</button>
        <button class="btn btn-outline" id="modalBuyNow"><i class="fas fa-bolt"></i> Купить сейчас</button>
    </div>
`;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    document.getElementById('modalAddToCart').onclick = () => { addToCart(product); closeModal('productModal'); };
    document.getElementById('modalBuyNow').onclick = () => { addToCart(product); closeModal('productModal'); openCartModal(); };
}

export function openCartModal() {
    document.getElementById('cartModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
}

export function initModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay.id); });
    });
    const m1 = document.getElementById('modalClose'); if (m1) m1.onclick = () => closeModal('productModal');
    const m2 = document.getElementById('cartModalClose'); if (m2) m2.onclick = () => closeModal('cartModal');
    const cb = document.getElementById('cartBtn'); if (cb) cb.onclick = openCartModal;
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
    });
}
