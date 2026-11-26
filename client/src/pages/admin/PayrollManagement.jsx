import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Download,
    FileSpreadsheet,
    Mail,
    Printer,
    RefreshCw,
    Send,
    Trash2,
    UserRound,
    Users,
    X,
    Zap
} from 'lucide-react';
import { INSTITUTION_INFO } from '@constants/app.constants';
import { useToast } from '@context/ToastContext';
import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';
import { formatBDT, getExactDaysInMonth } from '@utils/formatters';
import SalaryStatement from './SalaryStatement';

const MONTHS = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
];

const ADJUSTMENT_MODES = [
    { value: 'increase_flat', label: 'Increase ৳ (Flat)' },
    { value: 'decrease_flat', label: 'Decrease ৳ (Flat)' },
    { value: 'increase_pct', label: 'Increase %' },
    { value: 'decrease_pct', label: 'Decrease %' },
    { value: 'increase_days', label: 'Increase by days' },
    { value: 'decrease_days', label: 'Decrease by days' },
    { value: 'reset', label: 'Reset ↩' }
];

const formatNumber = (value) => (Number(value) || 0).toLocaleString('en-IN');

const formatPreparedOnDate = (date) => {
    const parsedDate = new Date(date);
    const validDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Dhaka'
    }).format(validDate);
};

const isWithinPayrollEditWindow = (generatedAt) => {
    if (!generatedAt) return false;
    const age = Date.now() - new Date(generatedAt).getTime();
    return Number.isFinite(age) && age >= 0 && age <= 30 * 24 * 60 * 60 * 1000;
};

const isPayrollMonthClosed = (month, year) => {
    const currentPeriod = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'numeric'
    }).formatToParts(new Date());
    const currentYear = Number(currentPeriod.find((part) => part.type === 'year')?.value);
    const currentMonth = Number(currentPeriod.find((part) => part.type === 'month')?.value);
    const selectedYear = Number(year);
    const selectedMonth = Number(month);

    return selectedYear < currentYear ||
        (selectedYear === currentYear && selectedMonth < currentMonth);
};

const normalizeSalaryRecord = (salary, month, year) => {
    const teacher = salary.teacherId && typeof salary.teacherId === 'object'
        ? salary.teacherId
        : {};
    const attendance = salary.attendanceBreakdown || {};
    const basicSalary = Number(salary.basicSalarySnapshot) || 0;
    const perDaySalary = Number(salary.perDaySalary) || 0;
    const daysDivisor = basicSalary > 0 && perDaySalary > 0
        ? Math.max(1, Math.round(basicSalary / perDaySalary))
        : getExactDaysInMonth(month, year);

    return {
        teacherId: String(teacher._id || salary.teacherId || ''),
        teacherCode: teacher.teacherCode || '',
        fullNameBng: teacher.fullNameBng || '',
        fullNameEng: teacher.fullNameEng || '',
        designationBng: teacher.designation || teacher.designationBng || '',
        designationEng: teacher.designationEng || '',
        basicSalary,
        originalBasicSalary: Number(salary.originalBasicSalarySnapshot ?? basicSalary) || 0,
        daysDivisor,
        activeDaysInMonth: salary.proRataInfo?.activeDaysInMonth == null
            ? daysDivisor
            : Number(salary.proRataInfo.activeDaysInMonth),
        isProRated: Boolean(salary.proRataInfo?.isProRated),
        deductibleDays: Number(
            salary.manualDeductibleDays ?? attendance.totalDeductibleDays
        ) || 0,
        totalDeductibleDays: Number(attendance.totalDeductibleDays) || 0,
        bonusAmount: Number(salary.bonusAmount) || 0,
        adjustmentAmount: Number(salary.customAdjustment?.amount) || 0,
        loanDeduction: Number(salary.loanDeduction?.installmentAmount) || 0,
        extraAllowance: Number(salary.extraAllowance) || 0,
        extraDeduction: Number(salary.extraDeduction) || 0,
        attendanceBreakdown: {
            totalLateCount: Number(attendance.totalLateCount) || 0,
            totalLeaveCount: Number(attendance.totalLeaveCount) || 0,
            totalApprovedLeaveCount: Number(attendance.totalApprovedLeaveCount) || 0,
            totalUnexcusedAbsentCount: Number(attendance.totalUnexcusedAbsentCount) || 0,
            totalQuotaUsed: Number(attendance.totalQuotaUsed) || 0,
            allowedPaidQuota: Number(attendance.allowedPaidQuota) || 0,
            carryForwardQuota: Number(attendance.carryForwardQuota) || 0,
            excessQuotaDays: Number(attendance.excessQuotaDays) || 0,
            directAbsentPenaltyDays: Number(attendance.directAbsentPenaltyDays) || 0,
            totalDeductibleDays: Number(attendance.totalDeductibleDays) || 0
        },
        generatedAt: salary.generatedAt || salary.createdAt || null
    };
};

const calculateRowAmounts = (row, daysInMonth, bonusEnabled) => {
    const basicSalary = Math.max(0, Number(row.basicSalary) || 0);
    const divisor = Number(row.daysDivisor) || daysInMonth;
    const deductibleDays = Math.max(0, Number(row.deductibleDays) || 0);
    const deduction = Math.round(deductibleDays * basicSalary / divisor);
    const effectiveBasic = row.isProRated
        ? Math.round((basicSalary / divisor) * Math.max(0, Number(row.activeDaysInMonth) || 0))
        : basicSalary;
    const bonus = bonusEnabled ? Math.max(0, Number(row.bonusAmount) || 0) : 0;
    const adjustment = Number(row.adjustmentAmount) || 0;
    const netPayable = Math.max(0, Math.round(
        effectiveBasic -
        deduction -
        (Number(row.loanDeduction) || 0) +
        bonus +
        adjustment +
        (Number(row.extraAllowance) || 0) -
        (Number(row.extraDeduction) || 0)
    ));

    return { deduction, bonus, adjustment, netPayable };
};

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function PayrollManagement() {
    const toast = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const currentYear = new Date().getFullYear();
    const requestIdRef = useRef(0);
    const attendanceDetailsRequestIdRef = useRef(0);
    const editVersionRef = useRef(0);

    const getInitialPeriod = useCallback(() => {
        const params = new URLSearchParams(location.search);
        const month = Number(params.get('month'));
        const year = Number(params.get('year'));
        return {
            month: month >= 1 && month <= 12
                ? String(month).padStart(2, '0')
                : String(new Date().getMonth() + 1).padStart(2, '0'),
            year: year >= 2020 && year <= 2100 ? String(year) : String(currentYear)
        };
    }, [location.search, currentYear]);

    const [period, setPeriod] = useState(getInitialPeriod);
    const [payrollRows, setPayrollRows] = useState([]);
    const [hasSavedSheet, setHasSavedSheet] = useState(false);
    const [hasDraftSheet, setHasDraftSheet] = useState(false);
    const [savedPayrollPeriods, setSavedPayrollPeriods] = useState([]);
    const [savedPeriodsLoading, setSavedPeriodsLoading] = useState(false);
    const [savedPeriodsError, setSavedPeriodsError] = useState('');
    const [sheetView, setSheetView] = useState('salary');
    const [attendanceDetailsEnabled, setAttendanceDetailsEnabled] = useState(false);
    const [attendanceDetails, setAttendanceDetails] = useState([]);
    const [attendanceDetailsLoading, setAttendanceDetailsLoading] = useState(false);
    const [attendanceDetailsError, setAttendanceDetailsError] = useState('');
    const [sheetGeneratedAt, setSheetGeneratedAt] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [bonusEnabled, setBonusEnabled] = useState(false);
    const [salaryEditUnlocked, setSalaryEditUnlocked] = useState(false);
    const [preparedOn, setPreparedOn] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [autoSaveBlocked, setAutoSaveBlocked] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [adjustmentTarget, setAdjustmentTarget] = useState(null);
    const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
    const [adjustmentMode, setAdjustmentMode] = useState('increase_flat');
    const [adjustmentValue, setAdjustmentValue] = useState('');
    const [bulkAdjustmentMode, setBulkAdjustmentMode] = useState('increase_flat');
    const [bulkAdjustmentValue, setBulkAdjustmentValue] = useState('');
    const [bulkAdjustmentStatus, setBulkAdjustmentStatus] = useState('');
    const [isSmsOpen, setIsSmsOpen] = useState(false);
    const [smsMode, setSmsMode] = useState(null);
    const [smsTargetIds, setSmsTargetIds] = useState([]);
    const [smsPreview, setSmsPreview] = useState(null);
    const [smsSelectedIds, setSmsSelectedIds] = useState([]);
    const [smsConfirmed, setSmsConfirmed] = useState(false);
    const [smsLoading, setSmsLoading] = useState(false);
    const [smsSending, setSmsSending] = useState(false);
    const [smsError, setSmsError] = useState('');
    const [smsBalance, setSmsBalance] = useState(null);
    const [smsBalanceError, setSmsBalanceError] = useState('');
    const [smsBalanceLoading, setSmsBalanceLoading] = useState(false);
    const [isEmailOpen, setIsEmailOpen] = useState(false);
    const [emailMode, setEmailMode] = useState(null);
    const [emailPreview, setEmailPreview] = useState(null);
    const [emailSelectedIds, setEmailSelectedIds] = useState([]);
    const [emailPreviewedId, setEmailPreviewedId] = useState('');
    const [emailConfirmed, setEmailConfirmed] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailSending, setEmailSending] = useState(false);
    const [emailError, setEmailError] = useState('');

    const selectedMonth = period.month;
    const selectedYear = period.year;
    const activeMonth = useMemo(
        () => MONTHS.find((month) => month.value === selectedMonth) || MONTHS[0],
        [selectedMonth]
    );
    const exactDaysInMonth = useMemo(
        () => getExactDaysInMonth(selectedMonth, selectedYear),
        [selectedMonth, selectedYear]
    );
    const selectedPeriodClosed = isPayrollMonthClosed(selectedMonth, selectedYear);
    const savedPeriodSelection = savedPayrollPeriods.some((savedPeriod) => (
        Number(savedPeriod.month) === Number(selectedMonth) &&
        Number(savedPeriod.year) === Number(selectedYear)
    )) ? `${selectedYear}-${selectedMonth}` : '';
    const isEditable = !isDeleting &&
        (hasDraftSheet || (hasSavedSheet && isWithinPayrollEditWindow(sheetGeneratedAt)));
    const yearOptions = useMemo(() => {
        const years = new Set(
            Array.from({ length: 6 }, (_, index) => String(currentYear - 3 + index))
        );
        years.add(selectedYear);
        return [...years].sort((a, b) => Number(b) - Number(a));
    }, [currentYear, selectedYear]);

    const loadPayrollSheet = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        attendanceDetailsRequestIdRef.current += 1;
        setAttendanceDetailsLoading(false);
        setIsLoading(true);
        setLoadError('');
        try {
            const response = await axiosClient.get('/payroll/sheets', {
                params: { month: Number(selectedMonth), year: Number(selectedYear) }
            });
            const salaries = response.data?.data?.salaries;
            if (!Array.isArray(salaries)) {
                throw new Error('সার্ভার থেকে বেতন শিট পাওয়া যায়নি।');
            }
            if (requestId !== requestIdRef.current) return;

            const normalizedRows = salaries.map((salary) => (
                normalizeSalaryRecord(salary, Number(selectedMonth), Number(selectedYear))
            ));
            setPayrollRows(normalizedRows);
            setHasSavedSheet(normalizedRows.length > 0);
            setHasDraftSheet(false);
            setAttendanceDetailsEnabled(false);
            setAttendanceDetails([]);
            setAttendanceDetailsError('');
            setSheetGeneratedAt(salaries[0]?.generatedAt || salaries[0]?.createdAt || null);
            setBonusEnabled(salaries.some((salary) => Boolean(salary.includeBonus)));
            setPreparedOn(
                salaries[0]?.preparedOn ||
                formatPreparedOnDate(salaries[0]?.generatedAt || salaries[0]?.createdAt || new Date())
            );
            setSalaryEditUnlocked(false);
            setIsDirty(false);
            setSaveError('');
            setAutoSaveBlocked(false);
            setLastSavedAt(null);
            editVersionRef.current = 0;
        } catch (error) {
            if (requestId !== requestIdRef.current) return;
            setPayrollRows([]);
            setHasSavedSheet(false);
            setHasDraftSheet(false);
            setAttendanceDetailsEnabled(false);
            setAttendanceDetails([]);
            setAttendanceDetailsError('');
            setSheetGeneratedAt(null);
            setLoadError(extractApiErrorMessage(error, 'বেতন শিট লোড করা যায়নি।'));
        } finally {
            if (requestId === requestIdRef.current) setIsLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    const loadSavedPayrollPeriods = useCallback(async () => {
        setSavedPeriodsLoading(true);
        setSavedPeriodsError('');
        try {
            const response = await axiosClient.get('/payroll/sheets/periods');
            const periods = response.data?.data?.periods;
            if (!Array.isArray(periods)) {
                throw new Error('সংরক্ষিত বেতন শিটের মাসগুলো পাওয়া যায়নি।');
            }
            setSavedPayrollPeriods(periods);
        } catch (error) {
            setSavedPeriodsError(
                extractApiErrorMessage(error, 'আগের সংরক্ষিত বেতন শিট লোড করা যায়নি।')
            );
        } finally {
            setSavedPeriodsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPayrollSheet();
    }, [loadPayrollSheet]);

    useEffect(() => {
        loadSavedPayrollPeriods();
    }, [loadSavedPayrollPeriods]);

    useEffect(() => {
        const nextPeriod = getInitialPeriod();
        if (nextPeriod.month !== period.month || nextPeriod.year !== period.year) {
            setPeriod(nextPeriod);
        }
    }, [getInitialPeriod]);

    const markEdited = useCallback(() => {
        editVersionRef.current += 1;
        setIsDirty(true);
        setSaveError('');
        setAutoSaveBlocked(false);
    }, []);

    const updatePayrollRow = useCallback((teacherId, patch) => {
        markEdited();
        setPayrollRows((currentRows) => currentRows.map((row) => (
            row.teacherId === teacherId ? { ...row, ...patch } : row
        )));
    }, [markEdited]);

    const persistPayrollSheet = useCallback(async ({ quiet = false } = {}) => {
        if (!hasSavedSheet) return false;
        if (isSaving) {
            if (!quiet) toast.error('একটি পরিবর্তন সংরক্ষণ হচ্ছে; শেষ হলে আবার চেষ্টা করুন।');
            return false;
        }

        const versionAtStart = editVersionRef.current;
        const payload = {
            month: Number(selectedMonth),
            year: Number(selectedYear),
            includeBonus: bonusEnabled,
            preparedOn,
            rows: payrollRows.map((row) => ({
                teacherId: row.teacherId,
                basicSalary: Number(row.basicSalary) || 0,
                deductibleDays: Number(row.deductibleDays) || 0,
                bonusAmount: Number(row.bonusAmount) || 0,
                adjustmentAmount: Number(row.adjustmentAmount) || 0
            }))
        };

        setIsSaving(true);
        try {
            await axiosClient.put('/payroll/sheets/edits', payload);
            setSaveError('');
            setAutoSaveBlocked(false);
            setLastSavedAt(new Date());
            if (editVersionRef.current === versionAtStart) setIsDirty(false);
            if (!quiet) toast.success('বেতন শিট ডাটাবেইসে সংরক্ষিত হয়েছে।');
            return true;
        } catch (error) {
            const message = extractApiErrorMessage(error, 'বেতন শিট সংরক্ষণ করা যায়নি।');
            setSaveError(message);
            setAutoSaveBlocked(true);
            if (!quiet) toast.error(message);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [
        hasSavedSheet,
        isSaving,
        selectedMonth,
        selectedYear,
        bonusEnabled,
        preparedOn,
        payrollRows,
        toast
    ]);

    useEffect(() => {
        if (!isDirty || !hasSavedSheet || !isEditable || isSaving || isDeleting || autoSaveBlocked) return undefined;
        const timeout = window.setTimeout(() => {
            persistPayrollSheet({ quiet: true });
        }, 850);
        return () => window.clearTimeout(timeout);
    }, [
        isDirty,
        hasSavedSheet,
        isEditable,
        isSaving,
        isDeleting,
        autoSaveBlocked,
        payrollRows,
        bonusEnabled,
        preparedOn,
        persistPayrollSheet
    ]);

    useEffect(() => {
        const warnBeforeUnload = (event) => {
            if (!isDirty && !hasDraftSheet) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warnBeforeUnload);
        return () => window.removeEventListener('beforeunload', warnBeforeUnload);
    }, [isDirty, hasDraftSheet]);

    const handleGeneratePayroll = async () => {
        if (!selectedPeriodClosed) {
            toast.error('বেতন শিট তৈরির আগে মাস সম্পূর্ণ শেষ হওয়া পর্যন্ত অপেক্ষা করুন।');
            return;
        }
        setIsGenerating(true);
        try {
            const response = await axiosClient.post('/payroll/generate', {
                month: Number(selectedMonth),
                year: Number(selectedYear),
                forceGenerateWithPending: false
            });
            const payrollRecords = response.data?.data?.payrollRecords;
            if (!Array.isArray(payrollRecords) || payrollRecords.length === 0) {
                throw new Error('বেতন খসড়ার তথ্য পাওয়া যায়নি।');
            }
            const draftRows = payrollRecords.map((salary) => (
                normalizeSalaryRecord(salary, Number(selectedMonth), Number(selectedYear))
            ));
            setPayrollRows(draftRows);
            setSheetView('salary');
            setAttendanceDetailsEnabled(false);
            setAttendanceDetails([]);
            setAttendanceDetailsError('');
            setHasSavedSheet(false);
            setHasDraftSheet(true);
            setSheetGeneratedAt(null);
            setBonusEnabled(payrollRecords.some((salary) => Boolean(salary.includeBonus)));
            setPreparedOn(formatPreparedOnDate(new Date()));
            setSalaryEditUnlocked(false);
            setIsDirty(false);
            setSaveError('');
            toast.success(`${activeMonth.label} ${selectedYear}-এর খসড়া তৈরি হয়েছে। দেখে নিয়ে Confirm করুন।`);
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'বেতন শিট তৈরি করা যায়নি।'));
        } finally {
            setIsGenerating(false);
        }
    };

    const confirmDraftPayroll = async () => {
        if (!hasDraftSheet || isConfirming) return;
        if (!selectedPeriodClosed) {
            toast.error('বেতন শিট সংরক্ষণের আগে মাস সম্পূর্ণ শেষ হওয়া পর্যন্ত অপেক্ষা করুন।');
            return;
        }
        if (!window.confirm(`${activeMonth.label} ${selectedYear}-এর বেতন শিট নিশ্চিত করে সংরক্ষণ করবেন?`)) return;

        setIsConfirming(true);
        try {
            await axiosClient.post('/payroll/confirm', {
                month: Number(selectedMonth),
                year: Number(selectedYear),
                includeBonus: bonusEnabled,
                preparedOn,
                rows: payrollRows.map((row) => ({
                    teacherId: row.teacherId,
                    basicSalary: Number(row.basicSalary) || 0,
                    deductibleDays: Number(row.deductibleDays) || 0,
                    bonusAmount: Number(row.bonusAmount) || 0,
                    adjustmentAmount: Number(row.adjustmentAmount) || 0
                }))
            });
            toast.success('বেতন শিট নিশ্চিত করে সংরক্ষণ করা হয়েছে। এখন থেকে পরিবর্তন অটো-সেভ হবে।');
            setHasDraftSheet(false);
            await loadPayrollSheet();
            await loadSavedPayrollPeriods();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'বেতন শিট নিশ্চিত করা যায়নি।'));
        } finally {
            setIsConfirming(false);
        }
    };

    const discardDraftPayroll = () => {
        if (!hasDraftSheet || isConfirming) return;
        if (!window.confirm(`${activeMonth.label} ${selectedYear}-এর অসংরক্ষিত বেতন খসড়াটি বাতিল করবেন?`)) return;
        setPayrollRows([]);
        setHasDraftSheet(false);
        setIsDirty(false);
        setSheetGeneratedAt(null);
        setBonusEnabled(false);
        setPreparedOn('');
        setSalaryEditUnlocked(false);
        setSheetView('salary');
    };

    const handleDeletePayrollSheet = async () => {
        if (!hasSavedSheet || isDeleting) return;
        if (isSaving) {
            toast.error('পরিবর্তন সংরক্ষণ শেষ হলে বেতন শিট মুছুন।');
            return;
        }
        const confirmed = window.confirm(
            `${activeMonth.label} ${selectedYear}-এর সম্পূর্ণ সংরক্ষিত বেতন শিট মুছে যাবে। ` +
            'হাজিরার তথ্য মুছবে না। সংরক্ষণ না হওয়া পরিবর্তনও হারাবে। চালিয়ে যাবেন?'
        );
        if (!confirmed) return;

        setIsDeleting(true);
        try {
            const response = await axiosClient.delete('/payroll/sheets', {
                data: {
                    month: Number(selectedMonth),
                    year: Number(selectedYear)
                }
            });
            toast.success(response.data?.message || 'বেতন শিট মুছে ফেলা হয়েছে।');
            setIsDirty(false);
            setSaveError('');
            setAutoSaveBlocked(false);
            setSheetView('salary');
            await loadPayrollSheet();
            await loadSavedPayrollPeriods();
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'বেতন শিট মুছে ফেলা যায়নি।'));
        } finally {
            setIsDeleting(false);
        }
    };

    const changePeriod = async (nextPeriod) => {
        if (nextPeriod.month === selectedMonth && nextPeriod.year === selectedYear) return;
        if (hasDraftSheet && !window.confirm('এই খসড়াটি এখনো নিশ্চিত করা হয়নি। মাস বদলালে খসড়াটি বাদ যাবে। চালিয়ে যাবেন?')) return;
        if (isDirty && hasSavedSheet && !(await persistPayrollSheet({ quiet: false }))) return;
        if (hasDraftSheet) {
            setPayrollRows([]);
            setHasDraftSheet(false);
            setIsDirty(false);
        }
        setSheetView('salary');
        setAttendanceDetailsEnabled(false);
        setPeriod(nextPeriod);
    };

    const displayRows = useMemo(() => payrollRows.map((row) => ({
        ...row,
        amounts: calculateRowAmounts(row, exactDaysInMonth, bonusEnabled)
    })), [payrollRows, exactDaysInMonth, bonusEnabled]);

    const totals = useMemo(() => displayRows.reduce((result, row) => {
        result.basicSalary += Number(row.basicSalary) || 0;
        result.deduction += row.amounts.deduction;
        result.bonus += row.amounts.bonus;
        if (row.amounts.adjustment > 0) result.adjustmentPlus += row.amounts.adjustment;
        if (row.amounts.adjustment < 0) result.adjustmentMinus += row.amounts.adjustment;
        result.netPayable += row.amounts.netPayable;
        return result;
    }, {
        basicSalary: 0,
        deduction: 0,
        bonus: 0,
        adjustmentPlus: 0,
        adjustmentMinus: 0,
        netPayable: 0
    }), [displayRows]);

    const calculateAdjustedAmount = (row, mode, value) => {
        const basicSalary = Math.max(0, Number(row.basicSalary) || 0);
        const currentAdjustment = Number(row.adjustmentAmount) || 0;
        if (mode === 'reset') return 0;

        const effectiveSalary = Math.max(0, basicSalary + currentAdjustment);
        const divisor = Number(row.daysDivisor) || exactDaysInMonth;
        let nextEffectiveSalary = effectiveSalary;
        switch (mode) {
            case 'increase_flat':
                nextEffectiveSalary = effectiveSalary + Math.round(value);
                break;
            case 'decrease_flat':
                nextEffectiveSalary = Math.max(0, effectiveSalary - Math.round(value));
                break;
            case 'increase_pct':
                nextEffectiveSalary = Math.round(effectiveSalary * (1 + value / 100));
                break;
            case 'decrease_pct':
                nextEffectiveSalary = Math.max(0, Math.round(effectiveSalary * (1 - value / 100)));
                break;
            case 'increase_days':
                nextEffectiveSalary = effectiveSalary + Math.round((effectiveSalary / divisor) * value);
                break;
            case 'decrease_days':
                nextEffectiveSalary = Math.max(0, effectiveSalary - Math.round((effectiveSalary / divisor) * value));
                break;
            default:
                return currentAdjustment;
        }
        return Math.round(nextEffectiveSalary - basicSalary);
    };

    const openAdjustment = (row) => {
        if (!isEditable) return;
        setAdjustmentTarget(row);
        setIsAdjustmentOpen(true);
        setAdjustmentMode('increase_flat');
        setAdjustmentValue('');
    };

    const applyAdjustment = () => {
        const value = Number(adjustmentValue);
        if (
            adjustmentMode !== 'reset' &&
            (adjustmentValue.trim() === '' || !Number.isFinite(value) || value < 0)
        ) {
            toast.error('অনুগ্রহ করে একটি সঠিক সমন্বয়ের মান দিন।');
            return;
        }
        if (adjustmentMode.endsWith('_days') && value > 3) {
            toast.error('দিনের সমন্বয় সর্বোচ্চ ৩ দিন পর্যন্ত করা যাবে।');
            return;
        }

        setPayrollRows((currentRows) => currentRows.map((row) => (
            row.teacherId === adjustmentTarget?.teacherId
                ? { ...row, adjustmentAmount: calculateAdjustedAmount(row, adjustmentMode, value) }
                : row
        )));
        markEdited();
        setAdjustmentTarget(null);
        setIsAdjustmentOpen(false);
    };

    const applyBulkAdjustment = () => {
        const value = Number(bulkAdjustmentValue);
        if (
            bulkAdjustmentMode !== 'reset' &&
            (bulkAdjustmentValue.trim() === '' || !Number.isFinite(value) || value < 0)
        ) {
            toast.error('অনুগ্রহ করে একটি সঠিক মান দিন।');
            return;
        }
        if (bulkAdjustmentMode.endsWith('_days') && value > 3) {
            toast.error('দিনের সমন্বয় সর্বোচ্চ ৩ দিন পর্যন্ত করা যাবে।');
            return;
        }
        setPayrollRows((currentRows) => currentRows.map((row) => ({
            ...row,
            adjustmentAmount: calculateAdjustedAmount(row, bulkAdjustmentMode, value)
        })));
        markEdited();
        setBulkAdjustmentStatus(bulkAdjustmentMode === 'reset' ? '↩ Reset!' : '✓ Applied!');
        window.setTimeout(() => setBulkAdjustmentStatus(''), 2000);
    };

    const restoreBulkAdjustment = () => {
        setPayrollRows((currentRows) => currentRows.map((row) => ({ ...row, adjustmentAmount: 0 })));
        markEdited();
        setBulkAdjustmentStatus('↩ Restored!');
        window.setTimeout(() => setBulkAdjustmentStatus(''), 2000);
    };

    const toggleBonus = () => {
        const turningOn = !bonusEnabled;
        if (turningOn) {
            setPayrollRows((currentRows) => currentRows.map((row) => ({
                ...row,
                bonusAmount: Number(row.bonusAmount) > 0
                    ? row.bonusAmount
                    : Math.round((Number(row.basicSalary) || 0) / 2)
            })));
        }
        setBonusEnabled(turningOn);
        markEdited();
    };

    const resetData = () => {
        if (!window.confirm('Reset all edits and restore the saved salary data?')) return;
        setPayrollRows((currentRows) => currentRows.map((row) => ({
            ...row,
            basicSalary: row.originalBasicSalary,
            deductibleDays: row.totalDeductibleDays,
            bonusAmount: 0,
            adjustmentAmount: 0
        })));
        setBonusEnabled(false);
        setPreparedOn('');
        markEdited();
    };

    const handlePrint = async () => {
        if (
            sheetView === 'attendance' &&
            attendanceDetailsEnabled &&
            (attendanceDetailsLoading || attendanceDetailsError)
        ) return;
        if (isDirty && hasSavedSheet && !(await persistPayrollSheet({ quiet: false }))) return;
        const pageStyle = document.createElement('style');
        pageStyle.textContent = sheetView === 'attendance'
            ? '@page { size: A4 portrait; margin: 10mm 15mm; }'
            : '@page { size: A4 portrait; margin-top: 47.2mm; margin-right: 15mm; margin-bottom: 23mm; margin-left: 15mm; }';
        document.head.appendChild(pageStyle);
        try {
            window.print();
        } finally {
            pageStyle.remove();
        }
    };

    const loadAttendanceDetails = async () => {
        const requestId = ++attendanceDetailsRequestIdRef.current;
        setAttendanceDetailsLoading(true);
        setAttendanceDetailsError('');
        try {
            const response = await axiosClient.post('/payroll/attendance-details', {
                month: Number(selectedMonth),
                year: Number(selectedYear),
                teacherIds: payrollRows.map((row) => row.teacherId)
            });
            if (requestId !== attendanceDetailsRequestIdRef.current) return;
            const teachers = response.data?.data?.teachers;
            if (!Array.isArray(teachers)) {
                throw new Error('শিক্ষকভিত্তিক হাজিরার বিস্তারিত পাওয়া যায়নি।');
            }
            setAttendanceDetails(teachers);
        } catch (error) {
            if (requestId !== attendanceDetailsRequestIdRef.current) return;
            setAttendanceDetails([]);
            setAttendanceDetailsError(
                extractApiErrorMessage(error, 'হাজিরার বিস্তারিত লোড করা যায়নি।')
            );
        } finally {
            if (requestId === attendanceDetailsRequestIdRef.current) {
                setAttendanceDetailsLoading(false);
            }
        }
    };

    const toggleAttendanceDetails = () => {
        if (attendanceDetailsEnabled) {
            attendanceDetailsRequestIdRef.current += 1;
            setAttendanceDetailsLoading(false);
            setAttendanceDetailsEnabled(false);
            return;
        }
        setAttendanceDetailsEnabled(true);
        loadAttendanceDetails();
    };

    const openAttendanceSheet = () => {
        setSheetView('attendance');
        if (!attendanceDetailsEnabled || attendanceDetailsError) {
            setAttendanceDetailsEnabled(true);
            loadAttendanceDetails();
        }
    };

    const requestSmsBalance = async () => {
        setSmsBalanceLoading(true);
        setSmsBalanceError('');
        try {
            const response = await axiosClient.get('/payroll/sms/balance');
            setSmsBalance(response.data?.data?.balance ?? null);
        } catch (error) {
            setSmsBalance(null);
            setSmsBalanceError(extractApiErrorMessage(error, 'SMS ব্যালেন্স পাওয়া যায়নি।'));
        } finally {
            setSmsBalanceLoading(false);
        }
    };

    const openSmsDialog = async () => {
        if (isDirty && !(await persistPayrollSheet({ quiet: false }))) return;
        setSmsMode(null);
        setSmsTargetIds(payrollRows.map((row) => row.teacherId));
        setSmsPreview(null);
        setSmsSelectedIds([]);
        setSmsConfirmed(false);
        setSmsError('');
        setIsSmsOpen(true);
        requestSmsBalance();
    };

    const loadSmsPreview = async (teacherIds) => {
        setSmsTargetIds(teacherIds);
        setSmsPreview(null);
        setSmsSelectedIds([]);
        setSmsConfirmed(false);
        setSmsError('');
        setSmsLoading(true);
        try {
            const response = await axiosClient.post('/payroll/sms/preview', {
                month: Number(selectedMonth),
                year: Number(selectedYear),
                teacherIds
            });
            const preview = response.data?.data;
            if (!Array.isArray(preview?.messages)) {
                throw new Error('SMS preview data পাওয়া যায়নি।');
            }
            setSmsPreview(preview);
            setSmsSelectedIds(preview.messages.map((message) => message.teacherId));
            return preview;
        } catch (error) {
            setSmsError(extractApiErrorMessage(error, 'SMS প্রিভিউ তৈরি করা যায়নি।'));
            return null;
        } finally {
            setSmsLoading(false);
        }
    };

    const selectSmsOperation = (mode) => {
        setSmsMode(mode);
        setSmsError('');
        if (mode === 'bulk') {
            loadSmsPreview(payrollRows.map((row) => row.teacherId));
        } else {
            setSmsPreview(null);
            setSmsSelectedIds([]);
        }
    };

    const sendSms = async () => {
        const selectedIds = smsSelectedIds.filter((id) => (
            smsPreview?.messages?.some((message) => message.teacherId === id)
        ));
        if (!smsConfirmed || selectedIds.length === 0) return;

        setSmsSending(true);
        setSmsError('');
        try {
            const response = await axiosClient.post('/payroll/sms/send', {
                month: Number(selectedMonth),
                year: Number(selectedYear),
                teacherIds: selectedIds
            });
            const sentCount = response.data?.data?.sentCount || selectedIds.length;
            const skippedCount = response.data?.data?.skippedNoPhoneCount || 0;
            toast.success(`${sentCount}টি SMS gateway গ্রহণ করেছে${skippedCount ? `; ${skippedCount}টি নম্বরে ফোন নেই` : ''}।`);
            setIsSmsOpen(false);
        } catch (error) {
            setSmsError(extractApiErrorMessage(error, 'SMS পাঠানো যায়নি।'));
        } finally {
            setSmsSending(false);
        }
    };

    const downloadSmsCsv = async () => {
        const preview = smsPreview && smsTargetIds.length === payrollRows.length
            ? smsPreview
            : await loadSmsPreview(payrollRows.map((row) => row.teacherId));
        const messages = preview?.messages || [];
        if (!messages.length) return;

        const csvRows = [
            ['Teacher', 'Teacher ID', 'Phone', 'Message'],
            ...messages.map((message) => [
                message.teacherName,
                message.teacherCode,
                message.phone,
                message.message
            ])
        ];
        const csv = `\uFEFF${csvRows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Salary_SMS_${selectedMonth}_${selectedYear}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const toggleSmsRecipient = (teacherId) => {
        setSmsSelectedIds((currentIds) => (
            currentIds.includes(teacherId)
                ? currentIds.filter((id) => id !== teacherId)
                : [...currentIds, teacherId]
        ));
        setSmsConfirmed(false);
    };

    const openEmailDialog = async () => {
        if (isDirty && !(await persistPayrollSheet({ quiet: false }))) return;
        setEmailMode(null);
        setEmailPreview(null);
        setEmailSelectedIds([]);
        setEmailPreviewedId('');
        setEmailConfirmed(false);
        setEmailError('');
        setIsEmailOpen(true);
    };

    const loadEmailPreview = async (teacherIds) => {
        setEmailPreview(null);
        setEmailSelectedIds([]);
        setEmailPreviewedId('');
        setEmailConfirmed(false);
        setEmailError('');
        setEmailLoading(true);
        try {
            const response = await axiosClient.post('/payroll/email/preview', {
                month: Number(selectedMonth),
                year: Number(selectedYear),
                teacherIds
            });
            const preview = response.data?.data;
            if (!Array.isArray(preview?.messages)) {
                throw new Error('ইমেইল প্রিভিউ ডাটা পাওয়া যায়নি।');
            }
            setEmailPreview(preview);
            setEmailSelectedIds(preview.messages.map((message) => message.teacherId));
            setEmailPreviewedId(preview.messages[0]?.teacherId || '');
            return preview;
        } catch (error) {
            setEmailError(extractApiErrorMessage(error, 'ইমেইল প্রিভিউ তৈরি করা যায়নি।'));
            return null;
        } finally {
            setEmailLoading(false);
        }
    };

    const selectEmailOperation = (mode) => {
        setEmailMode(mode);
        setEmailError('');
        if (mode === 'bulk') {
            loadEmailPreview(payrollRows.map((row) => row.teacherId));
        } else {
            setEmailPreview(null);
            setEmailSelectedIds([]);
            setEmailPreviewedId('');
        }
    };

    const sendEmail = async () => {
        const selectedIds = emailSelectedIds.filter((id) => (
            emailPreview?.messages?.some((message) => message.teacherId === id)
        ));
        if (!emailConfirmed || selectedIds.length === 0) return;

        setEmailSending(true);
        setEmailError('');
        try {
            const response = await axiosClient.post('/payroll/email/send', {
                month: Number(selectedMonth),
                year: Number(selectedYear),
                teacherIds: selectedIds
            });
            const acceptedCount = Number(response.data?.data?.acceptedCount) || 0;
            const failedRecipients = response.data?.data?.failedRecipients || [];
            const failedCount = Number(response.data?.data?.failedCount) || 0;
            const skippedCount = Number(response.data?.data?.skippedNoEmailCount) || 0;
            if (failedCount === 0) {
                toast.success(`${acceptedCount}টি ইমেইল SMTP সার্ভার গ্রহণ করেছে${skippedCount ? `; ${skippedCount}টি ঠিকানায় ইমেইল নেই` : ''}।`);
                setIsEmailOpen(false);
            } else {
                setEmailSelectedIds(failedRecipients.map((recipient) => recipient.teacherId));
                setEmailConfirmed(false);
                const failureDetails = failedRecipients
                    .slice(0, 3)
                    .map((recipient) => `${recipient.teacherName}: ${recipient.reason}`)
                    .join('\n');
                setEmailError(`${acceptedCount}টি ইমেইল গ্রহণ হয়েছে, ${failedCount}টি ব্যর্থ।${failureDetails ? `\n${failureDetails}` : ''}`);
                toast.error(`${acceptedCount}টি ইমেইল গ্রহণ হয়েছে, ${failedCount}টি ব্যর্থ। ${failedRecipients[0]?.reason || 'SMTP configuration যাচাই করুন।'}`);
            }
        } catch (error) {
            const message = extractApiErrorMessage(error, 'ইমেইল পাঠানো যায়নি।');
            setEmailError(message);
            toast.error(message);
        } finally {
            setEmailSending(false);
        }
    };

    const toggleEmailRecipient = (teacherId) => {
        setEmailSelectedIds((currentIds) => (
            currentIds.includes(teacherId)
                ? currentIds.filter((id) => id !== teacherId)
                : [...currentIds, teacherId]
        ));
        setEmailConfirmed(false);
    };

    const selectedSmsMessages = (smsPreview?.messages || []).filter((message) => (
        smsSelectedIds.includes(message.teacherId)
    ));
    const showAdjustments = payrollRows.some((row) => Number(row.adjustmentAmount) !== 0);
    const smsMessages = smsPreview?.messages || [];
    const emailMessages = emailPreview?.messages || [];
    const selectedEmailMessages = emailMessages.filter((message) => (
        emailSelectedIds.includes(message.teacherId)
    ));
    const emailPreviewedMessage = emailMessages.find((message) => (
        message.teacherId === emailPreviewedId
    )) || emailMessages[0];

    return (
        <div className="salary-page">
            {isLoading ? (
                <div className="salary-loading no-print" aria-label="বেতন শিট লোড হচ্ছে">
                    <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
                    {[1, 2, 3, 4].map((item) => <div key={item} className="h-12 animate-pulse rounded bg-gray-200" />)}
                </div>
            ) : hasSavedSheet || hasDraftSheet ? (
                <>
                    <div className="mx-auto mt-6 mb-4 max-w-6xl px-4 no-print">
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
                            <div className="flex flex-col gap-5 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200/30 bg-amber-300/10 text-amber-200 shadow-inner">
                                        <FileSpreadsheet size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200">
                                            Monthly Payroll Workspace
                                        </p>
                                        <h2 className="mt-1 text-lg font-bold sm:text-xl">বেতন শিট পরিচালনা</h2>
                                        <p className="mt-0.5 text-xs text-emerald-100/75">
                                            {activeMonth.label} {selectedYear} · {selectedPeriodClosed ? 'মাস সম্পূর্ণ' : 'মাস চলমান'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                    <div className="min-w-0 sm:w-56">
                                        <label htmlFor="saved-payroll-period" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-emerald-100/80">
                                            আগের সংরক্ষিত শিট
                                        </label>
                                        <select
                                            id="saved-payroll-period"
                                            value={savedPeriodSelection}
                                            disabled={savedPeriodsLoading || savedPayrollPeriods.length === 0}
                                            onChange={(event) => {
                                                const [year, month] = event.target.value.split('-');
                                                if (year && month) changePeriod({ year, month });
                                            }}
                                            className="min-h-11 w-full rounded-xl border border-white/20 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/40 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            <option value="">
                                                {savedPeriodsLoading
                                                    ? 'সেভ করা শিট লোড হচ্ছে…'
                                                    : savedPayrollPeriods.length > 0
                                                        ? 'মাস নির্বাচন করুন'
                                                        : 'কোনো সেভ করা শিট নেই'}
                                            </option>
                                            {savedPayrollPeriods.map((savedPeriod) => {
                                                const monthValue = String(savedPeriod.month).padStart(2, '0');
                                                const monthLabel = MONTHS.find((month) => month.value === monthValue)?.label || monthValue;
                                                return (
                                                    <option
                                                        key={`${savedPeriod.year}-${monthValue}`}
                                                        value={`${savedPeriod.year}-${monthValue}`}
                                                    >
                                                        {monthLabel} {savedPeriod.year} · {savedPeriod.salaryCount} জন
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {savedPeriodsError && (
                                            <p className="mt-1 text-[11px] font-medium text-red-200" role="alert">
                                                {savedPeriodsError}
                                            </p>
                                        )}
                                    </div>

                                    <div className="inline-flex w-full rounded-xl border border-white/10 bg-black/10 p-1 sm:w-auto" role="group" aria-label="শিট নির্বাচন">
                                        <button
                                            type="button"
                                            aria-pressed={sheetView === 'salary'}
                                            onClick={() => setSheetView('salary')}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition sm:flex-none ${
                                                sheetView === 'salary'
                                                    ? 'bg-white text-emerald-950 shadow-md'
                                                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            <FileSpreadsheet size={16} />
                                            Salary Sheet
                                        </button>
                                        <button
                                            type="button"
                                            aria-pressed={sheetView === 'attendance'}
                                            onClick={openAttendanceSheet}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition sm:flex-none ${
                                                sheetView === 'attendance'
                                                    ? 'bg-white text-emerald-950 shadow-md'
                                                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            <Users size={16} />
                                            Absent Sheet
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 p-4 sm:p-5">
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handlePrint}
                                            disabled={
                                                sheetView === 'attendance' &&
                                                attendanceDetailsEnabled &&
                                                (attendanceDetailsLoading || Boolean(attendanceDetailsError))
                                            }
                                            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Printer size={18} />
                                            Print Sheet
                                        </button>

                                        {hasSavedSheet && sheetView === 'salary' && (
                                            <button
                                                type="button"
                                                onClick={openSmsDialog}
                                                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-800 transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-100"
                                            >
                                                <Send size={17} />
                                                SMS পাঠান
                                            </button>
                                        )}
                                        {hasSavedSheet && sheetView === 'salary' && (
                                            <button
                                                type="button"
                                                onClick={openEmailDialog}
                                                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-800 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-100"
                                            >
                                                <Mail size={17} />
                                                ইমেইল পে-স্লিপ
                                            </button>
                                        )}
                                    </div>

                                    {sheetView === 'salary' && (
                                        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-200/80">
                                            <label className={`flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                                salaryEditUnlocked
                                                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                            }`}>
                                                <input
                                                    type="checkbox"
                                                    id="edit-toggle"
                                                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                                                    checked={salaryEditUnlocked}
                                                    disabled={!isEditable}
                                                    onChange={(event) => setSalaryEditUnlocked(event.target.checked)}
                                                />
                                                <span>{salaryEditUnlocked ? 'সম্পাদনা চালু' : 'সম্পাদনা লক'}</span>
                                            </label>

                                            <button
                                                id="bonus-toggle-btn"
                                                type="button"
                                                onClick={toggleBonus}
                                                disabled={!isEditable}
                                                className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                                    bonusEnabled
                                                        ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-800'
                                                }`}
                                            >
                                                <Zap size={16} />
                                                বোনাস {bonusEnabled ? 'চালু' : 'বন্ধ'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={resetData}
                                                disabled={!isEditable}
                                                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <RefreshCw size={15} />
                                                Reset
                                            </button>

                                            {hasSavedSheet && (
                                                <button
                                                    type="button"
                                                    onClick={handleDeletePayrollSheet}
                                                    disabled={isDeleting || isSaving}
                                                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Trash2 size={16} />
                                                    {isDeleting ? 'মুছছে…' : 'শিট মুছুন'}
                                                </button>
                                            )}

                                            {hasSavedSheet && (
                                                <span
                                                    id="save-status"
                                                    role="status"
                                                    className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
                                                        saveError
                                                            ? 'bg-red-100 text-red-800'
                                                            : isDirty || isSaving
                                                                ? 'bg-amber-100 text-amber-900'
                                                                : 'bg-emerald-100 text-emerald-800'
                                                    }`}
                                                >
                                                    <span className={`h-2 w-2 rounded-full ${
                                                        saveError ? 'bg-red-500' : isDirty || isSaving ? 'bg-amber-500' : 'bg-emerald-500'
                                                    }`} />
                                                    {saveError ? 'সংরক্ষণ ব্যর্থ' : isSaving || isDirty ? 'সংরক্ষণ হচ্ছে' : 'অটো-সেভ হয়েছে'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {hasDraftSheet && (
                                    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                                                <FileSpreadsheet size={16} />
                                            </span>
                                            <div>
                                                <p className="text-sm font-bold text-amber-950">এটি এখনো অসংরক্ষিত খসড়া</p>
                                                <p className="mt-0.5 text-xs text-amber-900/75">
                                                    যাচাই করে সংরক্ষণ করুন, অথবা খসড়াটি বাতিল করুন।
                                                    {!selectedPeriodClosed && ' মাস শেষ হলে সংরক্ষণ করা যাবে।'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 sm:justify-end">
                                            <button
                                                type="button"
                                                onClick={discardDraftPayroll}
                                                disabled={isConfirming}
                                                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <Trash2 size={15} />
                                                খসড়া বাতিল
                                            </button>
                                            <button
                                                type="button"
                                                onClick={confirmDraftPayroll}
                                                disabled={isConfirming || !selectedPeriodClosed}
                                                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <FileSpreadsheet size={15} />
                                                {isConfirming ? 'Confirm হচ্ছে…' : 'Confirm & Save'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {sheetView === 'salary' && (
                    <div className="max-w-4xl mx-auto px-4 no-print">
                        <div id="adj-panel">
                            <label><Zap size={15} className="inline -mt-0.5" /> Bulk Salary Adjust:</label>
                            <select
                                id="adj-mode"
                                value={bulkAdjustmentMode}
                                disabled={!isEditable}
                                onChange={(event) => setBulkAdjustmentMode(event.target.value)}
                            >
                                {ADJUSTMENT_MODES.map((mode) => (
                                    <option key={mode.value} value={mode.value}>{mode.label}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                id="adj-value"
                                placeholder="Amount"
                                min="0"
                                max={bulkAdjustmentMode.endsWith('_days') ? 3 : undefined}
                                step={bulkAdjustmentMode.endsWith('_days') ? 0.5 : 1}
                                style={{ width: 110 }}
                                value={bulkAdjustmentValue}
                                disabled={!isEditable || bulkAdjustmentMode === 'reset'}
                                onChange={(event) => setBulkAdjustmentValue(event.target.value)}
                            />
                            <button id="adj-btn" type="button" disabled={!isEditable} onClick={applyBulkAdjustment}>
                                Apply to All
                            </button>
                            <div className="adj-divider" />
                            <button id="adj-reset-btn" type="button" disabled={!isEditable} onClick={restoreBulkAdjustment}>
                                ↩ Restore DB
                            </button>
                            <span id="adj-status" className={bulkAdjustmentStatus ? 'is-visible' : ''}>
                                {bulkAdjustmentStatus}
                            </span>
                            {!isEditable && (
                                <span className="text-xs text-gray-500">The 30-day edit window has expired.</span>
                            )}
                        </div>
                    </div>
                    )}

                    <SalaryStatement
                        rows={displayRows}
                        month={selectedMonth}
                        year={selectedYear}
                        monthOptions={MONTHS}
                        yearOptions={yearOptions}
                        institution={INSTITUTION_INFO}
                        bonusEnabled={bonusEnabled}
                        onMonthChange={(month) => changePeriod({ ...period, month })}
                        onYearChange={(year) => changePeriod({ ...period, year })}
                        salaryEditUnlocked={salaryEditUnlocked}
                        isEditable={isEditable}
                        preparedOn={preparedOn}
                        onPreparedOnChange={(value) => {
                            setPreparedOn(value);
                            markEdited();
                        }}
                        onUpdateRow={updatePayrollRow}
                        onAdjustRow={openAdjustment}
                        showAdjustments={showAdjustments}
                        totals={totals}
                        viewMode={sheetView}
                        attendanceDetailsEnabled={attendanceDetailsEnabled}
                        attendanceDetails={attendanceDetails}
                        attendanceDetailsLoading={attendanceDetailsLoading}
                        attendanceDetailsError={attendanceDetailsError}
                        onToggleAttendanceDetails={toggleAttendanceDetails}
                        onRetryAttendanceDetails={loadAttendanceDetails}
                    />
                </>
            ) : (
                <div className="max-w-4xl mx-auto mt-8 px-4 no-print">
                    {loadError && (
                        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            {loadError}
                        </div>
                    )}
                    <div className="salary-period-row mb-6">
                        <div>
                            Month:{' '}
                            <select
                                id="month-input"
                                className="inline-input"
                                value={selectedMonth}
                                onChange={(event) => changePeriod({ ...period, month: event.target.value })}
                            >
                                {MONTHS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            Year:{' '}
                            <select
                                id="year-input"
                                className="inline-input"
                                value={selectedYear}
                                onChange={(event) => changePeriod({ ...period, year: event.target.value })}
                            >
                                {yearOptions.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <section className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                        <FileSpreadsheet className="mx-auto h-10 w-10 text-indigo-600" />
                        <h2 className="mt-4 text-xl font-bold text-gray-900">No salary sheet for {activeMonth.label} {selectedYear}</h2>
                        <p className="mt-2 text-sm text-gray-600">Generate and save this month’s salary sheet once.</p>
                        {!selectedPeriodClosed && (
                            <p className="mt-2 text-sm font-medium text-amber-700">
                                মাস সম্পূর্ণ শেষ হওয়ার পর বেতন শিট তৈরি করা যাবে।
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={handleGeneratePayroll}
                            disabled={isGenerating || isDeleting || !selectedPeriodClosed || Boolean(loadError)}
                            className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isGenerating ? 'Generating…' : 'Generate Salary Sheet'}
                        </button>
                    </section>
                </div>
            )}

            {isAdjustmentOpen && adjustmentTarget && (
                <div id="single-adjust-modal" className="no-print open">
                    <div id="single-adjust-box">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 id="single-adjust-name" className="text-base font-bold text-gray-800">
                                    {adjustmentTarget.fullNameEng || adjustmentTarget.fullNameBng}
                                </h3>
                                <p id="single-adjust-current" className="text-xs text-gray-500 mt-1">
                                    বর্তমান Adjust:{' '}
                                    {adjustmentTarget.adjustmentAmount
                                        ? `${adjustmentTarget.adjustmentAmount > 0 ? '+' : ''}${formatNumber(adjustmentTarget.adjustmentAmount)}`
                                        : 'নেই'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAdjustmentOpen(false)}
                                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                                aria-label="Close adjustment dialog"
                            >
                                &times;
                            </button>
                        </div>

                        <label htmlFor="single-adj-mode">Adjust মোড</label>
                        <select
                            id="single-adj-mode"
                            value={adjustmentMode}
                            onChange={(event) => setAdjustmentMode(event.target.value)}
                        >
                            {ADJUSTMENT_MODES.map((mode) => (
                                <option key={mode.value} value={mode.value}>{mode.label}</option>
                            ))}
                        </select>
                        <label htmlFor="single-adj-value">পরিমাণ</label>
                        <input
                            type="number"
                            id="single-adj-value"
                            placeholder="যেমন: 5 অথবা 500"
                            min="0"
                            max={adjustmentMode.endsWith('_days') ? 3 : undefined}
                            step={adjustmentMode.endsWith('_days') ? 0.5 : 1}
                            value={adjustmentValue}
                            disabled={adjustmentMode === 'reset'}
                            onChange={(event) => setAdjustmentValue(event.target.value)}
                        />
                        <div className="flex gap-2 mt-2">
                            <button
                                type="button"
                                onClick={applyAdjustment}
                                className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded hover:bg-indigo-700 transition"
                            >
                                Apply
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsAdjustmentOpen(false)}
                                className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded hover:bg-gray-200 transition"
                            >
                                বাতিল
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isSmsOpen && (
                <div
                    id="ai-sms-modal"
                    className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print"
                >
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 flex justify-between items-center text-white">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                                    <Zap className="h-6 w-6 text-yellow-300" />
                                    AI SMS Control Center
                                </h2>
                                <p className="text-indigo-100 text-sm mt-1">Smart, Dynamic &amp; Automated Notification</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSmsOpen(false)}
                                className="text-white hover:bg-white/20 p-2 rounded-full transition outline-none"
                                aria-label="Close SMS panel"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-50">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Staff</p>
                                    <p className="text-2xl font-black text-gray-800">{payrollRows.length}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Net Payable</p>
                                    <p className="text-xl sm:text-2xl font-black text-gray-800">{formatBDT(totals.netPayable, true)}</p>
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center col-span-2 sm:col-span-1 flex flex-col justify-center items-center">
                                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-2">API Balance</p>
                                    <button
                                        type="button"
                                        onClick={requestSmsBalance}
                                        disabled={smsBalanceLoading}
                                        className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-indigo-700 transition shadow-md flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} className={smsBalanceLoading ? 'animate-spin' : ''} />
                                        {smsBalanceLoading ? 'Checking…' : smsBalance === null ? 'Check Now' : formatNumber(smsBalance)}
                                    </button>
                                    {smsBalanceError && <p className="mt-2 text-xs text-red-700">{smsBalanceError}</p>}
                                </div>
                            </div>

                            {smsError && (
                                <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {smsError}
                                </p>
                            )}

                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
                                ⚡ Select Operation
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                <button
                                    type="button"
                                    onClick={() => selectSmsOperation('bulk')}
                                    className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-violet-500 focus:border-violet-500 hover:shadow-md transition group"
                                >
                                    <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
                                        <Users size={24} />
                                    </div>
                                    <span className="font-bold text-gray-800">Send Bulk SMS</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => selectSmsOperation('single')}
                                    className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-blue-500 focus:border-blue-500 hover:shadow-md transition group"
                                >
                                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
                                        <UserRound size={24} />
                                    </div>
                                    <span className="font-bold text-gray-800">Single SMS</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={downloadSmsCsv}
                                    className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-md transition group"
                                >
                                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
                                        <Download size={24} />
                                    </div>
                                    <span className="font-bold text-gray-800">Export CSV</span>
                                </button>
                            </div>

                            {smsMode && (
                                <div id="modal-workspace" className="bg-white p-5 rounded-xl border border-gray-200 shadow-inner">
                                    {smsLoading ? (
                                        <div className="py-8 text-center text-gray-500">Preparing message preview…</div>
                                    ) : smsMode === 'single' && !smsPreview ? (
                                        <>
                                            <h4 className="text-lg font-bold text-gray-800 mb-3">Select Employee</h4>
                                            <div className="max-h-64 space-y-2 overflow-y-auto">
                                                {payrollRows.map((row) => (
                                                    <button
                                                        key={row.teacherId}
                                                        type="button"
                                                        onClick={() => loadSmsPreview([row.teacherId])}
                                                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left hover:border-blue-400 hover:bg-blue-50"
                                                    >
                                                        <span>
                                                            <strong className="block text-sm text-gray-800">{row.fullNameEng || row.fullNameBng}</strong>
                                                            <small className="text-gray-500">{row.teacherCode || '—'}</small>
                                                        </span>
                                                        <span className="text-sm font-semibold text-indigo-700">Preview</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : smsPreview && smsMessages.length ? (
                                        <>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h4 className="text-lg font-bold text-gray-800">
                                                    {smsMode === 'bulk' ? 'Bulk SMS Preview' : 'Single SMS Preview'}
                                                </h4>
                                                <span className="text-xs text-gray-500">
                                                    {smsPreview.sendableCount} ready · {smsPreview.missingPhoneCount} missing phone
                                                </span>
                                            </div>
                                            <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">
                                                {smsMessages.map((message) => (
                                                    <div key={message.teacherId} className="rounded-lg border border-gray-200 p-3">
                                                        <label className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={smsSelectedIds.includes(message.teacherId)}
                                                                onChange={() => toggleSmsRecipient(message.teacherId)}
                                                                className="mt-1 accent-violet-600"
                                                            />
                                                            <span className="min-w-0 flex-1">
                                                                <span className="flex flex-wrap justify-between gap-2">
                                                                    <strong className="text-sm text-gray-800">{message.teacherName}</strong>
                                                                    <span className="text-xs text-gray-500">{message.phone}</span>
                                                                </span>
                                                                <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-2 font-sans text-xs leading-relaxed text-gray-700">
                                                                    {message.message}
                                                                </pre>
                                                            </span>
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                            {smsMode === 'single' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSmsPreview(null);
                                                        setSmsSelectedIds([]);
                                                        setSmsTargetIds(payrollRows.map((row) => row.teacherId));
                                                        setSmsConfirmed(false);
                                                    }}
                                                    className="mt-3 text-sm font-semibold text-indigo-700 hover:underline"
                                                >
                                                    ← Back to employee list
                                                </button>
                                            )}
                                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
                                                <label className="flex items-center gap-2 text-xs text-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={smsConfirmed}
                                                        onChange={(event) => setSmsConfirmed(event.target.checked)}
                                                        disabled={!selectedSmsMessages.length}
                                                    />
                                                    I reviewed the message(s)
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={sendSms}
                                                    disabled={!smsConfirmed || !selectedSmsMessages.length || smsSending}
                                                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {smsSending ? 'Sending…' : `Send ${selectedSmsMessages.length} SMS`}
                                                </button>
                                            </div>
                                        </>
                                    ) : smsMode === 'single' && smsPreview ? (
                                        <>
                                            <h4 className="text-lg font-bold text-gray-800">Single SMS Preview</h4>
                                            <p className="mt-3 text-sm text-gray-600">
                                                No valid mobile number is available for this employee.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSmsPreview(null);
                                                    setSmsSelectedIds([]);
                                                }}
                                                className="mt-3 text-sm font-semibold text-indigo-700 hover:underline"
                                            >
                                                ← Back to employee list
                                            </button>
                                        </>
                                    ) : (
                                        <p className="py-6 text-center text-sm text-gray-500">
                                            {smsError || 'No valid phone numbers were found.'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isEmailOpen && (
                <div
                    id="payroll-email-modal"
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm no-print"
                >
                    <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between bg-gradient-to-r from-sky-800 to-indigo-800 p-5 text-white">
                            <div>
                                <h2 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
                                    <Mail className="h-6 w-6 text-sky-200" />
                                    বেতন ইমেইল সেন্টার
                                </h2>
                                <p className="mt-1 text-sm text-sky-100">ব্যক্তিগত HTML পে-স্লিপ · একসাথে অথবা একজনকে</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEmailOpen(false)}
                                className="rounded-full p-2 text-white transition hover:bg-white/20"
                                aria-label="ইমেইল প্যানেল বন্ধ করুন"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-5 sm:p-6">
                            <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                                ইমেইল পাঠাতে সার্ভারে SMTP কনফিগারেশন থাকতে হবে। প্রতিটি শিক্ষক নিজের বেতন বিবরণীই পাবেন; ঠিকানা নেওয়া হবে সংরক্ষিত শিক্ষক প্রোফাইল থেকে।
                            </p>

                            {emailError && (
                                <p role="alert" className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {emailError}
                                </p>
                            )}

                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => selectEmailOperation('bulk')}
                                    className="flex items-center gap-4 rounded-xl border-2 border-white bg-white p-4 text-left shadow-sm transition hover:border-sky-400 hover:shadow-md"
                                >
                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700"><Users size={24} /></span>
                                    <span><strong className="block text-gray-800">সবাইকে একসাথে</strong><small className="text-gray-500">প্রিভিউ দেখে প্রাপক বেছে পাঠান</small></span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => selectEmailOperation('single')}
                                    className="flex items-center gap-4 rounded-xl border-2 border-white bg-white p-4 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md"
                                >
                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700"><UserRound size={24} /></span>
                                    <span><strong className="block text-gray-800">একজনকে পাঠান</strong><small className="text-gray-500">একজন শিক্ষক বেছে ব্যক্তিগত পে-স্লিপ দেখুন</small></span>
                                </button>
                            </div>

                            {emailMode && (
                                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                                    {emailLoading ? (
                                        <div className="py-10 text-center text-sm text-gray-500">ব্যক্তিগত ইমেইল প্রিভিউ তৈরি হচ্ছে…</div>
                                    ) : emailMode === 'single' && !emailPreview ? (
                                        <>
                                            <h3 className="mb-3 text-lg font-bold text-gray-800">শিক্ষক নির্বাচন করুন</h3>
                                            <div className="max-h-64 space-y-2 overflow-y-auto">
                                                {payrollRows.map((row) => (
                                                    <button
                                                        key={row.teacherId}
                                                        type="button"
                                                        onClick={() => loadEmailPreview([row.teacherId])}
                                                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left transition hover:border-sky-400 hover:bg-sky-50"
                                                    >
                                                        <span><strong className="block text-sm text-gray-800">{row.fullNameBng || row.fullNameEng}</strong><small className="text-gray-500">{row.teacherCode || '—'}</small></span>
                                                        <span className="text-sm font-semibold text-sky-700">প্রিভিউ</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : emailPreview ? (
                                        <>
                                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                                <h3 className="text-lg font-bold text-gray-800">
                                                    {emailMode === 'bulk' ? 'বাল্ক ইমেইল প্রিভিউ' : 'ব্যক্তিগত ইমেইল প্রিভিউ'}
                                                </h3>
                                                <span className="text-xs text-gray-500">
                                                    {emailPreview.sendableCount}টি প্রস্তুত · {emailPreview.missingEmailCount}টি ঠিকানা নেই/অকার্যকর
                                                </span>
                                            </div>

                                            {emailMessages.length > 0 && (
                                                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                                                    <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                                                        {emailMessages.map((message) => (
                                                            <div key={message.teacherId} className={`flex items-center gap-3 rounded-lg border p-3 ${emailPreviewedMessage?.teacherId === message.teacherId ? 'border-sky-300 bg-sky-50' : 'border-gray-200 bg-white'}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={emailSelectedIds.includes(message.teacherId)}
                                                                    onChange={() => toggleEmailRecipient(message.teacherId)}
                                                                    aria-label={`${message.teacherName} নির্বাচন করুন`}
                                                                    className="h-4 w-4 accent-sky-700"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEmailPreviewedId(message.teacherId)}
                                                                    className="min-w-0 flex-1 text-left"
                                                                >
                                                                    <strong className="block truncate text-sm text-gray-800">{message.teacherName}</strong>
                                                                    <span className="block truncate text-xs text-gray-500">{message.email}</span>
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {emailPreview.missingEmailRecipients?.length > 0 && (
                                                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                                                <strong className="text-xs text-amber-900">ইমেইল ঠিকানা নেই বা সঠিক নয়</strong>
                                                                <ul className="mt-1 list-inside list-disc text-xs text-amber-800">
                                                                    {emailPreview.missingEmailRecipients.map((recipient) => (
                                                                        <li key={recipient.teacherId}>{recipient.teacherName}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {emailPreviewedMessage && (
                                                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                                                            <div className="border-b border-gray-200 px-3 py-2">
                                                                <p className="text-xs font-semibold text-gray-800">{emailPreviewedMessage.subject}</p>
                                                                <p className="mt-1 text-[11px] text-gray-500">প্রাপক: {emailPreviewedMessage.email}</p>
                                                            </div>
                                                            <iframe
                                                                title={`${emailPreviewedMessage.teacherName} বেতন ইমেইল প্রিভিউ`}
                                                                srcDoc={emailPreviewedMessage.html}
                                                                sandbox=""
                                                                className="h-[28rem] w-full bg-slate-100"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {emailMessages.length === 0 && (
                                                <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                                                    {emailMode === 'single' ? 'এই শিক্ষকের কোনো বৈধ ইমেইল ঠিকানা নেই। প্রোফাইলে ইমেইল ঠিকানা যোগ করে আবার চেষ্টা করুন।' : 'নির্বাচিত শিক্ষকদের কোনো বৈধ ইমেইল ঠিকানা পাওয়া যায়নি।'}
                                                </p>
                                            )}

                                            {emailMode === 'single' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEmailPreview(null);
                                                        setEmailSelectedIds([]);
                                                        setEmailPreviewedId('');
                                                        setEmailConfirmed(false);
                                                    }}
                                                    className="mt-3 text-sm font-semibold text-sky-700 hover:underline"
                                                >
                                                    ← শিক্ষক তালিকায় ফিরুন
                                                </button>
                                            )}

                                            {emailMessages.length > 0 && (
                                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
                                                    <label className="flex items-center gap-2 text-xs text-gray-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={emailConfirmed}
                                                            onChange={(event) => setEmailConfirmed(event.target.checked)}
                                                            disabled={!selectedEmailMessages.length}
                                                        />
                                                        নির্বাচিত প্রত্যেকের ব্যক্তিগত পে-স্লিপ যাচাই করেছি
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={sendEmail}
                                                        disabled={!emailConfirmed || !selectedEmailMessages.length || emailSending}
                                                        className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Mail size={16} />
                                                        {emailSending ? 'পাঠানো হচ্ছে…' : `${selectedEmailMessages.length}টি ইমেইল পাঠান`}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="py-6 text-center text-sm text-gray-500">প্রাপক নির্বাচন করে ইমেইল প্রিভিউ দেখুন।</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
