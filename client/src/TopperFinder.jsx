import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Filter,
  Loader2,
  Medal,
  RefreshCw,
  Search,
  Trophy,
  Users,
  Activity,
  CreditCard
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from "react-router-dom";

// FIREBASE IMPORTS
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ==============================================
// 1. FIREBASE & APP CONFIGURATION
// ==============================================
const firebaseConfig = {
  apiKey: "AIzaSyCrmkkxixxtiLON5JGqSU3Rsx5WVgQaUDw",
  authDomain: "central-pod-376117.firebaseapp.com",
  projectId: "central-pod-376117",
  storageBucket: "central-pod-376117.firebasestorage.app",
  messagingSenderId: "1003594162237",
  appId: "1:1003594162237:web:c7b377ab71e90c102d0a54",
  measurementId: "G-QETBDY6355"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const USER_ROLES = {
  "admin@ardm.com": { role: "Admin" },
};

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoQM0Xf5SrusbRuCwe4b3s92rK7e014DYkgiuM3yOLs9KKZ773MUkmysrM3PcxyCbpbw/exec';
const ADMIN_SECRET = "ARDM_DELETE_2026";
const STUDENT_API_URL = "https://script.google.com/macros/s/AKfycbzlG01v-naEr4WZR__n4ZX9fPkQR9pE01A0n8W9fOMUfw5x3RIDNPD_ZyaDwsVz9fphFw/exec";

// ==============================================
// 2. HELPER FUNCTIONS & DATA
// ==============================================
const toBn = (n) => {
  if (n === undefined || n === null || n === '') return '-';
  return String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[d]);
};

// Classes sorted by hierarchy for range selection
const CLASS_HIERARCHY = [
  'Play', 'Nursery', 'KG', 'Class One', 'Class Two', 'Class Three', 
  'Class Four', 'Class Five', 'Class Six', 'Class Seven', 'Class Eight', 
  'Class Nine', 'Class Ten'
];

const classOptions = [
  { val: 'Play', label: 'প্লে (Play)' }, { val: 'Nursery', label: 'নার্সারি (Nursery)' },
  { val: 'KG', label: 'কেজি (KG)' },
  { val: 'Class One', label: '১ম (One)' }, { val: 'Class Two', label: '২য় (Two)' },
  { val: 'Class Three', label: '৩য় (Three)' }, { val: 'Class Four', label: '৪র্থ (Four)' },
  { val: 'Class Five', label: '৫ম (Five)' }, { val: 'Class Six', label: '৬ষ্ঠ (Six)' },
  { val: 'Class Seven', label: '৭ম (Seven)' }, { val: 'Class Eight', label: '৮ম (Eight)' },
  { val: 'Class Nine', label: '৯ম (Nine)' }, { val: 'Class Ten', label: '১০ম (Ten)' }
];

const examOptions = [
  { val: '1st Terminal', label: 'প্রথম সাময়িক পরিক্ষা' },
  { val: '2nd Terminal', label: 'দ্বিতীয় সাময়িক পরিক্ষা' },
  { val: 'Annual', label: 'বার্ষিক পরীক্ষা' }
];

const yearOptions = [
  { val: '2025', label: '2025' }, { val: '2026', label: '2026' },
  { val: '2027', label: '2027' }
];

const parseSheetName = (name) => {
  const parts = String(name).split('][').map(s => s.replace('[', '').replace(']', ''));
  return {
    className: parts[0] || 'অজানা',
    examName: parts[1] || 'অজানা',
    year: parts[2] || 'অজানা',
    date: parts[3] || 'অজানা',
    timestamp: parts[4] ? parseInt(parts[4]) : null
  };
};

// Helper for Level Text based on range (Updated with Strict Rules)
const getLevelText = (fromClass, toClass) => {
    const fromIdx = CLASS_HIERARCHY.indexOf(fromClass);
    const toIdx = CLASS_HIERARCHY.indexOf(toClass);
    
    if (fromIdx === 0 && toIdx === 2) return "প্রাক-প্রাথমিক স্তর";
    if (fromIdx === 3 && toIdx === 7) return "ইবতেদায়ী স্তর";
    if (fromIdx === 8 && toIdx === 12) return "দাখিল স্তর";
    if (fromIdx <= 3 && toIdx === 12) return "পুরো মাদ্রাসা";
    
    const fromLabel = classOptions.find(c => c.val === fromClass)?.label.split(' ')[0] || fromClass;
    const toLabel = classOptions.find(c => c.val === toClass)?.label.split(' ')[0] || toClass;
    return `${fromLabel} থেকে ${toLabel}`;
};

// ==========================================
// PREMIUM SELECT FIELD COMPONENT
// ==========================================
const SelectField = ({ label, icon: Icon, value, onChange, options, placeholder, error, errorMessage }) => {
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

  const selectedOption = options.find(opt => opt.val === String(value));

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className={`text-[12px] font-black uppercase tracking-widest pl-1 mb-1.5 flex items-center gap-1.5 transition-colors duration-300 text-slate-500`}>
        <Icon className="w-4 h-4" /> {label}
      </label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-4 border rounded-xl font-bold flex justify-between items-center transition-all duration-300 ${
          error
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

      <div className={`overflow-hidden transition-all duration-300 ${error ? 'max-h-10 opacity-100 mt-1.5' : 'max-h-0 opacity-0 mt-0'}`}>
         <div className="text-red-500 text-[12px] font-bold pl-1 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> {errorMessage}
         </div>
      </div>

      <div 
        className={`absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-300 origin-top ${
          isOpen ? 'opacity-100 scale-y-100 translate-y-0' : 'opacity-0 scale-y-95 -translate-y-2 pointer-events-none'
        }`}
        style={{ top: '100%', left: 0 }}
      >
        <div className="max-h-[260px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {options.map((opt, i) => {
            const isSelected = String(value) === String(opt.val);
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
// 3. MAIN TOPPER FINDER COMPONENT
// ==============================================
export default function TopperFinder() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [publishedExams, setPublishedExams] = useState([]);
  const [isFetchingExams, setIsFetchingExams] = useState(false);
  
  // Search Form State
  const [examName, setExamName] = useState('1st Terminal');
  const [year, setYear] = useState('2026');
  const [fromClass, setFromClass] = useState('Class Six');
  const [toClass, setToClass] = useState('Class Ten');
  const [topCount, setTopCount] = useState('3');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [toppersResult, setToppersResult] = useState(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success', duration = 3000) => {
    setToast({ show: true, message, type });
    if (type !== 'loading') {
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), duration);
    }
  };
  const hideToast = () => setToast({ show: false, message: '', type: 'success' });

  // 1. Check Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && USER_ROLES[user.email]?.role === 'Admin') {
        setIsAdmin(true);
        fetchAllExams();
      } else {
        alert("শুধুমাত্র এডমিনদের এই পেজে এক্সেস রয়েছে।");
        navigate("/"); 
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. Fetch All Exams List
  const fetchAllExams = async () => {
    setIsFetchingExams(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL + '?role=admin');
      const text = await response.text();
      const result = JSON.parse(text);
      
      if (result.status === 'success') {
        const validExams = (result.data || []).filter(sheet => String(sheet.sheetName).startsWith('['));
        setPublishedExams(validExams);
      }
    } catch (error) {
      console.error("Failed to fetch exam list", error);
    } finally {
      setIsFetchingExams(false);
    }
  };

  // Helper to fetch student images
  const fetchStudentDetails = async (id) => {
      try {
          const res = await fetch(`${STUDENT_API_URL}?action=read&id=${id}`);
          const json = await res.json();
          if(json.status === 'success') {
              return json.data;
          }
          return null;
      } catch(e) {
          console.error("Failed to fetch image for", id);
          return null;
      }
  }

  // 3. CORE LOGIC: Find Toppers
  const handleFindToppers = async () => {
    setShowValidation(true);
    setErrorMessage('');
    setToppersResult(null);

    if (!examName || !year || !fromClass || !toClass || !topCount) {
      setErrorMessage("অনুগ্রহ করে সবগুলো তথ্য সঠিকভাবে দিন।");
      return;
    }

    const fromIdx = CLASS_HIERARCHY.indexOf(fromClass);
    const toIdx = CLASS_HIERARCHY.indexOf(toClass);

    if (fromIdx === -1 || toIdx === -1) {
      setErrorMessage("ক্লাস সিলেকশনে ভুল আছে।");
      return;
    }

    if (fromIdx > toIdx) {
      setErrorMessage("'থেকে (From)' ক্লাস অবশ্যই 'পর্যন্ত (To)' ক্লাসের সমান বা ছোট হতে হবে।");
      return;
    }

    setIsProcessing(true);
    showToast(`ডাটা সংগ্রহ করা হচ্ছে...`, 'loading');

    try {
      // Step A: Filter relevant sheets
      const targetSheets = publishedExams.filter(exam => {
        const info = parseSheetName(exam.sheetName);
        if (info.examName !== examName || info.year !== year) return false;
        
        const classIdx = CLASS_HIERARCHY.indexOf(info.className);
        return classIdx >= fromIdx && classIdx <= toIdx;
      });

      if (targetSheets.length === 0) {
        throw new Error("এই রেঞ্জের মধ্যে কোনো রেজাল্ট শিট সার্ভারে পাওয়া যায়নি।");
      }

      // Step B: Fetch sheets
      const fetchPromises = targetSheets.map(async (sheetObj) => {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'search',
            sheetName: sheetObj.sheetName,
            key: ADMIN_SECRET 
          })
        });
        const result = await response.json();
        if (result.status === 'success') {
          return { sheetInfo: parseSheetName(sheetObj.sheetName), data: result.data };
        }
        return null;
      });

      const sheetsData = (await Promise.all(fetchPromises)).filter(Boolean);
      
      if (sheetsData.length === 0) {
        throw new Error("ডাটাবেজ থেকে ডাটা পড়তে ব্যর্থ হয়েছে।");
      }

      // Step C: Process Students
      let allPassedStudents = [];

      sheetsData.forEach(({ sheetInfo, data }) => {
        if (!data || data.length < 2) return;
        
        const headers = data[0].map(h => String(h).toLowerCase().trim());
        
        const idIdx = headers.findIndex(h => h.includes('id') && !h.includes('name'));
        const nameIdx = headers.findIndex(h => h.includes('namebn')) !== -1 
                      ? headers.findIndex(h => h.includes('namebn')) 
                      : headers.findIndex(h => h.includes('name'));
        const nameEnIdx = headers.findIndex(h => h === 'name' || h.includes('name en'));
        const rollIdx = headers.findIndex(h => h.includes('roll'));
        const gpaIdx = headers.findIndex(h => h === 'gpa');
        const avgIdx = headers.findIndex(h => h.includes('average'));
        const statusIdx = headers.findIndex(h => h === 'status');

        if (nameIdx === -1 || gpaIdx === -1 || statusIdx === -1) return;

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const status = String(row[statusIdx]).toLowerCase();
          
          if (status.includes('pass') || status === 'pass' || status === '-') {
            allPassedStudents.push({
              id: idIdx !== -1 ? row[idIdx] : null,
              name: row[nameIdx],
              nameEn: nameEnIdx !== -1 ? row[nameEnIdx] : row[nameIdx],
              className: sheetInfo.className,
              roll: row[rollIdx],
              gpa: parseFloat(row[gpaIdx]) || 0,
              avg: avgIdx !== -1 ? (parseFloat(row[avgIdx]) || 0) : 0
            });
          }
        }
      });

      // Step D: Apply STRICT Tie-Breaker Logic
      allPassedStudents.sort((a, b) => {
        if (b.gpa !== a.gpa) return b.gpa - a.gpa;
        if (b.avg !== a.avg) return b.avg - a.avg;
        return parseInt(a.roll || 999) - parseInt(b.roll || 999);
      });

      const maxToppers = parseInt(topCount) || 3;
      const finalToppers = allPassedStudents.slice(0, maxToppers);

      // Set Toppers instantly so Form hides and UI updates quickly
      setToppersResult({
        totalAnalyzed: allPassedStudents.length,
        classesInvolved: sheetsData.map(s => s.sheetInfo.className).join(', '),
        levelText: getLevelText(fromClass, toClass),
        toppers: finalToppers
      });
      
      hideToast();
      showToast("টপার তালিকা সফলভাবে প্রস্তুত হয়েছে!", "success");

      // Fetch images in background asynchronously without blocking UI
      finalToppers.forEach(async (student, index) => {
          if(student.id) {
              const details = await fetchStudentDetails(student.id);
              if(details) {
                  setToppersResult(prev => {
                      if (!prev) return prev; // In case user cleared result already
                      const newToppers = [...prev.toppers];
                      if (newToppers[index]) {
                         newToppers[index] = {
                             ...newToppers[index],
                             imageUrl: details.ImageURL,
                             nameEn: details.StudentNameEn || newToppers[index].nameEn
                         };
                      }
                      return { ...prev, toppers: newToppers };
                  });
              }
          }
      });

    } catch (err) {
      hideToast();
      setErrorMessage(err.message || "সার্ভারে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 font-sans">
        <Loader2 className="animate-spin text-teal-600 mb-4" size={48} />
        <p className="text-slate-600 font-bold text-lg">অ্যাডমিন এক্সেস যাচাই করা হচ্ছে...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="w-full min-h-screen bg-slate-50 font-sans text-slate-800 overflow-x-hidden pb-10">
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in">
          <div className={`flex items-center gap-3 px-6 py-3 rounded-xl shadow-2xl font-bold text-white
            ${toast.type === 'success' ? 'bg-green-600' : ''}
            ${toast.type === 'error' ? 'bg-red-600' : ''}
            ${toast.type === 'loading' ? 'bg-slate-800' : ''}
          `}>
            {toast.type === 'loading' && <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>}
            {toast.type === 'success' && "✔"}
            {toast.type === 'error' && "✖"}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <nav className="fixed top-0 w-full bg-white/30 backdrop-blur-2xl border-b border-slate-200/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center h-[72px]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-gradient-to-tr from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30 shrink-0">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div className="leading-tight mt-0.5">
                <h1 className="text-[20px] font-black text-slate-800 tracking-tight">মেধা তালিকা নির্ধারণ</h1>
                <p className="text-[11px] text-teal-600 font-bold uppercase tracking-widest mt-0.5">অ্যাডমিন সুপার প্যানেল</p>
              </div>
            </div>
            
            <button 
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg font-bold text-[13px] shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">মূল ড্যাশবোর্ডে ফিরুন</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-10 pt-28">
        
        <div className="relative mb-8 md:mb-12 flex flex-col items-center text-center z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-amber-400/10 via-orange-400/10 to-amber-400/10 rounded-full blur-3xl pointer-events-none -z-10 animate-[pulse_5s_infinite]"></div>
          
          <h2 className="text-3xl md:text-[42px] font-black tracking-tight mb-2 leading-tight group relative overflow-hidden pb-2 px-4">
            <span className="text-slate-800 drop-shadow-sm">সেরাদের </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 drop-shadow-sm">
              খুঁজে বের করুন
            </span>
          </h2>
          <p className="text-[14px] md:text-[16px] text-slate-500 font-bold max-w-xl mx-auto leading-relaxed">
            একাধিক ক্লাসের মধ্যে কম্পেয়ার করে নিখুঁতভাবে টাই-ব্রেকার লজিক (GPA ও Average) প্রয়োগ করে টপারদের তালিকা তৈরি করুন।
          </p>
        </div>

        {/* SEARCH FORM SECTION - HIDDEN WHEN RESULT IS READY */}
        {!toppersResult && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6 md:space-y-8 relative overflow-hidden mb-10 animate-fade-in">
            {isFetchingExams && (
              <div className="absolute top-0 right-0 m-4 flex items-center gap-2 text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> ডাটাবেজ সিঙ্ক হচ্ছে...
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
              <SelectField 
                label="পরীক্ষা" icon={BookOpen} value={examName} 
                onChange={e => { setExamName(e.target.value); setShowValidation(false); setErrorMessage(''); }} 
                options={examOptions} placeholder="পরীক্ষা নির্বাচন করুন"
                error={showValidation && !examName} errorMessage="পরীক্ষা নির্বাচন করুন"
              />
              <SelectField 
                label="সাল" icon={Calendar} value={year} 
                onChange={e => { setYear(e.target.value); setShowValidation(false); setErrorMessage(''); }} 
                options={yearOptions} placeholder="সাল"
                error={showValidation && !year} errorMessage="সাল নির্বাচন করুন"
              />
              <SelectField 
                label="টপার সংখ্যা (কতজন)" icon={Users} value={topCount} 
                onChange={e => { setTopCount(e.target.value); setShowValidation(false); setErrorMessage(''); }} 
                options={[
                  {val: '3', label: 'টপ ৩ জন (Top 3)'},
                  {val: '5', label: 'টপ ৫ জন (Top 5)'},
                  {val: '10', label: 'টপ ১০ জন (Top 10)'}
                ]} 
                placeholder="কতজন টপার"
                error={showValidation && !topCount} errorMessage="সংখ্যা নির্বাচন করুন"
              />
            </div>

            <div className="p-5 bg-slate-50/80 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 relative">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded-full hidden md:flex items-center justify-center z-10 shadow-sm text-slate-400 font-black text-xs">TO</div>
              <SelectField 
                label="এই ক্লাস থেকে (From)" icon={Filter} value={fromClass} 
                onChange={e => { setFromClass(e.target.value); setShowValidation(false); setErrorMessage(''); }} 
                options={classOptions} placeholder="শুরুর ক্লাস"
                error={showValidation && !fromClass} errorMessage="শুরুর ক্লাস দিন"
              />
              <SelectField 
                label="এই ক্লাস পর্যন্ত (To)" icon={Filter} value={toClass} 
                onChange={e => { setToClass(e.target.value); setShowValidation(false); setErrorMessage(''); }} 
                options={classOptions} placeholder="শেষ ক্লাস"
                error={showValidation && !toClass} errorMessage="শেষ ক্লাস দিন"
              />
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 md:p-5 rounded-xl text-sm font-bold flex gap-3 shadow-sm animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" /> <p>{errorMessage}</p>
              </div>
            )}

            <button 
              onClick={handleFindToppers}
              disabled={isProcessing || isFetchingExams}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-500 text-white py-4 md:py-5 rounded-xl font-bold text-base md:text-lg flex items-center justify-center gap-3 transition-all shadow-lg shadow-slate-900/20"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 md:w-6 h-5 md:h-6 animate-spin" /> প্রসেস করা হচ্ছে...</>
              ) : (
                <><Search className="w-5 md:w-6 h-5 md:h-6" /> টপার তালিকা তৈরি করুন</>
              )}
            </button>
          </div>
        )}

        {/* RESULTS SECTION - ULTRA PREMIUM DESIGN */}
        {toppersResult && (
          <div className="animate-slide-up">
            
            {/* Back to Form Button */}
            <button 
              onClick={() => setToppersResult(null)}
              className="mb-6 flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl font-bold text-sm shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> নতুন করে খুঁজুন
            </button>

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                    <Award className="w-7 h-7 text-amber-500" /> 
                </div>
                <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-800">চূড়ান্ত মেধা তালিকা</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                    মোট <span className="text-teal-600">{toBn(toppersResult.totalAnalyzed)}</span> জন পাস করা শিক্ষার্থীর মধ্যে বিশ্লেষণ করা হয়েছে।
                    </p>
                </div>
              </div>
              <div className="mt-4 md:mt-0 px-5 py-2 bg-slate-800 text-white rounded-full text-sm font-bold border-2 border-slate-700 shadow-md">
                 ক্যাটাগরি: {toppersResult.levelText}
              </div>
            </div>

            {toppersResult.toppers.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                <Trophy className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-slate-700 font-bold text-xl mb-2">কাউকে পাওয়া যায়নি</h3>
                <p className="text-slate-400 text-sm font-medium">সিলেক্ট করা রেঞ্জে কোনো পাস করা শিক্ষার্থী পাওয়া যায়নি।</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                {toppersResult.toppers.map((student, index) => {
                  const isFirst = index === 0;
                  const isSecond = index === 1;
                  const isThird = index === 2;
                  
                  let rankTitle = `${toBn(index + 1)}ম স্থান`;
                  let MedalIcon = Medal;
                  
                  // Premium Ranking Styles (Gold, Silver, Bronze)
                  let cardStyle = "bg-white border-slate-200 shadow-md hover:shadow-lg relative";
                  let rankBadge = "bg-slate-100 text-slate-600 border-slate-200";
                  let imageRing = "border-slate-200";

                  if (isFirst) {
                    // 1st Place - Gold Theme
                    cardStyle = "bg-gradient-to-b from-[#FFFDF0] to-white border-amber-300 shadow-[0_10px_40px_rgba(245,158,11,0.15)] md:-translate-y-4 z-10 scale-100 md:scale-105 border-2 relative";
                    rankBadge = "bg-amber-100 text-amber-700 border-amber-300";
                    imageRing = "border-amber-400 ring-4 ring-amber-100";
                    rankTitle = "১ম স্থান (টপার)";
                  } else if (isSecond) {
                    // 2nd Place - Premium Silver Theme
                    cardStyle = "bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9] border-slate-400 shadow-[0_10px_30px_rgba(148,163,184,0.3)] md:-translate-y-2 border-2 relative";
                    rankBadge = "bg-slate-200 text-slate-700 border-slate-400";
                    imageRing = "border-slate-400 ring-4 ring-slate-200";
                    rankTitle = "২য় স্থান (সিলভার)";
                  } else if (isThird) {
                    // 3rd Place - Bronze Theme
                    cardStyle = "bg-gradient-to-b from-[#FFF7ED] to-[#FFEDD5] border-orange-300 shadow-[0_10px_30px_rgba(249,115,22,0.15)] border-2 relative";
                    rankBadge = "bg-orange-100 text-orange-800 border-orange-300";
                    imageRing = "border-orange-400 ring-4 ring-orange-100";
                    rankTitle = "৩য় স্থান (ব্রোঞ্জ)";
                  }

                  return (
                    <div 
                      key={index}
                      className={`rounded-3xl p-6 border transition-all duration-300 flex flex-col relative overflow-hidden group ${cardStyle}`}
                      style={{ animation: `slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.15}s both` }}
                    >
                      {/* Decorative Background Elements */}
                      {isFirst && (
                          <>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-bl-full pointer-events-none -z-0"></div>
                            <div className="absolute -top-4 -left-4 w-16 h-16 bg-amber-400/20 rounded-full blur-xl pointer-events-none -z-0"></div>
                          </>
                      )}
                      {isSecond && (
                          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-400/10 rounded-bl-full pointer-events-none -z-0"></div>
                      )}
                      {isThird && (
                          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-400/10 rounded-bl-full pointer-events-none -z-0"></div>
                      )}

                      <div className="relative z-10 flex flex-col h-full">
                          
                          {/* Top Row: Rank & Class (With Level Text added for each card) */}
                          <div className="flex justify-between items-start mb-6">
                              <div className={`px-4 py-1.5 rounded-full text-xs font-black border flex items-center gap-1.5 shadow-sm ${rankBadge}`}>
                                  <MedalIcon className="w-4 h-4" /> {rankTitle}
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <span className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    {student.className}
                                </span>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm">
                                    {toppersResult.levelText}
                                </span>
                              </div>
                          </div>

                          {/* Profile Section */}
                          <div className="flex flex-col items-center mb-6 text-center">
                              <div className={`w-24 h-24 rounded-full mb-4 bg-slate-100 border-2 overflow-hidden shadow-md flex-shrink-0 ${imageRing} relative`}>
                                  {!student.imageUrl && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                                       <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                    </div>
                                  )}
                                  <img 
                                      src={student.imageUrl || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                                      alt={student.name}
                                      className="w-full h-full object-cover relative z-10"
                                      onError={(e) => {e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}}
                                  />
                              </div>
                              <h4 className="text-[20px] font-black text-slate-800 leading-tight mb-1">{student.name}</h4>
                              {student.nameEn && student.nameEn !== student.name && (
                                  <p className="text-xs font-bold text-slate-400 mb-2 uppercase">{student.nameEn}</p>
                              )}
                          </div>

                          {/* ID & Roll Info */}
                          <div className="flex justify-center gap-4 mb-6">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                  <Activity className="w-3.5 h-3.5" /> রোল: {toBn(student.roll)}
                              </div>
                              {student.id && (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                      <CreditCard className="w-3.5 h-3.5" /> আইডি: {toBn(student.id)}
                                  </div>
                              )}
                          </div>

                          <div className="mt-auto"></div>

                          {/* Score Cards (GPA & AVG) */}
                          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-slate-100 grid grid-cols-2 gap-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)] group-hover:shadow-[0_4px_15px_rgba(0,0,0,0.08)] transition-shadow">
                              <div className="text-center p-3 rounded-xl bg-gradient-to-b from-slate-50 to-white border border-slate-100">
                                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GPA</span>
                                  <span className={`block text-[28px] font-black leading-none ${isFirst ? 'text-amber-600' : isSecond ? 'text-slate-600' : isThird ? 'text-orange-600' : 'text-slate-700'}`}>
                                      {student.gpa.toFixed(2)}
                                  </span>
                              </div>
                              <div className="text-center p-3 rounded-xl bg-gradient-to-b from-slate-50 to-white border border-slate-100">
                                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">গড় (%)</span>
                                  <span className={`block text-[28px] font-black leading-none ${isFirst ? 'text-emerald-600' : 'text-slate-700'}`}>
                                      {toBn(student.avg.toFixed(2))}
                                  </span>
                              </div>
                          </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap');
        .font-sans { font-family: 'Hind Siliguri', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { 
          from { opacity: 0; transform: translateY(30px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
