/**
 * ARDM Enterprise ERP — Monthly Payroll Engine & Cash Voucher Ledger (Step 18)
 * Features:
 * - Persisted server-generated salary sheets and attendance breakdown
 * - Audited monthly amount adjustments and payment status updates
 * - 1-Click Cash Payment Disbursement (Pending -> Paid) with Timestamp & Voucher Number
 * - Official Bilingual Printable Cash Salary Voucher Modal + Full A4 Monthly Master Salary Sheet Print
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Banknote,
    Calculator,
    Printer,
    Receipt,
    CheckCircle2,
    Clock,
    SlidersHorizontal,
    RefreshCw,
    Search,
    Sparkles,
    ShieldCheck,
    Wallet,
    TrendingDown,
    Award,
    FileSpreadsheet
} from 'lucide-react';
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
    formatDisplayDate,
    extractPureDigits
} from '@utils/formatters';
import { cn } from '@utils/cn';

const MONTHS_BNG = [
    { value: '01', labelBng: 'জানুয়ারি', labelEng: 'January' },
    { value: '02', labelBng: 'ফেব্রুয়ারি', labelEng: 'February' },
    { value: '03', labelBng: 'মার্চ', labelEng: 'March' },
    { value: '04', labelBng: 'এপ্রিল', labelEng: 'April' },
    { value: '05', labelBng: 'মে', labelEng: 'May' },
    { value: '06', labelBng: 'জুন', labelEng: 'June' },
    { value: '07', labelBng: 'জুলাই', labelEng: 'July' },
    { value: '08', labelBng: 'আগস্ট', labelEng: 'August' },
    { value: '09', labelBng: 'সেপ্টেম্বর', labelEng: 'September' },
    { value: '10', labelBng: 'অক্টোবর', labelEng: 'October' },
    { value: '11', labelBng: 'নভেম্বর', labelEng: 'November' },
    { value: '12', labelBng: 'ডিসেম্বর', labelEng: 'December' }
];

/**
 * ৩০-দিনের আনুপাতিক বেতন ও ২.০ ফ্রি কোটা কর্তন ক্যালকুলেটর ইঞ্জিন
 */
function normalizeSalaryRecord(salary) {
    const teacher = salary.teacherId && typeof salary.teacherId === 'object'
        ? salary.teacherId
        : {};
    const attendance = salary.attendanceBreakdown || {};
    const loanDeduction = Number(salary.loanDeduction?.installmentAmount) || 0;
    const extraDeduction = Number(salary.extraDeduction) || 0;
    const extraAllowance = Number(salary.extraAllowance) || 0;
    const bonusAmount = Number(salary.bonusAmount) || 0;
    const netPayable = Number(salary.netPayableSalary) || 0;
    const basicSalary = Number(salary.basicSalarySnapshot) || 0;
    const effectiveBasic = Number(salary.proRataInfo?.effectiveBasicSalary ?? basicSalary);
    const adjustmentAmount = Number(salary.customAdjustment?.amount) || 0;

    return {
        id: salary._id,
        teacherId: teacher._id || salary.teacherId,
        teacherCode: teacher.teacherCode || '',
        biometricDeviceId: teacher.biometricDeviceId || '',
        rank: Number(teacher.rankingMetrics?.overallMadrasahRank) || null,
        fullNameBng: teacher.fullNameBng || '',
        fullNameEng: teacher.fullNameEng || '',
        designationBng: teacher.designation || '',
        paymentMethod: salary.paymentMethod,
        basicSalary,
        perDaySalary: Number(salary.perDaySalary) || 0,
        allowedQuota: Number(attendance.allowedPaidQuota) || 0,
        presentDays: Number(attendance.totalPresent) || 0,
        lateCount: Number(attendance.totalLateCount) || 0,
        leaveCount: Number(attendance.totalLeaveCount) || 0,
        absentDays: Number(attendance.totalUnexcusedAbsentCount) || 0,
        quotaUsed: Number(attendance.totalQuotaUsed) || 0,
        excessQuotaUnits: Number(attendance.excessQuotaDays) || 0,
        totalDeductibleDays: Number(attendance.totalDeductibleDays) || 0,
        autoAttendanceDeduction: Number(salary.leaveAndAbsentDeductionAmount) || 0,
        bonusAmount,
        manualDeduction: loanDeduction + extraDeduction,
        totalDeduction: Math.max(0, Math.round(
            effectiveBasic + bonusAmount + adjustmentAmount + extraAllowance -
            loanDeduction - extraDeduction - netPayable
        )),
        netPayable,
        voucherNo: salary.voucherNo || String(salary._id || ''),
        paymentStatus: salary.paymentStatus || 'Pending',
        paidAt: salary.paidAt || null,
        remarks: salary.adjustmentNote || salary.customAdjustment?.reason || ''
    };
}

export default function PayrollManagement() {
    const toast = useToast();

    const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
    const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Paid' | 'Pending'
    const [isGenerating, setIsGenerating] = useState(false);

    // শিক্ষকদের তালিকা ও পে-রোল সারি স্টেট
    const [payrollRows, setPayrollRows] = useState([]);

    // ১. লাইভ বেতন ও হাজিরা অ্যাডজাস্টমেন্ট মডাল স্টেট
    const [editingRow, setEditingRow] = useState(null);
    const [adjustForm, setAdjustForm] = useState({
        adjustmentMode: 'INCREASE_AMOUNT',
        adjustmentValue: '',
        reason: ''
    });

    // ২. প্রিন্টেবল ক্যাশ ভাউচার রিসিট মডাল স্টেট
    const [activeVoucherRow, setActiveVoucherRow] = useState(null);

    const activeMonthObj = useMemo(
        () => MONTHS_BNG.find((m) => m.value === selectedMonth) || MONTHS_BNG[10],
        [selectedMonth]
    );

    // Load persisted payroll; generate it only after an explicit admin action.
    const handleGenerateOrSyncPayroll = useCallback(async (showNotification = true) => {
        setIsGenerating(true);
        try {
            if (showNotification) {
                await axiosClient.post('/payroll/generate', {
                    month: Number(selectedMonth),
                    year: Number(selectedYear),
                    forceGenerateWithPending: false
                });
            }
            const res = await axiosClient.get('/payroll/sheets', {
                params: { month: Number(selectedMonth), year: Number(selectedYear) }
            });
            const salaries = res.data?.data?.salaries;
            if (!Array.isArray(salaries)) throw new Error('সার্ভার থেকে বেতন শিট পাওয়া যায়নি।');
            setPayrollRows(salaries.map(normalizeSalaryRecord));
            if (showNotification) {
                toast.success(
                    `${activeMonthObj.labelBng} ${toBengaliDigits(selectedYear)}-এর বেতন শিট সার্ভারে সংরক্ষিত হয়েছে।`
                );
            }
        } catch (error) {
            setPayrollRows([]);
            toast.error(extractApiErrorMessage(error, 'বেতন শিট লোড বা জেনারেট করা যায়নি।'));
        } finally {
            setIsGenerating(false);
        }
    }, [selectedYear, selectedMonth, activeMonthObj, toast]);

    useEffect(() => {
        handleGenerateOrSyncPayroll(false);
    }, [selectedYear, selectedMonth, handleGenerateOrSyncPayroll]);

    // ৩. অ্যাডজাস্টমেন্ট মডাল ওপেন করা
    const openAdjustmentModal = (row) => {
        setEditingRow(row);
        setAdjustForm({
            adjustmentMode: 'INCREASE_AMOUNT',
            adjustmentValue: '',
            reason: ''
        });
    };

    // ৪. Persist a payroll amount adjustment; attendance itself is managed separately.
    const handleSaveAdjustment = async () => {
        if (!editingRow) return;
        const adjustmentValue = Number(extractPureDigits(adjustForm.adjustmentValue));
        if (!adjustmentValue || !adjustForm.reason.trim()) {
            toast.error('সমন্বয়ের পরিমাণ ও কারণ প্রদান করুন।');
            return;
        }
        setIsGenerating(true);
        try {
            await axiosClient.post('/payroll/adjust-monthly-sheet', {
                month: Number(selectedMonth),
                year: Number(selectedYear),
                teacherId: editingRow.teacherId,
                adjustmentMode: adjustForm.adjustmentMode,
                adjustmentValue,
                reason: adjustForm.reason.trim()
            });
            setEditingRow(null);
            await handleGenerateOrSyncPayroll(false);
            toast.success(`${editingRow.fullNameBng}-এর বেতন সমন্বয় সংরক্ষিত হয়েছে।`);
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'বেতন সমন্বয় সংরক্ষণ করা যায়নি।'));
        } finally {
            setIsGenerating(false);
        }
    };

    // ৫. ১-ক্লিক ক্যাশ বেতন পরিশোধ (Mark as Paid & Open Cash Voucher)
    const handleDisburseCashPayment = async (row) => {
        const todayStr = new Date().toISOString().split('T')[0];

        try {
            const res = await axiosClient.patch(`/payroll/sheets/${row.id}/pay`, {
                paymentMethod: 'Cash',
                transactionReference: row.voucherNo
            });
            const updatedRow = { ...row, paymentStatus: 'Paid', paidAt: res.data?.data?.paidAt || todayStr };
            setPayrollRows((prev) => prev.map((item) => (item.id === row.id ? updatedRow : item)));
            toast.success(`${row.fullNameBng}-এর বেতন পরিশোধ সার্ভারে রেকর্ড হয়েছে।`);
            setActiveVoucherRow(updatedRow);
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'বেতন পরিশোধ রেকর্ড করা যায়নি।'));
        }
    };

    // সামারি মেট্রিক্স
    const summaryMetrics = useMemo(() => {
        return payrollRows.reduce(
            (acc, r) => {
                acc.totalBasic += r.basicSalary;
                acc.totalDeduction += r.totalDeduction;
                acc.totalBonus += r.bonusAmount;
                acc.totalNetPayable += r.netPayable;
                if (r.paymentStatus === 'Paid') {
                    acc.paidAmount += r.netPayable;
                    acc.paidCount += 1;
                } else {
                    acc.pendingAmount += r.netPayable;
                    acc.pendingCount += 1;
                }
                return acc;
            },
            {
                totalBasic: 0,
                totalDeduction: 0,
                totalBonus: 0,
                totalNetPayable: 0,
                paidAmount: 0,
                paidCount: 0,
                pendingAmount: 0,
                pendingCount: 0
            }
        );
    }, [payrollRows]);

    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return payrollRows.filter((r) => {
            if (statusFilter !== 'ALL' && r.paymentStatus !== statusFilter) return false;
            if (!q) return true;
            return (
                r.fullNameBng.toLowerCase().includes(q) ||
                r.fullNameEng.toLowerCase().includes(q) ||
                String(r.teacherCode).includes(q) ||
                r.voucherNo.toLowerCase().includes(q)
            );
        });
    }, [payrollRows, searchQuery, statusFilter]);

    return (
        <div className="space-y-6 animate-fade-up">

            {/* =================================================================
                1. PAYROLL COMMAND HEADER & MONTH SELECTOR
               ================================================================= */}
            <section className="ledger-surface p-6 bg-paper-panel flex flex-wrap items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald text-gold-soft flex items-center justify-center shadow-xs shrink-0">
                        <Banknote className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="gold" size="sm" mono>
                                STEP 18 · PAYROLL &amp; CASH VOUCHER ENGINE
                            </Badge>
                            <Badge variant="emerald-subtle" size="sm">
                                ২.০ ফ্রি কোটা ও ৩০-দিনের আনুপাতিক কর্তন
                            </Badge>
                        </div>
                        <h1 className="font-bengali text-xl sm:text-2xl font-bold text-emerald-deep mt-1">
                            মাসিক বেতন ও ক্যাশ ভাউচার লেজার — {activeMonthObj.labelBng} {toBengaliDigits(selectedYear)}
                        </h1>
                        <p className="font-bengali text-xs text-ink-soft">
                            সূত্র: <b>দৈনিক হার = মূল বেতন ÷ ৩০</b> · ফ্রি কোটা: <b>২.০ ইউনিট</b> (বিলম্ব ০.৫ + ছুটি ১.০) · অতিরিক্ত অনুপস্থিতিতে স্বয়ংক্রিয় কর্তন।
                        </p>
                    </div>
                </div>

                {/* মাস/বছর সিলেক্টর ও অ্যাকশন বাটন */}
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="erp-input custom-select-arrow font-bengali text-xs py-2 w-auto min-w-[130px]"
                    >
                        {MONTHS_BNG.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.labelBng} ({m.labelEng})
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="erp-input custom-select-arrow font-mono text-xs py-2 w-auto min-w-[95px]"
                    >
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                    </select>

                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={Calculator}
                        isLoading={isGenerating}
                        onClick={() => handleGenerateOrSyncPayroll(true)}
                    >
                        <span className="font-bengali">পে-রোল রি-ক্যালকুলেট</span>
                    </Button>

                    <Button
                        variant="gold"
                        size="sm"
                        leftIcon={Printer}
                        onClick={() => window.print()}
                    >
                        <span className="font-bengali">মাস্টার বেতন শিট প্রিন্ট (A4)</span>
                    </Button>
                </div>
            </section>

            {/* =================================================================
                2. 4 FINANCIAL KPI SUMMARY CARDS
               ================================================================= */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 no-print">
                <div className="ledger-surface p-4 sm:p-5 bg-paper-panel">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted block">
                        Gross Basic Payroll
                    </span>
                    <h3 className="font-bengali text-xs font-bold text-ink-soft mt-0.5">
                        সর্বমোট মূল বেতন ({toBengaliDigits(payrollRows.length)} জন)
                    </h3>
                    <p className="font-bengali text-xl sm:text-2xl font-bold text-emerald-deep mt-2">
                        {formatBDT(summaryMetrics.totalBasic, true)}
                    </p>
                </div>

                <div className="ledger-surface p-4 sm:p-5 bg-paper-panel">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-danger block">
                        Quota &amp; Absent Deductions
                    </span>
                    <h3 className="font-bengali text-xs font-bold text-ink-soft mt-0.5">
                        কোটা অতিরিক্ত ও অনুপস্থিতি কর্তন
                    </h3>
                    <p className="font-bengali text-xl sm:text-2xl font-bold text-danger mt-2">
                        -{formatBDT(summaryMetrics.totalDeduction, true)}
                    </p>
                </div>

                <div className="ledger-surface p-4 sm:p-5 bg-paper-panel">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-success block">
                        Net Disbursed Cash
                    </span>
                    <h3 className="font-bengali text-xs font-bold text-ink-soft mt-0.5">
                        পরিশোধিত ক্যাশ ({toBengaliDigits(summaryMetrics.paidCount)} জন)
                    </h3>
                    <p className="font-bengali text-xl sm:text-2xl font-bold text-success mt-2">
                        {formatBDT(summaryMetrics.paidAmount, true)}
                    </p>
                </div>

                <div className="ledger-surface p-4 sm:p-5 bg-paper-panel">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-gold-deep block">
                        Pending Cash Disbursement
                    </span>
                    <h3 className="font-bengali text-xs font-bold text-ink-soft mt-0.5">
                        বকেয়া ক্যাশ প্রদেয় ({toBengaliDigits(summaryMetrics.pendingCount)} জন)
                    </h3>
                    <p className="font-bengali text-xl sm:text-2xl font-bold text-gold-deep mt-2">
                        {formatBDT(summaryMetrics.pendingAmount, true)}
                    </p>
                </div>
            </section>

            {/* =================================================================
                3. SEARCH & PAYMENT STATUS FILTER BAR
               ================================================================= */}
            <section className="ledger-surface p-4 bg-paper-panel flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="শিক্ষকের নাম, ১০-ডিজিট আইডি বা ভাউচার নম্বর (ARDM-CV-...) দিয়ে খুঁজুন"
                        className="erp-input pl-10 font-bengali text-xs sm:text-sm"
                    />
                </div>

                <div className="flex items-center gap-1.5">
                    {[
                        { key: 'ALL', label: 'সকল শিক্ষক' },
                        { key: 'Paid', label: 'পরিশোধিত (Paid)' },
                        { key: 'Pending', label: 'অপরিশোধিত (Pending)' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setStatusFilter(tab.key)}
                            className={cn(
                                'px-3.5 py-1.5 rounded-xl font-bengali text-xs font-semibold border transition-all',
                                statusFilter === tab.key
                                    ? 'bg-emerald text-white border-emerald'
                                    : 'bg-paper text-ink-soft border-ink-faint hover:border-gold'
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* =================================================================
                4. PRINT HEADER FOR A4 MASTER SALARY REGISTER
               ================================================================= */}
            <div className="hidden print:block text-center pb-4 mb-4 border-b-2 border-emerald">
                <h1 className="font-serif text-2xl font-bold text-emerald-deep">
                    {INSTITUTION_INFO.nameEng}
                </h1>
                <p className="font-bengali text-sm font-bold text-emerald">
                    {INSTITUTION_INFO.nameBng} · মাসিক শিক্ষক-কর্মচারী বেতন ও ক্যাশ ভাউচার রেজিস্টার ({activeMonthObj.labelBng} {toBengaliDigits(selectedYear)})
                </p>
            </div>

            {/* =================================================================
                5. MONTHLY PAYROLL LEDGER TABLE
               ================================================================= */}
            <section className="ledger-surface bg-paper-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-paper-deep/90 border-b border-ink-faint font-bengali font-bold text-emerald-deep">
                                <th className="py-3.5 pl-4 pr-2">র‍্যাংক</th>
                                <th className="py-3.5 px-3">শিক্ষকের নাম ও আইডি</th>
                                <th className="py-3.5 px-3 text-right">মূল বেতন (দৈনিক হার)</th>
                                <th className="py-3.5 px-3 text-center">বিলম্ব ও ছুটি</th>
                                <th className="py-3.5 px-3 text-center">কোটা হিসাব</th>
                                <th className="py-3.5 px-3 text-right">কর্তন / বোনাস</th>
                                <th className="py-3.5 px-3 text-right">নিট প্রদেয় ক্যাশ</th>
                                <th className="py-3.5 px-3 text-center">অবস্থা</th>
                                <th className="py-3.5 pl-2 pr-4 text-right no-print">ক্যাশ ভাউচার ও অ্যাকশন</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-faint">
                            {filteredRows.map((row) => {
                                const hasDeduction = row.totalDeduction > 0;
                                return (
                                    <tr key={row.teacherId} className="hover:bg-emerald-subtle/30 transition-colors">
                                        <td className="py-3.5 pl-4 pr-2 font-mono font-bold text-emerald-deep">
                                            {row.rank ? `#${row.rank}` : '—'}
                                        </td>

                                        <td className="py-3.5 px-3">
                                            <p className="font-bengali text-sm font-bold text-emerald-deep">
                                                {row.fullNameBng}
                                            </p>
                                            <p className="font-bengali text-[11px] text-ink-soft">
                                                {row.designationBng} · <span className="font-mono">{row.teacherCode}</span>
                                            </p>
                                        </td>

                                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                            <span className="font-bengali text-sm font-bold text-ink block">
                                                {formatBDT(row.basicSalary, true)}
                                            </span>
                                            <span className="font-bengali text-[10.5px] text-ink-muted">
                                                দৈনিক: {formatBDT(row.perDaySalary, true)}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-3 text-center font-bengali">
                                            <span className="inline-block px-2 py-0.5 rounded bg-paper border border-ink-faint text-[11px]">
                                                Late: <b>{toBengaliDigits(row.lateCount)}</b> · Leave: <b>{toBengaliDigits(row.leaveCount)}</b> · Abs: <b className="text-danger">{toBengaliDigits(row.absentDays)}</b>
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            <span
                                                className={cn(
                                                    'font-mono text-xs font-bold px-2 py-0.5 rounded',
                                                    row.excessQuotaUnits > 0
                                                        ? 'bg-danger-bg text-danger'
                                                        : 'bg-success-bg text-success'
                                                )}
                                            >
                                                {row.quotaUsed.toFixed(1)} / {row.allowedQuota.toFixed(1)}
                                            </span>
                                            {row.totalDeductibleDays > 0 && (
                                                <span className="block font-bengali text-[10.5px] text-danger font-bold mt-0.5">
                                                    কর্তনযোগ্য: {toBengaliDigits(row.totalDeductibleDays)} দিন
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-3 text-right whitespace-nowrap font-bengali">
                                            {hasDeduction ? (
                                                <span className="text-danger font-bold block">
                                                    -{formatBDT(row.totalDeduction, true)}
                                                </span>
                                            ) : (
                                                <span className="text-ink-muted block">০ ৳</span>
                                            )}
                                            {row.bonusAmount > 0 && (
                                                <span className="text-success text-[11px] font-bold block">
                                                    +{formatBDT(row.bonusAmount, true)} (বোনাস)
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                            <span className="font-bengali text-base font-bold text-emerald-deep">
                                                {formatBDT(row.netPayable, true)}
                                            </span>
                                            <span className="block font-mono text-[10px] text-ink-muted">
                                                {row.voucherNo}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                            <Badge
                                                variant={row.paymentStatus === 'Paid' ? 'success' : 'gold'}
                                                size="sm"
                                                dot
                                            >
                                                {row.paymentStatus === 'Paid' ? 'পরিশোধিত' : 'বকেয়া'}
                                            </Badge>
                                        </td>

                                        <td className="py-3.5 pl-2 pr-4 text-right whitespace-nowrap no-print">
                                            <div className="inline-flex items-center gap-1.5">
                                                <Button
                                                    variant="ghost"
                                                    size="xs"
                                                    leftIcon={SlidersHorizontal}
                                                    onClick={() => openAdjustmentModal(row)}
                                                    className="border border-ink-faint"
                                                    title="হাজিরা বা বোনাস সংশোধন"
                                                >
                                                    <span className="font-bengali">সংশোধন</span>
                                                </Button>

                                                {row.paymentStatus === 'Pending' ? (
                                                    <Button
                                                        variant="emerald"
                                                        size="xs"
                                                        leftIcon={Wallet}
                                                        onClick={() => handleDisburseCashPayment(row)}
                                                    >
                                                        <span className="font-bengali">ক্যাশ পরিশোধ</span>
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="xs"
                                                        leftIcon={Receipt}
                                                        onClick={() => setActiveVoucherRow(row)}
                                                    >
                                                        <span className="font-bengali">ক্যাশ ভাউচার</span>
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* =================================================================
                6. SALARY & QUOTA ADJUSTMENT MODAL
               ================================================================= */}
            <Modal
                isOpen={Boolean(editingRow)}
                onClose={() => setEditingRow(null)}
                size="md"
                titleEng="Monthly Payroll Amount Adjustment"
                titleBng="মাসিক বেতন সমন্বয়"
                subtitleBng={
                    editingRow
                        ? `${editingRow.fullNameBng} (মূল বেতন: ${formatBDT(editingRow.basicSalary, true)} · দৈনিক হার: ${formatBDT(editingRow.perDaySalary, true)})`
                        : ''
                }
                footer={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setEditingRow(null)}>
                            <span className="font-bengali">বাতিল</span>
                        </Button>
                        <Button variant="emerald" size="sm" isLoading={isGenerating} onClick={handleSaveAdjustment}>
                            <span className="font-bengali">সমন্বয় সংরক্ষণ করুন</span>
                        </Button>
                    </>
                }
            >
                {editingRow && (
                    <div className="space-y-4">
                        <p className="font-bengali text-xs text-ink-soft">
                            হাজিরার রেকর্ড এখানে পরিবর্তন হয় না; হাজিরা সংশোধন করতে হাজিরা লেজার ব্যবহার করুন।
                        </p>
                        <FormSelect
                                labelEng="Adjustment Type"
                                labelBng="সমন্বয়ের ধরন"
                                variant="erp"
                                value={adjustForm.adjustmentMode}
                                onChange={(e) =>
                                    setAdjustForm((prev) => ({ ...prev, adjustmentMode: e.target.value }))
                                }
                                options={[
                                    { value: 'INCREASE_AMOUNT', label: 'পরিমাণ যোগ (Increase)' },
                                    { value: 'DECREASE_AMOUNT', label: 'পরিমাণ কমানো (Decrease)' },
                                    { value: 'INCREASE_PERCENT', label: 'শতাংশ যোগ (Increase %)' },
                                    { value: 'DECREASE_PERCENT', label: 'শতাংশ কমানো (Decrease %)' }
                                ]}
                                placeholder={false}
                            />
                        <FormInput
                                labelEng="Adjustment Value"
                                labelBng="সমন্বয়ের পরিমাণ"
                                variant="erp"
                                isMonoText
                                value={adjustForm.adjustmentValue}
                                onChange={(e) =>
                                    setAdjustForm((prev) => ({ ...prev, adjustmentValue: extractPureDigits(e.target.value) }))
                                }
                        />
                        <FormInput
                            labelEng="Reason"
                            labelBng="সমন্বয়ের কারণ"
                            variant="erp"
                            isBengaliText
                            value={adjustForm.reason}
                            onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
                        />
                    </div>
                )}
            </Modal>

            {/* =================================================================
                7. OFFICIAL PRINTABLE CASH SALARY VOUCHER MODAL
               ================================================================= */}
            <Modal
                isOpen={Boolean(activeVoucherRow)}
                onClose={() => setActiveVoucherRow(null)}
                size="lg"
                titleEng="Official Institutional Cash Payment Voucher"
                titleBng="অফিশিয়াল ক্যাশ বেতন পরিশোধ ভাউচার"
                footer={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setActiveVoucherRow(null)}>
                            <span className="font-bengali">বন্ধ করুন</span>
                        </Button>
                        <Button
                            variant="gold"
                            size="sm"
                            leftIcon={Printer}
                            onClick={() => window.print()}
                        >
                            <span className="font-bengali">ক্যাশ ভাউচার প্রিন্ট করুন</span>
                        </Button>
                    </>
                }
            >
                {activeVoucherRow && (
                    <div className="p-6 rounded-2xl bg-paper border-2 border-gold shadow-sm space-y-5 font-bengali">
                        {/* ভাউচার হেডার */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 border-emerald">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full border-2 border-gold bg-emerald text-gold-soft font-serif font-bold text-xl flex items-center justify-center">
                                    {INSTITUTION_INFO.crestLetterBng}
                                </div>
                                <div>
                                    <h3 className="font-serif text-lg font-bold text-emerald-deep">
                                        {INSTITUTION_INFO.nameEng}
                                    </h3>
                                    <p className="text-sm font-bold text-emerald">
                                        {INSTITUTION_INFO.nameBng} · {INSTITUTION_INFO.upazilaBng}, {INSTITUTION_INFO.districtBng}
                                    </p>
                                </div>
                            </div>

                            <div className="text-right font-mono text-xs">
                                <Badge variant="gold" size="md" mono>
                                    CASH VOUCHER · নগদ রসিদ
                                </Badge>
                                <p className="mt-1 font-bold text-emerald-deep">
                                    No: {activeVoucherRow.voucherNo}
                                </p>
                            </div>
                        </div>

                        {/* প্রাপক শিক্ষকের বিবরণ */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-paper-panel border border-ink-faint text-xs">
                            <div>
                                <span className="text-ink-muted block">প্রাপক শিক্ষকের নাম ও আইডি:</span>
                                <b className="text-sm text-emerald-deep">
                                    {activeVoucherRow.fullNameBng} ({activeVoucherRow.teacherCode})
                                </b>
                            </div>
                            <div>
                                <span className="text-ink-muted block">পদবী ও বায়োমেট্রিক পিন:</span>
                                <b className="text-ink">
                                    {activeVoucherRow.designationBng} (ZKTeco PIN #{activeVoucherRow.biometricDeviceId})
                                </b>
                            </div>
                            <div>
                                <span className="text-ink-muted block">বেতনের মাস ও বছর:</span>
                                <b className="text-emerald">
                                    {activeMonthObj.labelBng} {toBengaliDigits(selectedYear)}
                                </b>
                            </div>
                            <div>
                                <span className="text-ink-muted block">পরিশোধের মাধ্যম ও তারিখ:</span>
                                <b className="font-mono text-ink">
                                    {activeVoucherRow.paymentMethod} · {activeVoucherRow.paidAt || 'আজকের তারিখ'}
                                </b>
                            </div>
                        </div>

                        {/* বেতন ও কোটা ব্রেকডাউন ছক */}
                        <table className="w-full text-xs border-collapse border border-ink-faint">
                            <thead>
                                <tr className="bg-paper-deep text-emerald-deep">
                                    <th className="py-2 px-3 border border-ink-faint text-left">বিবরণ (Description)</th>
                                    <th className="py-2 px-3 border border-ink-faint text-center">হিসাবের সূত্র</th>
                                    <th className="py-2 px-3 border border-ink-faint text-right">টাকার পরিমাণ (BDT)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="py-2 px-3 border border-ink-faint font-semibold">মাসিক মূল বেতন (Basic Salary)</td>
                                    <td className="py-2 px-3 border border-ink-faint text-center">দৈনিক হার: {formatBDT(activeVoucherRow.perDaySalary, true)}</td>
                                    <td className="py-2 px-3 border border-ink-faint text-right font-bold">{formatBDT(activeVoucherRow.basicSalary, true)}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 px-3 border border-ink-faint">
                                        হাজিরা ও ২.০ ফ্রি কোটা হিসাব (Late: {toBengaliDigits(activeVoucherRow.lateCount)}, Leave: {toBengaliDigits(activeVoucherRow.leaveCount)}, Absent: {toBengaliDigits(activeVoucherRow.absentDays)})
                                    </td>
                                    <td className="py-2 px-3 border border-ink-faint text-center font-mono">
                                        Used: {activeVoucherRow.quotaUsed.toFixed(1)} / Free: {activeVoucherRow.allowedQuota.toFixed(1)}
                                    </td>
                                    <td className="py-2 px-3 border border-ink-faint text-right text-danger font-semibold">
                                        -{formatBDT(activeVoucherRow.totalDeduction, true)}
                                    </td>
                                </tr>
                                {activeVoucherRow.bonusAmount > 0 && (
                                    <tr>
                                        <td className="py-2 px-3 border border-ink-faint">উৎসব ভাতা / বিশেষ বোনাস</td>
                                        <td className="py-2 px-3 border border-ink-faint text-center">সংযোজন (+)</td>
                                        <td className="py-2 px-3 border border-ink-faint text-right text-success font-semibold">
                                            +{formatBDT(activeVoucherRow.bonusAmount, true)}
                                        </td>
                                    </tr>
                                )}
                                <tr className="bg-emerald-subtle/50 text-sm font-bold text-emerald-deep">
                                    <td colSpan={2} className="py-2.5 px-3 border border-ink-faint">
                                        সর্বমোট নিট পরিশোধিত ক্যাশ (Net Payable Cash)
                                    </td>
                                    <td className="py-2.5 px-3 border border-ink-faint text-right text-base">
                                        {formatBDT(activeVoucherRow.netPayable, true)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* স্বাক্ষর ব্লক */}
                        <div className="grid grid-cols-3 gap-4 pt-8 text-center text-xs text-ink-soft">
                            <div className="border-t border-ink-muted pt-1.5">প্রাপক শিক্ষকের স্বাক্ষর</div>
                            <div className="border-t border-ink-muted pt-1.5">হিসাবরক্ষক / ক্যাশিয়ার</div>
                            <div className="border-t border-ink-muted pt-1.5 font-bold text-emerald-deep">সুপারিনটেনডেন্ট</div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
