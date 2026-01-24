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
    Wallet
} from 'lucide-react';
import { Button, Card, Modal, Input } from '../../../ui';
import { usePopupStore } from '../store';
import { NETWORKS } from '../../../core/config';

export function SettingsPage() {
    const navigate = useNavigate();
    const { network, sendMessage } = usePopupStore();

    const [showBackupModal, setShowBackupModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
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
        <div className="flex flex-col min-h-full">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-700/50">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <h1 className="text-lg font-semibold text-white">Settings</h1>
            </div>

            <div className="flex-1 p-4 space-y-4">
                {/* Wallet Management */}
                <div>
                    <h2 className="text-sm font-medium text-slate-400 mb-2">Wallet</h2>
                    <Card>
                        <button
                            onClick={() => navigate('/accounts')}
                            className="w-full flex items-center justify-between py-2"
                        >
                            <div className="flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-canton-400" />
                                <div className="text-left">
                                    <p className="text-sm font-medium text-white">Wallet Management</p>
                                    <p className="text-xs text-slate-400">Manage accounts</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                        </button>
                    </Card>
                </div>

                {/* Network Section */}
                <div>
                    <h2 className="text-sm font-medium text-slate-400 mb-2">Network</h2>
                    <Card>
                        <button className="w-full flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-canton-400" />
                                <div className="text-left">
                                    <p className="text-sm font-medium text-white">Current Network</p>
                                    <p className="text-xs text-slate-400">{network?.name || 'Canton TestNet'}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                        </button>
                    </Card>
                </div>

                {/* Security Section */}
                <div>
                    <h2 className="text-sm font-medium text-slate-400 mb-2">Security</h2>
                    <Card className="divide-y divide-slate-700/50">
                        <button
                            onClick={() => setShowBackupModal(true)}
                            className="w-full flex items-center justify-between py-3"
                        >
                            <div className="flex items-center gap-3">
                                <Key className="w-5 h-5 text-amber-400" />
                                <span className="text-sm text-white">Backup Recovery Phrase</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                        </button>

                        <button
                            onClick={() => navigate('/change-password')}
                            className="w-full flex items-center justify-between py-3"
                        >
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-green-400" />
                                <span className="text-sm text-white">Change Password</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                        </button>

                        <button
                            onClick={() => navigate('/connected-sites')}
                            className="w-full flex items-center justify-between py-3"
                        >
                            <div className="flex items-center gap-3">
                                <Link2 className="w-5 h-5 text-blue-400" />
                                <span className="text-sm text-white">Connected Sites</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                        </button>
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

                        <button className="w-full flex items-center justify-between py-3">
                            <span className="text-sm text-white">Documentation</span>
                            <ExternalLink className="w-4 h-4 text-slate-500" />
                        </button>
                    </Card>
                </div>

                {/* Danger Zone */}
                <div>
                    <h2 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h2>
                    <Card className="bg-red-900/10 border-red-500/20">
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full flex items-center gap-3 py-2"
                        >
                            <Trash2 className="w-5 h-5 text-red-400" />
                            <span className="text-sm text-red-400">Delete Wallet</span>
                        </button>
                    </Card>
                </div>
            </div>

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
        </div>
    );
}
