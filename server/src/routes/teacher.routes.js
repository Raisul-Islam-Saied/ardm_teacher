const express = require('express');
const {
    getRegistrationMetadata,
    registerTeacher,
    publicSelfRegisterTeacher,
    getPublicRegistryCardByUid,
    approvePendingTeacher,
    getAllTeachers,
    triggerRankRecalculation,
    getTeacherById,
    resetTeacherPassword,
    updateTeacher,
    toggleTeacherActiveStatus,
    getMyPortalDashboard
} = require('../controllers/teacher.controller');
const {
    createTeacherValidator,
    publicSelfRegisterValidator,
    updateTeacherValidator
} = require('../validators/teacher.validator');
const validateRequest = require('../middlewares/validate.middleware');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/system.constants');

const router = express.Router();

// পাবলিক রাউট (শিক্ষক নিজে ফর্ম পূরণ ও ডিজিটাল রেজিস্ট্রি কার্ড দেখার জন্য)
router.get('/public/metadata', getRegistrationMetadata);
router.post('/public/self-register', publicSelfRegisterValidator, validateRequest, publicSelfRegisterTeacher);
router.get('/public/registry-card/:uid', getPublicRegistryCardByUid);

// প্রোটেক্টেড রাউট (লগইন আবশ্যক)
router.use(protect);

// শিক্ষক নিজে লগইন করে নিজের ড্যাশবোর্ড ও হিসাব দেখার রাউট
router.get('/my-portal/dashboard', getMyPortalDashboard);

// অ্যাডমিন কন্ট্রোল রাউটসমূহ
router.post('/recalculate-ranks', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), triggerRankRecalculation);
router.patch('/:id/approve', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), approvePendingTeacher);
router.patch('/:id/reset-password', restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), resetTeacherPassword);

router
    .route('/')
    .get(restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAllTeachers)
    .post(
        restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
        createTeacherValidator,
        validateRequest,
        registerTeacher
    );

router
    .route('/:id')
    .get(getTeacherById)
    .patch(
        restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
        updateTeacherValidator,
        validateRequest,
        updateTeacher
    );

router.patch(
    '/:id/toggle-status',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    toggleTeacherActiveStatus
);

module.exports = router;
