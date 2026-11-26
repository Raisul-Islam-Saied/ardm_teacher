/**
 * ARDM Enterprise ERP — Daily Biometric Attendance & ZKTeco K40 Ledger (Step 17)
 * Features:
 * - Server-managed attendance policy and quota calculations
 * - ZKTeco ADMS biometric punch integration
 * - Configured weekend and special holiday handling
 * - Admin Manual Override Modal with Official Reason/Remarks
 * - A4 Printable Daily Attendance Register
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import moment from 'moment-timezone';
import {
    Fingerprint,
    Calendar,
    Clock,
    CheckCircle2,
    Award,
    RefreshCw,
    Printer,
    SlidersHorizontal,
    Sun,
    AlertTriangle,
    Search,
    Upload
} from 'lucide-react';
import { INSTITUTION_INFO } from '@constants/app.constants';
import {
    Button,
    Badge,
    Modal,
    ConfirmDialog,
    FormInput,
    FormSelect
} from '@components/ui';
import { useToast } from '@context/ToastContext';
import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';
import {
    toBengaliDigits,
    formatDisplayDate
} from '@utils/formatters';
import { cn } from '@utils/cn';

const STATUS_META = {
    Present: {
        labelBng: 'উপস্থিত (Present)',
        badgeVariant: 'success'
    },
    Late: {
        labelBng: 'বিলম্ব (Late)',
        badgeVariant: 'warning'
    },
    Leave: {
        labelBng: 'অনুমোদিত ছুটি (Leave)',
        badgeVariant: 'gold'
    },
    Absent: {
        labelBng: 'অনুপস্থিত (Absent)',
        badgeVariant: 'danger'
    },
    Holiday: {
        labelBng: 'ছুটির দিন (Holiday)',
        badgeVariant: 'neutral'
    },
    Unrecorded: {
        labelBng: 'রেকর্ড নেই',
        badgeVariant: 'neutral'
    }
};

function formatTime12h(time24Str) {
    if (!time24Str || !time24Str.includes(':')) {
        return '—';
    }
    const [hhStr, mmStr] = time24Str.split(':');
    const hh = Number(hhStr);
    const mm = Number(mmStr);
    if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
        return '—';
    }

    const period = hh >= 12 ? 'PM' : 'AM';
    const hour12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${String(hour12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${period}`;
}

export default function AttendanceManagement() {
    const toast = useToast();

    const todayIso = useMemo(() => moment.tz('Asia/Dhaka').format('YYYY-MM-DD'), []);
    const [selectedDate, setSelectedDate] = useState(todayIso);
    const [rows, setRows] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSavingSheet, setIsSavingSheet] = useState(false);
    const [isHolidayConfirmOpen, setIsHolidayConfirmOpen] = useState(false);
    const [isOpenDayConfirmOpen, setIsOpenDayConfirmOpen] = useState(false);
    const [dayHolidayState, setDayHolidayState] = useState({
        isHoliday: false,
        isSpecialHoliday: false,
        isOpenOverride: false,
        holidayTitle: '',
        dayFlag: null
    });

    // ম্যানুয়াল ওভাররাইড মডাল স্টেট
    const [overrideRow, setOverrideRow] = useState(null);
    const [overrideForm, setOverrideForm] = useState({
        status: 'Present',
        inTime24: '08:55',
        remarks: ''
    });
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkRows, setBulkRows] = useState([]);
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [usbSummary, setUsbSummary] = useState(null);

    const isSelectedHoliday = dayHolidayState.isHoliday;

    // তারিখ পরিবর্তন করলে বা সার্ভার থেকে সিঙ্ক করলে হাজিরা লোড করা
    const loadAttendanceForDate = useCallback(async (targetDate, showNotify = false) => {
        setIsSyncing(true);
        try {
            const res = await axiosClient.get('/attendance/daily', { params: { date: targetDate } });
            const serverRecords = res?.data?.data?.records;
            if (!Array.isArray(serverRecords)) {
                throw new Error('সার্ভার থেকে হাজিরার তালিকা পাওয়া যায়নি।');
            }
            setDayHolidayState({
                isHoliday: Boolean(res?.data?.data?.isHoliday),
                isSpecialHoliday: Boolean(res?.data?.data?.isSpecialHoliday),
                isOpenOverride: Boolean(res?.data?.data?.isOpenOverride),
                holidayTitle: res?.data?.data?.holidayTitle || '',
                dayFlag: res?.data?.data?.dayFlag || null
            });
            setRows(serverRecords.map((rec) => {
                const teacher = rec.teacher || {};
                const inTime24 = rec.inTime24 || '';
                return {
                    teacherId: teacher._id || rec.teacherId,
                    teacherCode: teacher.teacherCode || '',
                    biometricDeviceId: teacher.biometricDeviceId || '',
                    fullNameBng: teacher.fullNameBng || '',
                    designationBng: teacher.designation || '',
                    inTime24,
                    inTimeDisplay: formatTime12h(inTime24),
                    outTimeDisplay: '—',
                    status: rec.status || 'Unrecorded',
                    quotaCost: Number(rec.deductionWeight) || 0,
                    source: rec.source || (rec.status === 'Holiday' ? 'Calendar' : '—'),
                    remarks: rec.remarks || '',
                    monthlyQuotaUsedBefore: Number(rec.monthlyQuotaUsedBefore) || 0,
                    monthlyQuotaLimit: Number(rec.monthlyQuotaLimit ?? teacher.customLeaveQuota ?? 0)
                };
            }));

            if (showNotify) {
                toast.success('সার্ভারের দৈনিক হাজিরার তথ্য হালনাগাদ হয়েছে।');
            }
        } catch (error) {
            setRows([]);
            toast.error(extractApiErrorMessage(error, 'দৈনিক হাজিরার তথ্য লোড করা যায়নি।'));
        } finally {
            setIsSyncing(false);
        }
    }, [toast]);

    useEffect(() => {
        loadAttendanceForDate(selectedDate, false);
    }, [selectedDate, loadAttendanceForDate]);

    const openAttendanceEditor = (row, isManualPunch = false) => {
        const status = ['Holiday', 'Unrecorded'].includes(row.status) ||
            (isManualPunch && row.status === 'Absent')
            ? 'Present'
            : row.status;
        setOverrideRow(row);
        setOverrideForm({
            status: STATUS_META[status] ? status : 'Present',
            inTime24: row.inTime24 || '08:55',
            remarks: row.remarks || (isManualPunch ? 'ফিঙ্গারপ্রিন্টে হাজিরা না হওয়ায় ম্যানুয়াল ইন-টাইম এন্ট্রি' : '')
        });
    };

    // অ্যাডমিন ম্যানুয়াল ওভাররাইড সংরক্ষণ
    const openBulkAttendance = async () => {
        try {
            const res = await axiosClient.get('/attendance/bulk', { params: { date: selectedDate } });
            const records = res?.data?.data?.records;
            if (!Array.isArray(records)) throw new Error('বাল্ক হাজিরার তালিকা পাওয়া যায়নি।');
            setBulkRows(records.map((record) => ({
                teacherId: record.teacher?._id,
                teacherCode: record.teacher?.teacherCode || '',
                fullNameBng: record.teacher?.fullNameBng || '',
                biometricDeviceId: record.teacher?.biometricDeviceId || '',
                presentChecked: ['Present', 'Late'].includes(record.status),
                status: record.status === 'Late' ? 'Late' : 'Present',
                punchTime: record.punchTime || ''
            })));
            setIsBulkModalOpen(true);
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'বাল্ক হাজিরার তালিকা লোড করা যায়নি।'));
        }
    };

    const saveBulkAttendance = async () => {
        setIsBulkSaving(true);
        try {
            const payloadRecords = bulkRows
                .filter((row) => row.presentChecked)
                .map((row) => ({
                    teacherId: row.teacherId,
                    status: row.status,
                    punchTime: row.punchTime
                        ? new Date(row.punchTime).toISOString()
                        : undefined,
                    remarks: ''
                }));
            await axiosClient.put('/attendance/bulk', {
                date: selectedDate,
                records: payloadRecords
            });
            await loadAttendanceForDate(selectedDate, false);
            setIsBulkModalOpen(false);
            toast.success('বাল্ক হাজিরা সেভ হয়েছে। সিলেক্ট না করা শিক্ষক Leave হিসেবে সংরক্ষিত হয়েছে।');
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'বাল্ক হাজিরা সেভ করা যায়নি।'));
        } finally {
            setIsBulkSaving(false);
        }
    };

    const handleUsbUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsSyncing(true);
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await axiosClient.post('/attendance/upload-usb-logs', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUsbSummary(res.data?.data || null);
            await loadAttendanceForDate(selectedDate, false);
            toast.success('USB/pendrive ডেটা Smart Merge সম্পন্ন হয়েছে।');
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'USB ডেটা ইম্পোর্ট করা যায়নি।'));
        } finally {
            setIsSyncing(false);
            event.target.value = '';
        }
    };

    const handleSaveManualOverride = async () => {
        if (!overrideRow) return;
        const newStatus = overrideForm.status;
        if ((newStatus === 'Present' || newStatus === 'Late') && !overrideForm.inTime24) {
            toast.error('উপস্থিতি দিতে প্রবেশের সময় উল্লেখ করুন।');
            return;
        }
        setIsSyncing(true);
        try {
            const payload = {
                teacherId: overrideRow.teacherId,
                date: selectedDate,
                status: newStatus,
                remarks: overrideForm.remarks
            };
            if ((newStatus === 'Present' || newStatus === 'Late') && overrideForm.inTime24) {
                payload.punchTime = `${selectedDate}T${overrideForm.inTime24}:00+06:00`;
            }
            await axiosClient.put('/attendance/override', payload);
            await loadAttendanceForDate(selectedDate, false);
            toast.success(`${overrideRow.fullNameBng}-এর হাজিরা স্ট্যাটাস [${newStatus}] হিসেবে হালনাগাদ হয়েছে!`);
            setOverrideRow(null);
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'হাজিরা সংশোধন সংরক্ষণ করা যায়নি।'));
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDeclareSpecialHoliday = async () => {
        setIsSavingSheet(true);
        try {
            await axiosClient.post('/attendance/special-date', {
                date: selectedDate,
                title: dayHolidayState.dayFlag?.dayType === 'MACHINE_OFF'
                    ? 'মেশিন বন্ধ / অনির্ধারিত ছুটি'
                    : 'প্রাতিষ্ঠানিক ছুটি',
                isHoliday: true
            });
            await loadAttendanceForDate(selectedDate, false);
            toast.success(`${formatDisplayDate(selectedDate, 'bn')}-এর ছুটি সংরক্ষণ করা হয়েছে।`);
            setIsHolidayConfirmOpen(false);
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'ছুটির দিন সংরক্ষণ করা যায়নি।'));
        } finally {
            setIsSavingSheet(false);
        }
    };

    const handleOpenSelectedDay = async () => {
        setIsSavingSheet(true);
        try {
            if (dayHolidayState.isSpecialHoliday) {
                await axiosClient.delete(`/attendance/special-date/${selectedDate}`);
            } else {
                await axiosClient.post('/attendance/special-date', {
                    date: selectedDate,
                    title: 'প্রাতিষ্ঠানিক কর্মদিবস',
                    isHoliday: false
                });
            }
            await loadAttendanceForDate(selectedDate, false);
            toast.success(`${formatDisplayDate(selectedDate, 'bn')}-এর ছুটি বাতিল করে দিনটি খোলা ঘোষণা করা হয়েছে।`);
            setIsOpenDayConfirmOpen(false);
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'দিনটি খোলা ঘোষণা করা যায়নি।'));
        } finally {
            setIsSavingSheet(false);
        }
    };

    // সামারি কাউন্টারসমূহ
    const summary = useMemo(() => {
        return {
            present: rows.filter((r) => r.status === 'Present').length,
            late: rows.filter((r) => r.status === 'Late').length,
            leave: rows.filter((r) => r.status === 'Leave').length,
            absent: rows.filter((r) => r.status === 'Absent').length,
            holiday: rows.filter((r) => r.status === 'Holiday').length
        };
    }, [rows]);

    const filteredRows = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return rows.filter((r) => {
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
            if (!q) return true;
            return (
                r.fullNameBng.toLowerCase().includes(q) ||
                String(r.teacherCode).includes(q) ||
                String(r.biometricDeviceId) === q
            );
        });
    }, [rows, searchTerm, statusFilter]);

    return (
        <div className="space-y-6 animate-fade-up">

            {/* =================================================================
                1. HEADER & ZKTECO K40 CONTROL BAR
               ================================================================= */}
            <section className="ledger-surface p-6 bg-paper-panel flex flex-wrap items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald text-gold-soft flex items-center justify-center shadow-xs shrink-0">
                        <Fingerprint className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="gold" size="sm" mono>
                                STEP 17 · ZKTECO K40 BIOMETRIC ENGINE
                            </Badge>
                            <Badge variant="emerald-subtle" size="sm" mono>
                                9:00 AM Gate Lock Rule
                            </Badge>
                        </div>
                        <h1 className="font-bengali text-xl sm:text-2xl font-bold text-emerald-deep mt-1">
                            দৈনিক বায়োমেট্রিক হাজিরা ও কোটা লেজার
                        </h1>
                        <p className="font-bengali text-xs text-ink-soft">
                            তারিখ: <b>{formatDisplayDate(selectedDate, 'bn')}</b> · পাঞ্চ না পাওয়া গেলে স্বয়ংক্রিয়ভাবে <b>ছুটি (Leave)</b> দেখাবে; প্রশাসক প্রমাণের ভিত্তিতে পরে <b>অনুপস্থিত (Absent)</b> পরিবর্তন করবেন।
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={RefreshCw}
                        isLoading={isSyncing}
                        onClick={() => loadAttendanceForDate(selectedDate, true)}
                    >
                        <span className="font-bengali">ডিভাইস সিঙ্ক</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={Printer}
                        onClick={() => window.print()}
                    >
                        <span className="font-bengali">A4 শিট প্রিন্ট</span>
                    </Button>
                    <Button
                        variant="emerald"
                        size="sm"
                        leftIcon={Fingerprint}
                        onClick={openBulkAttendance}
                    >
                        <span className="font-bengali">ম্যানুয়াল বাল্ক এন্ট্রি</span>
                    </Button>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gold/50 bg-gold-subtle px-3 py-2.5 text-xs font-bengali font-bold text-emerald-deep">
                        <Upload className="h-4 w-4" />
                        USB ডেটা ইম্পোর্ট
                        <input
                            type="file"
                            accept=".dat,.txt,.csv"
                            className="hidden"
                            onChange={handleUsbUpload}
                        />
                    </label>

                </div>
            </section>

            {usbSummary && (
                <section className="ledger-surface p-4 bg-emerald-subtle/30 border-emerald/20">
                    <div className="flex flex-wrap items-center gap-3 font-bengali text-sm">
                        <strong className="text-emerald-deep">USB Smart Merge সম্পন্ন:</strong>
                        <span>নতুন ডেটা: <b>{toBengaliDigits(usbSummary.newlySyncedPunches || 0)}</b></span>
                        <span>স্কিপ: <b>{toBengaliDigits(usbSummary.skippedOrDuplicateLines || 0)}</b></span>
                        {usbSummary.affectedDates?.length > 0 && (
                            <span>প্রভাবিত তারিখ: <b>{usbSummary.affectedDates.join(', ')}</b></span>
                        )}
                    </div>
                </section>
            )}

            {/* =================================================================
                2. DATE PICKER, FRIDAY ALERT & SUMMARY PILLS
               ================================================================= */}
            <section className="ledger-surface p-4 sm:p-5 bg-paper-panel space-y-4 no-print">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* তারিখ নির্বাচন ও ছুটির বাটন */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-paper px-3 py-1.5 rounded-xl border border-ink-faint">
                            <Calendar className="w-4 h-4 text-emerald" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent font-mono text-xs sm:text-sm font-bold text-emerald-deep focus:outline-none"
                            />
                        </div>

                        {dayHolidayState.isOpenOverride ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="success" size="md" dot>
                                    এই তারিখটি খোলা দিন হিসেবে নির্ধারিত
                                </Badge>
                                <Button
                                    variant="gold"
                                    size="xs"
                                    leftIcon={Sun}
                                    isLoading={isSavingSheet}
                                    onClick={() => setIsHolidayConfirmOpen(true)}
                                >
                                    <span className="font-bengali">এ দিনটিকে আবার ছুটি ঘোষণা করুন</span>
                                </Button>
                            </div>
                        ) : isSelectedHoliday ? (
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="gold" size="md" dot>
                                    {dayHolidayState.isOpenOverride
                                        ? 'এই তারিখটি খোলা দিন হিসেবে নির্ধারিত'
                                        : dayHolidayState.holidayTitle || 'এই তারিখটি ছুটির দিন হিসেবে নির্ধারিত'}
                                </Badge>
                                {!dayHolidayState.isOpenOverride && (
                                    <Button
                                        variant="danger"
                                        size="xs"
                                        leftIcon={Sun}
                                        isLoading={isSavingSheet}
                                        onClick={() => setIsOpenDayConfirmOpen(true)}
                                        className="border border-ink-faint"
                                    >
                                        <span className="font-bengali">এই দিনটিকে খোলা দিন করুন</span>
                                    </Button>
                                )}
                            </div>
                        ) : dayHolidayState.dayFlag?.dayType === 'MACHINE_OFF' ? (
                            <Button
                                variant="gold"
                                size="xs"
                                leftIcon={Sun}
                                isLoading={isSavingSheet}
                                onClick={handleDeclareSpecialHoliday}
                            >
                                <span className="font-bengali">১ ক্লিকে এই Machine-Off দিন Holiday করুন</span>
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="xs"
                                leftIcon={Sun}
                                isLoading={isSavingSheet}
                                onClick={() => setIsHolidayConfirmOpen(true)}
                                className="border border-ink-faint"
                            >
                                <span className="font-bengali">এই দিনটিকে ছুটি (Holiday) ঘোষণা করুন</span>
                            </Button>
                        )}
                        {dayHolidayState.dayFlag?.dayType === 'MACHINE_OFF' && (
                            <Badge variant="danger" size="md" dot>
                                মেশিন বন্ধ/কনেকশন: <span className="ml-1">{toBengaliDigits(dayHolidayState.dayFlag.attendancePercentage || 0)}%</span> পাঞ্চ
                            </Badge>
                        )}
                    </div>

                    {/* লাইভ সামারি কাউন্টার ব্যাজ */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bengali">
                        <span className="px-3 py-1 rounded-full bg-success-bg text-success font-bold border border-success-border">
                            উপস্থিত: {toBengaliDigits(summary.present)}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-warning-bg text-warning-deep font-bold border border-warning-border">
                            বিলম্ব (০.৫): {toBengaliDigits(summary.late)}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-gold-subtle text-[#5E450B] font-bold border border-gold/40">
                            ছুটি (১.০): {toBengaliDigits(summary.leave)}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-danger-bg text-danger font-bold border border-danger-border">
                            অনুপস্থিত: {toBengaliDigits(summary.absent)}
                        </span>
                    </div>
                </div>

                {/* সার্চ ও স্ট্যাটাস ফিল্টার বার */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-ink-faint">
                    <div className="md:col-span-5 relative">
                        <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="শিক্ষকের নাম, ১০-ডিজিট আইডি বা বায়োমেট্রিক PIN..."
                            className="erp-input pl-10 font-bengali text-xs sm:text-sm"
                        />
                    </div>

                    <div className="md:col-span-7 flex flex-wrap items-center gap-1.5">
                        {[
                            { key: 'ALL', label: 'সকল স্টাফ' },
                            { key: 'Present', label: 'উপস্থিত (Present)' },
                            { key: 'Late', label: 'বিলম্ব (Late)' },
                            { key: 'Leave', label: 'ছুটি (Leave)' },
                            { key: 'Absent', label: 'অনুপস্থিত (Absent)' }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusFilter(tab.key)}
                                className={cn(
                                    'px-3 py-1.5 rounded-xl font-bengali text-xs font-semibold border transition-all',
                                    statusFilter === tab.key
                                        ? 'bg-emerald text-white border-emerald'
                                        : 'bg-paper text-ink-soft border-ink-faint hover:border-gold'
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* =================================================================
                3. PRINT HEADER (Visible ONLY when printing A4 Attendance Sheet)
               ================================================================= */}
            <div className="hidden print:block text-center pb-4 mb-4 border-b-2 border-emerald">
                <h1 className="font-serif text-2xl font-bold text-emerald-deep">
                    {INSTITUTION_INFO.nameEng}
                </h1>
                <p className="font-bengali text-sm font-bold text-emerald">
                    {INSTITUTION_INFO.nameBng} · দৈনিক বায়োমেট্রিক হাজিরা রেজিস্টার ({formatDisplayDate(selectedDate, 'bn')})
                </p>
            </div>

            {/* =================================================================
                4. DAILY ATTENDANCE LEDGER TABLE
               ================================================================= */}
            <section className="ledger-surface bg-paper-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-paper-deep/90 border-b border-ink-faint font-bengali font-bold text-emerald-deep">
                                <th className="py-3.5 pl-5 pr-2">K40 PIN</th>
                                <th className="py-3.5 px-3">শিক্ষকের নাম ও পদবী</th>
                                <th className="py-3.5 px-3 text-center">প্রবেশ (In Time)</th>
                                <th className="py-3.5 px-3 text-center">প্রস্থান (Out Time)</th>
                                <th className="py-3.5 px-3 text-center">হাজিরা অবস্থা</th>
                                <th className="py-3.5 px-3 text-center">কোটা প্রভাব</th>
                                <th className="py-3.5 px-3">উৎস ও মন্তব্য</th>
                                <th className="py-3.5 pl-3 pr-5 text-right no-print">ওভাররাইড</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-faint">
                            {filteredRows.map((row) => {
                                const meta = STATUS_META[row.status] || {
                                    labelBng: row.status || '—',
                                    badgeVariant: 'neutral'
                                };
                                const totalUsedAfterToday = row.monthlyQuotaUsedBefore + row.quotaCost;
                                const isQuotaExceeded = totalUsedAfterToday > row.monthlyQuotaLimit;

                                return (
                                    <tr key={row.teacherId} className="hover:bg-emerald-subtle/30 transition-colors">
                                        <td className="py-3.5 pl-5 pr-2 font-mono font-bold text-emerald-deep">
                                            #{row.biometricDeviceId}
                                        </td>

                                        <td className="py-3.5 px-3">
                                            <p className="font-bengali text-sm font-bold text-emerald-deep">
                                                {row.fullNameBng}
                                            </p>
                                            <p className="font-bengali text-[11px] text-ink-soft">
                                                {row.designationBng} · <span className="font-mono">{row.teacherCode}</span>
                                            </p>
                                        </td>

                                        <td className="py-3.5 px-3 text-center font-mono font-bold text-emerald-deep">
                                            {!row.inTime24 && ['Unrecorded', 'Absent', 'Late'].includes(row.status) ? (
                                                <Button
                                                    variant="outline"
                                                    size="xs"
                                                    onClick={() => openAttendanceEditor(row, true)}
                                                    title="ফিঙ্গারপ্রিন্ট কাজ না করলে ম্যানুয়ালি ইন-টাইম দিন"
                                                >
                                                    <span className="font-bengali">ম্যানুয়াল পাঞ্চ</span>
                                                </Button>
                                            ) : row.inTimeDisplay}
                                        </td>

                                        <td className="py-3.5 px-3 text-center font-mono text-ink-soft">
                                            {row.outTimeDisplay}
                                        </td>

                                        <td className="py-3.5 px-3 text-center">
                                            <Badge variant={meta.badgeVariant} size="sm" dot>
                                                {meta.labelBng}
                                            </Badge>
                                        </td>

                                        <td className="py-3.5 px-3 text-center">
                                            <span
                                                className={cn(
                                                    'font-mono font-bold px-2 py-0.5 rounded',
                                                    row.quotaCost > 0
                                                        ? 'bg-warning-bg text-warning-deep'
                                                        : 'text-ink-muted'
                                                )}
                                            >
                                                {row.quotaCost > 0 ? `-${row.quotaCost.toFixed(1)}` : '0.0'}
                                            </span>
                                            <span
                                                className={cn(
                                                    'block font-mono text-[10px] mt-0.5',
                                                    isQuotaExceeded ? 'text-danger font-bold' : 'text-ink-muted'
                                                )}
                                            >
                                                মাসিক: {totalUsedAfterToday.toFixed(1)}/{row.monthlyQuotaLimit.toFixed(1)}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-3 font-bengali text-ink-soft">
                                            <span className="font-mono text-[10.5px] font-semibold text-emerald block">
                                                [{row.source}]
                                            </span>
                                            <span>{row.remarks || '—'}</span>
                                        </td>

                                        <td className="py-3.5 pl-3 pr-5 text-right no-print">
                                            <Button
                                                variant="outline"
                                                size="xs"
                                                leftIcon={SlidersHorizontal}
                                                onClick={() => openAttendanceEditor(row)}
                                            >
                                                <span className="font-bengali">সংশোধন</span>
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <ConfirmDialog
                isOpen={isHolidayConfirmOpen}
                onClose={() => {
                    if (!isSavingSheet) setIsHolidayConfirmOpen(false);
                }}
                onConfirm={handleDeclareSpecialHoliday}
                titleBng="এই তারিখে ছুটি ঘোষণা করবেন?"
                messageBng={`${formatDisplayDate(selectedDate, 'bn')} তারিখকে প্রতিষ্ঠানের ছুটি হিসেবে ঘোষণা করা হবে। এতে ওই দিনের হাজিরা ও বেতন গণনায় প্রভাব পড়বে।`}
                confirmText="হ্যাঁ, ছুটি ঘোষণা করুন"
                variant="gold"
                isLoading={isSavingSheet}
            />

            <ConfirmDialog
                isOpen={isOpenDayConfirmOpen}
                onClose={() => {
                    if (!isSavingSheet) setIsOpenDayConfirmOpen(false);
                }}
                onConfirm={handleOpenSelectedDay}
                titleBng="এই তারিখে কর্মদিবস খুলবেন?"
                messageBng={`${formatDisplayDate(selectedDate, 'bn')} তারিখের ছুটির ঘোষণা বাতিল করে খোলা দিন হিসেবে সেট করা হবে। ওই দিন উপস্থিত, বিলম্ব ও বেতন গণনার স্বাভাবিক নিয়ম আবার চালু হবে।`}
                confirmText="হ্যাঁ, দিনটি খোলা করুন"
                variant="emerald"
                isLoading={isSavingSheet}
            />

            <Modal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                size="xl"
                titleEng="Manual Bulk Attendance Entry"
                titleBng="ম্যানুয়াল বাল্ক হাজিরা এন্ট্রি"
                subtitleBng={`${formatDisplayDate(selectedDate, 'bn')} · যাদের আসা নিশ্চিত, শুধু তাদের সিলেক্ট করুন`}
                footer={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setIsBulkModalOpen(false)}>
                            <span className="font-bengali">বাতিল</span>
                        </Button>
                        <Button variant="emerald" size="sm" isLoading={isBulkSaving} onClick={saveBulkAttendance}>
                            <span className="font-bengali">১ ক্লিকে বাল্ক সেভ করুন</span>
                        </Button>
                    </>
                }
            >
                <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-ink-faint">
                    <table className="w-full border-collapse text-xs">
                        <thead className="sticky top-0 bg-paper-deep font-bengali text-emerald-deep">
                            <tr>
                                <th className="px-3 py-3 text-left">শিক্ষক</th>
                                <th className="px-3 py-3 text-center">আসেনি/এসেছেন</th>
                                <th className="px-3 py-3 text-center">স্ট্যাটাস</th>
                                <th className="px-3 py-3 text-center">প্রবেশ সময়</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink-faint">
                            {bulkRows.map((row) => (
                                <tr key={row.teacherId}>
                                    <td className="px-3 py-2.5 font-bengali">
                                        <b className="block text-emerald-deep">{row.fullNameBng}</b>
                                        <span className="font-mono text-[10px] text-ink-muted">
                                            {row.teacherCode} · PIN #{row.biometricDeviceId}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        <input
                                            type="checkbox"
                                            checked={row.presentChecked}
                                            onChange={(event) => setBulkRows((current) =>
                                                current.map((item) => item.teacherId === row.teacherId
                                                    ? { ...item, presentChecked: event.target.checked }
                                                    : item)
                                            )}
                                        />
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        {row.presentChecked ? (
                                            <select
                                                value={row.status}
                                                onChange={(event) => setBulkRows((current) =>
                                                    current.map((item) => item.teacherId === row.teacherId
                                                        ? { ...item, status: event.target.value }
                                                        : item)
                                                )}
                                                className="erp-input w-auto py-1.5 text-xs"
                                            >
                                                <option value="Present">Present</option>
                                                <option value="Late">Late</option>
                                            </select>
                                        ) : (
                                            <span className="font-bengali text-ink-muted">Leave</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        {row.presentChecked && (
                                            <input
                                                type="datetime-local"
                                                value={row.punchTime}
                                                onChange={(event) => setBulkRows((current) =>
                                                    current.map((item) => item.teacherId === row.teacherId
                                                        ? { ...item, punchTime: event.target.value }
                                                        : item)
                                                )}
                                                className="erp-input w-auto py-1.5 font-mono text-xs"
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Modal>

            {/* =================================================================
                5. ADMIN MANUAL ATTENDANCE OVERRIDE MODAL
               ================================================================= */}
            <Modal
                isOpen={Boolean(overrideRow)}
                onClose={() => setOverrideRow(null)}
                size="sm"
                titleEng="Admin Attendance Manual Override"
                titleBng="হাজিরা স্ট্যাটাস ও কোটা ম্যানুয়াল সংশোধন"
                subtitleBng={overrideRow ? `${overrideRow.fullNameBng} (PIN #${overrideRow.biometricDeviceId})` : ''}
                footer={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setOverrideRow(null)}>
                            <span className="font-bengali">বাতিল</span>
                        </Button>
                        <Button variant="emerald" size="sm" onClick={handleSaveManualOverride}>
                            <span className="font-bengali">সংশোধন সংরক্ষণ করুন</span>
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <FormSelect
                        labelEng="Attendance Status"
                        labelBng="নতুন হাজিরা স্ট্যাটাস"
                        variant="erp"
                        value={overrideForm.status}
                        onChange={(e) =>
                            setOverrideForm((prev) => ({ ...prev, status: e.target.value }))
                        }
                        options={[
                            { value: 'Present', label: 'উপস্থিত (Present · ০.০ কোটা)' },
                            { value: 'Late', label: 'বিলম্ব উপস্থিতি (Late · ০.৫ কোটা)' },
                            { value: 'Leave', label: 'পাঞ্চ না পাওয়া গেছে (Leave · ১.০ কোটা)' },
                            { value: 'Absent', label: 'অনুপস্থিত (Absent · বেতন কর্তন)' },
                            { value: 'Official Duty', label: 'অফিসিয়াল ডিউটি (কোটা ও বেতন কর্তন নেই)' }
                        ]}
                        placeholder={false}
                    />

                    {(overrideForm.status === 'Present' || overrideForm.status === 'Late') && (
                        <FormInput
                            labelEng="In Time"
                            labelBng="প্রবেশের সময়"
                            type="time"
                            variant="erp"
                            isMonoText
                            hint={overrideRow && !overrideRow.inTime24
                                ? 'ডিফল্ট সময় ০৮:৫৫; প্রয়োজন হলে সময় পরিবর্তন করুন।'
                                : ''}
                            value={overrideForm.inTime24}
                            onChange={(e) =>
                                setOverrideForm((prev) => ({ ...prev, inTime24: e.target.value }))
                            }
                        />
                    )}

                    <FormInput
                        labelEng="Official Reason / Remarks"
                        labelBng="সংশোধনের কারণ বা মন্তব্য"
                        variant="erp"
                        isBengaliText
                        value={overrideForm.remarks}
                        onChange={(e) =>
                            setOverrideForm((prev) => ({ ...prev, remarks: e.target.value }))
                        }
                        placeholder="যেমনঃ বোর্ড মিটিংয়ে উপস্থিতি / অসুস্থতাজনিত ছুটি"
                    />
                </div>
            </Modal>
        </div>
    );
}
