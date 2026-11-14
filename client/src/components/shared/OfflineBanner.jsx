/**
 * ARDM Enterprise ERP — Live Offline & Reconnection Notification Bar
 * Automatically appears at the very top of the screen if Wi-Fi/Internet drops.
 */

import React from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

export default function OfflineBanner() {
    const { isBrowserOnline, wasRecentlyOffline } = useNetworkStatus(false);

    if (isBrowserOnline && !wasRecentlyOffline) {
        return null;
    }

    return (
        <div
            role="status"
            aria-live="polite"
            className={`fixed top-0 left-0 right-0 z-[100] px-4 py-2.5 text-center text-xs sm:text-sm font-bengali font-medium shadow-md transition-all duration-300 no-print ${
                !isBrowserOnline
                    ? 'bg-danger text-white border-b border-gold/40'
                    : 'bg-success text-white'
            }`}
        >
            <div className="max-w-5xl mx-auto flex items-center justify-center gap-2.5">
                {!isBrowserOnline ? (
                    <>
                        <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-gold-soft" />
                        <span>
                            <strong>ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে!</strong> আপনার ডিভাইসটি বর্তমানে অফলাইনে আছে। সংযোগ ফিরে না আসা পর্যন্ত নতুন তথ্য সেভ করবেন না।
                        </span>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-[11px] font-sans font-semibold transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                    </>
                ) : (
                    <>
                        <Wifi className="w-4 h-4 shrink-0 text-gold-soft" />
                        <span>
                            <strong>ইন্টারনেট সংযোগ পুনরায় স্থাপিত হয়েছে!</strong> সিস্টেম স্বাভাবিকভাবে কাজ করছে।
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}
