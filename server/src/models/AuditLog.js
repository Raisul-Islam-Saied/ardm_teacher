const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        index: true // যেমন: 'SALARY_REVISION', 'SETTINGS_UPDATED', 'LOAN_CREATED', 'BACKUP_EXPORTED'
    },
    module: {
        type: String,
        required: true // 'Payroll', 'Attendance', 'System', 'Teacher'
    },
    description: {
        type: String,
        required: true
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null
    },
    targetTeacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null
    },
    ipAddress: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    versionKey: false
});

auditLogSchema.statics.recordLog = function ({ req, action, module, targetId, description, metadata = {} }) {
    return this.create({
        action,
        module,
        description,
        performedBy: req?.user?._id || null,
        targetTeacherId: targetId || null,
        ipAddress: req?.ip || null,
        metadata
    });
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
