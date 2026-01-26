/**
 * Keyring - Wallet Account Management
 * 
 * Manages wallet creation, unlocking, account derivation, and signing operations.
 * Acts as the main interface between the UI and cryptographic operations.
 */

import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from './mnemonic';
import * as ed25519 from '@noble/ed25519';
import { deriveAccountKeypair, signTransactionHash, bytesToHex, hexToBytes, type Ed25519Keypair } from './ed25519';
import {
    createVault,
    loadFromStorage,
    saveToStorage,
    vaultExists,
    deleteVault,
    changePassword as changeVaultPassword,
    type VaultData,
    type VaultAccount
} from './vault';
import type { CantonAccount } from '../types';
import { WALLET_CONFIG } from '../config';

export interface KeyringState {
    isInitialized: boolean;
    isUnlocked: boolean;
    accounts: CantonAccount[];
    currentAccountIndex: number;
    canAddAccounts?: boolean;

    walletType?: 'mnemonic' | 'privateKey';
    autoLockTimeout?: number;
}

// In-memory state (cleared on lock)
let unlockedVault: VaultData | null = null;
let unlockedSeed: Uint8Array | null = null;
let derivedKeypairs: Map<number, Ed25519Keypair> = new Map();

/**
 * Clear all in-memory sensitive data
 */
function clearMemory(): void {
    if (unlockedSeed) {
        // Zero out the seed
        unlockedSeed.fill(0);
    }

    // Zero out all derived keypairs
    derivedKeypairs.forEach((keypair) => {
        keypair.privateKey.fill(0);
    });

    unlockedVault = null;
    unlockedSeed = null;
    derivedKeypairs = new Map();
}

/**
 * Check if wallet is initialized (vault exists)
 */
export async function isWalletInitialized(): Promise<boolean> {
    return vaultExists(WALLET_CONFIG.storageKeys.vault);
}

/**
 * Check if wallet is currently unlocked
 */
export function isWalletUnlocked(): boolean {
    return unlockedVault !== null && unlockedSeed !== null;
}

/**
 * Get current keyring state
 */
export async function getKeyringState(): Promise<KeyringState> {
    const isInitialized = await isWalletInitialized();
    const isUnlocked = isWalletUnlocked();

    const accounts: CantonAccount[] = [];
    let currentAccountIndex = 0;

    if (isUnlocked && unlockedVault) {
        for (const account of unlockedVault.accounts) {
            accounts.push({
                address: account.publicKey,
                publicKey: account.publicKey,
                name: account.name,
                partyId: account.partyId,
                isImported: !!account.privateKey,
            });
        }

        // Load current account index from settings
        const settings = await chrome.storage.local.get(WALLET_CONFIG.storageKeys.settings);
        currentAccountIndex = settings[WALLET_CONFIG.storageKeys.settings]?.currentAccountIndex ?? 0;
    }

    return {
        isInitialized,
        isUnlocked,
        accounts,
        currentAccountIndex,
        canAddAccounts: !!unlockedSeed, // Only possible if we have the seed
        walletType: unlockedSeed ? 'mnemonic' : 'privateKey' as 'mnemonic' | 'privateKey',
        autoLockTimeout: (await chrome.storage.local.get(WALLET_CONFIG.storageKeys.settings))[WALLET_CONFIG.storageKeys.settings]?.autoLockTimeout ?? WALLET_CONFIG.autoLockTimeout,
    };
}

/**
 * Create a new wallet with generated mnemonic
 * @param password - User password for encryption
 * @param wordCount - Number of words in mnemonic (12 or 24)
 * @returns Generated mnemonic phrase
 */
export async function createWallet(
    password: string,
    wordCount: 12 | 24 = 12
): Promise<string> {
    // Generate new mnemonic
    const mnemonic = generateMnemonic(wordCount);

    // Create vault with mnemonic
    const vault = await createVault(mnemonic, password, WALLET_CONFIG.storageKeys.vault);

    // Derive seed and first account
    const seed = mnemonicToSeedSync(mnemonic);
    const keypair = deriveAccountKeypair(seed, 0);

    // Add first account to vault
    vault.accounts.push({
        index: 0,
        name: 'Account 1',
        publicKey: keypair.publicKeyHex,
        derivationPath: `${WALLET_CONFIG.derivationPathPrefix}/0`,
    });
    vault.updatedAt = Date.now();

    // Save updated vault
    await saveToStorage(vault, password, WALLET_CONFIG.storageKeys.vault);

    // Unlock wallet
    unlockedVault = vault;
    unlockedSeed = seed;
    derivedKeypairs.set(0, keypair);

    // Initialize settings
    await chrome.storage.local.set({
        [WALLET_CONFIG.storageKeys.settings]: {
            currentAccountIndex: 0,
            autoLockTimeout: WALLET_CONFIG.autoLockTimeout,
        },
    });

    return mnemonic;
}

/**
 * Generate a new mnemonic phrase without creating a wallet
 * @param wordCount - Number of words (12 or 24)
 */
export function generateRandomMnemonic(wordCount: 12 | 24 = 12): string {
    return generateMnemonic(wordCount);
}

/**
 * Import wallet from existing mnemonic
 * @param mnemonic - BIP-39 mnemonic phrase
 * @param password - User password for encryption
 */
export async function importWallet(mnemonic: string, password: string): Promise<void> {
    // Validate mnemonic
    if (!validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
    }

    // Create vault with mnemonic
    const vault = await createVault(mnemonic, password, WALLET_CONFIG.storageKeys.vault);

    // Derive seed and first account
    const seed = mnemonicToSeedSync(mnemonic);
    const keypair = deriveAccountKeypair(seed, 0);

    // Add first account to vault
    vault.accounts.push({
        index: 0,
        name: 'Account 1',
        publicKey: keypair.publicKeyHex,
        derivationPath: `${WALLET_CONFIG.derivationPathPrefix}/0`,
    });
    vault.updatedAt = Date.now();

    // Save updated vault
    await saveToStorage(vault, password, WALLET_CONFIG.storageKeys.vault);

    // Unlock wallet
    unlockedVault = vault;
    unlockedSeed = seed;
    derivedKeypairs.set(0, keypair);

    // Initialize settings
    await chrome.storage.local.set({
        [WALLET_CONFIG.storageKeys.settings]: {
            currentAccountIndex: 0,
            autoLockTimeout: WALLET_CONFIG.autoLockTimeout,
        },
    });
}

/**
 * Unlock wallet with password
 * @param password - User password
 */
export async function unlockWallet(password: string): Promise<void> {
    const vault = await loadFromStorage(password, WALLET_CONFIG.storageKeys.vault);

    if (!vault) {
        throw new Error('Wallet not found');
    }

    // Derive seed from mnemonic if available
    const seed = vault.mnemonic ? mnemonicToSeedSync(vault.mnemonic) : null;

    // Derive or load all account keypairs
    const keypairs = new Map<number, Ed25519Keypair>();
    for (const account of vault.accounts) {
        let keypair: Ed25519Keypair;

        if (account.privateKey) {
            // Use stored private key
            const privateKey = hexToBytes(account.privateKey);
            const publicKey = ed25519.getPublicKey(privateKey);
            keypair = {
                privateKey,
                publicKey,
                privateKeyHex: bytesToHex(privateKey),
                publicKeyHex: bytesToHex(publicKey),
            };
        } else if (seed && account.derivationPath) {
            // Derive from seed
            keypair = deriveAccountKeypair(seed, account.index);
        } else {
            // Should not happen for valid vault
            console.warn(`Skipping invalid account ${account.index}`);
            continue;
        }

        keypairs.set(account.index, keypair);
    }

    // Store in memory
    unlockedVault = vault;
    unlockedSeed = seed;
    derivedKeypairs = keypairs;

    // Update last active time
    await chrome.storage.local.set({
        [WALLET_CONFIG.storageKeys.lastActiveTime]: Date.now(),
    });
}

/**
 * Lock wallet and clear sensitive data from memory
 */
export function lockWallet(): void {
    clearMemory();
}

/**
 * Get all accounts
 */
export function getAccounts(): CantonAccount[] {
    if (!unlockedVault) {
        return [];
    }

    return unlockedVault.accounts.map((account) => ({
        address: account.publicKey,
        publicKey: account.publicKey,
        name: account.name,
        partyId: account.partyId,
        isImported: !!account.privateKey,
    }));
}

/**
 * Get current account
 */
export async function getCurrentAccount(): Promise<CantonAccount | null> {
    if (!unlockedVault) {
        return null;
    }

    const settings = await chrome.storage.local.get(WALLET_CONFIG.storageKeys.settings);
    const currentIndex = settings[WALLET_CONFIG.storageKeys.settings]?.currentAccountIndex ?? 0;

    const account = unlockedVault.accounts[currentIndex];
    if (!account) {
        return null;
    }

    return {
        address: account.publicKey,
        publicKey: account.publicKey,
        name: account.name,
        partyId: account.partyId,
        isImported: !!account.privateKey,
    };
}

/**
 * Add a new account
 * @param password - User password for encryption
 * @param name - Optional account name
 */
export async function addAccount(password: string, name?: string): Promise<CantonAccount> {
    if (!unlockedVault) {
        throw new Error('Wallet is locked');
    }

    if (!unlockedSeed) {
        throw new Error('Cannot add new accounts to an imported private key wallet');
    }

    if (unlockedVault.accounts.length >= WALLET_CONFIG.maxAccounts) {
        throw new Error(`Maximum ${WALLET_CONFIG.maxAccounts} accounts allowed`);
    }

    const newIndex = unlockedVault.accounts.length;
    const keypair = deriveAccountKeypair(unlockedSeed, newIndex);

    const newAccount: VaultAccount = {
        index: newIndex,
        name: name || `Account ${newIndex + 1}`,
        publicKey: keypair.publicKeyHex,
        derivationPath: `${WALLET_CONFIG.derivationPathPrefix}/${newIndex}`,
    };

    unlockedVault.accounts.push(newAccount);
    unlockedVault.updatedAt = Date.now();
    derivedKeypairs.set(newIndex, keypair);

    // Persist changes
    await saveToStorage(unlockedVault, password, WALLET_CONFIG.storageKeys.vault);

    return {
        address: newAccount.publicKey,
        publicKey: newAccount.publicKey,
        name: newAccount.name,
        isImported: false,
    };
}

/**
 * Set current account
 * @param index - Account index
 */
export async function setCurrentAccount(index: number): Promise<void> {
    if (!unlockedVault) {
        throw new Error('Wallet is locked');
    }

    if (index < 0 || index >= unlockedVault.accounts.length) {
        throw new Error('Invalid account index');
    }

    const settings = await chrome.storage.local.get(WALLET_CONFIG.storageKeys.settings);
    await chrome.storage.local.set({
        [WALLET_CONFIG.storageKeys.settings]: {
            ...settings[WALLET_CONFIG.storageKeys.settings],
            currentAccountIndex: index,
        },
    });
}

/**
 * Rename an account
 * @param password - User password for encryption
 * @param index - Account index
 * @param name - New account name
 */
export async function renameAccount(password: string, index: number, name: string): Promise<void> {
    if (!unlockedVault) {
        throw new Error('Wallet is locked');
    }

    const account = unlockedVault.accounts[index];
    if (!account) {
        throw new Error('Account not found');
    }

    account.name = name;
    unlockedVault.updatedAt = Date.now();

    // Persist changes
    await saveToStorage(unlockedVault, password, WALLET_CONFIG.storageKeys.vault);
}

/**
 * Sign a transaction hash
 * @param txHash - Transaction hash to sign (hex string)
 * @param accountIndex - Account index to sign with (uses current if not specified)
 * @param hashPurpose - Optional hash purpose prefix for Canton
 * @returns Signature as hex string
 */
export async function signTransaction(
    txHash: string,
    accountIndex?: number,
    hashPurpose?: string
): Promise<string> {
    if (!unlockedVault) {
        throw new Error('Wallet is locked');
    }

    // Get account index
    let index = accountIndex;
    if (index === undefined) {
        const settings = await chrome.storage.local.get(WALLET_CONFIG.storageKeys.settings);
        index = settings[WALLET_CONFIG.storageKeys.settings]?.currentAccountIndex ?? 0;
    }

    const keypair = derivedKeypairs.get(index as number);
    if (!keypair) {
        throw new Error('Account keypair not found');
    }

    return signTransactionHash(txHash, keypair.privateKey, hashPurpose);
}

/**
 * Get public key for an account
 * @param index - Account index
 * @returns Public key as hex string
 */
export function getPublicKey(index: number): string | null {
    const keypair = derivedKeypairs.get(index);
    return keypair?.publicKeyHex ?? null;
}

/**
 * Export mnemonic (requires password verification)
 * @param password - User password for verification
 * @returns Mnemonic phrase
 */
export async function exportMnemonic(password: string): Promise<string> {
    const vault = await loadFromStorage(password, WALLET_CONFIG.storageKeys.vault);

    if (!vault) {
        throw new Error('Invalid password or wallet not found');
    }

    if (!vault.mnemonic) {
        throw new Error('No mnemonic available');
    }

    return vault.mnemonic;
}

/**
 * Import an account from a private key (Add to existing wallet)
 * @param privateKey - Hex encoded private key
 * @param password - User password for encryption
 * @param name - Optional account name
 */
export async function importAccount(
    privateKey: string,
    password: string,
    name?: string
): Promise<CantonAccount> {
    if (!unlockedVault) {
        throw new Error('Wallet is locked');
    }

    // Validate private key (32 bytes = 64 hex chars)
    if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
        throw new Error('Invalid private key format (expected 64 hex characters)');
    }

    // Check for duplicates
    const keyBytes = hexToBytes(privateKey);
    const pubKey = ed25519.getPublicKey(keyBytes);
    const pubKeyHex = bytesToHex(pubKey);

    const existing = unlockedVault.accounts.find(a => a.publicKey === pubKeyHex);
    if (existing) {
        throw new Error('Account already exists in wallet');
    }

    if (unlockedVault.accounts.length >= WALLET_CONFIG.maxAccounts) {
        throw new Error(`Maximum ${WALLET_CONFIG.maxAccounts} accounts allowed`);
    }

    const newIndex = unlockedVault.accounts.length;

    const newAccount: VaultAccount = {
        index: newIndex,
        name: name || `Imported ${newIndex + 1}`,
        publicKey: pubKeyHex,
        privateKey: privateKey // Store the private key explicitly
    };

    unlockedVault.accounts.push(newAccount);
    unlockedVault.updatedAt = Date.now();

    // Cache the keypair in memory
    derivedKeypairs.set(newIndex, {
        privateKey: keyBytes,
        publicKey: pubKey,
        privateKeyHex: privateKey,
        publicKeyHex: pubKeyHex
    });

    // Persist changes
    await saveToStorage(unlockedVault, password, WALLET_CONFIG.storageKeys.vault);

    return {
        address: newAccount.publicKey,
        publicKey: newAccount.publicKey,
        name: newAccount.name,
        isImported: true,
    };
}

/**
 * Create a new wallet with imported private key (no mnemonic)
 * @param privateKey - Hex encoded Ed25519 private key
 * @param password - User password for encryption
 */
export async function createWalletFromKey(
    privateKey: string,
    password: string
): Promise<void> {
    // Validate private key (32 bytes = 64 hex chars)
    if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
        throw new Error('Invalid private key format (expected 64 hex characters)');
    }

    const keyBytes = hexToBytes(privateKey);
    const pubKey = ed25519.getPublicKey(keyBytes);
    const pubKeyHex = bytesToHex(pubKey);

    // Create vault without mnemonic
    const now = Date.now();
    const vault: VaultData = {
        accounts: [{
            index: 0,
            name: 'Account 1',
            publicKey: pubKeyHex,
            privateKey: privateKey // Stored encrypted in vault
        }],
        createdAt: now,
        updatedAt: now
    };

    await saveToStorage(vault, password, WALLET_CONFIG.storageKeys.vault);

    // Unlock immediately
    unlockedVault = vault;
    unlockedSeed = null;

    derivedKeypairs = new Map();
    derivedKeypairs.set(0, {
        privateKey: keyBytes,
        publicKey: pubKey,
        privateKeyHex: privateKey,
        publicKeyHex: pubKeyHex
    });

    // Initialize settings
    await chrome.storage.local.set({
        [WALLET_CONFIG.storageKeys.settings]: {
            currentAccountIndex: 0,
            autoLockTimeout: WALLET_CONFIG.autoLockTimeout,
        },
    });
}

/**
 * Export private key for a specific account (requires password verification)
 * @param password - User password for verification
 * @param accountIndex - Index of the account to export
 * @returns Private key as hex string
 */
export async function exportPrivateKey(password: string, accountIndex: number): Promise<string> {
    const vault = await loadFromStorage(password, WALLET_CONFIG.storageKeys.vault);

    if (!vault) {
        throw new Error('Invalid password or wallet not found');
    }

    // Check if account uses stored private key
    const account = vault.accounts.find(a => a.index === accountIndex);
    if (!account) {
        throw new Error('Account not found');
    }

    if (account.privateKey) {
        return account.privateKey;
    }

    // Otherwise derive from mnemonic
    if (!vault.mnemonic) {
        throw new Error('No private key or mnemonic found for this account');
    }

    // We re-derive to ensure security and not rely on cached memory if called from background fresh
    const seed = mnemonicToSeedSync(vault.mnemonic);
    const keypair = deriveAccountKeypair(seed, accountIndex);
    return keypair.privateKeyHex;
}

/**
 * Change wallet password
 * @param oldPassword - Current password
 * @param newPassword - New password
 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await changeVaultPassword(oldPassword, newPassword, WALLET_CONFIG.storageKeys.vault);
}

/**
 * Delete wallet completely
 * @param password - User password for verification
 */
export async function deleteWallet(password: string): Promise<void> {
    // Verify password first
    const vault = await loadFromStorage(password, WALLET_CONFIG.storageKeys.vault);
    if (!vault) {
        throw new Error('Invalid password');
    }

    // Clear memory
    clearMemory();

    // Delete from storage
    await deleteVault(WALLET_CONFIG.storageKeys.vault);
    await chrome.storage.local.remove([
        WALLET_CONFIG.storageKeys.settings,
        WALLET_CONFIG.storageKeys.connectedSites,
        WALLET_CONFIG.storageKeys.lastActiveTime,
    ]);
}

/**
 * Check and auto-lock if timeout exceeded
 */
export async function checkAutoLock(): Promise<boolean> {
    if (!isWalletUnlocked()) {
        return false;
    }

    const result = await chrome.storage.local.get([
        WALLET_CONFIG.storageKeys.lastActiveTime,
        WALLET_CONFIG.storageKeys.settings,
    ]);

    const lastActive = result[WALLET_CONFIG.storageKeys.lastActiveTime] as number | undefined;
    const settings = result[WALLET_CONFIG.storageKeys.settings];
    const timeout = settings?.autoLockTimeout ?? WALLET_CONFIG.autoLockTimeout;

    // 0 or negative means never lock
    if (timeout <= 0) {
        return false;
    }

    if (lastActive && Date.now() - lastActive > timeout) {
        lockWallet();
        return true;
    }

    return false;
}

/**
 * Update last active time
 */
export async function updateLastActive(): Promise<void> {
    await chrome.storage.local.set({
        [WALLET_CONFIG.storageKeys.lastActiveTime]: Date.now(),
    });
}

/**
 * Set auto-lock timeout
 * @param timeout - Timeout in milliseconds
 */
export async function setAutoLockTimeout(timeout: number): Promise<void> {
    const result = await chrome.storage.local.get(WALLET_CONFIG.storageKeys.settings);
    const settings = result[WALLET_CONFIG.storageKeys.settings] || {};

    await chrome.storage.local.set({
        [WALLET_CONFIG.storageKeys.settings]: {
            ...settings,
            autoLockTimeout: timeout,
        },
    });

    // Reset last active time to prevent immediate locking if new timeout is short
    await updateLastActive();
}

/**
 * Set Party ID for an account
 * @param accountIndex - Index of the account
 * @param partyId - Canton Network Party ID
 */
export async function setPartyId(accountIndex: number, partyId: string): Promise<void> {
    if (!unlockedVault) {
        throw new Error('Wallet is locked');
    }

    const account = unlockedVault.accounts[accountIndex];
    if (!account) {
        throw new Error('Account not found');
    }

    account.partyId = partyId;
    unlockedVault.updatedAt = Date.now();

    // We need the password to save, so we'll store partyId in local storage temporarily
    // The full vault save will happen on next password-protected operation
    // For now, store the partyId mapping separately
    const partyIdStorage = await chrome.storage.local.get(WALLET_CONFIG.storageKeys.settings);
    const settings = partyIdStorage[WALLET_CONFIG.storageKeys.settings] || {};
    const partyIdMap = settings.partyIdMap || {};
    partyIdMap[account.publicKey] = partyId;

    await chrome.storage.local.set({
        [WALLET_CONFIG.storageKeys.settings]: {
            ...settings,
            partyIdMap,
        },
    });
}

/**
 * Get Party ID for an account
 * @param accountIndex - Index of the account
 * @returns Party ID or undefined
 */
export function getPartyId(accountIndex: number): string | undefined {
    if (!unlockedVault) {
        return undefined;
    }

    const account = unlockedVault.accounts[accountIndex];
    return account?.partyId;
}
