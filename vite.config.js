import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react()],
        server: {
            port: 3000,
            open: true,
            proxy: {
                '/api': {
                    target: env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://127.0.0.1:8000',
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
        build: {
            outDir: 'build',
            sourcemap: false,
        },
    };
});
