/**
 * ARDM Enterprise ERP — Admin Teacher Directory & Auto-Seniority Ranking Ledger (Step 15)
 * Features:
 * - Automatic Seniority & Merit Ranking across 15 Official Designations + Normalized GPA (5.00 Scale)
 * - Instant Search (Bengali/English Name, 10-Digit ID, Phone, Biometric PIN)
 * - Filters by Staff Category (Teaching vs Non-Teaching), Designation & Account Status
 * - Dual View Mode: Royal Ledger Table View & Portrait Card Grid View + A4 Staff Register Print
 * - Admin Override Modal: Edit Basic Salary, Biometric Device ID, Leave Quota, Role & Status
 * - 1-Click Digital Registry ID Card & Dossier Preview Modal for any Teacher
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Search,
    Award,
    Sparkles,
    Edit3,
    IdCard,
    Printer,
    UserPlus,
    RefreshCw,
    CheckCircle2,
    XCircle,
    LayoutGrid,
    ListFilter,
    Table as TableIcon,
    Fingerprint,
    Phone,
    ShieldCheck,
    SlidersHorizontal
} from 'lucide-react';
import {
    INSTITUTION_INFO,
    DESIGNATION_LIST
} from '@constants/app.constants';
import {
    Button,
    FormInput,
    FormSelect,
    Badge,
    Modal
} from '@components/ui';
import { useToast } from '@context/ToastContext';
import { useAuth } from '@context/AuthContext';
import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';
import {
    toBengaliDigits,
    formatBDT,
    formatPhoneDisplay,
    formatDisplayDate,
    calculateLiveRankMetrics,
    extractPureDigits
} from '@utils/formatters';
import DigitalRegistryIdCard from '@pages/public/registration/DigitalRegistryIdCard';
import { cn } from '@utils/cn';

/**
 * ১৫টি পদবীর অগ্রাধিকার + সর্বোচ্চ ডিগ্রির ওয়েট + ৫.০০ স্কেল জিপিএ + যোগদানের তারিখ অনুযায়ী অটো-সিনিয়রিটি সর্টিং ইঞ্জিন
 */
export function computeAutoSeniorityRanking(teachersArray = []) {
    const enriched = teachersArray.map((t) => {
        const metrics = calculateLiveRankMetrics(t.designation, t.academicQualifications);
        const joinTimestamp = t.joiningDate ? new Date(t.joiningDate).getTime() : Number.MAX_SAFE_INTEGER;
        const dobTimestamp = t.dateOfBirth ? new Date(t.dateOfBirth).getTime() : Number.MAX_SAFE_INTEGER;

        return {
            ...t,
            computedMetrics: metrics,
            _joinTs: isNaN(joinTimestamp) ? Number.MAX_SAFE_INTEGER : joinTimestamp,
            _dobTs: isNaN(dobTimestamp) ? Number.MAX_SAFE_INTEGER : dobTimestamp
        };
    });

    // সর্টিং নিয়ম:
    // ১. পদবীর বেস র‍্যাংক (১ সবার উপরে, ১৫ সবার নিচে)
    // ২. একই পদবীতে সর্বোচ্চ ডিগ্রির ওয়েট (কামিল/মাস্টার্স = ৫ > ফাজিল/অনার্স = ৪)
    // ৩. ৫.০০ স্কেলে সমমানকৃত সর্বোচ্চ GPA/CGPA
    // ৪. আগে যোগদানের তারিখ (Seniority by Joining Date)
    // ৫. বয়সে জ্যেষ্ঠতা (Date of Birth)
    enriched.sort((a, b) => {
        if (a.computedMetrics.designationPriority !== b.computedMetrics.designationPriority) {
            return a.computedMetrics.designationPriority - b.computedMetrics.designationPriority;
        }
        if (b.computedMetrics.highestDegreeWeight !== a.computedMetrics.highestDegreeWeight) {
            return b.computedMetrics.highestDegreeWeight - a.computedMetrics.highestDegreeWeight;
        }
        if (b.computedMetrics.highestNormalizedGpa !== a.computedMetrics.highestNormalizedGpa) {
            return b.computedMetrics.highestNormalizedGpa - a.computedMetrics.highestNormalizedGpa;
        }
        if (a._joinTs !== b._joinTs) {
            return a._joinTs - b._joinTs;
        }
        return a._dobTs - b._dobTs;
    });

    return enriched.map((item, idx) => ({
        ...item,
        overallMadrasahRank: idx + 1
    }));
}

export default function TeacherDirectory() {
    const toast = useToast();
    const { isSuperAdmin } = useAuth();
    const navigate = useNavigate();

    // ১. শিক্ষক তালিকা ও ফিল্টার স্টেট
    const [rawTeachers, setRawTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'GRID'

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'Teaching' | 'Non-Teaching'
    const [designationFilter, setDesignationFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

    // ২. এডিট মডাল ও ডিজিটাল আইডি কার্ড ভিউয়ার মডাল স্টেট
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [viewingIdCardTeacher, setViewingIdCardTeacher] = useState(null);

    // ৩. ব্যাকএন্ড থেকে শিক্ষক তালিকা লোড করা
    const fetchTeachersFromServer = useCallback(async (showToastMsg = false) => {
        setIsLoading(true);
        try {
            const res = await axiosClient.get('/teachers');
            const serverList = res?.data?.data?.teachers || res?.data?.data;
            if (!Array.isArray(serverList)) throw new Error('সার্ভার থেকে শিক্ষক তালিকা পাওয়া যায়নি।');
            setRawTeachers(serverList);
            if (showToastMsg) {
                toast.success('শিক্ষক তালিকা সার্ভার থেকে হালনাগাদ হয়েছে।');
            }
        } catch (error) {
            setRawTeachers([]);
            toast.error(extractApiErrorMessage(error, 'শিক্ষক তালিকা লোড করা যায়নি।'));
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchTeachersFromServer(false);
    }, [fetchTeachersFromServer]);

    // ৪. অটো-সিনিয়রিটি র‍্যাংকিং ক্যালকুলেশন
    const rankedTeachers = useMemo(
        () => computeAutoSeniorityRanking(rawTeachers),
        [rawTeachers]
    );

    // ৫. সার্চ ও মাল্টি-ফিল্টারিং ইঞ্জিন
    const filteredTeachers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        return rankedTeachers.filter((t) => {
            if (categoryFilter !== 'ALL' && t.computedMetrics.staffCategory !== categoryFilter) {
                return false;
            }
            if (designationFilter !== 'ALL' && t.designation !== designationFilter) {
                return false;
            }
            if (statusFilter === 'ACTIVE' && t.isActive === false) {
                return false;
            }
            if (statusFilter === 'INACTIVE' && t.isActive !== false) {
                return false;
            }

            if (!q) return true;

            const matchNameBng = (t.fullNameBng || '').toLowerCase().includes(q);
            const matchNameEng = (t.fullNameEng || '').toLowerCase().includes(q);
            const matchCode = String(t.teacherCode || '').includes(q);
            const matchPhone = String(t.phone || '').includes(q);
            const matchBio = String(t.biometricDeviceId || '') === q;
            const matchSubj = (t.subject || '').toLowerCase().includes(q);

            return matchNameBng || matchNameEng || matchCode || matchPhone || matchBio || matchSubj;
        });
    }, [rankedTeachers, searchQuery, categoryFilter, designationFilter, statusFilter]);

    // ৬. অ্যাডমিন এডিট মডাল ওপেন করা
    const handleOpenEditModal = (teacherObj) => {
        if (teacherObj.role === 'SuperAdmin' && !isSuperAdmin) {
            toast.error('সুপার অ্যাডমিন অ্যাকাউন্ট পরিবর্তন করতে সুপার অ্যাডমিনের অনুমতি প্রয়োজন।');
            return;
        }
        setEditingTeacher(teacherObj);
        setEditForm({
            fullNameBng: teacherObj.fullNameBng || '',
            fullNameEng: teacherObj.fullNameEng || '',
            designation: teacherObj.designation || '',
            subject: teacherObj.subject || 'General',
            basicSalary: String(teacherObj.basicSalary || 0),
            biometricDeviceId: String(teacherObj.biometricDeviceId || 1),
            customLeaveQuota: String(teacherObj.customLeaveQuota ?? 2.0),
            paymentMethod: teacherObj.paymentMethod || 'Cash',
            role: teacherObj.role || 'Teacher',
            phone: teacherObj.phone || '',
            isActive: teacherObj.isActive !== false
        });
    };

    // ৭. শিক্ষকের বেতন, পদবী, বায়োমেট্রিক আইডি ও রোল আপডেট সংরক্ষণ করা
    const handleSaveTeacherUpdate = async () => {
        if (!editingTeacher) return;

        const cleanSalary = Number(extractPureDigits(editForm.basicSalary));
        const cleanBio = Number(extractPureDigits(editForm.biometricDeviceId));

        if (isNaN(cleanSalary) || cleanSalary < 0) {
            toast.error('অনুগ্রহ করে সঠিক মূল বেতন প্রদান করুন।');
            return;
        }
        if (!cleanBio || cleanBio < 1) {
            toast.error('সঠিক বায়োমেট্রিক ডিভাইস আইডি (কমপক্ষে ১) প্রদান করুন।');
            return;
        }

        setIsSavingEdit(true);
        try {
            const updatePayload = {
                fullNameBng: editForm.fullNameBng.trim(),
                fullNameEng: editForm.fullNameEng.trim(),
                designation: editForm.designation,
                subject: editForm.subject.trim(),
                basicSalary: cleanSalary,
                biometricDeviceId: cleanBio,
                customLeaveQuota: Number(editForm.customLeaveQuota) || 2.0,
                paymentMethod: editForm.paymentMethod,
                role: editForm.role,
                phone: extractPureDigits(editForm.phone),
                isActive: Boolean(editForm.isActive)
            };

            await axiosClient.patch(`/teachers/${editingTeacher._id}`, updatePayload);

            // লোকাল তালিকায় আপডেট করে সাথে সাথে অটো-র‍্যাংকিং পুনঃগণনা করা
            setRawTeachers((prev) =>
                prev.map((item) =>
                    item._id === editingTeacher._id
                        ? { ...item, ...updatePayload }
                        : item
                )
            );

            toast.success(`${updatePayload.fullNameBng}-এর প্রোফাইল, বেতন ও র‍্যাংক সফলভাবে আপডেট হয়েছে!`);
            setEditingTeacher(null);
        } catch (err) {
            toast.error(extractApiErrorMessage(err, 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে।'));
        } finally {
            setIsSavingEdit(false);
        }
    };

    // ক্যাটাগরি কাউন্টস
    const totalTeaching = rankedTeachers.filter((t) => t.computedMetrics.staffCategory === 'Teaching').length;
    const totalNonTeaching = rankedTeachers.length - totalTeaching;
    const totalMonthlySalary = rankedTeachers.reduce((sum, t) => sum + (Number(t.basicSalary) || 0), 0);

    return (
        <div className="space-y-6 animate-fade-up">

            {/* =================================================================
                1. DIRECTORY HEADER & AUTO-RANKING CONTROLS
               ================================================================= */}
            <section className="ledger-surface p-6 bg-paper-panel flex flex-wrap items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald text-gold-soft flex items-center justify-center shadow-xs shrink-0">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="gold" size="sm" mono>
                                STEP 15 · SENIORITY &amp; STAFF DIRECTORY
                            </Badge>
                            <Badge variant="emerald-subtle" size="sm">
                                ১৫ পদবী ও সিজিপিএ র‍্যাংকিং ইঞ্জিন
                            </Badge>
                        </div>
                        <h1 className="font-bengali text-xl sm:text-2xl font-bold text-emerald-deep mt-1">
                            শিক্ষক ও কর্মচারী সিনিয়রিটি তালিকা ({toBengaliDigits(rankedTeachers.length)} জন)
                        </h1>
                        <p className="font-bengali text-xs text-ink-soft">
                            শিক্ষক: <b>{toBengaliDigits(totalTeaching)} জন</b> · কর্মচারী: <b>{toBengaliDigits(totalNonTeaching)} জন</b> · মাসিক মূল বেতন সমষ্টি: <b className="text-emerald-deep">{formatBDT(totalMonthlySalary, true)}</b>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={RefreshCw}
                        isLoading={isLoading}
                        onClick={() => fetchTeachersFromServer(true)}
                    >
                        <span className="font-bengali">র‍্যাংক পুনঃগণনা করুন</span>
                    </Button>

                    <Button
                        variant="gold"
                        size="sm"
                        leftIcon={Printer}
                        onClick={() => window.print()}
                    >
                        <span className="font-bengali">A4 তালিকা প্রিন্ট</span>
                    </Button>

                    <Button
                        variant="emerald"
                        size="sm"
                        leftIcon={UserPlus}
                        onClick={() => navigate('/register')}
                    >
                        <span className="font-bengali">নতুন শিক্ষক যোগ করুন</span>
                    </Button>
                </div>
            </section>

            {/* =================================================================
                2. SEARCH & MULTI-FACETED FILTER BAR (Hidden in Print)
               ================================================================= */}
            <section className="ledger-surface p-4 sm:p-5 bg-paper-panel space-y-4 no-print">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                    {/* সার্চ ইনপুট (নাম, ১০-ডিজিট আইডি, মোবাইল বা বায়োমেট্রিক পিন) */}
                    <div className="md:col-span-5 relative">
                        <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="নাম, ১০-ডিজিট আইডি (1026...), মোবাইল বা বায়োমেট্রিক পিন..."
                            className="erp-input pl-10 font-bengali text-xs sm:text-sm"
                        />
                    </div>

                    {/* ক্যাটাগরি ট্যাব (All | Teaching | Non-Teaching) */}
                    <div className="md:col-span-4 flex items-center rounded-xl p-1 bg-paper-deep border border-ink-faint">
                        {[
                            { key: 'ALL', label: 'সকল স্টাফ' },
                            { key: 'Teaching', label: 'শিক্ষক' },
                            { key: 'Non-Teaching', label: 'কর্মচারী' }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setCategoryFilter(tab.key)}
                                className={cn(
                                    'flex-1 py-1.5 px-2 rounded-lg font-bengali text-xs font-semibold transition-all',
                                    categoryFilter === tab.key
                                        ? 'bg-emerald text-white shadow-2xs'
                                        : 'text-ink-soft hover:text-ink'
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* পদবী ফিল্টার এবং ভিউ মোড সুইচার */}
                    <div className="md:col-span-3 flex items-center gap-2">
                        <select
                            value={designationFilter}
                            onChange={(e) => setDesignationFilter(e.target.value)}
                            className="erp-input custom-select-arrow font-bengali text-xs py-2 flex-1"
                        >
                            <option value="ALL">সকল পদবী (১৫টি)</option>
                            {DESIGNATION_LIST.map((d) => (
                                <option key={d.code} value={d.titleEng}>
                                    #{d.rankPriority} · {d.titleBng}
                                </option>
                            ))}
                        </select>

                        <div className="inline-flex rounded-xl p-1 bg-paper-deep border border-ink-faint shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewMode('TABLE')}
                                className={cn(
                                    'p-1.5 rounded-lg transition-colors',
                                    viewMode === 'TABLE' ? 'bg-emerald text-white' : 'text-ink-muted hover:text-ink'
                                )}
                                title="টেবিল ভিউ"
                            >
                                <TableIcon className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('GRID')}
                                className={cn(
                                    'p-1.5 rounded-lg transition-colors',
                                    viewMode === 'GRID' ? 'bg-emerald text-white' : 'text-ink-muted hover:text-ink'
                                )}
                                title="কার্ড গ্রিড ভিউ"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* =================================================================
                3. PRINT HEADER (Visible ONLY when printing A4 Seniority Register)
               ================================================================= */}
            <div className="hidden print:block text-center pb-4 mb-4 border-b-2 border-emerald">
                <h1 className="font-serif text-2xl font-bold text-emerald-deep">
                    {INSTITUTION_INFO.nameEng}
                </h1>
                <p className="font-bengali text-sm font-bold text-emerald">
                    {INSTITUTION_INFO.nameBng} · শিক্ষক ও কর্মচারী অফিশিয়াল সিনিয়রিটি ও বেতন রেজিস্টার
                </p>
            </div>

            {/* =================================================================
                4. SENIORITY TABLE VIEW OR CARD GRID VIEW
               ================================================================= */}
            {viewMode === 'TABLE' ? (
                <section className="ledger-surface bg-paper-panel overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-paper-deep/90 border-b border-ink-faint text-[11.5px] font-bengali font-bold text-emerald-deep">
                                    <th className="py-3.5 pl-5 pr-2">সিনিয়রিটি র‍্যাংক</th>
                                    <th className="py-3.5 px-3">শিক্ষকের নাম ও ১০-ডিজিট আইডি</th>
                                    <th className="py-3.5 px-3">পদবী ও পাঠদানের বিষয়</th>
                                    <th className="py-3.5 px-3">সর্বোচ্চ ডিগ্রি ও সিজিপিএ</th>
                                    <th className="py-3.5 px-3 text-center">বায়োমেট্রিক পিন</th>
                                    <th className="py-3.5 px-3 text-right">মূল বেতন ও মাধ্যম</th>
                                    <th className="py-3.5 pl-3 pr-5 text-right no-print">কন্ট্রোল অ্যাকশন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-faint text-xs">
                                {filteredTeachers.map((tch) => {
                                    const m = tch.computedMetrics;
                                    const topQual = tch.academicQualifications?.[0];

                                    return (
                                        <tr
                                            key={tch._id}
                                            className="hover:bg-emerald-subtle/35 transition-colors"
                                        >
                                            {/* ১. অফিশিয়াল সিনিয়রিটি র‍্যাংক ব্যাজ */}
                                            <td className="py-3.5 pl-5 pr-2 whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <span
                                                        className={cn(
                                                            'w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center border shadow-2xs',
                                                            tch.overallMadrasahRank === 1
                                                                ? 'bg-gold text-emerald-deep border-gold-deep'
                                                                : tch.overallMadrasahRank <= 3
                                                                    ? 'bg-emerald-deep text-gold-soft border-gold/40'
                                                                    : 'bg-paper-deep text-emerald-deep border-ink-faint'
                                                        )}
                                                    >
                                                        #{tch.overallMadrasahRank}
                                                    </span>
                                                    <span className="font-mono text-[10px] text-ink-muted block">
                                                        Base #{m.designationPriority}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* ২. নাম, ছবি ও ১০-ডিজিট টিচার আইডি */}
                                            <td className="py-3.5 px-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald text-gold-soft font-serif font-bold text-base flex items-center justify-center shrink-0 border border-gold/30 overflow-hidden">
                                                        {tch.profilePicture?.url ? (
                                                            <img
                                                                src={tch.profilePicture.url}
                                                                alt={tch.fullNameEng}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            tch.fullNameBng.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bengali text-sm font-bold text-emerald-deep">
                                                                {tch.fullNameBng}
                                                            </span>
                                                            {tch.role !== 'Teacher' && (
                                                                <Badge variant="gold" size="sm" mono>
                                                                    {tch.role}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="font-mono text-[11px] text-ink-soft flex items-center gap-2 mt-0.5">
                                                            <b className="text-emerald">{tch.teacherCode}</b>
                                                            <span>•</span>
                                                            <span>{formatPhoneDisplay(tch.phone)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* ৩. পদবী ও বিষয় */}
                                            <td className="py-3.5 px-3">
                                                <p className="font-bengali font-bold text-ink">
                                                    {m.designationBng}
                                                </p>
                                                <p className="font-bengali text-[11px] text-ink-soft mt-0.5">
                                                    বিষয়: {tch.subject || 'সাধারণ'} · যোগদান: {formatDisplayDate(tch.joiningDate, 'bn')}
                                                </p>
                                            </td>

                                            {/* ৪. সর্বোচ্চ ডিগ্রি ও ৫.০০ স্কেল সমমান জিপিএ */}
                                            <td className="py-3.5 px-3">
                                                <span className="font-bengali font-semibold text-emerald-deep block">
                                                    {topQual?.examTitle || m.highestDegreeLabel}
                                                </span>
                                                <span className="font-mono text-[11px] text-gold-deep font-bold">
                                                    5.00 Eqv GPA: {m.highestNormalizedGpa.toFixed(2)} (Wt: {m.highestDegreeWeight})
                                                </span>
                                            </td>

                                            {/* ৫. ZKTeco K40 বায়োমেট্রিক ডিভাইস আইডি */}
                                            <td className="py-3.5 px-3 text-center">
                                                <Badge variant="emerald-subtle" size="md" mono>
                                                    PIN #{tch.biometricDeviceId}
                                                </Badge>
                                            </td>

                                            {/* ৬. মূল বেতন ও পেমেন্ট মেথড */}
                                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                                <span className="font-bengali text-sm font-bold text-emerald-deep block">
                                                    {formatBDT(tch.basicSalary, true)}
                                                </span>
                                                <span className="font-mono text-[10px] text-ink-muted">
                                                    {tch.paymentMethod || 'Cash'} · Quota: {tch.customLeaveQuota ?? 2.0}
                                                </span>
                                            </td>

                                            {/* ৭. অ্যাকশন বাটনসমূহ */}
                                            <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap no-print">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <Button
                                                        variant="outline"
                                                        size="xs"
                                                        leftIcon={IdCard}
                                                        onClick={() =>
                                                            setViewingIdCardTeacher({
                                                                uid: tch.uid || `ardm-${tch.teacherCode}`,
                                                                teacherId: tch.teacherCode,
                                                                registrationStatus: tch.registrationStatus || 'Approved',
                                                                teacher: tch
                                                            })
                                                        }
                                                    >
                                                        <span className="font-bengali">আইডি কার্ড</span>
                                                    </Button>

                                                    <Button
                                                        variant="emerald"
                                                        size="xs"
                                                        leftIcon={Edit3}
                                                        onClick={() => navigate(`/admin/teachers/${tch._id}`, { state: { teacher: tch } })}
                                                    >
                                                        <span className="font-bengali">৩৬০° ডসিয়ার</span>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : (
                /* কার্ড গ্রিড ভিউ */
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredTeachers.map((tch) => {
                        const m = tch.computedMetrics;
                        return (
                            <div
                                key={tch._id}
                                className="ledger-surface p-5 bg-paper-panel flex flex-col justify-between hover:border-gold transition-all"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-ink-faint">
                                        <Badge variant="emerald" size="sm" mono>
                                            Seniority Rank #{tch.overallMadrasahRank}
                                        </Badge>
                                        <Badge variant="gold" size="sm" mono>
                                            ID: {tch.teacherCode}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-3.5 mb-3">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald text-gold-soft font-serif font-bold text-xl flex items-center justify-center shrink-0">
                                            {tch.fullNameBng.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bengali text-base font-bold text-emerald-deep">
                                                {tch.fullNameBng}
                                            </h3>
                                            <p className="font-bengali text-xs font-semibold text-emerald">
                                                {m.designationBng} ({tch.subject})
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-xl bg-paper border border-ink-faint space-y-1 text-xs font-bengali">
                                        <div className="flex justify-between">
                                            <span className="text-ink-muted">সর্বোচ্চ ডিগ্রি ও পয়েন্ট:</span>
                                            <span className="font-semibold text-ink">
                                                {m.highestDegreeLabel} ({m.highestNormalizedGpa.toFixed(2)})
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-ink-muted">ZKTeco বায়োমেট্রিক পিন:</span>
                                            <span className="font-mono font-bold text-emerald-deep">
                                                PIN #{tch.biometricDeviceId}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-ink-muted">মাসিক মূল বেতন:</span>
                                            <span className="font-bold text-emerald-deep">
                                                {formatBDT(tch.basicSalary, true)} ({tch.paymentMethod})
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-ink-faint flex items-center justify-between gap-2 no-print">
                                    <Button
                                        variant="outline"
                                        size="xs"
                                        leftIcon={IdCard}
                                        onClick={() =>
                                            setViewingIdCardTeacher({
                                                uid: tch.uid || `ardm-${tch.teacherCode}`,
                                                teacherId: tch.teacherCode,
                                                registrationStatus: 'Approved',
                                                teacher: tch
                                            })
                                        }
                                    >
                                        <span className="font-bengali">ডিজিটাল আইডি কার্ড</span>
                                    </Button>

                                    <Button
                                        variant="emerald"
                                        size="xs"
                                        leftIcon={Edit3}
                                        onClick={() => handleOpenEditModal(tch)}
                                    >
                                        <span className="font-bengali">৩৬০° প্রোফাইল ডসিয়ার</span>
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}

            {/* =================================================================
                5. ADMIN TEACHER PROFILE, SALARY & BIOMETRIC OVERRIDE MODAL
               ================================================================= */}
            <Modal
                isOpen={Boolean(editingTeacher)}
                onClose={() => setEditingTeacher(null)}
                size="lg"
                titleEng="Admin Staff Ledger & Payroll Configuration"
                titleBng="শিক্ষকের পদবী, মূল বেতন ও বায়োমেট্রিক কনফিগারেশন"
                subtitleBng={
                    editingTeacher
                        ? `${editingTeacher.fullNameBng} · Official 10-Digit ID: ${editingTeacher.teacherCode}`
                        : ''
                }
                footer={
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTeacher(null)}
                            disabled={isSavingEdit}
                        >
                            <span className="font-bengali">বাতিল করুন</span>
                        </Button>
                        <Button
                            variant="emerald"
                            size="sm"
                            leftIcon={ShieldCheck}
                            isLoading={isSavingEdit}
                            loadingText="সংরক্ষিত হচ্ছে..."
                            onClick={handleSaveTeacherUpdate}
                        >
                            <span className="font-bengali">পরিবর্তন সংরক্ষণ ও র‍্যাংক আপডেট করুন</span>
                        </Button>
                    </>
                }
            >
                {editingTeacher && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormInput
                                labelEng="Full Name (Bengali)"
                                labelBng="শিক্ষকের নাম (বাংলা)"
                                variant="erp"
                                isBengaliText
                                value={editForm.fullNameBng}
                                onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, fullNameBng: e.target.value }))
                                }
                                required
                            />

                            <FormInput
                                labelEng="Full Name (English)"
                                labelBng="শিক্ষকের নাম (ইংরেজি)"
                                variant="erp"
                                value={editForm.fullNameEng}
                                onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, fullNameEng: e.target.value }))
                                }
                                required
                            />

                            <FormSelect
                                labelEng="Official Designation"
                                labelBng="পদবী (পরিবর্তন করলে সিনিয়রিটি র‍্যাংক আপডেট হবে)"
                                variant="erp"
                                value={editForm.designation}
                                onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, designation: e.target.value }))
                                }
                                options={DESIGNATION_LIST.map((d) => ({
                                    value: d.titleEng,
                                    label: `[Base #${d.rankPriority}] ${d.titleBng}`
                                }))}
                                placeholder={false}
                            />

                            <FormInput
                                labelEng="Subject / Department"
                                labelBng="পাঠদানের বিষয় বা দায়িত্ব"
                                variant="erp"
                                isBengaliText
                                value={editForm.subject}
                                onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, subject: e.target.value }))
                                }
                            />

                            <FormInput
                                labelEng="Monthly Basic Salary (BDT)"
                                labelBng="মাসিক মূল বেতন (টাকা)"
                                variant="erp"
                                inputMode="numeric"
                                isMonoText
                                value={editForm.basicSalary}
                                onChange={(e) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        basicSalary: extractPureDigits(e.target.value)
                                    }))
                                }
                                required
                            />

                            <FormInput
                                labelEng="ZKTeco K40 Biometric PIN"
                                labelBng="বায়োমেট্রিক ডিভাইস আইডি (PIN)"
                                variant="erp"
                                inputMode="numeric"
                                isMonoText
                                value={editForm.biometricDeviceId}
                                onChange={(e) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        biometricDeviceId: extractPureDigits(e.target.value)
                                    }))
                                }
                                required
                            />

                            <FormInput
                                labelEng="Monthly Free Leave Quota"
                                labelBng="মাসিক ফ্রি ছুটির কোটা (ডিফল্ট ২.০)"
                                variant="erp"
                                isMonoText
                                value={editForm.customLeaveQuota}
                                onChange={(e) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        customLeaveQuota: e.target.value
                                    }))
                                }
                            />

                            <FormSelect
                                labelEng="System Access Role"
                                labelBng="পোর্টাল অ্যাক্সেস রোল"
                                variant="erp"
                                value={editForm.role}
                                onChange={(e) =>
                                    setEditForm((prev) => ({ ...prev, role: e.target.value }))
                                }
                                options={[
                                    { value: 'Teacher', label: 'সাধারণ শিক্ষক (Teacher Portal)' },
                                    { value: 'Admin', label: 'অ্যাডমিন (Admin Command Access)' },
                                    ...(isSuperAdmin
                                        ? [{ value: 'SuperAdmin', label: 'সুপার অ্যাডমিন (Full Authority)' }]
                                        : [])
                                ]}
                                placeholder={false}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* =================================================================
                6. DIGITAL REGISTRY ID CARD & DOSSIER PREVIEW MODAL
               ================================================================= */}
            <Modal
                isOpen={Boolean(viewingIdCardTeacher)}
                onClose={() => setViewingIdCardTeacher(null)}
                size="xl"
                titleEng="Official Teacher Digital Identity Card"
                titleBng="ডিজিটাল রেজিস্ট্রি আইডি কার্ড ও নিবন্ধন সনদ"
                footer={
                    <Button variant="emerald" size="sm" onClick={() => setViewingIdCardTeacher(null)}>
                        <span className="font-bengali">মডাল বন্ধ করুন</span>
                    </Button>
                }
            >
                {viewingIdCardTeacher && (
                    <DigitalRegistryIdCard registryRecord={viewingIdCardTeacher} />
                )}
            </Modal>
        </div>
    );
}
