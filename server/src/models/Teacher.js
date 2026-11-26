const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
    ROLES,
    EMPLOYMENT_TYPES,
    PAYMENT_METHODS,
    BLOOD_GROUPS,
    DESIGNATIONS,
    DESIGNATION_DETAILS,
    DEGREE_LEVEL_WEIGHTS,
    VALID_CLASS_BN
} = require('../constants/system.constants');

const emptyToUndefined = (value) => (
    value == null || (typeof value === 'string' && value.trim() === '')
        ? undefined
        : value
);

const normalizeEnglishName = (value) => {
    if (typeof value !== 'string') return value;
    const clean = value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!clean) return clean;
    return clean
        .toLowerCase()
        .replace(/(^|[\s.'-])([a-z])/g, (_, sep, char) => sep + char.toUpperCase());
};

const optionalUniqueString = () => ({
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    set: emptyToUndefined
});

const academicQualificationSchema = new mongoose.Schema({
    degreeLevel: {
        type: String,
        enum: Object.keys(DEGREE_LEVEL_WEIGHTS),
        required: [true, 'ডিগ্রির স্তর (যেমন: Kamil, Fazil, Masters, Honours, Alim, Dakhil) উল্লেখ করা আবশ্যক']
    },
    examTitle: { type: String, required: true, trim: true, maxlength: 100 },
    majorOrGroup: { type: String, trim: true, default: '', maxlength: 100 },
    boardOrUniversity: { type: String, required: true, trim: true, maxlength: 100 },
    rollNumber: { type: String, trim: true, default: '', maxlength: 50 },
    registrationNumber: { type: String, trim: true, default: '', maxlength: 50 },
    passingYear: { type: Number, required: true, min: 1960, max: 2050 },
    courseDuration: { type: String, trim: true, default: '', maxlength: 30 },
    resultType: {
        type: String,
        enum: ['GPA', 'CGPA', 'Division', 'Class', 'Passed'],
        default: 'GPA',
        required: true
    },
    resultGrade: {
        type: String,
        enum: ['First', 'Second', 'Third'],
        set: emptyToUndefined,
        required: function () {
            return ['Division', 'Class'].includes(this.resultType);
        }
    },
    gpaOrCgpa: {
        type: Number,
        required: function () {
            return ['GPA', 'CGPA'].includes(this.resultType);
        },
        validate: {
            validator(value) {
                if (!['GPA', 'CGPA'].includes(this.resultType)) return value == null;
                const scale = this.scale === 4 ? 4 : 5;
                return Number.isFinite(value) && value >= 1 && value <= scale;
            },
            message: 'GPA/CGPA নির্বাচিত স্কেলের সীমার মধ্যে হতে হবে'
        }
    },
    scale: { type: Number, enum: [4, 5], default: 5 }
}, { _id: false });

const employmentPeriodSchema = new mongoose.Schema({
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        default: null
    }
}, { _id: false });

const teacherSchema = new mongoose.Schema({
    // ১. ১০ সংখ্যার স্বয়ংক্রিয় ইউনিক টিচার আইডি ও বায়োমেট্রিক আইডি
    teacherCode: {
        type: String,
        required: [true, '১০ সংখ্যার টিচার আইডি আবশ্যক'],
        unique: true,
        trim: true,
        match: [/^\d{10}$/, 'টিচার আইডি অবশ্যই ১০ সংখ্যার ডিজিট হতে হবে']
    },
    uid: optionalUniqueString(),
    editToken: {
        type: String,
        select: false
    },
    biometricDeviceId: {
        type: Number,
        required: [true, 'বায়োমেট্রিক মেশিন আইডি (Device User ID) আবশ্যক'],
        unique: true,
        min: [1, 'বায়োমেট্রিক আইডি কমপক্ষে ১ হতে হবে']
    },
    indexNumber: optionalUniqueString(),

    // ২. ব্যক্তিগত তথ্য (বাংলা ও ইংরেজি উভয় ভাষায়)
    fullNameBng: {
        type: String,
        required: [true, 'শিক্ষকের বাংলা নাম আবশ্যক'],
        trim: true
    },
    fullNameEng: {
        type: String,
        required: [true, 'শিক্ষকের ইংরেজি নাম আবশ্যক'],
        trim: true,
        set: normalizeEnglishName
    },
    fathersNameBng: {
        type: String,
        required: [true, 'পিতার বাংলা নাম আবশ্যক'],
        trim: true
    },
    fathersNameEng: {
        type: String,
        required: [true, 'পিতার ইংরেজি নাম আবশ্যক'],
        trim: true,
        set: normalizeEnglishName
    },
    mothersNameBng: {
        type: String,
        required: [true, 'মাতার বাংলা নাম আবশ্যক'],
        trim: true
    },
    mothersNameEng: {
        type: String,
        required: [true, 'মাতার ইংরেজি নাম আবশ্যক'],
        trim: true,
        set: normalizeEnglishName
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'জন্ম তারিখ আবশ্যক']
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        set: emptyToUndefined
    },
    religion: {
        type: String,
        enum: ['Islam', 'Hinduism', 'Buddhism', 'Christianity', 'Other'],
        set: emptyToUndefined
    },
    bloodGroup: {
        type: String,
        enum: BLOOD_GROUPS,
        set: emptyToUndefined
    },
    maritalStatus: {
        type: String,
        enum: ['Single', 'Married', 'Widowed', 'Divorced'],
        set: emptyToUndefined
    },

    // ৩. পরিচয়পত্র (NID অথবা জন্ম নিবন্ধন)
    nidNumber: optionalUniqueString(),
    birthRegNumber: optionalUniqueString(),

    // ৪. যোগাযোগ ও জরুরি যোগাযোগ
    phone: {
        type: String,
        required: [true, 'সচল মোবাইল নম্বর আবশ্যক'],
        unique: true,
        trim: true
    },
    email: {
        ...optionalUniqueString(),
        lowercase: true
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

    // ৫. ঠিকানা
    presentAddress: {
        houseNameBn: { type: String, trim: true, default: '', maxlength: 80 },
        houseNameEn: { type: String, trim: true, default: '', maxlength: 80 },
        villageBn: { type: String, trim: true, default: '', maxlength: 80 },
        villageEn: { type: String, trim: true, default: '', maxlength: 80 },
        unionBn: { type: String, trim: true, default: '', maxlength: 80 },
        unionEn: { type: String, trim: true, default: '', maxlength: 80 },
        wardNo: { type: String, trim: true, default: '', maxlength: 20 },
        upazilaBn: { type: String, trim: true, default: '', maxlength: 80 },
        upazilaEn: { type: String, trim: true, default: '', maxlength: 80 },
        districtBn: { type: String, trim: true, default: '', maxlength: 80 },
        districtEn: { type: String, trim: true, default: '', maxlength: 80 },
        divisionBn: { type: String, trim: true, default: '', maxlength: 80 },
        divisionEn: { type: String, trim: true, default: '', maxlength: 80 },
        houseOrRoad: { type: String, required: [true, 'বাড়ি বা রাস্তার নাম আবশ্যক'], trim: true },
        village: { type: String, required: [true, 'গ্রামের নাম আবশ্যক'], trim: true },
        postOffice: { type: String, trim: true, default: '' },
        postCode: { type: String, trim: true, default: '' },
        upazila: { type: String, trim: true, default: '' },
        district: { type: String, trim: true, default: '' }
    },
    permanentAddress: {
        houseNameBn: { type: String, trim: true, default: '', maxlength: 80 },
        houseNameEn: { type: String, trim: true, default: '', maxlength: 80 },
        villageBn: { type: String, trim: true, default: '', maxlength: 80 },
        villageEn: { type: String, trim: true, default: '', maxlength: 80 },
        unionBn: { type: String, trim: true, default: '', maxlength: 80 },
        unionEn: { type: String, trim: true, default: '', maxlength: 80 },
        wardNo: { type: String, trim: true, default: '', maxlength: 20 },
        upazilaBn: { type: String, trim: true, default: '', maxlength: 80 },
        upazilaEn: { type: String, trim: true, default: '', maxlength: 80 },
        districtBn: { type: String, trim: true, default: '', maxlength: 80 },
        districtEn: { type: String, trim: true, default: '', maxlength: 80 },
        divisionBn: { type: String, trim: true, default: '', maxlength: 80 },
        divisionEn: { type: String, trim: true, default: '', maxlength: 80 },
        houseOrRoad: { type: String, trim: true, default: '' },
        village: { type: String, trim: true, default: '' },
        postOffice: { type: String, trim: true, default: '' },
        postCode: { type: String, trim: true, default: '' },
        upazila: { type: String, trim: true, default: '' },
        district: { type: String, trim: true, default: '' }
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
    },
    employmentType: {
        type: String,
        enum: Object.values(EMPLOYMENT_TYPES),
        default: EMPLOYMENT_TYPES.NON_MPO
    },
    joiningDate: {
        type: Date,
        required: [true, 'মাদ্রাসায় যোগদানের তারিখ আবশ্যক']
    },
    resignationDate: {
        type: Date,
        default: null
    },
    employmentHistory: {
        type: [employmentPeriodSchema],
        default: []
    },

    // ৭. শিক্ষাগত যোগ্যতা ও অটো-র‍্যাংকিং স্কোর
    academicQualifications: {
        type: [academicQualificationSchema],
        default: []
    },
    rankingMetrics: {
        designationPriority: { type: Number, default: 15 },
        highestDegreeWeight: { type: Number, default: 0 },
        highestDegreeNormalizedGpa: { type: Number, default: 0 },
        averageNormalizedGpa: { type: Number, default: 0 },
        compositeRankScore: { type: Number, default: 0 },
        overallMadrasahRank: { type: Number, default: null }
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
        bankName: { type: String, default: '', trim: true },
        branchName: { type: String, trim: true, default: '' },
        accountHolderName: { type: String, trim: true, default: '' },
        accountNumber: { type: String, trim: true, default: '' },
        routingNumber: { type: String, trim: true, default: '' }
    },
    customLeaveQuota: {
        type: Number,
        default: 2.0,
        min: [0, 'ছুটির কোটা ০ এর কম হতে পারবে না'],
        max: [15, 'ছুটির কোটা ১৫ এর বেশি হতে পারবে না']
    },

    // ৯. প্রোফাইল ছবি (500x500 Square in Cloudinary ardm/teachers)
    profilePicture: {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' }
    },

    // ১০. সিকিউরিটি, রোল ও অ্যাকাউন্ট স্ট্যাটাস
    password: {
        type: String,
        required: [true, 'পাসওয়ার্ড আবশ্যক'],
        minlength: [6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'],
        select: false
    },
    passwordChangedAt: {
        type: Date,
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
    versionKey: false,
    toJSON: {
        transform: (_, ret) => {
            delete ret.password;
            delete ret.editToken;
            delete ret.passwordChangedAt;
            delete ret.failedLoginAttempts;
            delete ret.lockUntil;
            return ret;
        }
    },
    toObject: {
        transform: (_, ret) => {
            delete ret.password;
            delete ret.editToken;
            delete ret.passwordChangedAt;
            delete ret.failedLoginAttempts;
            delete ret.lockUntil;
            return ret;
        }
    }
});

// দ্রুত সর্টিং ও ফিল্টারিংয়ের জন্য কম্পাউন্ড ইনডেক্স
teacherSchema.index({
    'rankingMetrics.overallMadrasahRank': 1,
    'rankingMetrics.designationPriority': 1,
    biometricDeviceId: 1
});
teacherSchema.index({ isActive: 1, registrationStatus: 1 });

// ভ্যালিডেশনের আগে বাংলা পদবী, স্টাফ ক্যাটাগরি ও র‍্যাংকিং মেট্রিক্স হিসাব করা
teacherSchema.pre('validate', function (next) {
    if (this.assignedClass) {
        this.assignedClass = this.assignedClass.replace(/\u09DF/g, '\u09AF\u09BC');
    } else {
        this.assignedClass = '';
        this.canEditAssignedClass = false;
    }

    if (
        this.registrationStatus === 'Approved'
        && this.isActive !== false
        && this.employmentHistory.length === 0
        && this.joiningDate
    ) {
        this.employmentHistory.push({ startDate: this.joiningDate, endDate: null });
    }

    const desigInfo = DESIGNATION_DETAILS.find((d) => d.titleEng === this.designation)
        || DESIGNATION_DETAILS[DESIGNATION_DETAILS.length - 1];

    this.designationBng = desigInfo.titleBng;
    this.staffCategory = desigInfo.staffCategory;

    let maxWeight = 0;
    let bestGpaNormalized = 0;
    let totalNormalizedGpa = 0;
    let rankedQualificationCount = 0;

    if (Array.isArray(this.academicQualifications) && this.academicQualifications.length > 0) {
        for (const q of this.academicQualifications) {
            if (!['GPA', 'CGPA'].includes(q.resultType || 'GPA') || !Number.isFinite(q.gpaOrCgpa)) {
                continue;
            }

            const weight = DEGREE_LEVEL_WEIGHTS[q.degreeLevel] || 0;
            const normalizedGpa = q.scale === 4
                ? Number(((q.gpaOrCgpa / 4) * 5).toFixed(3))
                : Number(q.gpaOrCgpa.toFixed(3));

            totalNormalizedGpa += normalizedGpa;
            rankedQualificationCount += 1;

            if (weight > maxWeight || (weight === maxWeight && normalizedGpa > bestGpaNormalized)) {
                maxWeight = weight;
                bestGpaNormalized = normalizedGpa;
            }
        }
    }

    const avgGpa = rankedQualificationCount > 0
        ? Number((totalNormalizedGpa / rankedQualificationCount).toFixed(3))
        : 0;

    if (!this.rankingMetrics) {
        this.rankingMetrics = {};
    }
    this.rankingMetrics.designationPriority = desigInfo.rankPriority;
    this.rankingMetrics.highestDegreeWeight = maxWeight;
    this.rankingMetrics.highestDegreeNormalizedGpa = bestGpaNormalized;
    this.rankingMetrics.averageNormalizedGpa = avgGpa;
    this.rankingMetrics.compositeRankScore = Number(
        ((16 - desigInfo.rankPriority) * 1000 + (maxWeight * 50) + (bestGpaNormalized * 10) + avgGpa).toFixed(3)
    );

    next();
});

// সেভ হওয়ার আগে পাসওয়ার্ড হ্যাশিং ও passwordChangedAt আপডেট (ভ্যালিডেশনের পর)
teacherSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    if (!this.isNew) {
        this.passwordChangedAt = new Date(Date.now() - 1000);
    }

    next();
});

teacherSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

teacherSchema.methods.isPasswordChangedAfterTokenIssued = function (tokenIssuedAt) {
    if (!this.passwordChangedAt) return false;
    return Math.floor(this.passwordChangedAt.getTime() / 1000) > tokenIssuedAt;
};

module.exports = mongoose.model('Teacher', teacherSchema);