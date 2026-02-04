/**
 * Activity Page - Transaction History
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
    CheckCircle,
    XCircle,
    ExternalLink
} from 'lucide-react';
import { Card, EmptyState } from '../../../ui';
import { usePopupStore } from '../store';

interface Transaction {
    id: string;
    type: 'send' | 'receive';
    amount: string;
    token: string;
    address: string;
    status: 'pending' | 'confirmed' | 'failed';
    timestamp: number;
    txHash?: string;
}

export function ActivityPage() {
    const navigate = useNavigate();
    const { currentAccount, transactions, fetchTransactions, loading: storeLoading } = usePopupStore();
    // const [transactions, setTransactions] = useState<Transaction[]>([]); // Use store state instead
    // const [loading, setLoading] = useState(true); // Use store loading or local combined

    useEffect(() => {
        const loadData = async () => {
            if (currentAccount) {
                await fetchTransactions(20, 0); // Default limit
            }
        };
        loadData();
    }, [currentAccount, fetchTransactions]);

    // Map store transactions (any[]) to UI Transaction interface if needed
    // For now assuming the API matches or we map it here.
    // Let's create a safe mapper.
    const mappedTransactions: Transaction[] = React.useMemo(() => {
        if (!transactions || !Array.isArray(transactions)) return [];

        if (!currentAccount) return [];
        const myAddress = currentAccount.address;

        return transactions.map((tx: any) => {
            // Determine direction
            // Sender might be object { party: "..." } or string
            const senderParty = tx.sender?.party || tx.sender?.party_id || tx.sender || '';
            const isSender = senderParty === myAddress;

            // Determine Amount
            let amount = '0';

            // Priority 1: Check sender/receiver specific amounts (API V0)
            if (isSender && tx.sender?.amount) {
                amount = Math.abs(parseFloat(tx.sender.amount)).toString();
            } else if (!isSender && tx.receivers && Array.isArray(tx.receivers)) {
                const myReceiver = tx.receivers.find((r: any) => (r.party || r.party_id) === myAddress);
                if (myReceiver && myReceiver.amount) {
                    amount = parseFloat(myReceiver.amount).toString();
                }
            }

            // Priority 2: Fallbacks
            if (amount === '0' || amount === '0.0000000000') {
                if (tx.transaction_subtype?.amount) {
                    amount = tx.transaction_subtype.amount;
                } else if (tx.balance_change) {
                    amount = Math.abs(parseFloat(tx.balance_change)).toString();
                } else if (tx.amount) {
                    amount = tx.amount;
                }
            }

            // Determine Counterparty
            let otherParty = '';
            if (isSender) {
                const receiver = tx.receivers?.[0];
                otherParty = receiver?.party || receiver?.party_id || receiver || 'Multiple/Unknown';
            } else {
                otherParty = senderParty;
            }

            return {
                id: tx.event_id || tx.transaction_id || crypto.randomUUID(),
                type: isSender ? 'send' : 'receive',
                amount: amount,
                token: tx.asset_symbol || 'CC',
                address: otherParty || 'Unknown',
                status: 'confirmed',
                timestamp: tx.date ? new Date(tx.date).getTime() : (tx.effective_at ? new Date(tx.effective_at).getTime() : Date.now()),
                txHash: tx.event_id
            };
        });
    }, [transactions, currentAccount]);

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 8)}...${address.slice(-6)}`;
    };

    const StatusIcon = ({ status }: { status: Transaction['status'] }) => {
        switch (status) {
            case 'confirmed':
                return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'pending':
                return <Clock className="w-4 h-4 text-amber-400" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-400" />;
        }
    };

    const handleTransactionClick = (tx: Transaction) => {
        if (!tx.txHash) return;

        // Format event_id: Remove '#' prefix and ':...' suffix
        // Example: #123...:5 -> 123...
        let eventId = tx.txHash;
        if (eventId.startsWith('#')) {
            eventId = eventId.substring(1);
        }
        const colonIndex = eventId.indexOf(':');
        if (colonIndex !== -1) {
            eventId = eventId.substring(0, colonIndex);
        }

        const url = `https://lighthouse.fivenorth.io/transactions/${eventId}`;
        window.open(url, '_blank');
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700/50">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Activity</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Transaction History</p>
                </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 p-4 overflow-y-auto">
                {storeLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin w-6 h-6 border-2 border-tiva-500 border-t-transparent rounded-full" />
                    </div>
                ) : mappedTransactions.length === 0 ? (
                    <EmptyState
                        icon={<Clock className="w-12 h-12" />}
                        title="No Transactions Yet"
                        description="Your transaction history will appear here"
                    />
                ) : (
                    <div className="space-y-3">
                        {mappedTransactions.map((tx) => (
                            <Card
                                key={tx.id}
                                onClick={() => handleTransactionClick(tx)}
                                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'send'
                                    ? 'bg-red-500/10 dark:bg-red-500/20'
                                    : 'bg-green-500/10 dark:bg-green-500/20'
                                    }`}>
                                    {tx.type === 'send'
                                        ? <ArrowUpRight className="w-5 h-5 text-red-500 dark:text-red-400" />
                                        : <ArrowDownLeft className="w-5 h-5 text-green-500 dark:text-green-400" />
                                    }
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {tx.type === 'send' ? 'Sent' : 'Received'}
                                        </p>
                                        <StatusIcon status={tx.status} />
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {tx.type === 'send' ? 'To: ' : 'From: '}
                                        {formatAddress(tx.address)}
                                    </p>
                                </div>

                                {/* Amount & Time */}
                                <div className="text-right">
                                    <p className={`text-sm font-medium ${tx.type === 'send' ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'
                                        }`}>
                                        {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.token}
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                        {formatDate(tx.timestamp)}
                                    </p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
