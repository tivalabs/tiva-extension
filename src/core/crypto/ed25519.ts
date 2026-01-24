/**
 * Ed25519 Key Derivation and Signing
 * 
 * Canton Network uses Ed25519 for cryptographic operations.
 * This module provides key derivation from BIP-39 seeds and signing functionality.
 */

import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { hmac } from '@noble/hashes/hmac';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

// Configure noble/ed25519 to use sync methods
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

export interface Ed25519Keypair {
    privateKey: Uint8Array;
    publicKey: Uint8Array;
    privateKeyHex: string;
    publicKeyHex: string;
}

// ED25519 curve order for key derivation
const ED25519_CURVE = 'ed25519 seed';

/**
 * Derive Ed25519 master key from seed using SLIP-0010
 * @param seed - 64-byte seed from BIP-39 mnemonic
 * @returns Master key and chain code
 */
function deriveMasterKey(seed: Uint8Array): { key: Uint8Array; chainCode: Uint8Array } {
    const I = hmac(sha512, ED25519_CURVE, seed);
    return {
        key: I.slice(0, 32),
        chainCode: I.slice(32),
    };
}

/**
 * Derive child key from parent key using SLIP-0010
 * @param parentKey - Parent private key
 * @param parentChainCode - Parent chain code
 * @param index - Derivation index (hardened only for Ed25519)
 * @returns Child key and chain code
 */
function deriveChildKey(
    parentKey: Uint8Array,
    parentChainCode: Uint8Array,
    index: number
): { key: Uint8Array; chainCode: Uint8Array } {
    // Ed25519 only supports hardened derivation
    const hardenedIndex = index + 0x80000000;

    const data = new Uint8Array(37);
    data[0] = 0x00;
    data.set(parentKey, 1);
    data[33] = (hardenedIndex >> 24) & 0xff;
    data[34] = (hardenedIndex >> 16) & 0xff;
    data[35] = (hardenedIndex >> 8) & 0xff;
    data[36] = hardenedIndex & 0xff;

    const I = hmac(sha512, parentChainCode, data);
    return {
        key: I.slice(0, 32),
        chainCode: I.slice(32),
    };
}

/**
 * Parse derivation path string
 * @param path - Derivation path (e.g., "m/44'/1234'/0'/0/0")
 * @returns Array of derivation indices
 */
function parsePath(path: string): number[] {
    const parts = path.split('/');

    if (parts[0] !== 'm') {
        throw new Error('Invalid derivation path: must start with "m"');
    }

    return parts.slice(1).map((part) => {
        const isHardened = part.endsWith("'") || part.endsWith('h');
        const index = parseInt(isHardened ? part.slice(0, -1) : part, 10);

        if (isNaN(index) || index < 0) {
            throw new Error(`Invalid derivation path component: ${part}`);
        }

        // For Ed25519, all derivations are hardened
        return index;
    });
}

/**
 * Derive Ed25519 keypair from seed and derivation path
 * @param seed - 64-byte seed from BIP-39 mnemonic
 * @param path - Derivation path (default: "m/44'/1234'/0'/0/0" for Canton)
 * @returns Ed25519 keypair
 */
export function deriveKeypair(
    seed: Uint8Array,
    path: string = "m/44'/1234'/0'/0/0"
): Ed25519Keypair {
    const indices = parsePath(path);

    let { key, chainCode } = deriveMasterKey(seed);

    for (const index of indices) {
        const derived = deriveChildKey(key, chainCode, index);
        key = derived.key;
        chainCode = derived.chainCode;
    }

    const publicKey = ed25519.getPublicKey(key);

    return {
        privateKey: key,
        publicKey,
        privateKeyHex: bytesToHex(key),
        publicKeyHex: bytesToHex(publicKey),
    };
}

/**
 * Derive keypair at specific account index
 * @param seed - 64-byte seed from BIP-39 mnemonic
 * @param accountIndex - Account index (0-based)
 * @returns Ed25519 keypair
 */
export function deriveAccountKeypair(
    seed: Uint8Array,
    accountIndex: number = 0
): Ed25519Keypair {
    const path = `m/44'/1234'/0'/0/${accountIndex}`;
    return deriveKeypair(seed, path);
}

/**
 * Sign a message with Ed25519 private key
 * @param message - Message to sign (string or Uint8Array)
 * @param privateKey - Ed25519 private key
 * @returns Signature as Uint8Array
 */
export async function sign(
    message: string | Uint8Array,
    privateKey: Uint8Array
): Promise<Uint8Array> {
    const messageBytes = typeof message === 'string'
        ? new TextEncoder().encode(message)
        : message;

    return ed25519.signAsync(messageBytes, privateKey);
}

/**
 * Sign a message synchronously with Ed25519 private key
 * @param message - Message to sign (string or Uint8Array)
 * @param privateKey - Ed25519 private key
 * @returns Signature as Uint8Array
 */
export function signSync(
    message: string | Uint8Array,
    privateKey: Uint8Array
): Uint8Array {
    const messageBytes = typeof message === 'string'
        ? new TextEncoder().encode(message)
        : message;

    return ed25519.sign(messageBytes, privateKey);
}

/**
 * Verify an Ed25519 signature
 * @param signature - Signature to verify
 * @param message - Original message
 * @param publicKey - Ed25519 public key
 * @returns True if signature is valid
 */
export async function verify(
    signature: Uint8Array,
    message: string | Uint8Array,
    publicKey: Uint8Array
): Promise<boolean> {
    const messageBytes = typeof message === 'string'
        ? new TextEncoder().encode(message)
        : message;

    return ed25519.verifyAsync(signature, messageBytes, publicKey);
}

/**
 * Verify an Ed25519 signature synchronously
 * @param signature - Signature to verify
 * @param message - Original message
 * @param publicKey - Ed25519 public key
 * @returns True if signature is valid
 */
export function verifySync(
    signature: Uint8Array,
    message: string | Uint8Array,
    publicKey: Uint8Array
): boolean {
    const messageBytes = typeof message === 'string'
        ? new TextEncoder().encode(message)
        : message;

    return ed25519.verify(signature, messageBytes, publicKey);
}

/**
 * Sign a transaction hash for Canton Network
 * Canton may require specific hash purpose prefixes
 * @param txHash - Transaction hash to sign (hex string or bytes)
 * @param privateKey - Ed25519 private key
 * @param hashPurpose - Optional hash purpose prefix for Canton
 * @returns Signature as hex string
 */
export async function signTransactionHash(
    txHash: string | Uint8Array,
    privateKey: Uint8Array,
    hashPurpose?: string
): Promise<string> {
    let hashBytes = typeof txHash === 'string'
        ? hexToBytes(txHash.replace('0x', ''))
        : txHash;

    // If hash purpose is provided, prepend it
    if (hashPurpose) {
        const purposeBytes = new TextEncoder().encode(hashPurpose);
        const combined = new Uint8Array(purposeBytes.length + hashBytes.length);
        combined.set(purposeBytes);
        combined.set(hashBytes, purposeBytes.length);
        hashBytes = combined;
    }

    const signature = await sign(hashBytes, privateKey);
    return bytesToHex(signature);
}

/**
 * Get public key from private key
 * @param privateKey - Ed25519 private key
 * @returns Public key as Uint8Array
 */
export function getPublicKey(privateKey: Uint8Array): Uint8Array {
    return ed25519.getPublicKey(privateKey);
}

/**
 * Convert hex string to bytes
 */
export { hexToBytes };

/**
 * Convert bytes to hex string
 */
export { bytesToHex };

/**
 * Generate a random Ed25519 keypair (for testing)
 * @returns Ed25519 keypair
 */
export function generateRandomKeypair(): Ed25519Keypair {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = ed25519.getPublicKey(privateKey);

    return {
        privateKey,
        publicKey,
        privateKeyHex: bytesToHex(privateKey),
        publicKeyHex: bytesToHex(publicKey),
    };
}
