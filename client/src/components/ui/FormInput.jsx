/**
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
    const inputId = props.id || `field-${name || generatedId}`;
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
                    aria-describedby={hasError ? `${inputId}-error` : undefined}
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
                    id={`${inputId}-error`}
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

export default FormInput;
