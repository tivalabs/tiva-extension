
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

/**
 * Execute Batch Transfer (Sequential Loop)
 */
const executeBatchTransfer = async (transfers: { to: string; amount: number }[]): Promise<{ success: boolean; results: any[] }> => {
    console.log(`[TransferService] *** BATCH TRANSFER *** Processing ${transfers.length} transfers...`);

    const results = [];
    let successCount = 0;

    // Use sequential execution to prevent rate limiting or nonce issues
    for (const transfer of transfers) {
        try {
            console.log(`[TransferService] Batch Item: ${transfer.amount} CC to ${transfer.to}`);
            const result = await executeTransferV3(transfer.to, transfer.amount);
            results.push({ ...transfer, ...result });
            if (result.success) successCount++;

            // Small delay between requests to be nice to the node
            await new Promise(r => setTimeout(r, 200));
        } catch (error: any) {
            console.error(`[TransferService] Batch Item Failed [${transfer.to}]:`, error);
            results.push({ ...transfer, success: false, error: error.message });
        }
    }

    console.log(`[TransferService] Batch Completed. ${successCount}/${transfers.length} successful.`);

    // Overall success if at least one worked? or all? 
    // Let's say generic success = true (handled individual errors in results)
    return {
        success: true,
        results
    };
};

/**
 * Get Transactions
 */
const getTransactions = async (limit: number = 20, offset: number = 0): Promise<{ success: boolean; transactions?: any[]; error?: string }> => {
    try {
        const session = await AuthService.getSession();
        if (!session?.token) {
            throw new Error('No active session.');
        }

        const baseUrl = DEFAULT_NETWORK.scanApiUrl;
        if (!baseUrl) throw new Error('Validator API URL not configured');

        const historyUrl = `${baseUrl}/wallet/transactions`;
        // Payload based on standard patterns. If it fails, we will inspect the 400 error.
        const payload = {
            page_size: limit, // Backend expects page_size
            offset
        };

        console.log('[TransferService] Fetching Transactions:', payload);

        const response = await fetch(historyUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[TransferService] History API Error ${response.status}:`, errText);

            // Fallback for empty/404 if not implemented yet
            if (response.status === 404) return { success: true, transactions: [] };

            throw new Error(`Fetch history failed: ${response.status} ${errText}`);
        }

        const result = await response.json();
        console.log('[TransferService] History Success:', result);

        return {
            success: true,
            transactions: result.items || [] // User confirmed 'items' array
        };

    } catch (error: any) {
        console.error('[TransferService] Get Transactions failed:', error);
        return { success: false, error: error.message };
    }
};

export default { executeTransferV3, executeBatchTransfer, getTransactions };
