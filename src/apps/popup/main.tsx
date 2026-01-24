/**
 * Popup Entry Point
 */

// Global Polyfills - MUST be first
import '../../polyfills';

// Buffer polyfill for bip39
import { Buffer } from 'buffer';
(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import '../../styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
