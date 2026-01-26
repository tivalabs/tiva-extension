/**
 * Canton Network Service
 * 
 * Handles Canton-specific operations:
 * - Party ID registration with custom prefix (e.g., "CantonLink")
 * - JWT token management for ledger authentication
 */

// Party ID prefix for CantonLink wallet
export const PARTY_ID_PREFIX = 'CantonLink';

// Logging helper
const LOG_PREFIX = '[CantonService]';
function log(...args: unknown[]): void {
    console.log(LOG_PREFIX, ...args);
}
function logError(...args: unknown[]): void {
    console.error(LOG_PREFIX, ...args);
}
function logWarn(...args: unknown[]): void {
    console.warn(LOG_PREFIX, ...args);
}

/**
 * Response from party allocation endpoint
 */
export interface AllocatePartyResponse {
    result: {
        identifier: string;      // The Party ID like "CantonLink-abc123::namespace"
        displayName?: string;    // Display name if provided
        isLocal: boolean;        // Whether the party is local to this participant
    };
    status: number;
}

/**
 * Response from parties list endpoint
 */
export interface PartiesListResponse {
    result: Array<{
        identifier: string;
        displayName?: string;
        isLocal: boolean;
    }>;
    status: number;
}

/**
 * JWT Token payload for Canton Ledger API
 */
export interface CantonJWTPayload {
    // Standard JWT claims
    sub?: string;           // Subject (user id)
    aud?: string;           // Audience
    exp?: number;           // Expiration time
    iat?: number;           // Issued at
    nbf?: number;           // Not before

    // Canton-specific claims
    'https://daml.com/ledger-api'?: {
        ledgerId?: string;
        applicationId: string;
        actAs: string[];      // Party IDs that can act as
        readAs?: string[];    // Party IDs that can read as
    };
}

/**
 * Canton Service for network operations
 */
export class CantonService {
    private baseUrl: string;
    private jwtToken: string | null = null;
    private jwtExpiry: number = 0;
    private partyId: string | null = null;

    constructor(jsonApiUrl: string) {
        // Remove trailing slash if present
        this.baseUrl = jsonApiUrl.replace(/\/$/, '');
        log('Initialized with base URL:', this.baseUrl);
    }

    /**
     * Register a new party with the Canton network
     * 
     * @param publicKey - The wallet's public key (used in identifier hint)
     * @param displayName - Optional display name for the party
     * @returns The allocated Party ID
     */
    async allocateParty(publicKey: string, displayName?: string): Promise<string> {
        const shortKey = publicKey.slice(0, 8);
        const identifierHint = `${PARTY_ID_PREFIX}-${shortKey}`;

        log('Allocating party with hint:', identifierHint);
        log('Public key:', publicKey);

        // V2 API requires partyIdHint
        const requestBody = {
            partyIdHint: identifierHint,
        };

        log('Request URL:', `${this.baseUrl}/v2/parties`);
        log('Request body:', JSON.stringify(requestBody));

        const response = await fetch(`${this.baseUrl}/v2/parties`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.jwtToken ? { 'Authorization': `Bearer ${this.jwtToken}` } : {}),
            },
            body: JSON.stringify(requestBody),
        });

        log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            logError('Party allocation failed:', response.status, errorText);
            throw new Error(`Failed to allocate party: ${response.status} - ${errorText}`);
        }

        const data: AllocatePartyResponse = await response.json();
        log('Response data:', JSON.stringify(data));

        if (data.status !== 200 || !data.result?.identifier) {
            logError('Party allocation failed with unexpected response:', data);
            throw new Error(`Party allocation failed: ${JSON.stringify(data)}`);
        }

        this.partyId = data.result.identifier;
        log('✓ Party allocated successfully:', this.partyId);
        return data.result.identifier;
    }

    /**
     * Fetch parties by identifiers to check if a party exists
     */
    async fetchParty(partyId: string): Promise<{ identifier: string; displayName?: string; isLocal: boolean } | null> {
        log('Fetching party:', partyId);

        // V2 uses GET /v2/parties to list
        const response = await fetch(`${this.baseUrl}/v2/parties`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(this.jwtToken ? { 'Authorization': `Bearer ${this.jwtToken}` } : {}),
            },
        });

        const data = await response.json();
        if (data.status === 200 && Array.isArray(data.result)) {
            const found = data.result.find((p: any) => p.identifier === partyId);
            return found || null;
        }
        return null; // Not found or error
    }



    /**
     * Search for existing Party ID by public key hint
     * This looks for parties with the CantonLink prefix matching the public key
     * 
     * @param publicKey - The wallet's public key
     * @returns The Party ID if found, null otherwise
     */
    async findPartyByPublicKey(publicKey: string): Promise<string | null> {
        const shortKey = publicKey.slice(0, 8);
        const expectedHint = `${PARTY_ID_PREFIX}-${shortKey}`;

        log('Searching for existing party with hint:', expectedHint);
        log('Public key:', publicKey);

        try {
            // First, try to get all known parties
            const response = await fetch(`${this.baseUrl}/v2/parties`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.jwtToken ? { 'Authorization': `Bearer ${this.jwtToken}` } : {}),
                },
            });

            log('List parties response status:', response.status);

            if (!response.ok) {
                logWarn('Failed to list parties:', response.status);
                return null;
            }

            const data: PartiesListResponse = await response.json();
            log('List parties response:', JSON.stringify(data));

            if (data.result && Array.isArray(data.result)) {
                // Look for a party with matching hint prefix
                const matchingParty = data.result.find(p =>
                    p.identifier.startsWith(expectedHint)
                );

                if (matchingParty) {
                    log('✓ Found existing party:', matchingParty.identifier);
                    return matchingParty.identifier;
                }
            }

            log('No existing party found for public key');
            return null;
        } catch (error) {
            logError('Error searching for party:', error);
            return null;
        }
    }

    /**
     * Register or retrieve Party ID for a public key
     * First checks if Party ID already exists, if not creates a new one
     * 
     * @param publicKey - The wallet's public key
     * @param displayName - Optional display name for the party
     * @returns The Party ID (existing or newly created)
     */
    async registerOrRetrieveParty(publicKey: string, displayName?: string): Promise<string> {
        log('=== registerOrRetrieveParty ===');
        log('Public key:', publicKey);
        log('Display name:', displayName);

        // First, try to find existing party
        const existingPartyId = await this.findPartyByPublicKey(publicKey);

        if (existingPartyId) {
            log('✓ Using existing Party ID:', existingPartyId);
            this.partyId = existingPartyId;
            return existingPartyId;
        }

        // No existing party, allocate a new one
        log('No existing party found, allocating new party...');
        return await this.allocateParty(publicKey, displayName);
    }

    /**
     * Generate a JWT token for ledger API access
     * 
     * In a production environment, this would typically involve:
     * 1. Getting a challenge from the authentication server
     * 2. Signing the challenge with the wallet's private key
     * 3. Exchanging the signature for a JWT
     * 
     * For Canton's JSON API with unsecured sandbox mode, we can generate
     * a client-side JWT. For production, this needs server-side coordination.
     * 
     * @param partyId - The Party ID to generate token for
     * @param applicationId - Application identifier (default: 'cantonlink')
     * @param expiryMinutes - Token expiry in minutes (default: 60)
     */
    generateJWT(partyId: string, applicationId: string = 'cantonlink', expiryMinutes: number = 60): string {
        log('Generating JWT for party:', partyId);

        const now = Math.floor(Date.now() / 1000);
        const exp = now + (expiryMinutes * 60);

        const header = {
            alg: 'HS256',
            typ: 'JWT',
        };

        const payload: CantonJWTPayload = {
            sub: partyId,
            iat: now,
            exp: exp,
            'https://daml.com/ledger-api': {
                applicationId,
                actAs: [partyId],
                readAs: [partyId],
            },
        };

        // Note: This is a simplified JWT generation for development/unsecured mode
        // Production would require proper key-based signing
        const base64Header = this.base64UrlEncode(JSON.stringify(header));
        const base64Payload = this.base64UrlEncode(JSON.stringify(payload));

        // For unsecured mode, we use a simple HMAC-like signature
        // In production, this would use RS256 with proper keys from the validator
        const signature = this.base64UrlEncode('cantonlink-wallet-signature');

        const token = `${base64Header}.${base64Payload}.${signature}`;

        this.jwtToken = token;
        this.jwtExpiry = exp * 1000; // Convert to milliseconds

        log('✓ JWT generated, expires at:', new Date(this.jwtExpiry).toISOString());
        return token;
    }

    /**
     * Request JWT token from validation node
     * This is the production flow that requires the validator node to issue tokens
     * 
     * @param partyId - The Party ID requesting authorization
     * @param signCallback - Callback to sign challenge with wallet's private key
     */
    async requestJWTFromValidator(
        partyId: string,
        signCallback: (message: string) => Promise<string>
    ): Promise<string> {
        log('Requesting JWT from validator for party:', partyId);

        // Step 1: Request authentication challenge from validator
        const challengeResponse = await fetch(`${this.baseUrl}/v1/auth/challenge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                partyId,
            }),
        });

        log('Challenge response status:', challengeResponse.status);

        if (!challengeResponse.ok) {
            // If challenge endpoint doesn't exist, fall back to client-side JWT
            logWarn('Challenge endpoint not available, using client-side JWT');
            return this.generateJWT(partyId);
        }

        const { challenge, nonce } = await challengeResponse.json();
        log('Received challenge, nonce:', nonce);

        // Step 2: Sign the challenge
        log('Signing challenge...');
        const signature = await signCallback(challenge);
        log('Challenge signed');

        // Step 3: Exchange signature for JWT
        log('Exchanging signature for JWT...');
        const tokenResponse = await fetch(`${this.baseUrl}/v1/auth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                partyId,
                nonce,
                signature,
            }),
        });

        if (!tokenResponse.ok) {
            logError('Failed to obtain JWT token from validator:', tokenResponse.status);
            throw new Error('Failed to obtain JWT token from validator');
        }

        const { token, expiresAt } = await tokenResponse.json();

        this.jwtToken = token;
        this.jwtExpiry = expiresAt;

        log('✓ JWT obtained from validator, expires at:', new Date(expiresAt).toISOString());
        return token;
    }

    /**
     * Get current JWT token (generate if needed)
     */
    getToken(): string | null {
        if (this.jwtToken && Date.now() < this.jwtExpiry) {
            return this.jwtToken;
        }
        return null;
    }

    /**
     * Check if we have a valid JWT token
     */
    hasValidToken(): boolean {
        return this.jwtToken !== null && Date.now() < this.jwtExpiry;
    }

    /**
     * Get or generate a valid JWT token
     */
    async ensureValidToken(partyId: string): Promise<string> {
        if (this.hasValidToken()) {
            return this.jwtToken!;
        }

        // Generate a new token
        return this.generateJWT(partyId);
    }

    /**
     * Set the current Party ID
     */
    setPartyId(partyId: string): void {
        this.partyId = partyId;
    }

    /**
     * Get the current Party ID
     */
    getPartyId(): string | null {
        return this.partyId;
    }

    /**
     * Clear authentication state
     */
    clearAuth(): void {
        this.jwtToken = null;
        this.jwtExpiry = 0;
        this.partyId = null;
    }

    /**
     * Manually set the JWT token
     */
    setToken(token: string): void {
        this.jwtToken = token;

        // Try to decode expiry
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payloadPart = parts[1];
                if (payloadPart) {
                    const payload = JSON.parse(this.base64UrlDecode(payloadPart));
                    if (payload.exp) {
                        this.jwtExpiry = payload.exp * 1000;
                        log('✓ Manually set JWT token, expires at:', new Date(this.jwtExpiry).toISOString());
                        return;
                    }
                }
            }
        } catch (e) {
            // Ignore decoding errors
        }

        // Default to 24h if no expiry found
        this.jwtExpiry = Date.now() + 24 * 60 * 60 * 1000;
        log('✓ Manually set JWT token (no expiry found, defaulting to 24h)');
    }

    /**
     * Get base URL for debugging
     */
    getBaseUrl(): string {
        return this.baseUrl;
    }

    /**
     * Base64 URL encoding (JWT-safe)
     */
    private base64UrlEncode(str: string): string {
        const base64 = btoa(str);
        return base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    /**
     * Base64 URL decoding
     */
    private base64UrlDecode(str: string): string {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        return atob(base64);
    }
}

// Singleton instance for the canton service
let cantonServiceInstance: CantonService | null = null;

/**
 * Get or create the Canton service instance
 */
export function getCantonService(jsonApiUrl: string): CantonService {
    if (!cantonServiceInstance || cantonServiceInstance.getBaseUrl() !== jsonApiUrl.replace(/\/$/, '')) {
        log('Creating new CantonService instance for:', jsonApiUrl);
        cantonServiceInstance = new CantonService(jsonApiUrl);
    }
    return cantonServiceInstance;
}

/**
 * Reset the Canton service instance
 */
export function resetCantonService(): void {
    log('Resetting CantonService instance');
    cantonServiceInstance = null;
}
