const express = require('express');
const router = express.Router();
const {
    getPublicPortalSettings,
    getSystemSettings,
    updateSystemSettings,
    createLoanOrAdvance,
    getLoansAndAdvances,
    updateLoanStatus,
    getAdminDashboardOverview,
    getBankTransferAdviceSheet,
    exportFullDatabaseBackup,
    getAuditLogs
} = require('../controllers/system.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/system.constants');

// পাবলিক রাউট: লগইন ছাড়াই মেইনটেন্যান্স মোড ও রেজাল্ট পাবলিশ টাইম জানার জন্য
router.get('/settings/public', getPublicPortalSettings);

router.use(protect);

// ১. সিস্টেম সেটিংস (সবাই দেখতে পারবে, শুধুমাত্র অ্যাডমিন পরিবর্তন করতে পারবে)
router.get('/settings', getSystemSettings);
router.put('/settings', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateSystemSettings);

// ২. লোন ও অগ্রিম বেতন কিস্তি
router.get('/loans', getLoansAndAdvances);
router.post('/loans', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), createLoanOrAdvance);
router.patch('/loans/:id', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateLoanStatus);

// ৩. অ্যাডমিন মাস্টার ড্যাশবোর্ড ওভারভিউ এবং ব্যাংক ট্রান্সফার শিট
router.get('/dashboard', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAdminDashboardOverview);
router.get('/bank-advice', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), getBankTransferAdviceSheet);

// ৪. ওয়ান-ক্লিক ডাটাবেস ব্যাকআপ ও সিকিউরিটি অডিট লগ
router.get('/backup', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), exportFullDatabaseBackup);
router.get('/audit-logs', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAuditLogs);

module.exports = router;