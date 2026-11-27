import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Loader2, Shield, XCircle } from 'lucide-react';
import { teacherPortalApi } from '../services/studentApiService';

const MONTHS_BN = [
    { val: 1, label: 'জানুয়ারি (January)' },
    { val: 2, label: 'ফেব্রুয়ারি (February)' },
    { val: 3, label: 'মার্চ (March)' },
    { val: 4, label: 'এপ্রিল (April)' },
    { val: 5, label: 'মে (May)' },
    { val: 6, label: 'জুন (June)' },
    { val: 7, label: 'জুলাই (July)' },
    { val: 8, label: 'আগস্ট (August)' },
    { val: 9, label: 'সেপ্টেম্বর (September)' },
    { val: 10, label: 'অক্টোবর (October)' },
    { val: 11, label: 'নভেম্বর (November)' },
    { val: 12, label: 'ডিসেম্বর (December)' }
];

const formatQuota = (value) =>
    new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 2 }).format(Number(value || 0));

const getDhakaDate = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Dhaka'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
};

const getApiErrorMessage = (error) =>
    error?.response?.data?.message || error?.message || 'মাসিক হাজিরা লোড করা যায়নি।';

export default function TeacherMonthlyAttendancePanel({ teacherId }) {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [attendance, setAttendance] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [currentYear - 1, currentYear, currentYear + 1];
    }, []);

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        setError('');

        teacherPortalApi
            .getMyMonthlyAttendance(selectedMonth, selectedYear, teacherId)
            .then((data) => {
                if (active) setAttendance(data);
            })
            .catch((requestError) => {
                if (active) {
                    setAttendance(null);
                    setError(getApiErrorMessage(requestError));
                }
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [selectedMonth, selectedYear, teacherId]);

    const summary = attendance?.summary || attendance?.stats || attendance || {};
    const logs = Array.isArray(attendance?.dailyLogs)
        ? attendance.dailyLogs
        : Array.isArray(attendance?.logs || attendance?.records || attendance?.days || attendance?.attendance)
            ? (attendance.logs || attendance.records || attendance.days || attendance.attendance)
            : [];
    const monthDays = useMemo(() => {
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, index) =>
            `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
        );
    }, [selectedMonth, selectedYear]);
    const logsByDate = new Map(logs.map((log) => [log.date, log]));
    const calendarByDate = new Map(
        (Array.isArray(attendance?.calendarDays) ? attendance.calendarDays : []).map((day) => [day.date, day])
    );
    const visibleMonthDays = monthDays.filter((date) => date <= getDhakaDate()).reverse();
    const counts = {
        present: summary.present ?? summary.totalPresent ?? logs.filter((log) => log.status === 'Present').length,
        absent: summary.absent ?? summary.totalAbsent ?? logs.filter((log) => log.status === 'Absent').length,
        late: summary.late ?? summary.totalLate ?? logs.filter((log) => log.status === 'Late').length,
        leave: summary.leave ?? summary.totalLeave ?? (
            Number(summary.totalLeaveCount || 0) + Number(summary.totalApprovedLeaveCount || 0)
        )
    };

    return (
        <div className="space-y-4 lg:space-y-5">
            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center lg:rounded-3xl lg:p-5">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-800 lg:text-base">
                        <Calendar size={17} className="text-emerald-600" />
                        মাসিক উপস্থিতি ও হাজিরা বিবরণী
                    </h3>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                        মাস ও বছর পরিবর্তন করে উপস্থিত, অনুপস্থিত, দেরি ও ছুটির হিসাব দেখুন
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                    <select
                        aria-label="হাজিরার মাস"
                        value={selectedMonth}
                        onChange={(event) => setSelectedMonth(Number(event.target.value))}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-800 outline-none transition hover:bg-slate-100 focus:border-[#060D1F] sm:w-44"
                    >
                        {MONTHS_BN.map((month) => (
                            <option key={month.val} value={month.val}>{month.label}</option>
                        ))}
                    </select>
                    <select
                        aria-label="হাজিরার বছর"
                        value={selectedYear}
                        onChange={(event) => setSelectedYear(Number(event.target.value))}
                        className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-800 outline-none transition hover:bg-slate-100 focus:border-[#060D1F]"
                    >
                        {years.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/70 bg-white p-14 text-slate-400">
                    <Loader2 className="mb-3 animate-spin text-blue-600" size={32} />
                    <span className="text-xs font-bold">মাসিক হাজিরা লোড হচ্ছে...</span>
                </div>
            ) : (
                <>
                    {error && (
                        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                        <div className="rounded-2xl border border-emerald-200/70 bg-white p-4 shadow-sm transition hover:shadow-md lg:rounded-3xl lg:p-5">
                            <div className="mb-2 flex items-center justify-between text-emerald-600">
                                <span className="text-[11px] font-black">মোট উপস্থিত</span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
                                    <CheckCircle2 size={17} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-slate-800 lg:text-3xl">{counts.present} <span className="text-xs font-bold text-slate-400">দিন</span></p>
                            <p className="mt-1 text-[10px] font-bold text-emerald-600">Present</p>
                        </div>

                        <div className="rounded-2xl border border-red-200/70 bg-white p-4 shadow-sm transition hover:shadow-md lg:rounded-3xl lg:p-5">
                            <div className="mb-2 flex items-center justify-between text-red-600">
                                <span className="text-[11px] font-black">মোট অনুপস্থিত</span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50">
                                    <XCircle size={17} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-red-600 lg:text-3xl">{counts.absent} <span className="text-xs font-bold text-red-300">দিন</span></p>
                            <p className="mt-1 text-[10px] font-bold text-red-500">Absent</p>
                        </div>

                        <div className="rounded-2xl border border-amber-200/70 bg-white p-4 shadow-sm transition hover:shadow-md lg:rounded-3xl lg:p-5">
                            <div className="mb-2 flex items-center justify-between text-amber-600">
                                <span className="text-[11px] font-black">মোট দেরি</span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
                                    <Clock size={17} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-amber-600 lg:text-3xl">{counts.late} <span className="text-xs font-bold text-amber-400">দিন</span></p>
                            <p className="mt-1 text-[10px] font-bold text-amber-600">Late Arrival</p>
                        </div>

                        <div className="rounded-2xl border border-blue-200/70 bg-white p-4 shadow-sm transition hover:shadow-md lg:rounded-3xl lg:p-5">
                            <div className="mb-2 flex items-center justify-between text-blue-600">
                                <span className="text-[11px] font-black">মোট ছুটি</span>
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
                                    <Shield size={17} />
                                </div>
                            </div>
                            <p className="text-2xl font-black text-blue-600 lg:text-3xl">{counts.leave} <span className="text-xs font-bold text-blue-300">দিন</span></p>
                            <p className="mt-1 text-[10px] font-bold text-blue-500">Approved Leave</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                            ['পূর্ববর্তী অবশিষ্ট কোটা', summary.previousQuotaRemaining],
                            ['চলতি মাসের কোটা', summary.currentMonthQuota ?? summary.monthlyAllowedQuota],
                            ['ব্যবহৃত কোটা', summary.totalQuotaUsed],
                            ['মোট অবশিষ্ট কোটা', summary.remainingPaidQuota ?? summary.quotaRemaining]
                        ].map(([label, amount]) => (
                            <div key={label} className="rounded-2xl border border-violet-200/70 bg-violet-50/70 px-4 py-3">
                                <p className="text-[10.5px] font-black text-violet-700">{label}</p>
                                <p className="mt-1 text-lg font-black text-slate-800">
                                    {formatQuota(amount)} <span className="text-[11px] font-bold text-slate-500">দিন</span>
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:rounded-3xl lg:p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-black text-slate-800 lg:text-sm">দিনভিত্তিক হাজিরা (সাম্প্রতিক তারিখ আগে)</h3>
                                <p className="mt-0.5 text-[10px] font-bold text-slate-400">যে দিনে তথ্য নেই, সেটিকে অনুপস্থিত হিসেবে ধরা হয়নি</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                                {logs.length} টি রেকর্ড
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-400">
                                        <th className="px-3 py-2.5">তারিখ (Date)</th>
                                        <th className="px-3 py-2.5">পাঞ্চের সময়</th>
                                        <th className="px-3 py-2.5 text-right">অবস্থা (Status)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {visibleMonthDays.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-8 text-center font-bold text-slate-400">
                                                এই মাসে এখনো কোনো হাজিরার তারিখ নেই
                                            </td>
                                        </tr>
                                    ) : visibleMonthDays.map((date) => {
                                        const item = logsByDate.get(date);
                                        const calendarDay = calendarByDate.get(date);
                                        const status = item?.status || (
                                            calendarDay?.isHoliday
                                                ? 'বন্ধ (Holiday)'
                                                : calendarDay?.dayType === 'MACHINE_OFF'
                                                    ? 'মেশিন বন্ধ'
                                                    : 'রেকর্ড নেই'
                                        );
                                        const badgeClass =
                                            status === 'Present' || status === 'Holiday Duty' || status === 'Official Duty' || status === 'Late (Excused)'
                                                ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                                : status === 'Absent'
                                                    ? 'border-red-200 bg-red-100 text-red-700'
                                                    : status === 'Late'
                                                        ? 'border-amber-200 bg-amber-100 text-amber-700'
                                                        : status === 'বন্ধ (Holiday)'
                                                            ? 'border-amber-200 bg-amber-100 text-amber-800'
                                                            : status === 'মেশিন বন্ধ'
                                                                ? 'border-violet-200 bg-violet-100 text-violet-700'
                                                                : status === 'রেকর্ড নেই'
                                                                    ? 'border-slate-200 bg-slate-100 text-slate-500'
                                                                    : 'border-blue-200 bg-blue-100 text-blue-700';
                                        const punchTime = item?.punchTime
                                            ? new Intl.DateTimeFormat('bn-BD', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true,
                                                timeZone: 'Asia/Dhaka'
                                            }).format(new Date(item.punchTime))
                                            : '—';

                                        return (
                                            <tr key={date} className="transition hover:bg-slate-50/80">
                                                <td className="px-3 py-3 font-black text-slate-800">
                                                    {date}
                                                    {(calendarDay?.title || calendarDay?.reason) && (
                                                        <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
                                                            {calendarDay.title || calendarDay.reason}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 font-mono font-bold text-slate-600">{punchTime}</td>
                                                <td className="px-3 py-3 text-right">
                                                    <span className={`inline-block rounded-full border px-3 py-1 text-[10px] font-black ${badgeClass}`}>
                                                        {status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
