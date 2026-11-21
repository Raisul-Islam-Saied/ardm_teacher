/**
 * ARDM Enterprise ERP — 100% Field-Level Error Binding Patch
 * Ensures EVERY single field & cross-field rule returns exact { field, message } in Bengali.
 * Run inside: ardm_teacher-main/server
 * Command: node patch_all_field_errors.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// ============================================================================
// 1. REWRITE src/validators/student.validator.js (Every rule bound to exact field)
// ============================================================================
const validatorCode = `const { body } = require('express-validator');
const {
    BLOOD_GROUPS,
    VALID_CLASS_BN,
    STUDENT_GROUPS,
    FEE_CATEGORIES,
    STUDENT_STATUSES
} = require('../constants/system.constants');

const sanitizeClean = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/<[^>]*>/g, '').replace(/[\\r\\n\\t]+/g, ' ').replace(/\\s+/g, ' ').trim();
};

const normalizeEnglishTitleCase = (val) => {
    const clean = sanitizeClean(val);
    if (typeof clean !== 'string') return clean;
    return clean
        .toLowerCase()
        .replace(/\\b[a-z]/g, (letter) => letter.toUpperCase());
};

const ENG_NAME_REGEX = /^[A-Za-z][A-Za-z\\s.'-]{2,59}$/;
const BNG_NAME_REGEX = /^[\\u0980-\\u09FF][\\u0980-\\u09FF\\s.'-]{1,59}$/;
const BD_PHONE_REGEX = /^01[3-9]\\d{8}$/;
const NID_REGEX = /^(\\d{10}|\\d{13}|\\d{17})$/;
const BRN_REGEX = /^\\d{17}$/;
const FAKE_DIGIT_PATTERNS = [
    /^(\\d)\\1+$/,
    /^123456789/,
    /^987654321/,
    /^0123456789/
];

const isFakeNumber = (val) => FAKE_DIGIT_PATTERNS.some((rx) => rx.test(String(val)));

const validateBangladeshiNid = (val, label) => {
    if (!NID_REGEX.test(val) || isFakeNumber(val)) {
        throw new Error(\`\${label} অবশ্যই ১০, ১৩ অথবা ১৭ ডিজিটের প্রকৃত বৈধ সংখ্যা হতে হবে\`);
    }
    if (val.length === 17) {
        const birthYear = parseInt(val.slice(0, 4), 10);
        if (birthYear < 1940 || birthYear > 2012) {
            throw new Error(\`১৭ ডিজিটের \${label}-এর প্রথম ৪ সংখ্যায় জন্মসাল (১৯৪০-২০১২) সঠিক নয়\`);
        }
    }
    return true;
};

const buildAddressValidators = (prefix, isOptional = false) => {
    const areaTitle = prefix === 'presentAddress' ? 'বর্তমান ঠিকানার' : 'স্থায়ী ঠিকানার';
    const wrap = (chain, msg) =>
        isOptional
            ? chain.optional({ checkFalsy: true })
            : chain.notEmpty().withMessage(\`\${areaTitle} \${msg}\`);

    return [
        wrap(body(\`\${prefix}.houseNameBn\`).customSanitizer(sanitizeClean), 'বাড়ির নাম (বাংলা) আবশ্যক')
            .matches(/^[\\u0980-\\u09FF0-9\\s.,'-]{2,80}$/).withMessage(\`\${areaTitle} বাড়ির নাম (বাংলা) ২-৮০ অক্ষরের মধ্যে হতে হবে\`),
        wrap(body(\`\${prefix}.houseNameEn\`).customSanitizer(normalizeEnglishTitleCase), 'বাড়ির নাম (ইংরেজি) আবশ্যক')
            .matches(/^[A-Za-z0-9\\s.,'-]{2,80}$/).withMessage(\`\${areaTitle} বাড়ির নাম (ইংরেজি) ২-৮০ অক্ষরের মধ্যে হতে হবে\`),
        wrap(body(\`\${prefix}.villageBn\`).customSanitizer(sanitizeClean), 'গ্রামের নাম (বাংলা) আবশ্যক')
            .matches(/^[\\u0980-\\u09FF\\s.'-]{2,80}$/).withMessage(\`\${areaTitle} গ্রামের নাম (বাংলা) ২-৮০ অক্ষরের মধ্যে হতে হবে\`),
        wrap(body(\`\${prefix}.villageEn\`).customSanitizer(normalizeEnglishTitleCase), 'গ্রামের নাম (ইংরেজি) আবশ্যক')
            .matches(/^[A-Za-z\\s.'-]{2,80}$/).withMessage(\`\${areaTitle} গ্রামের নাম (ইংরেজি) ২-৮০ অক্ষরের মধ্যে হতে হবে\`),
        wrap(body(\`\${prefix}.unionBn\`).customSanitizer(sanitizeClean), 'ইউনিয়নের নাম (বাংলা) আবশ্যক')
            .matches(/^[\\u0980-\\u09FF\\s.'-]{2,80}$/).withMessage(\`\${areaTitle} ইউনিয়নের নাম (বাংলা) সঠিক নয়\`),
        wrap(body(\`\${prefix}.unionEn\`).customSanitizer(normalizeEnglishTitleCase), 'ইউনিয়নের নাম (ইংরেজি) আবশ্যক')
            .matches(/^[A-Za-z\\s.'-]{2,80}$/).withMessage(\`\${areaTitle} ইউনিয়নের নাম (ইংরেজি) সঠিক নয়\`),
        wrap(body(\`\${prefix}.wardNo\`).customSanitizer(sanitizeClean), 'ওয়ার্ড নম্বর আবশ্যক')
            .matches(/^\\d{1,3}$/).withMessage(\`\${areaTitle} ওয়ার্ড নম্বর অবশ্যই সংখ্যা হতে হবে (১-৯৯৯)\`),
        wrap(body(\`\${prefix}.upazilaBn\`).customSanitizer(sanitizeClean), 'উপজেলার নাম (বাংলা) আবশ্যক')
            .matches(/^[\\u0980-\\u09FF\\s.'-]{2,80}$/).withMessage(\`\${areaTitle} উপজেলার নাম (বাংলা) সঠিক নয়\`),
        wrap(body(\`\${prefix}.upazilaEn\`).customSanitizer(normalizeEnglishTitleCase), 'উপজেলার নাম (ইংরেজি) আবশ্যক')
            .matches(/^[A-Za-z\\s.'-]{2,80}$/).withMessage(\`\${areaTitle} উপজেলার নাম (ইংরেজি) সঠিক নয়\`),
        wrap(body(\`\${prefix}.districtBn\`).customSanitizer(sanitizeClean), 'জেলার নাম (বাংলা) আবশ্যক')
            .matches(/^[\\u0980-\\u09FF\\s.'-]{2,80}$/).withMessage(\`\${areaTitle} জেলার নাম (বাংলা) সঠিক নয়\`),
        wrap(body(\`\${prefix}.districtEn\`).customSanitizer(normalizeEnglishTitleCase), 'জেলার নাম (ইংরেজি) আবশ্যক')
            .matches(/^[A-Za-z\\s.'-]{2,80}$/).withMessage(\`\${areaTitle} জেলার নাম (ইংরেজি) সঠিক নয়\`),
        body(\`\${prefix}.postOffice\`).optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage(\`\${areaTitle} ডাকঘরের নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে\`),
        body(\`\${prefix}.postCode\`).optional({ checkFalsy: true }).customSanitizer(sanitizeClean).matches(/^\\d{4}$/).withMessage(\`\${areaTitle} পোস্ট কোড অবশ্যই ৪ ডিজিটের হতে হবে\`)
    ];
};

// প্রতিটি ক্রস-ফিল্ড চেক সরাসরি টার্গেট ফিল্ডের সাথে বাইন্ড করা, যাতে exact { field, message } রিটার্ন করে
const fieldBoundCrossChecks = [
    body('brnNumber').custom((val, { req }) => {
        if (val && req.body.dateOfBirth && BRN_REGEX.test(String(val))) {
            const dobDate = new Date(req.body.dateOfBirth);
            if (!Number.isNaN(dobDate.getTime())) {
                const dobYear = String(dobDate.getFullYear());
                const brnYear = String(val).slice(0, 4);
                if (dobYear !== brnYear) {
                    throw new Error(\`জন্ম নিবন্ধন নম্বরের প্রথম ৪ সংখ্যা (\${brnYear}) এবং জন্মতারিখের সাল (\${dobYear}) মিলছে না\`);
                }
            }
        }
        return true;
    }),

    body('admissionDate').custom((val, { req }) => {
        if (!val) return true;
        const adm = new Date(val);
        if (Number.isNaN(adm.getTime())) {
            throw new Error('ভর্তির তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন');
        }
        if (adm > new Date()) {
            throw new Error('ভর্তির তারিখ ভবিষ্যতের তারিখ হতে পারবে না');
        }
        if (req.body.dateOfBirth) {
            const birth = new Date(req.body.dateOfBirth);
            if (!Number.isNaN(birth.getTime())) {
                const ageAtAdmission = (adm - birth) / (365.25 * 24 * 3600 * 1000);
                if (ageAtAdmission < 2.5) {
                    throw new Error('ভর্তির তারিখে শিক্ষার্থীর বয়স কমপক্ষে ২.৫ বছর হতে হবে');
                }
            }
        }
        return true;
    }),

    body('group').custom((val, { req }) => {
        const cls = req.body.classBn;
        if (['৯ম', '১০ম'].includes(cls)) {
            if (!val || !['General', 'Science', 'Muzabbid'].includes(val)) {
                throw new Error(\`\${cls} শ্রেণির জন্য বিভাগ (General, Science অথবা Muzabbid) নির্বাচন করা বাধ্যতামূলক\`);
            }
        } else if (cls && val && val !== '') {
            throw new Error('শুধুমাত্র ৯ম ও ১০ম শ্রেণির শিক্ষার্থীর জন্য বিভাগ নির্বাচন করা যাবে');
        }
        return true;
    }),

    body('fourthSubject').custom((val, { req }) => {
        const cls = req.body.classBn;
        if (cls && !['৯ম', '১০ম'].includes(cls) && val && String(val).trim() !== '') {
            throw new Error('শুধুমাত্র ৯ম ও ১০ম শ্রেণির জন্য ৪র্থ বিষয় যুক্ত করা যাবে');
        }
        return true;
    }),

    body('feeDetails.siblingStudentCode').custom((val, { req }) => {
        const category = req.body.feeDetails?.feeCategory;
        const sibCode = String(val || '').trim();
        if (category === 'Sibling Waiver') {
            if (!/^\\d{10}$/.test(sibCode)) {
                throw new Error('Sibling Waiver সুবিধা নিতে হলে ভাই/বোনের ১০ ডিজিটের স্টুডেন্ট আইডি আবশ্যক');
            }
            if (req.body.studentCode && sibCode === String(req.body.studentCode).trim()) {
                throw new Error('শিক্ষার্থী নিজের আইডিকে ভাই/বোনের রেফারেন্স হিসেবে দিতে পারবে না');
            }
        }
        return true;
    }),

    body('localGuardian.relation').custom((val, { req }) => {
        const guardianName = String(req.body.localGuardian?.name || '').trim();
        if (guardianName.length > 0 && (!val || String(val).trim().length < 2)) {
            throw new Error('স্থানীয় অভিভাবকের নাম দিলে শিক্ষার্থীর সাথে তার সম্পর্ক উল্লেখ করা আবশ্যক');
        }
        return true;
    }),

    body('localGuardian.phone').custom((val, { req }) => {
        const guardianName = String(req.body.localGuardian?.name || '').trim();
        const cleanPhone = String(val || '').trim();
        if (guardianName.length > 0 && !BD_PHONE_REGEX.test(cleanPhone)) {
            throw new Error('স্থানীয় অভিভাবকের ১১ ডিজিটের বৈধ মোবাইল নম্বর দিন (01XXXXXXXXX)');
        }
        if (cleanPhone.length > 0 && !BD_PHONE_REGEX.test(cleanPhone)) {
            throw new Error('স্থানীয় অভিভাবকের মোবাইল নম্বর অবশ্যই ১১ ডিজিটের বৈধ বাংলাদেশী নম্বর হতে হবে');
        }
        return true;
    })
];

const createStudentValidator = [
    body('studentCode')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .matches(/^\\d{10}$/).withMessage('স্টুডেন্ট আইডি দিলে তা অবশ্যই ১০ ডিজিটের সংখ্যা হতে হবে'),

    body('migratedFromSheet').optional().isBoolean().withMessage('migratedFromSheet অবশ্যই true অথবা false হতে হবে'),

    body('session')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('শিক্ষাবর্ষ (Session) আবশ্যক')
        .matches(/^20\\d{2}$/).withMessage('সেশন অবশ্যই ৪ ডিজিটের বৈধ শিক্ষাবর্ষ হতে হবে (যেমন: 2026)'),

    body('admissionDate')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('ভর্তির তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন'),

    body('fullNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('শিক্ষার্থীর বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('শিক্ষার্থীর বাংলা নামে শুধুমাত্র বাংলা অক্ষর (২-৬০ অক্ষর) ব্যবহার করুন'),

    body('fullNameEng')
        .customSanitizer(normalizeEnglishTitleCase)
        .notEmpty().withMessage('শিক্ষার্থীর ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('শিক্ষার্থীর ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর (৩-৬০ অক্ষর) ব্যবহার করুন'),

    body('gender')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('লিঙ্গ নির্বাচন আবশ্যক')
        .isIn(['Male', 'Female']).withMessage('লিঙ্গ অবশ্যই Male অথবা Female হতে হবে'),

    body('religion')
        .optional({ checkFalsy: true })
        .isIn(['Islam', 'Hinduism', 'Buddhism', 'Christianity', 'Other']).withMessage('সঠিক ধর্ম নির্বাচন করুন'),

    body('classBn')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('শ্রেণি নির্বাচন আবশ্যক')
        .isIn(VALID_CLASS_BN).withMessage('তালিকা থেকে সঠিক শ্রেণি নির্বাচন করুন'),

    body('roll')
        .notEmpty().withMessage('রোল নম্বর আবশ্যক')
        .isInt({ min: 1, max: 500 }).withMessage('রোল নম্বর ১ থেকে ৫০০-এর মধ্যে পূর্ণসংখ্যা হতে হবে'),

    body('group')
        .optional({ checkFalsy: true })
        .isIn(STUDENT_GROUPS).withMessage('সঠিক বিভাগ (General / Science / Muzabbid) নির্বাচন করুন'),

    body('fourthSubject')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 80 }).withMessage('৪র্থ বিষয়ের নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),

    body('boardRegNo')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .matches(/^\\d{6,15}$/).withMessage('বোর্ড রেজিস্ট্রেশন নম্বর ৬ থেকে ১৫ ডিজিটের সংখ্যা হতে হবে'),

    body('brnNumber')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('১৭ ডিজিটের জন্ম নিবন্ধন নম্বর আবশ্যক')
        .custom((val) => {
            if (!BRN_REGEX.test(val) || isFakeNumber(val)) {
                throw new Error('জন্ম নিবন্ধন নম্বর (BRN) অবশ্যই ১৭ ডিজিটের প্রকৃত বৈধ সংখ্যা হতে হবে');
            }
            return true;
        }),

    body('dateOfBirth')
        .notEmpty().withMessage('জন্ম তারিখ আবশ্যক')
        .isISO8601().withMessage('জন্ম তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন')
        .custom((dob) => {
            const birth = new Date(dob);
            const today = new Date();
            if (birth > today) throw new Error('জন্ম তারিখ ভবিষ্যতের হতে পারে না');
            const age = (today - birth) / (365.25 * 24 * 3600 * 1000);
            if (age < 2.5 || age > 22) {
                throw new Error('শিক্ষার্থীর বয়স ২.৫ থেকে ২২ বছরের মধ্যে হতে হবে');
            }
            return true;
        }),

    body('bloodGroup')
        .optional({ checkFalsy: true })
        .isIn(BLOOD_GROUPS).withMessage('সঠিক রক্তের গ্রুপ নির্বাচন করুন'),

    body('fathersNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('পিতার বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('পিতার বাংলা নামে শুধুমাত্র বাংলা অক্ষর (২-৬০ অক্ষর) ব্যবহার করুন'),

    body('fathersNameEng')
        .customSanitizer(normalizeEnglishTitleCase)
        .notEmpty().withMessage('পিতার ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('পিতার ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর (৩-৬০ অক্ষর) ব্যবহার করুন'),

    body('fatherNid')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .custom((val) => validateBangladeshiNid(val, 'পিতার NID নম্বর')),

    body('fatherOccupation')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 80 }).withMessage('পিতার পেশা সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),

    body('mothersNameBng')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('মাতার বাংলা নাম আবশ্যক')
        .matches(BNG_NAME_REGEX).withMessage('মাতার বাংলা নামে শুধুমাত্র বাংলা অক্ষর (২-৬০ অক্ষর) ব্যবহার করুন'),

    body('mothersNameEng')
        .customSanitizer(normalizeEnglishTitleCase)
        .notEmpty().withMessage('মাতার ইংরেজি নাম আবশ্যক')
        .matches(ENG_NAME_REGEX).withMessage('মাতার ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর (৩-৬০ অক্ষর) ব্যবহার করুন'),

    body('motherNid')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .custom((val) => validateBangladeshiNid(val, 'মাতার NID নম্বর')),

    body('motherOccupation')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 80 }).withMessage('মাতার পেশা সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),

    body('localGuardian.name')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ min: 2, max: 80 }).withMessage('স্থানীয় অভিভাবকের নাম ২-৮০ অক্ষরের মধ্যে হতে হবে'),

    body('localGuardian.relation')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ min: 2, max: 40 }).withMessage('স্থানীয় অভিভাবকের সম্পর্ক ২-৪০ অক্ষরের মধ্যে হতে হবে'),

    body('localGuardian.nid')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .custom((val) => validateBangladeshiNid(val, 'স্থানীয় অভিভাবকের NID নম্বর')),

    body('annualIncome')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0, max: 50000000 }).withMessage('বার্ষিক আয় ০ থেকে ৫ কোটির মধ্যে বৈধ সংখ্যা হতে হবে'),

    body('phone')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('অভিভাবকের মোবাইল/হোয়াটসঅ্যাপ নম্বর আবশ্যক')
        .matches(BD_PHONE_REGEX).withMessage('অভিভাবকের মোবাইল নম্বর অবশ্যই ১১ ডিজিটের বৈধ বাংলাদেশী নম্বর হতে হবে (01XXXXXXXXX)'),

    body('emergencyContact.contactName')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 80 }).withMessage('জরুরি যোগাযোগকারীর নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),

    body('emergencyContact.relationship')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 40 }).withMessage('জরুরি যোগাযোগকারীর সম্পর্ক সর্বোচ্চ ৪০ অক্ষরের হতে পারে'),

    body('emergencyContact.phone')
        .customSanitizer(sanitizeClean)
        .notEmpty().withMessage('জরুরি যোগাযোগের মোবাইল নম্বর আবশ্যক')
        .matches(BD_PHONE_REGEX).withMessage('জরুরি যোগাযোগের নম্বর অবশ্যই ১১ ডিজিটের বৈধ বাংলাদেশী নম্বর হতে হবে (01XXXXXXXXX)'),

    ...buildAddressValidators('presentAddress', false),
    ...buildAddressValidators('permanentAddress', true),

    body('feeDetails.monthlyFee')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0, max: 50000 }).withMessage('মাসিক বেতন ০ থেকে ৫০,০০০ টাকার মধ্যে বৈধ সংখ্যা হতে হবে'),

    body('feeDetails.feeCategory')
        .optional()
        .isIn(FEE_CATEGORIES).withMessage('সঠিক বেতন ক্যাটাগরি নির্বাচন করুন'),

    body('feeDetails.siblingStudentCode')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .matches(/^\\d{10}$/).withMessage('ভাই/বোনের স্টুডেন্ট আইডি অবশ্যই ১০ ডিজিটের হতে হবে'),

    body('profilePicture.url')
        .notEmpty().withMessage('শিক্ষার্থীর ছবি আবশ্যক')
        .isURL().withMessage('ছবির সঠিক URL প্রদান করুন'),

    body('medicalNote')
        .optional({ checkFalsy: true })
        .customSanitizer(sanitizeClean)
        .isLength({ max: 300 }).withMessage('মেডিকেল নোট সর্বোচ্চ ৩০০ অক্ষরের হতে পারে'),

    body('biometricDeviceId')
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage('বায়োমেট্রিক ডিভাইস আইডি ধনাত্মক পূর্ণসংখ্যা হতে হবে'),

    ...fieldBoundCrossChecks
];

const updateStudentValidator = [
    body('studentCode').not().exists().withMessage('স্টুডেন্ট আইডি (studentCode) কোনোভাবেই পরিবর্তন করা যাবে না'),
    body('session').optional().customSanitizer(sanitizeClean).matches(/^20\\d{2}$/).withMessage('সেশন অবশ্যই ৪ ডিজিটের বৈধ শিক্ষাবর্ষ হতে হবে (যেমন: 2026)'),
    body('admissionDate').optional({ checkFalsy: true }).isISO8601().withMessage('ভর্তির তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন'),
    body('fullNameBng').optional().customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX).withMessage('শিক্ষার্থীর বাংলা নামে শুধুমাত্র বাংলা অক্ষর (২-৬০ অক্ষর) ব্যবহার করুন'),
    body('fullNameEng').optional().customSanitizer(normalizeEnglishTitleCase).matches(ENG_NAME_REGEX).withMessage('শিক্ষার্থীর ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর (৩-৬০ অক্ষর) ব্যবহার করুন'),
    body('gender').optional().isIn(['Male', 'Female']).withMessage('লিঙ্গ অবশ্যই Male অথবা Female হতে হবে'),
    body('religion').optional({ checkFalsy: true }).isIn(['Islam', 'Hinduism', 'Buddhism', 'Christianity', 'Other']).withMessage('সঠিক ধর্ম নির্বাচন করুন'),
    body('classBn').optional().isIn(VALID_CLASS_BN).withMessage('তালিকা থেকে সঠিক শ্রেণি নির্বাচন করুন'),
    body('roll').optional().isInt({ min: 1, max: 500 }).withMessage('রোল নম্বর ১ থেকে ৫০০-এর মধ্যে পূর্ণসংখ্যা হতে হবে'),
    body('group').optional({ checkFalsy: true }).isIn(STUDENT_GROUPS).withMessage('সঠিক বিভাগ (General / Science / Muzabbid) নির্বাচন করুন'),
    body('fourthSubject').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage('৪র্থ বিষয়ের নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),
    body('boardRegNo').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).matches(/^\\d{6,15}$/).withMessage('বোর্ড রেজিস্ট্রেশন নম্বর ৬ থেকে ১৫ ডিজিটের সংখ্যা হতে হবে'),
    body('brnNumber').optional().customSanitizer(sanitizeClean).custom((val) => {
        if (!BRN_REGEX.test(val) || isFakeNumber(val)) {
            throw new Error('জন্ম নিবন্ধন নম্বর (BRN) অবশ্যই ১৭ ডিজিটের প্রকৃত বৈধ সংখ্যা হতে হবে');
        }
        return true;
    }),
    body('dateOfBirth').optional().isISO8601().withMessage('জন্ম তারিখ সঠিক ফরম্যাটে (YYYY-MM-DD) দিন').custom((dob) => {
        const birth = new Date(dob);
        const today = new Date();
        if (birth > today) throw new Error('জন্ম তারিখ ভবিষ্যতের হতে পারে না');
        const age = (today - birth) / (365.25 * 24 * 3600 * 1000);
        if (age < 2.5 || age > 22) throw new Error('শিক্ষার্থীর বয়স ২.৫ থেকে ২২ বছরের মধ্যে হতে হবে');
        return true;
    }),
    body('bloodGroup').optional().isIn(BLOOD_GROUPS).withMessage('সঠিক রক্তের গ্রুপ নির্বাচন করুন'),
    body('fathersNameBng').optional().customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX).withMessage('পিতার বাংলা নামে শুধুমাত্র বাংলা অক্ষর (২-৬০ অক্ষর) ব্যবহার করুন'),
    body('fathersNameEng').optional().customSanitizer(normalizeEnglishTitleCase).matches(ENG_NAME_REGEX).withMessage('পিতার ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর (৩-৬০ অক্ষর) ব্যবহার করুন'),
    body('fatherNid').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).custom((val) => validateBangladeshiNid(val, 'পিতার NID নম্বর')),
    body('fatherOccupation').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage('পিতার পেশা সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),
    body('mothersNameBng').optional().customSanitizer(sanitizeClean).matches(BNG_NAME_REGEX).withMessage('মাতার বাংলা নামে শুধুমাত্র বাংলা অক্ষর (২-৬০ অক্ষর) ব্যবহার করুন'),
    body('mothersNameEng').optional().customSanitizer(normalizeEnglishTitleCase).matches(ENG_NAME_REGEX).withMessage('মাতার ইংরেজি নামে শুধুমাত্র ইংরেজি অক্ষর (৩-৬০ অক্ষর) ব্যবহার করুন'),
    body('motherNid').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).custom((val) => validateBangladeshiNid(val, 'মাতার NID নম্বর')),
    body('motherOccupation').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage('মাতার পেশা সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),
    body('localGuardian.name').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ min: 2, max: 80 }).withMessage('স্থানীয় অভিভাবকের নাম ২-৮০ অক্ষরের মধ্যে হতে হবে'),
    body('localGuardian.relation').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ min: 2, max: 40 }).withMessage('স্থানীয় অভিভাবকের সম্পর্ক ২-৪০ অক্ষরের মধ্যে হতে হবে'),
    body('localGuardian.nid').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).custom((val) => validateBangladeshiNid(val, 'স্থানীয় অভিভাবকের NID নম্বর')),
    body('annualIncome').optional().isFloat({ min: 0, max: 50000000 }).withMessage('বার্ষিক আয় ০ থেকে ৫ কোটির মধ্যে বৈধ সংখ্যা হতে হবে'),
    body('phone').optional().customSanitizer(sanitizeClean).matches(BD_PHONE_REGEX).withMessage('অভিভাবকের মোবাইল নম্বর অবশ্যই ১১ ডিজিটের বৈধ বাংলাদেশী নম্বর হতে হবে'),
    body('emergencyContact.contactName').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 80 }).withMessage('জরুরি যোগাযোগকারীর নাম সর্বোচ্চ ৮০ অক্ষরের হতে পারে'),
    body('emergencyContact.relationship').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 40 }).withMessage('জরুরি যোগাযোগকারীর সম্পর্ক সর্বোচ্চ ৪০ অক্ষরের হতে পারে'),
    body('emergencyContact.phone').optional().customSanitizer(sanitizeClean).matches(BD_PHONE_REGEX).withMessage('জরুরি যোগাযোগের নম্বর অবশ্যই ১১ ডিজিটের বৈধ বাংলাদেশী নম্বর হতে হবে'),
    ...buildAddressValidators('presentAddress', true),
    ...buildAddressValidators('permanentAddress', true),
    body('feeDetails.monthlyFee').optional().isFloat({ min: 0, max: 50000 }).withMessage('মাসিক বেতন ০ থেকে ৫০,০০০ টাকার মধ্যে বৈধ সংখ্যা হতে হবে'),
    body('feeDetails.feeCategory').optional().isIn(FEE_CATEGORIES).withMessage('সঠিক বেতন ক্যাটাগরি নির্বাচন করুন'),
    body('feeDetails.siblingStudentCode').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).matches(/^\\d{10}$/).withMessage('ভাই/বোনের স্টুডেন্ট আইডি অবশ্যই ১০ ডিজিটের হতে হবে'),
    body('profilePicture.url').optional().isURL().withMessage('ছবির সঠিক URL প্রদান করুন'),
    body('medicalNote').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 300 }).withMessage('মেডিকেল নোট সর্বোচ্চ ৩০০ অক্ষরের হতে পারে'),
    body('biometricDeviceId').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('বায়োমেট্রিক ডিভাইস আইডি ধনাত্মক পূর্ণসংখ্যা হতে হবে'),
    body('status').optional().isIn(STUDENT_STATUSES).withMessage('সঠিক স্ট্যাটাস নির্বাচন করুন'),
    body('statusReason').optional({ checkFalsy: true }).customSanitizer(sanitizeClean).isLength({ max: 250 }).withMessage('স্ট্যাটাস পরিবর্তনের কারণ সর্বোচ্চ ২৫০ অক্ষরের হতে পারে'),

    ...fieldBoundCrossChecks
];

module.exports = {
    createStudentValidator,
    updateStudentValidator
};
`;

fs.writeFileSync(path.join(srcDir, 'validators', 'student.validator.js'), validatorCode, 'utf8');
console.log('✅ Updated: src/validators/student.validator.js (100% field-bound rules)');

// ============================================================================
// 2. REWRITE src/middlewares/error.middleware.js (Full Student & Teacher Labels + Field-Level 11000/CastError)
// ============================================================================
const errorMiddlewareCode = `const ApiError = require('../utils/ApiError');

const FIELD_LABELS = {
    // Teacher & Common Fields
    phone: 'মোবাইল নম্বর',
    nidNumber: 'জাতীয় পরিচয়পত্র নম্বর',
    birthRegNumber: 'জন্ম নিবন্ধন নম্বর',
    email: 'ইমেইল',
    teacherCode: 'শিক্ষক আইডি',
    biometricDeviceId: 'বায়োমেট্রিক আইডি',
    indexNumber: 'ইনডেক্স নম্বর',
    uid: 'রেজিস্ট্রি আইডি',
    password: 'পাসওয়ার্ড',
    basicSalary: 'মূল বেতন',
    customLeaveQuota: 'মাসিক ছুটির কোটা',
    designation: 'পদবী',
    assignedClass: 'নির্ধারিত শ্রেণি',

    // Student Fields
    studentCode: 'স্টুডেন্ট আইডি',
    fullNameBng: 'নাম (বাংলা)',
    fullNameEng: 'নাম (ইংরেজি)',
    dateOfBirth: 'জন্ম তারিখ',
    gender: 'লিঙ্গ',
    religion: 'ধর্ম',
    bloodGroup: 'রক্তের গ্রুপ',
    brnNumber: 'জন্ম নিবন্ধন নম্বর (BRN)',
    medicalNote: 'মেডিকেল নোট',
    admissionDate: 'ভর্তির তারিখ',
    session: 'শিক্ষাবর্ষ (Session)',
    classBn: 'শ্রেণি',
    roll: 'রোল নম্বর',
    group: 'বিভাগ',
    fourthSubject: '৪র্থ বিষয়',
    boardRegNo: 'বোর্ড রেজিস্ট্রেশন নম্বর',
    fathersNameBng: 'পিতার নাম (বাংলা)',
    fathersNameEng: 'পিতার নাম (ইংরেজি)',
    fatherNid: 'পিতার NID নম্বর',
    fatherOccupation: 'পিতার পেশা',
    mothersNameBng: 'মাতার নাম (বাংলা)',
    mothersNameEng: 'মাতার নাম (ইংরেজি)',
    motherNid: 'মাতার NID নম্বর',
    motherOccupation: 'মাতার পেশা',
    'localGuardian.name': 'স্থানীয় অভিভাবকের নাম',
    'localGuardian.relation': 'স্থানীয় অভিভাবকের সম্পর্ক',
    'localGuardian.nid': 'স্থানীয় অভিভাবকের NID',
    'localGuardian.phone': 'স্থানীয় অভিভাবকের মোবাইল',
    annualIncome: 'বার্ষিক আয়',
    'emergencyContact.phone': 'জরুরি যোগাযোগের নম্বর',
    'presentAddress.houseNameBn': 'বর্তমান বাড়ির নাম (বাংলা)',
    'presentAddress.houseNameEn': 'বর্তমান বাড়ির নাম (ইংরেজি)',
    'presentAddress.villageBn': 'বর্তমান গ্রাম (বাংলা)',
    'presentAddress.villageEn': 'বর্তমান গ্রাম (ইংরেজি)',
    'presentAddress.unionBn': 'বর্তমান ইউনিয়ন (বাংলা)',
    'presentAddress.unionEn': 'বর্তমান ইউনিয়ন (ইংরেজি)',
    'presentAddress.wardNo': 'বর্তমান ওয়ার্ড নম্বর',
    'presentAddress.upazilaBn': 'বর্তমান উপজেলা (বাংলা)',
    'presentAddress.upazilaEn': 'বর্তমান উপজেলা (ইংরেজি)',
    'presentAddress.districtBn': 'বর্তমান জেলা (বাংলা)',
    'presentAddress.districtEn': 'বর্তমান জেলা (ইংরেজি)',
    'permanentAddress.houseNameBn': 'স্থায়ী বাড়ির নাম (বাংলা)',
    'permanentAddress.houseNameEn': 'স্থায়ী বাড়ির নাম (ইংরেজি)',
    'permanentAddress.villageBn': 'স্থায়ী গ্রাম (বাংলা)',
    'permanentAddress.villageEn': 'স্থায়ী গ্রাম (ইংরেজি)',
    'permanentAddress.unionBn': 'স্থায়ী ইউনিয়ন (বাংলা)',
    'permanentAddress.unionEn': 'স্থায়ী ইউনিয়ন (ইংরেজি)',
    'permanentAddress.wardNo': 'স্থায়ী ওয়ার্ড নম্বর',
    'permanentAddress.upazilaBn': 'স্থায়ী উপজেলা (বাংলা)',
    'permanentAddress.upazilaEn': 'স্থায়ী উপজেলা (ইংরেজি)',
    'permanentAddress.districtBn': 'স্থায়ী জেলা (বাংলা)',
    'permanentAddress.districtEn': 'স্থায়ী জেলা (ইংরেজি)',
    'feeDetails.monthlyFee': 'মাসিক বেতন',
    'feeDetails.feeCategory': 'বেতন ক্যাটাগরি',
    'feeDetails.siblingStudentCode': 'ভাই/বোনের স্টুডেন্ট আইডি',
    'profilePicture.url': 'শিক্ষার্থীর ছবি',
    status: 'স্ট্যাটাস',
    statusReason: 'স্ট্যাটাস পরিবর্তনের কারণ'
};

const errorHandler = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
        const messages = {
            400: 'অনুরোধের তথ্য সঠিক নয়। দেওয়া তথ্যগুলো যাচাই করুন।',
            401: 'এই কাজটি করতে লগইন করতে হবে।',
            403: 'এই কাজটি করার অনুমতি আপনার নেই।',
            404: 'অনুরোধ করা তথ্য বা API রুটটি পাওয়া যায়নি।',
            409: 'এই তথ্যের সঙ্গে আগে থেকেই একটি রেকর্ড রয়েছে।',
            413: 'পাঠানো ফাইল বা তথ্যের আকার অনুমোদিত সীমার চেয়ে বড়।',
            429: 'অনেকবার অনুরোধ করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।',
            500: 'সার্ভারে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।'
        };
        const message = messages[statusCode] || messages[500];
        error = new ApiError(statusCode, message, [], false);
    }

    if (err.name === 'StrictModeError') {
        const badField = err.path || 'unknown';
        error = new ApiError(
            400,
            \`অননুমোদিত বা অজানা ফিল্ড (\${badField}) পাঠানো হয়েছে!\`,
            [{ field: badField, message: 'এই ফিল্ডটি সিস্টেমে অনুমোদিত নয়' }]
        );
    }

    if (err.name === 'CastError') {
        const field = err.path || '';
        const label = FIELD_LABELS[field] || 'তথ্যের ফরম্যাট';
        error = new ApiError(
            400,
            \`\${label} সঠিক ফরম্যাটে নেই। অনুগ্রহ করে আবার যাচাই করুন।\`,
            field ? [{ field, message: \`\${label} সঠিক ফরম্যাটে দিন\` }] : []
        );
    }

    if (err.code === 11000) {
        const keys = Object.keys(err.keyValue || {});
        if (keys.includes('session') && keys.includes('classBn') && keys.includes('roll')) {
            error = new ApiError(
                409,
                'এই সেশন ও শ্রেণিতে প্রদত্ত রোল নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে।',
                [{ field: 'roll', message: 'এই শ্রেণিতে এই রোল নম্বর আগে থেকেই আছে' }]
            );
        } else {
            const field = keys[0] || '';
            const label = FIELD_LABELS[field] || 'এই তথ্য';
            const message = \`\${label} দিয়ে আগে থেকেই একটি রেকর্ড রয়েছে।\`;
            error = new ApiError(
                409,
                message,
                field ? [{ field, message: \`এই \${label} ইতিমধ্যে ব্যবহৃত হয়েছে\` }] : []
            );
        }
    }

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((el) => {
            const label = FIELD_LABELS[el.path] || 'এই তথ্য';
            const msg = el.kind === 'required'
                ? \`\${label} অবশ্যই দিতে হবে।\`
                : el.kind === 'enum'
                    ? \`\${label} থেকে সঠিক অপশন নির্বাচন করুন।\`
                    : /[\\u0980-\\u09FF]/.test(el.message)
                        ? el.message
                        : \`\${label} সঠিক নয়।\`;
            return { field: el.path, message: msg };
        });
        error = new ApiError(400, 'ডেটা ভ্যালিডেশন ব্যর্থ হয়েছে', errors);
    }

    if (err.name === 'MulterError') {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'ফাইলটি ৫ MB সীমার চেয়ে বড়। ছোট ফাইল নির্বাচন করুন।'
            : 'ফাইল আপলোডের তথ্য সঠিক নয়। ফাইলটি আবার নির্বাচন করুন।';
        error = new ApiError(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, message);
    }

    if (err.name === 'JsonWebTokenError') {
        error = new ApiError(401, 'ইনভ্যালিড সিকিউরিটি টোকেন! অনুগ্রহ করে আবার লগইন করুন।');
    }
    if (err.name === 'TokenExpiredError') {
        error = new ApiError(401, 'আপনার লগইন সেশনের মেয়াদ শেষ হয়ে গেছে! অনুগ্রহ করে আবার লগইন করুন।');
    }

    if (error.statusCode >= 500) {
        console.error('[API ERROR]', {
            method: req.method,
            path: req.path,
            errorName: err.name,
            errorMessage: err.message,
            stack: err.stack
        });
    }
    if (error.meta?.retryAfterSeconds) {
        res.set('Retry-After', String(error.meta.retryAfterSeconds));
    }

    const response = {
        success: false,
        statusCode: error.statusCode,
        message: error.message,
        timestamp: new Date().toISOString(),
        ...(error.meta && { meta: error.meta }),
        ...(error.errors.length > 0 && { errors: error.errors }),
    };

    return res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
`;

fs.writeFileSync(path.join(srcDir, 'middlewares', 'error.middleware.js'), errorMiddlewareCode, 'utf8');
console.log('✅ Updated: src/middlewares/error.middleware.js (All student & teacher field labels + field-level errors)');

// ============================================================================
// 3. PATCH student.controller.js business errors with exact { field, message }
// ============================================================================
const controllerPath = path.join(srcDir, 'controllers', 'student.controller.js');
if (fs.existsSync(controllerPath)) {
    let ctrl = fs.readFileSync(controllerPath, 'utf8');
    const replacements = [
        [
            "throw new ApiError(400, 'Sibling Waiver ক্যাটাগরির জন্য ভাই/বোনের স্টুডেন্ট আইডি আবশ্যক!');",
            "throw new ApiError(400, 'Sibling Waiver ক্যাটাগরির জন্য ভাই/বোনের স্টুডেন্ট আইডি আবশ্যক!', [{ field: 'feeDetails.siblingStudentCode', message: 'ভাই/বোনের ১০ ডিজিটের স্টুডেন্ট আইডি দিন' }]);"
        ],
        [
            "throw new ApiError(400, 'শিক্ষার্থী নিজের আইডিকে ভাই/বোনের রেফারেন্স হিসেবে দিতে পারবে না!');",
            "throw new ApiError(400, 'নিজের আইডি ভাই/বোনের রেফারেন্স হিসেবে দেওয়া যাবে না!', [{ field: 'feeDetails.siblingStudentCode', message: 'অন্য ভাই/বোনের আইডি দিন' }]);"
        ],
        [
            "throw new ApiError(404, \`প্রদত্ত ভাই/বোনের স্টুডেন্ট আইডি (\${sibCode}) মাদ্রাসার সক্রিয় শিক্ষার্থী তালিকায় খুঁজে পাওয়া যায়নি!\`);",
            "throw new ApiError(404, \`ভাই/বোনের স্টুডেন্ট আইডি (\${sibCode}) পাওয়া যায়নি!\`, [{ field: 'feeDetails.siblingStudentCode', message: 'সক্রিয় ভাই/বোনের সঠিক আইডি দিন' }]);"
        ],
        [
            "throw new ApiError(409, \`স্টুডেন্ট আইডি (\${studentCode}) ইতিমধ্যে ডাটাবেজে নিবন্ধিত আছে!\`);",
            "throw new ApiError(409, \`স্টুডেন্ট আইডি (\${studentCode}) ইতিমধ্যে নিবন্ধিত আছে!\`, [{ field: 'studentCode', message: 'এই স্টুডেন্ট আইডি ইতিমধ্যে ব্যবহৃত হয়েছে' }]);"
        ],
        [
            "throw new ApiError(409, \`এই জন্ম নিবন্ধন নম্বর (\${brnNumber}) দিয়ে ইতিমধ্যে '\${duplicateIdentity.fullNameBng}' নিবন্ধিত আছে!\`);",
            "throw new ApiError(409, \`জন্ম নিবন্ধন নম্বর (\${brnNumber}) ইতিমধ্যে নিবন্ধিত!\`, [{ field: 'brnNumber', message: \`ইতিমধ্যে '\${duplicateIdentity.fullNameBng}'-এর নামে নিবন্ধিত\` }]);"
        ],
        [
            "throw new ApiError(409, 'প্রদত্ত বোর্ড রেজিস্ট্রেশন নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে!');",
            "throw new ApiError(409, 'বোর্ড রেজিস্ট্রেশন নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে!', [{ field: 'boardRegNo', message: 'এই বোর্ড রেজিস্ট্রেশন নম্বর আগে ব্যবহৃত হয়েছে' }]);"
        ],
        [
            "throw new ApiError(409, \`\${session} শিক্ষাবর্ষে \${classBn} শ্রেণিতে রোল নম্বর \${roll} ইতিমধ্যে '\${duplicateRoll.fullNameBng}'-এর নামে বরাদ্দ আছে!\`);",
            "throw new ApiError(409, \`\${classBn} শ্রেণিতে রোল \${roll} ইতিমধ্যে বরাদ্দ আছে!\`, [{ field: 'roll', message: \`'\${duplicateRoll.fullNameBng}'-এর রোল ইতিমধ্যে \${roll}\` }]);"
        ],
        [
            "throw new ApiError(400, \`জন্ম নিবন্ধন নম্বরের প্রথম ৪ সংখ্যা (\${String(nextBrn).slice(0, 4)}) এবং জন্মতারিখের সাল (\${nextDob.getFullYear()}) মিলছে না!\`);",
            "throw new ApiError(400, 'জন্ম নিবন্ধন নম্বর ও জন্মসাল মিলছে না!', [{ field: 'brnNumber', message: \`BRN-এর প্রথম ৪ সংখ্যা জন্মসাল (\${nextDob.getFullYear()}) হতে হবে\` }]);"
        ],
        [
            "throw new ApiError(409, \`\${nextSession} সেশনে \${nextClass} শ্রেণিতে রোল নম্বর \${nextRoll} ইতিমধ্যে '\${rollConflict.fullNameBng}'-এর নামে আছে!\`);",
            "throw new ApiError(409, \`\${nextClass} শ্রেণিতে রোল \${nextRoll} ইতিমধ্যে আছে!\`, [{ field: 'roll', message: \`'\${rollConflict.fullNameBng}'-এর রোল ইতিমধ্যে \${nextRoll}\` }]);"
        ],
        [
            "throw new ApiError(409, 'এই জন্ম নিবন্ধন নম্বরটি অন্য শিক্ষার্থীর প্রোফাইলে ব্যবহৃত হয়েছে!');",
            "throw new ApiError(409, 'এই জন্ম নিবন্ধন নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে!', [{ field: 'brnNumber', message: 'অন্য শিক্ষার্থীর প্রোফাইলে ব্যবহৃত' }]);"
        ]
    ];
    for (const [oldStr, newStr] of replacements) {
        ctrl = ctrl.replace(oldStr, newStr);
    }
    fs.writeFileSync(controllerPath, ctrl, 'utf8');
    console.log('✅ Updated: src/controllers/student.controller.js');
}

console.log('\\n🛡️ ১০০% ফিল্ড-লেভেল এরর ম্যাপিং সম্পন্ন হয়েছে!');
`