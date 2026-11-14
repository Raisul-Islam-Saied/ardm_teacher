import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@constants': path.resolve(__dirname, './src/constants'),
            '@api': path.resolve(__dirname, './src/api'),
            '@context': path.resolve(__dirname, './src/context'),
            '@hooks': path.resolve(__dirname, './src/hooks')
        }
    },
    server: {
        port: 5173,
        host: true, // একই Wi-Fi বা LAN-এ পিসি ও মোবাইল উভয় থেকেই টেস্ট করা যাবে
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false
            },
            '/iclock': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false
            }
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        chunkSizeWarningLimit: 1000
    }
});
