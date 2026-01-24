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
    const { currentAccount } = usePopupStore();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // TODO: Fetch actual transactions from Canton ledger
        // For now, use mock data
        setTimeout(() => {
            setTransactions([
                // Mock transactions for UI demonstration
                // In production, this would fetch from the ledger
            ]);
            setLoading(false);
        }, 500);
    }, [currentAccount]);

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

    return (
        <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
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
            <div className="flex-1 p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin w-6 h-6 border-2 border-canton-500 border-t-transparent rounded-full" />
                    </div>
                ) : transactions.length === 0 ? (
                    <EmptyState
                        icon={<Clock className="w-12 h-12" />}
                        title="No Transactions Yet"
                        description="Your transaction history will appear here"
                    />
                ) : (
                    <div className="space-y-3">
                        {transactions.map((tx) => (
                            <Card key={tx.id} className="flex items-center gap-3">
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
