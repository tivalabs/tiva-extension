import { DEFAULT_NETWORK } from '../config';
import { JWTAuthState } from '../types';

/**
 * Authentication Service
 * Handles OAuth2 flow with the Validator Node.
 */
export class AuthService {
    private static STORAGE_KEY = 'cantonlink_auth_state';

    /**
     * Initiates the OAuth2 login flow.
     * Opens a new tab pointing to the Validator's login endpoint.
     */
    static async login(): Promise<void> {
        const config = DEFAULT_NETWORK;
        if (!config.validatorAuthUrl) {
            throw new Error('Validator Auth URL is not configured for this network.');
        }

        const clientId = config.oauthClientId || 'cantonlink-extension';
        const redirectUri = chrome.identity.getRedirectURL(); /* 'oauth2' */;
        // Note: For actual extension, we might use chrome.identity.launchWebAuthFlow
        // But if the validation page is a standard web page that returns a token in the URL hash/query:

        const authUrl = `${config.validatorAuthUrl}/login?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=party_id`;

        // 使用 chrome.identity.launchWebAuthFlow
        try {
            const redirectUrl = await chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            });

            if (redirectUrl) {
                await this.handleCallback(redirectUrl);
            }
        } catch (error) {
            console.error('OAuth flow failed:', error);
            throw error;
        }
    }

    /**
     * Handles the redirect callback from the OAuth provider.
     * Parses the token from the URL and stores it.
     */
    static async handleCallback(url: string): Promise<void> {
        const urlParams = new URLSearchParams(new URL(url).hash.substring(1)); // Assuming implicit flow (hash fragment)
        // Check query params if hash is empty
        const queryParams = new URL(url).searchParams;

        const token = urlParams.get('access_token') || queryParams.get('access_token');
        const partyId = urlParams.get('party_id') || queryParams.get('party_id'); // Assuming the validator returns party_id
        const expiresIn = urlParams.get('expires_in') || queryParams.get('expires_in') || '3600';

        if (!token || !partyId) {
            throw new Error('Invalid response from Validator: Missing token or Party ID.');
        }

        const authState: JWTAuthState = {
            token,
            partyId,
            expiresAt: Date.now() + (parseInt(expiresIn) * 1000),
            createdAt: Date.now()
        };

        await this.setSession(authState);

        // Notify app -> Redirect to Dashboard
        chrome.runtime.sendMessage({ type: 'WALLET_UNLOCK' });
    }

    /**
     * Gets the current active session.
     */
    static async getSession(): Promise<JWTAuthState | null> {
        const result = await chrome.storage.local.get(this.STORAGE_KEY);
        const session = result[this.STORAGE_KEY] as JWTAuthState;

        if (!session) return null;

        // Check expiry
        if (Date.now() > session.expiresAt) {
            await this.logout();
            return null;
        }

        return session;
    }

    /**
     * Saves the session to storage.
     * TODO: Encrypt this with a local PIN in the future.
     */
    private static async setSession(session: JWTAuthState): Promise<void> {
        await chrome.storage.local.set({ [this.STORAGE_KEY]: session });
    }

    /**
     * Logs out the user.
     */
    static async logout(): Promise<void> {
        await chrome.storage.local.remove(this.STORAGE_KEY);
        chrome.runtime.sendMessage({ type: 'WALLET_LOCK' }); // Or WALLET_DISCONNECT
    }

    /**
     * Checks if the user is currently authenticated.
     */
    static async isAuthenticated(): Promise<boolean> {
        const session = await this.getSession();
        return !!session;
    }
}
