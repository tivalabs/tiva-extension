/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./popup.html",
        "./options.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                tiva: {
                    50: '#fffaeb',
                    100: '#fff0c2',
                    200: '#ffe685',
                    300: '#ffdb46',
                    400: '#ffd700', // Base Gold
                    500: '#ffd700', // Base Gold
                    600: '#d4b200',
                    700: '#a38900',
                    800: '#7a6700',
                    900: '#524500',
                    950: '#2e2700',
                },
                silver: {
                    50: '#f7f7f7',
                    100: '#e3e3e3',
                    200: '#c0c0c0', // Base Silver
                    300: '#a0a0a0', // Muted Silver
                    400: '#808080',
                    500: '#606060',
                    600: '#404040',
                    700: '#202020',
                    800: '#101010',
                    900: '#050505',
                },
                midnight: {
                    500: '#0B0C15', // Base
                    600: '#08090f',
                    700: '#05060a',
                    800: '#030305',
                    900: '#000000',
                },
                accent: {
                    // Mapping accent to Gold as well for consistency, or we can keep it gold-adjacent
                    50: '#fffce8',
                    100: '#fff9c2',
                    200: '#fff38a',
                    300: '#ffec4d',
                    400: '#ffd700', // Gold
                    500: '#e6c200',
                    600: '#b39700',
                    700: '#806c00',
                    800: '#4d4100',
                    900: '#1a1600',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};
