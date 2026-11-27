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
    studentPortal: {
        onlyAdminResults: { type: Boolean, default: true },
        maintenanceMode: { type: Boolean, default: false },
        resultPublishTime: { type: String, default: '2026-08-17T19:30:00+06:00' },
        classTeacherPermissions: {
            ownClass: {
                add: { type: Boolean, default: true },
                edit: { type: Boolean, default: true },
                delete: { type: Boolean, default: true },
                export: { type: Boolean, default: true }
            },
            otherClass: {
                add: { type: Boolean, default: false },
                edit: { type: Boolean, default: false },
                delete: { type: Boolean, default: false },
                export: { type: Boolean, default: false }
            }
        },
        nonClassTeacherPermissions: {
            add: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            export: { type: Boolean, default: false }
        }
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
