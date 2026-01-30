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

import { handleContentMessage, handlePopupMessage } from './handlers';
import {
    loadConnectedSites,
    cleanupExpiredRequests,
    setPopupActive,
    getWalletState,
    updateWalletState,
    updateJwtToken,
    updateAssets,
} from './state';
import type { TokenBalance } from '../../core/types';
import * as keyring from '../../core/crypto/keyring';
import { DEFAULT_NETWORK } from '../../core/config';

let currentToken: string | null = null;

// Helper to fetch PartyID from Ledger API
async function fetchPartyFromToken(token: string): Promise<string | null> {
    const jsonApiUrl = DEFAULT_NETWORK.jsonApiUrl;
    // Assume the auth URL is the frontend
    const appProviderUrl = DEFAULT_NETWORK.validatorAuthUrl ? `${DEFAULT_NETWORK.validatorAuthUrl}/api` : null;

    const tokenPreview = token.substring(0, 20) + '...';

    // DEBUG: Inspect JWT Payload keys to see if we missed a custom claim
    try {
        const parts = token.split('.');
        if (parts.length === 3 && parts[1]) {
            const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            const keys = Object.keys(decoded);

            // Check for potential party ID values in claims
            for (const key of keys) {
                const val = decoded[key];
                if (typeof val === 'string' && val.includes('::')) {
                    return val;
                }
            }
        }
    } catch (e) {
        console.warn('[CantonDebug] Failed to decode JWT for inspection');
    }

    // Strategy 1: Splice/Validator Wallet API
    // Discovered via network sniffing: https://wallet.yuce.trade/api/validator/v0/wallet/user-status
    if (appProviderUrl) {
        // Construct the discovered endpoint
        // appProviderUrl is '.../api', so we need to append 'validator/v0/wallet/user-status'
        // If appProviderUrl already ends in /api, we ensure we don't double slash if not needed, 
        // but here we just append the discovered suffix.
        const validatorApiUrl = `${appProviderUrl}/validator/v0/wallet/user-status`;

        try {
            const userResp = await fetch(validatorApiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (userResp.ok) {
                const userData = await userResp.json();

                // Typical Splice response might have 'party' or 'primaryParty' or 'party_id'
                const pid = userData.party || userData.partyId || userData.party_id;
                if (pid) {
                    return pid;
                }
            }
        } catch (err) {
            console.warn('[CantonDebug] Strategy 1 Error:', err);
        }
    }

    // Strategy 2: Canton User Management API (/v1/users/current)
    // We prioritize specific user info over listing all parties
    const currentCandidates = [
        `${jsonApiUrl}/v1/users/current`,
        `${jsonApiUrl.replace(/\/api\/json-api\/?$/, '')}/v1/users/current`,
        `${jsonApiUrl.replace(/\/json-api\/?$/, '')}/v1/users/current`
    ];

    for (const url of currentCandidates) {
        try {
            const userResp = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (userResp.ok) {
                const userData = await userResp.json();

                if (userData.result && userData.result.primary_party) {
                    return userData.result.primary_party;
                }
            }
        } catch (err) {
            console.warn(`[CantonDebug] Strategy 2 Error at ${url}:`, err);
        }
    }

    // Strategy 3: Standard Canton/Daml JSON API - List Parties
    // We try multiple path variants because of potential ingress rewrites.
    const candidates = [
        `${jsonApiUrl}/v1/parties`, // Standard: .../api/json-api/v1/parties
        `${jsonApiUrl.replace(/\/api\/json-api\/?$/, '')}/v1/parties`, // Root: .../v1/parties
        `${jsonApiUrl.replace(/\/json-api\/?$/, '')}/v1/parties` // API Root: .../api/v1/parties
    ];

    for (const url of candidates) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();

                if (data.result && Array.isArray(data.result) && data.result.length > 0) {
                    const parties = data.result.map((p: any) => p.identifier || p.party);
                    const cantonParty = parties.find((p: string) => p.includes('::'));
                    if (cantonParty) return cantonParty;
                    if (parties.length > 0) return parties[0];
                }
            } else {
                console.warn(`[CantonDebug] Strategy 3 Failed at ${url}: ${response.status}`);
                // Don't return, try next candidate
            }
        } catch (err) {
            console.warn(`[CantonDebug] Strategy 3 Error at ${url}:`, err);
        }
    }

    return null;
}

// Helper to fetch Assets (Balance) from Validator API
async function fetchAssetsFromToken(token: string): Promise<TokenBalance[]> {
    const appProviderUrl = DEFAULT_NETWORK.validatorAuthUrl ? `${DEFAULT_NETWORK.validatorAuthUrl}/api` : null;
    if (!appProviderUrl) return [];

    const validatorApiUrl = `${appProviderUrl}/validator/v0/wallet/balance`;

    try {
        const resp = await fetch(validatorApiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (resp.ok) {
            const data = await resp.json();
            const assets: TokenBalance[] = [];

            // Case 1: Splice Validator API Format
            if (typeof data.effective_unlocked_qty !== 'undefined') {
                const unlocked = parseFloat(data.effective_unlocked_qty);
                const locked = parseFloat(data.effective_locked_qty || '0');
                const total = unlocked + locked;

                assets.push({
                    tokenId: 'CC', // Default to CC
                    symbol: 'CC',
                    name: 'Canton Coin',
                    balance: data.effective_unlocked_qty, // Use unlocked as spendable balance
                    decimals: 10,
                    iconUrl: 'https://canton.network/icon.png' // Placeholder
                });
            }
            // Case 2: Simple balance field (legacy/fallback)
            else if (typeof data.balance !== 'undefined') {
                assets.push({
                    tokenId: 'CC',
                    symbol: 'CC',
                    name: 'Canton Coin',
                    balance: String(data.balance),
                    decimals: 10,
                    iconUrl: 'https://canton.network/icon.png'
                });
            }

            // Case 3: List of holdings (Generic support)
            // Changed from 'else if' to 'if' so we process holdings even if main balance was found
            if (data.holdings && Array.isArray(data.holdings)) {
                for (const holding of data.holdings) {
                    // Try to guess fields: asset/ticker/symbol, amount/quantity/balance
                    let symbol = holding.symbol || holding.ticker || holding.asset_id || holding.asset?.name || 'UNKNOWN';

                    // Unified mapping: AMT -> CC
                    if (symbol === 'AMT') symbol = 'CC';

                    // Check for duplicates (e.g. if we already added CC from Case 1)
                    if (assets.some(a => a.symbol === symbol)) {
                        continue;
                    }

                    const amount = holding.amount || holding.quantity || holding.balance || '0';
                    const decimals = holding.decimals || 10;

                    assets.push({
                        tokenId: symbol,
                        symbol: symbol,
                        name: holding.name || (symbol === 'CC' ? 'Canton Coin' : symbol),
                        balance: String(amount),
                        decimals: Number(decimals),
                        iconUrl: holding.icon || 'https://canton.network/icon.png'
                    });
                }
            }

            return assets;
        } else {
            console.warn(`[CantonDebug] Fetch Assets Failed: ${resp.status}`);
        }
    } catch (e) {
        console.error('[CantonDebug] Fetch Assets Error:', e);
    }
    return [];
}



// Initialize background state
async function initialize(): Promise<void> {


    // Load connected sites from storage
    await loadConnectedSites();

    // Restore Auth Token from storage if available
    try {
        const result = await chrome.storage.local.get('cantonlink_auth_state');
        const authState = result['cantonlink_auth_state'];
        if (authState && authState.token) {
            // Check expiry roughly
            if (authState.expiresAt && Date.now() > authState.expiresAt) {

            } else {
                currentToken = authState.token;

                // Initial fetch
                fetchAssetsFromToken(authState.token).then(assets => {
                    if (assets.length > 0) updateAssets(assets);
                });
            }
        }
    } catch (e) {
        console.warn('CantonLink: Failed to restore auth token', e);
    }

    // Check if wallet is initialized
    const isInitialized = await keyring.isWalletInitialized();
    updateWalletState({ isInitialized });


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

// Poll Assets (every 30 seconds)
setInterval(async () => {
    if (currentToken) {
        try {
            const assets = await fetchAssetsFromToken(currentToken);
            // Even if empty, we might want to update? 
            // Stick to update only if valid response for now to avoid flickering
            if (assets.length > 0) {
                updateAssets(assets);
            }
        } catch (e) {
            console.warn('Asset polling failed', e);
        }
    }
}, 30 * 1000);

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {


    if (details.reason === 'install') {
        // First install - could show welcome page

    } else if (details.reason === 'update') {
        // Extension updated

    }
    // Enable Side Panel on action click
    // This allows the extension to open in the sidebar by default
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
            .catch((error) => console.error('Failed to set side panel behavior:', error));
    }
});

// Handle alarms (for scheduled tasks)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'autoLock') {
        keyring.checkAutoLock();
    }
});

// Network Sniffer for Auth Token (Manual Login Flow)
chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        let token: string | null = null;
        for (const header of details.requestHeaders || []) {
            if (header.name.toLowerCase() === 'authorization' && header.value?.startsWith('Bearer ')) {
                token = header.value.substring(7);
                break;
            }
        }

        if (token) {
            // Only proceed if it's new
            if (token !== currentToken) {
                currentToken = token;

                // Decode token and try to fetch PartyID
                (async () => {
                    try {
                        // Try to fetch the real PartyID from the Ledger using this token
                        let partyId = await fetchPartyFromToken(token);

                        // Fallback to JWT decoding if fetch fails (or purely for expiry info)
                        const parts = token.split('.');
                        let decodedPayload: any = {};
                        if (parts.length === 3) {
                            decodedPayload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')));
                        }

                        // If API didn't return party, try JWT claim "party_id" or "sub"
                        if (!partyId) {
                            partyId = decodedPayload.party_id || decodedPayload.sub;
                        }

                        if (partyId) {
                            const authState = {
                                token,
                                partyId,
                                expiresAt: (decodedPayload.exp || (Date.now() / 1000 + 3600)) * 1000,
                                createdAt: Date.now()
                            };

                            // Save session
                            await chrome.storage.local.set({ 'cantonlink_auth_state': authState });

                            // Notify app
                            chrome.runtime.sendMessage({ type: 'WALLET_UNLOCK' });
                            updateJwtToken(token);

                            // Fetch Assets immediately
                            const assets = await fetchAssetsFromToken(token);
                            if (assets.length > 0) {
                                updateAssets(assets);
                            }
                        }
                    } catch (err) {
                        console.error('Error processing captured token:', err);
                    }
                })();
            }
        }
    },
    { urls: ["*://wallet.yuce.trade/*"] },
    ["requestHeaders"]
);

// Export for debugging
(globalThis as unknown as { cantonlinkDebug: unknown }).cantonlinkDebug = {
    getState: getWalletState,
    keyring,
};
