import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function sendVerificationCode(email, code) {
  try {
    await transporter.sendMail({
      from: `"Games Shop" <${process.env.EMAIL_USER}>`,
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
    return true;
  } catch (error) {
    console.error('Ошибка отправки письма:', error);
    return false;
  }
}
