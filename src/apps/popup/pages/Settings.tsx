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
import { PinSetupModal } from '../components/PinSetupModal';

export function SettingsPage() {
    const navigate = useNavigate();
    const { network, sendMessage, openMode, setOpenMode, theme, setTheme, hasPin, setPin, verifyPin } = usePopupStore();

    const [showBackupModal, setShowBackupModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);

    // PIN State
    const [pinMode, setPinMode] = useState<'create' | 'change'>('create');
    // inputPin, confirmPin, etc. moved to PinSetupModal
    const [currentPin, setCurrentPin] = useState(''); // Still needed? No, handled in modal.
    // Actually PinSetupModal handles its own state. 
    // We only need showPinModal and pinMode.

    const [backupPassword, setBackupPassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [jwtTokenInput, setJwtTokenInput] = useState('');
    const [mnemonic, setMnemonic] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Temp state for auto-lock setting pending PIN creation
    const [pendingAutoLockTimeout, setPendingAutoLockTimeout] = useState<number | null>(null);

    // PIN Logic moved to PinSetupModal
    // Auto-lock setup waiting for PIN
    const handlePinSuccess = async () => {
        // If we were waiting to set auto-lock, do it now
        if (pendingAutoLockTimeout !== null) {
            await usePopupStore.getState().setAutoLockTimeout(pendingAutoLockTimeout);
            setPendingAutoLockTimeout(null);
        }
    };


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
        <div className="flex flex-col h-full bg-slate-50 dark:bg-midnight-500 transition-colors duration-200">
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
                {/* Authentication Section */}
                <div>
                    <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Authentication</h2>
                    <Card className="divide-y divide-slate-200 dark:divide-slate-700/50">
                        <button
                            onClick={() => {
                                setJwtTokenInput(network?.jwtToken || '');
                                setShowAuthModal(true);
                            }}
                            className="w-full flex items-center justify-between py-3"
                        >
                            <div className="flex items-center gap-3">
                                <Key className="w-5 h-5 text-canton-500 dark:text-canton-400" />
                                <div className="text-left">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">API Access Token</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {network?.jwtToken ? 'Configured' : 'Not configured'}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        </button>

                        <button
                            onClick={() => {
                                setPinMode(hasPin ? 'change' : 'create');
                                setShowPinModal(true);
                            }}
                            className="w-full flex items-center justify-between py-3"
                        >
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-canton-500 dark:text-canton-400" />
                                <div className="text-left">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">App PIN</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {hasPin ? 'Change PIN' : 'Set PIN'}
                                    </p>
                                </div>
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
                            <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1 gap-1 border border-neutral-200 dark:border-transparent">
                                <button
                                    onClick={async () => {
                                        await setOpenMode('popup');
                                        window.close();
                                    }}
                                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${openMode === 'popup'
                                        ? 'bg-tiva-500 text-black shadow-sm'
                                        : 'text-neutral-500 dark:text-silver-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'
                                        }`}
                                >
                                    Popup
                                </button>
                                <button
                                    onClick={async () => {
                                        await setOpenMode('sidebar');
                                        window.close();
                                    }}
                                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${(!openMode || openMode === 'sidebar')
                                        ? 'bg-tiva-500 text-black shadow-sm'
                                        : 'text-neutral-500 dark:text-silver-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'
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
                            <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1 gap-1 border border-neutral-200 dark:border-transparent">
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${theme === 'dark'
                                        ? 'bg-tiva-500 text-black shadow-sm'
                                        : 'text-neutral-500 dark:text-silver-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'
                                        }`}
                                >
                                    Dark
                                </button>
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${theme === 'light'
                                        ? 'bg-tiva-500 text-black shadow-sm'
                                        : 'text-neutral-500 dark:text-silver-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'
                                        }`}
                                >
                                    Light
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col py-3 gap-2 border-t border-slate-200 dark:border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                <div className="text-left w-full">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">Auto-lock Timer</p>
                                        <span className="text-xs font-medium text-canton-600 dark:text-canton-400 bg-canton-100 dark:bg-canton-900/30 px-2 py-0.5 rounded">
                                            {usePopupStore.getState().autoLockTimeout && usePopupStore.getState().autoLockTimeout! <= 0
                                                ? 'Never'
                                                : `${(usePopupStore.getState().autoLockTimeout || 15 * 60 * 1000) / 60000} min`}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="3"
                                        step="1"
                                        value={(() => {
                                            const timeout = usePopupStore.getState().autoLockTimeout;
                                            if (timeout === undefined) return 1; // Default
                                            if (timeout <= 0) return 3; // Never
                                            if (timeout <= 5 * 60 * 1000) return 0;
                                            if (timeout <= 15 * 60 * 1000) return 1;
                                            if (timeout <= 30 * 60 * 1000) return 2;
                                            return 2;
                                        })()}
                                        onChange={async (e) => {
                                            const val = parseInt(e.target.value);
                                            let timeout = 15 * 60 * 1000;
                                            if (val === 0) timeout = 5 * 60 * 1000;
                                            if (val === 1) timeout = 15 * 60 * 1000;
                                            if (val === 2) timeout = 30 * 60 * 1000;
                                            if (val === 3) timeout = 0; // Never

                                            // Enforce PIN if setting a timer (timeout > 0)
                                            if (timeout > 0 && !hasPin) {
                                                setPendingAutoLockTimeout(timeout);
                                                setPinMode('create');
                                                setShowPinModal(true);
                                            } else {
                                                await usePopupStore.getState().setAutoLockTimeout(timeout);
                                            }
                                        }}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-canton-500"
                                    />
                                    <div className="flex justify-between px-1 mt-1">
                                        <span className="text-[10px] text-slate-400">5m</span>
                                        <span className="text-[10px] text-slate-400">15m</span>
                                        <span className="text-[10px] text-slate-400">30m</span>
                                        <span className="text-[10px] text-slate-400">Never</span>
                                    </div>
                                </div>
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

            {/* Network Modal - Hidden: Using fixed production node
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
            */}

            {/* Auth Modal */}
            <Modal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                title="API Access Token"
            >
                <div>
                    <p className="text-sm text-slate-400 mb-4">
                        Enter the JWT token for the Canton API. This is required for accessing secured nodes.
                    </p>
                    <textarea
                        value={jwtTokenInput}
                        onChange={(e) => setJwtTokenInput(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full h-32 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white font-mono mb-4 resize-none focus:outline-none focus:ring-1 focus:ring-canton-500 border border-slate-200 dark:border-transparent"
                    />
                    <Button
                        onClick={async () => {
                            try {
                                setLoading(true);
                                await usePopupStore.getState().setJwtToken(jwtTokenInput);
                                setShowAuthModal(false);
                            } catch (err) {
                                setError('Failed to set token');
                            } finally {
                                setLoading(false);
                            }
                        }}
                        loading={loading}
                        className="w-full"
                    >
                        Save Token
                    </Button>
                </div>
            </Modal>

            {/* PIN Modal */}
            <PinSetupModal
                isOpen={showPinModal}
                onClose={() => {
                    setShowPinModal(false);
                    setPendingAutoLockTimeout(null);
                }}
                onSuccess={handlePinSuccess}
                mode={pinMode}
            />

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
