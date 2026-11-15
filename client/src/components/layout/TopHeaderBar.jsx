/**
 * ARDM Enterprise ERP — Top Command Header Bar (Step 13)
 * Features:
 * - Live Bengali Digital Clock & Date
 * - 9:00 AM Biometric Attendance Rule Live Status Indicator
 * - User Profile Menu
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Clock,
    Menu,
    ShieldCheck,
    Bell,
    LogOut,
    User
} from 'lucide-react';
import { INSTITUTION_INFO } from '@constants/app.constants';
import { useAuth } from '@context/AuthContext';
import { Badge } from '@components/ui';
import { toBengaliDigits } from '@utils/formatters';
import { ADMIN_NAV_ITEMS, TEACHER_NAV_ITEMS } from './navigation.config';

export default function TopHeaderBar({ onOpenMobileDrawer }) {
    const { user, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // লাইভ ঘড়ি স্টেট
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // বর্তমান পেজের বাংলা ও ইংরেজি শিরোনাম খুঁজে বের করা
    const allItems = [...ADMIN_NAV_ITEMS, ...TEACHER_NAV_ITEMS];
    const currentNav =
        allItems.find((item) => location.pathname.startsWith(item.path)) ||
        allItems[0];

    // বাংলা সময় ও তারিখ ফরম্যাট করা
    const timeStringBng = now.toLocaleTimeString('bn-BD', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    const dateStringBng = now.toLocaleDateString('bn-BD', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    // সকাল ৯:০০টার হাজিরা নিয়মের লাইভ স্ট্যাটাস হিসাব করা
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const isFriday = now.getDay() === 5;
    const isBeforeNineAm = currentHour < 9 || (currentHour === 9 && currentMin === 0);

    let attendanceGateBadge = {
        variant: 'success',
        text: 'সকাল ৯:০০ গেট ওপেন (Present Window)'
    };

    if (isFriday) {
        attendanceGateBadge = {
            variant: 'gold',
            text: 'আজ শুক্রবার (সাপ্তাহিক ছুটি)'
        };
    } else if (!isBeforeNineAm && currentHour < 17) {
        attendanceGateBadge = {
            variant: 'warning',
            text: 'সকাল ৯:০০ অতিক্রান্ত · Late Rule (০.৫ কোটা) সক্রিয়'
        };
    } else if (currentHour >= 17) {
        attendanceGateBadge = {
            variant: 'neutral',
            text: 'ছুটির সময় সমাপ্ত · বায়োমেট্রিক সিঙ্ক প্রস্তুত'
        };
    }

    return (
        <header className="h-[70px] bg-paper-panel/95 backdrop-blur-xs border-b border-ink-faint px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 no-print">
            {/* বাম পাশ: মোবাইল মেনু বাটন ও বর্তমান পেজের শিরোনাম */}
            <div className="flex items-center gap-3 min-w-0">
                <button
                    type="button"
                    onClick={onOpenMobileDrawer}
                    className="md:hidden p-2 rounded-xl border border-ink-faint bg-paper text-emerald-deep hover:bg-emerald-subtle transition-colors"
                    aria-label="Open navigation drawer"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-gold-deep font-bold">
                            {currentNav?.labelEng || 'ERP Workspace'}
                        </span>
                        <span className="hidden sm:inline-block text-ink-faint">•</span>
                        <span className="hidden sm:inline-block font-bengali text-xs text-ink-muted">
                            { dateStringBng }
                        </span>
                    </div>
                    <h1 className="font-bengali text-base sm:text-xl font-bold text-emerald-deep truncate">
                        {currentNav?.labelBng || INSTITUTION_INFO.nameBng}
                    </h1>
                </div>
            </div>

            {/* মাঝখান/ডান পাশ: সকাল ৯:০০ হাজিরা গেট স্ট্যাটাস, লাইভ ঘড়ি ও প্রোফাইল */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">

                {/* সকাল ৯:০০ হাজিরা গেট লাইভ স্ট্যাটাস (ট্যাবলেট ও পিসিতে দেখাবে) */}
                <div className="hidden xl:flex items-center">
                    <Badge variant={attendanceGateBadge.variant} size="md" dot>
                        {attendanceGateBadge.text}
                    </Badge>
                </div>

                {/* লাইভ বাংলা ডিজিটাল ঘড়ি */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-paper border border-ink-faint font-bengali text-xs font-bold text-emerald-deep shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-gold-deep animate-pulse shrink-0" />
                    <span>{timeStringBng}</span>
                </div>

                {/* ইউজার প্রোফাইল ব্যাজ */}
                {user && (
                    <div
                        onClick={() => navigate('/teacher/profile')}
                        className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-full bg-paper border border-ink-faint hover:border-gold cursor-pointer transition-all"
                        title="প্রোফাইল ও ডিজিটাল আইডি কার্ড দেখুন"
                    >
                        <div className="w-8 h-8 rounded-full bg-emerald text-gold-soft font-bengali font-bold text-sm flex items-center justify-center shrink-0">
                            {user.fullNameBng ? user.fullNameBng.charAt(0) : 'আ'}
                        </div>
                        <div className="hidden md:block text-left leading-tight">
                            <p className="font-bengali text-xs font-bold text-emerald-deep max-w-[130px] truncate">
                                {user.fullNameBng}
                            </p>
                            <p className="font-mono text-[10px] text-ink-muted">
                                #{user.rankingMetrics?.overallMadrasahRank || '—'} · {user.teacherCode || '—'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
