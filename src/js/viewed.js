/* ==========================================================
   История просмотренных товаров (localStorage)
   ========================================================== */

const STORAGE_KEY = 'games_shop_viewed';
const MAX_ITEMS = 20;

export function getViewed() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

export function addViewed(product) {
    if (!product || !product.id) return;

    let list = getViewed();
    list = list.filter(p => p.id !== product.id);

    list.unshift({
        id: product.id,
        title: product.title,
        price: product.price,
        oldPrice: product.oldPrice || null,
        icon: product.icon || 'fas fa-box',
        image: (product.images && product.images[0]) ? product.images[0].url : null,
        is_premium: product.is_premium || 0
    });

    list = list.slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function clearViewed() {
    localStorage.removeItem(STORAGE_KEY);
}

