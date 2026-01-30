/**
 * Global Polyfills
 * Must be imported before any other imports in entry points.
 * Compatible with Service Worker (no window) and Browser.
 */

import { Buffer } from 'buffer';

const _global = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : {}));

// Polyfill Buffer
(_global as any).Buffer = Buffer;

// Polyfill window and self for libraries that expect a browser environment (like @daml/ledger)
if (typeof (_global as any).window === 'undefined') {
    (_global as any).window = _global;
}
if (typeof (_global as any).self === 'undefined') {
    (_global as any).self = _global;
}

// Polyfill global for libraries expecting Node.js environment
if (typeof (_global as any).global === 'undefined') {
    (_global as any).global = _global;
}

// Polyfill process for some libs
if (typeof (_global as any).process === 'undefined') {
    (_global as any).process = { env: {} };
}
