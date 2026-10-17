import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
input: {
    main:      resolve(__dirname, 'index.html'),
    login:     resolve(__dirname, 'login.html'),
    dashboard: resolve(__dirname, 'dashboard.html'),
    profile:   resolve(__dirname, 'profile.html'),
    sell:      resolve(__dirname, 'sell.html'),
    logout:    resolve(__dirname, 'logout.html'),
    product:   resolve(__dirname, 'product.html'),
chat:      resolve(__dirname, 'chat.html'),
chats:     resolve(__dirname, 'chats.html'),
deal:      resolve(__dirname, 'deal.html')
}
    }
  }
});
