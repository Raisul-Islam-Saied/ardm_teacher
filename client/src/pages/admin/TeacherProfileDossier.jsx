/**
 * ARDM Enterprise ERP — 360-Degree Teacher Profile Dossier & Admin Control Center (Step 16)
 * Features:
 * - Tab 1: Complete Bilingual Personal, Family, Address & Academic Dossier
 * - Tab 2: Monthly Biometric Attendance Logs (ZKTeco K40) & Custom Leave Quota Override (Default 2.0)
 * - Tab 3: Saved Monthly Salary Sheet History
 * - Tab 4: Admin Security Controls (Password Reset and Account Status)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Pencil,
    User,
    GraduationCap,
    Fingerprint,
    Banknote,
    ShieldAlert,
    KeyRound,
    Printer,
    IdCard,
    CheckCircle2,
    Clock,
    XCircle,
    Award,
    Phone,
    MapPin,
    Lock,
    Unlock,
    SlidersHorizontal,
    Sparkles
} from 'lucide-react';
import { INSTITUTION_INFO, DEGREE_LEVELS } from '@constants/app.constants';
import {
    Button,
    Badge,
    FormInput,
    FormSelect,
    Modal
} from '@components/ui';
import { useToast } from '@context/ToastContext';
import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';
import {
    toBengaliDigits,
    formatBDT,
    formatPhoneDisplay,
    formatDisplayDate,
    formatTeacherAddress,
    calculateLiveRankMetrics,
    extractPureDigits,
    formatAcademicResult
} from '@utils/formatters';
import DigitalRegistryIdCard from '@pages/public/registration/DigitalRegistryIdCard';
import AdminTeacherProfileEditor from './AdminTeacherProfileEditor';
import { useAuth } from '@context/AuthContext';
import { openOfficialIdCardPrint } from '@components/teacher/OfficialTeacherIdCard';
import { cn } from '@utils/cn';

const PROFILE_TABS = [
    { key: 'DOSSIER', labelBng: 'ব্যক্তিগত ও শিক্ষাগত ডসিয়ার', labelEng: 'Personal & Academic', icon: User },
    { key: 'ATTENDANCE', labelBng: 'হাজিরা ও ছুটির কোটা', labelEng: 'Attendance & Quota', icon: Fingerprint },
    { key: 'PAYROLL', labelBng: 'সংরক্ষিত বেতন শিট', labelEng: 'Saved Payroll Sheets', icon: Banknote },
    { key: 'SECURITY', labelBng: 'পাসওয়ার্ড ও সিকিউরিটি', labelEng: 'Security & Reset', icon: KeyRound }
];

const normalizeAssignedClass = (val = '') =>
    String(val || '').replace(/\u09AF\u09BC/g, '\u09DF');

const isWithinPayrollEditWindow = (generatedAt) => {
    if (!generatedAt) return false;
    const age = Date.now() - new Date(generatedAt).getTime();
    return Number.isFinite(age) && age >= 0 && age <= 30 * 24 * 60 * 60 * 1000;
};

function getAttendancePeriod(search) {
    const now = new Date();
    const params = new URLSearchParams(search);
    const requestedMonth = Number(params.get('month'));
    const requestedYear = Number(params.get('year'));

    return {
        month: requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : now.getMonth() + 1,
        year: requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : now.getFullYear()
    };
}

export default function TeacherProfileDossier() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const toast = useToast();
    const { isSuperAdmin } = useAuth();

    const [activeTab, setActiveTab] = useState(() =>
        location.state?.activeTab || (new URLSearchParams(location.search).has('month') ? 'ATTENDANCE' : 'DOSSIER')
    );
    const [teacher, setTeacher] = useState(() => location.state?.teacher || null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [isSavingAttendanceException, setIsSavingAttendanceException] = useState(false);
    const [salaryHistory, setSalaryHistory] = useState([]);
    const attendanceEditorRef = useRef(null);
    const attendancePeriod = useMemo(() => getAttendancePeriod(location.search), [location.search]);
    const payrollReturnTo = location.state?.returnTo || (
        new URLSearchParams(location.search).has('month')
            ? `/admin/payroll?month=${attendancePeriod.month}&year=${attendancePeriod.year}`
            : '/admin/teachers'
    );
    const [exceptionDate, setExceptionDate] = useState(() => {
        const period = getAttendancePeriod(location.search);
        return `${period.year}-${String(period.month).padStart(2, '0')}-01`;
    });
    const [exceptionStatus, setExceptionStatus] = useState('Absent');
    const [exceptionTime, setExceptionTime] = useState('08:55');

    const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);
    const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);

    // কোটা ওভাররাইড স্টেট
    const [quotaInput, setQuotaInput] = useState(String(teacher?.customLeaveQuota ?? ''));
    const [isUpdatingQuota, setIsUpdatingQuota] = useState(false);

    // পাসওয়ার্ড রিসেট ও সিকিউরিটি কন্ট্রোল স্টেট
    const [newPasswordInput, setNewPasswordInput] = useState('');
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    // Load the selected teacher and persisted attendance/payroll data.
    useEffect(() => {
        if (!id) return;
        let isMounted = true;
        const monthStartDate = `${attendancePeriod.year}-${String(attendancePeriod.month).padStart(2, '0')}-01`;
        setIsLoadingProfile(true);
        setExceptionDate(monthStartDate);
        const params = {
            teacherId: id,
            month: attendancePeriod.month,
            year: attendancePeriod.year
        };
        Promise.allSettled([
            axiosClient.get(`/teachers/${id}`),
            axiosClient.get('/attendance/my-summary', { params }),
            axiosClient.get('/payroll/sheets', { params })
        ]).then(([teacherResult, attendanceResult, salaryResult]) => {
            if (!isMounted) return;
            if (teacherResult.status !== 'fulfilled') {
                throw teacherResult.reason;
            }
            const teacherRes = teacherResult.value;
            const fetchedTeacher = teacherRes.data?.data?.teacher || teacherRes.data?.data;
            if (!fetchedTeacher || typeof fetchedTeacher !== 'object') {
                throw new Error('শিক্ষকের তথ্য পাওয়া যায়নি।');
            }
            setTeacher(fetchedTeacher);
            setQuotaInput(String(fetchedTeacher.customLeaveQuota ?? 2));

            const summary = attendanceResult.status === 'fulfilled'
                ? attendanceResult.value.data?.data
                : null;
            setAttendanceSummary(summary?.summary || null);
            setAttendanceLogs(
                Array.isArray(summary?.dailyLogs)
                    ? summary.dailyLogs
                    : Array.isArray(summary?.logs)
                        ? summary.logs
                        : []
            );

            const salaries = salaryResult.status === 'fulfilled'
                ? salaryResult.value.data?.data?.salaries
                : [];
            setSalaryHistory(Array.isArray(salaries) ? salaries.map((salary) => ({
                id: salary._id,
                monthBng: `${salary.month}/${salary.year}`,
                basicSalary: Number(salary.basicSalarySnapshot) || 0,
                quotaUsed: Number(salary.attendanceBreakdown?.totalQuotaUsed) || 0,
                quotaAllowed: Number(salary.attendanceBreakdown?.allowedPaidQuota) || 0,
                deduction: Number(salary.leaveAndAbsentDeductionAmount) || 0,
                netSalary: Number(salary.netPayableSalary) || 0,
                generatedAt: salary.generatedAt || salary.createdAt || null,
                month: salary.month,
                year: salary.year
            })) : []);
        }).catch((error) => {
            if (isMounted) toast.error(extractApiErrorMessage(error, 'শিক্ষকের তথ্য লোড করা যায়নি।'));
        }).finally(() => {
            if (isMounted) setIsLoadingProfile(false);
        });

        return () => {
            isMounted = false;
        };
    }, [id, attendancePeriod.month, attendancePeriod.year, toast]);

    const monthAttendanceRows = useMemo(() => {
        const daysInMonth = new Date(attendancePeriod.year, attendancePeriod.month, 0).getDate();
        const logsByDate = new Map(attendanceLogs.map((log) => [log.date, log]));

        return Array.from({ length: daysInMonth }, (_, index) => {
            const date = `${attendancePeriod.year}-${String(attendancePeriod.month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
            const log = logsByDate.get(date) || null;
            return { date, log, status: log?.status || 'রেকর্ড নেই' };
        });
    }, [attendanceLogs, attendancePeriod.month, attendancePeriod.year]);
    const selectedMonthSalary = salaryHistory.find((salary) => (
        salary.month === attendancePeriod.month && salary.year === attendancePeriod.year
    ));
    const canEditAttendance = !selectedMonthSalary || isWithinPayrollEditWindow(selectedMonthSalary.generatedAt);

    const handleAttendanceMonthChange = (value) => {
        if (!value) return;
        const [year, month] = value.split('-');
        navigate(`${location.pathname}?month=${Number(month)}&year=${Number(year)}`, {
            state: location.state
        });
    };

    const rankMetrics = useMemo(
        () => calculateLiveRankMetrics(teacher?.designation, teacher?.academicQualifications),
        [teacher]
    );

    // ১. মাসিক ফ্রি ছুটির কোটা আপডেট হ্যান্ডলার
    const handleSaveAttendanceException = async () => {
        if (!canEditAttendance) {
            toast.error('বেতন শিট তৈরির ৩০ দিনের সংশোধন সময় শেষ হয়েছে।');
            return;
        }
        if (!exceptionDate) {
            toast.error('সংশোধনের তারিখ নির্বাচন করুন।');
            return;
        }
        if (['Present', 'Late'].includes(exceptionStatus) && !exceptionTime) {
            toast.error('উপস্থিতির প্রবেশ সময় দিন।');
            return;
        }

        setIsSavingAttendanceException(true);
        try {
            const payload = {
                teacherId: teacher._id,
                date: exceptionDate,
                status: exceptionStatus,
                remarks: `শিক্ষক প্রোফাইল থেকে ব্যতিক্রমী ${exceptionStatus} এন্ট্রি`
            };
            if (['Present', 'Late'].includes(exceptionStatus)) {
                payload.punchTime = `${exceptionDate}T${exceptionTime}:00+06:00`;
            }
            const saveResult = await axiosClient.put('/attendance/override', payload);
            const exceptionDateObject = new Date(`${exceptionDate}T12:00:00+06:00`);
            const params = {
                teacherId: teacher._id,
                month: exceptionDateObject.getMonth() + 1,
                year: exceptionDateObject.getFullYear()
            };
            const summaryRes = await axiosClient.get('/attendance/my-summary', { params });
            const summary = summaryRes.data?.data;
            setAttendanceSummary(summary?.summary || null);
            setAttendanceLogs(Array.isArray(summary?.dailyLogs) ? summary.dailyLogs : []);
            toast.success(
                saveResult.data?.meta?.payrollRecalculated
                    ? `${exceptionDate}-এর হাজিরা ${exceptionStatus} হয়েছে এবং বেতন পুনর্গণনা হয়েছে।`
                    : `${exceptionDate}-এর হাজিরা ${exceptionStatus} হিসেবে সংরক্ষিত হয়েছে।`
            );
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'হাজিরা ব্যতিক্রম সংরক্ষণ করা যায়নি।'));
        } finally {
            setIsSavingAttendanceException(false);
        }
    };

    const selectAttendanceDateForEdit = (date, status) => {
        setExceptionDate(date);
        setExceptionStatus(['Absent', 'Official Duty', 'Present', 'Late'].includes(status) ? status : 'Absent');
        attendanceEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const handleSaveLeaveQuota = async () => {
        const parsedQuota = Number(quotaInput);
        if (isNaN(parsedQuota) || parsedQuota < 0 || parsedQuota > 15) {
            toast.error('সঠিক ছুটির কোটা (০ থেকে ১৫ এর মধ্যে) প্রদান করুন।');
            return;
        }

        setIsUpdatingQuota(true);
        try {
            const res = await axiosClient.patch(`/teachers/${teacher._id}`, { customLeaveQuota: parsedQuota });
            const updated = res.data?.data?.teacher || res.data?.data;
            if (!updated) throw new Error('সার্ভার পরিবর্তিত কোটা নিশ্চিত করেনি।');
            setTeacher((prev) => ({ ...prev, customLeaveQuota: parsedQuota }));
            toast.success(`${teacher.fullNameBng}-এর মাসিক ফ্রি ছুটির কোটা ${toBengaliDigits(parsedQuota)} নির্ধারণ করা হয়েছে!`);
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'ছুটির কোটা সংরক্ষণ করা যায়নি।'));
        } finally {
            setIsUpdatingQuota(false);
        }
    };

    // ২. অ্যাডমিন পাসওয়ার্ড রিসেট হ্যান্ডলার
    const handleAdminPasswordReset = async () => {
        const targetPass = String(newPasswordInput || '').trim();

        if (!targetPass || targetPass.length < 6) {
            toast.error('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
            return;
        }

        setIsResettingPassword(true);
        try {
            await axiosClient.patch(`/teachers/${teacher._id}/reset-password`, { newPassword: targetPass });
            setNewPasswordInput('');
            toast.success('শিক্ষকের পোর্টাল পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে।');
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'পাসওয়ার্ড রিসেট করা যায়নি।'));
        } finally {
            setIsResettingPassword(false);
        }
    };

    // ৩. অ্যাকাউন্ট সক্রিয় / নিষ্ক্রিয় টগল হ্যান্ডলার
    const handleToggleAccountStatus = async () => {
        if (teacher.isActive === false) {
            setIsProfileEditorOpen(true);
            toast.info('পুনরায় যোগদানের তারিখ দিয়ে একই প্রোফাইল সক্রিয় করুন।');
            return;
        }

        try {
            const response = await axiosClient.patch(`/teachers/${teacher._id}/toggle-status`);
            const updatedTeacher = response.data?.data?.teacher || response.data?.data;
            if (!updatedTeacher) throw new Error('সার্ভার নতুন অ্যাকাউন্ট স্ট্যাটাস নিশ্চিত করেনি।');
            setTeacher(updatedTeacher);
            toast.info(`${teacher.fullNameBng}-এর অ্যাকাউন্ট নিষ্ক্রিয় করে সাবেক শিক্ষক তালিকায় রাখা হয়েছে।`);
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'অ্যাকাউন্টের অবস্থা পরিবর্তন করা যায়নি।'));
        }
    };

    if (!teacher) {
        return (
            <div className="ledger-surface p-6 flex items-center justify-between gap-4">
                <p className="font-bengali text-ink-soft">
                    {isLoadingProfile ? 'শিক্ষকের তথ্য লোড হচ্ছে…' : 'শিক্ষকের তথ্য পাওয়া যায়নি।'}
                </p>
                {!isLoadingProfile && (
                    <Button variant="outline" size="sm" onClick={() => navigate('/admin/teachers')}>
                        <span className="font-bengali">শিক্ষক তালিকায় ফিরুন</span>
                    </Button>
                )}
            </div>
        );
    }

    const usedQuotaThisMonth = Number(attendanceSummary?.totalQuotaUsed) || 0;
    const totalQuotaAllowed = Number(teacher.customLeaveQuota ?? attendanceSummary?.monthlyAllowedQuota ?? 2);
    const remainingQuota = Math.max(0, totalQuotaAllowed - usedQuotaThisMonth);
    const employmentPeriods = Array.isArray(teacher.employmentHistory) && teacher.employmentHistory.length
        ? teacher.employmentHistory
        : [{ startDate: teacher.joiningDate, endDate: teacher.resignationDate }];
    const teacherDisplayName = teacher.fullNameBng || teacher.fullNameEng || 'নাম নেই';
    const academicQualifications = Array.isArray(teacher.academicQualifications)
        ? teacher.academicQualifications
        : [];

    return (
        <div className="space-y-6 animate-fade-up">

            {/* =================================================================
                1. TOP NAVIGATION & 360 PROFILE HERO HEADER
               ================================================================= */}
            <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={ArrowLeft}
                    onClick={() => navigate(payrollReturnTo)}
                >
                    <span className="font-bengali">
                        {payrollReturnTo.startsWith('/admin/payroll')
                            ? 'বেতন শিটে ফিরে যান'
                            : 'শিক্ষক ও সিনিয়রিটি তালিকায় ফিরে যান'}
                    </span>
                </Button>

                <div className="flex flex-wrap items-center gap-2">
                    {(isSuperAdmin || teacher?.role !== 'SuperAdmin') && teacher && (
                        <Button
                            variant="emerald"
                            size="sm"
                            leftIcon={Pencil}
                            onClick={() => setIsProfileEditorOpen(true)}
                        >
                            <span className="font-bengali">তথ্য আপডেট</span>
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={IdCard}
                        onClick={() => openOfficialIdCardPrint(teacher)}
                    >
                        <span className="font-bengali">ডিজিটাল আইডি কার্ড</span>
                    </Button>

                    <Button
                        variant="gold"
                        size="sm"
                        leftIcon={Printer}
                        onClick={() => window.print()}
                    >
                        <span className="font-bengali">প্রোফাইল ডসিয়ার প্রিন্ট</span>
                    </Button>
                </div>
            </div>

            {/* প্রোফাইল হিরো কার্ড */}
            <section className="ledger-surface p-6 sm:p-8 bg-gradient-to-r from-emerald-deep via-emerald to-emerald-deep text-white border-gold/40 shadow-ledger">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                        {/* ৫০০×৫০০ প্রোফাইল ছবি */}
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-gold bg-paper-panel text-emerald-deep font-serif font-bold text-4xl flex items-center justify-center shrink-0 shadow-gold-glow overflow-hidden">
                            {teacher.profilePicture?.url ? (
                                <img
                                    src={teacher.profilePicture.url}
                                    alt={teacher.fullNameEng}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                teacherDisplayName.charAt(0)
                            )}
                        </div>

                        <div>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                                <Badge variant="gold" size="sm" mono>
                                    ID: {teacher.teacherCode}
                                </Badge>
                                <Badge variant="emerald-subtle" size="sm" mono>
                                    ZKTeco PIN #{teacher.biometricDeviceId}
                                </Badge>
                                {teacher.assignedClass && (
                                    <Badge variant="gold" size="sm">
                                        শ্রেণি শিক্ষক: {normalizeAssignedClass(teacher.assignedClass)}
                                    </Badge>
                                )}
                                {teacher.assignedClass && (
                                    <Badge
                                        variant={teacher.canEditAssignedClass ? 'success' : 'emerald-subtle'}
                                        size="sm"
                                        dot
                                    >
                                        {teacher.canEditAssignedClass
                                            ? 'শ্রেণি এডিট অনুমতি: সক্রিয়'
                                            : 'শ্রেণি এডিট অনুমতি: নিষ্ক্রিয়'}
                                    </Badge>
                                )}
                                <Badge
                                    variant={teacher.isActive !== false ? 'success' : 'danger'}
                                    size="sm"
                                    dot
                                >
                                    {teacher.isActive !== false ? 'Active Staff' : 'Deactivated'}
                                </Badge>
                            </div>

                            <h1 className="font-bengali text-2xl sm:text-3xl font-bold text-white">
                                {teacherDisplayName}
                            </h1>
                            <p className="font-sans text-xs sm:text-sm text-gold-soft uppercase tracking-wider font-semibold">
                                {teacher.fullNameEng}
                            </p>

                            <p className="font-bengali text-xs sm:text-sm text-[#EFE9D4]/90 mt-2">
                                পদবী: <b className="text-gold-soft">{rankMetrics.designationBng}</b> · বিষয়: <b>{teacher.subject || '—'}</b> · রক্তের গ্রুপ: <b className="font-mono text-gold-soft">{teacher.bloodGroup || '—'}</b>
                            </p>
                        </div>
                    </div>

                    {/* ডান পাশের সিনিয়রিটি ও মূল বেতন হাইলাইট বক্স */}
                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 w-full md:w-auto shrink-0">
                        <div className="p-3.5 rounded-xl bg-black/25 border border-gold/30 text-center md:text-right">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-gold-soft block">
                                Monthly Basic Salary
                            </span>
                            <span className="font-bengali text-xl sm:text-2xl font-bold text-white">
                                {formatBDT(teacher.basicSalary, true)}
                            </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white/10 border border-white/15 text-center md:text-right">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-gold-soft block">
                                Composite Merit Score
                            </span>
                            <span className="font-mono text-sm font-bold text-gold-soft">
                                {rankMetrics.compositeScore} pts (Base #{rankMetrics.designationPriority})
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* =================================================================
                2. 4-TAB NAVIGATION BAR (Hidden in Print)
               ================================================================= */}
            <nav className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar no-print">
                {PROFILE_TABS.map((tab) => {
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
                3. TAB CONTENT PANELS
               ================================================================= */}
            {/* TAB 1: PERSONAL, FAMILY & ACADEMIC DOSSIER */}
            {activeTab === 'DOSSIER' && (
                <div className="space-y-6 animate-fade-up">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* ব্যক্তিগত ও পারিবারিক তথ্য */}
                        <div className="ledger-surface p-6 bg-paper-panel">
                            <h3 className="font-bengali text-base font-bold text-emerald-deep pb-3 mb-4 border-b border-ink-faint flex items-center gap-2">
                                <User className="w-4 h-4 text-gold-deep" />
                                ব্যক্তিগত ও পারিবারিক খতিয়ান
                            </h3>

                            <dl className="space-y-2.5 text-xs sm:text-[13px]">
                                <div className="flex justify-between gap-4 border-b border-ink-faint/60 pb-2">
                                    <dt className="font-bengali text-ink-muted">পিতার নাম:</dt>
                                    <dd className="font-bengali font-semibold text-ink text-right">
                                        {teacher.fathersNameBng || '—'} ({teacher.fathersNameEng || '—'})
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-ink-faint/60 pb-2">
                                    <dt className="font-bengali text-ink-muted">মাতার নাম:</dt>
                                    <dd className="font-bengali font-semibold text-ink text-right">
                                        {teacher.mothersNameBng || '—'} ({teacher.mothersNameEng || '—'})
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-ink-faint/60 pb-2">
                                    <dt className="font-bengali text-ink-muted">জন্ম ও যোগদানের তারিখ:</dt>
                                    <dd className="font-bengali font-semibold text-ink text-right">
                                        {formatDisplayDate(teacher.dateOfBirth, 'bn')} · যোগদান: {formatDisplayDate(teacher.joiningDate, 'bn')}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-ink-faint/60 pb-2">
                                    <dt className="font-bengali text-ink-muted">পরিচয়পত্র (NID / BRN):</dt>
                                    <dd className="font-mono font-bold text-emerald-deep text-right">
                                        {teacher.nidNumber || teacher.birthRegNumber || '—'}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt className="font-bengali text-ink-muted">ধর্ম, লিঙ্গ ও বৈবাহিক অবস্থা:</dt>
                                    <dd className="font-mono text-ink text-right">
                                        {teacher.religion || '—'} · {teacher.gender || '—'} · {teacher.maritalStatus || '—'}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {/* যোগাযোগ ও ঠিকানা */}
                        <div className="ledger-surface p-6 bg-paper-panel">
                            <h3 className="font-bengali text-base font-bold text-emerald-deep pb-3 mb-4 border-b border-ink-faint flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gold-deep" />
                                যোগাযোগ, জরুরি নম্বর ও ঠিকানা
                            </h3>

                            <dl className="space-y-2.5 text-xs sm:text-[13px]">
                                <div className="flex justify-between gap-4 border-b border-ink-faint/60 pb-2">
                                    <dt className="font-bengali text-ink-muted">নিজস্ব মোবাইল নম্বর:</dt>
                                    <dd className="font-mono font-bold text-emerald-deep text-right">
                                        {formatPhoneDisplay(teacher.phone)}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-ink-faint/60 pb-2">
                                    <dt className="font-bengali text-ink-muted">জরুরি যোগাযোগ (ভিন্ন):</dt>
                                    <dd className="font-bengali font-semibold text-danger text-right">
                                        {teacher.emergencyContact?.contactName || 'অভিভাবক'} —{' '}
                                        <span className="font-mono">
                                            {formatPhoneDisplay(teacher.emergencyContact?.phone)}
                                        </span>
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-ink-faint/60 pb-2">
                                    <dt className="font-bengali text-ink-muted shrink-0">বর্তমান ঠিকানা:</dt>
                                    <dd className="font-bengali text-ink text-right">
                                        {formatTeacherAddress(teacher.presentAddress)}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-ink-faint/60 pb-2">
                                    <dt className="font-bengali text-ink-muted">শ্রেণি শিক্ষক দায়িত্ব:</dt>
                                    <dd className="font-bengali font-semibold text-emerald-deep text-right">
                                        {teacher.assignedClass
                                            ? `${normalizeAssignedClass(teacher.assignedClass)} শ্রেণি`
                                            : 'প্রযোজ্য নয় (সাধারণ শিক্ষক / স্টাফ)'}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-ink-faint/60 pb-2">
                                    <dt className="font-bengali text-ink-muted">শ্রেণি তথ্য এডিটের অনুমতি:</dt>
                                    <dd className={`font-bengali font-bold text-right ${teacher.canEditAssignedClass ? 'text-success' : 'text-ink-muted'}`}>
                                        {teacher.assignedClass
                                            ? (teacher.canEditAssignedClass ? 'সক্রিয় — শ্রেণির তথ্য যোগ ও এডিট করতে পারবেন' : 'নিষ্ক্রিয় — কেবল তথ্য দেখতে পারবেন')
                                            : 'প্রযোজ্য নয়'}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt className="font-bengali text-ink-muted">মাসিক ছুটির কোটা:</dt>
                                    <dd className="font-mono font-bold text-emerald text-right">
                                        {totalQuotaAllowed}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <section className="ledger-surface p-6 bg-paper-panel">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-ink-faint pb-3">
                            <h3 className="font-bengali text-base font-bold text-emerald-deep">
                                চাকরির মেয়াদসমূহ
                            </h3>
                            <Badge variant={teacher.isActive !== false ? 'success' : 'gold'} size="sm">
                                {teacher.isActive !== false ? 'বর্তমানে কর্মরত' : 'সাবেক শিক্ষক'}
                            </Badge>
                        </div>
                        <ol className="space-y-2">
                            {employmentPeriods.map((period, index) => (
                                <li key={`${period.startDate || 'period'}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-paper px-4 py-3 font-bengali text-sm">
                                    <span>
                                        মেয়াদ {toBengaliDigits(index + 1)} · যোগদান: {formatDisplayDate(period.startDate, 'bn')}
                                    </span>
                                    <span className="text-ink-soft">
                                        {period.endDate
                                            ? `চাকরি শেষ: ${formatDisplayDate(period.endDate, 'bn')}`
                                            : teacher.isActive !== false ? 'চলমান' : 'শেষের তারিখ সংরক্ষিত নেই'}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </section>

                    {/* শিক্ষাগত যোগ্যতা ও সিজিপিএ ছক */}
                    <div className="ledger-surface p-6 bg-paper-panel">
                        <h3 className="font-bengali text-base font-bold text-emerald-deep pb-3 mb-4 border-b border-ink-faint flex items-center gap-2">
                            <GraduationCap className="w-4.5 h-4.5 text-gold-deep" />
                            শিক্ষাগত যোগ্যতা ও র‍্যাংকিং মূল্যায়ন সনদসমূহ
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
                                <thead>
                                    <tr className="bg-paper-deep border-b border-ink-faint font-bengali text-emerald-deep">
                                        <th className="py-2.5 px-3">ডিগ্রির স্তর</th>
                                        <th className="py-2.5 px-3">পরীক্ষার নাম ও বিষয়</th>
                                        <th className="py-2.5 px-3">বোর্ড / বিশ্ববিদ্যালয়</th>
                                        <th className="py-2.5 px-3 text-center">পাসের সন</th>
                                        <th className="py-2.5 px-3 text-right">ফলাফল</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink-faint font-bengali">
                                    {academicQualifications.map((q, idx) => {
                                        const degObj = DEGREE_LEVELS.find((d) => d.key === q.degreeLevel);
                                        return (
                                            <tr key={idx}>
                                                <td className="py-2.5 px-3 font-bold text-emerald-deep">
                                                    {degObj ? degObj.labelBng : q.degreeLevel}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    {q.examTitle} {q.majorOrGroup ? `(${q.majorOrGroup})` : ''}
                                                    {(q.rollNumber || q.registrationNumber || q.courseDuration) && (
                                                        <span className="mt-0.5 block text-[10px] text-ink-muted">
                                                            {[
                                                                q.rollNumber && `রোল: ${q.rollNumber}`,
                                                                q.registrationNumber && `রেজি: ${q.registrationNumber}`,
                                                                q.courseDuration && `মেয়াদ: ${q.courseDuration} বছর`
                                                            ].filter(Boolean).join(' · ')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3 text-ink-soft">{q.boardOrUniversity}</td>
                                                <td className="py-2.5 px-3 text-center font-mono">{q.passingYear}</td>
                                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald">
                                                    {formatAcademicResult(q)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: BIOMETRIC ATTENDANCE & LEAVE QUOTA OVERRIDE */}
            {activeTab === 'ATTENDANCE' && (
                <div className="space-y-6 animate-fade-up">
                    <section className="ledger-surface p-5 bg-paper-panel">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bengali text-base font-bold text-emerald-deep">
                                    {toBengaliDigits(attendancePeriod.month)}/{toBengaliDigits(attendancePeriod.year)} মাসের হাজিরা ও ব্যতিক্রম
                                </h3>
                                <p className="font-bengali text-xs text-ink-soft">
                                    প্রতিটি দিনের রেকর্ড দেখুন; বেতন শিট তৈরির ৩০ দিনের মধ্যে ব্যতিক্রমী হাজিরা সংশোধন করা যাবে।
                                </p>
                                {!canEditAttendance && (
                                    <p className="font-bengali text-xs text-danger mt-1">
                                        এই মাসের সংশোধন সময় শেষ হয়েছে।
                                    </p>
                                )}
                            </div>
                            <label className="flex items-center gap-2 font-bengali text-xs font-semibold text-ink-soft">
                                মাস নির্বাচন
                                <input
                                    type="month"
                                    aria-label="হাজিরার মাস নির্বাচন"
                                    value={`${attendancePeriod.year}-${String(attendancePeriod.month).padStart(2, '0')}`}
                                    onChange={(event) => handleAttendanceMonthChange(event.target.value)}
                                    className="erp-input w-auto font-mono text-xs"
                                />
                            </label>
                        </div>
                        <div ref={attendanceEditorRef} className="grid grid-cols-1 gap-3 md:grid-cols-4 scroll-mt-24">
                            <FormInput
                                labelEng="Attendance Date"
                                labelBng="তারিখ"
                                type="date"
                                variant="erp"
                                value={exceptionDate}
                                onChange={(event) => setExceptionDate(event.target.value)}
                            />
                            <FormSelect
                                labelEng="Exception Status"
                                labelBng="হাজিরা স্ট্যাটাস"
                                variant="erp"
                                value={exceptionStatus}
                                onChange={(event) => setExceptionStatus(event.target.value)}
                                options={[
                                    'Absent',
                                    'Official Duty',
                                    'Present',
                                    'Late'
                                ]}
                            />
                            {['Present', 'Late'].includes(exceptionStatus) && (
                                <FormInput
                                    labelEng="In Time"
                                    labelBng="প্রবেশ সময়"
                                    type="time"
                                    variant="erp"
                                    isMonoText
                                    value={exceptionTime}
                                    onChange={(event) => setExceptionTime(event.target.value)}
                                />
                            )}
                            <div className="flex items-end">
                                <Button
                                    variant={exceptionStatus === 'Absent' ? 'danger' : 'emerald'}
                                    size="sm"
                                    fullWidth
                                    isLoading={isSavingAttendanceException}
                                    disabled={!canEditAttendance}
                                    onClick={handleSaveAttendanceException}
                                >
                                    <span className="font-bengali">
                                        {exceptionStatus === 'Absent' ? 'Absent করে সংরক্ষণ' : 'তারিখটি সংরক্ষণ করুন'}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </section>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* কোটা কন্ট্রোল ওভাররাইড কার্ড */}
                        <div className="ledger-surface p-6 bg-paper-panel flex flex-col justify-between">
                            <div>
                                <Badge variant="gold" size="sm" mono className="mb-2">
                                    LEAVE QUOTA ENGINE
                                </Badge>
                                <h3 className="font-bengali text-base font-bold text-emerald-deep">
                                    মাসিক ফ্রি ছুটির কোটা ওভাররাইড
                                </h3>
                                <p className="font-bengali text-xs text-ink-soft mt-1 leading-relaxed">
                                    মাদ্রাসার সাধারণ নিয়মে প্রতি মাসে <b>২.০ ইউনিট</b> ফ্রি কোটা বরাদ্দ থাকে (বিলম্ব ০.৫, ছুটি ১.০)। অ্যাডমিন চাইলে এই শিক্ষকের জন্য কোটা কম-বেশি করতে পারবেন।
                                </p>

                                <div className="my-4 p-3.5 rounded-xl bg-paper border border-ink-faint space-y-2 text-xs font-bengali">
                                    <div className="flex justify-between">
                                        <span>চলতি মাসে ব্যবহৃত কোটা:</span>
                                        <b className="font-mono text-warning-deep">{usedQuotaThisMonth} / {totalQuotaAllowed}</b>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>অবশিষ্ট ফ্রি কোটা:</span>
                                        <b className="font-mono text-success">{remainingQuota.toFixed(1)} ইউনিট</b>
                                    </div>
                                </div>

                                <FormInput
                                    labelEng="Custom Monthly Quota"
                                    labelBng="নতুন মাসিক ছুটির কোটা নির্ধারণ"
                                    variant="erp"
                                    isMonoText
                                    value={quotaInput}
                                    onChange={(e) => setQuotaInput(e.target.value)}
                                />
                            </div>

                            <Button
                                variant="emerald"
                                size="sm"
                                fullWidth
                                isLoading={isUpdatingQuota}
                                onClick={handleSaveLeaveQuota}
                            >
                                <span className="font-bengali">কোটা আপডেট সংরক্ষণ করুন</span>
                            </Button>
                        </div>

                        {/* দৈনিক বায়োমেট্রিক পাঞ্চ লগ টেবিল */}
                        <div className="lg:col-span-2 ledger-surface p-6 bg-paper-panel">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-ink-faint">
                                <h3 className="font-bengali text-base font-bold text-emerald-deep">
                                    পুরো মাসের হাজিরা (PIN #{teacher.biometricDeviceId})
                                </h3>
                                <Badge variant="emerald-subtle" size="sm" mono>
                                    9:00 AM Rule
                                </Badge>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-paper-deep border-b border-ink-faint font-bengali text-emerald-deep">
                                            <th className="py-2.5 px-3">তারিখ ও বার</th>
                                            <th className="py-2.5 px-3">প্রবেশ (In Time)</th>
                                            <th className="py-2.5 px-3">প্রস্থান (Out Time)</th>
                                            <th className="py-2.5 px-3 text-center">অবস্থা</th>
                                            <th className="py-2.5 px-3 text-right">কোটা ব্যয়</th>
                                            <th className="py-2.5 px-3 text-right no-print">সংশোধন</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-ink-faint">
                                        {monthAttendanceRows.map(({ date, log, status }) => (
                                            <tr key={log?._id || date}>
                                                <td className="py-2.5 px-3 font-bengali font-semibold">
                                                    {formatDisplayDate(date, 'bn')}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono font-bold text-emerald-deep">
                                                    {log?.punchTime
                                                        ? new Intl.DateTimeFormat('bn-BD', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }).format(new Date(log.punchTime))
                                                        : '—'}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-ink-soft">
                                                    —
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <Badge
                                                        variant={
                                                            ['Present', 'Holiday Duty', 'Holiday_Duty', 'Official Duty', 'Official_Duty', 'Excused Late', 'Excused_Late'].includes(status)
                                                                ? 'success'
                                                                : status === 'Absent'
                                                                    ? 'danger'
                                                                    : status === 'Late'
                                                                    ? 'warning'
                                                                    : 'gold'
                                                        }
                                                        size="sm"
                                                    >
                                                        {status}
                                                    </Badge>
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono font-bold">
                                                    {Number(log?.quotaDeduction ?? log?.deductionWeight) > 0
                                                        ? `-${log.quotaDeduction ?? log.deductionWeight}`
                                                        : '0.0'}
                                                </td>
                                                <td className="py-2.5 px-3 text-right no-print">
                                                    <Button
                                                        variant="outline"
                                                        size="xs"
                                                        disabled={!canEditAttendance}
                                                        onClick={() => selectAttendanceDateForEdit(date, status)}
                                                    >
                                                        <span className="font-bengali">এডিট</span>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: SAVED MONTHLY SALARY SHEETS */}
            {activeTab === 'PAYROLL' && (
                <div className="ledger-surface p-6 bg-paper-panel animate-fade-up">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-ink-faint">
                        <div>
                            <h3 className="font-bengali text-base sm:text-lg font-bold text-emerald-deep">
                                সংরক্ষিত মাসিক বেতন শিট ({teacher.fullNameBng})
                            </h3>
                            <p className="font-bengali text-xs text-ink-soft">
                                মূল বেতন: <b>{formatBDT(teacher.basicSalary, true)}</b>
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
                            <thead>
                                <tr className="bg-paper-deep border-b border-ink-faint font-bengali text-emerald-deep">
                                    <th className="py-3 px-3">মাস ও বছর</th>
                                    <th className="py-3 px-3 text-right">মূল বেতন</th>
                                    <th className="py-3 px-3 text-center">কোটা ব্যবহার</th>
                                    <th className="py-3 px-3 text-right">কর্তন (Deduction)</th>
                                    <th className="py-3 px-3 text-right">নিট বেতন</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-faint">
                                {salaryHistory.map((sal) => (
                                    <tr key={sal.id} className="hover:bg-emerald-subtle/30">
                                        <td className="py-3 px-3 font-bengali font-semibold">
                                            {sal.monthBng}
                                        </td>
                                        <td className="py-3 px-3 text-right font-bengali">
                                            {formatBDT(sal.basicSalary, true)}
                                        </td>
                                        <td className="py-3 px-3 text-center font-mono">
                                            {sal.quotaUsed} / {sal.quotaAllowed}
                                        </td>
                                        <td className="py-3 px-3 text-right font-bengali text-danger font-semibold">
                                            {sal.deduction > 0 ? `-${formatBDT(sal.deduction, true)}` : '০ ৳'}
                                        </td>
                                        <td className="py-3 px-3 text-right font-bengali font-bold text-emerald-deep">
                                            {formatBDT(sal.netSalary, true)}
                                        </td>
                                    </tr>
                                ))}
                                {salaryHistory.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="py-6 px-3 text-center font-bengali text-ink-muted">
                                            এই শিক্ষকের কোনো বেতন শিট পাওয়া যায়নি।
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: SECURITY, ROLE & PASSWORD RESET CONTROL */}
            {activeTab === 'SECURITY' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
                    {/* পাসওয়ার্ড রিসেট কার্ড */}
                    <div className="ledger-surface p-6 bg-paper-panel">
                        <Badge variant="gold" size="sm" mono className="mb-2">
                            ADMIN PASSWORD OVERRIDE
                        </Badge>
                        <h3 className="font-bengali text-base font-bold text-emerald-deep">
                            শিক্ষকের পোর্টাল পাসওয়ার্ড রিসেট করুন
                        </h3>
                        <p className="font-bengali text-xs text-ink-soft mt-1 mb-4 leading-relaxed">
                            কোনো শিক্ষক নিজের পাসওয়ার্ড ভুলে গেলে বা ব্রুট-ফোর্স লকআউটে আটকে গেলে অ্যাডমিন এখান থেকে ১ ক্লিকে ডিফল্ট ১০-ডিজিট আইডি অথবা নতুন পাসওয়ার্ড সেট করে দিতে পারবেন।
                        </p>

                        <FormInput
                            labelEng="New Custom Password (Min 6 chars)"
                            labelBng="নতুন পাসওয়ার্ড লিখুন"
                            type="password"
                            variant="erp"
                            isMonoText
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড"
                        />

                        <div className="flex flex-wrap items-center gap-3 mt-4">
                            <Button
                                variant="emerald"
                                size="sm"
                                leftIcon={KeyRound}
                                isLoading={isResettingPassword}
                                onClick={handleAdminPasswordReset}
                            >
                                <span className="font-bengali">নতুন পাসওয়ার্ড সেট করুন</span>
                            </Button>

                        </div>
                    </div>

                    {/* অ্যাকাউন্ট সক্রিয়/নিষ্ক্রিয় ও লকআউট স্ট্যাটাস কন্ট্রোল */}
                    <div className="ledger-surface p-6 bg-paper-panel flex flex-col justify-between">
                        <div>
                            <Badge
                                variant={teacher.isActive !== false ? 'success' : 'danger'}
                                size="sm"
                                dot
                                className="mb-2"
                            >
                                ACCOUNT ACCESS STATUS
                            </Badge>
                            <h3 className="font-bengali text-base font-bold text-emerald-deep">
                                পোর্টাল অ্যাক্সেস ও অ্যাকাউন্ট সক্রিয়তা নিয়ন্ত্রণ
                            </h3>
                            <p className="font-bengali text-xs text-ink-soft mt-1 leading-relaxed">
                                কোনো শিক্ষক অবসর নিলে বা সাময়িকভাবে স্থগিত থাকলে তার অ্যাকাউন্ট <b>Deactivate</b> করে রাখলে তিনি আর লগইন করতে পারবেন না, তবে তার ঐতিহাসিক হাজিরা ও বেতন রেকর্ড সংরক্ষিত থাকবে।
                            </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-ink-faint flex items-center justify-between gap-4">
                            <span className="font-bengali text-xs font-bold text-ink">
                                বর্তমান অবস্থা: {teacher.isActive !== false ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Deactivated)'}
                            </span>

                            <Button
                                variant={teacher.isActive !== false ? 'danger' : 'emerald'}
                                size="sm"
                                leftIcon={teacher.isActive !== false ? Lock : Unlock}
                                onClick={handleToggleAccountStatus}
                            >
                                <span className="font-bengali">
                                    {teacher.isActive !== false ? 'অ্যাকাউন্ট নিষ্ক্রিয় করুন' : 'পুনরায় যোগদান করুন'}
                                </span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isProfileEditorOpen && teacher && (
                <AdminTeacherProfileEditor
                    teacher={teacher}
                    onClose={() => setIsProfileEditorOpen(false)}
                    onUpdated={(updatedTeacher) => {
                        setTeacher(updatedTeacher);
                        setQuotaInput(String(updatedTeacher.customLeaveQuota ?? 2));
                    }}
                />
            )}

            {/* ডিজিটাল আইডি কার্ড মডাল */}
            <Modal
                isOpen={isIdCardModalOpen}
                onClose={() => setIsIdCardModalOpen(false)}
                size="xl"
                titleEng="Official Teacher Digital Registry Card"
                titleBng="ডিজিটাল রেজিস্ট্রি আইডি কার্ড ও সনদ"
                footer={
                    <Button variant="emerald" size="sm" onClick={() => setIsIdCardModalOpen(false)}>
                        <span className="font-bengali">বন্ধ করুন</span>
                    </Button>
                }
            >
                <DigitalRegistryIdCard
                    registryRecord={{
                        uid: teacher.uid || `ardm-${teacher.teacherCode}`,
                        teacherId: teacher.teacherCode,
                        registrationStatus: 'Approved',
                        teacher
                    }}
                />
            </Modal>

        </div>
    );
}
