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
        match: [/^d{10}$/, 'টিচার আইডি অবশ্যই ১০ সংখ্যার ডিজিট হতে হবে']
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

module.exports = mongoose.model('Teacher', teacherSchema);
