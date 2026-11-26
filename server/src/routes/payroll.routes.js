const express = require('express');
const router = express.Router();
const {
    reviseBasicSalaryBulkOrSingle,
    adjustMonthlyPayrollBulkOrSingle,
    getSalaryRevisionHistory,
    generateMonthlyPayroll,
    confirmMonthlyPayrollSheet,
    getMonthlySalaries,
    getSavedPayrollPeriods,
    deleteMonthlyPayrollSheet,
    getMonthlyAttendanceDetails,
    saveMonthlyPayrollSheetEdits,
    applyForLeave,
    getMonthlyApplicationReviewDesk,
    reviewLeaveRequest,
    bulkReviewApplications
} = require('../controllers/payroll.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validateRequest = require('../middlewares/validate.middleware');
const {
    reviseSalaryValidationRules,
    generatePayrollValidationRules,
    savePayrollSheetValidationRules,
    deletePayrollSheetValidationRules,
    payrollSmsValidationRules,
    payrollEmailValidationRules,
    payrollAttendanceDetailsValidationRules,
    createLeaveRequestValidationRules
} = require('../validators/payroll.validator');
const { ROLES } = require('../constants/system.constants');
const {
    previewMonthlyPayrollSms,
    sendMonthlyPayrollSms,
    getMonthlyPayrollSmsBalance
} = require('../controllers/payrollSms.controller');
const {
    previewMonthlyPayrollEmail,
    sendMonthlyPayrollEmail
} = require('../controllers/payrollEmail.controller');

router.use(protect);

// ১. মাসিক বেতন শিট ও দরখাস্তের হাব (Application Hub)
router.get('/sheets', getMonthlySalaries);
router.get(
    '/sheets/periods',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    getSavedPayrollPeriods
);
router.delete(
    '/sheets',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    deletePayrollSheetValidationRules,
    validateRequest,
    deleteMonthlyPayrollSheet
);
router.post(
    '/attendance-details',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    payrollAttendanceDetailsValidationRules,
    validateRequest,
    getMonthlyAttendanceDetails
);
router.get('/revision-history', getSalaryRevisionHistory);
router.put(
    '/sheets/edits',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    savePayrollSheetValidationRules,
    validateRequest,
    saveMonthlyPayrollSheetEdits
);
router.get('/sms/balance', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), getMonthlyPayrollSmsBalance);
router.post(
    '/sms/preview',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    payrollSmsValidationRules,
    validateRequest,
    previewMonthlyPayrollSms
);
router.post(
    '/sms/send',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    payrollSmsValidationRules,
    validateRequest,
    sendMonthlyPayrollSms
);
router.post(
    '/email/preview',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    payrollEmailValidationRules,
    validateRequest,
    previewMonthlyPayrollEmail
);
router.post(
    '/email/send',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    payrollEmailValidationRules,
    validateRequest,
    sendMonthlyPayrollEmail
);

// দরখাস্ত জমা দেওয়া (ছুটি, লেট মওকুফ বা অফিসিয়াল ডিউটি)
router.post('/leaves/apply', (req, res) => {
    res.status(410).json({
        success: false,
        message: 'ছুটির আবেদন ব্যবস্থা বন্ধ করা হয়েছে। অটো-হাজিরা লেজারে Leave/Absent অ্যাডমিন থেকে পরিচালিত হবে।'
    });
});

// মাস শেষে নির্দিষ্ট মাসের সব দরখাস্ত ও কার কয়টা Absent/Late আছে তা এক জায়গায় দেখা
router.get('/leaves', getMonthlyApplicationReviewDesk);
router.get('/applications/monthly-desk', getMonthlyApplicationReviewDesk);

// ২. শুধুমাত্র Admin এবং SuperAdmin এর কন্ট্রোল রাউটস
router.patch(
    '/leaves/:id/review',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    reviewLeaveRequest
);

// এক ক্লিকে একাধিক দরখাস্ত অনুমোদন
router.post(
    '/applications/bulk-review',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    bulkReviewApplications
);

router.post(
    '/revise-basic-salary',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    reviseSalaryValidationRules,
    validateRequest,
    reviseBasicSalaryBulkOrSingle
);

router.post(
    '/adjust-monthly-sheet',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    reviseSalaryValidationRules,
    validateRequest,
    adjustMonthlyPayrollBulkOrSingle
);

router.post(
    '/generate',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    generatePayrollValidationRules,
    validateRequest,
    generateMonthlyPayroll
);
router.post(
    '/confirm',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    savePayrollSheetValidationRules,
    validateRequest,
    confirmMonthlyPayrollSheet
);

module.exports = router;
