/**
 * ARDM Enterprise ERP — Admin Command Center Dashboard (Step 14)
 * Features:
 * - Real Backend Sync (/teachers, /attendance/daily, /payroll/sheet) with Instant Fallback Data
 * - 4 Executive KPI Cards (Staff Count, Today Attendance %, Pending Approvals, Monthly Cash Payroll)
 * - Recharts Weekly Biometric Attendance BarChart & 6-Month Payroll AreaChart
 * - ZKTeco K40 Today's Live Status Breakdown (Present, Late 0.5, Leave 1.0, Absent)
 * - Pending Teacher Approval Queue with Basic Salary & Biometric ID Assignment Modal
 * - Top Seniority & Merit Ranking Leaderboard Snapshot
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    UserCheck,
    Fingerprint,
    Banknote,
    RefreshCw,
    CheckCircle2,
    Clock,
    Award,
    XCircle,
    ChevronRight,
    Sparkles,
    Plus,
    BarChart3,
    TrendingUp,
    ShieldCheck,
    FileSpreadsheet,
    ArrowUpRight
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';
import { INSTITUTION_INFO } from '@constants/app.constants';
import {
    Button,
    Badge,
    Modal,
    FormInput,
    FormSelect
} from '@components/ui';
import { useToast } from '@context/ToastContext';
import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';
import {
    toBengaliDigits,
    formatBDT,
    formatPhoneDisplay,
    extractPureDigits
} from '@utils/formatters';
import { cn } from '@utils/cn';

export default function AdminDashboard() {
    const toast = useToast();
    const navigate = useNavigate();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [chartTab, setChartTab] = useState('ATTENDANCE'); // 'ATTENDANCE' | 'PAYROLL'

    // ড্যাশবোর্ড স্টেট
    const [stats, setStats] = useState({
        totalTeachers: 0,
        teachingCount: 0,
        nonTeachingCount: 0,
        monthlyPayrollNum: 0,
        todaySummary: {
            present: 0,
            late: 0,
            leave: 0,
            absent: 0,
            ratePercent: 0
        }
    });

    const [topTeachers, setTopTeachers] = useState([]);
    const [pendingQueue, setPendingQueue] = useState([]);
    const [weeklyAttendance, setWeeklyAttendance] = useState([]);
    const [payrollTrend, setPayrollTrend] = useState([]);
    const [dashboardError, setDashboardError] = useState('');

    // পেন্ডিং শিক্ষক অনুমোদন মডাল স্টেট (বেতন ও বায়োমেট্রিক আইডি নির্ধারণের জন্য)
    const [selectedPendingTeacher, setSelectedPendingTeacher] = useState(null);
    const [approvalForm, setApprovalForm] = useState({
        basicSalary: '',
        biometricDeviceId: '',
        customLeaveQuota: '2.0',
        paymentMethod: 'Cash'
    });
    const [isApproving, setIsApproving] = useState(false);

    // ব্যাকএন্ডের আসল এন্ডপয়েন্ট (/teachers) থেকে ডেটা সিঙ্ক করার ফাংশন
    const syncDashboardWithServer = useCallback(async (showNotification = false) => {
        setIsRefreshing(true);
        try {
            const [dashboardRes, teachersRes] = await Promise.all([
                axiosClient.get('/system/dashboard'),
                axiosClient.get('/teachers')
            ]);
            const overview = dashboardRes.data?.data;
            const list = teachersRes.data?.data?.teachers || teachersRes.data?.data;
            if (!overview?.teacherStats || !Array.isArray(list)) {
                throw new Error('সার্ভার থেকে ড্যাশবোর্ডের বৈধ তথ্য পাওয়া যায়নি।');
            }

            const approvedList = list.filter((teacher) => teacher.registrationStatus === 'Approved');
            const pendingFromDb = list.filter((teacher) => teacher.registrationStatus === 'Pending');
            const activeApprovedList = approvedList.filter((teacher) => teacher.isActive !== false);
            const teacherStats = overview.teacherStats;
            const present = Number(teacherStats.todayPresent) || 0;
            const late = Number(teacherStats.todayLate) || 0;
            const totalActive = Number(teacherStats.totalActiveTeachers) || 0;
            setStats({
                totalTeachers: totalActive,
                teachingCount: activeApprovedList.filter((teacher) => teacher.staffCategory !== 'Non-Teaching').length,
                nonTeachingCount: activeApprovedList.filter((teacher) => teacher.staffCategory === 'Non-Teaching').length,
                monthlyPayrollNum: Number(overview.payrollOverview?.totalMonthlyPayroll) || 0,
                todaySummary: {
                    present,
                    late,
                    leave: Number(teacherStats.todayLeave) || 0,
                    absent: Number(teacherStats.todayAbsent) || 0,
                    ratePercent: totalActive ? Math.round(((present + late) / totalActive) * 1000) / 10 : 0
                }
            });
            setTopTeachers(
                activeApprovedList
                    .slice()
                    .sort((a, b) => (a.rankingMetrics?.overallMadrasahRank || Infinity) - (b.rankingMetrics?.overallMadrasahRank || Infinity))
                    .slice(0, 4)
            );
            setWeeklyAttendance(Array.isArray(overview.weeklyAttendance) ? overview.weeklyAttendance : []);
            setPayrollTrend(Array.isArray(overview.payrollTrend) ? overview.payrollTrend : []);
            setPendingQueue(
                pendingFromDb.map((teacher) => ({
                    ...teacher,
                    highestDegree: teacher.academicQualifications?.[0]?.examTitle || '—',
                    suggestedBiometricId: teacher.biometricDeviceId || '',
                    suggestedBasicSalary: String(teacher.basicSalary || '')
                }))
            );
            setDashboardError('');

            if (showNotification) {
                toast.success('ড্যাশবোর্ডের সকল পরিসংখ্যান হালনাগাদ করা হয়েছে!');
            }
        } catch (error) {
            setDashboardError(extractApiErrorMessage(error, 'ড্যাশবোর্ডের তথ্য লোড করা যায়নি।'));
            if (showNotification) {
                toast.error(extractApiErrorMessage(error, 'ড্যাশবোর্ডের তথ্য লোড করা যায়নি।'));
            }
        } finally {
            setIsRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        syncDashboardWithServer(false);
    }, [syncDashboardWithServer]);

    // অনুমোদন মডাল ওপেন করা
    const openApproveModal = (teacherItem) => {
        setSelectedPendingTeacher(teacherItem);
        setApprovalForm({
            basicSalary: teacherItem.suggestedBasicSalary || '',
            biometricDeviceId: String(teacherItem.suggestedBiometricId || ''),
            customLeaveQuota: '2.0',
            paymentMethod: 'Cash'
        });
    };

    // মূল বেতন ও বায়োমেট্রিক আইডি সহ নিবন্ধন চূড়ান্ত অনুমোদন করা
    const handleConfirmApproval = async () => {
        if (!selectedPendingTeacher) return;

        const cleanSalary = Number(extractPureDigits(approvalForm.basicSalary));
        const cleanBioId = Number(extractPureDigits(approvalForm.biometricDeviceId));

        if (!cleanSalary || cleanSalary < 1000) {
            toast.error('অনুগ্রহ করে সঠিক মূল বেতন (কমপক্ষে ১,০০০ ৳) নির্ধারণ করুন।');
            return;
        }
        if (!cleanBioId || cleanBioId < 1) {
            toast.error('অনুগ্রহ করে সঠিক বায়োমেট্রিক ডিভাইস আইডি প্রদান করুন।');
            return;
        }

        setIsApproving(true);
        try {
            await axiosClient.patch(`/teachers/${selectedPendingTeacher._id}/approve`, {
                basicSalary: cleanSalary,
                biometricDeviceId: cleanBioId,
                customLeaveQuota: Number(approvalForm.customLeaveQuota),
                paymentMethod: approvalForm.paymentMethod
            });

            // লোকাল ড্যাশবোর্ড স্টেট সাথে সাথে আপডেট করা
            setPendingQueue((prev) =>
                prev.filter((item) => item._id !== selectedPendingTeacher._id)
            );

            const isNonTeaching = selectedPendingTeacher.staffCategory === 'Non-Teaching';
            setStats((prev) => ({
                ...prev,
                totalTeachers: prev.totalTeachers + 1,
                teachingCount: prev.teachingCount + (isNonTeaching ? 0 : 1),
                nonTeachingCount: prev.nonTeachingCount + (isNonTeaching ? 1 : 0)
            }));

            toast.success(
                `মাশাআল্লাহ! ${selectedPendingTeacher.fullNameBng}-এর নিবন্ধন অনুমোদিত হয়েছে (মূল বেতন: ${formatBDT(cleanSalary)})।`
            );
            setSelectedPendingTeacher(null);
        } catch (err) {
            toast.error(extractApiErrorMessage(err, 'অনুমোদন করতে সমস্যা হয়েছে।'));
        } finally {
            setIsApproving(false);
        }
    };

    return (
        <div className="space-y-7 animate-fade-up">

            {/* =================================================================
                1. EXECUTIVE COMMAND HERO BANNER
               ================================================================= */}
            <section className="ledger-surface p-6 sm:p-8 bg-gradient-to-r from-emerald-deep via-emerald to-emerald-deep text-white border-gold/40 shadow-ledger relative overflow-hidden">
                <div
                    aria-hidden="true"
                    className="absolute right-6 -bottom-10 opacity-10 pointer-events-none font-serif text-[190px] font-bold text-gold select-none"
                >
                    {INSTITUTION_INFO.crestLetterBng}
                </div>

                <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="gold" size="sm" mono>
                                STEP 14 / 25 · ADMIN COMMAND CENTER
                            </Badge>
                            <Badge variant="success" size="sm" dot>
                                ZKTeco K40 LAN Sync Active
                            </Badge>
                        </div>

                        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            {INSTITUTION_INFO.nameEng}
                        </h1>
                        <p className="font-bengali text-xs sm:text-sm text-gold-soft/95 mt-1">
                            প্রশাসনিক কমান্ড সেন্টার ও লাইভ এন্টারপ্রাইজ ড্যাশবোর্ড · ডাকঘর: {INSTITUTION_INFO.postOfficeBng} ({toBengaliDigits(INSTITUTION_INFO.postCode)}), {INSTITUTION_INFO.upazilaBng}, {INSTITUTION_INFO.districtBng}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={FileSpreadsheet}
                            onClick={() => navigate('/register')}
                            className="border-gold/40 text-gold-soft hover:bg-white/10"
                        >
                            <span className="font-bengali">নতুন শিক্ষক নিবন্ধন খাতা</span>
                        </Button>

                        <Button
                            variant="gold"
                            size="sm"
                            leftIcon={RefreshCw}
                            isLoading={isRefreshing}
                            loadingText="হালনাগাদ হচ্ছে..."
                            onClick={() => syncDashboardWithServer(true)}
                        >
                            <span className="font-bengali">লাইভ সিঙ্ক</span>
                        </Button>
                    </div>
                </div>
            </section>

            {dashboardError && (
                <div role="alert" className="ledger-surface border-danger/30 bg-danger-bg p-4 font-bengali text-sm text-danger">
                    {dashboardError}
                </div>
            )}

            {/* =================================================================
                2. 4 EXECUTIVE KPI CARDS
               ================================================================= */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* KPI 1: মোট শিক্ষক ও কর্মচারী */}
                <div
                    onClick={() => navigate('/admin/teachers')}
                    className="ledger-surface p-5 bg-paper-panel hover:border-gold cursor-pointer transition-all group flex flex-col justify-between"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
                                Active Staff Force
                            </span>
                            <h3 className="font-bengali text-sm font-bold text-emerald-deep mt-0.5">
                                মোট শিক্ষক ও কর্মচারী
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-subtle text-emerald flex items-center justify-center group-hover:bg-emerald group-hover:text-gold-soft transition-colors">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-ink-faint flex items-baseline justify-between">
                        <div>
                            <span className="font-mono text-2xl sm:text-3xl font-bold text-emerald-deep">
                                {toBengaliDigits(stats.totalTeachers)}
                            </span>
                            <span className="font-bengali text-xs text-ink-soft ml-1">জন</span>
                        </div>
                        <span className="font-bengali text-[11px] text-emerald font-semibold">
                            শিক্ষক: {toBengaliDigits(stats.teachingCount)} · কর্মচারী: {toBengaliDigits(stats.nonTeachingCount)}
                        </span>
                    </div>
                </div>

                {/* KPI 2: আজকের উপস্থিতির হার */}
                <div
                    onClick={() => navigate('/admin/attendance')}
                    className="ledger-surface p-5 bg-paper-panel hover:border-gold cursor-pointer transition-all group flex flex-col justify-between"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
                                9:00 AM Biometric Gate
                            </span>
                            <h3 className="font-bengali text-sm font-bold text-emerald-deep mt-0.5">
                                আজকের উপস্থিতির হার
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-success-bg text-success flex items-center justify-center group-hover:bg-success group-hover:text-white transition-colors">
                            <Fingerprint className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-ink-faint flex items-baseline justify-between">
                        <div>
                            <span className="font-mono text-2xl sm:text-3xl font-bold text-success">
                                {toBengaliDigits(stats.todaySummary.ratePercent)}%
                            </span>
                        </div>
                        <span className="font-bengali text-[11px] text-ink-soft">
                            উপস্থিত: <b className="text-success">{toBengaliDigits(stats.todaySummary.present)}</b> · বিলম্ব: <b className="text-warning-deep">{toBengaliDigits(stats.todaySummary.late)}</b>
                        </span>
                    </div>
                </div>

                {/* KPI 3: পেন্ডিং নিবন্ধন অনুমোদন */}
                <div
                    onClick={() => navigate('/admin/approvals')}
                    className="ledger-surface p-5 bg-paper-panel hover:border-gold cursor-pointer transition-all group flex flex-col justify-between"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
                                Verification Queue
                            </span>
                            <h3 className="font-bengali text-sm font-bold text-emerald-deep mt-0.5">
                                পেন্ডিং নিবন্ধন অনুমোদন
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gold-subtle text-gold-deep flex items-center justify-center group-hover:bg-gold group-hover:text-emerald-deep transition-colors">
                            <UserCheck className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-ink-faint flex items-baseline justify-between">
                        <div>
                            <span className="font-mono text-2xl sm:text-3xl font-bold text-gold-deep">
                                {toBengaliDigits(pendingQueue.length)}
                            </span>
                            <span className="font-bengali text-xs text-ink-soft ml-1">টি আবেদন</span>
                        </div>
                        <span className="font-bengali text-[11px] text-emerald font-semibold flex items-center gap-0.5">
                            নিচে অনুমোদন দিন <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                </div>

                {/* KPI 4: চলতি মাসের ক্যাশ পে-রোল */}
                <div
                    onClick={() => navigate('/admin/payroll')}
                    className="ledger-surface p-5 bg-paper-panel hover:border-gold cursor-pointer transition-all group flex flex-col justify-between"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
                                Monthly Cash Ledger
                            </span>
                            <h3 className="font-bengali text-sm font-bold text-emerald-deep mt-0.5">
                                চলতি মাসের পে-রোল বাজেট
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-info-bg text-info flex items-center justify-center group-hover:bg-info group-hover:text-white transition-colors">
                            <Banknote className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-ink-faint flex items-baseline justify-between">
                        <span className="font-bengali text-xl sm:text-2xl font-bold text-emerald-deep">
                            {formatBDT(stats.monthlyPayrollNum, true)}
                        </span>
                        <Badge variant="gold" size="sm">
                            Cash Voucher
                        </Badge>
                    </div>
                </div>
            </section>

            {/* =================================================================
                3. RECHARTS ANALYTICS & ZKTECO K40 TODAY BREAKDOWN
               ================================================================= */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

                {/* বাম ২ কলাম: Recharts ভিজ্যুয়াল অ্যানালিটিক্স চার্ট */}
                <div className="lg:col-span-2 ledger-surface p-6 bg-paper-panel flex flex-col justify-between">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-ink-faint">
                        <div>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-gold-deep font-bold block">
                                Visual ERP Telemetry
                            </span>
                            <h2 className="font-bengali text-base sm:text-lg font-bold text-emerald-deep">
                                {chartTab === 'ATTENDANCE'
                                    ? 'সাপ্তাহিক বায়োমেট্রিক হাজিরা বিশ্লেষণ (শনি – বৃহস্পতি)'
                                    : 'মাসভিত্তিক ক্যাশ বেতন ও কোটা কর্তন প্রবাহ (৬ মাস)'}
                            </h2>
                        </div>

                        {/* চার্ট ট্যাব সুইচার */}
                        <div className="inline-flex rounded-full p-1 bg-paper-deep border border-ink-faint">
                            <button
                                type="button"
                                onClick={() => setChartTab('ATTENDANCE')}
                                className={cn(
                                    'px-3 py-1 rounded-full text-xs font-bengali font-semibold transition-all flex items-center gap-1.5',
                                    chartTab === 'ATTENDANCE'
                                        ? 'bg-emerald text-white shadow-2xs'
                                        : 'text-ink-soft hover:text-ink'
                                )}
                            >
                                <BarChart3 className="w-3.5 h-3.5" />
                                হাজিরা চার্ট
                            </button>
                            <button
                                type="button"
                                onClick={() => setChartTab('PAYROLL')}
                                className={cn(
                                    'px-3 py-1 rounded-full text-xs font-bengali font-semibold transition-all flex items-center gap-1.5',
                                    chartTab === 'PAYROLL'
                                        ? 'bg-emerald text-white shadow-2xs'
                                        : 'text-ink-soft hover:text-ink'
                                )}
                            >
                                <TrendingUp className="w-3.5 h-3.5" />
                                বেতন ট্রেন্ড
                            </button>
                        </div>
                    </div>

                    {/* চার্ট ক্যানভাস */}
                    <div className="w-full h-[270px] pt-2">
                        {chartTab === 'ATTENDANCE' && weeklyAttendance.length === 0 ? (
                            <div className="h-full flex items-center justify-center font-bengali text-sm text-ink-muted">
                                সাপ্তাহিক হাজিরার চার্ট দেখানোর মতো সার্ভার ডেটা নেই।
                            </div>
                        ) : chartTab === 'PAYROLL' && payrollTrend.length === 0 ? (
                            <div className="h-full flex items-center justify-center font-bengali text-sm text-ink-muted">
                                বেতন ট্রেন্ডের চার্ট দেখানোর মতো সার্ভার ডেটা নেই।
                            </div>
                        ) : chartTab === 'ATTENDANCE' ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyAttendance} barSize={26}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(18,29,24,0.08)" />
                                    <XAxis
                                        dataKey="dayBng"
                                        tick={{ fill: '#3E4C45', fontSize: 12, fontFamily: 'Noto Serif Bengali' }}
                                    />
                                    <YAxis tick={{ fill: '#6C7A72', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#FAF6ED',
                                            borderColor: '#C69C3D',
                                            borderRadius: '12px',
                                            fontFamily: 'Noto Serif Bengali',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <Bar dataKey="present" name="উপস্থিত (Present)" stackId="a" fill="#0E3B2E" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="late" name="বিলম্ব (Late - 0.5)" stackId="a" fill="#C69C3D" />
                                    <Bar dataKey="leave" name="ছুটি (Leave - 1.0)" stackId="a" fill="#1E4E79" radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="absent" name="অনুপস্থিত (Absent)" stackId="a" fill="#A62626" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={payrollTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(18,29,24,0.08)" />
                                    <XAxis
                                        dataKey="monthBng"
                                        tick={{ fill: '#3E4C45', fontSize: 12, fontFamily: 'Noto Serif Bengali' }}
                                    />
                                    <YAxis tick={{ fill: '#6C7A72', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#FAF6ED',
                                            borderColor: '#C69C3D',
                                            borderRadius: '12px',
                                            fontFamily: 'Noto Serif Bengali',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="netPaid"
                                        name="নিট ক্যাশ বেতন (৳)"
                                        stroke="#0E3B2E"
                                        fill="#0E3B2E"
                                        fillOpacity={0.18}
                                        strokeWidth={2.5}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="deduction"
                                        name="কোটা অতিরিক্ত কর্তন (৳)"
                                        stroke="#A62626"
                                        fill="#A62626"
                                        fillOpacity={0.15}
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-ink-faint flex flex-wrap items-center justify-between gap-2 text-xs font-bengali text-ink-soft">
                        <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-gold-deep" />
                            নীতিমালা: সকাল ৯:০০টার পরে পাঞ্চ করলে <b>০.৫ কোটা (Late)</b> এবং পূর্ণদিন ছুটিতে <b>১.০ কোটা</b> ব্যবহৃত হয়।
                        </span>
                        <span className="font-mono text-[11px] font-bold text-emerald-deep">
                            Monthly Free Quota: 2.0 Units
                        </span>
                    </div>
                </div>

                {/* ডান কলাম: আজকের ZKTeco K40 বায়োমেট্রিক হাজিরা সারসংক্ষেপ */}
                <div className="ledger-surface p-6 bg-paper-panel flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-4 mb-4 border-b border-ink-faint">
                            <div>
                                <span className="font-mono text-[10px] uppercase text-gold-deep font-bold block">
                                    ZKTeco K40 ADMS
                                </span>
                                <h2 className="font-bengali text-base font-bold text-emerald-deep">
                                    আজকের বায়োমেট্রিক খতিয়ান
                                </h2>
                            </div>
                            <Badge variant="success" size="sm" dot>
                                9:00 AM Rule
                            </Badge>
                        </div>

                        <div className="space-y-3">
                            {[
                                {
                                    labelBng: 'উপস্থিত (Present ≤ ৯:০০ AM)',
                                    count: stats.todaySummary.present,
                                    icon: CheckCircle2,
                                    colorClass: 'text-success bg-success-bg border-success-border'
                                },
                                {
                                    labelBng: 'বিলম্ব (Late > ৯:০০ AM · ০.৫ কোটা)',
                                    count: stats.todaySummary.late,
                                    icon: Clock,
                                    colorClass: 'text-warning-deep bg-warning-bg border-warning-border'
                                },
                                {
                                    labelBng: 'অনুমোদিত ছুটি (Leave · ১.০ কোটা)',
                                    count: stats.todaySummary.leave,
                                    icon: Award,
                                    colorClass: 'text-gold-deep bg-gold-subtle border-gold/40'
                                },
                                {
                                    labelBng: 'অনুপস্থিত (Absent · বেতন কর্তন)',
                                    count: stats.todaySummary.absent,
                                    icon: XCircle,
                                    colorClass: 'text-danger bg-danger-bg border-danger-border'
                                }
                            ].map((item, idx) => {
                                const IconComp = item.icon;
                                return (
                                    <div
                                        key={idx}
                                        className="p-3.5 rounded-xl bg-paper border border-ink-faint flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0', item.colorClass)}>
                                                <IconComp className="w-4 h-4" />
                                            </div>
                                            <span className="font-bengali text-xs font-semibold text-ink">
                                                {item.labelBng}
                                            </span>
                                        </div>
                                        <span className="font-mono text-sm font-bold text-emerald-deep px-2.5 py-0.5 rounded-lg bg-paper-deep">
                                            {toBengaliDigits(item.count)} জন
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-ink-faint">
                        <Button
                            variant="emerald"
                            size="sm"
                            fullWidth
                            onClick={() => navigate('/admin/attendance')}
                        >
                            <span className="font-bengali">দৈনিক হাজিরা ও ওভাররাইড শিটে যান →</span>
                        </Button>
                    </div>
                </div>
            </section>

            {/* =================================================================
                4. PENDING APPROVALS QUEUE & SENIORITY LEADERBOARD SNAPSHOT
               ================================================================= */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* ক. পেন্ডিং নিবন্ধন অনুমোদন কিউ (মূল বেতন ও বায়োমেট্রিক আইডি নির্ধারণসহ) */}
                <div className="ledger-surface p-6 bg-paper-panel">
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-ink-faint">
                        <div>
                            <span className="font-mono text-[10px] uppercase text-gold-deep font-bold block">
                                Self-Registration Approval Queue
                            </span>
                            <h2 className="font-bengali text-base font-bold text-emerald-deep">
                                পেন্ডিং নিবন্ধন অনুমোদন ({toBengaliDigits(pendingQueue.length)}টি)
                            </h2>
                        </div>
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => navigate('/admin/approvals')}
                        >
                            <span className="font-bengali">সকল আবেদন →</span>
                        </Button>
                    </div>

                    {pendingQueue.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-paper border border-ink-faint text-center">
                            <CheckCircle2 className="w-10 h-10 mx-auto text-success mb-2" />
                            <h4 className="font-bengali text-sm font-bold text-emerald-deep">
                                সকল অনলাইন নিবন্ধন অনুমোদিত হয়েছে!
                            </h4>
                            <p className="font-bengali text-xs text-ink-soft mt-1">
                                বর্তমানে অনুমোদনের অপেক্ষায় কোনো পেন্ডিং আবেদন নেই।
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            {pendingQueue.map((item) => (
                                <div
                                    key={item._id}
                                    className="p-4 rounded-2xl bg-paper border border-gold/35 flex flex-wrap items-center justify-between gap-4 hover:shadow-xs transition-all"
                                >
                                    <div className="flex items-start gap-3.5">
                                        <div className="w-11 h-11 rounded-xl bg-emerald text-gold-soft font-serif font-bold text-lg flex items-center justify-center shrink-0">
                                            {item.fullNameBng.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-bengali text-sm font-bold text-emerald-deep">
                                                    {item.fullNameBng}
                                                </h4>
                                                <Badge variant="gold" size="sm" mono>
                                                    ID: {item.teacherCode}
                                                </Badge>
                                            </div>
                                            <p className="font-bengali text-xs text-emerald font-semibold mt-0.5">
                                                {item.designationBng} · {item.highestDegree}
                                            </p>
                                            <p className="font-mono text-[11px] text-ink-muted mt-0.5">
                                                Mobile: {formatPhoneDisplay(item.phone)} · Bio ID: #{item.suggestedBiometricId}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="emerald"
                                        size="xs"
                                        leftIcon={UserCheck}
                                        onClick={() => openApproveModal(item)}
                                    >
                                        <span className="font-bengali">বেতন নির্ধারণ ও অনুমোদন</span>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* খ. টপ সিনিয়রিটি ও র‍্যাংকিং লিডারবোর্ড স্ন্যাপশট */}
                <div className="ledger-surface p-6 bg-paper-panel">
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-ink-faint">
                        <div>
                            <span className="font-mono text-[10px] uppercase text-gold-deep font-bold block">
                                Designation + GPA Merit Engine
                            </span>
                            <h2 className="font-bengali text-base font-bold text-emerald-deep">
                                সিনিয়রিটি ও র‍্যাংকিং লিডারবোর্ড (Top 4)
                            </h2>
                        </div>
                        <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => navigate('/admin/teachers')}
                        >
                            <span className="font-bengali">পূর্ণাঙ্গ তালিকা (ধাপ ১৫) →</span>
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {topTeachers.map((tch) => (
                            <div
                                key={tch._id}
                                className="p-3.5 rounded-xl bg-paper border border-ink-faint flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-deep text-gold-soft font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-gold/40">
                                        #{tch.rank}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bengali text-xs sm:text-sm font-bold text-emerald-deep truncate">
                                                {tch.fullNameBng}
                                            </h4>
                                            <span className="font-mono text-[10.5px] text-ink-muted hidden sm:inline">
                                                ({tch.teacherCode})
                                            </span>
                                        </div>
                                        <p className="font-bengali text-[11.5px] text-ink-soft truncate">
                                            {tch.designationBng} · {tch.highestDegree} (Eqv GPA: <b className="font-mono">{tch.normalizedGpa}</b>)
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <span className="font-bengali text-xs font-bold text-emerald-deep block">
                                        {formatBDT(tch.basicSalary, true)}
                                    </span>
                                    <span className="font-mono text-[10px] text-ink-muted">
                                        Bio #{tch.biometricDeviceId}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* =================================================================
                5. SALARY & BIOMETRIC ID ASSIGNMENT APPROVAL MODAL
               ================================================================= */}
            <Modal
                isOpen={Boolean(selectedPendingTeacher)}
                onClose={() => setSelectedPendingTeacher(null)}
                size="md"
                titleEng="Official Teacher Onboarding & Salary Assignment"
                titleBng="শিক্ষক নিবন্ধন অনুমোদন ও মূল বেতন নির্ধারণ"
                subtitleBng={
                    selectedPendingTeacher
                        ? `${selectedPendingTeacher.fullNameBng} (${selectedPendingTeacher.designationBng}) · ID: ${selectedPendingTeacher.teacherCode}`
                        : ''
                }
                footer={
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPendingTeacher(null)}
                            disabled={isApproving}
                        >
                            <span className="font-bengali">বাতিল করুন</span>
                        </Button>
                        <Button
                            variant="emerald"
                            size="sm"
                            leftIcon={ShieldCheck}
                            isLoading={isApproving}
                            loadingText="অনুমোদিত হচ্ছে..."
                            onClick={handleConfirmApproval}
                        >
                            <span className="font-bengali">চূড়ান্ত অনুমোদন ও সক্রিয় করুন</span>
                        </Button>
                    </>
                }
            >
                {selectedPendingTeacher && (
                    <div className="space-y-4">
                        <div className="p-3.5 rounded-xl bg-emerald-subtle border border-emerald-border text-xs font-bengali text-emerald-deep">
                            অনুমোদন করার সাথে সাথে শিক্ষকের সিনিয়রিটি র‍্যাংক স্বয়ংক্রিয়ভাবে ক্যালকুলেট হবে এবং তিনি নিজের মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে পোর্টালে লগইন করতে পারবেন।
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormInput
                                labelEng="Monthly Basic Salary (BDT)"
                                labelBng="মাসিক মূল বেতন (টাকা)"
                                variant="erp"
                                inputMode="numeric"
                                value={approvalForm.basicSalary}
                                onChange={(e) =>
                                    setApprovalForm((prev) => ({
                                        ...prev,
                                        basicSalary: extractPureDigits(e.target.value)
                                    }))
                                }
                                required
                                isMonoText
                                hint="এই মূল বেতনের ওপর ৩০ দিনের আনুপাতিক কর্তন হিসাব হবে।"
                            />

                            <FormInput
                                labelEng="ZKTeco K40 Biometric ID"
                                labelBng="বায়োমেট্রিক মেশিন আইডি (PIN)"
                                variant="erp"
                                inputMode="numeric"
                                value={approvalForm.biometricDeviceId}
                                onChange={(e) =>
                                    setApprovalForm((prev) => ({
                                        ...prev,
                                        biometricDeviceId: extractPureDigits(e.target.value)
                                    }))
                                }
                                required
                                isMonoText
                                hint="ZKTeco K40 মেশিনে শিক্ষকের আঙুলের ছাপের সিরিয়াল নম্বর।"
                            />

                            <FormInput
                                labelEng="Monthly Free Leave Quota"
                                labelBng="মাসিক ফ্রি ছুটির কোটা (ডিফল্ট ২.০)"
                                variant="erp"
                                value={approvalForm.customLeaveQuota}
                                onChange={(e) =>
                                    setApprovalForm((prev) => ({
                                        ...prev,
                                        customLeaveQuota: e.target.value
                                    }))
                                }
                                isMonoText
                            />

                            <FormSelect
                                labelEng="Payment Method"
                                labelBng="বেতন প্রদানের মাধ্যম"
                                variant="erp"
                                value={approvalForm.paymentMethod}
                                onChange={(e) =>
                                    setApprovalForm((prev) => ({
                                        ...prev,
                                        paymentMethod: e.target.value
                                    }))
                                }
                                options={[
                                    { value: 'Cash', label: 'নগদ ক্যাশ ভাউচার (Cash Payment)' },
                                    { value: 'Bank', label: 'ব্যাংক ট্রান্সফার (Bank Account)' },
                                    { value: 'Mobile Banking', label: 'মোবাইল ব্যাংকিং (bKash / Nagad)' }
                                ]}
                                placeholder={false}
                            />
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
