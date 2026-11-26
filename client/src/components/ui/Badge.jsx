/**
 * ARDM Enterprise ERP — Semantic Status & Seniority Rank Badge
 * Used for attendance status, payroll labels, and rank indicators.
 */

import React from 'react';
import { cn } from '@utils/cn';

const BADGE_VARIANTS = {
    emerald: 'bg-emerald text-white border-emerald',
    'emerald-subtle': 'bg-emerald-subtle text-emerald-deep border-emerald-border',
    gold: 'bg-gold-subtle text-[#5E450B] border-gold/40',
    success: 'bg-success-bg text-success border-success-border',
    danger: 'bg-danger-bg text-danger border-danger-border',
    warning: 'bg-warning-bg text-warning-deep border-warning-border',
    info: 'bg-info-bg text-info border-info-border',
    neutral: 'bg-paper-deep text-ink-soft border-ink-faint'
};

const DOT_COLORS = {
    emerald: 'bg-gold-soft',
    'emerald-subtle': 'bg-emerald',
    gold: 'bg-gold-deep',
    success: 'bg-success',
    danger: 'bg-danger',
    warning: 'bg-warning',
    info: 'bg-info',
    neutral: 'bg-ink-muted'
};

export function Badge({
    children,
    variant = 'emerald-subtle',
    size = 'md', // 'sm' | 'md' | 'lg'
    dot = false,
    mono = false,
    className = ''
}) {
    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[10.5px]',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3.5 py-1 text-xs'
    };

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide select-none',
                mono ? 'font-mono' : 'font-bengali',
                BADGE_VARIANTS[variant] || BADGE_VARIANTS['emerald-subtle'],
                sizeClasses[size] || sizeClasses.md,
                className
            )}
        >
            {dot && (
                <span
                    className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        DOT_COLORS[variant] || DOT_COLORS['emerald-subtle']
                    )}
                />
            )}
            {children}
        </span>
    );
}

/**
 * হাজিরার স্ট্যাটাস অনুযায়ী অটোমেটিক সঠিক রঙের ব্যাজ রিটার্ন করার হেল্পার কম্পোনেন্ট
 */
export function AttendanceStatusBadge({ status, isIgnored = false }) {
    if (isIgnored) {
        return <Badge variant="neutral" dot>Ignored (মওকুফ দিন)</Badge>;
    }

    const map = {
        'Present': { variant: 'success', label: 'Present (উপস্থিত)' },
        'Late (Excused)': { variant: 'info', label: 'Late Excused (অনুমোদিত দেরি)' },
        'Official Duty': { variant: 'info', label: 'Official Duty (মাদ্রাসার কাজে)' },
        'Holiday Duty': { variant: 'gold', label: 'Holiday Duty' },
        'Late': { variant: 'warning', label: 'Late (বিলম্ব - ০.৫ কোটা)' },
        'Leave': { variant: 'gold', label: 'Leave (ছুটি - ১.০ কোটা)' },
        'Approved Casual Leave': { variant: 'emerald-subtle', label: 'Approved Casual Leave' },
        'Approved Sick Leave': { variant: 'emerald-subtle', label: 'Approved Sick Leave' },
        'Absent': { variant: 'danger', label: 'Absent (অনুপস্থিত - বেতন কর্তন)' }
    };

    const current = map[status] || { variant: 'neutral', label: status || 'Not Punched' };
    return (
        <Badge variant={current.variant} dot>
            {current.label}
        </Badge>
    );
}

export default Badge;
