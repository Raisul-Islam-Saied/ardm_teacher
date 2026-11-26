const mongoose = require('mongoose');
const { ATTENDANCE_STATUS } = require('../constants/system.constants');

const attendanceSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    biometricDeviceId: { type: Number, required: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    punchTime: { type: Date, default: null },
    appliedInTime: { type: String, default: '09:00' },
    status: {
        type: String,
        enum: Object.values(ATTENDANCE_STATUS),
        required: true,
        index: true
    },
    // কোটা থেকে কতটুকু কাটবে (Present=0, Excused=0, Late=0.5, Leave=1.0, Absent=0 কারণ Absent সরাসরি বেতন কাটে)
    deductionWeight: { type: Number, default: 0, min: 0, max: 1 },
    // বিনা অনুমতিতে Absent থাকলে সরাসরি কত দিনের বেতন কাটা যাবে (কোটা থাকলেও মাফ নেই)
    directSalaryPenaltyDays: { type: Number, default: 0, min: 0, max: 1 },
    // Payroll engine-এর নতুন স্পষ্ট পৃথক হিসাব
    quotaDeduction: { type: Number, default: 0, min: 0 },
    salaryDeduction: { type: Number, default: 0, min: 0, max: 1 },
    // Admin বা bulk entry USB/Auto-Cron দ্বারা ওভাররাইট হবে না
    isManuallyEdited: { type: Boolean, default: false, index: true },
    isAutoMarked: { type: Boolean, default: false, index: true },
    lastImportedAt: { type: Date, default: null },
    // কেউ ফোন করে দেরির অনুমতি নিলে বা সকালে কাজে গেলে এটি true থাকবে
    isLateExcused: { type: Boolean, default: false },
    excuseNote: { type: String, trim: true, default: null },
    isIgnored: { type: Boolean, default: false, index: true },
    ignoreReason: { type: String, default: null },
    source: {
        type: String,
        enum: [
            'ZKTeco_Device',
            'USB_Pendrive_Upload',
            'Admin_Manual',
            'Admin_Bulk_Manual',
            'Auto_Cron_Job',
            'Leave_Approval'
        ],
        default: 'ZKTeco_Device'
    },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    remarks: { type: String, trim: true, default: null }
}, { timestamps: true, versionKey: false });

attendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });

attendanceSchema.pre('validate', function normalizePayrollDeductions(next) {
    if (this.status === 'Absent') {
        this.quotaDeduction = 0;
        this.deductionWeight = 0;
        this.salaryDeduction = 1;
        this.directSalaryPenaltyDays = 1;
    } else if (this.status === 'Present' || this.status === 'Holiday Duty' || this.status === 'Official Duty') {
        this.salaryDeduction = 0;
        if (this.status === 'Present') {
            this.quotaDeduction = this.deductionWeight || 0;
        } else {
            this.quotaDeduction = 0;
            this.deductionWeight = 0;
            this.directSalaryPenaltyDays = 0;
        }
    } else if (this.status === 'Late') {
        this.salaryDeduction = 0;
        this.quotaDeduction = this.deductionWeight || 0.5;
    } else if (this.status === 'Leave') {
        this.salaryDeduction = 0;
        this.quotaDeduction = this.deductionWeight || 1;
    }
    next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
