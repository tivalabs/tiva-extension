import type { NetworkConfig } from './types';

// Canton Network Production Configuration (YuCe Trade)
export const PRODUCTION_CONFIG: NetworkConfig = {
    name: 'Canton Production',
    participantUrl: 'https://rpc.yuce.trade',
    ledgerApiUrl: 'https://rpc.yuce.trade/api',
    jsonApiUrl: 'https://rpc.yuce.trade/api',  // Correct API endpoint
    chainId: 'canton-production',
    isTestnet: false,
};

// Canton Network DevNet Configuration (kept for reference)
export const TESTNET_CONFIG: NetworkConfig = {
    name: 'Canton DevNet',
    participantUrl: 'https://scan.sv-1.dev.global.canton.network.sync.global',
    ledgerApiUrl: 'https://scan.sv-1.dev.global.canton.network.sync.global/api',
    jsonApiUrl: 'https://scan.sv-1.dev.global.canton.network.sync.global',
    chainId: 'canton-devnet',
    isTestnet: true,
};

// Canton Network MainNet Configuration (for future use)
export const MAINNET_CONFIG: NetworkConfig = {
    name: 'Canton MainNet',
    participantUrl: 'https://mainnet.canton.network',
    ledgerApiUrl: 'https://mainnet-ledger.canton.network',
    jsonApiUrl: 'https://api.cantonnodes.com',
    chainId: 'canton-mainnet',
    isTestnet: false,
};

// Local Development Configuration
export const LOCAL_CONFIG: NetworkConfig = {
    name: 'Local Development',
    participantUrl: 'http://localhost:5001',
    ledgerApiUrl: 'http://localhost:5011',
    jsonApiUrl: 'http://localhost:7575',
    chainId: 'canton-local',
    isTestnet: true,
};

// Default Network - Production (YuCe Trade)
export const DEFAULT_NETWORK = PRODUCTION_CONFIG;

// Available Networks (Production only for now - network selection hidden in UI)
export const NETWORKS: Record<string, NetworkConfig> = {
    production: PRODUCTION_CONFIG,
};

// Wallet Configuration
export const WALLET_CONFIG = {
    // Auto-lock timeout in milliseconds (15 minutes)
    autoLockTimeout: 15 * 60 * 1000,

    // Maximum accounts per wallet
    maxAccounts: 10,

    // Mnemonic word count options
    mnemonicWordCounts: [12, 24] as const,

    // Default mnemonic word count
    defaultMnemonicWordCount: 12,

    // Key derivation path prefix for Canton
    // Using a custom path similar to Ethereum's m/44'/60'/0'/0
    derivationPathPrefix: "m/44'/1234'/0'/0",

    // Storage keys
    storageKeys: {
        vault: 'cantonlink_vault',
        settings: 'cantonlink_settings',
        connectedSites: 'cantonlink_connected_sites',
        lastActiveTime: 'cantonlink_last_active',
    },
};

// Extension Information
export const EXTENSION_INFO = {
    name: 'CantonLink',
    version: '1.0.0',
    uuid: 'cantonlink-wallet-v1',
    icon: '/icons/icon128.png',
};
