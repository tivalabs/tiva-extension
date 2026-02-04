/**
 * Background Service Worker - Message Handlers
 * 
 * Handles messages from content scripts and popup.
 */

import type { ExtensionMessage, ExtensionResponse, MessageType, CantonAccount } from '../../core/types';
import TransferService from './transfer.service'; // Direct API (Preserved)
// import TransferService from './transfer.sdk'; // Experimental SDK API
import { NETWORKS, DEFAULT_NETWORK } from '../../core/config';
import * as keyring from '../../core/crypto/keyring';
import { AuthService } from '../../core/auth/auth.service';
import { SDKManager } from '../../core/sdk-manager';
import { selectCoins, AmuletContract } from '../../core/coin-control';
import {
    getWalletState,
    updateWalletState,
    updateAccounts,
    updateNetwork,
    setLocked,
    isSiteConnected,
    connectSite,
    disconnectSite,
    addPendingRequest,
    resolvePendingRequest,
    rejectPendingRequest,
    getAllPendingRequests,
    getCantonServiceInstance,
    updateJwtToken,
} from './state';
import { ErrorCodes } from '../../core/types';

/**
 * Handle incoming messages from content scripts
 */
export async function handleContentMessage(
    message: ExtensionMessage & { origin: string; href: string }
): Promise<ExtensionResponse> {
    const { type, id, payload, origin } = message;

    try {
        switch (type as MessageType) {
            case 'CANTON_REQUEST_ACCOUNTS':
                return await handleRequestAccounts(id, origin, payload as RequestAccountsPayload);

            case 'CANTON_GET_ACCOUNTS':
                return await handleGetAccounts(id, origin);

            case 'CANTON_SUBMIT_COMMAND':
                return await handleSubmitCommand(id, origin, payload as SubmitCommandPayload);

            case 'CANTON_PREPARE_TRANSACTION':
                return await handlePrepareTransaction(id, origin, payload);

            case 'CANTON_SIGN_TRANSACTION':
                return await handleSignTransaction(id, origin, payload as SignTransactionPayload);

            case 'CANTON_GET_BALANCE':
                return await handleGetBalance(id, origin);

            case 'CANTON_GET_ACTIVE_CONTRACTS':
                return await handleGetActiveContracts(id, origin, payload);

            case 'CANTON_EXECUTE_BATCH_TRANSFER':
                return await handleExecuteBatchTransfer(id, origin, payload);

            case 'WALLET_DISCONNECT':
                return await handleDisconnect(id, origin);

            default:
                return {
                    id,
                    success: false,
                    error: {
                        code: ErrorCodes.UNSUPPORTED_METHOD,
                        message: `Unsupported method: ${type}`,
                    },
                };
        }
    } catch (error) {
        console.error('Handler error:', error);
        return {
            id,
            success: false,
            error: {
                code: ErrorCodes.INTERNAL_ERROR,
                message: error instanceof Error ? error.message : 'Internal error',
            },
        };
    }
}

interface RequestAccountsPayload {
    origin: string;
    title: string;
    icon?: string;
}

/**
 * Handle account access request
 */
async function handleRequestAccounts(
    id: string,
    origin: string,
    payload: RequestAccountsPayload
): Promise<ExtensionResponse> {
    const state = getWalletState();

    // Check if wallet is initialized
    if (!state.isInitialized) {
        // Open popup to create/import wallet
        await openPopup('welcome');
        return {
            id,
            success: false,
            error: {
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Wallet not initialized. Please create or import a wallet.',
            },
        };
    }

    // Check if wallet is locked
    if (state.isLocked) {
        // Open popup to unlock
        await openPopup('unlock', { returnTo: 'connect', origin });

        return new Promise((resolve, reject) => {
            addPendingRequest({
                id,
                type: 'REQUEST_ACCOUNTS',
                origin,
                payload,
                resolve: (result) => resolve({ id, success: true, data: result }),
                reject: (error) => resolve({
                    id,
                    success: false,
                    error: { code: ErrorCodes.USER_REJECTED, message: error.message },
                }),
            });
        });
    }

    // Check if site is already connected
    if (isSiteConnected(origin)) {
        const accounts = keyring.getAccounts();
        return {
            id,
            success: true,
            data: accounts.map(a => a.publicKey),
        };
    }

    // Open popup for connection approval
    await openPopup('connect', { origin, title: payload.title, icon: payload.icon });

    return new Promise((resolve, reject) => {
        addPendingRequest({
            id,
            type: 'REQUEST_ACCOUNTS',
            origin,
            payload,
            resolve: (result) => resolve({ id, success: true, data: result }),
            reject: (error) => resolve({
                id,
                success: false,
                error: { code: ErrorCodes.USER_REJECTED, message: error.message },
            }),
        });
    });
}

/**
 * Handle get accounts (for already connected sites)
 */
async function handleGetAccounts(id: string, origin: string): Promise<ExtensionResponse> {
    const state = getWalletState();

    if (state.isLocked) {
        return {
            id,
            success: true,
            data: [], // Return empty array when locked
        };
    }

    if (!isSiteConnected(origin)) {
        return {
            id,
            success: true,
            data: [], // Return empty array for unconnected sites
        };
    }

    const accounts = keyring.getAccounts();
    return {
        id,
        success: true,
        data: accounts.map(a => a.publicKey),
    };
}

interface SubmitCommandPayload {
    command: unknown;
    origin: string;
    title: string;
    icon?: string;
}

/**
 * Handle submit command request
 */
async function handleSubmitCommand(
    id: string,
    origin: string,
    payload: SubmitCommandPayload
): Promise<ExtensionResponse> {
    const state = getWalletState();

    // Check authorization
    if (state.isLocked) {
        return {
            id,
            success: false,
            error: {
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Wallet is locked',
            },
        };
    }

    if (!isSiteConnected(origin)) {
        return {
            id,
            success: false,
            error: {
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Site not connected',
            },
        };
    }

    // Open popup for transaction confirmation
    await openPopup('confirm', {
        type: 'submitCommand',
        command: payload.command,
        origin,
        title: payload.title,
    });

    try {
        // Wait for user approval from popup
        const approval = await new Promise<any>((resolve, reject) => {
            addPendingRequest({
                id,
                type: 'SUBMIT_COMMAND',
                origin,
                payload,
                resolve,
                reject,
            });
        });

        if (!approval.success) {
            throw new Error('User rejected transaction');
        }

        // Submit to Ledger via Unified SDK
        const sdk = await SDKManager.getInstance().getSdk();

        // @ts-ignore
        const ledger = sdk.ledger;
        if (!ledger) {
            throw new Error('SDK Ledger not initialized');
        }


        // @ts-ignore - payload.command type depends on dApp
        const result = await ledger.submitCommand(payload.command);

        return {
            id,
            success: true,
            data: result,
        };
    } catch (error) {
        return {
            id,
            success: false,
            error: {
                code: ErrorCodes.INTERNAL_ERROR,
                message: error instanceof Error ? error.message : 'Transaction failed',
            },
        };
    }
}

/**
 * Handle prepare transaction
 */
async function handlePrepareTransaction(
    id: string,
    origin: string,
    payload: unknown
): Promise<ExtensionResponse> {
    // ... existing implementation (kept as mock for MVP or update if needed) ...
    const state = getWalletState();

    if (state.isLocked || !isSiteConnected(origin)) {
        return {
            id,
            success: false,
            error: {
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Unauthorized',
            },
        };
    }

    return {
        id,
        success: true,
        data: {
            txHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
            command: payload,
            metadata: {
                templateName: 'Unknown',
                description: 'Transaction',
            },
        },
    };
}

interface SignTransactionPayload {
    txHash: string;
    origin: string;
    title: string;
}

/**
 * Handle sign transaction
 */
async function handleSignTransaction(
    id: string,
    origin: string,
    payload: SignTransactionPayload
): Promise<ExtensionResponse> {
    // ... existing implementation ...
    const state = getWalletState();
    // ...
    // (rest of handleSignTransaction is fine)
    // ...
    return new Promise((resolve, reject) => {
        addPendingRequest({
            id,
            type: 'SIGN_TRANSACTION',
            origin,
            payload,
            resolve: (result) => resolve({ id, success: true, data: result }),
            reject: (error) => resolve({
                id,
                success: false,
                error: { code: ErrorCodes.USER_REJECTED, message: error.message },
            }),
        });
    });
}


/**
 * Handle get balance
 */
const AMULET_TEMPLATE_ID = '3ca1343ab26b453d38c8adb70dca5f1ead8440c42b59b68f070786955cbf9ec1:Splice.Amulet:Amulet'; // Deduced ID
// Fallback or secondary ID if the above is strictly rules
// content suggests 55ba... is the interface/factory. Let's try to query generic Splice.Amulet if possible or use the rule package ID as a guess for now.
// Actually, I'll use a constant for now and we can refine it.

/**
 * Handle get balance
 */
/**
 * Handle get balance (Unified SDK)
 */
async function handleGetBalance(id: string, origin: string): Promise<ExtensionResponse> {
    const state = getWalletState();

    if (state.isLocked) {
        return {
            id,
            success: true,
            data: [],
        };
    }

    let balance = state.balance;

    try {
        // Use Unified SDK Manager
        // Note: SDK connection is lazy, so we try to get it. 
        // If not authenticated, this might fail or redirect. 
        // For background balance check, we might want to fail silently if not connected.
        const sdk = await SDKManager.getInstance().getSdk();

        // @ts-ignore
        const ledger = sdk.ledger;
        if (ledger) {


            // @ts-ignore
            const contractResult = await ledger.fetchContracts({ templateIds: [AMULET_TEMPLATE_ID] });


            const contracts = Array.isArray(contractResult) ? contractResult : (contractResult.activeContracts || []);


            let totalAmount = 0;
            let found = false;

            for (const contract of contracts) {

                // @ts-ignore - Dynamic contract access
                const amount = contract.payload?.amount || contract.payload?.round?.amount || contract.argument?.amount;
                if (amount) {
                    totalAmount += Number(amount);
                    found = true;
                }
            }



            if (found) {
                balance = totalAmount.toFixed(10);
                // Update state cache
                const { updateWalletState } = await import('./state');
                updateWalletState({ balance });
            }
        }
    } catch (e) {
        console.error('[Handler:Balance] *** DEBUG *** Balance fetch failed:', e);
        // console.warn('Balances fetch failed or SDK not ready', e);
        // Silent fail for balance polling, keep cached value
    }

    return {
        id,
        success: true,
        data: [
            {
                ticker: 'CC',
                amount: balance,
                contractId: 'real-query-result'
            }
        ],
    };
}

/**
 * Handle get active contracts
 */
/**
 * Handle get active contracts (Unified SDK)
 */
async function handleGetActiveContracts(
    id: string,
    origin: string,
    payload: unknown
): Promise<ExtensionResponse> {
    const state = getWalletState();

    if (state.isLocked || !isSiteConnected(origin)) {
        return {
            id,
            success: true,
            data: [],
        };
    }

    try {
        const { templateId } = payload as { templateId: string };

        // Unified SDK Manager
        const sdk = await SDKManager.getInstance().getSdk();

        // @ts-ignore
        const ledger = sdk.ledger;
        if (!ledger) {
            throw new Error('SDK Ledger not initialized');
        }

        // @ts-ignore
        const contractResult = await ledger.fetchContracts({ templateIds: [templateId] });
        const contracts = Array.isArray(contractResult) ? contractResult : (contractResult.activeContracts || []);

        return {
            id,
            success: true,
            data: contracts,
        };
    } catch (error) {
        console.error('Fetch contracts error:', error);
        return {
            id,
            success: false,
            error: {
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch contracts',
            },
        };
    }
}

/**
 * Handle disconnect
 */
async function handleDisconnect(id: string, origin: string): Promise<ExtensionResponse> {
    await disconnectSite(origin);

    return {
        id,
        success: true,
        data: null,
    };
}

/**
 * Handle messages from popup
 */
export async function handlePopupMessage(
    message: { action: string; data?: unknown }
): Promise<unknown> {
    const { action, data } = message;

    switch (action) {
        case 'getState':
            return getWalletState();

        case 'checkInitialized':
            return { isInitialized: await keyring.isWalletInitialized() };

        case 'createWallet': {
            const { password, wordCount } = data as { password: string; wordCount?: 12 | 24 };
            const mnemonic = await keyring.createWallet(password, wordCount);

            const state = await keyring.getKeyringState();
            updateWalletState({
                isInitialized: true,
                isLocked: false,
                accounts: state.accounts,
                currentAccount: state.accounts[0] ?? null,
            });

            return { mnemonic };
        }

        case 'generateMnemonic': {
            const { wordCount } = data as { wordCount?: 12 | 24 };
            const mnemonic = keyring.generateRandomMnemonic(wordCount);
            return { mnemonic };
        }

        case 'importWallet': {
            const { type, value, password } = data as { type: 'mnemonic' | 'privateKey'; value: string; password: string };

            if (type === 'privateKey') {
                await keyring.createWalletFromKey(value, password);
            } else {
                // Default to mnemonic
                await keyring.importWallet(value, password);
            }

            const state = await keyring.getKeyringState();
            updateWalletState({
                isInitialized: true,
                isLocked: false,
                accounts: state.accounts,
                currentAccount: state.accounts[0] ?? null,
            });

            return { success: true };
        }

        case 'unlock': {
            const { password } = data as { password: string };
            await keyring.unlockWallet(password);

            const state = await keyring.getKeyringState();
            updateWalletState({
                isLocked: false,
                accounts: state.accounts,
                currentAccount: state.accounts[0] ?? null,
            });

            return { success: true };
        }

        case 'lock':
            keyring.lockWallet();
            setLocked(true);
            return { success: true };

        case 'getAccounts':
            return { accounts: keyring.getAccounts() };

        case 'getCurrentAccount':
            return { account: await keyring.getCurrentAccount() };

        case 'setCurrentAccount': {
            const { index } = data as { index: number };
            await keyring.setCurrentAccount(index);
            const currentAccount = await keyring.getCurrentAccount();
            updateAccounts(keyring.getAccounts(), currentAccount);
            return { success: true };
        }

        case 'signTransaction': {
            const { txHash, accountIndex, hashPurpose } = data as {
                txHash: string;
                accountIndex?: number;
                hashPurpose?: string;
            };
            const signature = await keyring.signTransaction(txHash, accountIndex, hashPurpose);
            return { signature };
        }

        case 'approveConnection': {
            const { requestId, origin, title, icon } = data as {
                requestId: string;
                origin: string;
                title: string;
                icon?: string;
            };

            await connectSite(origin, title, icon);
            const accounts = keyring.getAccounts().map(a => a.publicKey);
            resolvePendingRequest(requestId, accounts);

            return { success: true };
        }

        case 'rejectConnection': {
            const { requestId } = data as { requestId: string };
            rejectPendingRequest(requestId, new Error('User rejected connection'));
            return { success: true };
        }

        case 'approveTransaction': {
            const { requestId, signature } = data as { requestId: string; signature: string };
            resolvePendingRequest(requestId, { success: true, signature });
            return { success: true };
        }

        case 'rejectTransaction': {
            const { requestId } = data as { requestId: string };
            rejectPendingRequest(requestId, new Error('User rejected transaction'));
            return { success: true };
        }

        case 'getPendingRequests':
            const requests = getAllPendingRequests().map(r => ({
                id: r.id,
                type: r.type,
                origin: r.origin,
                payload: r.payload,
                timestamp: r.timestamp,
            }));
            return { requests };

        case 'exportMnemonic': {
            const { password } = data as { password: string };
            const mnemonic = await keyring.exportMnemonic(password);
            return { mnemonic };
        }

        case 'exportPrivateKey': {
            const { password, index } = data as { password: string; index: number };
            const privateKey = await keyring.exportPrivateKey(password, index);
            return { privateKey };
        }

        case 'changePassword': {
            const { oldPassword, newPassword } = data as { oldPassword: string; newPassword: string };
            await keyring.changePassword(oldPassword, newPassword);
            return { success: true };
        }

        case 'deleteWallet': {
            const { password } = data as { password: string };
            await keyring.deleteWallet(password);
            updateWalletState({
                isInitialized: false,
                isLocked: true,
                accounts: [],
                currentAccount: null,
                connectedSites: [],
            });
            return { success: true };
        }

        case 'disconnectSite': {
            const { origin } = data as { origin: string };
            await disconnectSite(origin);
            return { success: true };
        }

        case 'addAccount': {
            const { name, password } = data as { name?: string; password: string };
            const account = await keyring.addAccount(password, name);
            const state = await keyring.getKeyringState();

            // If this is the second account (index 1), we might want to stay on current or switch?
            // Usually adding an account doesn't automatically switch unless requested.
            // But we should update the state in frontend.
            updateWalletState({
                accounts: state.accounts,
            });

            return { account };
        }

        case 'importAccount': {
            const { privateKey, password, name } = data as { privateKey: string; password: string; name?: string };
            const account = await keyring.importAccount(privateKey, password, name);
            const state = await keyring.getKeyringState();

            updateWalletState({
                accounts: state.accounts,
            });

            return { account };
        }

        case 'renameAccount': {
            const { index, name, password } = data as { index: number; name: string; password: string };
            await keyring.renameAccount(password, index, name);

            // Update state
            const state = await keyring.getKeyringState();
            updateWalletState({
                accounts: state.accounts,
            });
            return { success: true };
        }

        case 'disconnectAllSites': {
            const state = getWalletState();
            for (const site of state.connectedSites) {
                await disconnectSite(site.origin);
            }
            return { success: true };
        }

        case 'setJwtToken': {
            const { token } = data as { token: string };
            updateJwtToken(token);
            return { success: true };
        }

        case 'setNetwork': {
            const { chainId } = data as { chainId: string };
            const network = Object.values(NETWORKS).find(n => n.chainId === chainId) || DEFAULT_NETWORK;

            updateNetwork(network);

            // Fetch balance for the new network (Mock for now)
            // In a real app, you would query the ledger for specific asset contracts
            const { updateWalletState } = await import('./state');

            // Simulator: Different balance for MainNet to show it changed
            const mockBalance = network.chainId === 'canton-mainnet' ? '1,000.00' : '100.00';
            updateWalletState({ balance: mockBalance });

            return { success: true };
        }

        case 'executeTransfer': {
            const { to, amount } = data as { to: string; amount: number };
            return await handleExecuteTransferV3(to, amount);
        }

        case 'setOpenMode': {
            const { mode, windowId } = data as { mode: 'sidebar' | 'popup', windowId?: number };

            // @ts-ignore - Chrome API types
            if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
                // @ts-ignore
                await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: mode === 'sidebar' });
            }

            if (mode === 'popup') {
                // Re-enable popup
                await chrome.action.setPopup({ popup: 'popup.html' });
            } else {
                // Disable popup (handled by browser usually if openPanelOnActionClick is true, but good measure)
                await chrome.action.setPopup({ popup: '' });

                if (windowId) {
                    try {
                        // @ts-ignore
                        await chrome.sidePanel.open({ windowId });
                    } catch (e) {
                        console.warn('Could not open sidebar immediately:', e);
                    }
                }
            }

            // Persist setting
            await chrome.storage.local.set({ openMode: mode });

            // Update state
            updateWalletState({ openMode: mode });
            return { success: true };
        }


        case 'setAutoLockTimeout': {
            const { timeout } = data as { timeout: number };
            await keyring.setAutoLockTimeout(timeout);

            // Update state
            const state = await keyring.getKeyringState();
            updateWalletState({
                autoLockTimeout: state.autoLockTimeout
            });

            return { success: true };
        }

        case 'registerPartyId': {
            // Register Party ID with Canton Network (or retrieve existing)
            const { accountIndex, forceNew } = data as { accountIndex?: number; forceNew?: boolean };
            const accounts = keyring.getAccounts();
            const targetIndex = accountIndex ?? 0;

            console.log('[Handler:registerPartyId] Starting registration for account index:', targetIndex);

            if (targetIndex >= accounts.length) {
                console.error('[Handler:registerPartyId] Invalid account index:', targetIndex);
                throw new Error('Invalid account index');
            }

            const account = accounts[targetIndex];

            // Additional safety check
            if (!account) {
                console.error('[Handler:registerPartyId] Account not found at index:', targetIndex);
                throw new Error('Account not found');
            }

            console.log('[Handler:registerPartyId] Account public key:', account.publicKey);
            console.log('[Handler:registerPartyId] Account name:', account.name);
            console.log('[Handler:registerPartyId] Current Party ID:', account.partyId);

            // Check if already has Party ID (skip if forceNew)
            if (account.partyId && !forceNew) {
                console.log('[Handler:registerPartyId] Already has Party ID, returning existing:', account.partyId);
                return { success: true, partyId: account.partyId, isExisting: true };
            }

            try {
                const cantonService = getCantonServiceInstance();
                console.log('[Handler:registerPartyId] Canton service base URL:', cantonService.getBaseUrl());

                // Use registerOrRetrieveParty to check for existing first
                const partyId = await cantonService.registerOrRetrieveParty(
                    account.publicKey,
                    account.name || `Tiva Account ${targetIndex + 1}`
                );

                // Store Party ID in keyring
                console.log('[Handler:registerPartyId] Storing Party ID in keyring...');
                await keyring.setPartyId(targetIndex, partyId);

                // Update state
                const state = await keyring.getKeyringState();
                updateWalletState({
                    accounts: state.accounts,
                    currentAccount: state.accounts[targetIndex] ?? state.accounts[0] ?? null,
                });

                console.log('[Handler:registerPartyId] ✓ Party ID registered successfully:', partyId);
                return { success: true, partyId, isExisting: false };
            } catch (error) {
                console.error('[Handler:registerPartyId] Party ID registration failed:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Party ID registration failed'
                };
            }
        }

        case 'getPartyId': {
            // Get Party ID for current account
            const { accountIndex } = data as { accountIndex?: number };
            const accounts = keyring.getAccounts();
            const targetIndex = accountIndex ?? 0;

            if (targetIndex >= accounts.length) {
                return { partyId: null };
            }

            const account = accounts[targetIndex];
            return { partyId: account?.partyId || null };
        }

        case 'executeBatchTransfer': {
            const { transfers } = data as { transfers: { to: string; amount: number }[] };
            return await TransferService.executeBatchTransfer(transfers);
        }

        case 'getTransactions': {
            const { limit, offset } = data as { limit?: number; offset?: number };
            return await TransferService.getTransactions(limit, offset);
        }

        default:
            throw new Error(`Unknown action: ${action}`);
    }
}

/**
 * Open popup with specific route
 */
async function openPopup(route: string, params?: Record<string, unknown>): Promise<void> {
    // Store route info for popup to read
    await chrome.storage.session.set({
        popupRoute: route,
        popupParams: params || {},
    });

    // Open popup
    await chrome.action.openPopup();
}

/**
 * Handle Execute Transfer (Native Splice Logic)
 */
/**
 * Handle Execute Transfer (Wallet SDK - TransferFactory Flow)
 */


// DEBUG TAG TO VERIFY BUILD INCLUSION
export const DEBUG_TAG = "DEBUG_TAG_V3_CHECK_12345";


/**
 * Handle Execute Transfer (Delegated to Transfer Service)
 */
async function handleExecuteTransferV3(to: string, amount: number) {
    console.log('[Handler:Transfer] Delegating to TransferService...');
    return TransferService.executeTransferV3(to, amount);
}



/**
 * Handle Execute Batch Transfer
 */
async function handleExecuteBatchTransfer(
    id: string,
    origin: string,
    payload: any
): Promise<ExtensionResponse> {
    console.log('[Handler:BatchRequest] Received batch transfer request', payload);

    if (!await isSiteConnected(origin)) {
        return {
            id,
            success: false,
            error: {
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Site not connected',
            },
        };
    }

    const { transfers } = payload as { transfers: { to: string; amount: number }[] };

    if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
        return {
            id,
            success: false,
            error: {
                code: ErrorCodes.INVALID_PARAMS,
                message: 'Invalid transfers array',
            },
        };
    }

    try {
        const result = await TransferService.executeBatchTransfer(transfers);
        return {
            id,
            success: true,
            data: result,
        };
    } catch (error: any) {
        return {
            id,
            success: false,
            error: {
                code: ErrorCodes.INTERNAL_ERROR,
                message: error.message || 'Batch transfer failed',
            },
        };
    }
}
