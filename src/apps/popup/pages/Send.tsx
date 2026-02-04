/**
 * Send Page - Transfer tokens
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertTriangle, User, Coins, Trash2, Plus, List, Loader2, CheckCircle, XCircle, FileText, PenTool } from 'lucide-react';
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
    const { currentAccount, sendMessage, balance } = usePopupStore();

    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'input' | 'confirm' | 'success' | 'batch-progress'>('input');
    const [txHash, setTxHash] = useState('');

    // Batch Mode State
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [batchInputMode, setBatchInputMode] = useState<'manual' | 'import'>('manual');
    const [importText, setImportText] = useState('');
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

    const handleImportText = () => {
        if (!importText.trim()) return;

        const lines = importText.split('\n');
        const newRecipients: BatchRecipient[] = [];
        let errorCount = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Split by comma, tab, or multiple spaces
            const parts = trimmed.split(/[\s,]+/);

            // Expected format: Address Amount
            // or: Address, Amount
            if (parts.length >= 2) {
                const addr = parts[0];
                const amt = parts[1]; // Simple amount parse, validation happens later/on send

                if (addr && amt && !isNaN(parseFloat(amt))) {
                    newRecipients.push({
                        id: crypto.randomUUID(),
                        address: addr,
                        amount: amt,
                        status: 'pending'
                    });
                } else {
                    errorCount++;
                }
            } else {
                errorCount++;
            }
        }

        if (newRecipients.length > 0) {
            setRecipients(prev => [...prev, ...newRecipients]);
            setImportText(''); // Clear on success
            setBatchInputMode('manual'); // Switch back to view list
        } else {
            setError('No valid entries found. Format: Address Amount');
        }
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

        // Reset all to pending first (in case of retry)
        setRecipients(prev => prev.map(r => ({ ...r, status: 'pending', error: undefined, txHash: undefined })));

        let completedCount = 0;

        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            if (!recipient) continue;

            // 1. Mark current as processing
            setRecipients(prev => prev.map((r, idx) =>
                idx === i ? { ...r, status: 'processing' } : r
            ));

            try {
                // 2. Execute Transfer (Single)
                const response = await sendMessage<{ success: boolean; data?: any; error?: string }>('executeTransfer', {
                    to: recipient.address,
                    amount: parseFloat(recipient.amount)
                });

                // 3. Update Result
                if (response && response.success) {
                    const txHash = response.data?.txHash || '0x...';
                    setRecipients(prev => prev.map((r, idx) =>
                        idx === i ? { ...r, status: 'success', txHash } : r
                    ));
                } else {
                    throw new Error(response?.error || 'Failed');
                }
            } catch (err) {
                const errMsg = err instanceof Error ? err.message : 'Failed';
                setRecipients(prev => prev.map((r, idx) =>
                    idx === i ? { ...r, status: 'failed', error: errMsg } : r
                ));
            }

            completedCount++;

            // 4. Wait 200ms to prevent rate limiting
            if (i < recipients.length - 1) {
                await new Promise(r => setTimeout(r, 200));
            }
        }
    };

    return (
        <div className="flex flex-col min-h-full p-4 bg-slate-50 dark:bg-midnight-500 transition-colors duration-200">
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
                        <span className={`text-xs font-medium ${isBatchMode ? 'text-neutral-500' : 'text-neutral-900 dark:text-white'}`}>Single</span>
                        <button
                            onClick={() => {
                                setIsBatchMode(!isBatchMode);
                                setRecipient('');
                                setAmount('');
                                setError('');
                                setBatchInputMode('manual');
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-tiva-500 focus:ring-offset-2 ${isBatchMode ? 'bg-tiva-500' : 'bg-neutral-200 dark:bg-neutral-700'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isBatchMode ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                        <span className={`text-xs font-medium ${isBatchMode ? 'text-neutral-900 dark:text-white' : 'text-neutral-500'}`}>Batch</span>
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

                        {/* Batch Mode Tabs */}
                        {isBatchMode && (
                            <div className="flex p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg mb-4 border border-neutral-200 dark:border-neutral-800">
                                <button
                                    onClick={() => setBatchInputMode('manual')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${batchInputMode === 'manual' ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white ring-1 ring-black/5 dark:ring-white/10' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        <PenTool className="w-3 h-3" />
                                        Manual
                                    </div>
                                </button>
                                <button
                                    onClick={() => setBatchInputMode('import')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${batchInputMode === 'import' ? 'bg-white dark:bg-neutral-800 shadow-sm text-neutral-900 dark:text-white ring-1 ring-black/5 dark:ring-white/10' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        Import Text
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Input Area */}
                        {isBatchMode && batchInputMode === 'import' ? (
                            <div className="space-y-4 p-4 rounded-xl border bg-white dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800">
                                <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">Paste Recipient List</h3>
                                <p className="text-xs text-neutral-500 mb-2">Format: <code>Address Amount</code> (one per line)</p>
                                <textarea
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    className="w-full h-32 p-3 text-xs font-mono bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-1 focus:ring-tiva-500 focus:border-tiva-500 outline-none resize-none transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                                    placeholder={`party::0x123... 10.5\nparty::0x456... 5.0`}
                                />
                                <Button
                                    onClick={handleImportText}
                                    disabled={!importText.trim()}
                                    className="w-full"
                                    size="sm"
                                    variant="secondary"
                                >
                                    Parse & Add
                                </Button>
                            </div>
                        ) : (
                            // Manual Input (or Single)
                            <div className={`space-y-4 p-4 rounded-xl border ${isBatchMode ? 'bg-white dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800' : 'border-transparent'}`}>
                                {isBatchMode && <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">Add Recipient</h3>}
                                <Input
                                    label="Recipient Address"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    placeholder="Enter Party ID"
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
                        )}

                        {/* Batch List */}
                        {isBatchMode && recipients.length > 0 && (
                            <div className="space-y-2 animate-in slide-in-from-bottom-2 fade-in">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs font-medium text-neutral-500">Recipients ({recipients.length})</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-neutral-900 dark:text-white">Total: {getBatchTotal().toFixed(2)} CC</span>
                                        <button
                                            onClick={() => setRecipients([])}
                                            className="text-xs text-red-500 hover:text-red-600 transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                    {recipients.map((r, i) => (
                                        <div key={r.id} className="flex items-center justify-between p-3 bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                                            <div className="flex-1 min-w-0 mr-3">
                                                <div className="font-mono text-xs truncate max-w-[150px] text-neutral-700 dark:text-neutral-300">
                                                    {r.address}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium text-neutral-900 dark:text-white">{r.amount} CC</span>
                                                <button
                                                    onClick={() => handleRemoveRecipient(r.id)}
                                                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-red-500 transition-colors"
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
                            Available: <span className="text-slate-900 dark:text-white">{balance} CC</span>
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
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between text-sm">
                                <span className="text-slate-700 dark:text-slate-300 font-medium">Total</span>
                                <span className="text-slate-900 dark:text-white font-medium">
                                    {amount} CC
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
                        Processing Batch ({recipients.filter(r => r.status === 'success' || r.status === 'failed').length}/{recipients.length})
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
