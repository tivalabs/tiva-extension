/**
 * Send Page - Transfer tokens
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertTriangle, User, Coins, Trash2, Plus, List, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button, Input, Card } from '../../../ui';
import { usePopupStore } from '../store';

interface BatchRecipient {
    id: string;
    address: string;
    amount: string;
    status: 'pending' | 'processing' | 'success' | 'failed';
    txHash?: string;
    error?: string;
}

export function SendPage() {
    const navigate = useNavigate();
    const { currentAccount, sendMessage } = usePopupStore();

    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'input' | 'confirm' | 'success' | 'batch-progress'>('input');
    const [txHash, setTxHash] = useState('');

    // Batch Mode State
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [recipients, setRecipients] = useState<BatchRecipient[]>([]);

    const handleAddRecipient = () => {
        if (!recipient.trim() || !amount || parseFloat(amount) <= 0) return;

        setRecipients(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                address: recipient,
                amount: amount,
                status: 'pending'
            }
        ]);
        // Clear inputs for next entry
        setRecipient('');
        setAmount('');
    };

    const handleRemoveRecipient = (id: string) => {
        setRecipients(prev => prev.filter(r => r.id !== id));
    };

    const getBatchTotal = () => recipients.reduce((sum, r) => sum + parseFloat(r.amount), 0);


    const handleSend = async () => {
        if (isBatchMode) {
            if (recipients.length === 0) {
                setError('Please add at least one recipient');
                return;
            }
            if (getBatchTotal() > parseFloat(usePopupStore.getState().balance)) {
                setError('Insufficient balance for total amount');
                return;
            }
            handleBatchConfirm();
            return;
        }

        // Validate inputs
        if (!recipient.trim()) {
            setError('Please enter a recipient address');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setStep('confirm');
    };

    const handleConfirm = async () => {
        setLoading(true);
        setError('');

        try {
            // Execute real transfer via Background Worker
            const result = await sendMessage<{ success: boolean, txHash?: string, error?: string }>('executeTransfer', {
                to: recipient,
                amount: parseFloat(amount)
            });

            if (result.success && result.txHash) {
                setTxHash(result.txHash);
                setStep('success');
            } else {
                throw new Error(result.error || 'Transfer failed');
            }
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Transaction failed');
        } finally {
            setLoading(false);
        }
    };

    const handleBatchConfirm = async () => {
        setStep('batch-progress');

        for (const recipient of recipients) {
            if (recipient.status === 'success') continue; // Skip already done

            // Update status to processing
            setRecipients(prev => prev.map(r => r.id === recipient.id ? { ...r, status: 'processing' } : r));

            try {
                const result = await sendMessage<{ success: boolean, txHash?: string, error?: string }>('executeTransfer', {
                    to: recipient.address,
                    amount: parseFloat(recipient.amount)
                });

                if (result.success && result.txHash) {
                    setRecipients(prev => prev.map(r => r.id === recipient.id ? { ...r, status: 'success', txHash: result.txHash } : r));
                } else {
                    throw new Error(result.error || 'Failed');
                }
            } catch (err) {
                setRecipients(prev => prev.map(r => r.id === recipient.id ? { ...r, status: 'failed', error: err instanceof Error ? err.message : 'Failed' } : r));
                // Optional: break on error? For now, let's continue or let user see.
                // Actually better to stop here so user can retry/remove
                // But for "Batch Send", often you want to proceed if possible?
                // UTXO model: If one fails, others might still work IF inputs were distinct. 
                // But if inputs were chained, subsequent might fail too. 
                // Safest to continue and report.
            }
        }
    };

    return (
        <div className="flex flex-col min-h-full p-4 bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (step === 'batch-progress') return; // Prevent navigate if processing
                            if (step === 'input') navigate('/dashboard');
                            else setStep('input');
                        }}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {isBatchMode ? 'Batch Send' : 'Send'}
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {step === 'input' && 'Enter transfer details'}
                            {step === 'confirm' && 'Confirm transaction'}
                            {step === 'success' && 'Transaction sent'}
                            {step === 'batch-progress' && 'Processing batch...'}
                        </p>
                    </div>
                </div>

                {/* Batch Toggle */}
                {step === 'input' && (
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isBatchMode ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>Single</span>
                        <button
                            onClick={() => {
                                setIsBatchMode(!isBatchMode);
                                setRecipient('');
                                setAmount('');
                                setError('');
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-canton-500 focus:ring-offset-2 ${isBatchMode ? 'bg-canton-500' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isBatchMode ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                        <span className={`text-xs font-medium ${isBatchMode ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Batch</span>
                    </div>
                )}
            </div>

            {/* Input Step */}
            {step === 'input' && (
                <div className="flex-1 flex flex-col animate-in">
                    <div className="flex-1 space-y-4">
                        {/* From Account */}
                        <Card>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">From</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-canton-400 to-accent-500" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {currentAccount?.name || 'Account 1'}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                                        {currentAccount?.partyId
                                            ? currentAccount.partyId
                                            : `${currentAccount?.publicKey?.slice(0, 12)}...${currentAccount?.publicKey?.slice(-8)}`
                                        }
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Recipient Input (Common for both, but styled differently in Batch) */}
                        <div className={`space-y-4 p-4 rounded-xl border ${isBatchMode ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'border-transparent'}`}>
                            {isBatchMode && <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-2">Add Recipient</h3>}
                            <Input
                                label="Recipient Address"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                placeholder="Enter public key"
                                icon={<User className="w-4 h-4" />}
                            />

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input
                                        label="Amount"
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        icon={<Coins className="w-4 h-4" />}
                                    />
                                </div>
                                {isBatchMode && (
                                    <div className="flex items-end">
                                        <Button
                                            onClick={handleAddRecipient}
                                            disabled={!recipient || !amount}
                                            className="mb-[2px] h-[42px]"
                                            variant="secondary"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Batch List */}
                        {isBatchMode && recipients.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs font-medium text-slate-500">Recipients ({recipients.length})</span>
                                    <span className="text-xs font-medium text-slate-900 dark:text-white">Total: {getBatchTotal().toFixed(2)} CC</span>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                                    {recipients.map((r, i) => (
                                        <div key={r.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                                            <div className="flex-1 min-w-0 mr-3">
                                                <div className="font-mono text-xs truncate max-w-[150px] text-slate-700 dark:text-slate-300">
                                                    {r.address}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium text-slate-900 dark:text-white">{r.amount} CC</span>
                                                <button
                                                    onClick={() => handleRemoveRecipient(r.id)}
                                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Balance Info */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
                            Available: <span className="text-slate-900 dark:text-white">{usePopupStore(s => s.balance)} CC</span>
                        </p>

                        {error && (
                            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                        )}
                    </div>

                    <Button
                        onClick={handleSend}
                        disabled={isBatchMode ? recipients.length === 0 : (!recipient || !amount)}
                        className="w-full mt-4"
                    >
                        {isBatchMode ? (
                            <>
                                <List className="w-4 h-4 mr-2" />
                                Send Batch ({recipients.length})
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Continue
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* Confirm Step */}
            {step === 'confirm' && (
                <div className="flex-1 flex flex-col animate-in">
                    <Card className="mb-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Transaction Summary</p>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Amount</span>
                                <span className="text-slate-900 dark:text-white font-medium">{amount} CC</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">To</span>
                                <span className="text-slate-900 dark:text-white font-mono text-xs truncate max-w-[180px]">
                                    {recipient}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Network Fee</span>
                                <span className="text-slate-900 dark:text-white">~0.001 CC</span>
                            </div>
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between text-sm">
                                <span className="text-slate-700 dark:text-slate-300 font-medium">Total</span>
                                <span className="text-slate-900 dark:text-white font-medium">
                                    {(parseFloat(amount) + 0.001).toFixed(3)} CC
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg mb-4">
                        <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-200">
                            Please verify the recipient address. Transactions cannot be reversed.
                        </p>
                    </div>

                    {error && (
                        <p className="text-sm text-red-500 dark:text-red-400 mb-4">{error}</p>
                    )}

                    <div className="flex gap-3 mt-auto">
                        <Button
                            variant="secondary"
                            onClick={() => setStep('input')}
                            disabled={loading}
                            className="flex-1"
                        >
                            Back
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            loading={loading}
                            className="flex-1"
                        >
                            Confirm
                        </Button>
                    </div>
                </div>
            )}

            {/* Success Step (Single) */}
            {step === 'success' && (
                <div className="flex-1 flex flex-col items-center justify-center animate-in">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center mb-4">
                        <Send className="w-8 h-8 text-green-500 dark:text-green-400" />
                    </div>

                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Transaction Sent!</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Your transaction has been submitted
                    </p>

                    <Card className="w-full mb-6">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Transaction Hash</p>
                        <code className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                            {txHash}
                        </code>
                    </Card>

                    <Button onClick={() => navigate('/dashboard')} className="w-full">
                        Done
                    </Button>
                </div>
            )}

            {/* Batch Progress Step */}
            {step === 'batch-progress' && (
                <div className="flex-1 flex flex-col animate-in">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        Processing Batch ({recipients.filter(r => r.status === 'success').length}/{recipients.length})
                    </h2>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {recipients.map((r, i) => (
                            <div key={r.id} className={`p-3 border rounded-lg transition-colors ${r.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' :
                                r.status === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' :
                                    r.status === 'failed' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' :
                                        'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-slate-500">#{i + 1}</span>
                                    {r.status === 'pending' && <span className="text-xs text-slate-400">Pending</span>}
                                    {r.status === 'processing' && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
                                    {r.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                                    {r.status === 'failed' && <XCircle className="w-3 h-3 text-red-500" />}
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{r.address}</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{r.amount} CC</span>
                                </div>
                                {r.error && (
                                    <p className="text-xs text-red-500 mt-1">{r.error}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    {recipients.every(r => r.status === 'success' || r.status === 'failed') && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <Button onClick={() => setStep('input')} className="w-full">
                                {recipients.some(r => r.status === 'failed') ? 'Back to List' : 'Done'}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
