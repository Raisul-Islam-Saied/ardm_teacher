import { toPng } from 'html-to-image';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  FileType,
  Hash,
  Home,
  LayoutDashboard,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from "react-router-dom";
import ResultTimer from './ResultTimer';
import { ONLY_ADMIN, RESULT_PUBLISH_TIME } from './systemConfig';

// ==============================================
// 1. SHARED ERP SESSION READER (FROM '/')
// ==============================================
const ERP_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const TOKEN_STORAGE_KEY = 'ardm_erp_jwt_token';
const USER_STORAGE_KEY = 'ardm_erp_auth_user';

const CLASS_BN_TO_EN = {
  'প্লে': 'Play',
  'নার্সারি': 'Nursery',
  'কেজি': 'KG',
  '১ম': 'One',
  '২য়': 'Two',
  '২য়': 'Two',
  '৩য়': 'Three',
  '৩য়': 'Three',
  '৪র্থ': 'Four',
  '৫ম': 'Five',
  '৬ষ্ঠ': 'Six',
  '৭ম': 'Seven',
  '৮ম': 'Eight',
  '৯ম': 'Nine',
  '১০ম': 'Ten'
};

const getSessionUser = () => {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!token || !raw) return null;
    const user = JSON.parse(raw);
    if (!user || user.isActive === false || ['Pending', 'Rejected'].includes(user.registrationStatus)) {
      return null;
    }
    if (user.role === 'SuperAdmin' || user.role === 'Admin') {
      return { ...user, role: 'Admin' };
    }
    if (user.role === 'Teacher' && user.assignedClass) {
      return {
        ...user,
        role: 'Class',
        classBn: user.assignedClass,
        classEn: CLASS_BN_TO_EN[user.assignedClass] || user.assignedClass
      };
    }
    if (user.role === 'Teacher') {
      return { ...user, role: 'Visitor' };
    }
    return null;
  } catch {
    return null;
  }
};

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoQM0Xf5SrusbRuCwe4b3s92rK7e014DYkgiuM3yOLs9KKZ773MUkmysrM3PcxyCbpbw/exec';
const ADMIN_SECRET = "ARDM_DELETE_2026";
// ==============================================
// গ্লোবাল ভেরিয়েবল: ONLY_ADMIN
// ==============================================


// ==============================================
// 2. HELPER FUNCTIONS & DATA
// ==============================================
const toBn = (n) => {
  if (n === undefined || n === null || n === '') return '-';
  return String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
};

const toEnNum = (n) => {
  if (!n) return '';
  const bnToEn = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  return String(n).replace(/[০-৯]/g, d => bnToEn[d]);
};

// ==============================================
// AI REMARK GENERATOR HELPERS
// ==============================================
const MAX_SUBJECTS_FOR_REMARK = 20; // ১২ এর বেশি বিষয় হলে রিমার্ক হাইড হবে

const seededRandom = (seed) => {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const pickAI = (arr, seed) => {
  let randomVal = seededRandom(seed);
  return arr[Math.floor(randomVal * arr.length)];
};

const generateSmartRemark = (id, totalMarks, gpa, isPass, subjects) => {
  if (MAX_SUBJECTS_FOR_REMARK === 0 || subjects.length > MAX_SUBJECTS_FOR_REMARK) return "";

  // আইডি এবং মোট নম্বর দিয়ে ইউনিক সিড তৈরি (যাতে রিলোডেও একই স্টুডেন্টের রিমার্ক সেম থাকে)
  const seed = (Number(toEnNum(id)) || 1) + (Number(toEnNum(totalMarks)) || 1); 
  
  let bestSub = "", worstSub = "";
  let maxMark = -1, minMark = 999;
  let weakCount = 0;
  let failCount = 0;
  
  subjects.forEach((sub) => {
      let percent = (sub.mark / sub.full) * 100;
      if (percent > maxMark) { maxMark = percent; bestSub = sub.name; }
      if (percent < minMark) { minMark = percent; worstSub = sub.name; }
      if (percent < 45) { weakCount++; }
      if (percent < 33) { failCount++; }
  });

  let weakText = (weakCount > 1) ? `একাধিক বিষয়ে (বিশেষত '${worstSub}'-এ)` : `'${worstSub}' বিষয়ে`;
  let strongText = `'${bestSub}' বিষয়ে`;

  let remark = "";
  let numGpa = parseFloat(toEnNum(gpa));

  // ফেল লিমিটের বেশি হলে (২টির বেশি বিষয়ে ফেল)
  if (failCount > 2) {
      return "একাধিক বিষয়ে অকৃতকার্য হওয়া পড়াশোনায় চরম অমনোযোগের লক্ষণ। শিক্ষাজীবন নিয়ে উদ্বেগজনক এই পরিস্থিতি উত্তরণে অভিভাবকের নিবিড় তদারকি ও ত্বরিত পদক্ষেপ প্রয়োজন।";
  }

  if (numGpa >= 5.00 && isPass) {
      const intros = [
          `অসাধারণ মেধার স্বাক্ষর! ${strongText} তার দক্ষতা প্রশংসনীয় এবং সবগুলো বিষয়েই পারফরম্যান্স অত্যন্ত ধারাবাহিক।`,
          `খুবই চমৎকার রেজাল্ট! মেধা ও চেষ্টার সঠিক প্রতিফলন ঘটেছে এই ফলাফলে।`,
          `পড়াশোনায় একাগ্রতা ও অধ্যবসায়ের কারণেই এই অসামান্য ফলাফল অর্জন করা সম্ভব হয়েছে।`
      ];
      const middles = [
          `তার মতো একজন মেধাবী শিক্ষার্থীর কাছ থেকে ঠিক এমন একটি রেজাল্টই কাম্য।`,
          `এই সাফল্যের ধারা আগামীতেও অব্যাহত থাকুক, সেই প্রত্যাশা রইলো।`
      ];
      remark = pickAI(intros, seed) + " " + pickAI(middles, seed+1);
  }
  else if (numGpa >= 3.50 && isPass) {
      const intros = [
          `ফলাফল বেশ ভালো ও সন্তোষজনক। তবে ${strongText} ভালো করলেও ${weakText} তাকে আরও ফোকাস করতে হবে।`,
          `পড়াশোনার প্রতি তার একাগ্রতা প্রশংসনীয়। তবে মেধা অনুযায়ী আরও ভালো করার সক্ষমতা তার রয়েছে।`,
          `বেশ ভালো রেজাল্ট! নিয়মিত অনুশীলন করলে আগামীতে সে অনায়াসেই পূর্ণাঙ্গ সাফল্য অর্জন করতে পারবে।`
      ];
      const middles = [
          `আরেকটু গাইডলাইন পেলে ফলাফল আরও নিখুঁত হতো। শুধু ${weakText} কিছুটা সময় দেওয়া প্রয়োজন।`,
          `এই ধারাবাহিকতা ধরে রেখে নিজের দুর্বলতাগুলো কাটিয়ে ওঠার চেষ্টা করতে হবে।`
      ];
      remark = pickAI(intros, seed) + " " + pickAI(middles, seed+1);
  }
  else if (isPass) {
      const intros = [
          `কৃতকার্য হলেও এই ফলাফল তার আসল মেধার পরিচায়ক নয়। বিশেষ করে ${weakText} তাকে আরও অনেক বেশি সিরিয়াস হতে হবে।`,
          `ফলাফল চলনসই। তবে ক্লাসে তাকে আরও মনোযোগী হতে হবে এবং বাসায় পড়ার সময় বাড়াতে হবে।`,
          `পাস করলেও ফলাফলে পুরোপুরি সন্তুষ্ট হওয়ার সুযোগ নেই। তার আরও দায়িত্বশীল হওয়া প্রয়োজন।`
      ];
      const middles = [
          `${weakText} দুর্বলতা কাটিয়ে উঠতে শিক্ষকদের পরামর্শ মেনে চলা অত্যন্ত জরুরি।`,
          `আশা করি আগামী পরীক্ষায় সে নিজের এই ঘাটতিগুলো কাটিয়ে উঠতে সক্ষম হবে।`
      ];
      remark = pickAI(intros, seed) + " " + pickAI(middles, seed+1);
  }
  else {
      const intros = [
          `অকৃতকার্য হওয়ার বিষয়টি হতাশাজনক। মূলত ${weakText} বেসিক ঘাটতির কারণেই এই ফলাফল।`,
          `পড়াশোনায় অমনোযোগিতার কারণেই আশানুরূপ ফলাফল হয়নি। তাকে আরও অনেক বেশি যত্নশীল হতে হবে।`,
          `আশা অনুযায়ী ফলাফল আসেনি। ভুল থেকে শিক্ষা নিয়ে তাকে শক্তভাবে ঘুরে দাঁড়াতে হবে।`
      ];
      const middles = [
          `${weakText} স্পেশাল কেয়ার নেওয়া প্রয়োজন। নতুবা এই গ্যাপ পূরণ করা সম্ভব হবে না।`,
          `নিয়মিত পড়ার টেবিলে বসার অভ্যাস না থাকলে আগামীতেও ফলাফল খারাপ হওয়ার আশঙ্কা রয়েছে।`
      ];
      remark = pickAI(intros, seed) + " " + pickAI(middles, seed+1);
  }
  
  return remark;
};
// ==============================================
// ANIMATED NUMBER COMPONENT (Scroll Counter)
// ==============================================
const AnimatedNumber = ({ value, isVisible, isDecimal = false, isEnglish = false }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setCount(0); 
      return;
    }
    const end = parseFloat(toEnNum(String(value))) || 0;
    if (end === 0) {
        setCount(0);
        return;
    }
    let start = 0;
    const duration = 1300; // 1.2 seconds animation
    const incrementTime = 20;
    const steps = duration / incrementTime;
    const stepValue = end / steps;

    const timer = setInterval(() => {
      start += stepValue;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, isVisible]);

  if (isNaN(parseFloat(toEnNum(String(value))))) return isEnglish ? value : toBn(value);
  
  const finalVal = isDecimal ? count.toFixed(2) : Math.floor(count);
  return isEnglish ? finalVal : toBn(finalVal);
};
// ==============================================
// TYPEWRITER ANIMATION COMPONENT (For Remark)
// ==============================================
const TypewriterText = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    // নতুন সার্চ দিলে অটোমেটিক রিসেট হবে
    setDisplayedText('');
    setIsTyping(false);
  }, [text]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // স্ক্রিনে আসলে এবং আগে টাইপ না হয়ে থাকলে শুরু হবে
        if (entry.isIntersecting && displayedText.length === 0 && !isTyping) {
          setIsTyping(true);
        }
      },
      { threshold: 0.1 }
    );

    if (textRef.current) observer.observe(textRef.current);
    return () => observer.disconnect();
  }, [displayedText, isTyping]);

  useEffect(() => {
    if (!isTyping) return;
    
    let i = 0;
    // স্ক্রিনে আসার ৩০০ মিলি-সেকেন্ড পর টাইপিং শুরু হবে (ন্যাচারাল লুকের জন্য)
    const startDelay = setTimeout(() => {
        const timer = setInterval(() => {
          setDisplayedText(text.substring(0, i + 1));
          i++;
          if (i >= text.length) {
              clearInterval(timer);
              // টাইপ শেষ হওয়ার ২ সেকেন্ড পর কার্সরটি হাইড হয়ে যাবে
              setTimeout(() => setIsTyping(false), 2000); 
          }
        }, 25); // স্পিড (প্রতি অক্ষরে ২৫ মিলি-সেকেন্ড)
        return () => clearInterval(timer);
    }, 300); 

    return () => clearTimeout(startDelay);
  }, [text, isTyping]);

  return (
    <span ref={textRef} style={{ position: 'relative', display: 'block' }}>
      
      {/* ১. সম্পূর্ণ টেক্সটটিকে হাইড করে রাখা হলো যাতে বক্স শুরুতেই সঠিক সাইজ নিয়ে নেয় */}
      <span style={{ visibility: 'hidden' }}>{text}</span>

      {/* ২. টাইপিং হওয়া টেক্সটটিকে উপরে পজিশন করা হলো */}
      <span style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        {displayedText}
        <span 
          style={{ 
              display: 'inline-block', 
              width: '2px', 
              height: '1.1em', 
              backgroundColor: '#0f766e', 
              verticalAlign: 'middle',
              marginLeft: '3px',
              animation: isTyping ? 'blinkCursor 0.8s infinite step-end' : 'none',
              opacity: isTyping ? 1 : 0,
              transition: 'opacity 0.4s ease-out'
          }}
        ></span>
      </span>
      
    </span>
  );
};
// ==============================================
// ANIMATED SUBJECT CARD COMPONENT
// ==============================================
const AnimatedSubjectCard = ({ sub }) => {
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 } // কার্ডটির ১৫% স্ক্রিনে আসলেই এনিমেশন শুরু হবে
        );

        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, []);

    const gc = {
        'A+': { border: '#f59e0b', bar: 'linear-gradient(90deg,#fbbf24,#f59e0b)', badge: '#fef3c7', badgeText: '#92400e' },
        'A':  { border: '#22c55e', bar: 'linear-gradient(90deg,#4ade80,#16a34a)', badge: '#dcfce7', badgeText: '#14532d' },
        'A-': { border: '#14b8a6', bar: 'linear-gradient(90deg,#2dd4bf,#0f766e)', badge: '#ccfbf1', badgeText: '#134e4a' },
        'B':  { border: '#3b82f6', bar: 'linear-gradient(90deg,#60a5fa,#2563eb)', badge: '#dbeafe', badgeText: '#1e3a8a' },
        'C':  { border: '#f97316', bar: 'linear-gradient(90deg,#fb923c,#ea580c)', badge: '#ffedd5', badgeText: '#7c2d12' },
        'D':  { border: '#a855f7', bar: 'linear-gradient(90deg,#c084fc,#7c3aed)', badge: '#f3e8ff', badgeText: '#581c87' },
        'F':  { border: '#ef4444', bar: 'linear-gradient(90deg,#f87171,#dc2626)', badge: '#fee2e2', badgeText: '#7f1d1d' },
    }[sub.grade] || { border: '#ef4444', bar: 'linear-gradient(90deg,#f87171,#dc2626)', badge: '#fee2e2', badgeText: '#7f1d1d' };

    return (
        <div ref={cardRef} style={{
            background: '#fff', borderRadius: '18px',
            borderLeft: `4px solid ${gc.border}`,
            border: `1px solid #f1f5f9`,
            borderLeftWidth: '4px', borderLeftColor: gc.border,
            padding: '14px 16px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
            transition: 'opacity 0.6s ease-out, transform 0.6s ease-out'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ flex: 1, paddingRight: '8px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 5px', lineHeight: 1.3 }}>{sub.name}</h4>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', background: '#f8fafc', padding: '2px 8px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                            পূর্ণমান {toBn(sub.full)}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#0d9488', background: '#f0fdfa', padding: '2px 8px', borderRadius: '20px', border: '1px solid #ccfbf1' }}>
                            সর্বোচ্চ {toBn(sub.highest)}
                        </span>
                    </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: '#94a3b8', fontSize: '9px', fontWeight: 700, margin: '0 0 3px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>প্রাপ্ত নম্বর</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '30px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{toBn(sub.mark)}</span>
                        <span style={{
                            fontSize: '12px', fontWeight: 800,
                            background: gc.badge, color: gc.badgeText,
                            padding: '2px 8px', borderRadius: '7px',
                            border: `1px solid ${gc.border}40`
                        }}>{sub.grade}</span>
                    </div>
                </div>
            </div>
            {/* Progress bar */}
            <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: '999px',
                    background: gc.bar,
                    width: isVisible ? `${Math.min(sub.percent, 100).toFixed(1)}%` : '0%',
                    transition: 'width 1.3s cubic-bezier(.22,1,.36,1) 0.3s'
                }}></div>
            </div>
        </div>
    );
};

const getGP = (percentage) => {
  if (percentage >= 80) return 5.00;
  if (percentage >= 70) return 4.00;
  if (percentage >= 60) return 3.50;
  if (percentage >= 50) return 3.00;
  if (percentage >= 40) return 2.00;
  if (percentage >= 33) return 1.00;
  return 0.00;
};

const getGradeFromGP = (gp) => {
  if (gp >= 5.00) return 'A+';
  if (gp >= 4.00) return 'A';
  if (gp >= 3.50) return 'A-';
  if (gp >= 3.00) return 'B';
  if (gp >= 2.00) return 'C';
  if (gp >= 1.00) return 'D';
  return 'F';
};

const subjectsDB = [
  { name: 'কুরআন মাজিদ', short: 'Quran', def: 100 },
  { name: 'আকাইদ ও ফিকহ', short: 'Aqaid', def: 100 },
  { name: 'হাদিস শরীফ', short: 'Hadith', def: 100 },
  { name: 'আরবি ১ম পত্র', short: 'Arabic', def: 100 },
  { name: 'আরবি ২য় পত্র', short: 'Arabic 2nd', def: 50 },
  { name: 'বাংলা ১ম পত্র', short: 'Bangla', def: 100 },
  { name: 'বাংলা ২য় পত্র', short: 'Bangla 2nd', def: 50 },
  { name: 'ইংরেজি ১ম পত্র', short: 'English', def: 100 },
  { name: 'ইংরেজি ২য় পত্র', short: 'English 2nd', def: 50 },
  { name: 'গণিত', short: 'Math', def: 100 },
  { name: 'ইসলামের ইতিহাস', short: 'History', def: 100 },
 
  { name: 'বাংলাদেশ ও বিশ্বপরিচয়', short: 'BGS', def: 100 },
   { name: 'বিজ্ঞান', short: 'Science', def: 100 },
  { name: 'কৃষি শিক্ষা', short: 'Agri', def: 100 },
  { name: 'মানতিক', short: 'Mantiq', def: 100 },
  { name: 'তথ্য ও যোগাযোগ প্রযুক্তি', short: 'ICT', def: 50 }
];

const examMap = {
  '1st Terminal': 'প্রথম সাময়িক পরীক্ষা',
  '2nd Terminal': 'দ্বিতীয় সাময়িক পরীক্ষা',
  'Half Yearly': 'অর্ধ-বার্ষিক পরীক্ষা',
  'Annual': 'বার্ষিক পরীক্ষা',
  'Final Result': 'চূড়ান্ত ফলাফল (গড়)'
};

// Single-digit codes used inside the compact student ID (encodeShortId/decodeShortId below).
// Add new exam types here ONLY — both ID functions read from this single source of truth.
const EXAM_CODE_MAP = {
  '1st Terminal': '1',
  '2nd Terminal': '2',
  'Annual': '3',
  'Half Yearly': '4',
  'Final Result': '5'
};
const EXAM_CODE_REVERSE = {
  '1': '1st Terminal',
  '2': '2nd Terminal',
  '3': 'Annual',
  '4': 'Half Yearly',
  '5': 'Final Result'
};

// URL mapping helpers
const mapExamFromUrl = (exm) => {
  if(!exm) return '';
  const exmLower = exm.toString().toLowerCase();
  if (exmLower === '1') return '1st Terminal';
  if (exmLower === '2') return '2nd Terminal';
  if (exmLower === '3' || exmLower === 'annual') return 'Annual';
 if (exmLower === '4' || exmLower === 'half yearly' || exmLower === 'halfyearly') return 'Half Yearly';
  if (exmLower === '5' || exmLower === 'final result' || exmLower === 'finalresult') return 'Final Result';
  return exm;
  
};

const mapClassFromUrl = (cls) => {
  if(!cls) return '';
  const clsLower = cls.toString().toLowerCase();
  const map = {
    'play': 'Play', 'nursery': 'Nursery', 'kg': 'KG', 
    '1': 'Class One', 'one': 'Class One',
    '2': 'Class Two', 'two': 'Class Two',
    '3': 'Class Three', 'three': 'Class Three',
    '4': 'Class Four', 'four': 'Class Four',
    '5': 'Class Five', 'five': 'Class Five',
    '6': 'Class Six', 'six': 'Class Six',
    '7': 'Class Seven', 'seven': 'Class Seven',
    '8': 'Class Eight', 'eight': 'Class Eight',
    '9': 'Class Nine', 'nine': 'Class Nine',
    '10': 'Class Ten', 'ten': 'Class Ten'
  };
  return map[clsLower] || cls;
};


    
const encodeShortId = (year, exam, cls, roll) => {
const examCode = EXAM_CODE_MAP[exam] || '3';
  const classCodeMap = {
    'Play':'01','Nursery':'02','KG':'03',
    'Class One':'04','Class Two':'05','Class Three':'06','Class Four':'07',
    'Class Five':'08','Class Six':'09','Class Seven':'10',
    'Class Eight':'11','Class Nine':'12','Class Ten':'13'
  };
  const cc = classCodeMap[cls] || '00';
  const yy = String(year).slice(-2);
  const rr = String(toEnNum(roll)).padStart(4, '0');
  return `${yy}${examCode}${cc}${rr}`;
};

const decodeShortId = (id) => {
  if (!id || id.length < 8) return null;
  const yy = id.slice(0, 2);
  const e  = id.slice(2, 3);
  const cc = id.slice(3, 5);
  const rr = id.slice(5);
  const year = `20${yy}`;
  const exam = EXAM_CODE_REVERSE[e] || 'Annual';
  const classMap = {
    '01':'Play','02':'Nursery','03':'KG',
    '04':'Class One','05':'Class Two','06':'Class Three','07':'Class Four',
    '08':'Class Five','09':'Class Six','10':'Class Seven',
    '11':'Class Eight','12':'Class Nine','13':'Class Ten'
  };
  const cls = classMap[cc];
  const roll = String(parseInt(rr));
  if (!cls) return null;
  return { year, exam, cls, roll };
};

// ==========================================
// NEXT LEVEL PREMIUM SELECT FIELD
// ==========================================
const SelectField = ({ label, icon: Icon, value, onChange, options, disabled, placeholder, error, errorMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.val === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Label */}
      <label className={`text-[12px] font-black uppercase tracking-widest pl-1 mb-1.5 flex items-center gap-1.5 transition-colors duration-300  text-slate-500`}>
        <Icon className="w-4 h-4" /> {label}
      </label>
      
      {/* Main Box */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full p-4 border rounded-xl font-bold flex justify-between items-center transition-all duration-300 ${
          disabled 
            ? 'opacity-70 bg-slate-100 cursor-not-allowed border-slate-200 text-slate-400' 
            : error
              ? 'bg-red-50/50 border-red-400 text-red-700 shadow-[0_0_0_4px_rgba(248,113,113,0.15)] cursor-pointer'
              : isOpen 
                ? 'bg-teal-50/40 border-teal-500 shadow-[0_0_0_4px_rgba(20,184,166,0.15)] text-teal-800 cursor-pointer' 
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm cursor-pointer'
        }`}
      >
        <span className={`${!selectedOption ? (error ? 'text-red-400' : 'text-slate-400') : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isOpen ? '-rotate-90 text-teal-600' : (error ? 'text-red-400' : 'text-slate-400')}`} />
      </div>

      {/* Error Message Below (Animated) */}
      <div className={`overflow-hidden transition-all duration-300 ${error ? 'max-h-10 opacity-100 mt-1.5' : 'max-h-0 opacity-0 mt-0'}`}>
         <div className="text-red-500 text-[12px] font-bold pl-1 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> {errorMessage}
         </div>
      </div>

      {/* Dropdown Menu (Glassmorphism) */}
      <div 
        className={`absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-300 origin-top ${
          isOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
        }`}
        style={{ top: '100%', left: 0 }}
      >
        <div className="max-h-[260px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {options.map((opt, i) => {
            const isSelected = value === opt.val;
            return (
              <div 
                key={i}
                onClick={() => {
                  onChange({ target: { value: opt.val } });
                  setIsOpen(false);
                }}
                className={`px-4 py-3.5 rounded-xl text-sm font-bold flex items-center justify-between cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'bg-gradient-to-r from-teal-50 to-emerald-50/50 text-teal-800 shadow-sm border border-teal-100/50' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center animate-fade-in">
                    <CheckCircle className="w-3 h-3 text-teal-700" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==============================================
// 4. MAIN APP COMPONENT
// ==============================================
export default function Result() {
  const [currentUser, setCurrentUser] = useState(() => getSessionUser());
  const [authLoading, setAuthLoading] = useState(false);
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  
  const [activeTab, setActiveTab] = useState(() => {
    const u = getSessionUser();
    if (!u) return 'search';
    const isClassEffective = ONLY_ADMIN ? false : u.role === 'Class';
    return (u.role === 'Admin' || isClassEffective) ? 'dashboard' : 'search';
  });
  
  const [publishedExams, setPublishedExams] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const printRef = useRef(null);
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [examName, setExamName] = useState('');
  const [year, setYear] = useState('2026');
  const [className, setClassName] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [toast, setToast] = useState({
  show: false,
  message: '',
  type: 'success' // success | error | loading
});
const showToast = (message, type = 'success', duration = 3000) => {
  setToast({ show: true, message, type });

  if (type !== 'loading') {
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, duration);
  }
};
// ফরম্যাট: "YYYY-MM-DDTHH:mm:ss" (২৪ ঘণ্টার ফরম্যাট)
// উদাহরণ: "2026-02-15T14:00:00" মানে ২০২৬ সালের ১৫ ফেব্রুয়ারি দুপুর ২টা

const hideToast = () => {
  setToast({ show: false, message: '', type: 'success' });
};
const [isDownloading, setIsDownloading] = useState(false);

  const [searchClass, setSearchClass] = useState('');
  const [searchExam, setSearchExam] = useState('');
  const [searchYear, setSearchYear] = useState('2026');
  const [searchIdentifier, setSearchIdentifier] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
const [isSearching, setIsSearching] = useState(false);
const [cachedSheets, setCachedSheets] = useState({}); // 👈 এই লাইনটি যোগ করুন
  const [selectedExam, setSelectedExam] = useState(null);
  const resultAreaRef = useRef(null);
  const [isResultVisible, setIsResultVisible] = useState(false);
  const [showSearchValidation, setShowSearchValidation] = useState(false);
  const [showUploadValidation, setShowUploadValidation] = useState(false);

  // URL Param logic trigger flag
  const [autoSearchTriggered, setAutoSearchTriggered] = useState(false);

  const isAdmin = currentUser?.role === 'Admin';
  const isClassAdminRaw = currentUser?.role === 'Class';
  const now = new Date();
const publishTime = new Date(RESULT_PUBLISH_TIME);

// সময় পার হয়েছে?
const isPublished = now >= publishTime;
// Admin always allowed
// Teacher allowed only when ONLY_ADMIN = false
const canBypassTimer =
  isAdmin || (!ONLY_ADMIN && isClassAdminRaw);
// ⏰ RESULT LOCK SYSTEM (সব সময় চেক হবে)


  // Apply the Global ONLY_ADMIN rule
  const isClassAdmin = ONLY_ADMIN ? false : isClassAdminRaw;
  const canManage = isAdmin || isClassAdmin;

  // Get formatted class name for Class Admin securely
  const userFormattedClass = (() => {
    if (!isClassAdminRaw || !currentUser) return '';
    const en = currentUser.classEn;
    if (['Play', 'Nursery', 'KG'].includes(en)) return en;
    return `Class ${en}`;
  })();

  const fileInputRef = useRef(null);
const navigate = useNavigate();
  // Handle Browser Back Button (popstate)
 useEffect(() => {
  const handlePopState = () => {

    // Marksheet থেকে back → Search page
    if (searchResult) {
      setSearchResult(null);
      return;
    }

    // Exam থেকে back → Dashboard
    if (selectedExam) {
      setSelectedExam(null);
      return;
    }

    // Upload/Search tab → Home tab
    if (activeTab !== 'dashboard' && canManage) {
      setActiveTab('dashboard');
      return;
    }

    // Search tab (public) → stay
    if (activeTab !== 'search' && !canManage) {
      setActiveTab('search');
      return;
    }

    // Home tab → go to "/"
    navigate("/");
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [searchResult, selectedExam, activeTab, canManage]);

    // মার্কশিট ওপেন হলে পেজটি স্ক্রোল করে একদম উপরে নিয়ে যাওয়ার জন্য
  useEffect(() => {
    if (searchResult) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchResult]);
useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsResultVisible(true); // স্ক্রিনে আসলেই ট্র্রিগার হবে
        }
      },
      { threshold: 0.2 } // ৩০% অংশ স্ক্রিনে আসলেই এনিমেশন শুরু হবে
    );

    if (resultAreaRef.current) {
      observer.observe(resultAreaRef.current);
    }
    return () => observer.disconnect();
  }, [searchResult]);

  // SHARED ERP SESSION VERIFICATION (FROM '/')
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setCurrentUser(null);
      setActiveTab('search');
      return;
    }

    fetch(`${ERP_API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(json => {
        const serverUser = json?.data?.teacher || json?.data?.user || json?.data;
        if (serverUser) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(serverUser));
          const mapped = getSessionUser();
          setCurrentUser(mapped);
          const isClassEffective = ONLY_ADMIN ? false : mapped?.role === 'Class';
          setActiveTab((mapped?.role === 'Admin' || isClassEffective) ? 'dashboard' : 'search');
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        setCurrentUser(null);
        setActiveTab('search');
      });
  }, []);

 
  // Parse URL Parameters on Mount
  useEffect(() => {
  const params = new URLSearchParams(window.location.search);

  // নতুন শর্ট ফরম্যাট ?id=2610130005
  const shortId = params.get('id');
  if (shortId) {
    const decoded = decodeShortId(shortId);
    if (decoded) {
      setIsAutoSearching(true);
      setSearchYear(decoded.year);
      setSearchExam(decoded.exam);
      setSearchClass(decoded.cls);
      setSearchIdentifier(decoded.roll);
      setAutoSearchTriggered(true);
    }
    return;
  }

  // পুরনো লং ফরম্যাট (আগের লিংক কাজ করবে)
  const pYear = params.get('year');
  const pExam = params.get('exam');
  const pClass = params.get('class');
  const pRollId = params.get('rollid');
  if (pYear && pExam && pClass && pRollId) {
    setIsAutoSearching(true);
    setSearchYear(pYear);
    setSearchExam(mapExamFromUrl(pExam));
    setSearchClass(mapClassFromUrl(pClass));
    setSearchIdentifier(pRollId);
    setAutoSearchTriggered(true);
  }
}, []);

  
useEffect(() => {
  if (currentUser) {
    if (isClassAdminRaw) {
      setClassName(userFormattedClass);
    }
  }

  // 🔐 ONLY ADMIN MODE
  // Everyone needs sheet list for search
fetchAllExams();

}, [currentUser, isClassAdminRaw, userFormattedClass, isAdmin, isClassAdmin]);

  // Handle auto-search when published exams are loaded
  useEffect(() => {
  if (publishedExams.length > 0 && autoSearchTriggered) {
    setTimeout(() => {
      performSearch(searchClass, searchExam, searchYear, searchIdentifier);
      setAutoSearchTriggered(false);
    }, 500); // important delay
  }
}, [publishedExams, autoSearchTriggered]);

  
  const fetchAllExams = async () => {
    setIsFetching(true);
    setErrorMessage('');
    try {
    const roleParam = isAdmin ? '?role=admin' : '';

const response = await fetch(GOOGLE_SCRIPT_URL + roleParam, {
  method: 'GET',
        headers: { 'Content-Type': 'text/plain' },
        redirect: 'follow'
      });
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error('সার্ভার থেকে সঠিক ডাটা আসেনি। অনুগ্রহ করে Apps Script নতুন ভার্সনে Deploy করুন।');
      }
      
      if (result.status === 'success') {
        const validExams = (result.data || []).filter(sheet => String(sheet.sheetName).startsWith('['));
        const sorted = validExams.sort((a, b) => {
  const ta = parseSheetName(a.sheetName).timestamp || 0;
  const tb = parseSheetName(b.sheetName).timestamp || 0;
  return tb - ta; // নতুনটা আগে
});

setPublishedExams(sorted);
if (sorted.length > 0) {
          const latestInfo = parseSheetName(sorted[0].sheetName);
          
          // সার্চ এবং আপলোড ট্যাবে পরীক্ষা অটো-সিলেক্ট (যদি আগে থেকে সিলেক্ট করা না থাকে)
          setSearchExam(prev => prev || latestInfo.examName);
          setExamName(prev => prev || latestInfo.examName);
          
          // সালটিও রিসেন্ট ডাটা অনুযায়ী ডায়নামিক হবে (ডিফল্ট 2026 এর জায়গায়)
          setSearchYear(prev => (prev === '2026' || !prev) ? latestInfo.year : prev);
          setYear(prev => (prev === '2026' || !prev) ? latestInfo.year : prev);
        }
      } else {
        throw new Error(result.message || 'ডাটা লোড করতে সমস্যা হয়েছে।');
      }
    } catch (error) {
      setErrorMessage(error.message);
      setIsAutoSearching(false); 
    } finally {
      setIsFetching(false);
    }
  };

  const parseCSV = (text) => {
    const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
    return rows.map(row => {
      let inQuotes = false;
      let currentWord = '';
      let columns = [];
      for (let i = 0; i < row.length; i++) {
        let char = row[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          columns.push(currentWord.trim());
          currentWord = '';
        } else {
          currentWord += char;
        }
      }
      columns.push(currentWord.trim());
      return columns.map(col => col.replace(/^"(.*)"$/, '$1'));
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => setCsvData(parseCSV(event.target.result));
      reader.readAsText(selectedFile);
    } else {
      alert("অনুগ্রহ করে একটি সঠিক CSV ফাইল সিলেক্ট করুন।");
      e.target.value = null;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit', hour12: true 
    });
  };

  const handleUpload = async () => {
setShowUploadValidation(true);
    const classToBn = (cls) => {
  const map = {
    'Play': 'প্লে',
    'Nursery': 'নার্সারি',
    'KG': 'কেজি',
    'Class One': '১ম',
    'Class Two': '২য়',
    'Class Three': '৩য়',
    'Class Four': '৪র্থ',
    'Class Five': '৫ম',
    'Class Six': '৬ষ্ঠ',
    'Class Seven': '৭ম',
    'Class Eight': '৮ম',
    'Class Nine': '৯ম',
    'Class Ten': '১০ম'
  };
  return map[cls] || cls;
};

    if (!canManage) return; 
    
    // HARD SECURITY GUARD
    const finalClassName = isClassAdmin ? userFormattedClass : className;
    if (!csvData || csvData.length === 0) {
  setErrorMessage('CSV ডাটা পাওয়া যায়নি');
  setUploadStatus('error');
  return;
}



const headers = csvData[0];
const classIndex = headers.findIndex(h =>
  String(h).toLowerCase().includes('class')
);

if (classIndex === -1) {
  setErrorMessage('CSV ফাইলে Class কলাম পাওয়া যায়নি');
  setUploadStatus('error');
  return;
}

// CSV class collect
const csvClasses = csvData.slice(1).map(row => String(row[classIndex]).trim());
const uniqueClasses = [...new Set(csvClasses)];

// Selected class → Bangla
const selectedClassBn = classToBn(finalClassName);

// Compare
if (!uniqueClasses.includes(selectedClassBn)) {
  const csvClassName = uniqueClasses[0]; // CSV এর আসল ক্লাস

  setErrorMessage(`ভুল ক্লাস! এই CSV ফাইলটি ${csvClassName} শ্রেণির। আপনি সিলেক্ট করেছেন  ${selectedClassBn} শ্রেণি!`);
  setUploadStatus('error');
  return;
}


    if (!file || !examName || !year || !finalClassName || !publishDate) {
      setErrorMessage('সবগুলো তথ্য এবং ফাইল সঠিকভাবে দিন।');
      setUploadStatus('error');
      return;
    }

    setUploadStatus('loading');
        const timestamp = new Date(publishDate).getTime();
    
    // --- ফাইলের নাম থেকে ব্র্যাকেটের ভেতরের পারসেন্টেজ (%) বের করার ম্যাজিক লজিক ---
    let extraTag = "";
    if (examName === 'Final Result' && file) {
        // ఇది ফাইলের নামের ভেতর থেকে (গড় ২০% + ২০% + ৬০%) অংশটুকু খুঁজে বের করবে
        const match = file.name.match(/\(([^)]*%[^)]*)\)/); 
        if (match) {
            extraTag = `[${match[1].substring(0, 30)}]`; // শিটের নামের লিমিট ঠিক রাখতে ম্যাক্সিমাম ৩০ ক্যারেক্টার
        }
    }
    
    // extraTag টিকে sheetName এর সাথে যুক্ত করে দেওয়া হলো
    const sheetName = `[${finalClassName}][${examName}][${year}][${formatDateTime(publishDate)}][${timestamp}]${extraTag}`;

    const payload = {
  action: 'upload',
  sheetName,
  data: csvData,
  key: ADMIN_SECRET
};


    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.status === 'success') {
        setUploadStatus('success');
        fetchAllExams();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setErrorMessage(error.message);
      setUploadStatus('error');
    }
  };
  // ==========================================
  // RESULT DOWNLOAD FUNCTION
  // ==========================================
  const handleDownloadCSV = () => {
    if (!selectedExam || !selectedExam.data) {
        showToast('কোনো ডাটা পাওয়া যায়নি', 'error');
        return;
    }

    // ডাটাকে CSV ফরম্যাটে কনভার্ট করা হচ্ছে (হুবহু আপলোডের মতো)
    const csvContent = selectedExam.data.map(row => {
      return row.map(cell => {
        let cellStr = String(cell);
        // কমা (,) বা কোটেশন (") থাকলে সেগুলোকে সেফ করা হচ্ছে
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          cellStr = `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',');
    }).join('\n');

    // BOM (\ufeff) যুক্ত করে ফাইল জেনারেট করা হচ্ছে, যাতে বাংলা ফন্ট ঠিক থাকে
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${selectedExam.sheetName}.csv`; // 👈 গুগল শিটের অরিজিনাল নাম
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

const handleDelete = async (sheetName) => {
  if (!canManage) return;

  const sheetInfo = parseSheetName(sheetName);

  if (sheetInfo.timestamp && Date.now() > sheetInfo.timestamp) {
    showToast("পাবলিশ হওয়ার পর রেজাল্ট ডিলিট করা যাবে না!", "error");
    return;
  }

  if (!window.confirm('আপনি কি নিশ্চিত যে এই রেজাল্টটি ডিলিট করবেন?')) return;

  showToast("ডিলিট হচ্ছে...", "loading");

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
  action: 'delete',
  sheetName,
  key: ADMIN_SECRET
})

    });

    const result = await response.json();

  if (result.status === 'success') {
  hideToast();
  showToast("সফলভাবে ডিলিট করা হয়েছে!", "success");

  fetchAllExams();

  setTimeout(() => {
    if (selectedExam && selectedExam.sheetName === sheetName) {
      setSelectedExam(null);
    }
  }, 500); // half second delay
}
 else {
      throw new Error(result.message);
    }

  } catch (error) {
    hideToast();
    showToast("ডিলিট করতে সমস্যা হয়েছে!", "error");
  }
};
const performSearch = async (sClass, sExam, sYear, sId) => {
  setIsSearching(true);
  setSearchError('');
  setSearchResult(null);
setIsResultVisible(false);
  if (!sClass || !sExam || !sYear || !sId) {
    setSearchError('অনুগ্রহ করে সার্চের সবগুলো তথ্য দিন।');
    setIsSearching(false);
    return;
  }

  const prefix = `[${sClass}][${sExam}][${sYear}]`;

  const targetSheet = publishedExams.find(s =>
    s.sheetName.startsWith(prefix)
  );

  if (!targetSheet) {
    setSearchError(`রেজাল্ট এখনো পাবলিশ হয়নি। দয়া করে অপেক্ষা করুন।।`);
    setIsSearching(false);
    setIsAutoSearching(false);
    return;
  }
  // এখানে নতুন লজিকটি যোগ করতে হবে (টাইম লক)
  const targetSheetInfo = parseSheetName(targetSheet.sheetName);
  
  // যদি ইউজার এডমিন না হয় এবং বর্তমান সময় পাবলিশ টাইমের চেয়ে কম হয়
  if (!canManage && targetSheetInfo.timestamp && Date.now() < targetSheetInfo.timestamp) {
    const publishDateStr = new Date(targetSheetInfo.timestamp).toLocaleString('bn-BD');
    setSearchError(`রেজাল্ট এখনো পাবলিশ হয়নি। দয়া করে অপেক্ষা করুন।`);
    setIsSearching(false);
    setIsAutoSearching(false);
    return;
  }
  // 👆 ========================================== 👆
  try {
    let sheetData;

    // 👇 ক্যাশ (Cache) মেমোরি চেক করা হচ্ছে 👇
    if (cachedSheets && cachedSheets[targetSheet.sheetName]) {
      await new Promise(resolve => setTimeout(resolve, 1000));
        // মেমোরিতে থাকলে সরাসরি সেখান থেকে ডাটা নিয়ে নিবে (সার্ভারে রিকোয়েস্ট যাবে না)
        sheetData = cachedSheets[targetSheet.sheetName];
    } else {
        // মেমোরিতে না থাকলে সার্ভার থেকে আনবে
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'search',
            sheetName: targetSheet.sheetName,
            key: canManage ? ADMIN_SECRET : ""  // 👈 এই লাইনটি যোগ করতে হবে
          })
        });

        const result = await response.json();

        if (result.status !== 'success') {
          throw new Error(result.message);
        }

        sheetData = result.data;
        // ভবিষ্যতে দ্রুত সার্চের জন্য মেমোরিতে সেভ করে রাখা হলো
        setCachedSheets(prev => ({ ...prev, [targetSheet.sheetName]: sheetData }));
    }
    // 👆 ক্যাশ লজিক শেষ 👆

    const headers = sheetData[0];

        const idIndex = headers.findIndex(h =>
      String(h).split(' [')[0].trim().toLowerCase() === 'id'
    );

    const rollIndex = headers.findIndex(h =>
      String(h).split(' [')[0].trim().toLowerCase() === 'roll'
    );


    const normalizedSearchId = toEnNum(sId).trim();

    const studentRow = sheetData.slice(1).find(row => {
      const matchId =
        idIndex !== -1 &&
        toEnNum(row[idIndex]).trim() === normalizedSearchId;

      const matchRoll =
        rollIndex !== -1 &&
        toEnNum(row[rollIndex]).trim() === normalizedSearchId;

      return matchId || matchRoll;
    });

    if (!studentRow) {
      setSearchError('রেজাল্ট পাওয়া যায়নি।');
      return;
    }
      // --- ব্যাকগ্রাউন্ড লগিং লজিক শুরু (একচুল পরিবর্তন ছাড়া) ---
    const targetId = getVal(headers, studentRow, 'id');
    const targetRoll = getVal(headers, studentRow, 'roll');
    const targetName = getVal(headers, studentRow, 'namebn') !== '-' 
                       ? getVal(headers, studentRow, 'namebn') 
                       : getVal(headers, studentRow, 'name');

    // ব্রাউজার থেকে সার্চকারীর পরিচয় বের করা হচ্ছে (সেশন ট্র্যাকিং)
    let searcherName = localStorage.getItem('ardm_searcher_name');
    let searcherId = localStorage.getItem('ardm_searcher_id');

    // প্রথমবার সার্চ করলে ওই ব্যক্তিকেই সার্চকারী হিসেবে ধরে নেওয়া হবে
    if (!searcherName || !searcherId) {
        const randomNum = Math.floor(100000 + Math.random() * 900000); 
        
        searcherName = targetName;             // 👈 নাম আসলটাই থাকবে (যেটা সার্চ করেছে)
        searcherId = randomNum.toString();     // 👈 আইডি হিসেবে রেন্ডম নম্বর তৈরি হবে
        
        localStorage.setItem('ardm_searcher_name', searcherName);
        localStorage.setItem('ardm_searcher_id', searcherId);
    }

    // ব্যাকগ্রাউন্ডে ডাটা পাঠানো হচ্ছে (এটি রেজাল্ট লোডিং স্লো করবে না)
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'log_search',
        searcherName: searcherName, // যে সার্চ করছে তার নাম
        searcherId: searcherId,     // যে সার্চ করছে তার আইডি
        className: sClass,
        examName: sExam,
        year: sYear,
        searchId: normalizedSearchId,
        stdName: targetName,        // যার রেজাল্ট দেখা হচ্ছে তার নাম
        stdRoll: targetRoll,        // যার রোল দেখা হচ্ছে
        stdId: targetId             // যার আইডি দেখা হচ্ছে
      })
    }).catch(err => console.log("Silent Log Failed", err));
    // --- ব্যাকগ্রাউন্ড লগিং লজিক শেষ ---

    let highestMarks = [];

    headers.forEach((h, colIdx) => {
      let maxM = 0;
      sheetData.slice(1).forEach(r => {
        const val = Number(r[colIdx]);
        if (!isNaN(val)) maxM = Math.max(maxM, val);
      });
      highestMarks[colIdx] = maxM;
    });
const shortId = encodeShortId(sYear, sExam, sClass, sId);
window.history.pushState({ view: "marksheet" }, "", `?id=${shortId}`);
    setSearchResult({
      headers,
      data: studentRow,
      highestMarks,
      sheetInfo: parseSheetName(targetSheet.sheetName)
    });

  } catch (err) {
    setSearchError('রেজাল্ট পাওয়া যায়নি');
  } finally {
    setIsSearching(false);     // ✅ spinner stop
    setIsAutoSearching(false); // ✅ auto loader stop
  }
};


   const handleSearch = () => {
    setShowSearchValidation(true);
    if (!searchClass || !searchExam || !searchYear || !searchIdentifier) return;
    performSearch(searchClass, searchExam, searchYear, searchIdentifier);
  };

  const resetForm = () => {
    setFile(null);
    setCsvData([]);
    setExamName('');
    if (!isClassAdmin) setClassName(''); 
    setPublishDate('');
    setUploadStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

    const parseSheetName = (name) => {
    const parts = String(name).split('][').map(s => s.replace('[', '').replace(']', ''));
    return {
      className: parts[0] || 'অজানা',
      examName: parts[1] || 'অজানা',
      year: parts[2] || 'অজানা',
      date: parts[3] || 'অজানা',
      timestamp: parts[4] ? parseInt(parts[4]) : null,
      customWeight: parts[5] || null  // 👈 এই নতুন লাইনটি যোগ করুন
    };
  };


    const getVal = (headers, data, colName) => {
    // এখানেও includes এর বদলে exact match (===) ব্যবহার করা হয়েছে
    const idx = headers.findIndex(h => String(h).split(' [')[0].trim().toLowerCase() === colName.toLowerCase());
    return idx !== -1 ? String(data[idx]) : '-';
  };


   
  const classOptions = [
    {val: 'Play', label: 'প্লে (Play)'}, {val: 'Nursery', label: 'নার্সারি (Nursery)'},
    {val: 'Class One', label: '১ম (One)'}, {val: 'Class Two', label: '২য় (Two)'},
    {val: 'Class Three', label: '৩য় (Three)'}, {val: 'Class Four', label: '৪র্থ (Four)'},
    {val: 'Class Five', label: '৫ম (Five)'}, {val: 'Class Six', label: '৬ষ্ঠ (Six)'},
    {val: 'Class Seven', label: '৭ম (Seven)'}, {val: 'Class Eight', label: '৮ম (Eight)'},
    {val: 'Class Nine', label: '৯ম (Nine)'}, {val: 'Class Ten', label: '১০ম (Ten)'}
  ];

  const examOptions = [
  {val: '1st Terminal', label: 'প্রথম সাময়িক পরিক্ষা'},
  {val: '2nd Terminal', label: 'দ্বিতীয় সাময়িক পরিক্ষা'},
  {val: 'Half Yearly', label: 'অর্ধ-বার্ষিক পরিক্ষা'},
  {val: 'Annual', label: 'বার্ষিক পরীক্ষা'},
{val: 'Final Result', label: 'চূড়ান্ত ফলাফল (গড়)'}
];
  const yearOptions = [
    {val: '2025', label: '2025'}, {val: '2026', label: '2026'},
    {val: '2027', label: '2027'}
  ];
// ⏰ TIMER LOCK (FIRST PRIORITY)
if (!isPublished && !canBypassTimer) {
  return <ResultTimer targetDate={RESULT_PUBLISH_TIME} />;
}

  if (authLoading || isAutoSearching) {
  


    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 font-sans">
        <Loader2 className="animate-spin text-teal-600 mb-4" size={48} />
        <p className="text-slate-600 font-bold text-lg">রেজাল্ট খোঁজা হচ্ছে...</p>
      </div>
    );
  }

  // Filtered exams for Dashboard display
  const displayedExams = isClassAdmin 
    ? publishedExams.filter(exam => parseSheetName(exam.sheetName).className === userFormattedClass) 
    : publishedExams;

  // Header Title Logic securely generated
  const getHeaderTitle = () => {
    if (isAdmin) return 'এডমিন ড্যাশবোর্ড';
    if (isClassAdmin) return `${currentUser.classBn} শ্রেণি ড্যাশবোর্ড`;
    return 'স্টুডেন্ট প্যানেল';
  };
  // ==========================================
    // ==========================================
  // VIEW 1: FULL PAGE EXACT MARKSHEET (SCREEN & PRINT)
  // ==========================================
  if (searchResult) {
    const { headers, data, highestMarks, sheetInfo } = searchResult;
    const stdId = getVal(headers, data, 'id');
    const stdNameBn = getVal(headers, data, 'namebn') !== '-' ? getVal(headers, data, 'namebn') : getVal(headers, data, 'name');
    const stdClass = getVal(headers, data, 'class') !== '-' ? getVal(headers, data, 'class') : sheetInfo.className;
    const stdRoll = getVal(headers, data, 'roll');

const handleDownloadImage = async () => {
  setIsDownloading(true);

  const wrapper = printRef.current;
  if (!wrapper) return;

  const originalStyle = wrapper.getAttribute('style') || '';

  wrapper.style.display = 'block';
  wrapper.style.position = 'absolute';
  wrapper.style.top = '-99999px';
  wrapper.style.left = '0';
  wrapper.style.width = '794px';
  wrapper.style.height = '1123px';

  const tempStyle = document.createElement('style');
  tempStyle.innerHTML = `
    .signature-area { display: flex !important; }

    .print-container { background: #f0fdf4 !important; }
    .border-frame { border: 3px double #064e3b !important; }
    .inner-content { border: 1px solid #0d9488 !important; background: #fff !important; }

    .header-section {
       border-bottom: 3px solid #fde68a !important;
    }
    .inst-info h1 { color: #064e3b !important; }
    .inst-address { color: #064e3b !important; }
    
      .exam-badge {
      background: linear-gradient(135deg, #064e3b, #0f766e) !important;
      color: #fffff !important;
          }   
        .student-info-card {
      background: linear-gradient(135deg, #f0fdf4, #e0f2fe) !important;
      border: 2px solid #0d9488 !important;
    }
    .info-label { color: #064e3b !important; }
    .info-val { color: #0f172a !important; }
    .info-row { border-bottom-color: #99f6e4 !important; }

    .result-table th {
      background:  #064e3b !important;
      color: #ffffff !important;
      border-color: #0d9488 !important;
    }
    .result-table td {
      border-color: #d1fae5 !important;
      color: #0f172a !important;
    }
    .result-table td:first-child { color: #064e3b !important; font-weight: 800 !important; }
    .result-table tr:nth-child(even) { background-color: #f0fdf4 !important; }
    .result-table tr:nth-child(odd) { background-color: #ffffff !important; }

    .summary-container { border: 2px solid #064e3b !important; }
    .summary-title {
      background: linear-gradient(135deg, #064e3b, #0f766e) !important;
      color: #fde68a !important;
      border-bottom-color: #0d9488 !important;
    }
    .summary-content { background: #f0fdf4 !important; }
    .summary-badge {
      background: linear-gradient(135deg, #ffffff, #f0fdf4) !important;
      border: 1px solid #0d9488 !important;
      box-shadow: 0 2px 8px rgba(6,78,59,0.1) !important;
    }
    .sum-label { color: #0f766e !important; }
    .sum-val { color: #064e3b !important; }
.remark-area { border: 2px solid #064e3b !important; }
.remark-title { color: #064e3b !important; }

    .sig-line { border-top-color: #0d9488 !important; color: #064e3b !important; }
    .computer-credit { color: #0f766e !important; }
  `;
  document.head.appendChild(tempStyle);

  if (document.fonts) await document.fonts.ready;
  await new Promise(r => setTimeout(r, 400));

  const target = wrapper.querySelector('.print-container') || wrapper;

  try {
    const dataUrl = await toPng(target, {
      quality: 1,
      pixelRatio: 4,
      backgroundColor: '#f0fdf4',
    });

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${stdNameBn}_মার্কশিট_${sheetInfo.year}.png`;
    link.click();
  } catch (err) {
    alert('ইমেজ ডাউনলোড করতে সমস্যা হয়েছে।');
  } finally {
    wrapper.setAttribute('style', originalStyle);
    tempStyle.parentNode?.removeChild(tempStyle);
    setIsDownloading(false);
  }
};    
    const totalMarks = getVal(headers, data, 'total marks');
    const gpa = getVal(headers, data, 'gpa');
    const grade = getVal(headers, data, 'grade');
    const merit = getVal(headers, data, 'merit position');
    const status = getVal(headers, data, 'status');
    const isPass = String(status).toLowerCase().includes('pass') || status === '-';

        const printDate = new Date().toLocaleDateString('bn-BD');
    
    // --- ডাইনামিক পরীক্ষার নাম ---
    let displayExamName = examMap[sheetInfo.examName] || sheetInfo.examName;
    if (sheetInfo.examName === 'Final Result' && sheetInfo.customWeight) {
        displayExamName = `চূড়ান্ত ফলাফল (${sheetInfo.customWeight})`;
    }

    const ignoreCols = ['sl', 'id', 'name', 'namebn', 'roll', 'class', 'total marks', 'average (%)', 'full marks', 'highest mark', 'total gp', 'gpa', 'grade', 'merit position', 'status'];
    
    // অ্যাপ ডিজাইনের জন্য এক্সট্রা কিছু ডাটা ক্যালকুলেশন
    let calcGrandFull = 0;
    let calcGrandMarks = 0;
    let calcTotalGp = 0;
    let calcFailCount = 0;

    const subjects = headers.map((h, idx) => {
      let headerStr = String(h);
      if (!headerStr) return null;
      let rawName = headerStr.split(' [')[0].trim();
      if (ignoreCols.includes(rawName.toLowerCase())) return null;
      
      let full = headerStr.match(/\[(\d+)\]/) ? parseInt(headerStr.match(/\[(\d+)\]/)[1]) : 100;
      let matchedSubject = subjectsDB.find(s => s.short.toLowerCase() === rawName.toLowerCase());
      let displayName = matchedSubject ? matchedSubject.name : rawName;

      let mark = parseFloat(data[idx]) || 0;
      let percent = (mark / full) * 100;
      let gp = getGP(percent);
      let letterGrade = getGradeFromGP(gp);
      
      calcGrandFull += full;
      calcGrandMarks += mark;
      calcTotalGp += gp;
      if (percent < 33) calcFailCount++;

      return { name: displayName, full, mark, highest: highestMarks[idx], gp, grade: letterGrade, percent: percent };
    }).filter(Boolean);

    let calcAvg = calcGrandFull > 0 ? ((calcGrandMarks / calcGrandFull) * 100).toFixed(2) : 0;

    // ===== Dynamic padding =====
    let subCount = subjects.length;
    let pad = "4px 5px";   // default

    if(subCount <= 9){
        pad = "10px 5px";
    }
    else if(subCount <= 11){
        pad = "8px 5px";
    }
    else if(subCount <= 13){
        pad = "5.5px 5px";
    }
    const remarkText = generateSmartRemark(stdId, totalMarks, gpa, isPass, subjects);

    return (
      <>
    
<div className="no-print w-full min-h-screen" style={{
    background: 'linear-gradient(160deg, #f0f4f8 0%, #e8f4f0 50%, #eef2f7 100%)',
    fontFamily: "'Hind Siliguri','Noto Serif Bengali', sans-serif",
    paddingBottom: '40px'
}}>
    {/* Fonts */}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet" />

    {/* ── Sticky Top Action Bar ── */}
    <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.80)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(15,118,110,0.12)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px', gap: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
    }}>
        <button onClick={() => setSearchResult(null)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: '1.5px solid #e2e8f0',
            borderRadius: '50px', padding: '7px 14px',
            fontWeight: 700, fontSize: '13px', color: '#475569',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all .2s'
        }}>← পেছনে</button>

        <p style={{
            fontWeight: 800, fontSize: '14px', color: '#0f172a',
            textAlign: 'center', flex: 1, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{stdNameBn}</p>

        <button onClick={() => window.print()} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, #0f766e, #064e3b)',
            border: 'none', borderRadius: '50px', padding: '7px 16px',
            fontWeight: 700, fontSize: '13px', color: '#fff',
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(15,118,110,0.35)'
        }}>🖨️ প্রিন্ট</button>
    </div>

    {/* ── Main Container ── */}
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px' }}>

        {/* ── 1. PREMIUM HEADER CARD ── */}
        <div style={{
            background: 'linear-gradient(140deg, #064e3b 0%, #0f766e 55%, #0d9488 100%)',
            borderRadius: '24px', overflow: 'hidden',
            marginBottom: '14px', position: 'relative',
            boxShadow: '0 24px 64px rgba(6,78,59,0.40), 0 0 0 1px rgba(255,255,255,0.1) inset'
        }}>
            {/* Decorative dot-grid */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.07,
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%23fff'/%3E%3C/svg%3E")`,
                backgroundSize: '20px 20px'
            }}></div>
            {/* Glow orbs */}
            <div style={{
                position: 'absolute', top: '-60px', right: '-60px',
                width: '240px', height: '240px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)'
            }}></div>
            <div style={{
                position: 'absolute', bottom: '-40px', left: '-30px',
                width: '160px', height: '160px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(253,230,138,0.12), transparent 70%)'
            }}></div>

            <div style={{ position: 'relative', zIndex: 1, padding: '26px 22px 22px' }}>
                {/* School + Exam badge */}
                <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                    <p style={{
                        color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 700,
                        letterSpacing: '2.5px', textTransform: 'uppercase', margin: '0 0 8px'
                    }}>আবদুর রাজ্জাক দাখিল মাদ্রাসা</p>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: 'rgba(253,230,138,0.15)',
                        border: '1px solid rgba(253,230,138,0.45)',
                        borderRadius: '10px', padding: '7px 18px'
                    }}>
                        <span style={{ color: '#fde68a', fontSize: '15px', fontWeight: 900 }}>
                            {displayExamName} — {toBn(sheetInfo.year)}
                        </span>
                    </div>
                </div>

                {/* Student avatar + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{
                        width: '58px', height: '58px', borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(255,255,255,0.18)',
                        border: '2.5px solid rgba(255,255,255,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '26px', color: '#fff', fontWeight: 900,
                        backdropFilter: 'blur(10px)'
                    }}>
                        {stdNameBn ? stdNameBn.charAt(0) : 'শ'}
                    </div>
                    <div>
                        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 700, margin: '0 0 3px', letterSpacing: '1px', textTransform: 'uppercase' }}>শিক্ষার্থীর নাম</p>
                        <h1 style={{ color: '#fff', fontSize: '23px', fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{stdNameBn}</h1>
                    </div>
                </div>

                {/* Info 2×2 grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                        { icon: '🎓', label: 'শ্রেণি',   val: toBn(stdClass) },
                        { icon: '📋', label: 'রোল নং',  val: toBn(stdRoll)  },
                        { icon: '🪪', label: 'আইডি নং', val: toBn(stdId)    },
                    ].map((item, i) => (
                        <div key={i} style={{
                            background: 'rgba(255,255,255,0.12)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '14px', padding: '11px 14px',
                            backdropFilter: 'blur(8px)'
                        }}>
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 700, margin: '0 0 3px' }}>{item.icon} {item.label}</p>
                            <p style={{ color: '#fff', fontSize: '18px', fontWeight: 900, margin: 0 }}>{item.val}</p>
                        </div>
                    ))}
                    {/* Status tile */}
                    <div style={{
                        background: isPass ? 'rgba(34,197,94,0.20)' : 'rgba(239,68,68,0.20)',
                        border: `1px solid ${isPass ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)'}`,
                        borderRadius: '14px', padding: '11px 14px'
                    }}>
                        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 700, margin: '0 0 3px' }}>✦ ফলাফল</p>
                        <p style={{ color: isPass ? '#86efac' : '#fca5a5', fontSize: '18px', fontWeight: 900, margin: 0 }}>
                            {isPass ? '✓ উত্তীর্ণ' : '✗ অকৃতকার্য'}
                        </p>
                    </div>
                </div>
            </div>
        </div>

    {/* ── 2. চূড়ান্ত ফলাফল বিবরণী (Original Grid, Premium Redesign) ── */}
<div ref={resultAreaRef} style={{
    background: '#fff', borderRadius: '24px',
    padding: '22px', marginBottom: '14px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    position: 'relative', overflow: 'hidden'
}}>
    <h4 style={{ textAlign: 'center', fontWeight: 900, fontSize: '15px', color: '#064e3b', margin: '0 0 16px', letterSpacing: '0.5px' }}>
        ✦ ফলাফল বিবরণী
    </h4>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

        {/* মোট নম্বর */}
        <div style={{
            background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
            border: '1px solid #bbf7d0', borderRadius: '16px',
            padding: '16px', textAlign: 'center',
            animation: isResultVisible ? 'rBox .5s .10s both' : 'none', opacity: 0
        }}>
            <span style={{ display:'block', fontSize:'11px', color:'#15803d', fontWeight:700, marginBottom:'6px' }}>মোট নম্বর</span>
            <strong style={{ display:'block', fontSize:'30px', fontWeight:900, color:'#14532d' }}>
                <AnimatedNumber value={totalMarks} isVisible={isResultVisible} />
            </strong>
        </div>

        {/* পূর্ণমান */}
        <div style={{
            background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
            border: '1px solid #bfdbfe', borderRadius: '16px',
            padding: '16px', textAlign: 'center',
            animation: isResultVisible ? 'rBox .5s .20s both' : 'none', opacity: 0
        }}>
            <span style={{ display:'block', fontSize:'11px', color:'#1d4ed8', fontWeight:700, marginBottom:'6px' }}>পূর্ণমান</span>
            <strong style={{ display:'block', fontSize:'30px', fontWeight:900, color:'#1e3a8a' }}>
                <AnimatedNumber value={calcGrandFull} isVisible={isResultVisible} />
            </strong>
        </div>

        {/* গড় নম্বর */}
        <div style={{
            background: 'linear-gradient(135deg,#fefce8,#fef9c3)',
            border: '1px solid #fde68a', borderRadius: '16px',
            padding: '16px', textAlign: 'center',
            animation: isResultVisible ? 'rBox .5s .30s both' : 'none', opacity: 0
        }}>
            <span style={{ display:'block', fontSize:'11px', color:'#a16207', fontWeight:700, marginBottom:'6px' }}>গড় নম্বর (%)</span>
            <strong style={{ display:'block', fontSize:'30px', fontWeight:900, color:'#78350f' }}>
                <AnimatedNumber value={calcAvg} isVisible={isResultVisible} isDecimal={true} />
            </strong>
        </div>

        {/* মোট জিপি */}
        <div style={{
            background: 'linear-gradient(135deg,#fdf4ff,#f3e8ff)',
            border: '1px solid #e9d5ff', borderRadius: '16px',
            padding: '16px', textAlign: 'center',
            animation: isResultVisible ? 'rBox .5s .40s both' : 'none', opacity: 0
        }}>
            <span style={{ display:'block', fontSize:'11px', color:'#7c3aed', fontWeight:700, marginBottom:'6px' }}>মোট জিপি (GP)</span>
            <strong style={{ display:'block', fontSize:'30px', fontWeight:900, color:'#4c1d95' }}>
                <AnimatedNumber value={calcTotalGp} isVisible={isResultVisible} isDecimal={true} />
            </strong>
        </div>

        {/* GPA - full width premium */}
        <div style={{
            gridColumn: 'span 2',
            background: 'linear-gradient(140deg,#064e3b 0%,#0f766e 55%,#0d9488 100%)',
            borderRadius: '20px', padding: '24px 20px', textAlign: 'center',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(6,78,59,0.38)',
            animation: isResultVisible ? 'rBox .6s .50s both' : 'none', opacity: 0
        }}>
            <div style={{
                position:'absolute', top:'-50px', left:'50%', transform:'translateX(-50%)',
                width:'260px', height:'140px',
                background:'radial-gradient(ellipse,rgba(255,255,255,.18),transparent 70%)',
                pointerEvents:'none'
            }}></div>
            <div style={{
                position:'absolute', top:0, right:0, width:'120px', height:'120px',
                background:'radial-gradient(circle at top right,rgba(253,230,138,.15),transparent 70%)'
            }}></div>
            <span style={{ display:'block', color:'rgba(255,255,255,.6)', fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:'10px', position:'relative' }}>
                অর্জিত জিপিএ (GPA)
            </span>
            <strong style={{ display:'block', fontSize:'58px', fontWeight:900, color:'#fff', lineHeight:1, position:'relative' }}>
                <AnimatedNumber
                    value={!isNaN(parseFloat(toEnNum(gpa))) ? parseFloat(toEnNum(gpa)) : 0}
                    isVisible={isResultVisible} isDecimal={true} isEnglish={true}
                />
            </strong>
            <small style={{ display:'block', marginTop:'8px', fontWeight:900, color:'#fde68a', fontSize:'24px', position:'relative' }}>{grade}</small>
        </div>

        {/* মেধা স্থান */}
        <div style={{
            background: 'linear-gradient(135deg,#fff7ed,#ffedd5)',
            border: '1px solid #fed7aa', borderRadius: '16px',
            padding: '16px', textAlign: 'center',
            animation: isResultVisible ? 'rBox .5s .60s both' : 'none', opacity: 0
        }}>
            <span style={{ display:'block', fontSize:'11px', color:'#c2410c', fontWeight:700, marginBottom:'6px' }}>মেধা স্থান</span>
            <strong style={{ display:'block', fontSize:'38px', fontWeight:900, color:'#7c2d12' }}>
                {merit && merit !== '-' ? toBn(merit) : '--'}
            </strong>
        </div>

        {/* স্ট্যাটাস */}
        <div style={{
            background: isPass ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#fff1f2,#fee2e2)',
            border: `1px solid ${isPass ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '16px', padding: '16px', textAlign: 'center',
            animation: isResultVisible ? 'rBox .5s .70s both' : 'none', opacity: 0
        }}>
            <span style={{ display:'block', fontSize:'11px', color: isPass ? '#15803d' : '#dc2626', fontWeight:700, marginBottom:'6px' }}>স্ট্যাটাস</span>
            <strong style={{ display:'block', fontSize:'22px', fontWeight:900, color: isPass ? '#14532d' : '#7f1d1d' }}>
                {isPass ? '✓ উত্তীর্ণ' : '✗ অকৃতকার্য'}
            </strong>
        </div>

        {/* ফেল কাউন্ট */}
        {calcFailCount > 0 && (
            <div style={{
                gridColumn: 'span 2',
                background: 'linear-gradient(135deg,#fff1f2,#fee2e2)',
                border: '1px solid #fecaca', borderRadius: '16px',
                padding: '16px', textAlign: 'center',
                animation: isResultVisible ? 'rBox .5s .80s both' : 'none', opacity: 0
            }}>
                <span style={{ display:'block', fontSize:'11px', color:'#dc2626', fontWeight:700, marginBottom:'4px' }}>ফেল করেছেন</span>
                <strong>
                    <span style={{ fontSize:'30px', fontWeight:900, color:'#991b1b' }}>
                        <AnimatedNumber value={calcFailCount} isVisible={isResultVisible} />
                    </span>
                    <span style={{ fontSize:'18px', fontWeight:700, color:'#7f1d1d', marginLeft:'5px' }}>টি বিষয়ে</span>
                </strong>
            </div>
        )}
    </div>

    <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rBox {
            0%   { opacity:0; transform:scale(.85) translateY(14px); }
            100% { opacity:1; transform:scale(1)   translateY(0);    }
        }
    ` }} />
</div>
{/* ── 3. SUBJECT RESULT CARDS ── */}
{/* ── 3. SUBJECT RESULT CARDS ── */}
<div style={{ marginBottom: '14px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', padding: '0 2px' }}>
        <div style={{ width: '4px', height: '22px', borderRadius: '4px', background: 'linear-gradient(180deg, #0f766e, #2563eb)', flexShrink: 0 }}></div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>বিষয়ভিত্তিক ফলাফল</h3>
        <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '11px', fontWeight: 700, borderRadius: '50px', padding: '2px 10px', border: '1px solid #e2e8f0' }}>
            {toBn(subjects.length)}টি বিষয়
        </span>
    </div>

    {/* নতুন কম্পোনেন্ট ব্যবহার করা হয়েছে, ref বা ইনডেক্স ডিলের আর প্রয়োজন নেই */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '10px' }}>
        {subjects.map((sub, i) => (
            <AnimatedSubjectCard key={i} sub={sub} />
        ))}
    </div>
</div>
        {/* ── 4. REMARK BOX ── */}
        {remarkText && (
            <div style={{
                background: '#fff', borderRadius: '18px',
                borderLeft: '4px solid #0f766e',
                border: '1px solid #e2f5f1', borderLeftWidth: '4px', borderLeftColor: '#0f766e',
                padding: '18px 20px', marginBottom: '14px',
                boxShadow: '0 2px 16px rgba(15,118,110,0.06)'
            }}>
                <p style={{
                    color: '#0f766e', fontSize: '10px', fontWeight: 700,
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                    margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                    <span style={{ fontSize: '14px' }}>✦</span> শ্রেণি শিক্ষকের মন্তব্য
                </p>
                <p style={{
                    color: '#374151', fontSize: '15px', fontWeight: 600,
                    fontStyle: 'italic', lineHeight: 1.75, margin: 0
                }}>
                    <TypewriterText text={remarkText} />
                </p>
            </div>
        )}

        {/* ── 5. ACTION BUTTONS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
             <button 
    onClick={() => {
        if (!isDownloading) handleDownloadImage();
    }} 
    disabled={isDownloading}
    className="active:scale-95 transition-all duration-200"
    style={{
        background: 'linear-gradient(135deg, #0f766e, #064e3b)',
        color: '#fff', 
        border: 'none', 
        borderRadius: '16px',
        padding: '17px', 
        fontSize: '15px', 
        fontWeight: 800,
        cursor: isDownloading ? 'not-allowed' : 'pointer', 
        fontFamily: 'inherit',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '8px',
        boxShadow: '0 10px 28px rgba(15,118,110,0.38)',
        opacity: isDownloading ? 0.8 : 1
    }}
>
    {isDownloading ? (
        <>
            <Loader2 className="w-5 h-5 animate-spin" />
            ডাউনলোড হচ্ছে...
        </>
    ) : (
        <>
            <Download className="w-5 h-5" />
            মার্কশিট ডাউনলোড করুন
        </>
    )}
</button>
            <button onClick={() => {
                const msg = `আসসালামু আলাইকুম, আমি *${stdNameBn}* (রোল: ${toBn(stdRoll)}, আইডি: ${toBn(stdId)}, শ্রেণি: ${toBn(stdClass)})। আমি রেজাল্ট সংক্রান্ত একটি অভিযোগ/মতামত জানাতে চাচ্ছি।`;
                window.open(`whatsapp://send?phone=8801610988489&text=${encodeURIComponent(msg)}`);
            }} style={{
                background: '#fff', color: '#1a1a2e',
                border: '1.5px solid #e2e8f0', borderRadius: '16px',
                padding: '15px', fontSize: '14px', fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
            }}>
                <span style={{ color: '#25D366', fontSize: '18px' }}>💬</span> অভিযোগ / মতামত জানান
            </button>

            <button onClick={() => setSearchResult(null)} style={{
                background: 'transparent', color: '#64748b',
                border: '1.5px solid #e2e8f0', borderRadius: '16px',
                padding: '14px', fontSize: '14px', fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>← আবার খুঁজুন</button>
        </div>

        {/* Footer */}
        {/* Footer */}
<div className="no-print" style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontWeight: 600, marginTop: '20px' }}>
    <p style={{ margin: '0 0 4px' }}>© 2026 আবদুর রাজ্জাক দাখিল মাদ্রাসা</p>
    <p style={{ margin: 0 }}>
        ডেভলপার: <a 
            href="https://www.facebook.com/raisulislamsaied" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
                color: '#0f766e', 
                fontWeight: 800, 
                textDecoration: 'none', 
                cursor: 'pointer' 
            }}
            onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
        >
            রায়সুল ইসলাম সাঈদ
        </a>
    </p>
</div>

    </div>

    {/* Global animation keyframes */}
    <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sfUp {
            from { opacity: 0; transform: translateY(14px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
    ` }} />
</div>
        {/* =========================================================
            PRINT VIEW (হুবহু আপনার দেওয়া অরিজিনাল কোড)
            ========================================================= */}
        <div ref={printRef} className="hidden print:block w-full">
            <div className="min-h-screen bg-white print:py-0 print:bg-white flex flex-col items-center justify-start pb-5 stopbrack">

                <div className="w-full flex justify-center no-print-bg print-container-wrapper ">
                    <div className="print-container  print:shadow-none">
                        <div className="border-frame">
                            <div className="inner-content">
                                <div className="header-section">
                                    <div className="inst-info">
                                        <h1>আবদুর রাজ্জাক দাখিল মাদ্রাসা</h1>
                                        <div className="inst-address">গ্রাম: মীরেরখীল, ডাকঘর: সরফভাটা, থানা: রাঙ্গুনিয়া, জেলা: চট্টগ্রাম।</div>
                                        <div className="exam-badge">{displayExamName} - {toBn(sheetInfo.year)}</div>
                                    </div>
                                </div>

                                <div className="student-info-card">
                                    <div className="info-column">
                                        <div className="info-row">
                                            <span className="info-label">আইডি নং:</span>
                                            <span className="info-val">{toBn(stdId)}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">নাম:</span>
                                            <span className="info-val">{stdNameBn}</span>
                                        </div>
                                    </div>
                                    <div className="info-column">
                                        <div className="info-row">
                                            <span className="info-label">শ্রেণি:</span>
                                            <span className="info-val">{toBn(stdClass)}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="info-label">রোল নং:</span>
                                            <span className="info-val">{toBn(stdRoll)}</span>
                                        </div>
                                    </div>
                                </div>

                                <table className="result-table">
                                    <thead>
                                        <tr>
                                            <th width="35%">বিষয়ের নাম</th>
                                            <th width="12%">পূর্ণমান</th>
                                            <th width="15%">প্রাপ্ত নম্বর</th>
                                            <th width="15%">সর্বোচ্চ</th>
                                            <th width="10%">জিপি</th>
                                            <th width="13%">গ্রেড</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subjects.map((sub, i) => (
                                            <tr key={i}>
                                                <td>{sub.name}</td>
                                                <td>{toBn(sub.full)}</td>
                                                <td>{toBn(sub.mark)}</td>
                                                <td>{toBn(sub.highest)}</td>
                                                <td>{sub.gp.toFixed(2)}</td>
                                                <td>{sub.grade}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="summary-container">
                                    <div className="summary-title">চূড়ান্ত ফলাফল বিবরণী</div>
                                    <div className="summary-content">
                                        <div className="summary-badge">
                                            <span className="sum-label">মোট নম্বর</span>
                                            <span className="sum-val">{toBn(totalMarks)}</span>
                                        </div>
                                        <div className="summary-badge">
                                            <span className="sum-label">জিপিএ</span>
                                            <span className="sum-val">{!isNaN(parseFloat(gpa)) ? parseFloat(gpa).toFixed(2) : gpa}</span>
                                        </div>
                                        <div className="summary-badge">
                                            <span className="sum-label">গ্রেড</span>
                                            <span className="sum-val">{grade}</span>
                                        </div>
                                        <div className="summary-badge">
                                            <span className="sum-label">মেধা স্থান</span>
                                            <span className="sum-val">{toBn(merit)}</span>
                                        </div>
                                        <div className="summary-badge">
                                            <span className="sum-label">ফলাফল</span>
                                            <span className="sum-val" dangerouslySetInnerHTML={{ __html: isPass ? '<span style="color:#155724;">উত্তীর্ণ</span>' : '<span style="color:#721c24;">অকৃতকার্য</span>' }} />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* 👈 যদি বিষয় ৬টির বেশি হয় তবে প্রিন্ট পেজে রিমার্ক হাইড হবে */}
                                {(remarkText && subCount <= 6) && (
                                    <div className="remark-area" style={{ marginTop: '15px', marginBottom: '40px', border: '1px solid #000', borderRadius: '8px', padding: '12px 16px', background: '#fff', boxSizing: 'border-box' }}>
                                        <div  style={{ fontSize: '15px', color: '#000', lineHeight: 1.5, textAlign: 'justify' }}>
                                            <span className="remark-title" style={{ fontWeight: 800, fontSize: '16px' }}>শ্রেণি শিক্ষকের মন্তব্য:</span> <br />
                                            <span className="remark-text" style={{ fontWeight: 600, fontStyle: 'italic', marginTop: '4px', display: 'inline-block' }}>{remarkText}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="signature-area">
                                    <div className="sig-block">
                                        <div className="sig-line">অভিভাবক</div>
                                    </div>
                                    <div className="sig-block">
                                        <div className="sig-line">শ্রেণি শিক্ষক</div>
                                    </div>
                                    <div className="sig-block">
                                        <div className="sig-line">সুপারিনটেনডেন্ট</div>
                                    </div>
                                </div>

                                <div className="computer-credit">
                                    ইস্যু তারিখ: {toBn(printDate)} | সফটওয়্যার ডেভলপার: রায়সুল ইসলাম সাঈদ
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{ __html: `
                  @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap');
                  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700&display=swap');

                  .font-bengali {
                    font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif;
                  }

                  @media screen {
                    .print-only-view { display: none !important; }
                  }

                  @media print {
                    @page { margin: 0mm; size: A4; page-break-after: avoid; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white; margin: 0mm !important; }
                    html, body {
    width: 210mm;
    height: 297mm;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important; /* এটি যুক্ত করুন */
  }
                    .no-print { display: none !important; }
                    .print-container { transform: none !important; }
                    .signature-area { display: flex !important ;}
                    .app-bg-override { background: white !important; }
                  }

                  

                  .print-container {
                    font-family: 'Hind Siliguri','Noto Sans Bengali', sans-serif;
                    width: 210mm;
                    height: 297mm;
                    padding: 10mm; 
                    margin: 0 auto;
                    background: white;
                    box-sizing: border-box;
                    page-break-after: avoid;
                    position: relative;
                    display: block;
                    
            overflow: hidden !important; /* পেজের বাইরের সবকিছু হাইড করে দিবে */
                  }

                  .border-frame {
                    border: 3px double #000;
                    padding: 5px;
                    height: 100%;
                    box-sizing: border-box;
                    position: relative;
                  }
                  
                  .inner-content {
                    border: 1px solid #ddd;
                    height: 100%; 
                    padding: 20px;
                    box-sizing: border-box;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                  }

                  .header-section {
                    text-align: center;
                    border-bottom: 2px solid #000;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                  }

                  .inst-info h1 { font-size: 36px; color: #000; margin: 0; font-weight: 700; line-height: 1.2; }
                  .inst-address { font-size: 15px; color: #222; margin: 3px 0; font-weight: 500; }

                  .exam-badge {
                    background: black; color: white; padding: 5px 25px; border-radius: 20px;
                    font-size: 16px; font-weight: 600; display: inline-block; margin-top: 8px;
                  }

                  .student-info-card {
                    display: flex; justify-content: space-between; background-color: #fff;
                    border: 1px solid #000; border-radius: 8px; padding: 12px 20px; margin-bottom: 15px;
                  }

                  .info-column { display: flex; flex-direction: column; gap: 6px; width: 48%; }
                  .info-row { display: flex; border-bottom: 1px dashed #b1dfbb; padding-bottom: 3px; font-size: 16px; font-weight: bold; }
                  .info-row:last-child { border-bottom: none; }
                  .info-label { font-weight: 700; color: #000; width: 80px; }
                  .info-val { font-weight: bold; color: #000; flex-grow: 1; }

                  .result-table { width: 100%; border-collapse: collapse; font-size: 15px; margin-bottom: 10px; }
                  .result-table th { background-color: #eee; color: #000; padding: ${pad}; text-align: center; font-weight: bold; border: 1px solid #000; }
                  .result-table td { border: 1px solid #000; padding: ${pad}; text-align: center; color: #000; font-weight: bold; }
                  .result-table td:first-child { text-align: left; padding-left: 20px; font-weight: 700; color: #000; }
                  .result-table tr:nth-child(even) { background-color: #f9fff9; }

                  .summary-container {
                    margin-top: 10px; margin-bottom: 0px; border: 2px solid #000; border-radius: 8px;
                    padding: 0; width: 100%; box-sizing: border-box; background-color: #fff; overflow: hidden;
                  }

                  .summary-title {
                    background-color: #eee; color: #000; border-bottom: 1px solid #000;
                    text-align: center; font-weight: bold; padding: 6px; font-size: 16px;
                  }

                  .summary-content {
                    padding: 15px; display: flex; justify-content: space-around; align-items: center;
                    flex-wrap: nowrap; gap: 15px; background: #fdfffd;
                  }

                  .summary-badge {
                    display: flex; flex-direction: column; align-items: center; background: #fff;
                    border: 1px solid #d4edda; border-radius: 5px; padding: 5px 15px; min-width: 90px;
                    box-shadow: 0 2px 3px rgba(0,0,0,0.05);
                  }

                  .sum-label { font-size: 14px; color: #222; font-weight: bold; margin-bottom: 3px; }
                  .sum-val { font-size: 17px; font-weight: bold; color: #000; }

                  .signature-area { position: absolute; bottom: 30px; left: 30px; right: 30px; display: none; justify-content: space-between; }
                  .sig-block { text-align: center; width: 160px; }
                  .sig-line { border-top: 1px solid #222; padding-top: 5px; font-size: 14px; font-weight: 700; color: #222; }

                  .computer-credit { position: absolute; bottom: 8px; width: 100%; text-align: center; font-size: 13px; font-weight: bold; color: #222; left: 0; }
                `}} />
            </div>
        </div>

      </>
    );
  }
  // ==========================================
  // VIEW 2: FULL PAGE TABLE FOR SELECTED EXAM
  // ==========================================
  if (selectedExam && canManage) {
    const info = parseSheetName(selectedExam.sheetName);
const isExpired = info.timestamp && Date.now() > info.timestamp;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {toast.show && (
  <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999]">
    <div className={`
      flex items-center gap-3 px-6 py-3 rounded-xl shadow-2xl font-bold text-white
      ${toast.type === 'success' ? 'bg-green-600' : ''}
      ${toast.type === 'error' ? 'bg-red-600' : ''}
      ${toast.type === 'loading' ? 'bg-slate-800' : ''}
    `}>
      
      {toast.type === 'loading' && (
        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
      )}

      {toast.type === 'success' && "✔"}
      {toast.type === 'error' && "✖"}

      <span>{toast.message}</span>
    </div>
  </div>
)}

        <div className="bg-white shadow-sm border-b border-slate-200 px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setSelectedExam(null);
               
              }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {parseSheetName(selectedExam.sheetName).className} - {parseSheetName(selectedExam.sheetName).examName}
              </h2>
              <p className="text-sm text-teal-600 font-medium mt-0.5">
                সর্বমোট এন্ট্রি: {selectedExam.data.length > 1 ? selectedExam.data.length - 1 : 0} জন ছাত্র
              </p>
            </div>
          </div>
              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <button 
            onClick={handleDownloadCSV}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border border-emerald-200 w-full md:w-auto"
          >
            <Download className="w-4 h-4" /> রেজাল্ট ডাউনলোড করুন
          </button>
          
          {!isExpired && (
            <button 
              onClick={() => handleDelete(selectedExam.sheetName)}
              className="bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border border-red-200 w-full md:w-auto"
            >
              <Trash2 className="w-4 h-4" /> এই রেজাল্টটি ডিলিট করুন
            </button>
          )}
        </div>

        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <tr>
                    {selectedExam.data[0]?.map((header, idx) => (
                      <th key={idx} className="p-4 font-bold tracking-wide">
                        {String(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedExam.data.slice(1).map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-slate-100 last:border-0 hover:bg-teal-50/50 transition-colors">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="p-4 text-slate-700 font-medium">
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: MAIN FULL PAGE DASHBOARD
  // ==========================================
  return (
    <div className={`w-full min-h-screen bg-slate-50 font-sans text-slate-800 overflow-x-hidden ${canManage ? 'pb-24 md:pb-0' : ''}`}>
{toast.show && (
  <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in">
    <div className={`
      flex items-center gap-3 px-6 py-3 rounded-xl shadow-2xl font-bold text-white
      ${toast.type === 'success' ? 'bg-green-600' : ''}
      ${toast.type === 'error' ? 'bg-red-600' : ''}
      ${toast.type === 'loading' ? 'bg-slate-800' : ''}
    `}>
      
      {toast.type === 'loading' && (
        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
      )}

      {toast.type === 'success' && "✔"}
      {toast.type === 'error' && "✖"}

      <span>{toast.message}</span>
    </div>
  </div>
)}

              {/* ==========================================
          PREMIUM GLASSMORPHISM NAVBAR (Fixed & Elegant)
          ========================================== */}
      <nav className="fixed top-0 w-full bg-white/30 backdrop-blur-2xl border-b border-slate-200/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          
          {/* Desktop View */}
          <div className="hidden md:flex justify-between items-center h-[72px]">
            {/* Brand */}
            <div className="flex items-center gap-3.5">
              <img 
                src="logo.png" 
                alt="Madrasha Logo" 
                className="w-11 h-11 object-contain cursor-pointer transition-transform hover:scale-105 drop-shadow-sm"
                onClick={() => navigate("/")}
              />
              <div className="leading-tight mt-0.5">
                <h1 className="text-[20px] font-black text-slate-800 tracking-tight cursor-pointer hover:text-teal-700 transition-colors" onClick={() => navigate("/")}>
                  আবদুর রাজ্জাক দাখিল মাদ্রাসা
                </h1>
                <p className="text-[11px] text-teal-600 font-bold uppercase tracking-widest mt-0.5">{getHeaderTitle()}</p>
              </div>
            </div>

            {/* Admin Controls */}
            <div className="flex items-center gap-3">
              {canManage && (
                <div className="flex bg-slate-100/60 p-1.5 rounded-xl border border-slate-200/60 backdrop-blur-md">
                  <button 
                    onClick={() => { window.history.pushState({ view: "dashboard" }, ""); setActiveTab('dashboard'); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[13px] transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-white text-teal-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                  >
                    <LayoutDashboard className="w-4 h-4" /> ড্যাশবোর্ড
                  </button>
                  <button 
                    onClick={() => { window.history.pushState({ view: "upload" }, ""); setActiveTab('upload'); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[13px] transition-all duration-300 ${activeTab === 'upload' ? 'bg-white text-teal-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                  >
                    <UploadCloud className="w-4 h-4" /> আপলোড
                  </button>
                  <button 
                    onClick={() => { window.history.pushState({ view: "search" }, ""); setActiveTab('search'); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[13px] transition-all duration-300 ${activeTab === 'search' ? 'bg-white text-teal-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                  >
                    <Search className="w-4 h-4" /> সার্চ
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile View */}
          <div className="flex md:hidden justify-between items-center h-[64px]">
            <div className="flex items-center gap-3">
              <img 
                src="logo.png" 
                alt="Madrasha Logo" 
                className="w-9 h-9 object-contain cursor-pointer shrink-0 drop-shadow-sm"
                onClick={() => navigate("/")}
              />
              <div className="leading-tight mt-0.5">
                <p className="text-[11px] text-teal-600 font-bold uppercase tracking-widest mb-0.5">{getHeaderTitle()}</p>
                <h1 className="text-[17px] sm:text-[17px] font-black text-slate-800 tracking-tight">আবদুর রাজ্জাক দাখিল মাদ্রাসা</h1>
              </div>
            </div>
            
                    </div>

        </div>
      </nav>

      {/* Main Content Area */}
     <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 pt-20 overflow-x-hidden">

        
        {/* =========== TAB 1: DASHBOARD (Admin Only) =========== */}
        {activeTab === 'dashboard' && canManage && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-end mb-6 md:mb-8 md:border-b border-slate-200 pb-2 md:pb-5">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">পাবলিশড রেজাল্ট সমূহ</h2>
                <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">আপনার সার্ভারে আপলোড করা সবগুলো রেজাল্ট</p>
              </div>
              <div className="flex items-center gap-2">
  <button 
    onClick={() => navigate("/result-analysis")} 
    className="bg-white border border-slate-300 text-slate-700 px-3 md:px-4 py-2 md:py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
  >
    <BarChart3 className="w-4 h-4" />
    <span className="hidden md:inline">রেজাল্ট এনালাইসিস</span>
  </button>
  <button 
    onClick={fetchAllExams} 
    className="bg-white border border-slate-300 text-slate-700 px-3 md:px-4 py-2 md:py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
  >
    <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-teal-600' : ''}`} /> 
    <span className="hidden md:inline">{isFetching ? 'লোড হচ্ছে...' : 'রিফ্রেশ করুন'}</span>
  </button>
</div>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 md:p-5 rounded-xl mb-6 md:mb-8 text-sm font-bold flex gap-3 shadow-sm">
                <AlertCircle className="w-5 h-5 shrink-0" /> <p>{errorMessage}</p>
              </div>
            )}

            {isFetching && displayedExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 md:py-32 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-10 md:w-12 h-10 md:h-12 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-bold text-base md:text-lg">ডাটা লোড হচ্ছে...</p>
              </div>
            ) : displayedExams.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 md:p-16 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 md:w-20 h-16 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100">
                  <LayoutDashboard className="w-8 md:w-10 h-8 md:h-10 text-slate-300" />
                </div>
                <h3 className="text-slate-700 font-bold text-lg md:text-xl mb-2">কোনো রেজাল্ট নেই</h3>
                <p className="text-slate-400 text-xs md:text-sm mb-8 max-w-sm">এখনো কোনো রেজাল্ট পাবলিশ করা হয়নি। "রেজাল্ট আপলোড" ট্যাব থেকে নতুন রেজাল্ট আপলোড করুন।</p>
                <button 
                 onClick={() => {
  window.history.pushState({ view: "upload" }, "");
  setActiveTab('upload');
}}

                  className="bg-teal-600 hover:bg-teal-700 text-white px-6 md:px-8 py-3 rounded-xl font-bold shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all"
                >
                  <PlusCircle className="w-5 h-5" /> নতুন আপলোড শুরু করুন
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {displayedExams.map((exam, index) => {
                  const info = parseSheetName(exam.sheetName);
                  return (
                    <div 
                      key={index} 
                    onClick={async () => {

  // 🔥 ADMIN হলে already data আছে
  if (isAdmin && exam.data) {
    window.history.pushState({ view: "exam" }, "");


    setSelectedExam(exam);
    return;
  }

  // 🔽 Class admin / Public → তখন fetch
  showToast("ডাটা লোড হচ্ছে...", "loading");

    try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'search',
        sheetName: exam.sheetName,
        key: canManage ? ADMIN_SECRET : ""  // 👈 এখানেও এই লাইনটি যোগ করতে হবে
      })
    });

    const result = await res.json();

    if (result.status === 'success') {
      hideToast();
      window.history.pushState({ view: "exam" }, "");

      setSelectedExam({
        ...exam,
        data: result.data
      });
    } else {
      hideToast();
      showToast("ডাটা লোড করা যায়নি", "error");
    }

  } catch (e) {
    hideToast();
    showToast("সার্ভার সমস্যা", "error");
  }
}}


                      className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-teal-300 hover:shadow-md cursor-pointer transition-all group flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-4 md:mb-5">
                        <div className="w-12 md:w-14 h-12 md:h-14 bg-teal-50 rounded-xl flex items-center justify-center border border-teal-100 group-hover:bg-teal-600 transition-colors">
                          <BookOpen className="w-6 md:w-7 h-6 md:h-7 text-teal-600 group-hover:text-white transition-colors" />
                        </div>
                        <span className="bg-slate-100 text-slate-600 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                          {info.year}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-extrabold text-slate-800 text-lg md:text-xl mb-1 truncate">{info.className}</h3>
                        <p className="text-teal-600 text-xs md:text-sm font-bold truncate">{info.examName}</p>
                      </div>

                      <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] md:text-xs font-medium">
                          <Clock className="w-3.5 md:w-4 h-3.5 md:h-4" /> {info.date}
                        </div>
                        <ChevronRight className="w-4 md:w-5 h-4 md:h-5 text-slate-300 group-hover:text-teal-600 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========== TAB 2: UPLOAD FORM (Admin Only) =========== */}
        {activeTab === 'upload' && canManage && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="mb-6 md:mb-8 border-b border-slate-200 pb-3 md:pb-5">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">নতুন রেজাল্ট আপলোড</h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">আপনার তৈরি করা CSV ফাইলটি এখানে আপলোড করুন</p>
            </div>
            
            {uploadStatus === 'success' ? (
              <div className="bg-white rounded-2xl p-8 md:p-12 text-center shadow-sm border border-slate-200">
                <div className="w-20 md:w-24 h-20 md:h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 md:mb-6 border border-emerald-100">
                  <CheckCircle className="w-10 md:w-12 h-10 md:h-12 text-emerald-500" />
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-2">সফলভাবে পাবলিশড!</h2>
                <p className="text-slate-500 text-sm md:text-base mb-8 md:mb-10 font-medium">আপনার রেজাল্ট শিটটি সফলভাবে গুগল শিটে সেভ করা হয়েছে।</p>
                <button 
                  onClick={resetForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-8 rounded-xl transition-colors w-full md:w-auto"
                >
                  আরেকটি ফাইল আপলোড করুন
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8 space-y-6 md:space-y-8">
                
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
  <SelectField 
    label="শ্রেণি নির্বাচন" icon={BookOpen} value={className} 
    onChange={e => { setClassName(e.target.value); setShowUploadValidation(false); }} 
    options={classOptions} disabled={isClassAdmin} 
    placeholder="ক্লাস সিলেক্ট করুন"
    error={showUploadValidation && !className} errorMessage="দয়া করে ক্লাস নির্বাচন করুন"
  />
  <SelectField 
    label="পরীক্ষার নাম" icon={FileType} value={examName} 
    onChange={e => { setExamName(e.target.value); setShowUploadValidation(false); }} 
    options={examOptions} 
    placeholder="পরীক্ষা সিলেক্ট করুন"
    error={showUploadValidation && !examName} errorMessage="দয়া করে পরীক্ষা নির্বাচন করুন"
  />
  <SelectField 
    label="সাল" icon={Calendar} value={year} 
    onChange={e => { setYear(e.target.value); setShowUploadValidation(false); }} 
    options={yearOptions} 
    placeholder="সাল সিলেক্ট করুন"
    error={showUploadValidation && !year} errorMessage="দয়া করে সাল নির্বাচন করুন"
  />
  
  <div className="space-y-1.5 w-full relative">
    <label className={`text-[12px] font-black uppercase tracking-widest pl-1 mb-1.5 flex items-center gap-1.5 transition-colors duration-300 text-slate-500`}>
      <Clock className="w-4 h-4" /> পাবলিশের সময়
    </label>
    <input 
      type="datetime-local" 
      value={publishDate} 
      onChange={(e) => { setPublishDate(e.target.value); setShowUploadValidation(false); }} 
      className={`w-full p-4 border rounded-xl text-slate-800 font-bold focus:outline-none transition-all duration-300 ${
        showUploadValidation && !publishDate 
          ? 'bg-red-50/50 border-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.15)]' 
          : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-teal-500 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.15)]'
      }`} 
    />
     {showUploadValidation && !publishDate && (
        <div className="text-red-500 text-[12px] font-bold pl-1 mt-1.5 flex items-center gap-1.5 animate-fade-in">
           <AlertCircle className="w-3.5 h-3.5" /> দয়া করে সময় নির্ধারণ করুন
        </div>
     )}
  </div>
</div>

                <div 
                  onClick={() => fileInputRef.current?.click()} 
                  className={`border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all ${file ? 'border-teal-500 bg-teal-50/50 shadow-sm' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
                >
                  <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  {file ? (
                    <div className="flex flex-col items-center">
                      <div className="w-16 md:w-20 h-16 md:h-20 bg-white shadow-sm border border-teal-100 rounded-full flex items-center justify-center mb-4">
                        <FileSpreadsheet className="w-8 md:w-10 h-8 md:h-10 text-teal-600" />
                      </div>
                      <h3 className="text-base md:text-lg font-bold text-slate-800">{file.name}</h3>
                      <p className="text-xs md:text-sm text-teal-600 font-bold mt-2 bg-teal-100/50 px-4 py-1.5 rounded-full">{csvData.length - 1} জন ছাত্রের রেজাল্ট পাওয়া গেছে</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 md:py-6">
                      <div className="w-16 md:w-20 h-16 md:h-20 bg-white shadow-sm border border-slate-200 rounded-full flex items-center justify-center mb-4 md:mb-5">
                        <UploadCloud className="w-8 md:w-10 h-8 md:h-10 text-slate-400" />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-slate-700">CSV ফাইল সিলেক্ট করুন</h3>
                      <p className="text-xs md:text-sm text-slate-500 font-medium mt-2">ক্লিক করুন অথবা এখানে আপনার ফাইলটি ড্রপ করুন</p>
                    </div>
                  )}
                </div>

                {uploadStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 md:p-5 rounded-xl text-sm font-bold flex gap-3 shadow-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" /> <p>{errorMessage}</p>
                  </div>
                )}

                <button 
                  onClick={handleUpload} 
                  disabled={uploadStatus === 'loading' || !file || !examName || !year || !className || !publishDate} 
                  className={`w-full py-4 md:py-5 rounded-xl font-bold text-base md:text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                    uploadStatus === 'loading' 
                      ? 'bg-slate-200 text-slate-400 shadow-none' 
                      : (!file || !examName || !year || !className || !publishDate) 
                        ? 'bg-slate-200 text-slate-400 shadow-none' 
                        : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/30'
                  }`}
                >
                  {uploadStatus === 'loading' ? (
                    <><div className="w-5 h-5 md:w-6 md:h-6 border-2 border-slate-400/30 border-t-slate-500 rounded-full animate-spin"></div> আপলোড হচ্ছে...</>
                  ) : (
                    <>রেজাল্ট পাবলিশ করুন <UploadCloud className="w-5 h-5 ml-1 md:ml-2" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========== TAB 3: SEARCH RESULT (For Everyone) =========== */}
             {/* =========== TAB 3: SEARCH RESULT (For Everyone) =========== */}
        {activeTab === 'search' && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            
                   {/* ==========================================
                ULTRA-PREMIUM HEADER SECTION (UPDATED)
                ========================================== */}
            <div className="relative mt-4 mb-7 md:mb-8 flex flex-col items-center text-center z-10">
              
              {/* পেছনের হালকা গ্লো (Decorative Glow with Pulse Animation) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-gradient-to-r from-teal-400/10 via-emerald-400/10 to-teal-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-[pulse_6s_infinite]"></div>

              {/* গ্রেডিয়েন্ট মেইন টাইটেল উইথ এনিমেশন (Animated Slide-up with Glow) */}
              <h2 className="text-3xl md:text-[42px] font-black tracking-tight mb-1 leading-tight group relative overflow-hidden pb-1 px-4">
                {/* অ্যানিমেটেড সাবল স্ক্র্যাচ ইফেক্ট */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-100/50 to-transparent -translate-x-full group-hover:animate-[shimmer_2.5s_infinite] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <span className="text-slate-800 drop-shadow-sm animate-[slideUp_0.8s_ease-out_forwards]">
                  রেজাল্ট 
                </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-500 ml-2 drop-shadow-sm animate-[slideUp_1s_ease-out_forwards]">
                  সার্চ করুন
                </span>
                
                {/* নিচের প্রিমিয়াম গ্লো বার (নিচের সাধারণ দাগের পরিবর্তে) */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500 shadow-[0_2px_10px_rgba(20,184,166,0.6)]"></div>
              </h2>

              {/* সুন্দর সাবটাইটেল */}
              <p className="text-[14px] md:text-[16px] text-slate-500 font-bold max-w-sm md:max-w-xl mx-auto leading-relaxed animate-[fadeIn_1.2s_ease-out_forwards]">
               শিক্ষার্থীর একাডেমিক ফলাফল এবং মার্কশিট দেখুন।
              </p>

            </div>

            {/* এর নিচে আপনার সাদা ফর্মের বক্স (bg-white p-5 md:p-8...) আগের মতোই থাকবে */}

            {/* এই সাদা বক্সের ভেতরেই সবকিছু থাকবে */}
            <div className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6 md:space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <SelectField 
                  label="শ্রেণি" icon={BookOpen} value={searchClass} 
                  onChange={e => { setSearchClass(e.target.value); setShowSearchValidation(false); setSearchError(''); }} 
                  options={classOptions} 
                  placeholder="শ্রেণি সিলেক্ট করুন"
                  error={showSearchValidation && !searchClass} errorMessage="দয়া করে শ্রেণি নির্বাচন করুন"
                />
                <SelectField 
                  label="পরীক্ষা" icon={FileType} value={searchExam} 
                  onChange={e => { setSearchExam(e.target.value); setShowSearchValidation(false); setSearchError(''); }} 
                  options={examOptions} 
                  placeholder="পরীক্ষা সিলেক্ট করুন"
                  error={showSearchValidation && !searchExam} errorMessage="দয়া করে পরীক্ষা নির্বাচন করুন"
                />
                <SelectField 
                  label="সাল" icon={Calendar} value={searchYear} 
                  onChange={e => { setSearchYear(e.target.value); setShowSearchValidation(false); setSearchError(''); }} 
                  options={yearOptions} 
                  placeholder="সাল সিলেক্ট করুন"
                  error={showSearchValidation && !searchYear} errorMessage="দয়া করে সাল নির্বাচন করুন"
                />
                
                <div className="space-y-1.5 w-full relative">
                  <label className={`text-[12px] font-black uppercase tracking-widest pl-1 mb-1.5 flex items-center gap-1.5 transition-colors duration-300 text-slate-500`}>
                    <Hash className="w-4 h-4" /> রোল অথবা আইডি নং
                  </label>
                  <input 
                    type="text" 
                    placeholder="যেমন: ১০১"
                    value={searchIdentifier} 
                    onChange={(e) => { setSearchIdentifier(e.target.value); setShowSearchValidation(false); setSearchError(''); }} 
                    className={`w-full p-4 border rounded-xl text-slate-800 font-bold focus:outline-none transition-all duration-300 placeholder:text-slate-300 placeholder:font-medium ${
                      showSearchValidation && !searchIdentifier 
                        ? 'bg-red-50/50 border-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.15)]' 
                        : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-teal-500 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.15)]'
                    }`} 
                  />
                  {showSearchValidation && !searchIdentifier && (
                      <div className="text-red-500 text-[12px] font-bold pl-1 mt-1.5 flex items-center gap-1.5 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5" /> রোল অথবা আইডি লিখতে হবে
                      </div>
                  )}
                </div>
              </div>

              {searchError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 md:p-5 rounded-xl text-sm font-bold flex gap-3 shadow-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" /> <p>{searchError}</p>
                </div>
              )}

              <button 
                onClick={handleSearch}
                disabled={isSearching}
                className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-500 text-white py-4 md:py-5 rounded-xl font-bold text-base md:text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-slate-900/20"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 md:w-6 h-5 md:h-6 animate-spin" />
                    খোঁজা হচ্ছে...
                  </>
                ) : (
                  <>
                    <Search className="w-5 md:w-6 h-5 md:h-6" />
                    রেজাল্ট খুঁজুন
                  </>
                )}
              </button>

            </div> {/* 👈 সাদা বক্সটি এখানে এসে বন্ধ হবে */}
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation Bar (Admin Only) */}
      {canManage && (
        <div className="md:hidden fixed bottom-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200 pb-safe pt-2 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-40">
          <div className="flex justify-around items-center pb-3 pt-1">
            <button 
              onClick={() => {
  window.history.pushState({ view: "dashboard" }, "");
  setActiveTab('dashboard');
}}

              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-teal-600' : 'text-slate-400'}`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-teal-50' : 'bg-transparent'}`}>
                <Home className={`w-6 h-6 ${activeTab === 'dashboard' ? 'fill-teal-100/50' : ''}`} />
              </div>
              <span className="text-[10px] font-bold">হোম</span>
            </button>

            <button 
             onClick={() => {
  window.history.pushState({ view: "upload" }, "");
  setActiveTab('upload');
}}

              className="relative -top-5 flex flex-col items-center gap-1 group"
            >
              <div className="w-14 h-14 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-full flex items-center justify-center text-white shadow-xl shadow-teal-500/40 border-4 border-slate-50">
                <PlusCircle className="w-7 h-7" />
              </div>
              <span className={`text-[10px] font-bold mt-1 ${activeTab === 'upload' ? 'text-teal-600' : 'text-slate-500'}`}>আপলোড</span>
            </button>

            <button 
             onClick={() => {
  window.history.pushState({ view: "search" }, "");
  setActiveTab('search');
}}

              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'search' ? 'text-teal-600' : 'text-slate-400'}`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'search' ? 'bg-teal-50' : 'bg-transparent'}`}>
                <Search className={`w-6 h-6 ${activeTab === 'search' ? 'stroke-2' : ''}`} />
              </div>
              <span className="text-[10px] font-bold">সার্চ</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Styles for Print and Fonts */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700&display=swap');

        .font-bengali {
          font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif;
        }

        @media print {
          @page { margin: 10mm; }
          body * { visibility: hidden; }
          nav, .no-print { display: none !important; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          /* Ensure exact colors print */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }

        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}} />
    </div>
  );
  }
