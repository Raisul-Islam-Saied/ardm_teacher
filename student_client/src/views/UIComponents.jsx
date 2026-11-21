import {
  AlertCircle, ArrowRight, Award, Camera, Check, ChevronLeft, CreditCard, Edit3, FileText,
  Home, IdCard, Layers, Loader2, LogOut, MapPin, MessageCircle, Phone, Printer, RefreshCw,
  Search, Shield, Trash2, UserPlus, Users, Filter, Copy, Cake, Contact, Gift, X
} from 'lucide-react';
import { useEffect, useMemo, useState, useRef } from 'react';
import { CLASS_ORDER, CONFIG, DEFAULT_IMAGE } from '../config/systemConfig';
import { getDaysUntilBirthday, formatDate } from '../models/studentModel';

// ==============================================
// 3. UI COMPONENTS  (extracted verbatim from the original Index.jsx)
// ==============================================
export const Header = ({ title, action, onBack }) => (
  <div className="fixed top-0 left-0 right-0 z-50 ">

    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 blur-2xl"></div>

    <div className="
      relative
      h-16
      flex items-center justify-between
      p-5
      
      bg-[#ffffff]
      
      shadow-[0_8px_30px_rgba(0,0,0,0.06)]
    ">

      {/* LEFT SIDE */}
      <div className="flex items-center gap-3">

        {onBack && (
          <button
            onClick={onBack}
            className="p-2 bg-gray-100 rounded-full active:bg-gray-200"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        <div className="flex flex-col leading-tight">
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            {title}
          </h1>
          <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
            Student Management System
          </span>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-2">
        {action}
      </div>
    </div>
  </div>
);


export const NavTab = ({ icon: Icon, label, active, onClick, main }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-1/4 transition-all duration-300 ${main ? '-mt-10' : ''}`}
  >
    <div className={`flex items-center justify-center transition-all duration-300 ${
      main 
        ? 'w-16 h-16 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-300 ring-4 ring-white transform active:scale-95' 
        : active ? 'text-blue-600' : 'text-gray-400'
    }`}>
      <Icon size={main ? 32 : 24} strokeWidth={active || main ? 2.5 : 2} />
    </div>
    {!main && <span className={`text-[10px] font-bold mt-1.5 ${active ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>}
  </button>
);
// ── PREMIUM STYLES ──
export const PremiumStyles = () => (
  <style>{`
    @keyframes gradientFlow {
      0%   { background-position: 0%   50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0%   50%; }
    }
    @keyframes cardEntrance {
      from { opacity: 0; transform: translateY(22px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    @keyframes countSlide {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
    @keyframes barGrow {
      from { transform: scaleX(0); }
      to   { transform: scaleX(1); }
    }
    @keyframes floatBob {
      0%, 100% { transform: translateY(0px);  }
      50%       { transform: translateY(-7px); }
    }
    @keyframes skeletonShimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    @keyframes slowSpin {
      from { transform: rotate(0deg);   }
      to   { transform: rotate(360deg); }
    }
    @keyframes goldGlow {
      0%, 100% { opacity: 0.7; }
      50%       { opacity: 1;   }
    }
    @keyframes bdayBounce {
      0%, 100% { transform: translateY(0); }
      25%       { transform: translateY(-4px); }
      50%       { transform: translateY(0); }
      75%       { transform: translateY(-2px); }
    }
    @keyframes exportBtnPop {
  from { opacity: 0; transform: translateY(10px) scale(0.85); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
.ardm-export-pop {
  animation: exportBtnPop 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
}
    .ardm-bday-bounce {
      display: inline-block;
      animation: bdayBounce 1s ease-in-out infinite;
    }
    .ardm-hero-bg {
      background: linear-gradient(-45deg, #060D1F, #0F1D3C, #0A1628, #060D1F);
      background-size: 400% 400%;
      animation: gradientFlow 12s ease infinite;
    }
    .ardm-gold-text {
      background: linear-gradient(135deg, #D4A843 0%, #F7E09A 35%, #C9962A 60%, #F0C96E 100%);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: gradientFlow 4s ease infinite, goldGlow 3s ease-in-out infinite;
    }
    .ardm-glass {
      background: rgba(255, 255, 255, 0.07);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid rgba(255, 255, 255, 0.11);
    }
    .ardm-card-enter {
      animation: cardEntrance 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .ardm-count-enter {
      animation: countSlide 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
      animation-delay: 0.25s;
    }
    .ardm-bar-grow {
      transform-origin: left;
      animation: barGrow 1.4s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .ardm-float { animation: floatBob 5s ease-in-out infinite; }
    .ardm-pattern-spin {
      animation: slowSpin 80s linear infinite;
      transform-origin: center;
    }
    .ardm-skeleton {
      background: linear-gradient(90deg, #E8EAEF 25%, #F3F4F8 50%, #E8EAEF 75%);
      background-size: 400px 100%;
      animation: skeletonShimmer 1.4s ease-in-out infinite;
    }
    .ardm-export-btn:active { transform: scale(0.90); }
    .ardm-student-card:active {
      transform: scale(0.985);
      box-shadow: 0 6px 24px rgba(6,13,31,0.10) !important;
    }
    .ardm-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
    .ardm-no-scrollbar::-webkit-scrollbar { display: none; }
  `}</style>
);

// ── COUNT-UP HOOK ──
export const useCountUp = (target, duration = 950, delay = 280) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      if (target === 0) { setCount(0); return; }
      let startTime = null;
      const step = (ts) => {
        if (!startTime) startTime = ts;
        const progress = Math.min((ts - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(eased * target));
        if (progress < 1) requestAnimationFrame(step);
        else setCount(target);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [target]);
  return count;
};

// ── ANIMATED COUNT ──
export const AnimatedCount = ({ target }) => {
  const count = useCountUp(target);
  return (
    <span
      className="ardm-gold-text ardm-count-enter font-black block"
      style={{ fontSize: 64, lineHeight: 1, letterSpacing: '-3px' }}
    >
      {count}
    </span>
  );
};

// ── GENDER BAR ──
export const GenderBar = ({ label, count, total, color, delay = '0s' }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</span>
        <span style={{ color }} className="text-[10px] font-black">
          {count} <span className="text-slate-500 font-semibold">({pct}%)</span>
        </span>
      </div>
      <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.09)' }}>
        <div
          className="h-full rounded-full ardm-bar-grow"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}70, ${color})`, animationDelay: delay }}
        />
      </div>
    </div>
  );
};

// ── SKELETON CARD ──
export const SkeletonCard = ({ index }) => (
  <div
    className="bg-white rounded-2xl mb-3 flex items-center overflow-hidden"
    style={{ boxShadow: '0 2px 10px rgba(6,13,31,0.04)', border: '1px solid rgba(6,13,31,0.04)' }}
  >
    <div className="w-1 self-stretch ardm-skeleton rounded-r-full shrink-0" style={{ minWidth: 4 }} />
    <div className="pl-3 py-3.5 shrink-0">
      <div className="w-12 h-12 rounded-[14px] ardm-skeleton" />
    </div>
    <div className="flex-1 px-3 py-3.5 space-y-2">
      <div className="h-3.5 ardm-skeleton rounded-full w-3/4" />
      <div className="h-3 ardm-skeleton rounded-full w-1/2" />
      <div className="flex gap-2">
        <div className="h-3 ardm-skeleton rounded-full w-16" />
        <div className="h-3 ardm-skeleton rounded-full w-10" />
      </div>
    </div>
    <div className="pr-3">
      <div className="w-7 h-7 rounded-xl ardm-skeleton" />
    </div>
  </div>
);

// ── CLASS COLOR PALETTE ──
export const CLASS_PALETTE = {
  'প্লে':    { color: '#8B5CF6', bg: '#F5F3FF' },
  'নার্সারি': { color: '#EC4899', bg: '#FDF2F8' },
  'কেজি':   { color: '#F97316', bg: '#FFF7ED' },
  '১ম':     { color: '#EF4444', bg: '#FEF2F2' },
  '২য়':    { color: '#F59E0B', bg: '#FFFBEB' },
  '৩য়':    { color: '#10B981', bg: '#ECFDF5' },
  '৪র্থ':   { color: '#06B6D4', bg: '#ECFEFF' },
  '৫ম':     { color: '#3B82F6', bg: '#EFF6FF' },
  '৬ষ্ঠ':   { color: '#6366F1', bg: '#EEF2FF' },
  '৭ম':     { color: '#8B5CF6', bg: '#F5F3FF' },
  '৮ম':     { color: '#D946EF', bg: '#FDF4FF' },
  '৯ম':     { color: '#14B8A6', bg: '#F0FDFA' },
  '১০ম':    { color: '#F43F5E', bg: '#FFF1F2' },
};

// ── PREMIUM STUDENT CARD ──
export const PremiumStudentCard = ({ data, onClick, onImageClick, index, showBirthdayCount }) => {
  const { color, bg } = CLASS_PALETTE[data.ClassBn] || { color: '#3B5BDB', bg: '#EEF2FF' };
  const isActive = data.Status === 'Active';

  const daysUntilBirthday = useMemo(() => getDaysUntilBirthday(data.DOB), [data.DOB]);

  // ✅ এই দুটো লাইন যোগ করুন
  const cardRef = useRef(null);
  const [inView, setInView] = useState(false);
  // ✅ এই useEffect যোগ করুন
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}                          // ✅ ref যোগ করুন
      onClick={() => onClick(data)}
      className="ardm-student-card bg-white rounded-2xl mb-3 flex items-center cursor-pointer overflow-hidden"
      style={{
        boxShadow: '0 2px 14px rgba(6,13,31,0.055), 0 1px 3px rgba(6,13,31,0.03)',
        border: '1px solid rgba(6,13,31,0.05)',
        // ✅ ardm-card-enter সরিয়ে এই style দিন
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.97)',
        transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${Math.min(index % 8 * 0.06, 0.35)}s,
                     transform 0.5s cubic-bezier(0.22,1,0.36,1) ${Math.min(index % 8 * 0.06, 0.35)}s`,
      }}
    >
      <div className="self-stretch rounded-r-full shrink-0" style={{ width: 4, background: color, minWidth: 4 }} />
      <div className="pl-3 py-3 shrink-0">
        <div className="relative">
          <img
  onClick={(e) => { e.stopPropagation(); onImageClick(data.ImageURL || DEFAULT_IMAGE); }}
  src={data.ImageURL || DEFAULT_IMAGE}
  className="w-[60px] h-[60px] rounded-[14px] object-cover"
  style={{ border: `2px solid ${color}22` }}
  alt=""
/>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-white ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
        </div>
      </div>
      <div className="flex-1 min-w-0 px-3 py-3">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <h3 className="font-black text-slate-900 text-[14.5px] leading-tight truncate flex items-center gap-1">
            {data.StudentNameBn}
            {daysUntilBirthday === 0 && (
              <Cake size={14} className="ardm-bday-bounce text-pink-500 shrink-0" />
            )}
            {daysUntilBirthday === 1 && (
              <Gift size={13} className="text-purple-500 shrink-0" />
            )}
          </h3>
          {showBirthdayCount && daysUntilBirthday >= 2 && (
            <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md shrink-0">
              {daysUntilBirthday} days
            </span>
          )}
        </div>
        <p className="text-[11px] font-semibold truncate" style={{ color: '#94A3B8' }}>{data.StudentNameEn}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-[9px] font-bold bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded-md font-mono border border-slate-100">{data.ID}</span>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md" style={{ background: bg, color }}> {data.ClassEn}</span>
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md  bg-emerald-50 text-emerald-600`}>
            Roll {data.Roll}
          </span>
        </div>
      </div>
      <div className="pr-3 pl-1 shrink-0">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <ChevronLeft size={13} style={{ color }} className="rotate-180" />
        </div>
      </div>
    </div>
  );
};

// Form input (original design) — + optional name/disabled/inputMode/min/max support
export const Input = ({ label, val, set, type="text", error, name, disabled, inputMode, min, max, maxLength, placeholder = "..." }) => (
  <div className="relative pt-1 w-full">
    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-0.5 block flex justify-between">
      {label}
      {error && <span className="text-red-500 lowercase italic">{error}</span>}
    </label>
    <input 
      name={name}
      type={type} 
      disabled={disabled}
      inputMode={inputMode}
      min={min}
      max={max}
      maxLength={maxLength}
      className={`w-full p-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 font-bold text-slate-800 transition-all border placeholder-gray-300 ${disabled ? 'opacity-70' : ''} ${error ? 'border-red-500 ring-1 ring-red-200' : 'border-transparent'}`}
      placeholder={placeholder}
      value={val}
      onChange={e => set(e.target.value)}
    />
  </div>
);
