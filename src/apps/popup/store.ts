/**
 * Popup Zustand Store
 * 
 * Manages popup state and communication with background script.
 */

import { create } from 'zustand';
import type { CantonAccount, WalletState, NetworkConfig } from '../../core/types';

interface PopupState {
    // Wallet state
    isInitialized: boolean;
    isLocked: boolean;
    accounts: CantonAccount[];
    currentAccount: CantonAccount | null;
    network: NetworkConfig | null;
    balance: string;
    assets: import('../../core/types').TokenBalance[];
    openMode?: 'sidebar' | 'popup';
    theme: 'dark' | 'light';
    canAddAccounts?: boolean;

    walletType?: 'mnemonic' | 'privateKey';
    autoLockTimeout?: number;

    // Transaction History
    transactions: any[]; // Using any for now to match flexible API response


    // UI state
    loading: boolean;
    error: string | null;
    partyIdWarning: string | null;  // Warning for Party ID registration failures

    // Actions
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setPartyIdWarning: (warning: string | null) => void;
    setWalletState: (state: Partial<WalletState>) => void;

    // Background communication
    sendMessage: <T>(action: string, data?: unknown) => Promise<T>;

    // Initialization
    initialize: (silent?: boolean) => Promise<void>;

    // Wallet actions
    createWallet: (password: string, wordCount?: 12 | 24) => Promise<string>;
    importWallet: (value: string, password: string, type: 'mnemonic' | 'privateKey') => Promise<void>;
    unlock: (password: string) => Promise<void>;
    lock: () => Promise<void>;
    addAccount: (password: string, name?: string) => Promise<void>;
    renameAccount: (password: string, index: number, name: string) => Promise<void>;
    importAccount: (privateKey: string, password: string, name?: string) => Promise<void>;
    exportPrivateKey: (password: string, index: number) => Promise<string>;
    setNetwork: (chainId: string) => Promise<void>;
    setCurrentAccount: (index: number) => Promise<void>;
    setOpenMode: (mode: 'sidebar' | 'popup') => Promise<void>;
    setTheme: (theme: 'dark' | 'light') => void;
    setAutoLockTimeout: (timeout: number) => Promise<void>;

    // Canton Network
    registerPartyId: (accountIndex?: number) => Promise<{ success: boolean; partyId?: string; error?: string }>;
    setJwtToken: (token: string) => Promise<void>;
    fetchTransactions: (limit?: number, offset?: number) => Promise<void>;
}

import { AuthService } from '../../core/auth/auth.service';

export const usePopupStore = create<PopupState>((set, get) => ({
    // Initial state
    isInitialized: false,
    isLocked: true, // Auto-lock by default
    accounts: [],
    currentAccount: null,
    network: null,
    balance: '0',
    assets: [],
    loading: true,
    error: null,
    partyIdWarning: null,
    transactions: [],
    autoLockTimeout: 15 * 60 * 1000,

    theme: (localStorage.getItem('theme') as 'dark' | 'light') || 'dark',

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setPartyIdWarning: (partyIdWarning) => set({ partyIdWarning }),
    setWalletState: (walletState) => set((state) => ({ ...state, ...walletState })),

    setTheme: (theme) => {
        localStorage.setItem('theme', theme);
        set({ theme });
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    },

    sendMessage: async <T>(action: string, data?: unknown): Promise<T> => {
        const response = await chrome.runtime.sendMessage({
            source: 'popup',
            action,
            data,
        });

        if (response?.error) {
            throw new Error(response.error);
        }

        return response as T;
    },

    initialize: async (silent = false) => {
        try {
            if (!silent) {
                set({ loading: true, error: null });
            }

            // New OAuth Flow: Check if we have a valid session
            const session = await AuthService.getSession();

            if (!session) {
                // Not logged in -> effectively "not initialized"
                set({ isInitialized: false, isLocked: true, loading: false, currentAccount: null });
                return;
            }

            const mockAccount: CantonAccount = {
                address: session.partyId, // Using PartyID as address for now
                publicKey: '',
                name: 'Validator Account',
                partyId: session.partyId,
                isImported: false
            };

            // Fetch full state from background to get settings like openMode
            const backgroundState = await get().sendMessage<WalletState>('getState');

            // --- OPTIMIZATION: Check for changes before update ---
            const currentState = get();
            const newBalance = backgroundState.balance || '0';
            const newAssets = backgroundState.assets || [];

            // Simple check for balance and assets length/content 
            // (JSON stringify is cheap for small arrays, usually good enough for this UI)
            const hasChanged =
                currentState.balance !== newBalance ||
                JSON.stringify(currentState.assets) !== JSON.stringify(newAssets) ||
                !currentState.isInitialized;

            if (silent && !hasChanged) {
                // No changes, skip update to prevent flickering
                return;
            }

            set({
                isInitialized: true,
                isLocked: false,
                accounts: [mockAccount],
                currentAccount: mockAccount,
                network: get().network || null,
                balance: newBalance,
                assets: newAssets,
                openMode: backgroundState.openMode,
                autoLockTimeout: backgroundState.autoLockTimeout,
                loading: false,
            });

        } catch (error) {
            console.error('Initialize error:', error);
            set({
                error: error instanceof Error ? error.message : 'Failed to initialize',
                loading: false,
            });
        }
    },

    createWallet: async (password, wordCount = 12) => {
        try {
            // Note: We don't set global loading here to avoid unmounting the UI component
            // in App.tsx which resets local state (like the current wizard step)
            set({ error: null });

            const { mnemonic } = await get().sendMessage<{ mnemonic: string }>('generateMnemonic', {
                wordCount,
            });

            // Do NOT initialize state here. Just return the mnemonic.

            return mnemonic;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create wallet';
            set({ error: message });
            throw error;
        }
    },

    importWallet: async (value, password, type) => {
        try {
            set({ loading: true, error: null, partyIdWarning: null });


            await get().sendMessage('importWallet', { type, value, password });


            // Register Party ID with Canton Network
            try {
                const result = await get().registerPartyId(0);


                if (!result.success) {
                    const warningMsg = `Party ID registration failed: ${result.error || 'Unknown error'}. You can try again later in Settings.`;
                    console.warn('[Store:importWallet]', warningMsg);
                    set({ partyIdWarning: warningMsg });
                }
            } catch (partyError) {
                const warningMsg = `Party ID registration failed: ${partyError instanceof Error ? partyError.message : 'Network error'}. You can try again later in Settings.`;
                console.warn('[Store:importWallet]', warningMsg);
                set({ partyIdWarning: warningMsg });
                // Continue even if Party ID registration fails
            }

            // Re-fetch state
            await get().initialize();

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to import wallet';
            set({ error: message, loading: false });
            throw error;
        }
    },

    unlock: async (password) => {
        try {
            set({ loading: true, error: null });

            await get().sendMessage('unlock', { password });

            // Re-fetch state
            await get().initialize();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Invalid password';
            set({ error: message, loading: false });
            throw error;
        }
    },

    lock: async () => {
        try {
            await get().sendMessage('lock');
            set({ isLocked: true, currentAccount: null, accounts: [] });
        } catch (error) {
            console.error('Lock error:', error);
        }
    },

    addAccount: async (password, name) => {
        try {
            set({ loading: true, error: null, partyIdWarning: null });


            await get().sendMessage('addAccount', { password, name });

            // Get the new account index (it will be the last one)
            const tempState = await get().sendMessage<WalletState>('getState');
            const newAccountIndex = tempState.accounts.length - 1;


            // Register Party ID for the new account
            try {

                const result = await get().registerPartyId(newAccountIndex);


                if (!result.success) {
                    const warningMsg = `Party ID registration failed: ${result.error || 'Unknown error'}. You can try again later.`;
                    console.warn('[Store:addAccount]', warningMsg);
                    set({ partyIdWarning: warningMsg });
                }
            } catch (partyError) {
                const warningMsg = `Party ID registration failed: ${partyError instanceof Error ? partyError.message : 'Network error'}. You can try again later.`;
                console.warn('[Store:addAccount]', warningMsg);
                set({ partyIdWarning: warningMsg });
            }

            await get().initialize();

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add account';
            set({ error: message, loading: false });
            throw error;
        }
    },

    renameAccount: async (password, index, name) => {
        try {
            set({ loading: true, error: null });
            await get().sendMessage('renameAccount', { password, index, name });
            await get().initialize();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to rename account';
            set({ error: message, loading: false });
            throw error;
        }
    },

    importAccount: async (privateKey, password, name) => {
        try {
            set({ loading: true, error: null, partyIdWarning: null });


            await get().sendMessage('importAccount', { privateKey, password, name });

            // Get the new account index (it will be the last one)
            const tempState = await get().sendMessage<WalletState>('getState');
            const newAccountIndex = tempState.accounts.length - 1;


            // Register Party ID for the imported account
            try {

                const result = await get().registerPartyId(newAccountIndex);


                if (!result.success) {
                    const warningMsg = `Party ID registration failed: ${result.error || 'Unknown error'}. You can try again later.`;
                    console.warn('[Store:importAccount]', warningMsg);
                    set({ partyIdWarning: warningMsg });
                }
            } catch (partyError) {
                const warningMsg = `Party ID registration failed: ${partyError instanceof Error ? partyError.message : 'Network error'}. You can try again later.`;
                console.warn('[Store:importAccount]', warningMsg);
                set({ partyIdWarning: warningMsg });
            }

            await get().initialize();

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to import account';
            set({ error: message, loading: false });
            throw error;
        }
    },

    exportPrivateKey: async (password, index) => {
        try {
            const { privateKey } = await get().sendMessage<{ privateKey: string }>('exportPrivateKey', { password, index });
            return privateKey;
        } catch (error) {
            throw error;
        }
    },

    setNetwork: async (chainId: string) => {
        try {
            set({ loading: true, error: null });
            await get().sendMessage('setNetwork', { chainId });
            await get().initialize();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to set network';
            set({ error: message, loading: false });
            throw error;
        }
    },

    setCurrentAccount: async (index: number) => {
        try {
            set({ loading: true, error: null });
            await get().sendMessage('setCurrentAccount', { index });
            await get().initialize();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to switch account';
            set({ error: message, loading: false });
            throw error;
        }
    },

    setOpenMode: async (mode: 'sidebar' | 'popup') => {
        try {
            set({ loading: true, error: null });

            // Get current window ID to open sidebar in the correct window
            const window = await chrome.windows.getCurrent();
            await get().sendMessage('setOpenMode', { mode, windowId: window.id });

            await get().initialize();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to set mode';
            set({ error: message, loading: false });
            throw error;
        }
    },

    setAutoLockTimeout: async (timeout: number) => {
        try {
            set({ loading: true, error: null });
            await get().sendMessage('setAutoLockTimeout', { timeout });
            await get().initialize();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to set auto-lock timeout';
            set({ error: message, loading: false });
            throw error;
        }
    },

    // Canton Network Party ID registration
    registerPartyId: async (accountIndex?: number) => {
        try {

            const result = await get().sendMessage<{ success: boolean; partyId?: string; error?: string; isExisting?: boolean }>(
                'registerPartyId',
                { accountIndex }
            );


            if (result.success) {
                // Refresh state to get updated Party ID
                await get().initialize();
            }

            return result;
        } catch (error) {
            console.error('[Store:registerPartyId] Error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Party ID registration failed'
            };
        }
    },
    setJwtToken: async (token: string) => {
        try {
            set({ loading: true, error: null });
            await get().sendMessage('setJwtToken', { token });
            await get().initialize();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to set JWT token';
            set({ error: message, loading: false });
            throw error;
        }
    },

    fetchTransactions: async (limit = 20, offset = 0) => {
        try {
            // Don't set global loading to avoid full UI block, just let local UI handle it if needed
            // OR use a specific loading state for history. 
            // For now, adhere to existing pattern but maybe be careful.
            // Actually, ActivityPage handles its own loading state usually.
            // But here we put data in store.


            const result = await get().sendMessage<{ success: boolean; transactions: any[]; error?: string }>(
                'getTransactions',
                { limit, offset }
            );

            if (result.success) {
                set({ transactions: result.transactions || [] });

            } else {
                console.error('[Store] Failed to fetch transactions:', result.error);
                // Optionally set error state or just log
            }
        } catch (error) {
            console.error('[Store] Error fetching transactions:', error);
        }
    }

}));

// Listen for background events
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'WALLET_UNLOCK' || message.type === 'WALLET_UPDATE') {

        usePopupStore.getState().initialize();
    }
});
