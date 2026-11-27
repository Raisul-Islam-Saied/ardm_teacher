const { body } = require('express-validator');
const {
    ROLES,
    EMPLOYMENT_TYPES,
    PAYMENT_METHODS,
    BLOOD_GROUPS,
    DESIGNATIONS,
    DEGREE_LEVEL_WEIGHTS,
    VALID_CLASS_BN
} = require('../constants/system.constants');

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

// HTML ট্যাগ ও অতিরিক্ত স্পেস মুছে ফেলার স্যানিটাইজার
const sanitizeClean = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/<[^>]*>/g, '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
};

// বাংলা সংখ্যাকে ইংরেজিতে রূপান্তর
const toEnglishDigits = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/[০-৯]/g, (d) => String(BENGALI_DIGITS.indexOf(d)));
};

// ইংরেজি নামের Case স্বয়ংক্রিয়ভাবে Title Case করা (raIsuL Islam SAIED -> Raisul Islam Saied)
const normalizeEnglishName = (val) => {
    const clean = sanitizeClean(val);
    if (typeof clean !== 'string' || !clean) return clean;
    return clean
        .toLowerCase()
        .replace(/(^|[\s.'-])([a-z])/g, (_, sep, char) => sep + char.toUpperCase());
};

// শুধুমাত্র ইংরেজি ডিজিট রাখা (NID, জন্ম নিবন্ধন, ওয়ার্ড, পোস্ট কোড)
const sanitizeDigits = (val) => {
    if (val === undefined || val === null) return val;
    return toEnglishDigits(sanitizeClean(String(val))).replace(/\D/g, '');
};

// মোবাইল নম্বর নরমালাইজার (+8801... বা বাংলা সংখ্যা -> 01XXXXXXXXX)
const sanitizeBdPhone = (val) => {
    if (val === undefined || val === null) return val;
    let digits = sanitizeDigits(val);
    if (digits.startsWith('8801') && digits.length === 13) {
        digits = digits.slice(2);
    }
    return digits;
};

// Regex প্যাটার্নসমূহ
const ENG_NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{2,59}$/;
// বাংলা সংখ্যা (০-৯) বাদ দিয়ে এবং যুক্তবর্ণের ZWNJ/ZWJ অনুমোদন করে
const BNG_NAME_REGEX = /^[\u0980-\u09E5\u09F0-\u09FF][\u0980-\u09E5\u09F0-\u09FF\u200C\u200D\s.'-]{1,59}$/;
const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;
const NID_REGEX = /^(\d{10}|\d{13}|\d{17})$/;
const BIRTH_REG_REGEX = /^\d{17}$/;
const REPEATED_DIGITS_REGEX = /^(\d)\1+$/;

const ADDRESS_TEXT_FIELDS = [
    ['houseNameBn', 'বাড়ির নাম (বাংলা)'],
    ['houseNameEn', 'বাড়ির নাম (ইংরেজি)'],
    ['villageBn', 'গ্রামের নাম (বাংলা)'],
    ['villageEn', 'গ্রামের নাম (ইংরেজি)'],
    ['unionBn', 'ইউনিয়নের নাম (বাংলা)'],
    ['unionEn', 'ইউনিয়নের নাম (ইংরেজি)'],
    ['upazilaBn', 'উপজেলার নাম (বাংলা)'],
    ['upazilaEn', 'উপজেলার নাম (ইংরেজি)'],
    ['districtBn', 'জেলার নাম (বাংলা)'],
    ['districtEn', 'জেলার নাম (ইংরেজি)'],
    ['divisionBn', 'বিভাগের নাম (বাংলা)'],
    ['divisionEn', 'বিভাগের নাম (ইংরেজি)']
];

// Reusable কাস্টম ভ্যালিডেটরসমূহ
const validateNid = (val) => {
    if (!NID_REGEX.test(val)) {
        throw new Error('জাতীয় পরিচয়পত্র (NID) নম্বর অবশ্যই ১০, ১৩ অথবা ১৭ ডিজিটের হতে হবে');
    }
    if (REPEATED_DIGITS_REGEX.test(val)) {
        throw new Error('প্রদত্ত NID নম্বরটি ভুয়া বা অকার্যকর মনে হচ্ছে');
    }
    return true;
};

const validateBirthReg = (val) => {
    if (!BIRTH_REG_REGEX.test(val)) {
        throw new Error('জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ ডিজিটের সংখ্যা হতে হবে');
    }
    if (REPEATED_DIGITS_REGEX.test(val)) {
        throw new Error('প্রদত্ত জন্ম নিবন্ধন নম্বরটি ভুয়া বা অকার্যকর মনে হচ্ছে');
    }
    return true;
};

const validateDateOfBirth = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    if (Number.isNaN(birthDate.getTime())) {
        throw new Error('জন্ম তারিখ সঠিক নয়');
    }
    if (birthDate > today) {
        throw new Error('জন্ম তারিখ ভবিষ্যতের হতে পারে না');
    }
    const age = (today - birthDate) / (365.25 * 24 * 3600 * 1000);
    if (age < 15) {
        throw new Error('শিক্ষক বা স্টাফের বয়স কমপক্ষে ১৫ বছর হতে হবে');
    }
    if (age > 70) {
        throw new Error('বয়স ৭০ বছরের বেশি হতে পারবে না, অনুগ্রহ করে জন্ম তারিখ যাচাই করুন');
    }
    return true;
};

const validateJoiningDate = (joiningDate, { req }) => {
    const join = new Date(joiningDate);
    if (Number.isNaN(join.getTime())) {
        throw new Error('যোগদানের তারিখ সঠিক নয়');
    }
    if (req.body.dateOfBirth) {
        const birth = new Date(req.body.dateOfBirth);
        if (!Number.isNaN(birth.getTime())) {
            const ageAtJoining = (join - birth) / (365.25 * 24 * 3600 * 1000);
            if (ageAtJoining < 15) {
                throw new Error('জন্ম তারিখের সাথে যোগদানের তারিখ অসামঞ্জস্যপূর্ণ (যোগদানের সময় বয়স কমপক্ষে ১৫ বছর হতে হবে)');
            }
        }
    }
    return true;
};

const validateAcademicQualificationsCrossFields = (qualifications, { req }) => {
    if (!Array.isArray(qualifications)) return true;

    const birthYear = req.body.dateOfBirth ? new Date(req.body.dateOfBirth).getFullYear() : null;

    for (const qualification of qualifications) {
        if (!qualification || typeof qualification !== 'object') {
            throw new Error('শিক্ষাগত যোগ্যতার প্রতিটি তথ্য সঠিক অবজেক্ট আকারে হতে হবে');
        }

        const resultType = qualification.resultType || 'GPA';
        const hasNumericResult = resultType === 'GPA' || resultType === 'CGPA';
        const hasGpaValue =
            qualification.gpaOrCgpa !== undefined
            && qualification.gpaOrCgpa !== null
            && qualification.gpaOrCgpa !== '';

        if (hasNumericResult) {
            const scale = Number(qualification.scale) === 4 ? 4 : 5;
            const score = Number(qualification.gpaOrCgpa);
            if (!hasGpaValue || !Number.isFinite(score) || score < 1 || score > scale) {
                throw new Error(`GPA/CGPA অবশ্যই নির্বাচিত স্কেলের (১.০০ থেকে ${scale}.০০) মধ্যে হতে হবে`);
            }
        } else if (hasGpaValue) {
            throw new Error('বিভাগ, শ্রেণি বা উত্তীর্ণ ফলাফলের ক্ষেত্রে GPA/CGPA দেওয়া যাবে না');
        }

        if (
            ['Division', 'Class'].includes(resultType)
            && !['First', 'Second', 'Third'].includes(qualification.resultGrade)
        ) {
            throw new Error('বিভাগ বা শ্রেণির ফলাফল (First, Second, Third) নির্বাচন করুন');
        }

        const passYear = Number(qualification.passingYear);
        if (birthYear && Number.isFinite(passYear) && passYear - birthYear < 10) {
            throw new Error(`জন্মসাল (${birthYear})-এর সাথে পাসের সন (${passYear}) সামঞ্জস্যপূর্ণ নয়`);
        }
    }

    return true;
};

const addressLocationValidators = (addressKey) => [
    ...ADDRESS_TEXT_FIELDS.map(([field, label]) => (
        body(`${addressKey}.${field}`)
            .customSanitizer(sanitizeClean)
            .isLength({ min: 2, max: 80 }).withMessage(`${label} ২ থেকে ৮০ অক্ষরের মধ্যে হতে হবে`)
    )),
    body(`${addressKey}.wardNo`)
        .customSanitizer(sanitizeDigits)
        .matches(/^\d{1,3}$/).withMessage('ওয়ার্ড নম্বর ১ থেকে ৩ সংখ্যার হতে হবে'),
    body(`${addressKey}.postOffice`)
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ min: 2, max: 80 }).withMessage('ডাকঘরের নাম ২ থেকে ৮০ অক্ষরের মধ্যে হতে হবে'),
    body(`${addressKey}.postCode`)
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeDigits)
        .matches(/^\d{4}$/).withMessage('পোস্ট কোড অবশ্যই ৪ সংখ্যার হতে হবে')
];

const commonMilitaryRules = [
    // ১. বাংলা ও ইংরেজি নামের কড়া ভ্যালিডেশন (অটো Title Case সহ)
    body('fullNameEng')
        .customSanitizer(normalizeEnglishName)
        .notEmpty().withMessage('শিক্ষকের ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর (A-Z, ৩-৬০ অক্ষর) ব্যবহার করুন'),

    body('fullNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('শিক্ষকের বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('বাংলা নামে শুধুমাত্র বাংলা অক্ষর ব্যবহার করুন (সংখ্যা নয়)'),

    body('fathersNameEng')
        .customSanitizer(normalizeEnglishName)
        .notEmpty().withMessage('পিতার ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('পিতার ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর ব্যবহার করুন'),

    body('fathersNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('পিতার বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('পিতার বাংলা নামে শুধুমাত্র বাংলা অক্ষর ব্যবহার করুন'),

    body('mothersNameEng')
        .customSanitizer(normalizeEnglishName)
        .notEmpty().withMessage('মাতার ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('মাতার ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর ব্যবহার করুন'),

    body('mothersNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('মাতার বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('মাতার বাংলা নামে শুধুমাত্র বাংলা অক্ষর ব্যবহার করুন'),

    // ২. পদবী ও ব্যক্তিগত তথ্য
    body('designation')
        .customSanitizer(sanitizeClean)
        .isIn(DESIGNATIONS).withMessage(`পদবী অবশ্যই নির্ধারিত পদবীগুলোর একটি হতে হবে: ${DESIGNATIONS.join(', ')}`),

    body('bloodGroup')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isIn(BLOOD_GROUPS).withMessage(`রক্তের গ্রুপ সঠিক নয় (${BLOOD_GROUPS.join(', ')})`),

    body('gender')
        .optional({ checkFalsy: true })
        .isIn(['Male', 'Female', 'Other']).withMessage('লিঙ্গ সঠিক নয়'),

    body('religion')
        .optional({ checkFalsy: true })
        .isIn(['Islam', 'Hinduism', 'Buddhism', 'Christianity', 'Other']).withMessage('ধর্ম সঠিক নয়'),

    body('maritalStatus')
        .optional({ checkFalsy: true })
        .isIn(['Single', 'Married', 'Widowed', 'Divorced']).withMessage('বৈবাহিক অবস্থা সঠিক নয়'),

    body('email')
        .optional({ checkFalsy: true })
        .isEmail().withMessage('সঠিক ইমেইল ঠিকানা দিন')
        .normalizeEmail(),

    body('indexNumber')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 50 }).withMessage('ইনডেক্স নম্বর সর্বোচ্চ ৫০ অক্ষরের হতে পারে'),

    // ৩. NID অথবা জন্ম নিবন্ধন (যেকোনো একটি অবশ্যই দিতে হবে + ভুয়া রিপিট নম্বর ব্লক)
    body('nidNumber')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeDigits)
        .custom(validateNid),

    body('birthRegNumber')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeDigits)
        .custom(validateBirthReg),

    body().custom((_, { req }) => {
        const nid = req.body.nidNumber ? String(req.body.nidNumber).trim() : '';
        const bReg = req.body.birthRegNumber ? String(req.body.birthRegNumber).trim() : '';
        if (!nid && !bReg) {
            throw new Error('জাতীয় পরিচয়পত্র (NID) অথবা ১৭ ডিজিটের জন্ম নিবন্ধন নম্বর—যেকোনো একটি অবশ্যই প্রদান করতে হবে!');
        }
        return true;
    }),

    // ৪. জন্ম তারিখ (বয়স ১৫–৭০ বছর) এবং যোগদানের তারিখ যাচাই
    body('dateOfBirth')
        .notEmpty().withMessage('জন্ম তারিখ আবশ্যক')
        .isISO8601({ strict: true }).withMessage('জন্ম তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন')
        .custom(validateDateOfBirth),

    body('joiningDate')
        .notEmpty().withMessage('যোগদানের তারিখ আবশ্যক')
        .isISO8601({ strict: true }).withMessage('যোগদানের তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন')
        .custom(validateJoiningDate),

    // ৫. মোবাইল নম্বর এবং জরুরি যোগাযোগের নম্বর (একে অপরের থেকে ভিন্ন হতে হবে)
    body('phone')
        .customSanitizer(sanitizeBdPhone)
        .matches(BD_PHONE_REGEX).withMessage('সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নম্বর দিন (01XXXXXXXXX)'),

    body('emergencyContact.contactName')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ min: 2, max: 80 }).withMessage('জরুরি যোগাযোগের ব্যক্তির নাম ২ থেকে ৮০ অক্ষরের মধ্যে হতে হবে'),

    body('emergencyContact.relationship')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 40 }).withMessage('সম্পর্ক সর্বোচ্চ ৪০ অক্ষরের হতে পারে'),

    body('emergencyContact.phone')
        .customSanitizer(sanitizeBdPhone)
        .matches(BD_PHONE_REGEX).withMessage('জরুরি যোগাযোগের জন্য সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন')
        .custom((emPhone, { req }) => {
            if (emPhone && req.body.phone && emPhone.trim() === String(req.body.phone).trim()) {
                throw new Error('জরুরি যোগাযোগের নম্বরটি শিক্ষকের নিজের মোবাইল নম্বরের থেকে অবশ্যই আলাদা হতে হবে!');
            }
            return true;
        }),

    // ৬. ঠিকানা (মডেলের required ফিল্ড: বাড়ি ও গ্রাম)
    body('presentAddress.houseOrRoad')
        .customSanitizer(sanitizeClean)
        .isLength({ min: 2, max: 80 }).withMessage('বাড়ি বা রাস্তার নাম ২ থেকে ৮০ অক্ষরের মধ্যে হতে হবে'),

    body('presentAddress.village')
        .customSanitizer(sanitizeClean)
        .isLength({ min: 2, max: 80 }).withMessage('গ্রামের নাম ২ থেকে ৮০ অক্ষরের মধ্যে হতে হবে'),

    // ৭. শিক্ষাগত যোগ্যতা ও GPA/CGPA চেক
    body('academicQualifications')
        .optional()
        .isArray({ max: 6 }).withMessage('শিক্ষাগত যোগ্যতা সর্বোচ্চ ৬টি Array আকারে হতে হবে'),

    body('academicQualifications.*.degreeLevel')
        .isIn(Object.keys(DEGREE_LEVEL_WEIGHTS)).withMessage('সঠিক ডিগ্রি লেভেল নির্বাচন করুন'),

    body('academicQualifications.*.examTitle')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('পরীক্ষার নাম (Exam Title) আবশ্যক')
        .isLength({ max: 100 }).withMessage('পরীক্ষার নাম সর্বোচ্চ ১০০ অক্ষরের হতে পারে'),

    body('academicQualifications.*.boardOrUniversity')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('বোর্ড বা বিশ্ববিদ্যালয়ের নাম আবশ্যক')
        .isLength({ max: 100 }).withMessage('বোর্ড বা বিশ্ববিদ্যালয়ের নাম সর্বোচ্চ ১০০ অক্ষরের হতে পারে'),

    body('academicQualifications.*.passingYear')
        .customSanitizer(sanitizeDigits)
        .notEmpty().withMessage('পাসের সন আবশ্যক')
        .isInt({ min: 1960, max: 2050 }).withMessage('পাসের সন ১৯৬০ থেকে ২০৫০ এর মধ্যে হতে হবে')
        .toInt(),

    body('academicQualifications.*.majorOrGroup')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 100 }).withMessage('বিভাগ বা বিষয় সর্বোচ্চ ১০০ অক্ষরের হতে পারে'),

    body('academicQualifications.*.resultType')
        .optional({ checkFalsy: true })
        .isIn(['GPA', 'CGPA', 'Division', 'Class', 'Passed'])
        .withMessage('ফলাফলের ধরন সঠিক নয়'),

    body('academicQualifications.*.resultGrade')
        .optional({ checkFalsy: true })
        .isIn(['First', 'Second', 'Third'])
        .withMessage('বিভাগ বা শ্রেণির ফলাফল সঠিক নয়'),

    body('academicQualifications.*.scale')
        .optional({ checkFalsy: true })
        .custom((value) => [4, 5].includes(Number(value)))
        .withMessage('GPA/CGPA স্কেল ৪ অথবা ৫ হতে হবে'),

    body('academicQualifications.*.gpaOrCgpa')
        .optional({ checkFalsy: true })
        .isFloat({ min: 1.0, max: 5.0 }).withMessage('GPA বা CGPA অবশ্যই ১.০০ থেকে ৫.০০ এর মধ্যে হতে হবে'),

    body('academicQualifications.*.rollNumber')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 50 }).withMessage('রোল নম্বর সর্বোচ্চ ৫০ অক্ষরের হতে পারে'),

    body('academicQualifications.*.registrationNumber')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 50 }).withMessage('রেজিস্ট্রেশন নম্বর সর্বোচ্চ ৫০ অক্ষরের হতে পারে'),

    body('academicQualifications.*.courseDuration')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 30 }).withMessage('কোর্সের মেয়াদ সর্বোচ্চ ৩০ অক্ষরের হতে পারে'),

    body('academicQualifications').custom(validateAcademicQualificationsCrossFields)
];

const requiredTeacherEmailRule = () => body('email')
    .trim()
    .notEmpty().withMessage('পোর্টাল অ্যাকাউন্টের জন্য ইমেইল ঠিকানা আবশ্যক')
    .bail()
    .isEmail().withMessage('সঠিক ইমেইল ঠিকানা দিন')
    .normalizeEmail();

const emailWhenProvidedRule = () => body('email')
    .if((value, { req }) => Object.prototype.hasOwnProperty.call(req.body, 'email'))
    .isString().withMessage('সঠিক ইমেইল ঠিকানা দিন')
    .bail()
    .trim()
    .notEmpty().withMessage('পোর্টাল অ্যাকাউন্টের ইমেইল ঠিকানা খালি রাখা যাবে না')
    .bail()
    .isEmail().withMessage('সঠিক ইমেইল ঠিকানা দিন')
    .normalizeEmail();

const createTeacherValidator = [
    ...commonMilitaryRules,
    requiredTeacherEmailRule(),
    body('teacherCode')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeDigits)
        .matches(/^\d{10}$/).withMessage('টিচার আইডি দিলে তা অবশ্যই ১০ সংখ্যার ডিজিট হতে হবে'),
    body('biometricDeviceId')
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage('বায়োমেট্রিক ডিভাইস আইডি অবশ্যই পূর্ণসংখ্যা হতে হবে'),
    body('basicSalary')
        .notEmpty().withMessage('মূল বেতন (Basic Salary) আবশ্যক')
        .isFloat({ min: 0 }).withMessage('মূল বেতন ০ বা তার বেশি হতে হবে'),
    body('paymentMethod')
        .optional({ checkFalsy: true })
        .isIn(Object.values(PAYMENT_METHODS)).withMessage('পেমেন্ট মেথড সঠিক নয় (Cash, Bank, Mobile Banking)'),
    body('employmentType')
        .optional({ checkFalsy: true })
        .isIn(Object.values(EMPLOYMENT_TYPES)).withMessage('চাকরির ধরন সঠিক নয়'),
    body('role')
        .optional({ checkFalsy: true })
        .isIn(Object.values(ROLES)).withMessage('পোর্টাল অ্যাক্সেস রোল সঠিক নয়'),
    body('password')
        .trim()
        .notEmpty().withMessage('পাসওয়ার্ড আবশ্যক')
        .isLength({ min: 6, max: 64 }).withMessage('পাসওয়ার্ড ৬ থেকে ৬৪ অক্ষরের মধ্যে হতে হবে')
];

const publicSelfRegisterValidator = [
    ...commonMilitaryRules,
    ...addressLocationValidators('presentAddress'),
    ...addressLocationValidators('permanentAddress'),
    requiredTeacherEmailRule(),
    body('password')
        .trim()
        .notEmpty().withMessage('পাসওয়ার্ড আবশ্যক')
        .isLength({ min: 6, max: 64 }).withMessage('পাসওয়ার্ড ৬ থেকে ৬৪ অক্ষরের মধ্যে হতে হবে')
];

const updateTeacherValidator = [
    body('fullNameEng').optional({ checkFalsy: true }).customSanitizer(normalizeEnglishName).matches(ENG_NAME_REGEX).withMessage('শিক্ষকের ইংরেজি নাম সঠিক নয়'),
    body('fullNameBng').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX).withMessage('শিক্ষকের বাংলা নাম সঠিক নয়'),
    body('fathersNameEng').optional({ checkFalsy: true }).customSanitizer(normalizeEnglishName).matches(ENG_NAME_REGEX).withMessage('পিতার ইংরেজি নাম সঠিক নয়'),
    body('fathersNameBng').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX).withMessage('পিতার বাংলা নাম সঠিক নয়'),
    body('mothersNameEng').optional({ checkFalsy: true }).customSanitizer(normalizeEnglishName).matches(ENG_NAME_REGEX).withMessage('মাতার ইংরেজি নাম সঠিক নয়'),
    body('mothersNameBng').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX).withMessage('মাতার বাংলা নাম সঠিক নয়'),
    body('phone').optional({ checkFalsy: true }).customSanitizer(sanitizeBdPhone).matches(BD_PHONE_REGEX).withMessage('সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নম্বর দিন'),
    body('designation').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isIn(DESIGNATIONS).withMessage('পদবী সঠিক নয়'),
    body('bloodGroup').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isIn(BLOOD_GROUPS).withMessage('রক্তের গ্রুপ সঠিক নয়'),
    emailWhenProvidedRule(),
    body('dateOfBirth')
        .optional({ checkFalsy: true })
        .isISO8601({ strict: true }).withMessage('জন্ম তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন')
        .custom(validateDateOfBirth),
    body('joiningDate')
        .optional({ checkFalsy: true })
        .isISO8601({ strict: true }).withMessage('যোগদানের তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন')
        .custom(validateJoiningDate),
    body('resignationDate').optional({ nullable: true, checkFalsy: true }).isISO8601({ strict: true }).withMessage('চাকরি ছাড়ার তারিখ সঠিক ফরম্যাটে দিন'),
    body('gender').optional({ checkFalsy: true }).isIn(['Male', 'Female', 'Other']).withMessage('লিঙ্গ সঠিক নয়'),
    body('religion').optional({ checkFalsy: true }).isIn(['Islam', 'Hinduism', 'Buddhism', 'Christianity', 'Other']).withMessage('ধর্ম সঠিক নয়'),
    body('maritalStatus').optional({ checkFalsy: true }).isIn(['Single', 'Married', 'Widowed', 'Divorced']).withMessage('বৈবাহিক অবস্থা সঠিক নয়'),
    body('nidNumber').optional({ checkFalsy: true }).customSanitizer(sanitizeDigits).custom(validateNid),
    body('birthRegNumber').optional({ checkFalsy: true }).customSanitizer(sanitizeDigits).custom(validateBirthReg),
    body('indexNumber').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 50 }).withMessage('ইনডেক্স নম্বর সর্বোচ্চ ৫০ অক্ষরের হতে পারে'),
    body('emergencyContact').optional().isObject().withMessage('জরুরি যোগাযোগের তথ্য সঠিক অবজেক্ট হতে হবে'),
    body('emergencyContact.contactName').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage('জরুরি যোগাযোগের নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),
    body('emergencyContact.relationship').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 40 }).withMessage('সম্পর্ক সর্বোচ্চ ৪০ অক্ষরের হতে পারে'),
    body('emergencyContact.phone')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeBdPhone)
        .matches(BD_PHONE_REGEX).withMessage('জরুরি যোগাযোগের নম্বর সঠিক নয়')
        .custom((emPhone, { req }) => {
            if (emPhone && req.body.phone && emPhone.trim() === String(req.body.phone).trim()) {
                throw new Error('জরুরি যোগাযোগের নম্বরটি শিক্ষকের নিজের মোবাইল নম্বরের থেকে অবশ্যই আলাদা হতে হবে!');
            }
            return true;
        }),
    body('presentAddress').optional().isObject().withMessage('বর্তমান ঠিকানা সঠিক অবজেক্ট হতে হবে'),
    body('permanentAddress').optional().isObject().withMessage('স্থায়ী ঠিকানা সঠিক অবজেক্ট হতে হবে'),
    ...['presentAddress', 'permanentAddress'].flatMap((addressKey) => [
        ...[
            ...ADDRESS_TEXT_FIELDS,
            ['houseOrRoad', 'বাড়ি বা রাস্তা'],
            ['village', 'গ্রাম'],
            ['postOffice', 'ডাকঘর'],
            ['upazila', 'উপজেলা'],
            ['district', 'জেলা']
        ].map(([field, label]) => (
            body(`${addressKey}.${field}`)
                .optional({ checkFalsy: true })
                .customSanitizer(sanitizeClean)
                .isLength({ max: 80 }).withMessage(`${label} সর্বোচ্চ ৮০ অক্ষরের মধ্যে হতে হবে`)
        )),
        body(`${addressKey}.wardNo`)
            .optional({ checkFalsy: true })
            .customSanitizer(sanitizeDigits)
            .matches(/^\d{1,3}$/).withMessage('ওয়ার্ড নম্বর ১ থেকে ৩ সংখ্যার হতে হবে'),
        body(`${addressKey}.postCode`)
            .optional({ checkFalsy: true })
            .customSanitizer(sanitizeDigits)
            .matches(/^\d{4}$/).withMessage('পোস্ট কোড অবশ্যই ৪ সংখ্যার হতে হবে')
    ]),
    body('academicQualifications').optional().isArray({ max: 6 }).withMessage('শিক্ষাগত যোগ্যতা সর্বোচ্চ ৬টি হতে পারে'),
    body('academicQualifications.*.degreeLevel').optional().isIn(Object.keys(DEGREE_LEVEL_WEIGHTS)).withMessage('সঠিক ডিগ্রি লেভেল নির্বাচন করুন'),
    body('academicQualifications.*.examTitle').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 100 }).withMessage('পরীক্ষার নাম সর্বোচ্চ ১০০ অক্ষরের হতে পারে'),
    body('academicQualifications.*.majorOrGroup').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 100 }).withMessage('বিভাগ বা বিষয় সর্বোচ্চ ১০০ অক্ষরের হতে পারে'),
    body('academicQualifications.*.boardOrUniversity').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 100 }).withMessage('বোর্ড বা বিশ্ববিদ্যালয়ের নাম সর্বোচ্চ ১০০ অক্ষরের হতে পারে'),
    body('academicQualifications.*.rollNumber').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 50 }).withMessage('রোল নম্বর সর্বোচ্চ ৫০ অক্ষরের হতে পারে'),
    body('academicQualifications.*.registrationNumber').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 50 }).withMessage('রেজিস্ট্রেশন নম্বর সর্বোচ্চ ৫০ অক্ষরের হতে পারে'),
    body('academicQualifications.*.passingYear').optional({ checkFalsy: true }).customSanitizer(sanitizeDigits).isInt({ min: 1960, max: 2050 }).withMessage('পাসের সন ১৯৬০ থেকে ২০৫০ এর মধ্যে হতে হবে').toInt(),
    body('academicQualifications.*.courseDuration').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 30 }).withMessage('কোর্সের মেয়াদ সর্বোচ্চ ৩০ অক্ষরের হতে পারে'),
    body('academicQualifications.*.resultType').optional({ checkFalsy: true }).isIn(['GPA', 'CGPA', 'Division', 'Class', 'Passed']).withMessage('ফলাফলের ধরন সঠিক নয়'),
    body('academicQualifications.*.resultGrade').optional({ checkFalsy: true }).isIn(['First', 'Second', 'Third']).withMessage('বিভাগ বা শ্রেণির ফলাফল সঠিক নয়'),
    body('academicQualifications.*.gpaOrCgpa').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 1, max: 5 }).withMessage('GPA/CGPA ১.০০ থেকে ৫.০০ এর মধ্যে হতে হবে'),
    body('academicQualifications.*.scale').optional({ checkFalsy: true }).custom((value) => [4, 5].includes(Number(value))).withMessage('স্কেল ৪ অথবা ৫ হতে হবে'),
    body('academicQualifications').optional().custom(validateAcademicQualificationsCrossFields),
    body('subject').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 100 }).withMessage('বিষয় সর্বোচ্চ ১০০ অক্ষরের হতে পারে'),
    body('assignedClass').optional({ checkFalsy: true }).isIn(['', ...VALID_CLASS_BN]).withMessage('সঠিক নির্ধারিত শ্রেণি নির্বাচন করুন'),
    body('canEditAssignedClass').optional().isBoolean().withMessage('মান অবশ্যই true বা false হতে হবে'),
    body('employmentType').optional({ checkFalsy: true }).isIn(Object.values(EMPLOYMENT_TYPES)).withMessage('চাকরির ধরন সঠিক নয়'),
    body('basicSalary').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('মূল বেতন ০ বা তার বেশি হতে হবে'),
    body('biometricDeviceId').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('বায়োমেট্রিক ডিভাইস আইডি অবশ্যই পূর্ণসংখ্যা হতে হবে'),
    body('customLeaveQuota').optional({ checkFalsy: true }).isFloat({ min: 0, max: 15 }).withMessage('ছুটির কোটা ০ থেকে ১৫ এর মধ্যে হতে হবে'),
    body('paymentMethod').optional({ checkFalsy: true }).isIn(Object.values(PAYMENT_METHODS)).withMessage('পেমেন্ট মেথড সঠিক নয়'),
    body('bankDetails').optional().isObject().withMessage('ব্যাংক তথ্য সঠিক অবজেক্ট হতে হবে'),
    ...['bankName', 'branchName', 'accountHolderName', 'accountNumber', 'routingNumber'].map((field) => (
        body(`bankDetails.${field}`).optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 100 }).withMessage('ব্যাংকের তথ্য সর্বোচ্চ ১০০ অক্ষরের হতে পারে')
    )),
    body('role').optional({ checkFalsy: true }).isIn(Object.values(ROLES)).withMessage('পোর্টাল অ্যাক্সেস রোল সঠিক নয়'),
    body('isActive').optional().isBoolean().withMessage('isActive অবশ্যই true বা false হতে হবে'),
    body('registrationStatus').optional({ checkFalsy: true }).isIn(['Approved', 'Pending', 'Rejected']).withMessage('রেজিস্ট্রেশন স্ট্যাটাস সঠিক নয়')
];

module.exports = {
    createTeacherValidator,
    publicSelfRegisterValidator,
    updateTeacherValidator
};