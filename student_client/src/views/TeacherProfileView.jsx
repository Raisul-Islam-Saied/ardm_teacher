import {
    ArrowLeft,
    BadgeCheck,
    Banknote,
    BookOpen,
    Calendar,
    CheckCircle2,
    Clock,
    IdCard,
    Loader2,
    LogOut,
    Mail,
    Phone,
    Shield,
    Sparkles,
    User,
    XCircle
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { teacherPortalApi } from '../services/studentApiService';

const MONTHS_BN = [
  { val: 1, label: 'জানুয়ারি (January)' },
  { val: 2, label: 'ফেব্রুয়ারি (February)' },
  { val: 3, label: 'মার্চ (March)' },
  { val: 4, label: 'এপ্রিল (April)' },
  { val: 5, label: 'মে (May)' },
  { val: 6, label: 'জুন (June)' },
  { val: 7, label: 'জুলাই (July)' },
  { val: 8, label: 'আগস্ট (August)' },
  { val: 9, label: 'সেপ্টেম্বর (September)' },
  { val: 10, label: 'অক্টোবর (October)' },
  { val: 11, label: 'নভেম্বর (November)' },
  { val: 12, label: 'ডিসেম্বর (December)' }
];

const formatBDT = (n) =>
  new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 0 }).format(Number(n || 0));

const TeacherProfileView = ({ currentUser, onBack, onLogout }) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [mobileTab, setMobileTab] = useState('attendance'); // 'attendance' | 'salary' | 'info'
  const [desktopTab, setDesktopTab] = useState('attendance'); // 'attendance' | 'salary'

  const [dashboardData, setDashboardData] = useState(null);
  const [attData, setAttData] = useState(null);
  const [salaryList, setSalaryList] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingAtt, setLoadingAtt] = useState(true);

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur - 1, cur, cur + 1];
  }, []);

  // ১. টিচার প্রোফাইল ও স্যালারি হিস্ট্রি লোড
  useEffect(() => {
    let active = true;
    setLoadingProfile(true);

    Promise.allSettled([
      teacherPortalApi.getMyDashboard(),
      teacherPortalApi.getMySalaryHistory()
    ]).then(([dashRes, salRes]) => {
      if (!active) return;
      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value);
      }
      if (salRes.status === 'fulfilled') {
        const raw = salRes.value;
        const sheets = Array.isArray(raw) ? raw : raw?.sheets || raw?.salaries || raw?.records || [];
        const myId = String(currentUser?._id || '');
        const myCode = String(currentUser?.teacherCode || '');
        const mine = sheets.filter((item) => {
          const tid = String(item.teacher?._id || item.teacherId || item.teacher || '');
          const tcode = String(item.teacherCode || item.teacher?.teacherCode || '');
          if (!tid && !tcode) return true;
          return (myId && tid === myId) || (myCode && tcode === myCode);
        });
        setSalaryList(mine.length > 0 ? mine : sheets);
      }
      setLoadingProfile(false);
    });

    return () => { active = false; };
  }, [currentUser?._id, currentUser?.teacherCode]);

  // ২. নির্বাচিত মাসের অ্যাটেনডেন্স লোড
  useEffect(() => {
    let active = true;
    setLoadingAtt(true);

    teacherPortalApi
      .getMyMonthlyAttendance(selectedMonth, selectedYear)
      .then((res) => {
        if (active) setAttData(res);
      })
      .catch(() => {
        if (active) setAttData(null);
      })
      .finally(() => {
        if (active) setLoadingAtt(false);
      });

    return () => { active = false; };
  }, [selectedMonth, selectedYear]);

  const teacher = dashboardData?.teacher || dashboardData?.profile || currentUser || {};
  const photo = teacher.photoUrl || teacher.imageUrl || teacher.avatar || currentUser?.photoUrl;
  const fullNameBn = teacher.fullNameBng || teacher.nameBn || currentUser?.nameBn || currentUser?.name || 'শিক্ষক';
  const fullNameEn = teacher.fullNameEng || teacher.nameEn || currentUser?.nameEn || '';
  const designation = teacher.designation || currentUser?.designation || currentUser?.role || 'Teacher';
  const teacherCode = teacher.teacherCode || currentUser?.teacherCode || '—';

  const summary = attData?.summary || attData?.stats || attData || {};
  const logs = Array.isArray(attData?.logs || attData?.records || attData?.days || attData?.attendance)
    ? (attData.logs || attData.records || attData.days || attData.attendance)
    : [];

  const counts = {
    present: summary.present ?? summary.totalPresent ?? logs.filter((l) => l.status === 'Present').length,
    absent: summary.absent ?? summary.totalAbsent ?? logs.filter((l) => l.status === 'Absent').length,
    late: summary.late ?? summary.totalLate ?? logs.filter((l) => l.status === 'Late').length,
    leave: summary.leave ?? summary.totalLeave ?? logs.filter((l) => l.status === 'Leave').length
  };

  const infoRows = [
    { icon: User, label: 'পূর্ণ নাম (বাংলা)', val: fullNameBn },
    { icon: BadgeCheck, label: 'পদবি ও রোল', val: `${designation} (${currentUser?.role || 'Teacher'})` },
    { icon: IdCard, label: 'টিচার কোড / ID', val: teacherCode },
    { icon: BookOpen, label: 'দায়িত্বপ্রাপ্ত শ্রেণি', val: currentUser?.classBn || teacher.assignedClass || 'সকল শ্রেণি' },
    { icon: Phone, label: 'মোবাইল নম্বর', val: teacher.phone || teacher.mobile || currentUser?.phone || '—' },
    { icon: Mail, label: 'ইমেইল', val: teacher.email || currentUser?.email || '—' }
  ];

  const renderAttendanceSection = () => (
    <div className="space-y-4 lg:space-y-5">
      {/* Month & Year Picker Bar */}
      <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm lg:text-base font-black text-slate-800 flex items-center gap-2">
            <Calendar size={17} className="text-emerald-600" />
            মাসিক উপস্থিতি ও হাজিরা বিবরণী
          </h3>
          <p className="text-[11px] font-bold text-slate-400 mt-0.5">
            মাস ও বছর পরিবর্তন করে উপস্থিত, অনুপস্থিত, দেরি ও ছুটির হিসাব দেখুন
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="flex-1 sm:w-44 py-2.5 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-black text-slate-800 outline-none focus:border-[#060D1F] transition"
          >
            {MONTHS_BN.map((m) => (
              <option key={m.val} value={m.val}>{m.label}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-28 py-2.5 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-black text-slate-800 outline-none focus:border-[#060D1F] transition"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loadingAtt ? (
        <div className="bg-white rounded-3xl p-14 flex flex-col items-center justify-center text-slate-400 border border-slate-200/70">
          <Loader2 className="animate-spin text-blue-600 mb-3" size={32} />
          <span className="text-xs font-bold">মাসিক হাজিরা লোড হচ্ছে...</span>
        </div>
      ) : (
        <>
          {/* 4 Summary Cards (2 cols on mobile, 4 cols on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-5 border border-emerald-200/70 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between text-emerald-600 mb-2">
                <span className="text-[11px] font-black">মোট উপস্থিত</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={17} />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-slate-800">{counts.present} <span className="text-xs font-bold text-slate-400">দিন</span></p>
              <p className="text-[10px] font-bold text-emerald-600 mt-1">Present</p>
            </div>

            <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-5 border border-red-200/70 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between text-red-600 mb-2">
                <span className="text-[11px] font-black">মোট অনুপস্থিত</span>
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                  <XCircle size={17} />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-red-600">{counts.absent} <span className="text-xs font-bold text-red-300">দিন</span></p>
              <p className="text-[10px] font-bold text-red-500 mt-1">Absent</p>
            </div>

            <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-5 border border-amber-200/70 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between text-amber-600 mb-2">
                <span className="text-[11px] font-black">মোট দেরি</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock size={17} />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-amber-600">{counts.late} <span className="text-xs font-bold text-amber-400">দিন</span></p>
              <p className="text-[10px] font-bold text-amber-600 mt-1">Late Arrival</p>
            </div>

            <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-5 border border-blue-200/70 shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between text-blue-600 mb-2">
                <span className="text-[11px] font-black">মোট ছুটি</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Shield size={17} />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-black text-blue-600">{counts.leave} <span className="text-xs font-bold text-blue-300">দিন</span></p>
              <p className="text-[10px] font-bold text-blue-500 mt-1">Approved Leave</p>
            </div>
          </div>

          {/* Daily Log Table / List */}
          <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs lg:text-sm font-black text-slate-800">দিনভিত্তিক হাজিরার লগ</h3>
              <span className="text-[11px] font-bold text-slate-400">{logs.length} টি রেকর্ড</span>
            </div>

            {logs.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-slate-50/70 border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-bold">এই মাসের বিস্তারিত দিনভিত্তিক লগ পাওয়া যায়নি</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">তারিখ (Date)</th>
                      <th className="py-2.5 px-3">প্রবেশ (In)</th>
                      <th className="py-2.5 px-3 hidden sm:table-cell">প্রস্থান (Out)</th>
                      <th className="py-2.5 px-3 text-right">অবস্থা (Status)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {logs.map((item, idx) => {
                      const st = item.status || '—';
                      const badge =
                        st === 'Present'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : st === 'Absent'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : st === 'Late'
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200';
                      return (
                        <tr key={item._id || item.date || idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 font-black text-slate-800">{item.date || item.attendanceDate}</td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-600">{item.inTime || item.checkIn || '—'}</td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-600 hidden sm:table-cell">{item.outTime || item.checkOut || '—'}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black border ${badge}`}>
                              {st}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderSalarySection = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-5 shadow-sm border border-slate-200/80 flex items-center justify-between">
        <div>
          <h3 className="text-sm lg:text-base font-black text-slate-800 flex items-center gap-2">
            <Banknote size={18} className="text-emerald-600" />
            বেতন ও পেরোল হিস্ট্রি (Salary History)
          </h3>
          <p className="text-[11px] font-bold text-slate-400 mt-0.5">
            প্রতি মাসের মূল বেতন, কর্তন ও নিট পরিশোধিত বেতনের হিসাব
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-black">
          মোট {salaryList.length} মাস
        </span>
      </div>

      {loadingProfile ? (
        <div className="bg-white rounded-3xl p-14 flex flex-col items-center justify-center text-slate-400 border border-slate-200/70">
          <Loader2 className="animate-spin text-blue-600 mb-3" size={32} />
          <span className="text-xs font-bold">বেতন হিস্ট্রি লোড হচ্ছে...</span>
        </div>
      ) : salaryList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/70">
          <p className="text-xs font-bold text-slate-400">এখনো কোনো বেতন শিট তৈরি বা প্রকাশিত হয়নি</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:gap-4">
          {salaryList.map((sal, i) => {
            const monthName = MONTHS_BN.find((m) => m.val === Number(sal.month))?.label.split(' ')[0] || sal.month;
            const net = sal.netPayable ?? sal.netSalary ?? sal.payableAmount ?? sal.basicSalary ?? 0;
            const deduction = sal.totalDeduction ?? sal.deduction ?? 0;
            const isPaid = sal.status === 'Paid' || sal.isPaid === true;

            return (
              <div
                key={sal._id || i}
                className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-5 shadow-sm border border-slate-200/80 hover:border-emerald-300 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-black text-slate-800">
                      {monthName} {sal.year || ''}
                    </p>
                    <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                      মূল বেতন: ৳{formatBDT(sal.basicSalary)} · কর্তন: ৳{formatBDT(deduction)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black shrink-0 ${
                    isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isPaid ? 'পরিশোধিত (Paid)' : (sal.status || 'প্রক্রিয়াধীন')}
                  </span>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">নিট প্রাপ্য বেতন:</span>
                  <span className="text-lg font-black text-emerald-700">৳ {formatBDT(net)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F4FF] pb-24 font-bangla">
      {/* ==============================================================
          TOP NAVIGATION BAR (DESKTOP + MOBILE)
         ============================================================== */}
      <div className="sticky top-0 z-30 bg-[#060D1F]/95 backdrop-blur-md text-white border-b border-white/10 shadow-md">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 flex items-center gap-1.5 text-xs font-black active:scale-95 transition"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">ড্যাশবোর্ডে ফিরুন</span>
            </button>
            <div className="h-5 w-px bg-white/15 hidden sm:block" />
            <span className="text-sm lg:text-base font-black tracking-wide text-[#D4A843] flex items-center gap-1.5">
              <Sparkles size={15} className="hidden sm:inline" />
              শিক্ষক প্রোফাইল ও পেরোল পোর্টাল
            </span>
          </div>

          <button
            onClick={onLogout}
            className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-600 border border-red-400/30 text-red-100 hover:text-white text-xs font-black flex items-center gap-1.5 transition"
          >
            <LogOut size={15} /> লগআউট
          </button>
        </div>
      </div>

      {/* ==============================================================
          MAIN CONTENT CONTAINER (2-COLUMN ON DESKTOP, STACKED ON MOBILE)
         ============================================================== */}
      <div className="max-w-6xl mx-auto px-4 lg:px-6 pt-5 lg:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">
          {/* LEFT COLUMN (4 cols on Desktop): Profile Identity + Personal Info */}
          <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-5">
            {/* Hero Profile Card */}
            <div className="bg-gradient-to-br from-[#060D1F] via-[#0B1C38] to-[#0E3B2E] rounded-[28px] p-5 lg:p-6 text-white shadow-xl border border-[#D4A843]/30 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#D4A843]/10 blur-2xl pointer-events-none" />

              <div className="flex lg:flex-col lg:items-center lg:text-center items-center gap-4 relative z-10">
                <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl lg:rounded-3xl overflow-hidden bg-white/10 border-2 border-[#D4A843] flex items-center justify-center shrink-0 shadow-lg">
                  {photo ? (
                    <img src={photo} alt={fullNameBn} className="w-full h-full object-cover" />
                  ) : (
                    <User size={36} className="text-[#D4A843]" />
                  )}
                </div>

                <div className="min-w-0 flex-1 lg:w-full">
                  <div className="flex items-center lg:justify-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#D4A843]/20 border border-[#D4A843]/40 text-[#F7E09A] text-[10px] font-black">
                      {designation}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                      ID: {teacherCode}
                    </span>
                  </div>
                  <h2 className="text-lg lg:text-xl font-black mt-2 leading-snug truncate">{fullNameBn}</h2>
                  {fullNameEn && <p className="text-xs text-slate-300 font-semibold truncate mt-0.5">{fullNameEn}</p>}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 gap-2.5 text-xs relative z-10">
                <div className="bg-white/5 rounded-2xl px-3 py-2.5">
                  <span className="text-[10px] text-slate-400 block">অ্যাসাইন করা শ্রেণি</span>
                  <span className="font-black text-[#F7E09A] truncate block mt-0.5">
                    {currentUser?.role === 'Admin' ? 'সকল শ্রেণি (Admin)' : (currentUser?.classBn || teacher.assignedClass || '—')}
                  </span>
                </div>
                <div className="bg-white/5 rounded-2xl px-3 py-2.5">
                  <span className="text-[10px] text-slate-400 block">মূল বেতন (Basic)</span>
                  <span className="font-black text-emerald-300 block mt-0.5">
                    ৳ {formatBDT(teacher.basicSalary || currentUser?.basicSalary || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Permanent Personal Info Card (Always visible on Desktop) */}
            <div className="hidden lg:block bg-white rounded-[28px] p-5 shadow-sm border border-slate-200/80">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 px-1">
                ব্যক্তিগত ও প্রাতিষ্ঠানিক তথ্য
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {infoRows.map((row, idx) => {
                  const Icon = row.icon;
                  return (
                    <div key={idx} className="py-3 flex items-center justify-between gap-3">
                      <span className="text-slate-400 font-bold flex items-center gap-2 shrink-0">
                        <Icon size={14} className="text-slate-400" /> {row.label}
                      </span>
                      <span className="font-black text-slate-800 text-right truncate">{row.val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (8 cols on Desktop): Attendance & Salary */}
          <div className="lg:col-span-8 space-y-5">
            {/* Mobile 3-Tab Switcher */}
            <div className="lg:hidden grid grid-cols-3 gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/70">
              {[
                { id: 'attendance', label: 'হাজিরা', icon: Calendar },
                { id: 'salary', label: 'বেতন হিস্ট্রি', icon: Banknote },
                { id: 'info', label: 'ব্যক্তিগত তথ্য', icon: IdCard }
              ].map((t) => {
                const Icon = t.icon;
                const active = mobileTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setMobileTab(t.id)}
                    className={`py-2.5 px-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-all ${
                      active ? 'bg-[#060D1F] text-[#D4A843] shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={14} />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Desktop 2-Tab Switcher (Since Personal Info is already visible on the left!) */}
            <div className="hidden lg:flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/80 w-fit">
              {[
                { id: 'attendance', label: 'মাসিক হাজিরা ও সারসংক্ষেপ (Attendance)', icon: Calendar },
                { id: 'salary', label: 'বেতন ও পেরোল হিস্ট্রি (Salary History)', icon: Banknote }
              ].map((t) => {
                const Icon = t.icon;
                const active = desktopTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setDesktopTab(t.id)}
                    className={`py-2.5 px-5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                      active ? 'bg-[#060D1F] text-[#D4A843] shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={15} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Content Views */}
            <div className="lg:hidden">
              {mobileTab === 'attendance' && renderAttendanceSection()}
              {mobileTab === 'salary' && renderSalarySection()}
              {mobileTab === 'info' && (
                <div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/70 divide-y divide-slate-100 text-xs">
                    {infoRows.map((row, idx) => {
                      const Icon = row.icon;
                      return (
                        <div key={idx} className="py-3 flex items-center justify-between gap-3">
                          <span className="text-slate-400 font-bold flex items-center gap-2 shrink-0">
                            <Icon size={14} className="text-slate-400" /> {row.label}
                          </span>
                          <span className="font-black text-slate-800 text-right truncate">{row.val}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={onLogout}
                    className="w-full mt-5 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                  >
                    <LogOut size={16} /> অ্যাকাউন্ট থেকে লগআউট করুন
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Content Views */}
            <div className="hidden lg:block">
              {desktopTab === 'attendance' && renderAttendanceSection()}
              {desktopTab === 'salary' && renderSalarySection()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfileView;