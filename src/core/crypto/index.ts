// Re-export specific items to avoid conflicts
export {
    generateMnemonic,
    validateMnemonic,
    mnemonicToSeed,
    mnemonicToSeedSync,
    getWordList,
    mnemonicToEntropy,
    entropyToMnemonic,
    splitMnemonic,
    joinMnemonic
} from './mnemonic';

export type { MnemonicStrength } from './mnemonic';

export {
    deriveKeypair,
    deriveAccountKeypair,
    sign,
    signSync,
    verify,
    verifySync,
    signTransactionHash,
    getPublicKey,
    hexToBytes,
    bytesToHex,
    generateRandomKeypair
} from './ed25519';

export type { Ed25519Keypair } from './ed25519';

export {
    encrypt,
    decrypt,
    verifyPassword,
    hashPassword,
    saveToStorage,
    loadFromStorage,
    vaultExists,
    deleteVault,
    changePassword as changeVaultPassword,
    createVault,
    exportVault,
    importVault
} from './vault';

export type { EncryptedData, VaultData, VaultAccount } from './vault';

export {
    isWalletInitialized,
    isWalletUnlocked,
    getKeyringState,
    createWallet,
    importWallet,
    unlockWallet,
    lockWallet,
    getAccounts,
    getCurrentAccount,
    addAccount,
    setCurrentAccount,
    renameAccount,
    signTransaction,
    exportMnemonic,
    changePassword,
    deleteWallet,
    checkAutoLock,
    updateLastActive
} from './keyring';

export type { KeyringState } from './keyring';
