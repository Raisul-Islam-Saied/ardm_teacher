const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
    ROLES,
    GENDER,
    BLOOD_GROUPS,
    MARITAL_STATUS,
    EMPLOYMENT_TYPE
} = require('../constants/system.constants');

const academicQualificationSchema = new mongoose.Schema({
    examName: { type: String, required: true, trim: true },
    groupOrSubject: { type: String, required: true, trim: true },
    boardOrUniversity: { type: String, required: true, trim: true },
    passingYear: { type: Number, required: true, min: 1950, max: 2100 },
    result: { type: String, required: true, trim: true }
}, { _id: false });

const teacherSchema = new mongoose.Schema({
    teacherCode: {
        type: String,
        required: [true, 'শিক্ষকের প্রাতিষ্ঠানিক আইডি (যেমন: ARDM-01) আবশ্যক'],
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    biometricDeviceId: {
        type: Number,
        required: [true, 'ZKTeco মেশিনের বায়োমেট্রিক ইউজার আইডি আবশ্যক'],
        unique: true,
        min: [1, 'বায়োমেট্রিক আইডি কমপক্ষে ১ হতে হবে'],
        index: true
    },
    indexNumber: {
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        trim: true
    },
    profilePicture: {
        url: { type: String, default: 'https://res.cloudinary.com/demo/image/upload/v1/avatar_default.png' },
        publicId: { type: String, default: null }
    },
    fullNameEng: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    fullNameBng: { type: String, required: true, trim: true },
    fathersName: { type: String, required: true, trim: true },
    mothersName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: Object.values(GENDER), required: true },
    religion: { type: String, default: 'Islam', trim: true },
    bloodGroup: { type: String, enum: [...BLOOD_GROUPS, null], default: null },
    maritalStatus: { type: String, enum: Object.values(MARITAL_STATUS), default: MARITAL_STATUS.MARRIED },
    nidNumber: { type: String, required: true, unique: true, trim: true, index: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    altPhone: { type: String, trim: true, default: null },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    presentAddress: {
        villageOrStreet: { type: String, required: true, trim: true },
        postOffice: { type: String, required: true, trim: true },
        upazila: { type: String, required: true, trim: true, default: 'রাঙ্গুনিয়া' },
        district: { type: String, required: true, trim: true, default: 'চট্টগ্রাম' }
    },
    permanentAddress: {
        villageOrStreet: { type: String, required: true, trim: true },
        postOffice: { type: String, required: true, trim: true },
        upazila: { type: String, required: true, trim: true },
        district: { type: String, required: true, trim: true }
    },
    emergencyContact: {
        name: { type: String, required: true, trim: true },
        relation: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true }
    },
    academicQualifications: { type: [academicQualificationSchema], default: [] },
    designation: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    employmentType: { type: String, enum: Object.values(EMPLOYMENT_TYPE), default: EMPLOYMENT_TYPE.MPO },
    joiningDate: { type: Date, required: true },
    mpoDate: { type: Date, default: null },
    basicSalary: { type: Number, required: true, min: 0 },
    customLeaveQuota: { type: Number, default: 2.0, min: 0 },
    bankDetails: {
        bankName: { type: String, required: true, trim: true, default: 'Islami Bank Bangladesh PLC' },
        branchName: { type: String, required: true, trim: true },
        accountName: { type: String, required: true, trim: true },
        accountNumber: { type: String, required: true, trim: true, unique: true, sparse: true },
        routingNumber: { type: String, trim: true, default: null },
        mfsNumber: { type: String, trim: true, default: null }
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.TEACHER },
    passwordChangedAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },
    lastLogin: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
    resignationDate: { type: Date, default: null },
    remarks: { type: String, trim: true, default: null }
}, { timestamps: true, versionKey: false });

teacherSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
        const salt = await bcrypt.genSalt(saltRounds);
        this.password = await bcrypt.hash(this.password, salt);
        if (!this.isNew) {
            this.passwordChangedAt = Date.now() - 1000;
        }
        next();
    } catch (error) {
        next(error);
    }
});

teacherSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

teacherSchema.methods.isPasswordChangedAfterTokenIssued = function (jwtTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return jwtTimestamp < changedTimestamp;
    }
    return false;
};

module.exports = mongoose.model('Teacher', teacherSchema);
