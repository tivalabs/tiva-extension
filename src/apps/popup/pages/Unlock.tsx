/**
 * Unlock Wallet Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';
import { Button, Input, Logo } from '../../../ui';
import { usePopupStore } from '../store';

export function UnlockPage() {
    const navigate = useNavigate();
    const { unlock, unlockWithPin, hasPin, loading, error, setError } = usePopupStore();

    // 'pin' or 'password'
    // Default to 'pin' if hasPin is true, otherwise 'password'
    const [authMode, setAuthMode] = useState<'pin' | 'password'>('password');

    // Initialize authMode based on hasPin. We use useEffect or lazy init state.
    // However, hasPin might not be ready if we just loaded? 
    // Usually hasPin is sync from localStorage in store init.
    useEffect(() => {
        if (hasPin) {
            setAuthMode('pin');
        } else {
            setAuthMode('password');
        }
    }, [hasPin]);

    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [shake, setShake] = useState(false);

    // Reset error on input change
    useEffect(() => {
        if (error) setError(null);
    }, [password, pin, setError]);

    const handleUnlock = async () => {
        setError(null);

        if (authMode === 'pin') {
            if (pin.length < 4) {
                setError('PIN must be at least 4 digits');
                triggerShake();
                return;
            }
            try {
                await unlockWithPin(pin);
                navigate('/dashboard');
            } catch (err) {
                triggerShake();
                // Error is handled by store but we ensure text
            }
        } else {
            if (!password) {
                setError('Please enter your password');
                triggerShake();
                return;
            }
            try {
                await unlock(password);
                navigate('/dashboard');
            } catch (err) {
                triggerShake();
                const msg = err instanceof Error ? err.message : 'Invalid password';
                if (msg.includes('Decryption failed') || msg.includes('Invalid password')) {
                    setError('Incorrect password. Please try again.');
                } else {
                    setError(msg);
                }
            }
        }
    };

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleUnlock();
        }
    };

    return (
        <div className="flex flex-col min-h-full h-full p-4 bg-slate-50 dark:bg-midnight-500 transition-colors duration-200 justify-center items-center">
            <div className="w-full max-w-xs space-y-8">
                {/* Logo & Header */}
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <Logo size="lg" />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-transparent">
                                <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Welcome Back</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {authMode === 'pin' ? 'Enter PIN to unlock' : 'Enter password to unlock'}
                    </p>
                </div>

                {/* Input Section */}
                <div className={`space-y-4 ${shake ? 'animate-shake' : ''}`}>
                    {authMode === 'pin' ? (
                        <Input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter PIN"
                            className={`text-center tracking-widest text-lg ${error ? 'border-red-500 focus:border-red-500' : ''}`}
                            autoFocus
                            maxLength={8}
                        />
                    ) : (
                        <div className="relative">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter password"
                                className={`pr-10 ${error ? 'border-red-500 focus:border-red-500' : ''}`}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                            <p className="text-xs text-red-600 dark:text-red-200 font-medium">{error}</p>
                        </div>
                    )}

                    <Button
                        onClick={handleUnlock}
                        loading={loading}
                        disabled={authMode === 'pin' ? !pin : !password}
                        className="w-full"
                    >
                        Unlock
                    </Button>
                </div>

                {/* Footer / Toggle Mode */}
                <div className="flex flex-col gap-4 text-center">
                    {hasPin && (
                        <button
                            onClick={() => {
                                setAuthMode(authMode === 'pin' ? 'password' : 'pin');
                                setError(null);
                                setPin('');
                                setPassword('');
                            }}
                            className="flex items-center justify-center gap-2 text-sm font-medium text-tiva-600 hover:text-tiva-700 dark:text-tiva-400 dark:hover:text-tiva-300 transition-colors"
                        >
                            {authMode === 'pin' ? (
                                <>
                                    <KeyRound className="w-4 h-4" />
                                    Use Password
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-4 h-4" />
                                    Use PIN
                                </>
                            )}
                        </button>
                    )}

                    <button
                        onClick={() => navigate('/')} // Or specific recovery route
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                        Forgot credentials? Restore wallet
                    </button>
                </div>
            </div>
        </div>
    );
}
