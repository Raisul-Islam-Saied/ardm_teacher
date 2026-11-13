const { body } = require('express-validator');

const loginValidationRules = [
    body('identifier').trim().notEmpty().withMessage('মোবাইল নম্বর অথবা টিচার আইডি আবশ্যক'),
    body('password').notEmpty().withMessage('পাসওয়ার্ড আবশ্যক')
];

const changePasswordValidationRules = [
    body('currentPassword').notEmpty().withMessage('বর্তমান পাসওয়ার্ড আবশ্যক'),
    body('newPassword').notEmpty().isLength({ min: 6, max: 50 }).withMessage('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
];

module.exports = { loginValidationRules, changePasswordValidationRules };
