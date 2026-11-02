	export function renderFooter() {
    if (document.getElementById('siteFooter')) return;

    const footerHTML = `
        <footer id="siteFooter" style="background: #121212; padding: 40px 20px 100px 20px; border-top: 1px solid #2a2a2a; margin-top: 40px;">
            <div class="container" style="max-width: 1000px; margin: 0 auto;">
                
<h3 style="color: #fff; font-size: 18px; margin-bottom: 15px;">Способы оплаты</h3>
<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 30px; align-items: center;">
<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" alt="Visa" style="height: 25px; background: #fff; padding: 2px 5px; border-radius: 4px;">
    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="MasterCard" style="height: 25px; background: #fff; padding: 2px 5px; border-radius: 4px;">
    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b9/Mir-logo.SVG.svg" alt="МИР" style="height: 25px; background: #fff; padding: 2px 5px; border-radius: 4px;">
</div>

<div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 30px;">
    <a href="/privacy.html" style="color: #aaa; text-decoration: none; font-size: 14px;">Политика конфиденциальности</a>
    <a href="/agreement.html" style="color: #aaa; text-decoration: none; font-size: 14px;">Пользовательское соглашение</a>
    <a href="/terms.html" style="color: #aaa; text-decoration: none; font-size: 14px;">Условия продажи</a>
    <a href="/contacts.html" style="color: #aaa; text-decoration: none; font-size: 14px;">Контакты</a>
</div>

                <h3 style="color: #fff; font-size: 18px; margin-bottom: 15px;">Социальные сети</h3>
                <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                    <a href="#" style="color: #2196f3; font-size: 28px;"><i class="fab fa-telegram"></i></a>
                    <a href="#" style="color: #4caf50; font-size: 28px;"><i class="fab fa-whatsapp"></i></a>
                    <a href="#" style="color: #fff; font-size: 28px;"><i class="fab fa-vk"></i></a>
                    <a href="#" style="color: #ff0000; font-size: 28px;"><i class="fab fa-youtube"></i></a>
                </div>
<a href="/support.html" style="display: block; text-align: center; width: 100%; background: #2196f3; color: #fff; text-decoration: none; padding: 16px; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; margin-bottom: 30px; box-sizing: border-box;">
    Написать в поддержку
</a>

                <div style="color: #666; font-size: 12px; text-align: center;">
                    © 2026 Games Shop — маркетплейс игровых товаров и услуг. Все права защищены.
                </div>
            </div>
        </footer>
    `;

    document.body.insertAdjacentHTML('beforeend', footerHTML);
}
