import React, { useMemo } from 'react';
import { Wallet } from 'lucide-react';

interface WalletAvatarProps {
    address: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    showIcon?: boolean;
}

const COLORS = [
    ['#F44336', '#E91E63'], // Red - Pink
    ['#9C27B0', '#673AB7'], // Purple - Deep Purple
    ['#3F51B5', '#2196F3'], // Indigo - Blue
    ['#03A9F4', '#00BCD4'], // Light Blue - Cyan
    ['#009688', '#4CAF50'], // Teal - Green
    ['#8BC34A', '#CDDC39'], // Light Green - Lime
    ['#FFC107', '#FF9800'], // Amber - Orange
    ['#FF5722', '#795548'], // Deep Orange - Brown
    ['#ec4899', '#8b5cf6'], // Pink - Violet (Modern)
    ['#10b981', '#3b82f6'], // Emerald - Blue (Modern)
    ['#f59e0b', '#ef4444'], // Amber - Red (Modern)
    ['#6366f1', '#a855f7'], // Indigo - Purple (Modern)
];

const SIZES = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
};

const ICON_SIZES = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
};

export function WalletAvatar({ address, size = 'md', className = '', showIcon = true }: WalletAvatarProps) {
    const gradient = useMemo(() => {
        const defaultColor = ['#94a3b8', '#64748b'];
        if (!address) return COLORS[0] || defaultColor;

        let hash = 0;
        for (let i = 0; i < address.length; i++) {
            hash = address.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % COLORS.length;
        return COLORS[index] || COLORS[0] || defaultColor;
    }, [address]);

    const c1 = gradient[0];
    const c2 = gradient[1];

    return (
        <div
            className={`${SIZES[size]} rounded-full flex items-center justify-center shadow-inner ${className}`}
            style={{
                background: `linear-gradient(135deg, ${c1}, ${c2})`
            }}
        >
            {showIcon && (
                <Wallet className={`${ICON_SIZES[size]} text-white opacity-90`} />
            )}
        </div>
    );
}
