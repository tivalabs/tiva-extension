/**
 * Background Service Worker - State Management
 * 
 * Manages wallet state, connected sites, and pending requests.
 */

import type { WalletState, NetworkConfig, ConnectedSite } from '../../core/types';
import { WALLET_CONFIG, DEFAULT_NETWORK } from '../../core/config';

// In-memory state
interface BackgroundState {
    walletState: WalletState;
    pendingRequests: Map<string, PendingRequest>;
    activePopup: boolean;
}

interface PendingRequest {
    id: string;
    type: string;
    origin: string;
    payload: unknown;
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timestamp: number;
}

// Initialize state
const state: BackgroundState = {
    walletState: {
        isLocked: true,
        isInitialized: false,
        currentAccount: null,
        accounts: [],
        network: DEFAULT_NETWORK,
        connectedSites: [],
    },
    pendingRequests: new Map(),
    activePopup: false,
};

/**
 * Get current wallet state
 */
export function getWalletState(): WalletState {
    return { ...state.walletState };
}

/**
 * Update wallet state
 */
export function updateWalletState(updates: Partial<WalletState>): void {
    state.walletState = { ...state.walletState, ...updates };

    // Notify all connected tabs about state change
    broadcastEvent('walletStateChanged', state.walletState);
}

/**
 * Set wallet locked/unlocked status
 */
export function setLocked(locked: boolean): void {
    state.walletState.isLocked = locked;

    if (locked) {
        state.walletState.currentAccount = null;
        state.walletState.accounts = [];
    }

    broadcastEvent('walletStateChanged', { isLocked: locked });
}

/**
 * Set wallet initialized status
 */
export function setInitialized(initialized: boolean): void {
    state.walletState.isInitialized = initialized;
}

/**
 * Update accounts
 */
export function updateAccounts(accounts: WalletState['accounts'], currentAccount: WalletState['currentAccount']): void {
    state.walletState.accounts = accounts;
    state.walletState.currentAccount = currentAccount;

    // Notify connected sites about account change
    broadcastEvent('accountsChanged', accounts.map(a => a.address));
}

/**
 * Update network
 */
export function updateNetwork(network: NetworkConfig): void {
    state.walletState.network = network;

    // Notify connected sites about network change
    broadcastEvent('networkChanged', network.chainId);
}

/**
 * Load connected sites from storage
 */
export async function loadConnectedSites(): Promise<void> {
    const result = await chrome.storage.local.get(WALLET_CONFIG.storageKeys.connectedSites);
    state.walletState.connectedSites = result[WALLET_CONFIG.storageKeys.connectedSites] || [];
}

/**
 * Save connected sites to storage
 */
async function saveConnectedSites(): Promise<void> {
    await chrome.storage.local.set({
        [WALLET_CONFIG.storageKeys.connectedSites]: state.walletState.connectedSites,
    });
}

/**
 * Check if a site is connected
 */
export function isSiteConnected(origin: string): boolean {
    return state.walletState.connectedSites.some(site => site.origin === origin);
}

/**
 * Get connected site info
 */
export function getConnectedSite(origin: string): ConnectedSite | undefined {
    return state.walletState.connectedSites.find(site => site.origin === origin);
}

/**
 * Connect a site
 */
export async function connectSite(origin: string, name: string, icon?: string): Promise<void> {
    const existingSite = state.walletState.connectedSites.find(site => site.origin === origin);

    if (existingSite) {
        // Update existing connection
        existingSite.connectedAt = Date.now();
        existingSite.name = name;
        existingSite.icon = icon;
    } else {
        // Add new connection
        state.walletState.connectedSites.push({
            origin,
            name,
            icon,
            connectedAt: Date.now(),
            permissions: ['view_accounts', 'sign_transactions'],
        });
    }

    await saveConnectedSites();
}

/**
 * Disconnect a site
 */
export async function disconnectSite(origin: string): Promise<void> {
    state.walletState.connectedSites = state.walletState.connectedSites.filter(
        site => site.origin !== origin
    );

    await saveConnectedSites();

    // Notify the site about disconnection
    broadcastEventToOrigin(origin, 'disconnect', { code: 4900, message: 'Disconnected by user' });
}

/**
 * Disconnect all sites
 */
export async function disconnectAllSites(): Promise<void> {
    const origins = state.walletState.connectedSites.map(site => site.origin);
    state.walletState.connectedSites = [];

    await saveConnectedSites();

    // Notify all sites about disconnection
    for (const origin of origins) {
        broadcastEventToOrigin(origin, 'disconnect', { code: 4900, message: 'Disconnected by user' });
    }
}

/**
 * Add a pending request
 */
export function addPendingRequest(request: Omit<PendingRequest, 'timestamp'>): void {
    state.pendingRequests.set(request.id, {
        ...request,
        timestamp: Date.now(),
    });
}

/**
 * Get a pending request
 */
export function getPendingRequest(id: string): PendingRequest | undefined {
    return state.pendingRequests.get(id);
}

/**
 * Get all pending requests
 */
export function getAllPendingRequests(): PendingRequest[] {
    return Array.from(state.pendingRequests.values());
}

/**
 * Resolve a pending request
 */
export function resolvePendingRequest(id: string, result: unknown): void {
    const request = state.pendingRequests.get(id);
    if (request) {
        request.resolve(result);
        state.pendingRequests.delete(id);
    }
}

/**
 * Reject a pending request
 */
export function rejectPendingRequest(id: string, error: Error): void {
    const request = state.pendingRequests.get(id);
    if (request) {
        request.reject(error);
        state.pendingRequests.delete(id);
    }
}

/**
 * Reject all pending requests
 */
export function rejectAllPendingRequests(error: Error): void {
    for (const request of state.pendingRequests.values()) {
        request.reject(error);
    }
    state.pendingRequests.clear();
}

/**
 * Set popup active status
 */
export function setPopupActive(active: boolean): void {
    state.activePopup = active;
}

/**
 * Check if popup is active
 */
export function isPopupActive(): boolean {
    return state.activePopup;
}

/**
 * Broadcast event to all connected tabs
 */
function broadcastEvent(eventType: string, eventData: unknown): void {
    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
            if (tab.id) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'WALLET_EVENT',
                    eventType,
                    eventData,
                }).catch(() => {
                    // Tab might not have content script, ignore error
                });
            }
        }
    });
}

/**
 * Broadcast event to specific origin
 */
function broadcastEventToOrigin(origin: string, eventType: string, eventData: unknown): void {
    chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
            if (tab.id && tab.url) {
                try {
                    const tabOrigin = new URL(tab.url).origin;
                    if (tabOrigin === origin) {
                        chrome.tabs.sendMessage(tab.id, {
                            type: 'WALLET_EVENT',
                            eventType,
                            eventData,
                        }).catch(() => {
                            // Ignore errors
                        });
                    }
                } catch {
                    // Invalid URL, ignore
                }
            }
        }
    });
}

/**
 * Clean up expired pending requests (older than 5 minutes)
 */
export function cleanupExpiredRequests(): void {
    const now = Date.now();
    const expireTime = 5 * 60 * 1000; // 5 minutes

    for (const [id, request] of state.pendingRequests.entries()) {
        if (now - request.timestamp > expireTime) {
            request.reject(new Error('Request expired'));
            state.pendingRequests.delete(id);
        }
    }
}

// Export state for debugging (remove in production)
export function getDebugState(): BackgroundState {
    return state;
}
