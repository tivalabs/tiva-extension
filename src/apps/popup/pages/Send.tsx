/**
 * Send Page - Transfer tokens
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, AlertTriangle, User, Coins } from 'lucide-react';
import { Button, Input, Card } from '../../../ui';
import { usePopupStore } from '../store';

export function SendPage() {
    const navigate = useNavigate();
    const { currentAccount, sendMessage } = usePopupStore();

    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
    const [txHash, setTxHash] = useState('');

    const handleSend = async () => {
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
            // TODO: Implement actual transfer via Canton SDK
            // For now, simulate a transaction
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mock transaction hash
            const mockTxHash = '0x' + Array(64).fill(0).map(() =>
                Math.floor(Math.random() * 16).toString(16)
            ).join('');

            setTxHash(mockTxHash);
            setStep('success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Transaction failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-full p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => step === 'input' ? navigate('/dashboard') : setStep('input')}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-white">Send</h1>
                    <p className="text-xs text-slate-400">
                        {step === 'input' && 'Enter transfer details'}
                        {step === 'confirm' && 'Confirm transaction'}
                        {step === 'success' && 'Transaction sent'}
                    </p>
                </div>
            </div>

            {/* Input Step */}
            {step === 'input' && (
                <div className="flex-1 flex flex-col animate-in">
                    <div className="flex-1 space-y-4">
                        {/* From Account */}
                        <Card>
                            <p className="text-xs text-slate-400 mb-2">From</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-canton-400 to-accent-500" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {currentAccount?.name || 'Account 1'}
                                    </p>
                                    <p className="text-xs text-slate-400 font-mono truncate">
                                        {currentAccount?.publicKey?.slice(0, 12)}...{currentAccount?.publicKey?.slice(-8)}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Recipient */}
                        <Input
                            label="Recipient Address"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="Enter recipient's public key"
                            icon={<User className="w-4 h-4" />}
                        />

                        {/* Amount */}
                        <Input
                            label="Amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            icon={<Coins className="w-4 h-4" />}
                            rightIcon={
                                <span className="text-xs text-slate-400">CC</span>
                            }
                        />

                        {/* Balance Info */}
                        <p className="text-xs text-slate-400 text-right">
                            Available: <span className="text-white">0.00 CC</span>
                        </p>

                        {error && (
                            <p className="text-sm text-red-400">{error}</p>
                        )}
                    </div>

                    <Button
                        onClick={handleSend}
                        disabled={!recipient || !amount}
                        className="w-full mt-4"
                    >
                        <Send className="w-4 h-4" />
                        Continue
                    </Button>
                </div>
            )}

            {/* Confirm Step */}
            {step === 'confirm' && (
                <div className="flex-1 flex flex-col animate-in">
                    <Card className="mb-4">
                        <p className="text-xs text-slate-400 mb-3">Transaction Summary</p>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Amount</span>
                                <span className="text-white font-medium">{amount} CC</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">To</span>
                                <span className="text-white font-mono text-xs truncate max-w-[180px]">
                                    {recipient}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Network Fee</span>
                                <span className="text-white">~0.001 CC</span>
                            </div>
                            <div className="border-t border-slate-700 pt-3 flex justify-between text-sm">
                                <span className="text-slate-300 font-medium">Total</span>
                                <span className="text-white font-medium">
                                    {(parseFloat(amount) + 0.001).toFixed(3)} CC
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg mb-4">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-200">
                            Please verify the recipient address. Transactions cannot be reversed.
                        </p>
                    </div>

                    {error && (
                        <p className="text-sm text-red-400 mb-4">{error}</p>
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

            {/* Success Step */}
            {step === 'success' && (
                <div className="flex-1 flex flex-col items-center justify-center animate-in">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                        <Send className="w-8 h-8 text-green-400" />
                    </div>

                    <h2 className="text-xl font-semibold text-white mb-2">Transaction Sent!</h2>
                    <p className="text-sm text-slate-400 mb-6">
                        Your transaction has been submitted
                    </p>

                    <Card className="w-full mb-6">
                        <p className="text-xs text-slate-400 mb-1">Transaction Hash</p>
                        <code className="text-xs font-mono text-slate-300 break-all">
                            {txHash}
                        </code>
                    </Card>

                    <Button onClick={() => navigate('/dashboard')} className="w-full">
                        Done
                    </Button>
                </div>
            )}
        </div>
    );
}
