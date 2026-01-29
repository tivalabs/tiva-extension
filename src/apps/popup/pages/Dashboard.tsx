/**
 * Dashboard Page - Main Wallet View
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Settings,
    Copy,
    ExternalLink,
    Send,
    Download,
    Lock,
    ChevronDown,
    Wallet,
    FileCode,
    Clock,
    AlertTriangle,
    X
} from 'lucide-react';
import { Button, Card, AddressDisplay, EmptyState, Logo, WalletAvatar } from '../../../ui';
import { usePopupStore } from '../store';

export function DashboardPage() {
    const navigate = useNavigate();
    const { currentAccount, accounts, network, lock, partyIdWarning, setPartyIdWarning } = usePopupStore();
    const [showAccountMenu, setShowAccountMenu] = useState(false);

    const handleLock = async () => {
        await lock();
        navigate('/unlock');
    };


    return (
        <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-900 transition-colors duration-200 relative">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center gap-3">
                    <WalletAvatar
                        address={currentAccount?.address || ''}
                        size="md"
                        className="shadow-md"
                    />
                    <div>
                        <div className="flex items-center gap-1 text-slate-900 dark:text-white font-medium">
                            {currentAccount?.name || 'Authorized Party'}
                        </div>
                        <p className="text-xs text-slate-500">{network?.name || 'Canton TestNet'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/activity')}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        title="Activity"
                    >
                        <Clock className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleLock}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        title="Lock Wallet"
                    >
                        <Lock className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => chrome.tabs.create({ url: 'popup.html' })}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        title="Open in Web"
                    >
                        <ExternalLink className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Account Dropdown Removed */}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto w-full">
                {/* Party ID Warning Banner */}
                {partyIdWarning && (
                    <div className="mx-4 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl flex items-start gap-3 relative animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 mr-4">
                            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">Registration Issue</p>
                            <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5 leading-relaxed">{partyIdWarning}</p>
                        </div>
                        <button
                            onClick={() => setPartyIdWarning(null)}
                            className="absolute top-2 right-2 p-1 text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Balance Card */}
                <div className="px-4 py-3">
                    <Card className="glow">
                        <div className="text-center py-3">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Balance</p>
                            <p className="text-3xl font-bold gradient-text">{usePopupStore(s => s.balance)} CC</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Canton Coin</p>
                        </div>

                        {/* Account Address / Party ID */}
                        <div className="flex flex-col items-center gap-1 py-2 border-t border-slate-200 dark:border-slate-700/50">
                            {currentAccount?.partyId ? (
                                <>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Party ID</p>
                                    <AddressDisplay address={currentAccount.partyId} />
                                </>
                            ) : (
                                <>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Public Key</p>
                                    <AddressDisplay address={currentAccount?.publicKey || ''} />
                                </>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="flex-1"
                                onClick={() => navigate('/receive')}
                            >
                                <Download className="w-4 h-4" />
                                Receive
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => navigate('/send')}
                            >
                                <Send className="w-4 h-4" />
                                Send
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Tokens Section */}
                <div className="px-4 pb-4">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Assets</h2>
                        <button className="text-xs text-canton-500 hover:text-canton-600 dark:text-canton-400 dark:hover:text-canton-300">
                            View All
                        </button>
                    </div>

                    <EmptyState
                        icon={<Wallet className="w-8 h-8" />}
                        title="No Assets Yet"
                        description="Tokens will appear here"
                    />
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="sticky bottom-0 z-20 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm flex w-full">
                <button
                    className="flex-1 flex flex-col items-center gap-1 py-2 text-canton-600 dark:text-canton-400 border-t-2 border-canton-500"
                >
                    <Wallet className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Wallet</span>
                </button>
                <button
                    onClick={() => navigate('/contracts')}
                    className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors border-t-2 border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                >
                    <FileCode className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Contracts</span>
                </button>
                <button
                    onClick={() => navigate('/settings')}
                    className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors border-t-2 border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                >
                    <Settings className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Settings</span>
                </button>
            </div>
        </div>
    );
}
