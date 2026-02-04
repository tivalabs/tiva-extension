/**
 * Connected Sites Page
 * 
 * Manage sites connected to the wallet.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Trash2, Link2Off, ExternalLink } from 'lucide-react';
import { Button, Card, Modal, EmptyState } from '../../../ui';
import { usePopupStore } from '../store';
import type { ConnectedSite } from '../../../core/types';

export function ConnectedSitesPage() {
    const navigate = useNavigate();
    const { sendMessage } = usePopupStore();
    const [sites, setSites] = useState<ConnectedSite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [selectedSite, setSelectedSite] = useState<ConnectedSite | null>(null);

    const loadSites = async () => {
        try {
            const state = await sendMessage<{ connectedSites: ConnectedSite[] }>('getState');
            setSites(state.connectedSites || []);
        } catch (error) {
            console.error('Load sites error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSites();
    }, []);

    const handleDisconnect = async () => {
        if (!selectedSite) return;

        try {
            await sendMessage('disconnectSite', { origin: selectedSite.origin });
            setSites(sites.filter(s => s.origin !== selectedSite.origin));
            setShowDisconnectModal(false);
            setSelectedSite(null);
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    };

    const handleDisconnectAll = async () => {
        try {
            await sendMessage('disconnectAllSites');
            setSites([]);
        } catch (error) {
            console.error('Disconnect all error:', error);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getHostname = (origin: string) => {
        try {
            return new URL(origin).hostname;
        } catch {
            return origin;
        }
    };

    return (
        <div className="flex flex-col min-h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/settings')}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-white">Connected Sites</h1>
                        <p className="text-xs text-slate-400">{sites.length} site(s) connected</p>
                    </div>
                </div>

                {sites.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDisconnectAll}
                    >
                        <Link2Off className="w-4 h-4" />
                        Disconnect All
                    </Button>
                )}
            </div>

            {/* Sites List */}
            <div className="flex-1 p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin w-6 h-6 border-2 border-tiva-500 border-t-transparent rounded-full" />
                    </div>
                ) : sites.length === 0 ? (
                    <EmptyState
                        icon={<Globe className="w-12 h-12" />}
                        title="No Connected Sites"
                        description="Sites you connect to will appear here"
                    />
                ) : (
                    <div className="space-y-3">
                        {sites.map((site) => (
                            <Card key={site.origin} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center overflow-hidden">
                                    {site.icon ? (
                                        <img src={site.icon} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Globe className="w-5 h-5 text-slate-400" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {site.name || getHostname(site.origin)}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">
                                        Connected {formatDate(site.connectedAt)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <a
                                        href={site.origin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4 text-slate-400" />
                                    </a>
                                    <button
                                        onClick={() => {
                                            setSelectedSite(site);
                                            setShowDisconnectModal(true);
                                        }}
                                        className="p-2 hover:bg-red-900/30 rounded-lg transition-colors text-red-400"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Disconnect Modal */}
            <Modal
                isOpen={showDisconnectModal}
                onClose={() => {
                    setShowDisconnectModal(false);
                    setSelectedSite(null);
                }}
                title="Disconnect Site"
            >
                <p className="text-sm text-slate-400 mb-4">
                    Are you sure you want to disconnect from{' '}
                    <span className="text-white font-medium">
                        {selectedSite?.name || getHostname(selectedSite?.origin || '')}
                    </span>
                    ? The site will need to request permission again to access your wallet.
                </p>

                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setShowDisconnectModal(false);
                            setSelectedSite(null);
                        }}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDisconnect}
                        className="flex-1"
                    >
                        Disconnect
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
