/**
 * ARDM Enterprise ERP — Step 5: Core Atomic UI Component Library & Global Toast System
 * Run from D:\ardm_teacher: node setup_step5_uikit.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧱 Initializing Step 5: Atomic UI Component Library (Inputs, Selects, Modals, Toasts, Badges, Skeletons)...\n');

const clientDir = fs.existsSync(path.join(__dirname, 'src'))
    ? __dirname
    : path.join(__dirname, 'client');

if (!fs.existsSync(clientDir)) {
    console.error('❌ Error: client directory not found!');
    process.exit(1);
}

const files = {
    // =========================================================================
    // 1. UTILITY FOR CLASSNAME MERGING (src/utils/cn.js)
    // =========================================================================
    'src/utils/cn.js': `import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind ক্লাসগুলোকে কোনো কনফ্লিক্ট ছাড়া মার্জ করার ইউটিলিটি
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default cn;`,

    // =========================================================================
    // 2. ENTERPRISE BUTTON COMPONENT (src/components/ui/Button.jsx)
    // =========================================================================
    'src/components/ui/Button.jsx': `/**
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

export default Button;`,

    // =========================================================================
    // 3. DUAL-MODE FORM INPUT COMPONENT (src/components/ui/FormInput.jsx)
    // =========================================================================
    'src/components/ui/FormInput.jsx': `/**
 * ARDM Enterprise ERP — Military-Grade Form Input Component
 * Supports:
 * - variant="ledger" (Classic underlined ledger style for Registration Form)
 * - variant="erp" (Boxed modern input for Admin Dashboard, Filters & Payroll)
 * - Bilingual labels (English + Bengali)
 * - Password visibility toggle (Show/Hide)
 * - Shake animation on validation error + Success check indicator
 */

import React, { useState, useId } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@utils/cn';

export const FormInput = React.forwardRef(function FormInput(
    {
        labelEng = '',
        labelBng = '',
        name,
        type = 'text',
        value,
        onChange,
        onBlur,
        placeholder = '',
        required = false,
        disabled = false,
        readOnly = false,
        error = '',
        isValid = false,
        showValidIcon = false,
        hint = '',
        variant = 'ledger', // 'ledger' | 'erp'
        isBengaliText = false,
        isMonoText = false,
        leftIcon: LeftIcon = null,
        rightElement = null,
        containerClassName = '',
        inputClassName = '',
        ...props
    },
    ref
) {
    const generatedId = useId();
    const inputId = props.id || \`field-\${name || generatedId}\`;
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordType = type === 'password';
    const effectiveType = isPasswordType ? (showPassword ? 'text' : 'password') : type;
    const hasError = Boolean(error);

    return (
        <div className={cn('relative mb-5', containerClassName)} data-field={name}>
            {/* ১. দ্বিভাষিক লেবেল (ইংরেজি + বাংলা) */}
            {(labelEng || labelBng) && (
                <label
                    htmlFor={inputId}
                    className="block text-xs font-semibold tracking-wider text-ink-soft mb-1.5 select-none"
                >
                    {labelEng && <span className="uppercase">{labelEng}</span>}
                    {labelEng && labelBng && <span className="mx-1.5 text-ink-muted">·</span>}
                    {labelBng && <span className="font-bengali text-[13px] text-ink">{labelBng}</span>}
                    {required && <span className="text-gold ml-1 font-bold" title="বাধ্যতামূলক">*</span>}
                </label>
            )}

            {/* ২. ইনপুট র‍্যাপার */}
            <div className="relative flex items-center">
                {LeftIcon && (
                    <span
                        className={cn(
                            variant === 'erp' ? 'left-3.5' : 'left-0.5',
                            'absolute pointer-events-none text-ink-muted transition-colors',
                            hasError && 'text-danger',
                            !hasError && isValid && 'text-success'
                        )}
                    >
                        <LeftIcon className="w-4 h-4" />
                    </span>
                )}

                <input
                    ref={ref}
                    id={inputId}
                    name={name}
                    type={effectiveType}
                    value={value ?? ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    disabled={disabled}
                    readOnly={readOnly}
                    placeholder={placeholder}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? \`\${inputId}-error\` : undefined}
                    className={cn(
                        variant === 'ledger' ? 'ledger-input' : 'erp-input',
                        isBengaliText && 'font-bengali text-[16px]',
                        isMonoText && 'font-mono tracking-wide',
                        LeftIcon && (variant === 'erp' ? 'pl-10' : 'pl-6'),
                        (isPasswordType || rightElement || (showValidIcon && isValid)) && 'pr-9',
                        hasError && (variant === 'ledger' ? 'ledger-input-error' : 'erp-input-error'),
                        disabled && 'opacity-60 cursor-not-allowed bg-paper-deep/50',
                        readOnly && 'bg-emerald-subtle/50 cursor-default',
                        inputClassName
                    )}
                    {...props}
                />

                {/* পাসওয়ার্ড শো/হাইড বাটন */}
                {isPasswordType && (
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 p-1 text-ink-muted hover:text-emerald transition-colors"
                        title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                )}

                {/* ভ্যালিড হলে সবুজ টিক চিহ্ন */}
                {!isPasswordType && !rightElement && showValidIcon && isValid && !hasError && (
                    <span className="absolute right-2 pointer-events-none text-success animate-pop-in">
                        <CheckCircle2 className="w-4 h-4" />
                    </span>
                )}

                {/* কাস্টম ডান পাশের এলিমেন্ট (যেমন: টাকা বা পার্সেন্ট চিহ্ন) */}
                {!isPasswordType && rightElement && (
                    <div className="absolute right-2 flex items-center">{rightElement}</div>
                )}
            </div>

            {/* ৩. এরর মেসেজ (Shake অ্যানিমেশনসহ) অথবা হিন্ট টেক্সট */}
            {hasError ? (
                <p
                    id={\`\${inputId}-error\`}
                    role="alert"
                    className="mt-1.5 text-xs text-danger font-bengali font-medium flex items-start gap-1.5 animate-shake"
                >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </p>
            ) : hint ? (
                <p className="mt-1 text-[11.5px] text-ink-soft/80 font-bengali">{hint}</p>
            ) : null}
        </div>
    );
});

export default FormInput;`,

    // =========================================================================
    // 4. DUAL-MODE FORM SELECT DROPDOWN (src/components/ui/FormSelect.jsx)
    // =========================================================================
    'src/components/ui/FormSelect.jsx': `/**
 * ARDM Enterprise ERP — Reusable Select Dropdown Component
 * Supports both "ledger" (underlined) and "erp" (boxed) styles with bilingual labels.
 */

import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@utils/cn';

export const FormSelect = React.forwardRef(function FormSelect(
    {
        labelEng = '',
        labelBng = '',
        name,
        value,
        onChange,
        onBlur,
        options = [], // [{ value: '...', label: '...' }] or strings
        placeholder = 'নির্বাচন করুন (Select)',
        required = false,
        disabled = false,
        error = '',
        hint = '',
        variant = 'ledger', // 'ledger' | 'erp'
        isBengaliText = true,
        containerClassName = '',
        selectClassName = '',
        ...props
    },
    ref
) {
    const generatedId = useId();
    const selectId = props.id || \`select-\${name || generatedId}\`;
    const hasError = Boolean(error);

    return (
        <div className={cn('relative mb-5', containerClassName)} data-field={name}>
            {(labelEng || labelBng) && (
                <label
                    htmlFor={selectId}
                    className="block text-xs font-semibold tracking-wider text-ink-soft mb-1.5 select-none"
                >
                    {labelEng && <span className="uppercase">{labelEng}</span>}
                    {labelEng && labelBng && <span className="mx-1.5 text-ink-muted">·</span>}
                    {labelBng && <span className="font-bengali text-[13px] text-ink">{labelBng}</span>}
                    {required && <span className="text-gold ml-1 font-bold">*</span>}
                </label>
            )}

            <div className="relative">
                <select
                    ref={ref}
                    id={selectId}
                    name={name}
                    value={value ?? ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    disabled={disabled}
                    aria-invalid={hasError}
                    className={cn(
                        variant === 'ledger' ? 'ledger-input' : 'erp-input',
                        'custom-select-arrow',
                        isBengaliText && 'font-bengali text-[15px]',
                        !value && 'text-ink-muted',
                        hasError && (variant === 'ledger' ? 'ledger-input-error' : 'erp-input-error'),
                        disabled && 'opacity-60 cursor-not-allowed bg-paper-deep/50',
                        selectClassName
                    )}
                    {...props}
                >
                    {placeholder !== false && (
                        <option value="" className="text-ink-muted">
                            {placeholder}
                        </option>
                    )}

                    {options.map((opt, idx) => {
                        const optValue = typeof opt === 'object' ? opt.value : opt;
                        const optLabel = typeof opt === 'object' ? opt.label : opt;
                        const optDisabled = typeof opt === 'object' ? opt.disabled : false;

                        return (
                            <option
                                key={\`\${optValue}-\${idx}\`}
                                value={optValue}
                                disabled={optDisabled}
                                className="text-ink bg-paper-panel py-1"
                            >
                                {optLabel}
                            </option>
                        );
                    })}
                </select>
            </div>

            {hasError ? (
                <p
                    role="alert"
                    className="mt-1.5 text-xs text-danger font-bengali font-medium flex items-start gap-1.5 animate-shake"
                >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </p>
            ) : hint ? (
                <p className="mt-1 text-[11.5px] text-ink-soft/80 font-bengali">{hint}</p>
            ) : null}
        </div>
    );
});

export default FormSelect;`,

    // =========================================================================
    // 5. STATUS & RANK BADGE COMPONENT (src/components/ui/Badge.jsx)
    // =========================================================================
    'src/components/ui/Badge.jsx': `/**
 * ARDM Enterprise ERP — Semantic Status & Seniority Rank Badge
 * Used for Attendance Status (Present/Late/Leave/Absent), Payroll Status (Paid/Cash), and Rank (#1)
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

export default Badge;`,

    // =========================================================================
    // 6. ACCESSIBLE MODAL & CONFIRMATION DIALOG (src/components/ui/Modal.jsx)
    // =========================================================================
    'src/components/ui/Modal.jsx': `/**
 * ARDM Enterprise ERP — Accessible Modal & Confirmation Dialog
 * Features: ESC key close, Backdrop click control, Body scroll lock, Top Royal Ribbon
 */

import React, { useEffect } from 'react';
import { X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@utils/cn';
import Button from './Button';

const MODAL_SIZES = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
};

export function Modal({
    isOpen,
    onClose,
    titleBng = '',
    titleEng = '',
    subtitleBng = '',
    size = 'md',
    closeOnBackdrop = true,
    showCloseButton = true,
    footer = null,
    children
}) {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && onClose) {
                onClose();
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-emerald-deep/60 backdrop-blur-xs animate-fade-down"
            onClick={(e) => {
                if (closeOnBackdrop && e.target === e.currentTarget && onClose) {
                    onClose();
                }
            }}
        >
            <div
                className={cn(
                    'w-full ledger-surface bg-paper-panel text-ink shadow-ledger animate-pop-in my-auto max-h-[90vh] flex flex-col',
                    MODAL_SIZES[size] || MODAL_SIZES.md
                )}
            >
                {/* মডাল হেডার */}
                <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-ink-faint shrink-0">
                    <div>
                        {titleEng && (
                            <span className="block font-mono text-[11px] uppercase tracking-wider text-gold-deep font-bold">
                                {titleEng}
                            </span>
                        )}
                        {titleBng && (
                            <h3 className="font-bengali text-lg sm:text-xl font-bold text-emerald-deep mt-0.5">
                                {titleBng}
                            </h3>
                        )}
                        {subtitleBng && (
                            <p className="font-bengali text-xs text-ink-soft mt-1">{subtitleBng}</p>
                        )}
                    </div>

                    {showCloseButton && onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-full text-ink-muted hover:text-danger hover:bg-danger-bg transition-colors"
                            aria-label="Close modal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* মডাল বডি (স্ক্রলেবল) */}
                <div className="p-6 overflow-y-auto flex-1">{children}</div>

                {/* মডাল ফুটার */}
                {footer && (
                    <div className="px-6 py-4 bg-paper/80 border-t border-ink-faint flex flex-wrap items-center justify-end gap-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * যেকোনো সংবেদনশীল কাজের আগে (যেমন: বেতন অনুমোদন, স্ট্যাটাস পরিবর্তন) নিশ্চিতকরণ ডায়ালগ
 */
export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    titleBng = 'আপনি কি নিশ্চিত?',
    messageBng = 'এই কাজটি সম্পন্ন করার জন্য অনুগ্রহ করে নিশ্চিত করুন।',
    confirmText = 'হ্যাঁ, নিশ্চিত করুন',
    cancelText = 'বাতিল করুন',
    variant = 'emerald', // 'emerald' | 'danger' | 'gold'
    isLoading = false
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
            titleEng="Security Confirmation"
            titleBng={titleBng}
            footer={
                <>
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
                        <span className="font-bengali">{cancelText}</span>
                    </Button>
                    <Button
                        variant={variant}
                        size="sm"
                        onClick={onConfirm}
                        isLoading={isLoading}
                    >
                        <span className="font-bengali">{confirmText}</span>
                    </Button>
                </>
            }
        >
            <div className="flex items-start gap-4">
                <div
                    className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                        variant === 'danger' ? 'bg-danger-bg text-danger' : 'bg-emerald-subtle text-emerald'
                    )}
                >
                    {variant === 'danger' ? (
                        <AlertTriangle className="w-6 h-6" />
                    ) : (
                        <ShieldCheck className="w-6 h-6" />
                    )}
                </div>
                <p className="font-bengali text-sm text-ink-soft leading-relaxed pt-1">
                    {messageBng}
                </p>
            </div>
        </Modal>
    );
}

export default Modal;`,

    // =========================================================================
    // 7. SKELETON SHIMMER LOADERS (src/components/ui/Skeleton.jsx)
    // =========================================================================
    'src/components/ui/Skeleton.jsx': `/**
 * ARDM Enterprise ERP — Royal Paper Shimmer Skeletons
 * Prevents layout shift while fetching Teachers, Attendance or Payroll sheets.
 */

import React from 'react';
import { cn } from '@utils/cn';

export function Skeleton({ className = '' }) {
    return <div className={cn('skeleton-shimmer', className)} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
    return (
        <div className="w-full rounded-xl border border-ink-faint bg-paper-panel overflow-hidden">
            <div className="p-4 bg-paper-deep/60 border-b border-ink-faint grid gap-4" style={{ gridTemplateColumns: \`repeat(\${columns}, minmax(0, 1fr))\` }}>
                {Array.from({ length: columns }).map((_, idx) => (
                    <Skeleton key={idx} className="h-4 w-3/4" />
                ))}
            </div>
            <div className="divide-y divide-ink-faint">
                {Array.from({ length: rows }).map((_, rIdx) => (
                    <div
                        key={rIdx}
                        className="p-4 grid gap-4 items-center"
                        style={{ gridTemplateColumns: \`repeat(\${columns}, minmax(0, 1fr))\` }}
                    >
                        {Array.from({ length: columns }).map((__, cIdx) => (
                            <Skeleton key={cIdx} className="h-3.5 w-full" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Skeleton;`,

    // =========================================================================
    // 8. GLOBAL TOAST NOTIFICATION SYSTEM (src/context/ToastContext.jsx)
    // =========================================================================
    'src/context/ToastContext.jsx': `/**
 * ARDM Enterprise ERP — Global Toast Notification Context & Hook
 * Inspired by your original bottom-center toast, upgraded with multi-queue,
 * semantic icons (success, error, warning, info) and manual dismiss.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@utils/cn';

const ToastContext = createContext(null);

const TOAST_STYLES = {
    success: {
        bg: 'bg-emerald-deep text-white border-gold/50',
        icon: CheckCircle2,
        iconColor: 'text-gold-soft'
    },
    error: {
        bg: 'bg-danger text-white border-white/20',
        icon: AlertCircle,
        iconColor: 'text-white'
    },
    warning: {
        bg: 'bg-warning-deep text-white border-gold-soft/40',
        icon: AlertTriangle,
        iconColor: 'text-gold-soft'
    },
    info: {
        bg: 'bg-info text-white border-white/20',
        icon: Info,
        iconColor: 'text-gold-soft'
    }
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const showToast = useCallback((message, type = 'success', duration = 3800) => {
        const id = \`toast_\${Date.now()}_\${Math.random().toString(36).slice(2, 7)}\`;
        setToasts((prev) => [...prev.slice(-2), { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
        return id;
    }, [removeToast]);

    const toastApi = useMemo(() => ({
        show: showToast,
        success: (msg, duration) => showToast(msg, 'success', duration),
        error: (msg, duration) => showToast(msg, 'error', duration),
        warning: (msg, duration) => showToast(msg, 'warning', duration),
        info: (msg, duration) => showToast(msg, 'info', duration),
        dismiss: removeToast
    }), [showToast, removeToast]);

    return (
        <ToastContext.Provider value={toastApi}>
            {children}

            {/* ফ্লোটিং টোস্ট কন্টেইনার (Bottom-Center — Mobile & PC Friendly) */}
            <div
                aria-live="polite"
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex flex-col items-center gap-2.5 w-full max-w-md px-4 pointer-events-none no-print"
            >
                {toasts.map((item) => {
                    const cfg = TOAST_STYLES[item.type] || TOAST_STYLES.success;
                    const IconComponent = cfg.icon;

                    return (
                        <div
                            key={item.id}
                            role="status"
                            className={cn(
                                'pointer-events-auto w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-ledger animate-fade-up',
                                cfg.bg
                            )}
                        >
                            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bengali font-medium leading-snug">
                                <IconComponent className={cn('w-4 h-4 shrink-0', cfg.iconColor)} />
                                <span>{item.message}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeToast(item.id)}
                                className="p-1 rounded-lg hover:bg-white/15 transition-colors shrink-0"
                                aria-label="Close notification"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export default ToastProvider;`,

    // =========================================================================
    // 9. BARREL EXPORT FOR CLEAN IMPORTS (src/components/ui/index.js)
    // =========================================================================
    'src/components/ui/index.js': `export { Button } from './Button';
export { FormInput } from './FormInput';
export { FormSelect } from './FormSelect';
export { Badge, AttendanceStatusBadge } from './Badge';
export { Modal, ConfirmDialog } from './Modal';
export { Skeleton, TableSkeleton } from './Skeleton';`,

    // =========================================================================
    // 10. UPDATE main.jsx TO INCLUDE ToastProvider
    // =========================================================================
    'src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import GlobalErrorBoundary from '@components/shared/GlobalErrorBoundary.jsx';
import OfflineBanner from '@components/shared/OfflineBanner.jsx';
import { ToastProvider } from '@context/ToastContext.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GlobalErrorBoundary>
            <ToastProvider>
                <OfflineBanner />
                <App />
            </ToastProvider>
        </GlobalErrorBoundary>
    </React.StrictMode>
);`,

    // =========================================================================
    // 11. INTERACTIVE UI KIT SHOWCASE & VERIFICATION (src/App.jsx)
    // =========================================================================
    'src/App.jsx': `import React, { useState } from 'react';
import {
    Sparkles,
    UserCheck,
    Bell,
    Layers,
    Eye,
    Trash2,
    Send,
    Phone,
    Lock
} from 'lucide-react';
import { INSTITUTION_INFO, DESIGNATION_LIST, BLOOD_GROUPS } from '@constants/app.constants';
import {
    Button,
    FormInput,
    FormSelect,
    Badge,
    AttendanceStatusBadge,
    Modal,
    ConfirmDialog,
    TableSkeleton
} from '@components/ui';
import { useToast } from '@context/ToastContext';
import { validateBengaliName, validateMobileNumber } from '@utils/validators';

export default function App() {
    const toast = useToast();

    const [nameBn, setNameBn] = useState('মোঃ রায়সুল ইসলাম সাঈদ');
    const [phone, setPhone] = useState('01812345678');
    const [password, setPassword] = useState('1026030301');
    const [designation, setDesignation] = useState('Assistant Teacher');
    const [bloodGroup, setBloodGroup] = useState('O+');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [showSkeleton, setShowSkeleton] = useState(false);

    const nameCheck = validateBengaliName(nameBn, 'শিক্ষকের বাংলা নাম');
    const phoneCheck = validateMobileNumber(phone, 'মোবাইল নম্বর');

    const designationOptions = DESIGNATION_LIST.map((d) => ({
        value: d.titleEng,
        label: \`[Rank #\${d.rankPriority}] \${d.titleBng} — (\${d.titleEng})\`
    }));

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-8 animate-fade-down">
                    <div className="flex justify-center mb-2">
                        <div className="madrasah-crest">{INSTITUTION_INFO.crestLetterBng}</div>
                    </div>
                    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-emerald-deep">
                        {INSTITUTION_INFO.nameEng}
                    </h1>
                    <p className="font-bengali text-sm text-ink-soft mt-1">
                        ধাপ ৫ / ২৫ · কাস্টম অ্যাটমিক UI কম্পোনেন্ট লাইব্রেরি (পর্ব ১ সম্পন্ন!)
                    </p>
                </div>

                <div className="ledger-surface p-6 sm:p-8 animate-fade-up">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-ink-faint">
                        <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-subtle border border-emerald-border text-emerald text-xs font-mono font-bold uppercase">
                                <Sparkles className="w-3.5 h-3.5 text-gold-deep" />
                                Step 5 of 25: Core UI Kit 100% Ready
                            </span>
                            <h2 className="font-bengali text-xl font-bold text-emerald-deep mt-2">
                                কাস্টম ইনপুট, ড্রপডাউন, ব্যাজ, মডাল ও টোস্ট গ্যালারি
                            </h2>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="emerald"
                                size="sm"
                                leftIcon={Bell}
                                onClick={() => toast.success('মাশাআল্লাহ! টোস্ট নোটিফিকেশন সফলভাবে কাজ করছে।')}
                            >
                                সাকসেস টোস্ট
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => toast.error('ত্রুটি! জরুরি যোগাযোগের নম্বরটি ভিন্ন হতে হবে।')}
                            >
                                এরর টোস্ট
                            </Button>
                            <Button
                                variant="gold"
                                size="sm"
                                leftIcon={Layers}
                                onClick={() => setIsModalOpen(true)}
                            >
                                মডাল ওপেন করুন
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-6">
                        <FormInput
                            labelEng="Full Name (Bengali)"
                            labelBng="শিক্ষকের নাম (বাংলা)"
                            name="nameBn"
                            value={nameBn}
                            onChange={(e) => setNameBn(e.target.value)}
                            required
                            isBengaliText
                            showValidIcon
                            isValid={nameCheck.valid}
                            error={nameCheck.error}
                            hint="সনদপত্র অনুযায়ী শুধুমাত্র বাংলায় নাম লিখুন।"
                        />

                        <FormSelect
                            labelEng="Designation"
                            labelBng="পদবী ও বেস র‍্যাংক"
                            name="designation"
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            options={designationOptions}
                            required
                        />

                        <FormInput
                            labelEng="Mobile Number"
                            labelBng="মোবাইল নম্বর"
                            name="phone"
                            variant="erp"
                            leftIcon={Phone}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            isMonoText
                            showValidIcon
                            isValid={phoneCheck.valid}
                            error={phoneCheck.error}
                            hint="ERP Boxed Mode (ড্যাশবোর্ড ফিল্টার ও মডালে ব্যবহৃত হবে)"
                        />

                        <FormInput
                            labelEng="Portal Password"
                            labelBng="পাসওয়ার্ড (Show/Hide সহ)"
                            name="password"
                            type="password"
                            variant="erp"
                            leftIcon={Lock}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            isMonoText
                            hint="ডান পাশের চোখের আইকনে ক্লিক করে পাসওয়ার্ড দেখুন।"
                        />
                    </div>

                    <div className="p-5 rounded-xl bg-paper border border-ink-faint mb-6">
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep mb-3">
                            হাজিরা, পেমেন্ট এবং র‍্যাংকিং ব্যাজ:
                        </h3>
                        <div className="flex flex-wrap gap-2.5">
                            <Badge variant="emerald" mono>Rank #1 · সুপার</Badge>
                            <Badge variant="gold">Cash Payment (ক্যাশ বেতন)</Badge>
                            <AttendanceStatusBadge status="Present" />
                            <AttendanceStatusBadge status="Late" />
                            <AttendanceStatusBadge status="Leave" />
                            <AttendanceStatusBadge status="Late (Excused)" />
                            <AttendanceStatusBadge status="Absent" />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-ink-faint">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <Button variant="emerald" size="sm" leftIcon={Send}>
                                সাবমিট করুন
                            </Button>
                            <Button variant="gold" size="sm" leftIcon={UserCheck}>
                                বেতন অনুমোদন
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={Eye}
                                onClick={() => setShowSkeleton((s) => !s)}
                            >
                                {showSkeleton ? 'স্কেলেটন লুকান' : 'টেবিল স্কেলেটন দেখুন'}
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                leftIcon={Trash2}
                                onClick={() => setIsConfirmOpen(true)}
                            >
                                কনফার্ম ডায়ালগ টেস্ট
                            </Button>
                        </div>

                        <Badge variant="success" size="lg" dot>
                            পর্ব ১ (ধাপ ১–৫) শতভাগ সম্পন্ন!
                        </Badge>
                    </div>

                    {showSkeleton && (
                        <div className="mt-6 animate-fade-up">
                            <TableSkeleton rows={4} columns={5} />
                        </div>
                    )}
                </div>

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    titleEng="Teacher Salary & Quota Override"
                    titleBng="শিক্ষকের মূল বেতন ও ছুটির কোটা নির্ধারণ"
                    subtitleBng="আবদুর রাজ্জাক দাখিল মাদ্রাসা · অ্যাডমিন কন্ট্রোল প্যানেল"
                    footer={
                        <>
                            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                                বন্ধ করুন
                            </Button>
                            <Button
                                variant="emerald"
                                size="sm"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    toast.success('তথ্য সফলভাবে সংরক্ষিত হয়েছে!');
                                }}
                            >
                                সংরক্ষণ করুন
                            </Button>
                        </>
                    }
                >
                    <FormSelect
                        labelEng="Blood Group"
                        labelBng="রক্তের গ্রুপ (N/A সহ)"
                        variant="erp"
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        options={BLOOD_GROUPS}
                    />
                    <p className="font-bengali text-xs text-ink-soft">
                        কীবোর্ডের <b>ESC</b> বাটন চাপলে অথবা বাইরে ক্লিক করলে এই মডালটি স্মুথলি বন্ধ হয়ে যাবে।
                    </p>
                </Modal>

                <ConfirmDialog
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={() => {
                        setIsConfirmOpen(false);
                        toast.warning('রেকর্ডটি সফলভাবে আর্কাইভ করা হয়েছে।');
                    }}
                    variant="danger"
                    titleBng="আপনি কি এই রেকর্ডটি পরিবর্তন করতে চান?"
                    messageBng="একবার নিশ্চিত করলে এই মাসের হাজিরা ও বেতন শিট নতুন নিয়ম অনুযায়ী স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে।"
                />

                <p className="text-center mt-6 font-bengali text-xs text-ink-soft opacity-80">
                    {INSTITUTION_INFO.developerCreditBng}
                </p>
            </div>
        </div>
    );
}`
};

Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(clientDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
    console.log(`✅ Created/Updated File: client/${filePath}`);
});

console.log('\n🎉 Step 5 (Atomic UI Component Library & Global Toast Engine) Completed!');