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
    openMode?: 'sidebar' | 'popup';

    // UI state
    loading: boolean;
    error: string | null;

    // Actions
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setWalletState: (state: Partial<WalletState>) => void;

    // Background communication
    sendMessage: <T>(action: string, data?: unknown) => Promise<T>;

    // Initialization
    initialize: () => Promise<void>;

    // Wallet actions
    createWallet: (password: string, wordCount?: 12 | 24) => Promise<string>;
    importWallet: (value: string, password: string, type: 'mnemonic' | 'privateKey') => Promise<void>;
    unlock: (password: string) => Promise<void>;
    lock: () => Promise<void>;
    addAccount: (name?: string) => Promise<void>;
    exportPrivateKey: (password: string, index: number) => Promise<string>;
    setNetwork: (chainId: string) => Promise<void>;
    setCurrentAccount: (index: number) => Promise<void>;
    setOpenMode: (mode: 'sidebar' | 'popup') => Promise<void>;
}

export const usePopupStore = create<PopupState>((set, get) => ({
    // Initial state
    isInitialized: false,
    isLocked: true,
    accounts: [],
    currentAccount: null,
    network: null,
    balance: '0',
    loading: true,
    error: null,

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),
    setWalletState: (walletState) => set((state) => ({ ...state, ...walletState })),

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

    initialize: async () => {
        try {
            set({ loading: true, error: null });

            // Check if wallet is initialized
            const { isInitialized } = await get().sendMessage<{ isInitialized: boolean }>('checkInitialized');

            if (!isInitialized) {
                set({ isInitialized: false, isLocked: true, loading: false });
                return;
            }

            // Get current wallet state
            const state = await get().sendMessage<WalletState>('getState');

            set({
                isInitialized: true,
                isLocked: state.isLocked,
                accounts: state.accounts,
                currentAccount: state.currentAccount,
                network: state.network,
                balance: state.balance,
                loading: false,
                openMode: state.openMode,
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
            set({ loading: true, error: null });

            await get().sendMessage('importWallet', { type, value, password });

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

    addAccount: async (name) => {
        try {
            set({ loading: true, error: null });
            await get().sendMessage('addAccount', { name });
            await get().initialize();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add account';
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
}));
