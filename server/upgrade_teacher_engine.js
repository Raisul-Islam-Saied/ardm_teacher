


const fs = require('fs');
const path = require('path');

console.log('🛡️ Applying Military-Grade Teacher Registration, 10-Digit ID & Auto-Ranking Engine...\n');

const baseDir = fs.existsSync(path.join(__dirname, 'src'))
    ? __dirname
    : path.join(__dirname, 'server');

const files = {
    // ১. Constants আপডেট (১৫টি পদবী বাংলা+ইংরেজি, র‍্যাংক প্রায়োরিটি, স্টাফ ক্যাটাগরি, ব্লাড গ্রুপ N/A ও ক্যাশ পেমেন্ট)
    'src/constants/system.constants.js': `const ROLES = Object.freeze({
    SUPER_ADMIN: 'SuperAdmin',
    ADMIN: 'Admin',
    TEACHER: 'Teacher'
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

const BLOOD_GROUPS = Object.freeze([
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'N/A'
]);

// ১৫টি নির্ধারিত পদবী (ইংরেজি, বাংলা, বেস র‍্যাংক এবং স্টাফ ক্যাটাগরি সহ)
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

module.exports = {
    ROLES,
    EMPLOYMENT_TYPES,
    PAYMENT_METHODS,
    BLOOD_GROUPS,
    DESIGNATION_DETAILS,
    DESIGNATIONS,
    DEGREE_LEVEL_WEIGHTS,
    ATTENDANCE_STATUS,
    ATTENDANCE_SOURCES,
    LEAVE_TYPES,
    LEAVE_APPROVAL_STATUS,
    SALARY_ADJUSTMENT_MODES,
    ATTENDANCE_RULES
};`,

    // ২. Teacher Model আপডেট (১০ সংখ্যার আইডি, বাংলা+ইংরেজি পিতা-মাতার নাম, NID/জন্ম নিবন্ধন, ক্যাশ পেমেন্ট, র‍্যাংকিং ও পাবলিক রেজিস্ট্রি টোকেন)
    'src/models/Teacher.js': `const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
    ROLES,
    EMPLOYMENT_TYPES,
    PAYMENT_METHODS,
    BLOOD_GROUPS,
    DESIGNATIONS,
    DESIGNATION_DETAILS,
    DEGREE_LEVEL_WEIGHTS
} = require('../constants/system.constants');

const academicQualificationSchema = new mongoose.Schema({
    degreeLevel: {
        type: String,
        enum: Object.keys(DEGREE_LEVEL_WEIGHTS),
        required: [true, 'ডিগ্রির স্তর (যেমন: Kamil, Fazil, Masters, Honours, Alim, Dakhil) উল্লেখ করা আবশ্যক']
    },
    examTitle: { type: String, required: true, trim: true }, // যেমন: কামিল (হাদিস), বি.এসসি (অনার্স)
    majorOrGroup: { type: String, trim: true, default: '' },
    boardOrUniversity: { type: String, required: true, trim: true },
    passingYear: { type: Number, required: true, min: 1960, max: 2050 },
    gpaOrCgpa: { type: Number, required: true, min: 1.0, max: 5.0 },
    scale: { type: Number, enum: [4, 5], default: 5 }
}, { _id: false });

const teacherSchema = new mongoose.Schema({
    // ১. ১০ সংখ্যার স্বয়ংক্রিয় ইউনিক টিচার আইডি (যেমন: 1026030301) ও বায়োমেট্রিক আইডি
    teacherCode: {
        type: String,
        required: [true, '১০ সংখ্যার টিচার আইডি আবশ্যক'],
        unique: true,
        trim: true,
        match: [/^\d{10}$/, 'টিচার আইডি অবশ্যই ১০ সংখ্যার ডিজিট হতে হবে']
    },
    uid: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    editToken: {
        type: String,
        select: false
    },
    biometricDeviceId: {
        type: Number,
        required: [true, 'বায়োমেট্রিক মেশিন আইডি (Device User ID) আবশ্যক'],
        unique: true,
        min: [1, 'বায়োমেট্রিক আইডি কমপক্ষে ১ হতে হবে']
    },
    indexNumber: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        default: null
    },

    // ২. ব্যক্তিগত তথ্য (বাংলা ও ইংরেজি উভয় ভাষায়)
    fullNameBng: {
        type: String,
        required: [true, 'শিক্ষকের বাংলা নাম আবশ্যক'],
        trim: true
    },
    fullNameEng: {
        type: String,
        required: [true, 'শিক্ষকের ইংরেজি নাম আবশ্যক'],
        trim: true
    },
    fathersNameBng: {
        type: String,
        required: [true, 'পিতার বাংলা নাম আবশ্যক'],
        trim: true
    },
    fathersNameEng: {
        type: String,
        required: [true, 'পিতার ইংরেজি নাম আবশ্যক'],
        trim: true
    },
    mothersNameBng: {
        type: String,
        required: [true, 'মাতার বাংলা নাম আবশ্যক'],
        trim: true
    },
    mothersNameEng: {
        type: String,
        required: [true, 'মাতার ইংরেজি নাম আবশ্যক'],
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'জন্ম তারিখ আবশ্যক']
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        default: 'Male'
    },
    religion: {
        type: String,
        enum: ['Islam', 'Hinduism', 'Buddhism', 'Christianity', 'Other'],
        default: 'Islam'
    },
    bloodGroup: {
        type: String,
        enum: BLOOD_GROUPS,
        default: 'N/A'
    },
    maritalStatus: {
        type: String,
        enum: ['Single', 'Married', 'Widowed', 'Divorced'],
        default: 'Married'
    },

    // ৩. পরিচয়পত্র (NID অথবা জন্ম নিবন্ধন - যেকোনো একটি বাধ্যতামূলক)
    nidNumber: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        default: null
    },
    birthRegNumber: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        default: null
    },

    // ৪. যোগাযোগ ও জরুরি যোগাযোগ
    phone: {
        type: String,
        required: [true, 'সচল মোবাইল নম্বর আবশ্যক'],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
        default: null
    },
    emergencyContact: {
        contactName: { type: String, trim: true, default: '' },
        relationship: { type: String, trim: true, default: '' },
        phone: {
            type: String,
            required: [true, 'জরুরি যোগাযোগের মোবাইল নম্বর আবশ্যক'],
            trim: true
        }
    },

    // ৫. ঠিকানা (ডিফল্ট সরফভাটা, রাঙ্গুনিয়া, চট্টগ্রাম - তবে পরিবর্তনযোগ্য)
    presentAddress: {
        houseOrRoad: { type: String, required: [true, 'বাড়ি বা রাস্তার নাম আবশ্যক'], trim: true },
        village: { type: String, required: [true, 'গ্রামের নাম আবশ্যক'], trim: true },
        postOffice: { type: String, default: 'Sarafbhata', trim: true },
        postCode: { type: String, default: '4360', trim: true },
        upazila: { type: String, default: 'Rangunia', trim: true },
        district: { type: String, default: 'Chittagong', trim: true }
    },
    permanentAddress: {
        houseOrRoad: { type: String, trim: true, default: '' },
        village: { type: String, trim: true, default: '' },
        postOffice: { type: String, default: 'Sarafbhata', trim: true },
        postCode: { type: String, default: '4360', trim: true },
        upazila: { type: String, default: 'Rangunia', trim: true },
        district: { type: String, default: 'Chittagong', trim: true }
    },

    // ৬. প্রাতিষ্ঠানিক পদবী, ক্যাটাগরি ও র‍্যাংকিং ইঞ্জিন
    designation: {
        type: String,
        enum: DESIGNATIONS,
        required: [true, 'পদবী নির্বাচন করা আবশ্যক']
    },
    designationBng: {
        type: String,
        trim: true
    },
    staffCategory: {
        type: String,
        enum: ['Teaching', 'Non-Teaching'],
        default: 'Teaching'
    },
    subject: {
        type: String,
        trim: true,
        default: 'General'
    },
    employmentType: {
        type: String,
        enum: Object.values(EMPLOYMENT_TYPES),
        default: EMPLOYMENT_TYPES.NON_MPO // যেহেতু মাদ্রাসা বর্তমানে বেসরকারি
    },
    joiningDate: {
        type: Date,
        required: [true, 'মাদ্রাসায় যোগদানের তারিখ আবশ্যক']
    },
    resignationDate: {
        type: Date,
        default: null
    },

    // ৭. শিক্ষাগত যোগ্যতা ও অটো-র‍্যাংকিং স্কোর
    academicQualifications: {
        type: [academicQualificationSchema],
        default: []
    },
    rankingMetrics: {
        designationPriority: { type: Number, default: 15 }, // 1 = Super, 2 = Asst Super...
        highestDegreeWeight: { type: Number, default: 0 },  // 5 = Kamil/Masters, 4 = Fazil/Honours...
        highestDegreeNormalizedGpa: { type: Number, default: 0 }, // 5.00 স্কেলে কনভার্টেড পয়েন্ট
        averageNormalizedGpa: { type: Number, default: 0 },
        compositeRankScore: { type: Number, default: 0 },
        overallMadrasahRank: { type: Number, default: null } // সমগ্র মাদ্রাসায় তার সিরিয়াল র‍্যাংক (1, 2, 3...)
    },

    // ৮. বেতন ও পেমেন্ট পদ্ধতি (ডিফল্ট: Cash)
    basicSalary: {
        type: Number,
        required: true,
        min: [0, 'মূল বেতন ঋণাত্মক হতে পারবে না'],
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: Object.values(PAYMENT_METHODS),
        default: PAYMENT_METHODS.CASH
    },
    bankDetails: {
        bankName: { type: String, default: 'Islami Bank Bangladesh PLC', trim: true },
        branchName: { type: String, trim: true, default: '' },
        accountHolderName: { type: String, trim: true, default: '' },
        accountNumber: { type: String, trim: true, default: '' },
        routingNumber: { type: String, trim: true, default: '' }
    },
    customLeaveQuota: {
        type: Number,
        default: 2.0,
        min: 0
    },

    // ৯. প্রোফাইল ছবি (500x500 Square in Cloudinary ardm/teachers)
    profilePicture: {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' }
    },

    // ১০. সিকিউরিটি, রোল ও অ্যাকাউন্ট স্ট্যাটাস (Pending Approval সাপোর্টসহ)
    password: {
        type: String,
        required: [true, 'পাসওয়ার্ড আবশ্যক'],
        minlength: [6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'],
        select: false
    },
    role: {
        type: String,
        enum: Object.values(ROLES),
        default: ROLES.TEACHER
    },
    registrationStatus: {
        type: String,
        enum: ['Approved', 'Pending', 'Rejected'],
        default: 'Approved'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    failedLoginAttempts: {
        type: Number,
        default: 0,
        select: false
    },
    lockUntil: {
        type: Date,
        default: null,
        select: false
    }
}, {
    timestamps: true,
    versionKey: false
});

// সেভ হওয়ার আগে বাংলা পদবী, স্টাফ ক্যাটাগরি এবং র‍্যাংকিং মেট্রিক্স স্বয়ংক্রিয়ভাবে হিসাব করা
teacherSchema.pre('save', async function (next) {
    // ১. পদবীর বাংলা নাম ও বেস র‍্যাংক সেট করা
    const desigInfo = DESIGNATION_DETAILS.find(d => d.titleEng === this.designation)
        || DESIGNATION_DETAILS[DESIGNATION_DETAILS.length - 1];

    this.designationBng = desigInfo.titleBng;
    this.staffCategory = desigInfo.staffCategory;

    // ২. শিক্ষাগত যোগ্যতা ও GPA/CGPA বিশ্লেষণ করে র‍্যাংকিং স্কোর তৈরি করা
    let maxWeight = 0;
    let bestGpaNormalized = 0;
    let totalNormalizedGpa = 0;

    if (Array.isArray(this.academicQualifications) && this.academicQualifications.length > 0) {
        for (const q of this.academicQualifications) {
            const weight = DEGREE_LEVEL_WEIGHTS[q.degreeLevel] || 0;
            // ৪ স্কেলের CGPA হলে সেটিকে ৫ স্কেলের সমমান করে তুলনা করা যেন GPA ও CGPA-এর মধ্যে নিখুঁত বিচার হয়
            const normalizedGpa = q.scale === 4
                ? Number(((q.gpaOrCgpa / 4) * 5).toFixed(3))
                : Number(q.gpaOrCgpa.toFixed(3));

            totalNormalizedGpa += normalizedGpa;

            if (weight > maxWeight || (weight === maxWeight && normalizedGpa > bestGpaNormalized)) {
                maxWeight = weight;
                bestGpaNormalized = normalizedGpa;
            }
        }
    }

    const avgGpa = this.academicQualifications?.length
        ? Number((totalNormalizedGpa / this.academicQualifications.length).toFixed(3))
        : 0;

    this.rankingMetrics = {
        ...this.rankingMetrics,
        designationPriority: desigInfo.rankPriority,
        highestDegreeWeight: maxWeight,
        highestDegreeNormalizedGpa: bestGpaNormalized,
        averageNormalizedGpa: avgGpa,
        compositeRankScore: Number(((16 - desigInfo.rankPriority) * 1000 + (maxWeight * 50) + (bestGpaNormalized * 10) + avgGpa).toFixed(3))
    };

    // ৩. পাসওয়ার্ড হ্যাশিং
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    next();
});

teacherSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Teacher', teacherSchema);`,

    // ৩. Teacher Service তৈরি (১০ সংখ্যার আইডি জেনারেশন, অটো বায়োমেট্রিক আইডি এবং মাদ্রাসার র‍্যাংকিং রিক্যালকুলেশন ইঞ্জিন)
    'src/services/teacher.service.js': `const crypto = require('crypto');
const moment = require('moment-timezone');
const Teacher = require('../models/Teacher');
const { DESIGNATION_DETAILS } = require('../constants/system.constants');

/**
 * ১. ১০ সংখ্যার ইউনিক টিচার আইডি জেনারেটর (অপশন ক অনুযায়ী)
 * ফরম্যাট: 10 (টিচার প্রিফিক্স) + YY (যোগদানের সাল) + BB (জন্মসাল) + DD (পদবী কোড 01-15) + SS (সিরিয়াল 01-99)
 * উদাহরণ: 1026030301 (১০ ডিজিট)
 */
const generateTenDigitTeacherId = async (joiningDate, dateOfBirth, designation) => {
    const prefix = '10'; // স্টুডেন্ট ২০ দিয়ে শুরু হয়, তাই টিচার ১০ দিয়ে শুরু
    const joinYear2D = joiningDate
        ? moment.tz(joiningDate, 'Asia/Dhaka').format('YY')
        : moment.tz('Asia/Dhaka').format('YY');
    const birthYear2D = dateOfBirth
        ? moment.tz(dateOfBirth, 'Asia/Dhaka').format('YY')
        : '00';

    const desigInfo = DESIGNATION_DETAILS.find(d => d.titleEng === designation)
        || DESIGNATION_DETAILS[DESIGNATION_DETAILS.length - 1];
    const desigCode2D = desigInfo.code; // '01' to '15'

    const base8Digits = \`\${prefix}\${joinYear2D}\${birthYear2D}\${desigCode2D}\`;

    // ওই একই বেসের অধীনে কতজন আছেন তা খুঁজে পরবর্তী ২ ডিজিট সিরিয়াল (01, 02...) বসানো
    const existingTeachers = await Teacher.find({
        teacherCode: { $regex: \`^\${base8Digits}\\\\d{2}$\` }
    }).select('teacherCode').lean();

    let maxSerial = 0;
    for (const t of existingTeachers) {
        const serialNum = parseInt(t.teacherCode.slice(-2), 10);
        if (!isNaN(serialNum) && serialNum > maxSerial) {
            maxSerial = serialNum;
        }
    }

    let nextSerial = maxSerial + 1;
    let candidateId = \`\${base8Digits}\${String(nextSerial).padStart(2, '0')}\`;

    // শতভাগ ইউনিক নিশ্চিত করা
    while (await Teacher.exists({ teacherCode: candidateId })) {
        nextSerial++;
        candidateId = \`\${base8Digits}\${String(nextSerial % 100).padStart(2, '0')}\`;
    }

    return candidateId;
};

/**
 * ২. পরবর্তী খালি থাকা বায়োমেট্রিক ডিভাইস আইডি (1, 2, 3...) স্বয়ংক্রিয়ভাবে বের করা
 */
const getNextAvailableBiometricId = async () => {
    const teachers = await Teacher.find().select('biometricDeviceId').sort({ biometricDeviceId: 1 }).lean();
    const usedIds = new Set(teachers.map(t => Number(t.biometricDeviceId)));
    let candidate = 1;
    while (usedIds.has(candidate)) {
        candidate++;
    }
    return candidate;
};

/**
 * ৩. সমগ্র মাদ্রাসার শিক্ষকদের র‍্যাংকিং (1, 2, 3...) স্বয়ংক্রিয়ভাবে সাজানো
 * নিয়ম:
 * ক) সুপারের র‍্যাংক ১, সহ-সুপারের র‍্যাংক ২, এরপর পদবীর ক্রম অনুযায়ী (designationPriority ছোট থেকে বড়)।
 * খ) পদবী একই হলে: সর্বোচ্চ ডিগ্রির মান (highestDegreeWeight বড় থেকে ছোট)।
 * গ) ডিগ্রিও একই হলে: সর্বোচ্চ ডিগ্রির GPA/CGPA (বড় থেকে ছোট)।
 * ঘ) সেটিও সমান হলে: গড় GPA/CGPA ➔ চাকরিতে যোগদানের তারিখ (যিনি আগে জয়েন করেছেন) ➔ বয়স (যিনি বয়সে বড়)।
 */
const recalculateAllTeachersRank = async () => {
    const activeTeachers = await Teacher.find({ isActive: true, registrationStatus: 'Approved' }).lean();

    activeTeachers.sort((a, b) => {
        const pA = a.rankingMetrics?.designationPriority ?? 15;
        const pB = b.rankingMetrics?.designationPriority ?? 15;
        if (pA !== pB) return pA - pB; // ছোট সংখ্যা মানে উচ্চ পদবী (1 = Super)

        const degA = a.rankingMetrics?.highestDegreeWeight ?? 0;
        const degB = b.rankingMetrics?.highestDegreeWeight ?? 0;
        if (degB !== degA) return degB - degA; // উচ্চতর ডিগ্রি আগে

        const gpaA = a.rankingMetrics?.highestDegreeNormalizedGpa ?? 0;
        const gpaB = b.rankingMetrics?.highestDegreeNormalizedGpa ?? 0;
        if (gpaB !== gpaA) return gpaB - gpaA; // বেশি GPA/CGPA আগে

        const avgA = a.rankingMetrics?.averageNormalizedGpa ?? 0;
        const avgB = b.rankingMetrics?.averageNormalizedGpa ?? 0;
        if (avgB !== avgA) return avgB - avgA;

        const joinA = a.joiningDate ? new Date(a.joiningDate).getTime() : Number.MAX_SAFE_INTEGER;
        const joinB = b.joiningDate ? new Date(b.joiningDate).getTime() : Number.MAX_SAFE_INTEGER;
        if (joinA !== joinB) return joinA - joinB; // আগে যোগদানকারী সিনিয়র

        const dobA = a.dateOfBirth ? new Date(a.dateOfBirth).getTime() : Number.MAX_SAFE_INTEGER;
        const dobB = b.dateOfBirth ? new Date(b.dateOfBirth).getTime() : Number.MAX_SAFE_INTEGER;
        return dobA - dobB; // বয়সে বড় যিনি
    });

    const bulkOps = activeTeachers.map((teacher, index) => ({
        updateOne: {
            filter: { _id: teacher._id },
            update: { $set: { 'rankingMetrics.overallMadrasahRank': index + 1 } }
        }
    }));

    if (bulkOps.length > 0) {
        await Teacher.bulkWrite(bulkOps);
    }

    return activeTeachers.length;
};

const generateRegistryTokens = () => ({
    uid: crypto.randomUUID(),
    editToken: crypto.randomBytes(16).toString('hex')
});

module.exports = {
    generateTenDigitTeacherId,
    getNextAvailableBiometricId,
    recalculateAllTeachersRank,
    generateRegistryTokens
};`,

    // ৪. Military-Grade Teacher Validator আপডেট
    'src/validators/teacher.validator.js': `const { body } = require('express-validator');
const {
    ROLES,
    EMPLOYMENT_TYPES,
    PAYMENT_METHODS,
    BLOOD_GROUPS,
    DESIGNATIONS,
    DEGREE_LEVEL_WEIGHTS
} = require('../constants/system.constants');

// HTML ট্যাগ ও অতিরিক্ত স্পেস মুছে ফেলার মিলিটারি স্যানিটাইজার
const sanitizeClean = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/<[^>]*>/g, '').replace(/[\\r\\n\\t]+/g, ' ').replace(/\\s+/g, ' ').trim();
};

const ENG_NAME_REGEX = /^[A-Za-z][A-Za-z\\s.'-]{2,59}$/;
const BNG_NAME_REGEX = /^[\\u0980-\\u09FF][\\u0980-\\u09FF\\s.'-]{1,59}$/;
const BD_PHONE_REGEX = /^01[3-9]\\d{8}$/;
const NID_REGEX = /^(\\d{10}|\\d{13}|\\d{17})$/;
const BIRTH_REG_REGEX = /^\\d{17}$/;
const REPEATED_DIGITS_REGEX = /^(\\d)\\1+$/; // 1111111111 বা 0000000000 ব্লক করার জন্য

const commonMilitaryRules = [
    // ১. বাংলা ও ইংরেজি নামের কড়া ভ্যালিডেশন (শিক্ষক, পিতা ও মাতা)
    body('fullNameEng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('শিক্ষকের ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর (A-Z, 3-60 অক্ষর) ব্যবহার করুন'),

    body('fullNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('শিক্ষকের বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('বাংলা নামে শুধুমাত্র বাংলা অক্ষর ব্যবহার করুন'),

    body('fathersNameEng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('পিতার ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('পিতার ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর ব্যবহার করুন'),

    body('fathersNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('পিতার বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('পিতার বাংলা নামে শুধুমাত্র বাংলা অক্ষর ব্যবহার করুন'),

    body('mothersNameEng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('মাতার ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('মাতার ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর ব্যবহার করুন'),

    body('mothersNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('মাতার বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('মাতার বাংলা নামে শুধুমাত্র বাংলা অক্ষর ব্যবহার করুন'),

    // ২. পদবী ও ব্লাড গ্রুপ ভ্যালিডেশন
    body('designation')
        .customSanitizer(sanitizeClean)
        .isIn(DESIGNATIONS).withMessage(\`পদবী অবশ্যই নির্ধারিত ১৫টি পদবীর একটি হতে হবে: \${DESIGNATIONS.join(', ')}\`),

    body('bloodGroup')
        .optional()
        .customSanitizer(sanitizeClean)
        .isIn(BLOOD_GROUPS).withMessage(\`রক্তের গ্রুপ সঠিক নয় (\${BLOOD_GROUPS.join(', ')})\`),

    // ৩. NID অথবা জন্ম নিবন্ধন (যেকোনো একটি অবশ্যই দিতে হবে + ভুয়া রিপিট নম্বর ব্লক)
    body('nidNumber')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .custom((val) => {
            if (!NID_REGEX.test(val)) {
                throw new Error('জাতীয় পরিচয়পত্র (NID) নম্বর অবশ্যই ১০, ১৩ অথবা ১৭ ডিজিটের হতে হবে');
            }
            if (REPEATED_DIGITS_REGEX.test(val)) {
                throw new Error('প্রদত্ত NID নম্বরটি ভুয়া বা অকার্যকর মনে হচ্ছে');
            }
            return true;
        }),

    body('birthRegNumber')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .custom((val) => {
            if (!BIRTH_REG_REGEX.test(val)) {
                throw new Error('জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ ডিজিটের সংখ্যা হতে হবে');
            }
            if (REPEATED_DIGITS_REGEX.test(val)) {
                throw new Error('প্রদত্ত জন্ম নিবন্ধন নম্বরটি ভুয়া বা অকার্যকর মনে হচ্ছে');
            }
            return true;
        }),

    body().custom((_, { req }) => {
        const nid = req.body.nidNumber ? String(req.body.nidNumber).trim() : '';
        const bReg = req.body.birthRegNumber ? String(req.body.birthRegNumber).trim() : '';
        if (!nid && !bReg) {
            throw new Error('জাতীয় পরিচয়পত্র (NID) অথবা ১৭ ডিজিটের জন্ম নিবন্ধন নম্বর—যেকোনো একটি অবশ্যই প্রদান করতে হবে!');
        }
        return true;
    }),

    // ৪. জন্ম তারিখ (বয়স ১৫ থেকে ৭০ বছর) এবং যোগদানের তারিখ যাচাই
    body('dateOfBirth')
        .notEmpty().withMessage('জন্ম তারিখ আবশ্যক')
        .isISO8601().withMessage('জন্ম তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন')
        .custom((dob) => {
            const birthDate = new Date(dob);
            const today = new Date();
            if (birthDate > today) {
                throw new Error('জন্ম তারিখ ভবিষ্যতের হতে পারে না');
            }
            const age = (today - birthDate) / (365.25 * 24 * 3600 * 1000);
            if (age < 15) {
                throw new Error('শিক্ষক বা স্টাফের বয়স কমপক্ষে ১৫ বছর হতে হবে');
            }
            if (age > 70) {
                throw new Error('বয়স ৭০ বছরের বেশি হতে পারবে না, অনুগ্রহ করে জন্ম তারিখ যাচাই করুন');
            }
            return true;
        }),

    body('joiningDate')
        .notEmpty().withMessage('যোগদানের তারিখ আবশ্যক')
        .isISO8601().withMessage('যোগদানের তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন')
        .custom((joiningDate, { req }) => {
            if (req.body.dateOfBirth) {
                const birth = new Date(req.body.dateOfBirth);
                const join = new Date(joiningDate);
                const ageAtJoining = (join - birth) / (365.25 * 24 * 3600 * 1000);
                if (ageAtJoining < 15) {
                    throw new Error('জন্ম তারিখের সাথে যোগদানের তারিখ অসামঞ্জস্যপূর্ণ (যোগদানের সময় বয়স কমপক্ষে ১৫ বছর হতে হবে)');
                }
            }
            return true;
        }),

    // ৫. মোবাইল নম্বর এবং জরুরি যোগাযোগের নম্বর (একে অপরের থেকে ভিন্ন হতে হবে)
    body('phone')
        .customSanitizer(sanitizeClean)
        .matches(BD_PHONE_REGEX).withMessage('সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নম্বর দিন (01XXXXXXXXX)'),

    body('emergencyContact.phone')
        .customSanitizer(sanitizeClean)
        .matches(BD_PHONE_REGEX).withMessage('জরুরি যোগাযোগের জন্য সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন')
        .custom((emPhone, { req }) => {
            if (emPhone && req.body.phone && emPhone.trim() === String(req.body.phone).trim()) {
                throw new Error('জরুরি যোগাযোগের নম্বরটি শিক্ষকের নিজের মোবাইল নম্বরের থেকে অবশ্যই আলাদা হতে হবে!');
            }
            return true;
        }),

    // ৬. ঠিকানা (বাড়ি ও গ্রাম বাধ্যতামূলক, বাকিগুলো ডিফল্ট সরফভাটা/রাঙ্গুনিয়া/চট্টগ্রাম)
    body('presentAddress.houseOrRoad')
        .customSanitizer(sanitizeClean)
        .isLength({ min: 2, max: 80 }).withMessage('বাড়ি বা রাস্তার নাম ২ থেকে ৮০ অক্ষরের মধ্যে হতে হবে'),

    body('presentAddress.village')
        .customSanitizer(sanitizeClean)
        .isLength({ min: 2, max: 80 }).withMessage('গ্রামের নাম ২ থেকে ৮০ অক্ষরের মধ্যে হতে হবে'),

    // ৭. শিক্ষাগত যোগ্যতা ও GPA/CGPA চেক
    body('academicQualifications')
        .optional()
        .isArray().withMessage('শিক্ষাগত যোগ্যতা Array আকারে হতে হবে'),

    body('academicQualifications.*.degreeLevel')
        .isIn(Object.keys(DEGREE_LEVEL_WEIGHTS)).withMessage('সঠিক ডিগ্রি লেভেল নির্বাচন করুন'),

    body('academicQualifications.*.gpaOrCgpa')
        .isFloat({ min: 1.0, max: 5.0 }).withMessage('GPA বা CGPA অবশ্যই ১.০০ থেকে ৫.০০ এর মধ্যে হতে হবে')
];

const createTeacherValidator = [
    ...commonMilitaryRules,
    body('teacherCode')
        .optional({ checkFalsy: true })
        .matches(/^\\d{10}$/).withMessage('টিচার আইডি দিলে তা অবশ্যই ১০ সংখ্যার ডিজিট হতে হবে'),
    body('biometricDeviceId')
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage('বায়োমেট্রিক ডিভাইস আইডি অবশ্যই পূর্ণসংখ্যা হতে হবে'),
    body('basicSalary')
        .notEmpty().withMessage('মূল বেতন (Basic Salary) আবশ্যক')
        .isFloat({ min: 0 }).withMessage('মূল বেতন ০ বা তার বেশি হতে হবে'),
    body('paymentMethod')
        .optional()
        .isIn(Object.values(PAYMENT_METHODS)).withMessage('পেমেন্ট মেথড সঠিক নয় (Cash, Bank, Mobile Banking)'),
    body('employmentType')
        .optional()
        .isIn(Object.values(EMPLOYMENT_TYPES)),
    body('role')
        .optional()
        .isIn(Object.values(ROLES)),
    body('password')
        .optional()
        .isLength({ min: 6 }).withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
];

const publicSelfRegisterValidator = [
    ...commonMilitaryRules,
    body('password')
        .optional()
        .isLength({ min: 6 }).withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
];

const updateTeacherValidator = [
    body('fullNameEng').optional().customSanitizer(sanitizeClean).matches(ENG_NAME_REGEX),
    body('fullNameBng').optional().customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX),
    body('fathersNameEng').optional().customSanitizer(sanitizeClean).matches(ENG_NAME_REGEX),
    body('fathersNameBng').optional().customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX),
    body('mothersNameEng').optional().customSanitizer(sanitizeClean).matches(ENG_NAME_REGEX),
    body('mothersNameBng').optional().customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX),
    body('phone').optional().customSanitizer(sanitizeClean).matches(BD_PHONE_REGEX),
    body('designation').optional().isIn(DESIGNATIONS),
    body('bloodGroup').optional().isIn(BLOOD_GROUPS),
    body('basicSalary').optional().isFloat({ min: 0 })
];

module.exports = {
    createTeacherValidator,
    publicSelfRegisterValidator,
    updateTeacherValidator
};`,

    // ৫. Teacher Controller আপডেট (১০ সংখ্যার আইডি, অটো র‍্যাংকিং, পাবলিক রেজিস্ট্রেশন ও অ্যাডমিন অ্যাপ্রুভাল, এবং মাসিক কোটা ট্র্যাকিং)
    'src/controllers/teacher.controller.js': `const moment = require('moment-timezone');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const SalaryHistory = require('../models/SalaryHistory');
const LeaveRequest = require('../models/LeaveRequest');
const LoanAdvance = require('../models/LoanAdvance');
const SystemSettings = require('../models/SystemSettings');
const AuditLog = require('../models/AuditLog');
const {
    ATTENDANCE_STATUS,
    DESIGNATION_DETAILS,
    BLOOD_GROUPS
} = require('../constants/system.constants');
const {
    generateTenDigitTeacherId,
    getNextAvailableBiometricId,
    recalculateAllTeachersRank,
    generateRegistryTokens
} = require('../services/teacher.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// ০. পদবীর তালিকা (বাংলা ও ইংরেজি সহ) এবং মেটাডেটা পাওয়ার এন্ডপয়েন্ট
const getRegistrationMetadata = asyncHandler(async (req, res) => {
    const nextBioId = await getNextAvailableBiometricId();
    res.status(200).json(new ApiResponse(200, {
        designations: DESIGNATION_DETAILS,
        bloodGroups: BLOOD_GROUPS,
        defaultAddress: {
            postOffice: 'Sarafbhata',
            postCode: '4360',
            upazila: 'Rangunia',
            district: 'Chittagong'
        },
        nextSuggestedBiometricDeviceId: nextBioId
    }, 'রেজিস্ট্রেশন মেটাডেটা সফলভাবে পাওয়া গেছে'));
});

// ১. অ্যাডমিন কর্তৃক নতুন শিক্ষক/স্টাফ নিবন্ধন (সরাসরি Approved)
const registerTeacher = asyncHandler(async (req, res) => {
    const {
        teacherCode,
        biometricDeviceId,
        phone,
        nidNumber,
        birthRegNumber,
        email,
        indexNumber,
        dateOfBirth,
        joiningDate,
        designation
    } = req.body;

    // ডুপ্লিকেট চেক (ফোন, এনআইডি, জন্ম নিবন্ধন, ইমেইল, ইনডেক্স নম্বর)
    const orConditions = [{ phone }];
    if (nidNumber) orConditions.push({ nidNumber });
    if (birthRegNumber) orConditions.push({ birthRegNumber });
    if (email) orConditions.push({ email });
    if (indexNumber) orConditions.push({ indexNumber });

    const existingDuplicate = await Teacher.findOne({ $or: orConditions });
    if (existingDuplicate) {
        throw new ApiError(409, 'প্রদত্ত মোবাইল নম্বর, NID, জন্ম নিবন্ধন অথবা ইনডেক্স নম্বর দিয়ে ইতিমধ্যে একজন শিক্ষক নিবন্ধিত আছেন!');
    }

    // ১০ সংখ্যার টিচার আইডি ও বায়োমেট্রিক ডিভাইস আইডি অটো-জেনারেশন (যদি না দেওয়া থাকে)
    const finalTeacherCode = teacherCode || await generateTenDigitTeacherId(joiningDate, dateOfBirth, designation);
    const finalBiometricId = biometricDeviceId ? Number(biometricDeviceId) : await getNextAvailableBiometricId();

    const bioConflict = await Teacher.findOne({
        $or: [{ teacherCode: finalTeacherCode }, { biometricDeviceId: finalBiometricId }]
    });
    if (bioConflict) {
        throw new ApiError(409, \`টিচার আইডি (\${finalTeacherCode}) অথবা বায়োমেট্রিক আইডি (\${finalBiometricId}) ইতিমধ্যে ব্যবহৃত হয়েছে!\`);
    }

    const { uid, editToken } = generateRegistryTokens();

    const teacher = await Teacher.create({
        ...req.body,
        teacherCode: finalTeacherCode,
        biometricDeviceId: finalBiometricId,
        uid,
        editToken,
        password: req.body.password || finalTeacherCode, // পাসওয়ার্ড না দিলে ১০ সংখ্যার আইডিটিই ডিফল্ট পাসওয়ার্ড হবে
        registrationStatus: 'Approved',
        isActive: true
    });

    // সমগ্র মাদ্রাসার র‍্যাংকিং (1, 2, 3...) পুনরায় সাজানো
    await recalculateAllTeachersRank();
    const updatedTeacher = await Teacher.findById(teacher._id);

    await AuditLog.recordLog({
        req,
        action: 'REGISTER_TEACHER',
        module: 'Teacher',
        targetId: String(teacher._id),
        description: \`নতুন শিক্ষক নিবন্ধিত হয়েছেন: \${teacher.fullNameBng} (ID: \${finalTeacherCode}, Rank: #\${updatedTeacher.rankingMetrics.overallMadrasahRank})\`
    });

    res.status(201).json(new ApiResponse(201, updatedTeacher, 'শিক্ষক সফলভাবে নিবন্ধিত হয়েছেন এবং র‍্যাংক নির্ধারিত হয়েছে!'));
});

// ২. পাবলিক সেল্ফ-রেজিস্ট্রেশন (লিংক থেকে শিক্ষক নিজে ফর্ম পূরণ করলে Pending মোডে থাকবে এবং ডিজিটাল আইডি কার্ড পাবে)
const publicSelfRegisterTeacher = asyncHandler(async (req, res) => {
    const {
        phone,
        nidNumber,
        birthRegNumber,
        email,
        dateOfBirth,
        joiningDate,
        designation
    } = req.body;

    const orConditions = [{ phone }];
    if (nidNumber) orConditions.push({ nidNumber });
    if (birthRegNumber) orConditions.push({ birthRegNumber });
    if (email) orConditions.push({ email });

    const existingDuplicate = await Teacher.findOne({ $or: orConditions });
    if (existingDuplicate) {
        throw new ApiError(409, 'প্রদত্ত মোবাইল নম্বর, NID অথবা জন্ম নিবন্ধন নম্বর দিয়ে ইতিমধ্যে নিবন্ধন করা হয়েছে!');
    }

    const finalTeacherCode = await generateTenDigitTeacherId(joiningDate, dateOfBirth, designation);
    const finalBiometricId = await getNextAvailableBiometricId();
    const { uid, editToken } = generateRegistryTokens();

    const teacher = await Teacher.create({
        ...req.body,
        teacherCode: finalTeacherCode,
        biometricDeviceId: finalBiometricId,
        uid,
        editToken,
        basicSalary: 0, // অ্যাডমিন অ্যাপ্রুভ করার সময় মূল বেতন বসাবেন
        password: req.body.password || finalTeacherCode,
        registrationStatus: 'Pending',
        isActive: false
    });

    res.status(201).json(new ApiResponse(201, {
        teacherId: teacher.teacherCode,
        uid: teacher.uid,
        editToken,
        registrationStatus: teacher.registrationStatus,
        teacher
    }, 'আপনার নিবন্ধন সফলভাবে জমা হয়েছে এবং ডিজিটাল রেজিস্ট্রি কার্ড তৈরি হয়েছে!'));
});

// ৩. UID দিয়ে পাবলিক রেজিস্ট্রি কার্ড দেখা (আপনার আগের HTML ফর্মের Returning-user check এর জন্য)
const getPublicRegistryCardByUid = asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const teacher = await Teacher.findOne({ uid }).lean();
    if (!teacher) {
        throw new ApiError(404, 'এই UID দিয়ে কোনো নিবন্ধিত রেকর্ড পাওয়া যায়নি!');
    }
    res.status(200).json(new ApiResponse(200, teacher, 'রেজিস্ট্রি কার্ড সফলভাবে লোড হয়েছে'));
});

// ৪. অ্যাডমিন কর্তৃক Pending শিক্ষকের রেজিস্ট্রেশন অনুমোদন ও মূল বেতন নির্ধারণ
const approvePendingTeacher = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { basicSalary, biometricDeviceId, customLeaveQuota, paymentMethod } = req.body;

    if (basicSalary === undefined || Number(basicSalary) < 0) {
        throw new ApiError(400, 'অনুমোদনের সময় শিক্ষকের মূল বেতন (basicSalary) প্রদান করা আবশ্যক!');
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }

    teacher.basicSalary = Number(basicSalary);
    if (biometricDeviceId) teacher.biometricDeviceId = Number(biometricDeviceId);
    if (customLeaveQuota !== undefined) teacher.customLeaveQuota = Number(customLeaveQuota);
    if (paymentMethod) teacher.paymentMethod = paymentMethod;
    teacher.registrationStatus = 'Approved';
    teacher.isActive = true;

    await teacher.save();
    await recalculateAllTeachersRank();

    const updated = await Teacher.findById(id);

    await AuditLog.recordLog({
        req,
        action: 'APPROVE_TEACHER_REGISTRATION',
        module: 'Teacher',
        targetId: String(teacher._id),
        description: \`\${teacher.fullNameBng}-এর নিবন্ধন অনুমোদন করা হয়েছে (বেতন: \${basicSalary} টাকা, Rank: #\${updated.rankingMetrics.overallMadrasahRank})\`
    });

    res.status(200).json(new ApiResponse(200, updated, 'শিক্ষকের নিবন্ধন অনুমোদিত হয়েছে এবং র‍্যাংক নির্ধারিত হয়েছে!'));
});

// ৫. সকল শিক্ষক/স্টাফের তালিকা (র‍্যাংক অনুযায়ী সাজানো: সুপার ১, সহ-সুপার ২...)
const getAllTeachers = asyncHandler(async (req, res) => {
    const { isActive, designation, staffCategory, registrationStatus, search } = req.query;
    const filter = {};

    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (designation) filter.designation = designation;
    if (staffCategory) filter.staffCategory = staffCategory;
    if (registrationStatus) filter.registrationStatus = registrationStatus;

    if (search) {
        filter.$or = [
            { fullNameBng: { $regex: search, $options: 'i' } },
            { fullNameEng: { $regex: search, $options: 'i' } },
            { teacherCode: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ];
    }

    const teachers = await Teacher.find(filter)
        .sort({
            'rankingMetrics.overallMadrasahRank': 1,
            'rankingMetrics.designationPriority': 1,
            biometricDeviceId: 1
        })
        .lean();

    res.status(200).json(new ApiResponse(200, {
        totalCount: teachers.length,
        teachers
    }, 'র‍্যাংক অনুযায়ী শিক্ষকদের তালিকা সফলভাবে পাওয়া গেছে'));
});

// ৬. এক ক্লিকে সবার র‍্যাংকিং পুনরায় ক্যালকুলেট করার এন্ডপয়েন্ট
const triggerRankRecalculation = asyncHandler(async (req, res) => {
    const totalRanked = await recalculateAllTeachersRank();
    res.status(200).json(new ApiResponse(200, { totalRanked }, 'সকল শিক্ষকের পদবী, শিক্ষাগত যোগ্যতা ও GPA অনুযায়ী র‍্যাংকিং সফলভাবে আপডেট করা হয়েছে!'));
});

// ৭. একক শিক্ষকের বিস্তারিত প্রোফাইল
const getTeacherById = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id).lean();
    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }
    res.status(200).json(new ApiResponse(200, teacher, 'শিক্ষকের তথ্য পাওয়া গেছে'));
});

// ৮. শিক্ষকের তথ্য আপডেট এবং স্বয়ংক্রিয় র‍্যাংক পুনর্বিন্যাস
const updateTeacher = asyncHandler(async (req, res) => {
    delete req.body.password;

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }

    Object.assign(teacher, req.body);
    await teacher.save();
    await recalculateAllTeachersRank();

    const updated = await Teacher.findById(req.params.id);
    res.status(200).json(new ApiResponse(200, updated, 'শিক্ষকের তথ্য ও র‍্যাংক সফলভাবে আপডেট করা হয়েছে'));
});

// ৯. শিক্ষককে নিষ্ক্রিয়/সক্রিয় করা (Soft Deactivate)
const toggleTeacherActiveStatus = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }

    teacher.isActive = !teacher.isActive;
    if (!teacher.isActive && !teacher.resignationDate) {
        teacher.resignationDate = new Date();
    } else if (teacher.isActive) {
        teacher.resignationDate = null;
    }
    await teacher.save();
    await recalculateAllTeachersRank();

    res.status(200).json(new ApiResponse(200, teacher, \`শিক্ষকের অ্যাকাউন্ট এখন \${teacher.isActive ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'} করা হয়েছে\`));
});

// ১০. শিক্ষক পোর্টাল (Self-Service): নিজের পূর্ণাঙ্গ ড্যাশবোর্ড এবং মাসের কোটা কতদিন খেয়েছে ও কতদিন বাকি আছে তার নিখুঁত হিসাব
const getMyPortalDashboard = asyncHandler(async (req, res) => {
    const teacherId = req.user._id;
    const now = moment.tz('Asia/Dhaka');
    const month = Number(req.query.month || (now.month() + 1));
    const year = Number(req.query.year || now.year());
    const todayStr = now.format('YYYY-MM-DD');

    const startDate = moment.tz(\`\${year}-\${String(month).padStart(2, '0')}-01\`, 'Asia/Dhaka').startOf('month').format('YYYY-MM-DD');
    const endDate = moment.tz(\`\${year}-\${String(month).padStart(2, '0')}-01\`, 'Asia/Dhaka').endOf('month').format('YYYY-MM-DD');

    const settings = await SystemSettings.getSettings();

    const [
        teacherProfile,
        todayAttendance,
        monthlyLogs,
        allTimeSalaries,
        salaryRevisions,
        recentApplications,
        activeLoans
    ] = await Promise.all([
        Teacher.findById(teacherId).lean(),
        Attendance.findOne({ teacherId, date: todayStr }).lean(),
        Attendance.find({ teacherId, date: { $gte: startDate, $lte: endDate } }).sort({ date: -1 }).lean(),
        Salary.find({ teacherId }).sort({ year: -1, month: -1 }).lean(),
        SalaryHistory.find({ teacherId }).sort({ createdAt: -1 }).lean(),
        LeaveRequest.find({ teacherId }).sort({ createdAt: -1 }).limit(15).lean(),
        LoanAdvance.find({ teacherId, status: 'Active' }).lean()
    ]);

    let presentDays = 0;
    let lateDays = 0;
    let leaveDays = 0;
    let absentDays = 0;
    let quotaUsed = 0;
    let directPenaltyDays = 0;

    for (const log of monthlyLogs) {
        if (log.isIgnored) continue;
        if (
            log.status === ATTENDANCE_STATUS.PRESENT ||
            log.status === ATTENDANCE_STATUS.EXCUSED_LATE ||
            log.status === ATTENDANCE_STATUS.OFFICIAL_DUTY ||
            log.status === ATTENDANCE_STATUS.HOLIDAY_DUTY
        ) {
            presentDays++;
        } else if (log.status === ATTENDANCE_STATUS.LATE) {
            lateDays++;
            quotaUsed += log.deductionWeight;
        } else if (log.status === ATTENDANCE_STATUS.LEAVE) {
            leaveDays++;
            quotaUsed += log.deductionWeight;
        } else if (log.status === ATTENDANCE_STATUS.ABSENT) {
            absentDays++;
            directPenaltyDays += (log.directSalaryPenaltyDays || 1.0);
        }
    }

    const allowedQuota = teacherProfile.customLeaveQuota ?? settings.attendancePolicy.monthlyPaidLeaveQuota;
    const quotaRemaining = Math.max(0, Number((allowedQuota - quotaUsed).toFixed(2)));
    const excessQuotaCutDays = Math.max(0, Number((quotaUsed - allowedQuota).toFixed(2)));
    const totalDaysForSalaryCut = Number((excessQuotaCutDays + directPenaltyDays).toFixed(2));

    const daysInSelectedMonth = settings.payrollPolicy?.useExactCalendarDays !== false
        ? moment.tz(\`\${year}-\${String(month).padStart(2, '0')}-01\`, 'Asia/Dhaka').daysInMonth()
        : (settings.payrollPolicy?.daysInSalaryMonth || 30);
    const perDaySalary = Number((teacherProfile.basicSalary / daysInSelectedMonth).toFixed(2));
    const currentMonthEstimatedCut = Math.round(totalDaysForSalaryCut * (teacherProfile.basicSalary / daysInSelectedMonth));

    let lifetimeTotalEarned = 0;
    let lifetimeTotalPaidReceived = 0;
    let lifetimeTotalUnpaidPending = 0;
    let lifetimeTotalBonusEarned = 0;
    let lifetimeTotalLeaveAbsentCut = 0;

    for (const sal of allTimeSalaries) {
        lifetimeTotalEarned += sal.netPayableSalary;
        lifetimeTotalBonusEarned += (sal.bonusAmount || 0);
        lifetimeTotalLeaveAbsentCut += (sal.leaveAndAbsentDeductionAmount || 0);
        if (sal.paymentStatus === 'Paid') {
            lifetimeTotalPaidReceived += sal.netPayableSalary;
        } else {
            lifetimeTotalUnpaidPending += sal.netPayableSalary;
        }
    }

    res.status(200).json(new ApiResponse(200, {
        profile: teacherProfile,
        todayStatus: todayAttendance || {
            date: todayStr,
            status: 'Not Punched Yet',
            inTime: null
        },
        selectedMonthAttendance: {
            month,
            year,
            daysInSelectedMonth,
            presentDays,
            lateDays,
            leaveDays,
            absentDays,
            allowedQuota,
            quotaUsed: Number(quotaUsed.toFixed(2)),       // মাসের কোটা থেকে কতদিন খেয়েছে
            quotaRemaining,                                // মাসের কোটা থেকে আর কতদিন বাকি আছে
            excessQuotaCutDays,                            // কোটা শেষ হয়ে অতিরিক্ত কতদিন কেটেছে
            directPenaltyDays,
            totalDaysForSalaryCut,
            currentMonthEstimatedCut,
            logs: monthlyLogs
        },
        lifetimeFinancialSummary: {
            currentBasicSalary: teacherProfile.basicSalary,
            paymentMethod: teacherProfile.paymentMethod,
            perDaySalary,
            totalMonthsGenerated: allTimeSalaries.length,
            lifetimeTotalEarned,
            lifetimeTotalPaidReceived,
            lifetimeTotalUnpaidPending,
            lifetimeTotalBonusEarned,
            lifetimeTotalLeaveAbsentCut,
            activeLoans
        },
        salarySheets: allTimeSalaries,
        salaryRevisionHistory: salaryRevisions,
        myApplications: recentApplications
    }, 'শিক্ষকের সেল্ফ-সার্ভিস পোর্টাল ড্যাশবোর্ড সফলভাবে লোড হয়েছে'));
});

module.exports = {
    getRegistrationMetadata,
    registerTeacher,
    publicSelfRegisterTeacher,
    getPublicRegistryCardByUid,
    approvePendingTeacher,
    getAllTeachers,
    triggerRankRecalculation,
    getTeacherById,
    updateTeacher,
    toggleTeacherActiveStatus,
    getMyPortalDashboard
};`,

    // ৬. Salary Model আপডেট (মাসের কোটা থেকে কতদিন খেয়েছে এবং কতদিন বাকি আছে তা ডাটাবেসেও স্থায়ীভাবে সেভ রাখা)
    'src/models/Salary.js': fs.readFileSync(path.join(baseDir, 'src/models/Salary.js'), 'utf8')
        .replace(
            'allowedPaidQuota: { type: Number, default: 2.0 },\n        excessQuotaDays: { type: Number, default: 0 },',
            'allowedPaidQuota: { type: Number, default: 2.0 },\n        remainingPaidQuota: { type: Number, default: 2.0 }, // মাসের কোটা থেকে কতদিন বাকি আছে\n        excessQuotaDays: { type: Number, default: 0 },'
        ),

    // ৭. Payroll Service আপডেট (remainingPaidQuota সেভ করা)
    'src/services/payroll.service.js': fs.readFileSync(path.join(baseDir, 'src/services/payroll.service.js'), 'utf8')
        .replace(
            'const allowedPaidQuota = teacher.customLeaveQuota ?? attPolicy.monthlyPaidLeaveQuota;\n    const excessQuotaDays = Math.max(0, totalQuotaUsed - allowedPaidQuota);',
            'const allowedPaidQuota = teacher.customLeaveQuota ?? attPolicy.monthlyPaidLeaveQuota;\n    const remainingPaidQuota = Math.max(0, Number((allowedPaidQuota - totalQuotaUsed).toFixed(2)));\n    const excessQuotaDays = Math.max(0, Number((totalQuotaUsed - allowedPaidQuota).toFixed(2)));'
        )
        .replace(
            'allowedPaidQuota,\n                    excessQuotaDays,',
            'allowedPaidQuota,\n                    remainingPaidQuota,\n                    excessQuotaDays,'
        ),

    // ৮. Teacher Routes আপডেট (Public Self-Registration, Metadata, Approval এবং Rank Recalculation রাউট যুক্ত করা)
    'src/routes/teacher.routes.js': `const express = require('express');
const {
    getRegistrationMetadata,
    registerTeacher,
    publicSelfRegisterTeacher,
    getPublicRegistryCardByUid,
    approvePendingTeacher,
    getAllTeachers,
    triggerRankRecalculation,
    getTeacherById,
    updateTeacher,
    toggleTeacherActiveStatus,
    getMyPortalDashboard
} = require('../controllers/teacher.controller');
const {
    createTeacherValidator,
    publicSelfRegisterValidator,
    updateTeacherValidator
} = require('../validators/teacher.validator');
const validateRequest = require('../middlewares/validate.middleware');
const { verifyJWT, authorizeRoles } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/system.constants');

const router = express.Router();

// পাবলিক রাউট (শিক্ষক নিজে ফর্ম পূরণ ও ডিজিটাল রেজিস্ট্রি কার্ড দেখার জন্য)
router.get('/public/metadata', getRegistrationMetadata);
router.post('/public/self-register', publicSelfRegisterValidator, validateRequest, publicSelfRegisterTeacher);
router.get('/public/registry-card/:uid', getPublicRegistryCardByUid);

// প্রোটেক্টেড রাউট (লগইন আবশ্যক)
router.use(verifyJWT);

// শিক্ষক নিজে লগইন করে নিজের ড্যাশবোর্ড ও হিসাব দেখার রাউট
router.get('/my-portal/dashboard', getMyPortalDashboard);

// অ্যাডমিন কন্ট্রোল রাউটসমূহ
router.post('/recalculate-ranks', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), triggerRankRecalculation);
router.patch('/:id/approve', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), approvePendingTeacher);

router
    .route('/')
    .get(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAllTeachers)
    .post(
        authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
        createTeacherValidator,
        validateRequest,
        registerTeacher
    );

router
    .route('/:id')
    .get(getTeacherById)
    .patch(
        authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
        updateTeacherValidator,
        validateRequest,
        updateTeacher
    );

router.patch(
    '/:id/toggle-status',
    authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    toggleTeacherActiveStatus
);

module.exports = router;`,

    // ৯. Cloudinary Upload Controller আপডেট (500x500 Square ক্রপ ও ardm/teachers ফোল্ডারে শিক্ষকের ১০ সংখ্যার আইডি নামে ছবি সেভ)
    'src/controllers/upload.controller.js': fs.readFileSync(path.join(baseDir, 'src/controllers/upload.controller.js'), 'utf8')
        .replace(
            "folder: 'ardm_madrasah/teachers',",
            "folder: 'ardm/teachers',\n                public_id: teacher.teacherCode,"
        )
};

Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(baseDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
    console.log(`✅ Updated with Military-Grade Rules: ${filePath}`);
});

console.log('\n🎉 All Done! 10-Digit Teacher ID, Military Validation, Bilingual Parents, Cash Default & Auto-Ranking are live!');