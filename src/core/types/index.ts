// Canton Network Types

// Account and Identity
export interface CantonAccount {
    address: string;           // Internal wallet address (derived from public key)
    publicKey: string;         // Ed25519 public key in hex format
    name?: string;             // User-defined account name
    partyId?: string;          // Canton Party ID (e.g., "CantonLink-abc123::namespace")
    isImported?: boolean;      // True if account was imported via private key
}

// JWT Authentication State
export interface JWTAuthState {
    token: string;             // JWT token string
    partyId: string;           // Associated Party ID
    expiresAt: number;         // Token expiry timestamp (ms)
    createdAt: number;         // Token creation timestamp (ms)
}

// Canton Party Registration Response
export interface PartyRegistrationResponse {
    partyId: string;           // Allocated Party ID
    namespace: string;         // Canton namespace
    displayName?: string;      // Optional display name
    isLocal: boolean;          // Whether party is local to participant
    registeredAt: number;      // Registration timestamp
}

// Daml Command Types
export interface DamlCommand {
    templateId: TemplateId;
    choice?: string;
    argument: Record<string, unknown>;
    contractId?: string;
}

export interface TemplateId {
    packageId: string;
    moduleName: string;
    entityName: string;
}

// Transaction Types
export interface PreparedTransaction {
    txHash: string;
    command: DamlCommand;
    estimatedGas?: string;
    metadata?: TransactionMetadata;
}

export interface TransactionMetadata {
    templateName: string;
    choiceName?: string;
    description?: string;
}

export interface TransactionResult {
    success: boolean;
    txHash?: string;
    error?: string;
    events?: ContractEvent[];
}

// Contract Types
export interface ActiveContract {
    contractId: string;
    templateId: TemplateId;
    payload: Record<string, unknown>;
    signatories: string[];
    observers: string[];
    createdAt: string;
}

export interface ContractEvent {
    type: 'created' | 'archived';
    contractId: string;
    templateId: TemplateId;
    payload?: Record<string, unknown>;
}

// CIP-56 Token Types
export interface TokenBalance {
    tokenId: string;
    symbol: string;
    name: string;
    balance: string;
    decimals: number;
    iconUrl?: string;
}

export interface TokenMetadata {
    tokenId: string;
    symbol: string;
    name: string;
    decimals: number;
    totalSupply?: string;
    issuer?: string;
}

// Network Configuration
export interface NetworkConfig {
    name: string;
    participantUrl: string;
    ledgerApiUrl: string;
    jsonApiUrl: string;
    chainId?: string;
    isTestnet: boolean;
    jwtToken?: string;
}

// Wallet State
export interface WalletState {
    isLocked: boolean;
    isInitialized: boolean;
    currentAccount: CantonAccount | null;
    accounts: CantonAccount[];
    network: NetworkConfig;
    connectedSites: ConnectedSite[];
    balance: string; // Aggregate balance for current account (CC)
    openMode?: 'sidebar' | 'popup';
    canAddAccounts?: boolean; // Whether the wallet supports adding derived accounts
    walletType?: 'mnemonic' | 'privateKey';
    autoLockTimeout?: number;
}

export interface ConnectedSite {
    origin: string;
    name: string;
    icon?: string;
    connectedAt: number;
    permissions: string[];
}

// Message Types (for extension communication)
export type MessageType =
    | 'CANTON_REQUEST_ACCOUNTS'
    | 'CANTON_GET_ACCOUNTS'
    | 'CANTON_SIGN_AND_SUBMIT'
    | 'CANTON_PREPARE_TRANSACTION'
    | 'CANTON_SIGN_TRANSACTION'
    | 'CANTON_GET_BALANCE'
    | 'CANTON_GET_ACTIVE_CONTRACTS'
    | 'WALLET_CONNECT'
    | 'WALLET_DISCONNECT'
    | 'WALLET_UNLOCK'
    | 'WALLET_LOCK'
    | 'WALLET_STATE_CHANGED';

export interface ExtensionMessage<T = unknown> {
    type: MessageType;
    id: string;
    payload?: T;
    origin?: string;
}

export interface ExtensionResponse<T = unknown> {
    id: string;
    success: boolean;
    data?: T;
    error?: CantonError;
}

// Provider Events
export type ProviderEvent =
    | 'connect'
    | 'disconnect'
    | 'accountsChanged'
    | 'networkChanged'
    | 'message';

export interface ProviderEventData {
    connect: { chainId: string };
    disconnect: { code: number; message: string };
    accountsChanged: string[];
    networkChanged: string;
    message: { type: string; data: unknown };
}

// Error Types
export interface CantonError {
    code: number;
    message: string;
    data?: unknown;
}

export const ErrorCodes = {
    USER_REJECTED: 4001,
    UNAUTHORIZED: 4100,
    UNSUPPORTED_METHOD: 4200,
    DISCONNECTED: 4900,
    CHAIN_DISCONNECTED: 4901,
    INTERNAL_ERROR: -32603,
    INVALID_PARAMS: -32602,
    METHOD_NOT_FOUND: -32601,
} as const;
