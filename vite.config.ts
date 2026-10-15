import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: { output: { manualChunks(id) { if (id.includes('node_modules/@supabase')) return 'supabase'; if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react'; } } },
      target: 'esnext',
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
    esbuild: {
      target: 'esnext',
    },
  };
});
