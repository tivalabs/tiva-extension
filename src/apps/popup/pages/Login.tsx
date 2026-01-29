import React, { useState } from 'react';
import { AuthService } from '../../../core/auth/auth.service';
import { Button, Logo, LoadingScreen } from '../../../ui';
import { Lock, Server, ShieldCheck } from 'lucide-react';

export function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await AuthService.login();
            // Note: AuthService.login triggers handleCallback which sends a message
            // The App component should listen for this or check state.
            // However, handleCallback in AuthService calls sendMessage('WALLET_UNLOCK')
            // which might not immediately affect the current view unless we reload or the store updates.
            // Ideally, we should wait or redirect here if the flow was in-app (not popup).
            // But validation flow opens a window.

            // For now, let's assume the background/store handles the state change.
            // We can also manually check session after a timeout if needed.
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Login failed');
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingScreen message="Connecting to Validator..." />;
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-canton-500/20 to-transparent pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                <div className="mb-8 transform hover:scale-105 transition-transform duration-300">
                    <Logo size="lg" className="shadow-2xl rounded-3xl" />
                </div>

                <h1 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
                    CantonLink
                </h1>
                <p className="text-center text-slate-500 dark:text-slate-400 mb-8 max-w-xs">
                    Connect securely to the Canton Network via Validator Node
                </p>

                <div className="w-full max-w-xs space-y-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-3 text-sm text-slate-600 dark:text-slate-300">
                            <ShieldCheck className="w-5 h-5 text-green-500" />
                            <span>Verified Validator</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                            <Lock className="w-5 h-5 text-canton-500" />
                            <span>Secure OAuth2 Login</span>
                        </div>
                        <div className="flex items-center gap-3 mt-3 text-sm text-slate-600 dark:text-slate-300">
                            <Server className="w-5 h-5 text-blue-500" />
                            <span>YuCe Trade Node</span>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 text-center animate-in fade-in slide-in-from-bottom-2">
                            {error}
                        </div>
                    )}

                    <Button
                        size="lg"
                        onClick={handleLogin}
                        className="shadow-lg shadow-canton-500/20 w-full"
                    >
                        Connect Wallet
                    </Button>

                    <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-4">
                        By connecting, you agree to the Terms of Service
                    </p>
                </div>
            </div>
        </div>
    );
}
