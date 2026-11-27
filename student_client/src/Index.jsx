/**
- ARDM Student Portal — Main entry (VIEW wiring with React Router · Desktop & Mobile Responsive)
 */
import {
  AlertCircle,
  Award,
  Check,
  ChevronLeft,
  Contact,
  Copy,
  FileText,
  Filter,
  GraduationCap,
  Home,
  IdCard,
  Layers,
  Loader2,
  Menu,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  User,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import AdvancedFilter from './AdvancedFilter';
import { CLASS_ORDER, CONFIG } from "./config/systemConfig";
import useStudentController from "./controllers/useStudentController";
import ImageViewer from './ImageViewer';
import { canCreateStudent, canEditStudent } from './models/studentModel';
import PdfExportModal from './PdfExportModal';
import { systemSettingsApi } from './services/studentApiService';
import DetailView from "./views/DetailView";
import FullForm from "./views/FullForm";
import LoginView from "./views/LoginView";
import BulkPromotionView from "./views/BulkPromotionView";
import TeacherProfileView from "./views/TeacherProfileView";
import {
  AnimatedCount,
  GenderBar,
  Header,
  NavTab,
  PremiumStudentCard,
  PremiumStyles,
  SkeletonCard
} from "./views/UIComponents";

const Index = () => {
  const navigate = useNavigate();
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  const {
    currentUser, authLoading, portalSettings, login, handleLogout,
    loading, processing, isSyncing, loadData,
    tab, detailData, isEdit, studentId,
    searchText, setSearchText, classFilter, setClassFilter, sortConfig, setSortConfig,
    isFilterOpen, setIsFilterOpen, advancedFilteredData, setAdvancedFilteredData,
    isPdfModalOpen, setIsPdfModalOpen, showAllExports, setShowAllExports,
    viewerImg, setViewerImg, setScrollPos,
    toast, setToast, showToast, contactProgress,
    filteredList, siblingsOfDetail,
    students,
    handleSave, handleDelete,
    handleExportTablePDF, handleExportExcel, handleCopyAllIds,
    handleExportContacts, handleExportPDF, handleExportAllIDCards,
    checkExportPermission
  } = useStudentController();

  const canAddStudent = canCreateStudent(currentUser, null, portalSettings);
  const canAccessFormRoute = isEdit
    ? (!detailData || canEditStudent(currentUser, detailData, portalSettings))
    : canAddStudent;
  const roleFilteredStudents = students;

  // সিঙ্ক বাটন হ্যান্ডলার (ডাটা + সিস্টেম সেটিংস রিফ্রেশ)
  const handleManualSync = async () => {
    if (isSyncing) return;
    try {
      await Promise.allSettled([
        loadData(true),
        systemSettingsApi.getSettings()
      ]);
      showToast("ডাটা ও সেটিংস সফলভাবে সিঙ্ক হয়েছে", "success");
    } catch {
      showToast("সিঙ্ক করতে সমস্যা হয়েছে", "error");
    }
  };

  // নিচের ৩-বার মেনুর ভাসমান আইটেমসমূহ (ভবিষ্যতে এখানে আরও যোগ করা যাবে)
  const floatingMenuItems = [
    {
      id: 'result',
      label: 'ফলাফল (Result)',
      subLabel: 'পরীক্ষার ফলাফল ও মার্কশিট',
      icon: Award,
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-400/30',
      path: '/result'
    },
    {
      id: 'teacher',
      label: 'শিক্ষক (Teacher)',
      subLabel: 'শিক্ষক তালিকা ও তথ্যভাণ্ডার',
      icon: GraduationCap,
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-400/30',
      path: '/teacher'
    },
    ...(currentUser?.role === 'Admin'
      ? [
          {
            id: 'promote',
            label: 'প্রমোশন (Promotion)',
            subLabel: 'বাল্ক ক্লাস, রোল ও সেশন আপডেট',
            icon: Layers,
            iconBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
            path: '/promote'
          }
        ]
      : [])
  ];

  if (authLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F0F4FF]">
        <Loader2 className="animate-spin text-[#060D1F] mb-3" size={40} />
        <p className="text-xs font-black text-slate-500 tracking-wider">পোর্টাল লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLogin={login} />;
  }

  const teacherName = currentUser?.nameBn || currentUser?.fullNameBng || currentUser?.name || 'শিক্ষক';

  return (
    <div className="bg-[#F0F4FF] min-h-screen font-bangla text-slate-800 pb-24 lg:pb-12">
      {/* Processing Overlay */}
      {processing && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-[200] flex flex-col items-center justify-center text-white">
          <div className="bg-white/10 border border-white/15 backdrop-blur-md px-8 py-6 rounded-3xl flex flex-col items-center">
            <Loader2 size={42} className="animate-spin text-[#D4A843] mb-3" />
            <p className="font-black text-sm tracking-wide">কাজ চলছে, অপেক্ষা করুন...</p>
          </div>
        </div>
      )}

      {/* Contact Export Progress Modal */}
      {contactProgress.show && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-7 w-full max-w-xs text-center shadow-2xl border border-slate-100">
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg,#0E7490,#22D3EE)' }}
            >
              <Contact size={26} color="white" strokeWidth={2.2} />
            </div>
            <h3 className="font-black text-slate-800 text-sm mb-1">কন্টাক কার্ড তৈরি হচ্ছে</h3>
            <p className="text-[11px] font-bold text-slate-400 mb-4 truncate">
              {contactProgress.current < contactProgress.total
                ? contactProgress.name || 'শুরু হচ্ছে...'
                : 'ফাইল প্রস্তুত হচ্ছে...'}
            </p>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${contactProgress.total ? Math.round((contactProgress.current / contactProgress.total) * 100) : 0}%`,
                  background: 'linear-gradient(90deg,#0E7490,#22D3EE)',
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-black text-slate-400">
              <span>{contactProgress.current} / {contactProgress.total}</span>
              <span>{contactProgress.total ? Math.round((contactProgress.current / contactProgress.total) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ROUTE: / (HOME DASHBOARD) ==================== */}
      {tab === 'home' && !studentId && (
        <>
          <PremiumStyles />

          {/* TOP HEADER BAR (Responsive Desktop + Mobile) */}
          <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/70 shadow-[0_4px_20px_rgba(6,13,31,0.04)]">
            <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 lg:h-[72px] flex items-center justify-between gap-3">
              {/* Brand Logo & Title */}
              <div
                onClick={() => navigate('/')}
                className="flex items-center gap-2.5 cursor-pointer select-none"
              >
                <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-[#060D1F] to-[#0E3B2E] border border-[#D4A843]/40 flex items-center justify-center text-[#D4A843] font-black text-sm shadow-sm">
                  A
                </div>
                <div>
                  <h1 className="text-base lg:text-lg font-black tracking-tight text-slate-900 leading-none">
                    ARDM <span className="text-xs font-extrabold text-emerald-700 hidden sm:inline">· Student Portal</span>
                  </h1>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 hidden sm:block">
                    আবদুর রাজ্জাক দাখিল মাদ্রাসা
                  </p>
                </div>
              </div>

              {/* Desktop Center Quick Navigation */}
              <nav className="hidden lg:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/60">
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 rounded-xl bg-[#060D1F] text-[#D4A843] text-xs font-black flex items-center gap-1.5 shadow-sm"
                >
                  <Home size={14} /> ড্যাশবোর্ড
                </button>
                <button
                  onClick={() => navigate('/search')}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-white hover:text-slate-900 text-xs font-black flex items-center gap-1.5 transition"
                >
                  <Search size={14} /> খুঁজুন
                </button>
                {canAddStudent && (
                  <button
                    onClick={() => navigate('/admission/1')}
                    className="px-4 py-2 rounded-xl text-emerald-700 hover:bg-emerald-50 text-xs font-black flex items-center gap-1.5 transition"
                  >
                    <UserPlus size={14} /> নতুন ভর্তি
                  </button>
                )}
                <button
                  onClick={() => navigate('/result')}
                  className="px-4 py-2 rounded-xl text-amber-700 hover:bg-amber-50 text-xs font-black flex items-center gap-1.5 transition"
                >
                  <Award size={14} /> ফলাফল
                </button>
                <button
                  onClick={() => navigate('/teacher')}
                  className="px-4 py-2 rounded-xl text-blue-700 hover:bg-blue-50 text-xs font-black flex items-center gap-1.5 transition"
                >
                  <GraduationCap size={14} /> শিক্ষক
                </button>
                {currentUser?.role === 'Admin' && (
                  <button
                    onClick={() => navigate('/promote')}
                    className="px-4 py-2 rounded-xl text-indigo-700 hover:bg-indigo-50 text-xs font-black flex items-center gap-1.5 transition"
                  >
                    <Layers size={14} /> প্রমোশন
                  </button>
                )}
              </nav>

              {/* Right Actions: Sync & Profile Pill */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  title="ডাটা ও সেটিংস সিঙ্ক করুন"
                  className="p-2.5 bg-slate-100 hover:bg-slate-200/80 active:scale-95 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                >
                  <RefreshCw size={18} className={`transition-all duration-300 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-600'}`} />
                  <span className="hidden xl:inline text-[11px] font-black text-slate-600">সিঙ্ক</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  title="আমার প্রোফাইল ও হাজিরা"
                  className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-2xl bg-[#060D1F] hover:bg-slate-800 border border-[#D4A843]/40 text-white shadow-sm active:scale-95 transition"
                >
                  <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl overflow-hidden bg-white/10 border border-[#D4A843] text-[#F7E09A] flex items-center justify-center shrink-0">
                    {currentUser?.photoUrl ? (
                      <img src={currentUser.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={15} />
                    )}
                  </div>
                  <div className="hidden sm:block text-left max-w-[120px]">
                    <p className="text-[11px] font-black text-[#F7E09A] leading-tight truncate">{teacherName}</p>
                    <p className="text-[9px] font-bold text-slate-400 leading-tight truncate">প্রোফাইল দেখুন</p>
                  </div>
                </button>
              </div>
            </div>
          </header>

          {/* MAIN WORKSPACE (Responsive 12-Col Grid on Desktop) */}
          <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-20 lg:pt-24 pb-28 lg:pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">

              {/* ================= LEFT SIDEBAR (4 COLS ON DESKTOP): STATS + EXPORT ================= */}
              <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4 lg:space-y-5">
                {/* HERO STATS CARD */}
                <div className="ardm-hero-bg relative rounded-[28px] overflow-hidden shadow-xl" style={{ padding: '26px 22px 22px' }}>
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <svg className="ardm-pattern-spin absolute -right-20 -top-20 w-72 h-72 opacity-[0.04]" viewBox="0 0 200 200" fill="none">
                      {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map((a, i) => (
                        <rect key={i} x="97" y="5" width="6" height="190" rx="3" fill="white" transform={`rotate(${a} 100 100)`} />
                      ))}
                      <circle cx="100" cy="100" r="30" stroke="white" strokeWidth="2" />
                      <circle cx="100" cy="100" r="58" stroke="white" strokeWidth="1" />
                      <circle cx="100" cy="100" r="86" stroke="white" strokeWidth="0.5" strokeDasharray="5 9" />
                    </svg>
                    <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, #D4A84340 0%, transparent 70%)' }} />
                    <div className="absolute right-8 top-6 w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle, #60A5FA18 0%, transparent 70%)' }} />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 rounded-full bg-amber-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                          {currentUser?.role === 'Admin' ? 'Admin Dashboard' : `Class ${currentUser?.classEn || ''} Dashboard`}
                        </span>
                      </div>
                      <Sparkles size={14} className="text-[#D4A843]/70" />
                    </div>

                    <div className="flex items-end justify-between mb-6">
                      <div>
                        <AnimatedCount target={filteredList.length} />
                        <p className="text-slate-400 text-xs font-bold mt-1.5 tracking-wide">মোট শিক্ষার্থী</p>
                      </div>
                      <div className="ardm-float ardm-glass rounded-2xl px-4 py-3 text-center">
                        <div className="text-white text-xl font-black leading-none">
                          {[...new Set(filteredList.map(s => s.ClassBn))].length}
                        </div>
                        <div className="text-slate-400 text-[9px] font-bold mt-0.5 uppercase tracking-widest">Classes</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <GenderBar label="Male" count={filteredList.filter(s => s.Gender === 'Male').length} total={filteredList.length} color="#60A5FA" delay="0.5s" />
                      <GenderBar label="Female" count={filteredList.filter(s => s.Gender === 'Female').length} total={filteredList.length} color="#F472B6" delay="0.65s" />
                    </div>

                    <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Session</span>
                      <span className="text-[11px] font-black text-white">
                        {[...new Set(filteredList.map(s => s.Session))].sort().join(', ') || '—'}
                      </span>
                      <span className="ml-auto text-[9px] font-black text-slate-400">
                        Active <span className="text-emerald-400">{filteredList.filter(s => s.Status === 'Active').length}</span>
                        {' / '}Inactive <span className="text-red-400">{filteredList.filter(s => s.Status !== 'Active').length}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* EXPORT & PRINT CARD */}
                <div className="bg-white rounded-[24px] p-5" style={{ boxShadow: '0 4px 20px rgba(6,13,31,0.055)', border: '1px solid rgba(6,13,31,0.06)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">Export & Print</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>

                  {(() => {
                    const exportButtons = [
                      { icon: FileText, label: 'Excel', gradient: 'linear-gradient(135deg,#047857,#10B981)', glow: '#10B981', onClick: handleExportExcel },
                      { icon: Printer, label: 'PDF Info', gradient: 'linear-gradient(135deg,#C2410C,#F97316)', glow: '#F97316', onClick: handleExportPDF },
                      { icon: Layers, label: 'Table', gradient: 'linear-gradient(135deg,#1E3A8A,#3B82F6)', glow: '#3B82F6', onClick: handleExportTablePDF },
                      { icon: IdCard, label: 'ID Card', gradient: 'linear-gradient(135deg,#5B21B6,#8B5CF6)', glow: '#8B5CF6', onClick: handleExportAllIDCards },
                      { icon: Printer, label: 'Smart PDF', gradient: 'linear-gradient(135deg,#4F46E5,#818CF8)', glow: '#818CF8', onClick: () => { if (checkExportPermission()) setIsPdfModalOpen(true); } },
                      { icon: Contact, label: 'Contact', gradient: 'linear-gradient(135deg,#0E7490,#22D3EE)', glow: '#22D3EE', onClick: handleExportContacts },
                    ];
                    const mainButtons = exportButtons.slice(0, 4);
                    const extraButtons = exportButtons.slice(4);

                    const renderBtn = ({ icon: Icon, label, gradient, glow, onClick }, i) => (
                      <button
                        key={label}
                        onClick={onClick}
                        className="ardm-export-btn ardm-export-pop flex flex-col items-center gap-2 group"
                        style={{ transition: 'transform 0.15s ease', animationDelay: `${i * 0.05}s` }}
                      >
                        <div
                          className="w-13 h-13 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform"
                          style={{ background: gradient, boxShadow: `0 6px 18px ${glow}40` }}
                        >
                          <Icon size={20} color="white" strokeWidth={2.2} />
                        </div>
                        <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wide text-center">{label}</span>
                      </button>
                    );

                    return (
                      <>
                        <div className="grid grid-cols-4 gap-2">
                          {mainButtons.map((btn, i) => renderBtn(btn, i))}
                        </div>

                        <div
                          className="grid transition-all duration-350 ease-out"
                          style={{
                            gridTemplateRows: showAllExports ? '1fr' : '0fr',
                            opacity: showAllExports ? 1 : 0,
                            marginTop: showAllExports ? 12 : 0,
                            transitionProperty: 'grid-template-rows, opacity, margin-top',
                          }}
                        >
                          <div className="overflow-hidden">
                            <div className="grid grid-cols-4 gap-2">
                              {showAllExports && extraButtons.map((btn, i) => renderBtn(btn, i))}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setShowAllExports(v => !v)}
                          className="w-full mt-3 py-2 rounded-xl text-[11px] font-black text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 active:scale-95 transition"
                          style={{ background: 'rgba(6,13,31,0.04)' }}
                        >
                          {showAllExports ? 'Show Less' : 'See More'}
                          <ChevronLeft
                            size={12}
                            className="transition-transform duration-300"
                            style={{ transform: showAllExports ? 'rotate(90deg)' : 'rotate(-90deg)' }}
                          />
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* ================= RIGHT WORKSPACE (8 COLS ON DESKTOP): FILTERS + STUDENT GRID ================= */}
              <div className="lg:col-span-8 space-y-4">
                {/* FILTER & TOOLBAR CARD */}
                <div className="bg-white rounded-[24px] p-4 lg:p-5 shadow-sm border border-slate-200/70 space-y-3.5">
                  {/* Class Filter Pills */}
                  <div className="flex gap-2 overflow-x-auto lg:flex-wrap ardm-no-scrollbar pb-0.5">
                    {['All', ...Object.keys(CLASS_ORDER)].map(cls => {
                      const active = classFilter === cls;
                      return (
                        <button
                          key={cls}
                          onClick={() => setClassFilter(cls)}
                          className="shrink-0 px-4 py-1.5 rounded-full text-[11px] font-black transition-all"
                          style={{
                            ...(active
                              ? { background: '#060D1F', color: '#D4A843', boxShadow: '0 4px 14px rgba(6,13,31,0.28)', border: '1px solid rgba(212,168,67,0.3)' }
                              : { background: 'rgba(6,13,31,0.06)', color: '#64748B', border: '1px solid transparent' }
                            ),
                          }}
                        >
                          {cls === 'All' ? 'সকল শ্রেণি' : cls}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Desktop Inline Search + Sort + Filter + Copy */}
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="নাম, আইডি বা রোল লিখে দ্রুত খুঁজুন..."
                        className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 focus:bg-white focus:border-[#060D1F] text-xs font-bold text-slate-700 outline-none transition"
                      />
                      {searchText && (
                        <button
                          onClick={() => setSearchText('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1 sm:w-44">
                        <select
                          value={`${sortConfig.field}_${sortConfig.order}`}
                          onChange={e => { const [field, order] = e.target.value.split('_'); setSortConfig({ field, order }); }}
                          className="w-full py-2.5 pl-3 pr-8 rounded-xl text-[11px] font-black text-slate-600 outline-none appearance-none bg-slate-50 border border-slate-200/80"
                        >
                          <option value="_">Sort: Default</option>
                          <option value="name_asc">Name A → Z</option>
                          <option value="name_desc">Name Z → A</option>
                          <option value="roll_asc">Roll ↑</option>
                          <option value="roll_desc">Roll ↓</option>
                          <option value="class_asc">Class ↑</option>
                          <option value="class_desc">Class ↓</option>
                          <option value="time_desc">Newest First</option>
                          <option value="time_asc">Oldest First</option>
                          <option value="dob_asc">Birthday</option>
                          {currentUser?.role === 'Admin' && <option value="family_asc">Siblings Group</option>}
                        </select>
                        <ChevronLeft size={12} className="-rotate-90 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>

                      <button
                        onClick={() => { window.history.pushState({ page: 'filter' }, ''); setIsFilterOpen(true); }}
                        className="px-4 py-2.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shrink-0 transition"
                        style={{
                          ...(advancedFilteredData !== null
                            ? { background: '#060D1F', color: '#D4A843', boxShadow: '0 4px 14px rgba(6,13,31,0.28)' }
                            : { background: 'rgba(6,13,31,0.06)', color: '#475569' }
                          ),
                        }}
                      >
                        <Filter size={14} />
                        {advancedFilteredData !== null ? `(${advancedFilteredData.length})` : 'Filter'}
                      </button>

                      <button
                        onClick={handleCopyAllIds}
                        title="সব আইডি কপি করুন"
                        className="px-3.5 py-2.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shrink-0 bg-slate-100 hover:bg-slate-200/70 text-slate-600 transition"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Result Counter Bar */}
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[11px] font-black text-slate-500">
                      মোট <span className="text-slate-900">{filteredList.length}</span> জন শিক্ষার্থী প্রদর্শিত হচ্ছে
                    </span>
                    <div className="h-px flex-1 bg-slate-100" />
                    {advancedFilteredData !== null && (
                      <button onClick={() => setAdvancedFilteredData(null)} className="text-[10px] font-black text-red-500 flex items-center gap-1">
                        <X size={11} /> Clear Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* STUDENT LIST (1 Col Mobile, 2 Cols Desktop) */}
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} index={i} />)}
                  </div>
                ) : filteredList.length === 0 ? (
                  <div className="bg-white rounded-[28px] border border-slate-200/70 flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 bg-slate-100">
                      <Users size={32} className="text-slate-400" />
                    </div>
                    <h3 className="font-black text-slate-600 text-sm">কোনো তথ্য পাওয়া যায়নি</h3>
                    <p className="text-slate-400 text-xs mt-1 font-semibold">ফিল্টার বা সার্চ পরিবর্তন করে আবার চেষ্টা করুন</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filteredList.map((s, i) => (
                      <PremiumStudentCard
                        key={s.ID || i}
                        data={s}
                        index={i}
                        showBirthdayCount={sortConfig.field === 'dob'}
                        onImageClick={(img) => setViewerImg(img)}
                        onClick={(data) => {
                          setScrollPos(window.scrollY);
                          navigate(`/students/${data.ID}`);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== ROUTE: /profile ==================== */}
      {tab === 'profile' && (
        <TeacherProfileView
          currentUser={currentUser}
          onBack={() => navigate('/')}
          onLogout={handleLogout}
        />
      )}

      {/* ==================== ROUTE: /promote ==================== */}
      {tab === 'promote' && (
        <BulkPromotionView
          students={students}
          currentUser={currentUser}
          showToast={showToast}
          onBack={() => navigate('/')}
          onComplete={async () => {
            await loadData(false);
            navigate('/');
          }}
        />
      )}

      {/* ==================== ROUTE: /search ==================== */}
      {tab === 'search' && !studentId && (
        <div className="max-w-4xl mx-auto pt-6 px-4 lg:px-6 min-h-screen flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => navigate('/')}
              className="p-3.5 rounded-2xl bg-white shadow-sm border border-slate-200/80 text-slate-700 hover:bg-slate-50 active:scale-95 transition"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                autoFocus
                className="w-full bg-white pl-12 pr-10 py-4 rounded-2xl border border-slate-200/80 shadow-sm outline-none focus:ring-2 focus:ring-[#060D1F] font-bold text-base lg:text-lg placeholder:font-medium placeholder:text-slate-300"
                placeholder="নাম, আইডি, রোল বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 pb-24">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredList.map((s, i) => (
                <PremiumStudentCard
                  key={s.ID || i}
                  data={s}
                  index={i}
                  showBirthdayCount={sortConfig.field === 'dob'}
                  onImageClick={(img) => setViewerImg(img)}
                  onClick={(data) => {
                    setScrollPos(window.scrollY);
                    navigate(`/students/${data.ID}`);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== ROUTE: /admission & /students/:id/edit ==================== */}
      {tab === 'add' && (
        !canAccessFormRoute
          ? null
          : (
            <div className="pt-20 px-4 sm:px-6 pb-12 max-w-2xl mx-auto">
              <Header
                title={isEdit ? "Update Info" : "New Admission"}
                onBack={() => document.getElementById("formBackBtn")?.click()}
                action={<div />}
              />

              {isEdit && !detailData ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="animate-spin text-blue-600 mb-3" size={36} />
                  <p className="font-bold text-sm">শিক্ষার্থীর তথ্য লোড হচ্ছে...</p>
                </div>
              ) : (
                <FullForm
                  initialData={isEdit ? detailData : null}
                  currentUser={currentUser}
                  portalSettings={portalSettings}
                  onSave={handleSave}
                  onCancel={() => {
                    if (isEdit && studentId) {
                      navigate(`/students/${studentId}`);
                    } else {
                      navigate('/');
                    }
                  }}
                  showToast={showToast}
                  isAdmin={currentUser.role === 'Admin'}
                />
              )}
            </div>
          )
      )}

      {/* ==================== ROUTE: /students/:id (DETAIL VIEW) ==================== */}
      {studentId && !isEdit && (
        detailData ? (
          <div className="max-w-4xl mx-auto">
            <DetailView
              data={detailData}
              onImageClick={(img) => setViewerImg(img)}
              currentUser={currentUser}
              portalSettings={portalSettings}
              siblings={siblingsOfDetail}
              onSelectSibling={(sib) => {
                navigate(`/students/${sib.ID}`);
              }}
              onBack={() => navigate('/')}
              onEdit={() => navigate(`/students/${detailData.ID}/edit/1`)}
              onDelete={() => handleDelete(detailData.ID)}
            />
          </div>
        ) : (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F0F4FF]">
            {loading ? (
              <>
                <Loader2 className="animate-spin text-blue-600 mb-3" size={40} />
                <p className="font-bold text-sm text-slate-500">প্রোফাইল লোড হচ্ছে...</p>
              </>
            ) : (
              <>
                <p className="font-black text-slate-600 mb-4">শিক্ষার্থীর তথ্য পাওয়া যায়নি</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  হোম পেজে ফিরে যান
                </button>
              </>
            )}
          </div>
        )
      )}

      {/* ==================== FLOATING QUICK MENU (Triggered by Bottom 3-Bar Menu) ==================== */}
      {isQuickMenuOpen && (
        <>
          <div
            onClick={() => setIsQuickMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-950/35 backdrop-blur-[2px] z-40 transition-opacity"
          />
          <div className="lg:hidden fixed bottom-24 right-4 z-50 w-64 rounded-3xl bg-[#060D1F]/95 backdrop-blur-xl border border-[#D4A843]/35 p-3 shadow-[0_20px_50px_rgba(6,13,31,0.55)] text-white">
            <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-white/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D4A843]">
                Quick Menu
              </span>
              <button
                type="button"
                onClick={() => setIsQuickMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1.5">
              {floatingMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setIsQuickMenuOpen(false);
                      navigate(item.path);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 transition text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.iconBg}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-white truncate">{item.label}</p>
                      <p className="text-[10px] font-semibold text-slate-400 truncate">{item.subLabel}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ==================== MOBILE BOTTOM NAV (Hidden on Desktop) ==================== */}
      {!studentId && tab !== 'add' && tab !== 'profile' && tab !== 'promote' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/70 h-20 px-6 flex justify-between items-end pb-3 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <NavTab
            icon={Home}
            label="Home"
            active={tab === 'home' && !isQuickMenuOpen}
            onClick={() => {
              setIsQuickMenuOpen(false);
              navigate('/');
            }}
          />
          {canAddStudent && (
            <NavTab
              icon={UserPlus}
              label="Add"
              main
              onClick={() => {
                setIsQuickMenuOpen(false);
                navigate('/admission/1');
              }}
            />
          )}
          <NavTab
            icon={Menu}
            label="Menu"
            active={isQuickMenuOpen}
            onClick={() => setIsQuickMenuOpen((v) => !v)}
          />
        </div>
      )}

      <ImageViewer src={viewerImg} onClose={() => setViewerImg(null)} />

      {/* ============ PROFESSIONAL TOAST NOTIFICATION ============ */}
      {toast.show && (
        <>
          <style>{`
            @keyframes slideDown {
              0% { transform: translateY(-100%) scale(0.8); opacity: 0; }
              60% { transform: translateY(10px) scale(1.02); opacity: 1; }
              100% { transform: translateY(0) scale(1); opacity: 1; }
            }
            @keyframes shrinkWidth {
              from { width: 100%; }
              to { width: 0%; }
            }
            .animate-toast-entry {
              animation: slideDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
            .animate-progress {
              animation: shrinkWidth 3s linear forwards;
            }
          `}</style>

          <div className="fixed top-0 left-0 right-0 z-[1000] flex justify-center pt-6 pointer-events-none">
            <div className="animate-toast-entry pointer-events-auto relative overflow-hidden bg-white/95 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl w-[90%] max-w-sm">
              <div className="flex items-center gap-4 p-4">
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                  toast.type === 'success'
                    ? 'bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-green-200'
                    : 'bg-gradient-to-br from-red-400 to-pink-600 text-white shadow-red-200'
                }`}>
                  {toast.type === 'success' ? <Check size={24} strokeWidth={3} /> : <AlertCircle size={24} strokeWidth={3} />}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-black uppercase tracking-wider mb-0.5 ${
                    toast.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {toast.type === 'success' ? 'Success' : 'Attention'}
                  </h4>
                  <p className="text-slate-600 text-xs font-bold leading-relaxed">
                    {toast.msg}
                  </p>
                </div>

                <button
                  onClick={() => setToast(prev => ({ ...prev, show: false }))}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className={`h-1 w-full ${
                toast.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                <div className={`h-full animate-progress ${
                  toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                }`}></div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============ ADVANCED FILTER MODAL ============ */}
      <AdvancedFilter
        isOpen={isFilterOpen}
        onClose={() => {
          if (window.history.state && window.history.state.page === "filter") {
            window.history.back();
          } else {
            setIsFilterOpen(false);
          }
        }}
        originalData={roleFilteredStudents}
        onApplyFilter={(result) => {
          if (result.length === roleFilteredStudents.length) {
            setAdvancedFilteredData(null);
          } else {
            setAdvancedFilteredData(result);
          }
        }}
      />

      {/* ============ ADVANCED PDF EXPORT MODAL ============ */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        data={filteredList}
        appName={CONFIG.APP_NAME}
      />
    </div>
  );
};

export default Index;