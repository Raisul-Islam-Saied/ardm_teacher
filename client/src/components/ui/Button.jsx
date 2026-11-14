/**
 * ARDM Enterprise ERP — Reusable Royal Button Component
 * Supports Emerald, Gold, Danger, Outline, Ghost variants + Loading spinner + Icons
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@utils/cn';

const VARIANT_STYLES = {
    emerald:
        'bg-gradient-to-r from-emerald to-emerald-deep text-white shadow-emerald-glow hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0',
    gold:
        'bg-gradient-to-r from-gold to-gold-deep text-[#2A2005] font-bold shadow-sm hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
    outline:
        'border-1.5 border-emerald/30 bg-transparent text-emerald-deep hover:bg-emerald-subtle hover:border-emerald',
    paper:
        'border border-ink-faint bg-paper hover:bg-paper-deep text-ink-soft hover:text-ink',
    ghost:
        'bg-transparent text-ink-soft hover:text-ink hover:bg-ink-faint/40',
    danger:
        'bg-gradient-to-r from-danger to-danger-deep text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md active:translate-y-0'
};

const SIZE_STYLES = {
    xs: 'px-3 py-1.5 text-xs gap-1.5',
    sm: 'px-4 py-2 text-xs gap-1.5',
    md: 'px-6 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5'
};

export const Button = React.forwardRef(function Button(
    {
        children,
        variant = 'emerald',
        size = 'md',
        pill = true,
        fullWidth = false,
        isLoading = false,
        loadingText = 'অপেক্ষা করুন...',
        leftIcon: LeftIcon = null,
        rightIcon: RightIcon = null,
        disabled = false,
        type = 'button',
        className = '',
        ...props
    },
    ref
) {
    const isDisabled = disabled || isLoading;

    return (
        <button
            ref={ref}
            type={type}
            disabled={isDisabled}
            className={cn(
                'inline-flex items-center justify-center font-sans font-semibold transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-gold',
                pill ? 'rounded-full' : 'rounded-xl',
                VARIANT_STYLES[variant] || VARIANT_STYLES.emerald,
                SIZE_STYLES[size] || SIZE_STYLES.md,
                fullWidth && 'w-full',
                isDisabled && 'opacity-55 cursor-not-allowed transform-none shadow-none hover:translate-y-0',
                className
            )}
            {...props}
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span className="font-bengali">{loadingText}</span>
                </>
            ) : (
                <>
                    {LeftIcon && <LeftIcon className="w-4 h-4 shrink-0" />}
                    <span>{children}</span>
                    {RightIcon && <RightIcon className="w-4 h-4 shrink-0" />}
                </>
            )}
        </button>
    );
});

export default Button;
