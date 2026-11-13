const express = require('express');
const router = express.Router();
const {
    reviseBasicSalaryBulkOrSingle,
    adjustMonthlyPayrollBulkOrSingle,
    getSalaryRevisionHistory,
    generateMonthlyPayroll,
    getMonthlySalaries,
    markSalaryAsPaid,
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
    createLeaveRequestValidationRules
} = require('../validators/payroll.validator');
const { ROLES } = require('../constants/system.constants');

router.use(protect);

// ১. মাসিক বেতন শিট ও দরখাস্তের হাব (Application Hub)
router.get('/sheets', getMonthlySalaries);
router.get('/revision-history', getSalaryRevisionHistory);

// দরখাস্ত জমা দেওয়া (ছুটি, লেট মওকুফ বা অফিসিয়াল ডিউটি)
router.post('/leaves/apply', createLeaveRequestValidationRules, validateRequest, applyForLeave);

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

router.patch('/sheets/:id/pay', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), markSalaryAsPaid);

module.exports = router;
