/**
 * Unlock Wallet Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, AlertCircle } from 'lucide-react';
import { Button, Input, Logo } from '../../../ui';
import { usePopupStore } from '../store';

export function UnlockPage() {
    const navigate = useNavigate();
    const { unlock, loading, error, setError } = usePopupStore();

    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [shake, setShake] = useState(false);

    // Reset error on mount and password change
    useEffect(() => {
        if (error) setError(null);
    }, [password, setError]);

    const handleUnlock = async () => {
        if (!password) {
            setError('Please enter your password');
            setShake(true);
            setTimeout(() => setShake(false), 500);
            return;
        }

        try {
            await unlock(password);
            navigate('/dashboard');
        } catch (err) {
            // Trigger shake on error
            setShake(true);
            setTimeout(() => setShake(false), 500);
            // Ensure error message is user friendly
            const msg = err instanceof Error ? err.message : 'Invalid password';
            if (msg.includes('Decryption failed') || msg.includes('Invalid password')) {
                setError('Incorrect password. Please try again.');
            } else {
                setError(msg);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleUnlock();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Logo */}
            <div className="mb-8 text-center">
                <div className="flex justify-center mb-4">
                    <div className="relative">
                        <Logo size="lg" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-transparent">
                            <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        </div>
                    </div>
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Welcome Back</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your password to unlock</p>
            </div>

            {/* Password Input */}
            <div className={`w-full max-w-xs ${shake ? 'animate-shake' : ''}`}>
                <div className="relative">
                    <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter password"
                        className={`pr-10 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
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

                {error && (
                    <div className="flex items-center gap-2 mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
                        <p className="text-sm text-red-600 dark:text-red-200 font-medium">{error}</p>
                    </div>
                )}

                <Button
                    onClick={handleUnlock}
                    loading={loading}
                    disabled={!password}
                    className="w-full mt-4"
                >
                    Unlock
                </Button>
            </div>

            {/* Footer */}
            <p className="text-xs text-slate-500 mt-8 text-center">
                Forgot password?{' '}
                <button
                    onClick={() => navigate('/')}
                    className="text-tiva-600 hover:text-tiva-500 dark:text-tiva-400 dark:hover:text-tiva-300 font-medium"
                >
                    Restore with recovery phrase
                </button>
            </p>
        </div>
    );
}
