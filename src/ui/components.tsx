/**
 * Shared UI Components
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    children: React.ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    children,
    className = '',
    ...props
}: ButtonProps) {
    const variants = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        ghost: 'bg-transparent hover:bg-slate-700 text-slate-300',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2.5 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    return (
        <button
            disabled={disabled || loading}
            className={`${variants[variant]} ${sizes[size]} rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
            {...props}
        >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {children}
        </button>
    );
}

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export function Input({
    label,
    error,
    icon,
    rightIcon,
    className = '',
    ...props
}: InputProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-10">
                        {icon}
                    </div>
                )}
                <input
                    className={`input-field ${icon ? '!pl-12' : ''} ${rightIcon ? '!pr-12' : ''} ${error ? 'border-red-500' : ''} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${className}`}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-10">
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
        </div>
    );
}

// Card Component
interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={`glass-card p-4 ${hover ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors' : ''} ${className}`}
        >
            {children}
        </div>
    );
}

// Logo Component
export function Logo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) {
    const sizes = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
    };

    return (
        <div className={`${sizes[size]} rounded-2xl bg-gradient-to-br from-canton-400 to-canton-600 flex items-center justify-center shadow-lg ${className}`}>
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-2/3 h-2/3"
            >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
            </svg>
        </div>
    );
}

// Spinner Component
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
    };

    return (
        <Loader2 className={`${sizes[size]} animate-spin text-canton-500 dark:text-canton-400`} />
    );
}

// Loading Screen
export function LoadingScreen({ message }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
            <Spinner size="lg" />
            {message && <p className="text-slate-600 dark:text-slate-400">{message}</p>}
        </div>
    );
}

// Copy Button
interface CopyButtonProps {
    text: string;
    onCopy?: () => void;
}

export function CopyButton({ text, onCopy }: CopyButtonProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        onCopy?.();
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            title={copied ? 'Copied!' : 'Copy'}
        >
            {copied ? (
                <svg className="w-4 h-4 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )}
        </button>
    );
}

// Address Display
interface AddressDisplayProps {
    address: string;
    truncate?: boolean;
}

export function AddressDisplay({ address, truncate = true }: AddressDisplayProps) {
    const displayAddress = truncate
        ? `${address.slice(0, 8)}...${address.slice(-6)}`
        : address;

    return (
        <div className="flex items-center gap-2">
            <code className="font-mono text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-transparent px-1 rounded">{displayAddress}</code>
            <CopyButton text={address} />
        </div>
    );
}

// Modal Component
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative glass-card p-6 max-w-sm w-full mx-4 animate-in bg-white dark:bg-slate-900">
                {title && (
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{title}</h2>
                )}
                {children}
            </div>
        </div>
    );
}

// Word Chip (for mnemonic display)
interface WordChipProps {
    index: number;
    word: string;
    hidden?: boolean;
}

export function WordChip({ index, word, hidden = false }: WordChipProps) {
    return (
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-transparent">
            <span className="text-xs text-slate-500 w-5">{index}.</span>
            <span className={`font-mono text-sm text-slate-900 dark:text-slate-200 ${hidden ? 'blur-sm' : ''}`}>
                {word}
            </span>
        </div>
    );
}

// Empty State
interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            {icon && <div className="text-slate-400 dark:text-slate-500 mb-3">{icon}</div>}
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">{title}</h3>
            {description && <p className="text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
