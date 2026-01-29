/**
 * Transaction Confirmation Page
 * 
 * Shown when a DApp requests transaction signing.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileCode,
    AlertTriangle,
    X,
    Check,
    ChevronDown,
    ChevronUp,
    Zap,
    Globe
} from 'lucide-react';
import { Button, Card, Logo, AddressDisplay } from '../../../ui';
import { usePopupStore } from '../store';

interface ConfirmParams {
    type: 'sign' | 'submitCommand';
    requestId: string;
    origin: string;
    title?: string;
    txHash?: string;
    command?: DamlCommand;
}

interface DamlCommand {
    templateId?: {
        packageId?: string;
        moduleName?: string;
        entityName?: string;
    };
    choice?: string;
    argument?: Record<string, unknown>;
}

export function ConfirmPage() {
    const navigate = useNavigate();
    const { currentAccount, sendMessage } = usePopupStore();
    const [params, setParams] = useState<ConfirmParams | null>(null);
    const [loading, setLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Load confirmation params from session storage
        chrome.storage.session.get(['popupParams']).then((result) => {
            if (result.popupParams) {
                setParams(result.popupParams as ConfirmParams);
            }
        });

        // Also check for pending requests
        sendMessage<{ requests: Array<{ id: string; type: string; origin: string; payload: unknown }> }>('getPendingRequests')
            .then(({ requests }) => {
                const signRequest = requests.find(r =>
                    r.type === 'SIGN_TRANSACTION' || r.type === 'SUBMIT_COMMAND'
                );
                if (signRequest) {
                    const payload = signRequest.payload as {
                        txHash?: string;
                        command?: DamlCommand;
                        title?: string;
                    };
                    setParams({
                        requestId: signRequest.id,
                        type: signRequest.type === 'SIGN_TRANSACTION' ? 'sign' : 'submitCommand',
                        origin: signRequest.origin,
                        title: payload.title,
                        txHash: payload.txHash,
                        command: payload.command,
                    });
                }
            })
            .catch(console.error);
    }, [sendMessage]);

    const handleApprove = async () => {
        if (!params) return;

        setLoading(true);
        setError(null);

        try {
            // Sign the transaction
            const { signature } = await sendMessage<{ signature: string }>('signTransaction', {
                txHash: params.txHash || '',
            });

            // Approve with signature
            await sendMessage('approveTransaction', {
                requestId: params.requestId,
                signature,
            });

            window.close();
        } catch (err) {
            console.error('Approve error:', err);
            setError(err instanceof Error ? err.message : 'Transaction failed');
            setLoading(false);
        }
    };

    const handleReject = async () => {
        if (!params) return;

        setLoading(true);
        try {
            await sendMessage('rejectTransaction', {
                requestId: params.requestId,
            });

            window.close();
        } catch (err) {
            console.error('Reject error:', err);
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

    const templateName = params.command?.templateId?.entityName || 'Unknown Template';
    const choiceName = params.command?.choice || 'Execute';

    return (
        <div className="flex flex-col min-h-full p-4 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
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

            {/* Transaction Type */}
            <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-canton-500/20 rounded-full">
                    <Zap className="w-4 h-4 text-canton-400" />
                    <span className="text-sm font-medium text-canton-300">
                        {params.type === 'submitCommand' ? 'Authorize Command' : 'Sign Transaction'}
                    </span>
                </div>
            </div>

            {/* Site Info */}
            <Card className="mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-white">{params.title || hostname}</p>
                        <p className="text-xs text-slate-400">{hostname}</p>
                    </div>
                </div>
            </Card>

            {/* Transaction Info */}
            <Card className="mb-4 flex-1 overflow-auto">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-canton-500 to-accent-500 flex items-center justify-center">
                        <FileCode className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">{templateName}</p>
                        <p className="text-xs text-slate-400">Choice: {choiceName}</p>
                    </div>
                </div>

                {/* Transaction Hash */}
                {params.txHash && (
                    <div className="mb-4">
                        <p className="text-xs text-slate-400 mb-1">Transaction Hash</p>
                        <code className="text-xs font-mono text-slate-300 break-all bg-slate-800 p-2 rounded block">
                            {params.txHash}
                        </code>
                    </div>
                )}

                {/* Arguments (expandable) */}
                {params.command?.argument && (
                    <div>
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-white transition-colors"
                        >
                            <span>Transaction Details</span>
                            {showDetails ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </button>

                        {showDetails && (
                            <pre className="mt-2 text-xs font-mono text-slate-300 bg-slate-800 p-2 rounded overflow-auto max-h-32">
                                {JSON.stringify(params.command.argument, null, 2)}
                            </pre>
                        )}
                    </div>
                )}
            </Card>

            {/* Signing Account */}
            <Card className="mb-4">
                <p className="text-xs text-slate-400 mb-2">Signing with</p>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-canton-400 to-accent-500" />
                    <div>
                        <p className="text-sm font-medium text-white">
                            {currentAccount?.name || 'Account 1'}
                        </p>
                        <AddressDisplay address={currentAccount?.publicKey || ''} />
                    </div>
                </div>
            </Card>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg mb-4">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <p className="text-xs text-red-200">{error}</p>
                </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200">
                    Review this transaction carefully. Signing authorizes this action on the Canton ledger.
                </p>
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
                    <Check className="w-4 h-4" />
                    Approve
                </Button>
            </div>
        </div>
    );
}
