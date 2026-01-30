import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            // To exclude specific polyfills, add them to this list.
            exclude: [
                'fs', // Exclude fs polyfill to avoid "randomFillSync" issues if any
                'http2', // Exclude to use custom mock
                'net',   // Exclude to use custom mock
                'tls',   // Exclude to use custom mock
                'dns',   // Exclude to use custom mock
            ],
            // Whether to polyfill `node:` protocol imports.
            protocolImports: true,
        }),
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            'buffer': 'buffer',
            'stream': 'stream-browserify',
            'http2': resolve(__dirname, 'src/mocks/http2.ts'), // Mock http2
            'fs': resolve(__dirname, 'src/mocks/fs.ts'),       // Mock fs
            'dns': resolve(__dirname, 'src/mocks/dns.ts'), // Mock DNS for SDK
            'net': resolve(__dirname, 'src/mocks/net.ts'),   // Mock net (isIPv4)
            'tls': resolve(__dirname, 'src/mocks/empty.ts'),   // Mock tls
        },
    },
    build: {
        outDir: 'dist',
        commonjsOptions: {
            transformMixedEsModules: true,
        },
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
