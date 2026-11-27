/**
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
    const selectId = props.id || `select-${name || generatedId}`;
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
                                key={`${optValue}-${idx}`}
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

export default FormSelect;
