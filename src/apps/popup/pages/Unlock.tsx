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

    // Reset error on mount and password change
    useEffect(() => {
        setError(null);
    }, [password, setError]);

    const handleUnlock = async () => {
        if (!password) {
            setError('Please enter your password');
            return;
        }

        try {
            await unlock(password);
            navigate('/dashboard');
        } catch (err) {
            // Error handled by store
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleUnlock();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 animate-in">
            {/* Logo */}
            <div className="mb-8 text-center">
                <div className="flex justify-center mb-4">
                    <div className="relative">
                        <Logo size="lg" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                            <Lock className="w-3 h-3 text-slate-400" />
                        </div>
                    </div>
                </div>
                <h1 className="text-xl font-bold text-white">Welcome Back</h1>
                <p className="text-sm text-slate-400 mt-1">Enter your password to unlock</p>
            </div>

            {/* Password Input */}
            <div className="w-full max-w-xs">
                <div className="relative">
                    <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter password"
                        className="pr-10"
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 mt-3 text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-sm">{error}</p>
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
                    className="text-canton-400 hover:text-canton-300"
                >
                    Restore with recovery phrase
                </button>
            </p>
        </div>
    );
}
