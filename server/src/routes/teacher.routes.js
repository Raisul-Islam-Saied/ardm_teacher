const express = require('express');
const router = express.Router();
const {
    getTeacherSelfPortalDashboard,
    createTeacher,
    getAllTeachers,
    getTeacherById,
    updateTeacher,
    toggleTeacherStatus,
    adminResetTeacherPassword
} = require('../controllers/teacher.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const validateRequest = require('../middlewares/validate.middleware');
const { createTeacherValidationRules, updateTeacherValidationRules } = require('../validators/teacher.validator');
const { ROLES } = require('../constants/system.constants');

router.use(protect);

// 🌟 ১. শিক্ষকের নিজস্ব অল-ইন-ওয়ান পোর্টাল ড্যাশবোর্ড (Teacher, Admin, SuperAdmin সবাই নিজেরটা দেখতে পারবেন)
router.get('/my-portal/dashboard', getTeacherSelfPortalDashboard);

// 🔒 ২. শুধুমাত্র Admin এবং SuperAdmin এর জন্য সংরক্ষিত রাউটস
router.post('/', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), createTeacherValidationRules, validateRequest, createTeacher);
router.get('/', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAllTeachers);
router.get('/:id', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), getTeacherById);
router.put('/:id', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateTeacherValidationRules, validateRequest, updateTeacher);
router.patch('/:id/status', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), toggleTeacherStatus);
router.patch('/:id/reset-password', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), adminResetTeacherPassword);

module.exports = router;
