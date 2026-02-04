/**
 * Contracts Page - Active Contract Viewer
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileCode, RefreshCw, Search } from 'lucide-react';
import { Card, EmptyState, Input } from '../../../ui';

export function ContractsPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col min-h-full bg-slate-50 dark:bg-midnight-500 transition-colors duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700/50">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Active Contracts</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Daml contracts on the ledger</p>
                </div>
                <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                    <RefreshCw className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
            </div>

            {/* Search */}
            <div className="p-4">
                <Input
                    placeholder="Search by template..."
                    icon={<Search className="w-4 h-4" />}
                />
            </div>

            {/* Contract List */}
            <div className="flex-1 px-4 pb-4">
                <EmptyState
                    icon={<FileCode className="w-12 h-12" />}
                    title="No Active Contracts"
                    description="Connect to a Canton node to view your active contracts"
                />
            </div>
        </div>
    );
}
