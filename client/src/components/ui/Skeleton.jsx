/**
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
            <div className="p-4 bg-paper-deep/60 border-b border-ink-faint grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {Array.from({ length: columns }).map((_, idx) => (
                    <Skeleton key={idx} className="h-4 w-3/4" />
                ))}
            </div>
            <div className="divide-y divide-ink-faint">
                {Array.from({ length: rows }).map((_, rIdx) => (
                    <div
                        key={rIdx}
                        className="p-4 grid gap-4 items-center"
                        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
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

export default Skeleton;
