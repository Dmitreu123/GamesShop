/* ==========================================================
   Нижняя навигация для мобильной версии
   ========================================================== */

import { getUser, isLoggedIn } from './auth.js';

export function renderBottomNav(activePage = 'search') {
  // Не показываем на страницах входа/регистрации
  if (location.pathname.includes('login.html')) return;
  // Не показываем на странице чата (там поле ввода)
  if (location.pathname.includes('chat.html') && !location.pathname.includes('chats.html')) return;

  // Проверяем, не создана ли уже навигация
  if (document.getElementById('bottomNav')) return;

  const user = getUser();
  const loggedIn = isLoggedIn();

  // Счётчик непрочитанных (пока 0, этап 6 оживит)
  const unreadCount = 0;
  const unreadBadge = unreadCount > 0 ? `<span class="nav-badge">${unreadCount}</span>` : '';

  // Ссылка на профиль: если вошёл — на dashboard, если нет — на login
const profileLink = loggedIn
  ? `/profile.html?u=${encodeURIComponent(user?.username || '')}`
  : '/login.html';
let profileIconHTML = '<i class="fas fa-user"></i>';
if (loggedIn && user) {
  profileIconHTML = user.avatar
    ? `<img src="${user.avatar}" alt="" class="nav-avatar-img">`
    : `<span class="nav-avatar-letter">${user.username[0].toUpperCase()}</span>`;
}


  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.id = 'bottomNav';
  nav.innerHTML = `
    <a href="/" class="bottom-nav-item ${activePage === 'search' ? 'active' : ''}">
      <i class="fas fa-search"></i>
      <span>Поиск</span>
    </a>
    <a href="/sell.html" class="bottom-nav-item ${activePage === 'sell' ? 'active' : ''}">
      <i class="fas fa-plus-circle"></i>
      <span>Продать</span>
    </a>
    <a href="/chats.html" class="bottom-nav-item ${activePage === 'chats' ? 'active' : ''}">
      <div class="nav-icon-wrap">
        <i class="fas fa-comments"></i>
        ${unreadBadge}
      </div>
      <span>Чаты</span>
    </a>
<a href="${profileLink}" class="bottom-nav-item ${activePage === 'profile' ? 'active' : ''}">
  <div class="nav-avatar-wrap">${profileIconHTML}</div>
  <span>Профиль</span>
</a>
  `;

  document.body.appendChild(nav);
  document.body.classList.add('has-bottom-nav');
}

/* Автозапуск при загрузке модуля */
document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;
  let active = 'search';

  if (path.includes('sell')) active = 'sell';
  else if (path.includes('chats')) active = 'chats';
  else if (path.includes('dashboard') || path.includes('profile')) active = 'profile';

  renderBottomNav(active);
});
