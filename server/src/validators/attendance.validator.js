const { body } = require('express-validator');
const { ATTENDANCE_STATUS } = require('../constants/system.constants');

const time24Regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const specialDateValidationRules = [
    body('date').trim().notEmpty().matches(dateRegex).withMessage('তারিখ YYYY-MM-DD ফরম্যাটে হতে হবে'),
    body('title').trim().notEmpty().withMessage('শিরোনাম আবশ্যক'),
    body('isHoliday').optional().isBoolean(),
    body('customInTime').optional().trim().matches(time24Regex).withMessage('ইন-টাইম HH:mm ফরম্যাটে দিন (যেমন 14:00)'),
    body('customLateLimit').optional().trim().matches(time24Regex)
];

const manualPunchValidationRules = [
    body('punchTime').optional().isISO8601()
];

const overrideAttendanceValidationRules = [
    body('teacherId').isMongoId(),
    body('date').matches(dateRegex),
    body('status').isIn(Object.values(ATTENDANCE_STATUS)),
    body('punchTime').optional().isISO8601()
];

module.exports = {
    specialDateValidationRules,
    manualPunchValidationRules,
    overrideAttendanceValidationRules
};
