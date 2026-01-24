/**
 * Coin Selection Logic (UTXO Style)
 * 
 * Selects a subset of Amulet contracts to cover a target amount.
 */
// import { Decimal } from 'decimal.js'; // Removed for now to avoid dependency


// Since we don't have decimal.js installed yet, we will use Number for now (assuming 10 decimals precision is handled carefully)
// In production finance apps, always use a BigNumber library.

export interface AmuletContract {
    contractId: string;
    amount: number; // Parsed from payload
    templateId: string;
}

export interface CoinSelectionResult {
    inputs: AmuletContract[]; // Contracts to spend
    change: number;          // Amount to return to self
    success: boolean;
    error?: string;
}

/**
 * Select coins to cover the target amount
 * Strategy: Accumulate smallest inputs first to reduce dust (or largest first to reduce gas? Let's use simple accumulation)
 * Actually, "Largest First" is better to minimize input count (gas efficiency).
 */
export function selectCoins(
    targetAmount: number,
    availableContracts: AmuletContract[]
): CoinSelectionResult {
    if (targetAmount <= 0) {
        return { inputs: [], change: 0, success: false, error: 'Invalid target amount' };
    }

    // Sort by amount descending (Largest first)
    const sorted = [...availableContracts].sort((a, b) => b.amount - a.amount);

    let selected: AmuletContract[] = [];
    let currentSum = 0;

    for (const contract of sorted) {
        selected.push(contract);
        currentSum += contract.amount;

        if (currentSum >= targetAmount) {
            break;
        }
    }

    if (currentSum < targetAmount) {
        return {
            inputs: [],
            change: 0,
            success: false,
            error: `Insufficient funds. Have ${currentSum}, need ${targetAmount}`
        };
    }

    // Calculate change
    // Avoid floating point errors by rounding to 10 decimals (Splice standard)
    const change = Number((currentSum - targetAmount).toFixed(10));

    return {
        inputs: selected,
        change,
        success: true
    };
}
