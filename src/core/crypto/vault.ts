/**
 * Vault - Secure Encrypted Storage
 * 
 * Provides AES-GCM encryption for securely storing sensitive data
 * like private keys and mnemonic phrases in chrome.storage.local
 */

import { sha256 } from '@noble/hashes/sha256';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils';

// Encryption configuration
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12; // GCM recommended IV length
const KEY_LENGTH = 32; // 256-bit key

export interface EncryptedData {
    ciphertext: string; // Hex encoded
    iv: string; // Hex encoded
    salt: string; // Hex encoded
    version: number;
}

export interface VaultData {
    mnemonic?: string;
    accounts: VaultAccount[];
    createdAt: number;
    updatedAt: number;
}

export interface VaultAccount {
    index: number;
    name: string;
    publicKey: string;
    derivationPath?: string;
    privateKey?: string; // Encrypted private key for non-HD accounts or cached keys
    partyId?: string;    // Canton Network Party ID
}

/**
 * Derive encryption key from password using PBKDF2
 * @param password - User password
 * @param salt - Salt bytes
 * @returns 256-bit key
 */
function deriveKey(password: string, salt: Uint8Array): Uint8Array {
    const passwordBytes = new TextEncoder().encode(password);
    return pbkdf2(sha256, passwordBytes, salt, { c: PBKDF2_ITERATIONS, dkLen: KEY_LENGTH });
}

/**
 * Encrypt data using AES-256-GCM
 * @param data - Data to encrypt
 * @param password - User password
 * @returns Encrypted data object
 */
export async function encrypt(data: string, password: string): Promise<EncryptedData> {
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const key = deriveKey(password, salt);

    // Convert to proper ArrayBuffer for Web Crypto API
    const keyBuffer = new Uint8Array(key).buffer;
    const ivArray = new Uint8Array(iv);

    // Import key for Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );

    // Encrypt
    const dataBytes = new TextEncoder().encode(data);
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: ivArray },
        cryptoKey,
        dataBytes
    );

    return {
        ciphertext: bytesToHex(new Uint8Array(ciphertext)),
        iv: bytesToHex(iv),
        salt: bytesToHex(salt),
        version: 1,
    };
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Encrypted data object
 * @param password - User password
 * @returns Decrypted data string
 * @throws Error if decryption fails (wrong password)
 */
export async function decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    const salt = hexToBytes(encryptedData.salt);
    const iv = hexToBytes(encryptedData.iv);
    const ciphertext = hexToBytes(encryptedData.ciphertext);
    const key = deriveKey(password, salt);

    // Convert to proper ArrayBuffer for Web Crypto API
    const keyBuffer = new Uint8Array(key).buffer;
    const ivArray = new Uint8Array(iv);
    const ciphertextArray = new Uint8Array(ciphertext);

    // Import key for Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
    );

    try {
        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivArray },
            cryptoKey,
            ciphertextArray
        );

        return new TextDecoder().decode(decrypted);
    } catch {
        throw new Error('Decryption failed: Invalid password or corrupted data');
    }
}

/**
 * Verify password without fully decrypting
 * @param encryptedData - Encrypted data object
 * @param password - User password to verify
 * @returns True if password is correct
 */
export async function verifyPassword(encryptedData: EncryptedData, password: string): Promise<boolean> {
    try {
        await decrypt(encryptedData, password);
        return true;
    } catch {
        return false;
    }
}

/**
 * Hash password for quick comparison (not for encryption)
 * @param password - Password to hash
 * @returns Hash as hex string
 */
export function hashPassword(password: string): string {
    const passwordBytes = new TextEncoder().encode(password);
    return bytesToHex(sha256(passwordBytes));
}

/**
 * Save encrypted vault to chrome.storage.local
 * @param vaultData - Vault data to save
 * @param password - User password for encryption
 * @param storageKey - Storage key name
 */
export async function saveToStorage(
    vaultData: VaultData,
    password: string,
    storageKey: string = 'tiva_vault'
): Promise<void> {
    const dataString = JSON.stringify(vaultData);
    const encryptedData = await encrypt(dataString, password);

    await chrome.storage.local.set({ [storageKey]: encryptedData });
}

/**
 * Load and decrypt vault from chrome.storage.local
 * @param password - User password for decryption
 * @param storageKey - Storage key name
 * @returns Vault data or null if not found
 */
export async function loadFromStorage(
    password: string,
    storageKey: string = 'tiva_vault'
): Promise<VaultData | null> {
    const result = await chrome.storage.local.get(storageKey);
    const encryptedData = result[storageKey] as EncryptedData | undefined;

    if (!encryptedData) {
        return null;
    }

    const decryptedString = await decrypt(encryptedData, password);
    return JSON.parse(decryptedString) as VaultData;
}

/**
 * Check if vault exists in storage
 * @param storageKey - Storage key name
 * @returns True if vault exists
 */
export async function vaultExists(storageKey: string = 'tiva_vault'): Promise<boolean> {
    const result = await chrome.storage.local.get(storageKey);
    return !!result[storageKey];
}

/**
 * Delete vault from storage
 * @param storageKey - Storage key name
 */
export async function deleteVault(storageKey: string = 'tiva_vault'): Promise<void> {
    await chrome.storage.local.remove(storageKey);
}

/**
 * Change vault password
 * @param oldPassword - Current password
 * @param newPassword - New password
 * @param storageKey - Storage key name
 */
export async function changePassword(
    oldPassword: string,
    newPassword: string,
    storageKey: string = 'tiva_vault'
): Promise<void> {
    const vaultData = await loadFromStorage(oldPassword, storageKey);

    if (!vaultData) {
        throw new Error('Vault not found');
    }

    vaultData.updatedAt = Date.now();
    await saveToStorage(vaultData, newPassword, storageKey);
}

/**
 * Create new vault with mnemonic
 * @param mnemonic - BIP-39 mnemonic phrase
 * @param password - User password
 * @param storageKey - Storage key name
 * @returns Created vault data
 */
export async function createVault(
    mnemonic: string,
    password: string,
    storageKey: string = 'tiva_vault'
): Promise<VaultData> {
    const now = Date.now();

    const vaultData: VaultData = {
        mnemonic,
        accounts: [],
        createdAt: now,
        updatedAt: now,
    };

    await saveToStorage(vaultData, password, storageKey);
    return vaultData;
}

/**
 * Export encrypted vault data (for backup)
 * @param storageKey - Storage key name
 * @returns Encrypted data or null
 */
export async function exportVault(
    storageKey: string = 'tiva_vault'
): Promise<EncryptedData | null> {
    const result = await chrome.storage.local.get(storageKey);
    return result[storageKey] as EncryptedData | null;
}

/**
 * Import encrypted vault data (for restore)
 * @param encryptedData - Encrypted vault data
 * @param password - Password to verify the import
 * @param storageKey - Storage key name
 */
export async function importVault(
    encryptedData: EncryptedData,
    password: string,
    storageKey: string = 'tiva_vault'
): Promise<VaultData> {
    // Verify password works
    const vaultData = await decrypt(encryptedData, password);
    const parsed = JSON.parse(vaultData) as VaultData;

    // Save to storage
    await chrome.storage.local.set({ [storageKey]: encryptedData });

    return parsed;
}
