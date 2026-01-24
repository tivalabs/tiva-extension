/**
 * Connection Approval Page
 * 
 * Shown when a DApp requests account access.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Shield, X, Check, AlertTriangle } from 'lucide-react';
import { Button, Card, Logo, AddressDisplay } from '../../../ui';
import { usePopupStore } from '../store';

interface ConnectionParams {
    origin: string;
    title: string;
    icon?: string;
    requestId: string;
}

export function ConnectPage() {
    const navigate = useNavigate();
    const { accounts, currentAccount, sendMessage } = usePopupStore();
    const [params, setParams] = useState<ConnectionParams | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load connection params from session storage
        chrome.storage.session.get(['popupParams']).then((result) => {
            if (result.popupParams) {
                setParams(result.popupParams as ConnectionParams);
            }
        });

        // Also check for pending requests
        sendMessage<{ requests: Array<{ id: string; type: string; origin: string; payload: unknown }> }>('getPendingRequests')
            .then(({ requests }) => {
                const connectionRequest = requests.find(r => r.type === 'REQUEST_ACCOUNTS');
                if (connectionRequest) {
                    const payload = connectionRequest.payload as { title?: string; icon?: string };
                    setParams({
                        requestId: connectionRequest.id,
                        origin: connectionRequest.origin,
                        title: payload.title || connectionRequest.origin,
                        icon: payload.icon,
                    });
                }
            })
            .catch(console.error);
    }, [sendMessage]);

    const handleApprove = async () => {
        if (!params) return;

        setLoading(true);
        try {
            await sendMessage('approveConnection', {
                requestId: params.requestId,
                origin: params.origin,
                title: params.title,
                icon: params.icon,
            });

            // Close popup or navigate to dashboard
            window.close();
        } catch (error) {
            console.error('Approve error:', error);
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!params) return;

        setLoading(true);
        try {
            await sendMessage('rejectConnection', {
                requestId: params.requestId,
            });

            window.close();
        } catch (error) {
            console.error('Reject error:', error);
            setLoading(false);
        }
    };

    if (!params) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-2 border-canton-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const hostname = (() => {
        try {
            return new URL(params.origin).hostname;
        } catch {
            return params.origin;
        }
    })();

    return (
        <div className="flex flex-col min-h-full p-4 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Logo size="sm" />
                    <span className="font-semibold text-white">CantonLink</span>
                </div>
                <button
                    onClick={handleReject}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            {/* Connection Request */}
            <div className="flex-1 flex flex-col items-center">
                {/* Site Info */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center mb-3 overflow-hidden">
                        {params.icon ? (
                            <img src={params.icon} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Globe className="w-8 h-8 text-slate-400" />
                        )}
                    </div>
                    <h2 className="text-lg font-semibold text-white">{params.title || hostname}</h2>
                    <p className="text-sm text-slate-400">{hostname}</p>
                </div>

                {/* Request Info */}
                <Card className="w-full mb-4">
                    <div className="text-center py-2">
                        <p className="text-sm text-slate-300">
                            This site wants to connect to your wallet
                        </p>
                    </div>
                </Card>

                {/* Permissions */}
                <Card className="w-full mb-4">
                    <h3 className="text-sm font-medium text-slate-400 mb-3">Permissions Requested</h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-slate-300">View your account address</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-slate-300">Request transaction signatures</span>
                        </div>
                    </div>
                </Card>

                {/* Account to Connect */}
                <Card className="w-full mb-4">
                    <h3 className="text-sm font-medium text-slate-400 mb-3">Account to Connect</h3>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-canton-400 to-accent-500" />
                        <div>
                            <p className="text-sm font-medium text-white">
                                {currentAccount?.name || 'Account 1'}
                            </p>
                            <AddressDisplay address={currentAccount?.publicKey || ''} />
                        </div>
                    </div>
                </Card>

                {/* Warning */}
                <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg mb-4">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200">
                        Only connect to sites you trust. Malicious sites can request transactions that may drain your funds.
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <Button
                    variant="secondary"
                    onClick={handleReject}
                    disabled={loading}
                    className="flex-1"
                >
                    Reject
                </Button>
                <Button
                    onClick={handleApprove}
                    loading={loading}
                    className="flex-1"
                >
                    <Shield className="w-4 h-4" />
                    Connect
                </Button>
            </div>
        </div>
    );
}
