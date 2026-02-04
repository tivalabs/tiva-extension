import React, { useMemo } from 'react';
import { Wallet } from 'lucide-react';

interface WalletAvatarProps {
    address: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    showIcon?: boolean;
}

const COLORS = [
    ['#FFD700', '#FDB931'], // Gold - Light Gold
    ['#C0C0C0', '#E3E3E3'], // Silver - Light Silver
    ['#A38900', '#D4B200'], // Dark Gold - Gold
    ['#404040', '#606060'], // Dark Silver - Silver
    ['#0B0C15', '#1a1d26'], // Midnight - Dark Grey
    ['#FFEC4D', '#FFF0C2'], // Pale Gold
    ['#808080', '#A0A0A0'], // Mid Silver
    ['#524500', '#7a6700'], // Deep Brown/Gold
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
