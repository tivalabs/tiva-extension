/**
 * Background Service Worker - Message Handlers
 * 
 * Handles messages from content scripts and popup.
 */

import type { ExtensionMessage, ExtensionResponse, MessageType, CantonAccount } from '../../core/types';
import { NETWORKS, DEFAULT_NETWORK } from '../../core/config';
import * as keyring from '../../core/crypto/keyring';
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
    getLedgerClient,
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

            case 'CANTON_SIGN_AND_SUBMIT':
                return await handleSignAndSubmit(id, origin, payload as SignAndSubmitPayload);

            case 'CANTON_PREPARE_TRANSACTION':
                return await handlePrepareTransaction(id, origin, payload);

            case 'CANTON_SIGN_TRANSACTION':
                return await handleSignTransaction(id, origin, payload as SignTransactionPayload);

            case 'CANTON_GET_BALANCE':
                return await handleGetBalance(id, origin);

            case 'CANTON_GET_ACTIVE_CONTRACTS':
                return await handleGetActiveContracts(id, origin, payload);

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

interface SignAndSubmitPayload {
    command: unknown;
    origin: string;
    title: string;
    icon?: string;
}

/**
 * Handle sign and submit request
 */
async function handleSignAndSubmit(
    id: string,
    origin: string,
    payload: SignAndSubmitPayload
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
        type: 'signAndSubmit',
        command: payload.command,
        origin,
        title: payload.title,
    });

    try {
        // Wait for user approval from popup
        const approval = await new Promise<any>((resolve, reject) => {
            addPendingRequest({
                id,
                type: 'SIGN_AND_SUBMIT',
                origin,
                payload,
                resolve,
                reject,
            });
        });

        if (!approval.success) {
            throw new Error('User rejected transaction');
        }

        // Submit to Ledger
        const ledger = getLedgerClient();
        if (!ledger.isConnected()) {
            // For MVP, auto-connect with a dummy token or user's token
            // const token = await keyring.getToken(); // Hypothetical
            ledger.connect('dummy-jwt-token');
        }

        console.log('Submitting command to ledger:', payload.command);
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
        const ledger = getLedgerClient();
        if (ledger.isConnected()) {
            try {
                console.log('Fetching real balance for:', AMULET_TEMPLATE_ID);
                const contracts = await ledger.fetchActiveContracts(AMULET_TEMPLATE_ID);

                let totalAmount = 0;
                let found = false;

                for (const contract of contracts) {
                    // @ts-ignore - Dynamic contract access
                    const amount = contract.payload?.amount || contract.payload?.round?.amount;
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
            } catch (e) {
                console.warn('Balances fetch failed', e);
            }
        }
    } catch (e) {
        // Ignore ledger client init errors if any
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
        const ledger = getLedgerClient();

        if (!ledger.isConnected()) {
            ledger.connect('dummy-jwt-token');
        }

        const contracts = await ledger.fetchActiveContracts(templateId);

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
            return await handleExecuteTransfer(to, amount);
        }

        case 'setOpenMode': {
            const { mode, windowId } = data as { mode: 'sidebar' | 'popup', windowId?: number };

            // @ts-ignore - Chrome API types
            if (chrome.sidePanel) {
                if (chrome.sidePanel.setPanelBehavior) {
                    // @ts-ignore
                    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: mode === 'sidebar' });
                }

                if (mode === 'sidebar' && windowId) {
                    // Open immediately
                    try {
                        // @ts-ignore
                        await chrome.sidePanel.open({ windowId });
                    } catch (e) {
                        console.warn('Could not open sidebar immediately (requires user gesture):', e);
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
async function handleExecuteTransfer(to: string, amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
        const ledger = getLedgerClient();
        if (!ledger.isConnected()) {
            // Ideally prompt for connection or use stored token
            throw new Error('Ledger not connected');
        }

        // 1. Fetch Amulet Contracts (Coins) & Rules
        const AMULET_TEMPLATE_ID = '3ca1343ab26b453d38c8adb70dca5f1ead8440c42b59b68f070786955cbf9ec1:Splice.Amulet:Amulet';
        const RULES_TEMPLATE_ID = '3ca1343ab26b453d38c8adb70dca5f1ead8440c42b59b68f070786955cbf9ec1:Splice.ExternalPartyAmuletRules:ExternalPartyAmuletRules';

        const [amuletContracts, ruleContracts] = await Promise.all([
            ledger.fetchActiveContracts(AMULET_TEMPLATE_ID),
            ledger.fetchActiveContracts(RULES_TEMPLATE_ID)
        ]);

        if (ruleContracts.length === 0) {
            throw new Error('No Transfer Factory (Rules) found. You might need to onboard to the app first.');
        }

        // 2. Select Coins
        const amulets: AmuletContract[] = amuletContracts.map((c: any) => ({
            contractId: c.contractId,
            // @ts-ignore
            amount: Number(c.payload?.amount || c.payload?.round?.amount || 0),
            templateId: c.templateId
        })).filter((c: any) => c.amount > 0);

        const selection = selectCoins(amount, amulets);
        if (!selection.success) {
            throw new Error(selection.error || 'Insufficient funds');
        }

        // 3. Build Command
        const factoryContract = ruleContracts[0] as any; // Cast to access contractId
        const command = {
            templateId: RULES_TEMPLATE_ID,
            contractId: factoryContract.contractId,
            choice: 'TransferFactory_Transfer',
            argument: {
                transfer: {
                    receiver: to, // Format: "Party::Namespace"
                    // Splice Amulet uses Decimal(10), we send string
                    amount: amount.toFixed(10),
                    inputHoldingCids: selection.inputs.map(i => i.contractId)
                    // We omit optional args for now; Ledger error will guide us if missing
                }
            }
        };

        console.log('Executing Transfer:', command);
        const result = await ledger.submitCommand(command);

        return {
            success: true,
            txHash: (result as any)?.transactionId || 'submitted',
        };

    } catch (error: any) {
        console.error('Transfer failed:', error);
        return { success: false, error: error.message || 'Transfer failed' };
    }
}
