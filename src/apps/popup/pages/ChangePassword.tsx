/**
 * Change Password Page
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Check, Shield } from 'lucide-react';
import { Button, Input, Card } from '../../../ui';
import { usePopupStore } from '../store';

export function ChangePasswordPage() {
    const navigate = useNavigate();
    const { sendMessage } = usePopupStore();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        // Validation
        if (!currentPassword) {
            setError('Current password is required');
            return;
        }

        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (currentPassword === newPassword) {
            setError('New password must be different from current password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await sendMessage('changePassword', {
                oldPassword: currentPassword,
                newPassword,
            });
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col min-h-full p-4">
                <div className="flex-1 flex flex-col items-center justify-center animate-in">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-green-400" />
                    </div>

                    <h2 className="text-xl font-semibold text-white mb-2">
                        Password Changed!
                    </h2>
                    <p className="text-sm text-slate-400 text-center mb-6">
                        Your wallet password has been updated successfully.
                    </p>

                    <Button onClick={() => navigate('/settings')} className="w-full">
                        Done
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => navigate('/settings')}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-white">Change Password</h1>
                    <p className="text-xs text-slate-400">Update your wallet password</p>
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 flex flex-col animate-in">
                <div className="flex-1 space-y-4">
                    <Input
                        label="Current Password"
                        type={showPasswords ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        rightIcon={
                            <button
                                type="button"
                                onClick={() => setShowPasswords(!showPasswords)}
                                className="text-slate-500 hover:text-white"
                            >
                                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        }
                    />

                    <Input
                        label="New Password"
                        type={showPasswords ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                    />

                    <Input
                        label="Confirm New Password"
                        type={showPasswords ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                    />

                    {error && (
                        <p className="text-sm text-red-400">{error}</p>
                    )}

                    {/* Security Note */}
                    <Card className="bg-slate-800/50">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-tiva-400 flex-shrink-0" />
                            <p className="text-xs text-slate-400">
                                Your password encrypts your recovery phrase. Make sure to use a strong, unique password.
                            </p>
                        </div>
                    </Card>
                </div>

                <Button
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={!currentPassword || !newPassword || !confirmPassword}
                    className="w-full mt-4"
                >
                    Update Password
                </Button>
            </div>
        </div>
    );
}
