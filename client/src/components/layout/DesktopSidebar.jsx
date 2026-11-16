/**
 * ARDM Enterprise ERP — Desktop Collapsible Royal Emerald Sidebar (Step 13)
 * Features:
 * - Smooth Collapse/Expand (272px <-> 80px) persisted in localStorage
 * - Active Gold Indicator Bar & Tooltip on collapsed state
 * - Quick Switch between Admin Command Center & Personal Teacher View
 */

import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    LogOut,
    ArrowLeftRight,
    FileSpreadsheet,
    ShieldCheck
} from 'lucide-react';
import { INSTITUTION_INFO } from '@constants/app.constants';
import { useAuth } from '@context/AuthContext';
import { cn } from '@utils/cn';
import { ADMIN_NAV_ITEMS, TEACHER_NAV_ITEMS } from './navigation.config';

export default function DesktopSidebar({ isCollapsed, onToggleCollapse }) {
    const { user, isAdmin, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // বর্তমান ইউআরএল যদি /teacher/* হয় তবে টিচার মেনু, নাহলে অ্যাডমিন হলে অ্যাডমিন মেনু দেখাবে
    const isViewingTeacherPortal = location.pathname.startsWith('/teacher');
    const activeMenuItems = isAdmin && !isViewingTeacherPortal
        ? ADMIN_NAV_ITEMS
        : TEACHER_NAV_ITEMS;

    return (
        <aside
            aria-label="Primary Sidebar Navigation"
            className={cn(
                'hidden md:flex fixed inset-y-0 left-0 h-screen flex-col overflow-hidden shrink-0 bg-gradient-to-b from-emerald-deep via-emerald to-emerald-deep text-[#EFE9D4] border-r border-gold/25 select-none transition-all duration-300 z-30 no-print',
                isCollapsed ? 'w-[82px]' : 'w-[272px]'
            )}
        >
            {/* ১. সাইডবার ব্র্যান্ড হেডার ও কল্যাপ্স টগল বাটন */}
            <div className="flex flex-1 min-h-0 flex-col">
                <div className="h-[70px] px-4 flex items-center justify-between border-b border-white/10">
                    <div
                        onClick={() => navigate(isAdmin ? '/admin/dashboard' : '/teacher/portal')}
                        className="flex items-center gap-3 cursor-pointer overflow-hidden"
                    >
                        <div className="w-10 h-10 rounded-full border-2 border-gold bg-paper-panel text-emerald-deep font-serif font-bold text-lg flex items-center justify-center shrink-0 shadow-gold-glow">
                            {INSTITUTION_INFO.crestLetterBng}
                        </div>

                        {!isCollapsed && (
                            <div className="truncate animate-fade-up">
                                <span className="font-mono text-[9.5px] uppercase tracking-widest text-gold-soft block">
                                    ARDM Enterprise ERP
                                </span>
                                <h2 className="font-bengali text-sm font-bold text-white truncate">
                                    {INSTITUTION_INFO.nameBng}
                                </h2>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-gold hover:text-emerald-deep text-gold-soft flex items-center justify-center transition-colors shrink-0"
                        title={isCollapsed ? 'সাইডবার বড় করুন' : 'সাইডবার ছোট করুন'}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <ChevronLeft className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* ২. ইউজার রোল ও ১০-ডিজিট আইডি মিনি কার্ড */}
                {!isCollapsed && user && (
                    <div className="mx-3.5 mt-4 p-3 rounded-xl bg-black/20 border border-gold/20">
                        <div className="flex items-center justify-between text-[10px] font-mono text-gold-soft uppercase mb-0.5">
                            <span className="flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-gold" />
                                {user.role}
                            </span>
                            <span>ID: {user.teacherCode || '—'}</span>
                        </div>
                        <p className="font-bengali text-xs font-bold text-white truncate">
                            {user.fullNameBng}
                        </p>
                        <p className="font-bengali text-[11px] text-gold-soft/85 truncate">
                            {user.designationBng || user.designation}
                        </p>
                    </div>
                )}

                {/* ৩. মেইন নেভিগেশন লিংকসমূহ */}
                <nav className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 space-y-1">
                    {!isCollapsed && (
                        <div className="px-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-widest text-gold-soft/75">
                            {isAdmin && !isViewingTeacherPortal
                                ? 'Admin Command Modules'
                                : 'Teacher Self-Service'}
                        </div>
                    )}

                    {activeMenuItems.map((item) => {
                        const IconComp = item.icon;
                        return (
                            <NavLink
                                key={item.key}
                                to={item.path}
                                title={isCollapsed ? `${item.labelBng} (${item.labelEng})` : undefined}
                                className={({ isActive }) =>
                                    cn(
                                        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-bengali text-xs sm:text-[13.5px] font-medium transition-all duration-200',
                                        isCollapsed && 'justify-center px-2',
                                        isActive
                                            ? 'bg-gradient-to-r from-gold/25 to-gold/10 text-white font-bold border border-gold/40 shadow-xs'
                                            : 'text-[#EFE9D4]/85 hover:bg-white/10 hover:text-white'
                                    )
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {/* বাম পাশের অ্যাক্টিভ গোল্ড ইন্ডিকেটর পিল */}
                                        {isActive && (
                                            <span
                                                aria-hidden="true"
                                                className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gold"
                                            />
                                        )}

                                        <IconComp
                                            className={cn(
                                                'w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105',
                                                isActive ? 'text-gold-soft' : 'text-[#EFE9D4]/75 group-hover:text-gold-soft'
                                            )}
                                        />

                                        {!isCollapsed && (
                                            <div className="flex-1 flex items-center justify-between truncate">
                                                <span className="truncate">{item.labelBng}</span>
                                                {item.badge && (
                                                    <span
                                                        className={cn(
                                                            'ml-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold shrink-0',
                                                            item.badgeVariant === 'gold'
                                                                ? 'bg-gold text-emerald-deep'
                                                                : 'bg-white/10 text-gold-soft'
                                                        )}
                                                    >
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            {/* ৪. সাইডবার ফুটার: পোর্টাল সুইচ, পাবলিক রেজিস্ট্রেশন ও লগআউট */}
            <div className="shrink-0 p-3 border-t border-white/10 space-y-1.5">
                {/* অ্যাডমিন হলে ১ ক্লিকে নিজের টিচার পোর্টাল এবং অ্যাডমিন প্যানেলের মধ্যে সুইচ করার বাটন */}
                {isAdmin && (
                    <button
                        type="button"
                        onClick={() =>
                            navigate(isViewingTeacherPortal ? '/admin/dashboard' : '/teacher/portal')
                        }
                        title="পোর্টাল মোড পরিবর্তন করুন"
                        className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bengali font-semibold bg-white/10 hover:bg-gold hover:text-emerald-deep text-gold-soft transition-all',
                            isCollapsed && 'justify-center px-2'
                        )}
                    >
                        <ArrowLeftRight className="w-4 h-4 shrink-0" />
                        {!isCollapsed && (
                            <span className="truncate">
                                {isViewingTeacherPortal
                                    ? 'অ্যাডমিন কমান্ড সেন্টারে যান'
                                    : 'আমার নিজস্ব টিচার পোর্টাল'}
                            </span>
                        )}
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => navigate('/register')}
                    title="পাবলিক শিক্ষক নিবন্ধন ফর্ম"
                    className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bengali text-[#EFE9D4]/80 hover:bg-white/10 hover:text-white transition-all',
                        isCollapsed && 'justify-center px-2'
                    )}
                >
                    <FileSpreadsheet className="w-4 h-4 shrink-0 text-gold-soft" />
                    {!isCollapsed && <span className="truncate">পাবলিক নিবন্ধন খাতা (/register)</span>}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        logout(true);
                        navigate('/login');
                    }}
                    title="নিরাপদে লগআউট করুন"
                    className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bengali font-semibold text-red-200 hover:bg-danger hover:text-white transition-all',
                        isCollapsed && 'justify-center px-2'
                    )}
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>লগআউট করুন</span>}
                </button>
            </div>
        </aside>
    );
}
