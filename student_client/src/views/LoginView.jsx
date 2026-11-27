import {
  AlertCircle,
  Award,
  Clock,
  Eye,
  EyeOff,
  Fingerprint,
  HelpCircle,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  Phone,
  ShieldAlert,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONFIG } from '../config/systemConfig';

const LOCKOUT_STORAGE_KEY = 'ardm_erp_login_lockout_until_v2';

const bnToEnDigits = (str) =>
  String(str ?? '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));

const extractPureDigits = (str) => bnToEnDigits(str).replace(/\D/g, '');

const toBengaliDigits = (str) =>
  String(str ?? '').replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

function analyzeLoginIdentifier(rawInput) {
  const rawValue = String(rawInput || '').trim();
  if (/[A-Za-z@]/.test(rawValue)) {
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue);
    return {
      valid: validEmail,
      type: 'EMAIL',
      cleanValue: rawValue.toLowerCase(),
      badgeText: validEmail ? 'ইমেইল ✓' : 'ইমেইল ঠিকানা',
      error: 'সঠিক নিবন্ধিত ইমেইল ঠিকানা দিন'
    };
  }

  let digits = extractPureDigits(rawInput);
  if (digits.startsWith('8801') && digits.length === 13) {
    digits = digits.slice(2);
  }

  if (!digits) {
    return {
      valid: false,
      type: 'NONE',
      cleanValue: '',
      badgeText: '',
      error: 'ইমেইল, ফোন নম্বর অথবা টিচার কোড দিন'
    };
  }

  if (/^01[3-9]\d{8}$/.test(digits)) {
    return {
      valid: true,
      type: 'MOBILE',
      cleanValue: digits,
      badgeText: '১১-ডিজিট মোবাইল ✓',
      error: ''
    };
  }

  if (/^10\d{8}$/.test(digits)) {
    return {
      valid: true,
      type: 'TEACHER_ID',
      cleanValue: digits,
      badgeText: '১০-ডিজিট টিচার আইডি ✓',
      error: ''
    };
  }

  if (digits.startsWith('01')) {
    return {
      valid: false,
      type: 'PARTIAL_MOBILE',
      cleanValue: digits,
      badgeText: `মোবাইল (${digits.length}/11)`,
      error: `মোবাইল নম্বর ১১ ডিজিটের হতে হবে (${toBengaliDigits(digits.length)} ডিজিট দিয়েছেন)`
    };
  }

  if (digits.startsWith('10')) {
    return {
      valid: false,
      type: 'PARTIAL_ID',
      cleanValue: digits,
      badgeText: `টিচার আইডি (${digits.length}/10)`,
      error: `টিচার আইডি ১০ ডিজিটের হতে হবে (${toBengaliDigits(digits.length)} ডিজিট দিয়েছেন)`
    };
  }

  return {
    valid: false,
    type: 'INVALID',
    cleanValue: digits,
    badgeText: 'অবৈধ ফরম্যাট',
    error: 'সঠিক ইমেইল, ১১-ডিজিট ফোন নম্বর অথবা ১০-ডিজিট টিচার কোড দিন'
  };
}

const LoginView = ({ onLogin }) => {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // পারসিস্টেন্ট ১৫ মিনিটের লকআউট টাইমার
  const [lockUntilTimestamp, setLockUntilTimestamp] = useState(() => {
    try {
      const saved = sessionStorage.getItem(LOCKOUT_STORAGE_KEY);
      const parsed = saved ? Number(saved) : 0;
      return parsed > Date.now() ? parsed : 0;
    } catch {
      return 0;
    }
  });
  const [remainingSeconds, setRemainingSeconds] = useState(0);

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
        try { sessionStorage.removeItem(LOCKOUT_STORAGE_KEY); } catch {}
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [lockUntilTimestamp]);

  const triggerAccountLockout = (seconds = 15 * 60) => {
    const targetTime = Date.now() + seconds * 1000;
    setLockUntilTimestamp(targetTime);
    try { sessionStorage.setItem(LOCKOUT_STORAGE_KEY, String(targetTime)); } catch {}
  };

  const idAnalysis = useMemo(() => analyzeLoginIdentifier(identifier), [identifier]);
  const isLocked = remainingSeconds > 0;

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (isLocked || loading) return;

    if (!idAnalysis.valid) return setError(idAnalysis.error);
    const cleanPass = String(pass || '').trim();
    if (!cleanPass) return setError('পাসওয়ার্ড দিন');
    if (cleanPass.length < 6) return setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');

    setLoading(true);
    setError('');
    try {
      const result = await onLogin(idAnalysis.cleanValue, cleanPass);
      if (result && result.ok === false) {
        if (result.status === 423) {
          triggerAccountLockout(result.retryAfterSeconds || 15 * 60);
        }
        setError(result.message || 'লগিন ব্যর্থ হয়েছে');
      }
    } catch (err) {
      if (err?.response?.status === 423) {
        const retrySec = Number(err.response?.data?.meta?.retryAfterSeconds) || 15 * 60;
        triggerAccountLockout(retrySec);
      }
      setError(err?.message || 'লগিন ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const minutesPart = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const secondsPart = String(remainingSeconds % 60).padStart(2, '0');
  const lockoutProgress = Math.min(100, Math.round((remainingSeconds / (15 * 60)) * 100));

  const IdIcon = idAnalysis.type === 'EMAIL' ? Mail : idAnalysis.type === 'TEACHER_ID' ? Fingerprint : Phone;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#060D1F] via-[#0B1C38] to-[#0E3B2E] px-4 py-8 font-bangla relative overflow-hidden">
      {/* Subtle Ambient Glows */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#D4A843]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

      <div className="bg-white/95 backdrop-blur-xl p-7 sm:p-8 rounded-[32px] shadow-[0_24px_60px_rgba(0,0,0,0.45)] border border-white/20 w-full max-w-[400px] relative z-10">
        {/* Top Crest & Help Button */}
        <div className="relative text-center mb-6">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            title="লগইন সহায়িকা"
            className="absolute right-0 top-0 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <HelpCircle size={19} />
          </button>

          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#060D1F] to-[#0E3B2E] border-2 border-[#D4A843] text-[#F7E09A] flex items-center justify-center font-black text-2xl shadow-lg shadow-slate-900/20">
            আ
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
            স্বাগতম <Sparkles size={18} className="text-[#D4A843]" />
          </h2>
          <p className="text-slate-500 text-xs font-bold mt-1">{CONFIG.APP_NAME}</p>
        </div>

        {isLocked ? (
          /* ================= LOCKOUT COUNTDOWN VIEW ================= */
          <div className="text-center py-2">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
              <ShieldAlert size={28} />
            </div>

            <h3 className="text-lg font-black text-red-600">অ্যাকাউন্ট সাময়িকভাবে লক!</h3>
            <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">
              একাধিকবার ভুল পাসওয়ার্ড দেওয়ায় নিরাপত্তার স্বার্থে লগইন সাময়িক বন্ধ রাখা হয়েছে।
            </p>

            <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-red-900 via-red-700 to-red-900 text-white border border-[#D4A843]/40 shadow-md">
              <span className="font-mono text-[10px] uppercase tracking-widest text-amber-200 block mb-1">
                আবার চেষ্টা করতে বাকি
              </span>
              <div className="flex items-center justify-center gap-1.5 font-mono text-3xl font-black tracking-widest">
                <Clock size={22} className="text-amber-300 animate-pulse mr-1" />
                <span>{minutesPart}</span>
                <span className="animate-pulse text-amber-300">:</span>
                <span>{secondsPart}</span>
              </div>
              <span className="text-[11px] text-amber-100 block mt-1">
                ({toBengaliDigits(minutesPart)} মিনিট {toBengaliDigits(secondsPart)} সেকেন্ড)
              </span>
              <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-[#D4A843] transition-all duration-1000 rounded-full"
                  style={{ width: `${lockoutProgress}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/password-recovery')}
              className="text-xs font-black text-emerald-700 hover:underline"
            >
              ইমেইলে পাসওয়ার্ড রিসেট করুন →
            </button>
          </div>
        ) : (
          /* ================= LOGIN FORM ================= */
          <form onSubmit={handleLogin} noValidate>
            {/* Input 1: Email / Mobile / 10-Digit Teacher Code */}
            <div className="mb-3.5">
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  Email / Phone / Teacher ID
                </label>
                {identifier.length > 0 && idAnalysis.badgeText && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      idAnalysis.valid
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {idAnalysis.badgeText}
                  </span>
                )}
              </div>

              <div className="relative">
                <IdIcon size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  inputMode={idAnalysis.type === 'EMAIL' ? 'email' : 'text'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  spellCheck={false}
                  placeholder="ইমেইল, 01XXXXXXXXX বা 10XXXXXXXX"
                  className={`w-full pl-10 pr-4 py-3.5 bg-slate-50 border rounded-2xl outline-none font-mono font-bold text-sm text-slate-800 transition-all ${
                    idAnalysis.valid
                      ? 'border-emerald-400 bg-white focus:ring-2 focus:ring-emerald-200'
                      : 'border-slate-200/80 focus:bg-white focus:border-[#060D1F] focus:ring-2 focus:ring-slate-900/10'
                  }`}
                  value={identifier}
                  onChange={(e) => {
                    if (error) setError('');
                    if (/[A-Za-z@]/.test(e.target.value)) {
                      setIdentifier(e.target.value.slice(0, 254));
                      return;
                    }
                    const pure = extractPureDigits(e.target.value).slice(0, 13);
                    const normalized =
                      pure.startsWith('8801') && pure.length === 13
                        ? pure.slice(2)
                        : pure.slice(0, 11);
                    setIdentifier(normalized);
                  }}
                />
              </div>
            </div>

            {/* Input 2: Password with Show/Hide */}
            <div className="mb-2">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider ml-1 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3.5 bg-slate-50 border border-slate-200/80 focus:bg-white focus:border-[#060D1F] focus:ring-2 focus:ring-slate-900/10 rounded-2xl outline-none font-mono font-bold text-sm text-slate-800 transition-all"
                  value={pass}
                  onChange={(e) => {
                    if (error) setError('');
                    setPass(e.target.value);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                >
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right mb-4">
              <button
                type="button"
                onClick={() => navigate('/password-recovery')}
                className="text-xs font-black text-emerald-700 hover:text-amber-600 transition"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#060D1F] via-[#0B1C38] to-[#0E3B2E] hover:brightness-110 text-[#D4A843] py-4 rounded-2xl font-black text-sm shadow-lg shadow-slate-900/20 transition active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  <span>নিরাপদে লগইন করুন</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= QUICK ACCESS (Preserved & Polished) ================= */}
        <div className="mt-6 space-y-3 text-center">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Quick Access</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/result')}
              className="py-3 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/70 text-amber-800 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Award size={15} className="text-amber-600 shrink-0" />
              <span>Result দেখুন</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/student')}
              className="py-3 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/70 text-emerald-800 font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Users size={15} className="text-emerald-600 shrink-0" />
              <span>শিক্ষার্থীর তথ্য</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= LOGIN HELP MODAL ================= */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">লগইন সহায়িকা</h3>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <p className="font-black text-slate-800 mb-0.5">১. লগইন আইডি কী দেবেন?</p>
                <p>
                  অ্যাকাউন্টে নিবন্ধিত ইমেইল, ১১ সংখ্যার মোবাইল নম্বর (<b className="font-mono">018XXXXXXXX</b>) অথবা ১০ সংখ্যার টিচার আইডি (<b className="font-mono">1026030301</b>) ব্যবহার করুন।
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                <p className="font-black text-slate-800 mb-0.5">২. পাসওয়ার্ড ভুলে গেলে:</p>
                <p>
                  <b>পাসওয়ার্ড ভুলে গেছেন?</b> লিংকে ক্লিক করে নিবন্ধিত ইমেইলে রিসেট লিংক নিয়ে নিজেই নতুন পাসওয়ার্ড সেট করতে পারবেন।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHelpOpen(false)}
              className="w-full py-3 rounded-xl bg-[#060D1F] text-[#D4A843] text-xs font-black"
            >
              বুঝতে পেরেছি
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginView;