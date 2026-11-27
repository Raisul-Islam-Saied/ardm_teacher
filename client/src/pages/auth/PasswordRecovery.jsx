import React, { useState } from 'react';
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { Button, FormInput } from '@components/ui';
import { useToast } from '@context/ToastContext';
import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function PasswordRecovery() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const toast = useToast();
    const token = searchParams.get('token') || '';
    const isResetMode = Boolean(token);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting || isComplete) return;
        setError('');

        if (isResetMode && password !== confirmPassword) {
            setError('দুই ঘরে একই নতুন পাসওয়ার্ড লিখুন।');
            return;
        }
        if (isResetMode && (password.length < 6 || password.length > 64)) {
            setError('নতুন পাসওয়ার্ড ৬ থেকে ৬৪ অক্ষরের মধ্যে হতে হবে।');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isResetMode) {
                await axiosClient.post('/auth/reset-password', {
                    token,
                    newPassword: password
                });
            } else {
                await axiosClient.post('/auth/forgot-password', {
                    email: email.trim().toLowerCase()
                });
            }
            setIsComplete(true);
        } catch (requestError) {
            const message = extractApiErrorMessage(
                requestError,
                isResetMode
                    ? 'পাসওয়ার্ড পরিবর্তন করা যায়নি। লিংকটি মেয়াদোত্তীর্ণ হলে নতুন লিংক নিন।'
                    : 'রিসেট ইমেইল পাঠানো যায়নি। SMTP সেটিংস যাচাই করে আবার চেষ্টা করুন।'
            );
            setError(message);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-paper px-4 py-10">
            <section className="ledger-surface w-full max-w-[480px] p-6 sm:p-8 bg-paper-panel">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-subtle text-emerald-deep">
                    {isComplete ? <ShieldCheck className="h-7 w-7" /> : (
                        isResetMode ? <KeyRound className="h-7 w-7" /> : <Mail className="h-7 w-7" />
                    )}
                </div>

                <h1 className="font-bengali text-2xl font-bold text-emerald-deep">
                    {isComplete
                        ? (isResetMode ? 'পাসওয়ার্ড পরিবর্তন হয়েছে' : 'ইমেইল অনুরোধ গ্রহণ করা হয়েছে')
                        : (isResetMode ? 'নতুন পাসওয়ার্ড সেট করুন' : 'পাসওয়ার্ড রিসেট করুন')}
                </h1>
                <p className="mt-2 mb-6 font-bengali text-sm leading-6 text-ink-soft">
                    {isComplete
                        ? (isResetMode
                            ? 'এখন নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।'
                            : 'ইমেইলটি কোনো পোর্টাল অ্যাকাউন্টের সঙ্গে মিললে রিসেট লিংক পাঠানো হবে। আপনার inbox ও spam folder দেখুন।')
                        : (isResetMode
                            ? 'নতুন পাসওয়ার্ডটি ৬ থেকে ৬৪ অক্ষরের মধ্যে দিন।'
                            : 'অ্যাকাউন্টে নিবন্ধিত ইমেইল ঠিকানা দিন। ওই ঠিকানায় ১৫ মিনিটের জন্য কার্যকর রিসেট লিংক পাঠানো হবে।')}
                </p>

                {isComplete ? (
                    <Button
                        type="button"
                        variant="emerald"
                        size="lg"
                        fullWidth
                        onClick={() => navigate('/login', { replace: true })}
                        leftIcon={ArrowLeft}
                    >
                        <span className="font-bengali">লগইন পেজে যান</span>
                    </Button>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isResetMode ? (
                            <>
                                <FormInput
                                    labelEng="New password"
                                    labelBng="নতুন পাসওয়ার্ড"
                                    name="newPassword"
                                    type="password"
                                    leftIcon={KeyRound}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    minLength={6}
                                    maxLength={64}
                                    required
                                    autoComplete="new-password"
                                />
                                <FormInput
                                    labelEng="Confirm new password"
                                    labelBng="নতুন পাসওয়ার্ড নিশ্চিত করুন"
                                    name="confirmPassword"
                                    type="password"
                                    leftIcon={KeyRound}
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    minLength={6}
                                    maxLength={64}
                                    required
                                    autoComplete="new-password"
                                />
                            </>
                        ) : (
                            <FormInput
                                labelEng="Account email"
                                labelBng="অ্যাকাউন্টে নিবন্ধিত ইমেইল"
                                name="email"
                                type="email"
                                leftIcon={Mail}
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                autoComplete="email"
                                required
                            />
                        )}

                        {error && (
                            <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg px-3 py-2 text-sm font-bengali text-danger">
                                {error}
                            </p>
                        )}

                        <Button
                            type="submit"
                            variant="emerald"
                            size="lg"
                            fullWidth
                            isLoading={isSubmitting}
                            loadingText={isResetMode ? 'পাসওয়ার্ড পরিবর্তন হচ্ছে…' : 'ইমেইল পাঠানো হচ্ছে…'}
                            leftIcon={isResetMode ? KeyRound : Mail}
                        >
                            <span className="font-bengali">
                                {isResetMode ? 'নতুন পাসওয়ার্ড সংরক্ষণ করুন' : 'রিসেট লিংক পাঠান'}
                            </span>
                        </Button>
                    </form>
                )}

                <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bengali font-semibold text-emerald hover:text-gold-deep"
                >
                    <ArrowLeft className="h-4 w-4" />
                    লগইনে ফিরে যান
                </button>
            </section>
        </main>
    );
}
