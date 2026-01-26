/**
 * Create Wallet Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, AlertTriangle, Check, Copy } from 'lucide-react';
import { Button, Input, Card, WordChip, Logo } from '../../../ui';
import { usePopupStore } from '../store';
import { splitMnemonic } from '../../../core/crypto/mnemonic';

type Step = 'password' | 'mnemonic' | 'verify';

export function CreateWalletPage() {
    const navigate = useNavigate();
    const { createWallet, error, setError } = usePopupStore();

    // Local loading state to prevent global loading from unmounting the component
    const [loading, setLoading] = useState(false);

    const [step, setStep] = useState<Step>('password');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [mnemonic, setMnemonic] = useState('');
    const [mnemonicCopied, setMnemonicCopied] = useState(false);
    const [mnemonicConfirmed, setMnemonicConfirmed] = useState(false);
    const [verifyWords, setVerifyWords] = useState<{ index: number; word: string }[]>([]);
    const [verifyInputs, setVerifyInputs] = useState<string[]>(new Array(12).fill(''));

    // Reset error on mount
    useEffect(() => {
        setError(null);
    }, [setError]);

    const handleCreatePassword = async () => {
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const generatedMnemonic = await createWallet(password, 12);
            setMnemonic(generatedMnemonic);

            // Verify all 12 words
            const words = splitMnemonic(generatedMnemonic);
            setVerifyWords(words.map((w, i) => ({ index: i + 1, word: w })));
            setVerifyInputs(new Array(12).fill(''));

            setStep('mnemonic');
        } catch (err) {
            // Error handled by store
        } finally {
            setLoading(false);
        }
    };

    const handleCopyMnemonic = async () => {
        await navigator.clipboard.writeText(mnemonic);
        setMnemonicCopied(true);
        setTimeout(() => setMnemonicCopied(false), 2000);
    };

    const handleVerify = async () => {
        const isCorrect = verifyWords.every((vw, i) =>
            verifyInputs[i]?.toLowerCase().trim() === vw.word.toLowerCase()
        );

        if (!isCorrect) {
            setError('Incorrect words. Please check your backup.');
            return;
        }

        try {
            setLoading(true);
            console.log('[CreateWallet] Verified mnemonic, saving wallet...');

            // Now actually save the wallet (this will also register Party ID)
            console.log('[CreateWallet] Calling importWallet (will trigger Party ID registration)...');
            await usePopupStore.getState().importWallet(mnemonic, password, 'mnemonic');

            console.log('[CreateWallet] ✓ Wallet created and Party ID registered, navigating to dashboard');
            navigate('/dashboard');
        } catch (err) {
            console.error('[CreateWallet] Error:', err);
            setError('Failed to create wallet');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen p-4 bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => step === 'password' ? navigate('/') : setStep('password')}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Create Wallet</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {step === 'password' && 'Set a password'}
                        {step === 'mnemonic' && 'Backup your phrase'}
                        {step === 'verify' && 'Verify backup'}
                    </p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
                {['password', 'mnemonic', 'verify'].map((s, i) => (
                    <div
                        key={s}
                        className={`flex-1 h-1 rounded-full ${['password', 'mnemonic', 'verify'].indexOf(step) >= i
                            ? 'bg-canton-500'
                            : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                    />
                ))}
            </div>

            {/* Password Step */}
            {step === 'password' && (
                <div className="flex-1 flex flex-col animate-in">
                    <div className="flex-1 space-y-4">
                        <Input
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            rightIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                        />

                        <Input
                            label="Confirm Password"
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                        />

                        {error && (
                            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                        )}
                    </div>

                    <Button
                        onClick={handleCreatePassword}
                        loading={loading}
                        disabled={!password || !confirmPassword}
                        className="w-full mt-4"
                    >
                        Continue
                    </Button>
                </div>
            )}

            {/* Mnemonic Step */}
            {step === 'mnemonic' && (
                <div className="flex-1 flex flex-col animate-in">
                    <Card className="mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/30">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                            <p className="text-sm text-amber-700 dark:text-amber-200">
                                Write down these 12 words in order. This is the only way to recover your wallet.
                            </p>
                        </div>
                    </Card>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {splitMnemonic(mnemonic).map((word, i) => (
                            <WordChip key={i} index={i + 1} word={word} />
                        ))}
                    </div>

                    <Button
                        variant="secondary"
                        onClick={handleCopyMnemonic}
                        className="w-full mb-4"
                    >
                        <Copy className="w-4 h-4" />
                        {mnemonicCopied ? 'Copied!' : 'Copy to Clipboard'}
                    </Button>

                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={mnemonicConfirmed}
                            onChange={(e) => setMnemonicConfirmed(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-canton-500 focus:ring-canton-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                            I have securely stored my recovery phrase
                        </span>
                    </label>

                    <Button
                        onClick={() => setStep('verify')}
                        disabled={!mnemonicConfirmed}
                        className="w-full mt-auto"
                    >
                        Continue
                    </Button>
                </div>
            )}

            {/* Verify Step */}
            {step === 'verify' && (
                <div className="flex-1 flex flex-col animate-in">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Enter the following words from your recovery phrase to verify your backup.
                    </p>

                    <div className="grid grid-cols-3 gap-2 flex-1 overflow-y-auto max-h-[400px]">
                        {verifyWords.map((vw, i) => (
                            <div key={i} className="flex flex-col gap-1">
                                <label className="text-[10px] text-slate-500 dark:text-slate-400">Word #{vw.index}</label>
                                <input
                                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-canton-500 focus:border-canton-500 outline-none transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                                    value={verifyInputs[i]}
                                    onChange={(e) => {
                                        const newInputs = [...verifyInputs];
                                        newInputs[i] = e.target.value;
                                        setVerifyInputs(newInputs);
                                    }}
                                    placeholder={`Word ${vw.index}`}
                                />
                            </div>
                        ))}
                    </div>
                    {error && (
                        <p className="text-sm text-red-400 mt-2">{error}</p>
                    )}

                    <Button
                        onClick={handleVerify}
                        disabled={verifyInputs.some(v => !v.trim()) || loading}
                        loading={loading}
                        className="w-full mt-4"
                    >
                        <Check className="w-4 h-4" />
                        {loading ? 'Registering...' : 'Complete Setup'}
                    </Button>
                </div>
            )}
        </div>
    );
}
