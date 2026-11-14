const { body } = require('express-validator');
const {
    ROLES,
    EMPLOYMENT_TYPES,
    PAYMENT_METHODS,
    BLOOD_GROUPS,
    DESIGNATIONS,
    DEGREE_LEVEL_WEIGHTS
} = require('../constants/system.constants');

// HTML ট্যাগ ও অতিরিক্ত স্পেস মুছে ফেলার মিলিটারি স্যানিটাইজার
const sanitizeClean = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/<[^>]*>/g, '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const ENG_NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{2,59}$/;
const BNG_NAME_REGEX = /^[\u0980-\u09FF][\u0980-\u09FF\s.'-]{1,59}$/;
const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;
const NID_REGEX = /^(\d{10}|\d{13}|\d{17})$/;
const BIRTH_REG_REGEX = /^\d{17}$/;
const REPEATED_DIGITS_REGEX = /^(\d)\1+$/; // 1111111111 বা 0000000000 ব্লক করার জন্য

const commonMilitaryRules = [
    // ১. বাংলা ও ইংরেজি নামের কড়া ভ্যালিডেশন (শিক্ষক, পিতা ও মাতা)
    body('fullNameEng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('শিক্ষকের ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর (A-Z, 3-60 অক্ষর) ব্যবহার করুন'),

    body('fullNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('শিক্ষকের বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('বাংলা নামে শুধুমাত্র বাংলা অক্ষর ব্যবহার করুন'),

    body('fathersNameEng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('পিতার ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('পিতার ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর ব্যবহার করুন'),

    body('fathersNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('পিতার বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('পিতার বাংলা নামে শুধুমাত্র বাংলা অক্ষর ব্যবহার করুন'),

    body('mothersNameEng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('মাতার ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('মাতার ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর ব্যবহার করুন'),

    body('mothersNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('মাতার বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('মাতার বাংলা নামে শুধুমাত্র বাংলা অক্ষর ব্যবহার করুন'),

    // ২. পদবী ও ব্লাড গ্রুপ ভ্যালিডেশন
    body('designation')
        .customSanitizer(sanitizeClean)
        .isIn(DESIGNATIONS).withMessage(`পদবী অবশ্যই নির্ধারিত ১৫টি পদবীর একটি হতে হবে: ${DESIGNATIONS.join(', ')}`),

    body('bloodGroup')
        .optional()
        .customSanitizer(sanitizeClean)
        .isIn(BLOOD_GROUPS).withMessage(`রক্তের গ্রুপ সঠিক নয় (${BLOOD_GROUPS.join(', ')})`),

    // ৩. NID অথবা জন্ম নিবন্ধন (যেকোনো একটি অবশ্যই দিতে হবে + ভুয়া রিপিট নম্বর ব্লক)
    body('nidNumber')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .custom((val) => {
            if (!NID_REGEX.test(val)) {
                throw new Error('জাতীয় পরিচয়পত্র (NID) নম্বর অবশ্যই ১০, ১৩ অথবা ১৭ ডিজিটের হতে হবে');
            }
            if (REPEATED_DIGITS_REGEX.test(val)) {
                throw new Error('প্রদত্ত NID নম্বরটি ভুয়া বা অকার্যকর মনে হচ্ছে');
            }
            return true;
        }),

    body('birthRegNumber')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .custom((val) => {
            if (!BIRTH_REG_REGEX.test(val)) {
                throw new Error('জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ ডিজিটের সংখ্যা হতে হবে');
            }
            if (REPEATED_DIGITS_REGEX.test(val)) {
                throw new Error('প্রদত্ত জন্ম নিবন্ধন নম্বরটি ভুয়া বা অকার্যকর মনে হচ্ছে');
            }
            return true;
        }),

    body().custom((_, { req }) => {
        const nid = req.body.nidNumber ? String(req.body.nidNumber).trim() : '';
        const bReg = req.body.birthRegNumber ? String(req.body.birthRegNumber).trim() : '';
        if (!nid && !bReg) {
            throw new Error('জাতীয় পরিচয়পত্র (NID) অথবা ১৭ ডিজিটের জন্ম নিবন্ধন নম্বর—যেকোনো একটি অবশ্যই প্রদান করতে হবে!');
        }
        return true;
    }),

    // ৪. জন্ম তারিখ (বয়স ১৫ থেকে ৭০ বছর) এবং যোগদানের তারিখ যাচাই
    body('dateOfBirth')
        .notEmpty().withMessage('জন্ম তারিখ আবশ্যক')
        .isISO8601().withMessage('জন্ম তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন')
        .custom((dob) => {
            const birthDate = new Date(dob);
            const today = new Date();
            if (birthDate > today) {
                throw new Error('জন্ম তারিখ ভবিষ্যতের হতে পারে না');
            }
            const age = (today - birthDate) / (365.25 * 24 * 3600 * 1000);
            if (age < 15) {
                throw new Error('শিক্ষক বা স্টাফের বয়স কমপক্ষে ১৫ বছর হতে হবে');
            }
            if (age > 70) {
                throw new Error('বয়স ৭০ বছরের বেশি হতে পারবে না, অনুগ্রহ করে জন্ম তারিখ যাচাই করুন');
            }
            return true;
        }),

    body('joiningDate')
        .notEmpty().withMessage('যোগদানের তারিখ আবশ্যক')
        .isISO8601().withMessage('যোগদানের তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন')
        .custom((joiningDate, { req }) => {
            if (req.body.dateOfBirth) {
                const birth = new Date(req.body.dateOfBirth);
                const join = new Date(joiningDate);
                const ageAtJoining = (join - birth) / (365.25 * 24 * 3600 * 1000);
                if (ageAtJoining < 15) {
                    throw new Error('জন্ম তারিখের সাথে যোগদানের তারিখ অসামঞ্জস্যপূর্ণ (যোগদানের সময় বয়স কমপক্ষে ১৫ বছর হতে হবে)');
                }
            }
            return true;
        }),

    // ৫. মোবাইল নম্বর এবং জরুরি যোগাযোগের নম্বর (একে অপরের থেকে ভিন্ন হতে হবে)
    body('phone')
        .customSanitizer(sanitizeClean)
        .matches(BD_PHONE_REGEX).withMessage('সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নম্বর দিন (01XXXXXXXXX)'),

    body('emergencyContact.phone')
        .customSanitizer(sanitizeClean)
        .matches(BD_PHONE_REGEX).withMessage('জরুরি যোগাযোগের জন্য সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন')
        .custom((emPhone, { req }) => {
            if (emPhone && req.body.phone && emPhone.trim() === String(req.body.phone).trim()) {
                throw new Error('জরুরি যোগাযোগের নম্বরটি শিক্ষকের নিজের মোবাইল নম্বরের থেকে অবশ্যই আলাদা হতে হবে!');
            }
            return true;
        }),

    // ৬. ঠিকানা (বাড়ি ও গ্রাম বাধ্যতামূলক, বাকিগুলো ডিফল্ট সরফভাটা/রাঙ্গুনিয়া/চট্টগ্রাম)
    body('presentAddress.houseOrRoad')
        .customSanitizer(sanitizeClean)
        .isLength({ min: 2, max: 80 }).withMessage('বাড়ি বা রাস্তার নাম ২ থেকে ৮০ অক্ষরের মধ্যে হতে হবে'),

    body('presentAddress.village')
        .customSanitizer(sanitizeClean)
        .isLength({ min: 2, max: 80 }).withMessage('গ্রামের নাম ২ থেকে ৮০ অক্ষরের মধ্যে হতে হবে'),

    // ৭. শিক্ষাগত যোগ্যতা ও GPA/CGPA চেক
    body('academicQualifications')
        .optional()
        .isArray().withMessage('শিক্ষাগত যোগ্যতা Array আকারে হতে হবে'),

    body('academicQualifications.*.degreeLevel')
        .isIn(Object.keys(DEGREE_LEVEL_WEIGHTS)).withMessage('সঠিক ডিগ্রি লেভেল নির্বাচন করুন'),

    body('academicQualifications.*.gpaOrCgpa')
        .isFloat({ min: 1.0, max: 5.0 }).withMessage('GPA বা CGPA অবশ্যই ১.০০ থেকে ৫.০০ এর মধ্যে হতে হবে')
];

const createTeacherValidator = [
    ...commonMilitaryRules,
    body('teacherCode')
        .optional({ checkFalsy: true })
        .matches(/^\d{10}$/).withMessage('টিচার আইডি দিলে তা অবশ্যই ১০ সংখ্যার ডিজিট হতে হবে'),
    body('biometricDeviceId')
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage('বায়োমেট্রিক ডিভাইস আইডি অবশ্যই পূর্ণসংখ্যা হতে হবে'),
    body('basicSalary')
        .notEmpty().withMessage('মূল বেতন (Basic Salary) আবশ্যক')
        .isFloat({ min: 0 }).withMessage('মূল বেতন ০ বা তার বেশি হতে হবে'),
    body('paymentMethod')
        .optional()
        .isIn(Object.values(PAYMENT_METHODS)).withMessage('পেমেন্ট মেথড সঠিক নয় (Cash, Bank, Mobile Banking)'),
    body('employmentType')
        .optional()
        .isIn(Object.values(EMPLOYMENT_TYPES)),
    body('role')
        .optional()
        .isIn(Object.values(ROLES)),
    body('password')
        .optional()
        .isLength({ min: 6 }).withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
];

const publicSelfRegisterValidator = [
    ...commonMilitaryRules,
    body('password')
        .optional()
        .isLength({ min: 6 }).withMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
];

const updateTeacherValidator = [
    body('fullNameEng').optional().customSanitizer(sanitizeClean).matches(ENG_NAME_REGEX),
    body('fullNameBng').optional().customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX),
    body('fathersNameEng').optional().customSanitizer(sanitizeClean).matches(ENG_NAME_REGEX),
    body('fathersNameBng').optional().customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX),
    body('mothersNameEng').optional().customSanitizer(sanitizeClean).matches(ENG_NAME_REGEX),
    body('mothersNameBng').optional().customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX),
    body('phone').optional().customSanitizer(sanitizeClean).matches(BD_PHONE_REGEX),
    body('designation').optional().isIn(DESIGNATIONS),
    body('bloodGroup').optional().isIn(BLOOD_GROUPS),
    body('basicSalary').optional().isFloat({ min: 0 })
];

module.exports = {
    createTeacherValidator,
    publicSelfRegisterValidator,
    updateTeacherValidator
};
