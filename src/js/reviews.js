import './auth.js';
import './nav.js';
import { escapeHTML } from './utils.js';

const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('user');

if (!username) {
    document.getElementById('reviewsList').innerHTML = '<div style="text-align:center; padding:40px; color:#fff;">Пользователь не указан</div>';
} else {
    document.getElementById('backBtn').href = `/profile.html?u=${username}`;
    loadReviews();
}

async function loadReviews() {
    try {
        // Получаем инфу о юзере
        const userRes = await fetch(`/api/users/${username}/profile`);
        const userData = await userRes.json();
        
        if (userData.user) {
            document.getElementById('avgRating').textContent = (userData.user.rating || 0).toFixed(1);
            document.getElementById('totalCount').textContent = `${userData.user.reviews_count || 0} отзывов`;
            
            const rounded = Math.round(userData.user.rating || 0);
            document.getElementById('starsDisplay').textContent = '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
        }

        // Получаем сами отзывы
        const res = await fetch(`/api/users/${username}/reviews`);
        const data = await res.json();
        
        const container = document.getElementById('reviewsList');
        if (!data.reviews || data.reviews.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:#888;">Пока нет отзывов</div>';
            return;
        }

        container.innerHTML = data.reviews.map(r => {
            const date = new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
            const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
            
            // Аватарка автора
            const avatar = r.author_avatar 
                ? `<img src="${r.author_avatar}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`
                : `<div style="width:40px;height:40px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;">${r.author_name[0].toUpperCase()}</div>`;

            // Картинка товара (если есть)
            const prodImg = r.product_image 
                ? `<img src="${r.product_image}" style="width:60px;height:45px;border-radius:6px;object-fit:cover;margin-right:10px;">`
                : `<div style="width:60px;height:45px;border-radius:6px;background:#333;display:flex;align-items:center;justify-content:center;margin-right:10px;"><i class="fas fa-box" style="color:#555;"></i></div>`;

            return `
                <div style="background: #1e1e1e; border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid #2a2a2a;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${avatar}
                            <span style="color:#fff; font-weight:bold;">${escapeHTML(r.author_name)}</span>
                        </div>
                        <span style="color:#888; font-size:12px;">${date}</span>
                    </div>
                    
                    <div style="color: #2196f3; font-size: 20px; margin-bottom: 15px;">
                        ${stars}
                    </div>
                    
                    <a href="/product.html?id=${r.product_id}" style="display:flex; align-items:center; background:#121212; padding:10px; border-radius:8px; text-decoration:none; margin-bottom:15px;">
                        ${prodImg}
                        <div style="flex:1; overflow:hidden;">
                            <div style="color:#fff; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(r.product_title)}</div>
                            <div style="color:#fff; font-weight:bold; font-size:14px; margin-top:2px;">${r.product_price} ₽</div>
                        </div>
                    </a>
                    
                    ${r.text ? `<div style="color:#ddd; font-size:14px; line-height:1.4;">${escapeHTML(r.text)}</div>` : ''}
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error(err);
        document.getElementById('reviewsList').innerHTML = '<div style="text-align:center; padding:40px; color:var(--danger);">Ошибка загрузки отзывов</div>';
    }
}
