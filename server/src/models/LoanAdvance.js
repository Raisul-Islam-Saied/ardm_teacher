const mongoose = require('mongoose');

const repaymentLogSchema = new mongoose.Schema({
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    amountDeducted: { type: Number, required: true },
    salaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Salary', default: null },
    deductedAt: { type: Date, default: Date.now }
}, { _id: false });

const loanAdvanceSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['Advance_Salary', 'Personal_Loan'],
        default: 'Advance_Salary'
    },
    totalAmount: {
        type: Number,
        required: [true, 'লোন বা অগ্রিম টাকার মোট পরিমাণ আবশ্যক'],
        min: [100, 'পরিমাণ কমপক্ষে ১০০ টাকা হতে হবে']
    },
    monthlyInstallment: {
        type: Number,
        required: [true, 'প্রতি মাসে বেতন থেকে কত টাকা কিস্তি (EMI) কাটা হবে তা আবশ্যক'],
        min: [1, 'কিস্তির পরিমাণ কমপক্ষে ১ টাকা হতে হবে']
    },
    totalPaidAmount: {
        type: Number,
        default: 0
    },
    remainingBalance: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Completed', 'Paused', 'Cancelled'],
        default: 'Active',
        index: true
    },
    reason: {
        type: String,
        required: [true, 'লোন বা অগ্রিম নেওয়ার কারণ উল্লেখ করা আবশ্যক'],
        trim: true
    },
    disbursedDate: {
        type: Date,
        default: Date.now
    },
    repaymentHistory: {
        type: [repaymentLogSchema],
        default: []
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('LoanAdvance', loanAdvanceSchema);
