import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5173, host: true },
  build: { outDir: 'dist', target: 'es2020', rolldownOptions: { input: ['index.html', 'bench.html'] } },
});
