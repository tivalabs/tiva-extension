
import { SDKManager } from '../../core/sdk-manager';
import { AuthService } from '../../core/auth/auth.service';
import type { WalletSDK } from '@canton-network/wallet-sdk';

export const DEBUG_SDK_TAG = "SDK_TRANSFER_EXPERIMENTAL";

/**
 * Execute Transfer using Wallet SDK (TokenStandardController)
 * 
 * This uses the 'createTransfer' method which corresponds to the 
 * /wallet/token-standard/transfers functionality found in the d.ts
 */
const executeTransferSDK = async (to: string, amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    try {
        console.log(`[TransferSDK] *** SDK EXPERIMENT *** Initiating transfer: ${amount} CC to ${to}`);

        const session = await AuthService.getSession();
        if (!session?.partyId) {
            throw new Error('No active session or Party ID found');
        }
        const senderParty = session.partyId;

        const sdkManager = SDKManager.getInstance();
        const sdk = await sdkManager.getSdk();

        // @ts-ignore - Check if tokenStandard exists on the SDK instance
        const tokenController = sdk.tokenStandard;

        if (!tokenController) {
            console.error('[TransferSDK] TokenStandardController not found on SDK instance', Object.keys(sdk));
            throw new Error('SDK TokenStandardController not available');
        }

        // We need an Instrument ID. For now, we reuse the one we found earlier or fetch it.
        // Hardcoded for experiment given previous logs: 
        // 3ca1343ab26b453d38c8adb70dca5f1ead8440c42b59b68f070786955cbf9ec1:Splice.Amulet:Amulet
        // Ideally this should be fetched from config or state.
        const INSTRUMENT_ID = '3ca1343ab26b453d38c8adb70dca5f1ead8440c42b59b68f070786955cbf9ec1:Splice.Amulet:Amulet';

        console.log('[TransferSDK] calling createTransfer...');

        // signature: createTransfer(sender, receiver, amount, instrument, ...)
        // See tokenStandardController.d.ts:374
        // Note: The SDK might handle decimals differently, assuming string input for safety.
        // Returns [WrappedCommand, DisclosedContract[]]
        const [wrappedCommand, disclosedContracts] = await tokenController.createTransfer(
            senderParty,
            to,
            amount.toFixed(10), // Amount as string
            { instrumentId: INSTRUMENT_ID } // Instrument object
        );

        console.log('[TransferSDK] Transfer Command Created:', wrappedCommand);

        // Now we need to submit it. 
        // The SDK might return a command that needs to be submitted via ledger controller.

        // @ts-ignore
        const ledger = sdk.ledger;

        // Submitting using the standard ledger submit.
        // Pass the wrappedCommand directly.
        // @ts-ignore
        const result = await ledger.submitCommand(wrappedCommand);

        console.log('[TransferSDK] Submission Result:', result);

        return {
            success: true,
            txHash: result.updateId, // Result contains updateId
        };

    } catch (error: any) {
        console.error('[TransferSDK] Transfer failed:', error);
        return { success: false, error: error.message || 'Transfer failed' };
    }
};

export default { executeTransferSDK };
