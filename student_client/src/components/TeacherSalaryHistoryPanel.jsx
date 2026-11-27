import { useEffect, useState } from 'react';
import { Banknote, Loader2 } from 'lucide-react';
import { teacherPortalApi } from '../services/studentApiService';

const MONTHS_BN = [
    { val: 1, label: 'জানুয়ারি' },
    { val: 2, label: 'ফেব্রুয়ারি' },
    { val: 3, label: 'মার্চ' },
    { val: 4, label: 'এপ্রিল' },
    { val: 5, label: 'মে' },
    { val: 6, label: 'জুন' },
    { val: 7, label: 'জুলাই' },
    { val: 8, label: 'আগস্ট' },
    { val: 9, label: 'সেপ্টেম্বর' },
    { val: 10, label: 'অক্টোবর' },
    { val: 11, label: 'নভেম্বর' },
    { val: 12, label: 'ডিসেম্বর' }
];

const formatBDT = (amount) =>
    new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 0 }).format(Number(amount || 0));

const getApiErrorMessage = (error) =>
    error?.response?.data?.message || error?.message || 'বেতন হিস্ট্রি লোড করা যায়নি।';

function extractSalarySheets(response) {
    if (Array.isArray(response)) return response;
    return response?.sheets || response?.salaries || response?.records || [];
}

function belongsToTeacher(salary, teacherId, teacherCode) {
    const populatedTeacher = salary.teacherId && typeof salary.teacherId === 'object'
        ? salary.teacherId
        : salary.teacher && typeof salary.teacher === 'object'
            ? salary.teacher
            : null;
    const salaryTeacherId = String(populatedTeacher?._id || salary.teacherId || salary.teacher || '');
    const salaryTeacherCode = String(salary.teacherCode || populatedTeacher?.teacherCode || '');

    return Boolean(
        (teacherId && salaryTeacherId === teacherId)
        || (teacherCode && salaryTeacherCode === teacherCode)
    );
}

export default function TeacherSalaryHistoryPanel({ teacherId, teacherCode, viewerId }) {
    const targetTeacherId = String(teacherId || viewerId || '');
    const targetTeacherCode = String(teacherCode || '');
    const [salaryList, setSalaryList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        setIsLoading(true);
        setError('');

        teacherPortalApi
            .getMySalaryHistory(teacherId ? { teacherId } : {})
            .then((response) => {
                if (!active) return;
                const sheets = extractSalarySheets(response);
                setSalaryList(sheets.filter((salary) => (
                    belongsToTeacher(salary, targetTeacherId, targetTeacherCode)
                )));
            })
            .catch((requestError) => {
                if (active) {
                    setSalaryList([]);
                    setError(getApiErrorMessage(requestError));
                }
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [teacherId, targetTeacherCode, targetTeacherId]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:rounded-3xl lg:p-5">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-800 lg:text-base">
                        <Banknote size={18} className="text-emerald-600" />
                        বেতন ও পেরোল হিস্ট্রি (Salary History)
                    </h3>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                        প্রতি মাসের মূল বেতন, কর্তন ও নিট প্রাপ্য বেতনের হিসাব
                    </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                    মোট {salaryList.length} মাস
                </span>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/70 bg-white p-14 text-slate-400">
                    <Loader2 className="mb-3 animate-spin text-blue-600" size={32} />
                    <span className="text-xs font-bold">বেতন হিস্ট্রি লোড হচ্ছে...</span>
                </div>
            ) : salaryList.length === 0 ? (
                <div className="rounded-3xl border border-slate-200/70 bg-white p-12 text-center">
                    {error ? (
                        <p role="alert" className="text-xs font-bold text-red-600">{error}</p>
                    ) : (
                        <p className="text-xs font-bold text-slate-400">এখনো কোনো বেতন শিট তৈরি হয়নি</p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:gap-4">
                    {salaryList.map((salary, index) => {
                        const monthName = MONTHS_BN.find((month) => month.val === Number(salary.month))?.label || salary.month;
                        const basic = Number(salary.basicSalarySnapshot) || 0;
                        const effectiveBasic = Number(salary.proRataInfo?.effectiveBasicSalary ?? basic);
                        const attendanceDeduction = Number(salary.leaveAndAbsentDeductionAmount) || 0;
                        const loanDeduction = Number(salary.loanDeduction?.installmentAmount) || 0;
                        const extraDeduction = Number(salary.extraDeduction) || 0;
                        const adjustment = Number(salary.customAdjustment?.amount) || 0;
                        const totalDeduction = attendanceDeduction + loanDeduction + extraDeduction + Math.max(0, -adjustment);
                        const netPayable = Number(salary.netPayableSalary) || 0;

                        return (
                            <article
                                key={salary._id || index}
                                className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-emerald-300 lg:rounded-3xl lg:p-5"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-base font-black text-slate-800">
                                            {monthName} {salary.year || ''}
                                        </p>
                                        <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                                            {salary.proRataInfo?.isProRated ? 'কার্যকর মূল বেতন' : 'মূল বেতন'}: ৳{formatBDT(effectiveBasic)}
                                        </p>
                                    </div>
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                                        বেতন শিট
                                    </span>
                                </div>

                                <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-bold text-slate-500">হাজিরা/ছুটি কর্তন</span>
                                        <span className="font-black text-red-600">− ৳ {formatBDT(attendanceDeduction)}</span>
                                    </div>
                                    {!!loanDeduction && (
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-bold text-slate-500">লোন/অগ্রিম কর্তন</span>
                                            <span className="font-black text-red-600">− ৳ {formatBDT(loanDeduction)}</span>
                                        </div>
                                    )}
                                    {!!extraDeduction && (
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-bold text-slate-500">অতিরিক্ত কর্তন</span>
                                            <span className="font-black text-red-600">− ৳ {formatBDT(extraDeduction)}</span>
                                        </div>
                                    )}
                                    {!!salary.bonusAmount && (
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-bold text-slate-500">{salary.bonusTitle || 'বোনাস'}</span>
                                            <span className="font-black text-emerald-700">+ ৳ {formatBDT(salary.bonusAmount)}</span>
                                        </div>
                                    )}
                                    {!!adjustment && (
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-bold text-slate-500">সমন্বয়</span>
                                            <span className={`font-black ${adjustment > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                                {adjustment > 0 ? '+' : '−'} ৳ {formatBDT(Math.abs(adjustment))}
                                            </span>
                                        </div>
                                    )}
                                    {!!salary.extraAllowance && (
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-bold text-slate-500">অতিরিক্ত ভাতা</span>
                                            <span className="font-black text-emerald-700">+ ৳ {formatBDT(salary.extraAllowance)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-3 border-t border-dashed border-slate-100 pt-1">
                                        <span className="font-black text-slate-600">মোট কর্তন</span>
                                        <span className="font-black text-red-700">৳ {formatBDT(totalDeduction)}</span>
                                    </div>
                                </div>

                                <div className="-mx-2 flex items-center justify-between rounded-xl border-t border-slate-100 bg-emerald-50/50 px-3 py-2.5 text-xs">
                                    <span className="font-black text-slate-700">নিট প্রাপ্য বেতন:</span>
                                    <span className="text-lg font-black text-emerald-700">৳ {formatBDT(netPayable)}</span>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
