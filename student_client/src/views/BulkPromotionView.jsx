import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    Award,
    Check,
    CheckCircle2,
    ChevronLeft,
    FileSpreadsheet,
    GraduationCap,
    Layers,
    Loader2,
    RotateCcw,
    Search,
    ShieldAlert,
    Sparkles,
    UploadCloud,
    Users,
    X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_IMAGE } from '../config/systemConfig';
import { CLASS_LIST_BN, isSeniorClass, toUiClass } from '../models/studentModel';
import { extractApiErrorMessage } from '../services/axiosClient';
import { studentApi } from '../services/studentApiService';

// বাংলা বা ইংরেজি সংখ্যাকে ইংরেজিতে রূপান্তর
const toEnDigits = (v) =>
  String(v ?? '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)).trim();

// নির্ভরযোগ্য CSV পার্সার (কোটেশনের ভেতরে কমা থাকলেও ভাঙবে না)
const parseCsvText = (text) => {
  const cleanText = String(text || '').replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim() !== '');
  return lines.map((line) => {
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  });
};

// পরের শ্রেণি স্বয়ংক্রিয়ভাবে নির্ণয়
const getAutoNextClass = (cls) => {
  const idx = CLASS_LIST_BN.indexOf(toUiClass(cls));
  if (idx === -1) return cls;
  if (idx === CLASS_LIST_BN.length - 1) return CLASS_LIST_BN[idx]; // ১০ম -> ১০ম
  return CLASS_LIST_BN[idx + 1];
};

// CSV-এর Class কলামকে UI বাংলা শ্রেণিতে রূপান্তর
const normalizeCsvClass = (raw) => {
  const v = String(raw || '').trim();
  const mapEn = {
    play: 'প্লে', nursery: 'নার্সারি', kg: 'কেজি',
    one: '১ম', 'class one': '১ম', '1': '১ম',
    two: '২য়', 'class two': '২য়', '2': '২য়',
    three: '৩য়', 'class three': '৩য়', '3': '৩য়',
    four: '৪র্থ', 'class four': '৪র্থ', '4': '৪র্থ',
    five: '৫ম', 'class five': '৫ম', '5': '৫ম',
    six: '৬ষ্ঠ', 'class six': '৬ষ্ঠ', '6': '৬ষ্ঠ',
    seven: '৭ম', 'class seven': '৭ম', '7': '৭ম',
    eight: '৮ম', 'class eight': '৮ম', '8': '৮ম',
    nine: '৯ম', 'class nine': '৯ম', '9': '৯ম',
    ten: '১০ম', 'class ten': '১০ম', '10': '১০ম'
  };
  const lower = v.toLowerCase();
  if (mapEn[lower]) return mapEn[lower];
  return toUiClass(v);
};

const BulkPromotionView = ({ students = [], currentUser, onBack, onComplete, showToast }) => {
  const fileInputRef = useRef(null);

  // ডাটাবেজে থাকা সেশনগুলোর তালিকা
  const availableSessions = useMemo(() => {
    const set = new Set(students.map((s) => String(s.Session || '').trim()).filter((x) => /^20\d{2}$/.test(x)));
    if (set.size === 0) set.add(String(new Date().getFullYear()));
    return [...set].sort((a, b) => Number(b) - Number(a));
  }, [students]);

  const [sourceClass, setSourceClass] = useState('১ম');
  const [sourceSession, setSourceSession] = useState(() => availableSessions[0] || String(new Date().getFullYear()));
  const [targetClass, setTargetClass] = useState(() => getAutoNextClass('১ম'));
  const [targetSession, setTargetSession] = useState(() => String(Number(availableSessions[0] || new Date().getFullYear()) + 1));

  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // all | matched | mismatch | failed | duplicate | missing
  const [csvMeta, setCsvMeta] = useState(null); // { fileName, totalCsvRows, matched, rollMismatch, failed, notInCsv, classWarning }
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // উৎস শ্রেণি বদলালে টার্গেট শ্রেণি অটোমেটিক পরের ক্লাস হবে
  useEffect(() => {
    setTargetClass(getAutoNextClass(sourceClass));
    setCsvMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [sourceClass]);

  // উৎস সেশন বদলালে টার্গেট সেশন অটোমেটিক পরের বছর হবে
  useEffect(() => {
    if (/^20\d{2}$/.test(sourceSession)) {
      setTargetSession(String(Number(sourceSession) + 1));
    }
    setCsvMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [sourceSession]);

  // উৎস শ্রেণি + সেশনের Active শিক্ষার্থীরা
  const sourceStudents = useMemo(() => {
    return students
      .filter(
        (s) =>
          toUiClass(s.ClassBn) === toUiClass(sourceClass) &&
          String(s.Session) === String(sourceSession) &&
          s.Status === 'Active'
      )
      .sort((a, b) => (Number(a.Roll) || 0) - (Number(b.Roll) || 0));
  }, [students, sourceClass, sourceSession]);

  // উৎস তালিকা বদলালে রো-গুলো রিসেট করে সাজানো
  useEffect(() => {
    const isTenth = toUiClass(sourceClass) === '১০ম';
    setRows(
      sourceStudents.map((s) => ({
        _id: s._id,
        ID: String(s.ID || ''),
        nameBn: s.StudentNameBn || '',
        nameEn: s.StudentNameEn || '',
        photo: s.ImageURL || DEFAULT_IMAGE,
        oldClass: toUiClass(s.ClassBn),
        oldRoll: Number(s.Roll) || '',
        oldSession: String(s.Session || ''),
        checked: true,
        nextClassBn: isTenth ? '১০ম' : targetClass,
        nextRoll: isTenth ? '' : String(s.Roll || ''),
        nextGroup: isSeniorClass(targetClass) ? (s.Group || 'General') : '',
        resultStatus: isTenth ? 'Transferred' : 'Promoted',
        csvMatch: 'none', // none | exact | roll_mismatch | not_found
        csvInfo: null
      }))
    );
    setFilterMode('all');
  }, [sourceStudents, sourceClass, targetClass]);

  // ডাটাবেজে ইতিমধ্যে টার্গেট সেশনে থাকা শিক্ষার্থীদের রোল ম্যাপ (অন্য কোনো ব্যাচের সাথে সংঘর্ষ এড়াতে)
  const existingDbRollsMap = useMemo(() => {
    const currentSourceIds = new Set(sourceStudents.map((s) => String(s._id)));
    const map = new Map();
    students.forEach((s) => {
      if (s.Status === 'Deleted' || s.Status === 'Transferred') return;
      if (currentSourceIds.has(String(s._id))) return;
      if (String(s.Session) !== String(targetSession)) return;
      const key = `${toUiClass(s.ClassBn)}__${Number(s.Roll)}`;
      map.set(key, `${s.StudentNameBn} (${s.ID})`);
    });
    return map;
  }, [students, sourceStudents, targetSession]);

  // লাইভ ডুপ্লিকেট রোল ও ভ্যালিডেশন হিসাব
  const validationState = useMemo(() => {
    const rollCountMap = new Map();
    const rowErrors = {};

    rows.forEach((r) => {
      if (!r.checked || r.resultStatus === 'Transferred') return;
      const rollNum = Number(r.nextRoll);
      if (!r.nextRoll || !Number.isInteger(rollNum) || rollNum < 1 || rollNum > 500) {
        rowErrors[r._id] = 'বৈধ রোল (১–৫০০) দিন';
        return;
      }
      const key = `${toUiClass(r.nextClassBn)}__${rollNum}`;
      rollCountMap.set(key, (rollCountMap.get(key) || 0) + 1);
    });

    rows.forEach((r) => {
      if (!r.checked || r.resultStatus === 'Transferred' || rowErrors[r._id]) return;
      const rollNum = Number(r.nextRoll);
      const key = `${toUiClass(r.nextClassBn)}__${rollNum}`;
      if ((rollCountMap.get(key) || 0) > 1) {
        rowErrors[r._id] = `ডুপ্লিকেট রোল (${r.nextClassBn} শ্রেণিতে রোল ${rollNum} একাধিকবার আছে)`;
      } else if (existingDbRollsMap.has(key)) {
        rowErrors[r._id] = `${targetSession} সেশনে রোল ${rollNum} ইতিমধ্যে ${existingDbRollsMap.get(key)}-এর নামে আছে`;
      }
    });

    const selectedRows = rows.filter((r) => r.checked);
    const errorIds = Object.keys(rowErrors);
    return {
      rowErrors,
      errorCount: errorIds.length,
      selectedCount: selectedRows.length,
      promotedCount: selectedRows.filter((r) => r.resultStatus === 'Promoted').length,
      failedCount: selectedRows.filter((r) => r.resultStatus === 'Failed').length,
      transferredCount: selectedRows.filter((r) => r.resultStatus === 'Transferred').length,
      canSubmit: selectedRows.length > 0 && errorIds.length === 0 && /^20\d{2}$/.test(targetSession)
    };
  }, [rows, existingDbRollsMap, targetSession]);

  // CSV আপলোড ও শুধুমাত্র ID-ভিত্তিক মেরিট ম্যাচিং ইঞ্জিন
  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast?.('অনুগ্রহ করে একটি সঠিক .csv রেজাল্ট ফাইল আপলোড করুন', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const matrix = parseCsvText(ev.target.result);
        if (matrix.length < 2) {
          showToast?.('CSV ফাইলে কোনো শিক্ষার্থীর ডাটা পাওয়া যায়নি। আরেকটি সঠিক CSV আপলোড করুন।', 'error');
          return;
        }

        const headers = matrix[0].map((h) => String(h || '').split(' [')[0].trim().toLowerCase());
        const idx = {
          id: headers.findIndex((h) => h === 'id' || h === 'student id' || h === 'studentcode'),
          merit: headers.findIndex((h) => h.includes('merit')),
          gpa: headers.findIndex((h) => h === 'gpa'),
          grade: headers.findIndex((h) => h === 'grade'),
          total: headers.findIndex((h) => h.includes('total marks')),
          status: headers.findIndex((h) => h === 'status')
        };

        if (idx.id === -1 || idx.merit === -1) {
          showToast?.('CSV ফাইলে "ID" অথবা "Merit Position" কলাম পাওয়া যায়নি! আরেকটি সঠিক CSV আপলোড করুন।', 'error');
          return;
        }

        const csvMap = new Map();
        matrix.slice(1).forEach((cols) => {
          const idVal = toEnDigits(cols[idx.id]);
          if (!idVal) return;

          const meritRaw = toEnDigits(cols[idx.merit]);
          const meritNum = parseInt(meritRaw, 10);
          const statusStr = idx.status !== -1 ? String(cols[idx.status] || '').trim() : 'Pass';
          const isFail = statusStr.toLowerCase().includes('fail');

          csvMap.set(idVal, {
            id: idVal,
            merit: Number.isInteger(meritNum) ? meritNum : '',
            gpa: idx.gpa !== -1 ? String(cols[idx.gpa] || '').trim() : '',
            grade: idx.grade !== -1 ? String(cols[idx.grade] || '').trim() : '',
            totalMarks: idx.total !== -1 ? String(cols[idx.total] || '').trim() : '',
            status: statusStr,
            isFail
          });
        });

        // আগে চেক করি বর্তমান লিস্টের কারও ID এই CSV-এর সাথে মিলে কি না
        const totalMatched = rows.filter((r) => csvMap.has(String(r.ID).trim())).length;
        if (totalMatched === 0) {
          const msg = 'এই CSV ফাইলের কোনো আইডি (ID) মেলেনি! অনুগ্রহ করে আরেকটি সঠিক রেজাল্ট CSV আপলোড করুন।';
          setCsvMeta({
            fileName: file.name,
            totalCsvRows: csvMap.size,
            matched: 0,
            failed: 0,
            notInCsv: rows.length,
            noMatchError: msg
          });
          showToast?.(msg, 'error');
          return;
        }

        let matched = 0;
        let failed = 0;
        let notInCsv = 0;
        const isTenth = toUiClass(sourceClass) === '১০ম';

        setRows((prev) =>
          prev.map((r) => {
            const rec = csvMap.get(String(r.ID).trim());
            // ID না মিললে বাদ দিয়ে দেবে
            if (!rec) {
              notInCsv++;
              return {
                ...r,
                checked: false,
                nextRoll: '',
                csvMatch: 'not_found',
                csvInfo: null
              };
            }

            matched++;
            if (rec.isFail) {
              failed++;
              return {
                ...r,
                checked: true,
                resultStatus: 'Failed',
                nextClassBn: r.oldClass,
                nextRoll: String(rec.merit || r.oldRoll || ''),
                csvMatch: 'exact',
                csvInfo: rec
              };
            }

            return {
              ...r,
              checked: true,
              resultStatus: isTenth ? 'Transferred' : 'Promoted',
              nextClassBn: isTenth ? '১০ম' : targetClass,
              nextRoll: isTenth ? '' : String(rec.merit || ''),
              csvMatch: 'exact',
              csvInfo: rec
            };
          })
        );

        setCsvMeta({
          fileName: file.name,
          totalCsvRows: csvMap.size,
          matched,
          failed,
          notInCsv,
          noMatchError: ''
        });

        showToast?.(
          notInCsv > 0
            ? `${matched} জনের আইডি মিলেছে এবং মেরিট অনুযায়ী রোল বসানো হয়েছে। ${notInCsv} জনের আইডি না মেলায় বাদ দেওয়া হয়েছে।`
            : `${matched} জনের সবার আইডি মিলেছে এবং মেরিট অনুযায়ী রোল বসানো হয়েছে।`,
          'success'
        );
      } catch {
        showToast?.('CSV ফাইল পড়তে সমস্যা হয়েছে। আরেকটি ফাইল আপলোড করুন।', 'error');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // রো আপডেট হেল্পার
  const updateRow = (id, patch) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._id !== id) return r;
        const next = { ...r, ...patch };
        if (patch.resultStatus === 'Failed') {
          next.nextClassBn = r.oldClass;
        } else if (patch.resultStatus === 'Promoted') {
          next.nextClassBn = targetClass;
          if (isSeniorClass(targetClass) && !next.nextGroup) {
            next.nextGroup = 'General';
          }
        }
        return next;
      })
    );
  };

  // এক ক্লিকে বর্তমান তালিকার সিলেক্টেড শিক্ষার্থীদের ১, ২, ৩... অটো রোল দেওয়া
  const handleAutoAssignSequentialRolls = () => {
    const classCounter = {};
    setRows((prev) =>
      prev.map((r) => {
        if (!r.checked || r.resultStatus === 'Transferred') return r;
        const cls = toUiClass(r.nextClassBn);
        classCounter[cls] = (classCounter[cls] || 0) + 1;
        return { ...r, nextRoll: String(classCounter[cls]) };
      })
    );
    showToast?.('নির্বাচিত শিক্ষার্থীদের ক্রমানুযায়ী নতুন রোল (১, ২, ৩...) বসানো হয়েছে', 'success');
  };

  // সব Fail শিক্ষার্থীকে এক ক্লিকে Promoted বা Failed টগল করা
  const handleToggleAllFailedToPromoted = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (!r.csvInfo?.isFail) return r;
        return {
          ...r,
          resultStatus: 'Promoted',
          nextClassBn: targetClass,
          nextRoll: String(r.csvInfo.merit || r.nextRoll || '')
        };
      })
    );
    showToast?.('অকৃতকার্য শিক্ষার্থীদেরও পরবর্তী শ্রেণিতে (Promoted) সেট করা হয়েছে', 'success');
  };

  // চূড়ান্ত ব্যাকএন্ড সাবমিশন
  const handleConfirmPromotion = async () => {
    if (!validationState.canSubmit) return;
    setSubmitting(true);
    try {
      const promotions = rows
        .filter((r) => r.checked)
        .map((r) => ({
          studentId: r._id,
          nextClassBn: r.nextClassBn,
          nextRoll: r.resultStatus === 'Transferred' ? r.oldRoll : Number(r.nextRoll),
          nextGroup: isSeniorClass(r.nextClassBn) ? (r.nextGroup || 'General') : '',
          resultStatus: r.resultStatus
        }));

      const res = await studentApi.promoteBulk({
        targetSession: String(targetSession).trim(),
        promotions
      });

      setConfirmOpen(false);
      showToast?.(res.message || 'বাল্ক প্রমোশন সফলভাবে সম্পন্ন হয়েছে!', 'success');
      await onComplete?.();
    } catch (err) {
      showToast?.(extractApiErrorMessage(err, 'প্রমোশন সংরক্ষণ করা যায়নি'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // সার্চ ও ফিল্টার করা দৃশ্যমান রো
  const visibleRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterMode === 'matched' && r.csvMatch !== 'exact') return false;
      if (filterMode === 'mismatch' && r.csvMatch !== 'roll_mismatch') return false;
      if (filterMode === 'failed' && !r.csvInfo?.isFail && r.resultStatus !== 'Failed') return false;
      if (filterMode === 'missing' && r.csvMatch !== 'not_found') return false;
      if (filterMode === 'duplicate' && !validationState.rowErrors[r._id]) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        return (
          r.nameBn.toLowerCase().includes(q) ||
          r.nameEn.toLowerCase().includes(q) ||
          r.ID.includes(q) ||
          String(r.oldRoll).includes(q) ||
          String(r.nextRoll).includes(q)
        );
      }
      return true;
    });
  }, [rows, filterMode, searchTerm, validationState.rowErrors]);

  // শুধুমাত্র অ্যাডমিন অ্যাক্সেস গার্ড
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F0F4FF]">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4 border border-red-200">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-lg font-black text-slate-800">প্রবেশাধিকার সংরক্ষিত</h2>
        <p className="text-xs font-bold text-slate-500 mt-1 mb-5">
          বাল্ক প্রমোশন ও সেশন আপডেট শুধুমাত্র সুপার অ্যাডমিন এবং অ্যাডমিনদের জন্য উন্মুক্ত।
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-[#060D1F] text-[#D4A843] text-xs font-black"
        >
          ড্যাশবোর্ডে ফিরে যান
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4FF] pb-28 font-bangla">
      {/* ==================== TOP ROYAL HEADER ==================== */}
      <header className="sticky top-0 z-40 bg-[#060D1F]/95 backdrop-blur-xl border-b border-[#D4A843]/25 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 lg:h-[72px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center shrink-0 transition"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4A843]">
                  Academic Promotion Engine
                </span>
              </div>
              <h1 className="text-sm sm:text-base lg:text-lg font-black text-white truncate">
                বাল্ক ক্লাস, রোল ও সেশন প্রমোশন
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center gap-1.5 transition"
            >
              <UploadCloud size={15} />
              <span className="hidden sm:inline">রেজাল্ট CSV আপলোড</span>
            </button>

            <button
              type="button"
              disabled={!validationState.canSubmit || submitting}
              onClick={() => setConfirmOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4A843] to-amber-500 text-[#060D1F] text-xs font-black flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <CheckCircle2 size={15} />
              <span>সংরক্ষণ ({validationState.selectedCount})</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-5">
        {/* ==================== STEP 1: CLASS & SESSION ROUTE SELECTOR ==================== */}
        <div className="bg-white rounded-[28px] p-5 lg:p-6 shadow-sm border border-slate-200/80 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#060D1F] text-[#D4A843] flex items-center justify-center shadow-sm">
                <GraduationCap size={20} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  ধাপ ১: উৎস ও নতুন শ্রেণি–সেশন নির্বাচন করুন
                </h2>
                <p className="text-[11px] font-semibold text-slate-400">
                  উৎস শ্রেণি ও সেশন বাছাই করলে পরবর্তী শ্রেণি ও সেশন স্বয়ংক্রিয়ভাবে নির্ধারিত হবে
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-black bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200/70">
              <span className="text-slate-600">{sourceClass} ({sourceSession})</span>
              <ArrowRight size={14} className="text-[#D4A843]" />
              <span className="text-emerald-700">{targetClass} ({targetSession})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Source Class */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">
                বর্তমান শ্রেণি (From Class)
              </label>
              <select
                value={sourceClass}
                onChange={(e) => setSourceClass(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#060D1F] text-sm font-black text-slate-800 outline-none transition"
              >
                {CLASS_LIST_BN.map((cls) => (
                  <option key={cls} value={cls}>{cls} শ্রেণি</option>
                ))}
              </select>
            </div>

            {/* Source Session */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5 ml-1">
                বর্তমান সেশন (From Session)
              </label>
              <select
                value={sourceSession}
                onChange={(e) => setSourceSession(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#060D1F] text-sm font-mono font-black text-slate-800 outline-none transition"
              >
                {availableSessions.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Auto Target Class */}
            <div>
              <label className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center justify-between mb-1.5 ml-1">
                <span>নতুন শ্রেণি (Auto Next)</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md">Auto</span>
              </label>
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-emerald-50/60 border border-emerald-300 focus:bg-white focus:border-emerald-600 text-sm font-black text-emerald-900 outline-none transition"
              >
                {CLASS_LIST_BN.map((cls) => (
                  <option key={cls} value={cls}>{cls} শ্রেণি</option>
                ))}
              </select>
            </div>

            {/* Auto Target Session */}
            <div>
              <label className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center justify-between mb-1.5 ml-1">
                <span>নতুন সেশন (Auto Next)</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md">Auto</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={targetSession}
                onChange={(e) => setTargetSession(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="2027"
                className="w-full px-4 py-3 rounded-2xl bg-emerald-50/60 border border-emerald-300 focus:bg-white focus:border-emerald-600 text-sm font-mono font-black text-emerald-900 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* ==================== STEP 2: RESULT CSV SMART IMPORT ZONE ==================== */}
        <div className="bg-gradient-to-br from-[#060D1F] via-[#0B1C38] to-[#0E3B2E] rounded-[28px] p-5 lg:p-6 text-white shadow-xl border border-[#D4A843]/30">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="hidden"
          />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#D4A843]/20 border border-[#D4A843]/40 text-[#F7E09A] flex items-center justify-center shrink-0">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-[#F7E09A]">
                    ধাপ ২: বার্ষিক ফলাফলের CSV আপলোড (অটো রোল ও আইডি যাচাই)
                  </h3>
                  <Sparkles size={14} className="text-[#D4A843]" />
                </div>
                <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
                  CSV আপলোড করলে অ্যাপের <b>ID</b> ও <b>Roll</b>-এর সাথে CSV মিলিয়ে <b>Merit Position</b>-কে স্বয়ংক্রিয়ভাবে নতুন রোল হিসেবে বসিয়ে দেবে। (ঐচ্ছিক — চাইলে সরাসরি নিচে হাতেও রোল বসাতে পারবেন)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4A843] to-amber-500 text-[#060D1F] font-black text-xs flex items-center gap-2 shadow-lg hover:brightness-105 active:scale-95 transition"
              >
                <UploadCloud size={16} />
                <span>{csvMeta ? 'অন্য CSV আপলোড করুন' : 'রেজাল্ট CSV সিলেক্ট করুন'}</span>
              </button>

              <button
                type="button"
                onClick={handleAutoAssignSequentialRolls}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-black text-xs flex items-center gap-1.5 transition"
              >
                <Layers size={14} /> অটো রোল (১,২,৩...)
              </button>
            </div>
          </div>

          {/* CSV Verification Summary Strip */}
          {csvMeta && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
              {csvMeta.noMatchError && (
                <div className="p-3.5 rounded-2xl bg-red-500/20 border border-red-400/40 text-red-100 text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-red-300 shrink-0" />
                    <span>{csvMeta.noMatchError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-black shrink-0"
                  >
                    আরেকটি CSV আপলোড করুন
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-300 truncate max-w-md">
                  ফাইল: <b className="text-white">{csvMeta.fileName}</b> ({csvMeta.totalCsvRows} সারি)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-black text-[11px]">
                    ✓ ID ম্যাচড: {csvMeta.matched}
                  </span>
                  {csvMeta.failed > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-400/30 text-red-200 font-black text-[11px]">
                      ✗ অকৃতকার্য: {csvMeta.failed}
                    </span>
                  )}
                  {csvMeta.notInCsv > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 font-black text-[11px]">
                      ID না মেলায় বাদ: {csvMeta.notInCsv}
                    </span>
                  )}
                  {csvMeta.failed > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleAllFailedToPromoted}
                      className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-[#F7E09A] font-black text-[10px] transition"
                    >
                      অকৃতকার্যদেরও Promoted করুন
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================== KPI STATS + FILTER BAR ==================== */}
        <div className="bg-white rounded-[24px] p-4 lg:p-5 shadow-sm border border-slate-200/80 space-y-3.5">
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all', label: `সবাই (${rows.length})` },
                ...(csvMeta && !csvMeta.noMatchError ? [
                  { key: 'matched', label: `ID ম্যাচড (${rows.filter((r) => r.csvMatch === 'exact').length})` },
                  { key: 'failed', label: `অকৃতকার্য (${rows.filter((r) => r.csvInfo?.isFail || r.resultStatus === 'Failed').length})` },
                  { key: 'missing', label: `ID না মেলায় বাদ (${rows.filter((r) => r.csvMatch === 'not_found').length})` },
                ] : []),
                ...(validationState.errorCount > 0
                  ? [{ key: 'duplicate', label: `ত্রুটি / ডুপ্লিকেট (${validationState.errorCount})`, danger: true }]
                  : [])
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setFilterMode(t.key)}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-black transition ${
                    filterMode === t.key
                      ? t.danger
                        ? 'bg-red-600 text-white'
                        : 'bg-[#060D1F] text-[#D4A843]'
                      : t.danger
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="নাম, আইডি বা রোল খুঁজুন..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-[#060D1F]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Duplicate Error Alert Banner */}
          {validationState.errorCount > 0 && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>
                  মোট {validationState.errorCount} জন শিক্ষার্থীর রোল নম্বর ডুপ্লিকেট বা ফাঁকা রয়েছে। লাল চিহ্নিত ঘরগুলো ঠিক না করা পর্যন্ত সংরক্ষণ করা যাবে না।
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFilterMode('duplicate')}
                className="px-3 py-1 rounded-lg bg-red-600 text-white text-[10px] font-black shrink-0"
              >
                ত্রুটিগুলো দেখুন
              </button>
            </div>
          )}
        </div>

        {/* ==================== STUDENT PROMOTION TABLE / CARDS ==================== */}
        {rows.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-slate-200/80 py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 mx-auto mb-4 flex items-center justify-center text-slate-400">
              <Users size={28} />
            </div>
            <h3 className="text-sm font-black text-slate-700">
              {sourceSession} সেশনের {sourceClass} শ্রেণিতে কোনো সক্রিয় শিক্ষার্থী নেই
            </h3>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              উপরের ড্রপডাউন থেকে অন্য শ্রেণি বা সেশন নির্বাচন করুন
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Select All Header Strip */}
            <div className="px-4 py-2 flex items-center justify-between text-[11px] font-black text-slate-500">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && rows.every((r) => r.checked)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRows((prev) => prev.map((r) => ({ ...r, checked })));
                  }}
                  className="w-4 h-4 rounded accent-[#060D1F]"
                />
                <span>সব শিক্ষার্থী সিলেক্ট করুন ({validationState.selectedCount} / {rows.length})</span>
              </label>

              <div className="hidden lg:flex items-center gap-6 text-[10px] uppercase tracking-wider text-slate-400">
                <span>সিদ্ধান্ত (Status)</span>
                <span className="w-28 text-center">নতুন শ্রেণি</span>
                <span className="w-24 text-center">নতুন রোল</span>
              </div>
            </div>

            {visibleRows.map((r) => {
              const rowErr = validationState.rowErrors[r._id];
              const showGroup = isSeniorClass(r.nextClassBn) && r.resultStatus !== 'Transferred';

              return (
                <div
                  key={r._id}
                  className={`rounded-2xl p-3.5 sm:p-4 bg-white border transition-all ${
                    rowErr
                      ? 'border-red-400 ring-2 ring-red-100 bg-red-50/20'
                      : !r.checked
                      ? 'border-slate-200/70 opacity-60'
                      : r.csvMatch === 'roll_mismatch'
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200/80 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                    {/* Left: Checkbox + Photo + Student Identity + CSV Badges */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={r.checked}
                        onChange={(e) => updateRow(r._id, { checked: e.target.checked })}
                        className="w-4 h-4 mt-1 sm:mt-0 rounded accent-[#060D1F] shrink-0 cursor-pointer"
                      />
                      <img
                        src={r.photo}
                        alt={r.nameBn}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-sm font-black text-slate-900 truncate">{r.nameBn}</h4>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            ID: {r.ID}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                            পূর্বের রোল: {r.oldRoll}
                          </span>
                        </div>

                        {/* CSV Match & Result Info Strip */}
                        {r.csvMatch !== 'none' && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {r.csvMatch === 'exact' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <Check size={10} strokeWidth={3} /> ID ম্যাচড
                              </span>
                            )}
                            {r.csvMatch === 'not_found' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                ID না মেলায় বাদ দেওয়া হয়েছে
                              </span>
                            )}

                            {r.csvInfo && (
                              <>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                  মেধা: #{r.csvInfo.merit}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  নম্বর: {r.csvInfo.totalMarks} · GPA {r.csvInfo.gpa} ({r.csvInfo.grade})
                                </span>
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                    r.csvInfo.isFail
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {r.csvInfo.status}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Status + Target Class + Group (if 9/10) + New Roll */}
                    <div className="flex flex-wrap items-center gap-2 pl-7 lg:pl-0 shrink-0">
                      {/* Result Decision */}
                      <select
                        disabled={!r.checked}
                        value={r.resultStatus}
                        onChange={(e) => updateRow(r._id, { resultStatus: e.target.value })}
                        className={`px-2.5 py-2 rounded-xl text-xs font-black border outline-none ${
                          r.resultStatus === 'Promoted'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : r.resultStatus === 'Failed'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}
                      >
                        <option value="Promoted">Promoted (উত্তীর্ণ)</option>
                        <option value="Failed">Failed (একই ক্লাস)</option>
                        <option value="Transferred">Transferred (টিসি/পাস-আউট)</option>
                      </select>

                      {/* Target Class */}
                      {r.resultStatus !== 'Transferred' && (
                        <select
                          disabled={!r.checked}
                          value={r.nextClassBn}
                          onChange={(e) => updateRow(r._id, { nextClassBn: e.target.value })}
                          className="w-28 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-800 outline-none focus:border-[#060D1F]"
                        >
                          {CLASS_LIST_BN.map((cls) => (
                            <option key={cls} value={cls}>{cls} শ্রেণি</option>
                          ))}
                        </select>
                      )}

                      {/* Group selector for 9th/10th */}
                      {showGroup && (
                        <select
                          disabled={!r.checked}
                          value={r.nextGroup || 'General'}
                          onChange={(e) => updateRow(r._id, { nextGroup: e.target.value })}
                          className="w-28 px-2.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-black text-indigo-800 outline-none"
                        >
                          <option value="General">General</option>
                          <option value="Science">Science</option>
                          <option value="Muzabbid">Muzabbid</option>
                        </select>
                      )}

                      {/* New Roll Input */}
                      {r.resultStatus !== 'Transferred' && (
                        <div className="relative w-24">
                          <input
                            type="number"
                            min={1}
                            max={500}
                            disabled={!r.checked}
                            value={r.nextRoll}
                            onChange={(e) => updateRow(r._id, { nextRoll: e.target.value.replace(/\D/g, '') })}
                            placeholder="নতুন রোল"
                            className={`w-full px-3 py-2 rounded-xl text-xs font-mono font-black text-center outline-none border transition ${
                              rowErr
                                ? 'bg-red-50 border-red-500 text-red-700'
                                : 'bg-white border-slate-300 text-slate-900 focus:border-[#060D1F]'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row-level Duplicate / Validation Error */}
                  {rowErr && (
                    <div className="mt-2.5 pl-7 flex items-center gap-1.5 text-[11px] font-black text-red-600">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{rowErr}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== STICKY BOTTOM ACTION BAR ==================== */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 lg:px-8 py-3.5 shadow-[0_-10px_30px_rgba(6,13,31,0.08)]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs font-black">
            <span className="text-emerald-700">উত্তীর্ণ: {validationState.promotedCount}</span>
            <span className="text-red-600">অকৃতকার্য: {validationState.failedCount}</span>
            {validationState.transferredCount > 0 && (
              <span className="text-amber-700">টিসি: {validationState.transferredCount}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCsvMeta(null);
                setSourceClass(sourceClass);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black flex items-center gap-1.5"
            >
              <RotateCcw size={14} /> রিসেট
            </button>
            <button
              type="button"
              disabled={!validationState.canSubmit || submitting}
              onClick={() => setConfirmOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-[#060D1F] hover:bg-slate-800 text-[#D4A843] text-xs font-black flex items-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Award size={15} />
              <span>প্রমোশন নিশ্চিত করুন ({validationState.selectedCount} জন)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== CONFIRMATION MODAL ==================== */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-[#060D1F] text-white px-6 py-5">
              <h3 className="text-base font-black text-[#F7E09A]">প্রমোশন চূড়ান্ত নিশ্চিতকরণ</h3>
              <p className="text-xs text-slate-300 font-medium mt-1">
                সকল শিক্ষার্থীর পূর্বের সেশনের ({sourceSession}) তথ্য তাদের <b>Academic History</b>-তে স্থায়ীভাবে সংরক্ষিত থাকবে।
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] font-black text-emerald-600 uppercase">উত্তীর্ণ</p>
                  <p className="text-xl font-black text-emerald-800">{validationState.promotedCount}</p>
                </div>
                <div className="p-3 rounded-2xl bg-red-50 border border-red-200">
                  <p className="text-[10px] font-black text-red-600 uppercase">অকৃতকার্য</p>
                  <p className="text-xl font-black text-red-800">{validationState.failedCount}</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <p className="text-[10px] font-black text-amber-600 uppercase">টিসি/পাস</p>
                  <p className="text-xl font-black text-amber-800">{validationState.transferredCount}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 text-center">
                টার্গেট সেশন: <span className="font-mono font-black text-[#060D1F]">{targetSession}</span> · মোট আপডেট: <span className="font-black text-emerald-700">{validationState.selectedCount} জন</span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black"
                >
                  ফিরে যান
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmPromotion}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>{submitting ? 'আপডেট হচ্ছে...' : 'হ্যাঁ, সম্পন্ন করুন'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkPromotionView;