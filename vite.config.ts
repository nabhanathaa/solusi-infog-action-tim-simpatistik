import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' membuat hasil build bisa di-deploy di subfolder (GitHub Pages) maupun root (Netlify/Vercel).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', chunkSizeWarningLimit: 700 },
});
