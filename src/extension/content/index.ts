/**
 * Content Script - Message Bridge
 * 
 * This script acts as a bridge between:
 * - Injected script (page context) <-> Content script (isolated context) <-> Background service worker
 * 
 * It injects the provider script and relays messages between contexts.
 */

// Inject the provider script into the page
function injectProvider(): void {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.type = 'module';

    script.onload = () => {
        script.remove();
    };

    // Inject as early as possible
    (document.head || document.documentElement).appendChild(script);
}

// Only inject in top frame and for http(s) pages
if (window === window.top && /^https?:/.test(window.location.protocol)) {
    injectProvider();
}

// Listen for messages from the injected script
window.addEventListener('message', async (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;

    // Only accept messages from our injected script
    if (event.data?.source !== 'tiva-injected') return;

    const message = event.data.message;

    if (!message?.type || !message?.id) {
        console.warn('Tiva: Invalid message format', event.data);
        return;
    }

    try {
        // Forward message to background script
        const response = await chrome.runtime.sendMessage({
            ...message,
            origin: window.location.origin,
            href: window.location.href,
        });

        // Send response back to injected script
        window.postMessage({
            source: 'tiva-content',
            message: {
                id: message.id,
                success: response?.success ?? false,
                data: response?.data,
                error: response?.error,
            },
        }, '*');
    } catch (error) {
        // Send error back to injected script
        window.postMessage({
            source: 'tiva-content',
            message: {
                id: message.id,
                success: false,
                error: {
                    code: -32603,
                    message: error instanceof Error ? error.message : 'Internal error',
                },
            },
        }, '*');
    }
});

// Listen for events from background script to forward to page
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'WALLET_EVENT') {
        // Forward wallet events to the page
        window.postMessage({
            source: 'tiva-content',
            message: {
                id: 'event',
                success: true,
                data: {
                    type: message.eventType,
                    data: message.eventData,
                },
            },
        }, '*');

        sendResponse({ received: true });
    }

    return true;
});

// Check connection status on load
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY', origin: window.location.origin });

console.log('Tiva: Content script loaded');
