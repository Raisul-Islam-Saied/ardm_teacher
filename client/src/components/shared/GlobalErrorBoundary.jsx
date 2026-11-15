/**
 * ARDM Enterprise ERP — Global Error Boundary
 * Prevents React runtime exceptions from ever showing a blank white screen.
 */

import React from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';
import { INSTITUTION_INFO } from '@constants/app.constants';

export class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('🛡️ [ARDM GlobalErrorBoundary Caught Runtime Error]:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-paper text-ink">
                <div className="max-w-lg w-full ledger-surface p-8 text-center animate-pop-in">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger-bg border-2 border-danger/30 flex items-center justify-center text-danger">
                        <AlertOctagon className="w-8 h-8" />
                    </div>

                    <h1 className="font-bengali text-2xl font-bold text-emerald-deep">
                        সাময়িক কারিগরি ত্রুটি শনাক্ত হয়েছে
                    </h1>
                    <p className="font-bengali text-sm text-ink-soft mt-2 leading-relaxed">
                        অ্যাপ্লিকেশনটির একটি অংশে অপ্রত্যাশিত সমস্যা হয়েছে। পেজটি রিলোড করুন; সমস্যা থাকলে প্রশাসকের সঙ্গে যোগাযোগ করুন।
                    </p>

                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={this.handleReload}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald to-emerald-deep text-white text-xs font-bengali font-semibold shadow-emerald-glow hover:-translate-y-0.5 transition-all"
                        >
                            <RotateCcw className="w-4 h-4" />
                            পেজ রিলোড করুন
                        </button>
                        <button
                            type="button"
                            onClick={this.handleGoHome}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-ink-faint bg-paper hover:bg-paper-deep text-ink-soft text-xs font-bengali font-semibold transition-all"
                        >
                            <Home className="w-4 h-4" />
                            হোম পেজে ফিরে যান
                        </button>
                    </div>

                    <p className="mt-6 pt-4 border-t border-ink-faint font-bengali text-xs text-ink-muted">
                        {INSTITUTION_INFO.nameBng} · {INSTITUTION_INFO.developerCreditBng}
                    </p>
                </div>
            </div>
        );
    }
}

export default GlobalErrorBoundary;
