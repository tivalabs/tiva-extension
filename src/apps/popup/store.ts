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
    theme: 'dark' | 'light';
    canAddAccounts?: boolean;

    walletType?: 'mnemonic' | 'privateKey';
    autoLockTimeout?: number;

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
    initialize: () => Promise<void>;

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
    loading: true,
    error: null,
    partyIdWarning: null,
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

    initialize: async () => {
        try {
            set({ loading: true, error: null });

            // New OAuth Flow: Check if we have a valid session
            const session = await AuthService.getSession();

            if (!session) {
                // Not logged in -> effectively "not initialized"
                set({ isInitialized: false, isLocked: true, loading: false, currentAccount: null });
                return;
            }

            // We have a session.
            // In a real implementation, 'isLocked' would depend on a local PIN state.
            // For this phase, if we have a token, we are "Initialized".
            // We can keep 'isLocked' logic if we implement local unlocking. 
            // The Auth Service handles "remote" auth (Token). 
            // The Store handles "local" auth (PIN).

            // For now, let's look check if legacy 'checkInitialized' returns anything useful
            // OR just mock the account state based on the session.

            const mockAccount: CantonAccount = {
                address: session.partyId, // Using PartyID as address for now
                publicKey: '',
                name: 'Validator Account',
                partyId: session.partyId,
                isImported: false
            };

            set({
                isInitialized: true,
                isLocked: false, // TODO: Implement local lock check
                accounts: [mockAccount],
                currentAccount: mockAccount,
                network: get().network || null, // Keep existing network or default
                balance: '0', // TODO: Fetch real balance
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
            console.log('[Store:importWallet] Importing wallet...');

            await get().sendMessage('importWallet', { type, value, password });
            console.log('[Store:importWallet] Wallet imported, registering Party ID...');

            // Register Party ID with Canton Network
            try {
                const result = await get().registerPartyId(0);
                console.log('[Store:importWallet] Party ID registration result:', result);

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
            console.log('[Store:importWallet] ✓ Import complete');
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
            console.log('[Store:addAccount] Adding account...');

            await get().sendMessage('addAccount', { password, name });

            // Get the new account index (it will be the last one)
            const tempState = await get().sendMessage<WalletState>('getState');
            const newAccountIndex = tempState.accounts.length - 1;
            console.log('[Store:addAccount] New account index:', newAccountIndex);

            // Register Party ID for the new account
            try {
                console.log('[Store:addAccount] Registering Party ID for new account...');
                const result = await get().registerPartyId(newAccountIndex);
                console.log('[Store:addAccount] Party ID registration result:', result);

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
            console.log('[Store:addAccount] ✓ Account added');
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
            console.log('[Store:importAccount] Importing account...');

            await get().sendMessage('importAccount', { privateKey, password, name });

            // Get the new account index (it will be the last one)
            const tempState = await get().sendMessage<WalletState>('getState');
            const newAccountIndex = tempState.accounts.length - 1;
            console.log('[Store:importAccount] New account index:', newAccountIndex);

            // Register Party ID for the imported account
            try {
                console.log('[Store:importAccount] Registering Party ID for imported account...');
                const result = await get().registerPartyId(newAccountIndex);
                console.log('[Store:importAccount] Party ID registration result:', result);

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
            console.log('[Store:importAccount] ✓ Account imported');
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
            console.log('[Store:registerPartyId] Registering Party ID for account:', accountIndex);
            const result = await get().sendMessage<{ success: boolean; partyId?: string; error?: string; isExisting?: boolean }>(
                'registerPartyId',
                { accountIndex }
            );
            console.log('[Store:registerPartyId] Result:', result);

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
}));
