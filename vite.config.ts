import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://jayne-07.github.io/maze-generator/ on GitHub Pages.
export default defineConfig({
  base: '/maze-generator/',
  plugins: [react()],
});
