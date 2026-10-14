// Cấu hình Vite: React + Tailwind v4, chuyển /api và /uploads sang backend để khỏi lo CORS
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // đổi cổng nếu PORT trong backend/.env khác 8686
      '/api': 'http://localhost:8686',
      '/uploads': 'http://localhost:8686',
    },
  },
});
