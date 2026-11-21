import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Camera, Check,
  ChevronLeft,
  CreditCard,
  Edit3,
  FileText,
  Home,
  IdCard,
  Layers,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  Filter,
  Copy,
  Cake,
    Contact,
  Gift,
  X
} from 'lucide-react';
import ImageViewer from './ImageViewer';
import AdvancedFilter from './AdvancedFilter';
import PdfExportModal from './PdfExportModal';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import signImg from "./assets/principal-sign.png";
import { CLASS_ORDER, CONFIG, DEFAULT_IMAGE, USER_ROLES, firebaseConfig } from "./systemConfig";
// Initialize Firebase
const  app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const CAN_CLASS_TEACHER_EDIT = false; // true হলে টিচার এডিট/অ্যাড/ডিলিট করতে পারবে
const RESTRICT_EXPORT_BY_ROLE = true; // true হলে টিচার শুধু নিজের ক্লাস এক্সপোর্ট করতে পারবে এবং ভিজিটর ব্লক হবে
const getDaysUntilBirthday = (dobStr) => {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  next.setHours(0, 0, 0, 0);

  if (next < today) {
    next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
  }

  return Math.round((next - today) / (1000 * 60 * 60 * 24));
};
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const REGEX = {
  BANGLA: /^[\u0980-\u09FF\s.]+$/,
  ENGLISH: /^[a-zA-Z\s.]+$/,
  MOBILE: /^01[3-9]\d{8}$/,
  NUMBER: /^\d+$/
};
// ── vCard EXPORT HELPERS (ported from register→contact tool) ──
const CONTACT_CLASS_CODE = {
  "Play": "00", "Nursery": "0", "KG": "0K", "Kg": "0K",
  "One": "1", "Two": "2", "Three": "3", "Four": "4",
  "Five": "5", "Six": "6", "Seven": "7", "Eight": "8", "Nine": "9", "Ten": "10"
};

const toISODate = (dStr) => {
  if (!dStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const vcardEscape = (str) => {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
};

const foldLine = (line) => {
  if (line.length <= 75) return line;
  let out = "";
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (count === 75) { out += "\r\n "; count = 0; }
    out += line[i];
    count++;
  }
  return out;
};

const fetchAsBase64 = async (url) => {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("bad status");
    const blob = await res.blob();
    const type = blob.type || "image/jpeg";
    const buf = await blob.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return { base64: btoa(binary), type };
  } catch (err) {
    return null;
  }
};

const buildContactAddress = (s) => {
  const street = [s.houseEn, s.villageEn].filter(Boolean).join(", ");
  return `;;${vcardEscape(street)};${vcardEscape(s.upazilaEn)};${vcardEscape(s.unionEn)};;${vcardEscape(s.districtEn)}`;
};

const buildContactNote = (s) => {
  const lines = [
    `নাম: ${s.nameBn}`,
    `Student ID: ${s.id}`,
    `Father: ${s.fatherEn}`,
    `পিতা: ${s.fatherBn ? ` ${s.fatherBn}` : ""}`,
    `Mother: ${s.motherEn}`,
    `মাতা: ${s.motherBn ? ` ${s.motherBn}` : ""}`,
    `Blood Group: ${s.blood || "N/A"}`,
    `BRN: ${s.brn || "N/A"}`,
    `Class: ${s.classEn} · Roll ${s.roll}`
  ];
  return lines.join("\n");
};

const normalizeForVCard = (data) => {
  const rawClass = (data.ClassEn || "").trim();
const code = CONTACT_CLASS_CODE[rawClass] || "0";  const nameEn = data.StudentNameEn || "";
  return {
    id: data.ID,
    code,
    classEn: data.ClassEn,
    roll: data.Roll,
    nameEn,
    nameBn: data.StudentNameBn,
    brn: data.BRN,
    dob: toISODate(data.DOB),
    session: data.Session,
    blood: data.BloodGroup,
    fatherEn: data.FatherNameEn, fatherBn: data.FatherNameBn,
    motherEn: data.MotherNameEn, motherBn: data.MotherNameBn,
    mobile: data.WhatsApp, emergency: data.EmergencyNo,
    houseEn: data.HouseNameEn, villageEn: data.VillageEn,
    unionEn: data.UnionEn, upazilaEn: data.UpazilaEn, districtEn: data.DistrictEn,
    imageUrl: data.ImageURL,
    vcardName: `${code} ${nameEn}`.trim()
  };
};

const buildContactVCard = async (data) => {
  const s = normalizeForVCard(data);
  let photoData = null;
  if (s.imageUrl) photoData = await fetchAsBase64(s.imageUrl);

  const lines = [];
  lines.push("BEGIN:VCARD");
  lines.push("VERSION:3.0");
  lines.push(foldLine(`FN:${vcardEscape(s.vcardName)}`));
  lines.push(foldLine(`N:${vcardEscape(s.vcardName)};;;;`));
  if (s.mobile) lines.push(foldLine(`TEL;TYPE=CELL,VOICE:${vcardEscape(s.mobile)}`));
  if (s.emergency && s.emergency !== s.mobile) lines.push(foldLine(`TEL;TYPE=HOME,VOICE:${vcardEscape(s.emergency)}`));
  lines.push(foldLine(`ADR;TYPE=HOME:${buildContactAddress(s)}`));
  if (s.dob) lines.push(`BDAY:${s.dob}`);
  lines.push(foldLine(`ORG:Class ${vcardEscape(s.classEn)} (Roll: ${vcardEscape(s.roll)}) Session: ${vcardEscape(s.session)}`));
  lines.push(foldLine(`TITLE:Student`));
  lines.push(foldLine(`CATEGORIES:ARDM,Class ${vcardEscape(s.classEn)}`));
  lines.push(foldLine(`NOTE:${vcardEscape(buildContactNote(s))}`));
  if (photoData) {
    const subtype = (photoData.type.split("/")[1] || "JPEG").toUpperCase();
    lines.push(foldLine(`PHOTO;ENCODING=b;TYPE=${subtype}:${photoData.base64}`));
  } else if (s.imageUrl) {
    lines.push(foldLine(`PHOTO;VALUE=URI:${s.imageUrl}`));
  }
  lines.push(`REV:${new Date().toISOString()}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
};
// ==============================================
// 3. UI COMPONENTS
// ==============================================

const Header = ({ title, action, onBack }) => (
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


const NavTab = ({ icon: Icon, label, active, onClick, main }) => (
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
const PremiumStyles = () => (
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
const useCountUp = (target, duration = 950, delay = 280) => {
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
const AnimatedCount = ({ target }) => {
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
const GenderBar = ({ label, count, total, color, delay = '0s' }) => {
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
const SkeletonCard = ({ index }) => (
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
const CLASS_PALETTE = {
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
const PremiumStudentCard = ({ data, onClick, onImageClick, index, showBirthdayCount }) => {
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
// ==============================================
// 4. MAIN APP LOGIC
// ==============================================
const Index = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const [tab, setTab] = useState('home');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
const [isSyncing, setIsSyncing] = useState(false);
const [viewerImg, setViewerImg] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [searchText, setSearchText] = useState('');
const [isFilterOpen, setIsFilterOpen] = useState(false);
const [advancedFilteredData, setAdvancedFilteredData] = useState(null);
const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
// যখন ডাটাবেস থেকে নতুন ডাটা লোড হবে, তখন ফিল্টার রিসেট করার জন্য:
useEffect(() => {
  setAdvancedFilteredData(null);
}, [students]);
const [showAllExports, setShowAllExports] = useState(false);
  // ... অন্যান্য useState এর নিচে ...
const [scrollPos, setScrollPos] = useState(0);
const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

const [contactProgress, setContactProgress] = useState({ show: false, current: 0, total: 0, name: '' });
const [sortConfig, setSortConfig] = useState(() => {
  return JSON.parse(localStorage.getItem("sortConfig")) || { field: '', order: '' };
});

const [classFilter, setClassFilter] = useState('All');

// ইউজার লগিন করার পর টিচারদের নিজস্ব ক্লাস ডিফল্টভাবে সিলেক্ট করার জন্য
useEffect(() => {
  if (currentUser) {
    if (currentUser.role === "Class") {
      setClassFilter(currentUser.classBn); // টিচারের জন্য তার নিজের ক্লাস
    } else {
      setClassFilter(localStorage.getItem("classFilter") || 'All'); // এডমিনের জন্য All
    }
  }
}, [currentUser]);

useEffect(() => {
  if (classFilter) localStorage.setItem("classFilter", classFilter);
}, [classFilter]);


const showToast = (msg, type = 'success') => {
  setToast({ show: true, msg, type });
  // ৩ সেকেন্ড পর অটোমেটিক বন্ধ হবে
  setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
};


useEffect(() => {
  localStorage.setItem("sortConfig", JSON.stringify(sortConfig));
}, [sortConfig]);


  // 1. FIREBASE AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const roleData = USER_ROLES[user.email];
        if (roleData) {
          setCurrentUser({ ...user, ...roleData });
        } else {
          alert("এই ইমেইলের কোনো এক্সেস নেই। এডমিনের সাথে যোগাযোগ করুন।");
          signOut(auth);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

    // 2. LOAD DATA ON LOGIN
  useEffect(() => { 
    if(currentUser) loadData(true); // true মানে প্রথমবার লোডার কল হবে
  }, [currentUser]);

useEffect(() => {
  if (!detailData) {
    window.scrollTo({
      top: scrollPos,
      behavior: "instant" // চাইলে "smooth"
    });
  }
}, [detailData]);
    const roleFilteredStudents = useMemo(() => {
    if (!currentUser) return [];
    // এখন আর কাউকে বাধা দিচ্ছি না, সবাই সব ডাটা পাবে
    return students; 
  }, [students, currentUser]);
// যখনই ট্যাব পরিবর্তন হবে, তখন যদি সেটি 'search' ট্যাব না হয়, তবে সার্চ টেক্সট ক্লিয়ার করে দিবে
useEffect(() => {
  if (tab !== 'search') {
    setSearchText('');
  }
}, [tab]);

useEffect(() => {
  const handleBack = () => {
// ✅ এটি সবার আগে যোগ করুন
    if (viewerImg) {
      setViewerImg(null);
      return;
    }
    if (isPdfModalOpen) {
  setIsPdfModalOpen(false);
  return;
    }
    // ১. যদি ফিল্টার মডাল ওপেন থাকে, তাহলে আগে সেটা ক্লোজ হবে
    if (isFilterOpen) {
      setIsFilterOpen(false);
      return;
    }

    // Edit → Detail
    if (isEdit) {
      setIsEdit(false);
      setTab('home');
      return;
    }

    // Detail → Home
    if (detailData) {
      setDetailData(null);
      return;
    }

    // Add → Home
    if (tab === 'add') {
      setTab('home');
      return;
    }

    // Search → Home
    if (tab !== 'home') {
      setTab('home');
      return;
    }

    // Home → Exit
    if (window.confirm("আপনি কি অ্যাপ থেকে বের হতে চান?")) {
      window.history.back();
    } else {
      window.history.pushState(null, "", window.location.href);
    }
  };

  window.addEventListener("popstate", handleBack);
  return () => window.removeEventListener("popstate", handleBack);
}, [tab, detailData, isEdit, isFilterOpen, viewerImg, isPdfModalOpen]); // <--- এখানে isFilterOpen যুক্ত করা হয়েছে

      const loadData = async (showLoader = true) => {
    setIsSyncing(true); // ব্যাকগ্রাউন্ড সিঙ্ক শুরু হলো (উপরের আইকন ঘুরবে)

    const cachedData = localStorage.getItem("cachedStudents");
    
    if (cachedData && students.length === 0) {
      setStudents(JSON.parse(cachedData)); // চোখের পলকে লিস্ট দেখাবে
    }
    
    if (!cachedData && showLoader) {
      setLoading(true); // কোনো ডাটা না থাকলে শুধু প্রথমবার বড় লোডার দেখাবে
    }

    try {
      const res = await fetch(`${CONFIG.API_URL}?action=read&t=${Date.now()}`);
      const json = await res.json();
      
      if (json.status === 'success') {
        setStudents(json.data);
        localStorage.setItem("cachedStudents", JSON.stringify(json.data));
      }
    } catch (e) {
      console.error("Data fetch error:", e);
      if (!cachedData) showToast("ইন্টারনেট সংযোগ চেক করুন!", "error");
    } finally {
      setLoading(false); // বড় লোডার বন্ধ
      setIsSyncing(false); // ব্যাকগ্রাউন্ড সিঙ্ক শেষ (উপরের আইকন থেমবে)
    }
  };


  const handleLogout = () => {
    if(window.confirm("আপনি কি লগআউট করতে চান?")) {
      signOut(auth);
    }
  };

const handleSave = async (formData) => {
    if (currentUser.role === "Visitor" || (currentUser.role === "Class" && !CAN_CLASS_TEACHER_EDIT)) {
    showToast("আপনার ডাটা অ্যাড বা এডিট করার অনুমতি নেই", "error");
    return;
  }


  const exists = students.find(s =>
    s.ClassBn === formData.classBn &&
    String(s.Roll) === String(formData.roll) &&
    s.ID !== (isEdit ? detailData.ID : null)
  );

  if (exists) {
    showToast("এই ক্লাসে এই রোল নম্বর আগে থেকেই আছে!", "error");
    return;
  }

  if (!isEdit) {
    const exists = students.find(s =>
      s.ClassBn === formData.classBn &&
      String(s.Roll) === String(formData.roll)
    );

    if (exists) {
      showToast("এই ক্লাসে এই রোল নম্বর আগে থেকেই আছে!", "error");
      return;
    }
  }

  if (currentUser.role === "Class" && formData.classBn !== currentUser.classBn) {
    alert("আপনি শুধু নিজের ক্লাসে ডাটা দিতে পারবেন");
    return;
  }

  setProcessing(true);

  try {
    let imgUrl = formData.imageUrl || DEFAULT_IMAGE;

    if (imgUrl && imgUrl.startsWith('data:')) {
      const cloudData = new FormData();
      cloudData.append('file', imgUrl);
      cloudData.append('upload_preset', CONFIG.UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CONFIG.CLOUD_NAME}/image/upload`,
        { method: 'POST', body: cloudData }
      );

      const json = await res.json();
      imgUrl = json.secure_url;
    }


    const payload = {
      key: "ARDM-SCHOOL-2026",
      action: isEdit ? 'update' : 'create',
      id: isEdit ? detailData.ID : null,
      ...formData,
      imageUrl: imgUrl
    };

    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.status === "success") {
        if (!isEdit) {
  localStorage.removeItem("draftStudentForm");
}
      await loadData();
      setTab('home');
      setDetailData(null);
      setIsEdit(false);
      showToast(result.message || "সফল হয়েছে", "success");
    } else {
      showToast(result.message || "Save failed", "error");
    }

  } catch (error) {
    showToast("সমস্যা হয়েছে: " + error.message, "error");
  } finally {
    // 🔥🔥🔥 সবচেয়ে গুরুত্বপূর্ণ লাইন
    setProcessing(false);
  }
};

  const handleDelete = async (id) => {
if (currentUser.role === "Visitor" || (currentUser.role === "Class" && !CAN_CLASS_TEACHER_EDIT)) {
  showToast("Visitor or unauthorized class teacher cannot delete data", "error");
  return;
}

  if (!window.confirm("আপনি কি নিশ্চিত এই ডাটা ডিলিট করতে চান?")) return;

  if (currentUser.role === "Class" && detailData.ClassBn !== currentUser.classBn) {
    alert("আপনি এই ক্লাসের ডাটা ডিলিট করতে পারবেন না");
    return;
  }

  setProcessing(true);
  setStudents(prev => prev.filter(s => s.ID !== id));
  setDetailData(null);

  try {
    const res = await fetch(CONFIG.API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain'
  },
  body: JSON.stringify({ key: "ARDM-SCHOOL-2026", action: 'delete', id })
});

const result = await res.json();

if(result.status === "success"){
  showToast(result.message, "success");
} else {
  showToast(result.message, "error");
}

    setTimeout(loadData, 2000);
  } catch {
    alert("নেটওয়ার্ক সমস্যা");
    loadData();
  }

  setProcessing(false);
};


  // --- EXPORT FUNCTIONS (FULL RESTORED) ---
const getFilteredData = () => {
  return filteredList;
};


  const handleExportTablePDF = () => {
    if (!checkExportPermission()) return;

    const data = getFilteredData();
    if (!data || data.length === 0) {
      showToast("লিস্ট প্রিন্ট করার জন্য কোনো ডাটা নেই", "error");
      return;
    }

    const w = window.open('', '_blank');
    w.document.write(`
    <html>
    <head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
      <title>${CONFIG.APP_NAME} - Register</title>
      <style>
        @media print { @page { size: A4; margin: 12mm 8mm 8mm; } }
        body { font-family: 'Hind Siliguri', sans-serif; font-size: 15px; }
        h2 { text-align:center; margin-bottom:5px; }
        table { width:100%; font-size: 14px; border-collapse: collapse; table-layout: fixed; }
        th, td { border:1px solid #000; padding:3px 5px; vertical-align: top; }
        th { background:#eee; text-align:center; }
        thead { display: table-header-group; }

      .col-img {width : 11%; padding: 3px;}
        .col-small { width: 13.5%; }
        .col-name { width: 27%; }
        .col-family { width: 27%; }
        .col-address { width: 21.5%; }
        img { width: 100%; height: 100%; object-fit: contain; object-position: center center; }
        .block div { margin:0 0; }
        .label { font-weight:bold; }

      </style>
    </head>
 <body>
  <h2>${CONFIG.APP_NAME} - Student Register</h2>
  <p style="text-align:center; font-size:13px; font-weight:bold; margin:4px 0; margin-bottom :0px;">
  Total: ${data.length} | 
  Male: ${data.filter(s => s.Gender === 'Male').length} | 
  Female: ${data.filter(s => s.Gender === 'Female').length}
</p>

<p style="text-align:center; font-size:13.5px; font-weight:bold; margin-bottom:5px;">
  ${[...new Set(data.map(s => s.ClassEn))].length === 1 
    ? `Class: ${data[0].ClassEn}` 
    : [...new Set(data.map(s => s.ClassEn))]
        .map(c => `${c}: ${data.filter(s => s.ClassEn === c).length}`)
        .join(' | ')
  }
</p>

  <table>
    <thead>
      <tr>
        <th class="col-small">Photo</th>
        <th class="col-name">Name Info</th>
        <th class="col-small">Class Info</th>
        <th class="col-family">Family & Phone</th>
        <th class="col-address">Address</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(s => `
        <tr>
          <td class="col-img">
            <img src="${s.ImageURL || DEFAULT_IMAGE }" />
          </td>
          <td class="col-name block">
            <div><span class="label"> ${s.StudentNameBn || ''}</span></div>
            <div><span class="label"> ${s.StudentNameEn || ''}</span></div>
            <div><span class="label"> ID: ${s.ID || ''}</span></div>
          <div><span class="label"> BRN: ${s.BRN || ''}</span></div>
       
          </td>
          <td class="col-small block">
            <div><span class="label">Class:</span> ${s.ClassEn || s.ClassBn || ''}</div>
            <div><span class="label">Roll:</span> ${s.Roll || ''}</div>
            <div><span class="label">Blood:</span> ${s.BloodGroup || ''}</div>
            <div><span class="label">${s.Gender || ''}</span> </div>
            
          </td>
          <td class="col-family block">
            <div><span class="label">পিতা:</span> ${s.FatherNameBn || ''}</div>
            <div><span class="label">মাতা:</span> ${s.MotherNameBn || ''}</div>
            <div><span class="label">Phone:</span> ${s.WhatsApp || ''}</div>
         <div><span class="label">DOB:</span> ${formatDate(s.DOB) || ''}</div>
         
          </td>
          <td class="col-address block">
            <div>
              ${s.HouseNameBn || ''}, ${s.VillageBn || ''}, 
              ${s.UnionBn || ''}, ${s.UpazilaBn || ''}, 
              ${s.DistrictBn || ''}
            </div>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
 <script>
  window.onload = function () {
    setTimeout(() => {
      window.print();
    }, 800); // QR + photo load হওয়ার সময় দেয়
  };
</script>

</body>

    </html>
    `);
    w.document.close();
  };

  const handleExportExcel = () => {
    if (!checkExportPermission()) return;

    const dataToExport = getFilteredData();
    if (dataToExport.length === 0)  return showToast("এক্সেল ডাউনলোড করার জন্য কোনো ডাটা নেই!", "error");

    const headers = [
      "ID", "Time", "Session", "Name (Bn)", "Name (En)", "Roll", "Class (Bn)", "Class (En)", 
      "BRN", "DOB", "Blood", "Gender","Father (Bn)", "Father (En)", "Mother (Bn)", "Mother (En)", 
      "Mobile", "Emergency", "House (Bn)", "House (En)", "Village (Bn)", "Village (En)", 
      "Union (Bn)", "Union (En)", "Ward", "Upazila (Bn)", "Upazila (En)", 
      "District (Bn)", "District (En)", "Image URL", "Status"
    ];

    const rows = dataToExport.map(s => [
          s.ID, s.Time, s.Session, s.StudentNameBn, s.StudentNameEn, s.Roll, s.ClassBn, s.ClassEn,
          `'${s.BRN}`, s.DOB, s.BloodGroup, s.Gender,s.FatherNameBn, s.FatherNameEn, s.MotherNameBn, s.MotherNameEn,
          `'${s.WhatsApp}`, `'${s.EmergencyNo}`, s.HouseNameBn, s.HouseNameEn, s.VillageBn, s.VillageEn,
          s.UnionBn, s.UnionEn, s.WardNo, s.UpazilaBn, s.UpazilaEn, s.DistrictBn, s.DistrictEn,
          s.ImageURL, s.Status
        ].map(f => `"${f || ''}"`).join(",")
    );

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `Student_Data_${new Date().toLocaleDateString()}.csv`;

    link.click();
  };
const handleCopyAllIds = async () => {
  const list = filteredList;
  if (!list || list.length === 0) {
    return showToast("কপি করার জন্য কোনো আইডি নেই", "error");
  }
  const idsText = list.map(s => s.ID).filter(Boolean).join(', ');
  try {
    await navigator.clipboard.writeText(idsText);
    showToast(`${list.length}টি স্টুডেন্ট আইডি কপি হয়েছে`, "success");
  } catch (e) {
    showToast("কপি করা যায়নি", "error");
  }
};
  const checkExportPermission = () => {
  // যদি টগল 'false' (অফ) থাকে, তবে আগের মতই সবাই সব এক্সপোর্ট করতে পারবে
  if (!RESTRICT_EXPORT_BY_ROLE) return true;

  // ভিজিটরদের জন্য সম্পূর্ণ ব্লক
  if (currentUser?.role === 'Visitor') {
    showToast("ভিজিটরদের ডাটা ডাউনলোড করার অনুমতি নেই!", "error");
    return false;
  }

  // ক্লাস টিচারদের জন্য রেস্ট্রিকশন
  if (currentUser?.role === 'Class') {
    // চেক করা হচ্ছে ফিল্টার করা লিস্টে অন্য কোনো ক্লাসের স্টুডেন্ট আছে কিনা
    const hasOtherClassData = filteredList.some(s => s.ClassBn !== currentUser.classBn);
    
    if (hasOtherClassData) {
      showToast(`আপনি শুধুমাত্র আপনার ক্লাস (${currentUser.classBn}) এর ডাটা ডাউনলোড করতে পারবেন!`, "error");
      return false;
    }
  }

  // এডমিন বা সঠিক পারমিশন থাকলে true রিটার্ন করবে
  return true;
};

  const handleExportContacts = async () => {
 if (!checkExportPermission()) return;

    const list = getFilteredData();
  if (!list || list.length === 0) {
    return showToast("কন্টাক ডাউনলোড করার জন্য কোনো ডাটা নেই", "error");
  }

  setContactProgress({ show: true, current: 0, total: list.length, name: '' });

  try {
    const cards = [];
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      setContactProgress({ show: true, current: i, total: list.length, name: s.StudentNameEn || s.StudentNameBn || '' });
      cards.push(await buildContactVCard(s));
    }
    setContactProgress({ show: true, current: list.length, total: list.length, name: '' });

    const vcfText = cards.join("\r\n");
    const blob = new Blob([vcfText], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ARDM_Contacts_${list.length}_${new Date().toISOString().slice(0,10)}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`${list.length} টি কন্টাক কার্ড ডাউনলোড হয়েছে`, "success");
  } catch (e) {
    showToast("কন্টাক তৈরি করতে সমস্যা হয়েছে", "error");
  } finally {
    setTimeout(() => setContactProgress({ show: false, current: 0, total: 0, name: '' }), 300);
  }
};
const handleExportPDF = () => {
  if (!checkExportPermission()) return;

  const dataToExport = getFilteredData();
  if (dataToExport.length === 0) return showToast("ইনফো শিটের জন্য কোনো ডাটা পাওয়া যায়নি!", "error");

  const printWindow = window.open('', '_blank', 'height=900,width=1100');
  if (!printWindow) {
    return alert("পপআপ ব্লক হয়েছে!");
  }

  printWindow.document.write(`
  <html>
  <head>
    <title>Student Information Sheet</title>
    <style>
      @media print {
        @page { size: A4; margin: 10mm; }
      }

      body {
        font-family: Arial, sans-serif;
        font-size: 11px;
        margin: 0;
      }

      .page {
        page-break-after: always;
      }

      .student-card {
        border: 2px solid #000;
        padding: 8px;
        margin-bottom: 38px;
        height: 48%;
        box-sizing: border-box;
      }

      .header {
        text-align: center;
        border-bottom: 2px solid #000;
        margin-bottom: 6px;
      }

      .header h2 {
        margin: 0;
        font-size: 20px;
      }

      .header p {
        margin: 0;
        font-size: 15px;
      }

      .top-row {
        display: flex;
        gap: 10px;
      }

      .photo-box {
        width: 110px;
        text-align: center;
      }

      .photo-box img {
        width: 100px;
        height: 110px;
        border: 1px solid #000;
      }

      table {
      font-size : 13px;
        width: 100%;
        border-collapse: collapse;
      }

      td {
        border: 1px solid #000;
        padding: 3px;
        vertical-align: top;
      }

      .label {
        width: 35%;
        font-weight: bold;
      }

      .footer {
        margin-top: 28px;
        display: flex;
        justify-content: space-between;
      }

      .sign {
        border-top: 1px solid #000;
        width: 150px;
        text-align: center;
        font-size: 10px;
      }
    </style>
  </head>
  <body>
  `);

  dataToExport.forEach((s, i) => {
    if (i % 2 === 0) printWindow.document.write(`<div class="page">`);

    printWindow.document.write(`
      <div class="student-card">
        <div class="header">
          <h2>${CONFIG.APP_NAME}</h2>
          <p>Student Information Form</p>
        </div>

        <div class="top-row">
          <div class="photo-box">
            <img src="${s.ImageURL || DEFAULT_IMAGE}">
            <div>Roll: ${s.Roll}</div>
            <div>Class: ${s.ClassEn || s.ClassBn}</div>
          </div>

          <table>
            <tr><td class="label">শিক্ষার্থীর নাম :</td><td>${s.StudentNameBn}</td></tr>
            <tr><td class="label">Student's Name :</td><td>${s.StudentNameEn}</td></tr>
             <tr><td class="label">Student ID :</td><td>${s.ID}</td></tr>
            <tr><td class="label">জন্ম নিবন্ধন নং :</td><td>${s.BRN}</td></tr>
            <tr><td class="label">Date of Birth :</td><td>${formatDate(s.DOB)}</td></tr>
            <tr><td class="label">Blood Group :</td><td>${s.BloodGroup}</td></tr>
              <tr><td class="label">Gender :</td><td>${s.Gender}</td></tr>
            <tr><td class="label">Session :</td><td>${s.Session}</td></tr>

            <tr><td class="label">পিতার নাম :</td><td>${s.FatherNameBn}</td></tr>
            <tr><td class="label">Father's Name :</td><td>${s.FatherNameEn}</td></tr>
            <tr><td class="label">মাতার নাম :</td><td>${s.MotherNameBn}</td></tr>
            <tr><td class="label">Mother's Name :</td><td>${s.MotherNameEn}</td></tr>

            <tr><td class="label">মোবাইল :</td><td>${s.WhatsApp}</td></tr>
            <tr><td class="label">জরুরী নম্বর :</td><td>${s.EmergencyNo}</td></tr>

            <tr><td class="label">ঠিকানা (বাংলা) :</td>
              <td>${s.HouseNameBn || ''}, ${s.VillageBn || ''}, ${s.UnionBn || ''}, ${s.UpazilaBn || ''}, ${s.DistrictBn || ''}</td>
            </tr>

            <tr><td class="label">Address (English) :</td>
              <td>${s.HouseNameEn || ''}, ${s.VillageEn || ''}, ${s.UnionEn || ''}, ${s.UpazilaEn || ''}, ${s.DistrictEn || ''}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <div class="sign">Guardian's Signature</div>
          <div class="sign">Head Teacher</div>
        </div>
      </div>
    `);

    if (i % 2 === 1 || i === dataToExport.length - 1)
      printWindow.document.write(`</div>`);
  });

  printWindow.document.write(`
    <script>
      window.onload = function() {
        window.print();
      }
    <\/script>
  </body></html>
  `);

  printWindow.document.close();
};


const handleExportAllIDCards = () => {
  if (!checkExportPermission()) return;

  const list = getFilteredData();
  if (list.length === 0) return showToast("আইডি কার্ডের জন্য কোনো ডাটা নেই", "error");

  const w = window.open('', '_blank');

  w.document.write(`
  <html>
  <head>
    <title>All ID Cards</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');

      @media print {
        @page { size: A4 landscape; margin: 0mm; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }

      body {
        font-family: 'Noto Sans Bengali', sans-serif;
        margin: 0;
      }

      
.page {
  width: 297mm;
  height: 210mm;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 20px;
  justify-items: center;
  align-items: center;
  page-break-after: always;
  
}
      .print-container {
        display: flex;
        gap: 2px;
        align-items: flex-start;
      }

      .id-card-box {
        width: 2.125in;
        height: 3.375in;
        position: relative;
        background: #fff;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #ddd;
        box-sizing: border-box;
      }

      .front-header {
        background: linear-gradient(to bottom, #0f172a 0%, #1e293b 100%);
        height: 65px;
        color: white;
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
        z-index: 1;
      }

      .curve {
        position: absolute;
        bottom: -30px;
        left: 0;
        width: 100%;
        height: 30px;
        background: #1e293b;
        border-radius: 0 0 50% 50%;
        z-index: -1;
      }

      .front-header h2 {
        font-size: 11.5px;
        margin: 0;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-family: 'Oswald', sans-serif;
        padding: 0 5px;
      }

      .front-header p {
        font-size: 9px;
        margin: 2px 0 0;
        opacity: 0.8;
      }

      .photo-box {
        width: 72px;
        height: 72px;
        margin: -10px auto 0;
        position: relative;
        z-index: 2;
        background: white;
        padding: 3px;
        border-radius: 6px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.15);
      }

      .photo-box img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 4px;
        display: block;
      }

      .student-info {
        text-align: center;
        margin-top: 7px;
        margin-bottom: 7px;
      }

      .s-name-en { font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; line-height: 1.2; }
      .s-name-bn { font-size: 11px; font-weight: 600; color: #334155; }

      .id-pill {
        background: #0f172a;
        color: white;
        font-size: 9px;
        padding: 1px 8px;
        border-radius: 10px;
        display: inline-block;
        margin: 2px 0 2px;
        font-weight: bold;
      }

      .info-table { width: 92%; margin: 0 auto; border-collapse: collapse; }

      .info-table td {
        font-size: 10.5px;
        padding: 1.5px 5px;
        color: #0f172a;
        vertical-align: middle;
      }

      .info-table .lbl { font-weight: 700; color: #64748b; width: 40px; text-align: left; }
      .info-table .val { font-weight: 600; text-align: left; }
      .info-table .row-border { border-bottom: 1px dotted #cbd5e1; }

      .signature-area {
        position: absolute;
        bottom: 8px;
        right: 15px;
        text-align: center;
      }

      .sig-line { width: 60px; border-top: 1px solid #0f172a; margin-bottom: 2px; }
      .sig-text { font-size: 6px; font-weight: 700; color: #0f172a; }

      .back-container {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: #fff;
        position: relative;
      }

      .back-content {
        flex: 1;
        padding: 10px 18px;
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        z-index: 1;
      }

      .watermark-logo {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 60px;
        opacity: 0.05;
        color: #000;
        z-index: 0;
        font-weight: bold;
        pointer-events: none;
        white-space: nowrap;
      }

      .guardian-card {
        width: 100%;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        border-radius: 6px;
        padding: 6px;
        margin-bottom: 8px;
        text-align: left;
        box-sizing: border-box;
      }

      .section-title {
        font-size: 8px;
        font-weight: 700;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 3px;
        border-bottom: 1px solid #cbd5e1;
        padding-bottom: 2px;
        display: block;
      }

      .address-text { font-size: 9px; color: #334155; line-height: 1.3; font-weight: 500; }

      .qr-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 5px 0 8px;
        width: 100%;
        background: #fff;
        padding: 4px;
        border: 1px dashed #cbd5e1;
        border-radius: 6px;
        box-sizing: border-box;
      }

      .qr-img { width: 55px; height: 55px; display: block; }

      .validity-info { flex: 1; text-align: left; }

      .valid-label { font-size: 7px; color: #64748b; text-transform: uppercase; font-weight: 700; }
      .valid-year {
        font-size: 14px;
        font-weight: 800;
        color: #0f172a;
        font-family: 'Oswald', sans-serif;
        display: block;
        margin-top: -2px;
      }

      .scan-hint { font-size: 6px; color: #94a3b8; margin-top: 2px; }

      .rules-list { width: 100%; text-align: left; margin-bottom: auto; }

      .rules-list ul { margin: 0; padding-left: 12px; }

      .rules-list li {
        font-size: 7px;
        color: #475569;
        margin-bottom: 2px;
        line-height: 1.2;
      }

      .emergency-footer {
        width: 100%;
        margin-top: 5px;
        background: #fee2e2;
        border: 1px solid #fecaca;
        border-radius: 4px;
        padding: 4px;
        text-align: center;
        box-sizing: border-box;
      }

      .emergency-label { font-size: 7px; color: #dc2626; font-weight: 700; text-transform: uppercase; }
      .emergency-num { font-size: 10px; font-weight: 800; color: #b91c1c; }

      .return-strip {
        background: #0f172a;
        color: white;
        font-size: 7px;
        text-align: center;
        padding: 4px 0;
        width: 100%;
        margin-top: 5px;
      }
    </style>
  </head>
  <body>
  `);

  list.forEach((data, i) => {
    const qrData = `${window.location.origin}/${data.ID}`;
    const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

    if (i % 4 === 0) {
      if (i !== 0) w.document.write(`</div>`);
      w.document.write(`<div class="page">`);
    }

    w.document.write(`
      <div class="print-container">

        <!-- FRONT -->
        <div class="id-card-box">
          <div class="front-header">
            <h2>${CONFIG.APP_NAME}</h2>
            <p>Sarafbhata, Rangunia, Chattogram</p>
            <div class="curve"></div>
          </div>

          <div class="photo-box">
            <img src="${data.ImageURL || 'https://via.placeholder.com/150'}" />
          </div>

          <div class="student-info">
            <div class="s-name-en">${data.StudentNameEn}</div>
            <div class="s-name-bn">${data.StudentNameBn}</div>
            <div class="id-pill">ID: ${data.ID}</div>
          </div>

          <table class="info-table">
            <tr class="row-border">
              <td class="lbl">Class</td>
              <td class="val">: ${data.ClassEn} | Roll: ${data.Roll}</td>
            </tr>
            <tr class="row-border">
              <td class="lbl">Father</td>
              <td class="val">: ${data.FatherNameBn}</td>
            </tr>
            <tr class="row-border">
              <td class="lbl">Mother</td>
              <td class="val">: ${data.MotherNameBn}</td>
            </tr>
            <tr class="row-border">
              <td class="lbl">DOB</td>
              <td class="val">: <span style="font-weight:800;">${formatDate(data.DOB)}</span></td>
            </tr>
            <tr class="row-border">
              <td class="lbl">Blood</td>
              <td class="val">: <span style="color:#ef4444; font-weight:800;">${data.BloodGroup || 'N/A'}</span></td>
            </tr>
            <tr>
              <td class="lbl">Mobile</td>
              <td class="val">: ${data.WhatsApp}</td>
            </tr>
          </table>

          <div class="signature-area">
            <img src="${signImg}" style="width:60px; display:block; margin-bottom:-23px;" />
            <div class="sig-line"></div>
            <div class="sig-text">Superintendent</div>
          </div>
        </div>

        <!-- BACK -->
        <div class="id-card-box">
          <div class="back-container">

            <div class="front-header" style="height: 50px;">
              <h2>${CONFIG.APP_NAME}</h2>
            </div>

            <div class="back-content">
              <div class="watermark-logo">
                ${CONFIG.APP_NAME.split(' ').map(w => w.charAt(0).toUpperCase()).join('')}
              </div>

              <div class="guardian-card">
                <span class="section-title">Permanent Address</span>
           <div class="address-text">
  ${
    [
      data.HouseNameBn,
      data.VillageBn,
      data.UnionBn,
      data.UpazilaBn,
      data.DistrictBn
    ]
    .filter(Boolean)
    .join(', ')
  }।
</div>

              </div>

              <div class="qr-wrapper">
                <img src="${qrImage}" class="qr-img" />
                <div class="validity-info">
                  <div class="valid-label">Academic Session</div>
                  <div class="valid-year">${data.Session} - ${parseInt(data.Session)+1}</div>
                  <div class="scan-hint">Scan to verify student profile</div>
                </div>
              </div>

              <div class="rules-list">
                <span class="section-title">Instructions</span>
                <ul>
                  <li>This card is non-transferable.</li>
                  <li>Must be worn during institution hours.</li>
                  <li>Report lost card immediately to office.</li>
                  <li>Phone : 01865415088 | 01837713062</li>
                  <li>Email : raisulislamsaied@gmail.com</li>
                </ul>
              </div>

              <div class="emergency-footer">
                <div class="emergency-label">this id card is valid until
</div>
                <div class="emergency-num" style="text-transform: uppercase;">31 January 2027</div>
              </div>

            </div>

            <div class="return-strip">
              If found, please return to the madrasah office.
            </div>
          </div>
        </div>

      </div>
    `);
  });

// loop শেষ হওয়ার পরে last page close
if (list.length > 0) {
  w.document.write(`</div>`);
}

w.document.write(`
<script>
window.onload = function () {
  setTimeout(() => {
    window.print();
  }, 700);
};
</script>
</body>
</html>
`);


  w.document.close();
};
// এটা roleFilteredStudents / filteredList সংজ্ঞার আশেপাশে বসান (Index কম্পোনেন্টের ভেতরে)

const cleanFamilyName = (name) =>
  (name || '')
    .replace(/মোঃ|মো\.?|মোহাম্মদ|মুহাম্মদ|md\.?|MD\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const siblingsOfDetail = useMemo(() => {
  if (!detailData) return [];

  const father = cleanFamilyName(detailData.FatherNameBn);
  const mother = cleanFamilyName(detailData.MotherNameBn);
  const phone = (detailData.WhatsApp || '').trim();

  return roleFilteredStudents
    .filter(s => {
      if (s.ID === detailData.ID) return false;
      let score = 0;
      if (father && cleanFamilyName(s.FatherNameBn) === father) score++;
      if (mother && cleanFamilyName(s.MotherNameBn) === mother) score++;
      if (phone && (s.WhatsApp || '').trim() === phone) score++;
      return score >= 2;
    })
    .sort((a, b) => {
      // বড় থেকে ছোট (জন্ম তারিখ অনুযায়ী), DOB না থাকলে ক্লাস অনুযায়ী
      const da = a.DOB ? new Date(a.DOB) : null;
      const db = b.DOB ? new Date(b.DOB) : null;
      if (da && db) return da - db;
      return (CLASS_ORDER[b.ClassBn] || 0) - (CLASS_ORDER[a.ClassBn] || 0);
    });
}, [detailData, roleFilteredStudents]);



 const filteredList = useMemo(() => {
  // যদি অ্যাডভান্সড ফিল্টার করা থাকে, তবে সেটি নেবে, নাহলে রেগুলার ডাটা
  let list = advancedFilteredData !== null ? advancedFilteredData : roleFilteredStudents;
  
  // SEARCH FILTER
if (searchText) {
  const lower = searchText.toLowerCase();
  list = list.filter(s =>
    (s.StudentNameBn && s.StudentNameBn.toLowerCase().includes(lower)) ||
    (s.StudentNameEn && s.StudentNameEn.toLowerCase().includes(lower)) ||
    (s.ID && s.ID.toString().includes(lower)) ||
    (s.Roll && s.Roll.toString().includes(lower)) ||
    (s.WhatsApp && s.WhatsApp.includes(lower))
  );
}

  // শুধু Admin এর জন্য Class filter
  // সবার জন্যই Class filter কাজ করবে
  if (classFilter !== 'All') {
    list = list.filter(s => s.ClassBn === classFilter);
  }



  const { field, order } = sortConfig;
   if (field === 'family') {

  const clean = (name) =>
    (name || '')
      .replace(/মোঃ|মো\.?|মোহাম্মদ|মুহাম্মদ|md\.?|MD\.?/gi,'')
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();

  const result = [];
  const familyKey = {};

  for (let i = 0; i < list.length; i++) {

    for (let j = i + 1; j < list.length; j++) {

      const a = list[i];
      const b = list[j];

      let score = 0;

      const fatherA = clean(a.FatherNameBn);
      const fatherB = clean(b.FatherNameBn);

      const motherA = clean(a.MotherNameBn);
      const motherB = clean(b.MotherNameBn);

      const phoneA = (a.WhatsApp || '').trim();
      const phoneB = (b.WhatsApp || '').trim();

      if (fatherA && fatherA === fatherB) score++;
      if (motherA && motherA === motherB) score++;
      if (phoneA && phoneA === phoneB) score++;

      if (score >= 2) {

        result.push(a);
        result.push(b);

        const key =
          fatherA || motherA || phoneA;

        familyKey[a.ID] = key;
        familyKey[b.ID] = key;
      }

    }
  }

  // duplicate remove
  list = result.filter((v, i, a) => a.indexOf(v) === i);

  // siblings together
  list.sort((a, b) => {
    const ka = familyKey[a.ID] || '';
    const kb = familyKey[b.ID] || '';
    return ka.localeCompare(kb);
  });

}
  if (field === 'name') {
    list = [...list].sort((a, b) =>
      order === 'asc'
        ? a.StudentNameEn.localeCompare(b.StudentNameEn)
        : b.StudentNameEn.localeCompare(a.StudentNameEn)
    );
  }

  if (field === 'roll') {
    list = [...list].sort((a, b) =>
      order === 'asc' ? a.Roll - b.Roll : b.Roll - a.Roll
    );
  }

 if (field === 'class') {
  list = [...list].sort((a, b) => {
    const classDiff =
      order === 'asc'
        ? (CLASS_ORDER[a.ClassBn] || 0) -
          (CLASS_ORDER[b.ClassBn] || 0)
        : (CLASS_ORDER[b.ClassBn] || 0) -
          (CLASS_ORDER[a.ClassBn] || 0);

    // যদি class আলাদা হয়
    if (classDiff !== 0) return classDiff;

    // class same হলে সবসময় roll ascending
    return (a.Roll || 0) - (b.Roll || 0);
  });
  }

  if (field === 'time') {
    list = [...list].sort((a, b) =>
      order === 'asc'
        ? new Date(a.Time) - new Date(b.Time)
        : new Date(b.Time) - new Date(a.Time)
    );
  }
   if (field === 'dob') {
    list = [...list].sort((a, b) => {
      const dA = getDaysUntilBirthday(a.DOB);
      const dB = getDaysUntilBirthday(b.DOB);
      if (dA === null && dB === null) return 0;
      if (dA === null) return 1;   // DOB না থাকলে নিচে
      if (dB === null) return -1;
      return dA - dB; // আজ (0) সবার আগে, তারপর কাল (1), তারপর ক্রমান্বয়ে
    });
  }
  return list;
}, [roleFilteredStudents, searchText, sortConfig, classFilter, currentUser, advancedFilteredData]); // <--- এখানে classFilter হবে

  // --- AUTH CHECK LOADING ---
  if(authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  // --- LOGIN PAGE ---
  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="bg-gray-50 min-h-screen font-bangla text-slate-800 pb-24">
      {processing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex flex-col items-center justify-center text-white">
          <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
          <p className="font-bold">কাজ চলছে...</p>
        </div>
      )}
{contactProgress.show && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center px-6">
    <div className="bg-white rounded-3xl p-7 w-full max-w-xs text-center shadow-2xl">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#0E7490,#22D3EE)' }}>
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
      {tab === 'home' && !detailData && (
  <>
    <PremiumStyles />
    <Header
      title="ARDM"
      action={
        <div className="flex gap-2">
          <button onClick={() => navigate("/result")} className="p-2 bg-amber-50 rounded-full active:bg-amber-100 text-amber-600">
            <Award size={20} />
          </button>
          <button onClick={() => loadData(true)} className="p-2 bg-gray-100 rounded-full active:bg-gray-200">
            <RefreshCw size={20} className={`transition-all duration-300 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-600'}`}/>
          </button>
          <button onClick={handleLogout} className="p-2 bg-red-50 rounded-full active:bg-red-100 text-red-600">
            <LogOut size={20} />
          </button>
        </div>
      }
    />

    <div style={{ background: '#F0F4FF', minHeight: '100vh' }} className="pt-20 pb-28">

      {/* HERO */}
      <div className="px-4 pt-5">
        <div className="ardm-hero-bg relative rounded-[28px] overflow-hidden" style={{ padding: '28px 22px 24px' }}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <svg className="ardm-pattern-spin absolute -right-20 -top-20 w-72 h-72 opacity-[0.04]" viewBox="0 0 200 200" fill="none">
              {[0,22.5,45,67.5,90,112.5,135,157.5].map((a, i) => (
                <rect key={i} x="97" y="5" width="6" height="190" rx="3" fill="white" transform={`rotate(${a} 100 100)`} />
              ))}
              <circle cx="100" cy="100" r="30" stroke="white" strokeWidth="2"/>
              <circle cx="100" cy="100" r="58" stroke="white" strokeWidth="1"/>
              <circle cx="100" cy="100" r="86" stroke="white" strokeWidth="0.5" strokeDasharray="5 9"/>
            </svg>
            <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, #D4A84340 0%, transparent 70%)' }} />
            <div className="absolute right-8 top-6 w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle, #60A5FA18 0%, transparent 70%)' }} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1.5 h-4 rounded-full bg-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {currentUser?.role === 'Admin' ? 'Admin Dashboard' : `Class ${currentUser?.classEn || ''} Dashboard`}
              </span>
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
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Session</span>
              <span className="text-[11px] font-black text-white">
                {[...new Set(filteredList.map(s => s.Session))].sort().join(', ') || '—'}
              </span>
              <span className="ml-auto text-[9px] font-black text-slate-500">
                Active <span className="text-emerald-400">{filteredList.filter(s => s.Status === 'Active').length}</span>
                {' / '}Inactive <span className="text-red-400">{filteredList.filter(s => s.Status !== 'Active').length}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

            {/* EXPORT */}
<div className="px-4 mt-4">
  <div className="bg-white rounded-[22px] p-5" style={{ boxShadow: '0 4px 20px rgba(6,13,31,0.055)', border: '1px solid rgba(6,13,31,0.05)' }}>
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.18em]">Export & Print</span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>

    {(() => {
      const exportButtons = [
        { icon: FileText, label: 'Excel',     gradient: 'linear-gradient(135deg,#047857,#10B981)', glow: '#10B981', onClick: handleExportExcel },
        { icon: Printer,  label: 'PDF Info',  gradient: 'linear-gradient(135deg,#C2410C,#F97316)', glow: '#F97316', onClick: handleExportPDF },
        { icon: Layers,   label: 'Table',     gradient: 'linear-gradient(135deg,#1E3A8A,#3B82F6)', glow: '#3B82F6', onClick: handleExportTablePDF },
        { icon: IdCard,   label: 'ID Card',   gradient: 'linear-gradient(135deg,#5B21B6,#8B5CF6)', glow: '#8B5CF6', onClick: handleExportAllIDCards },
        { icon: Printer,  label: 'Smart PDF', gradient: 'linear-gradient(135deg,#4F46E5,#818CF8)', glow: '#818CF8', onClick: () => { if (checkExportPermission()) setIsPdfModalOpen(true); } },
        { icon: Contact,  label: 'Contact',   gradient: 'linear-gradient(135deg,#0E7490,#22D3EE)', glow: '#22D3EE', onClick: handleExportContacts },
      ];
      const mainButtons = exportButtons.slice(0, 4);
      const extraButtons = exportButtons.slice(4);

      const renderBtn = ({ icon: Icon, label, gradient, glow, onClick }, i) => (
        <button
          key={label}
          onClick={onClick}
          className="ardm-export-btn ardm-export-pop flex flex-col items-center gap-2"
          style={{ transition: 'transform 0.15s ease', animationDelay: `${i * 0.05}s` }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: gradient, boxShadow: `0 6px 18px ${glow}45` }}>
            <Icon size={22} color="white" strokeWidth={2.2} />
          </div>
          <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide text-center">{label}</span>
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
            className="w-full mt-3 py-2 rounded-xl text-[11px] font-black text-slate-400 flex items-center justify-center gap-1 active:scale-95"
            style={{ background: 'rgba(6,13,31,0.04)', transition: 'transform 0.15s ease' }}
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
      {/* FILTERS */}
      <div className="mt-5">
        <div className="flex gap-2 overflow-x-auto ardm-no-scrollbar pb-0.5 px-4">
          {['All', ...Object.keys(CLASS_ORDER)].map(cls => {
            const active = classFilter === cls;
            return (
              <button
                key={cls}
                onClick={() => setClassFilter(cls)}
                className="shrink-0 px-4 py-1.5 rounded-full text-[11px] font-black"
                style={{
                  transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                  ...(active
                    ? { background: '#060D1F', color: '#D4A843', boxShadow: '0 4px 14px rgba(6,13,31,0.32)', border: '1px solid rgba(212,168,67,0.28)' }
                    : { background: 'rgba(6,13,31,0.07)', color: '#64748B', border: '1px solid transparent' }
                  ),
                }}
              >
                {cls === 'All' ? 'সকল' : cls}
              </button>
            );
          })}
        </div>

        <div className="px-4 flex gap-2 items-center mt-3">
          <div className="relative flex-1">
            <select
              value={`${sortConfig.field}_${sortConfig.order}`}
              onChange={e => { const [field, order] = e.target.value.split('_'); setSortConfig({ field, order }); }}
              className="w-full py-2.5 pl-3 pr-8 rounded-xl text-[11px] font-black text-slate-600 outline-none appearance-none"
              style={{ background: 'rgba(6,13,31,0.06)', border: '1px solid transparent' }}
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
            className="px-4 py-2.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shrink-0"
            style={{
              transition: 'all 0.2s ease',
              ...(advancedFilteredData !== null
                ? { background: '#060D1F', color: '#D4A843', boxShadow: '0 4px 14px rgba(6,13,31,0.28)' }
                : { background: 'rgba(6,13,31,0.07)', color: '#64748B' }
              ),
            }}
          >
            <Filter size={14} />
            {advancedFilteredData !== null ? `(${advancedFilteredData.length})` : 'Filter'}
          </button>
          
          <button
            onClick={handleCopyAllIds}
            className="px-3 py-2.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shrink-0"
            style={{
              background: 'rgba(6,13,31,0.07)',
              color: '#64748B',
              transition: 'all 0.2s ease',
            }}
          >
            <Copy size={14} />
          </button>
        </div>

        <div className="px-4 mt-3 mb-2 flex items-center gap-2">
          <span className="text-[11px] font-black text-slate-400">{filteredList.length} জন শিক্ষার্থী</span>
          <div className="h-px flex-1 bg-slate-200/60" />
          {advancedFilteredData !== null && (
            <button onClick={() => setAdvancedFilteredData(null)} className="text-[10px] font-black text-red-400 flex items-center gap-1">
              <X size={10} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="px-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} index={i} />)
        ) : filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ background: 'rgba(6,13,31,0.05)' }}>
              <Users size={32} className="text-slate-300" />
            </div>
            <h3 className="font-black text-slate-400 text-sm">কোনো তথ্য পাওয়া যায়নি</h3>
            <p className="text-slate-300 text-xs mt-1 font-semibold">ফিল্টার বা সার্চ পরিবর্তন করুন</p>
          </div>
        ) : (
          filteredList.map((s, i) => (
            <PremiumStudentCard
              key={s.ID || i}
              data={s}
              index={i}
              showBirthdayCount={sortConfig.field === 'dob'}
              onImageClick={(img) => setViewerImg(img)}
              onClick={(data) => {
                window.history.pushState({ page: 'detail' }, '');
                setScrollPos(window.scrollY);
                setDetailData(data);
              }}
            />
          ))
        )}
      </div>

    </div>
  </>
)}

      {/* --- SEARCH VIEW --- */}
      {tab === 'search' && !detailData && (
        <div className="pt-6 px-4 h-screen flex flex-col">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-4 text-gray-400" size={20}/>
            <input 
              autoFocus
              className="w-full bg-white pl-12 pr-4 py-4 rounded-2xl border-none shadow-sm outline-none focus:ring-2 focus:ring-slate-900 font-bold text-lg placeholder:font-medium placeholder:text-gray-300"
              placeholder="Search by Name, ID or Roll..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto pb-24 px-1">
  {filteredList.map((s, i) => (
    <PremiumStudentCard
              key={s.ID || i}
              data={s}
              index={i}
              showBirthdayCount={sortConfig.field === 'dob'}
              onImageClick={(img) => setViewerImg(img)}
              onClick={(data) => {
                window.history.pushState({ page: 'detail' }, '');
                setScrollPos(window.scrollY);
                setDetailData(data);
              }}
            />
  ))}
</div>

        </div>
      )}

      {/* --- ADD/EDIT FORM VIEW --- */}
            {tab === 'add' && (
      (currentUser.role === "Visitor" || (currentUser.role === "Class" && !CAN_CLASS_TEACHER_EDIT))
    ? null
    : (

        <div className="pt-20 px-5 pb-10">
         <Header
  title={isEdit ? "Update Info" : "New Admission"}
  onBack={() => document.getElementById("formBackBtn")?.click()}
  action={<div/>}
/>

          <FullForm 
  initialData={isEdit ? detailData : null} 
  currentUser={currentUser}
  onSave={handleSave} 
  onCancel={() => { 
    if (isEdit) {
      setIsEdit(false);     // 👉 Detail এ ফিরবে
    } else {
      setTab('home');       // 👉 Add mode হলে Home
    }
  }}
  showToast={showToast}
/>
        </div>
   )   )}

      {/* --- DETAIL VIEW --- */}
      {detailData && !isEdit && (
  <DetailView
    data={detailData}
    onImageClick={(img) => setViewerImg(img)}
    currentUser={currentUser}
    siblings={siblingsOfDetail}
    onSelectSibling={(sib) => {
      window.history.pushState({ page: 'detail' }, '');
      setScrollPos(window.scrollY);
      setDetailData(sib);   // 👈 sibling-এর data দিয়ে detailData রিপ্লেস, DetailView সাথে সাথে তার প্রোফাইল দেখাবে
    }}
    onBack={() => {
      setDetailData(null);
      setTab('home');
    }}
    onEdit={() => {
      window.history.pushState({ page: "edit" }, "");
      setIsEdit(true);
      setTab('add');
    }}
    onDelete={() => handleDelete(detailData.ID)}
  />
)}

      {/* --- BOTTOM NAV --- */}
      {!detailData && tab !== 'add' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 border-t border-gray-100 h-20 px-6 flex justify-between items-end pb-3 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
           <NavTab icon={Home} label="Home" active={tab === 'home'} onClick={() => setTab('home')} />
                    {(currentUser.role === "Admin" || (currentUser.role === "Class" && CAN_CLASS_TEACHER_EDIT)) && (
 <NavTab icon={UserPlus} label="Add" main 

  onClick={() => {
    window.history.pushState({ page: "add" }, "");
    setIsEdit(false);
    setTab('add');
  }}
/>

)}

           <NavTab icon={Search} label="Search" active={tab === 'search'} onClick={() => {
    window.history.pushState({ page: "search" }, "");
    setTab('search');
  }}  />
        </div>
      )}
      <ImageViewer src={viewerImg} onClose={() => setViewerImg(null)} />
      {/* ============ PROFESSIONAL TOAST NOTIFICATION ============ */}
      {toast.show && (
        <>
          {/* Custom CSS for Animation - এটি এনিমেশন নিশ্চিত করবে */}
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
              
              {/* Main Content */}
              <div className="flex items-center gap-4 p-4">
                {/* Icon Box */}
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                  toast.type === 'success' 
                    ? 'bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-green-200' 
                    : 'bg-gradient-to-br from-red-400 to-pink-600 text-white shadow-red-200'
                }`}>
                  {toast.type === 'success' ? <Check size={24} strokeWidth={3} /> : <AlertCircle size={24} strokeWidth={3} />}
                </div>

                {/* Text Content */}
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

                {/* Close Button */}
                <button 
                  onClick={() => setToast(prev => ({ ...prev, show: false }))}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Progress Bar Line */}
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
      {/* ============ END PROFESSIONAL TOAST ============ */}
      {/* ============ END PROFESSIONAL TOAST ============ */}

            {/* ============ ADVANCED FILTER MODAL ============ */}
      
            <AdvancedFilter
        isOpen={isFilterOpen}
        onClose={() => {
          // সরাসরি State চেঞ্জ না করে হিস্ট্রি ব্যাক করলেই অটোমেটিক handleBack ট্রিগার হয়ে মডাল ক্লোজ হবে
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

// ==============================================
// LOGIN PAGE COMPONENT (FIREBASE)
// ==============================================
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      // Successful login will trigger onAuthStateChanged in App
    } catch (err) {
      console.error(err);
      if(err.code === 'auth/user-not-found') setError("ইমেইল পাওয়া যায়নি");
      else if(err.code === 'auth/wrong-password') setError("ভুল পাসওয়ার্ড");
      else setError("লগিন ব্যর্থ হয়েছে");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm">
        <h2 className="text-2xl font-black text-center mb-2 text-slate-800">
          স্বাগতম
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">{CONFIG.APP_NAME}</p>

        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Email</label>
        <input 
          type="email"
          placeholder="Enter Your Email"
          className="w-full p-4 mb-4 bg-gray-50 border border-transparent focus:bg-white focus:border-slate-900 rounded-xl outline-none font-bold transition-all"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Password</label>
        <input 
          type="password"
          placeholder="******"
          className="w-full p-4 mb-4 bg-gray-50 border border-transparent focus:bg-white focus:border-slate-900 rounded-xl outline-none font-bold transition-all"
          value={pass}
          onChange={e => setPass(e.target.value)}
        />

        {error && (
          <div className="bg-red-50 text-red-500 text-sm font-bold p-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle size={16}/> {error}
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 flex justify-center"
        >
          {loading ? <Loader2 className="animate-spin"/> : "Login"}
        </button>
       <div className="mt-5 space-y-3 text-center">

  <div className="flex items-center gap-2">
    <div className="flex-1 h-px bg-gray-200"></div>
    <span className="text-xs text-gray-400 font-bold">Quick Access</span>
    <div className="flex-1 h-px bg-gray-200"></div>
  </div>

  <div className="flex gap-3">
    
    <button
      onClick={() => window.location.href="/result"}
      className="flex-1 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm transition active:scale-95"
    >
      Result দেখুন
    </button>

    <button
      onClick={() => window.location.href="/student"}
      className="flex-1 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm transition active:scale-95"
    >
      শিক্ষার্থীর তথ্য
    </button>

  </div>

</div>


      </div>
    </div>
  );
};

// ==============================================
// 5. COMPLEX COMPONENTS (VALIDATED & STACKED)
// ==============================================

const FullForm = ({ initialData, currentUser, onSave, onCancel, showToast }) => {
  const isUpdate = !!initialData;
  const defaultState = {
    sessionYear: (() => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = January, 9 = October
  return (currentMonth >= 9 ? currentYear + 1 : currentYear).toString();
})(),
    studentId: '',
    studentNameBn: '', studentNameEn: '',  gender: '', roll: '', classBn: '', brn: '', dob: '', bloodGroup: '',
    fatherNameBn: '', motherNameBn: '', whatsappNumber: '', emergencyNumber: '',
    fatherNameEn: '', motherNameEn: '',
    houseNameBn: '', villageBn: 'মীরেরখীল', unionBn: 'সরফভাটা', wardNo: '', upazilaBn: 'রাঙ্গুনিয়া', districtBn: 'চট্টগ্রাম',
    imageUrl: '',
     villageEn: 'Mirerkhil',
    unionEn: 'Sarfbhata',
  upazilaEn: 'Rangunia',
  districtEn: 'Chattogram',
  };

  const [form, setForm] = useState(defaultState);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [imgPreview, setImgPreview] = useState(null);
useEffect(() => {
  const saved = localStorage.getItem("draftStudentForm");
  if (!initialData && saved) {
    setForm(JSON.parse(saved));
  }
}, []);
useEffect(() => {
  if (!initialData) {
    localStorage.setItem("draftStudentForm", JSON.stringify(form));
  }
}, [form]);

  useEffect(() => {
    if (initialData) {
      const parseDate = (dStr) => {
  if (!dStr) return '';

  // যদি already YYYY-MM-DD হয়
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
    return dStr;
  }

  // অন্য সব কিছুর জন্য safe parse
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return '';

  // লোকাল ডেট বানিয়ে string
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`;
};
      
      setForm({
        sessionYear: initialData.Session || '',
        studentId: initialData.ID || '',
        studentNameBn: initialData.StudentNameBn || '',
        studentNameEn: initialData.StudentNameEn || '',
        gender: initialData.Gender || '',
        roll: initialData.Roll || '',
        classBn: initialData.ClassBn || '',
        brn: initialData.BRN || '',
        dob: parseDate(initialData.DOB),
        bloodGroup: initialData.BloodGroup || '',
        fatherNameBn: initialData.FatherNameBn || '',
        fatherNameEn: initialData.FatherNameEn || '',
        motherNameBn: initialData.MotherNameBn || '',
        motherNameEn: initialData.MotherNameEn || '',
        whatsappNumber: initialData.WhatsApp || '',
        emergencyNumber: initialData.EmergencyNo || '',
        houseNameBn: initialData.HouseNameBn || '',
        houseNameEn: initialData.HouseNameEn || '',
        villageBn: initialData.VillageBn || '',
       villageEn: initialData.VillageEn || '',
    
        unionBn: initialData.UnionBn || '',
        unionEn: initialData.UnionEn || '',
        wardNo: initialData.WardNo || '',
        upazilaBn: initialData.UpazilaBn || '',
        upazilaEn: initialData.UpazilaEn || '',
        districtBn: initialData.DistrictBn || '',
        districtEn: initialData.DistrictEn || '',
        imageUrl: initialData.ImageURL || ''
      });
      setImgPreview(initialData.ImageURL || null);
    } else {
      setForm(defaultState);
      setImgPreview(null);
    }
  }, [initialData]);
useEffect(() => {
  if (!initialData && currentUser?.role === "Class") {
    setForm(f => ({ ...f, classBn: currentUser.classBn }));
  }
}, [initialData, currentUser]);
  // SMART ID GENERATION
  useEffect(() => {
    if (!initialData && form.sessionYear && form.dob && form.classBn && form.roll) {
      try {
        const year = form.sessionYear;
        const dobYear = new Date(form.dob).getFullYear().toString().slice(-2);
        
        const classMap = {
          'প্লে': '99', 'নার্সারি': '00', 'কেজি': '98',
          '১ম': '01', '২য়': '02', '৩য়': '03', '৪র্থ': '04', '৫ম': '05',
          '৬ষ্ঠ': '06', '৭ম': '07', '৮ম': '08', '৯ম': '09', '১০ম': '10'
        };
        const classCode = classMap[form.classBn] || '00';
        const rollCode = form.roll.toString().padStart(2, '0');
        
        setForm(prev => ({...prev, studentId: `${year}${dobYear}${classCode}${rollCode}`}));
      } catch (e) {}
    }
  }, [form.sessionYear, form.dob, form.classBn, form.roll, initialData]);

 const update = (f, v) => {
  setForm(p => ({...p, [f]: v}));

  let err = "";
  if (f === "roll") {
  v = parseInt(v) || "";
}

if (f === "whatsappNumber" || f === "emergencyNumber") {
  v = v.replace(/[^0-9]/g, '');  // শুধু সংখ্যা রাখবে
}
  if (f === "roll") {
    v = parseInt(v) || "";
    if (v > 200) v = 200;
  }

if (f === "brn") {
  v = v.slice(0,17);
}

  // ===== NAME BN =====
  if (f === "studentNameBn") {
    if (!/^[\u0980-\u09FF\s.]{2,50}$/.test(v))
      err = "শুধু বাংলা (২-৫০ অক্ষর)";
  }

  // ===== NAME EN =====
  if (f === "studentNameEn") {
    if (!/^[A-Za-z .]{3,50}$/.test(v))
      err = "English 3-50 letters";
  }

  // ===== MOBILE =====
  if (f === "whatsappNumber" || f === "emergencyNumber") {
    if (!/^01[3-9]\d{8}$/.test(v))
      err = "Invalid mobile";
  }

  // ===== BRN =====
  if (f === "brn") {
    if (!/^\d{17}$/.test(v))
      err = "17 digit BRN";
  }

  // ===== ROLL =====
  if (f === "roll") {
    if (v < 1 || v > 200)
      err = "Roll 1-200";
  }

  setErrors(prev => ({ ...prev, [f]: err }));
};

  // --- STRICT VALIDATION LOGIC ---
const validate = () => {
  let e = {};

  // ========= STEP 1 =========
  if (step === 1) {

    // Bangla Name
    if (!form.studentNameBn)
      e.studentNameBn = "নাম আবশ্যক";
    else if (!/^[\u0980-\u09FF\s.]{3,50}$/.test(form.studentNameBn))
      e.studentNameBn = "শুধু বাংলা (৩-৫০ অক্ষর)";

    // English Name
    if (!form.studentNameEn)
      e.studentNameEn = "English name required";
    else if (!/^[A-Za-z .]{4,50}$/.test(form.studentNameEn))
      e.studentNameEn = "English only (4-50)";

    // Roll
    if (!form.roll)
      e.roll = "Roll required";
    else if (isNaN(form.roll) || form.roll < 1 || form.roll > 200)
      e.roll = "Roll must be 1-200";

    // Class
    if (!form.classBn)
      e.classBn = "Class required";

    // Gender
    if (!form.gender)
      e.gender = "Gender required";

    // BRN
    if (!form.brn)
      e.brn = "BRN required";
    else if (!/^\d{17}$/.test(form.brn))
      e.brn = "17 digit BRN";

    // DOB
    if (!form.dob)
      e.dob = "Date of birth required";
    else {
      const age = (new Date() - new Date(form.dob)) / (365*24*60*60*1000);
      if (age < 2 || age > 20)
        e.dob = "Age must be 2-20";
    }
  }

  // ========= STEP 2 =========
  if (step === 2) {

    // Father BN
    if (!form.fatherNameBn)
      e.fatherNameBn = "পিতার নাম আবশ্যক";
    else if (!/^[\u0980-\u09FF\s.]{2,60}$/.test(form.fatherNameBn))
      e.fatherNameBn = "বাংলায় লিখুন (২-৬০ অক্ষর)";

    // Mother BN
    if (!form.motherNameBn)
      e.motherNameBn = "মাতার নাম আবশ্যক ";
    else if (!/^[\u0980-\u09FF\s.]{2,60}$/.test(form.motherNameBn))
      e.motherNameBn = "বাংলায় লিখুন (২-৬০ অক্ষর)";

    // Father EN
    if (!form.fatherNameEn)
      e.fatherNameEn = "Father name required";
    else if (!/^[A-Za-z .]{3,60}$/.test(form.fatherNameEn))
      e.fatherNameEn = "English only (3-60)";

    // Mother EN
    if (!form.motherNameEn)
      e.motherNameEn = "Mother name required";
    else if (!/^[A-Za-z .]{3,60}$/.test(form.motherNameEn))
      e.motherNameEn = "English only (3-60)";

    // Mobile
    if (!form.whatsappNumber)
      e.whatsappNumber = "Mobile number required";
    else if (!/^01[3-9]\d{8}$/.test(form.whatsappNumber))
      e.whatsappNumber = "Invalid mobile number";

    // Emergency
    if (!form.emergencyNumber)
      e.emergencyNumber = "Emergency number required";
    else if (!/^01[3-9]\d{8}$/.test(form.emergencyNumber))
      e.emergencyNumber = "Invalid number (01XXXXXXXXX)";
  }

  // ========= STEP 3 =========
  if (step === 3) {

    // House BN
    if (!form.houseNameBn)
      e.houseNameBn = "বাড়ির নাম আবশ্যক";
    else if (!/^[\u0980-\u09FF\s.]{2,80}$/.test(form.houseNameBn))
      e.houseNameBn = "বাংলায় লিখুন (২-৮০ অক্ষর)";

    // Village BN
    if (!form.villageBn)
      e.villageBn = "গ্রাম আবশ্যক";
    else if (!/^[\u0980-\u09FF\s.]{2,80}$/.test(form.villageBn))
      e.villageBn = "বাংলায় লিখুন (২-৮০ অক্ষর)";

    // Union BN
    if (!form.unionBn)
      e.unionBn = "ইউনিয়নের নাম আবশ্যক";

    // Ward
    if (!form.wardNo)
      e.wardNo = "Ward Number required";
    else if (isNaN(form.wardNo))
      e.wardNo = "Number only for ward";

    // English Address
    if (!form.houseNameEn || !/^[A-Za-z .]{2,80}$/.test(form.houseNameEn))
      e.houseNameEn = "House Name English required ";

    if (!form.villageEn || !/^[A-Za-z .]{2,80}$/.test(form.villageEn))
      e.villageEn = " Village Name English required";

    if (!form.unionEn || !/^[A-Za-z .]{2,80}$/.test(form.unionEn))
      e.unionEn = "Union Name English required";

    if (!form.upazilaEn || !/^[A-Za-z .]{2,80}$/.test(form.upazilaEn))
      e.upazilaEn = " Upazila Name English required";

    if (!form.districtEn || !/^[A-Za-z .]{2,80}$/.test(form.districtEn))
      e.districtEn = "District Name English required";
  }

  // ========= STEP 4 =========
  // if (step === 4) {
  //   if (!form.imageUrl)
  //     e.imageUrl = "Student photo required";
  // }
if (Object.keys(e).length > 0) {
  const first = Object.keys(e)[0];
  document.querySelector(`[name="${first}"]`)?.focus();
}
  setErrors(e);
  return Object.keys(e).length === 0;
};

  const handleNext = () => { if (validate()) setStep(s => s + 1); };
  const handleSubmit = () => { if (validate()) onSave(form); };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if(file){
       const reader = new FileReader();
       reader.onload = (ev) => {
          const img = new Image();
          img.src = ev.target.result;
          img.onload = () => {
             if (Math.abs(img.width - img.height) > 20) { 
                showToast("দুঃখিত! ছবিটি অবশ্যই স্কয়ার হতে হবে", "error");
                e.target.value = ""; return;
             }
             const cvs = document.createElement('canvas');
             const ctx = cvs.getContext('2d');
             cvs.width = 500; cvs.height = 500;
             ctx.drawImage(img, 0, 0, 500, 500);
             const url = cvs.toDataURL('image/jpeg', 0.85);
             setImgPreview(url);
             update('imageUrl', url);
          }
       }
       reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 min-h-[70vh] flex flex-col">
      <div className="flex justify-between mb-8 px-2">
         {[1,2,3,4].map(s => <div key={s} className={`h-2 rounded-full transition-all duration-300 ${step >= s ? 'w-full bg-slate-900 mx-1' : 'w-full bg-gray-100 mx-1'}`}/>)}
      </div>

      <div className="flex-1">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Step 1: Basic Info</h3>
             <Input label="Session" type="number" val={form.sessionYear} set={v=>update('sessionYear', v)} />
             
             {/* STACKED INPUTS (One per line) */}
             <Input label="নাম (বাংলা)" val={form.studentNameBn} set={v=>update('studentNameBn', v)} error={errors.studentNameBn} />
             <Input label="Name (English)" val={form.studentNameEn} set={v=>update('studentNameEn', v)} error={errors.studentNameEn} />
             
             <Input label="Roll" type="number" val={form.roll} set={v=>update('roll', v)} error={errors.roll} />
             
                          <div className="relative pt-1 w-full">
               <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block">Class</label>
               <select 
                  disabled={currentUser?.role === "Class"} 
                  className={`w-full p-4 bg-gray-50 rounded-xl font-bold outline-none border ${errors.classBn ? 'border-red-500' : 'border-transparent'} ${currentUser?.role === "Class" ? 'opacity-60 cursor-not-allowed bg-gray-200 text-gray-500' : ''}`} 
                  value={form.classBn} 
                  onChange={e=>update('classBn', e.target.value)}
               >
                  <option value="">Select...</option>
                  {['প্লে', 'নার্সারি', 'কেজি', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম'].map(c=><option key={c} value={c}>{c}</option>)}
               </select>
               {errors.classBn && (
  <p className="text-red-500 text-xs font-bold mt-1">
    {errors.classBn}
  </p>
)}
             </div>

             <div className="relative pt-1 w-full">
  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block">
    Gender
  </label>
  <select
    className={`w-full p-4 bg-gray-50 rounded-xl font-bold outline-none border 
      ${errors.gender ? 'border-red-500' : 'border-transparent'}`}
    value={form.gender}
    onChange={e => update('gender', e.target.value)}
  >
    <option value="">Select...</option>
    <option value="Male">Male</option>
    <option value="Female">Female</option>
  </select>
  {errors.gender && (
  <p className="text-red-500 text-xs font-bold mt-1">
    {errors.gender}
  </p>
)}
</div>
             <Input label="BIRTH REGISTRATION NUMBER" min="17" max="17" type="number" val={form.brn} set={v=>update('brn', v)} error={errors.brn} />
             <Input label="DATE OF BIRTH" type="date" val={form.dob} set={v=>update('dob', v)} error={errors.dob} />
             
             <div className="relative pt-1 w-full">
                 <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Blood Group</label>
      <select
  className={`w-full p-4 bg-gray-50 rounded-xl font-bold outline-none border ${
    errors.bloodGroup ? 'border-red-500' : 'border-transparent'
  }`}
  value={form.bloodGroup}
  onChange={e=>update('bloodGroup', e.target.value)}
>

                    <option value="">N/A</option>
                    {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map(c=><option key={c} value={c}>{c}</option>)}
                 </select>
                 {errors.bloodGroup && (
  <p className="text-red-500 text-xs font-bold mt-1">
    {errors.bloodGroup}
  </p>
)}

             </div>

             <div className="mt-2 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Input disabled  label="Student ID (Auto)" type="number" val={form.studentId} set={v=>update('studentId', v)} error={errors.studentId} />
             </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Step 2: Parents Info</h3>
             <Input label="পিতার নাম (বাংলা)" val={form.fatherNameBn} set={v=>update('fatherNameBn', v)} error={errors.fatherNameBn} />
             
             <Input label="Father Name (English)" 
               val={form.fatherNameEn} 
               set={v=>update('fatherNameEn', v)}
               error={errors.fatherNameEn} />

             <Input label="মাতার নাম (বাংলা)" val={form.motherNameBn} set={v=>update('motherNameBn', v)} error={errors.motherNameBn} />

             <Input label="Mother Name (English)" 
               val={form.motherNameEn} 
               set={v=>update('motherNameEn', v)}
               error={errors.motherNameEn} />

             <Input label="Mobile (WhatsApp)" type="tel" val={form.whatsappNumber} set={v=>update('whatsappNumber', v)} error={errors.whatsappNumber} />
         <Input 
  label="Emergency No" 
  type="tel" 
  val={form.emergencyNumber} 
  set={v=>update('emergencyNumber', v)} 
  error={errors.emergencyNumber}
/>

          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Step 3: Address (Bangla Only)</h3>
                 <Input
  label="বাড়ির নাম (বাংলা)"
  val={form.houseNameBn}
  set={v=>update('houseNameBn', v)}
  error={errors.houseNameBn}
/>
             <Input label="গ্রাম (বাংলা)" val={form.villageBn} set={v=>update('villageBn', v)} error={errors.villageBn} />
             <Input label="ইউনিয়ন (বাংলা)" val={form.unionBn} set={v=>update('unionBn', v)} error={errors.unionBn} />

             <Input label="Ward No" type="number" val={form.wardNo} set={v=>update('wardNo', v)} error={errors.wardNo} />
            <Input label="উপজেলা (বাংলা)" val={form.upazilaBn} set={v=>update('upazilaBn', v)} error={errors.upazilaBn} />

             <Input label="জেলা (বাংলা)" val={form.districtBn} set={v=>update('districtBn', v)} error={errors.districtBn} />

            <>
  <Input label="House Name (English)" 
  val={form.houseNameEn} 
  set={v=>update('houseNameEn', v)} 
  error={errors.houseNameEn}
/>

<Input label="Village (English)" 
  val={form.villageEn} 
  set={v=>update('villageEn', v)} 
  error={errors.villageEn}
/>

<Input label="Union (English)" 
  val={form.unionEn} 
  set={v=>update('unionEn', v)} 
  error={errors.unionEn}
/>

<Input label="Upazila (English)" 
  val={form.upazilaEn} 
  set={v=>update('upazilaEn', v)} 
  error={errors.upazilaEn}
/>

<Input label="District (English)" 
  val={form.districtEn} 
  set={v=>update('districtEn', v)} 
  error={errors.districtEn}
/>

</>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 py-6">
             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">Step 4: Student Photo</h3>
             <div className={`relative w-56 h-56 bg-gray-100 rounded-full flex items-center justify-center border-[6px] shadow-2xl ring-1 overflow-hidden ${errors.imageUrl ? 'border-red-500 ring-red-200' : 'border-white ring-gray-100'}`}>
                {imgPreview ? <img src={imgPreview} className="w-full h-full object-cover"/> : <Camera size={48} className="text-gray-300"/>}
                <input type="file" onChange={handleImage} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*"/>
             </div>
             {errors.imageUrl && <p className="text-red-500 text-xs font-bold mt-2">ছবি আবশ্যক</p>}
             <p className="mt-8 text-sm text-gray-500 font-medium bg-gray-50 px-4 py-2 rounded-full text-center">Tap photo to upload <br/><span className="text-xs text-gray-400">(Square Only)</span></p>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
         {step > 1 ? <button id="formBackBtn" onClick={()=>setStep(s=>s-1)} className="font-bold text-gray-400 px-6 py-3 bg-gray-50 rounded-xl">
  Back
</button> : <button id="formBackBtn" onClick={onCancel} className="font-bold text-red-400 px-4 py-3">
  Cancel
</button>
}
         {step < 4 ? (
            <button onClick={handleNext} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2">Next <ArrowRight size={18}/></button>
         ) : (
            <button   onClick={handleSubmit} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xl shadow-blue-200">Submit <Check size={18}/></button>
         )}
      </div>
    </div>
  );
};

const Input = ({ label, val, set, type="text", error }) => (
  <div className="relative pt-1 w-full">
    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-0.5 block flex justify-between">
      {label}
      {error && <span className="text-red-500 lowercase italic">{error}</span>}
    </label>
    <input 
      type={type} 
      className={`w-full p-4 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-slate-900 font-bold text-slate-800 transition-all border placeholder-gray-300 ${error ? 'border-red-500 ring-1 ring-red-200' : 'border-transparent'}`}
      placeholder="..."
      value={val}
      onChange={e => set(e.target.value)}
    />
  </div>
);
// ================================================================
// PREMIUM DETAIL VIEW — Replace করুন পুরো DetailView component টি
// ================================================================
// Index.jsx এ শুধু এই পুরো const DetailView = ... function টি
// পুরনোটার জায়গায় paste করুন।
// onImageClick prop টিও pass করতে ভুলবেন না (আগেই করা আছে)।
// ================================================================
// ================================================================
// PREMIUM DETAIL VIEW — Replace করুন পুরো DetailView component টি
// ================================================================
// Index.jsx এ শুধু এই পুরো const DetailView = ... function টি
// পুরনোটার জায়গায় paste করুন।
// onImageClick prop টিও pass করতে ভুলবেন না (আগেই করা আছে)।
// ================================================================

// পুরনো:
// const DetailView = ({ data, currentUser, onBack, onEdit, onDelete, onImageClick }) => {

// নতুন:
const DetailView = ({ data, currentUser, onBack, onEdit, onDelete, onImageClick, siblings = [], onSelectSibling }) => {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
  }, []);
  // 👇 নতুন: ভাইবোনের প্রোফাইলে ক্লিক করে চলে গেলে স্ক্রল টপে রিসেট হবে
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [data.ID]);
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return dateStr; }
  };

  const { color: classColor, bg: classBg } = CLASS_PALETTE[data.ClassBn] || { color: '#3B5BDB', bg: '#EEF2FF' };
  const isActive = data.Status === 'Active';

  // ── PRINT / ACTION HANDLERS (unchanged from original) ──
 
  // ── ANIMATION DELAY HELPER ──
  const delay = (i) => `${i * 0.07}s`;
const handlePrintIDCard = () => {
  // QR Code Data preparation
  const qrData = `${window.location.origin}/${data.ID}`;
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

  const w = window.open('', '_blank');
  w.document.write(`
    <html>
      <head>
        <title>ID Card: ${data.ID}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
          
          @media print {
          @page {
  size: A4 ;
  margin: 5mm;
}

            body { 
              background: white; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
            }
            .print-container {
                margin: 20px;
            }
          }

          body {
            font-family: 'Noto Sans Bengali', sans-serif;
            background: white;
            margin: 0;
            display: flex;
            justify-content: left;
            padding-left: 20px;
            padding-top: 20px;
          }

          .print-container {
            display: flex;
            gap: 20px;
            align-items: flex-start;
          }

          .id-card-box {
            width: 2.125in;
            height: 3.375in;
            position: relative;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
           
            border: 1px solid #ddd;
            box-sizing: border-box;
          }

          /* --- FRONT DESIGN (ORIGINAL) --- */
          .front-header {
            background: linear-gradient(to bottom, #0f172a 0%, #1e293b 100%);
            height: 65px;
            color: white;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            position: relative;
            z-index: 1;
          }
          
          .curve {
             position: absolute;
             bottom: -30px;
             left: 0;
             width: 100%;
             height: 30px;
             background: #1e293b;
             border-radius: 0 0 50% 50%;
             z-index: -1;
          }

          .front-header h2 {
            font-size: 12px;
            margin: 0;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-family: 'Oswald', sans-serif;
            padding: 0 5px;
          }
          
          .front-header p {
             font-size: 9px;
             margin: 2px 0 0;
             opacity: 0.8;
          }

       
  .photo-box {
        width: 100px;
        height: 100px;
  margin: -10px auto 0;
  position: relative;
  z-index: 2;
  background: white;
  padding: 1px;
  border-radius: 6px;
  box-shadow: 0 3px 8px rgba(0,0,0,0.15);
}

.photo-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
  display: block;
}


          .student-info {
            text-align: center;
            margin-top: 7px;
            margin-bottom: 7px;
          }
          
          .s-name-en { font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; line-height: 1.2; }
          .s-name-bn { font-size: 11px; font-weight: 600; color: #334155; }
          
          .id-pill {
             background: #0f172a;
             color: white;
             font-size: 9px;
             padding: 1px 8px;
             border-radius: 10px;
             display: inline-block;
             margin: 2px 0 2px;
             font-weight: bold;
          }

          .info-table {
            width: 92%;
            margin: 0 auto;
            border-collapse: collapse;
          }
          
          .info-table td {
             font-size: 10.5px;
             padding: 1.5px 5px;
             color: #0f172a;
             vertical-align: middle;
          }
          
          .info-table .lbl {
             font-weight: 700;
             color: #64748b;
             width: 40px;
             text-align: left;
          }
          
          .info-table .val {
             font-weight: 600;
             text-align: left;
          }
          
          .info-table .row-border {
             border-bottom: 1px dotted #cbd5e1;
          }

          .signature-area {
            position: absolute;
            bottom: 8px;
            right: 15px;
            text-align: center;
          }
          .sig-line {
             width: 60px;
             border-top: 1px solid #0f172a;
             margin-bottom: 2px;
          }
          .sig-text {
             font-size: 6px;
             font-weight: 700;
             color: #0f172a;
          }

          /* --- BACK DESIGN (PROFESSIONAL) --- */
          .back-container {
             height: 100%;
             display: flex;
             flex-direction: column;
             background: #fff;
             position: relative;
          }

          .back-top-strip {
             height: 30px;
             background: #0f172a;
             width: 100%;
          }

          .back-content {
             flex: 1;
             padding: 10px 18px;
             display: flex;
             flex-direction: column;
             align-items: center;
             position: relative;
             z-index: 1;
          }

          /* Watermark Effect */
          .watermark-logo {
             position: absolute;
             top: 50%;
             left: 50%;
             transform: translate(-50%, -50%);
             font-size: 60px;
             opacity: 0.05;
             color: #000;
             z-index: 0;
             font-weight: bold;
             pointer-events: none;
             white-space: nowrap;
          }

          .guardian-card {
             width: 100%;
             border: 1px solid #e2e8f0;
             background: #f8fafc;
             border-radius: 6px;
             padding: 6px;
             margin-bottom: 8px;
             text-align: left;
             box-sizing: border-box;
          }

          .section-title {
             font-size: 8px;
             font-weight: 700;
             text-transform: uppercase;
             color: #64748b;
             margin-bottom: 3px;
             border-bottom: 1px solid #cbd5e1;
             padding-bottom: 2px;
             display: block;
          }

          .address-text {
             font-size: 9px;
             color: #334155;
             line-height: 1.3;
             font-weight: 500;
          }

          .qr-wrapper {
             display: flex;
             align-items: center;
             gap: 8px;
             margin: 5px 0 8px;
             width: 100%;
             background: #fff;
             padding: 4px;
             border: 1px dashed #cbd5e1;
             border-radius: 6px;
             box-sizing: border-box;
          }

          .qr-img {
             width: 55px;
             height: 55px;
             display: block;
          }

          .validity-info {
             flex: 1;
             text-align: left;
          }

          .valid-label { font-size: 7px; color: #64748b; text-transform: uppercase; font-weight: 700; }
          .valid-year { 
             font-size: 14px; 
             font-weight: 800; 
             color: #0f172a; 
             font-family: 'Oswald', sans-serif;
             display: block;
             margin-top: -2px;
          }
          .scan-hint { font-size: 6px; color: #94a3b8; margin-top: 2px; }

          .rules-list {
             width: 100%;
             text-align: left;
             margin-bottom: auto;
          }
          .rules-list ul {
             margin: 0;
             padding-left: 12px;
          }
          .rules-list li {
             font-size: 7px;
             color: #475569;
             margin-bottom: 2px;
             line-height: 1.2;
          }

          .emergency-footer {
             width: 100%;
             margin-top: 5px;
             background: #fee2e2;
             border: 1px solid #fecaca;
             border-radius: 4px;
             padding: 4px;
             text-align: center;
             box-sizing: border-box;
          }
          
          .emergency-label { font-size: 7px; color: #dc2626; font-weight: 700; text-transform: uppercase; }
          .emergency-num { font-size: 10px; font-weight: 800; color: #b91c1c; }

          .return-strip {
             background: #0f172a;
             color: white;
             font-size: 7px;
             text-align: center;
             padding: 4px 0;
             width: 100%;
             margin-top: 5px;
          }

        </style>
      </head>
      <body>
        <div class="print-container">
          
          <!-- FRONT SIDE (ORIGINAL) -->
          <div class="id-card-box">
             <div class="front-header">
                <h2>${CONFIG.APP_NAME}</h2>
                <p>Sarafbhata, Rangunia, Chattogram</p>
                <div class="curve"></div>
             </div>
             
             <div class="photo-box">
                <img src="${data.ImageURL || 'https://via.placeholder.com/150'}" />
             </div>

             <div class="student-info">
                <div class="s-name-en">${data.StudentNameEn}</div>
                <div class="s-name-bn">${data.StudentNameBn}</div>
                <div class="id-pill">ID: ${data.ID}</div>
             </div>

             <table class="info-table">
                <tr class="row-border">
                   <td class="lbl">Class</td>
                   <td class="val">: ${data.ClassEn }  |  Roll: ${data.Roll}</td>
                </tr>
                <tr class="row-border">
                   <td class="lbl">Father</td>
                   <td class="val">: ${data.FatherNameBn}</td>
                </tr>
                <tr class="row-border">
                   <td class="lbl">Mother</td>
                   <td class="val">: ${data.MotherNameBn}</td>
                </tr>
                <tr class="row-border">
                   <td class="lbl">DOB</td>
                   <td class="val">: <span style="font-weight:800;">${formatDate(data.DOB)}</span></td>
                </tr>  
                
                <tr>
                   <td class="lbl">Mobile</td>
                   <td class="val">: ${data.WhatsApp}</td>
                </tr>
             </table>

             <div class="signature-area">
<img src="${signImg}" style="width:60px; display:block; margin-bottom:-23px;" />







                <div class="sig-line"></div>
                <div class="sig-text">Superintendent</div>
             </div>
          </div>

          <!-- BACK SIDE (PROFESSIONAL) -->
          <div class="id-card-box">
             <div class="back-container">
            
             
             
            <div class="front-header" style="height: 50px;">
                <h2>${CONFIG.APP_NAME}</h2>
               
                
             </div>
                
                
                
                <div class="back-content">
                   <div class="watermark-logo">
  ${CONFIG.APP_NAME
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')}
</div>


                   <div class="guardian-card">
                      <span class="section-title">Permanent Address</span>
                    <div class="address-text">
  ${
    [
      data.HouseNameBn,
      data.VillageBn,
      data.UnionBn,
      data.UpazilaBn,
      data.DistrictBn
    ]
    .filter(Boolean)
    .join(', ')
  }।
</div>
<span class="section-title">Blood Group : <span style="color:#ef4444; font-weight:800;">${data.BloodGroup || 'N/A'}</span> </span>
      

                   </div>

                   <div class="qr-wrapper">
                      <img src="${qrImage}" class="qr-img" />
                      <div class="validity-info">
                         <div class="valid-label">Academic Session</div>
                         <div class="valid-year">${data.Session} - ${parseInt(data.Session)+1}</div>
                         <div class="scan-hint">Scan to verify student profile</div>
                      </div>
                   </div>

                   <div class="rules-list">
                      <span class="section-title">Instructions</span>
                      <ul>
                         <li>This card is non-transferable.</li>
                         <li>Must be worn during institution hours.</li>
                         <li>Report lost card immediately to office.</li>
                         <li>Phone : 01865415088 | 01837713062</li>
                         <li>Email : raisulislamsaied@gmail.com</li>
                      
                      </ul>
                   </div>

                   <div class="emergency-footer">
                      <div class="emergency-label">this id card is valid until
</div>
                      <div class="emergency-num" style="text-transform: uppercase;">31 January 2027</div>
                   </div>

                </div>
                
                <div class="return-strip">
                   If found, please return to the madrasah office.
                </div>
             </div>
          </div>

        </div>
      </body>
    </html>
  `);
  w.document.close();
};
const handlePrintProfile = () => {
  const w = window.open('', '_blank');
  const origin = window.location.origin;
  const logoUrl = `${origin}/logo.png`;
  const verifyUrl = `${origin}/${data.ID}`;
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&color=1A2332&data=${encodeURIComponent(verifyUrl)}`;
  const issuedOn = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const row = (label, value, mono) => `
    <div class="row">
      <span class="row-label">${label}</span>
      <span class="row-dots"></span>
      <span class="row-value${mono ? ' mono' : ''}">${value || 'N/A'}</span>
    </div>`;

  const section = (title, titleBn, rowsHtml) => `
    <div class="section">
      <div class="section-head">
        <span class="section-title">${title}</span>
        <span class="section-title-bn">${titleBn}</span>
      </div>
      <div class="section-body">${rowsHtml}</div>
    </div>`;

  const academic = section('Academic Information', 'একাডেমিক তথ্য', [
    row('Student ID', data.ID, true),
    row('Class', `${data.ClassEn || ''}  (${data.ClassBn || ''})`),
    row('Roll Number', data.Roll),
    row('Session', data.Session),
    row('Status', data.Status === 'Active' ? 'Active' : 'Inactive'),
  ].join(''));

  const personal = section('Personal Information', 'ব্যক্তিগত তথ্য', [
    row('Date of Birth', formatDate(data.DOB)),
    row('Gender', data.Gender),
    row('Blood Group', data.BloodGroup),
    row('Birth Reg. No.', data.BRN, true),
  ].join(''));

  const guardian = section('Guardian Information', 'অভিভাবকের তথ্য', [
    row('Father\u2019s Name (En)', data.FatherNameEn),
    row('পিতার নাম', data.FatherNameBn),
    row('Mother\u2019s Name (En)', data.MotherNameEn),
    row('মাতার নাম', data.MotherNameBn),
  ].join(''));

  const contact = section('Contact Information', 'যোগাযোগ', [
    row('Mobile / WhatsApp', data.WhatsApp, true),
    row('Emergency Number', data.EmergencyNo, true),
  ].join(''));

  const addressBn = [
    row('বাড়ির নাম', data.HouseNameBn),
    row('গ্রাম', data.VillageBn),
    row('ইউনিয়ন', data.UnionBn),
    row('উপজেলা', data.UpazilaBn),
    row('জেলা', data.DistrictBn),
    row('ওয়ার্ড নং', data.WardNo),
  ].join('');

  const addressEn = [
    row('House Name', data.HouseNameEn),
    row('Village', data.VillageEn),
    row('Union', data.UnionEn),
    row('Upazila', data.UpazilaEn),
    row('District', data.DistrictEn),
    row('Ward No.', data.WardNo),
  ].join('');

  // ── SIBLINGS ──
  const ageOf = (dobStr) => {
    if (!dobStr) return '\u2014';
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return '\u2014';
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return `${age}`;
  };

  const hasSiblings = siblings && siblings.length > 0;

  // Each sibling becomes ONE compact row (same visual language as the
  // other sections) instead of a bordered table — this is what keeps
  // the whole thing on a single page.
  const siblingRows = (siblings || []).map((sib, i) =>
    row(
      `${i + 1}. ${sib.StudentNameEn || ''} (${sib.StudentNameBn || ''})`,
      `Class ${sib.ClassEn || sib.ClassBn || ''} \u2022 Roll ${sib.Roll || ''} \u2022 Age ${ageOf(sib.DOB)} \u2022 ID ${sib.ID || ''}`
    )
  ).join('');

  const siblingsBlock = hasSiblings ? `
    <div class="address">
      <div class="address-head"><span class="section-title">Siblings at ${CONFIG.APP_NAME}</span><span class="section-title-bn">ভাই-বোন</span></div>
      <div class="sib-list">${siblingRows}</div>
    </div>` : '';

  const declarationBlock = !hasSiblings ? `
    <div class="declaration">
      This is an official, computer-generated academic record issued by the administration of ${CONFIG.APP_NAME}.
      It certifies that the information above reflects the student's details as recorded in the institution's official register.
    </div>` : '';

  w.document.write(`
<html>
<head>
<title>Student Record - ${data.ID}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=Noto+Serif+Bengali:wght@500;600;700&family=Noto+Sans+Bengali:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');

  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Inter', 'Noto Sans Bengali', sans-serif; color: #1A2332; }

  .page {
    border: 1.5pt solid #C9B98A;
    padding: 10mm;
    padding-bottom : 5mm !important;
    min-height: calc(297mm - 20mm - 3pt);
    display: flex;
    flex-direction: column;
  }

  /* ── letterhead ── */
  .letterhead { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 1.4pt solid #1A2332; }
  .letterhead img { width: 58px; height: 58px; object-fit: contain; }
  .letterhead-text { flex: 1; text-align: center; }
  .inst-name {
    margin: 0; font-family: 'Playfair Display', serif; font-weight: 900;
    font-size: 23px; letter-spacing: 1.8px; text-transform: uppercase;
  }
  .inst-name-bn { margin: 4px 0 0; font-family: 'Noto Serif Bengali', serif; font-weight: 600; font-size: 20px; color: #4A5262; }

  .ref-strip { display: flex; justify-content: space-between; padding: 11px 0; margin-bottom: 4px; border-bottom: 0.5pt solid #D8DCE3; font-size: 10px; color: #5B6472; letter-spacing: 0.3px; }
  .ref-strip b { color: #1A2332; font-family: 'Inter', monospace; font-weight: 600; }

  /* ── identity block ── */
  .identity { display: flex; gap: 22px; align-items: flex-start; padding: 24px 0 22px; border-bottom: 0.5pt solid #D8DCE3; }
  .photo { width: 104px; height: 124px; object-fit: cover; border: 0.9pt solid #1A2332; flex-shrink: 0; }
  .id-main { flex: 1; padding-top: 4px; }
  .id-main .name-en { margin: 0; font-family: 'Playfair Display', serif; font-weight: 700; font-size: 25px; }
  .id-main .name-bn { margin: 3px 0 14px; font-family: 'Noto Serif Bengali', serif; font-weight: 600; font-size: 16px; color: #4A5262; }
  .fact-line { display: flex; flex-wrap: wrap; gap: 0; font-size: 11px; }
  .fact-line span { padding-right: 16px; margin-right: 16px; border-right: 0.5pt solid #D8DCE3; color: #4A5262; }
  .fact-line span:last-child { border-right: none; }
  .fact-line b { color: #1A2332; font-weight: 700; }

  .seal { width: 104px; text-align: center; flex-shrink: 0; }
  .seal-ring img { width: 100%; height: 100%; }

  /* ── sections ── */
  .sections { display: grid; grid-template-columns: 1fr 1fr; column-gap: 34px; }
  .section { padding: 18px 0 6px; }
  .section-head { display: flex; align-items: baseline; gap: 9px; margin-bottom: 8px; }
  .section-title { font-size: 10.5px; font-weight: 700; letter-spacing: 1.3px; text-transform: uppercase; color: #1A2332; white-space: nowrap; }
  .section-title-bn { font-family: 'Noto Sans Bengali', sans-serif; font-size: 9.5px; color: #9C7A3C; font-weight: 600; }
  .section-head::after { content: ''; flex: 1; height: 0.5pt; background: #D8DCE3; align-self: center; }

  .row { display: flex; align-items: baseline; padding: 6px 0; }
  .row-label { font-size: 10px; color: #5B6472; white-space: nowrap; }
  .row-dots { flex: 1; border-bottom: 0.5pt dotted #C7CCD5; margin: 0 7px 3px; }
  .row-value { font-size: 11px; font-weight: 600; color: #1A2332; text-align: right; max-width: 58%; }
  .row-value.mono { font-family: 'Inter', monospace; letter-spacing: 0.3px; }

  /* ── address / siblings (shares the same block style) ── */
  .address { margin-top: 6px; padding-top: 16px; border-top: 0.5pt solid #D8DCE3; }
  .address-head { display: flex; align-items: baseline; gap: 9px; margin-bottom: 6px; }
  .address-head::after { content: ''; flex: 1; height: 0.5pt; background: #D8DCE3; align-self: center; }
  .address-cols { display: grid; grid-template-columns: 1fr 1fr; column-gap: 34px; }
  .sib-list .row-label { white-space: normal; }
  .sib-list .row-value { max-width: 62%; }

  /* ── declaration ── */
  .declaration {
    margin-top: 12px; padding: 14px 26px; border-top: 0.5pt solid #D8DCE3; border-bottom: 0.5pt solid #D8DCE3;
    text-align: center; font-size: 9.5px; font-style: italic; color: #5B6472; line-height: 1.6;
  }

  .footer { margin-top: auto; }
  .meta-strip {
    margin-top: 0px; padding-top: 0px; 
    display: flex; justify-content: space-between; font-size: 8px; color: #9AA1AC; letter-spacing: 0.3px; font-weight: 500;
  }
</style>
</head>
<body>
  <div class="page">

    <div class="letterhead">
      <img src="${logoUrl}" onerror="this.style.visibility='hidden'"/>
      <div class="letterhead-text">
        <h1 class="inst-name">${CONFIG.APP_NAME}</h1>
        <p class="inst-name-bn">আবদুর রাজ্জাক দাখিল মাদরাসা</p>
      </div>
    </div>

    <div class="ref-strip">
      <span>Document Ref: <b>SR-${data.ID}</b></span>
      <span>Session: <b>${data.Session || ''}</b></span>
      <span>Issued: <b>${issuedOn}</b></span>
    </div>

    <div class="identity">
      <img class="photo" src="${data.ImageURL || DEFAULT_IMAGE}"/>
      <div class="id-main">
        <h2 class="name-en">${data.StudentNameEn || ''}</h2>
        <p class="name-bn">${data.StudentNameBn || ''}</p>
        <div class="fact-line">
          <span>Class <b>${data.ClassEn || ''}</b></span>
          <span>Roll <b>${data.Roll || ''}</b></span>
          <span>Gender <b>${data.Gender || ''}</b></span>
          <span>Status <b>${data.Status === 'Active' ? 'Active' : 'Inactive'}</b></span>
        </div>
      </div>
      <div class="seal">
        <div class="seal-ring"><img src="${qrImage}"/></div>
      </div>
    </div>

    <div class="sections">
      ${academic}
      ${personal}
      ${guardian}
      ${contact}
    </div>

    <div class="address">
      <div class="address-head"><span class="section-title">Permanent Address</span><span class="section-title-bn">ঠিকানা</span></div>
      <div class="address-cols">
        <div>${addressBn}</div>
        <div>${addressEn}</div>
      </div>
    </div>

    ${siblingsBlock}

    ${declarationBlock}

    <div class="footer">
      <div class="meta-strip">
        <span>Verify online at ${verifyUrl}</span>
        <span>ডিজাইন ও ডেভেলপমেন্ট: রায়সুল ইসলাম সাঈদ</span>
      </div>
    </div>

  </div>
  <script>
    window.onload = function () { setTimeout(() => window.print(), 700); };
  <\/script>
</body>
</html>
  `);
  w.document.close();
};

  const handleWhatsApp = () => {
  const phone = data.WhatsApp?.replace(/['"\s-]/g,'');
  
  if(!phone) return alert("নম্বর নেই");
if (currentUser?.role === "Visitor") {
    window.open(`https://wa.me/+88${phone}`);
    return;
  }
  const waLink = `${window.location.origin}/${data.ID}`;
const msg = `
———————————————————————
  *ABDUR RAZZAK DAKHIL MADRASAH*
———————————————————————

👤 *STUDENT PROFILE*
• Name  : ${data.StudentNameEn} 
• নাম  : ${data.StudentNameBn}
• ID          : ${data.ID}
• Class       : ${data.ClassEn}
• Roll        : ${data.Roll}
• Session     : ${data.Session}
• Date of Birth : ${formatDate(data.DOB)}
• Blood Group : ${data.BloodGroup}
• Gender      : ${data.Gender}
• BRN         : ${data.BRN}

👪 *GUARDIAN DETAILS*
• Father : ${data.FatherNameEn}
• পিতা :  ${data.FatherNameBn}
• Mother : ${data.MotherNameEn}
• মাতা : ${data.MotherNameBn}

📞 *CONTACT INFO*
• Mobile    : ${data.WhatsApp}
• Emergency : ${data.EmergencyNo}

🏠 *ADDRESS*
${data.HouseNameEn}, ${data.VillageEn}, ${data.UnionEn}, ${data.UpazilaEn}, ${data.DistrictEn}.— ${data.HouseNameBn}, ${data.VillageBn}, ${data.UnionBn}, ${data.UpazilaBn}, ${data.DistrictBn}।

✅ *REGISTRATION SUCCESSFUL*
Your student profile has been created.
${waLink}`.trim();
let finalmsg = ""; 
if (currentUser?.role === "Admin") {
    const idmsg = `

*প্রিয় ${data.StudentNameBn},*
​
আনন্দের সাথে জানানো যাচ্ছে যে, তোমার স্টুডেন্ট আইডি কার্ডটি প্রস্তুত হয়েছে! 🎉

স্টুডেন্ট আইডি নম্বর: ${data.ID}
আইডি কার্ড ফি: ১০০/- (একশত টাকা)
​
আগামীকাল মাদরাসা চলাকালীন সময়ে নির্ধারিত ফি পরিশোধ করে তোমার আইডি কার্ডটি সংগ্রহ করো। 
​
ডিজিটাল কপি ও বিস্তারিত তথ্যের জন্য নিচের লিংকে ক্লিক করো:
🔗 ${waLink}

​ধন্যবাদান্তে,
আবদুর রাজ্জাক দাখিল মাদরাসা`.trim();
  finalmsg = idmsg;
  }else {
  finalmsg = msg;
  }
    
  window.open(`https://wa.me/+88${phone}?text=${encodeURIComponent(`প্রিয় ${data.StudentNameBn}`)}`);
};
  return (
    <>
      <style>{`
        @keyframes dv-hero-gradient {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes dv-photo-ring {
          0%, 100% { box-shadow: 0 0 0 0px rgba(212,168,67,0.5), 0 0 0 8px rgba(212,168,67,0.15), 0 24px 60px rgba(0,0,0,0.5); }
          50%       { box-shadow: 0 0 0 6px rgba(212,168,67,0.3), 0 0 0 14px rgba(212,168,67,0.08), 0 24px 60px rgba(0,0,0,0.5); }
        }
        @keyframes dv-slide-up {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dv-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes dv-scale-in {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes dv-badge-pop {
          0%   { transform: scale(0) rotate(-8deg); opacity: 0; }
          70%  { transform: scale(1.12) rotate(1deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes dv-status-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.4); }
        }
        @keyframes dv-bar-slide {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes dv-shimmer {
          from { background-position: -300px 0; }
          to   { background-position: 300px 0; }
        }
        @keyframes dv-float {
          0%, 10% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-6px) rotate(0.5deg); }
          66%       { transform: translateY(-3px) rotate(-0.5deg); }
        }

        .dv-hero-bg {
          background: linear-gradient(-45deg, #060D1F 0%, #0D1B3A 30%, #121C35 60%, #060D1F 100%);
          background-size: 300% 300%;
          animation: dv-hero-gradient 10s ease infinite;
        }
        .dv-photo-ring { animation: dv-photo-ring 3s ease-in-out infinite; }
        .dv-float      { animation: dv-float 6s ease-in-out infinite; }

        .dv-slide-up   { animation: dv-slide-up 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .dv-fade-in    { animation: dv-fade-in  0.5s ease both; }
        .dv-scale-in   { animation: dv-scale-in 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .dv-badge-pop  { animation: dv-badge-pop 0.5s cubic-bezier(0.22,1,0.36,1) both; }

        .dv-status-dot { animation: dv-status-pulse 2s ease-in-out infinite; }
        .dv-bar        { transform-origin: left; animation: dv-bar-slide 1.2s cubic-bezier(0.22,1,0.36,1) 0.5s both; }

        .dv-glass-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
        }
        .dv-action-btn {
          transition: transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s ease;
        }
        .dv-action-btn:active { transform: scale(0.88) !important; }

        .dv-row-item {
          transition: background 0.2s ease;
        }
        .dv-row-item:active { background: rgba(212,168,67,0.06) !important; }

        .dv-section-card {
          animation: dv-slide-up 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }

        .dv-gold-text {
          background: linear-gradient(135deg, #D4A843 0%, #F7E09A 40%, #C9962A 70%, #F0C96E 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: dv-hero-gradient 4s ease infinite;
        }
        .dv-shimmer-line {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
          background-size: 300px 100%;
          animation: dv-shimmer 2.5s linear infinite;
        }
        .dv-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .dv-no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div
        ref={scrollRef}
        className="fixed inset-0 z-[100] overflow-y-auto dv-no-scrollbar"
        style={{ background: '#F0F4FF' }}
      >

        {/* ══════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════ */}
        <div className="dv-hero-bg relative overflow-hidden" style={{ paddingBottom: 90 }}>

          {/* Decorative background elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Blurred photo backdrop */}
            <img
              src={data.ImageURL || DEFAULT_IMAGE}
              className="absolute inset-0 w-full h-full object-cover opacity-[0.07]"
              style={{ filter: 'blur(40px)', transform: 'scale(1.2)' }}
              alt=""
            />
            {/* Geometric rings */}
            <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full"
              style={{ border: '1px solid rgba(212,168,67,0.08)' }} />
            <div className="absolute -right-16 -top-16 w-60 h-60 rounded-full"
              style={{ border: '1px solid rgba(212,168,67,0.12)' }} />
            <div className="absolute -left-20 bottom-0 w-56 h-56 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(212,168,67,0.06) 0%, transparent 70%)' }} />
            {/* Shimmer line */}
            <div className="dv-shimmer-line absolute left-0 right-0 h-px" style={{ top: '35%' }} />
          </div>

          {/* Back button */}
          <div
            className="dv-fade-in relative z-20 flex items-center gap-3 px-5 pt-14 pb-6"
            style={{ animationDelay: '0s' }}
          >
            <button
              onClick={onBack}
              className="dv-action-btn w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <ChevronLeft size={20} color="white" />
            </button>
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Student Profile</p>
              <p className="text-[13px] font-black text-white/80 leading-tight">{data.ID}</p>
            </div>
            {/* Status badge top right */}
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{
                background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
            >
              <span className={`w-2 h-2 rounded-full dv-status-dot ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-emerald-300' : 'text-red-300'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Photo + Name */}
          <div className="relative z-10 flex flex-col items-center px-5">

            {/* Photo */}
            <div
              className="dv-scale-in relative cursor-pointer"
              style={{ animationDelay: '0.1s' }}
              onClick={() => onImageClick && onImageClick(data.ImageURL || DEFAULT_IMAGE)}
            >
              <div
                className="dv-photo-ring w-36 h-36 rounded-[32px] overflow-hidden"
                style={{
                  border: '3px solid rgba(212,168,67,0.5)',
                }}
              >
                <img
                  src={data.ImageURL || DEFAULT_IMAGE}
                  className="w-full h-full object-cover"
                  alt={data.StudentNameEn}
                />
              </div>
              {/* Camera hint */}
              <div
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(212,168,67,0.9)', backdropFilter: 'blur(8px)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" fill="white"/>
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="white" strokeWidth="1.5"/>
                </svg>
              </div>
            </div>

            {/* Name + Class */}
            <div className="mt-5 text-center dv-slide-up" style={{ animationDelay: '0.15s' }}>
              <h1 className="text-3xl font-black text-white leading-tight tracking-tight">
                {data.StudentNameEn}
              </h1>
              <p className="text-lg font-bold mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {data.StudentNameBn}
              </p>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap justify-center gap-2 mt-4 dv-slide-up" style={{ animationDelay: '0.22s' }}>
              {[
                { label: `Class ${data.ClassEn}`, color: classColor, bg: 'rgba(255,255,255,0.1)', border: `${classColor}40` },
                { label: `Roll ${data.Roll}`, color: '#D4A843', bg: 'rgba(212,168,67,0.12)', border: 'rgba(212,168,67,0.3)' },
                data.BloodGroup && { label: `🩸 ${data.BloodGroup}`, color: '#F87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
                { label: data.Gender === 'Male' ? '♂ Male' : '♀ Female', color: data.Gender === 'Male' ? '#60A5FA' : '#F472B6', bg: data.Gender === 'Male' ? 'rgba(96,165,250,0.12)' : 'rgba(244,114,182,0.12)', border: data.Gender === 'Male' ? 'rgba(96,165,250,0.3)' : 'rgba(244,114,182,0.3)' },
              ].filter(Boolean).map((badge, i) => (
                <span
                  key={i}
                  className="dv-badge-pop text-[11px] font-black px-3 py-1.5 rounded-full"
                  style={{
                    color: badge.color,
                    background: badge.bg,
                    border: `1px solid ${badge.border}`,
                    animationDelay: `${0.28 + i * 0.06}s`,
                  }}
                >
                  {badge.label}
                </span>
              ))}
            </div>

            {/* Session strip */}
            <div
              className="mt-5 dv-glass-card rounded-2xl px-5 py-3 flex items-center gap-4 dv-fade-in"
              style={{ animationDelay: '0.5s', minWidth: 220 }}
            >
              <div className="text-center flex-1">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Session</p>
                <p className="dv-gold-text text-sm font-black mt-0.5">{data.Session}</p>
              </div>
              <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="text-center flex-1">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Class</p>
                <p className="text-sm font-black mt-0.5" style={{ color: classColor }}>{data.ClassBn}</p>
              </div>
              <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="text-center flex-1">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Roll</p>
                <p className="text-sm font-black text-white mt-0.5">{data.Roll}</p>
              </div>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════
            ACTION BUTTONS — floating over hero
        ══════════════════════════════════════ */}
        <div
          className="relative z-20 px-5 -mt-10 dv-slide-up"
          style={{ animationDelay: '0.4s' }}
        >
          <div
            className="rounded-[24px] p-4 grid grid-cols-4 gap-3"
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(6,13,31,0.18), 0 4px 16px rgba(6,13,31,0.08)',
              border: '1px solid rgba(255,255,255,0.8)',
            }}
          >
            {[
              {
                icon: Phone,
                label: 'Call',
                gradient: 'linear-gradient(135deg, #059669, #10B981)',
                glow: 'rgba(16,185,129,0.35)',
                onClick: () => window.open(`tel:${data.WhatsApp?.replace(/['"]/g, '')}`)
              },
              {
                icon: MessageCircle,
                label: 'WhatsApp',
                gradient: 'linear-gradient(135deg, #15803d, #22C55E)',
                glow: 'rgba(34,197,94,0.35)',
                onClick: handleWhatsApp
              },
              {
                icon: CreditCard,
                label: 'ID Card',
                gradient: 'linear-gradient(135deg, #4338CA, #6366F1)',
                glow: 'rgba(99,102,241,0.35)',
                onClick: handlePrintIDCard
              },
              {
                icon: FileText,
                label: 'Print',
                gradient: 'linear-gradient(135deg, #0F172A, #334155)',
                glow: 'rgba(15,23,42,0.35)',
                onClick: handlePrintProfile
              },
            ].map(({ icon: Icon, label, gradient, glow, onClick }, i) => (
              <button
                key={label}
                onClick={onClick}
                className="dv-action-btn flex flex-col items-center gap-2"
                style={{ animationDelay: `${0.45 + i * 0.06}s` }}
              >
                <div
                  className="w-14 h-14 rounded-[18px] flex items-center justify-center"
                  style={{
                    background: gradient,
                    boxShadow: `0 8px 24px ${glow}`,
                  }}
                >
                  <Icon size={22} color="white" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════
            CONTENT SECTIONS
        ══════════════════════════════════════ */}
        <div className="px-4 pt-4 pb-40 space-y-4">

          {/* ── SECTION: Basic Info ── */}
          <PremiumSection
            title="Academic Info"
            icon="🎓"
            delay="0.5s"
            accent={classColor}
            items={[
              { label: 'Student ID', value: data.ID, mono: true, highlight: true },
              { label: 'Class', value: `${data.ClassEn} (${data.ClassBn})`, color: classColor },
              { label: 'Roll Number', value: data.Roll },
              { label: 'Session', value: data.Session },
              { label: 'Status', value: isActive ? 'Active ✓' : 'Inactive ✗', color: isActive ? '#10B981' : '#EF4444' },
            ]}
          />

          {/* ── SECTION: Personal Info ── */}
          <PremiumSection
            title="Personal Info"
            icon="👤"
            delay="0.58s"
            accent="#6366F1"
            items={[
              { label: 'Date of Birth', value: formatDate(data.DOB) },
              { label: 'Blood Group', value: data.BloodGroup || 'N/A', color: '#EF4444' },
              { label: 'Gender', value: data.Gender, color: data.Gender === 'Male' ? '#3B82F6' : '#EC4899' },
              { label: 'BRN', value: data.BRN, mono: true },
            ]}
          />

          {/* ── SECTION: Guardian Info ── */}
          <PremiumSection
            title="Guardian Info"
            icon="👪"
            delay="0.66s"
            accent="#F59E0B"
            items={[
              { label: 'পিতার নাম', value: data.FatherNameBn },
              { label: "Father's Name", value: data.FatherNameEn },
              { label: 'মাতার নাম', value: data.MotherNameBn },
              { label: "Mother's Name", value: data.MotherNameEn },
            ]}
          />

          {/* ── SECTION: Contact ── */}
          <PremiumSection
            title="Contact Info"
            icon="📞"
            delay="0.74s"
            accent="#10B981"
            items={[
              { label: 'Mobile / WhatsApp', value: data.WhatsApp, mono: true },
              { label: 'Emergency No', value: data.EmergencyNo, mono: true },
            ]}
            extra={
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => window.open(`tel:${data.WhatsApp?.replace(/['"]/g,'')}`)}
                  className="dv-action-btn flex-1 py-3 rounded-2xl text-xs font-black text-emerald-600 flex items-center justify-center gap-2"
                  style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}
                >
                  <Phone size={14}/> Call Now
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="dv-action-btn flex-1 py-3 rounded-2xl text-xs font-black text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#15803d,#22C55E)', boxShadow: '0 6px 20px rgba(34,197,94,0.3)' }}
                >
                  <MessageCircle size={14}/> WhatsApp
                </button>
              </div>
            }
          />

          {/* ── SECTION: Address ── */}
          <div
            className="dv-section-card rounded-[24px] overflow-hidden"
            style={{
              animationDelay: '0.82s',
              background: 'white',
              boxShadow: '0 4px 24px rgba(6,13,31,0.07), 0 1px 4px rgba(6,13,31,0.04)',
              border: '1px solid rgba(6,13,31,0.05)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: '#FEF2F2' }}>
                🏠
              </div>
              <div>
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Address</h3>
                <div className="h-0.5 w-8 rounded-full mt-1" style={{ background: '#EF4444' }} />
              </div>
            </div>

            {/* Map-style address card */}
            <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
              {/* Bengali address */}
              <div className="px-4 py-3" style={{ background: '#F8FAFC' }}>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">বাংলা ঠিকানা</p>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">
                  {[data.HouseNameBn, data.VillageBn, data.UnionBn, data.UpazilaBn, data.DistrictBn].filter(Boolean).join(', ')}।
                </p>
              </div>
              <div className="h-px" style={{ background: '#E2E8F0' }} />
              {/* English address */}
              <div className="px-4 py-3 bg-white">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">English Address</p>
                <p className="text-sm font-bold text-slate-600 leading-relaxed">
                  {[data.HouseNameEn, data.VillageEn, data.UnionEn, data.UpazilaEn, data.DistrictEn].filter(Boolean).join(', ')}.
                </p>
              </div>
              <div className="h-px" style={{ background: '#E2E8F0' }} />
              {/* Ward */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#F8FAFC' }}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ward No</span>
                <span className="text-sm font-black text-slate-800 bg-white px-3 py-1 rounded-full border border-slate-200">
                  {data.WardNo || 'N/A'}
                </span>
              </div>
            </div>
          </div>
{/* এই ব্লকটা Address সেকশনের ঠিক পরে, আর sticky bottom Edit/Delete-এর আগে বসান
   (একই <div className="px-4 pt-4 pb-40 space-y-4"> কন্টেইনারের ভেতরে) */}

{siblings && siblings.length > 0 && (
  <div
    className="dv-section-card rounded-[24px] overflow-hidden"
    style={{
      animationDelay: '0.9s',
      background: 'white',
      boxShadow: '0 4px 24px rgba(6,13,31,0.07), 0 1px 4px rgba(6,13,31,0.04)',
      border: '1px solid rgba(6,13,31,0.05)',
    }}
  >
    {/* Header */}
    <div className="flex items-center gap-3 px-5 pt-5 pb-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: '#FEF3E2' }}>
        👨‍👩‍👧‍👦
      </div>
      <div>
        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Siblings</h3>
        <div className="h-0.5 w-8 rounded-full mt-1" style={{ background: '#D97706' }} />
      </div>
      <span className="ml-auto text-[10px] font-black text-slate-300 uppercase tracking-widest">
        {siblings.length} found
      </span>
    </div>

    {/* Clickable sibling rows */}
    <div className="px-4 pb-4 space-y-2">
      {siblings.map((sib) => {
        const { color, bg } = CLASS_PALETTE[sib.ClassBn] || { color: '#3B5BDB', bg: '#EEF2FF' };
        return (
          <button
            key={sib.ID}
            onClick={() => onSelectSibling && onSelectSibling(sib)}
            className="dv-row-item w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left"
            style={{ background: '#F8FAFC', border: '1px solid transparent' }}
          >
            <img
              src={sib.ImageURL || DEFAULT_IMAGE}
              className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
              style={{ border: `2px solid ${color}30` }}
              alt=""
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-black text-slate-900 truncate">{sib.StudentNameEn}</p>
              <p className="text-[11px] font-semibold text-slate-400 truncate">{sib.StudentNameBn}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-md" style={{ background: bg, color }}>
                {sib.ClassEn}
              </span>
              <span className="text-[9px] font-bold text-slate-400">Roll {sib.Roll}</span>
            </div>
            <ChevronLeft size={14} className="rotate-180 text-slate-300 flex-shrink-0" />
          </button>
        );
      })}
    </div>
  </div>
)}
        </div>

        {/* ══════════════════════════════════════
            STICKY BOTTOM — Edit / Delete
        ══════════════════════════════════════ */}
        {(currentUser?.role === "Admin" || (currentUser?.role === "Class" && data.ClassBn === currentUser?.classBn && CAN_CLASS_TEACHER_EDIT)) && (
          <div
            className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-8 pt-4 dv-slide-up"
            style={{
              animationDelay: '0.9s',
              background: 'linear-gradient(to top, rgba(240,244,255,1) 60%, rgba(240,244,255,0) 100%)',
            }}
          >
            <div className="flex gap-3">
              <button
                onClick={onEdit}
                className="dv-action-btn flex-1 flex items-center justify-center gap-2.5 py-4 rounded-[20px] font-black text-sm text-white"
                style={{
                  background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                  boxShadow: '0 12px 40px rgba(6,13,31,0.35)',
                }}
              >
                <Edit3 size={18} />
                Edit Profile
              </button>
              <button
                onClick={() => onDelete(data.ID)}
                className="dv-action-btn w-16 rounded-[20px] flex items-center justify-center"
                style={{
                  background: '#FEF2F2',
                  border: '1.5px solid #FECACA',
                  color: '#EF4444',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.15)',
                }}
              >
                <Trash2 size={22} />
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

// ── PREMIUM SECTION CARD ──
const PremiumSection = ({ title, icon, delay: animDelay, accent, items, extra }) => (
  <div
    className="dv-section-card rounded-[24px] overflow-hidden"
    style={{
      animationDelay: animDelay,
      background: 'white',
      boxShadow: '0 4px 24px rgba(6,13,31,0.07), 0 1px 4px rgba(6,13,31,0.04)',
      border: '1px solid rgba(6,13,31,0.05)',
    }}
  >
    {/* Section Header */}
    <div className="flex items-center gap-3 px-5 pt-5 pb-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
        style={{ background: `${accent}14` }}>
        {icon}
      </div>
      <div>
        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{title}</h3>
        <div className="h-0.5 w-8 rounded-full mt-1" style={{ background: accent }} />
      </div>
    </div>

    {/* Items */}
    <div className="px-4 pb-4 space-y-1">
      {items.map((item, i) => (
        <div
          key={i}
          className="dv-row-item flex items-center justify-between px-3 py-3 rounded-2xl"
          style={{
            background: i % 2 === 0 ? '#F8FAFC' : 'white',
            border: item.highlight ? `1px solid ${accent}22` : 'none',
          }}
        >
          <span className="text-[11px] font-bold text-slate-400 flex-1">{item.label}</span>
          <span
            className={`text-[13px] font-black text-right ml-3 ${item.mono ? 'font-mono tracking-tight' : ''}`}
            style={{ color: item.color || '#0F172A', maxWidth: '55%' }}
          >
            {item.value || 'N/A'}
          </span>
        </div>
      ))}
      {extra}
    </div>
  </div>
);
// 3. FULL DETAIL VIEW WITH UPDATED PRINT BUTTONS & LOGIC
const ActionBtn = ({ icon: Icon, label, bg, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-2 group">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition group-active:scale-90 ${bg}`}>
      <Icon size={24}/>
    </div>
    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
  </button>
);



export default Index;
