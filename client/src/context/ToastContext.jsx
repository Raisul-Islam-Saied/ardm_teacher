/**
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
        const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
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

export default ToastProvider;
