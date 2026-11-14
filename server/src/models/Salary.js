const mongoose = require('mongoose');
const { PAYMENT_STATUS } = require('../constants/system.constants');

const salarySchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2020, max: 2100 },
    basicSalarySnapshot: { type: Number, required: true },
    // মাসের মাঝখানে জয়েন বা রিজাইন করলে আনুপাতিক (Pro-Rata) বেতনের হিসাব
    proRataInfo: {
        isProRated: { type: Boolean, default: false },
        activeDaysInMonth: { type: Number, default: 30 },
        effectiveBasicSalary: { type: Number, required: true }
    },
    perDaySalary: { type: Number, required: true },
    attendanceBreakdown: {
        totalPresent: { type: Number, default: 0 },
        totalExcusedLateOrDuty: { type: Number, default: 0 },
        totalLateCount: { type: Number, default: 0 },
        totalLeaveCount: { type: Number, default: 0 },
        totalUnexcusedAbsentCount: { type: Number, default: 0 },
        totalApprovedLeaveCount: { type: Number, default: 0 },
        totalIgnoredDays: { type: Number, default: 0 },
        totalQuotaUsed: { type: Number, default: 0 },
        allowedPaidQuota: { type: Number, default: 2.0 },
        remainingPaidQuota: { type: Number, default: 2.0 }, // মাসের কোটা থেকে কতদিন বাকি আছে
        excessQuotaDays: { type: Number, default: 0 },
        directAbsentPenaltyDays: { type: Number, default: 0 },
        totalDeductibleDays: { type: Number, default: 0 }
    },
    leaveAndAbsentDeductionAmount: { type: Number, default: 0 },
    // অটোমেটিক লোন বা অগ্রিম বেতন কর্তন (EMI)
    loanDeduction: {
        loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanAdvance', default: null },
        installmentAmount: { type: Number, default: 0 },
        remainingAfterThisMonth: { type: Number, default: 0 }
    },
    includeBonus: { type: Boolean, default: false },
    bonusPercentage: { type: Number, default: 0 },
    bonusTitle: { type: String, trim: true, default: null },
    bonusAmount: { type: Number, default: 0 },
    customAdjustment: {
        mode: { type: String, default: null },
        value: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
        reason: { type: String, default: null }
    },
    extraAllowance: { type: Number, default: 0 },
    extraDeduction: { type: Number, default: 0 },
    adjustmentNote: { type: String, trim: true, default: null },
    netPayableSalary: { type: Number, required: true, min: 0 },
    paymentStatus: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING,
        index: true
    },
    paymentMethod: {
        type: String,
        enum: ['Bank_Transfer', 'Cash', 'bKash_Nagad'],
        default: 'Bank_Transfer'
    },
    transactionReference: { type: String, trim: true, default: null },
    paidAt: { type: Date, default: null },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null }
}, { timestamps: true, versionKey: false });

salarySchema.index({ teacherId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Salary', salarySchema);
