import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react'; // Ensure react is imported

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        watch: {
          ignored: ['**/*.zip', '**/backend/**', '**/.git/**'],
        },
        proxy: { '/api': { target: 'http://127.0.0.1:8001', changeOrigin: true } },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      },
      resolve: {
        alias: {
          // FIX: __dirname is not available in ES modules. Use import.meta.url to get the current directory path.
          // Correctly define '@' to point to the project root.
          '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './'),
        }
      }
    };
});