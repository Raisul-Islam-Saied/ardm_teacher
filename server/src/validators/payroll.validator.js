const { body } = require('express-validator');
const { SALARY_ADJUSTMENT_MODES } = require('../constants/system.constants');

const reviseSalaryValidationRules = [
    body('adjustmentMode')
        .isIn(Object.values(SALARY_ADJUSTMENT_MODES))
        .withMessage(`মোড অবশ্যই ${Object.values(SALARY_ADJUSTMENT_MODES).join(', ')} এর একটি হতে হবে`),
    body('adjustmentValue')
        .isFloat({ gt: 0 })
        .withMessage('অ্যাডজাস্টমেন্ট ভ্যালু অবশ্যই ০ এর চেয়ে বড় সংখ্যা হতে হবে'),
    body('reason')
        .trim()
        .notEmpty()
        .withMessage('বেতন বৃদ্ধি বা হ্রাসের কারণ উল্লেখ করা আবশ্যক')
];

const generatePayrollValidationRules = [
    body('month').isInt({ min: 1, max: 12 }).withMessage('মাস ১ থেকে ১২ এর মধ্যে হতে হবে'),
    body('year').isInt({ min: 2024, max: 2100 }).withMessage('সঠিক বছর (year) প্রদান করুন'),
    body('includeBonus').optional().isBoolean(),
    body('bonusPercentage').optional().isFloat({ min: 0, max: 200 })
];

const createLeaveRequestValidationRules = [
    body('applicationType')
        .optional()
        .isIn(['Casual Leave', 'Sick Leave', 'Late Excuse', 'Official Duty'])
        .withMessage('আবেদনের ধরন অবশ্যই Casual Leave, Sick Leave, Late Excuse অথবা Official Duty হতে হবে'),
    body('startDate')
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('তারিখ (startDate) YYYY-MM-DD ফরম্যাটে দিন'),
    body('endDate')
        .optional()
        .matches(/^\d{4}-\d{2}-\d{2}$/)
        .withMessage('শেষ তারিখ (endDate) YYYY-MM-DD ফরম্যাটে দিন'),
    body('reason')
        .trim()
        .notEmpty()
        .withMessage('দরখাস্তের কারণ উল্লেখ করা আবশ্যক')
];

module.exports = {
    reviseSalaryValidationRules,
    generatePayrollValidationRules,
    createLeaveRequestValidationRules
};
