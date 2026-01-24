/**
 * Import Wallet Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button, Input } from '../../../ui';
import { usePopupStore } from '../store';
import { validateMnemonic } from '../../../core/crypto/mnemonic';

export function ImportWalletPage() {
    const navigate = useNavigate();
    const { importWallet, loading, error, setError } = usePopupStore();

    const [mnemonic, setMnemonic] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState<'mnemonic' | 'password'>('mnemonic');

    // Reset error on mount
    useEffect(() => {
        setError(null);
    }, [setError]);

    const handleMnemonicContinue = () => {
        if (!validateMnemonic(mnemonic)) {
            setError('Invalid recovery phrase. Please check and try again.');
            return;
        }
        setError(null);
        setStep('password');
    };

    const handleImport = async () => {
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            await importWallet(mnemonic.trim().toLowerCase(), password);
            navigate('/dashboard');
        } catch (err) {
            // Error handled by store
        }
    };

    return (
        <div className="flex flex-col min-h-full p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => step === 'mnemonic' ? navigate('/') : setStep('mnemonic')}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-white">Import Wallet</h1>
                    <p className="text-xs text-slate-400">
                        {step === 'mnemonic' ? 'Enter recovery phrase' : 'Set a password'}
                    </p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
                <div className={`flex-1 h-1 rounded-full bg-canton-500`} />
                <div className={`flex-1 h-1 rounded-full ${step === 'password' ? 'bg-canton-500' : 'bg-slate-700'}`} />
            </div>

            {/* Mnemonic Step */}
            {step === 'mnemonic' && (
                <div className="flex-1 flex flex-col animate-in">
                    <p className="text-sm text-slate-400 mb-4">
                        Enter your 12 or 24 word recovery phrase separated by spaces.
                    </p>

                    <div className="flex-1">
                        <textarea
                            value={mnemonic}
                            onChange={(e) => setMnemonic(e.target.value)}
                            placeholder="Enter your recovery phrase..."
                            className="input-field h-32 resize-none"
                            autoComplete="off"
                            spellCheck={false}
                        />

                        {error && (
                            <div className="flex items-center gap-2 mt-3 text-red-400">
                                <AlertCircle className="w-4 h-4" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={handleMnemonicContinue}
                        disabled={!mnemonic.trim()}
                        className="w-full mt-4"
                    >
                        Continue
                    </Button>
                </div>
            )}

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
                            icon={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-slate-500 hover:text-white"
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
                            <p className="text-sm text-red-400">{error}</p>
                        )}
                    </div>

                    <Button
                        onClick={handleImport}
                        loading={loading}
                        disabled={!password || !confirmPassword}
                        className="w-full mt-4"
                    >
                        Import Wallet
                    </Button>
                </div>
            )}
        </div>
    );
}
