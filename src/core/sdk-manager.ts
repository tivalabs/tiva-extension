import { WalletSDK, WalletSDKImpl, LedgerController, TokenStandardController } from '@canton-network/wallet-sdk';
import { AuthService } from './auth/auth.service';
import { DEFAULT_NETWORK } from './config';

export class SDKManager {
    private static instance: SDKManager;
    private sdk: WalletSDK | null = null;
    private isConnected: boolean = false;
    private connectionPromise: Promise<WalletSDK> | null = null;

    private constructor() { }

    static getInstance(): SDKManager {
        if (!SDKManager.instance) {
            SDKManager.instance = new SDKManager();
        }
        return SDKManager.instance;
    }

    /**
     * Get the initialized SDK instance.
     * Initializes and connects if not already done.
     */
    async getSdk(): Promise<WalletSDK> {
        if (this.sdk && this.isConnected) {
            return this.sdk;
        }

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = this.initialize();
        return this.connectionPromise;
    }

    /**
     * Initialize the SDK with current configuration and auth.
     */
    private async initialize(): Promise<WalletSDK> {
        try {
            console.log('[SDKManager] Initializing SDK...');

            const session = await AuthService.getSession();
            // Note: We might initialize even without session for public data? 
            // But usually Wallet SDK needs a token implies authenticated user.
            // For now, allow init, but auth might fail if no token.
            const token = session?.token || '';
            const userId = session?.partyId || 'ledger-api-user'; // fallback

            const ledgerApiUrl = DEFAULT_NETWORK.ledgerApiUrl;
            const scanApiUrl = DEFAULT_NETWORK.scanApiUrl;

            if (!ledgerApiUrl) throw new Error('Ledger API URL missing');

            const logger = {
                info: (msg: string) => console.log(`[SDK] ${msg}`),
                error: (msg: string) => console.error(`[SDK] ${msg}`),
                warn: (msg: string) => console.warn(`[SDK] ${msg}`),
                debug: (msg: string) => { },
            };

            this.sdk = new WalletSDKImpl().configure({
                // @ts-ignore
                logger: logger,
                authFactory: () => ({
                    getToken: async () => {
                        // Always get fresh token from storage
                        const s = await AuthService.getSession();
                        return s?.token || '';
                    },
                    refresh: async () => {
                        const s = await AuthService.getSession();
                        return s?.token || '';
                    },
                    getUserToken: async () => {
                        const s = await AuthService.getSession();
                        return { userId: s?.partyId || userId, accessToken: s?.token || '' };
                    },
                    getAdminToken: async () => {
                        const s = await AuthService.getSession();
                        return { userId: s?.partyId || userId, accessToken: s?.token || '' };
                    },
                    userId: userId
                }),
                ledgerFactory: (uId: string, authProvider: any, isAdmin: boolean) =>
                    new LedgerController(uId, new URL(ledgerApiUrl), undefined, isAdmin, authProvider),
                tokenStandardFactory: (uId: string, authProvider: any, isAdmin: boolean) =>
                    new TokenStandardController(
                        uId,
                        new URL(ledgerApiUrl),
                        new URL(scanApiUrl || ledgerApiUrl),
                        undefined,
                        authProvider,
                        isAdmin
                    ).setTransferFactoryRegistryUrl(new URL(scanApiUrl || ledgerApiUrl)),
            });

            // Connect to Ledger
            console.log(`[SDKManager] Connecting to Ledger at ${ledgerApiUrl}...`);
            await this.sdk.connect();

            // Connect to Topology if available
            if (scanApiUrl) {
                console.log(`[SDKManager] Connecting to Topology at ${scanApiUrl}...`);
                await this.sdk.connectTopology(scanApiUrl);
            }

            this.isConnected = true;
            console.log('[SDKManager] SDK Initialized & Connected.');
            return this.sdk;

        } catch (error) {
            console.error('[SDKManager] Initialization failed:', error);
            this.isConnected = false;
            this.sdk = null;
            this.connectionPromise = null;
            throw error;
        } finally {
            this.connectionPromise = null;
        }
    }

    /**
     * Force reset/reconnect (e.g. on network change or logout)
     */
    async reset() {
        this.sdk = null;
        this.isConnected = false;
        this.connectionPromise = null;
    }
}
