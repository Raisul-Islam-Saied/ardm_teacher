import {
    ArrowLeft,
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    Mail,
    ShieldCheck,
    Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CONFIG } from '../config/systemConfig';
import { extractApiErrorMessage } from '../services/axiosClient';
import { authApi } from '../services/studentApiService';

export default function PasswordRecoveryView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const isResetMode = Boolean(token);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || isComplete) return;
    setError('');

    if (isResetMode) {
      if (password.length < 6 || password.length > 64) {
        setError('নতুন পাসওয়ার্ড ৬ থেকে ৬৪ অক্ষরের মধ্যে হতে হবে।');
        return;
      }
      if (password !== confirmPassword) {
        setError('দুই ঘরে একই নতুন পাসওয়ার্ড লিখুন।');
        return;
      }
    } else {
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError('সঠিক নিবন্ধিত ইমেইল ঠিকানা দিন।');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isResetMode) {
        await authApi.resetPassword(token, password);
      } else {
        await authApi.forgotPassword(email);
      }
      setIsComplete(true);
    } catch (requestError) {
      setError(
        extractApiErrorMessage(
          requestError,
          isResetMode
            ? 'পাসওয়ার্ড পরিবর্তন করা যায়নি। লিংকটি মেয়াদোত্তীর্ণ হলে নতুন লিংক নিন।'
            : 'রিসেট ইমেইল পাঠানো যায়নি। আবার চেষ্টা করুন।'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#060D1F] via-[#0B1C38] to-[#0E3B2E] px-4 py-8 font-bangla relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#D4A843]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

      <section className="w-full max-w-[420px] bg-white/95 backdrop-blur-xl rounded-[32px] p-7 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.45)] border border-white/20 relative z-10">
        {/* Top Icon & Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3.5 rounded-2xl bg-gradient-to-br from-[#060D1F] to-[#0E3B2E] border-2 border-[#D4A843] text-[#F7E09A] flex items-center justify-center shadow-lg shadow-slate-900/20">
            {isComplete ? (
              <ShieldCheck size={30} className="text-emerald-400" />
            ) : isResetMode ? (
              <KeyRound size={28} />
            ) : (
              <Mail size={28} />
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
            {isComplete
              ? isResetMode
                ? 'পাসওয়ার্ড পরিবর্তন হয়েছে'
                : 'ইমেইল পাঠানো হয়েছে'
              : isResetMode
              ? 'নতুন পাসওয়ার্ড সেট করুন'
              : 'পাসওয়ার্ড রিসেট করুন'}
            {!isComplete && <Sparkles size={16} className="text-[#D4A843]" />}
          </h1>
          <p className="text-slate-400 text-[11px] font-bold mt-1">{CONFIG.APP_NAME}</p>
        </div>

        <p className="mb-6 text-xs sm:text-[13px] leading-relaxed text-slate-600 font-semibold text-center bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5">
          {isComplete
            ? isResetMode
              ? 'আলহামদুলিল্লাহ! আপনার নতুন পাসওয়ার্ড সংরক্ষণ করা হয়েছে। এখন লগইন করতে পারবেন।'
              : 'ইমেইলটি কোনো পোর্টাল অ্যাকাউন্টের সঙ্গে মিললে রিসেট লিংক পাঠানো হবে। আপনার Inbox ও Spam ফোল্ডার চেক করুন।'
            : isResetMode
            ? 'আপনার অ্যাকাউন্টের জন্য ৬ থেকে ৬৪ অক্ষরের একটি শক্তিশালী নতুন পাসওয়ার্ড দিন।'
            : 'অ্যাকাউন্টে নিবন্ধিত ইমেইল ঠিকানা দিন। ওই ঠিকানায় ১৫ মিনিটের জন্য কার্যকর রিসেট লিংক পাঠানো হবে।'}
        </p>

        {isComplete ? (
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#060D1F] via-[#0B1C38] to-[#0E3B2E] hover:brightness-110 text-[#D4A843] font-black text-sm shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <CheckCircle2 size={18} />
            <span>লগইন পেজে যান</span>
          </button>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {isResetMode ? (
              <>
                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider ml-1 block mb-1.5">
                    নতুন পাসওয়ার্ড (New Password)
                  </label>
                  <div className="relative">
                    <KeyRound size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="কমপক্ষে ৬ অক্ষর"
                      minLength={6}
                      maxLength={64}
                      required
                      autoComplete="new-password"
                      className="w-full pl-10 pr-11 py-3.5 bg-slate-50 border border-slate-200/80 focus:bg-white focus:border-[#060D1F] focus:ring-2 focus:ring-slate-900/10 rounded-2xl outline-none font-mono font-bold text-sm text-slate-800 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider ml-1 block mb-1.5">
                    পাসওয়ার্ড নিশ্চিত করুন (Confirm)
                  </label>
                  <div className="relative">
                    <KeyRound size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="আবার লিখুন"
                      minLength={6}
                      maxLength={64}
                      required
                      autoComplete="new-password"
                      className="w-full pl-10 pr-11 py-3.5 bg-slate-50 border border-slate-200/80 focus:bg-white focus:border-[#060D1F] focus:ring-2 focus:ring-slate-900/10 rounded-2xl outline-none font-mono font-bold text-sm text-slate-800 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showConfirmPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider ml-1 block mb-1.5">
                  নিবন্ধিত ইমেইল (Account Email)
                </label>
                <div className="relative">
                  <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200/80 focus:bg-white focus:border-[#060D1F] focus:ring-2 focus:ring-slate-900/10 rounded-2xl outline-none font-mono font-bold text-sm text-slate-800 transition-all"
                  />
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-600"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#060D1F] via-[#0B1C38] to-[#0E3B2E] hover:brightness-110 text-[#D4A843] py-4 rounded-2xl font-black text-sm shadow-lg shadow-slate-900/20 transition active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{isResetMode ? 'সংরক্ষণ হচ্ছে...' : 'ইমেইল পাঠানো হচ্ছে...'}</span>
                </>
              ) : (
                <>
                  {isResetMode ? <KeyRound size={18} /> : <Mail size={18} />}
                  <span>{isResetMode ? 'নতুন পাসওয়ার্ড সংরক্ষণ করুন' : 'রিসেট লিংক পাঠান'}</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 hover:text-amber-600 transition"
          >
            <ArrowLeft size={15} />
            <span>লগইন পেজে ফিরে যান</span>
          </button>
        </div>
      </section>
    </div>
  );
}