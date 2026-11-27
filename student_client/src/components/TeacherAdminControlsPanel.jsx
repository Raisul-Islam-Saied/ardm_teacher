import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Save, ShieldCheck, UserCog } from 'lucide-react';
import { extractApiErrorMessage } from '../services/axiosClient';
import { teacherPortalApi } from '../services/studentApiService';

const CLASS_OPTIONS = [
    { value: '', label: 'কোনো শ্রেণি বরাদ্দ নয়' },
    ...['প্লে', 'নার্সারি', 'কেজি', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম']
        .map((label) => ({ value: normalizeAssignedClass(label), label }))
];

const PAYMENT_OPTIONS = ['Cash', 'Bank', 'Mobile Banking'];
const EMPLOYMENT_OPTIONS = ['Non-MPO', 'MPO', 'Part-Time', 'Contractual'];
const DIGITS_BN = '০১২৩৪৫৬৭৮৯';

function toEnglishDigits(value) {
    return String(value ?? '').replace(/[০-৯]/g, (digit) => String(DIGITS_BN.indexOf(digit)));
}

function normalizeAssignedClass(value = '') {
    return String(value || '').replace(/\u09AF\u09BC/g, '\u09DF');
}

function toServerAssignedClass(value = '') {
    return normalizeAssignedClass(value).replace(/\u09DF/g, '\u09AF\u09BC');
}

function getInitialFields(teacher) {
    return {
        basicSalary: String(teacher.basicSalary ?? 0),
        paymentMethod: teacher.paymentMethod || 'Cash',
        biometricDeviceId: String(teacher.biometricDeviceId ?? 1),
        customLeaveQuota: String(teacher.customLeaveQuota ?? 2),
        employmentType: teacher.employmentType || 'Non-MPO',
        bankDetails: {
            bankName: '',
            branchName: '',
            accountHolderName: '',
            accountNumber: '',
            routingNumber: '',
            ...(teacher.bankDetails || {})
        },
        assignedClass: normalizeAssignedClass(teacher.assignedClass),
        canEditAssignedClass: Boolean(teacher.assignedClass && teacher.canEditAssignedClass),
        role: teacher.role || 'Teacher',
        registrationStatus: teacher.registrationStatus || 'Approved',
        isActive: teacher.isActive !== false
    };
}

export default function TeacherAdminControlsPanel({ teacher, onUpdated, currentUser }) {
    const [fields, setFields] = useState(() => getInitialFields(teacher));
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        setFields(getInitialFields(teacher));
    }, [teacher]);

    const isSuperAdmin = Boolean(
        currentUser?.isSuperAdmin
        || currentUser?.erpRole === 'SuperAdmin'
        || currentUser?.role === 'SuperAdmin'
    );
    const isPending = teacher.registrationStatus === 'Pending';
    const isApproving = fields.registrationStatus === 'Approved'
        && teacher.registrationStatus !== 'Approved';

    const updateField = (field, value) => {
        setFields((current) => ({ ...current, [field]: value }));
        setError('');
        setMessage('');
    };

    const updateBankField = (field, value) => {
        setFields((current) => ({
            ...current,
            bankDetails: { ...current.bankDetails, [field]: value }
        }));
        setError('');
        setMessage('');
    };

    const handleStatusChange = (registrationStatus) => {
        setFields((current) => ({
            ...current,
            registrationStatus,
            ...(registrationStatus === 'Approved' ? { isActive: true } : {}),
            ...(registrationStatus === 'Rejected' ? { isActive: false } : {})
        }));
        setError('');
        setMessage('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSaving) return;

        const basicSalary = Number(toEnglishDigits(fields.basicSalary));
        const biometricDeviceId = Number(toEnglishDigits(fields.biometricDeviceId));
        const customLeaveQuota = Number(toEnglishDigits(fields.customLeaveQuota));

        if (!Number.isFinite(basicSalary) || basicSalary < 0) {
            setError('মূল বেতন ০ বা তার বেশি হতে হবে।');
            return;
        }
        if (!Number.isInteger(biometricDeviceId) || biometricDeviceId < 1) {
            setError('বায়োমেট্রিক ডিভাইস আইডি ১ বা তার বেশি পূর্ণসংখ্যা হতে হবে।');
            return;
        }
        if (!Number.isFinite(customLeaveQuota) || customLeaveQuota < 0 || customLeaveQuota > 15) {
            setError('ছুটির কোটা ০ থেকে ১৫ এর মধ্যে হতে হবে।');
            return;
        }
        const payload = {
            basicSalary,
            paymentMethod: fields.paymentMethod,
            biometricDeviceId,
            customLeaveQuota,
            employmentType: fields.employmentType,
            bankDetails: Object.fromEntries(
                Object.entries(fields.bankDetails).map(([key, value]) => [key, String(value || '').trim()])
            ),
            assignedClass: toServerAssignedClass(fields.assignedClass),
            canEditAssignedClass: Boolean(fields.assignedClass && fields.canEditAssignedClass),
            role: fields.role,
            registrationStatus: fields.registrationStatus,
            isActive: isApproving ? true : fields.isActive
        };

        setIsSaving(true);
        setError('');
        setMessage('');
        try {
            const updatedTeacher = isApproving
                ? await teacherPortalApi.approveTeacher(teacher._id, payload)
                : await teacherPortalApi.updateTeacher(teacher._id, payload);
            if (!updatedTeacher || typeof updatedTeacher !== 'object') {
                throw new Error('সার্ভার থেকে আপডেট হওয়া শিক্ষকের তথ্য পাওয়া যায়নি।');
            }
            onUpdated(updatedTeacher);
            setMessage(isApproving
                ? 'শিক্ষকের নিবন্ধন অনুমোদিত হয়েছে; বেতন, শ্রেণি ও অ্যাক্সেস সংরক্ষিত হয়েছে।'
                : 'বেতন, শ্রেণি ও অ্যাকাউন্ট সেটিংস সংরক্ষিত হয়েছে।');
        } catch (requestError) {
            setError(extractApiErrorMessage(requestError, 'শিক্ষকের সেটিংস সংরক্ষণ করা যায়নি।'));
        } finally {
            setIsSaving(false);
        }
    };

    const inputClassName = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:border-[#D4A843] focus:ring-2 focus:ring-[#D4A843]/15';
    const labelClassName = 'mb-1.5 block text-xs font-black text-slate-600';

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-3 bg-[#060D1F] px-5 py-4 text-white">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4A843]/15 text-[#F7E09A]">
                            <ShieldCheck size={20} />
                        </span>
                        <div>
                            <h2 className="font-bengali text-base font-black">অনুমোদন ও অ্যাকাউন্ট নিয়ন্ত্রণ</h2>
                            <p className="mt-0.5 text-[10px] font-bold text-slate-300">Salary · Class assignment · Portal access</p>
                        </div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${
                        isPending
                            ? 'border-amber-300/30 bg-amber-400/15 text-amber-200'
                            : fields.isActive
                                ? 'border-emerald-300/30 bg-emerald-400/15 text-emerald-200'
                                : 'border-red-300/30 bg-red-400/15 text-red-200'
                    }`}>
                        {isPending ? 'অনুমোদনের অপেক্ষায়' : fields.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                    </span>
                </header>

                <div className="space-y-5 p-4 sm:p-6">
                    {isPending && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="font-bengali text-sm font-black text-amber-900">এই শিক্ষক এখনো অনুমোদিত নন</p>
                            <p className="mt-1 font-bengali text-xs leading-5 text-amber-800">
                                বেতন, পেমেন্ট পদ্ধতি, শ্রেণি ও অ্যাক্সেস যাচাই করে অনুমোদন দিন। অনুমোদনের সঙ্গে অ্যাকাউন্ট সক্রিয় হবে।
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <label>
                            <span className={labelClassName}>মাসিক মূল বেতন (টাকা)</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={fields.basicSalary}
                                onChange={(event) => updateField('basicSalary', event.target.value)}
                                className={inputClassName}
                                required
                            />
                        </label>
                        <label>
                            <span className={labelClassName}>পেমেন্ট পদ্ধতি</span>
                            <select value={fields.paymentMethod} onChange={(event) => updateField('paymentMethod', event.target.value)} className={inputClassName}>
                                {PAYMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </label>
                        <label>
                            <span className={labelClassName}>চাকরির ধরন</span>
                            <select value={fields.employmentType} onChange={(event) => updateField('employmentType', event.target.value)} className={inputClassName}>
                                {EMPLOYMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                        </label>
                        <label>
                            <span className={labelClassName}>বায়োমেট্রিক ডিভাইস আইডি</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={fields.biometricDeviceId}
                                onChange={(event) => updateField('biometricDeviceId', toEnglishDigits(event.target.value).replace(/\D/g, ''))}
                                className={inputClassName}
                                required
                            />
                        </label>
                        <label>
                            <span className={labelClassName}>মাসিক ছুটির কোটা (দিন)</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={fields.customLeaveQuota}
                                onChange={(event) => updateField('customLeaveQuota', toEnglishDigits(event.target.value).replace(/[^\d.]/g, ''))}
                                className={inputClassName}
                                required
                            />
                        </label>
                        <label>
                            <span className={labelClassName}>পোর্টাল অ্যাক্সেস রোল</span>
                            <select value={fields.role} onChange={(event) => updateField('role', event.target.value)} className={inputClassName}>
                                <option value="Teacher">Teacher</option>
                                <option value="Admin">Admin</option>
                                {isSuperAdmin && <option value="SuperAdmin">SuperAdmin</option>}
                            </select>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {[
                            ['bankName', 'ব্যাংকের নাম'],
                            ['branchName', 'শাখা'],
                            ['accountHolderName', 'হিসাবধারীর নাম'],
                            ['accountNumber', 'হিসাব নম্বর'],
                            ['routingNumber', 'রাউটিং নম্বর']
                        ].map(([field, label]) => (
                            <label key={field}>
                                <span className={labelClassName}>{label}</span>
                                <input
                                    type="text"
                                    value={fields.bankDetails[field] || ''}
                                    onChange={(event) => updateBankField(field, event.target.value)}
                                    className={inputClassName}
                                    maxLength={100}
                                />
                            </label>
                        ))}
                    </div>

                    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <UserCog size={17} className="text-indigo-700" />
                            <div>
                                <h3 className="font-bengali text-sm font-black text-slate-800">শ্রেণি ও কাজের অনুমতি</h3>
                                <p className="font-bengali text-[11px] text-slate-500">শ্রেণি বরাদ্দ ও শিক্ষার্থী ব্যবস্থাপনার অধিকার দিন</p>
                            </div>
                        </div>
                        <label className="block">
                            <span className={labelClassName}>ক্লাস টিচার হিসেবে শ্রেণি</span>
                            <select
                                value={fields.assignedClass}
                                onChange={(event) => {
                                    updateField('assignedClass', event.target.value);
                                    if (!event.target.value) updateField('canEditAssignedClass', false);
                                }}
                                className={inputClassName}
                            >
                                {CLASS_OPTIONS.map((option) => (
                                    <option key={option.value || 'none'} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        {fields.assignedClass ? (
                            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-[#D4A843]/35 bg-[#FFF9E8] px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={fields.canEditAssignedClass}
                                    onChange={(event) => updateField('canEditAssignedClass', event.target.checked)}
                                    className="mt-1 h-4 w-4 accent-[#060D1F]"
                                />
                                <span>
                                    <span className="block font-bengali text-xs font-black text-[#060D1F]">শ্রেণি-শিক্ষক সম্পাদনা অনুমতি</span>
                                    <span className="mt-0.5 block font-bengali text-[11px] leading-5 text-slate-600">
                                        {fields.assignedClass} শ্রেণির শিক্ষার্থীদের তথ্য যোগ ও সম্পাদনা করতে পারবেন।
                                    </span>
                                </span>
                            </label>
                        ) : (
                            <p className="mt-2 font-bengali text-[11px] text-slate-500">
                                শ্রেণি বরাদ্দ না থাকলে ক্লাস-ভিত্তিক সম্পাদনা অনুমতি প্রযোজ্য হবে না।
                            </p>
                        )}
                    </section>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label>
                            <span className={labelClassName}>নিবন্ধনের অবস্থা</span>
                            <select
                                value={fields.registrationStatus}
                                onChange={(event) => handleStatusChange(event.target.value)}
                                className={inputClassName}
                            >
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                            <input
                                type="checkbox"
                                checked={isApproving ? true : fields.isActive}
                                disabled={isApproving}
                                onChange={(event) => updateField('isActive', event.target.checked)}
                                className="h-4 w-4 accent-[#060D1F]"
                            />
                            {isPending && fields.registrationStatus === 'Approved'
                                ? 'অনুমোদনের পর অ্যাকাউন্ট সক্রিয় হবে'
                                : 'শিক্ষক অ্যাকাউন্ট সক্রিয়'}
                        </label>
                    </div>

                    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-bengali text-xs font-bold text-red-700">{error}</p>}
                    {message && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-bengali text-xs font-bold text-emerald-700"><CheckCircle2 size={16} className="shrink-0" />{message}</p>}

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-bengali text-[11px] leading-5 text-slate-400">
                            {isApproving
                                ? 'অনুমোদনের সঙ্গে শিক্ষক লগইন ও নির্বাচিত অ্যাক্সেস সক্রিয় হবে।'
                                : 'সেভ করলে বেতন, ব্যাংক, শ্রেণি ও অ্যাকাউন্ট সেটিংস প্রয়োগ হবে।'}
                        </p>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4A843] to-amber-500 px-5 py-2.5 text-sm font-black text-[#060D1F] shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : isApproving ? <CheckCircle2 size={16} /> : <Save size={16} />}
                            {isSaving ? 'সংরক্ষণ হচ্ছে...' : isApproving ? 'অনুমোদন ও সেটিংস সংরক্ষণ' : 'সেটিংস সংরক্ষণ'}
                        </button>
                    </div>
                </div>
            </section>
        </form>
    );
}
