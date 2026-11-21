/**
 * ARDM Enterprise ERP — Military-Grade Student Backend Engine (v2.0)
 * Run inside: ardm_teacher-main/server
 * Command: node upgrade_student_engine.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

if (!fs.existsSync(srcDir)) {
    console.error('❌ ত্রুটি: src ফোল্ডার পাওয়া যায়নি! ardm_teacher-main/server ফোল্ডারের ভেতর থেকে রান করুন।');
    process.exit(1);
}

const writeFileEnsureDir = (relPath, content) => {
    const fullPath = path.join(srcDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.trimStart(), 'utf8');
    console.log(`✅ Created/Updated: src/${relPath}`);
};

const patchFile = (relPath, replacerFn) => {
    const fullPath = path.join(srcDir, relPath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ Skipped (Not Found): src/${relPath}`);
        return;
    }
    const original = fs.readFileSync(fullPath, 'utf8');
    const updated = replacerFn(original);
    if (updated !== original) {
        fs.writeFileSync(fullPath, updated, 'utf8');
        console.log(`🔧 Patched: src/${relPath}`);
    } else {
        console.log(`ℹ️ Already Up-to-date: src/${relPath}`);
    }
};

// ============================================================================
// 1. CONSTANTS (system.constants.js)
// ============================================================================
writeFileEnsureDir('constants/system.constants.js', `
const ROLES = Object.freeze({
    SUPER_ADMIN: 'SuperAdmin',
    ADMIN: 'Admin',
    TEACHER: 'Teacher',
    STUDENT: 'Student'
});

const EMPLOYMENT_TYPES = Object.freeze({
    NON_MPO: 'Non-MPO',
    MPO: 'MPO',
    PART_TIME: 'Part-Time',
    CONTRACTUAL: 'Contractual'
});

const PAYMENT_METHODS = Object.freeze({
    CASH: 'Cash',
    BANK: 'Bank',
    MOBILE_BANKING: 'Mobile Banking'
});

const PAYMENT_STATUS = Object.freeze({
    PENDING: 'Pending',
    PAID: 'Paid'
});

const BLOOD_GROUPS = Object.freeze([
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'N/A'
]);

const DESIGNATION_DETAILS = Object.freeze([
    { titleEng: 'Superintendent', titleBng: 'সুপারিনটেনডেন্ট (সুপার)', rankPriority: 1, code: '01', staffCategory: 'Teaching' },
    { titleEng: 'Assistant Superintendent', titleBng: 'সহকারী সুপারিনটেনডেন্ট (সহ-সুপার)', rankPriority: 2, code: '02', staffCategory: 'Teaching' },
    { titleEng: 'Assistant Teacher', titleBng: 'সহকারী শিক্ষক', rankPriority: 3, code: '03', staffCategory: 'Teaching' },
    { titleEng: 'Assistant Moulvi', titleBng: 'সহকারী মৌলভী', rankPriority: 4, code: '04', staffCategory: 'Teaching' },
    { titleEng: 'Ebtedayee Head Teacher', titleBng: 'ইবতেদায়ী প্রধান', rankPriority: 5, code: '05', staffCategory: 'Teaching' },
    { titleEng: 'Ebtedayee Assistant Teacher', titleBng: 'ইবতেদায়ী সহকারী শিক্ষক', rankPriority: 6, code: '06', staffCategory: 'Teaching' },
    { titleEng: 'Ebtedayee Qari', titleBng: 'ইবতেদায়ী ক্বারী', rankPriority: 7, code: '07', staffCategory: 'Teaching' },
    { titleEng: 'Assistant Librarian', titleBng: 'সহকারী গ্রন্থাগারিক', rankPriority: 8, code: '08', staffCategory: 'Non-Teaching' },
    { titleEng: 'Office Assistant cum Computer Operator', titleBng: 'অফিস সহকারী কাম কম্পিউটার অপারেটর', rankPriority: 9, code: '09', staffCategory: 'Non-Teaching' },
    { titleEng: 'Office Support Staff', titleBng: 'অফিস সহায়ক', rankPriority: 10, code: '10', staffCategory: 'Non-Teaching' },
    { titleEng: 'Security Guard', titleBng: 'নিরাপত্তা প্রহরী', rankPriority: 11, code: '11', staffCategory: 'Non-Teaching' },
    { titleEng: 'Night Guard', titleBng: 'নৈশ প্রহরী', rankPriority: 12, code: '12', staffCategory: 'Non-Teaching' },
    { titleEng: 'Cleaner', titleBng: 'পরিচ্ছন্নতাকর্মী', rankPriority: 13, code: '13', staffCategory: 'Non-Teaching' },
    { titleEng: 'Ayah', titleBng: 'আয়া', rankPriority: 14, code: '14', staffCategory: 'Non-Teaching' },
    { titleEng: 'Other', titleBng: 'অন্যান্য', rankPriority: 15, code: '15', staffCategory: 'Non-Teaching' }
]);

const DESIGNATIONS = Object.freeze(DESIGNATION_DETAILS.map(d => d.titleEng));

const DEGREE_LEVEL_WEIGHTS = Object.freeze({
    'PhD': 6,
    'Masters': 5,
    'Kamil': 5,
    'MA': 5,
    'MSc': 5,
    'MSS': 5,
    'MBA': 5,
    'Honours': 4,
    'Fazil': 4,
    'BA': 4,
    'BSc': 4,
    'BSS': 4,
    'BBA': 4,
    'HSC': 3,
    'Alim': 3,
    'Diploma': 3,
    'SSC': 2,
    'Dakhil': 2,
    'JDC': 1,
    'JSC': 1,
    'Eight': 1,
    'Other': 0
});

const ATTENDANCE_STATUS = Object.freeze({
    PRESENT: 'Present',
    EXCUSED_LATE: 'Late (Excused)',
    LATE: 'Late',
    LEAVE: 'Leave',
    ABSENT: 'Absent',
    OFFICIAL_DUTY: 'Official Duty',
    APPROVED_SICK_LEAVE: 'Approved Sick Leave',
    APPROVED_CASUAL_LEAVE: 'Approved Casual Leave',
    HOLIDAY_DUTY: 'Holiday Duty'
});

const ATTENDANCE_SOURCES = Object.freeze({
    BIOMETRIC: 'Biometric',
    MANUAL_ADMIN: 'Manual_Admin',
    SYSTEM_CRON: 'System_Cron'
});

const LEAVE_TYPES = Object.freeze({
    CASUAL: 'Casual Leave',
    SICK: 'Sick Leave',
    LATE_EXCUSE: 'Late Excuse',
    OFFICIAL_DUTY: 'Official Duty',
    WITHOUT_PAY: 'Leave Without Pay'
});

const LEAVE_APPROVAL_STATUS = Object.freeze({
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected'
});

const SALARY_ADJUSTMENT_MODES = Object.freeze({
    INCREASE_AMOUNT: 'INCREASE_AMOUNT',
    DECREASE_AMOUNT: 'DECREASE_AMOUNT',
    INCREASE_PERCENT: 'INCREASE_PERCENT',
    DECREASE_PERCENT: 'DECREASE_PERCENT',
    INCREASE_DAYS: 'INCREASE_DAYS',
    DECREASE_DAYS: 'DECREASE_DAYS'
});

const ATTENDANCE_RULES = Object.freeze({
    DEFAULT_IN_TIME: '09:00',
    DEFAULT_LATE_LIMIT: '10:00',
    LATE_DEDUCTION_WEIGHT: 0.5,
    LEAVE_DEDUCTION_WEIGHT: 1.0,
    ABSENT_PENALTY_DAYS: 1.0,
    MONTHLY_PAID_LEAVE_QUOTA: 2.0,
    AUTO_IGNORE_ATTENDANCE_THRESHOLD_PERCENT: 30
});

const STUDENT_CLASSES = Object.freeze([
    { classBn: 'প্লে', classEn: 'Play', code: '99', order: 1 },
    { classBn: 'নার্সারি', classEn: 'Nursery', code: '00', order: 2 },
    { classBn: 'কেজি', classEn: 'KG', code: '98', order: 3 },
    { classBn: '১ম', classEn: 'One', code: '01', order: 4 },
    { classBn: '২য়', classEn: 'Two', code: '02', order: 5 },
    { classBn: '৩য়', classEn: 'Three', code: '03', order: 6 },
    { classBn: '৪র্থ', classEn: 'Four', code: '04', order: 7 },
    { classBn: '৫ম', classEn: 'Five', code: '05', order: 8 },
    { classBn: '৬ষ্ঠ', classEn: 'Six', code: '06', order: 9 },
    { classBn: '৭ম', classEn: 'Seven', code: '07', order: 10 },
    { classBn: '৮ম', classEn: 'Eight', code: '08', order: 11 },
    { classBn: '৯ম', classEn: 'Nine', code: '09', order: 12 },
    { classBn: '১০ম', classEn: 'Ten', code: '10', order: 13 }
]);

const VALID_CLASS_BN = Object.freeze(STUDENT_CLASSES.map(c => c.classBn));
const VALID_CLASS_EN = Object.freeze(STUDENT_CLASSES.map(c => c.classEn));

const STUDENT_GROUPS = Object.freeze(['General', 'Science', 'Muzabbid', '']);

const FEE_CATEGORIES = Object.freeze([
    'Regular',
    'Sibling Waiver',
    'Half Free',
    'Full Free',
    'Orphan'
]);

const STUDENT_STATUSES = Object.freeze([
    'Active',
    'Inactive',
    'Transferred',
    'Deleted'
]);

module.exports = {
    ROLES,
    EMPLOYMENT_TYPES,
    PAYMENT_METHODS,
    PAYMENT_STATUS,
    BLOOD_GROUPS,
    DESIGNATION_DETAILS,
    DESIGNATIONS,
    DEGREE_LEVEL_WEIGHTS,
    ATTENDANCE_STATUS,
    ATTENDANCE_SOURCES,
    LEAVE_TYPES,
    LEAVE_APPROVAL_STATUS,
    SALARY_ADJUSTMENT_MODES,
    ATTENDANCE_RULES,
    STUDENT_CLASSES,
    VALID_CLASS_BN,
    VALID_CLASS_EN,
    STUDENT_GROUPS,
    FEE_CATEGORIES,
    STUDENT_STATUSES
};
`);

// ============================================================================
// 2. PATCH Teacher Files for Class Teacher Assignment
// ============================================================================
patchFile('models/Teacher.js', (code) => {
    let out = code;
    if (!out.includes('VALID_CLASS_BN')) {
        out = out.replace(
            'DEGREE_LEVEL_WEIGHTS\n} = require',
            'DEGREE_LEVEL_WEIGHTS,\n    VALID_CLASS_BN\n} = require'
        );
    }
    if (!out.includes('assignedClass:')) {
        out = out.replace(
            "    subject: {\n        type: String,\n        trim: true,\n        default: ''\n    },",
            `    subject: {
        type: String,
        trim: true,
        default: ''
    },
    assignedClass: {
        type: String,
        enum: ['', ...VALID_CLASS_BN],
        default: ''
    },
    canEditAssignedClass: {
        type: Boolean,
        default: false
    },`
        );
    }
    return out;
});

patchFile('validators/teacher.validator.js', (code) => {
    let out = code;
    if (!out.includes('VALID_CLASS_BN')) {
        out = out.replace(
            'DEGREE_LEVEL_WEIGHTS\n} = require',
            'DEGREE_LEVEL_WEIGHTS,\n    VALID_CLASS_BN\n} = require'
        );
    }
    if (!out.includes("body('assignedClass')")) {
        out = out.replace(
            "body('subject').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 100 }),",
            `body('subject').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 100 }),
    body('assignedClass').optional({ checkFalsy: true }).isIn(['', ...VALID_CLASS_BN]).withMessage('সঠিক নির্ধারিত শ্রেণি নির্বাচন করুন'),
    body('canEditAssignedClass').optional().isBoolean(),`
        );
    }
    return out;
});

patchFile('controllers/teacher.controller.js', (code) => {
    if (!code.includes("'assignedClass'")) {
        return code.replace(
            "        'subject',",
            "        'subject',\n        'assignedClass',\n        'canEditAssignedClass',"
        );
    }
    return code;
});

// ============================================================================
// 3. STRICT MONGOOSE MODEL (src/models/Student.js)
// ============================================================================
writeFileEnsureDir('models/Student.js', `
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
    BLOOD_GROUPS,
    STUDENT_CLASSES,
    VALID_CLASS_BN,
    VALID_CLASS_EN,
    STUDENT_GROUPS,
    FEE_CATEGORIES,
    STUDENT_STATUSES
} = require('../constants/system.constants');

const optionalUniqueString = () => ({
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    set: (value) => (
        value == null || (typeof value === 'string' && value.trim() === '')
            ? undefined
            : value.trim()
    )
});

const addressSubSchema = new mongoose.Schema({
    houseNameBn: { type: String, required: true, trim: true, maxlength: 80 },
    houseNameEn: { type: String, required: true, trim: true, maxlength: 80 },
    villageBn: { type: String, required: true, trim: true, maxlength: 80 },
    villageEn: { type: String, required: true, trim: true, maxlength: 80 },
    unionBn: { type: String, required: true, trim: true, maxlength: 80 },
    unionEn: { type: String, required: true, trim: true, maxlength: 80 },
    wardNo: { type: String, required: true, trim: true, match: /^\\d{1,3}$/ },
    postOffice: { type: String, trim: true, default: 'Rangunia', maxlength: 80 },
    postCode: { type: String, trim: true, default: '4360', maxlength: 10 },
    upazilaBn: { type: String, required: true, trim: true, maxlength: 80 },
    upazilaEn: { type: String, required: true, trim: true, maxlength: 80 },
    districtBn: { type: String, required: true, trim: true, maxlength: 80 },
    districtEn: { type: String, required: true, trim: true, maxlength: 80 },
    divisionBn: { type: String, trim: true, default: 'চট্টগ্রাম', maxlength: 80 },
    divisionEn: { type: String, trim: true, default: 'Chattogram', maxlength: 80 }
}, { _id: false, strict: 'throw' });

const academicHistorySchema = new mongoose.Schema({
    session: { type: String, required: true, trim: true },
    classBn: { type: String, required: true, trim: true },
    classEn: { type: String, required: true, trim: true },
    roll: { type: Number, required: true },
    group: { type: String, default: '' },
    resultStatus: {
        type: String,
        enum: ['Studying', 'Promoted', 'Failed', 'Transferred'],
        default: 'Studying'
    },
    recordedAt: { type: Date, default: Date.now }
}, { _id: false });

const studentSchema = new mongoose.Schema({
    studentCode: {
        type: String,
        required: [true, '১০ সংখ্যার স্টুডেন্ট আইডি আবশ্যক'],
        unique: true,
        immutable: true,
        trim: true,
        match: [/^\\d{10}$/, 'স্টুডেন্ট আইডি অবশ্যই ১০ ডিজিটের সংখ্যা হতে হবে']
    },
    uid: optionalUniqueString(),
    editToken: { type: String, select: false },
    biometricDeviceId: {
        type: Number,
        unique: true,
        sparse: true,
        min: [1, 'বায়োমেট্রিক ডিভাইস আইডি কমপক্ষে ১ হতে হবে']
    },

    fullNameBng: { type: String, required: [true, 'শিক্ষার্থীর বাংলা নাম আবশ্যক'], trim: true },
    fullNameEng: { type: String, required: [true, 'শিক্ষার্থীর ইংরেজি নাম আবশ্যক'], trim: true },
    dateOfBirth: { type: Date, required: [true, 'জন্ম তারিখ আবশ্যক'] },
    gender: { type: String, enum: ['Male', 'Female'], required: [true, 'লিঙ্গ আবশ্যক'] },
    religion: {
        type: String,
        enum: ['Islam', 'Hinduism', 'Buddhism', 'Christianity', 'Other'],
        default: 'Islam'
    },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, default: 'N/A' },
    brnNumber: {
        type: String,
        required: [true, '১৭ ডিজিটের জন্ম নিবন্ধন নম্বর আবশ্যক'],
        unique: true,
        trim: true,
        match: [/^\\d{17}$/, 'জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ ডিজিটের হতে হবে']
    },
    medicalNote: { type: String, trim: true, default: '', maxlength: 300 },

    admissionDate: { type: Date, required: true, default: Date.now },
    session: {
        type: String,
        required: [true, 'শিক্ষাবর্ষ (Session) আবশ্যক'],
        match: [/^20\\d{2}$/, 'সেশন অবশ্যই ৪ ডিজিটের বৈধ সাল হতে হবে']
    },
    classBn: { type: String, enum: VALID_CLASS_BN, required: [true, 'শ্রেণি আবশ্যক'] },
    classEn: { type: String, enum: VALID_CLASS_EN },
    classOrder: { type: Number, default: 99 },
    roll: {
        type: Number,
        required: [true, 'রোল নম্বর আবশ্যক'],
        min: [1, 'রোল কমপক্ষে ১ হতে হবে'],
        max: [500, 'রোল সর্বোচ্চ ৫০০ হতে পারে']
    },
    group: { type: String, enum: STUDENT_GROUPS, default: '' },
    fourthSubject: { type: String, trim: true, default: '', maxlength: 80 },
    boardRegNo: optionalUniqueString(),

    fathersNameBng: { type: String, required: [true, 'পিতার বাংলা নাম আবশ্যক'], trim: true },
    fathersNameEng: { type: String, required: [true, 'পিতার ইংরেজি নাম আবশ্যক'], trim: true },
    fatherNid: { type: String, trim: true, default: '' },
    fatherOccupation: { type: String, trim: true, default: '', maxlength: 80 },

    mothersNameBng: { type: String, required: [true, 'মাতার বাংলা নাম আবশ্যক'], trim: true },
    mothersNameEng: { type: String, required: [true, 'মাতার ইংরেজি নাম আবশ্যক'], trim: true },
    motherNid: { type: String, trim: true, default: '' },
    motherOccupation: { type: String, trim: true, default: '', maxlength: 80 },

    localGuardian: {
        name: { type: String, trim: true, default: '', maxlength: 80 },
        relation: { type: String, trim: true, default: '', maxlength: 40 },
        nid: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' }
    },
    annualIncome: { type: Number, min: [0, 'বার্ষিক আয় ঋণাত্মক হতে পারে না'], default: 0 },

    phone: {
        type: String,
        required: [true, 'অভিভাবকের মোবাইল নম্বর আবশ্যক'],
        trim: true,
        match: [/^01[3-9]\\d{8}$/, 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন']
    },
    emergencyContact: {
        contactName: { type: String, trim: true, default: '' },
        relationship: { type: String, trim: true, default: 'Guardian' },
        phone: {
            type: String,
            required: [true, 'জরুরি মোবাইল নম্বর আবশ্যক'],
            trim: true,
            match: [/^01[3-9]\\d{8}$/, 'সঠিক ১১ ডিজিটের জরুরি মোবাইল নম্বর দিন']
        }
    },

    presentAddress: { type: addressSubSchema, required: true },
    permanentAddress: { type: addressSubSchema, required: true },

    feeDetails: {
        monthlyFee: { type: Number, min: 0, default: 0 },
        feeCategory: { type: String, enum: FEE_CATEGORIES, default: 'Regular' },
        siblingStudentCode: { type: String, trim: true, default: '' }
    },

    profilePicture: {
        url: { type: String, required: [true, 'শিক্ষার্থীর ছবি আবশ্যক'], trim: true },
        publicId: { type: String, default: '', trim: true }
    },

    password: { type: String, minlength: 6, select: false },
    role: { type: String, default: 'Student', immutable: true },
    status: { type: String, enum: STUDENT_STATUSES, default: 'Active', index: true },
    statusReason: { type: String, trim: true, default: '', maxlength: 250 },
    isActive: { type: Boolean, default: true },
    migratedFromSheet: { type: Boolean, default: false },
    academicHistory: { type: [academicHistorySchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null }
}, {
    timestamps: true,
    versionKey: false,
    strict: 'throw'
});

studentSchema.index(
    { session: 1, classBn: 1, roll: 1 },
    {
        unique: true,
        partialFilterExpression: { status: { $in: ['Active', 'Inactive'] } }
    }
);

studentSchema.pre('validate', async function (next) {
    const classMeta = STUDENT_CLASSES.find(c => c.classBn === this.classBn);
    if (classMeta) {
        this.classEn = classMeta.classEn;
        this.classOrder = classMeta.order;
    }

    if (!['৯ম', '১০ম'].includes(this.classBn)) {
        this.group = '';
        this.fourthSubject = '';
    }

    this.isActive = this.status === 'Active';

    if (this.isNew && this.academicHistory.length === 0) {
        this.academicHistory.push({
            session: this.session,
            classBn: this.classBn,
            classEn: this.classEn,
            roll: this.roll,
            group: this.group || '',
            resultStatus: 'Studying'
        });
    }

    if (this.password && this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    next();
});

module.exports = mongoose.model('Student', studentSchema);
`);

// ============================================================================
// 4. STUDENT SERVICE (src/services/student.service.js)
// ============================================================================
writeFileEnsureDir('services/student.service.js', `
const crypto = require('crypto');
const moment = require('moment-timezone');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const ApiError = require('../utils/ApiError');
const { STUDENT_CLASSES } = require('../constants/system.constants');

const LEGACY_SHEET_API_URL =
    process.env.LEGACY_STUDENT_SHEET_API_URL ||
    'https://script.google.com/macros/s/AKfycbzlG01v-naEr4WZR__n4ZX9fPkQR9pE01A0n8W9fOMUfw5x3RIDNPD_ZyaDwsVz9fphFw/exec';

const generateTenDigitStudentId = async (session, dateOfBirth, classBn, roll) => {
    const year4D = String(session || moment.tz('Asia/Dhaka').year()).slice(0, 4);
    const dobYear2D = dateOfBirth
        ? moment.tz(dateOfBirth, 'Asia/Dhaka').format('YY')
        : '00';

    const classMeta = STUDENT_CLASSES.find(c => c.classBn === classBn);
    const classCode2D = classMeta ? classMeta.code : '00';
    const rollCode2D = String(roll).padStart(2, '0').slice(-2);

    let candidateId = \`\${year4D}\${dobYear2D}\${classCode2D}\${rollCode2D}\`;

    if (await Student.exists({ studentCode: candidateId })) {
        const prefix8 = \`\${year4D}\${dobYear2D}\${classCode2D}\`;
        for (let seq = 1; seq <= 99; seq++) {
            const altId = \`\${prefix8}\${String(seq).padStart(2, '0')}\`;
            if (!(await Student.exists({ studentCode: altId }))) {
                candidateId = altId;
                break;
            }
        }
    }

    return candidateId;
};

const getNextAvailableStudentBiometricId = async () => {
    const [teachers, students] = await Promise.all([
        Teacher.find().select('biometricDeviceId').lean(),
        Student.find({ biometricDeviceId: { $ne: null } }).select('biometricDeviceId').lean()
    ]);

    const usedIds = new Set([
        ...teachers.map(t => Number(t.biometricDeviceId)),
        ...students.map(s => Number(s.biometricDeviceId))
    ]);

    let candidate = 1001;
    while (usedIds.has(candidate)) {
        candidate++;
    }
    return candidate;
};

const cleanPhone = (val) => {
    const digits = String(val || '').replace(/^'+/, '').replace(/\\D/g, '');
    if (digits.startsWith('880')) return '0' + digits.slice(3);
    if (digits.length === 10 && digits.startsWith('1')) return '0' + digits;
    return digits;
};

const cleanDigits = (val) => String(val || '').replace(/^'+/, '').replace(/\\D/g, '');

const parseSheetDate = (val) => {
    if (!val) return '';
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(String(val).trim())) return String(val).trim();
    const m = moment.tz(val, 'Asia/Dhaka');
    return m.isValid() ? m.format('YYYY-MM-DD') : '';
};

const fetchLegacyStudentFromSheet = async (studentCode) => {
    const cleanId = String(studentCode || '').trim();
    if (!/^\\d{10}$/.test(cleanId)) {
        throw new ApiError(400, 'স্টুডেন্ট আইডি অবশ্যই ১০ ডিজিটের সংখ্যা হতে হবে।');
    }

    const existingInDb = await Student.findOne({ studentCode: cleanId })
        .select('studentCode fullNameBng fullNameEng classBn roll session status')
        .lean();

    if (existingInDb) {
        return {
            alreadyMigrated: true,
            existingStudent: existingInDb,
            autoFillData: null
        };
    }

    let payload;
    try {
        const res = await fetch(\`\${LEGACY_SHEET_API_URL}?action=read&id=\${encodeURIComponent(cleanId)}&t=\${Date.now()}\`);
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        payload = await res.json();
    } catch (err) {
        throw new ApiError(502, 'পুরনো গুগল শিট সার্ভারের সাথে সংযোগ করা যায়নি। ইন্টারনেট সংযোগ যাচাই করে আবার চেষ্টা করুন।');
    }

    if (!payload || payload.status !== 'success' || !payload.data) {
        throw new ApiError(404, \`পুরনো গুগল শিটে '\${cleanId}' আইডির কোনো শিক্ষার্থী পাওয়া যায়নি!\`);
    }

    const row = payload.data;
    const addressBlock = {
        houseNameBn: String(row.HouseNameBn || '').trim(),
        houseNameEn: String(row.HouseNameEn || '').trim(),
        villageBn: String(row.VillageBn || '').trim(),
        villageEn: String(row.VillageEn || '').trim(),
        unionBn: String(row.UnionBn || '').trim(),
        unionEn: String(row.UnionEn || '').trim(),
        wardNo: String(row.WardNo || '').trim(),
        postOffice: 'Rangunia',
        postCode: '4360',
        upazilaBn: String(row.UpazilaBn || 'রাঙ্গুনিয়া').trim(),
        upazilaEn: String(row.UpazilaEn || 'Rangunia').trim(),
        districtBn: String(row.DistrictBn || 'চট্টগ্রাম').trim(),
        districtEn: String(row.DistrictEn || 'Chattogram').trim(),
        divisionBn: 'চট্টগ্রাম',
        divisionEn: 'Chattogram'
    };

    const autoFillData = {
        studentCode: String(row.ID || cleanId).trim(),
        migratedFromSheet: true,
        session: String(row.Session || '2026').trim(),
        admissionDate: parseSheetDate(row.Time) || moment.tz('Asia/Dhaka').format('YYYY-MM-DD'),
        fullNameBng: String(row.StudentNameBn || '').trim(),
        fullNameEng: String(row.StudentNameEn || '').trim(),
        gender: String(row.Gender || '').trim(),
        classBn: String(row.ClassBn || '').trim(),
        classEn: String(row.ClassEn || '').trim(),
        roll: Number(row.Roll) || '',
        group: '',
        fourthSubject: '',
        boardRegNo: '',
        brnNumber: cleanDigits(row.BRN),
        dateOfBirth: parseSheetDate(row.DOB),
        bloodGroup: String(row.BloodGroup || 'N/A').trim() || 'N/A',
        medicalNote: '',

        fathersNameBng: String(row.FatherNameBn || '').trim(),
        fathersNameEng: String(row.FatherNameEn || '').trim(),
        fatherNid: '',
        fatherOccupation: '',

        mothersNameBng: String(row.MotherNameBn || '').trim(),
        mothersNameEng: String(row.MotherNameEn || '').trim(),
        motherNid: '',
        motherOccupation: '',

        localGuardian: { name: '', relation: '', nid: '', phone: '' },
        annualIncome: '',

        phone: cleanPhone(row.WhatsApp),
        emergencyContact: {
            contactName: String(row.FatherNameBn || '').trim(),
            relationship: 'Father',
            phone: cleanPhone(row.EmergencyNo || row.WhatsApp)
        },

        presentAddress: addressBlock,
        permanentAddress: { ...addressBlock },

        feeDetails: {
            monthlyFee: '',
            feeCategory: 'Regular',
            siblingStudentCode: ''
        },

        profilePicture: {
            url: String(row.ImageURL || '').trim(),
            publicId: ''
        },
        status: row.Status === 'Inactive' ? 'Inactive' : 'Active'
    };

    return {
        alreadyMigrated: false,
        existingStudent: null,
        autoFillData
    };
};

const cleanFamilyName = (name) =>
    String(name || '')
        .replace(/মোঃ|মো\\.?|মোহাম্মদ|মুহাম্মদ|md\\.?|mr\\.?/gi, '')
        .replace(/\\s+/g, ' ')
        .trim()
        .toLowerCase();

const findStudentSiblings = async (student) => {
    const fatherBn = cleanFamilyName(student.fathersNameBng);
    const motherBn = cleanFamilyName(student.mothersNameBng);
    const phone = String(student.phone || '').trim();

    const candidates = await Student.find({
        _id: { $ne: student._id },
        status: { $ne: 'Deleted' },
        $or: [
            ...(phone ? [{ phone }] : []),
            ...(student.fatherNid ? [{ fatherNid: student.fatherNid }] : []),
            ...(student.motherNid ? [{ motherNid: student.motherNid }] : []),
            { fathersNameBng: student.fathersNameBng }
        ]
    })
        .select('studentCode fullNameBng fullNameEng classBn classEn classOrder roll session dateOfBirth profilePicture status fatherNid motherNid fathersNameBng mothersNameBng phone')
        .lean();

    return candidates
        .filter((s) => {
            if (student.fatherNid && s.fatherNid === student.fatherNid) return true;
            if (student.motherNid && s.motherNid === student.motherNid) return true;

            let score = 0;
            if (fatherBn && cleanFamilyName(s.fathersNameBng) === fatherBn) score++;
            if (motherBn && cleanFamilyName(s.mothersNameBng) === motherBn) score++;
            if (phone && String(s.phone || '').trim() === phone) score++;
            return score >= 2;
        })
        .sort((a, b) => (a.classOrder || 99) - (b.classOrder || 99));
};

const generateStudentTokens = () => ({
    uid: crypto.randomUUID(),
    editToken: crypto.randomBytes(16).toString('hex')
});

module.exports = {
    generateTenDigitStudentId,
    getNextAvailableStudentBiometricId,
    fetchLegacyStudentFromSheet,
    findStudentSiblings,
    generateStudentTokens
};
`);

// ============================================================================
// 5. MILITARY-GRADE VALIDATOR (src/validators/student.validator.js)
// ============================================================================
writeFileEnsureDir('validators/student.validator.js', `
const { body } = require('express-validator');
const {
    BLOOD_GROUPS,
    VALID_CLASS_BN,
    STUDENT_GROUPS,
    FEE_CATEGORIES,
    STUDENT_STATUSES
} = require('../constants/system.constants');

const sanitizeClean = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/<[^>]*>/g, '').replace(/[\\r\\n\\t]+/g, ' ').replace(/\\s+/g, ' ').trim();
};

const normalizeEnglishTitleCase = (val) => {
    const clean = sanitizeClean(val);
    if (typeof clean !== 'string') return clean;
    return clean
        .toLowerCase()
        .replace(/\\b[a-z]/g, (letter) => letter.toUpperCase());
};

const ENG_NAME_REGEX = /^[A-Za-z][A-Za-z\\s.'-]{2,59}$/;
const BNG_NAME_REGEX = /^[\\u0980-\\u09FF][\\u0980-\\u09FF\\s.'-]{1,59}$/;
const BD_PHONE_REGEX = /^01[3-9]\\d{8}$/;
const NID_REGEX = /^(\\d{10}|\\d{13}|\\d{17})$/;
const BRN_REGEX = /^\\d{17}$/;
const FAKE_DIGIT_PATTERNS = [
    /^(\\d)\\1+$/,
    /^123456789/,
    /^987654321/,
    /^0123456789/
];

const isFakeNumber = (val) => FAKE_DIGIT_PATTERNS.some((rx) => rx.test(String(val)));

const validateBangladeshiNid = (val, label) => {
    if (!NID_REGEX.test(val) || isFakeNumber(val)) {
        throw new Error(\`\${label} অবশ্যই ১০, ১৩ অথবা ১৭ ডিজিটের প্রকৃত বৈধ সংখ্যা হতে হবে\`);
    }
    if (val.length === 17) {
        const birthYear = parseInt(val.slice(0, 4), 10);
        if (birthYear < 1940 || birthYear > 2012) {
            throw new Error(\`১৭ ডিজিটের \${label}-এর প্রথম ৪ সংখ্যায় জন্মসাল (১৯৪০-২০১২) সঠিক নয়\`);
        }
    }
    return true;
};

const buildAddressValidators = (prefix, isOptional = false) => {
    const wrap = (chain, msg) =>
        isOptional
            ? chain.optional({ checkFalsy: true })
            : chain.notEmpty().withMessage(msg);

    return [
        wrap(body(\`\${prefix}.houseNameBn\`).customSanitizer(sanitizeClean), 'বাড়ির নাম (বাংলা) আবশ্যক')
            .matches(/^[\\u0980-\\u09FF0-9\\s.,'-]{2,80}$/).withMessage('বাড়ির নাম (বাংলা) ২-৮০ অক্ষরের মধ্যে হতে হবে'),
        wrap(body(\`\${prefix}.houseNameEn\`).customSanitizer(normalizeEnglishTitleCase), 'বাড়ির নাম (ইংরেজি) আবশ্যক')
            .matches(/^[A-Za-z0-9\\s.,'-]{2,80}$/).withMessage('বাড়ির নাম (ইংরেজি) ২-৮০ অক্ষরের মধ্যে হতে হবে'),
        wrap(body(\`\${prefix}.villageBn\`).customSanitizer(sanitizeClean), 'গ্রামের নাম (বাংলা) আবশ্যক')
            .matches(/^[\\u0980-\\u09FF\\s.'-]{2,80}$/).withMessage('গ্রামের নাম (বাংলা) সঠিক নয়'),
        wrap(body(\`\${prefix}.villageEn\`).customSanitizer(normalizeEnglishTitleCase), 'গ্রামের নাম (ইংরেজি) আবশ্যক')
            .matches(/^[A-Za-z\\s.'-]{2,80}$/).withMessage('গ্রামের নাম (ইংরেজি) সঠিক নয়'),
        wrap(body(\`\${prefix}.unionBn\`).customSanitizer(sanitizeClean), 'ইউনিয়নের নাম (বাংলা) আবশ্যক')
            .matches(/^[\\u0980-\\u09FF\\s.'-]{2,80}$/).withMessage('ইউনিয়নের নাম (বাংলা) সঠিক নয়'),
        wrap(body(\`\${prefix}.unionEn\`).customSanitizer(normalizeEnglishTitleCase), 'ইউনিয়নের নাম (ইংরেজি) আবশ্যক')
            .matches(/^[A-Za-z\\s.'-]{2,80}$/).withMessage('ইউনিয়নের নাম (ইংরেজি) সঠিক নয়'),
        wrap(body(\`\${prefix}.wardNo\`).customSanitizer(sanitizeClean), 'ওয়ার্ড নম্বর আবশ্যক')
            .matches(/^\\d{1,3}$/).withMessage('ওয়ার্ড নম্বর অবশ্যই সংখ্যা হতে হবে (১-৯৯৯)'),
        wrap(body(\`\${prefix}.upazilaBn\`).customSanitizer(sanitizeClean), 'উপজেলার নাম (বাংলা) আবশ্যক')
            .matches(/^[\\u0980-\\u09FF\\s.'-]{2,80}$/).withMessage('উপজেলার নাম (বাংলা) সঠিক নয়'),
        wrap(body(\`\${prefix}.upazilaEn\`).customSanitizer(normalizeEnglishTitleCase), 'উপজেলার নাম (ইংরেজি) আবশ্যক')
            .matches(/^[A-Za-z\\s.'-]{2,80}$/).withMessage('উপজেলার নাম (ইংরেজি) সঠিক নয়'),
        wrap(body(\`\${prefix}.districtBn\`).customSanitizer(sanitizeClean), 'জেলার নাম (বাংলা) আবশ্যক')
            .matches(/^[\\u0980-\\u09FF\\s.'-]{2,80}$/).withMessage('জেলার নাম (বাংলা) সঠিক নয়'),
        wrap(body(\`\${prefix}.districtEn\`).customSanitizer(normalizeEnglishTitleCase), 'জেলার নাম (ইংরেজি) আবশ্যক')
            .matches(/^[A-Za-z\\s.'-]{2,80}$/).withMessage('জেলার নাম (ইংরেজি) সঠিক নয়'),
        body(\`\${prefix}.postOffice\`).optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage('ডাকঘরের নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),
        body(\`\${prefix}.postCode\`).optional({ checkFalsy: true }).customSanitizer(sanitizeClean).matches(/^\\d{4}$/).withMessage('পোস্ট কোড অবশ্যই ৪ ডিজিটের হতে হবে')
    ];
};

const crossFieldMilitaryChecks = body().custom((_, { req }) => {
    const b = req.body;

    // ১. জন্ম নিবন্ধন (BRN) ও জন্মসালের (DOB) মিল যাচাই
    if (b.brnNumber && b.dateOfBirth) {
        const dobYear = String(new Date(b.dateOfBirth).getFullYear());
        const brnYear = String(b.brnNumber).slice(0, 4);
        if (dobYear !== brnYear) {
            throw new Error(\`জন্ম নিবন্ধন নম্বরের প্রথম ৪ সংখ্যা (\${brnYear}) এবং জন্মতারিখের সাল (\${dobYear}) মিলছে না!\`);
        }
    }

    // ২. ভর্তির তারিখ বনাম জন্মতারিখ যাচাই
    if (b.admissionDate && b.dateOfBirth) {
        const birth = new Date(b.dateOfBirth);
        const adm = new Date(b.admissionDate);
        if (adm > new Date()) {
            throw new Error('ভর্তির তারিখ ভবিষ্যতের তারিখ হতে পারবে না!');
        }
        const ageAtAdmission = (adm - birth) / (365.25 * 24 * 3600 * 1000);
        if (ageAtAdmission < 2.5) {
            throw new Error('ভর্তির তারিখে শিক্ষার্থীর বয়স কমপক্ষে ২.৫ বছর হতে হবে!');
        }
    }

    // ৩. ৯ম ও ১০ম শ্রেণির জন্য বিভাগ বাধ্যতামূলক
    if (['৯ম', '১০ম'].includes(b.classBn)) {
        if (!b.group || !['General', 'Science', 'Muzabbid'].includes(b.group)) {
            throw new Error(\`\${b.classBn} শ্রেণির জন্য বিভাগ (General, Science অথবা Muzabbid) নির্বাচন করা বাধ্যতামূলক!\`);
        }
    } else if (b.group && b.group !== '') {
        throw new Error('শুধুমাত্র ৯ম ও ১০ম শ্রেণির শিক্ষার্থীর জন্য বিভাগ নির্বাচন করা যাবে!');
    }

    // ৪. Sibling Waiver দিলে ভাই/বোনের আইডি বাধ্যতামূলক
    if (b.feeDetails?.feeCategory === 'Sibling Waiver') {
        const sibCode = String(b.feeDetails?.siblingStudentCode || '').trim();
        if (!/^\\d{10}$/.test(sibCode)) {
            throw new Error('Sibling Waiver সুবিধা নিতে হলে ভাই/বোনের ১০ ডিজিটের স্টুডেন্ট আইডি প্রদান করা বাধ্যতামূলক!');
        }
        if (b.studentCode && sibCode === String(b.studentCode).trim()) {
            throw new Error('শিক্ষার্থী নিজের আইডিকে ভাই/বোনের রেফারেন্স হিসেবে ব্যবহার করতে পারবে না!');
        }
    }

    // ৫. স্থানীয় অভিভাবকের নাম দিলে সম্পর্ক ও মোবাইল নম্বর বাধ্যতামূলক
    if (b.localGuardian?.name && String(b.localGuardian.name).trim().length > 0) {
        if (!b.localGuardian.relation || String(b.localGuardian.relation).trim().length < 2) {
            throw new Error('স্থানীয় অভিভাবকের নাম দিলে শিক্ষার্থীর সাথে তার সম্পর্ক উল্লেখ করা আবশ্যক!');
        }
        if (!BD_PHONE_REGEX.test(String(b.localGuardian.phone || '').trim())) {
            throw new Error('স্থানীয় অভিভাবকের ১১ ডিজিটের বৈধ মোবাইল নম্বর দিন!');
        }
    }

    return true;
});

const createStudentValidator = [
    body('studentCode')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .matches(/^\\d{10}$/).withMessage('স্টুডেন্ট আইডি দিলে তা অবশ্যই ১০ ডিজিটের সংখ্যা হতে হবে'),

    body('migratedFromSheet').optional().isBoolean(),

    body('session')
        .customSanitizer(sanitizeClean)
        .matches(/^20\\d{2}$/).withMessage('সেশন অবশ্যই ৪ ডিজিটের বৈধ শিক্ষাবর্ষ হতে হবে (যেমন: 2026)'),

    body('admissionDate')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('ভর্তির তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন'),

    body('fullNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('শিক্ষার্থীর বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('শিক্ষার্থীর বাংলা নামে শুধুমাত্র বাংলা অক্ষর (২-৬০ অক্ষর) ব্যবহার করুন'),

    body('fullNameEng')
        .customSanitizer(normalizeEnglishTitleCase)
        .notEmpty().withMessage('শিক্ষার্থীর ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('শিক্ষার্থীর ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর (৩-৬০ অক্ষর) ব্যবহার করুন'),

    body('gender')
        .customSanitizer(sanitizeClean)
        .isIn(['Male', 'Female']).withMessage('লিঙ্গ অবশ্যই Male অথবা Female হতে হবে'),

    body('classBn')
        .customSanitizer(sanitizeClean)
        .isIn(VALID_CLASS_BN).withMessage('সঠিক শ্রেণি নির্বাচন করুন'),

    body('roll')
        .notEmpty().withMessage('রোল নম্বর আবশ্যক')
        .isInt({ min: 1, max: 500 }).withMessage('রোল নম্বর ১ থেকে ৫০০-এর মধ্যে হতে হবে'),

    body('group')
        .optional({ checkFalsy: true })
        .isIn(STUDENT_GROUPS).withMessage('সঠিক বিভাগ (General / Science / Muzabbid) নির্বাচন করুন'),

    body('fourthSubject')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 80 }).withMessage('৪র্থ বিষয়ের নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),

    body('boardRegNo')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .matches(/^\\d{6,15}$/).withMessage('বোর্ড রেজিস্ট্রেশন নম্বর ৬ থেকে ১৫ ডিজিটের সংখ্যা হতে হবে'),

    body('brnNumber')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('১৭ ডিজিটের জন্ম নিবন্ধন নম্বর আবশ্যক')
        .custom((val) => {
            if (!BRN_REGEX.test(val) || isFakeNumber(val)) {
                throw new Error('জন্ম নিবন্ধন নম্বর (BRN) অবশ্যই ১৭ ডিজিটের প্রকৃত বৈধ সংখ্যা হতে হবে');
            }
            return true;
        }),

    body('dateOfBirth')
        .notEmpty().withMessage('জন্ম তারিখ আবশ্যক')
        .isISO8601().withMessage('জন্ম তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন')
        .custom((dob) => {
            const birth = new Date(dob);
            const today = new Date();
            if (birth > today) throw new Error('জন্ম তারিখ ভবিষ্যতের হতে পারে না');
            const age = (today - birth) / (365.25 * 24 * 3600 * 1000);
            if (age < 2.5 || age > 22) {
                throw new Error('শিক্ষার্থীর বয়স ২.৫ থেকে ২২ বছরের মধ্যে হতে হবে');
            }
            return true;
        }),

    body('bloodGroup')
        .optional({ checkFalsy: true })
        .isIn(BLOOD_GROUPS).withMessage('সঠিক রক্তের গ্রুপ নির্বাচন করুন'),

    body('fathersNameBng').customSanitizer(sanitizeClean).notEmpty().withMessage('পিতার বাংলা নাম আবশ্যক').matches(BNG_NAME_REGEX).withMessage('পিতার বাংলা নাম সঠিক নয়'),
    body('fathersNameEng').customSanitizer(normalizeEnglishTitleCase).notEmpty().withMessage('পিতার ইংরেজি নাম আবশ্যক').matches(ENG_NAME_REGEX).withMessage('পিতার ইংরেজি নাম সঠিক নয়'),
    body('fatherNid')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .custom((val) => validateBangladeshiNid(val, 'পিতার NID নম্বর')),
    body('fatherOccupation').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage('পিতার পেশা সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),

    body('mothersNameBng').customSanitizer(sanitizeClean).notEmpty().withMessage('মাতার বাংলা নাম আবশ্যক').matches(BNG_NAME_REGEX).withMessage('মাতার বাংলা নাম সঠিক নয়'),
    body('mothersNameEng').customSanitizer(normalizeEnglishTitleCase).notEmpty().withMessage('মাতার ইংরেজি নাম আবশ্যক').matches(ENG_NAME_REGEX).withMessage('মাতার ইংরেজি নাম সঠিক নয়'),
    body('motherNid')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .custom((val) => validateBangladeshiNid(val, 'মাতার NID নম্বর')),
    body('motherOccupation').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage('মাতার পেশা সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),

    body('localGuardian.name').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage('স্থানীয় অভিভাবকের নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),
    body('localGuardian.relation').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 40 }).withMessage('সম্পর্ক সর্বোচ্চ ৪০ অক্ষরের হতে পারে'),
    body('localGuardian.nid')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .custom((val) => validateBangladeshiNid(val, 'স্থানীয় অভিভাবকের NID নম্বর')),
    body('localGuardian.phone')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .matches(BD_PHONE_REGEX).withMessage('স্থানীয় অভিভাবকের মোবাইল নম্বর সঠিক নয়'),

    body('annualIncome')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0, max: 50000000 }).withMessage('বার্ষিক আয় ০ থেকে ৫ কোটির মধ্যে বৈধ সংখ্যা হতে হবে'),

    body('phone')
        .customSanitizer(sanitizeClean)
        .matches(BD_PHONE_REGEX).withMessage('অভিভাবকের মোবাইল নম্বর অবশ্যই ১১ ডিজিটের বৈধ বাংলাদেশী নম্বর হতে হবে (01XXXXXXXXX)'),

    body('emergencyContact.phone')
        .customSanitizer(sanitizeClean)
        .matches(BD_PHONE_REGEX).withMessage('জরুরি যোগাযোগের নম্বর অবশ্যই ১১ ডিজিটের বৈধ নম্বর হতে হবে'),

    ...buildAddressValidators('presentAddress', false),
    ...buildAddressValidators('permanentAddress', true),

    body('feeDetails.monthlyFee').optional({ checkFalsy: true }).isFloat({ min: 0, max: 50000 }).withMessage('মাসিক বেতন ০ বা তার বেশি বৈধ সংখ্যা হতে হবে'),
    body('feeDetails.feeCategory').optional().isIn(FEE_CATEGORIES).withMessage('সঠিক বেতন ক্যাটাগরি নির্বাচন করুন'),
    body('feeDetails.siblingStudentCode').optional({ checkFalsy: true }).matches(/^\\d{10}$/).withMessage('ভাই/বোনের স্টুডেন্ট আইডি অবশ্যই ১০ ডিজিটের হতে হবে'),

    body('profilePicture.url')
        .notEmpty().withMessage('শিক্ষার্থীর ছবি আবশ্যক')
        .isURL().withMessage('ছবির সঠিক URL প্রদান করুন'),
    body('medicalNote').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 300 }).withMessage('মেডিকেল নোট সর্বোচ্চ ৩০০ অক্ষরের হতে পারে'),
    body('biometricDeviceId').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('বায়োমেট্রিক আইডি ধনাত্মক পূর্ণসংখ্যা হতে হবে'),

    crossFieldMilitaryChecks
];

const updateStudentValidator = [
    body('studentCode').not().exists().withMessage('স্টুডেন্ট আইডি (studentCode) কোনোভাবেই পরিবর্তন করা যাবে না'),
    body('session').optional().customSanitizer(sanitizeClean).matches(/^20\\d{2}$/).withMessage('সেশন অবশ্যই ৪ ডিজিটের বৈধ শিক্ষাবর্ষ হতে হবে'),
    body('admissionDate').optional({ checkFalsy: true }).isISO8601().withMessage('ভর্তির তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন'),
    body('fullNameBng').optional().customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX).withMessage('শিক্ষার্থীর বাংলা নাম সঠিক নয়'),
    body('fullNameEng').optional().customSanitizer(normalizeEnglishTitleCase).matches(ENG_NAME_REGEX).withMessage('শিক্ষার্থীর ইংরেজি নাম সঠিক নয়'),
    body('gender').optional().isIn(['Male', 'Female']).withMessage('লিঙ্গ অবশ্যই Male অথবা Female হতে হবে'),
    body('classBn').optional().isIn(VALID_CLASS_BN).withMessage('সঠিক শ্রেণি নির্বাচন করুন'),
    body('roll').optional().isInt({ min: 1, max: 500 }).withMessage('রোল নম্বর ১ থেকে ৫০০-এর মধ্যে হতে হবে'),
    body('group').optional({ checkFalsy: true }).isIn(STUDENT_GROUPS).withMessage('সঠিক বিভাগ নির্বাচন করুন'),
    body('fourthSubject').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage('৪র্থ বিষয়ের নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),
    body('boardRegNo').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).matches(/^\\d{6,15}$/).withMessage('বোর্ড রেজিস্ট্রেশন নম্বর ৬-১৫ ডিজিটের হতে হবে'),
    body('brnNumber').optional().customSanitizer(sanitizeClean).custom((val) => {
        if (!BRN_REGEX.test(val) || isFakeNumber(val)) {
            throw new Error('জন্ম নিবন্ধন নম্বর (BRN) অবশ্যই ১৭ ডিজিটের প্রকৃত বৈধ সংখ্যা হতে হবে');
        }
        return true;
    }),
    body('dateOfBirth').optional().isISO8601().withMessage('জন্ম তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন').custom((dob) => {
        const birth = new Date(dob);
        const today = new Date();
        if (birth > today) throw new Error('জন্ম তারিখ ভবিষ্যতের হতে পারে না');
        const age = (today - birth) / (365.25 * 24 * 3600 * 1000);
        if (age < 2.5 || age > 22) throw new Error('শিক্ষার্থীর বয়স ২.৫ থেকে ২২ বছরের মধ্যে হতে হবে');
        return true;
    }),
    body('bloodGroup').optional().isIn(BLOOD_GROUPS).withMessage('সঠিক রক্তের গ্রুপ নির্বাচন করুন'),
    body('fathersNameBng').optional().customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX).withMessage('পিতার বাংলা নাম সঠিক নয়'),
    body('fathersNameEng').optional().customSanitizer(normalizeEnglishTitleCase).matches(ENG_NAME_REGEX).withMessage('পিতার ইংরেজি নাম সঠিক নয়'),
    body('fatherNid').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).custom((val) => validateBangladeshiNid(val, 'পিতার NID নম্বর')),
    body('fatherOccupation').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage('পিতার পেশা সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),
    body('mothersNameBng').optional().customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX).withMessage('মাতার বাংলা নাম সঠিক নয়'),
    body('mothersNameEng').optional().customSanitizer(normalizeEnglishTitleCase).matches(ENG_NAME_REGEX).withMessage('মাতার ইংরেজি নাম সঠিক নয়'),
    body('motherNid').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).custom((val) => validateBangladeshiNid(val, 'মাতার NID নম্বর')),
    body('motherOccupation').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage('মাতার পেশা সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),
    body('localGuardian.nid').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).custom((val) => validateBangladeshiNid(val, 'স্থানীয় অভিভাবকের NID নম্বর')),
    body('localGuardian.phone').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).matches(BD_PHONE_REGEX).withMessage('স্থানীয় অভিভাবকের মোবাইল নম্বর সঠিক নয়'),
    body('annualIncome').optional().isFloat({ min: 0, max: 50000000 }).withMessage('বার্ষিক আয় ০ থেকে ৫ কোটির মধ্যে বৈধ সংখ্যা হতে হবে'),
    body('phone').optional().customSanitizer(sanitizeClean).matches(BD_PHONE_REGEX).withMessage('অভিভাবকের মোবাইল নম্বর সঠিক নয়'),
    body('emergencyContact.phone').optional().customSanitizer(sanitizeClean).matches(BD_PHONE_REGEX).withMessage('জরুরি যোগাযোগের মোবাইল নম্বর সঠিক নয়'),
    ...buildAddressValidators('presentAddress', true),
    ...buildAddressValidators('permanentAddress', true),
    body('feeDetails.monthlyFee').optional().isFloat({ min: 0, max: 50000 }).withMessage('মাসিক বেতন সঠিক নয়'),
    body('feeDetails.feeCategory').optional().isIn(FEE_CATEGORIES).withMessage('সঠিক বেতন ক্যাটাগরি নির্বাচন করুন'),
    body('feeDetails.siblingStudentCode').optional({ checkFalsy: true }).matches(/^\\d{10}$/).withMessage('ভাই/বোনের স্টুডেন্ট আইডি অবশ্যই ১০ ডিজিটের হতে হবে'),
    body('profilePicture.url').optional().isURL().withMessage('ছবির সঠিক URL প্রদান করুন'),
    body('medicalNote').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 300 }).withMessage('মেডিকেল নোট সর্বোচ্চ ৩০০ অক্ষরের হতে পারে'),
    body('status').optional().isIn(STUDENT_STATUSES).withMessage('সঠিক স্ট্যাটাস নির্বাচন করুন'),
    body('statusReason').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 250 }).withMessage('স্ট্যাটাস পরিবর্তনের কারণ সর্বোচ্চ ২৫০ অক্ষরের হতে পারে'),

    crossFieldMilitaryChecks
];

module.exports = {
    createStudentValidator,
    updateStudentValidator
};
`);

// ============================================================================
// 6. STUDENT CONTROLLER (src/controllers/student.controller.js)
// ============================================================================
writeFileEnsureDir('controllers/student.controller.js', `
const mongoose = require('mongoose');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const {
    ROLES,
    BLOOD_GROUPS,
    STUDENT_CLASSES,
    STUDENT_GROUPS,
    FEE_CATEGORIES,
    STUDENT_STATUSES
} = require('../constants/system.constants');
const {
    generateTenDigitStudentId,
    getNextAvailableStudentBiometricId,
    fetchLegacyStudentFromSheet,
    findStudentSiblings,
    generateStudentTokens
} = require('../services/student.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const assertCanManageStudentClass = (user, targetClassBn) => {
    if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user.role)) return true;

    if (user.role === ROLES.TEACHER) {
        if (!user.assignedClass || !user.canEditAssignedClass) {
            throw new ApiError(403, 'আপনার শিক্ষার্থী যোগ বা সম্পাদনা করার প্রশাসনিক অনুমতি নেই!');
        }
        if (user.assignedClass !== targetClassBn) {
            throw new ApiError(403, \`আপনি শুধুমাত্র আপনার নির্ধারিত শ্রেণির (\${user.assignedClass}) শিক্ষার্থীর তথ্য ব্যবস্থাপনা করতে পারবেন!\`);
        }
        return true;
    }

    throw new ApiError(403, 'অননুমোদিত অ্যাক্সেস!');
};

const verifySiblingExistsIfWaiver = async (feeDetails, selfStudentCode = null) => {
    if (feeDetails?.feeCategory === 'Sibling Waiver') {
        const sibCode = String(feeDetails.siblingStudentCode || '').trim();
        if (!sibCode) {
            throw new ApiError(400, 'Sibling Waiver ক্যাটাগরির জন্য ভাই/বোনের স্টুডেন্ট আইডি আবশ্যক!');
        }
        if (selfStudentCode && sibCode === selfStudentCode) {
            throw new ApiError(400, 'শিক্ষার্থী নিজের আইডিকে ভাই/বোনের রেফারেন্স হিসেবে দিতে পারবে না!');
        }
        const siblingDoc = await Student.findOne({
            studentCode: sibCode,
            status: 'Active'
        }).select('studentCode fullNameBng classBn').lean();

        if (!siblingDoc) {
            throw new ApiError(404, \`প্রদত্ত ভাই/বোনের স্টুডেন্ট আইডি (\${sibCode}) মাদ্রাসার সক্রিয় শিক্ষার্থী তালিকায় খুঁজে পাওয়া যায়নি!\`);
        }
    }
};

const getStudentMetadata = asyncHandler(async (req, res) => {
    const nextBioId = await getNextAvailableStudentBiometricId();
    res.status(200).json(new ApiResponse(200, 'স্টুডেন্ট মেটাডাটা পাওয়া গেছে', {
        classes: STUDENT_CLASSES,
        groups: STUDENT_GROUPS.filter(Boolean),
        feeCategories: FEE_CATEGORIES,
        statuses: STUDENT_STATUSES,
        bloodGroups: BLOOD_GROUPS,
        nextSuggestedBiometricDeviceId: nextBioId
    }));
});

const lookupLegacyStudentById = asyncHandler(async (req, res) => {
    const { studentCode } = req.params;
    const result = await fetchLegacyStudentFromSheet(studentCode);

    if (result.alreadyMigrated) {
        return res.status(200).json(new ApiResponse(
            200,
            \`এই শিক্ষার্থী (\${result.existingStudent.fullNameBng}) ইতিমধ্যে নতুন ডাটাবেজে যুক্ত আছেন!\`,
            result
        ));
    }

    return res.status(200).json(new ApiResponse(
        200,
        'পুরনো গুগল শিট থেকে শিক্ষার্থীর তথ্য পাওয়া গেছে! এখন নতুন ফিল্ডগুলো পূরণ করে সংরক্ষণ করুন।',
        result
    ));
});

const registerStudent = asyncHandler(async (req, res) => {
    const {
        studentCode,
        migratedFromSheet = false,
        session,
        classBn,
        roll,
        brnNumber,
        boardRegNo,
        dateOfBirth,
        biometricDeviceId,
        feeDetails
    } = req.body;

    assertCanManageStudentClass(req.user, classBn);
    await verifySiblingExistsIfWaiver(feeDetails, studentCode);

    const uniqueOr = [{ brnNumber }];
    if (boardRegNo) uniqueOr.push({ boardRegNo });
    if (studentCode) uniqueOr.push({ studentCode });

    const duplicateIdentity = await Student.findOne({ $or: uniqueOr }).lean();
    if (duplicateIdentity) {
        if (studentCode && duplicateIdentity.studentCode === studentCode) {
            throw new ApiError(409, \`স্টুডেন্ট আইডি (\${studentCode}) ইতিমধ্যে ডাটাবেজে নিবন্ধিত আছে!\`);
        }
        if (duplicateIdentity.brnNumber === brnNumber) {
            throw new ApiError(409, \`এই জন্ম নিবন্ধন নম্বর (\${brnNumber}) দিয়ে ইতিমধ্যে '\${duplicateIdentity.fullNameBng}' নিবন্ধিত আছে!\`);
        }
        throw new ApiError(409, 'প্রদত্ত বোর্ড রেজিস্ট্রেশন নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে!');
    }

    const duplicateRoll = await Student.findOne({
        session,
        classBn,
        roll: Number(roll),
        status: { $in: ['Active', 'Inactive'] }
    }).lean();

    if (duplicateRoll) {
        throw new ApiError(409, \`\${session} শিক্ষাবর্ষে \${classBn} শ্রেণিতে রোল নম্বর \${roll} ইতিমধ্যে '\${duplicateRoll.fullNameBng}'-এর নামে বরাদ্দ আছে!\`);
    }

    const finalStudentCode = studentCode
        ? String(studentCode).trim()
        : await generateTenDigitStudentId(session, dateOfBirth, classBn, roll);

    const finalBiometricId = biometricDeviceId
        ? Number(biometricDeviceId)
        : await getNextAvailableStudentBiometricId();

    const { uid, editToken } = generateStudentTokens();
    const permanentAddress = req.body.permanentAddress?.houseNameBn
        ? req.body.permanentAddress
        : req.body.presentAddress;

    const student = await Student.create({
        ...req.body,
        studentCode: finalStudentCode,
        migratedFromSheet: Boolean(migratedFromSheet),
        biometricDeviceId: finalBiometricId,
        uid,
        editToken,
        permanentAddress,
        createdBy: req.user._id
    });

    await AuditLog.recordLog({
        req,
        action: migratedFromSheet ? 'MIGRATE_LEGACY_STUDENT' : 'REGISTER_STUDENT',
        module: 'Student',
        targetId: String(student._id),
        description: \`\${migratedFromSheet ? 'পুরনো শিট থেকে মাইগ্রেট' : 'নতুন শিক্ষার্থী ভর্তি'}: \${student.fullNameBng} (ID: \${student.studentCode}, শ্রেণি: \${student.classBn}, রোল: \${student.roll})\`
    });

    return res.status(201).json(new ApiResponse(
        201,
        migratedFromSheet
            ? 'পুরনো শিক্ষার্থীর তথ্য সফলভাবে নতুন ডাটাবেজে সংরক্ষিত হয়েছে!'
            : 'নতুন শিক্ষার্থী সফলভাবে ভর্তি নিবন্ধিত হয়েছে!',
        student
    ));
});

const getAllStudents = asyncHandler(async (req, res) => {
    const {
        session,
        classBn,
        status,
        gender,
        bloodGroup,
        feeCategory,
        search,
        includeDeleted
    } = req.query;

    const filter = {};
    if (includeDeleted !== 'true') {
        filter.status = status || { $ne: 'Deleted' };
    } else if (status) {
        filter.status = status;
    }

    if (session) filter.session = session;
    if (classBn && classBn !== 'All') filter.classBn = classBn;
    if (gender) filter.gender = gender;
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (feeCategory) filter['feeDetails.feeCategory'] = feeCategory;

    if (search) {
        const regex = { $regex: search.trim(), $options: 'i' };
        filter.$or = [
            { fullNameBng: regex },
            { fullNameEng: regex },
            { studentCode: regex },
            { phone: regex },
            { brnNumber: regex },
            { fathersNameBng: regex },
            ...(/^\\d+$/.test(search.trim()) ? [{ roll: Number(search.trim()) }] : [])
        ];
    }

    const students = await Student.find(filter)
        .sort({ classOrder: 1, roll: 1, createdAt: -1 })
        .lean();

    return res.status(200).json(new ApiResponse(200, 'শিক্ষার্থীদের তালিকা পাওয়া গেছে', {
        totalCount: students.length,
        students
    }));
});

const getStudentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : { studentCode: id };

    const student = await Student.findOne(query).lean();
    if (!student || student.status === 'Deleted') {
        throw new ApiError(404, 'শিক্ষার্থীর তথ্য খুঁজে পাওয়া যায়নি!');
    }

    const siblings = await findStudentSiblings(student);

    return res.status(200).json(new ApiResponse(200, 'শিক্ষার্থীর প্রোফাইল পাওয়া গেছে', {
        student,
        siblings
    }));
});

const getPublicStudentVerification = asyncHandler(async (req, res) => {
    const { studentCode } = req.params;
    if (!/^\\d{10}$/.test(studentCode)) {
        throw new ApiError(400, 'সঠিক ১০ ডিজিটের স্টুডেন্ট আইডি প্রদান করুন।');
    }

    const student = await Student.findOne({
        studentCode,
        status: { $ne: 'Deleted' }
    })
        .select('studentCode fullNameBng fullNameEng classBn classEn roll session gender bloodGroup dateOfBirth fathersNameBng mothersNameBng presentAddress.villageBn presentAddress.unionBn presentAddress.upazilaBn presentAddress.districtBn profilePicture.url status')
        .lean();

    if (!student) {
        throw new ApiError(404, 'এই আইডি নম্বরে কোনো বৈধ শিক্ষার্থী নিবন্ধিত নেই!');
    }

    return res.status(200).json(new ApiResponse(200, 'শিক্ষার্থীর পরিচয় যাচাই সফল', student));
});

const updateStudent = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);
    if (!student || student.status === 'Deleted') {
        throw new ApiError(404, 'শিক্ষার্থী খুঁজে পাওয়া যায়নি!');
    }

    assertCanManageStudentClass(req.user, student.classBn);
    if (req.body.classBn && req.body.classBn !== student.classBn) {
        assertCanManageStudentClass(req.user, req.body.classBn);
    }

    const nextFeeDetails = req.body.feeDetails
        ? { ...student.feeDetails.toObject(), ...req.body.feeDetails }
        : student.feeDetails.toObject();
    await verifySiblingExistsIfWaiver(nextFeeDetails, student.studentCode);

    const nextSession = req.body.session || student.session;
    const nextClass = req.body.classBn || student.classBn;
    const nextRoll = req.body.roll !== undefined ? Number(req.body.roll) : student.roll;
    const nextDob = req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : student.dateOfBirth;
    const nextBrn = req.body.brnNumber || student.brnNumber;

    // আপডেটের সময়ও BRN-এর প্রথম ৪ ডিজিট ও জন্মসালের মিল নিশ্চিত করা
    if (String(nextBrn).slice(0, 4) !== String(nextDob.getFullYear())) {
        throw new ApiError(400, \`জন্ম নিবন্ধন নম্বরের প্রথম ৪ সংখ্যা (\${String(nextBrn).slice(0, 4)}) এবং জন্মতারিখের সাল (\${nextDob.getFullYear()}) মিলছে না!\`);
    }

    const rollConflict = await Student.findOne({
        _id: { $ne: student._id },
        session: nextSession,
        classBn: nextClass,
        roll: nextRoll,
        status: { $in: ['Active', 'Inactive'] }
    }).lean();

    if (rollConflict) {
        throw new ApiError(409, \`\${nextSession} সেশনে \${nextClass} শ্রেণিতে রোল নম্বর \${nextRoll} ইতিমধ্যে '\${rollConflict.fullNameBng}'-এর নামে আছে!\`);
    }

    if (req.body.brnNumber && req.body.brnNumber !== student.brnNumber) {
        const brnConflict = await Student.findOne({
            _id: { $ne: student._id },
            brnNumber: req.body.brnNumber
        }).lean();
        if (brnConflict) {
            throw new ApiError(409, 'এই জন্ম নিবন্ধন নম্বরটি অন্য শিক্ষার্থীর প্রোফাইলে ব্যবহৃত হয়েছে!');
        }
    }

    const editableFields = [
        'admissionDate', 'session', 'fullNameBng', 'fullNameEng', 'dateOfBirth',
        'gender', 'religion', 'bloodGroup', 'brnNumber', 'medicalNote',
        'classBn', 'roll', 'group', 'fourthSubject', 'boardRegNo',
        'fathersNameBng', 'fathersNameEng', 'fatherNid', 'fatherOccupation',
        'mothersNameBng', 'mothersNameEng', 'motherNid', 'motherOccupation',
        'annualIncome', 'phone', 'biometricDeviceId', 'status', 'statusReason'
    ];

    editableFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            student.set(field, req.body[field]);
        }
    });

    if (req.body.localGuardian) {
        student.localGuardian = { ...student.localGuardian.toObject(), ...req.body.localGuardian };
    }
    if (req.body.emergencyContact) {
        student.emergencyContact = { ...student.emergencyContact.toObject(), ...req.body.emergencyContact };
    }
    if (req.body.presentAddress) {
        student.presentAddress = { ...student.presentAddress.toObject(), ...req.body.presentAddress };
    }
    if (req.body.permanentAddress) {
        student.permanentAddress = { ...student.permanentAddress.toObject(), ...req.body.permanentAddress };
    }
    if (req.body.feeDetails) {
        student.feeDetails = nextFeeDetails;
    }
    if (req.body.profilePicture?.url) {
        student.profilePicture = {
            url: req.body.profilePicture.url,
            publicId: req.body.profilePicture.publicId ?? student.profilePicture.publicId
        };
    }

    student.updatedBy = req.user._id;
    await student.save();

    await AuditLog.recordLog({
        req,
        action: 'UPDATE_STUDENT',
        module: 'Student',
        targetId: String(student._id),
        description: \`শিক্ষার্থীর তথ্য হালনাগাদ: \${student.fullNameBng} (ID: \${student.studentCode})\`
    });

    return res.status(200).json(new ApiResponse(200, 'শিক্ষার্থীর তথ্য সফলভাবে হালনাগাদ হয়েছে!', student));
});

const deleteStudent = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);
    if (!student || student.status === 'Deleted') {
        throw new ApiError(404, 'শিক্ষার্থী খুঁজে পাওয়া যায়নি!');
    }

    assertCanManageStudentClass(req.user, student.classBn);

    student.status = 'Deleted';
    student.isActive = false;
    student.statusReason = req.body?.statusReason || 'প্রশাসনিকভাবে মুছে ফেলা হয়েছে';
    student.updatedBy = req.user._id;
    await student.save();

    await AuditLog.recordLog({
        req,
        action: 'DELETE_STUDENT',
        module: 'Student',
        targetId: String(student._id),
        description: \`শিক্ষার্থী ডিলিট: \${student.fullNameBng} (ID: \${student.studentCode}) — কারণ: \${student.statusReason}\`
    });

    return res.status(200).json(new ApiResponse(200, 'শিক্ষার্থীর রেকর্ড সফলভাবে ডিলিট করা হয়েছে।'));
});

const promoteStudentsBulk = asyncHandler(async (req, res) => {
    const { promotions, targetSession } = req.body;
    if (!Array.isArray(promotions) || promotions.length === 0 || !/^20\\d{2}$/.test(String(targetSession))) {
        throw new ApiError(400, 'সঠিক সেশন এবং প্রমোশন তালিকা প্রদান করুন।');
    }

    let promotedCount = 0;
    for (const item of promotions) {
        const student = await Student.findById(item.studentId);
        if (!student || student.status !== 'Active') continue;

        const currentHist = student.academicHistory.find(
            h => h.session === student.session && h.classBn === student.classBn
        );
        if (currentHist) {
            currentHist.resultStatus = item.resultStatus || 'Promoted';
        }

        student.session = String(targetSession);
        student.classBn = item.nextClassBn;
        student.roll = Number(item.nextRoll);
        if (item.nextGroup !== undefined) student.group = item.nextGroup;
        student.updatedBy = req.user._id;

        student.academicHistory.push({
            session: String(targetSession),
            classBn: item.nextClassBn,
            classEn: '',
            roll: Number(item.nextRoll),
            group: item.nextGroup || '',
            resultStatus: 'Studying'
        });

        await student.save();
        promotedCount++;
    }

    return res.status(200).json(new ApiResponse(
        200,
        \`মোট \${promotedCount} জন শিক্ষার্থীকে \${targetSession} সেশনে প্রমোশন দেওয়া হয়েছে!\`,
        { promotedCount }
    ));
});

module.exports = {
    getStudentMetadata,
    lookupLegacyStudentById,
    registerStudent,
    getAllStudents,
    getStudentById,
    getPublicStudentVerification,
    updateStudent,
    deleteStudent,
    promoteStudentsBulk
};
`);

// ============================================================================
// 7. ROUTES (src/routes/student.routes.js)
// ============================================================================
writeFileEnsureDir('routes/student.routes.js', `
const express = require('express');
const router = express.Router();
const {
    getStudentMetadata,
    lookupLegacyStudentById,
    registerStudent,
    getAllStudents,
    getStudentById,
    getPublicStudentVerification,
    updateStudent,
    deleteStudent,
    promoteStudentsBulk
} = require('../controllers/student.controller');
const {
    createStudentValidator,
    updateStudentValidator
} = require('../validators/student.validator');
const validateRequest = require('../middlewares/validate.middleware');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/system.constants');

router.get('/public/verify/:studentCode', getPublicStudentVerification);

router.use(protect);

router.get('/metadata', getStudentMetadata);
router.get('/legacy-lookup/:studentCode', lookupLegacyStudentById);

router.post(
    '/promote',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    promoteStudentsBulk
);

router
    .route('/')
    .get(restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), getAllStudents)
    .post(
        restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
        createStudentValidator,
        validateRequest,
        registerStudent
    );

router
    .route('/:id')
    .get(restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), getStudentById)
    .patch(
        restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
        updateStudentValidator,
        validateRequest,
        updateStudent
    )
    .delete(
        restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER),
        deleteStudent
    );

module.exports = router;
`);

// ============================================================================
// 8. PATCH db.js, error.middleware.js, system.controller.js, app.js
// ============================================================================
patchFile('config/db.js', (code) => {
    let out = code;
    if (!out.includes("require('../models/Student')")) {
        out = out.replace(
            "const Teacher = require('../models/Teacher');",
            "const Teacher = require('../models/Teacher');\nconst Student = require('../models/Student');"
        );
    }
    if (!out.includes('OPTIONAL_UNIQUE_STUDENT_FIELDS')) {
        out = out.replace(
            'await cleanupOptionalUniqueTeacherFields();',
            `await cleanupOptionalUniqueTeacherFields();
        for (const field of ['uid', 'boardRegNo', 'biometricDeviceId']) {
            await Student.collection.updateMany({ [field]: { $type: 10 } }, { $unset: { [field]: 1 } });
            await Student.collection.updateMany({ [field]: { $type: 'string', $regex: /^\\s*$/ } }, { $unset: { [field]: 1 } });
        }`
        );
    }
    return out;
});

patchFile('middlewares/error.middleware.js', (code) => {
    let out = code;
    if (!out.includes('studentCode:')) {
        out = out.replace(
            "    teacherCode: 'শিক্ষক আইডি',",
            `    teacherCode: 'শিক্ষক আইডি',
    studentCode: 'স্টুডেন্ট আইডি',
    brnNumber: 'জন্ম নিবন্ধন নম্বর (BRN)',
    fatherNid: 'পিতার NID নম্বর',
    motherNid: 'মাতার NID নম্বর',
    boardRegNo: 'বোর্ড রেজিস্ট্রেশন নম্বর',`
        );
    }
    if (!out.includes('StrictModeError')) {
        out = out.replace(
            "    if (err.name === 'CastError') {",
            `    if (err.name === 'StrictModeError') {
        error = new ApiError(400, \`অননুমোদিত বা অজানা ফিল্ড (\${err.path || 'unknown'}) পাঠানো হয়েছে!\`);
    }

    if (err.name === 'CastError') {`
        );
    }
    return out;
});

patchFile('controllers/system.controller.js', (code) => {
    let out = code;
    if (!out.includes("require('../models/Student')")) {
        out = out.replace(
            "const Teacher = require('../models/Teacher');",
            "const Teacher = require('../models/Teacher');\nconst Student = require('../models/Student');"
        );
    }
    if (!out.includes('students,')) {
        out = out.replace(
            '        teachers,\n        attendances,',
            '        teachers,\n        students,\n        attendances,'
        );
        out = out.replace(
            '        Teacher.find().lean(),\n        Attendance.find().lean(),',
            '        Teacher.find().lean(),\n        Student.find().lean(),\n        Attendance.find().lean(),'
        );
        out = out.replace(
            '            teachers,\n            attendances,',
            '            teachers,\n            students,\n            attendances,'
        );
    }
    return out;
});

patchFile('app.js', (code) => {
    let out = code;
    if (!out.includes('studentRoutes')) {
        out = out.replace(
            "const teacherRoutes = require('./routes/teacher.routes');",
            "const teacherRoutes = require('./routes/teacher.routes');\nconst studentRoutes = require('./routes/student.routes');"
        );
    }
    if (!out.includes("'/api/v1/students'")) {
        out = out.replace(
            "'/api/v1/teachers',",
            "'/api/v1/teachers',\n            '/api/v1/students',"
        );
        out = out.replace(
            "app.use('/api/v1/teachers', teacherRoutes);",
            "app.use('/api/v1/teachers', teacherRoutes);\napp.use('/api/v1/students', studentRoutes);"
        );
    }
    return out;
});

console.log('\\n🛡️ ARDM Military-Grade Student Backend Engine v2.0 সফলভাবে ইনস্টল সম্পন্ন হয়েছে!');