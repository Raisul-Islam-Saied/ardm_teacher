import {
    Award,
  Briefcase,
  Check,
  CheckSquare,
  ChevronLeft,
  Square,
    Contact,
    Download,
    CreditCard,
    FileSpreadsheet,
    FileText,
    GraduationCap,
    Grid,
    LayoutList,
    Loader2,
    MessageCircle,
    Phone,
    Printer,
    RefreshCw,
    Search,
    Shield,
    Sparkles,
    Users,
    X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONFIG, DEFAULT_IMAGE } from '../config/systemConfig';
import { toUiUser } from '../models/studentModel';
import { extractApiErrorMessage } from '../services/axiosClient';
import { authApi, teacherPortalApi } from '../services/studentApiService';
import {
  downloadTeacherContactsVCF,
  downloadTeacherExcel,
  printTeacherIDCards,
  printTeacherPdfInfo,
  printTeacherTable
} from '../utils/teacherExports';

const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const TeacherDirectoryView = ({ onSelectTeacher }) => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((user) => {
        if (active && user) setCurrentUser(toUiUser(user));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters & UI state
  const [statusTab, setStatusTab] = useState('Active'); // Active | Pending | Inactive (Admin)
  const [categoryFilter, setCategoryFilter] = useState('All'); // All | Teaching | Non-Teaching
  const [bloodFilter, setBloodFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid | table
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [contactProgress, setContactProgress] = useState({ show: false, current: 0, total: 0, name: '' });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const loadTeachers = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setSyncing(true);
      try {
        const list = await teacherPortalApi.listTeachers();
        const sorted = [...list].sort((a, b) => {
          const ra = a.rankingMetrics?.overallMadrasahRank ?? 9999;
          const rb = b.rankingMetrics?.overallMadrasahRank ?? 9999;
          if (ra !== rb) return ra - rb;
          const pa = a.rankingMetrics?.designationPriority ?? 99;
          const pb = b.rankingMetrics?.designationPriority ?? 99;
          return pa - pb;
        });
        setTeachers(sorted);
      } catch (err) {
        showToast(extractApiErrorMessage(err, 'শিক্ষকদের তালিকা লোড করা যায়নি'), 'error');
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadTeachers(false);
  }, [loadTeachers]);

  const handleRecalculateRanks = async () => {
    setRecalculating(true);
    try {
      const res = await teacherPortalApi.recalculateRanks();
      showToast(res?.message || 'সকল শিক্ষকের র‍্যাংক সফলভাবে আপডেট হয়েছে!', 'success');
      await loadTeachers(true);
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'র‍্যাংক আপডেট করা যায়নি'), 'error');
    } finally {
      setRecalculating(false);
    }
  };

  // Status counts (for Admin tabs & KPI)
  const counts = useMemo(() => {
    const active = teachers.filter((t) => t.isActive !== false && t.registrationStatus !== 'Pending' && t.registrationStatus !== 'Rejected');
    const pending = teachers.filter((t) => t.registrationStatus === 'Pending');
    const inactive = teachers.filter((t) => t.isActive === false && t.registrationStatus !== 'Pending');
    return {
      activeCount: active.length,
      pendingCount: pending.length,
      inactiveCount: inactive.length,
      teachingCount: active.filter((t) => t.staffCategory !== 'Non-Teaching').length,
      nonTeachingCount: active.filter((t) => t.staffCategory === 'Non-Teaching').length,
      mpoCount: active.filter((t) => t.employmentType === 'MPO').length
    };
  }, [teachers]);

  // Filtered teacher list (always rank-ordered)
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (isAdmin) {
        if (statusTab === 'Active' && (t.isActive === false || t.registrationStatus === 'Pending' || t.registrationStatus === 'Rejected')) return false;
        if (statusTab === 'Pending' && t.registrationStatus !== 'Pending') return false;
        if (statusTab === 'Inactive' && (t.isActive !== false || t.registrationStatus === 'Pending')) return false;
      } else {
        if (t.isActive === false || t.registrationStatus !== 'Approved') return false;
      }

      if (categoryFilter === 'Teaching' && t.staffCategory === 'Non-Teaching') return false;
      if (categoryFilter === 'Non-Teaching' && t.staffCategory !== 'Non-Teaching') return false;
      if (bloodFilter !== 'All' && t.bloodGroup !== bloodFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          (t.fullNameBng || '').toLowerCase().includes(q) ||
          (t.fullNameEng || '').toLowerCase().includes(q) ||
          (t.teacherCode || '').includes(q) ||
          (t.phone || '').includes(q) ||
          (t.designationBng || '').toLowerCase().includes(q) ||
          (t.designation || '').toLowerCase().includes(q) ||
          (t.subject || '').toLowerCase().includes(q) ||
          (t.assignedClass || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [teachers, isAdmin, statusTab, categoryFilter, bloodFilter, searchQuery]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const exportTargetTeachers = useMemo(() => {
    if (!selectMode) return filteredTeachers;
    return filteredTeachers.filter((t) => selectedIdSet.has(t._id));
  }, [selectMode, filteredTeachers, selectedIdSet]);

  const allVisibleSelected =
    filteredTeachers.length > 0 && filteredTeachers.every((t) => selectedIdSet.has(t._id));

  const toggleSelectMode = () => {
    setSelectMode((prev) => {
      if (prev) setSelectedIds([]);
      return !prev;
    });
  };

  const toggleSelectTeacher = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleSet = new Set(filteredTeachers.map((t) => t._id));
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredTeachers.map((t) => t._id)])));
    }
  };

  const getExportList = () => {
    if (selectMode && exportTargetTeachers.length === 0) {
      showToast('এক্সপোর্ট করার জন্য অন্তত ১ জন সদস্য সিলেক্ট করুন', 'error');
      return null;
    }
    if (exportTargetTeachers.length === 0) {
      showToast('এক্সপোর্ট করার জন্য কোনো ডাটা নেই', 'error');
      return null;
    }
    return exportTargetTeachers;
  };

  const handleExportContacts = async () => {
    const list = getExportList();
    if (!list) return;
    setExportMenuOpen(false);
    await downloadTeacherContactsVCF(list, setContactProgress);
    showToast(`${list.length} টি কন্টাক্ট কার্ড (ছবিসহ) ডাউনলোড হয়েছে`);
  };

  const handleExportExcelAction = () => {
    const list = getExportList();
    if (!list) return;
    setExportMenuOpen(false);
    downloadTeacherExcel(list);
    showToast(`${list.length} জনের এক্সেল (.csv) ফাইল ডাউনলোড হয়েছে`);
  };

  const handleExportTableAction = () => {
    const list = getExportList();
    if (!list) return;
    setExportMenuOpen(false);
    printTeacherTable(list);
  };

  const handleExportPdfInfoAction = () => {
    const list = getExportList();
    if (!list) return;
    setExportMenuOpen(false);
    printTeacherPdfInfo(list);
  };

  const handleExportIdCardsAction = () => {
    const list = getExportList();
    if (!list) return;
    setExportMenuOpen(false);
    printTeacherIDCards(list);
  };

  const handleOpenProfile = (teacher) => {
    if (selectMode) {
      toggleSelectTeacher(teacher._id);
      return;
    }
    if (onSelectTeacher) {
      onSelectTeacher(teacher);
      return;
    }
    navigate(`/teacher/${teacher._id}`);
  };

  const handleCall = (e, phone) => {
    e.stopPropagation();
    if (!phone) return;
    window.open(`tel:${String(phone).replace(/[^\d+]/g, '')}`);
  };

  const handleWhatsApp = (e, teacher) => {
    e.stopPropagation();
    const digits = String(teacher.phone || '').replace(/\D/g, '');
    if (!digits) return;
    const intl = digits.startsWith('880') ? digits : `88${digits}`;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(`আসসালামু আলাইকুম, ${teacher.fullNameBng}`)}`);
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] pb-24 font-bangla">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[200] px-4 py-3 rounded-2xl shadow-2xl border text-xs font-black flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-red-600 text-white border-red-400'
              : 'bg-[#060D1F] text-[#F7E09A] border-[#D4A843]/40'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* ==================== ROYAL HEADER ==================== */}
      <header className="sticky top-0 z-40 bg-[#060D1F]/95 backdrop-blur-xl border-b border-[#D4A843]/25 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 lg:h-[74px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center shrink-0 transition"
              title="ড্যাশবোর্ডে ফিরুন"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4A843] truncate">
                {CONFIG.APP_NAME}
              </p>
              <h1 className="text-sm sm:text-base lg:text-lg font-black text-white truncate">
                শিক্ষক ও কর্মচারী তালিকা (র‍্যাংক অনুযায়ী)
              </h1>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadTeachers(true)}
              disabled={syncing}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition"
              title="রিফ্রেশ করুন"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin text-[#D4A843]' : ''} />
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleRecalculateRanks}
                  disabled={recalculating}
                  className="hidden md:flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[#F7E09A] text-xs font-black transition"
                  title="পদবি, ডিগ্রি ও GPA অনুযায়ী সবার র‍্যাংক আপডেট করুন"
                >
                  {recalculating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>র‍্যাংক আপডেট</span>
                </button>

                {/* Admin Export Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExportMenuOpen((v) => !v)}
                    className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4A843] to-amber-500 text-[#060D1F] text-xs font-black flex items-center gap-1.5 shadow-md hover:brightness-105 transition"
                  >
                    <Download size={15} />
                    <span className="hidden sm:inline">এক্সপোর্ট / ডাউনলোড</span>
                  </button>

                  {exportMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200 p-2 z-50 space-y-1">
                        <p className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          {selectMode
                            ? `নির্বাচিত ${exportTargetTeachers.length} জন ডাউনলোড করুন`
                            : `ফিল্টারকৃত ${filteredTeachers.length} জন ডাউনলোড করুন`}
                        </p>
                        <button
                          type="button"
                          onClick={handleExportContacts}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-left flex items-center gap-2.5 transition"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <Contact size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">Contact Download (.vcf)</p>
                            <p className="text-[10px] font-semibold text-slate-400">সরাসরি ফোনে সেভ করার ফাইল</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={handleExportExcelAction}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-blue-50 text-left flex items-center gap-2.5 transition"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <FileSpreadsheet size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">Excel Download (.csv)</p>
                            <p className="text-[10px] font-semibold text-slate-400">সব কলামসহ এক্সেল শিট</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={handleExportTableAction}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-left flex items-center gap-2.5 transition"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                            <Printer size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">Table Download (A4 PDF)</p>
                            <p className="text-[10px] font-semibold text-slate-400">অফিশিয়াল রোস্টার টেবিল প্রিন্ট</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={handleExportPdfInfoAction}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-amber-50 text-left flex items-center gap-2.5 transition"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <FileText size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">PDF Info Download</p>
                            <p className="text-[10px] font-semibold text-slate-400">এক পেজে বিস্তারিত তথ্য ফর্ম</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={handleExportIdCardsAction}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-purple-50 text-left flex items-center gap-2.5 transition"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                            <CreditCard size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">ID Card Download</p>
                            <p className="text-[10px] font-semibold text-slate-400">CR80 ফ্রন্ট-ব্যাক আইডি কার্ড</p>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-5">
        {/* ==================== KPI HERO BANNER ==================== */}
        <div className="bg-gradient-to-br from-[#060D1F] via-[#0D1E40] to-[#0D382B] rounded-[28px] p-5 lg:p-6 text-white shadow-xl border border-[#D4A843]/25">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#F7E09A] bg-[#D4A843]/15 border border-[#D4A843]/30 px-3 py-1 rounded-full">
                <Award size={12} /> Rank-Ordered Faculty Registry
              </span>
              <h2 className="text-xl lg:text-2xl font-black mt-2.5">
                মাদ্রাসার সম্মানিত শিক্ষক ও কর্মচারীবৃন্দ
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-1">
                পদবি, শিক্ষাগত যোগ্যতা ও জ্যেষ্ঠতা অনুযায়ী সাজানো। যেকোনো সদস্যের কার্ডে ক্লিক করে প্রোফাইল দেখুন।
              </p>
            </div>

            {/* KPI Stats Pills */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 shrink-0">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase">মোট সক্রিয়</p>
                <p className="text-xl font-black text-[#F7E09A] mt-0.5">{counts.activeCount}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase">শিক্ষক</p>
                <p className="text-xl font-black text-emerald-300 mt-0.5">{counts.teachingCount}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase">কর্মচারী</p>
                <p className="text-xl font-black text-sky-300 mt-0.5">{counts.nonTeachingCount}</p>
              </div>
              {isAdmin && (
                <div className="hidden sm:block bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase">MPO ভুক্ত</p>
                  <p className="text-xl font-black text-amber-300 mt-0.5">{counts.mpoCount}</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Quick Export Bar + Select Mode Toggle */}
          {isAdmin && (
            <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectMode}
                  className={`px-3.5 py-1.5 rounded-xl border text-[11px] font-black flex items-center gap-1.5 transition ${
                    selectMode
                      ? 'bg-[#D4A843] text-[#060D1F] border-[#F7E09A] shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-[#F7E09A] border-[#D4A843]/40'
                  }`}
                >
                  {selectMode ? <CheckSquare size={13} /> : <Square size={13} />}
                  <span>{selectMode ? `সিলেক্ট চালু (${exportTargetTeachers.length})` : 'সিলেক্ট করুন'}</span>
                </button>

                {selectMode && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 text-[11px] font-black flex items-center gap-1.5 transition"
                  >
                    <Check size={13} />
                    <span>{allVisibleSelected ? 'সব বাদ দিন' : `সিলেক্ট অল (${filteredTeachers.length})`}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportContacts}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-emerald-500/30 border border-white/15 text-[11px] font-black flex items-center gap-1.5 transition"
                >
                  <Contact size={13} className="text-emerald-300" /> Contact (.vcf)
                </button>
                <button
                  type="button"
                  onClick={handleExportExcelAction}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-blue-500/30 border border-white/15 text-[11px] font-black flex items-center gap-1.5 transition"
                >
                  <FileSpreadsheet size={13} className="text-sky-300" /> Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportTableAction}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-indigo-500/30 border border-white/15 text-[11px] font-black flex items-center gap-1.5 transition"
                >
                  <Printer size={13} className="text-indigo-300" /> Table PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportPdfInfoAction}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-amber-500/30 border border-white/15 text-[11px] font-black flex items-center gap-1.5 transition"
                >
                  <FileText size={13} className="text-[#F7E09A]" /> PDF Info
                </button>
                <button
                  type="button"
                  onClick={handleExportIdCardsAction}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-purple-500/30 border border-white/15 text-[11px] font-black flex items-center gap-1.5 transition"
                >
                  <CreditCard size={13} className="text-purple-300" /> ID Cards
                </button>
              </div>

              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Shield size={13} className="text-[#D4A843]" />
                {selectMode
                  ? `নির্বাচিত: ${exportTargetTeachers.length} / ${filteredTeachers.length} জন`
                  : 'অ্যাডমিন মোড সক্রিয়'}
              </span>
            </div>
          )}
        </div>

        {/* ==================== SEARCH, TABS & FILTER BAR ==================== */}
        <div className="bg-white rounded-[24px] p-4 lg:p-5 shadow-sm border border-slate-200/80 space-y-4">
          {/* Admin Status Tabs */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100">
              {[
                { key: 'Active', label: `সক্রিয় সদস্য (${counts.activeCount})` },
                { key: 'Pending', label: `অনুমোদনের অপেক্ষায় (${counts.pendingCount})`, badge: counts.pendingCount > 0 },
                { key: 'Inactive', label: `নিষ্ক্রিয় / সাবেক (${counts.inactiveCount})` }
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStatusTab(t.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    statusTab === t.key
                      ? 'bg-[#060D1F] text-[#F7E09A] shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{t.label}</span>
                  {t.badge && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                </button>
              ))}
            </div>
          )}

          {/* Search + Category + Blood + View Switcher */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="নাম, পদবি, টিচার আইডি, বিষয় বা মোবাইল নম্বর দিয়ে খুঁজুন..."
                className="w-full pl-11 pr-9 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#060D1F] text-xs sm:text-sm font-bold text-slate-800 outline-none transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Category + Blood + Layout Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {[
                  { key: 'All', label: 'সবাই' },
                  { key: 'Teaching', label: 'শিক্ষক' },
                  { key: 'Non-Teaching', label: 'কর্মচারী' }
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategoryFilter(c.key)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition ${
                      categoryFilter === c.key
                        ? 'bg-white text-[#060D1F] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <select
                value={bloodFilter}
                onChange={(e) => setBloodFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-700 outline-none focus:border-[#060D1F]"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg === 'All' ? '🩸 সব রক্তের গ্রুপ' : `🩸 ${bg}`}
                  </option>
                ))}
              </select>

              <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white text-[#060D1F] shadow-sm' : 'text-slate-500'}`}
                  title="কার্ড ভিউ"
                >
                  <Grid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-white text-[#060D1F] shadow-sm' : 'text-slate-500'}`}
                  title="টেবিল ভিউ"
                >
                  <LayoutList size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== LOADING / EMPTY / LIST ==================== */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="h-44 rounded-[24px] bg-white border border-slate-200/70 animate-pulse p-5" />
            ))}
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-slate-200/80 py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 mx-auto mb-4 flex items-center justify-center text-slate-400">
              <Users size={28} />
            </div>
            <h3 className="text-sm font-black text-slate-700">কোনো শিক্ষক বা কর্মচারী পাওয়া যায়নি</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1">সার্চ বা ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন</p>
          </div>
        ) : viewMode === 'table' ? (
          /* ==================== DESKTOP TABLE VIEW ==================== */
          <div className="bg-white rounded-[26px] shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#060D1F] text-[#F7E09A] text-[11px] font-black uppercase tracking-wider">
                    {selectMode && (
                      <th className="py-3.5 px-3 text-center w-12">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 accent-[#D4A843] cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="py-3.5 px-4 text-center w-16">র‍্যাংক</th>
                    <th className="py-3.5 px-4">শিক্ষক / কর্মচারী</th>
                    <th className="py-3.5 px-4">পদবি ও বিষয়</th>
                    <th className="py-3.5 px-4 text-center">শ্রেণি</th>
                    <th className="py-3.5 px-4 text-center">রক্ত</th>
                    {isAdmin && <th className="py-3.5 px-4 text-center">ধরন / বায়ো</th>}
                    <th className="py-3.5 px-4 text-right">যোগাযোগ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeachers.map((t, index) => {
                    const rank = t.rankingMetrics?.overallMadrasahRank ?? (index + 1);
                    const isSelected = selectedIdSet.has(t._id);
                    return (
                      <tr
                        key={t._id}
                        onClick={() => handleOpenProfile(t)}
                        className={`cursor-pointer transition group ${
                          selectMode && isSelected
                            ? 'bg-amber-50/80 hover:bg-amber-50'
                            : 'hover:bg-slate-50/90'
                        }`}
                      >
                        {selectMode && (
                          <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectTeacher(t._id)}
                              className="w-4 h-4 accent-[#060D1F] cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-black ${
                              rank <= 3
                                ? 'bg-gradient-to-br from-[#D4A843] to-amber-500 text-[#060D1F] shadow-sm'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            #{rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={t.profilePicture?.url || DEFAULT_IMAGE}
                              alt={t.fullNameEng}
                              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900 group-hover:text-[#060D1F] truncate">
                                {t.fullNameBng}
                              </p>
                              <p className="text-[11px] font-semibold text-slate-400 truncate">
                                {t.fullNameEng} · <span className="font-mono">{t.teacherCode}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-xs font-black text-slate-800">{t.designationBng || t.designation}</p>
                          <p className="text-[11px] font-semibold text-slate-400">{t.subject || t.staffCategory}</p>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {t.assignedClass ? (
                            <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                              {t.assignedClass}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-red-50 text-red-600">
                            {t.bloodGroup || 'N/A'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {t.employmentType || 'Non-MPO'}
                              </span>
                              {t.biometricDeviceId && (
                                <span className="text-[10px] font-mono font-bold text-slate-400">
                                  Bio #{t.biometricDeviceId}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleCall(e, t.phone)}
                              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white transition"
                              title="কল করুন"
                            >
                              <Phone size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleWhatsApp(e, t)}
                              className="p-2 rounded-xl bg-green-50 hover:bg-green-600 text-green-600 hover:text-white transition"
                              title="হোয়াটসঅ্যাপ"
                            >
                              <MessageCircle size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ==================== STUDENT-STYLE COMPACT PREMIUM CARDS (RANK ORDERED) ==================== */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredTeachers.map((t, index) => {
              const rank = t.rankingMetrics?.overallMadrasahRank ?? (index + 1);
              const isTopThree = rank <= 3;
              const isSelected = selectedIdSet.has(t._id);

              return (
                <div
                  key={t._id}
                  onClick={() => handleOpenProfile(t)}
                  className={`group rounded-[22px] p-3.5 sm:p-4 border transition-all cursor-pointer flex items-center gap-3.5 ${
                    selectMode && isSelected
                      ? 'bg-amber-50/70 border-[#D4A843] ring-2 ring-[#D4A843]/35 shadow-md'
                      : 'bg-white border-slate-200/80 shadow-[0_4px_18px_rgba(6,13,31,0.05)] hover:shadow-[0_12px_32px_rgba(6,13,31,0.12)] hover:-translate-y-0.5 hover:border-[#D4A843]/60'
                  }`}
                >
                  {selectMode && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectTeacher(t._id);
                      }}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${
                        isSelected
                          ? 'bg-[#060D1F] border-[#060D1F] text-[#F7E09A]'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}

                  {/* Left: Student-style Square Rounded Avatar + Rank Pill */}
                  <div className="relative shrink-0">
                    <img
                      src={t.profilePicture?.url || DEFAULT_IMAGE}
                      alt={t.fullNameEng}
                      className="w-[68px] h-[68px] rounded-[18px] object-cover"
                      style={{
                        border: isTopThree ? '2.5px solid #D4A843' : '2px solid rgba(6,13,31,0.12)'
                      }}
                    />
                    <span
                      className={`absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black shadow-md ${
                        isTopThree
                          ? 'bg-gradient-to-r from-[#D4A843] to-amber-500 text-[#060D1F]'
                          : 'bg-[#060D1F] text-[#F7E09A]'
                      }`}
                    >
                      #{rank}
                    </span>
                  </div>

                  {/* Center: Student-style Clean Identity & Badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <h3 className="text-[14.5px] font-black text-slate-900 truncate leading-tight">
                        {t.fullNameEn || t.fullNameEng}
                      </h3>
                      {t.bloodGroup && t.bloodGroup !== 'N/A' && (
                        <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 shrink-0">
                          🩸{t.bloodGroup}
                        </span>
                      )}
                    </div>

                    <p className="text-[12.5px] font-bold text-slate-500 truncate mt-0.5">
                      {t.fullNameBng}
                    </p>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-[#060D1F] truncate max-w-[175px]">
                        {t.designationBng || t.designation}
                      </span>
                      {t.assignedClass && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                          {t.assignedClass}
                        </span>
                      )}
                      {isAdmin && t.employmentType && (
                        <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                          {t.employmentType}
                        </span>
                      )}
                      {isAdmin && t.registrationStatus === 'Pending' && (
                        <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-400 truncate">
                        {t.phone || t.teacherCode}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleCall(e, t.phone)}
                          className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white flex items-center justify-center transition"
                          title="Call"
                        >
                          <Phone size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleWhatsApp(e, t)}
                          className="w-7 h-7 rounded-lg bg-green-50 hover:bg-green-600 text-green-600 hover:text-white flex items-center justify-center transition"
                          title="WhatsApp"
                        >
                          <MessageCircle size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Export Progress Modal */}
      {contactProgress.show && (
        <div className="fixed inset-0 z-[220] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <Loader2 size={24} className="animate-spin" />
            </div>
            <h3 className="text-sm font-black text-slate-800">কন্টাক্ট ফাইল তৈরি হচ্ছে...</h3>
            <p className="text-xs font-bold text-slate-500 truncate">{contactProgress.name || 'ছবি সংযুক্ত করা হচ্ছে'}</p>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-200"
                style={{
                  width: `${contactProgress.total ? Math.round((contactProgress.current / contactProgress.total) * 100) : 0}%`
                }}
              />
            </div>
            <p className="text-[11px] font-mono font-black text-slate-400">
              {contactProgress.current} / {contactProgress.total}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDirectoryView;