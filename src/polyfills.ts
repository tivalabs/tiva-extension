/**
 * Global Polyfills
 * Must be imported before any other imports in entry points.
 */

import { Buffer } from 'buffer';

// Polyfill Buffer for bip39 and other crypto libraries
if (typeof globalThis !== 'undefined') {
    (globalThis as any).Buffer = Buffer;
}
if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
}

// Polyfill global for libraries expecting Node.js environment
if (typeof global === 'undefined') {
    (window as any).global = window;
}

// Polyfill process for some libs
if (typeof process === 'undefined') {
    (window as any).process = { env: {} };
}
