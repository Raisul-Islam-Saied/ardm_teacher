const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
    setSpecialDateConfig,
    getSpecialDates,
    recordPunch,
    uploadUsbAttendanceLogs,
    excuseTeacherLateOrDuty,
    adminOverrideAttendance,
    getTeacherMonthlySummary,
    triggerEndOfDayAuditManually
} = require('../controllers/attendance.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validateRequest = require('../middlewares/validate.middleware');
const {
    specialDateValidationRules,
    manualPunchValidationRules,
    overrideAttendanceValidationRules
} = require('../validators/attendance.validator');
const { ROLES } = require('../constants/system.constants');

// পেনড্রাইভের .dat / .txt ফাইল রিড করার জন্য মেমোরি স্টোরেজ
const usbUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/punch', manualPunchValidationRules, validateRequest, recordPunch);

router.use(protect);
router.get('/my-summary', getTeacherMonthlySummary);

// পেনড্রাইভে এক্সপোর্ট করা ফাইল (.dat/.txt) ফ্রন্টএন্ড থেকে আপলোড করার রাউট
router.post(
    '/upload-usb-logs',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    usbUpload.single('file'),
    uploadUsbAttendanceLogs
);

// কেউ কল করে বলে দেরি হবে বা সকালে মাদ্রাসার কাজে গেলে লেট মওকুফ করার রাউট
router.post(
    '/excuse-late',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    excuseTeacherLateOrDuty
);

router.post('/special-date', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), specialDateValidationRules, validateRequest, setSpecialDateConfig);
router.get('/special-date', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), getSpecialDates);
router.put('/override', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), overrideAttendanceValidationRules, validateRequest, adminOverrideAttendance);
router.post('/run-daily-audit', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), triggerEndOfDayAuditManually);

module.exports = router;
