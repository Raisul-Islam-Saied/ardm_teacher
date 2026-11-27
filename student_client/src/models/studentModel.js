/**
- ARDM Student Portal — Student Model (MongoDB <-> original UI adapter + Dynamic RBAC)
- Server docs use fullNameBng / studentCode / ... ; the original UI (DetailView, exports,
- filters, ID cards) uses StudentNameBn / ID / ... — this file converts both ways.
 */
import { CLASS_ORDER, getPortalSettings } from '../config/systemConfig';

// ------------------------------------------------------------------
// Original helpers (verbatim)
// ------------------------------------------------------------------
export const getDaysUntilBirthday = (dobStr) => {
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

export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const REGEX = {
  BANGLA: /^[\u0980-\u09FF\s.]+$/,
  ENGLISH: /^[a-zA-Z\s.]+$/,
  MOBILE: /^01[3-9]\d{8}$/,
  NUMBER: /^\d+$/
};

export const toISODate = (dStr) => {
  if (!dStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ------------------------------------------------------------------
// Class name normalisation
// ------------------------------------------------------------------
export const toUiClass = (s) => String(s || '').replace(/\u09AF\u09BC/g, '\u09DF');
export const toServerClass = (s) => String(s || '').replace(/\u09DF/g, '\u09AF\u09BC');

export const CLASS_LIST_BN = ['প্লে', 'নার্সারি', 'কেজি', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম'];

export const CLASS_EN_MAP = {
  'প্লে': 'Play', 'নার্সারি': 'Nursery', 'কেজি': 'KG',
  '১ম': 'One', '২য়': 'Two', '৩য়': 'Three', '৪র্থ': 'Four', '৫ম': 'Five',
  '৬ষ্ঠ': 'Six', '৭ম': 'Seven', '৮ম': 'Eight', '৯ম': 'Nine', '১০ম': 'Ten'
};

export const CLASS_CODE_MAP = {
  'প্লে': '99', 'নার্সারি': '00', 'কেজি': '98',
  '১ম': '01', '২য়': '02', '৩য়': '03', '৪র্থ': '04', '৫ম': '05',
  '৬ষ্ঠ': '06', '৭ম': '07', '৮ম': '08', '৯ম': '09', '১০ম': '10'
};

export const isSeniorClass = (classBn) => ['৯ম', '১০ম'].includes(toUiClass(classBn));

// ------------------------------------------------------------------
// Server -> UI
// ------------------------------------------------------------------
const dateOnly = (v) => {
  if (!v) return '';
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
};

export const toUiStudent = (doc) => {
  if (!doc) return null;
  const addr = doc.presentAddress || {};
  return {
    _id: doc._id,
    ID: doc.studentCode,
    UID: doc.uid || '',
    BiometricId: doc.biometricDeviceId ?? '',
    MigratedFromSheet: Boolean(doc.migratedFromSheet),
    Time: doc.createdAt || doc.admissionDate || '',
    AdmissionDate: dateOnly(doc.admissionDate),
    Session: doc.session || '',
    StudentNameBn: doc.fullNameBng || '',
    StudentNameEn: doc.fullNameEng || '',
    Roll: doc.roll,
    ClassBn: toUiClass(doc.classBn),
    ClassEn: doc.classEn || CLASS_EN_MAP[toUiClass(doc.classBn)] || '',
    ClassOrder: doc.classOrder ?? 99,
    Group: doc.group || '',
    FourthSubject: doc.fourthSubject || '',
    BoardRegNo: doc.boardRegNo || '',
    Gender: doc.gender || '',
    Religion: doc.religion || 'Islam',
    BRN: doc.brnNumber || '',
    DOB: dateOnly(doc.dateOfBirth),
    BloodGroup: doc.bloodGroup && doc.bloodGroup !== 'N/A' ? doc.bloodGroup : '',
    MedicalNote: doc.medicalNote || '',
    FatherNameBn: doc.fathersNameBng || '',
    FatherNameEn: doc.fathersNameEng || '',
    FatherNid: doc.fatherNid || '',
    FatherOccupation: doc.fatherOccupation || '',
    MotherNameBn: doc.mothersNameBng || '',
    MotherNameEn: doc.mothersNameEng || '',
    MotherNid: doc.motherNid || '',
    MotherOccupation: doc.motherOccupation || '',
    AnnualIncome: doc.annualIncome || 0,
    WhatsApp: doc.phone || '',
    EmergencyNo: doc.emergencyContact?.phone || '',
    EmergencyContactName: doc.emergencyContact?.contactName || '',
    EmergencyRelationship: doc.emergencyContact?.relationship || 'Father',
    LocalGuardian: doc.localGuardian || { name: '', relation: '', nid: '', phone: '' },
    HouseNameBn: addr.houseNameBn || '',
    HouseNameEn: addr.houseNameEn || '',
    VillageBn: addr.villageBn || '',
    VillageEn: addr.villageEn || '',
    UnionBn: addr.unionBn || '',
    UnionEn: addr.unionEn || '',
    WardNo: addr.wardNo || '',
    PostOffice: addr.postOffice || '',
    PostCode: addr.postCode || '',
    UpazilaBn: addr.upazilaBn || '',
    UpazilaEn: addr.upazilaEn || '',
    DistrictBn: addr.districtBn || '',
    DistrictEn: addr.districtEn || '',
    DivisionBn: addr.divisionBn || '',
    DivisionEn: addr.divisionEn || '',
    PermanentAddress: doc.permanentAddress || null,
    FeeDetails: doc.feeDetails || { monthlyFee: 0, feeCategory: 'Regular', siblingStudentCode: '' },
    ImageURL: doc.profilePicture?.url || '',
    Status: doc.status || 'Active',
    StatusReason: doc.statusReason || '',
    AcademicHistory: Array.isArray(doc.academicHistory) ? doc.academicHistory : [],
    LastUpdated: doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : ''
  };
};

export const toUiStudents = (docs) => (Array.isArray(docs) ? docs.map(toUiStudent) : []);

// ------------------------------------------------------------------
// UI form -> Server payload (only fields the strict server schema knows)
// ------------------------------------------------------------------
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

export const buildAddress = (f, prefix = '') => {
  const k = (name) => (prefix ? `${prefix}${name.charAt(0).toUpperCase()}${name.slice(1)}` : name);
  return {
    houseNameBn: clean(f[k('houseNameBn')]),
    houseNameEn: clean(f[k('houseNameEn')]),
    villageBn: clean(f[k('villageBn')]),
    villageEn: clean(f[k('villageEn')]),
    unionBn: clean(f[k('unionBn')]),
    unionEn: clean(f[k('unionEn')]),
    wardNo: clean(f[k('wardNo')]),
    postOffice: clean(f[k('postOffice')]),
    postCode: clean(f[k('postCode')]),
    upazilaBn: clean(f[k('upazilaBn')]),
    upazilaEn: clean(f[k('upazilaEn')]),
    districtBn: clean(f[k('districtBn')]),
    districtEn: clean(f[k('districtEn')]),
    divisionBn: clean(f[k('divisionBn')]) || 'চট্টগ্রাম',
    divisionEn: clean(f[k('divisionEn')]) || 'Chattogram'
  };
};

export const toServerPayload = (form, { isUpdate = false, imageUrl, publicId, migration = null } = {}) => {
  const classBn = toUiClass(form.classBn);
  const payload = {
    session: clean(form.sessionYear),
    admissionDate: form.admissionDate || undefined,
    fullNameBng: clean(form.studentNameBn),
    fullNameEng: clean(form.studentNameEn),
    gender: form.gender,
    religion: form.religion || 'Islam',
    classBn: toServerClass(classBn),
    classEn: CLASS_EN_MAP[classBn],
    roll: Number(form.roll),
    group: isSeniorClass(classBn) ? form.group || '' : '',
    fourthSubject: isSeniorClass(classBn) ? clean(form.fourthSubject) : '',
    ...(isSeniorClass(classBn) && clean(form.boardRegNo) ? { boardRegNo: clean(form.boardRegNo) } : {}),
    brnNumber: clean(form.brn),
    dateOfBirth: form.dob,
    bloodGroup: form.bloodGroup || 'N/A',
    medicalNote: clean(form.medicalNote),
    fathersNameBng: clean(form.fatherNameBn),
    fathersNameEng: clean(form.fatherNameEn),
    fatherNid: clean(form.fatherNid),
    fatherOccupation: clean(form.fatherOccupation),
    mothersNameBng: clean(form.motherNameBn),
    mothersNameEng: clean(form.motherNameEn),
    motherNid: clean(form.motherNid),
    motherOccupation: clean(form.motherOccupation),
    annualIncome: Number(form.annualIncome) || 0,
    phone: clean(form.whatsappNumber),
    emergencyContact: {
      contactName: clean(form.emergencyContactName) || clean(form.fatherNameBn),
      relationship: form.emergencyRelationship || 'Father',
      phone: clean(form.emergencyNumber)
    },
    localGuardian: form.hasLocalGuardian
      ? {
          name: clean(form.localGuardianName),
          relation: clean(form.localGuardianRelation),
          nid: clean(form.localGuardianNid),
          phone: clean(form.localGuardianPhone)
        }
      : { name: '', relation: '', nid: '', phone: '' },
    presentAddress: buildAddress(form),
    permanentAddress: form.sameAsPresent === false ? buildAddress(form, 'perm') : buildAddress(form),
    feeDetails: {
      monthlyFee: Number(form.monthlyFee) || 0,
      feeCategory: form.feeCategory || 'Regular',
      siblingStudentCode:
        form.hasSibling || form.feeCategory === 'Sibling Waiver' ? clean(form.siblingStudentCode) : ''
    },
    profilePicture: { url: imageUrl, ...(publicId ? { publicId } : {}) }
  };

  if (isUpdate) {
    payload.status = form.status || 'Active';
    payload.statusReason = clean(form.statusReason);
  } else {
    if (migration?.studentCode) {
      payload.studentCode = migration.studentCode;
      payload.migratedFromSheet = true;
      if (migration.admissionDate) payload.admissionDate = migration.admissionDate;
      if (migration.legacyAcademicRecord) {
        const sourceSession = clean(migration.legacyAcademicRecord.session);
        const sourceClassBn = toServerClass(toUiClass(migration.legacyAcademicRecord.classBn));
        const sourceRoll = Number(migration.legacyAcademicRecord.roll);
        if (
          /^20\d{2}$/.test(sourceSession)
          && CLASS_EN_MAP[sourceClassBn]
          && Number.isInteger(sourceRoll)
          && sourceRoll >= 1
          && sourceRoll <= 500
        ) {
          payload.legacyAcademicRecord = {
            session: sourceSession,
            classBn: sourceClassBn,
            roll: sourceRoll
          };
        }
      }
    }
  }
  return payload;
};

// ------------------------------------------------------------------
// Smart ID
// ------------------------------------------------------------------
export const generateStudentId = (sessionYear, dob, classBn, roll) => {
  if (!sessionYear || !dob || !classBn || !roll) return '';
  const dobYear = new Date(dob).getFullYear().toString().slice(-2);
  const classCode = CLASS_CODE_MAP[toUiClass(classBn)] || '00';
  const rollCode = String(roll).padStart(2, '0').slice(-2);
  return `${sessionYear}${dobYear}${classCode}${rollCode}`;
};

// ------------------------------------------------------------------
// Sibling detection
// ------------------------------------------------------------------
export const cleanFamilyName = (name) =>
  (name || '')
    .replace(/মোঃ|মো\.?|মোহাম্মদ|মুহাম্মদ|md\.?|MD\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const findSiblings = (list, detailData) => {
  if (!detailData) return [];

  const father = cleanFamilyName(detailData.FatherNameBn);
  const mother = cleanFamilyName(detailData.MotherNameBn);
  const phone = (detailData.WhatsApp || '').trim();

  return list
    .filter(s => {
      if (s.ID === detailData.ID) return false;
      let score = 0;
      if (father && cleanFamilyName(s.FatherNameBn) === father) score++;
      if (mother && cleanFamilyName(s.MotherNameBn) === mother) score++;
      if (phone && (s.WhatsApp || '').trim() === phone) score++;
      return score >= 2;
    })
    .sort((a, b) => {
      const da = a.DOB ? new Date(a.DOB) : null;
      const db = b.DOB ? new Date(b.DOB) : null;
      if (da && db) return da - db;
      return (CLASS_ORDER[b.ClassBn] || 0) - (CLASS_ORDER[a.ClassBn] || 0);
    });
};

// ------------------------------------------------------------------
// Auth user (ERP) -> UI user shape
// ------------------------------------------------------------------
export const toUiUser = (user) => {
  if (!user) return null;
  const isAdmin = user.role === 'SuperAdmin' || user.role === 'Admin';
  const classBn = toUiClass(user.assignedClass);
  return {
    ...user,
    role: isAdmin ? 'Admin' : 'Class',
    erpRole: user.role,
    isSuperAdmin: user.role === 'SuperAdmin',
    isAdminRole: isAdmin,
    isClassTeacher: !isAdmin && Boolean(classBn),
    classBn,
    classEn: CLASS_EN_MAP[classBn] || '',
    canEditAssignedClass: user.canEditAssignedClass === true,
    displayName: user.fullNameEng || user.fullNameBng || user.name || user.teacherCode || ''
  };
};

// ------------------------------------------------------------------
// Dynamic RBAC (reads GLOBAL_SETTINGS.studentPortal from server)
// action: 'add' | 'edit' | 'delete' | 'export'
// ------------------------------------------------------------------
export const hasStudentPermission = (uiUser, action, targetClassBn = null, settingsOverride = null) => {
  if (!uiUser) return false;
  if (uiUser.role === 'Admin' || uiUser.erpRole === 'SuperAdmin' || uiUser.erpRole === 'Admin') {
    return true;
  }

  const sp = settingsOverride || getPortalSettings();
  const isClassTeacher = Boolean(uiUser.classBn);

  // নন-ক্লাস টিচার (যার কোনো শ্রেণি অ্যাসাইন করা নেই)
  if (!isClassTeacher) {
    return Boolean(sp?.nonClassTeacherPermissions?.[action]);
  }

  // ক্লাস টিচার (যার একটি নির্দিষ্ট শ্রেণি অ্যাসাইন করা আছে)
  const ownPerm = Boolean(sp?.classTeacherPermissions?.ownClass?.[action]);
  const otherPerm = Boolean(sp?.classTeacherPermissions?.otherClass?.[action]);

  if (!targetClassBn) {
    return ownPerm || otherPerm;
  }

  const normalizedTarget = toUiClass(targetClassBn);
  const isOwnClass = normalizedTarget === uiUser.classBn;
  return isOwnClass ? ownPerm : otherPerm;
};

export const canCreateStudent = (uiUser, targetClassBn = null, settingsOverride = null) =>
  hasStudentPermission(uiUser, 'add', targetClassBn, settingsOverride);

export const canEditStudent = (uiUser, student, settingsOverride = null) =>
  hasStudentPermission(uiUser, 'edit', student?.ClassBn || null, settingsOverride);

export const canDeleteStudent = (uiUser, student, settingsOverride = null) =>
  hasStudentPermission(uiUser, 'delete', student?.ClassBn || null, settingsOverride);

export const canExportStudents = (uiUser, targetClassBn = null, settingsOverride = null) =>
  hasStudentPermission(uiUser, 'export', targetClassBn, settingsOverride);

// ব্যাকওয়ার্ড কমপ্যাটিবিলিটির জন্য (DetailView ও Controller-এ ব্যবহৃত)
export const canManageStudent = (uiUser, student, settingsOverride = null) =>
  canEditStudent(uiUser, student, settingsOverride);

// ফর্ম বা এক্সপোর্টে একজন শিক্ষক কোন কোন শ্রেণিতে কাজ করতে পারবেন তা বের করার হেল্পার
export const getAllowedClassesForAction = (uiUser, action = 'add', settingsOverride = null) => {
  if (!uiUser) return [];
  if (uiUser.role === 'Admin' || uiUser.erpRole === 'SuperAdmin' || uiUser.erpRole === 'Admin') {
    return [...CLASS_LIST_BN];
  }
  return CLASS_LIST_BN.filter((cls) => hasStudentPermission(uiUser, action, cls, settingsOverride));
};

// ------------------------------------------------------------------
// Server field name -> form field + step (for inline error mapping)
// ------------------------------------------------------------------
const FIELD_ROWS = [
  ['session', 'sessionYear', 1], ['admissionDate', 'admissionDate', 1], ['studentCode', 'studentId', 1],
  ['fullNameBng', 'studentNameBn', 1], ['fullNameEng', 'studentNameEn', 1],
  ['roll', 'roll', 1], ['classBn', 'classBn', 1], ['group', 'group', 1],
  ['fourthSubject', 'fourthSubject', 1], ['boardRegNo', 'boardRegNo', 1],
  ['gender', 'gender', 2], ['religion', 'religion', 2], ['brnNumber', 'brn', 2],
  ['dateOfBirth', 'dob', 2], ['bloodGroup', 'bloodGroup', 2], ['medicalNote', 'medicalNote', 2],
  ['fathersNameBng', 'fatherNameBn', 3], ['fathersNameEng', 'fatherNameEn', 3],
  ['fatherNid', 'fatherNid', 3], ['fatherOccupation', 'fatherOccupation', 3],
  ['mothersNameBng', 'motherNameBn', 3], ['mothersNameEng', 'motherNameEn', 3],
  ['motherNid', 'motherNid', 3], ['motherOccupation', 'motherOccupation', 3],
  ['annualIncome', 'annualIncome', 3], ['phone', 'whatsappNumber', 3],
  ['emergencyContact.phone', 'emergencyNumber', 3], ['emergencyContact.contactName', 'emergencyContactName', 3],
  ['localGuardian.name', 'localGuardianName', 3], ['localGuardian.phone', 'localGuardianPhone', 3],
  ['presentAddress.divisionBn', 'divisionBn', 4], ['presentAddress.districtBn', 'districtBn', 4],
  ['presentAddress.upazilaBn', 'upazilaBn', 4], ['presentAddress.unionBn', 'unionBn', 4],
  ['presentAddress.villageBn', 'villageBn', 4], ['presentAddress.villageEn', 'villageEn', 4],
  ['presentAddress.postOffice', 'postOffice', 4], ['presentAddress.postCode', 'postCode', 4],
  ['presentAddress.wardNo', 'wardNo', 4], ['presentAddress.houseNameBn', 'houseNameBn', 4],
  ['presentAddress.houseNameEn', 'houseNameEn', 4],
  ['permanentAddress.divisionBn', 'permDivisionBn', 4], ['permanentAddress.districtBn', 'permDistrictBn', 4],
  ['permanentAddress.upazilaBn', 'permUpazilaBn', 4], ['permanentAddress.unionBn', 'permUnionBn', 4],
  ['permanentAddress.villageBn', 'permVillageBn', 4], ['permanentAddress.villageEn', 'permVillageEn', 4],
  ['permanentAddress.postOffice', 'permPostOffice', 4], ['permanentAddress.postCode', 'permPostCode', 4],
  ['permanentAddress.wardNo', 'permWardNo', 4], ['permanentAddress.houseNameBn', 'permHouseNameBn', 4],
  ['permanentAddress.houseNameEn', 'permHouseNameEn', 4],
  ['feeDetails.siblingStudentCode', 'siblingStudentCode', 5], ['feeDetails.monthlyFee', 'monthlyFee', 5],
  ['feeDetails.feeCategory', 'feeCategory', 5], ['statusReason', 'statusReason', 5],
  ['profilePicture.url', 'imageUrl', 6], ['profilePicture', 'imageUrl', 6]
];
const SERVER_FIELD_MAP = Object.fromEntries(FIELD_ROWS.map(([s, f, step]) => [s, { field: f, step }]));

export const mapServerFieldErrors = (fieldErrors = []) => {
  const errors = {};
  let firstStep = null;
  const unmapped = [];
  fieldErrors.forEach(({ field, message }) => {
    const hit = SERVER_FIELD_MAP[field] || SERVER_FIELD_MAP[String(field || '').replace(/\.\d+/g, '')];
    if (!hit) { unmapped.push(message); return; }
    if (!errors[hit.field]) errors[hit.field] = message;
    if (firstStep === null || hit.step < firstStep) firstStep = hit.step;
  });
  return { errors, firstStep, unmapped };
};

// ------------------------------------------------------------------
// Sheet (legacy) autoFillData -> UI form state (for migration)
// ------------------------------------------------------------------
export const legacyToFormState = (a) => ({
  sessionYear: a.session || '',
  studentId: a.studentCode || '',
  studentNameBn: a.fullNameBng || '',
  studentNameEn: a.fullNameEng || '',
  gender: a.gender || '',
  roll: a.roll || '',
  classBn: toUiClass(a.classBn),
  group: a.group || '',
  brn: a.brnNumber || '',
  dob: dateOnly(a.dateOfBirth),
  bloodGroup: a.bloodGroup && a.bloodGroup !== 'N/A' ? a.bloodGroup : '',
  fatherNameBn: a.fathersNameBng || '',
  fatherNameEn: a.fathersNameEng || '',
  motherNameBn: a.mothersNameBng || '',
  motherNameEn: a.mothersNameEng || '',
  whatsappNumber: a.phone || '',
  emergencyNumber: a.emergencyContact?.phone || '',
  houseNameBn: a.presentAddress?.houseNameBn || '',
  houseNameEn: a.presentAddress?.houseNameEn || '',
  villageBn: a.presentAddress?.villageBn || '',
  villageEn: a.presentAddress?.villageEn || '',
  unionBn: a.presentAddress?.unionBn || '',
  unionEn: a.presentAddress?.unionEn || '',
  wardNo: a.presentAddress?.wardNo || '',
  postOffice: a.presentAddress?.postOffice || 'সরফভাটা',
  postCode: a.presentAddress?.postCode || '4360',
  upazilaBn: a.presentAddress?.upazilaBn || '',
  upazilaEn: a.presentAddress?.upazilaEn || '',
  districtBn: a.presentAddress?.districtBn || '',
  districtEn: a.presentAddress?.districtEn || '',
  divisionBn: a.presentAddress?.divisionBn || 'চট্টগ্রাম',
  divisionEn: a.presentAddress?.divisionEn || 'Chattogram',
  imageUrl: a.profilePicture?.url || ''
});