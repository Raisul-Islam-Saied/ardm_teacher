import {
  AlertCircle,
  ArrowLeft,
  Award,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Phone,
  Save,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  User,
  Users,
  Wrench,
  XCircle
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_PORTAL_SETTINGS } from '../config/systemConfig';
import { authApi, systemSettingsApi, teacherPortalApi } from '../services/studentApiService';

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

const formatQuota = (n) =>
  new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 2 }).format(Number(n || 0));

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const getDhakaDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Dhaka'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const formatProfileValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'হ্যাঁ' : 'না';
  return String(value);
};

const formatProfileDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('bn-BD', {
    dateStyle: 'long',
    timeZone: 'Asia/Dhaka'
  }).format(date);
};

// ISO string ("2026-08-17T19:30:00+06:00") -> datetime-local input ("2026-08-17T19:30")
const toDatetimeLocalDhaka = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr).slice(0, 16);
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Dhaka'
  }).formatToParts(d);
  const v = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const hour = v.hour === '24' ? '00' : v.hour;
  return `${v.year}-${v.month}-${v.day}T${hour}:${v.minute}`;
};

const fromDatetimeLocalDhaka = (localVal) => {
  if (!localVal) return '';
  return localVal.length === 16 ? `${localVal}:00+06:00` : localVal;
};

const ADDRESS_FIELDS = [
  ['houseNameBn', 'বাড়ির নাম (বাংলা)'],
  ['houseNameEn', 'বাড়ির নাম (ইংরেজি)'],
  ['houseOrRoad', 'বাড়ি/রাস্তা'],
  ['villageBn', 'গ্রাম (বাংলা)'],
  ['villageEn', 'গ্রাম (ইংরেজি)'],
  ['village', 'গ্রাম'],
  ['unionBn', 'ইউনিয়ন (বাংলা)'],
  ['unionEn', 'ইউনিয়ন (ইংরেজি)'],
  ['wardNo', 'ওয়ার্ড নম্বর'],
  ['postOffice', 'ডাকঘর'],
  ['postCode', 'পোস্টকোড'],
  ['upazilaBn', 'উপজেলা (বাংলা)'],
  ['upazilaEn', 'উপজেলা (ইংরেজি)'],
  ['upazila', 'উপজেলা'],
  ['districtBn', 'জেলা (বাংলা)'],
  ['districtEn', 'জেলা (ইংরেজি)'],
  ['district', 'জেলা'],
  ['divisionBn', 'বিভাগ (বাংলা)'],
  ['divisionEn', 'বিভাগ (ইংরেজি)']
];

const PERMISSION_ACTIONS = [
  { key: 'add', label: 'শিক্ষার্থী যোগ (Add)', desc: 'নতুন ভর্তি ও তথ্য এন্ট্রি' },
  { key: 'edit', label: 'তথ্য পরিবর্তন (Edit)', desc: 'শিক্ষার্থীর প্রোফাইল আপডেট' },
  { key: 'delete', label: 'তথ্য ডিলিট (Delete)', desc: 'শিক্ষার্থীর রেকর্ড মুছে ফেলা' },
  { key: 'export', label: 'তথ্য এক্সপোর্ট (Export)', desc: 'Excel, PDF ও ID Card ডাউনলোড' }
];

// Reusable Premium Toggle Switch
const ToggleSwitch = ({ checked, onChange, accent = 'emerald' }) => {
  const activeBg =
    accent === 'danger'
      ? 'bg-red-600'
      : accent === 'gold'
      ? 'bg-[#D4A843]'
      : 'bg-emerald-600';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? activeBg : 'bg-slate-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

const TeacherProfileView = ({ currentUser, onBack, onLogout }) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'salary' | 'info' | 'security' | 'settings'

  const isAdminUser =
    currentUser?.role === 'Admin' ||
    currentUser?.erpRole === 'SuperAdmin' ||
    currentUser?.erpRole === 'Admin' ||
    currentUser?.role === 'SuperAdmin';

  const visibleTabs = useMemo(() => {
    const base = [
      { id: 'attendance', shortLabel: 'হাজিরা', label: 'মাসিক হাজিরা', icon: Calendar },
      { id: 'salary', shortLabel: 'বেতন', label: 'বেতন হিস্ট্রি', icon: Banknote },
      { id: 'info', shortLabel: 'প্রোফাইল', label: 'সম্পূর্ণ প্রোফাইল', icon: IdCard },
      { id: 'security', shortLabel: 'পাসওয়ার্ড', label: 'নিরাপত্তা', icon: KeyRound }
    ];
    if (isAdminUser) {
      base.push({ id: 'settings', shortLabel: 'সেটিংস', label: 'সিস্টেম সেটিংস', icon: Settings });
    }
    return base;
  }, [isAdminUser]);

  const [dashboardData, setDashboardData] = useState(null);
  const [attData, setAttData] = useState(null);
  const [salaryList, setSalaryList] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingAtt, setLoadingAtt] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [salaryError, setSalaryError] = useState('');
  const [attendanceError, setAttendanceError] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurPass, setShowCurPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passStatus, setPassStatus] = useState({ type: '', msg: '' });

  // Dynamic System Settings State (SuperAdmin / Admin)
  const [portalSettings, setPortalSettings] = useState(() => ({
    onlyAdminResults: DEFAULT_PORTAL_SETTINGS.onlyAdminResults,
    maintenanceMode: DEFAULT_PORTAL_SETTINGS.maintenanceMode,
    resultPublishTime: toDatetimeLocalDhaka(DEFAULT_PORTAL_SETTINGS.resultPublishTime),
    classTeacherPermissions: {
      ownClass: { ...DEFAULT_PORTAL_SETTINGS.classTeacherPermissions.ownClass },
      otherClass: { ...DEFAULT_PORTAL_SETTINGS.classTeacherPermissions.otherClass }
    },
    nonClassTeacherPermissions: { ...DEFAULT_PORTAL_SETTINGS.nonClassTeacherPermissions }
  }));
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState({ type: '', msg: '' });

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
        setProfileError('');
      } else {
        setProfileError(getApiErrorMessage(dashRes.reason, 'শিক্ষক প্রোফাইল লোড করা যায়নি।'));
      }
      if (salRes.status === 'fulfilled') {
        const raw = salRes.value;
        const sheets = Array.isArray(raw) ? raw : raw?.sheets || raw?.salaries || raw?.records || [];
        const myId = String(currentUser?._id || '');
        const myCode = String(currentUser?.teacherCode || '');
        const mine = sheets.filter((item) => {
          const teacher = item.teacherId && typeof item.teacherId === 'object'
            ? item.teacherId
            : item.teacher && typeof item.teacher === 'object'
              ? item.teacher
              : null;
          const teacherId = String(teacher?._id || item.teacherId || item.teacher || '');
          const teacherCode = String(item.teacherCode || teacher?.teacherCode || '');
          return (myId && teacherId === myId) || (myCode && teacherCode === myCode);
        });
        setSalaryList(mine);
        setSalaryError('');
      } else {
        setSalaryList([]);
        setSalaryError(getApiErrorMessage(salRes.reason, 'বেতন হিস্ট্রি লোড করা যায়নি।'));
      }
      setLoadingProfile(false);
    });

    return () => { active = false; };
  }, [currentUser?._id, currentUser?.teacherCode]);

  // ২. নির্বাচিত মাসের অ্যাটেনডেন্স লোড
  useEffect(() => {
    let active = true;
    setLoadingAtt(true);
    setAttendanceError('');

    teacherPortalApi
      .getMyMonthlyAttendance(selectedMonth, selectedYear)
      .then((res) => {
        if (active) setAttData(res);
      })
      .catch((error) => {
        if (active) {
          setAttData(null);
          setAttendanceError(getApiErrorMessage(error, 'মাসিক হাজিরা লোড করা যায়নি।'));
        }
      })
      .finally(() => {
        if (active) setLoadingAtt(false);
      });

    return () => { active = false; };
  }, [selectedMonth, selectedYear]);

  // ৩. অ্যাডমিন হলে সার্ভার থেকে সিস্টেম সেটিংস লোড
  useEffect(() => {
    if (!isAdminUser) return undefined;
    let active = true;
    setLoadingSettings(true);

    systemSettingsApi
      .getSettings()
      .then((res) => {
        if (!active) return;
        const sp = res?.studentPortal || {};
        setPortalSettings({
          onlyAdminResults: sp.onlyAdminResults ?? true,
          maintenanceMode: sp.maintenanceMode ?? false,
          resultPublishTime: toDatetimeLocalDhaka(sp.resultPublishTime || DEFAULT_PORTAL_SETTINGS.resultPublishTime),
          classTeacherPermissions: {
            ownClass: {
              add: sp.classTeacherPermissions?.ownClass?.add ?? true,
              edit: sp.classTeacherPermissions?.ownClass?.edit ?? true,
              delete: sp.classTeacherPermissions?.ownClass?.delete ?? true,
              export: sp.classTeacherPermissions?.ownClass?.export ?? true
            },
            otherClass: {
              add: sp.classTeacherPermissions?.otherClass?.add ?? false,
              edit: sp.classTeacherPermissions?.otherClass?.edit ?? false,
              delete: sp.classTeacherPermissions?.otherClass?.delete ?? false,
              export: sp.classTeacherPermissions?.otherClass?.export ?? false
            }
          },
          nonClassTeacherPermissions: {
            add: sp.nonClassTeacherPermissions?.add ?? false,
            edit: sp.nonClassTeacherPermissions?.edit ?? false,
            delete: sp.nonClassTeacherPermissions?.delete ?? false,
            export: sp.nonClassTeacherPermissions?.export ?? false
          }
        });
      })
      .catch((err) => {
        if (active) {
          setSettingsStatus({
            type: 'error',
            msg: getApiErrorMessage(err, 'সিস্টেম সেটিংস লোড করা যায়নি।')
          });
        }
      })
      .finally(() => {
        if (active) setLoadingSettings(false);
      });

    return () => { active = false; };
  }, [isAdminUser]);

  // ৪. পাসওয়ার্ড পরিবর্তন হ্যান্ডলার
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassStatus({ type: '', msg: '' });

    if (!currentPassword.trim()) {
      return setPassStatus({ type: 'error', msg: 'বর্তমান পাসওয়ার্ড দিন।' });
    }
    if (newPassword.length < 6 || newPassword.length > 64) {
      return setPassStatus({ type: 'error', msg: 'নতুন পাসওয়ার্ড ৬ থেকে ৬৪ অক্ষরের মধ্যে হতে হবে।' });
    }
    if (newPassword !== confirmPassword) {
      return setPassStatus({ type: 'error', msg: 'নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না।' });
    }
    if (currentPassword === newPassword) {
      return setPassStatus({ type: 'error', msg: 'নতুন পাসওয়ার্ড বর্তমান পাসওয়ার্ডের চেয়ে ভিন্ন হতে হবে।' });
    }

    setPassLoading(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      setPassStatus({
        type: 'success',
        msg: res?.message || 'আলহামদুলিল্লাহ! আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।'
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassStatus({
        type: 'error',
        msg: getApiErrorMessage(err, 'পাসওয়ার্ড পরিবর্তন করা যায়নি। বর্তমান পাসওয়ার্ড যাচাই করুন।')
      });
    } finally {
      setPassLoading(false);
    }
  };

  // ৫. সিস্টেম সেটিংস সংরক্ষণ হ্যান্ডলার
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsStatus({ type: '', msg: '' });
    setSavingSettings(true);

    try {
      const payload = {
        studentPortal: {
          onlyAdminResults: Boolean(portalSettings.onlyAdminResults),
          maintenanceMode: Boolean(portalSettings.maintenanceMode),
          resultPublishTime: fromDatetimeLocalDhaka(portalSettings.resultPublishTime),
          classTeacherPermissions: portalSettings.classTeacherPermissions,
          nonClassTeacherPermissions: portalSettings.nonClassTeacherPermissions
        }
      };
      const res = await systemSettingsApi.updateSettings(payload);
      setSettingsStatus({
        type: 'success',
        msg: res?.message || 'সিস্টেম সেটিংস সফলভাবে আপডেট হয়েছে! এখন থেকে নতুন নিয়ম কার্যকর হবে।'
      });
    } catch (err) {
      setSettingsStatus({
        type: 'error',
        msg: getApiErrorMessage(err, 'সিস্টেম সেটিংস সংরক্ষণ করা যায়নি।')
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleClassTeacherPerm = (scope, action, val) => {
    setSettingsStatus({ type: '', msg: '' });
    setPortalSettings((prev) => ({
      ...prev,
      classTeacherPermissions: {
        ...prev.classTeacherPermissions,
        [scope]: {
          ...prev.classTeacherPermissions[scope],
          [action]: val
        }
      }
    }));
  };

  const toggleNonClassTeacherPerm = (action, val) => {
    setSettingsStatus({ type: '', msg: '' });
    setPortalSettings((prev) => ({
      ...prev,
      nonClassTeacherPermissions: {
        ...prev.nonClassTeacherPermissions,
        [action]: val
      }
    }));
  };

  const teacher = dashboardData?.teacher || dashboardData?.profile || currentUser || {};
  const photo = teacher.profilePicture?.url || teacher.photoUrl || teacher.imageUrl || teacher.avatar || currentUser?.photoUrl;
  const fullNameBn = teacher.fullNameBng || teacher.nameBn || currentUser?.nameBn || currentUser?.name || 'শিক্ষক';
  const fullNameEn = teacher.fullNameEng || teacher.nameEn || currentUser?.nameEn || '';
  const designation = teacher.designationBng || teacher.designation || currentUser?.designation || currentUser?.role || 'Teacher';
  const teacherCode = teacher.teacherCode || currentUser?.teacherCode || '—';

  const summary = attData?.summary || attData?.stats || attData || {};
  const logs = Array.isArray(attData?.dailyLogs)
    ? attData.dailyLogs
    : Array.isArray(attData?.logs || attData?.records || attData?.days || attData?.attendance)
      ? (attData.logs || attData.records || attData.days || attData.attendance)
      : [];

  const monthDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) =>
      `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`
    );
  }, [selectedMonth, selectedYear]);

  const logsByDate = new Map(logs.map((log) => [log.date, log]));
  const calendarByDate = new Map(
    (Array.isArray(attData?.calendarDays) ? attData.calendarDays : []).map((day) => [day.date, day])
  );
  const todayDhaka = getDhakaDate();
  const visibleMonthDays = monthDays.filter((date) => date <= todayDhaka).reverse();

  const counts = {
    present: summary.present ?? summary.totalPresent ?? logs.filter((l) => l.status === 'Present').length,
    absent: summary.absent ?? summary.totalAbsent ?? logs.filter((l) => l.status === 'Absent').length,
    late: summary.late ?? summary.totalLate ?? logs.filter((l) => l.status === 'Late').length,
    leave: summary.leave ?? summary.totalLeave ?? (
      Number(summary.totalLeaveCount || 0) + Number(summary.totalApprovedLeaveCount || 0)
    )
  };

  const toRows = (source, fields) => fields
    .filter(([key]) => source?.[key] !== undefined && source?.[key] !== null && source[key] !== '')
    .map(([key, label, formatter]) => [label, formatter ? formatter(source[key]) : formatProfileValue(source[key])]);

  const qualificationLabels = [
    ['degreeLevel', 'ডিগ্রির স্তর'],
    ['examTitle', 'পরীক্ষার নাম'],
    ['majorOrGroup', 'বিষয়/গ্রুপ'],
    ['boardOrUniversity', 'বোর্ড/বিশ্ববিদ্যালয়'],
    ['rollNumber', 'রোল নম্বর'],
    ['registrationNumber', 'রেজিস্ট্রেশন নম্বর'],
    ['passingYear', 'পাসের বছর'],
    ['courseDuration', 'কোর্সের মেয়াদ'],
    ['resultType', 'ফলাফলের ধরন'],
    ['resultGrade', 'গ্রেড'],
    ['gpaOrCgpa', 'GPA/CGPA'],
    ['scale', 'স্কেল']
  ];

  const qualificationRows = (teacher.academicQualifications || []).flatMap((qualification, index) =>
    toRows(qualification, qualificationLabels.map(([key, label]) => [
      key,
      `যোগ্যতা ${index + 1} — ${label}`
    ]))
  );

  const addressRows = (address) => toRows(address, ADDRESS_FIELDS);

  const profileSections = [
    {
      title: 'ব্যক্তিগত তথ্য',
      rows: toRows(teacher, [
        ['fullNameBng', 'পূর্ণ নাম (বাংলা)'],
        ['fullNameEng', 'পূর্ণ নাম (ইংরেজি)'],
        ['fathersNameBng', 'পিতার নাম (বাংলা)'],
        ['fathersNameEng', 'পিতার নাম (ইংরেজি)'],
        ['mothersNameBng', 'মাতার নাম (বাংলা)'],
        ['mothersNameEng', 'মাতার নাম (ইংরেজি)'],
        ['dateOfBirth', 'জন্মতারিখ', formatProfileDate],
        ['gender', 'লিঙ্গ'],
        ['religion', 'ধর্ম'],
        ['bloodGroup', 'রক্তের গ্রুপ'],
        ['maritalStatus', 'বৈবাহিক অবস্থা'],
        ['nidNumber', 'জাতীয় পরিচয়পত্র নম্বর'],
        ['birthRegNumber', 'জন্মনিবন্ধন নম্বর']
      ])
    },
    {
      title: 'চাকরি ও দায়িত্ব',
      rows: [
        ...toRows(teacher, [
          ['designationBng', 'পদবি (বাংলা)'],
          ['designation', 'পদবি (ইংরেজি)'],
          ['staffCategory', 'কর্মী বিভাগ'],
          ['subject', 'বিষয়'],
          ['assignedClass', 'দায়িত্বপ্রাপ্ত শ্রেণি'],
          ['canEditAssignedClass', 'শ্রেণি পরিবর্তনের অনুমতি'],
          ['employmentType', 'চাকরির ধরন'],
          ['joiningDate', 'যোগদানের তারিখ', formatProfileDate],
          ['resignationDate', 'চাকরি ছাড়ার তারিখ', formatProfileDate]
        ]),
        ...(teacher.employmentHistory || []).map((period, index) => [
          `চাকরির সময়কাল ${index + 1}`,
          `${formatProfileDate(period.startDate)} — ${formatProfileDate(period.endDate)}`
        ])
      ]
    },
    {
      title: 'যোগাযোগ ও জরুরি নম্বর',
      rows: [
        ...toRows(teacher, [['phone', 'মোবাইল'], ['email', 'ইমেইল']]),
        ...toRows(teacher.emergencyContact, [
          ['contactName', 'জরুরি যোগাযোগের নাম'],
          ['relationship', 'সম্পর্ক'],
          ['phone', 'জরুরি যোগাযোগের ফোন']
        ])
      ]
    },
    {
      title: 'বেতন ও ব্যাংক তথ্য',
      rows: [
        ...toRows(teacher, [
          ['basicSalary', 'মূল বেতন', (value) => `৳ ${formatBDT(value)}`],
          ['paymentMethod', 'বেতন প্রদানের পদ্ধতি'],
          ['customLeaveQuota', 'মাসিক ছুটির কোটা']
        ]),
        ...toRows(teacher.bankDetails, [
          ['bankName', 'ব্যাংকের নাম'],
          ['branchName', 'শাখা'],
          ['accountHolderName', 'হিসাবের নাম'],
          ['accountNumber', 'হিসাব নম্বর'],
          ['routingNumber', 'রাউটিং নম্বর']
        ])
      ]
    },
    { title: 'বর্তমান ঠিকানা', rows: addressRows(teacher.presentAddress) },
    { title: 'স্থায়ী ঠিকানা', rows: addressRows(teacher.permanentAddress) },
    { title: 'শিক্ষাগত যোগ্যতা', rows: qualificationRows },
    {
      title: 'অ্যাকাউন্ট ও র‍্যাংকিং পরিচিতি',
      rows: [
        ...toRows(teacher, [
          ['teacherCode', 'টিচার কোড'],
          ['uid', 'UID'],
          ['biometricDeviceId', 'বায়োমেট্রিক ID'],
          ['indexNumber', 'ইনডেক্স নম্বর'],
          ['role', 'অ্যাকাউন্টের ভূমিকা'],
          ['registrationStatus', 'রেজিস্ট্রেশন অবস্থা'],
          ['isActive', 'অ্যাকাউন্ট সক্রিয়'],
          ['createdAt', 'অ্যাকাউন্ট তৈরি', formatProfileDate]
        ]),
        ...toRows(teacher.rankingMetrics, [
          ['overallMadrasahRank', 'মাদ্রাসার সামগ্রিক র‍্যাংক'],
          ['compositeRankScore', 'সমন্বিত র‍্যাংক স্কোর']
        ])
      ]
    }
  ];

  // ==============================================================
  // SECTION 1: MONTHLY ATTENDANCE
  // ==============================================================
  const renderAttendanceSection = () => (
    <div className="space-y-4 lg:space-y-5">
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
          {attendanceError && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
              {attendanceError}
            </div>
          )}

          {/* Attendance Summary Cards */}
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

          {/* Leave Quota Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['পূর্ববর্তী অবশিষ্ট কোটা', summary.previousQuotaRemaining],
              ['চলতি মাসের কোটা', summary.currentMonthQuota ?? summary.monthlyAllowedQuota],
              ['ব্যবহৃত কোটা', summary.totalQuotaUsed],
              ['মোট অবশিষ্ট কোটা', summary.remainingPaidQuota ?? summary.quotaRemaining]
            ].map(([label, amount]) => (
              <div key={label} className="rounded-2xl border border-violet-200/70 bg-violet-50/70 px-4 py-3">
                <p className="text-[10.5px] font-black text-violet-700">{label}</p>
                <p className="mt-1 text-lg font-black text-slate-800">
                  {formatQuota(amount)} <span className="text-[11px] font-bold text-slate-500">দিন</span>
                </p>
              </div>
            ))}
          </div>

          {/* Daily Log Table */}
          <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-sm border border-slate-200/80">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs lg:text-sm font-black text-slate-800">দিনভিত্তিক হাজিরা (সাম্প্রতিক তারিখ আগে)</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">যে দিনে তথ্য নেই, সেটিকে অনুপস্থিত হিসেবে ধরা হয়নি</p>
              </div>
              <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                {logs.length} টি রেকর্ড
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">তারিখ (Date)</th>
                    <th className="py-2.5 px-3">পাঞ্চের সময়</th>
                    <th className="py-2.5 px-3 text-right">অবস্থা (Status)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {visibleMonthDays.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center font-bold text-slate-400">
                        এই মাসে এখনো কোনো হাজিরার তারিখ নেই
                      </td>
                    </tr>
                  ) : visibleMonthDays.map((date) => {
                    const item = logsByDate.get(date);
                    const calendarDay = calendarByDate.get(date);
                    const st = item?.status || (
                      calendarDay?.isHoliday
                        ? 'বন্ধ (Holiday)'
                        : calendarDay?.dayType === 'MACHINE_OFF'
                          ? 'মেশিন বন্ধ'
                          : 'রেকর্ড নেই'
                    );
                    const badge =
                      st === 'Present' || st === 'Holiday Duty' || st === 'Official Duty' || st === 'Late (Excused)'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : st === 'Absent'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : st === 'Late'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : st === 'বন্ধ (Holiday)'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : st === 'মেশিন বন্ধ'
                                ? 'bg-violet-100 text-violet-700 border-violet-200'
                                : st === 'রেকর্ড নেই'
                                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                                  : 'bg-blue-100 text-blue-700 border-blue-200';
                    const punchTime = item?.punchTime
                      ? new Intl.DateTimeFormat('bn-BD', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Dhaka'
                      }).format(new Date(item.punchTime))
                      : '—';
                    return (
                      <tr key={date} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-black text-slate-800">
                          {date}
                          {(calendarDay?.title || calendarDay?.reason) && (
                            <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
                              {calendarDay.title || calendarDay.reason}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-600">{punchTime}</td>
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
          </div>
        </>
      )}
    </div>
  );

  // ==============================================================
  // SECTION 2: SALARY HISTORY
  // ==============================================================
  const renderSalarySection = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl lg:rounded-3xl p-4 lg:p-5 shadow-sm border border-slate-200/80 flex items-center justify-between">
        <div>
          <h3 className="text-sm lg:text-base font-black text-slate-800 flex items-center gap-2">
            <Banknote size={18} className="text-emerald-600" />
            বেতন ও পেরোল হিস্ট্রি (Salary History)
          </h3>
          <p className="text-[11px] font-bold text-slate-400 mt-0.5">
            প্রতি মাসের মূল বেতন, কর্তন ও নিট প্রাপ্য বেতনের হিসাব
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
          {salaryError ? (
            <p role="alert" className="text-xs font-bold text-red-600">{salaryError}</p>
          ) : (
            <p className="text-xs font-bold text-slate-400">এখনো কোনো বেতন শিট তৈরি হয়নি</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 lg:gap-4">
          {salaryList.map((sal, i) => {
            const monthName = MONTHS_BN.find((m) => m.val === Number(sal.month))?.label.split(' ')[0] || sal.month;
            const basic = Number(sal.basicSalarySnapshot) || 0;
            const effectiveBasic = Number(sal.proRataInfo?.effectiveBasicSalary ?? basic);
            const attendanceDeduction = Number(sal.leaveAndAbsentDeductionAmount) || 0;
            const loanDeduction = Number(sal.loanDeduction?.installmentAmount) || 0;
            const extraDeduction = Number(sal.extraDeduction) || 0;
            const adjustment = Number(sal.customAdjustment?.amount) || 0;
            const totalDeduction = attendanceDeduction + loanDeduction + extraDeduction + Math.max(0, -adjustment);
            const net = Number(sal.netPayableSalary) || 0;

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
                      {sal.proRataInfo?.isProRated ? 'কার্যকর মূল বেতন' : 'মূল বেতন'}: ৳{formatBDT(effectiveBasic)}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black">
                    বেতন শিট
                  </span>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 font-bold">হাজিরা/ছুটি কর্তন</span>
                    <span className="font-black text-red-600">− ৳ {formatBDT(attendanceDeduction)}</span>
                  </div>
                  {!!loanDeduction && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-bold">লোন/অগ্রিম কর্তন</span>
                      <span className="font-black text-red-600">− ৳ {formatBDT(loanDeduction)}</span>
                    </div>
                  )}
                  {!!extraDeduction && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-bold">অতিরিক্ত কর্তন</span>
                      <span className="font-black text-red-600">− ৳ {formatBDT(extraDeduction)}</span>
                    </div>
                  )}
                  {!!sal.bonusAmount && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-bold">{sal.bonusTitle || 'বোনাস'}</span>
                      <span className="font-black text-emerald-700">+ ৳ {formatBDT(sal.bonusAmount)}</span>
                    </div>
                  )}
                  {!!adjustment && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-bold">সমন্বয়</span>
                      <span className={`font-black ${adjustment > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {adjustment > 0 ? '+' : '−'} ৳ {formatBDT(Math.abs(adjustment))}
                      </span>
                    </div>
                  )}
                  {!!sal.extraAllowance && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500 font-bold">অতিরিক্ত ভাতা</span>
                      <span className="font-black text-emerald-700">+ ৳ {formatBDT(sal.extraAllowance)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-dashed border-slate-100">
                    <span className="text-slate-600 font-black">মোট কর্তন</span>
                    <span className="font-black text-red-700">৳ {formatBDT(totalDeduction)}</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs bg-emerald-50/50 -mx-2 px-3 py-2 rounded-xl">
                  <span className="text-slate-700 font-black">নিট প্রাপ্য বেতন:</span>
                  <span className="text-lg font-black text-emerald-700">৳ {formatBDT(net)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ==============================================================
  // SECTION 3: FULL ORGANIZED PROFILE DETAILS
  // ==============================================================
  const renderProfileDetails = () => (
    <div className="space-y-4">
      {profileError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
          {profileError}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {profileSections.map((section) => (
          <section key={section.title} className="rounded-2xl lg:rounded-3xl border border-slate-200/80 bg-white p-4 lg:p-5 shadow-sm">
            <h3 className="mb-3 pb-2 border-b border-slate-100 text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3.5 rounded-full bg-[#D4A843]" />
              {section.title}
            </h3>
            {section.rows.length === 0 ? (
              <p className="py-2 text-xs font-bold text-slate-400">তথ্য দেওয়া নেই</p>
            ) : (
              <dl className="divide-y divide-slate-100 text-xs">
                {section.rows.map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3 py-2.5">
                    <dt className="font-bold text-slate-400 shrink-0">{label}</dt>
                    <dd className="break-words text-right font-black text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}
      </div>
    </div>
  );

  // ==============================================================
  // SECTION 4: PASSWORD & SECURITY SETTINGS
  // ==============================================================
  const renderSecuritySection = () => (
    <div className="max-w-xl">
      <div className="bg-white rounded-2xl lg:rounded-3xl p-5 lg:p-7 shadow-sm border border-slate-200/80 space-y-5">
        <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-[#060D1F] text-[#D4A843] flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">পাসওয়ার্ড পরিবর্তন করুন</h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              নিরাপত্তার স্বার্থে শক্তিশালী পাসওয়ার্ড ব্যবহার করুন এবং কারো সাথে শেয়ার করবেন না।
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5 ml-1">
              বর্তমান পাসওয়ার্ড (Current Password)
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showCurPass ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (passStatus.msg) setPassStatus({ type: '', msg: '' });
                }}
                placeholder="বর্তমান পাসওয়ার্ড লিখুন"
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 focus:bg-white focus:border-[#060D1F] text-sm font-mono font-bold outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowCurPass((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showCurPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5 ml-1">
              নতুন পাসওয়ার্ড (New Password · ৬–৬৪ অক্ষর)
            </label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showNewPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passStatus.msg) setPassStatus({ type: '', msg: '' });
                }}
                placeholder="কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড"
                minLength={6}
                maxLength={64}
                autoComplete="new-password"
                className="w-full pl-10 pr-11 py-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 focus:bg-white focus:border-[#060D1F] text-sm font-mono font-bold outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowNewPass((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showNewPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1.5 ml-1">
              নতুন পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)
            </label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passStatus.msg) setPassStatus({ type: '', msg: '' });
                }}
                placeholder="নতুন পাসওয়ার্ডটি আবার লিখুন"
                minLength={6}
                maxLength={64}
                autoComplete="new-password"
                className="w-full pl-10 pr-11 py-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 focus:bg-white focus:border-[#060D1F] text-sm font-mono font-bold outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowConfPass((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showConfPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {passStatus.msg && (
            <div
              role="alert"
              className={`rounded-2xl p-3.5 text-xs font-bold flex items-center gap-2 border ${
                passStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}
            >
              {passStatus.type === 'success' ? (
                <CheckCircle2 size={16} className="shrink-0" />
              ) : (
                <AlertCircle size={16} className="shrink-0" />
              )}
              <span>{passStatus.msg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={passLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#060D1F] via-[#0B1C38] to-[#0E3B2E] hover:brightness-110 text-[#D4A843] font-black text-sm shadow-lg shadow-slate-900/15 disabled:opacity-60 flex items-center justify-center gap-2 transition active:scale-[0.99]"
          >
            {passLoading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                <span>পাসওয়ার্ড আপডেট হচ্ছে...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={17} />
                <span>পাসওয়ার্ড পরিবর্তন সংরক্ষণ করুন</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  // ==============================================================
  // SECTION 5: DYNAMIC SYSTEM SETTINGS (SUPER ADMIN / ADMIN ONLY)
  // ==============================================================
  const renderSystemSettingsSection = () => (
    <form onSubmit={handleSaveSettings} className="space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#060D1F] via-[#0B1C38] to-[#0E3B2E] rounded-2xl lg:rounded-3xl p-5 lg:p-6 text-white shadow-md border border-[#D4A843]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#D4A843]/20 border border-[#D4A843]/40 text-[#F7E09A] flex items-center justify-center shrink-0">
            <Sliders size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base lg:text-lg font-black text-[#F7E09A]">সিস্টেম কনফিগারেশন ও পারমিশন</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                No-Code Live Control
              </span>
            </div>
            <p className="text-xs text-slate-300 font-semibold mt-0.5">
              এখান থেকে মেইনটেন্যান্স মোড, রেজাল্ট প্রকাশের সময় এবং শিক্ষকদের শ্রেণিভিত্তিক পারমিশন সরাসরি নিয়ন্ত্রণ করুন।
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingSettings || loadingSettings}
          className="px-5 py-3 rounded-2xl bg-[#D4A843] hover:bg-[#e0b653] text-[#060D1F] font-black text-xs flex items-center justify-center gap-2 shadow-lg shrink-0 disabled:opacity-60 active:scale-95 transition"
        >
          {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{savingSettings ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সেভ করুন'}</span>
        </button>
      </div>

      {settingsStatus.msg && (
        <div
          role="alert"
          className={`rounded-2xl p-4 text-xs font-bold flex items-center gap-2.5 border ${
            settingsStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {settingsStatus.type === 'success' ? (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-red-600" />
          )}
          <span>{settingsStatus.msg}</span>
        </div>
      )}

      {loadingSettings ? (
        <div className="bg-white rounded-3xl p-14 flex flex-col items-center justify-center text-slate-400 border border-slate-200/70">
          <Loader2 className="animate-spin text-blue-600 mb-3" size={32} />
          <span className="text-xs font-bold">সার্ভার থেকে সিস্টেম সেটিংস লোড হচ্ছে...</span>
        </div>
      ) : (
        <>
          {/* CARD 1: GENERAL & RESULT CONTROLS */}
          <div className="bg-white rounded-2xl lg:rounded-3xl p-5 lg:p-6 shadow-sm border border-slate-200/80 space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <Wrench size={15} className="text-amber-600" />
              পোর্টাল ও ফলাফল নিয়ন্ত্রণ (General & Result Policy)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Maintenance Mode */}
              <div className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                portalSettings.maintenanceMode
                  ? 'bg-red-50/70 border-red-200'
                  : 'bg-slate-50/80 border-slate-200/70'
              }`}>
                <div>
                  <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    মেইনটেন্যান্স মোড (Maintenance Mode)
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    চালু করলে সাধারণ ব্যবহারকারীদের জন্য পোর্টাল সাময়িক বন্ধ দেখাবে
                  </p>
                </div>
                <ToggleSwitch
                  checked={portalSettings.maintenanceMode}
                  accent="danger"
                  onChange={(val) => {
                    setSettingsStatus({ type: '', msg: '' });
                    setPortalSettings((p) => ({ ...p, maintenanceMode: val }));
                  }}
                />
              </div>

              {/* Only Admin Results */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-slate-800">
                    শুধুমাত্র অ্যাডমিন রেজাল্ট (Only Admin)
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    চালু থাকলে ফলাফল ও মার্কশিট নিয়ন্ত্রণ অ্যাডমিনের অধীনে থাকবে
                  </p>
                </div>
                <ToggleSwitch
                  checked={portalSettings.onlyAdminResults}
                  onChange={(val) => {
                    setSettingsStatus({ type: '', msg: '' });
                    setPortalSettings((p) => ({ ...p, onlyAdminResults: val }));
                  }}
                />
              </div>
            </div>

            {/* Result Publish Time */}
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Award size={15} className="text-amber-600" />
                  ফলাফল প্রকাশের তারিখ ও সময় (Result Publish Time)
                </p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  নির্ধারিত সময়ের আগে শিক্ষার্থীরা পাবলিক রেজাল্ট কাউন্টডাউন দেখতে পাবে
                </p>
              </div>
              <input
                type="datetime-local"
                value={portalSettings.resultPublishTime}
                onChange={(e) => {
                  setSettingsStatus({ type: '', msg: '' });
                  setPortalSettings((p) => ({ ...p, resultPublishTime: e.target.value }));
                }}
                className="px-3.5 py-2.5 rounded-xl bg-white border border-amber-300 text-xs font-mono font-black text-slate-800 outline-none focus:border-[#060D1F]"
              />
            </div>
          </div>

          {/* CARD 2: CLASS TEACHER PERMISSIONS (OWN CLASS vs OTHER CLASS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Own Class */}
            <div className="bg-white rounded-2xl lg:rounded-3xl p-5 shadow-sm border border-emerald-200/80 space-y-3.5">
              <div className="pb-3 border-b border-slate-100">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                  Class Teacher · Own Class
                </span>
                <h4 className="text-sm font-black text-slate-900 mt-1.5">
                  ক্লাস টিচার (নিজের শ্রেণির ক্ষেত্রে)
                </h4>
                <p className="text-[11px] font-semibold text-slate-400">
                  যে শ্রেণির দায়িত্বে আছেন, সেই শ্রেণির শিক্ষার্থীদের ওপর ক্ষমতা
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {PERMISSION_ACTIONS.map((item) => (
                  <div key={item.key} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-slate-800">{item.label}</p>
                      <p className="text-[10.5px] font-semibold text-slate-400">{item.desc}</p>
                    </div>
                    <ToggleSwitch
                      checked={Boolean(portalSettings.classTeacherPermissions.ownClass[item.key])}
                      onChange={(val) => toggleClassTeacherPerm('ownClass', item.key, val)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Other Class */}
            <div className="bg-white rounded-2xl lg:rounded-3xl p-5 shadow-sm border border-amber-200/80 space-y-3.5">
              <div className="pb-3 border-b border-slate-100">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                  Class Teacher · Other Classes
                </span>
                <h4 className="text-sm font-black text-slate-900 mt-1.5">
                  ক্লাস টিচার (অন্যের শ্রেণির ক্ষেত্রে)
                </h4>
                <p className="text-[11px] font-semibold text-slate-400">
                  নিজের অ্যাসাইন করা শ্রেণি ব্যতীত অন্য শ্রেণির শিক্ষার্থীদের ওপর ক্ষমতা
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {PERMISSION_ACTIONS.map((item) => (
                  <div key={item.key} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-slate-800">{item.label}</p>
                      <p className="text-[10.5px] font-semibold text-slate-400">{item.desc}</p>
                    </div>
                    <ToggleSwitch
                      checked={Boolean(portalSettings.classTeacherPermissions.otherClass[item.key])}
                      accent="gold"
                      onChange={(val) => toggleClassTeacherPerm('otherClass', item.key, val)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CARD 3: NON-CLASS TEACHER PERMISSIONS */}
          <div className="bg-white rounded-2xl lg:rounded-3xl p-5 lg:p-6 shadow-sm border border-slate-200/80 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users size={16} className="text-blue-600" />
                  সাধারণ শিক্ষক (ক্লাস টিচার না হলে / Non-Class Teacher)
                </h4>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  যেসব শিক্ষকের কোনো নির্দিষ্ট শ্রেণি অ্যাসাইন করা নেই, তাদের জন্য অনুমোদিত কার্যক্রম
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PERMISSION_ACTIONS.map((item) => (
                <div
                  key={item.key}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{item.label}</p>
                    <p className="text-[10px] font-semibold text-slate-400 truncate">{item.desc}</p>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(portalSettings.nonClassTeacherPermissions[item.key])}
                    onChange={(val) => toggleNonClassTeacherPerm(item.key, val)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#060D1F] via-[#0B1C38] to-[#0E3B2E] hover:brightness-110 text-[#D4A843] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-900/15 disabled:opacity-60 transition"
            >
              {savingSettings ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              <span>{savingSettings ? 'সংরক্ষণ হচ্ছে...' : 'সব পরিবর্তন সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </>
      )}
    </form>
  );

  return (
    <div className="min-h-screen bg-[#F0F4FF] pb-24 font-bangla">
      {/* ==============================================================
          TOP NAVIGATION BAR
         ============================================================== */}
      <div className="sticky top-0 z-30 bg-[#060D1F]/95 backdrop-blur-md text-white border-b border-white/10 shadow-md">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between">
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
          MAIN CONTENT CONTAINER (2-COLUMN ORGANIZED LAYOUT)
         ============================================================== */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-5 lg:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">

          {/* LEFT SIDEBAR (4 COLS ON DESKTOP · STICKY) */}
          <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
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
                    {isAdminUser ? 'সকল শ্রেণি (Admin)' : (currentUser?.classBn || teacher.assignedClass || '—')}
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

            {/* Desktop Quick Summary & Actions Card */}
            <div className="hidden lg:block bg-white rounded-[26px] p-5 shadow-sm border border-slate-200/80 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">দ্রুত যোগাযোগ ও অবস্থান</p>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50">
                  <span className="text-slate-500 font-bold flex items-center gap-2"><Phone size={13} /> মোবাইল</span>
                  <span className="font-mono font-black text-slate-800">{teacher.phone || currentUser?.phone || '—'}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50">
                  <span className="text-slate-500 font-bold flex items-center gap-2"><Mail size={13} /> ইমেইল</span>
                  <span className="font-bold text-slate-800 truncate max-w-[170px]">{teacher.email || currentUser?.email || '—'}</span>
                </div>
                {teacher.rankingMetrics?.overallMadrasahRank && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/60">
                    <span className="text-amber-800 font-bold flex items-center gap-2"><Award size={13} /> মাদ্রাসা র‍্যাংক</span>
                    <span className="font-black text-amber-900">#{teacher.rankingMetrics.overallMadrasahRank}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('security')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-black text-[11px] flex items-center justify-center gap-1.5 transition"
                >
                  <KeyRound size={13} /> পাসওয়ার্ড
                </button>
                {isAdminUser && (
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/70 font-black text-[11px] flex items-center justify-center gap-1.5 transition"
                  >
                    <Settings size={13} /> সেটিংস
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="py-2.5 px-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-black text-[11px] flex items-center justify-center gap-1.5 transition"
                >
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT WORKSPACE (8 COLS ON DESKTOP) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Responsive Tab Bar (4 tabs for teachers, 5 tabs for SuperAdmin/Admin) */}
            <div className={`grid ${isAdminUser ? 'grid-cols-5' : 'grid-cols-4'} gap-1.5 sm:gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/80`}>
              {visibleTabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`py-2.5 px-1.5 sm:px-3 rounded-xl text-[10.5px] sm:text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                      active
                        ? 'bg-[#060D1F] text-[#D4A843] shadow-sm'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span className="md:hidden truncate">{t.shortLabel}</span>
                    <span className="hidden md:inline truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab View */}
            {activeTab === 'attendance' && renderAttendanceSection()}
            {activeTab === 'salary' && renderSalarySection()}
            {activeTab === 'info' && (
              <div className="space-y-4">
                {renderProfileDetails()}
                <button
                  onClick={onLogout}
                  className="lg:hidden w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                >
                  <LogOut size={16} /> অ্যাকাউন্ট থেকে লগআউট করুন
                </button>
              </div>
            )}
            {activeTab === 'security' && renderSecuritySection()}
            {activeTab === 'settings' && isAdminUser && renderSystemSettingsSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfileView;