import React from 'react';

function SkeletonBlock({ className = '' }) {
    return <div aria-hidden="true" className={`animate-pulse motion-reduce:animate-none rounded-lg bg-emerald-deep/[0.07] ${className}`} />;
}

export default function PageLoadingSkeleton() {
    return (
        <div
            role="status"
            aria-label="পৃষ্ঠা লোড হচ্ছে"
            className="space-y-6"
        >
            <span className="sr-only">পৃষ্ঠা লোড হচ্ছে...</span>

            <section className="ledger-surface flex items-center gap-4 border border-ink-faint bg-paper-panel p-5 sm:p-7">
                <SkeletonBlock className="h-14 w-14 shrink-0 rounded-2xl sm:h-16 sm:w-16" />
                <div className="min-w-0 flex-1 space-y-3">
                    <SkeletonBlock className="h-3 w-28" />
                    <SkeletonBlock className="h-6 w-2/3 max-w-sm" />
                    <SkeletonBlock className="h-3 w-1/2 max-w-xs" />
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <div
                        key={index}
                        className="ledger-surface space-y-4 border border-ink-faint bg-paper-panel p-5"
                    >
                        <SkeletonBlock className="h-3 w-24" />
                        <SkeletonBlock className="h-7 w-2/3" />
                        <SkeletonBlock className="h-3 w-1/2" />
                    </div>
                ))}
            </section>

            <section className="ledger-surface space-y-5 border border-ink-faint bg-paper-panel p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 border-b border-ink-faint pb-4">
                    <SkeletonBlock className="h-5 w-40" />
                    <SkeletonBlock className="h-8 w-24" />
                </div>
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <SkeletonBlock className="h-3 w-1/3" />
                            <SkeletonBlock className="h-3 w-2/3" />
                        </div>
                        <SkeletonBlock className="h-6 w-16 shrink-0" />
                    </div>
                ))}
            </section>
        </div>
    );
}
