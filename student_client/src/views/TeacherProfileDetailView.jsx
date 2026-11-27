import {
    AlertCircle,
  Award,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
    Banknote,
    Briefcase,
    Building2,
    Calendar,
    CalendarCheck,
    Check,
    ChevronLeft,
    Clock,
    Copy,
    CreditCard,
    FileText,
    GraduationCap,
    KeyRound,
    Lock,
    Mail,
    MapPin,
    MessageCircle,
    Pencil,
    Phone,
    Settings,
    Shield,
    Sparkles,
    User,
    Wallet,
    X
} from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DEFAULT_IMAGE } from '../config/systemConfig';
import TeacherMonthlyAttendancePanel from '../components/TeacherMonthlyAttendancePanel';
import TeacherSalaryHistoryPanel from '../components/TeacherSalaryHistoryPanel';
import { toUiUser } from '../models/studentModel';
import { extractApiErrorMessage } from '../services/axiosClient';
import { authApi, teacherPortalApi } from '../services/studentApiService';
import { printTeacherIDCards, printTeacherPdfInfo } from '../utils/teacherExports';

const TeacherProfileEditorBridge = lazy(() => import('../components/TeacherProfileEditorBridge'));

// ── HELPERS ──
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatBDT = (amount) => {
  if (amount === undefined || amount === null || amount === '') return '৳ ০';
  return `৳ ${new Intl.NumberFormat('bn-BD').format(Number(amount))}`;
};

const calculateDuration = (startStr, endStr = null) => {
  if (!startStr) return null;
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years <= 0 && months <= 0) return 'নতুন যোগদান';
  if (years <= 0) return `${months} মাস`;
  if (months <= 0) return `${years} বছর`;
  return `${years} বছর ${months} মাস`;
};

const TeacherProfileDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile'); // profile | attendance | salary | password | update | settings
  const [copiedKey, setCopiedKey] = useState('');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [meData, teacherData] = await Promise.all([
          authApi.me().catch(() => null),
          teacherPortalApi.getTeacherById(id)
        ]);
        if (!mounted) return;
        if (meData) setCurrentUser(toUiUser(meData));
        setTeacher(teacherData);
      } catch (err) {
        if (mounted) {
          setError(extractApiErrorMessage(err, 'শিক্ষকের প্রোফাইল লোড করা যায়নি'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const isAdmin = currentUser?.role === 'Admin';
  const isSelf = Boolean(currentUser?._id && teacher?._id && String(currentUser._id) === String(teacher._id));
  const canViewSensitive = isAdmin || isSelf;

  const handleCopy = async (text, key) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1800);
    } catch {
      /* ignore */
    }
  };

  const handleCall = (phone) => {
    if (!phone) return;
    window.open(`tel:${String(phone).replace(/[^\d+]/g, '')}`);
  };

  const handleWhatsApp = (phone, name) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return;
    const intl = digits.startsWith('880') ? digits : `88${digits}`;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(`আসসালামু আলাইকুম, ${name || ''}`)}`);
  };

  // Tabs configuration
  const tabs = useMemo(() => {
    const list = [
      { id: 'profile', label: 'প্রোফাইল', en: 'Overview', icon: User }
    ];
    if (canViewSensitive) {
      list.push(
        { id: 'attendance', label: 'হাজিরা', en: 'Attendance', icon: CalendarCheck },
        { id: 'salary', label: 'বেতন', en: 'Payroll', icon: Wallet },
        { id: 'password', label: 'পাসওয়ার্ড পরিবর্তন', en: 'Security', icon: KeyRound }
      );
    }
    if (isAdmin) {
      list.push(
        { id: 'update', label: 'আপডেট', en: 'Update', icon: Pencil },
        { id: 'settings', label: 'সেটিংস', en: 'Controls', icon: Settings }
      );
    }
    return list;
  }, [canViewSensitive, isAdmin]);

  // Address comparison
  const presentAddr = teacher?.presentAddress || null;
  const permanentAddr = teacher?.permanentAddress || null;
  const isSameAddress = useMemo(() => {
    if (!presentAddr || !permanentAddr) return true;
    const norm = (v) => String(v || '').trim().toLowerCase();
    const hasPerm = Boolean(
      permanentAddr.houseNameBn || permanentAddr.houseOrRoad || permanentAddr.villageBn || permanentAddr.village
    );
    if (!hasPerm) return true;
    return (
      norm(presentAddr.houseNameBn || presentAddr.houseOrRoad) === norm(permanentAddr.houseNameBn || permanentAddr.houseOrRoad) &&
      norm(presentAddr.villageBn || presentAddr.village) === norm(permanentAddr.villageBn || permanentAddr.village) &&
      norm(presentAddr.upazilaBn || presentAddr.upazila) === norm(permanentAddr.upazilaBn || permanentAddr.upazila) &&
      norm(presentAddr.districtBn || presentAddr.district) === norm(permanentAddr.districtBn || permanentAddr.district)
    );
  }, [presentAddr, permanentAddr]);

  // Loading Skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4FF] p-4 lg:p-8 font-bangla">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
          <div className="lg:col-span-4 h-[520px] rounded-[30px] bg-slate-200/80" />
          <div className="lg:col-span-8 space-y-5">
            <div className="h-16 rounded-2xl bg-slate-200/80" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-200/80" />)}
            </div>
            <div className="h-64 rounded-[26px] bg-slate-200/80" />
            <div className="h-64 rounded-[26px] bg-slate-200/80" />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !teacher) {
    return (
      <div className="min-h-screen bg-[#F0F4FF] flex flex-col items-center justify-center p-6 text-center font-bangla">
        <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-200 text-red-500 flex items-center justify-center mb-4">
          <Shield size={30} />
        </div>
        <h2 className="text-lg font-black text-slate-900">{error || 'শিক্ষক খুঁজে পাওয়া যায়নি'}</h2>
        <p className="text-xs font-semibold text-slate-500 mt-1 mb-6">
          তালিকায় ফিরে গিয়ে আবার চেষ্টা করুন।
        </p>
        <button
          type="button"
          onClick={() => navigate('/teacher')}
          className="px-5 py-2.5 rounded-xl bg-[#060D1F] text-[#F7E09A] text-xs font-black flex items-center gap-1.5"
        >
          <ChevronLeft size={16} /> শিক্ষক তালিকায় ফিরুন
        </button>
      </div>
    );
  }

  const rank = teacher.rankingMetrics?.overallMadrasahRank;
  const isTopThree = rank && rank <= 3;
  const isActive = teacher.isActive !== false && teacher.registrationStatus !== 'Rejected';
  const isPending = teacher.registrationStatus === 'Pending';
  const tenure = calculateDuration(teacher.joiningDate, teacher.isActive === false ? teacher.resignationDate : null);
  const age = calculateDuration(teacher.dateOfBirth);
  const qualifications = Array.isArray(teacher.academicQualifications) ? teacher.academicQualifications : [];
  const employmentHistory = Array.isArray(teacher.employmentHistory) ? teacher.employmentHistory : [];
  const bank = teacher.bankDetails || {};
  const hasBankInfo = Boolean(bank.bankName || bank.accountNumber || bank.accountHolderName);
  const photoUrl = teacher.profilePicture?.url || DEFAULT_IMAGE;

  return (
    <>
      <style>{`
        @keyframes tp-hero-grad {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes tp-ring-glow {
          0%, 100% { box-shadow: 0 0 0 0px rgba(212,168,67,0.55), 0 0 0 8px rgba(212,168,67,0.14), 0 22px 50px rgba(0,0,0,0.45); }
          50%      { box-shadow: 0 0 0 5px rgba(212,168,67,0.35), 0 0 0 14px rgba(212,168,67,0.06), 0 22px 50px rgba(0,0,0,0.45); }
        }
        @keyframes tp-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tp-hero-bg {
          background: linear-gradient(-45deg, #060D1F 0%, #0D1E40 35%, #122448 65%, #060D1F 100%);
          background-size: 300% 300%;
          animation: tp-hero-grad 12s ease infinite;
        }
        .tp-gold-ring { animation: tp-ring-glow 3.4s ease-in-out infinite; }
        .tp-slide-up  { animation: tp-slide-up 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .tp-gold-text {
          background: linear-gradient(135deg, #D4A843 0%, #FCE8A6 45%, #C69228 75%, #F5CF74 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: tp-hero-grad 5s ease infinite;
        }
        .tp-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .tp-no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="min-h-screen bg-[#F0F4FF] pb-20 font-bangla">
        {/* ==================== TOP STICKY EXECUTIVE NAVBAR ==================== */}
        <header className="sticky top-0 z-40 bg-[#060D1F]/95 backdrop-blur-xl border-b border-[#D4A843]/25 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/teacher')}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-black flex items-center gap-1.5 shrink-0 transition"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">শিক্ষক তালিকা</span>
              </button>
              <div className="h-5 w-px bg-white/15 hidden sm:block" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-[#F7E09A] truncate">{teacher.fullNameBng}</span>
                  {rank && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#D4A843]/20 text-[#F7E09A] border border-[#D4A843]/40 shrink-0">
                      Rank #{rank}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  ID: {teacher.teacherCode} · {teacher.designationBng || teacher.designation}
                </p>
              </div>
            </div>

            {/* Right Print Actions (Admin or Self) */}
            <div className="flex items-center gap-2 shrink-0">
              {canViewSensitive && (
                <>
                  <button
                    type="button"
                    onClick={() => printTeacherIDCards([teacher])}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-black flex items-center gap-1.5 transition"
                    title="ID Card প্রিন্ট করুন"
                  >
                    <CreditCard size={14} className="text-[#F7E09A]" />
                    <span className="hidden md:inline">ID Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => printTeacherPdfInfo([teacher])}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#D4A843] to-amber-500 text-[#060D1F] text-xs font-black flex items-center gap-1.5 shadow-md hover:brightness-105 transition"
                    title="অফিশিয়াল ইনফো শিট প্রিন্ট করুন"
                  >
                    <FileText size={14} />
                    <span className="hidden sm:inline">প্রোফাইল প্রিন্ট</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ==================== MAIN 12-COL EXECUTIVE WORKSPACE ==================== */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ══════════════════════════════════════════════
                LEFT COLUMN (4 COLS · STICKY ROYAL IDENTITY)
            ══════════════════════════════════════════════ */}
            <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4 tp-slide-up">
              {/* Hero Profile Card */}
              <div className="tp-hero-bg relative rounded-[30px] overflow-hidden shadow-2xl border border-[#D4A843]/30 text-white">
                {/* Decorative Background Glow & Rings */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <img
                    src={photoUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-[0.08]"
                    style={{ filter: 'blur(36px)', transform: 'scale(1.25)' }}
                  />
                  <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full border border-[#D4A843]/15" />
                  <div className="absolute -left-24 -bottom-24 w-72 h-72 rounded-full bg-[#D4A843]/10 blur-3xl" />
                </div>

                {/* Top Status Strip */}
                <div className="relative z-10 px-5 pt-5 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      isPending
                        ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                        : isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35'
                        : 'bg-red-500/20 text-red-300 border-red-400/35'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isPending ? 'bg-amber-400 animate-pulse' : isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                      }`}
                    />
                    {isPending ? 'Pending Approval' : isActive ? 'Active Staff' : 'Inactive'}
                  </span>

                  {rank && (
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black shadow-md ${
                        isTopThree
                          ? 'bg-gradient-to-r from-[#D4A843] to-amber-400 text-[#060D1F]'
                          : 'bg-white/10 text-[#F7E09A] border border-white/15'
                      }`}
                    >
                      <Award size={12} /> Rank #{rank}
                    </span>
                  )}
                </div>

                {/* Avatar + Names + Designation */}
                <div className="relative z-10 px-6 pt-6 pb-6 flex flex-col items-center text-center">
                  <button
                    type="button"
                    onClick={() => setPhotoModalOpen(true)}
                    className="relative group cursor-pointer focus:outline-none"
                    title="ছবি বড় করে দেখুন"
                  >
                    <div
                      className="tp-gold-ring w-32 h-32 rounded-[28px] overflow-hidden border-[3px] border-[#D4A843]/70 transition-transform group-hover:scale-[1.03]"
                    >
                      <img src={photoUrl} alt={teacher.fullNameEng} className="w-full h-full object-cover" />
                    </div>
                    {isActive && (
                      <span className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-emerald-500 border-2 border-[#060D1F] flex items-center justify-center shadow-lg">
                        <BadgeCheck size={16} className="text-white" />
                      </span>
                    )}
                  </button>

                  <h1 className="mt-5 text-2xl font-black text-white leading-tight tracking-tight">
                    {teacher.fullNameBng}
                  </h1>
                  <p className="text-sm font-bold text-slate-300 mt-1">{teacher.fullNameEng}</p>

                  <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#D4A843]/15 border border-[#D4A843]/35 text-[#F7E09A] text-xs font-black">
                    <Briefcase size={13} />
                    <span>{teacher.designationBng || teacher.designation}</span>
                  </div>

                  {teacher.subject && (
                    <p className="text-xs font-semibold text-slate-300 mt-2">
                      বিষয়: <span className="text-white font-bold">{teacher.subject}</span>
                    </p>
                  )}

                  {/* Quick Pill Tags */}
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {teacher.assignedClass && (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                        শ্রেণি শিক্ষক: {teacher.assignedClass}
                      </span>
                    )}
                    {teacher.bloodGroup && teacher.bloodGroup !== 'N/A' && (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-400/30">
                        🩸 {teacher.bloodGroup}
                      </span>
                    )}
                    {canViewSensitive && teacher.employmentType && (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                        {teacher.employmentType}
                      </span>
                    )}
                  </div>

                  {/* Glass Identity Strip */}
                  <div className="mt-5 w-full rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md p-3 grid grid-cols-3 divide-x divide-white/10">
                    <button
                      type="button"
                      onClick={() => handleCopy(teacher.teacherCode, 'tid')}
                      className="px-1 text-center hover:bg-white/5 rounded-l-xl transition"
                      title="আইডি কপি করুন"
                    >
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Teacher ID</p>
                      <p className="tp-gold-text text-xs font-mono font-black mt-0.5 truncate">
                        {copiedKey === 'tid' ? 'Copied ✓' : teacher.teacherCode}
                      </p>
                    </button>
                    <div className="px-1 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">ক্যাটাগরি</p>
                      <p className="text-xs font-black text-white mt-0.5 truncate">
                        {teacher.staffCategory === 'Non-Teaching' ? 'কর্মচারী' : 'শিক্ষক'}
                      </p>
                    </div>
                    <div className="px-1 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">কর্মকাল</p>
                      <p className="text-xs font-black text-emerald-300 mt-0.5 truncate">{tenure || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Quick Contact Card */}
              <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-200/80">
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleCall(teacher.phone)}
                    className="py-3 px-2 rounded-2xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200/70 flex flex-col items-center gap-1.5 transition group"
                  >
                    <Phone size={18} />
                    <span className="text-[10px] font-black uppercase">Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleWhatsApp(teacher.phone, teacher.fullNameBng)}
                    className="py-3 px-2 rounded-2xl bg-green-50 hover:bg-green-600 text-green-700 hover:text-white border border-green-200/70 flex flex-col items-center gap-1.5 transition"
                  >
                    <MessageCircle size={18} />
                    <span className="text-[10px] font-black uppercase">WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    disabled={!teacher.email}
                    onClick={() => teacher.email && window.open(`mailto:${teacher.email}`)}
                    className="py-3 px-2 rounded-2xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200/70 flex flex-col items-center gap-1.5 transition disabled:opacity-40"
                  >
                    <Mail size={18} />
                    <span className="text-[10px] font-black uppercase">Email</span>
                  </button>
                </div>

                {/* Access Notice for Regular Teacher viewing a colleague */}
                {!canViewSensitive && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] font-bold text-slate-500">
                    <Lock size={13} className="text-amber-600 shrink-0" />
                    <span>ব্যক্তিগত ও বেতন সংক্রান্ত সংবেদনশীল তথ্য শুধুমাত্র অ্যাডমিনদের জন্য সংরক্ষিত।</span>
                  </div>
                )}
              </div>
            </aside>

            {/* ══════════════════════════════════════════════
                RIGHT COLUMN (8 COLS · TABS + CONTENT)
            ══════════════════════════════════════════════ */}
            <main className="lg:col-span-8 space-y-5 tp-slide-up" style={{ animationDelay: '0.08s' }}>
              {/* EXECUTIVE PILL TAB BAR */}
              <div className="rounded-[22px] border border-slate-200/80 bg-white p-2 shadow-sm">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 2xl:grid-cols-6">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        aria-current={active ? 'page' : undefined}
                        className={`flex min-h-12 w-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-center text-[11px] font-black transition-all sm:min-h-11 sm:flex-row sm:gap-2 sm:rounded-2xl sm:px-2.5 sm:text-xs ${
                          active
                            ? 'bg-[#060D1F] text-[#F7E09A] shadow-md'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Icon size={15} className="shrink-0" />
                        <span className="max-w-full leading-4">{tab.label}</span>
                        {tab.id === 'settings' && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                              active ? 'bg-white/15 text-[#F7E09A]' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            শীঘ্রই
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ══════════════════════════════════════════════
                  TAB 1: FULL EXECUTIVE PROFILE OVERVIEW
              ══════════════════════════════════════════════ */}
              {activeTab === 'profile' && (
                <div className="space-y-5">
                  {/* Top KPI Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiMiniCard
                      icon={Award}
                      label="মাদ্রাসা র‍্যাংক"
                      value={rank ? `#${rank}` : 'N/A'}
                      sub={teacher.designationBng || teacher.designation}
                      accent="#D4A843"
                    />
                    <KpiMiniCard
                      icon={Calendar}
                      label="যোগদানের তারিখ"
                      value={formatDate(teacher.joiningDate)}
                      sub={tenure ? `মেয়াদ: ${tenure}` : 'সার্ভিস রেকর্ড'}
                      accent="#0EA5E9"
                    />
                    {canViewSensitive ? (
                      <KpiMiniCard
                        icon={Banknote}
                        label="মূল বেতন"
                        value={formatBDT(teacher.basicSalary)}
                        sub={`${teacher.paymentMethod || 'Cash'} · কোটা ${teacher.customLeaveQuota ?? 2} দিন`}
                        accent="#10B981"
                      />
                    ) : (
                      <KpiMiniCard
                        icon={GraduationCap}
                        label="সর্বোচ্চ ডিগ্রি"
                        value={qualifications[0]?.examTitle || qualifications[0]?.degreeLevel || 'তথ্য নেই'}
                        sub={qualifications[0]?.boardOrUniversity || 'শিক্ষাগত যোগ্যতা'}
                        accent="#6366F1"
                      />
                    )}
                    <KpiMiniCard
                      icon={Shield}
                      label={canViewSensitive ? 'বায়োমেট্রিক আইডি' : 'নির্ধারিত শ্রেণি'}
                      value={
                        canViewSensitive
                          ? teacher.biometricDeviceId
                            ? `#${teacher.biometricDeviceId}`
                            : 'N/A'
                          : teacher.assignedClass || 'নেই'
                      }
                      sub={
                        canViewSensitive
                          ? `রোল: ${teacher.role || 'Teacher'}`
                          : teacher.subject || 'পাঠদান'
                      }
                      accent="#8B5CF6"
                    />
                  </div>

                  {/* Two-Column Bento Cards */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                    {/* 1. Institutional & Service Info */}
                    <InfoSectionCard
                      title="প্রাতিষ্ঠানিক ও চাকরির তথ্য"
                      subtitle="Institutional & Service"
                      icon={Briefcase}
                      accent="#060D1F"
                      rows={[
                        { label: 'টিচার আইডি', value: teacher.teacherCode, mono: true, copyKey: 'tcode' },
                        { label: 'পদবি (বাংলা)', value: teacher.designationBng || 'N/A' },
                        { label: 'Designation (En)', value: teacher.designation || 'N/A' },
                        { label: 'স্টাফ ক্যাটাগরি', value: teacher.staffCategory === 'Non-Teaching' ? 'Non-Teaching (কর্মচারী)' : 'Teaching (শিক্ষক)' },
                        { label: 'পাঠদানের বিষয়', value: teacher.subject || 'N/A' },
                        {
                          label: 'নির্ধারিত শ্রেণি',
                          value: teacher.assignedClass
                            ? `${teacher.assignedClass}${canViewSensitive && teacher.canEditAssignedClass ? ' (Edit অনুমোদিত)' : ''}`
                            : 'নেই'
                        },
                        { label: 'যোগদানের তারিখ', value: formatDate(teacher.joiningDate) },
                        ...(canViewSensitive
                          ? [
                              { label: 'চাকরির ধরন', value: teacher.employmentType || 'Non-MPO', badge: true },
                              { label: 'বায়োমেট্রিক ডিভাইস আইডি', value: teacher.biometricDeviceId ? `#${teacher.biometricDeviceId}` : 'N/A', mono: true },
                              { label: 'ইনডেক্স নম্বর (MPO)', value: teacher.indexNumber || 'নেই', mono: Boolean(teacher.indexNumber) },
                              { label: 'পোর্টাল অ্যাক্সেস রোল', value: teacher.role || 'Teacher' },
                              { label: 'মাসিক ছুটির কোটা', value: `${teacher.customLeaveQuota ?? 2} দিন` },
                              ...(teacher.resignationDate
                                ? [{ label: 'চাকরি ছাড়ার তারিখ', value: formatDate(teacher.resignationDate), danger: true }]
                                : [])
                            ]
                          : [])
                      ]}
                      copiedKey={copiedKey}
                      onCopy={handleCopy}
                    />

                    {/* 2. Contact & Emergency Info */}
                    <InfoSectionCard
                      title="যোগাযোগ ও জরুরি তথ্য"
                      subtitle="Contact & Emergency"
                      icon={Phone}
                      accent="#10B981"
                      rows={[
                        { label: 'মোবাইল নম্বর', value: teacher.phone || 'N/A', mono: true, copyKey: 'phone' },
                        { label: 'ইমেইল ঠিকানা', value: teacher.email || 'N/A', copyKey: teacher.email ? 'email' : '' },
                        ...(canViewSensitive
                          ? [
                              { label: 'জরুরি ব্যক্তির নাম', value: teacher.emergencyContact?.contactName || 'N/A' },
                              { label: 'সম্পর্ক (Relation)', value: teacher.emergencyContact?.relationship || 'N/A' },
                              {
                                label: 'জরুরি মোবাইল নম্বর',
                                value: teacher.emergencyContact?.phone || 'N/A',
                                mono: true,
                                copyKey: teacher.emergencyContact?.phone ? 'emPhone' : '',
                                danger: true
                              }
                            ]
                          : [])
                      ]}
                      copiedKey={copiedKey}
                      onCopy={handleCopy}
                      footer={
                        canViewSensitive && teacher.emergencyContact?.phone ? (
                          <button
                            type="button"
                            onClick={() => handleCall(teacher.emergencyContact.phone)}
                            className="mt-3 w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 text-xs font-black flex items-center justify-center gap-1.5 transition"
                          >
                            <Phone size={13} /> জরুরি নম্বরে কল করুন ({teacher.emergencyContact.phone})
                          </button>
                        ) : null
                      }
                    />

                    {/* 3. Personal & Identity Details */}
                    <InfoSectionCard
                      title="ব্যক্তিগত ও পরিচয়পত্রের তথ্য"
                      subtitle="Personal & Identity"
                      icon={User}
                      accent="#6366F1"
                      rows={[
                        { label: 'নাম (বাংলা)', value: teacher.fullNameBng },
                        { label: 'Full Name (En)', value: teacher.fullNameEng },
                        { label: 'লিঙ্গ (Gender)', value: teacher.gender || 'N/A' },
                        { label: 'রক্তের গ্রুপ', value: teacher.bloodGroup || 'N/A', danger: Boolean(teacher.bloodGroup && teacher.bloodGroup !== 'N/A') },
                        ...(canViewSensitive
                          ? [
                              { label: 'জন্ম তারিখ', value: `${formatDate(teacher.dateOfBirth)}${age ? ` (${age})` : ''}` },
                              { label: 'ধর্ম ও বৈবাহিক অবস্থা', value: `${teacher.religion || 'Islam'} · ${teacher.maritalStatus || 'N/A'}` },
                              { label: 'পিতার নাম (বাংলা)', value: teacher.fathersNameBng || 'N/A' },
                              { label: "Father's Name (En)", value: teacher.fathersNameEng || 'N/A' },
                              { label: 'মাতার নাম (বাংলা)', value: teacher.mothersNameBng || 'N/A' },
                              { label: "Mother's Name (En)", value: teacher.mothersNameEng || 'N/A' },
                              { label: 'NID নম্বর', value: teacher.nidNumber || 'N/A', mono: Boolean(teacher.nidNumber), copyKey: teacher.nidNumber ? 'nid' : '' },
                              { label: 'জন্ম নিবন্ধন (BRN)', value: teacher.birthRegNumber || 'N/A', mono: Boolean(teacher.birthRegNumber), copyKey: teacher.birthRegNumber ? 'brn' : '' }
                            ]
                          : [])
                      ]}
                      copiedKey={copiedKey}
                      onCopy={handleCopy}
                    />

                    {/* 4. Payroll & Bank Details (Admin or Self Only) */}
                    {canViewSensitive && (
                      <InfoSectionCard
                        title="বেতন ও ব্যাংক তথ্য"
                        subtitle="Payroll & Bank Account"
                        icon={Building2}
                        accent="#D97706"
                        rows={[
                          { label: 'মূল বেতন (Basic Salary)', value: formatBDT(teacher.basicSalary), badge: true },
                          { label: 'পেমেন্ট পদ্ধতি', value: teacher.paymentMethod || 'Cash' },
                          ...(hasBankInfo
                            ? [
                                { label: 'ব্যাংকের নাম', value: bank.bankName || 'N/A' },
                                { label: 'শাখা (Branch)', value: bank.branchName || 'N/A' },
                                { label: 'অ্যাকাউন্ট হোল্ডার', value: bank.accountHolderName || 'N/A' },
                                { label: 'অ্যাকাউন্ট নম্বর', value: bank.accountNumber || 'N/A', mono: true, copyKey: bank.accountNumber ? 'bankAc' : '' },
                                { label: 'রাউটিং নম্বর', value: bank.routingNumber || 'N/A', mono: true }
                              ]
                            : [{ label: 'ব্যাংক তথ্য', value: 'কোনো ব্যাংক অ্যাকাউন্ট যুক্ত নেই' }])
                        ]}
                        copiedKey={copiedKey}
                        onCopy={handleCopy}
                      />
                    )}
                  </div>

                  {/* 5. Academic Qualifications Timeline (Full Width) */}
                  <div className="bg-white rounded-[26px] p-5 sm:p-6 shadow-sm border border-slate-200/80">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <GraduationCap size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">শিক্ষাগত যোগ্যতা (Academic Qualifications)</h3>
                          <p className="text-[11px] font-semibold text-slate-400">
                            মোট {qualifications.length} টি ডিগ্রি / সার্টিফিকেট রেকর্ড
                          </p>
                        </div>
                      </div>

                      {canViewSensitive && teacher.rankingMetrics?.compositeRankScore > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black">
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            র‍্যাংক স্কোর: {teacher.rankingMetrics.compositeRankScore}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            গড় GPA: {teacher.rankingMetrics.averageNormalizedGpa || 0}
                          </span>
                        </div>
                      )}
                    </div>

                    {qualifications.length === 0 ? (
                      <p className="text-xs font-bold text-slate-400 text-center py-8">
                        কোনো শিক্ষাগত যোগ্যতা এখনো যুক্ত করা হয়নি।
                      </p>
                    ) : (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {qualifications.map((q, idx) => {
                          const resultLabel =
                            ['GPA', 'CGPA'].includes(q.resultType) && q.gpaOrCgpa
                              ? `${q.resultType} ${q.gpaOrCgpa} / ${q.scale || 5}`
                              : q.resultGrade
                              ? `${q.resultGrade} ${q.resultType}`
                              : q.resultType || 'Passed';
                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 hover:border-indigo-300 transition space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#060D1F] text-[#F7E09A]">
                                    {q.degreeLevel}
                                  </span>
                                  <h4 className="text-sm font-black text-slate-900 mt-1.5">
                                    {q.examTitle || q.degreeLevel}
                                  </h4>
                                </div>
                                <span className="text-xs font-mono font-black px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 shrink-0">
                                  {q.passingYear || '—'}
                                </span>
                              </div>

                              <p className="text-xs font-bold text-slate-600">{q.boardOrUniversity || 'N/A'}</p>

                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {q.majorOrGroup && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                                    বিষয়: {q.majorOrGroup}
                                  </span>
                                )}
                                {canViewSensitive && resultLabel && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {resultLabel}
                                  </span>
                                )}
                                {canViewSensitive && q.courseDuration && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                    মেয়াদ: {q.courseDuration}
                                  </span>
                                )}
                              </div>

                              {canViewSensitive && (q.rollNumber || q.registrationNumber) && (
                                <p className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200/70">
                                  {q.rollNumber ? `Roll: ${q.rollNumber}` : ''}
                                  {q.rollNumber && q.registrationNumber ? ' · ' : ''}
                                  {q.registrationNumber ? `Reg: ${q.registrationNumber}` : ''}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 6. Present & Permanent Address (Admin / Self Only) */}
                  {canViewSensitive && presentAddr && (
                    <div className="bg-white rounded-[26px] p-5 sm:p-6 shadow-sm border border-slate-200/80">
                      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                            <MapPin size={20} />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900">ঠিকানা (Present & Permanent Address)</h3>
                            <p className="text-[11px] font-semibold text-slate-400">দ্বিভাষিক ঠিকানার বিবরণ</p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                            isSameAddress
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {isSameAddress ? 'বর্তমান ও স্থায়ী একই' : 'আলাদা স্থায়ী ঠিকানা'}
                        </span>
                      </div>

                      <div className={`mt-4 grid grid-cols-1 ${!isSameAddress ? 'md:grid-cols-2' : ''} gap-4`}>
                        <AddressCard title="বর্তমান ঠিকানা (Present)" addr={presentAddr} theme="navy" />
                        {!isSameAddress && permanentAddr && (
                          <AddressCard title="স্থায়ী ঠিকানা (Permanent)" addr={permanentAddr} theme="indigo" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* 7. Employment Service History (Admin / Self Only) */}
                  {canViewSensitive && employmentHistory.length > 0 && (
                    <div className="bg-white rounded-[26px] p-5 sm:p-6 shadow-sm border border-slate-200/80">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                          <Clock size={20} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">চাকরির মেয়াদকাল (Service History)</h3>
                          <p className="text-[11px] font-semibold text-slate-400">মাদ্রাসায় কর্মকালের ধারাবাহিক রেকর্ড</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {employmentHistory.map((period, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                          >
                            <div>
                              <p className="text-xs font-black text-slate-800">
                                {formatDate(period.startDate)} → {period.endDate ? formatDate(period.endDate) : 'বর্তমান'}
                              </p>
                              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                                মেয়াদ: {calculateDuration(period.startDate, period.endDate) || 'চলমান'}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                                period.endDate
                                  ? 'bg-slate-200 text-slate-600'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {period.endDate ? 'সমাপ্ত' : 'চলমান'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'attendance' && (
                <TeacherMonthlyAttendancePanel teacherId={teacher._id} />
              )}

              {activeTab === 'salary' && (
                <TeacherSalaryHistoryPanel
                  teacherId={teacher._id}
                  teacherCode={teacher.teacherCode}
                />
              )}

              {activeTab === 'password' && (
                <PasswordSecurityPanel
                  teacher={teacher}
                  currentUser={currentUser}
                  isSelf={isSelf}
                  isAdmin={isAdmin}
                />
              )}

              {activeTab === 'update' && isAdmin && (
                <Suspense fallback={<div className="rounded-2xl bg-white p-6 text-center text-sm font-bold text-slate-500">এডিটর লোড হচ্ছে...</div>}>
                  <TeacherProfileEditorBridge
                    teacher={teacher}
                    onClose={() => setActiveTab('profile')}
                    onUpdated={setTeacher}
                    isSuperAdmin={currentUser?.isSuperAdmin || currentUser?.erpRole === 'SuperAdmin'}
                  />
                </Suspense>
              )}

              {activeTab === 'settings' && (
                <UpcomingTabPanel
                  icon={Settings}
                  accent="navy"
                  title="অ্যাকাউন্ট কন্ট্রোল ও সেটিংস (Admin Settings)"
                  description="এই ট্যাবে শিক্ষকের অ্যাকাউন্ট স্ট্যাটাস, রেজিস্ট্রেশন অনুমোদন এবং শ্রেণি-শিক্ষক নিয়ন্ত্রণ যুক্ত করা হবে।"
                  highlights={['অ্যাকাউন্ট সক্রিয় / নিষ্ক্রিয়', 'রেজিস্ট্রেশন অনুমোদন ও অবস্থা', 'শ্রেণি শিক্ষক ও রোল কন্ট্রোল']}
                />
              )}
            </main>
          </div>
        </div>
      </div>

      {/* ==================== FULLSCREEN PHOTO LIGHTBOX ==================== */}
      {photoModalOpen && (
        <div
          onClick={() => setPhotoModalOpen(false)}
          className="fixed inset-0 z-[200] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPhotoModalOpen(false)}
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
            >
              <X size={20} />
            </button>
            <img
              src={photoUrl}
              alt={teacher.fullNameEng}
              className="w-full max-h-[75vh] object-contain rounded-3xl border-2 border-[#D4A843]/60 shadow-2xl bg-slate-900"
            />
            <div className="text-center mt-3 text-white">
              <p className="text-sm font-black">{teacher.fullNameBng}</p>
              <p className="text-xs text-slate-400">{teacher.designationBng || teacher.designation}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── KPI MINI CARD ──
const KpiMiniCard = ({ icon: Icon, label, value, sub, accent }) => (
  <div className="bg-white rounded-[22px] p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}18`, color: accent }}
      >
        <Icon size={15} />
      </div>
    </div>
    <p className="text-base sm:text-lg font-black text-slate-900 mt-2 truncate">{value}</p>
    <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">{sub}</p>
  </div>
);

// ── INFO SECTION CARD ──
const InfoSectionCard = ({ title, subtitle, icon: Icon, accent, rows, copiedKey, onCopy, footer }) => (
  <div className="bg-white rounded-[26px] p-5 shadow-sm border border-slate-200/80">
    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}14`, color: accent }}
      >
        <Icon size={19} />
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{subtitle}</p>
      </div>
    </div>

    <div className="mt-3 space-y-1">
      {rows.map((row, idx) => (
        <div
          key={idx}
          className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl ${
            idx % 2 === 0 ? 'bg-slate-50/90' : 'bg-white'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-500 shrink-0">{row.label}</span>
          <div className="flex items-center gap-1.5 min-w-0 justify-end">
            <span
              className={`text-xs font-black text-right break-words ${
                row.mono ? 'font-mono' : ''
              } ${
                row.danger
                  ? 'text-red-600'
                  : row.badge
                  ? 'px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-900'
              }`}
            >
              {row.value || 'N/A'}
            </span>
            {row.copyKey && row.value && row.value !== 'N/A' && (
              <button
                type="button"
                onClick={() => onCopy(row.value, row.copyKey)}
                className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 shrink-0 transition"
                title="কপি করুন"
              >
                {copiedKey === row.copyKey ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
    {footer}
  </div>
);

// ── ADDRESS CARD ──
const AddressCard = ({ title, addr, theme }) => {
  const bnText = [
    addr.houseNameBn || addr.houseOrRoad,
    addr.villageBn || addr.village,
    addr.unionBn,
    addr.upazilaBn || addr.upazila,
    addr.districtBn || addr.district,
    addr.divisionBn
  ]
    .filter(Boolean)
    .join(', ');

  const enText = [
    addr.houseNameEn || addr.houseOrRoad,
    addr.villageEn || addr.village,
    addr.unionEn,
    addr.upazilaEn || addr.upazila,
    addr.districtEn || addr.district,
    addr.divisionEn
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200">
      <div
        className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider ${
          theme === 'indigo' ? 'bg-indigo-950 text-indigo-200' : 'bg-[#060D1F] text-[#F7E09A]'
        }`}
      >
        {title}
      </div>
      <div className="p-3.5 bg-slate-50 space-y-2.5">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">বাংলা ঠিকানা</p>
          <p className="text-xs font-bold text-slate-800 mt-0.5 leading-relaxed">{bnText ? `${bnText}।` : 'N/A'}</p>
        </div>
        <div className="pt-2 border-t border-slate-200/80">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">English Address</p>
          <p className="text-xs font-semibold text-slate-600 mt-0.5 leading-relaxed">{enText ? `${enText}.` : 'N/A'}</p>
        </div>
        <div className="pt-2 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white rounded-xl py-1.5 px-2 border border-slate-200/70">
            <span className="text-[9px] font-black text-slate-400 block">Post Office</span>
            <span className="text-[11px] font-black text-slate-800">{addr.postOffice || 'N/A'}</span>
          </div>
          <div className="bg-white rounded-xl py-1.5 px-2 border border-slate-200/70">
            <span className="text-[9px] font-black text-slate-400 block">Post Code</span>
            <span className="text-[11px] font-mono font-black text-slate-800">{addr.postCode || 'N/A'}</span>
          </div>
          <div className="bg-white rounded-xl py-1.5 px-2 border border-slate-200/70">
            <span className="text-[9px] font-black text-slate-400 block">Ward No</span>
            <span className="text-[11px] font-black text-slate-800">{addr.wardNo || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── UPCOMING PLACEHOLDER TAB PANEL ──
const UpcomingTabPanel = ({ icon: Icon, accent, title, description, highlights = [] }) => {
  const palette = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    navy: 'bg-slate-100 text-[#060D1F] border-slate-300'
  };

  return (
    <div className="bg-white rounded-[28px] p-8 sm:p-10 shadow-sm border border-slate-200/80 text-center">
      <div
        className={`w-16 h-16 rounded-3xl border mx-auto flex items-center justify-center mb-4 ${
          palette[accent] || palette.navy
        }`}
      >
        <Icon size={28} />
      </div>
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#060D1F] text-[#F7E09A] text-[10px] font-black uppercase tracking-widest">
        <Sparkles size={11} /> পরবর্তী ধাপে সক্রিয় হবে
      </span>
      <h3 className="text-lg font-black text-slate-900 mt-3">{title}</h3>
      <p className="text-xs sm:text-sm font-semibold text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
        {description}
      </p>

      {highlights.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {highlights.map((h, i) => (
            <span
              key={i}
              className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-600"
            >
              • {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ── LIVE PASSWORD CHANGE & ADMIN RESET PANEL ──
const PasswordSecurityPanel = ({ teacher, currentUser, isSelf, isAdmin }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [copiedPass, setCopiedPass] = useState(false);

  const isTargetAdmin = ['Admin', 'SuperAdmin'].includes(teacher?.role);
  const isCurrentSuperAdmin = currentUser?.isSuperAdmin || currentUser?.erpRole === 'SuperAdmin';
  const blockedBySuperAdminRule = !isSelf && isTargetAdmin && !isCurrentSuperAdmin;

  // পাসওয়ার্ড শক্তি (Strength) হিসাব
  const strength = useMemo(() => {
    if (!newPassword) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 10) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 1) return { score: 1, label: 'দুর্বল', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'মাঝারি', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'ভালো', color: 'bg-sky-500' };
    return { score: 4, label: 'শক্তিশালী', color: 'bg-emerald-500' };
  }, [newPassword]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#';
    let pass = 'Ardm@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setConfirmPassword(pass);
    setShowNew(true);
    setFeedback({ type: '', text: '' });
  };

  const handleCopyGenerated = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });

    const cleanNew = newPassword.trim();
    if (isSelf && !currentPassword.trim()) {
      return setFeedback({ type: 'error', text: 'আপনার বর্তমান পাসওয়ার্ড প্রদান করুন।' });
    }
    if (cleanNew.length < 6 || cleanNew.length > 64) {
      return setFeedback({ type: 'error', text: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ থেকে ৬৪ অক্ষরের মধ্যে হতে হবে।' });
    }
    if (cleanNew !== confirmPassword.trim()) {
      return setFeedback({ type: 'error', text: 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না!' });
    }
    if (isSelf && currentPassword.trim() === cleanNew) {
      return setFeedback({ type: 'error', text: 'নতুন পাসওয়ার্ড বর্তমান পাসওয়ার্ডের চেয়ে আলাদা হতে হবে।' });
    }

    setSubmitting(true);
    try {
      if (isSelf) {
        const res = await authApi.changePassword(currentPassword.trim(), cleanNew, currentUser);
        setFeedback({
          type: 'success',
          text: res?.message || 'আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!'
        });
      } else {
        const res = await teacherPortalApi.resetTeacherPassword(teacher._id, cleanNew);
        setFeedback({
          type: 'success',
          text: res?.message || `${teacher.fullNameBng}-এর পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!`
        });
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setFeedback({
        type: 'error',
        text: extractApiErrorMessage(err, 'পাসওয়ার্ড পরিবর্তন করা যায়নি। আবার চেষ্টা করুন।')
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (blockedBySuperAdminRule) {
    return (
      <div className="bg-white rounded-[28px] p-8 shadow-sm border border-red-200/80 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 border border-red-200 mx-auto flex items-center justify-center mb-3">
          <Lock size={24} />
        </div>
        <h3 className="text-base font-black text-slate-900">সুপার অ্যাডমিন অনুমতি আবশ্যক</h3>
        <p className="text-xs font-semibold text-slate-500 mt-1 max-w-md mx-auto">
          অ্যাডমিন বা সুপার অ্যাডমিন অ্যাকাউন্টের পাসওয়ার্ড শুধুমাত্র সুপার অ্যাডমিন রিসেট করতে পারবেন।
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[28px] p-5 sm:p-7 shadow-sm border border-slate-200/80 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <KeyRound size={21} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              {isSelf ? 'নিজের পাসওয়ার্ড পরিবর্তন করুন' : `অ্যাডমিন পাসওয়ার্ড রিসেট (${teacher.fullNameBng})`}
            </h3>
            <p className="text-[11px] font-semibold text-slate-400">
              {isSelf
                ? 'পাসওয়ার্ড পরিবর্তন করলে সেশন স্বয়ংক্রিয়ভাবে নিরাপদ নতুন টোকেনে আপডেট হবে'
                : 'রিসেট করলে শিক্ষকের অ্যাকাউন্ট লক থাকলে সেটিও স্বয়ংক্রিয়ভাবে আনলক হয়ে যাবে'}
            </p>
          </div>
        </div>

        {!isSelf && isAdmin && (
          <button
            type="button"
            onClick={generateRandomPassword}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-[#060D1F] text-slate-700 hover:text-[#F7E09A] text-xs font-black flex items-center gap-1.5 transition"
          >
            <RefreshCw size={13} /> অটো পাসওয়ার্ড তৈরি
          </button>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback.text && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-black flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle size={16} className="shrink-0 text-red-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        {isSelf && (
          <div>
            <label className="text-[11px] font-black text-slate-600 block mb-1.5 ml-1">
              বর্তমান পাসওয়ার্ড (Current Password)
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="আপনার বর্তমান পাসওয়ার্ড লিখুন"
                className="w-full px-4 py-3 pr-11 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#060D1F] text-sm font-bold text-slate-900 outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5 ml-1">
            <label className="text-[11px] font-black text-slate-600">
              নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)
            </label>
            {newPassword && (
              <button
                type="button"
                onClick={handleCopyGenerated}
                className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                {copiedPass ? <Check size={11} /> : <Copy size={11} />}
                <span>{copiedPass ? 'কপি হয়েছে' : 'কপি করুন'}</span>
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="নতুন পাসওয়ার্ড দিন"
              className="w-full px-4 py-3 pr-11 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#060D1F] text-sm font-mono font-bold text-slate-900 outline-none transition"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Strength Bar */}
          {newPassword && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 grid grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((lvl) => (
                  <div
                    key={lvl}
                    className={`h-1.5 rounded-full transition-all ${
                      strength.score >= lvl ? strength.color : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-black text-slate-500 w-16 text-right">{strength.label}</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-600 block mb-1.5 ml-1">
            নতুন পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)
          </label>
          <input
            type={showNew ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="নতুন পাসওয়ার্ডটি আবার লিখুন"
            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#060D1F] text-sm font-mono font-bold text-slate-900 outline-none transition"
            required
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-2xl bg-[#060D1F] hover:bg-slate-800 text-[#F7E09A] text-xs font-black flex items-center gap-2 shadow-lg disabled:opacity-50 transition"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
            <span>
              {submitting
                ? 'সংরক্ষণ হচ্ছে...'
                : isSelf
                ? 'পাসওয়ার্ড পরিবর্তন করুন'
                : 'পাসওয়ার্ড রিসেট করুন'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeacherProfileDetailView;