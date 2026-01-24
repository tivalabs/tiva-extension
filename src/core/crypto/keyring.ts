/**
 * Keyring - Wallet Account Management
 * 
 * Manages wallet creation, unlocking, account derivation, and signing operations.
 * Acts as the main interface between the UI and cryptographic operations.
 */

import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from './mnemonic';
import { deriveAccountKeypair, signTransactionHash, bytesToHex, type Ed25519Keypair } from './ed25519';
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

    // Derive seed from mnemonic
    const seed = mnemonicToSeedSync(vault.mnemonic);

    // Derive all account keypairs
    const keypairs = new Map<number, Ed25519Keypair>();
    for (const account of vault.accounts) {
        const keypair = deriveAccountKeypair(seed, account.index);
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
    };
}

/**
 * Add a new account
 * @param name - Optional account name
 */
export async function addAccount(name?: string): Promise<CantonAccount> {
    if (!unlockedVault || !unlockedSeed) {
        throw new Error('Wallet is locked');
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

    // We need the password to save, but we don't store it
    // This should be called with re-encryption in a real scenario
    // For now, we'll need to implement a different approach

    return {
        address: newAccount.publicKey,
        publicKey: newAccount.publicKey,
        name: newAccount.name,
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
 * @param index - Account index
 * @param name - New account name
 */
export async function renameAccount(index: number, name: string): Promise<void> {
    if (!unlockedVault) {
        throw new Error('Wallet is locked');
    }

    const account = unlockedVault.accounts[index];
    if (!account) {
        throw new Error('Account not found');
    }

    account.name = name;
    unlockedVault.updatedAt = Date.now();
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

    return vault.mnemonic;
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
