const mongoose = require('mongoose');

const specialDateSchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    isHoliday: { type: Boolean, default: false },
    customInTime: { type: String, default: '09:00', trim: true },
    customLateLimit: { type: String, default: '10:00', trim: true },
    ignoreThirtyPercentRule: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('SpecialDate', specialDateSchema);
