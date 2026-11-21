import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  CreditCard,
  Home,
  Loader2,
  Lock,
  MapPin,
  Search,
  ShieldCheck,
  User,
  Users
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  CLASS_LIST_BN,
  generateStudentId,
  isSeniorClass,
  legacyToFormState,
  mapServerFieldErrors,
  toUiClass
} from '../models/studentModel';
import { extractApiErrorMessage } from '../services/axiosClient';
import { fetchDistricts, fetchDivisions, fetchUnions, fetchUpazilas } from '../services/bdAddressApi';
import { processImageToSquare500 } from '../services/cloudinaryClient';
import { studentApi } from '../services/studentApiService';
import { Input } from './UIComponents';

// ==============================================
// MILITARY-GRADE VALIDATION RULES
// ==============================================
const RX = {
  BN_NAME: /^[\u0980-\u09FF][\u0980-\u09FF\s.'-]{1,59}$/,
  EN_NAME: /^[A-Za-z][A-Za-z\s.'-]{2,59}$/,
  MOBILE: /^01[3-9]\d{8}$/,
  BRN: /^\d{17}$/,
  NID: /^(\d{10}|\d{13}|\d{17})$/,
  POST_CODE: /^\d{4}$/,
  STUDENT_CODE: /^\d{10}$/,
  BN_PLACE: /^[\u0980-\u09FF\s.'-]{2,80}$/,
  EN_PLACE: /^[A-Za-z\s.'-]{2,80}$/,
  BN_HOUSE: /^[\u0980-\u09FF0-9\s.,'-]{2,80}$/,
  EN_HOUSE: /^[A-Za-z0-9\s.,'-]{2,80}$/,
  POST_OFFICE: /^[\u0980-\u09FFA-Za-z\s.'-]{2,60}$/,
  WARD: /^\d{1,3}$/
};

const FAKE_NUM_PATTERNS = [
  /^(\d)\1+$/,
  /^01[3-9](\d)\1{7}$/,
  /012345678|123456789|987654321|876543210/
];
const REPEATED_CHAR = /(.)\1{3,}/u;
const isFakeNumber = (v) => FAKE_NUM_PATTERNS.some((r) => r.test(String(v)));
const collapse = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const addrKey = (prefix, field) => (prefix ? `${prefix}${cap(field)}` : field);

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDefaultAcademicSession = () => {
  const now = new Date();
  // অক্টোবর (9) থেকে ডিসেম্বর পর্যন্ত পরের বছর একাডেমিক সেশন হবে
  return String(now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear());
};

// ছবির উপরের দুই কোণা (বাম ও ডান) সাদা কিনা যাচাই
const checkTopCornersWhite = (dataUrl) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const patch = Math.max(8, Math.min(20, Math.floor(w * 0.04)));
        const margin = 2;

        const isCornerWhite = (startX, startY) => {
          const { data } = ctx.getImageData(startX, startY, patch, patch);
          let whiteCount = 0;
          const total = patch * patch;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            const spread = Math.max(r, g, b) - Math.min(r, g, b);
            if (a > 240 && r >= 220 && g >= 220 && b >= 220 && spread <= 25) {
              whiteCount++;
            }
          }
          return whiteCount / total >= 0.75;
        };

        const leftOk = isCornerWhite(margin, margin);
        const rightOk = isCornerWhite(Math.max(margin, w - patch - margin), margin);
        resolve(leftOk && rightOk);
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });

const EMPTY_GEO = { divisions: [], districts: [], upazilas: [], unions: [] };
const EMPTY_GEO_SEL = { division: '', district: '', upazila: '', union: '' };

const STEPS_META = [
  { id: 1, title: 'একাডেমিক তথ্য', sub: 'Academic Info', icon: BookOpen },
  { id: 2, title: 'ব্যক্তিগত তথ্য', sub: 'Personal Info', icon: User },
  { id: 3, title: 'অভিভাবক ও যোগাযোগ', sub: 'Parents & Contact', icon: Users },
  { id: 4, title: 'ঠিকানা', sub: 'Address', icon: MapPin },
  { id: 5, title: 'ফি ও ভাই-বোন', sub: 'Fee & Sibling', icon: CreditCard },
  { id: 6, title: 'শিক্ষার্থীর ছবি', sub: 'Student Photo', icon: Camera }
];
const TOTAL_STEPS = STEPS_META.length;

// ---- Cascading Select Box ----
const GeoSelectBox = ({
  stepNum, label, name, value, onChange, options, disabled, loading, error, fallbackText, placeholder = 'নির্বাচন করুন...'
}) => {
  const isFilled = Boolean(value || fallbackText);
  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-1.5 ml-1">
        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <span
            className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center transition-colors ${
              isFilled ? 'bg-emerald-500 text-white' : disabled ? 'bg-slate-200 text-slate-400' : 'bg-[#060D1F] text-[#D4A843]'
            }`}
          >
            {isFilled ? <Check size={10} strokeWidth={3} /> : stepNum}
          </span>
          {label}
        </label>
        <div className="flex items-center gap-1">
          {loading && <Loader2 size={12} className="animate-spin text-emerald-600" />}
          {disabled && !loading && <Lock size={11} className="text-slate-300" />}
        </div>
      </div>

      <select
        name={name}
        disabled={disabled || loading}
        className={`w-full px-4 py-3.5 rounded-2xl text-sm font-bold outline-none transition-all border ${
          error
            ? 'bg-red-50/60 border-red-400 text-red-900 focus:ring-2 focus:ring-red-200'
            : disabled
            ? 'bg-slate-100/80 border-slate-200/70 text-slate-400 cursor-not-allowed'
            : isFilled
            ? 'bg-white border-emerald-300 text-slate-800 shadow-sm focus:ring-2 focus:ring-emerald-200'
            : 'bg-white border-slate-200 text-slate-700 focus:border-[#060D1F] focus:ring-2 focus:ring-slate-900/10'
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">
          {loading
            ? 'লোড হচ্ছে...'
            : disabled
            ? 'আগের ধাপ নির্বাচন করুন'
            : fallbackText && !value
            ? `${fallbackText} (পরিবর্তন করতে বাছাই করুন)`
            : placeholder}
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nameBn} — {o.nameEn}
          </option>
        ))}
      </select>

      {error && (
        <p className="text-red-500 text-[11px] font-bold mt-1 ml-1 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};

// ---- Progressive Locked Input ----
const LockedField = ({ stepNum, label, name, value, onChange, disabled, error, placeholder, inputMode, maxLength }) => {
  const isFilled = Boolean(collapse(value)) && !error;
  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-1.5 ml-1">
        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          {stepNum && (
            <span
              className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center transition-colors ${
                isFilled ? 'bg-emerald-500 text-white' : disabled ? 'bg-slate-200 text-slate-400' : 'bg-[#060D1F] text-[#D4A843]'
              }`}
            >
              {isFilled ? <Check size={10} strokeWidth={3} /> : stepNum}
            </span>
          )}
          {label}
        </label>
        {disabled && <Lock size={11} className="text-slate-300" />}
      </div>
      <input
        name={name}
        type="text"
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={disabled ? 'আগের ধাপ পূরণ করুন' : placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-4 py-3.5 rounded-2xl text-sm font-bold outline-none transition-all border ${
          error
            ? 'bg-red-50/60 border-red-400 text-red-900 focus:ring-2 focus:ring-red-200'
            : disabled
            ? 'bg-slate-100/80 border-slate-200/70 text-slate-400 cursor-not-allowed placeholder:text-slate-300'
            : isFilled
            ? 'bg-white border-emerald-300 text-slate-800 shadow-sm focus:ring-2 focus:ring-emerald-200'
            : 'bg-white border-slate-200 text-slate-800 focus:border-[#060D1F] focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-300'
        }`}
      />
      {error && (
        <p className="text-red-500 text-[11px] font-bold mt-1 ml-1 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};

// ---- Progressive Address Section (Strictly Single-Column) ----
const AddressCascadeBlock = ({
  title, subtitle, prefix = '', form, errors, geo, geoSel, geoLoading, geoError, onPickGeo, onFieldChange, accent = 'emerald'
}) => {
  const k = (f) => addrKey(prefix, f);

  const hasDivision = Boolean(geoSel.division || (form[k('divisionBn')] && form[k('divisionEn')]));
  const hasDistrict = hasDivision && Boolean(geoSel.district || (form[k('districtBn')] && form[k('districtEn')]));
  const hasUpazila = hasDistrict && Boolean(geoSel.upazila || (form[k('upazilaBn')] && form[k('upazilaEn')]));
  const hasUnion = hasUpazila && Boolean(geoSel.union || (form[k('unionBn')] && form[k('unionEn')]));

  const hasVillage =
    hasUnion &&
    Boolean(collapse(form[k('villageBn')]) && collapse(form[k('villageEn')])) &&
    !errors[k('villageBn')] &&
    !errors[k('villageEn')];

  const hasPost =
    hasVillage &&
    Boolean(collapse(form[k('postOffice')]) && collapse(form[k('postCode')])) &&
    !errors[k('postOffice')] &&
    !errors[k('postCode')];

  const hasWard = hasPost && Boolean(collapse(form[k('wardNo')])) && !errors[k('wardNo')];

  const boxStyle =
    accent === 'indigo'
      ? 'bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 border-indigo-100'
      : 'bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 border-emerald-100';

  const badgeStyle = accent === 'indigo' ? 'bg-indigo-600 text-white' : 'bg-[#060D1F] text-[#D4A843]';

  return (
    <div className={`p-4 sm:p-5 rounded-3xl border shadow-sm space-y-3.5 ${boxStyle}`}>
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm ${badgeStyle}`}>
            <Home size={17} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 leading-tight">{title}</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{subtitle}</p>
          </div>
        </div>
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-500">
          ধাপে ধাপে
        </span>
      </div>

      {geoError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" /> {geoError}
        </div>
      )}

      {/* 1. Division */}
      <GeoSelectBox
        stepNum={1}
        label="বিভাগ (Division)"
        name={k('divisionBn')}
        value={geoSel.division}
        loading={geoLoading === 'division'}
        options={geo.divisions}
        fallbackText={form[k('divisionBn')] ? `${form[k('divisionBn')]} — ${form[k('divisionEn')]}` : ''}
        error={errors[k('divisionBn')] || errors[k('divisionEn')]}
        onChange={(id) => onPickGeo('division', id)}
      />

      {/* 2. District */}
      <GeoSelectBox
        stepNum={2}
        label="জেলা (District)"
        name={k('districtBn')}
        value={geoSel.district}
        disabled={!hasDivision}
        loading={geoLoading === 'district'}
        options={geo.districts}
        fallbackText={form[k('districtBn')] ? `${form[k('districtBn')]} — ${form[k('districtEn')]}` : ''}
        error={errors[k('districtBn')] || errors[k('districtEn')]}
        onChange={(id) => onPickGeo('district', id)}
      />

      {/* 3. Upazila */}
      <GeoSelectBox
        stepNum={3}
        label="উপজেলা / থানা (Upazila)"
        name={k('upazilaBn')}
        value={geoSel.upazila}
        disabled={!hasDistrict}
        loading={geoLoading === 'upazila'}
        options={geo.upazilas}
        fallbackText={form[k('upazilaBn')] ? `${form[k('upazilaBn')]} — ${form[k('upazilaEn')]}` : ''}
        error={errors[k('upazilaBn')] || errors[k('upazilaEn')]}
        onChange={(id) => onPickGeo('upazila', id)}
      />

      {/* 4. Union */}
      <GeoSelectBox
        stepNum={4}
        label="ইউনিয়ন / পৌরসভা (Union)"
        name={k('unionBn')}
        value={geoSel.union}
        disabled={!hasUpazila}
        loading={geoLoading === 'union'}
        options={geo.unions}
        fallbackText={form[k('unionBn')] ? `${form[k('unionBn')]} — ${form[k('unionEn')]}` : ''}
        error={errors[k('unionBn')] || errors[k('unionEn')]}
        onChange={(id) => onPickGeo('union', id)}
      />

      {hasUnion && (
        <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span className="truncate">
            {form[k('unionBn')]}, {form[k('upazilaBn')]}, {form[k('districtBn')]}, {form[k('divisionBn')]}
          </span>
        </div>
      )}

      {/* 5. Village (Single Column) */}
      <LockedField
        stepNum={5}
        label="গ্রাম (বাংলা)"
        name={k('villageBn')}
        value={form[k('villageBn')]}
        disabled={!hasUnion}
        placeholder="যেমন: মীরেরখীল"
        error={errors[k('villageBn')]}
        onChange={(v) => onFieldChange(k('villageBn'), v)}
      />
      <LockedField
        stepNum={5}
        label="Village (English)"
        name={k('villageEn')}
        value={form[k('villageEn')]}
        disabled={!hasUnion}
        placeholder="e.g. Mirerkhil"
        error={errors[k('villageEn')]}
        onChange={(v) => onFieldChange(k('villageEn'), v)}
      />

      {/* 6. Post Office & Post Code (Single Column) */}
      <LockedField
        stepNum={6}
        label="ডাকঘর (Post Office)"
        name={k('postOffice')}
        value={form[k('postOffice')]}
        disabled={!hasVillage}
        placeholder="যেমন: সরফভাটা"
        error={errors[k('postOffice')]}
        onChange={(v) => onFieldChange(k('postOffice'), v)}
      />
      <LockedField
        stepNum={6}
        label="পোস্ট কোড (Post Code)"
        name={k('postCode')}
        inputMode="numeric"
        maxLength={4}
        value={form[k('postCode')]}
        disabled={!hasVillage}
        placeholder="যেমন: 4360"
        error={errors[k('postCode')]}
        onChange={(v) => onFieldChange(k('postCode'), v)}
      />

      {/* 7. Ward No */}
      <LockedField
        stepNum={7}
        label="ওয়ার্ড নং (Ward No)"
        name={k('wardNo')}
        inputMode="numeric"
        maxLength={3}
        value={form[k('wardNo')]}
        disabled={!hasPost}
        placeholder="যেমন: 2"
        error={errors[k('wardNo')]}
        onChange={(v) => onFieldChange(k('wardNo'), v)}
      />

      {/* 8. House Name (Single Column) */}
      <LockedField
        stepNum={8}
        label="বাড়ির নাম (বাংলা)"
        name={k('houseNameBn')}
        value={form[k('houseNameBn')]}
        disabled={!hasWard}
        placeholder="যেমন: ছমদ মেম্বর বাড়ি"
        error={errors[k('houseNameBn')]}
        onChange={(v) => onFieldChange(k('houseNameBn'), v)}
      />
      <LockedField
        stepNum={8}
        label="House Name (English)"
        name={k('houseNameEn')}
        value={form[k('houseNameEn')]}
        disabled={!hasWard}
        placeholder="e.g. Chamad Member House"
        error={errors[k('houseNameEn')]}
        onChange={(v) => onFieldChange(k('houseNameEn'), v)}
      />
    </div>
  );
};

// ==============================================
// MAIN FULLFORM COMPONENT (6-STEP, MOBILE-FIRST)
// ==============================================
const FullForm = ({ initialData, currentUser, onSave, onCancel, showToast, isAdmin }) => {
  const isUpdate = !!initialData;

  const defaultState = {
    // Step 1: Academic
    sessionYear: getDefaultAcademicSession(),
    admissionDate: todayISO(),
    studentId: '',
    studentNameBn: '',
    studentNameEn: '',
    classBn: '',
    roll: '',
    group: '',
    fourthSubject: '',
    boardRegNo: '',

    // Step 2: Personal
    gender: '',
    religion: 'Islam',
    dob: '',
    brn: '',
    bloodGroup: '',
    medicalNote: '',

    // Step 3: Parents & Contact
    fatherNameBn: '',
    fatherNameEn: '',
    fatherNid: '',
    fatherOccupation: '',
    motherNameBn: '',
    motherNameEn: '',
    motherNid: '',
    motherOccupation: '',
    annualIncome: '',
    whatsappNumber: '',
    emergencyNumber: '',
    emergencyContactName: '',
    emergencyRelationship: 'Father',
    hasLocalGuardian: false,
    localGuardianName: '',
    localGuardianRelation: '',
    localGuardianNid: '',
    localGuardianPhone: '',

    // Step 4: Address (Default pre-filled)
    divisionBn: 'চট্টগ্রাম',
    divisionEn: 'Chattogram',
    districtBn: 'চট্টগ্রাম',
    districtEn: 'Chattogram',
    upazilaBn: 'রাঙ্গুনিয়া',
    upazilaEn: 'Rangunia',
    unionBn: 'সরফভাটা',
    unionEn: 'Sarafbhata',
    villageBn: 'মীরেরখীল',
    villageEn: 'Mirerkhil',
    postOffice: 'সরফভাটা',
    postCode: '4360',
    wardNo: '',
    houseNameBn: '',
    houseNameEn: '',

    sameAsPresent: true,
    permDivisionBn: '',
    permDivisionEn: '',
    permDistrictBn: '',
    permDistrictEn: '',
    permUpazilaBn: '',
    permUpazilaEn: '',
    permUnionBn: '',
    permUnionEn: '',
    permVillageBn: '',
    permVillageEn: '',
    permPostOffice: '',
    permPostCode: '',
    permWardNo: '',
    permHouseNameBn: '',
    permHouseNameEn: '',

    // Step 5: Fee, Sibling & Status
    hasSibling: false,
    siblingStudentCode: '',
    feeCategory: 'Regular',
    monthlyFee: '0',
    status: 'Active',
    statusReason: '',

    // Step 6: Photo
    imageUrl: ''
  };

  const [form, setForm] = useState(defaultState);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [imgPreview, setImgPreview] = useState(null);
  const [imgChecking, setImgChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [migration, setMigration] = useState(null);
  const [legacyId, setLegacyId] = useState('');
  const [legacyBusy, setLegacyBusy] = useState(false);
  const formRef = useRef(null);
  const stepRef = useRef(1);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // ---- MOBILE BACK BUTTON FIX (Capture Phase) ----
  useEffect(() => {
    const handlePopState = (e) => {
      if (stepRef.current > 1) {
        e.stopImmediatePropagation();
        setStep((prev) => Math.max(1, prev - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('popstate', handlePopState, true);
    return () => window.removeEventListener('popstate', handlePopState, true);
  }, []);

  const goBackStep = () => {
    if (step > 1) {
      if (window.history.state?.page === 'formStep') {
        window.history.back();
      } else {
        setStep((s) => s - 1);
      }
    } else {
      onCancel();
    }
  };

  // ---- Geo Cascades ----
  const [geo, setGeo] = useState(EMPTY_GEO);
  const [geoSel, setGeoSel] = useState(EMPTY_GEO_SEL);
  const [geoLoading, setGeoLoading] = useState('');
  const [geoError, setGeoError] = useState('');

  const [permGeo, setPermGeo] = useState(EMPTY_GEO);
  const [permGeoSel, setPermGeoSel] = useState(EMPTY_GEO_SEL);
  const [permGeoLoading, setPermGeoLoading] = useState('');
  const [permGeoError, setPermGeoError] = useState('');

  useEffect(() => {
    if (step !== 4 || geo.divisions.length > 0) return undefined;
    const ac = new AbortController();
    setGeoLoading('division');
    fetchDivisions(ac.signal)
      .then((list) => {
        setGeo((g) => ({ ...g, divisions: list }));
        setPermGeo((g) => ({ ...g, divisions: list }));
        setGeoError('');
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setGeoError(e.message || 'ঠিকানার তালিকা লোড করা যায়নি');
      })
      .finally(() => setGeoLoading(''));
    return () => ac.abort();
  }, [step, geo.divisions.length]);

  const hydrateCascade = async (addr, divisionsList, setTargetGeo, setTargetSel) => {
    if (!divisionsList.length || !addr?.divisionBn) return;
    const matchItem = (list, bn, en) =>
      list.find(
        (x) =>
          (bn && collapse(x.nameBn) === collapse(bn)) ||
          (en && collapse(x.nameEn).toLowerCase() === collapse(en).toLowerCase())
      );

    const div = matchItem(divisionsList, addr.divisionBn, addr.divisionEn);
    if (!div) return;
    setTargetSel((s) => ({ ...s, division: div.id }));

    try {
      const dists = await fetchDistricts(div.id);
      setTargetGeo((g) => ({ ...g, districts: dists }));
      const dist = matchItem(dists, addr.districtBn, addr.districtEn);
      if (!dist) return;
      setTargetSel((s) => ({ ...s, district: dist.id }));

      const upas = await fetchUpazilas(dist.id);
      setTargetGeo((g) => ({ ...g, upazilas: upas }));
      const upa = matchItem(upas, addr.upazilaBn, addr.upazilaEn);
      if (!upa) return;
      setTargetSel((s) => ({ ...s, upazila: upa.id }));

      const unis = await fetchUnions(upa.id);
      setTargetGeo((g) => ({ ...g, unions: unis }));
      const uni = matchItem(unis, addr.unionBn, addr.unionEn);
      if (uni) setTargetSel((s) => ({ ...s, union: uni.id }));
    } catch {}
  };

  useEffect(() => {
    if (step !== 4 || !geo.divisions.length) return;
    if (!geoSel.division && form.divisionBn) {
      hydrateCascade(
        {
          divisionBn: form.divisionBn, divisionEn: form.divisionEn,
          districtBn: form.districtBn, districtEn: form.districtEn,
          upazilaBn: form.upazilaBn, upazilaEn: form.upazilaEn,
          unionBn: form.unionBn, unionEn: form.unionEn
        },
        geo.divisions,
        setGeo,
        setGeoSel
      );
    }
    if (!form.sameAsPresent && !permGeoSel.division && form.permDivisionBn) {
      hydrateCascade(
        {
          divisionBn: form.permDivisionBn, divisionEn: form.permDivisionEn,
          districtBn: form.permDistrictBn, districtEn: form.permDistrictEn,
          upazilaBn: form.permUpazilaBn, upazilaEn: form.permUpazilaEn,
          unionBn: form.permUnionBn, unionEn: form.permUnionEn
        },
        geo.divisions,
        setPermGeo,
        setPermGeoSel
      );
    }
  }, [step, geo.divisions.length, form.sameAsPresent]);

  const makeGeoPicker = (prefix, curGeo, setCurGeo, curSel, setCurSel, setCurLoading, setCurError) => async (level, id) => {
    const order = ['division', 'district', 'upazila', 'union'];
    const keyOf = { division: 'divisions', district: 'districts', upazila: 'upazilas', union: 'unions' };
    const fieldsOf = {
      division: ['divisionBn', 'divisionEn'],
      district: ['districtBn', 'districtEn'],
      upazila: ['upazilaBn', 'upazilaEn'],
      union: ['unionBn', 'unionEn']
    };

    const idx = order.indexOf(level);
    const item = curGeo[keyOf[level]].find((x) => x.id === id);

    const nextSel = { ...curSel, [level]: id };
    const nextGeo = { ...curGeo };
    const formPatch = {};
    const errPatch = {};

    order.slice(idx + 1).forEach((lv) => {
      nextSel[lv] = '';
      nextGeo[keyOf[lv]] = [];
      const [b, e] = fieldsOf[lv];
      formPatch[addrKey(prefix, b)] = '';
      formPatch[addrKey(prefix, e)] = '';
      errPatch[addrKey(prefix, b)] = '';
      errPatch[addrKey(prefix, e)] = '';
    });

    const [b, e] = fieldsOf[level];
    formPatch[addrKey(prefix, b)] = item ? item.nameBn : '';
    formPatch[addrKey(prefix, e)] = item ? item.nameEn : '';
    errPatch[addrKey(prefix, b)] = '';
    errPatch[addrKey(prefix, e)] = '';

    setCurSel(nextSel);
    setCurGeo(nextGeo);
    setForm((p) => ({ ...p, ...formPatch }));
    setErrors((p) => ({ ...p, ...errPatch }));

    if (!item) return;

    const nextLevel = order[idx + 1];
    if (!nextLevel) return;
    const fetcher = { district: fetchDistricts, upazila: fetchUpazilas, union: fetchUnions }[nextLevel];
    setCurLoading(nextLevel);
    try {
      const list = await fetcher(id);
      setCurGeo((g) => ({ ...g, [keyOf[nextLevel]]: list }));
      setCurError('');
    } catch (err) {
      if (err?.name !== 'AbortError') setCurError(err.message || 'ঠিকানার তালিকা লোড করা যায়নি');
    } finally {
      setCurLoading('');
    }
  };

  const pickPresentGeo = makeGeoPicker('', geo, setGeo, geoSel, setGeoSel, setGeoLoading, setGeoError);
  const pickPermGeo = makeGeoPicker('perm', permGeo, setPermGeo, permGeoSel, setPermGeoSel, setPermGeoLoading, setPermGeoError);

  // ---- Draft ----
  useEffect(() => {
    const saved = localStorage.getItem('draftStudentForm');
    if (!initialData && saved) {
      try {
        setForm({ ...defaultState, ...JSON.parse(saved) });
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!initialData) {
      localStorage.setItem('draftStudentForm', JSON.stringify(form));
    }
  }, [form]);

  // ---- Load Initial Data (Edit) ----
  useEffect(() => {
    if (initialData) {
      const parseDate = (dStr) => {
        if (!dStr) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      const pAddr = initialData.PermanentAddress || null;
      const isDifferentPerm = Boolean(
        pAddr &&
          (collapse(pAddr.houseNameBn) !== collapse(initialData.HouseNameBn) ||
            collapse(pAddr.villageBn) !== collapse(initialData.VillageBn) ||
            collapse(pAddr.unionBn) !== collapse(initialData.UnionBn) ||
            collapse(pAddr.upazilaBn) !== collapse(initialData.UpazilaBn) ||
            collapse(pAddr.districtBn) !== collapse(initialData.DistrictBn))
      );

      const lg = initialData.LocalGuardian || {};
      const hasLG = Boolean(lg.name || lg.phone);
      const sibCode = initialData.FeeDetails?.siblingStudentCode || '';
      const feeCat = initialData.FeeDetails?.feeCategory || 'Regular';

      setForm({
        ...defaultState,
        sessionYear: initialData.Session || getDefaultAcademicSession(),
        admissionDate: parseDate(initialData.AdmissionDate || initialData.Time) || todayISO(),
        studentId: initialData.ID || '',
        studentNameBn: initialData.StudentNameBn || '',
        studentNameEn: initialData.StudentNameEn || '',
        classBn: toUiClass(initialData.ClassBn || ''),
        roll: initialData.Roll || '',
        group: initialData.Group || '',
        fourthSubject: initialData.FourthSubject || '',
        boardRegNo: initialData.BoardRegNo || '',

        gender: initialData.Gender || '',
        religion: initialData.Religion || 'Islam',
        dob: parseDate(initialData.DOB),
        brn: initialData.BRN || '',
        bloodGroup: initialData.BloodGroup || '',
        medicalNote: initialData.MedicalNote || '',

        fatherNameBn: initialData.FatherNameBn || '',
        fatherNameEn: initialData.FatherNameEn || '',
        fatherNid: initialData.FatherNid || '',
        fatherOccupation: initialData.FatherOccupation || '',
        motherNameBn: initialData.MotherNameBn || '',
        motherNameEn: initialData.MotherNameEn || '',
        motherNid: initialData.MotherNid || '',
        motherOccupation: initialData.MotherOccupation || '',
        annualIncome: initialData.AnnualIncome ? String(initialData.AnnualIncome) : '',
        whatsappNumber: initialData.WhatsApp || '',
        emergencyNumber: initialData.EmergencyNo || '',
        emergencyContactName: initialData.EmergencyContactName || initialData.FatherNameBn || '',
        emergencyRelationship: initialData.EmergencyRelationship || 'Father',
        hasLocalGuardian: hasLG,
        localGuardianName: lg.name || '',
        localGuardianRelation: lg.relation || '',
        localGuardianNid: lg.nid || '',
        localGuardianPhone: lg.phone || '',

        divisionBn: initialData.DivisionBn || 'চট্টগ্রাম',
        divisionEn: initialData.DivisionEn || 'Chattogram',
        districtBn: initialData.DistrictBn || 'চট্টগ্রাম',
        districtEn: initialData.DistrictEn || 'Chattogram',
        upazilaBn: initialData.UpazilaBn || 'রাঙ্গুনিয়া',
        upazilaEn: initialData.UpazilaEn || 'Rangunia',
        unionBn: initialData.UnionBn || 'সরফভাটা',
        unionEn: initialData.UnionEn || 'Sarafbhata',
        villageBn: initialData.VillageBn || '',
        villageEn: initialData.VillageEn || '',
        postOffice: initialData.PostOffice || 'সরফভাটা',
        postCode: initialData.PostCode || '4360',
        wardNo: initialData.WardNo || '',
        houseNameBn: initialData.HouseNameBn || '',
        houseNameEn: initialData.HouseNameEn || '',

        sameAsPresent: !isDifferentPerm,
        permDivisionBn: pAddr?.divisionBn || '',
        permDivisionEn: pAddr?.divisionEn || '',
        permDistrictBn: pAddr?.districtBn || '',
        permDistrictEn: pAddr?.districtEn || '',
        permUpazilaBn: pAddr?.upazilaBn || '',
        permUpazilaEn: pAddr?.upazilaEn || '',
        permUnionBn: pAddr?.unionBn || '',
        permUnionEn: pAddr?.unionEn || '',
        permVillageBn: pAddr?.villageBn || '',
        permVillageEn: pAddr?.villageEn || '',
        permPostOffice: pAddr?.postOffice || '',
        permPostCode: pAddr?.postCode || '',
        permWardNo: pAddr?.wardNo || '',
        permHouseNameBn: pAddr?.houseNameBn || '',
        permHouseNameEn: pAddr?.houseNameEn || '',

        hasSibling: Boolean(sibCode || feeCat === 'Sibling Waiver'),
        siblingStudentCode: sibCode,
        feeCategory: feeCat,
        monthlyFee: String(initialData.FeeDetails?.monthlyFee ?? '0'),
        status: initialData.Status || 'Active',
        statusReason: initialData.StatusReason || '',

        imageUrl: initialData.ImageURL || ''
      });
      setImgPreview(initialData.ImageURL || null);
    } else {
      setForm((f) => (f.studentNameBn || f.brn ? f : defaultState));
      setImgPreview(null);
    }
  }, [initialData]);

  useEffect(() => {
    if (!initialData && currentUser?.role === 'Class') {
      setForm((f) => ({ ...f, classBn: currentUser.classBn }));
    }
  }, [initialData, currentUser]);

  useEffect(() => {
    if (!initialData && !migration && form.sessionYear && form.dob && form.classBn && form.roll) {
      try {
        const id = generateStudentId(form.sessionYear, form.dob, form.classBn, form.roll);
        setForm((prev) => ({ ...prev, studentId: id }));
      } catch (e) {}
    }
  }, [form.sessionYear, form.dob, form.classBn, form.roll, initialData, migration]);

  useEffect(() => {
    if (form.classBn && !isSeniorClass(form.classBn) && (form.group || form.fourthSubject || form.boardRegNo)) {
      setForm((p) => ({ ...p, group: '', fourthSubject: '', boardRegNo: '' }));
    }
  }, [form.classBn]);

  // ---- Military-Grade Validation ----
  const fieldError = (f, v, all = form) => {
    const val = collapse(v);
    const baseField = f.startsWith('perm') ? f.charAt(4).toLowerCase() + f.slice(5) : f;

    switch (baseField) {
      case 'studentNameBn':
      case 'fatherNameBn':
      case 'motherNameBn': {
        const lbl = { studentNameBn: 'শিক্ষার্থীর নাম', fatherNameBn: 'পিতার নাম', motherNameBn: 'মাতার নাম' }[baseField];
        if (!val) return `${lbl} আবশ্যক`;
        if (REPEATED_CHAR.test(val)) return 'একই অক্ষর বারবার লেখা যাবে না';
        return RX.BN_NAME.test(val) ? '' : 'শুধু বাংলা অক্ষর (২-৬০ অক্ষর)';
      }
      case 'studentNameEn':
      case 'fatherNameEn':
      case 'motherNameEn': {
        const lbl = { studentNameEn: 'Student name', fatherNameEn: 'Father name', motherNameEn: 'Mother name' }[baseField];
        if (!val) return `${lbl} (English) required`;
        if (REPEATED_CHAR.test(val.toLowerCase())) return 'Invalid repeated characters';
        return RX.EN_NAME.test(val) ? '' : 'English letters only (3-60 chars)';
      }
      case 'fatherNid':
      case 'motherNid':
      case 'localGuardianNid':
        if (!val) return '';
        if (!RX.NID.test(val)) return 'NID অবশ্যই ১০, ১৩ অথবা ১৭ ডিজিটের হতে হবে';
        if (isFakeNumber(val)) return 'অবৈধ/ভুয়া NID নম্বর';
        return '';
      case 'annualIncome':
        if (!val) return '';
        return /^\d+$/.test(val) && Number(val) >= 0 && Number(val) <= 100000000 ? '' : 'সঠিক বার্ষিক আয় লিখুন';
      case 'whatsappNumber':
      case 'emergencyNumber':
        if (!val) return baseField === 'whatsappNumber' ? 'মোবাইল নম্বর আবশ্যক' : 'জরুরি নম্বর আবশ্যক';
        if (!RX.MOBILE.test(val)) return 'সঠিক বাংলাদেশি নম্বর দিন (013-019, ১১ ডিজিট)';
        if (isFakeNumber(val)) return 'ভুয়া বা অবৈধ মোবাইল নম্বর গ্রহণযোগ্য নয়';
        return '';
      case 'localGuardianName':
        if (!all.hasLocalGuardian) return '';
        if (!val) return 'স্থানীয় অভিভাবকের নাম আবশ্যক';
        return val.length >= 2 && val.length <= 60 ? '' : 'সঠিক নাম দিন (২-৬০ অক্ষর)';
      case 'localGuardianRelation':
        if (!all.hasLocalGuardian) return '';
        return val ? '' : 'সম্পর্ক লেখা আবশ্যক';
      case 'localGuardianPhone':
        if (!all.hasLocalGuardian) return '';
        if (!val) return 'স্থানীয় অভিভাবকের মোবাইল নম্বর আবশ্যক';
        if (!RX.MOBILE.test(val)) return 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন';
        if (isFakeNumber(val)) return 'ভুয়া নম্বর গ্রহণযোগ্য নয়';
        return '';
      case 'roll': {
        if (!val) return 'রোল নম্বর আবশ্যক';
        const n = Number(val);
        return Number.isInteger(n) && n >= 1 && n <= 500 ? '' : 'রোল ১ থেকে ৫০০-এর মধ্যে হতে হবে';
      }
      case 'classBn':
        return val ? '' : 'শ্রেণি নির্বাচন আবশ্যক';
      case 'gender':
        return val ? '' : 'লিঙ্গ নির্বাচন আবশ্যক';
      case 'religion':
        return val ? '' : 'ধর্ম নির্বাচন আবশ্যক';
      case 'group':
        return isSeniorClass(all.classBn) && !val ? '৯ম/১০ম শ্রেণির জন্য গ্রুপ আবশ্যক' : '';
      case 'admissionDate': {
        if (!val) return 'ভর্তির তারিখ আবশ্যক';
        const d = new Date(val);
        if (isNaN(d.getTime())) return 'সঠিক তারিখ দিন';
        if (d > new Date()) return 'ভবিষ্যতের তারিখ দেওয়া যাবে না';
        return '';
      }
      case 'brn':
        if (!val) return '১৭ ডিজিটের জন্ম নিবন্ধন নম্বর আবশ্যক';
        if (!RX.BRN.test(val)) return `ঠিক ১৭ ডিজিট হতে হবে (বর্তমান: ${val.length})`;
        if (isFakeNumber(val)) return 'অবৈধ/ভুয়া BRN নম্বর';
        if (all.dob && String(new Date(all.dob).getFullYear()) !== val.slice(0, 4)) {
          return `BRN-এর প্রথম ৪ সংখ্যা জন্মসালের (${new Date(all.dob).getFullYear()}) সাথে মিলছে না`;
        }
        return '';
      case 'dob': {
        if (!val) return 'জন্ম তারিখ আবশ্যক';
        const d = new Date(val);
        if (isNaN(d.getTime())) return 'সঠিক তারিখ দিন';
        if (d > new Date()) return 'ভবিষ্যতের তারিখ দেওয়া যাবে না';
        const age = (new Date() - d) / (365.25 * 24 * 3600 * 1000);
        return age < 2.5 || age > 22 ? 'শিক্ষার্থীর বয়স ২.৫ থেকে ২২ বছরের মধ্যে হতে হবে' : '';
      }
      case 'sessionYear': {
        const y = Number(val);
        return /^20\d{2}$/.test(val) && y >= 2015 && y <= 2035 ? '' : 'সঠিক সেশন দিন (২০১৫–২০৩৫)';
      }
      case 'divisionBn':
      case 'districtBn':
      case 'upazilaBn':
      case 'unionBn': {
        const lbl = { divisionBn: 'বিভাগ', districtBn: 'জেলা', upazilaBn: 'উপজেলা', unionBn: 'ইউনিয়ন' }[baseField];
        return val ? '' : `${lbl} তালিকা থেকে নির্বাচন করুন`;
      }
      case 'divisionEn':
      case 'districtEn':
      case 'upazilaEn':
      case 'unionEn':
        return val ? '' : 'তালিকা থেকে নির্বাচন আবশ্যক';
      case 'villageBn':
        if (!val) return 'গ্রামের নাম (বাংলা) আবশ্যক';
        if (REPEATED_CHAR.test(val)) return 'সঠিক গ্রামের নাম লিখুন';
        return RX.BN_PLACE.test(val) ? '' : 'শুধু বাংলায় লিখুন (২-৮০ অক্ষর)';
      case 'villageEn':
        if (!val) return 'Village (English) required';
        if (REPEATED_CHAR.test(val.toLowerCase())) return 'Invalid repeated characters';
        return RX.EN_PLACE.test(val) ? '' : 'English letters only (2-80 chars)';
      case 'postOffice':
        if (!val) return 'ডাকঘরের নাম আবশ্যক';
        return RX.POST_OFFICE.test(val) ? '' : 'সঠিক ডাকঘরের নাম দিন (২-৬০ অক্ষর)';
      case 'postCode':
        if (!val) return '৪ ডিজিটের পোস্ট কোড আবশ্যক';
        return RX.POST_CODE.test(val) ? '' : 'পোস্ট কোড ঠিক ৪ ডিজিটের হতে হবে';
      case 'wardNo': {
        if (!val) return 'ওয়ার্ড নম্বর আবশ্যক';
        const n = Number(val);
        return RX.WARD.test(val) && n >= 1 && n <= 999 ? '' : 'সঠিক ওয়ার্ড নম্বর দিন (১-৯৯৯)';
      }
      case 'houseNameBn':
        if (!val) return 'বাড়ির নাম (বাংলা) আবশ্যক';
        if (REPEATED_CHAR.test(val)) return 'সঠিক বাড়ির নাম লিখুন';
        return RX.BN_HOUSE.test(val) ? '' : 'বাংলায় লিখুন (২-৮০ অক্ষর)';
      case 'houseNameEn':
        if (!val) return 'House Name (English) required';
        if (REPEATED_CHAR.test(val.toLowerCase())) return 'Invalid repeated characters';
        return RX.EN_HOUSE.test(val) ? '' : 'English letters/numbers (2-80 chars)';
      case 'siblingStudentCode': {
        const mustHaveSibling = all.hasSibling || all.feeCategory === 'Sibling Waiver';
        if (!mustHaveSibling) return '';
        if (!val) return 'ভাই/বোনের ১০ ডিজিটের স্টুডেন্ট আইডি আবশ্যক';
        if (!RX.STUDENT_CODE.test(val)) return `ঠিক ১০ ডিজিট হতে হবে (বর্তমান: ${val.length})`;
        if (isFakeNumber(val)) return 'অবৈধ স্টুডেন্ট আইডি';
        if (all.studentId && val === collapse(all.studentId)) return 'নিজের আইডি ভাই/বোনের আইডি হিসেবে দেওয়া যাবে না';
        return '';
      }
      case 'monthlyFee':
        if (!val) return '';
        return /^\d+$/.test(val) && Number(val) >= 0 && Number(val) <= 100000 ? '' : 'সঠিক বেতন লিখুন';
      case 'statusReason':
        return all.status !== 'Active' && !val ? 'স্ট্যাটাস পরিবর্তনের কারণ লিখুন' : '';
      case 'imageUrl':
        return val ? '' : 'শিক্ষার্থীর সাদা ব্যাকগ্রাউন্ডের ছবি আবশ্যক';
      default:
        return '';
    }
  };

  const update = (f, v) => {
    if (f === 'roll') {
      v = parseInt(v, 10) || '';
      if (v > 500) v = 500;
    }
    if (['whatsappNumber', 'emergencyNumber', 'localGuardianPhone'].includes(f)) {
      v = String(v).replace(/[^0-9]/g, '').slice(0, 11);
    }
    if (['brn', 'fatherNid', 'motherNid', 'localGuardianNid'].includes(f)) {
      v = String(v).replace(/[^0-9]/g, '').slice(0, 17);
    }
    if (f === 'wardNo' || f === 'permWardNo') {
      v = String(v).replace(/[^0-9]/g, '').slice(0, 3);
    }
    if (f === 'postCode' || f === 'permPostCode') {
      v = String(v).replace(/[^0-9]/g, '').slice(0, 4);
    }
    if (f === 'siblingStudentCode') {
      v = String(v).replace(/[^0-9]/g, '').slice(0, 10);
    }
    if (f === 'annualIncome' || f === 'monthlyFee') {
      v = String(v).replace(/[^0-9]/g, '');
    }

    const next = { ...form, [f]: v };
    if (f === 'feeCategory' && v === 'Sibling Waiver') {
      next.hasSibling = true;
    }
    setForm(next);

    const upd = { [f]: fieldError(f, v, next) };
    if (f === 'dob' && next.brn) upd.brn = fieldError('brn', next.brn, next);
    if (f === 'classBn') upd.group = fieldError('group', next.group, next);
    if (f === 'status') upd.statusReason = fieldError('statusReason', next.statusReason, next);
    if (f === 'feeCategory') upd.siblingStudentCode = fieldError('siblingStudentCode', next.siblingStudentCode, next);
    setErrors((prev) => ({ ...prev, ...upd }));
  };

  const getStepFields = (targetStep) => {
    if (targetStep === 1) {
      return ['sessionYear', 'admissionDate', 'studentNameBn', 'studentNameEn', 'classBn', 'roll', 'group'];
    }
    if (targetStep === 2) {
      return ['gender', 'religion', 'dob', 'brn'];
    }
    if (targetStep === 3) {
      const base = [
        'fatherNameBn', 'fatherNameEn', 'fatherNid',
        'motherNameBn', 'motherNameEn', 'motherNid',
        'annualIncome', 'whatsappNumber', 'emergencyNumber'
      ];
      return form.hasLocalGuardian
        ? [...base, 'localGuardianName', 'localGuardianRelation', 'localGuardianNid', 'localGuardianPhone']
        : base;
    }
    if (targetStep === 4) {
      const present = [
        'divisionBn', 'divisionEn', 'districtBn', 'districtEn', 'upazilaBn', 'upazilaEn',
        'unionBn', 'unionEn', 'villageBn', 'villageEn', 'postOffice', 'postCode', 'wardNo', 'houseNameBn', 'houseNameEn'
      ];
      if (form.sameAsPresent) return present;
      const perm = [
        'permDivisionBn', 'permDivisionEn', 'permDistrictBn', 'permDistrictEn', 'permUpazilaBn', 'permUpazilaEn',
        'permUnionBn', 'permUnionEn', 'permVillageBn', 'permVillageEn', 'permPostOffice', 'permPostCode', 'permWardNo', 'permHouseNameBn', 'permHouseNameEn'
      ];
      return [...present, ...perm];
    }
    if (targetStep === 5) {
      return ['siblingStudentCode', 'monthlyFee', 'statusReason'];
    }
    if (targetStep === 6) {
      return ['imageUrl'];
    }
    return [];
  };

  const focusField = (name) => {
    setTimeout(() => {
      const el = formRef.current?.querySelector(`[name="${name}"]`) || document.querySelector(`[name="${name}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus?.();
      }
    }, 80);
  };

  const validate = (targetStep = step) => {
    const e = {};
    getStepFields(targetStep).forEach((f) => {
      const msg = fieldError(f, form[f]);
      if (msg) e[f] = msg;
    });
    if (Object.keys(e).length > 0) {
      focusField(Object.keys(e)[0]);
    }
    setErrors((prev) => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      const nextStep = step + 1;
      window.history.pushState({ page: 'formStep', step: nextStep }, '');
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    for (const s of [1, 2, 3, 4, 5, 6]) {
      if (!validate(s)) {
        setStep(s);
        return;
      }
    }
    setSaving(true);
    const res = await onSave(form, { migration });
    setSaving(false);

    if (res && res.ok === false && res.fieldErrors?.length) {
      const { errors: srvErr, firstStep, unmapped } = mapServerFieldErrors(res.fieldErrors);
      if (Object.keys(srvErr).length) {
        setErrors((prev) => ({ ...prev, ...srvErr }));
        if (firstStep) setStep(firstStep);
        focusField(Object.keys(srvErr)[0]);
      }
      if (unmapped.length && showToast) showToast(unmapped[0], 'error');
    }
  };

  // নতুন ছবি আপলোডেই শুধু উপরের দুই কোণা সাদা কিনা চেক হবে (পুরনো/আগে থাকা ছবিতে নয়)
  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgChecking(true);
    try {
      const out = await processImageToSquare500(file, { squareTolerance: 20, quality: 0.85 });
      const isWhiteBg = await checkTopCornersWhite(out.dataUrl);
      if (!isWhiteBg) {
        const msg = 'ছবির ব্যাকগ্রাউন্ড সাদা হতে হবে! উপরের দুই কোণা সাদা নয়।';
        setErrors((p) => ({ ...p, imageUrl: msg }));
        showToast(msg, 'error');
        e.target.value = '';
        return;
      }
      setImgPreview(out.dataUrl);
      update('imageUrl', out.dataUrl);
      setErrors((p) => ({ ...p, imageUrl: '' }));
    } catch (err) {
      showToast(err.message, 'error');
      e.target.value = '';
    } finally {
      setImgChecking(false);
    }
  };

  const handleLegacyLookup = async () => {
    const code = legacyId.trim();
    if (!/^\d{10}$/.test(code)) return showToast('১০ ডিজিটের পুরনো স্টুডেন্ট আইডি দিন', 'error');
    setLegacyBusy(true);
    try {
      const res = await studentApi.legacyLookup(code);
      if (res.alreadyMigrated) {
        showToast(`এই আইডি আগেই মাইগ্রেট হয়েছে (${res.existingStudent?.fullNameBng || code})`, 'error');
        return;
      }
      const f = legacyToFormState(res.autoFillData);
      setForm({ ...defaultState, ...f, sameAsPresent: true });
      setImgPreview(f.imageUrl || null);
      setMigration({ studentCode: res.autoFillData.studentCode, admissionDate: res.autoFillData.admissionDate });
      setErrors({});
      showToast(res.message || 'পুরনো তথ্য পাওয়া গেছে — যাচাই করে সংরক্ষণ করুন', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'পুরনো শিট থেকে তথ্য আনা যায়নি'), 'error');
    } finally {
      setLegacyBusy(false);
    }
  };

  const classLocked = currentUser?.role === 'Class';
  const liveAge = (() => {
    if (!form.dob || errors.dob) return null;
    const diff = (new Date() - new Date(form.dob)) / (365.25 * 24 * 3600 * 1000);
    return diff > 0 ? diff.toFixed(1) : null;
  })();

  const currentMeta = STEPS_META[step - 1];
  const StepIcon = currentMeta.icon;

  return (
    <div
      ref={formRef}
      className="bg-white rounded-[28px] p-5 shadow-[0_12px_40px_rgba(6,13,31,0.06)] border border-slate-100 min-h-[72vh] flex flex-col"
    >
      {/* COMPACT MOBILE-FRIENDLY 6-STEP HEADER */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#060D1F] text-[#D4A843] flex items-center justify-center shadow-md">
              <StepIcon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                ধাপ {step} / {TOTAL_STEPS} · {currentMeta.sub}
              </p>
              <h3 className="text-base font-black text-slate-800 leading-tight">{currentMeta.title}</h3>
            </div>
          </div>
          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck size={12} /> Verified
          </span>
        </div>

        {/* 6-segment progress bar */}
        <div className="flex gap-1.5">
          {STEPS_META.map((s) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                step === s.id ? 'bg-[#060D1F]' : step > s.id ? 'bg-emerald-500' : 'bg-slate-100'
              }`}
            />
          ))}
        </div>
      </div>

      {/* FORM BODY (STRICTLY SINGLE COLUMN) */}
      <div className="flex-1">
        {/* ==================== STEP 1: ACADEMIC ==================== */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-6 duration-300">
            {!isUpdate && isAdmin && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/60 rounded-2xl border border-amber-200/70">
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2">
                  {migration ? `পুরনো শিট থেকে আনা হয়েছে (ID: ${migration.studentCode})` : 'পুরনো শিট থেকে মাইগ্রেট (ঐচ্ছিক)'}
                </p>
                <div className="flex gap-2">
                  <input
                    inputMode="numeric"
                    maxLength={10}
                    value={legacyId}
                    onChange={(e) => setLegacyId(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="পুরনো ১০ ডিজিটের আইডি"
                    className="flex-1 p-3 bg-white rounded-xl font-bold outline-none border border-amber-200/70 focus:ring-2 focus:ring-amber-400 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleLegacyLookup}
                    disabled={legacyBusy}
                    className="px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-60 transition-colors"
                  >
                    {legacyBusy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} আনুন
                  </button>
                </div>
              </div>
            )}

            <Input name="sessionYear" label="Session (অক্টোবর থেকে পরের বছর)" type="number" val={form.sessionYear} set={(v) => update('sessionYear', v)} error={errors.sessionYear} />
            <Input name="admissionDate" label="Admission Date (ভর্তির তারিখ)" type="date" val={form.admissionDate} set={(v) => update('admissionDate', v)} error={errors.admissionDate} />

            <Input name="studentNameBn" label="শিক্ষার্থীর নাম (বাংলা)" val={form.studentNameBn} set={(v) => update('studentNameBn', v)} error={errors.studentNameBn} />
            <Input name="studentNameEn" label="Student Name (English)" val={form.studentNameEn} set={(v) => update('studentNameEn', v)} error={errors.studentNameEn} />

            <div className="relative pt-1 w-full">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block">Class (শ্রেণি)</label>
              <select
                name="classBn"
                disabled={classLocked}
                className={`w-full p-4 bg-gray-50 rounded-xl font-bold outline-none border ${errors.classBn ? 'border-red-500' : 'border-transparent'} ${classLocked ? 'opacity-60 cursor-not-allowed bg-gray-200 text-gray-500' : ''}`}
                value={form.classBn}
                onChange={(e) => update('classBn', e.target.value)}
              >
                <option value="">Select...</option>
                {CLASS_LIST_BN.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.classBn && <p className="text-red-500 text-xs font-bold mt-1">{errors.classBn}</p>}
            </div>

            <Input name="roll" label="Roll (1-500)" type="number" min="1" max="500" val={form.roll} set={(v) => update('roll', v)} error={errors.roll} />

            {isSeniorClass(form.classBn) && (
              <>
                <div className="relative pt-1 w-full">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block">Group (বিভাগ)</label>
                  <select
                    name="group"
                    className={`w-full p-4 bg-gray-50 rounded-xl font-bold outline-none border ${errors.group ? 'border-red-500' : 'border-transparent'}`}
                    value={form.group}
                    onChange={(e) => update('group', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="General">General</option>
                    <option value="Science">Science</option>
                    <option value="Muzabbid">Muzabbid</option>
                  </select>
                  {errors.group && <p className="text-red-500 text-xs font-bold mt-1">{errors.group}</p>}
                </div>
                <Input name="fourthSubject" label="4th Subject (ঐচ্ছিক)" val={form.fourthSubject} set={(v) => update('fourthSubject', v)} error={errors.fourthSubject} />
                <Input name="boardRegNo" label="Board Reg No (ঐচ্ছিক)" val={form.boardRegNo} set={(v) => update('boardRegNo', v)} error={errors.boardRegNo} />
              </>
            )}

            <div className="mt-2 p-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">Student ID (Auto Generated)</p>
              <p className="text-xl font-black tracking-widest">{form.studentId || '— — — — — — — — — —'}</p>
            </div>
          </div>
        )}

        {/* ==================== STEP 2: PERSONAL ==================== */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-6 duration-300">
            <div className="relative pt-1 w-full">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block">Gender (লিঙ্গ)</label>
              <select
                name="gender"
                className={`w-full p-4 bg-gray-50 rounded-xl font-bold outline-none border ${errors.gender ? 'border-red-500' : 'border-transparent'}`}
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="Male">Male (ছাত্র)</option>
                <option value="Female">Female (ছাত্রী)</option>
              </select>
              {errors.gender && <p className="text-red-500 text-xs font-bold mt-1">{errors.gender}</p>}
            </div>

            <div className="relative pt-1 w-full">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block">Religion (ধর্ম)</label>
              <select
                name="religion"
                className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none border border-transparent"
                value={form.religion}
                onChange={(e) => update('religion', e.target.value)}
              >
                <option value="Islam">Islam</option>
                <option value="Hinduism">Hinduism</option>
                <option value="Buddhism">Buddhism</option>
                <option value="Christianity">Christianity</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <Input name="dob" label="Date of Birth (জন্ম তারিখ)" type="date" val={form.dob} set={(v) => update('dob', v)} error={errors.dob} />
              {liveAge && <p className="text-[11px] font-bold text-emerald-600 mt-1 ml-1">✓ শিক্ষার্থীর বয়স: {liveAge} বছর</p>}
            </div>

            <Input name="brn" label="Birth Registration No (১৭ ডিজিট)" inputMode="numeric" maxLength={17} type="text" val={form.brn} set={(v) => update('brn', v)} error={errors.brn} />

            <div className="relative pt-1 w-full">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block">Blood Group (রক্তের গ্রুপ)</label>
              <select
                name="bloodGroup"
                className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none border border-transparent"
                value={form.bloodGroup}
                onChange={(e) => update('bloodGroup', e.target.value)}
              >
                <option value="">N/A</option>
                {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <Input name="medicalNote" label="Medical Note (কোনো রোগ/অ্যালার্জি থাকলে · ঐচ্ছিক)" val={form.medicalNote} set={(v) => update('medicalNote', v)} error={errors.medicalNote} />
          </div>
        )}

        {/* ==================== STEP 3: PARENTS & CONTACT ==================== */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-6 duration-300">
            <Input name="fatherNameBn" label="পিতার নাম (বাংলা)" val={form.fatherNameBn} set={(v) => update('fatherNameBn', v)} error={errors.fatherNameBn} />
            <Input name="fatherNameEn" label="Father Name (English)" val={form.fatherNameEn} set={(v) => update('fatherNameEn', v)} error={errors.fatherNameEn} />
            <Input name="fatherNid" label="পিতার NID (১০/১৩/১৭ ডিজিট · ঐচ্ছিক)" inputMode="numeric" maxLength={17} val={form.fatherNid} set={(v) => update('fatherNid', v)} error={errors.fatherNid} />
            <Input name="fatherOccupation" label="পিতার পেশা (ঐচ্ছিক)" val={form.fatherOccupation} set={(v) => update('fatherOccupation', v)} error={errors.fatherOccupation} />

            <div className="h-px bg-slate-100 my-2" />

            <Input name="motherNameBn" label="মাতার নাম (বাংলা)" val={form.motherNameBn} set={(v) => update('motherNameBn', v)} error={errors.motherNameBn} />
            <Input name="motherNameEn" label="Mother Name (English)" val={form.motherNameEn} set={(v) => update('motherNameEn', v)} error={errors.motherNameEn} />
            <Input name="motherNid" label="মাতার NID (১০/১৩/১৭ ডিজিট · ঐচ্ছিক)" inputMode="numeric" maxLength={17} val={form.motherNid} set={(v) => update('motherNid', v)} error={errors.motherNid} />
            <Input name="motherOccupation" label="মাতার পেশা (ঐচ্ছিক)" val={form.motherOccupation} set={(v) => update('motherOccupation', v)} error={errors.motherOccupation} />

            <Input name="annualIncome" label="পারিবারিক বার্ষিক আয় (টাকা · ঐচ্ছিক)" inputMode="numeric" val={form.annualIncome} set={(v) => update('annualIncome', v)} error={errors.annualIncome} />

            <div className="h-px bg-slate-100 my-2" />

            <Input name="whatsappNumber" label="Mobile / WhatsApp (১১ ডিজিট)" type="tel" inputMode="numeric" maxLength={11} val={form.whatsappNumber} set={(v) => update('whatsappNumber', v)} error={errors.whatsappNumber} />

            {/* Emergency Contact */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Emergency Contact (জরুরি যোগাযোগ)</p>
              <Input name="emergencyNumber" label="Emergency Phone (১১ ডিজিট)" type="tel" inputMode="numeric" maxLength={11} val={form.emergencyNumber} set={(v) => update('emergencyNumber', v)} error={errors.emergencyNumber} />
              <Input name="emergencyContactName" label="নাম (ফাঁকা রাখলে পিতার নাম হবে)" val={form.emergencyContactName} set={(v) => update('emergencyContactName', v)} error={errors.emergencyContactName} />
              <div className="relative pt-1 w-full">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block">সম্পর্ক (Relationship)</label>
                <select
                  name="emergencyRelationship"
                  className="w-full p-4 bg-white rounded-xl font-bold outline-none border border-slate-200"
                  value={form.emergencyRelationship}
                  onChange={(e) => update('emergencyRelationship', e.target.value)}
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Brother">Brother</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
            </div>

            {/* Local Guardian Toggle */}
            <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.hasLocalGuardian}
                onChange={(e) => setForm((p) => ({ ...p, hasLocalGuardian: e.target.checked }))}
                className="w-5 h-5 rounded-md accent-[#060D1F] shrink-0"
              />
              <div>
                <p className="text-sm font-black text-slate-800">স্থানীয় অভিভাবক আছে (ঐচ্ছিক)</p>
                <p className="text-[11px] font-semibold text-slate-400">পিতা-মাতা ছাড়া অন্য অভিভাবক থাকলে টিক দিন</p>
              </div>
            </label>

            {form.hasLocalGuardian && (
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3 animate-in fade-in duration-200">
                <Input name="localGuardianName" label="স্থানীয় অভিভাবকের নাম" val={form.localGuardianName} set={(v) => update('localGuardianName', v)} error={errors.localGuardianName} />
                <Input name="localGuardianRelation" label="সম্পর্ক (যেমন: চাচা/মামা)" val={form.localGuardianRelation} set={(v) => update('localGuardianRelation', v)} error={errors.localGuardianRelation} />
                <Input name="localGuardianPhone" label="মোবাইল নম্বর (১১ ডিজিট)" type="tel" inputMode="numeric" maxLength={11} val={form.localGuardianPhone} set={(v) => update('localGuardianPhone', v)} error={errors.localGuardianPhone} />
                <Input name="localGuardianNid" label="NID নম্বর (ঐচ্ছিক)" inputMode="numeric" maxLength={17} val={form.localGuardianNid} set={(v) => update('localGuardianNid', v)} error={errors.localGuardianNid} />
              </div>
            )}
          </div>
        )}

        {/* ==================== STEP 4: ADDRESS ==================== */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-6 duration-300">
            <AddressCascadeBlock
              title="বর্তমান ঠিকানা"
              subtitle="Present Address"
              prefix=""
              form={form}
              errors={errors}
              geo={geo}
              geoSel={geoSel}
              geoLoading={geoLoading}
              geoError={geoError}
              onPickGeo={pickPresentGeo}
              onFieldChange={update}
              accent="emerald"
            />

            <label className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.sameAsPresent}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((p) => ({ ...p, sameAsPresent: checked }));
                    if (checked) {
                      setErrors((prev) => {
                        const cleaned = { ...prev };
                        Object.keys(cleaned).forEach((key) => {
                          if (key.startsWith('perm')) delete cleaned[key];
                        });
                        return cleaned;
                      });
                    }
                  }}
                  className="w-5 h-5 rounded-md accent-[#060D1F] shrink-0"
                />
                <div>
                  <p className="text-sm font-black text-slate-800">স্থায়ী ও বর্তমান ঠিকানা একই</p>
                  <p className="text-[11px] font-semibold text-slate-400">আলাদা স্থায়ী ঠিকানা দিতে টিক তুলে দিন</p>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 ${form.sameAsPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {form.sameAsPresent ? 'একই' : 'আলাদা'}
              </span>
            </label>

            {!form.sameAsPresent && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <AddressCascadeBlock
                  title="স্থায়ী ঠিকানা"
                  subtitle="Permanent Address"
                  prefix="perm"
                  form={form}
                  errors={errors}
                  geo={permGeo}
                  geoSel={permGeoSel}
                  geoLoading={permGeoLoading}
                  geoError={permGeoError}
                  onPickGeo={pickPermGeo}
                  onFieldChange={update}
                  accent="indigo"
                />
              </div>
            )}
          </div>
        )}

        {/* ==================== STEP 5: FEE, SIBLING & STATUS ==================== */}
        {step === 5 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-6 duration-300">
            {/* Sibling Toggle (Required ID if checked) */}
            <label className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.hasSibling}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((p) => ({
                      ...p,
                      hasSibling: checked,
                      siblingStudentCode: checked ? p.siblingStudentCode : '',
                      feeCategory: !checked && p.feeCategory === 'Sibling Waiver' ? 'Regular' : p.feeCategory
                    }));
                    if (!checked) setErrors((prev) => ({ ...prev, siblingStudentCode: '' }));
                  }}
                  className="w-5 h-5 rounded-md accent-[#060D1F] shrink-0"
                />
                <div>
                  <p className="text-sm font-black text-slate-800">মাদ্রাসায় ভাই বা বোন পড়ে?</p>
                  <p className="text-[11px] font-semibold text-slate-400">টিক দিলে ভাই/বোনের ১০ ডিজিটের আইডি দেওয়া বাধ্যতামূলক</p>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 ${form.hasSibling ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                {form.hasSibling ? 'হ্যাঁ' : 'না'}
              </span>
            </label>

            {form.hasSibling && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2 animate-in fade-in duration-200">
                <Input
                  name="siblingStudentCode"
                  label="ভাই/বোনের স্টুডেন্ট আইডি (১০ ডিজিট · বাধ্যতামূলক)"
                  inputMode="numeric"
                  maxLength={10}
                  val={form.siblingStudentCode}
                  set={(v) => update('siblingStudentCode', v)}
                  error={errors.siblingStudentCode}
                />
              </div>
            )}

            {/* Fee Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fee Details (বেতন ও ক্যাটাগরি)</p>
              <div className="relative pt-1 w-full">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 block">Fee Category</label>
                <select
                  name="feeCategory"
                  className="w-full p-4 bg-white rounded-xl font-bold outline-none border border-slate-200"
                  value={form.feeCategory}
                  onChange={(e) => update('feeCategory', e.target.value)}
                >
                  <option value="Regular">Regular</option>
                  <option value="Sibling Waiver">Sibling Waiver</option>
                  <option value="Half Free">Half Free</option>
                  <option value="Full Free">Full Free</option>
                  <option value="Orphan">Orphan (এতিম)</option>
                </select>
              </div>
              <Input name="monthlyFee" label="Monthly Fee (মাসিক বেতন · টাকা)" inputMode="numeric" val={form.monthlyFee} set={(v) => update('monthlyFee', v)} error={errors.monthlyFee} />
            </div>

            {/* Admin Status Control (Only on Update) */}
            {isUpdate && isAdmin && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Student Status (Admin Only)</p>
                <select
                  name="status"
                  className="w-full p-4 bg-white rounded-xl font-bold outline-none border border-amber-200"
                  value={form.status}
                  onChange={(e) => update('status', e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Transferred">Transferred (TC)</option>
                </select>
                {form.status !== 'Active' && (
                  <Input name="statusReason" label="স্ট্যাটাস পরিবর্তনের কারণ" val={form.statusReason} set={(v) => update('statusReason', v)} error={errors.statusReason} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== STEP 6: STUDENT PHOTO ==================== */}
        {step === 6 && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 py-6">
            <div
              className={`relative w-56 h-56 bg-slate-100 rounded-full flex items-center justify-center border-[6px] shadow-2xl ring-2 overflow-hidden transition-all ${
                errors.imageUrl ? 'border-red-500 ring-red-200' : 'border-white ring-slate-200'
              }`}
            >
              {imgChecking ? (
                <Loader2 size={40} className="animate-spin text-emerald-600" />
              ) : imgPreview ? (
                <img src={imgPreview} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <Camera size={48} className="text-slate-300" />
              )}
              <input
                name="imageUrl"
                type="file"
                disabled={imgChecking}
                onChange={handleImage}
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept="image/*"
              />
            </div>

            {errors.imageUrl && (
              <p className="text-red-500 text-xs font-bold mt-4 text-center max-w-xs flex items-center justify-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" />
                {typeof errors.imageUrl === 'string' && errors.imageUrl.length > 1 ? errors.imageUrl : 'ছবি আবশ্যক'}
              </p>
            )}

            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center max-w-xs space-y-1">
              <p className="text-xs font-black text-slate-700">ছবি আপলোড করতে উপরে ট্যাপ করুন</p>
              <p className="text-[11px] font-semibold text-slate-400">
                • ছবি অবশ্যই স্কয়ার (Square) হতে হবে <br />
                • ব্যাকগ্রাউন্ড সম্পূর্ণ সাদা হতে হবে (উপরের দুই কোণা যাচাই করা হবে)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATION FOOTER */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
        <button
          id="formBackBtn"
          type="button"
          onClick={goBackStep}
          className={`font-bold px-5 py-3 rounded-2xl flex items-center gap-1.5 transition-colors ${
            step > 1 ? 'text-slate-600 bg-slate-100 hover:bg-slate-200' : 'text-red-500 hover:bg-red-50'
          }`}
        >
          {step > 1 ? <><ArrowLeft size={16} /> Back</> : 'Cancel'}
        </button>

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            className="bg-[#060D1F] hover:bg-slate-800 text-[#D4A843] px-7 py-3.5 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-slate-900/15 active:scale-95 transition-all"
          >
            Next <ArrowRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || imgChecking}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white px-8 py-3.5 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-emerald-600/25 disabled:opacity-60 active:scale-95 transition-all"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <>Submit <Check size={18} /></>}
          </button>
        )}
      </div>
    </div>
  );
};

export default FullForm;