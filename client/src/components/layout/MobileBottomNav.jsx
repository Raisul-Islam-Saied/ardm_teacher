/**
 * ARDM Enterprise ERP — Touch-First Mobile Bottom Navigation Bar & Slide-Over Drawer (Step 13)
 * Appears automatically on mobile screens (<768px) for 1-thumb operation.
 */

import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    Menu,
    X,
    LogOut,
    ArrowLeftRight,
    FileSpreadsheet,
    ShieldCheck
} from 'lucide-react';
import { INSTITUTION_INFO } from '@constants/app.constants';
import { useAuth, SYSTEM_ROLES } from '@context/AuthContext';
import { cn } from '@utils/cn';
import { ADMIN_NAV_ITEMS, TEACHER_NAV_ITEMS } from './navigation.config';

export default function MobileBottomNav({ isDrawerOpen, onOpenDrawer, onCloseDrawer }) {
    const { user, isAdmin, simulateRoleSession, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const isViewingTeacherPortal = location.pathname.startsWith('/teacher');
    const fullMenu = isAdmin && !isViewingTeacherPortal ? ADMIN_NAV_ITEMS : TEACHER_NAV_ITEMS;
    const bottomTabItems = fullMenu.filter((item) => item.mobileTab).slice(0, 4);

    return (
        <>
            {/* =================================================================
                1. FIXED BOTTOM TAB BAR (Mobile Only: < md)
               ================================================================= */}
            <nav
                aria-label="Mobile Bottom Navigation"
                className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-emerald-deep text-[#EFE9D4] border-t border-gold/30 px-2 flex items-center justify-around shadow-ledger no-print"
            >
                {bottomTabItems.map((item) => {
                    const IconComp = item.icon;
                    return (
                        <NavLink
                            key={item.key}
                            to={item.path}
                            className={({ isActive }) =>
                                cn(
                                    'flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[64px]',
                                    isActive
                                        ? 'text-gold-soft font-bold scale-105'
                                        : 'text-[#EFE9D4]/70 hover:text-white'
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <div
                                        className={cn(
                                            'p-1 rounded-lg transition-colors',
                                            isActive && 'bg-gold/20'
                                        )}
                                    >
                                        <IconComp className="w-5 h-5" />
                                    </div>
                                    <span className="font-bengali text-[10.5px] mt-0.5 truncate max-w-[72px]">
                                        {item.labelBng.split(' ')[0]}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    );
                })}

                {/* ৫ম ট্যাব: সম্পূর্ণ মেনু ড্রয়ার ওপেন বাটন */}
                <button
                    type="button"
                    onClick={onOpenDrawer}
                    className={cn(
                        'flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[64px] transition-all',
                        isDrawerOpen ? 'text-gold-soft font-bold' : 'text-[#EFE9D4]/70 hover:text-white'
                    )}
                >
                    <div className="p-1 rounded-lg">
                        <Menu className="w-5 h-5" />
                    </div>
                    <span className="font-bengali text-[10.5px] mt-0.5">সব মেনু</span>
                </button>
            </nav>

            {/* =================================================================
                2. SLIDE-OVER FULL NAVIGATION DRAWER (Mobile Only)
               ================================================================= */}
            {isDrawerOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end no-print"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) onCloseDrawer();
                    }}
                >
                    <div className="w-[84%] max-w-[310px] h-full bg-gradient-to-b from-emerald-deep via-emerald to-emerald-deep text-[#EFE9D4] p-5 flex flex-col justify-between shadow-ledger animate-fade-up overflow-y-auto">
                        <div>
                            {/* ড্রয়ার হেডার */}
                            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/15">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-full border-2 border-gold bg-paper-panel text-emerald-deep font-serif font-bold flex items-center justify-center">
                                        {INSTITUTION_INFO.crestLetterBng}
                                    </div>
                                    <div>
                                        <h3 className="font-bengali text-sm font-bold text-white">
                                            {INSTITUTION_INFO.nameBng}
                                        </h3>
                                        <span className="font-mono text-[10px] text-gold-soft block">
                                            ID: {user?.teacherCode || '—'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={onCloseDrawer}
                                    className="p-1.5 rounded-full bg-white/10 text-gold-soft hover:bg-danger hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* ইউজার ইনফো ও রোল সুইচার */}
                            {user && (
                                <div className="p-3 rounded-xl bg-black/25 border border-gold/25 mb-4">
                                    <div className="flex items-center justify-between text-[10px] font-mono text-gold-soft mb-1">
                                        <span className="flex items-center gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5 text-gold" />
                                            Role: {user.role}
                                        </span>
                                        <span>Rank #{user.rankingMetrics?.overallMadrasahRank || 1}</span>
                                    </div>
                                    <p className="font-bengali text-sm font-bold text-white">
                                        {user.fullNameBng}
                                    </p>
                                    <p className="font-bengali text-xs text-gold-soft/90">
                                        {user.designationBng || user.designation}
                                    </p>

                                    <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2.5 border-t border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                simulateRoleSession(SYSTEM_ROLES.SUPER_ADMIN);
                                                navigate('/admin/dashboard');
                                                onCloseDrawer();
                                            }}
                                            className="py-1 rounded-lg bg-gold/20 border border-gold/40 text-[10.5px] font-mono font-bold text-gold-soft"
                                        >
                                            ⚡ Sim Admin
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                simulateRoleSession(SYSTEM_ROLES.TEACHER);
                                                navigate('/teacher/portal');
                                                onCloseDrawer();
                                            }}
                                            className="py-1 rounded-lg bg-white/10 border border-white/20 text-[10.5px] font-mono font-bold text-white"
                                        >
                                            ⚡ Sim Teacher
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* সম্পূর্ণ মেনু তালিকা */}
                            <div className="space-y-1">
                                {fullMenu.map((item) => {
                                    const IconComp = item.icon;
                                    return (
                                        <NavLink
                                            key={item.key}
                                            to={item.path}
                                            onClick={onCloseDrawer}
                                            className={({ isActive }) =>
                                                cn(
                                                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bengali text-xs font-medium transition-all',
                                                    isActive
                                                        ? 'bg-gold text-emerald-deep font-bold shadow-xs'
                                                        : 'text-[#EFE9D4] hover:bg-white/10'
                                                )
                                            }
                                        >
                                            <span className="flex items-center gap-2.5">
                                                <IconComp className="w-4 h-4 shrink-0" />
                                                {item.labelBng}
                                            </span>
                                            {item.badge && (
                                                <span className="px-1.5 py-0.5 rounded bg-black/20 font-mono text-[9.5px]">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ড্রয়ার ফুটার */}
                        <div className="pt-4 mt-6 border-t border-white/15 space-y-2">
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigate(
                                            isViewingTeacherPortal
                                                ? '/admin/dashboard'
                                                : '/teacher/portal'
                                        );
                                        onCloseDrawer();
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 text-gold-soft font-bengali text-xs font-semibold"
                                >
                                    <ArrowLeftRight className="w-4 h-4" />
                                    {isViewingTeacherPortal
                                        ? 'অ্যাডমিন ড্যাশবোর্ডে সুইচ করুন'
                                        : 'আমার টিচার পোর্টালে সুইচ করুন'}
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    navigate('/register');
                                    onCloseDrawer();
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 text-[#EFE9D4] font-bengali text-xs"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-gold-soft" />
                                পাবলিক নিবন্ধন ফর্ম (/register)
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    logout(true);
                                    onCloseDrawer();
                                    navigate('/login');
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-danger text-white font-bengali text-xs font-bold"
                            >
                                <LogOut className="w-4 h-4" />
                                নিরাপদে লগআউট করুন
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
