/**
 * ARDM Enterprise ERP — Role-Based Navigation Schema (Admin vs Teacher Portal)
 */

import {
    LayoutDashboard,
    Users,
    UserCheck,
    Fingerprint,
    Banknote,
    Settings,
    GraduationCap,
    CalendarCheck2,
    Receipt,
    IdCard,
    FileSpreadsheet
} from 'lucide-react';

export const ADMIN_NAV_ITEMS = Object.freeze([
    {
        key: 'admin-dashboard',
        path: '/admin/dashboard',
        labelBng: 'ড্যাশবোর্ড ওভারভিউ',
        labelEng: 'Command Center',
        icon: LayoutDashboard,
        badge: null,
        mobileTab: true
    },
    {
        key: 'admin-teachers',
        path: '/admin/teachers',
        labelBng: 'শিক্ষক ও র‍্যাংকিং তালিকা',
        labelEng: 'Teachers & Seniority',
        icon: Users,
        badge: 'Rank',
        mobileTab: true
    },
    {
        key: 'admin-approvals',
        path: '/admin/approvals',
        labelBng: 'নিবন্ধন অনুমোদন',
        labelEng: 'Pending Approvals',
        icon: UserCheck,
        badge: 'New',
        badgeVariant: 'gold',
        mobileTab: false
    },
    {
        key: 'admin-attendance',
        path: '/admin/attendance',
        labelBng: 'হাজিরা ও ZKTeco K40',
        labelEng: 'Attendance & Biometric',
        icon: Fingerprint,
        badge: '9:00 AM',
        mobileTab: true
    },
    {
        key: 'admin-payroll',
        path: '/admin/payroll',
        labelBng: 'মাসিক বেতন শিট',
        labelEng: 'Monthly Payroll',
        icon: Banknote,
        badge: '2.0 Quota',
        mobileTab: true
    },
    {
        key: 'admin-settings',
        path: '/admin/settings',
        labelBng: 'সিস্টেম ও ছুটির নীতিমালা',
        labelEng: 'System Settings',
        icon: Settings,
        badge: null,
        mobileTab: false
    }
]);

export const TEACHER_NAV_ITEMS = Object.freeze([
    {
        key: 'teacher-portal',
        path: '/teacher/portal',
        labelBng: 'আমার পোর্টাল ড্যাশবোর্ড',
        labelEng: 'My Overview',
        icon: GraduationCap,
        badge: null,
        mobileTab: true
    },
    {
        key: 'teacher-attendance',
        path: '/teacher/attendance',
        labelBng: 'আমার হাজিরা ও কোটা',
        labelEng: 'My Attendance Ledger',
        icon: CalendarCheck2,
        badge: '2.0 Quota',
        mobileTab: true
    },
    {
        key: 'teacher-payroll',
        path: '/teacher/payroll',
        labelBng: 'বেতন স্লিপ ও ভাউচার',
        labelEng: 'Salary Slips',
        icon: Receipt,
        badge: 'Cash',
        mobileTab: true
    },
    {
        key: 'teacher-profile',
        path: '/teacher/profile',
        labelBng: 'প্রোফাইল ও আইডি কার্ড',
        labelEng: 'Profile & ID Card',
        icon: IdCard,
        badge: null,
        mobileTab: true
    }
]);

export const PUBLIC_SHORTCUT_ITEMS = Object.freeze([
    {
        key: 'public-register',
        path: '/register',
        labelBng: 'পাবলিক নিবন্ধন ফর্ম',
        labelEng: 'Public Registration',
        icon: FileSpreadsheet
    }
]);
