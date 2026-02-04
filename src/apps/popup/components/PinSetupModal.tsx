import React, { useState } from 'react';
import { Modal, Input, Button } from '../../../ui';
import { usePopupStore } from '../store';

interface PinSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    mode?: 'create' | 'change';
}

export function PinSetupModal({ isOpen, onClose, onSuccess, mode = 'create' }: PinSetupModalProps) {
    const { setPin, verifyPin, hasPin } = usePopupStore();

    const [inputPin, setInputPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [currentPin, setCurrentPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleClose = () => {
        setInputPin('');
        setConfirmPin('');
        setCurrentPin('');
        setError('');
        onClose();
    };

    const handleSubmit = async () => {
        setError('');
        setLoading(true);

        try {
            if (mode === 'create') {
                if (inputPin.length < 4) {
                    setError('PIN must be at least 4 digits');
                    setLoading(false);
                    return;
                }
                if (inputPin !== confirmPin) {
                    setError('PINs do not match');
                    setLoading(false);
                    return;
                }

                await setPin(inputPin);
                handleClose();
                if (onSuccess) onSuccess();

            } else if (mode === 'change') {
                if (inputPin.length < 4) {
                    setError('New PIN must be at least 4 digits');
                    setLoading(false);
                    return;
                }
                if (inputPin !== confirmPin) {
                    setError('PINs do not match');
                    setLoading(false);
                    return;
                }

                // Verify current PIN
                try {
                    await verifyPin(currentPin);
                } catch (e) {
                    setError('Current PIN is incorrect');
                    setLoading(false);
                    return;
                }

                await setPin(inputPin);
                handleClose();
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to set PIN');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={mode === 'create' ? 'Set PIN' : 'Change PIN'}
        >
            <div>
                {mode === 'create' && (
                    <p className="text-sm text-slate-400 mb-4">
                        Set a PIN to protect your wallet and enable auto-lock features.
                    </p>
                )}

                {mode === 'change' && (
                    <div className="mb-4">
                        <Input
                            type="password"
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value)}
                            placeholder="Current PIN"
                            className="mb-2"
                            autoFocus
                        />
                    </div>
                )}

                <div className="space-y-4">
                    <Input
                        type="password"
                        value={inputPin}
                        onChange={(e) => setInputPin(e.target.value)}
                        placeholder={mode === 'change' ? "New PIN" : "Enter PIN"}
                        autoFocus={mode === 'create'}
                    />
                    <Input
                        type="password"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        placeholder="Confirm PIN"
                    />

                    {error && (
                        <p className="text-xs text-red-500 font-medium mt-1">{error}</p>
                    )}
                </div>

                <Button
                    onClick={handleSubmit}
                    loading={loading}
                    className="w-full mt-6"
                >
                    {mode === 'create' ? 'Set PIN' : 'Update PIN'}
                </Button>
            </div>
        </Modal>
    );
}
