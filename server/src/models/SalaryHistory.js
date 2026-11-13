const mongoose = require('mongoose');
const { SALARY_ADJUSTMENT_MODES } = require('../constants/system.constants');

const salaryHistorySchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true,
        index: true
    },
    previousSalary: {
        type: Number,
        required: true
    },
    adjustmentMode: {
        type: String,
        enum: Object.values(SALARY_ADJUSTMENT_MODES), // 'Increase ৳', 'Decrease ৳', 'Increase %', 'Decrease %'
        required: true
    },
    adjustmentValue: {
        type: Number,
        required: true,
        min: [0, 'অ্যাডজাস্টমেন্ট ভ্যালু ঋণাত্মক হতে পারে না']
    },
    changedAmount: {
        type: Number, // প্রকৃতপক্ষে কত টাকা বেড়েছে (+amount) বা কমেছে (-amount)
        required: true
    },
    newSalary: {
        type: Number,
        required: true,
        min: 0
    },
    effectiveDate: {
        type: Date,
        default: Date.now
    },
    reason: {
        type: String,
        required: [true, 'বেতন পরিবর্তনের কারণ উল্লেখ করা আবশ্যক'],
        trim: true
    },
    changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = mongoose.model('SalaryHistory', salaryHistorySchema);
