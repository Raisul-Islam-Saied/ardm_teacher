/**
 * ARDM Enterprise ERP — System Settings & Institutional Policy Engine (Step 19)
 * Features:
 * - Tab 1: 9:00 AM Biometric Gate Rule & ZKTeco K40 ADMS Hardware Configuration
 * - Tab 2: 2.0 Free Leave Quota & 30-Day Pro-Rata Payroll Deduction Policy
 * - Tab 3: Madrasah Official Holiday Calendar (Ramadan, Eid, Govt Holidays)
 * - Tab 4: Institution Profile, Security Lockout Rules & 1-Click JSON System Backup
 */

import React, { useState, useEffect } from 'react';
import {
    Settings,
    Clock,
    Fingerprint,
    Banknote,
    Calendar,
    ShieldCheck,
    Download,
    RotateCcw,
    Save,
    Plus,
    Trash2,
    Building2,
    Sparkles
} from 'lucide-react';
import { INSTITUTION_INFO } from '@constants/app.constants';
import {
    Button,
    Badge,
    FormInput,
    FormSelect,
    Modal
} from '@components/ui';
import { useToast } from '@context/ToastContext';
import { extractApiErrorMessage } from '@api/axiosClient';
import { erpService } from '@api/erpService';
import { toBengaliDigits, formatDisplayDate } from '@utils/formatters';
import { cn } from '@utils/cn';

const DEFAULT_SYSTEM_POLICY = {
    gateCutoffTime24: '09:00',
    defaultLateLimit: '10:00',
    weekendDays: ['5'],
    defaultMonthlyFreeQuota: '2.0',
    lateQuotaWeight: '0.5',
    leaveQuotaWeight: '1.0',
    unexcusedAbsentDeductionDays: '1.0',
    salaryMonthDivisor: '30',
    useExactCalendarDays: true,
    madrasahNameBng: INSTITUTION_INFO.nameBng,
    madrasahNameEng: INSTITUTION_INFO.nameEng
};

const SETTINGS_TABS = [
    { key: 'ATTENDANCE', labelBng: 'সকাল ৯:০০ গেট রুল ও ZKTeco K40', icon: Fingerprint },
    { key: 'QUOTA_PAYROLL', labelBng: '২.০ ফ্রি কোটা ও বেতন নীতিমালা', icon: Banknote },
    { key: 'HOLIDAYS', labelBng: 'সরকারি ও মাদ্রাসা ছুটির তালিকা', icon: Calendar },
    { key: 'SYSTEM_BACKUP', labelBng: 'প্রতিষ্ঠান তথ্য ও ডাটাবেস ব্যাকআপ', icon: ShieldCheck }
];

export default function SystemSettings() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('ATTENDANCE');
    const [isSaving, setIsSaving] = useState(false);
    const [policy, setPolicy] = useState(DEFAULT_SYSTEM_POLICY);
    const [holidays, setHolidays] = useState([]);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);
    const [newHoliday, setNewHoliday] = useState({
        titleBng: '',
        date: new Date().toISOString().slice(0, 10)
    });

    useEffect(() => {
        let isMounted = true;
        Promise.all([erpService.getSystemSettings(), erpService.getSpecialDates()])
            .then(([settings, specialDates]) => {
                if (!isMounted) return;
                setPolicy({
                    ...DEFAULT_SYSTEM_POLICY,
                    madrasahNameBng: settings.madrasahNameBng || DEFAULT_SYSTEM_POLICY.madrasahNameBng,
                    madrasahNameEng: settings.madrasahNameEng || DEFAULT_SYSTEM_POLICY.madrasahNameEng,
                    gateCutoffTime24: settings.attendancePolicy?.defaultInTime || '09:00',
                    defaultLateLimit: settings.attendancePolicy?.defaultLateLimit || '10:00',
                    weekendDays: (settings.attendancePolicy?.weekendDays || [5]).map(String),
                    defaultMonthlyFreeQuota: String(settings.attendancePolicy?.monthlyPaidLeaveQuota ?? 2),
                    lateQuotaWeight: String(settings.attendancePolicy?.lateDeductionWeight ?? 0.5),
                    leaveQuotaWeight: String(settings.attendancePolicy?.leaveDeductionWeight ?? 1),
                    unexcusedAbsentDeductionDays: String(settings.attendancePolicy?.absentPenaltyDays ?? 1),
                    salaryMonthDivisor: String(settings.payrollPolicy?.daysInSalaryMonth ?? 30),
                    useExactCalendarDays: settings.payrollPolicy?.useExactCalendarDays ?? true
                });
                setHolidays((specialDates || [])
                    .filter((date) => date.isHoliday)
                    .map((date) => ({
                        id: date._id,
                        titleBng: date.title,
                        date: date.date,
                        days: 1,
                        type: 'Institutional'
                    })));
            })
            .catch((error) => {
                if (isMounted) toast.error(extractApiErrorMessage(error, 'সার্ভার সেটিংস লোড করা যায়নি।'));
            })
            .finally(() => {
                if (isMounted) setIsLoadingSettings(false);
            });
        return () => { isMounted = false; };
    }, [toast]);

    const updateField = (key, value) => {
        setPolicy((prev) => ({ ...prev, [key]: value }));
    };

    // ১. সিস্টেম পলিসি সেভ হ্যান্ডলার
    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await erpService.saveSystemSettings(policy);
            toast.success('সার্ভারের সিস্টেম নীতিমালা সফলভাবে সংরক্ষিত হয়েছে।');
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'সিস্টেম সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে।'));
        } finally {
            setIsSaving(false);
        }
    };

    // ২. ডিফল্ট নীতিমালায় রিসেট হ্যান্ডলার
    const handleResetDefaults = async () => {
        setIsSaving(true);
        try {
            await erpService.saveSystemSettings(DEFAULT_SYSTEM_POLICY);
            setPolicy(DEFAULT_SYSTEM_POLICY);
            toast.success('সার্ভারের নীতিমালা ডিফল্ট মানে রিসেট করা হয়েছে।');
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'ডিফল্ট নীতিমালা সংরক্ষণ করা যায়নি।'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddHoliday = async () => {
        if (!newHoliday.titleBng.trim()) {
            toast.error('অনুগ্রহ করে ছুটির নাম লিখুন।');
            return;
        }
        try {
            const created = await erpService.saveSpecialDate({
                date: newHoliday.date,
                title: newHoliday.titleBng.trim(),
                isHoliday: true
            });
            setHolidays((prev) => [
                { id: created._id, titleBng: created.title, date: created.date, days: 1, type: 'Institutional' },
                ...prev.filter((holiday) => holiday.date !== created.date)
            ]);
            setNewHoliday({ titleBng: '', date: new Date().toISOString().slice(0, 10) });
            setIsAddHolidayOpen(false);
            toast.success(`"${created.title}" সার্ভারে সংরক্ষিত হয়েছে।`);
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'ছুটি সংরক্ষণ করা যায়নি।'));
        }
    };

    const handleDeleteHoliday = async (holiday) => {
        try {
            await erpService.deleteSpecialDate(holiday.date);
            setHolidays((prev) => prev.filter((item) => item.date !== holiday.date));
            toast.success('ছুটি সার্ভার থেকে মুছে ফেলা হয়েছে।');
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'ছুটি মুছে ফেলা যায়নি।'));
        }
    };

    const handleDownloadJsonBackup = async () => {
        try {
            const backupPayload = await erpService.getDatabaseBackup();
            const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ARDM_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success('সার্ভারের ডাটাবেস ব্যাকআপ ডাউনলোড হয়েছে।');
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'ডাটাবেস ব্যাকআপ ডাউনলোড করা যায়নি।'));
        }
    };

    return (
        <div className="space-y-6 animate-fade-up">

            {/* =================================================================
                1. SETTINGS COMMAND HEADER
               ================================================================= */}
            <section className="ledger-surface p-6 bg-paper-panel flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald text-gold-soft flex items-center justify-center shadow-xs shrink-0">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="gold" size="sm" mono>
                                SYSTEM POLICY &amp; HOLIDAY CALENDAR
                            </Badge>
                            <Badge variant="emerald-subtle" size="sm" dot>
                                Active Cutoff: {policy.gateCutoffTime24} · Quota: {policy.defaultMonthlyFreeQuota}
                            </Badge>
                        </div>
                        <h1 className="font-bengali text-xl sm:text-2xl font-bold text-emerald-deep mt-1">
                            সিস্টেম সেটিংস, হাজিরা সময়সীমা ও ছুটির নীতিমালা
                        </h1>
                        <p className="font-bengali text-xs text-ink-soft">
                            সার্ভারে সংরক্ষিত হাজিরা, বেতন ও ছুটির নীতিমালা নিয়ন্ত্রণ কেন্দ্র।
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={RotateCcw}
                        isLoading={isSaving || isLoadingSettings}
                        onClick={handleResetDefaults}
                    >
                        <span className="font-bengali">ডিফল্ট রিসেট</span>
                    </Button>

                    <Button
                        variant="emerald"
                        size="sm"
                        leftIcon={Save}
                        isLoading={isSaving || isLoadingSettings}
                        onClick={handleSaveSettings}
                    >
                        <span className="font-bengali">সকল সেটিংস সংরক্ষণ করুন</span>
                    </Button>
                </div>
            </section>

            {/* =================================================================
                2. SETTINGS NAVIGATION TABS
               ================================================================= */}
            <nav className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {SETTINGS_TABS.map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bengali text-xs sm:text-sm font-semibold border transition-all shrink-0',
                                isActive
                                    ? 'bg-emerald text-white border-emerald shadow-xs'
                                    : 'bg-paper-panel text-ink-soft border-ink-faint hover:border-gold hover:text-emerald-deep'
                            )}
                        >
                            <TabIcon className={cn('w-4 h-4', isActive ? 'text-gold-soft' : 'text-emerald')} />
                            <span>{tab.labelBng}</span>
                        </button>
                    );
                })}
            </nav>

            {/* =================================================================
                3. TAB 1: 9:00 AM GATE RULE & ZKTECO K40 HARDWARE CONFIG
               ================================================================= */}
            {activeTab === 'ATTENDANCE' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
                    <div className="ledger-surface p-6 bg-paper-panel space-y-4">
                        <div className="pb-3 border-b border-ink-faint">
                            <span className="font-mono text-[10px] uppercase text-gold-deep font-bold block">
                                Gate Lock Time Engine
                            </span>
                            <h3 className="font-bengali text-base font-bold text-emerald-deep">
                                সকাল ৯:০০টার উপস্থিতি ও প্রস্থান সময়সীমা
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormInput
                                labelEng="Morning Gate Cutoff Time"
                                labelBng="সকালের সর্বশেষ উপস্থিতির সময় (Cutoff)"
                                type="time"
                                variant="erp"
                                isMonoText
                                value={policy.gateCutoffTime24}
                                onChange={(e) => updateField('gateCutoffTime24', e.target.value)}
                                hint="এর পরে পাঞ্চ করলেই স্বয়ংক্রিয়ভাবে Late (০.৫ কোটা) গণ্য হবে।"
                            />

                            <FormInput
                                labelEng="Late Arrival Threshold"
                                labelBng="বিলম্ব হিসেবে গণনার সময়সীমা"
                                type="time"
                                variant="erp"
                                isMonoText
                                value={policy.defaultLateLimit}
                                onChange={(e) => updateField('defaultLateLimit', e.target.value)}
                            />

                            <fieldset className="mb-5">
                                <legend className="text-xs font-semibold tracking-wider text-ink-soft mb-2">
                                    <span className="uppercase">Weekly Holidays</span>
                                    <span className="mx-1.5 text-ink-muted">·</span>
                                    <span className="font-bengali text-[13px] text-ink">সাপ্তাহিক ছুটির দিন</span>
                                </legend>
                                <div className="flex flex-wrap gap-2">
                                    {['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'].map((day, value) => (
                                        <label key={value} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-faint px-2.5 py-2 font-bengali text-xs cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={policy.weekendDays.includes(String(value))}
                                                onChange={(e) => updateField(
                                                    'weekendDays',
                                                    e.target.checked
                                                        ? [...policy.weekendDays, String(value)]
                                                        : policy.weekendDays.filter((item) => item !== String(value))
                                                )}
                                                className="accent-emerald"
                                            />
                                            {day}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        </div>
                    </div>

                    <div className="ledger-surface p-6 bg-paper-panel flex flex-col justify-center space-y-3">
                        <div className="flex items-center gap-2 text-emerald-deep">
                            <Fingerprint className="w-5 h-5" />
                            <h3 className="font-bengali font-bold">বায়োমেট্রিক ডিভাইস সংযোগ</h3>
                        </div>
                        <p className="font-bengali text-sm text-ink-soft leading-relaxed">
                            ডিভাইসটি ADMS push-এর মাধ্যমে সার্ভারে পাঞ্চ পাঠায়। ডিভাইসের নেটওয়ার্ক ঠিকানা স্থানীয় নেটওয়ার্কে সেট করুন; ব্রাউজার থেকে ডিভাইসের সংযোগ যাচাই করা হয় না।
                        </p>
                        <code className="font-mono text-xs text-emerald-deep">/iclock/cdata</code>
                    </div>
                </div>
            )}

            {/* =================================================================
                4. TAB 2: 2.0 FREE QUOTA & 30-DAY PAYROLL DEDUCTION POLICY
               ================================================================= */}
            {activeTab === 'QUOTA_PAYROLL' && (
                <div className="ledger-surface p-6 bg-paper-panel space-y-5 animate-fade-up">
                    <div className="pb-3 border-b border-ink-faint">
                        <span className="font-mono text-[10px] uppercase text-gold-deep font-bold block">
                            Quota &amp; Pro-Rata Financial Engine
                        </span>
                        <h3 className="font-bengali text-base sm:text-lg font-bold text-emerald-deep">
                            মাসিক ২.০ ফ্রি ছুটির কোটা এবং ৩০-দিনের আনুপাতিক বেতন কর্তন সূত্র
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        <FormInput
                            labelEng="Default Monthly Free Quota"
                            labelBng="মাসিক ফ্রি ছুটির কোটা (ডিফল্ট ২.০)"
                            variant="erp"
                            isMonoText
                            value={policy.defaultMonthlyFreeQuota}
                            onChange={(e) => updateField('defaultMonthlyFreeQuota', e.target.value)}
                            hint="এই মাসিক কোটা বেতন হিসাবের সময় বছর শুরু থেকে জমবে; আগের মাসের অব্যবহৃত কোটা পরের মাসে বহন হবে।"
                        />

                        <FormInput
                            labelEng="Late Arrival Quota Weight"
                            labelBng="প্রতিটি বিলম্বের (Late) কোটা ওজন"
                            variant="erp"
                            isMonoText
                            value={policy.lateQuotaWeight}
                            onChange={(e) => updateField('lateQuotaWeight', e.target.value)}
                            hint="০.৫ মানে ২ দিন দেরিতে আসলে ১.০ কোটা পূর্ণ হবে।"
                        />

                        <FormInput
                            labelEng="Approved Leave Quota Weight"
                            labelBng="প্রতিটি অনুমোদিত ছুটির (Leave) ওজন"
                            variant="erp"
                            isMonoText
                            value={policy.leaveQuotaWeight}
                            onChange={(e) => updateField('leaveQuotaWeight', e.target.value)}
                            hint="১ দিন অনুমোদিত ছুটি নিলে ১.০ কোটা ব্যবহৃত হবে।"
                        />

                        <FormInput
                            labelEng="Unexcused Absence Penalty (Days)"
                            labelBng="অননুমোদিত অনুপস্থিতির কর্তন (দিন)"
                            variant="erp"
                            isMonoText
                            value={policy.unexcusedAbsentDeductionDays}
                            onChange={(e) => updateField('unexcusedAbsentDeductionDays', e.target.value)}
                        />

                        <FormInput
                            labelEng="Salary Month Divisor (Days)"
                            labelBng="দৈনিক বেতন হিসাবের ভাজক (৩০ দিন)"
                            variant="erp"
                            isMonoText
                            value={policy.salaryMonthDivisor}
                            onChange={(e) => updateField('salaryMonthDivisor', e.target.value)}
                            hint="নির্দিষ্ট দিনের মোডে দৈনিক বেতন = মূল বেতন ÷ এই সংখ্যা।"
                        />

                        <FormSelect
                            labelEng="Salary Month Calculation"
                            labelBng="মাসিক বেতনের দিনের হিসাব"
                            variant="erp"
                            value={String(policy.useExactCalendarDays)}
                            onChange={(e) => updateField('useExactCalendarDays', e.target.value === 'true')}
                            options={[
                                { value: 'true', label: 'প্রতি মাসের প্রকৃত ক্যালেন্ডার দিন' },
                                { value: 'false', label: 'নির্দিষ্ট ভাজক ব্যবহার' }
                            ]}
                            placeholder={false}
                        />
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-subtle border border-emerald-border text-xs font-bengali text-emerald-deep">
                        <Sparkles className="w-4 h-4 inline mr-1.5 text-gold-deep" />
                        <b>নীতিমালা:</b> কোটা ব্যবহৃত হবে <code>(Late × {policy.lateQuotaWeight}) + (Leave × {policy.leaveQuotaWeight})</code> সূত্রে। <code>{policy.defaultMonthlyFreeQuota}</code> মাসিক কোটা বছর শুরু থেকে জমবে; অব্যবহৃত কোটা পরের মাসে যোগ হবে। অননুমোদিত অনুপস্থিতির বেতন কর্তন quota থেকে আলাদা। {policy.useExactCalendarDays ? 'দৈনিক বেতন সংশ্লিষ্ট মাসের প্রকৃত দিনের ভিত্তিতে গণনা হবে।' : `দৈনিক বেতন মূল বেতন ÷ ${policy.salaryMonthDivisor} হিসেবে গণনা হবে।`}
                    </div>
                </div>
            )}

            {/* =================================================================
                5. TAB 3: OFFICIAL HOLIDAY CALENDAR MANAGER
               ================================================================= */}
            {activeTab === 'HOLIDAYS' && (
                <div className="ledger-surface p-6 bg-paper-panel space-y-4 animate-fade-up">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-ink-faint">
                        <div>
                            <h3 className="font-bengali text-base sm:text-lg font-bold text-emerald-deep">
                                বার্ষিক সরকারি ও মাদ্রাসা ছুটির তালিকা ({toBengaliDigits(holidays.length)}টি)
                            </h3>
                            <p className="font-bengali text-xs text-ink-soft">
                                তালিকাভুক্ত ছুটির দিনগুলোতে বায়োমেট্রিক পাঞ্চ না থাকলেও কোনো শিক্ষকের কোটা বা বেতন কর্তন হবে না।
                            </p>
                        </div>

                        <Button
                            variant="emerald"
                            size="sm"
                            leftIcon={Plus}
                            onClick={() => setIsAddHolidayOpen(true)}
                        >
                            <span className="font-bengali">নতুন ছুটি যুক্ত করুন</span>
                        </Button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-paper-deep border-b border-ink-faint font-bengali text-emerald-deep">
                                    <th className="py-3 px-4">ছুটির বিবরণ</th>
                                    <th className="py-3 px-3">শুরুর তারিখ</th>
                                    <th className="py-3 px-3 text-center">ধরন</th>
                                    <th className="py-3 px-4 text-right">অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-faint font-bengali">
                                {holidays.map((h) => (
                                    <tr key={h.id} className="hover:bg-emerald-subtle/25">
                                        <td className="py-3 px-4 font-bold text-emerald-deep">
                                            {h.titleBng}
                                        </td>
                                        <td className="py-3 px-3 font-semibold">
                                            {formatDisplayDate(h.date, 'bn')}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <Badge variant="gold" size="sm" mono>
                                                {h.type}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                leftIcon={Trash2}
                                                onClick={() => handleDeleteHoliday(h)}
                                                className="text-danger hover:bg-danger-bg"
                                            >
                                                <span className="font-bengali">মুছুন</span>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {holidays.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="py-6 px-4 text-center text-ink-muted">
                                            কোনো সংরক্ষিত ছুটি নেই।
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* =================================================================
                6. TAB 4: INSTITUTION INFO & 1-CLICK JSON DATABASE BACKUP
               ================================================================= */}
            {activeTab === 'SYSTEM_BACKUP' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
                    <div className="ledger-surface p-6 bg-paper-panel space-y-4">
                        <h3 className="font-bengali text-base font-bold text-emerald-deep pb-3 border-b border-ink-faint flex items-center gap-2">
                            <Building2 className="w-4.5 h-4.5 text-gold-deep" />
                            প্রতিষ্ঠানের অফিশিয়াল তথ্য ও সিকিউরিটি লকআউট
                        </h3>

                        <FormInput
                            labelEng="Institution Name (Bengali)"
                            labelBng="মাদ্রাসার নাম (বাংলা)"
                            variant="erp"
                            isBengaliText
                            value={policy.madrasahNameBng}
                            onChange={(e) => updateField('madrasahNameBng', e.target.value)}
                        />

                        <FormInput
                            labelEng="Institution Name (English)"
                            labelBng="মাদ্রাসার নাম (ইংরেজি)"
                            variant="erp"
                            value={policy.madrasahNameEng}
                            onChange={(e) => updateField('madrasahNameEng', e.target.value)}
                        />

                        <p className="font-bengali text-xs text-ink-muted">
                            লগইন লকআউটের নিরাপত্তা মান সার্ভার কনফিগারেশন থেকে নিয়ন্ত্রিত হয়।
                        </p>
                    </div>

                    <div className="ledger-surface p-6 bg-paper-panel flex flex-col justify-between">
                        <div>
                            <Badge variant="gold" size="sm" mono className="mb-2">
                                DISASTER RECOVERY &amp; EXPORT
                            </Badge>
                            <h3 className="font-bengali text-base font-bold text-emerald-deep">
                                ওয়ান-ক্লিক সিস্টেম ও ডাটাবেস ব্যাকআপ (JSON)
                            </h3>
                            <p className="font-bengali text-xs text-ink-soft mt-1 leading-relaxed">
                                সার্ভারে সংরক্ষিত প্রতিষ্ঠানের তথ্য, হাজিরা, বেতন, ছুটি ও নীতিমালার পূর্ণাঙ্গ ব্যাকআপ ডাউনলোড করুন।
                            </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-ink-faint flex justify-end">
                            <Button
                                variant="emerald"
                                size="md"
                                leftIcon={Download}
                                onClick={handleDownloadJsonBackup}
                            >
                                <span className="font-bengali">সম্পূর্ণ ডাটাবেস ব্যাকআপ ডাউনলোড (.json)</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* নতুন ছুটি যোগ করার মডাল */}
            <Modal
                isOpen={isAddHolidayOpen}
                onClose={() => setIsAddHolidayOpen(false)}
                size="sm"
                titleEng="Add Official Madrasah Holiday"
                titleBng="নতুন সরকারি বা মাদ্রাসা ছুটি যোগ করুন"
                footer={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setIsAddHolidayOpen(false)}>
                            <span className="font-bengali">বাতিল</span>
                        </Button>
                        <Button variant="emerald" size="sm" onClick={handleAddHoliday}>
                            <span className="font-bengali">ছুটি সংরক্ষণ করুন</span>
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <FormInput
                        labelEng="Holiday Title (Bengali)"
                        labelBng="ছুটির নাম (বাংলায়)"
                        variant="erp"
                        isBengaliText
                        value={newHoliday.titleBng}
                        onChange={(e) => setNewHoliday((prev) => ({ ...prev, titleBng: e.target.value }))}
                        placeholder="যেমনঃ পবিত্র ঈদে মিলাদুন্নবী (সা.)"
                        required
                    />
                    <FormInput
                        labelEng="Start Date"
                        labelBng="ছুটি শুরুর তারিখ"
                        type="date"
                        variant="erp"
                        isMonoText
                        value={newHoliday.date}
                        onChange={(e) => setNewHoliday((prev) => ({ ...prev, date: e.target.value }))}
                    />
                </div>
            </Modal>
        </div>
    );
}
