/**
 * Accounts Page - Wallet Management
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Download, Copy, Wallet, Check, Key, Pencil } from 'lucide-react';
import { Button, Card, AddressDisplay, Modal, Input } from '../../../ui';
import { usePopupStore } from '../store';

export function AccountsPage() {
    const navigate = useNavigate();
    const { accounts, currentAccount, addAccount, exportPrivateKey, loading } = usePopupStore();
    const [createLoading, setCreateLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    // Export Modal State
    const [showExportModal, setShowExportModal] = useState(false);
    const [selectedAccountIndex, setSelectedAccountIndex] = useState<number | null>(null);
    const [exportPassword, setExportPassword] = useState('');
    const [revealedKey, setRevealedKey] = useState('');
    const [exportError, setExportError] = useState('');
    const [exportLoading, setExportLoading] = useState(false);

    // Create Account Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createPassword, setCreatePassword] = useState('');
    const [createError, setCreateError] = useState('');

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleExportKey = (index: number) => {
        setSelectedAccountIndex(index);
        setShowExportModal(true);
        setExportPassword('');
        setRevealedKey('');
        setExportError('');
    };

    const handleConfirmExport = async () => {
        if (selectedAccountIndex === null) return;
        setExportLoading(true);
        setExportError('');
        try {
            const key = await exportPrivateKey(exportPassword, selectedAccountIndex);
            setRevealedKey(key);
        } catch (err) {
            setExportError(err instanceof Error ? err.message : 'Invalid password');
        } finally {
            setExportLoading(false);
        }
    };

    const handleAddAccountClick = () => {
        setShowCreateModal(true);
        setCreatePassword('');
        setCreateError('');
    };

    const handleConfirmCreate = async () => {
        setCreateLoading(true);
        setCreateError('');
        try {
            await addAccount(createPassword);
            setShowCreateModal(false);
        } catch (error) {
            setCreateError(error instanceof Error ? error.message : 'Invalid password or failed to create');
        } finally {
            setCreateLoading(false);
        }
    };

    // Rename Modal State
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [renameIndex, setRenameIndex] = useState<number | null>(null);
    const [renameName, setRenameName] = useState('');
    const [renamePassword, setRenamePassword] = useState('');
    const [renameError, setRenameError] = useState('');
    const [renameLoading, setRenameLoading] = useState(false);

    // Import Account Modal State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importKey, setImportKey] = useState('');
    const [importPassword, setImportPassword] = useState('');
    const [importError, setImportError] = useState('');
    const [importLoading, setImportLoading] = useState(false);

    const handleImportClick = () => {
        setImportKey('');
        setImportPassword('');
        setImportError('');
        setShowImportModal(true);
    };

    const handleConfirmImport = async () => {
        setImportLoading(true);
        setImportError('');
        try {
            await usePopupStore.getState().importAccount(importKey.trim(), importPassword);
            setShowImportModal(false);
        } catch (error) {
            setImportError(error instanceof Error ? error.message : 'Failed to import');
        } finally {
            setImportLoading(false);
        }
    };

    const handleRenameClick = (index: number, currentName: string) => {
        setRenameIndex(index);
        setRenameName(currentName || `Account ${index + 1}`);
        setRenamePassword('');
        setRenameError('');
        setShowRenameModal(true);
    };

    const handleConfirmRename = async () => {
        if (renameIndex === null) return;
        setRenameLoading(true);
        setRenameError('');
        try {
            await usePopupStore.getState().renameAccount(renamePassword, renameIndex, renameName);
            setShowRenameModal(false);
        } catch (error) {
            setRenameError(error instanceof Error ? error.message : 'Failed to rename');
        } finally {
            setRenameLoading(false);
        }
    };



    return (
        <div className="flex flex-col min-h-screen p-4 bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate('/settings')}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Wallet Management</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage your accounts</p>
                </div>
            </div>

            {/* Account List */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {accounts.map((account, index) => (
                    <Card key={index} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tiva-500/20 to-accent-500/20 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                                <Wallet className="w-5 h-5 text-tiva-600 dark:text-tiva-400" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-slate-900 dark:text-white truncate">{account.name || `Account ${index + 1}`}</p>
                                    <button
                                        onClick={() => handleRenameClick(index, account.name || `Account ${index + 1}`)}
                                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                        title="Rename Account"
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {index === 0 ? (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${usePopupStore.getState().walletType === 'privateKey'
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                            {usePopupStore.getState().walletType === 'privateKey' ? 'Imported' : 'Main Wallet'}
                                        </span>
                                    ) : (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${account.isImported
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400'
                                            }`}>
                                            {account.isImported ? 'Imported' : 'Sub Wallet'}
                                        </span>
                                    )}

                                    {currentAccount?.address === account.address && (
                                        <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-1.5 py-0.5 rounded font-medium">Active</span>
                                    )}
                                </div>
                                <AddressDisplay address={account.address} />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleExportKey(index)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                title="Export Private Key"
                            >
                                <Key className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleCopy(account.address, index)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                title="Copy Address"
                            >
                                {copiedIndex === index ? <Check className="w-4 h-4 text-green-500 dark:text-green-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Actions */}
            <div className="space-y-3 mt-auto pt-4 border-t border-slate-700/50">
                <Button
                    onClick={handleAddAccountClick}
                    loading={createLoading || loading}
                    disabled={createLoading || loading || usePopupStore.getState().canAddAccounts === false}
                    className="w-full flex items-center justify-center gap-2"
                    title={usePopupStore.getState().canAddAccounts === false ? "Cannot add accounts to imported private key wallet" : "Create a new derived account"}
                >
                    <Plus className="w-4 h-4" />
                    Create New Wallet
                </Button>

                <Button
                    variant="secondary"
                    onClick={handleImportClick}
                    className="w-full flex items-center justify-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Import Account
                </Button>
            </div>

            {/* Export Key Modal */}
            <Modal
                isOpen={showExportModal}
                onClose={() => {
                    setShowExportModal(false);
                    setExportPassword('');
                    setRevealedKey('');
                    setExportError('');
                }}
                title="Export Private Key"
            >
                {!revealedKey ? (
                    <>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            Enter your password to reveal the private key for this account.
                        </p>
                        <Input
                            type="password"
                            value={exportPassword}
                            onChange={(e) => setExportPassword(e.target.value)}
                            placeholder="Enter password"
                            error={exportError}
                        />
                        <div className="flex gap-3 mt-4">
                            <Button
                                variant="secondary"
                                onClick={() => setShowExportModal(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmExport}
                                loading={exportLoading}
                                disabled={!exportPassword}
                                className="flex-1"
                            >
                                Reveal
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg mb-4">
                            <p className="text-xs text-red-600 dark:text-red-200">
                                <strong>WARNING:</strong> Never share your private key! Anyone with this key can steal your assets.
                            </p>
                        </div>
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-xs text-slate-800 dark:text-white break-all">
                            {revealedKey}
                        </div>
                        <Button
                            onClick={() => {
                                setShowExportModal(false);
                                setRevealedKey('');
                                setExportPassword('');
                            }}
                            className="w-full mt-4"
                        >
                            Done
                        </Button>
                    </>
                )}
            </Modal>

            {/* Create Account Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setCreatePassword('');
                    setCreateError('');
                }}
                title="Create New Account"
            >
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Enter your password to create a new derived account. This ensures your wallet remains encrypted.
                </p>
                <Input
                    type="password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Enter password"
                    error={createError}
                />
                <div className="flex gap-3 mt-4">
                    <Button
                        variant="secondary"
                        onClick={() => setShowCreateModal(false)}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmCreate}
                        loading={createLoading}
                        disabled={!createPassword}
                        className="flex-1"
                    >
                        Create
                    </Button>
                </div>
            </Modal>

            {/* Rename Account Modal */}
            <Modal
                isOpen={showRenameModal}
                onClose={() => {
                    setShowRenameModal(false);
                    setRenamePassword('');
                    setRenameName('');
                    setRenameError('');
                }}
                title="Rename Account"
            >
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Enter a new name for your account and confirm with your password.
                </p>
                <div className="space-y-3">
                    <Input
                        type="text"
                        value={renameName}
                        onChange={(e) => setRenameName(e.target.value)}
                        placeholder="Account name"
                    />
                    <Input
                        type="password"
                        value={renamePassword}
                        onChange={(e) => setRenamePassword(e.target.value)}
                        placeholder="Enter password"
                        error={renameError}
                    />
                </div>
                <div className="flex gap-3 mt-4">
                    <Button
                        variant="secondary"
                        onClick={() => setShowRenameModal(false)}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmRename}
                        loading={renameLoading}
                        disabled={!renamePassword || !renameName}
                        className="flex-1"
                    >
                        Save
                    </Button>
                </div>
            </Modal>

            {/* Import Account Modal (Add Private Key) */}
            <Modal
                isOpen={showImportModal}
                onClose={() => {
                    setShowImportModal(false);
                    setImportKey('');
                    setImportPassword('');
                    setImportError('');
                }}
                title="Import Account"
            >
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Import an account using its private key (64-character hex string). This will be added to your current wallet.
                </p>

                <div className="space-y-3">
                    <Input
                        type="text"
                        value={importKey}
                        onChange={(e) => setImportKey(e.target.value)}
                        placeholder="Private Key (Hex)"
                        className="font-mono text-xs"
                    />
                    <Input
                        type="password"
                        value={importPassword}
                        onChange={(e) => setImportPassword(e.target.value)}
                        placeholder="Wallet Password"
                        error={importError}
                    />
                </div>
                <div className="flex gap-3 mt-4">
                    <Button
                        variant="secondary"
                        onClick={() => setShowImportModal(false)}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmImport}
                        loading={importLoading}
                        disabled={!importKey || !importPassword}
                        className="flex-1"
                    >
                        Import
                    </Button>
                </div>
            </Modal >
        </div >
    );
}
