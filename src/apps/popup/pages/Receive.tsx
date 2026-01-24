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

    const address = currentAccount?.publicKey || '';

    const handleCopy = async () => {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col min-h-full p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-white">Receive</h1>
                    <p className="text-xs text-slate-400">Share your address</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center animate-in">
                {/* Account Name */}
                <p className="text-sm text-slate-400 mb-4">
                    {currentAccount?.name || 'Account 1'}
                </p>

                {/* QR Code */}
                <Card className="mb-6 p-6">
                    <div className="bg-white rounded-xl p-4 mx-auto w-fit">
                        <QRCodeSVG
                            value={address || 'no-address'}
                            size={160}
                            level="M"
                            bgColor="#ffffff"
                            fgColor="#0f172a"
                        />
                    </div>
                    <p className="text-xs text-slate-400 text-center mt-4">
                        Scan to receive funds
                    </p>
                </Card>

                {/* Address */}
                <Card className="w-full mb-4">
                    <p className="text-xs text-slate-400 mb-2">Your Address</p>
                    <div className="bg-slate-800 rounded-lg p-3">
                        <code className="text-xs font-mono text-slate-300 break-all leading-relaxed">
                            {address}
                        </code>
                    </div>
                </Card>

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
                            Copy Address
                        </>
                    )}
                </Button>

                {/* Info */}
                <p className="text-xs text-slate-500 text-center mt-4">
                    Only send Canton Network assets to this address
                </p>
            </div>
        </div>
    );
}
