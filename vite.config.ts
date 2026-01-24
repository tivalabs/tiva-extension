import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            'buffer': 'buffer',
        },
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'popup.html'),
                options: resolve(__dirname, 'options.html'),
                background: resolve(__dirname, 'src/extension/background/index.ts'),
                content: resolve(__dirname, 'src/extension/content/index.ts'),
                injected: resolve(__dirname, 'src/extension/injected/index.ts'),
            },
            output: {
                entryFileNames: (chunkInfo) => {
                    if (['background', 'content', 'injected'].includes(chunkInfo.name)) {
                        return `${chunkInfo.name}.js`;
                    }
                    return 'assets/[name]-[hash].js';
                },
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
            },
        },
        emptyOutDir: true,
        sourcemap: process.env.NODE_ENV === 'development',
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        global: 'globalThis',
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis',
            },
        },
    },
});
