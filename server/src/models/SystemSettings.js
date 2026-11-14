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
    attendancePolicy: {
        defaultInTime: { type: String, default: '09:00' },
        defaultLateLimit: { type: String, default: '10:00' },
        lateDeductionWeight: { type: Number, default: 0.5 },
        leaveDeductionWeight: { type: Number, default: 1.0 },
        absentPenaltyDays: { type: Number, default: 1.0 },
        monthlyPaidLeaveQuota: { type: Number, default: 2.0 },
        autoIgnoreThresholdPercent: { type: Number, default: 30 },
        weekendDays: { type: [Number], default: [5] }
    },
    payrollPolicy: {
        defaultBonusPercent: { type: Number, default: 50 },
        useExactCalendarDays: { type: Boolean, default: true }, // true = ওই মাসে যত দিন (২৮/২৯/৩০/৩১) তত দিয়ে ভাগ হবে
        daysInSalaryMonth: { type: Number, default: 30 },       // ফিক্সড মোডে থাকলে তখন ৩০ কাজ করবে
        enableProRataForMidMonthJoin: { type: Boolean, default: true },
        autoDeductLoanInstallment: { type: Boolean, default: true }
    },
    lastCronAuditDate: {
        type: String,
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

systemSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne({ key: 'GLOBAL_SETTINGS' }).lean();
    if (!settings) {
        const created = await this.create({ key: 'GLOBAL_SETTINGS' });
        settings = created.toObject();
    }
    return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
