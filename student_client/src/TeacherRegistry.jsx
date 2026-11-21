import React, { useState, useEffect, useMemo, useRef, useId, useCallback } from 'react';
import {
  Search, Plus, X, Pencil, Trash2, ShieldCheck, BookOpen, GraduationCap,
  Phone, Mail, MapPin, Calendar, Printer, AlertTriangle, Users, Layers,
  Check, CreditCard, Droplet, Lock, Eye, FileSpreadsheet, Stamp, Loader2,
  Camera, BadgeCheck, AlertCircle, Filter, School,
} from 'lucide-react';
import * as XLSX from 'xlsx';

/* ============================================================
   ⚙️ CONFIG
   প্রোডাকশনে এই অংশ বাদ দিয়ে আপনার বিদ্যমান config.js থেকে ইমপোর্ট করুন
   (CLOUD_NAME, UPLOAD_PRESET, ADMIN_SECRET, CLASS_ORDER, APP_NAME ইতিমধ্যে আছে)
   ============================================================ */
const CLOUD_NAME = 'djjnoclzp';
const UPLOAD_PRESET = 'student_db';
const ADMIN_SECRET = 'ARDM_DELETE_2026';
const APP_NAME = 'আব্দুর রাজ্জাক দাখিল মাদরাসা';

const CLASS_ORDER = {
  'প্লে': 1, 'নার্সারি': 2, 'কেজি': 3,
  '১ম': 4, '২য়': 5, '৩য়': 6, '৪র্থ': 7, '৫ম': 8,
  '৬ষ্ঠ': 9, '৭ম': 10, '৮ম': 11, '৯ম': 12, '১০ম': 13,
};
const CLASSES = Object.entries(CLASS_ORDER).sort((a, b) => a[1] - b[1]).map(([k]) => k);

const DESIGNATIONS = [
  'সুপার', 'সহকারী সুপার', 'প্রভাষক', 'সিনিয়র শিক্ষক',
  'সহকারী শিক্ষক', 'ক্বারী সাহেব', 'শারীরিক শিক্ষা শিক্ষক', 'গ্রন্থাগারিক',
];

const DEFAULT_SUBJECTS = [
  'বাংলা', 'ইংরেজি', 'গণিত', 'সাধারণ বিজ্ঞান', 'বাংলাদেশ ও বিশ্বপরিচয়',
  'তথ্য ও যোগাযোগ প্রযুক্তি', 'কুরআন মাজীদ', 'হাদীস শরীফ', 'আরবি ১ম পত্র',
  'আরবি ২য় পত্র', 'আকাইদ ও ফিকহ', 'তাজভীদ', 'ইসলামের ইতিহাস', 'শারীরিক শিক্ষা',
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const STATUS_META = {
  active: { label: 'কর্মরত', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  leave: { label: 'ছুটিতে', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  resigned: { label: 'অব্যাহতিপ্রাপ্ত', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
};

const LS_KEYS = {
  teachers: 'ardm_teachers_v1',
  subjects: 'ardm_custom_subjects_v1',
  serial: 'ardm_teacher_serial_v1',
};

/* ============================================================
   🧰 UTILITIES
   ============================================================ */
function cx(...a) { return a.filter(Boolean).join(' '); }

function genId() {
  return 'T' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function readLS(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function writeLS(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota or sandbox */ }
}

// সাধারণ ব্রাউজার localStorage (আপনার আসল সাইটে normal কাজ করবে)
function useLocalState(key, initial) {
  const [state, setState] = useState(() => readLS(key, initial));
  useEffect(() => { writeLS(key, state); }, [key, state]);
  return [state, setState];
}

function formatDateBn(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso; }
}

const PHONE_RE = /^01[3-9]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NID_RE = /^\d{10}$|^\d{13}$|^\d{17}$/;

function compressImage(file, maxW = 480, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('ছবি লোড করা যায়নি'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('ফাইল পড়া যায়নি'));
    reader.readAsDataURL(file);
  });
}

async function uploadToCloudinary(dataUrl) {
  const form = new FormData();
  form.append('file', dataUrl);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('tags', 'teacher,ardm');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.secure_url;
}

function buildSubjectMap(teachers, excludeId = null) {
  const map = {};
  teachers.forEach((t) => {
    if (t.id === excludeId) return;
    (t.subjects || []).forEach((s) => {
      map[`${s.classBn}__${s.subjectName}`] = { teacherId: t.id, teacherName: t.nameBn };
    });
  });
  return map;
}
function buildClassTeacherMap(teachers, excludeId = null) {
  const map = {};
  teachers.forEach((t) => {
    if (t.id === excludeId) return;
    if (t.classTeacherOf) map[t.classTeacherOf] = { teacherId: t.id, teacherName: t.nameBn };
  });
  return map;
}

function exportToExcel(teachers) {
  const rows = teachers.map((t) => ({
    'ক্রমিক': t.serial,
    'আইডি': t.id,
    'নাম (বাংলা)': t.nameBn,
    'নাম (English)': t.nameEn,
    'পদবি': t.designation,
    'মোবাইল': t.phone,
    'ইমেইল': t.email,
    'যোগ্যতা': t.qualification,
    'যোগদানের তারিখ': t.joiningDate,
    'শ্রেণি শিক্ষক': t.classTeacherOf || '—',
    'মোট বিষয়': (t.subjects || []).length,
    'বিষয়-শ্রেণি বিবরণ': (t.subjects || []).map((s) => `${s.subjectName}(${s.classBn})`).join(', '),
    'অবস্থা': (STATUS_META[t.status] || STATUS_META.active).label,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'শিক্ষক তালিকা');

  const dist = [];
  CLASSES.forEach((cls) => {
    teachers.forEach((t) => (t.subjects || [])
      .filter((s) => s.classBn === cls)
      .forEach((s) => dist.push({ 'শ্রেণি': cls, 'বিষয়': s.subjectName, 'শিক্ষক': t.nameBn })));
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dist), 'শ্রেণি-বিষয় বণ্টন');
  XLSX.writeFile(wb, `ARDM_শিক্ষক_তালিকা_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ============================================================
   🎴 ছোট UI অংশ (atoms)
   ============================================================ */
function Eyebrow({ children, tone = 'default' }) {
  return (
    <p className={cx('text-xs tracking-widest uppercase font-medium', tone === 'dark' ? 'text-amber-200' : 'text-amber-700')}
       style={{ fontFamily: "'Cormorant Garamond', serif" }}>
      {children}
    </p>
  );
}

function GoldRule() {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="h-px w-10 bg-amber-400" />
      <span className="w-1 h-1 rounded-full bg-amber-500" />
      <span className="h-px w-10 bg-amber-400" />
    </div>
  );
}

function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-rose-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{children}</p>;
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.active;
  return <span className={cx('text-xs px-2 py-0.5 rounded-full border font-medium', meta.cls)}>{meta.label}</span>;
}

/* ============================================================
   🔏 OfficialSeal — সিগনেচার এলিমেন্ট
   ============================================================ */
function OfficialSeal({ size = 80, dim = false, ring = true }) {
  const rid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={dim ? 'opacity-40' : ''}>
      <defs>
        <path id={`circlePath-${rid}`} d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
      </defs>
      {ring && <circle cx="50" cy="50" r="46" fill="none" stroke="#9c7a1f" strokeWidth="1.2" />}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#9c7a1f" strokeWidth="0.8" strokeDasharray="1.4 2.6" />
      <text fontSize="5.8" fill="#8a6a18" letterSpacing="1.3">
        <textPath href={`#circlePath-${rid}`} startOffset="1%">
          ✦ শিক্ষক রেজিস্ট্রি ✦ আব্দুর রাজ্জাক দাখিল মাদরাসা ✦
        </textPath>
      </text>
      <circle cx="50" cy="50" r="22" fill="none" stroke="#9c7a1f" strokeWidth="0.8" />
      <circle cx="48.5" cy="50" r="9" fill="#9c7a1f" />
      <circle cx="53" cy="46.5" r="7.6" fill="#fffdf6" />
    </svg>
  );
}

/* ============================================================
   📊 StatCard
   ============================================================ */
function StatCard({ icon: Icon, label, value, accent = 'emerald' }) {
  const ring = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    rose: 'text-rose-700 bg-rose-50 border-rose-200',
  }[accent];
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 flex items-center gap-3 shadow-sm">
      <div className={cx('w-10 h-10 rounded-full border flex items-center justify-center shrink-0', ring)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-stone-800 leading-none" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{value}</p>
        <p className="text-xs text-stone-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

/* ============================================================
   🗂️ TeacherCard — রোস্টার আইটেম (ইনডেক্স কার্ড স্টাইল)
   ============================================================ */
function TeacherCard({ teacher, isAdmin, onView, onEdit, onDelete }) {
  const subjCount = (teacher.subjects || []).length;
  return (
    <div className="relative bg-white border border-stone-200 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-3 flex flex-col items-center justify-evenly bg-stone-50 border-r border-stone-200">
        {[0, 1, 2, 3, 4].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-stone-300" />)}
      </div>
      <div className="pl-6 pr-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-stone-400">ক্রমিক #{String(teacher.serial).padStart(3, '0')}</span>
          <StatusBadge status={teacher.status} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onView(teacher)} className="shrink-0">
            {teacher.photo ? (
              <img src={teacher.photo} alt={teacher.nameBn} className="w-14 h-14 rounded-md object-cover border border-stone-200" />
            ) : (
              <div className="w-14 h-14 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-semibold text-lg"
                   style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {teacher.nameBn?.[0] || '?'}
              </div>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <button onClick={() => onView(teacher)} className="text-left block w-full">
              <p className="font-semibold text-stone-800 truncate" style={{ fontFamily: "'Noto Serif Bengali', serif" }}>{teacher.nameBn}</p>
            </button>
            <p className="text-xs text-stone-500 truncate">{teacher.designation}</p>
            {teacher.classTeacherOf && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                <BadgeCheck className="w-3 h-3" /> {teacher.classTeacherOf} শ্রেণি শিক্ষক
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
          <BookOpen className="w-3.5 h-3.5" /> {subjCount} টি বিষয় নিয়োগপ্রাপ্ত
        </div>
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2">
          <button onClick={() => onView(teacher)} className="flex-1 text-xs px-2 py-1.5 rounded border border-stone-200 hover:bg-stone-50 flex items-center justify-center gap-1 text-stone-600">
            <Eye className="w-3.5 h-3.5" /> প্রোফাইল
          </button>
          {isAdmin && (
            <>
              <button onClick={() => onEdit(teacher)} className="text-xs px-2 py-1.5 rounded border border-stone-200 hover:bg-stone-50 text-stone-600">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(teacher)} className="text-xs px-2 py-1.5 rounded border border-rose-200 hover:bg-rose-50 text-rose-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   📇 ClassRail — শ্রেণি সূচক (sidebar)
   ============================================================ */
function ClassRail({ active, onChange, counts }) {
  return (
    <div className="bg-white border border-stone-200 rounded-md overflow-hidden">
      <div className="px-3 py-2 bg-stone-50 border-b border-stone-200">
        <Eyebrow>শ্রেণি সূচক</Eyebrow>
      </div>
      <button onClick={() => onChange('all')}
        className={cx('w-full flex items-center justify-between px-3 py-2 text-sm border-b border-stone-100',
          active === 'all' ? 'bg-emerald-50 text-emerald-800 font-medium' : 'text-stone-600 hover:bg-stone-50')}>
        <span>সকল শ্রেণি</span>
        <span className="text-xs text-stone-400">{counts.all || 0}</span>
      </button>
      {CLASSES.map((c) => (
        <button key={c} onClick={() => onChange(c)}
          className={cx('w-full flex items-center justify-between px-3 py-2 text-sm border-b border-stone-100 last:border-b-0',
            active === c ? 'bg-emerald-50 text-emerald-800 font-medium' : 'text-stone-600 hover:bg-stone-50')}>
          <span>{c} শ্রেণি</span>
          <span className="text-xs text-stone-400">{counts[c] || 0}</span>
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   🔔 ToastHost
   ============================================================ */
function ToastHost({ toasts }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div key={t.id}
          className={cx('px-4 py-3 rounded-md shadow-lg border text-sm flex items-start gap-2 bg-white',
            t.type === 'error' ? 'border-rose-300 text-rose-800' : t.type === 'success' ? 'border-emerald-300 text-emerald-800' : 'border-stone-300 text-stone-700')}
          style={{ animation: 'fadeIn 0.2s ease' }}>
          {t.type === 'success' ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : t.type === 'error' ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   📚 SubjectAssignmentEditor — বিষয় ও শ্রেণি বণ্টন + কনফ্লিক্ট ভ্যালিডেশন
   ============================================================ */
function SubjectAssignmentEditor({ subjects, onChange, conflictMap, allSubjects }) {
  const [draftSubject, setDraftSubject] = useState('');
  const [draftClass, setDraftClass] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [error, setError] = useState('');

  const addRow = () => {
    setError('');
    const subjectName = (showCustom ? customInput : draftSubject).trim();
    if (!subjectName || !draftClass) { setError('বিষয় ও শ্রেণি দুটোই নির্বাচন করুন।'); return; }
    if (subjects.some((s) => s.classBn === draftClass && s.subjectName === subjectName)) {
      setError('এই বিষয়টি এই শিক্ষকের তালিকায় আগেই যুক্ত আছে।'); return;
    }
    const key = `${draftClass}__${subjectName}`;
    if (conflictMap[key]) {
      setError(`"${subjectName}" বিষয়টি ${draftClass} শ্রেণিতে ইতোমধ্যে ${conflictMap[key].teacherName}-কে দেওয়া আছে।`);
      return;
    }
    onChange([...subjects, { subjectName, classBn: draftClass }]);
    setDraftSubject(''); setDraftClass(''); setCustomInput(''); setShowCustom(false);
  };

  const removeRow = (idx) => onChange(subjects.filter((_, i) => i !== idx));

  const grouped = useMemo(() => {
    const g = {};
    subjects.forEach((s) => { (g[s.classBn] = g[s.classBn] || []).push(s.subjectName); });
    return g;
  }, [subjects]);

  return (
    <div>
      <div className="bg-stone-50 border border-stone-200 rounded-md p-3 mb-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select value={draftClass} onChange={(e) => setDraftClass(e.target.value)} className="text-sm border border-stone-300 rounded px-2 py-2 bg-white">
            <option value="">শ্রেণি নির্বাচন</option>
            {CLASSES.map((c) => <option key={c} value={c}>{c} শ্রেণি</option>)}
          </select>
          {!showCustom ? (
            <select value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} className="text-sm border border-stone-300 rounded px-2 py-2 bg-white">
              <option value="">বিষয় নির্বাচন</option>
              {allSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input value={customInput} onChange={(e) => setCustomInput(e.target.value)} placeholder="নতুন বিষয়ের নাম"
              className="text-sm border border-stone-300 rounded px-2 py-2 bg-white" />
          )}
          <button type="button" onClick={addRow} className="text-sm bg-emerald-800 text-white rounded px-3 py-2 hover:bg-emerald-900 flex items-center justify-center gap-1">
            <Plus className="w-4 h-4" /> যুক্ত করুন
          </button>
        </div>
        <button type="button" onClick={() => { setShowCustom((v) => !v); setDraftSubject(''); setCustomInput(''); }}
          className="text-xs text-amber-700 mt-2 underline">
          {showCustom ? 'তালিকা থেকে নির্বাচন করুন' : '+ নতুন বিষয় যুক্ত করুন'}
        </button>
        <FieldError>{error}</FieldError>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-4">এখনো কোনো বিষয় নিয়োগ দেওয়া হয়নি।</p>
      ) : (
        <div className="space-y-2">
          {CLASSES.filter((c) => grouped[c]).map((c) => (
            <div key={c} className="flex items-start gap-2 text-sm">
              <span className="shrink-0 w-20 text-stone-500">{c} শ্রেণি</span>
              <div className="flex flex-wrap gap-1.5">
                {grouped[c].map((sName) => {
                  const idx = subjects.findIndex((s) => s.classBn === c && s.subjectName === sName);
                  return (
                    <span key={sName} className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-2 py-1 rounded-full">
                      {sName}
                      <button type="button" onClick={() => removeRow(idx)} className="hover:text-rose-700"><X className="w-3 h-3" /></button>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   🏷️ ClassTeacherPicker — একটি ক্লাসে একজনই শ্রেণি শিক্ষক
   ============================================================ */
function ClassTeacherPicker({ value, onChange, classTeacherMap, selfId }) {
  const [pendingConflict, setPendingConflict] = useState(null);

  const handlePick = (cls) => {
    if (cls === value) { onChange(null); return; }
    if (classTeacherMap[cls] && classTeacherMap[cls].teacherId !== selfId) {
      setPendingConflict({ cls, name: classTeacherMap[cls].teacherName });
      return;
    }
    onChange(cls);
  };

  return (
    <div>
      <p className="text-sm text-stone-600 mb-2">একজন শিক্ষক সর্বোচ্চ একটি শ্রেণির শ্রেণি শিক্ষক হতে পারেন।</p>
      <div className="flex flex-wrap gap-2">
        {CLASSES.map((c) => {
          const taken = classTeacherMap[c] && classTeacherMap[c].teacherId !== selfId;
          const isSelf = value === c;
          return (
            <button key={c} type="button" onClick={() => handlePick(c)}
              className={cx('text-xs px-3 py-1.5 rounded-full border transition-colors',
                isSelf ? 'bg-amber-600 text-white border-amber-600' :
                  taken ? 'bg-stone-50 text-stone-400 border-stone-200' :
                    'bg-white text-stone-600 border-stone-300 hover:border-emerald-400')}>
              {c} {taken && <span>({classTeacherMap[c].teacherName})</span>}
              {isSelf && <Check className="w-3 h-3 inline ml-1" />}
            </button>
          );
        })}
      </div>
      {pendingConflict && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
          <p className="text-amber-800 mb-2 flex items-start gap-1.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span><strong>{pendingConflict.cls}</strong> শ্রেণির বর্তমান শ্রেণি শিক্ষক <strong>{pendingConflict.name}</strong>। তাকে অপসারণ করে এই শিক্ষককে নিয়োগ দিতে চান?</span>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => { onChange(pendingConflict.cls); setPendingConflict(null); }}
              className="text-xs bg-amber-700 text-white px-3 py-1.5 rounded">হ্যাঁ, পরিবর্তন করুন</button>
            <button type="button" onClick={() => setPendingConflict(null)} className="text-xs border border-stone-300 px-3 py-1.5 rounded">বাতিল</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   📝 TeacherForm — Add / Edit drawer
   ============================================================ */
const BLANK_TEACHER = () => ({
  id: null, nameBn: '', nameEn: '', designation: '', phone: '', email: '', nid: '',
  address: '', qualification: '', joiningDate: '', bloodGroup: '', photo: '',
  status: 'active', subjects: [], classTeacherOf: null,
});

function TeacherForm({ teacher, teachers, allSubjects, onSave, onClose, pushToast }) {
  const isEdit = !!teacher;
  const [draft, setDraft] = useState(() => (teacher ? { ...teacher } : BLANK_TEACHER()));
  const [tab, setTab] = useState('basic');
  const [errors, setErrors] = useState({});
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileRef = useRef(null);

  const subjectMap = useMemo(() => buildSubjectMap(teachers, draft.id), [teachers, draft.id]);
  const classTeacherMap = useMemo(() => buildClassTeacherMap(teachers, draft.id), [teachers, draft.id]);

  const set = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  const validate = () => {
    const e = {};
    if (!draft.nameBn.trim()) e.nameBn = 'বাংলা নাম আবশ্যক।';
    if (!draft.designation) e.designation = 'পদবি নির্বাচন করুন।';
    if (!draft.phone.trim()) e.phone = 'মোবাইল নম্বর আবশ্যক।';
    else if (!PHONE_RE.test(draft.phone.trim())) e.phone = 'সঠিক মোবাইল নম্বর দিন (যেমনঃ 017xxxxxxxx)।';
    else if (teachers.some((t) => t.id !== draft.id && t.phone === draft.phone.trim())) e.phone = 'এই মোবাইল নম্বর অন্য একজন শিক্ষকের নামে নিবন্ধিত।';
    if (draft.email && !EMAIL_RE.test(draft.email.trim())) e.email = 'সঠিক ইমেইল ঠিকানা দিন।';
    if (draft.nid && !NID_RE.test(draft.nid.trim())) e.nid = 'NID নম্বর ১০, ১৩ বা ১৭ ডিজিটের হতে হবে।';
    else if (draft.nid && teachers.some((t) => t.id !== draft.id && t.nid === draft.nid.trim())) e.nid = 'এই NID অন্য একজন শিক্ষকের নামে নিবন্ধিত।';
    if (!draft.joiningDate) e.joiningDate = 'যোগদানের তারিখ আবশ্যক।';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { pushToast('শুধুমাত্র ছবি ফাইল নির্বাচন করুন।', 'error'); return; }
    if (file.size > 8 * 1024 * 1024) { pushToast('ছবির আকার ৮MB এর কম হতে হবে।', 'error'); return; }
    setPhotoLoading(true);
    try {
      const compressed = await compressImage(file);
      set('photo', compressed);
      try {
        const url = await uploadToCloudinary(compressed);
        set('photo', url);
      } catch {
        pushToast('ক্লাউড আপলোড ব্যর্থ হয়েছে — সাময়িকভাবে লোকাল ছবি ব্যবহৃত হচ্ছে।', 'error');
      }
    } catch {
      pushToast('ছবি প্রসেস করা যায়নি।', 'error');
    } finally {
      setPhotoLoading(false);
    }
  };

  const submit = () => {
    if (!validate()) { setTab('basic'); pushToast('ফর্মে কিছু ভুল আছে, দয়া করে ঠিক করুন।', 'error'); return; }
    onSave(draft);
  };

  const tabs = [
    { id: 'basic', label: 'মৌলিক তথ্য', icon: Users },
    { id: 'contact', label: 'যোগাযোগ', icon: Phone },
    { id: 'subjects', label: 'বিষয় বণ্টন', icon: BookOpen },
    { id: 'classteacher', label: 'শ্রেণি শিক্ষক', icon: BadgeCheck },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(28,25,23,0.55)' }} onClick={onClose} />
      <div className="relative w-full max-w-xl bg-stone-50 h-full overflow-y-auto shadow-2xl flex flex-col" style={{ animation: 'slideIn 0.25s ease' }}>
        <div className="sticky top-0 bg-emerald-900 text-white px-5 py-4 flex items-center justify-between z-10">
          <div>
            <Eyebrow tone="dark">{isEdit ? 'এন্ট্রি সম্পাদনা' : 'নতুন ভুক্তি'}</Eyebrow>
            <h3 className="text-lg font-semibold" style={{ fontFamily: "'Noto Serif Bengali', serif" }}>
              {isEdit ? (draft.nameBn || 'শিক্ষক সম্পাদনা') : 'নতুন শিক্ষক নিবন্ধন'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-emerald-800 rounded"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-stone-200 bg-white overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cx('flex items-center gap-1.5 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors',
                tab === t.id ? 'border-emerald-700 text-emerald-800 font-medium' : 'border-transparent text-stone-500 hover:text-stone-700')}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 flex-1">
          {tab === 'basic' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => fileRef.current?.click()} className="relative shrink-0">
                  {photoLoading ? (
                    <div className="w-20 h-20 rounded-md bg-stone-100 border border-stone-300 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
                    </div>
                  ) : draft.photo ? (
                    <img src={draft.photo} alt="" className="w-20 h-20 rounded-md object-cover border border-stone-300" />
                  ) : (
                    <div className="w-20 h-20 rounded-md bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center text-stone-400">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 bg-emerald-800 text-white rounded-full p-1"><Pencil className="w-3 h-3" /></span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} />
                <div className="text-xs text-stone-500">শিক্ষকের পরিচয়পত্রের ছবি আপলোড করুন (স্পষ্ট, সম্মুখ থেকে তোলা)।</div>
              </div>

              <div>
                <label className="text-sm text-stone-600">নাম (বাংলা) *</label>
                <input value={draft.nameBn} onChange={(e) => set('nameBn', e.target.value)}
                  className={cx('w-full mt-1 border rounded px-3 py-2 text-sm', errors.nameBn ? 'border-rose-400' : 'border-stone-300')} />
                <FieldError>{errors.nameBn}</FieldError>
              </div>
              <div>
                <label className="text-sm text-stone-600">নাম (English)</label>
                <input value={draft.nameEn} onChange={(e) => set('nameEn', e.target.value)} className="w-full mt-1 border border-stone-300 rounded px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-stone-600">পদবি *</label>
                  <select value={draft.designation} onChange={(e) => set('designation', e.target.value)}
                    className={cx('w-full mt-1 border rounded px-3 py-2 text-sm bg-white', errors.designation ? 'border-rose-400' : 'border-stone-300')}>
                    <option value="">নির্বাচন করুন</option>
                    {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <FieldError>{errors.designation}</FieldError>
                </div>
                <div>
                  <label className="text-sm text-stone-600">অবস্থা</label>
                  <select value={draft.status} onChange={(e) => set('status', e.target.value)} className="w-full mt-1 border border-stone-300 rounded px-3 py-2 text-sm bg-white">
                    {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-stone-600">যোগদানের তারিখ *</label>
                  <input type="date" value={draft.joiningDate} onChange={(e) => set('joiningDate', e.target.value)}
                    className={cx('w-full mt-1 border rounded px-3 py-2 text-sm', errors.joiningDate ? 'border-rose-400' : 'border-stone-300')} />
                  <FieldError>{errors.joiningDate}</FieldError>
                </div>
                <div>
                  <label className="text-sm text-stone-600">রক্তের গ্রুপ</label>
                  <select value={draft.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} className="w-full mt-1 border border-stone-300 rounded px-3 py-2 text-sm bg-white">
                    <option value="">নির্বাচন করুন</option>
                    {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-stone-600">শিক্ষাগত যোগ্যতা</label>
                <input value={draft.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="যেমনঃ কামিল, ইসলামিক স্টাডিজ"
                  className="w-full mt-1 border border-stone-300 rounded px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          {tab === 'contact' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-stone-600">মোবাইল নম্বর *</label>
                <input value={draft.phone} onChange={(e) => set('phone', e.target.value)} placeholder="01XXXXXXXXX"
                  className={cx('w-full mt-1 border rounded px-3 py-2 text-sm', errors.phone ? 'border-rose-400' : 'border-stone-300')} />
                <FieldError>{errors.phone}</FieldError>
              </div>
              <div>
                <label className="text-sm text-stone-600">ইমেইল</label>
                <input value={draft.email} onChange={(e) => set('email', e.target.value)}
                  className={cx('w-full mt-1 border rounded px-3 py-2 text-sm', errors.email ? 'border-rose-400' : 'border-stone-300')} />
                <FieldError>{errors.email}</FieldError>
              </div>
              <div>
                <label className="text-sm text-stone-600">জাতীয় পরিচয়পত্র নম্বর (NID)</label>
                <input value={draft.nid} onChange={(e) => set('nid', e.target.value)}
                  className={cx('w-full mt-1 border rounded px-3 py-2 text-sm', errors.nid ? 'border-rose-400' : 'border-stone-300')} />
                <FieldError>{errors.nid}</FieldError>
              </div>
              <div>
                <label className="text-sm text-stone-600">ঠিকানা</label>
                <textarea value={draft.address} onChange={(e) => set('address', e.target.value)} rows={3} className="w-full mt-1 border border-stone-300 rounded px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          {tab === 'subjects' && (
            <SubjectAssignmentEditor subjects={draft.subjects} onChange={(s) => set('subjects', s)} conflictMap={subjectMap} allSubjects={allSubjects} />
          )}

          {tab === 'classteacher' && (
            <ClassTeacherPicker value={draft.classTeacherOf} onChange={(c) => set('classTeacherOf', c)} classTeacherMap={classTeacherMap} selfId={draft.id} />
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-stone-200 p-4 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-stone-300 rounded py-2.5 text-sm text-stone-600 hover:bg-stone-50">বাতিল</button>
          <button onClick={submit} className="flex-1 bg-emerald-800 text-white rounded py-2.5 text-sm hover:bg-emerald-900 flex items-center justify-center gap-2">
            <Stamp className="w-4 h-4" /> {isEdit ? 'হালনাগাদ করুন' : 'নিবন্ধন সম্পন্ন করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   🪪 ID Card
   ============================================================ */
function IDCard({ teacher }) {
  return (
    <div id="id-card-print-area" className="mx-auto bg-white rounded-xl overflow-hidden border border-stone-300 shadow-lg" style={{ width: 340 }}>
      <div className="px-4 py-3 text-white" style={{ background: 'linear-gradient(135deg,#0b3d2e,#14532d)' }}>
        <div className="flex items-center gap-2">
          <School className="w-5 h-5 text-amber-200" />
          <div>
            <p className="text-xs tracking-widest uppercase text-amber-200">FACULTY ID CARD</p>
            <p className="text-sm font-semibold" style={{ fontFamily: "'Noto Serif Bengali', serif" }}>{APP_NAME}</p>
          </div>
        </div>
      </div>
      <div className="p-4 flex gap-4">
        {teacher.photo ? (
          <img src={teacher.photo} alt="" className="w-20 h-24 rounded object-cover border border-stone-300" />
        ) : (
          <div className="w-20 h-24 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl text-emerald-700" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {teacher.nameBn?.[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800 leading-tight" style={{ fontFamily: "'Noto Serif Bengali', serif" }}>{teacher.nameBn}</p>
          <p className="text-xs text-stone-500">{teacher.designation}</p>
          <p className="text-xs font-mono text-stone-400 mt-1">ID: {teacher.id}</p>
          <p className="text-xs text-stone-500 mt-1 flex items-center gap-1"><Phone className="w-3 h-3" /> {teacher.phone}</p>
          {teacher.bloodGroup && <p className="text-xs text-rose-600 mt-0.5 flex items-center gap-1"><Droplet className="w-3 h-3" /> {teacher.bloodGroup}</p>}
        </div>
      </div>
      <div className="px-4 pb-3 flex items-center justify-between border-t border-stone-100 pt-2">
        <div className="text-xs text-stone-400">মেয়াদঃ জানুয়ারি – ডিসেম্বর {new Date().getFullYear()}</div>
        <OfficialSeal size={44} />
      </div>
    </div>
  );
}

function IDCardModal({ teacher, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(28,25,23,0.6)' }} onClick={onClose} />
      <div className="relative bg-stone-100 rounded-xl p-6 max-w-md w-full">
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 hover:bg-stone-200 rounded"><X className="w-4 h-4" /></button>
        <IDCard teacher={teacher} />
        <button onClick={() => window.print()} className="mt-4 w-full bg-emerald-800 text-white rounded py-2.5 text-sm flex items-center justify-center gap-2 hover:bg-emerald-900">
          <Printer className="w-4 h-4" /> প্রিন্ট করুন
        </button>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #id-card-print-area, #id-card-print-area * { visibility: visible; }
          #id-card-print-area { position: fixed; top: 40px; left: 50%; transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   👤 ProfileView
   ============================================================ */
function ProfileView({ teacher, isAdmin, onClose, onEdit, onShowId }) {
  const grouped = useMemo(() => {
    const g = {};
    (teacher.subjects || []).forEach((s) => { (g[s.classBn] = g[s.classBn] || []).push(s.subjectName); });
    return g;
  }, [teacher]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(28,25,23,0.6)' }} onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-2xl overflow-y-auto" style={{ maxHeight: '90vh' }}>
        <div className="relative px-6 py-6 text-white" style={{ background: 'linear-gradient(135deg,#0b3d2e,#1d5c43)' }}>
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-emerald-800 rounded"><X className="w-5 h-5" /></button>
          <div className="flex items-center gap-4">
            {teacher.photo ? (
              <img src={teacher.photo} alt="" className="w-20 h-20 rounded-lg object-cover border-2 border-amber-300" />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-emerald-800 border-2 border-amber-300 flex items-center justify-center text-3xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{teacher.nameBn?.[0]}</div>
            )}
            <div>
              <Eyebrow tone="dark">ক্রমিক #{String(teacher.serial).padStart(3, '0')} · {teacher.designation}</Eyebrow>
              <h2 className="text-2xl font-semibold" style={{ fontFamily: "'Noto Serif Bengali', serif" }}>{teacher.nameBn}</h2>
              {teacher.nameEn && <p className="text-sm text-emerald-100">{teacher.nameEn}</p>}
            </div>
            <div className="ml-auto hidden sm:block"><OfficialSeal size={64} dim /></div>
          </div>
        </div>

        <div className="p-6 grid sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-stone-600"><Phone className="w-4 h-4 text-emerald-700" /> {teacher.phone || '—'}</div>
          <div className="flex items-center gap-2 text-stone-600"><Mail className="w-4 h-4 text-emerald-700" /> {teacher.email || '—'}</div>
          <div className="flex items-center gap-2 text-stone-600"><Calendar className="w-4 h-4 text-emerald-700" /> যোগদানঃ {formatDateBn(teacher.joiningDate)}</div>
          <div className="flex items-center gap-2 text-stone-600"><GraduationCap className="w-4 h-4 text-emerald-700" /> {teacher.qualification || '—'}</div>
          <div className="flex items-center gap-2 text-stone-600"><Droplet className="w-4 h-4 text-rose-600" /> {teacher.bloodGroup || '—'}</div>
          <div className="flex items-center gap-2 text-stone-600 sm:col-span-2"><MapPin className="w-4 h-4 text-emerald-700" /> {teacher.address || '—'}</div>
        </div>

        <div className="px-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            <Eyebrow>নিয়োগপ্রাপ্ত বিষয় ও শ্রেণি</Eyebrow>
            <StatusBadge status={teacher.status} />
          </div>
          {teacher.classTeacherOf && (
            <div className="mb-3 inline-flex items-center gap-1.5 text-sm bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-md">
              <BadgeCheck className="w-4 h-4" /> {teacher.classTeacherOf} শ্রেণির শ্রেণি শিক্ষক
            </div>
          )}
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-stone-400 py-3">কোনো বিষয় নিয়োগ দেওয়া হয়নি।</p>
          ) : (
            <div className="space-y-2 mb-2">
              {CLASSES.filter((c) => grouped[c]).map((c) => (
                <div key={c} className="flex items-start gap-2 text-sm border-b border-stone-100 pb-2">
                  <span className="w-20 shrink-0 text-stone-500">{c} শ্রেণি</span>
                  <div className="flex flex-wrap gap-1.5">
                    {grouped[c].map((s) => <span key={s} className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 pt-2 flex gap-3 border-t border-stone-100">
          <button onClick={() => onShowId(teacher)} className="flex-1 border border-stone-300 rounded py-2.5 text-sm flex items-center justify-center gap-2 hover:bg-stone-50">
            <CreditCard className="w-4 h-4" /> পরিচয়পত্র
          </button>
          {isAdmin && (
            <button onClick={() => onEdit(teacher)} className="flex-1 bg-emerald-800 text-white rounded py-2.5 text-sm flex items-center justify-center gap-2 hover:bg-emerald-900">
              <Pencil className="w-4 h-4" /> সম্পাদনা করুন
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   🗑️ DeleteConfirmModal
   ============================================================ */
function DeleteConfirmModal({ teacher, onConfirm, onClose }) {
  const [typed, setTyped] = useState('');
  const matched = typed.trim() === teacher.nameBn.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(28,25,23,0.6)' }} onClick={onClose} />
      <div className="relative bg-white rounded-xl p-6 max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-3">
          <Trash2 className="w-6 h-6 text-rose-700" />
        </div>
        <h3 className="font-semibold text-stone-800 mb-1">এন্ট্রি মুছে ফেলবেন?</h3>
        <p className="text-sm text-stone-500 mb-4">এই ক্রিয়া অপরিবর্তনীয়। নিশ্চিত করতে নিচে শিক্ষকের নাম <strong>{teacher.nameBn}</strong> হুবহু লিখুন।</p>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} className="w-full border border-stone-300 rounded px-3 py-2 text-sm mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-stone-300 rounded py-2.5 text-sm hover:bg-stone-50">বাতিল</button>
          <button disabled={!matched} onClick={onConfirm}
            className={cx('flex-1 rounded py-2.5 text-sm text-white', matched ? 'bg-rose-700 hover:bg-rose-800' : 'bg-rose-300 cursor-not-allowed')}>
            স্থায়ীভাবে মুছুন
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   🔐 AdminGateModal
   ============================================================ */
function AdminGateModal({ onSuccess, onClose }) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const tryEnter = () => {
    if (secret === ADMIN_SECRET) onSuccess();
    else setError('পাসকোড সঠিক নয়। আবার চেষ্টা করুন।');
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(28,25,23,0.6)' }} onClick={onClose} />
      <div className="relative bg-white rounded-xl p-6 max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 text-emerald-800" />
        </div>
        <h3 className="font-semibold text-stone-800 mb-1">অ্যাডমিন যাচাইকরণ</h3>
        <p className="text-sm text-stone-500 mb-4">শিক্ষক রেজিস্ট্রি সম্পাদনার জন্য অ্যাডমিন পাসকোড দিন।</p>
        <input type="password" value={secret} onChange={(e) => { setSecret(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && tryEnter()}
          className={cx('w-full border rounded px-3 py-2 text-sm', error ? 'border-rose-400' : 'border-stone-300')} placeholder="পাসকোড" />
        <FieldError>{error}</FieldError>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 border border-stone-300 rounded py-2.5 text-sm hover:bg-stone-50">বাতিল</button>
          <button onClick={tryEnter} className="flex-1 bg-emerald-800 text-white rounded py-2.5 text-sm hover:bg-emerald-900">প্রবেশ করুন</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   🏛️ MAIN APP
   ============================================================ */
export default function TeacherRegistry() {
  const [teachers, setTeachers] = useLocalState(LS_KEYS.teachers, []);
  const [customSubjects, setCustomSubjects] = useLocalState(LS_KEYS.subjects, []);
  const [nextSerial, setNextSerial] = useLocalState(LS_KEYS.serial, 1);

  // অ্যাডমিন স্ট্যাটাস ইচ্ছাকৃতভাবে localStorage-এ রাখা হয়নি — প্রতি সেশনে যাচাই আবশ্যক
  const [isAdmin, setIsAdmin] = useState(false);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formState, setFormState] = useState(null); // null | 'new' | teacherObj
  const [profileTeacher, setProfileTeacher] = useState(null);
  const [idCardTeacher, setIdCardTeacher] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [stampFlash, setStampFlash] = useState(false);
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const allSubjects = useMemo(() => [...new Set([...DEFAULT_SUBJECTS, ...customSubjects])], [customSubjects]);

  const filtered = useMemo(() => {
    return teachers.filter((t) => {
      if (classFilter !== 'all') {
        const inClass = (t.subjects || []).some((s) => s.classBn === classFilter) || t.classTeacherOf === classFilter;
        if (!inClass) return false;
      }
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${t.nameBn} ${t.nameEn} ${t.phone} ${t.designation}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => a.serial - b.serial);
  }, [teachers, classFilter, statusFilter, search]);

  const classCounts = useMemo(() => {
    const counts = { all: teachers.length };
    CLASSES.forEach((c) => {
      counts[c] = teachers.filter((t) => (t.subjects || []).some((s) => s.classBn === c) || t.classTeacherOf === c).length;
    });
    return counts;
  }, [teachers]);

  const stats = useMemo(() => {
    const totalAssignments = teachers.reduce((sum, t) => sum + (t.subjects || []).length, 0);
    const classesWithTeacher = new Set(teachers.filter((t) => t.classTeacherOf).map((t) => t.classTeacherOf)).size;
    const possibleSlots = CLASSES.length * allSubjects.length;
    return {
      total: teachers.length,
      assignments: totalAssignments,
      classesWithTeacher,
      vacant: Math.max(possibleSlots - totalAssignments, 0),
    };
  }, [teachers, allSubjects]);

  const handleSave = (draft) => {
    const isNew = !draft.id;
    let saved;
    if (isNew) {
      saved = { ...draft, id: genId(), serial: nextSerial, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      setTeachers((prev) => [...prev, saved]);
      setNextSerial((n) => n + 1);
    } else {
      saved = { ...draft, updatedAt: new Date().toISOString() };
      setTeachers((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    }
    const usedNames = (saved.subjects || []).map((s) => s.subjectName);
    const newOnes = usedNames.filter((n) => !allSubjects.includes(n));
    if (newOnes.length) setCustomSubjects((prev) => [...new Set([...prev, ...newOnes])]);

    setFormState(null);
    setStampFlash(true);
    setTimeout(() => setStampFlash(false), 1000);
    pushToast(isNew ? 'নতুন শিক্ষক নিবন্ধিত হয়েছে।' : 'তথ্য হালনাগাদ হয়েছে।', 'success');
  };

  const handleDelete = () => {
    setTeachers((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    pushToast('এন্ট্রি মুছে ফেলা হয়েছে।', 'success');
    setDeleteTarget(null);
  };

  const requireAdmin = (action) => {
    if (isAdmin) { action(); return; }
    setShowAdminGate(true);
  };

  return (
    <div className="min-h-screen bg-stone-100" style={{
      fontFamily: "'Noto Sans Bengali','Inter',sans-serif",
      backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.035) 1px, transparent 0)',
      backgroundSize: '18px 18px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Serif+Bengali:wght@500;600;700&family=Noto+Sans+Bengali:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes stampIn { 0% { transform: scale(2.4) rotate(-10deg); opacity: 0; } 55% { transform: scale(0.9) rotate(4deg); opacity: 1; } 100% { transform: scale(1) rotate(0); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; } }
      `}</style>

      <header className="bg-emerald-900 text-white">
        <div className="max-w-6xl mx-auto px-5 py-6 text-center">
          <p className="text-xs tracking-widest uppercase text-amber-200" style={{ fontFamily: "'Cormorant Garamond', serif" }}>FACULTY REGISTER · EST.</p>
          <h1 className="text-2xl sm:text-3xl font-semibold mt-1" style={{ fontFamily: "'Noto Serif Bengali', serif" }}>{APP_NAME}</h1>
          <div className="mt-2"><GoldRule /></div>
          <p className="text-sm text-emerald-100 mt-2">শিক্ষক রেজিস্ট্রি — নিয়োগ, বিষয় বণ্টন ও পরিচয়পত্র ব্যবস্থাপনা</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Users} label="মোট শিক্ষক" value={stats.total} accent="emerald" />
          <StatCard icon={BookOpen} label="বিষয় বরাদ্দ" value={stats.assignments} accent="emerald" />
          <StatCard icon={BadgeCheck} label="শ্রেণি শিক্ষক নির্ধারিত" value={`${stats.classesWithTeacher}/${CLASSES.length}`} accent="amber" />
          <StatCard icon={Layers} label="খালি বিষয়ের স্লট" value={stats.vacant} accent="rose" />
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-5 bg-white border border-stone-200 rounded-md p-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="নাম, মোবাইল বা পদবি দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded" />
          </div>
          <div className="flex items-center gap-1.5 border border-stone-300 rounded px-2 py-2 bg-white">
            <Filter className="w-4 h-4 text-stone-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm bg-white outline-none">
              <option value="all">সকল অবস্থা</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <button onClick={() => exportToExcel(teachers)} className="text-sm border border-stone-300 rounded px-3 py-2 flex items-center gap-1.5 hover:bg-stone-50">
            <FileSpreadsheet className="w-4 h-4" /> এক্সেল এক্সপোর্ট
          </button>
          {isAdmin ? (
            <>
              <button onClick={() => setFormState('new')} className="text-sm bg-emerald-800 text-white rounded px-4 py-2 flex items-center gap-1.5 hover:bg-emerald-900">
                <Plus className="w-4 h-4" /> নতুন শিক্ষক
              </button>
              <button onClick={() => setIsAdmin(false)} className="text-sm border border-emerald-300 text-emerald-800 rounded px-3 py-2 flex items-center gap-1.5 hover:bg-emerald-50">
                <ShieldCheck className="w-4 h-4" /> অ্যাডমিন মোড সক্রিয়
              </button>
            </>
          ) : (
            <button onClick={() => setShowAdminGate(true)} className="text-sm border border-emerald-300 text-emerald-800 rounded px-3 py-2 flex items-center gap-1.5 hover:bg-emerald-50">
              <Lock className="w-4 h-4" /> অ্যাডমিন প্রবেশ
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-3 md:sticky md:top-4 self-start">
            <ClassRail active={classFilter} onChange={setClassFilter} counts={classCounts} />
          </div>

          <div className="md:col-span-9">
            {filtered.length === 0 ? (
              <div className="bg-white border border-dashed border-stone-300 rounded-md py-16 text-center">
                <Users className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 text-sm">কোনো শিক্ষক পাওয়া যায়নি। {isAdmin && 'নতুন এন্ট্রি যুক্ত করুন।'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((t) => (
                  <TeacherCard key={t.id} teacher={t} isAdmin={isAdmin}
                    onView={setProfileTeacher}
                    onEdit={(tt) => requireAdmin(() => setFormState(tt))}
                    onDelete={(tt) => requireAdmin(() => setDeleteTarget(tt))} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {formState && (
        <TeacherForm
          teacher={formState === 'new' ? null : formState}
          teachers={teachers}
          allSubjects={allSubjects}
          onSave={handleSave}
          onClose={() => setFormState(null)}
          pushToast={pushToast}
        />
      )}
      {profileTeacher && (
        <ProfileView teacher={profileTeacher} isAdmin={isAdmin}
          onClose={() => setProfileTeacher(null)}
          onEdit={(t) => { setProfileTeacher(null); requireAdmin(() => setFormState(t)); }}
          onShowId={(t) => setIdCardTeacher(t)} />
      )}
      {idCardTeacher && <IDCardModal teacher={idCardTeacher} onClose={() => setIdCardTeacher(null)} />}
      {deleteTarget && <DeleteConfirmModal teacher={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      {showAdminGate && (
        <AdminGateModal onClose={() => setShowAdminGate(false)}
          onSuccess={() => { setIsAdmin(true); setShowAdminGate(false); pushToast('অ্যাডমিন মোড সক্রিয় হয়েছে।', 'success'); }} />
      )}

      {stampFlash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div style={{ animation: 'stampIn 0.7s ease-out' }} className="bg-white rounded-full p-4 shadow-2xl">
            <OfficialSeal size={140} />
          </div>
        </div>
      )}

      <ToastHost toasts={toasts} />
    </div>
  );
}
