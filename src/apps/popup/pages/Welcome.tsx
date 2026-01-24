/**
 * Welcome Page - Create or Import Wallet
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download } from 'lucide-react';
import { Logo, Card } from '../../../ui';

export function WelcomePage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col min-h-screen p-6 animate-in">
            {/* Logo and Title */}
            <div className="text-center pt-8 pb-10">
                <div className="flex justify-center mb-4">
                    <Logo size="lg" />
                </div>
                <h1 className="text-2xl font-bold gradient-text mb-2">CantonLink</h1>
                <p className="text-slate-400 text-sm">
                    Your gateway to the Canton Network
                </p>
            </div>

            {/* Options */}
            <div className="w-full space-y-3 flex-1">
                <Card
                    hover
                    onClick={() => navigate('/create')}
                    className="flex items-center gap-4 cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-canton-500 to-canton-700 flex items-center justify-center">
                        <Plus className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-white">Create New Wallet</h3>
                        <p className="text-sm text-slate-400">Generate a new mnemonic phrase</p>
                    </div>
                </Card>

                <Card
                    hover
                    onClick={() => navigate('/import')}
                    className="flex items-center gap-4 cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center">
                        <Download className="w-6 h-6 text-slate-300" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-white">Import Existing Wallet</h3>
                        <p className="text-sm text-slate-400">Restore with mnemonic phrase</p>
                    </div>
                </Card>
            </div>

            {/* Footer */}
            <p className="text-xs text-slate-500 py-4 text-center">
                By continuing, you agree to our Terms of Service
            </p>
        </div>
    );
}
