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
    // কেউ ফোন করে দেরির অনুমতি নিলে বা সকালে কাজে গেলে এটি true থাকবে
    isLateExcused: { type: Boolean, default: false },
    excuseNote: { type: String, trim: true, default: null },
    isIgnored: { type: Boolean, default: false, index: true },
    ignoreReason: { type: String, default: null },
    source: {
        type: String,
        enum: ['ZKTeco_Device', 'USB_Pendrive_Upload', 'Admin_Manual', 'Auto_Cron_Job', 'Leave_Approval'],
        default: 'ZKTeco_Device'
    },
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    remarks: { type: String, trim: true, default: null }
}, { timestamps: true, versionKey: false });

attendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
