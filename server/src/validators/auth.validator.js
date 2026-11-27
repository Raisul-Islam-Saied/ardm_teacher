const { body } = require('express-validator');

const loginValidationRules = [
    body('identifier')
        .trim()
        .notEmpty().withMessage('ইমেইল, মোবাইল নম্বর অথবা টিচার আইডি আবশ্যক')
        .bail(),
    body('identifier')
        .if((value) => String(value || '').includes('@'))
        .isEmail().withMessage('সঠিক ইমেইল ঠিকানা দিন')
        .normalizeEmail(),
    body('password').notEmpty().withMessage('পাসওয়ার্ড আবশ্যক')
];

const changePasswordValidationRules = [
    body('currentPassword').notEmpty().withMessage('বর্তমান পাসওয়ার্ড আবশ্যক'),
    body('newPassword').notEmpty().isLength({ min: 6, max: 64 }).withMessage('নতুন পাসওয়ার্ড ৬ থেকে ৬৪ অক্ষরের হতে হবে')
];

const forgotPasswordValidationRules = [
    body('email')
        .trim()
        .notEmpty().withMessage('ইমেইল ঠিকানা আবশ্যক')
        .bail()
        .isEmail().withMessage('সঠিক ইমেইল ঠিকানা দিন')
        .normalizeEmail()
];

const resetPasswordValidationRules = [
    body('token')
        .trim()
        .isLength({ min: 64, max: 64 }).withMessage('রিসেট টোকেন সঠিক নয়')
        .isHexadecimal().withMessage('রিসেট টোকেন সঠিক নয়'),
    body('newPassword')
        .trim()
        .isLength({ min: 6, max: 64 }).withMessage('নতুন পাসওয়ার্ড ৬ থেকে ৬৪ অক্ষরের হতে হবে')
];

module.exports = {
    loginValidationRules,
    changePasswordValidationRules,
    forgotPasswordValidationRules,
    resetPasswordValidationRules
};
