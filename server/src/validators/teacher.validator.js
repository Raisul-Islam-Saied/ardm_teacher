const { body, param } = require('express-validator');
const { ROLES, GENDER, BLOOD_GROUPS, MARITAL_STATUS, EMPLOYMENT_TYPE } = require('../constants/system.constants');

const bdPhoneRegex = /^01[3-9]\d{8}$/;
const bdNidRegex = /^(\d{10}|\d{13}|\d{17})$/;

const createTeacherValidationRules = [
    body('teacherCode').trim().notEmpty().withMessage('teacherCode আবশ্যক').isLength({ min: 3, max: 20 }),
    body('biometricDeviceId').notEmpty().isInt({ min: 1, max: 99999 }).withMessage('সঠিক বায়োমেট্রিক আইডি দিন'),
    body('fullNameEng').trim().notEmpty().withMessage('ইংরেজি নাম আবশ্যক'),
    body('fullNameBng').trim().notEmpty().withMessage('বাংলা নাম আবশ্যক'),
    body('fathersName').trim().notEmpty().withMessage('পিতার নাম আবশ্যক'),
    body('mothersName').trim().notEmpty().withMessage('মাতার নাম আবশ্যক'),
    body('dateOfBirth').notEmpty().isISO8601().withMessage('জন্ম তারিখ YYYY-MM-DD ফরম্যাটে দিন'),
    body('gender').notEmpty().isIn(Object.values(GENDER)),
    body('bloodGroup').optional({ nullable: true, checkFalsy: true }).isIn(BLOOD_GROUPS),
    body('maritalStatus').optional().isIn(Object.values(MARITAL_STATUS)),
    body('nidNumber').trim().notEmpty().matches(bdNidRegex).withMessage('সঠিক ১০, ১৩ বা ১৭ ডিজিটের NID দিন'),
    body('phone').trim().notEmpty().matches(bdPhoneRegex).withMessage('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন'),
    body('presentAddress.villageOrStreet').trim().notEmpty(),
    body('presentAddress.postOffice').trim().notEmpty(),
    body('presentAddress.upazila').trim().notEmpty(),
    body('presentAddress.district').trim().notEmpty(),
    body('permanentAddress.villageOrStreet').trim().notEmpty(),
    body('permanentAddress.postOffice').trim().notEmpty(),
    body('permanentAddress.upazila').trim().notEmpty(),
    body('permanentAddress.district').trim().notEmpty(),
    body('emergencyContact.name').trim().notEmpty(),
    body('emergencyContact.relation').trim().notEmpty(),
    body('emergencyContact.phone').trim().notEmpty().matches(bdPhoneRegex),
    body('designation').trim().notEmpty(),
    body('subject').trim().notEmpty(),
    body('employmentType').optional().isIn(Object.values(EMPLOYMENT_TYPE)),
    body('joiningDate').notEmpty().isISO8601(),
    body('basicSalary').notEmpty().isFloat({ min: 500, max: 500000 }),
    body('bankDetails.bankName').trim().notEmpty(),
    body('bankDetails.branchName').trim().notEmpty(),
    body('bankDetails.accountName').trim().notEmpty(),
    body('bankDetails.accountNumber').trim().notEmpty().isLength({ min: 8, max: 25 }),
    body('password').notEmpty().isLength({ min: 6, max: 50 }),
    body('role').optional().isIn(Object.values(ROLES))
];

const updateTeacherValidationRules = [
    param('id').isMongoId().withMessage('সঠিক টিচার আইডি প্রদান করুন'),
    body('password').not().exists().withMessage('সাধারণ আপডেট রাউট দিয়ে পাসওয়ার্ড পরিবর্তন নিষিদ্ধ!'),
    body('phone').optional().trim().matches(bdPhoneRegex),
    body('nidNumber').optional().trim().matches(bdNidRegex),
    body('basicSalary').optional().isFloat({ min: 500, max: 500000 })
];

module.exports = { createTeacherValidationRules, updateTeacherValidationRules };
