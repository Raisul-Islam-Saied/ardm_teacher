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
    wardNo: { type: String, required: true, trim: true, match: /^\d{1,3}$/ },
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
        match: [/^\d{10}$/, 'স্টুডেন্ট আইডি অবশ্যই ১০ ডিজিটের সংখ্যা হতে হবে']
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
        match: [/^\d{17}$/, 'জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ ডিজিটের হতে হবে']
    },
    medicalNote: { type: String, trim: true, default: '', maxlength: 300 },

    admissionDate: { type: Date, required: true, default: Date.now },
    session: {
        type: String,
        required: [true, 'শিক্ষাবর্ষ (Session) আবশ্যক'],
        match: [/^20\d{2}$/, 'সেশন অবশ্যই ৪ ডিজিটের বৈধ সাল হতে হবে']
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
        match: [/^01[3-9]\d{8}$/, 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন']
    },
    emergencyContact: {
        contactName: { type: String, trim: true, default: '' },
        relationship: { type: String, trim: true, default: 'Guardian' },
        phone: {
            type: String,
            required: [true, 'জরুরি মোবাইল নম্বর আবশ্যক'],
            trim: true,
            match: [/^01[3-9]\d{8}$/, 'সঠিক ১১ ডিজিটের জরুরি মোবাইল নম্বর দিন']
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
