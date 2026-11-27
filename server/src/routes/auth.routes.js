const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    setupInitialSuperAdmin,
    login,
    logout,
    getMe,
    changePassword,
    requestPasswordReset,
    resetPassword
} = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const validateRequest = require('../middlewares/validate.middleware');
const { createTeacherValidator } = require('../validators/teacher.validator');
const {
    loginValidationRules,
    changePasswordValidationRules,
    forgotPasswordValidationRules,
    resetPasswordValidationRules
} = require('../validators/auth.validator');

const createPasswordResetLimiter = () => rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        statusCode: 429,
        message: 'অনেকবার পাসওয়ার্ড রিসেটের চেষ্টা হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন।'
    }
});
const forgotPasswordLimiter = createPasswordResetLimiter();
const resetPasswordLimiter = createPasswordResetLimiter();

router.post('/setup-super-admin', createTeacherValidator, validateRequest, setupInitialSuperAdmin);
router.post('/login', loginValidationRules, validateRequest, login);
router.post(
    '/forgot-password',
    forgotPasswordLimiter,
    forgotPasswordValidationRules,
    validateRequest,
    requestPasswordReset
);
router.post(
    '/reset-password',
    resetPasswordLimiter,
    resetPasswordValidationRules,
    validateRequest,
    resetPassword
);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.patch('/change-password', protect, changePasswordValidationRules, validateRequest, changePassword);

module.exports = router;
