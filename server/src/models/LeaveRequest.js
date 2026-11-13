const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true,
        index: true
    },
    // দরখাস্তের ধরন: ছুটি, লেট মওকুফ নাকি মাদ্রাসার কাজ
    applicationType: {
        type: String,
        enum: ['Casual Leave', 'Sick Leave', 'Late Excuse', 'Official Duty'],
        required: [true, 'আবেদনের ধরন (applicationType) উল্লেখ করা আবশ্যক'],
        index: true
    },
    startDate: {
        type: String, // Format: YYYY-MM-DD
        required: [true, 'শুরুর তারিখ (startDate) আবশ্যক'],
        index: true
    },
    endDate: {
        type: String, // Format: YYYY-MM-DD (১ দিনের লেট বা ছুটির ক্ষেত্রে startDate ও endDate একই হবে)
        required: [true, 'শেষের তারিখ (endDate) আবশ্যক']
    },
    // মাস শেষে ফিল্টার করার সুবিধার্থে স্বয়ংক্রিয়ভাবে মাস ও বছর সেভ থাকবে
    targetMonth: {
        type: Number,
        required: true,
        index: true
    },
    targetYear: {
        type: Number,
        required: true,
        index: true
    },
    totalDays: {
        type: Number,
        required: true,
        min: 1
    },
    reason: {
        type: String,
        required: [true, 'দরখাস্তের কারণ বিস্তারিত লেখা আবশ্যক'],
        trim: true
    },
    attachmentUrl: {
        type: String, // লিখিত দরখাস্তের ছবি বা মেডিকেল প্রেসক্রিপশন (যদি থাকে)
        default: null
    },
    // শিক্ষক নিজে অ্যাপ থেকে দিয়েছেন নাকি অফিসে কাগজে জমা দেওয়া দরখাস্ত অ্যাডমিন এন্ট্রি করেছেন
    submittedByRole: {
        type: String,
        enum: ['Teacher', 'Admin'],
        default: 'Teacher'
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
        index: true
    },
    // অ্যাডমিন অনুমোদন করার সময় নির্ধারণ করতে পারবেন এটি ২ দিনের পেইড কোটা থেকে কাটবে নাকি সম্পূর্ণ ফ্রি মওকুফ হবে
    approvalAction: {
        type: String,
        enum: ['COUNT_AS_LEAVE_QUOTA', 'FULLY_WAIVED_FREE', 'EXCUSE_LATE', 'OFFICIAL_DUTY', null],
        default: null
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    adminRemarks: {
        type: String,
        trim: true,
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
