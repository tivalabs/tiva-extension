/**
 * Settings Page
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ChevronRight,
    Globe,
    Shield,
    Key,
    Trash2,
    Download,
    ExternalLink,
    Link2,
    Wallet,
    Moon,
    Layout
} from 'lucide-react';
import { Button, Card, Modal, Input } from '../../../ui';
import { usePopupStore } from '../store';
import { NETWORKS } from '../../../core/config';

export function SettingsPage() {
    const navigate = useNavigate();
    const { network, sendMessage, openMode, setOpenMode, theme, setTheme } = usePopupStore();

    const [showBackupModal, setShowBackupModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showNetworkModal, setShowNetworkModal] = useState(false);
    const [backupPassword, setBackupPassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [mnemonic, setMnemonic] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleExportMnemonic = async () => {
        try {
            setLoading(true);
            setError('');
            const { mnemonic: exported } = await sendMessage<{ mnemonic: string }>(
                'exportMnemonic',
                { password: backupPassword }
            );
            setMnemonic(exported);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid password');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteWallet = async () => {
        try {
            setLoading(true);
            setError('');
            await sendMessage('deleteWallet', { password: deletePassword });
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid password');
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700/50 flex-shrink-0">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Settings</h1>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {/* Wallet Management */}
                <div>
                    <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Wallet</h2>
                    <Card>
                        <button
                            onClick={() => navigate('/accounts')}
                            className="w-full flex items-center justify-between py-2"
                        >
                            <div className="flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-canton-500 dark:text-canton-400" />
                                <div className="text-left">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Wallet Management</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage accounts</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        </button>
                    </Card>
                </div>



                {/* Network Section */}
                <div>
                    <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Network</h2>
                    <Card>
                        <button
                            onClick={() => setShowNetworkModal(true)}
                            className="w-full flex items-center justify-between py-2"
                        >
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-canton-500 dark:text-canton-400" />
                                <div className="text-left">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Current Network</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{network?.name || 'Unknown Network'}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        </button>
                    </Card>
                </div>

                {/* Security Section */}
                <div>
                    <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Security</h2>
                    <Card className="divide-y divide-slate-200 dark:divide-slate-700/50">
                        <button
                            onClick={() => setShowBackupModal(true)}
                            className="w-full flex items-center justify-between py-3"
                        >
                            <div className="flex items-center gap-3">
                                <Key className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                                <span className="text-sm text-slate-900 dark:text-white">Backup Recovery Phrase</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        </button>

                        <button
                            onClick={() => navigate('/change-password')}
                            className="w-full flex items-center justify-between py-3"
                        >
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-green-500 dark:text-green-400" />
                                <span className="text-sm text-slate-900 dark:text-white">Change Password</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        </button>


                    </Card>
                </div>

                {/* Advanced Section */}
                <div>
                    <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Advanced</h2>
                    <Card className="divide-y divide-slate-200 dark:divide-slate-700/50">
                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                                <Layout className="w-5 h-5 text-canton-500 dark:text-canton-400" />
                                <div className="text-left">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Opening Mode</p>
                                </div>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1 border border-slate-200 dark:border-transparent">
                                <button
                                    onClick={async () => {
                                        await setOpenMode('popup');
                                        window.close();
                                    }}
                                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${(!openMode || openMode === 'popup')
                                        ? 'bg-white dark:bg-canton-500 text-slate-900 dark:text-white shadow-sm dark:shadow-md border border-slate-200 dark:border-transparent'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                                        }`}
                                >
                                    Popup
                                </button>
                                <button
                                    onClick={async () => {
                                        await setOpenMode('sidebar');
                                        window.close();
                                    }}
                                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${openMode === 'sidebar'
                                        ? 'bg-white dark:bg-canton-500 text-slate-900 dark:text-white shadow-sm dark:shadow-md border border-slate-200 dark:border-transparent'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                                        }`}
                                >
                                    Sidebar
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                                <Moon className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                                <div className="text-left">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Theme</p>
                                </div>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1 border border-slate-200 dark:border-transparent">
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${theme === 'dark'
                                        ? 'bg-white dark:bg-canton-500 text-slate-900 dark:text-white shadow-sm dark:shadow-md border border-slate-200 dark:border-transparent'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                                        }`}
                                >
                                    Dark
                                </button>
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${theme === 'light'
                                        ? 'bg-white dark:bg-canton-500 text-slate-900 dark:text-white shadow-sm dark:shadow-md border border-slate-200 dark:border-transparent'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50'
                                        }`}
                                >
                                    Light
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* About Section */}
                <div>
                    <h2 className="text-sm font-medium text-slate-400 mb-2">About</h2>
                    <Card className="divide-y divide-slate-700/50">
                        <div className="flex items-center justify-between py-3">
                            <span className="text-sm text-slate-300">Version</span>
                            <span className="text-sm text-slate-500">1.0.0</span>
                        </div>


                    </Card>
                </div>


            </div>

            {/* Network Modal */}
            <Modal
                isOpen={showNetworkModal}
                onClose={() => setShowNetworkModal(false)}
                title="Select Network"
            >
                <div className="space-y-3">
                    {Object.values(NETWORKS)
                        .filter(n => n.chainId && n.chainId !== 'canton-local')
                        .map((net) => (
                            <button
                                key={net.chainId}
                                onClick={async () => {
                                    try {
                                        setLoading(true);
                                        if (net.chainId) {
                                            await usePopupStore.getState().setNetwork(net.chainId);
                                        }
                                        setShowNetworkModal(false);
                                    } catch (err) {
                                        setError('Failed to switch network');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border ${network?.chainId === net.chainId
                                    ? 'bg-canton-500/20 border-canton-500/50'
                                    : 'bg-slate-800 border-slate-700/50 hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${network?.chainId === net.chainId ? 'bg-canton-400' : 'bg-slate-600'
                                        }`} />
                                    <div className="text-left">
                                        <p className="font-medium text-white">{net.name}</p>
                                        <p className="text-xs text-slate-400 truncate max-w-[200px]">{net.jsonApiUrl}</p>
                                    </div>
                                </div>
                                {network?.chainId === net.chainId && (
                                    <div className="text-canton-400">Current</div>
                                )}
                            </button>
                        ))}
                </div>
            </Modal>

            {/* Backup Modal */}
            <Modal
                isOpen={showBackupModal}
                onClose={() => {
                    setShowBackupModal(false);
                    setMnemonic('');
                    setBackupPassword('');
                    setError('');
                }}
                title="Backup Recovery Phrase"
            >
                {!mnemonic ? (
                    <>
                        <p className="text-sm text-slate-400 mb-4">
                            Enter your password to reveal your recovery phrase.
                        </p>
                        <Input
                            type="password"
                            value={backupPassword}
                            onChange={(e) => setBackupPassword(e.target.value)}
                            placeholder="Enter password"
                            error={error}
                        />
                        <div className="flex gap-3 mt-4">
                            <Button
                                variant="secondary"
                                onClick={() => setShowBackupModal(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleExportMnemonic}
                                loading={loading}
                                disabled={!backupPassword}
                                className="flex-1"
                            >
                                Reveal
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg mb-4">
                            <p className="text-xs text-amber-200">
                                Never share your recovery phrase with anyone!
                            </p>
                        </div>
                        <div className="p-3 bg-slate-800 rounded-lg font-mono text-sm text-white break-words">
                            {mnemonic}
                        </div>
                        <Button
                            onClick={() => {
                                setShowBackupModal(false);
                                setMnemonic('');
                                setBackupPassword('');
                            }}
                            className="w-full mt-4"
                        >
                            Done
                        </Button>
                    </>
                )}
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setError('');
                }}
                title="Delete Wallet"
            >
                <p className="text-sm text-slate-400 mb-4">
                    This will permanently delete your wallet. Make sure you have backed up your recovery phrase!
                </p>
                <Input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter password to confirm"
                    error={error}
                />
                <div className="flex gap-3 mt-4">
                    <Button
                        variant="secondary"
                        onClick={() => setShowDeleteModal(false)}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDeleteWallet}
                        loading={loading}
                        disabled={!deletePassword}
                        className="flex-1"
                    >
                        Delete
                    </Button>
                </div>
            </Modal>
        </div >
    );
}
