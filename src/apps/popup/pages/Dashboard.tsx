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
    Clock
} from 'lucide-react';
import { Button, Card, AddressDisplay, EmptyState, Logo } from '../../../ui';
import { usePopupStore } from '../store';

export function DashboardPage() {
    const navigate = useNavigate();
    const { currentAccount, accounts, network, lock } = usePopupStore();
    const [showAccountMenu, setShowAccountMenu] = useState(false);

    const handleLock = async () => {
        await lock();
        navigate('/unlock');
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-900">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                    <Logo size="sm" />
                    <div>
                        <button
                            onClick={() => setShowAccountMenu(!showAccountMenu)}
                            className="flex items-center gap-1 text-white font-medium hover:text-canton-400 transition-colors"
                        >
                            {currentAccount?.name || 'Account 1'}
                            <ChevronDown className="w-4 h-4" />
                        </button>
                        <p className="text-xs text-slate-500">{network?.name || 'Canton TestNet'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/activity')}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                        title="Activity"
                    >
                        <Clock className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleLock}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                        title="Lock Wallet"
                    >
                        <Lock className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => navigate('/settings')}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                        title="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto w-full">
                {/* Account Dropdown */}
                {showAccountMenu && (
                    <div className="absolute top-14 left-4 right-4 z-10 glass-card p-2 animate-in shadow-xl bg-slate-900/95 backdrop-blur-md border-slate-700">
                        {accounts.map((account, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    usePopupStore.getState().setCurrentAccount(i);
                                    setShowAccountMenu(false);
                                }}
                                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${account.address === currentAccount?.address
                                    ? 'bg-canton-500/20'
                                    : 'hover:bg-slate-700'
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-canton-400 to-accent-500 flex items-center justify-center">
                                    <Wallet className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium text-white">{account.name || `Account ${i + 1}`}</p>
                                    <p className="text-xs text-slate-400 font-mono">
                                        {account.address.slice(0, 8)}...{account.address.slice(-6)}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Balance Card */}
                <div className="px-4 py-3">
                    <Card className="glow">
                        <div className="text-center py-3">
                            <p className="text-sm text-slate-400 mb-1">Total Balance</p>
                            <p className="text-3xl font-bold gradient-text">{usePopupStore(s => s.balance)} CC</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Canton Coin</p>
                        </div>

                        {/* Account Address */}
                        <div className="flex items-center justify-center gap-2 py-2 border-t border-slate-700/50">
                            <AddressDisplay address={currentAccount?.publicKey || ''} />
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
                        <h2 className="text-sm font-semibold text-slate-300">Assets</h2>
                        <button className="text-xs text-canton-400 hover:text-canton-300">
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
            <div className="sticky bottom-0 z-20 border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-sm flex w-full">
                <button
                    className="flex-1 flex flex-col items-center gap-1 py-2 text-canton-400 border-t-2 border-canton-500"
                >
                    <Wallet className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Wallet</span>
                </button>
                <button
                    onClick={() => navigate('/contracts')}
                    className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500 hover:text-slate-300 transition-colors border-t-2 border-transparent hover:border-slate-700"
                >
                    <FileCode className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Contracts</span>
                </button>
                <button
                    onClick={() => navigate('/settings')}
                    className="flex-1 flex flex-col items-center gap-1 py-2 text-slate-500 hover:text-slate-300 transition-colors border-t-2 border-transparent hover:border-slate-700"
                >
                    <Settings className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Settings</span>
                </button>
            </div>
        </div>
    );
}
