/**
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

export default Modal;
