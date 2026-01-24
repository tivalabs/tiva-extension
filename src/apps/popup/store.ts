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
    importWallet: (mnemonic: string, password: string) => Promise<void>;
    unlock: (password: string) => Promise<void>;
    lock: () => Promise<void>;
}

export const usePopupStore = create<PopupState>((set, get) => ({
    // Initial state
    isInitialized: false,
    isLocked: true,
    accounts: [],
    currentAccount: null,
    network: null,
    loading: true,
    error: null,

    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    setWalletState: (walletState) => set((state) => ({
        ...state,
        isInitialized: walletState.isInitialized ?? state.isInitialized,
        isLocked: walletState.isLocked ?? state.isLocked,
        accounts: walletState.accounts ?? state.accounts,
        currentAccount: walletState.currentAccount ?? state.currentAccount,
        network: walletState.network ?? state.network,
    })),

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
            set({ loading: true, error: null });

            const { mnemonic } = await get().sendMessage<{ mnemonic: string }>('createWallet', {
                password,
                wordCount,
            });

            // Re-fetch state
            await get().initialize();

            return mnemonic;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create wallet';
            set({ error: message, loading: false });
            throw error;
        }
    },

    importWallet: async (mnemonic, password) => {
        try {
            set({ loading: true, error: null });

            await get().sendMessage('importWallet', { mnemonic, password });

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
}));
