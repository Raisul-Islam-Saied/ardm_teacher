const mongoose = require('mongoose');

const attendanceDaySchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true, trim: true, index: true },
    dayType: {
        type: String,
        enum: ['WORKDAY', 'HOLIDAY', 'MACHINE_OFF', 'OPEN_OVERRIDE'],
        required: true,
        default: 'WORKDAY',
        index: true
    },
    reason: { type: String, trim: true, default: null },
    isAutoResolved: { type: Boolean, default: false },
    attendancePercentage: { type: Number, default: null, min: 0, max: 100 },
    activeTeacherCount: { type: Number, default: 0, min: 0 },
    punchedTeacherCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('AttendanceDay', attendanceDaySchema);
