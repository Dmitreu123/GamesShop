import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        login: path.resolve(__dirname, 'login.html'),
        register: path.resolve(__dirname, 'login.html'), // У тебя регистрация на той же странице
        profile: path.resolve(__dirname, 'profile.html'),
        product: path.resolve(__dirname, 'product.html'),
        sell: path.resolve(__dirname, 'sell.html'),
        chats: path.resolve(__dirname, 'chats.html'),
        chat: path.resolve(__dirname, 'chat.html'),
        deal: path.resolve(__dirname, 'deal.html'),
        dashboard: path.resolve(__dirname, 'dashboard.html'),
        admin: path.resolve(__dirname, 'admin.html'),
        reviews: path.resolve(__dirname, 'reviews.html'),
        support: path.resolve(__dirname, 'support.html'),
        privacy: path.resolve(__dirname, 'privacy.html'),
        agreement: path.resolve(__dirname, 'agreement.html'),
        terms: path.resolve(__dirname, 'terms.html'),
        contacts: path.resolve(__dirname, 'contacts.html')
      }
    }
  }
});
