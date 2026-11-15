/**
 * ARDM Enterprise ERP — Military-Grade Secure Login Gateway (Step 11)
 * Features:
 * - Smart Dual Identifier: 11-Digit BD Mobile Number (01XXXXXXXXX) OR 10-Digit Teacher ID (10XXXXXXXX)
 * - Automatic Bengali-to-English digit normalization on live typing
 * - Persistent 15-Minute Bruteforce Lockout Countdown Timer (survives page reload via sessionStorage)
 * - Synchronized payload ({ phone, identifier, teacherCode, password }) to prevent 400 Bad Request
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    Lock,
    Phone,
    Fingerprint,
    KeyRound,
    LogIn,
    ShieldAlert,
    ShieldCheck,
    Clock,
    UserPlus,
    AlertCircle,
    CheckCircle2,
    Sparkles,
    HelpCircle
} from 'lucide-react';
import { INSTITUTION_INFO } from '@constants/app.constants';
import { Button, FormInput, Badge, Modal } from '@components/ui';
import { useToast } from '@context/ToastContext';
import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';
import { extractPureDigits, toBengaliDigits } from '@utils/formatters';
import { cn } from '@utils/cn';

const LOCKOUT_STORAGE_KEY = 'ardm_erp_login_lockout_until_v2';

/**
 * ইনপুটটি ১১ সংখ্যার মোবাইল নম্বর নাকি ১০ সংখ্যার টিচার আইডি তা স্বয়ংক্রিয়ভাবে শনাক্ত করার ফাংশন
 */
function analyzeLoginIdentifier(rawInput) {
    let digits = extractPureDigits(rawInput);

    // কেউ +8801... বা 8801... পেস্ট করলে ১১ ডিজিটে নামিয়ে আনা
    if (digits.startsWith('8801') && digits.length === 13) {
        digits = digits.slice(2);
    }

    if (!digits) {
        return {
            valid: false,
            type: 'NONE',
            cleanValue: '',
            badgeText: 'Mobile / 10-Digit ID',
            error: 'মোবাইল নম্বর অথবা ১০ সংখ্যার টিচার আইডি প্রদান করা আবশ্যক।'
        };
    }

    // ১. যদি ১১ সংখ্যার বাংলাদেশী মোবাইল নম্বর হয় (013 - 019 দিয়ে শুরু)
    if (/^01[3-9]\d{8}$/.test(digits)) {
        return {
            valid: true,
            type: 'MOBILE',
            cleanValue: digits,
            badgeText: '১১-ডিজিট মোবাইল নম্বর ✓',
            error: ''
        };
    }

    // ২. যদি ১০ সংখ্যার টিচার আইডি হয় (10 দিয়ে শুরু ১০ ডিজিট)
    if (/^10\d{8}$/.test(digits)) {
        return {
            valid: true,
            type: 'TEACHER_ID',
            cleanValue: digits,
            badgeText: '১০-ডিজিট টিচার আইডি ✓',
            error: ''
        };
    }

    // ৩. টাইপ করার মাঝামাঝি অবস্থায় সুনির্দিষ্ট গাইডলাইন দেওয়া
    if (digits.startsWith('01')) {
        return {
            valid: false,
            type: 'PARTIAL_MOBILE',
            cleanValue: digits,
            badgeText: `মোবাইল (${digits.length}/11)`,
            error: `মোবাইল নম্বর অবশ্যই ১১ সংখ্যার হতে হবে (দিয়েছেন ${toBengaliDigits(digits.length)} সংখ্যা)।`
        };
    }

    if (digits.startsWith('10')) {
        return {
            valid: false,
            type: 'PARTIAL_ID',
            cleanValue: digits,
            badgeText: `টিচার আইডি (${digits.length}/10)`,
            error: `টিচার আইডি অবশ্যই ১০ সংখ্যার হতে হবে (দিয়েছেন ${toBengaliDigits(digits.length)} সংখ্যা)।`
        };
    }

    return {
        valid: false,
        type: 'INVALID',
        cleanValue: digits,
        badgeText: 'অবৈধ ফরম্যাট',
        error: 'সঠিক মোবাইল নম্বর (01XXXXXXXXX) অথবা ১০-ডিজিট টিচার আইডি (10XXXXXXXX) দিন।'
    };
}

export default function Login({ onLoginSuccess, onSwitchToPublicRegistration }) {
    const toast = useToast();

    // ১. ফর্ম স্টেট
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [touched, setTouched] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    // ২. পারসিস্টেন্ট ব্রুট-ফোর্স লকআউট স্টেট (রিলোড করলেও সেশন স্টোরেজ থেকে সময় হিসাব রাখবে)
    const [lockUntilTimestamp, setLockUntilTimestamp] = useState(() => {
        try {
            const saved = sessionStorage.getItem(LOCKOUT_STORAGE_KEY);
            const parsed = saved ? Number(saved) : 0;
            return parsed > Date.now() ? parsed : 0;
        } catch (e) {
            return 0;
        }
    });
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    // ৩. প্রতি সেকেন্ডে লকআউট কাউন্টডাউন আপডেট করা
    useEffect(() => {
        if (!lockUntilTimestamp) {
            setRemainingSeconds(0);
            return;
        }

        const updateClock = () => {
            const diffSec = Math.max(0, Math.ceil((lockUntilTimestamp - Date.now()) / 1000));
            setRemainingSeconds(diffSec);

            if (diffSec <= 0) {
                setLockUntilTimestamp(0);
                try {
                    sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
                } catch (e) {
                    // Ignore
                }
            }
        };

        updateClock();
        const intervalId = setInterval(updateClock, 1000);
        return () => clearInterval(intervalId);
    }, [lockUntilTimestamp]);

    // ৪. লকআউট অ্যাক্টিভেট করার ফাংশন (ব্যাকএন্ড HTTP 423 দিলে অথবা ৫ বার ভুল করলে)
    const triggerAccountLockout = (seconds = 15 * 60) => {
        const targetTime = Date.now() + seconds * 1000;
        setLockUntilTimestamp(targetTime);
        try {
            sessionStorage.setItem(LOCKOUT_STORAGE_KEY, String(targetTime));
        } catch (e) {
            // Ignore
        }
    };

    // ৫. লাইভ আইডেন্টিফায়ার ও পাসওয়ার্ড বিশ্লেষণ
    const idAnalysis = useMemo(() => analyzeLoginIdentifier(identifier), [identifier]);
    const isPasswordValid = String(password || '').trim().length >= 6;
    const isLocked = remainingSeconds > 0;

    // ৬. লগইন সাবমিট হ্যান্ডলার
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        if (isLocked || isSubmitting) return;

        setTouched({ identifier: true, password: true });

        const errors = {};
        if (!idAnalysis.valid) {
            errors.identifier = idAnalysis.error;
        }
        if (!isPasswordValid) {
            errors.password = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            toast.error(Object.values(errors)[0]);
            return;
        }

        setFieldErrors({});
        setIsSubmitting(true);

        try {
            // ব্যাকএন্ডের auth.validator.js এবং auth.controller.js যে নামেই (phone বা identifier) ফিল্ড খুঁজুক, কোনো 400 যেন না হয়
            const payload = {
                phone: idAnalysis.cleanValue,
                identifier: idAnalysis.cleanValue,
                teacherCode: idAnalysis.cleanValue,
                password: String(password).trim()
            };

            const res = await axiosClient.post('/auth/login', payload);
            const resBody = res.data?.data || res.data || {};

            const token = resBody.token || resBody.accessToken;
            const userObj = resBody.teacher || resBody.user || resBody;

            if (!token || !userObj?._id) {
                throw new Error('সার্ভার থেকে বৈধ লগইন সেশন পাওয়া যায়নি।');
            }

            toast.success(`আলহামদুলিল্লাহ! স্বাগতম, ${userObj.fullNameBng || userObj.fullNameEng || 'সম্মানিত শিক্ষক'}।`);

            if (typeof onLoginSuccess === 'function') {
                onLoginSuccess(userObj, token);
            }
        } catch (err) {
            if (err.response?.status === 423) {
                const retryAfterSeconds = Number(err.response?.data?.meta?.retryAfterSeconds);
                triggerAccountLockout(
                    Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
                        ? retryAfterSeconds
                        : 15 * 60
                );
                toast.error(extractApiErrorMessage(err, 'নিরাপত্তার কারণে লগইন সাময়িকভাবে লক করা হয়েছে।'));
                return;
            }

            if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
                setFieldErrors({
                    identifier: err.fieldErrors.phone || err.fieldErrors.identifier || '',
                    password: err.fieldErrors.password || ''
                });
            }

            toast.error(extractApiErrorMessage(err, 'মোবাইল নম্বর/আইডি অথবা পাসওয়ার্ড সঠিক নয়।'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // কাউন্টডাউন ঘড়ি ফরম্যাট করা (MM:SS)
    const minutesPart = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const secondsPart = String(remainingSeconds % 60).padStart(2, '0');
    const lockoutProgressPercent = Math.min(100, Math.round((remainingSeconds / (15 * 60)) * 100));

    return (
        <div className="min-h-[calc(100vh-56px)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
            <div className="max-w-[460px] w-full mx-auto">

                {/* =============================================================
                    1. OFFICIAL MADRASAH CREST & SECURITY HEADER
                   ============================================================= */}
                <header className="text-center mb-7 animate-fade-down">
                    <div className="flex justify-center mb-2.5">
                        <div className="madrasah-crest">
                            {INSTITUTION_INFO.crestLetterBng}
                        </div>
                    </div>

                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-deep tracking-tight">
                        {INSTITUTION_INFO.nameEng}
                    </h1>

                    <p className="text-xs sm:text-sm text-ink-soft mt-1">
                        Enterprise Portal Gateway &nbsp;·&nbsp;{' '}
                        <span className="font-bengali font-semibold text-emerald">
                            {INSTITUTION_INFO.nameBng}
                        </span>
                    </p>
                </header>

                {/* =============================================================
                    2. LOGIN OR ACCOUNT LOCKOUT NOTICE
                   ============================================================= */}
                <main className="ledger-surface p-6 sm:p-8 lg:p-9 bg-paper-panel animate-fade-up">

                    {isLocked ? (
                        /* -----------------------------------------------------
                           ACCOUNT LOCKOUT NOTICE
                           ----------------------------------------------------- */
                        <div className="text-center py-3 animate-pop-in">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-danger-bg border-2 border-danger/35 flex items-center justify-center text-danger shadow-sm animate-shake">
                                <ShieldAlert className="w-8 h-8" />
                            </div>

                            <Badge variant="danger" size="md" dot className="mb-2">
                                নিরাপত্তাজনিত সাময়িক বিরতি
                            </Badge>

                            <h2 className="font-bengali text-xl sm:text-2xl font-bold text-danger">
                                অ্যাকাউন্ট সাময়িকভাবে লক করা হয়েছে!
                            </h2>

                            <p className="font-bengali text-xs sm:text-[13px] text-ink-soft mt-2 leading-relaxed">
                                একাধিকবার ভুল পাসওয়ার্ড দেওয়ায় এই অ্যাকাউন্টে লগইন সাময়িকভাবে বন্ধ করা হয়েছে। নিচের সময় শেষ হলে আবার চেষ্টা করুন।
                            </p>

                            {/* লাইভ ডিজিটাল কাউন্টডাউন ঘড়ি */}
                            <div className="my-6 p-5 rounded-2xl bg-gradient-to-r from-danger-deep via-danger to-danger-deep text-white border border-gold/40 shadow-ledger">
                                <span className="font-mono text-[10px] uppercase tracking-widest text-gold-soft block mb-1">
                                    আবার চেষ্টা করতে বাকি
                                </span>

                                <div className="flex items-center justify-center gap-2 font-mono text-4xl sm:text-5xl font-bold tracking-widest my-1">
                                    <Clock className="w-7 h-7 text-gold-soft animate-pulse mr-1" />
                                    <span>{minutesPart}</span>
                                    <span className="animate-pulse text-gold-soft">:</span>
                                    <span>{secondsPart}</span>
                                </div>

                                <span className="font-bengali text-xs text-gold-soft/90 block mt-1">
                                    ({toBengaliDigits(minutesPart)} মিনিট {toBengaliDigits(secondsPart)} সেকেন্ড বাকি)
                                </span>

                                {/* প্রোগ্রেস বার */}
                                <div className="w-full h-1.5 bg-black/25 rounded-full overflow-hidden mt-4">
                                    <div
                                        className="h-full bg-gold-soft transition-all duration-1000 rounded-full"
                                        style={{ width: `${lockoutProgressPercent}%` }}
                                    />
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-paper border border-ink-faint text-left text-xs font-bengali text-ink-soft space-y-1">
                                <p className="font-bold text-emerald-deep">কেন এটি ঘটেছে?</p>
                                <p>
                                    নিরাপত্তার জন্য কিছুক্ষণ অপেক্ষা করতে হবে। সমস্যা চলতে থাকলে প্রশাসকের সঙ্গে যোগাযোগ করুন।
                                </p>
                            </div>

                        </div>
                    ) : (
                        /* -----------------------------------------------------
                           NORMAL LOGIN FORM (Mobile or 10-Digit ID + Password)
                           ----------------------------------------------------- */
                        <form onSubmit={handleLoginSubmit} noValidate>
                            {/* ফর্ম হেডার */}
                            <div className="flex items-start justify-between gap-3 pb-5 mb-6 border-b border-ink-faint">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="gold" size="sm" mono>
                                            AUTH GATE · STEP 11
                                        </Badge>
                                        <Badge variant="emerald-subtle" size="sm">
                                            দ্বিস্তর নিরাপত্তা
                                        </Badge>
                                    </div>
                                    <h2 className="font-bengali text-xl sm:text-2xl font-bold text-emerald-deep mt-1">
                                        অ্যাডমিন ও শিক্ষক পোর্টাল লগইন
                                    </h2>
                                    <p className="font-bengali text-xs text-ink-soft mt-0.5">
                                        মোবাইল নম্বর অথবা ১০-ডিজিট টিচার আইডি দিয়ে প্রবেশ করুন
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsHelpModalOpen(true)}
                                    className="p-2 rounded-full text-ink-muted hover:text-emerald hover:bg-emerald-subtle transition-colors"
                                    title="লগইন সহায়িকা"
                                >
                                    <HelpCircle className="w-5 h-5" />
                                </button>
                            </div>

                            {/* ভুল চেষ্টার সতর্কবার্তা (যদি ১ থেকে ৪ বার ভুল হয়ে থাকে) */}
                            {failedAttemptsCount > 0 && (
                                <div className="mb-5 p-3 rounded-xl bg-warning-bg border border-warning-border flex items-center justify-between gap-2 text-xs font-bengali text-warning-deep animate-shake">
                                    <span className="flex items-center gap-1.5 font-semibold">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        সতর্কবার্তা: ভুল পাসওয়ার্ড চেষ্টা ({toBengaliDigits(failedAttemptsCount)}/৫ বার)
                                    </span>
                                    <span className="font-mono text-[11px] font-bold">
                                        {5 - failedAttemptsCount} left
                                    </span>
                                </div>
                            )}

                            {/* ইনপুট ১: মোবাইল নম্বর অথবা ১০-ডিজিট টিচার আইডি */}
                            <FormInput
                                labelEng="Mobile or 10-Digit Teacher ID"
                                labelBng="মোবাইল নম্বর অথবা ১০-ডিজিট টিচার আইডি"
                                name="identifier"
                                variant="erp"
                                inputMode="numeric"
                                leftIcon={idAnalysis.type === 'TEACHER_ID' ? Fingerprint : Phone}
                                value={identifier}
                                onChange={(e) => {
                                    // বাংলা সংখ্যা টাইপ করলেও সাথে সাথে ইংরেজি ডিজিটে রূপান্তর করে ১১ ডিজিট পর্যন্ত রাখা
                                    const pure = extractPureDigits(e.target.value).slice(0, 13);
                                    const normalized =
                                        pure.startsWith('8801') && pure.length === 13
                                            ? pure.slice(2)
                                            : pure.slice(0, 11);
                                    setIdentifier(normalized);
                                    if (fieldErrors.identifier) {
                                        setFieldErrors((prev) => ({ ...prev, identifier: '' }));
                                    }
                                }}
                                onBlur={() => setTouched((prev) => ({ ...prev, identifier: true }))}
                                placeholder="018XXXXXXXX বা 1026030301"
                                required
                                isMonoText
                                isValid={idAnalysis.valid}
                                error={
                                    fieldErrors.identifier ||
                                    (touched.identifier && !idAnalysis.valid ? idAnalysis.error : '')
                                }
                                rightElement={
                                    identifier.length > 0 ? (
                                        <span
                                            className={cn(
                                                'font-bengali text-[10.5px] px-2 py-0.5 rounded-full font-bold transition-colors',
                                                idAnalysis.valid
                                                    ? 'bg-success-bg text-success border border-success-border'
                                                    : 'bg-paper-deep text-ink-muted'
                                            )}
                                        >
                                            {idAnalysis.badgeText}
                                        </span>
                                    ) : null
                                }
                                hint="বাংলা বা ইংরেজি যেকোনো সংখ্যায় ১১-ডিজিট মোবাইল বা ১০-ডিজিট আইডি লিখুন।"
                            />

                            {/* ইনপুট ২: পাসওয়ার্ড (Show/Hide আইকনসহ) */}
                            <FormInput
                                labelEng="Portal Password"
                                labelBng="অ্যাকাউন্ট পাসওয়ার্ড"
                                name="password"
                                type="password"
                                variant="erp"
                                leftIcon={KeyRound}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (fieldErrors.password) {
                                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                                    }
                                }}
                                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                                placeholder="••••••••••"
                                required
                                isMonoText
                                isValid={isPasswordValid}
                                error={
                                    fieldErrors.password ||
                                    (touched.password && !isPasswordValid
                                        ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
                                        : '')
                                }
                            />

                            {/* লগইন সাবমিট বাটন */}
                            <Button
                                type="submit"
                                variant="emerald"
                                size="lg"
                                fullWidth
                                isLoading={isSubmitting}
                                loadingText="নিরাপত্তা যাচাই করা হচ্ছে..."
                                leftIcon={LogIn}
                            >
                                <span className="font-bengali">নিরাপদে পোর্টালে প্রবেশ করুন</span>
                            </Button>

                            {/* নিচে পাবলিক রেজিস্ট্রেশন লিংক */}
                            <div className="mt-6 pt-5 border-t border-ink-faint flex flex-wrap items-center justify-between gap-3 text-xs font-bengali">
                                <span className="text-ink-soft">
                                    নতুন শিক্ষক বা কর্মচারী? এখনো নিবন্ধন করেননি?
                                </span>

                                {onSwitchToPublicRegistration && (
                                    <button
                                        type="button"
                                        onClick={onSwitchToPublicRegistration}
                                        className="inline-flex items-center gap-1.5 font-bold text-emerald hover:text-gold-deep transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        নতুন শিক্ষক নিবন্ধন ফর্ম ওপেন করুন →
                                    </button>
                                )}
                            </div>
                        </form>
                    )}
                </main>

                <footer className="text-center mt-6">
                    <p className="font-bengali text-xs text-ink-soft opacity-80">
                        {INSTITUTION_INFO.developerCreditBng}
                    </p>
                </footer>

                {/* লগইন সহায়িকা মডাল */}
                <Modal
                    isOpen={isHelpModalOpen}
                    onClose={() => setIsHelpModalOpen(false)}
                    size="sm"
                    titleEng="Portal Access Guide"
                    titleBng="লগইন ও পাসওয়ার্ড সহায়িকা"
                    footer={
                        <Button variant="emerald" size="sm" onClick={() => setIsHelpModalOpen(false)}>
                            <span className="font-bengali">বুঝতে পেরেছি</span>
                        </Button>
                    }
                >
                    <div className="space-y-3 text-xs font-bengali text-ink-soft leading-relaxed">
                        <div className="p-3 rounded-xl bg-paper border border-ink-faint">
                            <p className="font-bold text-emerald-deep mb-1">
                                ১. লগইন আইডি কী দেবেন?
                            </p>
                            <p>
                                আপনার নিবন্ধিত ১১ সংখ্যার মোবাইল নম্বর (যেমন: <b className="font-mono">01812345678</b>) অথবা ডিজিটাল রেজিস্ট্রি কার্ডের ১০ সংখ্যার টিচার আইডি (যেমন: <b className="font-mono">1026030301</b>)।
                            </p>
                        </div>

                        <div className="p-3 rounded-xl bg-paper border border-ink-faint">
                            <p className="font-bold text-emerald-deep mb-1">
                                ২. পাসওয়ার্ড ভুলে গেলে কী করবেন?
                            </p>
                            <p>
                                নিবন্ধনের সময় নির্ধারিত পাসওয়ার্ড ব্যবহার করুন। ভুলে গেলে প্রশাসকের সঙ্গে যোগাযোগ করে পাসওয়ার্ড রিসেট করুন।
                            </p>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-subtle border border-emerald-border">
                            <p className="font-bold text-emerald-deep mb-1">
                                ৩. পাবলিক নিবন্ধন অনুমোদন:
                            </p>
                            <p>
                                শিক্ষক নিজে অনলাইন ফর্ম পূরণ করলে সুপার বা অ্যাডমিন ড্যাশবোর্ড থেকে সেটি <b>Approve</b> করার পর পোর্টালে লগইন সচল হবে।
                            </p>
                        </div>
                    </div>
                </Modal>
            </div>
        </div>
    );
}
