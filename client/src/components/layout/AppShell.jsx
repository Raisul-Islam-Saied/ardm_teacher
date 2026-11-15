/**
 * ARDM Enterprise ERP — Master Adaptive Application Shell (Step 13)
 * Combines:
 * - DesktopSidebar (Left collapsible navigation for PC)
 * - TopHeaderBar (Sticky live clock & 9:00 AM attendance gate status)
 * - Main Scrollable Workspace Outlet
 * - MobileBottomNav (Fixed bottom bar + slide-over drawer for mobile)
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { INSTITUTION_INFO, STORAGE_KEYS } from '@constants/app.constants';
import DesktopSidebar from './DesktopSidebar';
import TopHeaderBar from './TopHeaderBar';
import MobileBottomNav from './MobileBottomNav';

export default function AppShell({ children }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true';
        } catch (e) {
            return false;
        }
    });

    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

    const handleToggleSidebar = () => {
        setIsSidebarCollapsed((prev) => {
            const nextVal = !prev;
            try {
                localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(nextVal));
            } catch (e) {
                // Ignore
            }
            return nextVal;
        });
    };

    return (
        <div className="min-h-screen flex bg-paper text-ink">
            {/* ১. পিসির জন্য বাম পাশের কল্যাপ্সিবল সাইডবার */}
            <DesktopSidebar
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={handleToggleSidebar}
            />

            {/* ২. ডান পাশের মেইন ওয়ার্কস্পেস কলাম */}
            <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
                <TopHeaderBar onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)} />

                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
                    {children || <Outlet />}
                </main>

                <footer className="py-4 px-6 border-t border-ink-faint text-center font-bengali text-xs text-ink-muted no-print">
                    {INSTITUTION_INFO.nameBng} · {INSTITUTION_INFO.developerCreditBng}
                </footer>
            </div>

            {/* ৩. মোবাইলের জন্য বটম নেভিগেশন ও স্লাইড-ওভার ড্রয়ার */}
            <MobileBottomNav
                isDrawerOpen={isMobileDrawerOpen}
                onOpenDrawer={() => setIsMobileDrawerOpen(true)}
                onCloseDrawer={() => setIsMobileDrawerOpen(false)}
            />
        </div>
    );
}
