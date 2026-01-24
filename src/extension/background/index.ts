/**
 * Background Service Worker - Main Entry Point
 * 
 * This is the main service worker for the CantonLink extension.
 * It handles all background tasks including:
 * - Message routing between content scripts and popup
 * - Wallet state management
 * - Auto-lock functionality
 */

// Global Polyfills - MUST be first
import '../../polyfills';

// Buffer polyfill for bip39
import { Buffer } from 'buffer';
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;

// Polyfill window and self for libraries that expect a browser environment (like @daml/ledger)
if (typeof window === 'undefined') {
    (globalThis as any).window = globalThis;
}
if (typeof self === 'undefined') {
    (globalThis as any).self = globalThis;
}

import { handleContentMessage, handlePopupMessage } from './handlers';
import {
    loadConnectedSites,
    cleanupExpiredRequests,
    setPopupActive,
    getWalletState,
    updateWalletState,
} from './state';
import * as keyring from '../../core/crypto/keyring';

console.log('CantonLink: Background service worker started');

// Initialize background state
async function initialize(): Promise<void> {
    console.log('CantonLink: Initializing background...');

    // Load connected sites from storage
    await loadConnectedSites();

    // Check if wallet is initialized
    const isInitialized = await keyring.isWalletInitialized();
    updateWalletState({ isInitialized });

    console.log('CantonLink: Background initialized, wallet initialized:', isInitialized);
}

// Run initialization
initialize().catch(console.error);

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle content script ready message
    if (message.type === 'CONTENT_SCRIPT_READY') {
        sendResponse({ ready: true });
        return true;
    }

    // Handle popup messages (from popup UI)
    if (message.source === 'popup') {
        handlePopupMessage(message)
            .then(sendResponse)
            .catch((error) => {
                // suppress console error for expected user operational errors
                const msg = error.message || '';
                if (!msg.includes('Decryption failed') && !msg.includes('Invalid password') && !msg.includes('Wallet is locked')) {
                    console.error('Popup message error:', error);
                }
                sendResponse({ error: error.message });
            });
        return true; // Keep message channel open for async response
    }

    // Handle content script messages (from DApps)
    if (message.type && message.id) {
        handleContentMessage({
            ...message,
            origin: message.origin || sender.origin || '',
            href: message.href || sender.url || '',
        })
            .then(sendResponse)
            .catch((error) => {
                console.error('Content message error:', error);
                sendResponse({
                    id: message.id,
                    success: false,
                    error: { code: -32603, message: error.message },
                });
            });
        return true; // Keep message channel open for async response
    }

    return false;
});

// Listen for popup connection
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'popup') {
        setPopupActive(true);

        port.onDisconnect.addListener(() => {
            setPopupActive(false);
        });
    }
});

// Auto-lock check interval (every minute)
setInterval(async () => {
    try {
        const autoLocked = await keyring.checkAutoLock();
        if (autoLocked) {
            console.log('CantonLink: Wallet auto-locked due to inactivity');
            updateWalletState({ isLocked: true, currentAccount: null, accounts: [] });
        }
    } catch (error) {
        console.error('Auto-lock check error:', error);
    }
}, 60 * 1000);

// Cleanup expired pending requests (every 5 minutes)
setInterval(() => {
    cleanupExpiredRequests();
}, 5 * 60 * 1000);

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
    console.log('CantonLink: Extension installed/updated', details.reason);

    if (details.reason === 'install') {
        // First install - could show welcome page
        console.log('CantonLink: First installation');
    } else if (details.reason === 'update') {
        // Extension updated
        console.log('CantonLink: Updated from version', details.previousVersion);
    }
});

// Handle alarms (for scheduled tasks)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'autoLock') {
        keyring.checkAutoLock();
    }
});

// Export for debugging
(globalThis as unknown as { cantonlinkDebug: unknown }).cantonlinkDebug = {
    getState: getWalletState,
    keyring,
};
