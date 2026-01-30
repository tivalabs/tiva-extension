/**
 * Receive Page - Display address and QR code
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Card } from '../../../ui';
import { usePopupStore } from '../store';

export function ReceivePage() {
    const navigate = useNavigate();
    const { currentAccount } = usePopupStore();
    const [copied, setCopied] = useState(false);
    const [copiedSecondary, setCopiedSecondary] = useState(false);

    // Primary address: Party ID if available, otherwise public key
    const primaryAddress = currentAccount?.partyId || currentAccount?.publicKey || '';
    const hasPartyId = !!currentAccount?.partyId;
    const publicKey = currentAccount?.publicKey || '';

    const handleCopy = async () => {
        await navigator.clipboard.writeText(primaryAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopySecondary = async () => {
        await navigator.clipboard.writeText(publicKey);
        setCopiedSecondary(true);
        setTimeout(() => setCopiedSecondary(false), 2000);
    };

    return (
        <div className="flex flex-col min-h-full p-4 bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Receive</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Share your address</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center animate-in">
                {/* Account Name */}
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {currentAccount?.name || 'Account 1'}
                </p>

                {/* QR Code */}
                <Card className="mb-6 p-6">
                    <div className="bg-white rounded-xl p-4 mx-auto w-fit">
                        <QRCodeSVG
                            value={primaryAddress || 'no-address'}
                            size={160}
                            level="M"
                            bgColor="#ffffff"
                            fgColor="#0f172a"
                        />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
                        Scan to receive funds
                    </p>
                </Card>

                {/* Party ID / Primary Address */}
                <Card className="w-full mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {hasPartyId ? 'Your Party ID' : 'Your Address'}
                        </p>
                        <button
                            onClick={handleCopy}
                            className="text-xs text-canton-500 hover:text-canton-600 dark:text-canton-400 dark:hover:text-canton-300"
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-transparent">
                        <code className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all leading-relaxed">
                            {primaryAddress}
                        </code>
                    </div>
                </Card>

                {/* Public Key (shown as secondary if Party ID exists) */}
                {/* {hasPartyId && (
                    <Card className="w-full mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Public Key</p>
                            <button
                                onClick={handleCopySecondary}
                                className="text-xs text-canton-500 hover:text-canton-600 dark:text-canton-400 dark:hover:text-canton-300"
                            >
                                {copiedSecondary ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-transparent">
                            <code className="text-xs font-mono text-slate-500 dark:text-slate-400 break-all leading-relaxed">
                                {publicKey}
                            </code>
                        </div>
                    </Card>
                )} */}

                {/* Copy Button */}
                <Button
                    onClick={handleCopy}
                    variant={copied ? 'secondary' : 'primary'}
                    className="w-full"
                >
                    {copied ? (
                        <>
                            <Check className="w-4 h-4" />
                            Copied!
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4" />
                            Copy {hasPartyId ? 'Party ID' : 'Address'}
                        </>
                    )}
                </Button>

                {/* Info */}
                <p className="text-xs text-slate-500 dark:text-slate-500 text-center mt-4">
                    Only send Canton Network assets to this address
                </p>
            </div>
        </div>
    );
}
