/* ==========================================================
   Модалка продажи — 5 шагов
   ========================================================== */

import { getToken, getUser } from './auth.js';
import { escapeHTML, showToast } from './utils.js';

// Если редактируем, меняем текст кнопки (если она есть в HTML)
document.addEventListener('DOMContentLoaded', () => {
});

const COMMISSION_RATE = 0.15;   // 15%
const MIN_PRICE = 50;
const PREMIUM_PRICE = 19;       // разово
const BOOST_PRICE = 9;          // за сутки авто
const PREMIUM_FREE = true;      // ← когда сайт запустится — false

let state = {
  step: 1,
  game: null,
  category: null,
  title: '',
  description: '',
  transferType: 'full',
  images: [],
  price: 0,
  login: '',
  password: '',
  accountId: '',
  comment: '',
  wantPremium: true,     // по умолчанию выбран премиум
  wantAutoBoost: false
};

let gamesList = [];

/* ---------- Открытие модалки ---------- */

export async function openSellModal({ gameId, categoryId } = {}) {
    if (gamesList.length === 0) {
        try {
            const res = await fetch('/api/games');
            gamesList = await res.json();
        } catch {
            showToast('Не удалось загрузить игры', 'error');
            return;
        }
    }

    state = {
        step: 1,
        game: gameId || null,
        category: categoryId || null,
categoryTitle: arguments[0]?.categoryTitle || '', // <-- ДОБАВЬ ЭТУ СТРОЧКУ
        title: '',
        description: '',
        transferType: 'full',
        images: [],
        price: 0,
        login: '',
        password: '',
        accountId: '',
        comment: '',
        wantPremium: true,
        wantAutoBoost: false
    };

    render();
    document.getElementById('sellModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

export function closeSellModal() {
  document.getElementById('sellModal').classList.remove('open');
  document.body.style.overflow = '';
}

/* ---------- Рендер ---------- */

const STEP_LABELS = ['Основное', 'Фото', 'Цена', 'Данные', 'Премиум'];

function render() {
  const modal = document.getElementById('sellModal');
  modal.innerHTML = `
    <div class="sell-modal-content">
      <button class="modal-close" id="sellModalClose"><i class="fas fa-times"></i></button>

      <div class="sell-progress">
        ${[1,2,3,4,5].map(n => `
          <div class="sell-progress-step ${state.step >= n ? 'active' : ''} ${state.step === n ? 'current' : ''}">
            <div class="sell-progress-dot">${state.step > n ? '<i class="fas fa-check"></i>' : n}</div>
            <div class="sell-progress-label">${STEP_LABELS[n-1]}</div>
          </div>
        `).join('<div class="sell-progress-line"></div>')}
      </div>

      <div class="sell-step-body" id="sellStepBody"></div>

      <div class="sell-step-footer">
        ${state.step > 1 ? '<button class="btn btn-outline" id="sellPrev"><i class="fas fa-arrow-left"></i> Назад</button>' : '<div></div>'}
        ${state.step < 5
          ? '<button class="btn btn-primary" id="sellNext">Далее <i class="fas fa-arrow-right"></i></button>'
          : '<button class="btn btn-primary" id="sellPublish"><i class="fas fa-check"></i> Опубликовать</button>'}
      </div>
    </div>
  `;

  renderStep();

  document.getElementById('sellModalClose').onclick = closeSellModal;
  document.getElementById('sellPrev')?.addEventListener('click', prevStep);
  document.getElementById('sellNext')?.addEventListener('click', nextStep);
  document.getElementById('sellPublish')?.addEventListener('click', publish);
}

function renderStep() {
  const body = document.getElementById('sellStepBody');
  if (state.step === 1) body.innerHTML = step1();
  if (state.step === 2) body.innerHTML = step2();
  if (state.step === 3) body.innerHTML = step3();
  if (state.step === 4) body.innerHTML = step4();
  if (state.step === 5) body.innerHTML = step5();
  bindStepEvents();
}

/* ---------- Шаг 1: Основное ---------- */

function step1() {
  const gameOptions = gamesList.map(g =>
    `<option value="${g.id}" ${state.game === g.id ? 'selected' : ''}>${escapeHTML(g.name)}</option>`
  ).join('');

  const currentGame = gamesList.find(g => g.id === state.game);
  const categoryOptions = currentGame
    ? currentGame.categories.map(c => `<option value="${c}" ${state.category === c ? 'selected' : ''}>${c}</option>`).join('')
    : '';

  return `
    <h2 class="sell-step-title">Основная информация</h2>

    <label class="sell-label">Игра</label>
    <select id="sfGame" class="sell-input">
      <option value="">— Выберите игру —</option>
      ${gameOptions}
    </select>

    ${currentGame ? `
      <label class="sell-label" style="margin-top:14px;">Категория</label>
      <select id="sfCategory" class="sell-input">
        <option value="">— Выберите категорию —</option>
        ${categoryOptions}
      </select>
    ` : ''}

    <label class="sell-label" style="margin-top:14px;">Способ передачи</label>
    <div class="sell-radio-group">
      <label class="sell-radio ${state.transferType === 'full' ? 'active' : ''}">
        <input type="radio" name="sfTransfer" value="full" ${state.transferType === 'full' ? 'checked' : ''}>
        <div>
          <div class="sell-radio-title">Полный доступ</div>
          <div class="sell-radio-desc">Личный аккаунт с доступом ко всем привязкам</div>
        </div>
      </label>
      <label class="sell-radio ${state.transferType === 'partial' ? 'active' : ''}">
        <input type="radio" name="sfTransfer" value="partial" ${state.transferType === 'partial' ? 'checked' : ''}>
        <div>
          <div class="sell-radio-title">Частичный доступ</div>
          <div class="sell-radio-desc">Без смены некоторых привязок</div>
        </div>
      </label>
    </div>

    <label class="sell-label" style="margin-top:14px;">Название товара</label>
    <input type="text" id="sfTitle" class="sell-input" placeholder="Например: PUBG Mobile аккаунт с 50 мифик скинами" value="${escapeHTML(state.title)}" maxlength="120">

    <label class="sell-label" style="margin-top:14px;">Описание</label>
    <textarea id="sfDescription" class="sell-input" rows="4" placeholder="Что входит в товар, условия сделки..." maxlength="2000">${escapeHTML(state.description)}</textarea>
  `;
}

/* ---------- Шаг 2: Фото ---------- */

function step2() {
  return `
    <h2 class="sell-step-title">Фото товара (до 10)</h2>
    <p style="color:var(--text-dim);font-size:13px;margin-bottom:14px;">
      Загрузите фото 4:3 в порядке выбора. Первое фото станет главным.
    </p>

    <div class="sell-photos-grid" id="sfPhotosGrid">
      ${state.images.map((f, i) => `
        <div class="sell-photo-item">
          <img src="${URL.createObjectURL(f)}" alt="">
          <button class="sell-photo-remove" data-idx="${i}"><i class="fas fa-times"></i></button>
          ${i === 0 ? '<div class="sell-photo-main">Главное</div>' : ''}
        </div>
      `).join('')}

      ${state.images.length < 10 ? `
        <label class="sell-photo-add">
          <i class="fas fa-plus"></i>
          <span>Добавить</span>
          <input type="file" id="sfPhotoInput" accept="image/*" multiple>
        </label>
      ` : ''}
    </div>
  `;
}

/* ---------- Шаг 3: Цена ---------- */

function step3() {
  const price = Number(state.price) || 0;
  const income = price > 0 ? Math.max(0, Math.floor(price * (1 - COMMISSION_RATE))) : 0;

  return `
    <h2 class="sell-step-title">Цена товара</h2>

    <div class="sell-price-row">
      <div class="sell-price-box">
        <label class="sell-label">Цена</label>
        <input type="number" id="sfPrice" class="sell-input" placeholder="50" min="${MIN_PRICE}" value="${state.price || ''}">
      </div>
      <div class="sell-price-arrow"><i class="fas fa-arrow-right"></i></div>
      <div class="sell-price-box">
        <label class="sell-label">Вы получите</label>
        <div class="sell-income">${income} ₽</div>
      </div>
    </div>

    <div class="sell-hint">
      Минимальная цена — ${MIN_PRICE} ₽<br>
      Комиссия сервиса — ${Math.round(COMMISSION_RATE * 100)}%<br>
      После подтверждения заказа вы получите указанную сумму.
    </div>
  `;
}

/* ---------- Шаг 4: Данные ---------- */

function step4() {
    // Проверяем, является ли категория "Аккаунты" (по ID или названию)
    // Если в базе ID=1 это Аккаунты, а название содержит "Аккаунт"
    const isAccount = state.category === 1 || state.category === 'accounts' || (state.categoryTitle && state.categoryTitle.toLowerCase().includes('аккаунт'));

    return `
        <h2 class="sell-step-title">Данные товара</h2>
        <p style="color:var(--text-dim);font-size:13px;margin-bottom:14px;">
            Эти данные покупатель увидит только после оплаты сделки.
        </p>

${!isAccount ? `
    <label class="sell-label" style="color: #ff9800;">Ключи / Коды для автовыдачи</label>
    <p style="font-size: 12px; color: #888; margin-bottom: 5px;">Вставьте ключи (каждый с новой строки). Покупатель получит один ключ после покупки.</p>
    <textarea id="sfKeys" class="sell-input" rows="4" placeholder="Ключ 1&#10;Ключ 2&#10;Ключ 3">${state.keys || ''}</textarea>
` : ''}

        ${isAccount ? `
            <label class="sell-label">Логин</label>
            <input type="text" id="sfLogin" class="sell-input" value="${state.login || ''}" placeholder="Логин от аккаунта">

            <label class="sell-label" style="margin-top:14px;">Пароль</label>
            <div style="position:relative;">
                <input type="password" id="sfPassword" class="sell-input" value="${state.password || ''}" placeholder="Пароль">
                <button type="button" id="sfTogglePass" style="position:absolute; right:10px; top:10px; background:none; border:none; color:#888;"><i class="fas fa-eye"></i></button>
            </div>
        ` : ''}

        <label class="sell-label" style="margin-top:14px;">
            ${isAccount ? 'ID аккаунта / Ник' : 'ID игрока / Ник для зачисления'}
        </label>
        <input type="text" id="sfAccountId" class="sell-input" value="${state.accountId || ''}" placeholder="${isAccount ? 'ID или ник' : 'Введите ваш ID или ник в игре'}">

        <label class="sell-label" style="margin-top:14px;">Комментарий</label>
        <textarea id="sfComment" class="sell-input" rows="3" placeholder="Любая доп. информация для покупателя">${state.comment || ''}</textarea>

        <div class="sell-warning">
            🔒 <b>Данные защищены</b>. Покупатель получит их только после оплаты.
        </div>
    `;
}


/* ---------- Шаг 5: Премиум ---------- */

function step5() {
  const priceLabel = PREMIUM_FREE ? '<s style="color:#6a7a92;">19 ₽</s> <span style="color:#10b981;font-weight:700;">Бесплатно</span>' : '<b style="color:white;">19 ₽</b>';
  const boostLabel = PREMIUM_FREE ? '<s style="color:#6a7a92;">9 ₽/сутки</s> <span style="color:#10b981;font-weight:700;">Бесплатно</span>' : '<b style="color:white;">9 ₽/сутки</b>';

  return `
    <h2 class="sell-step-title">Продвижение товара</h2>

    <div class="sell-premium-options">
      <label class="sell-premium-card ${state.wantPremium ? 'active' : ''}">
        <input type="radio" name="sfPremium" value="premium" ${state.wantPremium ? 'checked' : ''}>
        <div class="sell-premium-icon">🚀</div>
        <div class="sell-premium-info">
          <div class="sell-premium-title">Премиум</div>
          <div class="sell-premium-desc">Товар в топе на главной и в категории. Максимум покупателей.</div>
        </div>
        <div class="sell-premium-price">${priceLabel}</div>
      </label>

      <label class="sell-premium-card ${!state.wantPremium ? 'active' : ''}">
        <input type="radio" name="sfPremium" value="normal" ${!state.wantPremium ? 'checked' : ''}>
        <div class="sell-premium-icon" style="background:#1f2a3c;">📦</div>
        <div class="sell-premium-info">
          <div class="sell-premium-title">Обычное размещение</div>
          <div class="sell-premium-desc">Бесплатно. Товар в общей ленте.</div>
        </div>
        <div class="sell-premium-price" style="color:#10b981;font-weight:700;">Бесплатно</div>
      </label>
    </div>

    ${state.wantPremium ? `
      <div class="sell-autoboost">
        <div class="sell-autoboost-info">
          <div class="sell-autoboost-title">⏱ Авто-поднятие в топ</div>
          <div class="sell-autoboost-desc">Каждые 24 часа товар автоматически возвращается в топ</div>
        </div>
        <div class="sell-autoboost-right">
          <div class="sell-premium-price">${boostLabel}</div>
          <label class="sell-switch">
            <input type="checkbox" id="sfAutoBoost" ${state.wantAutoBoost ? 'checked' : ''}>
            <span class="sell-switch-slider"></span>
          </label>
        </div>
      </div>
    ` : ''}

    <div class="sell-hint" style="margin-top:16px;">
      ${PREMIUM_FREE
        ? '🎉 <b>Пока сервис молодой — премиум бесплатный!</b> Воспользуйтесь, чтобы ваш товар увидели первым.'
        : '💡 Премиум оплачивается один раз за публикацию. Авто-поднятие — раз в сутки.'}
    </div>
  `;
}

/* ---------- События ---------- */

function bindStepEvents() {
  if (state.step === 1) {
    document.getElementById('sfGame')?.addEventListener('change', (e) => {
      state.game = e.target.value;
      state.category = null;
      renderStep();
    });
    document.getElementById('sfCategory')?.addEventListener('change', (e) => { state.category = e.target.value; });

    document.querySelectorAll('input[name="sfTransfer"]').forEach(el => {
      el.addEventListener('change', (e) => {
        state.transferType = e.target.value;
        document.querySelectorAll('.sell-radio').forEach(r => r.classList.remove('active'));
        e.target.closest('.sell-radio').classList.add('active');
      });
    });
    document.getElementById('sfTitle')?.addEventListener('input', (e) => { state.title = e.target.value; });
    document.getElementById('sfDescription')?.addEventListener('input', (e) => { state.description = e.target.value; });
  }

  if (state.step === 2) {
    document.getElementById('sfPhotoInput')?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      const free = 10 - state.images.length;
      state.images.push(...files.slice(0, free));
      renderStep();
    });
    document.querySelectorAll('.sell-photo-remove').forEach(btn => {
      btn.onclick = () => { state.images.splice(Number(btn.dataset.idx), 1); renderStep(); };
    });
  }

  if (state.step === 3) {
    document.getElementById('sfPrice')?.addEventListener('input', (e) => {
      state.price = Number(e.target.value) || 0;
      const income = Math.max(0, Math.floor(state.price * (1 - COMMISSION_RATE)));
      const incomeEl = document.querySelector('.sell-income');
      if (incomeEl) incomeEl.textContent = income + ' ₽';
    });
  }

  if (state.step === 4) {
    document.getElementById('sfLogin')?.addEventListener('input', (e) => { state.login = e.target.value; });
    document.getElementById('sfPassword')?.addEventListener('input', (e) => { state.password = e.target.value; });
    document.getElementById('sfAccountId')?.addEventListener('input', (e) => { state.accountId = e.target.value; });
    document.getElementById('sfComment')?.addEventListener('input', (e) => { state.comment = e.target.value; });

    document.getElementById('sfTogglePass')?.addEventListener('click', () => {
      const p = document.getElementById('sfPassword');
      const i = document.querySelector('#sfTogglePass i');
      if (p.type === 'password') { p.type = 'text'; i.className = 'fas fa-eye-slash'; }
      else { p.type = 'password'; i.className = 'fas fa-eye'; }
    });
  }

  if (state.step === 5) {
    document.querySelectorAll('input[name="sfPremium"]').forEach(el => {
      el.addEventListener('change', (e) => {
        state.wantPremium = e.target.value === 'premium';
        if (!state.wantPremium) state.wantAutoBoost = false;
        renderStep();
      });
    });
    document.getElementById('sfAutoBoost')?.addEventListener('change', (e) => {
      state.wantAutoBoost = e.target.checked;
    });
  }
}

/* ---------- Навигация ---------- */

function validateStep() {
  if (state.step === 1) {
    if (!state.game)         return 'Выберите игру';
    if (!state.category)     return 'Выберите категорию';
    if (!state.title.trim()) return 'Введите название';
    return null;
  }
  if (state.step === 2) {
    if (state.images.length === 0) return 'Загрузите хотя бы одно фото';
    return null;
  }
  if (state.step === 3) {
    if (!state.price || state.price < MIN_PRICE) return `Минимальная цена — ${MIN_PRICE} ₽`;
    return null;
  }
  return null;
}

function nextStep() {
  const err = validateStep();
  if (err) return showToast(err, 'error');
  if (state.step < 5) { state.step++; render(); }
}

function prevStep() {
  if (state.step > 1) { state.step--; render(); }
}

/* ---------- Публикация ---------- */

async function publish() {
const isAccount = state.category === 1 || state.category === 'accounts' || (state.categoryTitle && state.categoryTitle.toLowerCase().includes('аккаунт'));

if (isAccount) {
    if (!state.login.trim() || !state.password.trim()) {
        return showToast('Заполните логин и пароль', 'error');
    }
}

  const fd = new FormData();
  fd.append('title', state.title);
  fd.append('description', state.description);
  fd.append('price', state.price);
  fd.append('game', state.game);
let catText = 'accounts'; // по умолчанию
if (state.categoryTitle) {
    const t = state.categoryTitle.toLowerCase();
    if (t.includes('аккаунт')) catText = 'accounts';
    else if (t.includes('uc') || t.includes('валют') || t.includes('монет')) catText = 'items';
    else catText = 'services'; // услуги, бусты и т.д.
}
fd.append('category', catText);
  fd.append('transfer_type', state.transferType);
  fd.append('login', state.login);
  fd.append('password', state.password);
  fd.append('account_id', state.accountId);  
fd.append('comment', state.comment);
  fd.append('is_premium', state.wantPremium ? 'true' : 'false');
  fd.append('auto_boost', state.wantAutoBoost ? 'true' : 'false');

  state.images.forEach(f => fd.append('images', f));

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка публикации');

    showToast('Товар опубликован!', 'success');
    closeSellModal();
    setTimeout(() => location.reload(), 800);
  } catch (err) {
    alert('ОШИБКА: ' + err.message); // <-- ВЫВЕДЕТ ОШИБКУ НА ЭКРАН
    showToast(err.message, 'error');
  }
}

	
async function loadEditData() {
    if (!isEditMode) return;
    try {
        const res = await fetch(`/api/products/${editId}`);
        if (!res.ok) throw new Error('Ошибка загрузки');
        const data = await res.json();
        
        // Записываем в state
        state.title = data.title || '';
        state.description = data.description || '';
        state.price = data.price || '';
        state.game = data.game || '';
        state.category = data.category || '';
        state.transferType = data.transfer_type || 'full';
        state.login = data.login || '';
        state.password = data.password || ''; 
        state.accountId = data.account_id || '';
        state.comment = data.comment || '';
        
        // Перерисовываем форму
        if (typeof render === 'function') render();

        // ПРИНУДИТЕЛЬНО заполняем инпуты (если они есть на странице)
        setTimeout(() => {
            const inputs = document.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                const name = input.name || input.id;
                if (state[name] !== undefined) {
                    input.value = state[name];
                }
            });
        }, 100);

    } catch (e) {
        console.error('Ошибка загрузки:', e);
    }
}

