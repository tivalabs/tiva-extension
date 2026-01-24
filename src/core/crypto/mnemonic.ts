/**
 * BIP-39 Mnemonic Generation and Validation
 * 
 * Provides secure mnemonic phrase generation for wallet seed creation.
 */

import * as bip39 from 'bip39';

export type MnemonicStrength = 128 | 256; // 12 words = 128 bits, 24 words = 256 bits

/**
 * Generate a new BIP-39 mnemonic phrase
 * @param wordCount - Number of words (12 or 24)
 * @returns Mnemonic phrase as space-separated words
 */
export function generateMnemonic(wordCount: 12 | 24 = 12): string {
    const strength: MnemonicStrength = wordCount === 12 ? 128 : 256;
    return bip39.generateMnemonic(strength);
}

/**
 * Validate a BIP-39 mnemonic phrase
 * @param mnemonic - Mnemonic phrase to validate
 * @returns True if valid, false otherwise
 */
export function validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic.trim().toLowerCase());
}

/**
 * Convert mnemonic to seed bytes
 * @param mnemonic - Valid BIP-39 mnemonic phrase
 * @param passphrase - Optional passphrase for additional security
 * @returns 64-byte seed as Uint8Array
 */
export async function mnemonicToSeed(
    mnemonic: string,
    passphrase: string = ''
): Promise<Uint8Array> {
    const seedBuffer = await bip39.mnemonicToSeed(mnemonic.trim().toLowerCase(), passphrase);
    return new Uint8Array(seedBuffer);
}

/**
 * Convert mnemonic to seed synchronously
 * @param mnemonic - Valid BIP-39 mnemonic phrase
 * @param passphrase - Optional passphrase for additional security
 * @returns 64-byte seed as Uint8Array
 */
export function mnemonicToSeedSync(
    mnemonic: string,
    passphrase: string = ''
): Uint8Array {
    const seedBuffer = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase(), passphrase);
    return new Uint8Array(seedBuffer);
}

/**
 * Get the word list for mnemonic generation
 * @returns Array of BIP-39 English word list
 */
export function getWordList(): string[] {
    return bip39.wordlists.english as string[];
}

/**
 * Convert mnemonic to entropy bytes
 * @param mnemonic - Valid BIP-39 mnemonic phrase
 * @returns Entropy as hex string
 */
export function mnemonicToEntropy(mnemonic: string): string {
    return bip39.mnemonicToEntropy(mnemonic.trim().toLowerCase());
}

/**
 * Convert entropy to mnemonic
 * @param entropy - Entropy as hex string
 * @returns Mnemonic phrase
 */
export function entropyToMnemonic(entropy: string): string {
    return bip39.entropyToMnemonic(entropy);
}

/**
 * Split mnemonic into word array
 * @param mnemonic - Mnemonic phrase
 * @returns Array of words
 */
export function splitMnemonic(mnemonic: string): string[] {
    return mnemonic.trim().toLowerCase().split(/\s+/);
}

/**
 * Join words into mnemonic phrase
 * @param words - Array of words
 * @returns Mnemonic phrase
 */
export function joinMnemonic(words: string[]): string {
    return words.join(' ');
}
