import { Buffer } from 'buffer';

export const security = {
    async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt as any,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    },

    async encrypt(text: string, pin: string): Promise<{ ciphertext: string; salt: string; iv: string }> {
        const enc = new TextEncoder();
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const key = await this.deriveKey(pin, salt);

        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            enc.encode(text)
        );

        return {
            ciphertext: Buffer.from(encrypted).toString('base64'),
            salt: Buffer.from(salt).toString('base64'),
            iv: Buffer.from(iv).toString('base64')
        };
    },

    async decrypt(encryptedData: { ciphertext: string; salt: string; iv: string }, pin: string): Promise<string> {
        const salt = new Uint8Array(Buffer.from(encryptedData.salt, 'base64'));
        const iv = new Uint8Array(Buffer.from(encryptedData.iv, 'base64'));
        const ciphertext = new Uint8Array(Buffer.from(encryptedData.ciphertext, 'base64'));

        const key = await this.deriveKey(pin, salt);

        try {
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv },
                key,
                ciphertext
            );
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            throw new Error('Incorrect PIN');
        }
    }
};


