import { Resend } from 'resend';
import 'dotenv/config';

// Инициализируем Resend с нашим API-ключом
const resend = new Resend(process.env.RESEND_API_KEY);

// Функция отправки кода подтверждения
export async function sendVerificationCode(email, code) {
  try {
    const { data, error } = await resend.emails.send({
      // ВАЖНО: Пока домен не подтвержден, используем onboarding@resend.dev.
      // Позже, когда подтвердишь свой домен на Resend, заменишь на 'Games Shop <noreply@твойдомен.com>'
from: 'Games Shop <noreply@games-shop.shop>',
      to: email,
      subject: 'Код подтверждения — Games Shop',
      html: `
        <div style="background: #121212; color: #fff; padding: 20px; border-radius: 10px; font-family: sans-serif;">
          <h2 style="color: #2196f3;">Games Shop</h2>
          <p>Ваш код для подтверждения почты:</p>
          <h1 style="letter-spacing: 5px; background: #2a2a2a; padding: 10px; text-align: center; border-radius: 8px;">${code}</h1>
          <p style="color: #888; font-size: 12px;">Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.</p>
        </div>
      `
    });

    if (error) {
      console.error('Ошибка Resend:', error);
      return false;
    }

    console.log('Письмо успешно отправлено через Resend:', data.id);
    return true;
  } catch (err) {
    console.error('Критическая ошибка отправки:', err.message);
    return false;
  }
}
