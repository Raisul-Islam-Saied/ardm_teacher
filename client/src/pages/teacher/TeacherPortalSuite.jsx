/**
 * ARDM Enterprise ERP — Teacher Self-Service Portal Suite (Step 20)
 * Provides 4 dedicated views for logged-in teachers:
 * - TeacherDashboardView (/teacher/portal)
 * - TeacherAttendanceView (/teacher/attendance)
 * - TeacherPayrollView (/teacher/payroll)
 * - TeacherProfileView (/teacher/profile)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment-timezone';
import {
    GraduationCap,
    Fingerprint,
    CalendarCheck2,
    Receipt,
    IdCard,
    Award,
    Clock,
    CheckCircle2,
    Banknote,
    Printer,
    KeyRound,
    User,
    MapPin,
    Sparkles,
    Send,
    ShieldCheck,
    ArrowRight
} from 'lucide-react';
import { INSTITUTION_INFO, DEGREE_LEVELS } from '@constants/app.constants';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@context/ToastContext';
import {
    Button,
    Badge,
    Modal,
    FormInput,
    FormSelect
} from '@components/ui';
import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';
import {
    toBengaliDigits,
    formatBDT,
    formatPhoneDisplay,
    formatDisplayDate,
    calculateLiveRankMetrics
} from '@utils/formatters';
import DigitalRegistryIdCard from '@pages/public/registration/DigitalRegistryIdCard';
import { cn } from '@utils/cn';

/**
 * লগইনকৃত শিক্ষকের পূর্ণাঙ্গ প্রোফাইল ও সিনিয়রিটি র‍্যাংক রিজলভার হুক
 */
function useResolvedTeacherProfile() {
    const { user } = useAuth();
    const [dashboard, setDashboard] = useState(null);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        let isMounted = true;
        axiosClient.get('/teachers/my-portal/dashboard')
            .then((res) => {
                if (isMounted) {
                    setDashboard(res.data?.data || null);
                    setLoadError('');
                }
            })
            .catch((error) => {
                if (isMounted) setLoadError(extractApiErrorMessage(error, 'পোর্টালের তথ্য লোড করা যায়নি।'));
            });
        return () => { isMounted = false; };
    }, [user?._id]);

    const teacher = dashboard?.profile || user || {};
    const rankMetrics = useMemo(
        () => calculateLiveRankMetrics(teacher.designation, teacher.academicQualifications),
        [teacher]
    );

    return {
        teacher,
        dashboard,
        loadError,
        rankMetrics,
        overallRank: teacher.rankingMetrics?.overallMadrasahRank,
        totalStaffCount: null
    };
}

// ============================================================================
// VIEW 1: TEACHER PORTAL OVERVIEW DASHBOARD (/teacher/portal)
// ============================================================================
export function TeacherDashboardView() {
    const navigate = useNavigate();
    const { teacher, dashboard, loadError, rankMetrics, overallRank } = useResolvedTeacherProfile();

    const attendance = dashboard?.selectedMonthAttendance;
    const todayStatus = dashboard?.todayStatus;
    const basicSalary = Number(teacher.basicSalary) || 0;
    const quotaLimit = Number(attendance?.allowedQuota ?? teacher.customLeaveQuota ?? 0);
    const quotaUsed = Number(attendance?.quotaUsed) || 0;
    const quotaRemaining = Math.max(0, quotaLimit - quotaUsed);

    return (
        <div className="space-y-6 animate-fade-up">
            {/* ১. ওয়েলকাম ব্যানার */}
            <section className="ledger-surface p-6 sm:p-8 bg-gradient-to-r from-emerald-deep via-emerald to-emerald-deep text-white border-gold/40 shadow-ledger relative overflow-hidden">
                <div
                    aria-hidden="true"
                    className="absolute right-6 -bottom-10 opacity-10 pointer-events-none font-serif text-[180px] font-bold text-gold select-none"
                >
                    {INSTITUTION_INFO.crestLetterBng}
                </div>

                <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-gold bg-paper-panel text-emerald-deep font-serif font-bold text-3xl flex items-center justify-center shrink-0 shadow-gold-glow">
                            {teacher.fullNameBng.charAt(0)}
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <Badge variant="gold" size="sm" mono>
                                    ID: {teacher.teacherCode}
                                </Badge>
                                <Badge variant="emerald-subtle" size="sm" mono>
                                    ZKTeco PIN #{teacher.biometricDeviceId}
                                </Badge>
                                <Badge variant="success" size="sm" dot>
                                    {todayStatus?.status === 'Not Punched Yet' ? 'আজ পাঞ্চ হয়নি' : todayStatus?.status || 'তথ্য নেই'}
                                </Badge>
                            </div>
                            <h1 className="font-bengali text-2xl sm:text-3xl font-bold text-white">
                                আসসালামু আলাইকুম, {teacher.fullNameBng}
                            </h1>
                            <p className="font-bengali text-xs sm:text-sm text-gold-soft/95 mt-0.5">
                                {rankMetrics.designationBng} · বিষয়: {teacher.subject || '—'} · {INSTITUTION_INFO.nameBng}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            variant="gold"
                            size="sm"
                            leftIcon={IdCard}
                            onClick={() => navigate('/teacher/profile')}
                        >
                            <span className="font-bengali">ডিজিটাল আইডি কার্ড</span>
                        </Button>
                    </div>
                </div>
            </section>

            {/* ২. ৪টি ব্যক্তিগত KPI কার্ড */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div
                    onClick={() => navigate('/teacher/profile')}
                    className="ledger-surface p-5 bg-paper-panel hover:border-gold cursor-pointer transition-all"
                >
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
                        Madrasah Seniority Rank
                    </span>
                    <h3 className="font-bengali text-xs font-bold text-ink-soft mt-0.5">
                        আমার সিনিয়রিটি র‍্যাংক
                    </h3>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="font-mono text-2xl font-bold text-emerald-deep">
                            {overallRank ? `#${toBengaliDigits(overallRank)}` : '—'}
                        </span>
                        <Badge variant="gold" size="sm" mono>
                            GPA: {rankMetrics.highestNormalizedGpa.toFixed(2)}
                        </Badge>
                    </div>
                </div>

                <div
                    onClick={() => navigate('/teacher/attendance')}
                    className="ledger-surface p-5 bg-paper-panel hover:border-gold cursor-pointer transition-all"
                >
                    <span className="font-mono text-[10px] uppercase tracking-wider text-success block">
                        Today ZKTeco K40 Status
                    </span>
                    <h3 className="font-bengali text-xs font-bold text-ink-soft mt-0.5">
                        আজকের বায়োমেট্রিক পাঞ্চ
                    </h3>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="font-mono text-xl font-bold text-success">
                            {todayStatus?.punchTime
                                ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }).format(new Date(todayStatus.punchTime))
                                : '—'}
                        </span>
                        <Badge variant="success" size="sm" dot>
                            {todayStatus?.status || 'পাঞ্চ হয়নি'}
                        </Badge>
                    </div>
                </div>

                <div
                    onClick={() => navigate('/teacher/attendance')}
                    className="ledger-surface p-5 bg-paper-panel hover:border-gold cursor-pointer transition-all"
                >
                    <span className="font-mono text-[10px] uppercase tracking-wider text-gold-deep block">
                        Monthly Free Leave Quota
                    </span>
                    <h3 className="font-bengali text-xs font-bold text-ink-soft mt-0.5">
                        মাসিক ফ্রি ছুটির কোটা ব্যালেন্স
                    </h3>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="font-mono text-2xl font-bold text-emerald-deep">
                            {toBengaliDigits(quotaRemaining.toFixed(1))} <span className="text-xs font-bengali text-ink-soft">অবশিষ্ট</span>
                        </span>
                        <span className="font-mono text-xs text-warning-deep font-bold">
                            ব্যবহৃত: {quotaUsed}/{quotaLimit}
                        </span>
                    </div>
                </div>

                <div
                    onClick={() => navigate('/teacher/payroll')}
                    className="ledger-surface p-5 bg-paper-panel hover:border-gold cursor-pointer transition-all"
                >
                    <span className="font-mono text-[10px] uppercase tracking-wider text-emerald block">
                        Monthly Basic Salary
                    </span>
                    <h3 className="font-bengali text-xs font-bold text-ink-soft mt-0.5">
                        মাসিক মূল বেতন (Cash)
                    </h3>
                    <div className="mt-3 flex items-baseline justify-between">
                        <span className="font-bengali text-2xl font-bold text-emerald-deep">
                            {formatBDT(basicSalary, true)}
                        </span>
                        <Badge variant="emerald-subtle" size="sm">
                            {formatBDT(attendance?.currentMonthEstimatedCut || 0, true)} কর্তন
                        </Badge>
                    </div>
                </div>
            </section>

            {/* ৩. সাম্প্রতিক হাজিরা এবং বেতন স্লিপের কুইক প্রিভিউ */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="ledger-surface p-6 bg-paper-panel">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-ink-faint">
                        <h3 className="font-bengali text-base font-bold text-emerald-deep flex items-center gap-2">
                            <Fingerprint className="w-4.5 h-4.5 text-gold-deep" />
                            আমার সাম্প্রতিক বায়োমেট্রিক হাজিরা (ZKTeco K40)
                        </h3>
                        <Button variant="ghost" size="xs" onClick={() => navigate('/teacher/attendance')}>
                            <span className="font-bengali">পূর্ণাঙ্গ খতিয়ান →</span>
                        </Button>
                    </div>

                    {loadError && <p className="font-bengali text-sm text-danger">{loadError}</p>}
                    <div className="space-y-2.5">
                            {(attendance?.logs || []).slice(0, 4).map((log) => (
                            <div
                                    key={log._id}
                                className="p-3 rounded-xl bg-paper border border-ink-faint flex items-center justify-between gap-3 text-xs"
                            >
                                <div>
                                    <p className="font-bengali font-bold text-emerald-deep">
                                        {formatDisplayDate(log.date, 'bn')}
                                    </p>
                                    <p className="font-bengali text-[11px] text-ink-soft">{log.note}</p>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono font-bold text-emerald-deep block">
                                        In: {log.punchTime
                                            ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }).format(new Date(log.punchTime))
                                            : '—'}
                                    </span>
                                    <Badge
                                        variant={
                                            ['Present', 'Excused_Late', 'Official_Duty', 'Holiday_Duty'].includes(log.status)
                                                ? 'success'
                                                : log.status === 'Late'
                                                    ? 'warning'
                                                    : 'neutral'
                                        }
                                        size="sm"
                                    >
                                        {log.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="ledger-surface p-6 bg-paper-panel flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-ink-faint">
                            <h3 className="font-bengali text-base font-bold text-emerald-deep flex items-center gap-2">
                                <Receipt className="w-4.5 h-4.5 text-gold-deep" />
                                চলতি মাসের বেতন ও ২.০ কোটা স্ট্যাটাস
                            </h3>
                            <Badge variant="success" size="sm" dot>
                                নিরাপদ জোনে আছেন
                            </Badge>
                        </div>

                        <div className="p-4 rounded-xl bg-paper border border-ink-faint space-y-2.5 text-xs font-bengali">
                            <div className="flex justify-between">
                                <span className="text-ink-muted">মাসিক নির্ধারিত মূল বেতন:</span>
                                <b className="text-emerald-deep">{formatBDT(basicSalary, true)}</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-ink-muted">চলতি মাসে ব্যবহৃত কোটা:</span>
                                <b className="font-mono text-warning-deep">{quotaUsed} / {quotaLimit.toFixed(1)} Units</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-ink-muted">কোটা অতিরিক্ত বেতন কর্তন:</span>
                                <b className="text-success">{formatBDT(attendance?.currentMonthEstimatedCut || 0, true)}</b>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-ink-faint text-sm font-bold text-emerald-deep">
                                <span>প্রাক্কলিত নিট ক্যাশ প্রাপ্য:</span>
                                <span>{formatBDT(Math.max(0, basicSalary - (attendance?.currentMonthEstimatedCut || 0)), true)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-ink-faint flex justify-end">
                        <Button
                            variant="emerald"
                            size="sm"
                            rightIcon={ArrowRight}
                            onClick={() => navigate('/teacher/payroll')}
                        >
                            <span className="font-bengali">সকল মাসের বেতন স্লিপ ও ক্যাশ ভাউচার দেখুন</span>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}

// ============================================================================
// VIEW 2: TEACHER PERSONAL ATTENDANCE & QUOTA LEDGER (/teacher/attendance)
// ============================================================================
export function TeacherAttendanceView() {
    const toast = useToast();
    const { teacher, dashboard, loadError } = useResolvedTeacherProfile();
    const logs = dashboard?.selectedMonthAttendance?.logs || [];
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
    const [leaveForm, setLeaveForm] = useState({
        date: moment().tz('Asia/Dhaka').format('YYYY-MM-DD'),
        reason: ''
    });

    const quotaLimit = Number(dashboard?.selectedMonthAttendance?.allowedQuota ?? teacher.customLeaveQuota) || 0;
    const totalUsedQuota = Number(dashboard?.selectedMonthAttendance?.quotaUsed) || 0;

    const handleSubmitLeaveRequest = async (e) => {
        e.preventDefault();
        if (isSubmittingLeave) return;
        if (!leaveForm.reason.trim()) {
            toast.error('অনুগ্রহ করে ছুটির কারণ উল্লেখ করুন।');
            return;
        }
        setIsSubmittingLeave(true);
        try {
            await axiosClient.post('/payroll/leaves/apply', {
                applicationType: 'Casual Leave',
                startDate: leaveForm.date,
                endDate: leaveForm.date,
                reason: leaveForm.reason.trim()
            });
            toast.success(`${formatDisplayDate(leaveForm.date, 'bn')} তারিখের ছুটির আবেদন সার্ভারে জমা হয়েছে।`);
            setIsLeaveModalOpen(false);
            setLeaveForm({ date: moment().tz('Asia/Dhaka').format('YYYY-MM-DD'), reason: '' });
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'ছুটির আবেদন জমা দেওয়া যায়নি।'));
        } finally {
            setIsSubmittingLeave(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-up">
            <section className="ledger-surface p-6 bg-paper-panel flex flex-wrap items-center justify-between gap-4 no-print">
                <div>
                    <Badge variant="gold" size="sm" mono className="mb-1">
                        MY BIOMETRIC ATTENDANCE LEDGER
                    </Badge>
                    <h1 className="font-bengali text-xl sm:text-2xl font-bold text-emerald-deep">
                        আমার বায়োমেট্রিক হাজিরা ও ২.০ ছুটির কোটা খতিয়ান
                    </h1>
                    <p className="font-bengali text-xs text-ink-soft mt-0.5">
                        ZKTeco K40 PIN: <b className="font-mono">#{teacher.biometricDeviceId}</b> · সকাল ৯:০০টার পরে পাঞ্চ করলে ০.৫ কোটা এবং পূর্ণদিন ছুটিতে ১.০ কোটা ব্যবহৃত হয়।
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={Printer}
                        onClick={() => window.print()}
                    >
                        <span className="font-bengali">হাজিরা শিট প্রিন্ট</span>
                    </Button>
                    <Button
                        variant="emerald"
                        size="sm"
                        leftIcon={Send}
                        onClick={() => setIsLeaveModalOpen(true)}
                    >
                        <span className="font-bengali">ছুটির আবেদন করুন</span>
                    </Button>
                </div>
            </section>

            {loadError && <p className="font-bengali text-sm text-danger">{loadError}</p>}
            {/* কোটা সামারি বার */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="ledger-surface p-4 bg-paper-panel">
                    <span className="font-bengali text-xs text-ink-muted block">মাসিক বরাদ্দকৃত ফ্রি কোটা</span>
                    <span className="font-mono text-2xl font-bold text-emerald-deep">
                        {toBengaliDigits(quotaLimit.toFixed(1))} ইউনিট
                    </span>
                </div>
                <div className="ledger-surface p-4 bg-paper-panel">
                    <span className="font-bengali text-xs text-ink-muted block">চলতি মাসে ব্যবহৃত কোটা</span>
                    <span className="font-mono text-2xl font-bold text-warning-deep">
                        {toBengaliDigits(totalUsedQuota.toFixed(1))} ইউনিট
                    </span>
                </div>
                <div className="ledger-surface p-4 bg-paper-panel">
                    <span className="font-bengali text-xs text-ink-muted block">অবশিষ্ট নিরাপদ কোটা</span>
                    <span className="font-mono text-2xl font-bold text-success">
                        {toBengaliDigits(Math.max(0, quotaLimit - totalUsedQuota).toFixed(1))} ইউনিট
                    </span>
                </div>
            </section>

            {/* দৈনিক হাজিরা লগ টেবিল */}
            <section className="ledger-surface bg-paper-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-paper-deep border-b border-ink-faint font-bengali font-bold text-emerald-deep">
                                <th className="py-3.5 px-4">তারিখ ও বার</th>
                                <th className="py-3.5 px-3 text-center">প্রবেশ (In Time)</th>
                                <th className="py-3.5 px-3 text-center">প্রস্থান (Out Time)</th>
                                <th className="py-3.5 px-3 text-center">স্ট্যাটাস</th>
                                <th className="py-3.5 px-3 text-center">কোটা প্রভাব</th>
                                <th className="py-3.5 px-4">মন্তব্য</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-faint">
                            {logs.map((log) => (
                                <tr key={log._id || log.date} className="hover:bg-emerald-subtle/25">
                                    <td className="py-3.5 px-4 font-bengali font-bold text-emerald-deep">
                                        {formatDisplayDate(log.date, 'bn')}
                                    </td>
                                    <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-deep">
                                        {log.punchTime
                                            ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }).format(new Date(log.punchTime))
                                            : '—'}
                                    </td>
                                    <td className="py-3.5 px-3 text-center font-mono text-ink-soft">
                                        —
                                    </td>
                                    <td className="py-3.5 px-3 text-center">
                                        <Badge
                                            variant={
                                                ['Present', 'Excused_Late', 'Official_Duty', 'Holiday_Duty'].includes(log.status)
                                                    ? 'success'
                                                    : log.status === 'Late'
                                                        ? 'warning'
                                                        : 'neutral'
                                            }
                                            size="sm"
                                        >
                                            {log.status || '—'}
                                        </Badge>
                                    </td>
                                    <td className="py-3.5 px-3 text-center font-mono font-bold">
                                        {Number(log.deductionWeight) > 0 ? `-${Number(log.deductionWeight).toFixed(1)}` : '0.0'}
                                    </td>
                                    <td className="py-3.5 px-4 font-bengali text-ink-soft">
                                        {log.remarks || '—'}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-6 text-center font-bengali text-ink-muted">
                                        এই মাসে কোনো হাজিরা রেকর্ড নেই।
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ছুটির আবেদন মডাল */}
            <Modal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                size="sm"
                titleEng="Official Leave Application"
                titleBng="নতুন ছুটির আবেদনপত্র"
                footer={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setIsLeaveModalOpen(false)}>
                            <span className="font-bengali">বাতিল</span>
                        </Button>
                        <Button
                            variant="emerald"
                            size="sm"
                            isLoading={isSubmittingLeave}
                            onClick={handleSubmitLeaveRequest}
                        >
                            <span className="font-bengali">আবেদন জমা দিন</span>
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <FormInput
                        labelEng="Leave Date"
                        labelBng="ছুটির তারিখ"
                        type="date"
                        variant="erp"
                        isMonoText
                        value={leaveForm.date}
                        onChange={(e) => setLeaveForm((prev) => ({ ...prev, date: e.target.value }))}
                    />
                    <FormInput
                        labelEng="Reason for Leave"
                        labelBng="ছুটির কারণ (বাংলায়)"
                        variant="erp"
                        isBengaliText
                        value={leaveForm.reason}
                        onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                        placeholder="যেমনঃ শারীরিক অসুস্থতা / জরুরি পারিবারিক প্রয়োজন"
                        required
                    />
                </div>
            </Modal>
        </div>
    );
}

// ============================================================================
// VIEW 3: TEACHER PERSONAL SALARY SLIPS & CASH VOUCHERS (/teacher/payroll)
// ============================================================================
export function TeacherPayrollView() {
    const { teacher, dashboard, loadError, rankMetrics } = useResolvedTeacherProfile();
    const [activeVoucher, setActiveVoucher] = useState(null);

    const basicSalary = Number(teacher.basicSalary) || 0;

    const slips = useMemo(
        () => (dashboard?.salarySheets || []).map((salary) => ({
            id: salary._id,
            voucherNo: salary.voucherNo || String(salary._id),
            monthBng: new Date(Number(salary.year), Number(salary.month) - 1, 1)
                .toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' }),
            basicSalary: Number(salary.basicSalarySnapshot) || 0,
            perDay: Number(salary.perDaySalary) || 0,
            quotaUsed: Number(salary.attendanceBreakdown?.totalQuotaUsed) || 0,
            quotaAllowed: Number(salary.attendanceBreakdown?.allowedPaidQuota) || 0,
            deduction: Number(salary.leaveAndAbsentDeductionAmount) || 0,
            bonus: Number(salary.bonusAmount) || 0,
            netPaid: Number(salary.netPayableSalary) || 0,
            status: salary.paymentStatus,
            paidDate: salary.paidAt
        })),
        [dashboard?.salarySheets]
    );

    return (
        <div className="space-y-6 animate-fade-up">
            <section className="ledger-surface p-6 bg-paper-panel flex flex-wrap items-center justify-between gap-4">
                <div>
                    <Badge variant="gold" size="sm" mono className="mb-1">
                        MY SALARY SLIPS &amp; VOUCHERS
                    </Badge>
                    <h1 className="font-bengali text-xl sm:text-2xl font-bold text-emerald-deep">
                        আমার মাসিক বেতন স্লিপ ও ক্যাশ ভাউচার লেজার
                    </h1>
                    <p className="font-bengali text-xs text-ink-soft mt-0.5">
                        নির্ধারিত মাসিক মূল বেতন: <b>{formatBDT(basicSalary, true)}</b> · প্রদানের মাধ্যম: <b>{teacher.paymentMethod || '—'}</b>
                    </p>
                </div>
            </section>
            {loadError && <p className="font-bengali text-sm text-danger">{loadError}</p>}

            <section className="ledger-surface bg-paper-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-paper-deep border-b border-ink-faint font-bengali font-bold text-emerald-deep">
                                <th className="py-3.5 px-4">ভাউচার নং</th>
                                <th className="py-3.5 px-3">বেতনের মাস</th>
                                <th className="py-3.5 px-3 text-right">মূল বেতন</th>
                                <th className="py-3.5 px-3 text-center">কোটা ব্যবহার</th>
                                <th className="py-3.5 px-3 text-right">কর্তন</th>
                                <th className="py-3.5 px-3 text-right">নিট প্রাপ্ত ক্যাশ</th>
                                <th className="py-3.5 px-3 text-center">স্ট্যাটাস</th>
                                <th className="py-3.5 px-4 text-right">রিসিট</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-faint">
                            {slips.map((s) => (
                                <tr key={s.voucherNo} className="hover:bg-emerald-subtle/25">
                                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-deep">
                                        {s.voucherNo}
                                    </td>
                                    <td className="py-3.5 px-3 font-bengali font-bold text-ink">
                                        {s.monthBng}
                                    </td>
                                    <td className="py-3.5 px-3 text-right font-bengali">
                                        {formatBDT(s.basicSalary, true)}
                                    </td>
                                    <td className="py-3.5 px-3 text-center font-mono">
                                        {s.quotaUsed.toFixed(1)} / {s.quotaAllowed.toFixed(1)}
                                    </td>
                                    <td className="py-3.5 px-3 text-right font-bengali text-danger font-semibold">
                                        {s.deduction > 0 ? `-${formatBDT(s.deduction, true)}` : '০ ৳'}
                                    </td>
                                    <td className="py-3.5 px-3 text-right font-bengali text-sm font-bold text-emerald-deep">
                                        {formatBDT(s.netPaid, true)}
                                    </td>
                                    <td className="py-3.5 px-3 text-center">
                                        <Badge variant={s.status === 'Paid' ? 'success' : 'warning'} size="sm" dot>
                                            {s.status === 'Paid' ? 'পরিশোধিত' : 'বকেয়া'}
                                        </Badge>
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <Button
                                            variant="outline"
                                            size="xs"
                                            leftIcon={Receipt}
                                            onClick={() => setActiveVoucher(s)}
                                        >
                                            <span className="font-bengali">ক্যাশ ভাউচার প্রিন্ট</span>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {slips.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="py-6 text-center font-bengali text-ink-muted">
                                        কোনো বেতন শিট তৈরি হয়নি।
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* প্রিন্টেবল ক্যাশ ভাউচার মডাল */}
            <Modal
                isOpen={Boolean(activeVoucher)}
                onClose={() => setActiveVoucher(null)}
                size="md"
                titleEng="Official Cash Salary Voucher"
                titleBng="মাসিক ক্যাশ বেতন রসিদ"
                footer={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setActiveVoucher(null)}>
                            <span className="font-bengali">বন্ধ করুন</span>
                        </Button>
                        <Button variant="gold" size="sm" leftIcon={Printer} onClick={() => window.print()}>
                            <span className="font-bengali">প্রিন্ট করুন</span>
                        </Button>
                    </>
                }
            >
                {activeVoucher && (
                    <div className="p-5 rounded-2xl bg-paper border-2 border-gold space-y-3 text-xs sm:text-sm font-bengali">
                        <div className="text-center pb-3 border-b border-ink-faint">
                            <h4 className="font-serif text-lg font-bold text-emerald-deep">
                                {INSTITUTION_INFO.nameEng}
                            </h4>
                            <p className="text-xs font-bold text-emerald">
                                {INSTITUTION_INFO.nameBng} · ক্যাশ বেতন ভাউচার ({activeVoucher.monthBng})
                            </p>
                            <span className="font-mono text-[11px] text-ink-muted">
                                Voucher No: {activeVoucher.voucherNo}
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-ink-muted">শিক্ষকের নাম ও আইডি:</span>
                                <b>{teacher.fullNameBng} ({teacher.teacherCode})</b>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-ink-muted">পদবী:</span>
                                <span>{rankMetrics.designationBng}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-ink-muted">মাসিক মূল বেতন:</span>
                                <span>{formatBDT(activeVoucher.basicSalary, true)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-ink-muted">কোটা অতিরিক্ত কর্তন:</span>
                                <span className="text-danger">-{formatBDT(activeVoucher.deduction, true)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-ink-faint text-base font-bold text-emerald-deep">
                                <span>সর্বমোট নিট প্রাপ্ত ক্যাশ:</span>
                                <span>{formatBDT(activeVoucher.netPaid, true)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

// ============================================================================
// VIEW 4: TEACHER PROFILE, DIGITAL ID CARD & PASSWORD CHANGE (/teacher/profile)
// ============================================================================
export function TeacherProfileView() {
    const toast = useToast();
    const { user, establishSession } = useAuth();
    const { teacher } = useResolvedTeacherProfile();
    const [tab, setTab] = useState('ID_CARD'); // 'ID_CARD' | 'PASSWORD'
    const [passForm, setPassForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isSavingPass, setIsSavingPass] = useState(false);

    const handleSelfPasswordChange = async (e) => {
        e.preventDefault();
        if (!passForm.currentPassword || passForm.newPassword.length < 6) {
            toast.error('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
            return;
        }
        if (passForm.newPassword !== passForm.confirmPassword) {
            toast.error('নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না!');
            return;
        }

        setIsSavingPass(true);
        try {
            const res = await axiosClient.patch('/auth/change-password', passForm);
            const nextToken = res.data?.data?.token;
            if (!nextToken) throw new Error('পাসওয়ার্ড পরিবর্তনের পর নতুন সেশন টোকেন পাওয়া যায়নি।');
            establishSession(user, nextToken);
            setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            toast.success('আলহামদুলিল্লাহ! আপনার পোর্টাল পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে।');
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'পাসওয়ার্ড পরিবর্তন করা যায়নি।'));
        } finally {
            setIsSavingPass(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-up">
            <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="inline-flex rounded-xl p-1 bg-paper-deep border border-ink-faint">
                    <button
                        type="button"
                        onClick={() => setTab('ID_CARD')}
                        className={cn(
                            'px-4 py-2 rounded-lg font-bengali text-xs sm:text-sm font-semibold transition-all flex items-center gap-2',
                            tab === 'ID_CARD' ? 'bg-emerald text-white shadow-2xs' : 'text-ink-soft'
                        )}
                    >
                        <IdCard className="w-4 h-4" />
                        ডিজিটাল আইডি কার্ড ও সনদ
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('PASSWORD')}
                        className={cn(
                            'px-4 py-2 rounded-lg font-bengali text-xs sm:text-sm font-semibold transition-all flex items-center gap-2',
                            tab === 'PASSWORD' ? 'bg-emerald text-white shadow-2xs' : 'text-ink-soft'
                        )}
                    >
                        <KeyRound className="w-4 h-4" />
                        পাসওয়ার্ড পরিবর্তন করুন
                    </button>
                </div>
            </div>

            {tab === 'ID_CARD' ? (
                <DigitalRegistryIdCard
                    registryRecord={{
                        uid: teacher.uid || `ardm-${teacher.teacherCode}`,
                        teacherId: teacher.teacherCode,
                        registrationStatus: 'Approved',
                        teacher
                    }}
                />
            ) : (
                <div className="ledger-surface p-6 sm:p-8 max-w-xl mx-auto bg-paper-panel">
                    <Badge variant="gold" size="sm" mono className="mb-2">
                        SELF-SERVICE SECURITY
                    </Badge>
                    <h2 className="font-bengali text-xl font-bold text-emerald-deep">
                        পোর্টাল পাসওয়ার্ড পরিবর্তন করুন
                    </h2>
                    <p className="font-bengali text-xs text-ink-soft mt-1 mb-5">
                        আপনার ১০-ডিজিট টিচার আইডি (<b className="font-mono">{teacher.teacherCode}</b>) সুরক্ষিত রাখতে নিয়মিত শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।
                    </p>

                    <form onSubmit={handleSelfPasswordChange} className="space-y-4">
                        <FormInput
                            labelEng="Current Password"
                            labelBng="বর্তমান পাসওয়ার্ড"
                            type="password"
                            variant="erp"
                            isMonoText
                            value={passForm.currentPassword}
                            onChange={(e) =>
                                setPassForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                            }
                            required
                        />
                        <FormInput
                            labelEng="New Password (Min 6 Chars)"
                            labelBng="নতুন পাসওয়ার্ড"
                            type="password"
                            variant="erp"
                            isMonoText
                            value={passForm.newPassword}
                            onChange={(e) =>
                                setPassForm((prev) => ({ ...prev, newPassword: e.target.value }))
                            }
                            required
                        />
                        <FormInput
                            labelEng="Confirm New Password"
                            labelBng="নতুন পাসওয়ার্ড পুনরায় লিখুন"
                            type="password"
                            variant="erp"
                            isMonoText
                            value={passForm.confirmPassword}
                            onChange={(e) =>
                                setPassForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                            }
                            required
                        />

                        <Button
                            type="submit"
                            variant="emerald"
                            size="md"
                            fullWidth
                            leftIcon={ShieldCheck}
                            isLoading={isSavingPass}
                        >
                            <span className="font-bengali">পাসওয়ার্ড আপডেট সংরক্ষণ করুন</span>
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
}
