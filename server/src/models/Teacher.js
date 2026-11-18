const mongoose = require('mongoose');
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

const optionalUniqueString = () => ({
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    set: (value) => (
        value == null || (typeof value === 'string' && value.trim() === '')
            ? undefined
            : value
    )
});

const academicQualificationSchema = new mongoose.Schema({
    degreeLevel: {
        type: String,
        enum: Object.keys(DEGREE_LEVEL_WEIGHTS),
        required: [true, 'ডিগ্রির স্তর (যেমন: Kamil, Fazil, Masters, Honours, Alim, Dakhil) উল্লেখ করা আবশ্যক']
    },
    examTitle: { type: String, required: true, trim: true }, // যেমন: কামিল (হাদিস), বি.এসসি (অনার্স)
    majorOrGroup: { type: String, trim: true, default: '' },
    boardOrUniversity: { type: String, required: true, trim: true },
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
    // ১. ১০ সংখ্যার স্বয়ংক্রিয় ইউনিক টিচার আইডি (যেমন: 1026030301) ও বায়োমেট্রিক আইডি
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
        required: [true, 'বায়োমেট্রিক মেশিন আইডি (Device User ID) আবশ্যক'],
        unique: true,
        min: [1, 'বায়োমেট্রিক আইডি কমপক্ষে ১ হতে হবে']
    },
    indexNumber: optionalUniqueString(),

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
        enum: ['Male', 'Female', 'Other']
    },
    religion: {
        type: String,
        enum: ['Islam', 'Hinduism', 'Buddhism', 'Christianity', 'Other']
    },
    bloodGroup: {
        type: String,
        enum: BLOOD_GROUPS
    },
    maritalStatus: {
        type: String,
        enum: ['Single', 'Married', 'Widowed', 'Divorced']
    },

    // ৩. পরিচয়পত্র (NID অথবা জন্ম নিবন্ধন - যেকোনো একটি বাধ্যতামূলক)
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
        houseOrRoad: { type: String, required: [true, 'বাড়ি বা রাস্তার নাম আবশ্যক'], trim: true },
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
        bankName: { type: String, default: '', trim: true },
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
    versionKey: false
});

// সেভ হওয়ার আগে বাংলা পদবী, স্টাফ ক্যাটাগরি এবং র‍্যাংকিং মেট্রিক্স স্বয়ংক্রিয়ভাবে হিসাব করা
teacherSchema.pre('validate', async function (next) {
    if (
        this.registrationStatus === 'Approved'
        && this.isActive !== false
        && this.employmentHistory.length === 0
        && this.joiningDate
    ) {
        this.employmentHistory.push({ startDate: this.joiningDate, endDate: null });
    }

    // ১. পদবীর বাংলা নাম ও বেস র‍্যাংক সেট করা
    const desigInfo = DESIGNATION_DETAILS.find(d => d.titleEng === this.designation)
        || DESIGNATION_DETAILS[DESIGNATION_DETAILS.length - 1];

    this.designationBng = desigInfo.titleBng;
    this.staffCategory = desigInfo.staffCategory;

    // ২. শিক্ষাগত যোগ্যতা ও GPA/CGPA বিশ্লেষণ করে র‍্যাংকিং স্কোর তৈরি করা
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
            // ৪ স্কেলের CGPA হলে সেটিকে ৫ স্কেলের সমমান করে তুলনা করা যেন GPA ও CGPA-এর মধ্যে নিখুঁত বিচার হয়
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

teacherSchema.methods.isPasswordChangedAfterTokenIssued = function (tokenIssuedAt) {
    if (!this.passwordChangedAt) return false;
    return Math.floor(this.passwordChangedAt.getTime() / 1000) > tokenIssuedAt;
};

teacherSchema.pre('validate', function (next) {
    if (!this.isNew && this.isModified('password')) {
        this.passwordChangedAt = new Date(Date.now() - 1000);
    }
    next();
});

module.exports = mongoose.model('Teacher', teacherSchema);
