
import { AuthService } from '../../core/auth/auth.service';
import { DEFAULT_NETWORK } from '../../core/config';

export const DEBUG_TRANSFER_TAG = "V3_TRANSFER_SERVICE_ACTIVE";

const executeTransferV3 = async (to: string, amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    try {
        console.log(`[TransferService] *** V3 DIRECT API *** Initiating transfer: ${amount} CC to ${to}`);

        const session = await AuthService.getSession();
        if (!session?.token) {
            throw new Error('No active session. Please log in.');
        }

        // We use the Validator API URL
        const baseUrl = DEFAULT_NETWORK.scanApiUrl;
        if (!baseUrl) throw new Error('Validator API URL not configured');

        // Explicitly construct the V3 URL (Direct Transfer)
        const transferUrl = `${baseUrl}/wallet/token-standard/transfers`;

        const payload = {
            receiver_party_id: to,
            amount: amount.toFixed(10),
            description: "Transfer via CantonLink",
            expires_at: (Date.now() * 1000) + (3600 * 1000 * 1000), // 1 hour
            tracking_id: crypto.randomUUID()
        };

        console.log('[TransferService] Sending Transfer Offer payload:', payload);

        const response = await fetch(transferUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[TransferService] API Error ${response.status}:`, errText);
            throw new Error(`Transfer failed: ${response.status} ${errText}`);
        }

        const result = await response.json();
        console.log('[TransferService] Success:', result);

        return {
            success: true,
            txHash: payload.tracking_id,
        };

    } catch (error: any) {
        console.error('[TransferService] Transfer failed:', error);
        return { success: false, error: error.message || 'Transfer failed' };
    }
};

export default { executeTransferV3 };
