const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
    key: {
        type: String,
        default: 'GLOBAL_SETTINGS',
        unique: true
    },
    madrasahNameBng: {
        type: String,
        default: 'আবদুর রাজ্জাক দাখিল মাদ্রাসা'
    },
    madrasahNameEng: {
        type: String,
        default: 'Abdur Razzaq Dakhil Madrasah'
    },
    addressBng: {
        type: String,
        default: 'সরফভাটা, রাঙ্গুনিয়া, চট্টগ্রাম'
    },
    // ডায়নামিক হাজিরা পলিসি (রমজান বা যেকোনো সময় ড্যাশবোর্ড থেকে পরিবর্তনযোগ্য)
    attendancePolicy: {
        defaultInTime: { type: String, default: '09:00' },           // সকাল ৯:০০
        defaultLateLimit: { type: String, default: '10:00' },        // সকাল ১০:০০
        lateDeductionWeight: { type: Number, default: 0.5 },         // প্রতি লেটে ০.৫ দিন
        leaveDeductionWeight: { type: Number, default: 1.0 },        // প্রতি ছুটিতে ১.০ দিন
        absentPenaltyDays: { type: Number, default: 1.0 },           // বিনা অনুমতিতে Absent হলে ১ দিনের বেতন কর্তন
        monthlyPaidLeaveQuota: { type: Number, default: 2.0 },       // মাসে ২ দিন পেইড ছুটি
        autoIgnoreThresholdPercent: { type: Number, default: 30 },   // ৩০% এর নিচে উপস্থিতি হলে দিন বাদ
        weekendDays: { type: [Number], default: [5] }                // 5 = Friday (চাইলে [5, 6] করে শুক্র-শনি করা যাবে)
    },
    // ডায়নামিক পে-রোল পলিসি
    payrollPolicy: {
        defaultBonusPercent: { type: Number, default: 50 },          // ডিফল্ট উৎসব বোনাস ৫০%
        daysInSalaryMonth: { type: Number, default: 30 },            // বেতন ভাজক (৩০ দিন)
        enableProRataForMidMonthJoin: { type: Boolean, default: true }, // মাসের মাঝখানে জয়েন করলে আনুপাতিক বেতন
        autoDeductLoanInstallment: { type: Boolean, default: true }  // বেতন থেকে স্বয়ংক্রিয় লোন কিস্তি কর্তন
    },
    lastCronAuditDate: {
        type: String, // YYYY-MM-DD (সার্ভার বন্ধ থাকলে মিসড ক্রন ধরার জন্য)
        default: null
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

// ডাটাবেসে সেটিংস না থাকলে ডিফল্ট সেটিংস অটো তৈরি করে দেওয়ার হেল্পার মেথড
systemSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne({ key: 'GLOBAL_SETTINGS' }).lean();
    if (!settings) {
        const created = await this.create({ key: 'GLOBAL_SETTINGS' });
        settings = created.toObject();
    }
    return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
