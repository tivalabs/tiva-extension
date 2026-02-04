import React, { useState } from 'react';
import { AuthService } from '../../../core/auth/auth.service';
import { Button, Logo, LoadingScreen, Card } from '../../../ui';
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

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-midnight-500 p-6 relative overflow-hidden">
            {loading ? (
                <div className="absolute inset-0 z-50 bg-slate-50 dark:bg-midnight-500 flex items-center justify-center">
                    <LoadingScreen message="Connecting to Validator..." />
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto z-10 relative">
                    {/* Header */}
                    <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-8 duration-700">
                        <div className="relative">
                            <div className="absolute -inset-1 rounded-full bg-tiva-500/20 blur-xl animate-pulse" />
                            <Logo size="lg" className="relative drop-shadow-2xl" />
                        </div>
                        <div className="text-center space-y-2">
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                                Tiva Wallet
                            </h1>
                            <div className="flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Validator Connected</span>
                            </div>
                        </div>
                    </div>

                    {/* Login Card */}
                    <div className="mt-8 w-full space-y-4 animate-in slide-in-from-bottom-12 duration-1000 delay-150">
                        <Card className="glass-card !bg-white/80 dark:!bg-[#151515]/80 backdrop-blur-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl">


                            <div className="space-y-4 py-2">
                                <div className="flex items-center gap-3 text-base font-medium text-neutral-700 dark:text-neutral-300">
                                    <Lock className="w-5 h-5 text-tiva-500" />
                                    <span>Secure OAuth2 Login</span>
                                </div>
                                <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                                    Your wallet connects securely to the Canton Network via the selected Validator Node.
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 text-center animate-in fade-in slide-in-from-bottom-2">
                                    {error}
                                </div>
                            )}

                            <div className="pt-2">
                                <Button
                                    size="lg"
                                    onClick={handleLogin}
                                    className="shadow-lg shadow-tiva-500/20 w-full text-base py-6"
                                >
                                    Connect Wallet
                                </Button>
                            </div>

                            <p className="text-xs text-center text-neutral-400 dark:text-neutral-600 mt-6 pb-2">
                                By connecting, you agree to the Terms of Service
                            </p>
                        </Card>
                    </div>
                </div>
            )}
        </div >
    );
}
