/**
 * CIP-103 Canton Provider Implementation
 * 
 * This is the `window.canton` provider that DApps use to interact with CantonLink.
 * It follows the CIP-103 standard, similar to Ethereum's EIP-1193.
 */

import type { DamlCommand, PreparedTransaction, TransactionResult, CantonError } from '../../core/types';

// Event types
type ProviderEventType = 'connect' | 'disconnect' | 'accountsChanged' | 'networkChanged' | 'message';

interface ProviderConnectInfo {
    networkId: string;
}

interface ProviderRpcError extends Error {
    code: number;
    data?: unknown;
}

// Message structure for communication with content script
interface ProviderMessage {
    type: string;
    id: string;
    payload?: unknown;
}

interface ProviderResponse {
    id: string;
    success: boolean;
    data?: unknown;
    error?: CantonError;
}

// Event callback types
type EventCallback<T = unknown> = (data: T) => void;

// Generate unique message ID
function generateId(): string {
    return `canton_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// Pending requests map
const pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
}>();

// Event listeners
const eventListeners: Map<ProviderEventType, Set<EventCallback>> = new Map();

/**
 * Send message to content script and wait for response
 */
function sendMessage<T>(type: string, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
        const id = generateId();

        pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject });

        // Send message via window.postMessage
        window.postMessage({
            source: 'cantonlink-injected',
            message: { type, id, payload },
        }, '*');

        // Timeout after 5 minutes (for user approval)
        setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                reject(new Error('Request timeout'));
            }
        }, 5 * 60 * 1000);
    });
}

// Listen for responses from content script
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'cantonlink-content') return;

    const response = event.data.message as ProviderResponse;

    // Handle pending request responses
    const pending = pendingRequests.get(response.id);
    if (pending) {
        pendingRequests.delete(response.id);

        if (response.success) {
            pending.resolve(response.data);
        } else {
            const error = new Error(response.error?.message || 'Unknown error') as ProviderRpcError;
            error.code = response.error?.code || -32603;
            pending.reject(error);
        }
        return;
    }

    // Handle events from wallet
    if (response.id === 'event') {
        const eventType = (response.data as { type: ProviderEventType; data: unknown })?.type;
        const eventData = (response.data as { type: ProviderEventType; data: unknown })?.data;

        if (eventType && eventListeners.has(eventType)) {
            eventListeners.get(eventType)?.forEach(callback => {
                try {
                    callback(eventData);
                } catch (e) {
                    console.error('Event callback error:', e);
                }
            });
        }
    }
});

/**
 * CantonLink Provider - CIP-103 Implementation
 */
class CantonProvider {
    readonly isCantonLink = true;
    readonly version = '1.0.0';

    private _connected = false;
    private _networkId: string | null = null;
    private _selectedAccount: string | null = null;

    /**
     * Check if provider is connected
     */
    get isConnected(): boolean {
        return this._connected;
    }

    /**
     * Get current network ID
     */
    get networkId(): string | null {
        return this._networkId;
    }

    /**
     * Get currently selected account
     */
    get selectedAccount(): string | null {
        return this._selectedAccount;
    }

    /**
     * Request account access from user
     * @returns Array of account addresses (public keys)
     */
    async requestAccounts(): Promise<string[]> {
        const accounts = await sendMessage<string[]>('CANTON_REQUEST_ACCOUNTS', {
            origin: window.location.origin,
            title: document.title,
            icon: this._getFavicon(),
        });

        if (accounts && accounts.length > 0) {
            this._connected = true;
            this._selectedAccount = accounts[0] ?? null;
            this._emitEvent('connect', { networkId: this._networkId || 'canton-testnet' });
        }

        return accounts;
    }

    /**
     * Get connected accounts (without prompting)
     * @returns Array of account addresses
     */
    async getAccounts(): Promise<string[]> {
        return sendMessage<string[]>('CANTON_GET_ACCOUNTS', {
            origin: window.location.origin,
        });
    }

    /**
     * Prepare a Daml command for signing
     * @param command - Daml command to prepare
     * @returns Prepared transaction with hash
     */
    async prepareTransaction(command: DamlCommand): Promise<PreparedTransaction> {
        return sendMessage<PreparedTransaction>('CANTON_PREPARE_TRANSACTION', {
            command,
            origin: window.location.origin,
        });
    }

    /**
     * Sign a prepared transaction
     * @param txHash - Transaction hash to sign
     * @returns Signature as hex string
     */
    async signTransaction(txHash: string): Promise<string> {
        return sendMessage<string>('CANTON_SIGN_TRANSACTION', {
            txHash,
            origin: window.location.origin,
            title: document.title,
        });
    }

    /**
     * Submit a Daml command (Authorized via JWT)
     * @param command - Daml command to execute
     * @returns Transaction result
     */
    async submitCommand(command: DamlCommand): Promise<TransactionResult> {
        return sendMessage<TransactionResult>('CANTON_SUBMIT_COMMAND', {
            command,
            origin: window.location.origin,
            title: document.title,
            icon: this._getFavicon(),
        });
    }

    /**
     * @deprecated Use submitCommand instead
     */
    async signAndSubmit(command: DamlCommand): Promise<TransactionResult> {
        console.warn('window.canton.signAndSubmit is deprecated. Please use submitCommand instead.');
        return this.submitCommand(command);
    }

    /**
     * Get token balances for current account
     * @returns Token balance information
     */
    async getBalances(): Promise<unknown> {
        return sendMessage('CANTON_GET_BALANCE', {
            origin: window.location.origin,
        });
    }

    /**
     * Get active contracts for current account
     * @param templateFilter - Optional template ID filter
     * @returns Array of active contracts
     */
    async getActiveContracts(templateFilter?: string): Promise<unknown[]> {
        return sendMessage<unknown[]>('CANTON_GET_ACTIVE_CONTRACTS', {
            templateFilter,
            origin: window.location.origin,
        });
    }

    /**
     * Get current network information
     */
    async getNetwork(): Promise<{ networkId: string; name: string }> {
        return sendMessage('CANTON_GET_NETWORK', {
            origin: window.location.origin,
        });
    }

    /**
     * Subscribe to an event
     * @param event - Event type
     * @param callback - Event callback
     */
    on(event: ProviderEventType, callback: EventCallback): void {
        if (!eventListeners.has(event)) {
            eventListeners.set(event, new Set());
        }
        eventListeners.get(event)?.add(callback);
    }

    /**
     * Unsubscribe from an event
     * @param event - Event type
     * @param callback - Event callback
     */
    off(event: ProviderEventType, callback: EventCallback): void {
        eventListeners.get(event)?.delete(callback);
    }

    /**
     * Subscribe to an event (once)
     * @param event - Event type
     * @param callback - Event callback
     */
    once(event: ProviderEventType, callback: EventCallback): void {
        const wrappedCallback: EventCallback = (data) => {
            this.off(event, wrappedCallback);
            callback(data);
        };
        this.on(event, wrappedCallback);
    }

    /**
     * Remove all listeners for an event
     * @param event - Event type
     */
    removeAllListeners(event?: ProviderEventType): void {
        if (event) {
            eventListeners.delete(event);
        } else {
            eventListeners.clear();
        }
    }

    /**
     * Disconnect from wallet
     */
    async disconnect(): Promise<void> {
        await sendMessage('WALLET_DISCONNECT', {
            origin: window.location.origin,
        });

        this._connected = false;
        this._selectedAccount = null;
        this._emitEvent('disconnect', { code: 4900, message: 'User disconnected' });
    }

    /**
     * Emit an event to listeners
     */
    private _emitEvent(event: ProviderEventType, data: unknown): void {
        eventListeners.get(event)?.forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error('Event callback error:', e);
            }
        });
    }

    /**
     * Get favicon URL
     */
    private _getFavicon(): string | undefined {
        const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
        return link?.href;
    }
}

// Create and expose provider
const provider = new CantonProvider();

// Expose to window
declare global {
    interface Window {
        canton: CantonProvider;
        cantonLink: CantonProvider;
    }
}

window.canton = provider;
window.cantonLink = provider;

// Announce provider (similar to EIP-6963)
window.dispatchEvent(new CustomEvent('canton:announce', {
    detail: {
        uuid: 'cantonlink-wallet-v1',
        name: 'CantonLink',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="%230ea5e9"/><path d="M10 16l4 4 8-8" stroke="white" stroke-width="2" fill="none"/></svg>',
        provider,
    },
}));

// Log provider availability
console.log('CantonLink provider injected:', window.canton);

export type { CantonProvider };
export { provider };
