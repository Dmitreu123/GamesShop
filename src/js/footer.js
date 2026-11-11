export function renderFooter() {
    if (document.getElementById('siteFooter')) return;

    const footerHTML = `
        <footer id="siteFooter" class="gs-footer">
            <div class="gs-footer-container">
                
                <!-- Верхний блок: Ссылки и Поддержка -->
                <div class="gs-footer-top">
                    <div class="gs-footer-links">
                        <a href="/privacy.html">Политика конфиденциальности</a>
                        <a href="/agreement.html">Пользовательское соглашение</a>
                        <a href="/terms.html">Условия продажи</a>
                        <a href="/contacts.html">Контакты</a>
                    </div>
                    <div class="gs-footer-support">
                        <a href="/support.html" class="gs-support-btn">
                            <i class="fas fa-headset"></i> Техподдержка
                        </a>
                    </div>
                </div>

                <!-- Средний блок: Оплата и Соцсети -->
                <div class="gs-footer-middle">
                    <div class="gs-footer-payments">
                        <span class="gs-pay-label">Принимаем к оплате:</span>
                        <div class="gs-pay-icons">
                            <div class="gs-pay-icon"><i class="fab fa-cc-visa"></i></div>
                            <div class="gs-pay-icon"><i class="fab fa-cc-mastercard"></i></div>
                            <div class="gs-pay-icon" style="font-weight:bold; font-size:11px;">МИР</div>
                        </div>
                    </div>
                    <div class="gs-footer-socials">
                        <a href="#" class="gs-social-link"><i class="fab fa-telegram"></i></a>
                        <a href="#" class="gs-social-link"><i class="fab fa-whatsapp"></i></a>
                        <a href="#" class="gs-social-link"><i class="fab fa-vk"></i></a>
                        <a href="#" class="gs-social-link"><i class="fab fa-youtube"></i></a>
                    </div>
                </div>

                <!-- Нижний блок: Копирайт -->
                <div class="gs-footer-bottom">
                    © 2026 Games Shop — маркетплейс игровых товаров и услуг.
                </div>
            </div>
        </footer>
    `;

    document.body.insertAdjacentHTML('beforeend', footerHTML);
}
