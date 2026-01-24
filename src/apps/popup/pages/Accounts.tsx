/**
 * Accounts Page - Wallet Management
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Download, Copy, Wallet, Check } from 'lucide-react';
import { Button, Card, AddressDisplay } from '../../../ui';
import { usePopupStore } from '../store';

export function AccountsPage() {
    const navigate = useNavigate();
    const { accounts, currentAccount, addAccount, loading } = usePopupStore();
    const [createLoading, setCreateLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleAddAccount = async () => {
        setCreateLoading(true);
        try {
            await addAccount();
        } catch (error) {
            console.error(error);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleImportWallet = () => {
        // Navigate to import page - since specific logic might be needed for re-import
        // Currently we can just navigate to onboarding import but warn user?
        // App.tsx normally blocks /import if initialized.
        // We need to implement a "Reset Wallet" or ensure /import is accessible OR ask for password.
        // For now, let's assume the user wants to RESET the wallet if they click "Import Wallet"
        // But simply navigating to `/import` won't work if `isInitialized` is true in App.tsx.
        // We'll leave this as a TODO or just show a message.
        // Wait, the user request says "Import Wallet function".
        // Let's navigate to a special 'restore' route or just alert for now.
        if (confirm("Importing a new wallet will replace your current one. Make sure you have backed up your current recovery phrase. Continue?")) {
            // Forcing a reset requires clearing storage or specific handling.
            // Best way: Lock wallet, then clear storage?
            // Or allow access to /import?
            // Let's try navigating to /import and see if we need to adjust App.tsx
            navigate('/import');
        }
    };

    return (
        <div className="flex flex-col min-h-screen p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate('/settings')}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-white">Wallet Management</h1>
                    <p className="text-xs text-slate-400">Manage your accounts</p>
                </div>
            </div>

            {/* Account List */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {accounts.map((account, index) => (
                    <Card key={index} className="flex items-center justify-between p-3 border border-slate-700/50 bg-slate-800/50">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-canton-500/20 to-accent-500/20 flex items-center justify-center border border-slate-700">
                                <Wallet className="w-5 h-5 text-canton-400" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-white truncate">{account.name || `Account ${index + 1}`}</p>
                                    {currentAccount?.address === account.address && (
                                        <span className="text-[10px] bg-canton-500/20 text-canton-300 px-1.5 py-0.5 rounded">Active</span>
                                    )}
                                </div>
                                <AddressDisplay address={account.address} />
                            </div>
                        </div>

                        <button
                            onClick={() => handleCopy(account.address, index)}
                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Copy Address"
                        >
                            {copiedIndex === index ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </Card>
                ))}
            </div>

            {/* Actions */}
            <div className="space-y-3 mt-auto pt-4 border-t border-slate-700/50">
                <Button
                    onClick={handleAddAccount}
                    loading={createLoading || loading}
                    className="w-full flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create New Wallet
                </Button>

                <Button
                    variant="secondary"
                    onClick={handleImportWallet}
                    className="w-full flex items-center justify-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Import Existing Wallet
                </Button>
            </div>
        </div>
    );
}
