/**
 * ARDM Enterprise ERP — Military-Grade Input Sanitization & Validation Engine
 * Zero-tolerance validation for Bilingual Names, NID/Birth Registration,
 * Age/Joining consistency, Emergency Contact separation, Academic GPA, and Square 500x500 Photos.
 */

import { DESIGNATION_LIST, BLOOD_GROUPS, DEGREE_LEVELS } from '@constants/app.constants';
import { toEnglishDigits, extractPureDigits, calculateExactAge } from './formatters';

/* --------------------------------------------------------------------------
 * REGEX PATTERNS (Strict Character Set Locks)
 * -------------------------------------------------------------------------- */
// ইংরেজি নাম: শুরুতে ইংরেজি বর্ণ, ভেতরে শুধু ইংরেজি বর্ণ, স্পেস, ডট (.), হাইফেন (-) ও অ্যাপোস্ট্রফি (')
const ENGLISH_NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{2,59}$/;

// বাংলা নাম: ইউনিকোড বাংলা পরিসর (\u0980-\u09FF), স্পেস, ডট (.), বিসর্গ, চন্দ্রবিন্দু ও হাইফেন
const BENGALI_NAME_REGEX = /^[\u0980-\u09FF][\u0980-\u09FF\s.'-]{1,59}$/;

// বাংলাদেশী মোবাইল নম্বর: 013, 014, 015, 016, 017, 018, 019 দিয়ে শুরু ১১ ডিজিট
const BD_MOBILE_REGEX = /^01[3-9]\d{8}$/;

// ঠিকানা (বাড়ি/গ্রাম): বাংলা, ইংরেজি, সংখ্যা, কমা, স্ল্যাশ ও হাইফেন (২ থেকে ৮০ অক্ষর)
const ADDRESS_LINE_REGEX = /^[A-Za-z0-9\u0980-\u09FF\s,./#()'&-]{2,80}$/;

// ভুয়া রিপিটেড ডিজিট চেক (যেমন: 1111111111 বা 99999999999999999)
const REPEATED_DIGITS_REGEX = /^(\d)\1+$/;

// সিকোয়েন্সিয়াল ভুয়া নম্বর ব্লক করার প্যাটার্ন
const SEQUENTIAL_FAKE_PATTERNS = ['1234567890', '0123456789', '9876543210', '0987654321'];

/* --------------------------------------------------------------------------
 * 1. SANITIZERS (XSS, HTML Tag & Invisible Control Character Strippers)
 * -------------------------------------------------------------------------- */

/**
 * টেক্সট স্যানিটাইজার (ফর্ম সাবমিট বা ব্লারের সময় সম্পূর্ণ ক্লিন করার জন্য)
 */
export function sanitizeText(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/<[^>]*>/g, '') // যেকোনো HTML বা script ট্যাগ মুছে ফেলা
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ') // অদৃশ্য কন্ট্রোল ক্যারেক্টার মুছে ফেলা
        .replace(/\s+/g, ' ') // একাধিক স্পেসকে এক স্পেসে আনা
        .trim();
}

/**
 * লাইভ টাইপিং স্যানিটাইজার (যাতে টাইপ করার সময় স্পেস বার কাজ করে কিন্তু ক্ষতিকর কোড না ঢোকে)
 */
export function sanitizeLiveInput(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/<[^>]*>/g, '')
        .replace(/\s{2,}/g, ' ');
}

/* --------------------------------------------------------------------------
 * 2. BILINGUAL NAME VALIDATORS (Teacher, Father & Mother)
 * -------------------------------------------------------------------------- */

/**
 * ইংরেজি নাম যাচাই (শিক্ষক, পিতা অথবা মাতা)
 */
export function validateEnglishName(value, fieldLabelBng = 'ইংরেজি নাম') {
    const clean = sanitizeText(value);

    if (!clean) {
        return { valid: false, error: `${fieldLabelBng} প্রদান করা আবশ্যক।` };
    }
    if (/[\u0980-\u09FF]/.test(clean)) {
        return { valid: false, error: `${fieldLabelBng}-এ বাংলা অক্ষর ব্যবহার করা যাবে না, শুধুমাত্র ইংরেজি অক্ষর (A-Z) লিখুন।` };
    }
    if (/\d/.test(clean)) {
        return { valid: false, error: `${fieldLabelBng}-এ কোনো সংখ্যা (0-9) ব্যবহার করা যাবে না।` };
    }
    if (clean.length < 3) {
        return { valid: false, error: `${fieldLabelBng} কমপক্ষে ৩ অক্ষরের হতে হবে।` };
    }
    if (clean.length > 60) {
        return { valid: false, error: `${fieldLabelBng} সর্বোচ্চ ৬০ অক্ষরের মধ্যে হতে হবে।` };
    }
    if (!ENGLISH_NAME_REGEX.test(clean)) {
        return { valid: false, error: `${fieldLabelBng}-এ শুধুমাত্র বৈধ ইংরেজি অক্ষর, ডট (.) বা হাইফেন (-) ব্যবহার করুন।` };
    }

    return { valid: true, error: '', cleanValue: clean };
}

/**
 * বাংলা নাম যাচাই (শিক্ষক, পিতা অথবা মাতা)
 */
export function validateBengaliName(value, fieldLabelBng = 'বাংলা নাম') {
    const clean = sanitizeText(value);

    if (!clean) {
        return { valid: false, error: `${fieldLabelBng} প্রদান করা আবশ্যক।` };
    }
    if (/[A-Za-z]/.test(clean)) {
        return { valid: false, error: `${fieldLabelBng}-এ ইংরেজি অক্ষর (A-Z) ব্যবহার করা যাবে না, ইউনিকোড বাংলায় লিখুন।` };
    }
    if (/[0-9০-৯]/.test(clean)) {
        return { valid: false, error: `${fieldLabelBng}-এ কোনো সংখ্যা ব্যবহার করা যাবে না।` };
    }
    if (clean.length < 2) {
        return { valid: false, error: `${fieldLabelBng} কমপক্ষে ২ অক্ষরের হতে হবে।` };
    }
    if (clean.length > 60) {
        return { valid: false, error: `${fieldLabelBng} সর্বোচ্চ ৬০ অক্ষরের মধ্যে হতে হবে।` };
    }
    if (!BENGALI_NAME_REGEX.test(clean)) {
        return { valid: false, error: `${fieldLabelBng} শুধুমাত্র বাংলা অক্ষরে সনদপত্র অনুযায়ী লিখুন।` };
    }

    return { valid: true, error: '', cleanValue: clean };
}

/* --------------------------------------------------------------------------
 * 3. IDENTITY DOCUMENT VALIDATORS (NID OR Birth Registration)
 * -------------------------------------------------------------------------- */

/**
 * এককভাবে জাতীয় পরিচয়পত্র (NID: 10, 13 বা 17 ডিজিট) যাচাই
 */
export function validateNidNumber(value, isRequired = false) {
    const cleanDigits = extractPureDigits(value);

    if (!cleanDigits) {
        if (isRequired) {
            return { valid: false, error: 'জাতীয় পরিচয়পত্র (NID) নম্বর প্রদান করা আবশ্যক।' };
        }
        return { valid: true, error: '', cleanValue: '' };
    }

    if (![10, 13, 17].includes(cleanDigits.length)) {
        return {
            valid: false,
            error: `NID নম্বর অবশ্যই ১০, ১৩ অথবা ১৭ সংখ্যার হতে হবে (আপনি দিয়েছেন ${cleanDigits.length} সংখ্যা)।`
        };
    }

    if (REPEATED_DIGITS_REGEX.test(cleanDigits)) {
        return { valid: false, error: 'প্রদত্ত NID নম্বরটি ভুয়া বা অকার্যকর (একই সংখ্যার পুনরাবৃত্তি গ্রহণযোগ্য নয়)।' };
    }

    if (SEQUENTIAL_FAKE_PATTERNS.some((seq) => cleanDigits.includes(seq))) {
        return { valid: false, error: 'প্রদত্ত NID নম্বরটি সঠিক নয়, অনুগ্রহ করে আসল কার্ড দেখে এন্ট্রি করুন।' };
    }

    return { valid: true, error: '', cleanValue: cleanDigits };
}

/**
 * এককভাবে ডিজিটাল জন্ম নিবন্ধন নম্বর (Birth Registration: ঠিক ১৭ ডিজিট) যাচাই
 */
export function validateBirthRegNumber(value, isRequired = false) {
    const cleanDigits = extractPureDigits(value);

    if (!cleanDigits) {
        if (isRequired) {
            return { valid: false, error: '১৭ সংখ্যার ডিজিটাল জন্ম নিবন্ধন নম্বর প্রদান করা আবশ্যক।' };
        }
        return { valid: true, error: '', cleanValue: '' };
    }

    if (cleanDigits.length !== 17) {
        return {
            valid: false,
            error: `জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ সংখ্যার হতে হবে (আপনি দিয়েছেন ${cleanDigits.length} সংখ্যা)।`
        };
    }

    if (REPEATED_DIGITS_REGEX.test(cleanDigits)) {
        return { valid: false, error: 'প্রদত্ত জন্ম নিবন্ধন নম্বরটি ভুয়া বা অকার্যকর মনে হচ্ছে।' };
    }

    // বাংলাদেশের ১৭ সংখ্যার জন্ম নিবন্ধনের প্রথম ৪ সংখ্যা সাধারণত জন্মসাল (যেমন 1985 বা 2003) হয়ে থাকে
    const firstFour = Number(cleanDigits.slice(0, 4));
    if (firstFour < 1930 || firstFour > new Date().getFullYear()) {
        return {
            valid: false,
            error: '১৭ সংখ্যার জন্ম নিবন্ধন নম্বরটি সঠিক ফরম্যাটে নেই (প্রথম ৪ সংখ্যা জন্মসাল হতে হয়)।'
        };
    }

    return { valid: true, error: '', cleanValue: cleanDigits };
}

/**
 * যৌথ পরিচয়পত্র যাচাই: NID অথবা জন্ম নিবন্ধন — কমপক্ষে যেকোনো একটি অবশ্যই থাকতে হবে
 */
export function validateIdentityDocuments(nidValue, birthRegValue) {
    const cleanNid = extractPureDigits(nidValue);
    const cleanBirthReg = extractPureDigits(birthRegValue);

    if (!cleanNid && !cleanBirthReg) {
        return {
            valid: false,
            nidError: 'NID অথবা জন্ম নিবন্ধন — যেকোনো একটি অবশ্যই দিতে হবে।',
            birthRegError: 'NID না থাকলে ১৭ সংখ্যার জন্ম নিবন্ধন নম্বর দিন।'
        };
    }

    const nidCheck = cleanNid ? validateNidNumber(cleanNid, true) : { valid: true, error: '', cleanValue: '' };
    const birthCheck = cleanBirthReg ? validateBirthRegNumber(cleanBirthReg, true) : { valid: true, error: '', cleanValue: '' };

    return {
        valid: nidCheck.valid && birthCheck.valid,
        nidError: nidCheck.error,
        birthRegError: birthCheck.error,
        cleanNid: nidCheck.cleanValue,
        cleanBirthReg: birthCheck.cleanValue
    };
}

/* --------------------------------------------------------------------------
 * 4. DATE OF BIRTH, AGE & JOINING DATE CONSISTENCY VALIDATORS
 * -------------------------------------------------------------------------- */

/**
 * জন্ম তারিখ যাচাই (বয়স ১৫ থেকে ৭০ বছরের মধ্যে হতে হবে)
 */
export function validateDateOfBirth(dobString) {
    if (!dobString) {
        return { valid: false, error: 'জন্ম তারিখ নির্বাচন করা আবশ্যক।' };
    }

    const birthDate = new Date(dobString);
    const today = new Date();

    if (isNaN(birthDate.getTime())) {
        return { valid: false, error: 'সঠিক জন্ম তারিখ প্রদান করুন।' };
    }

    if (birthDate > today) {
        return { valid: false, error: 'জন্ম তারিখ ভবিষ্যতের হতে পারে না।' };
    }

    const ageInfo = calculateExactAge(dobString);
    if (!ageInfo) {
        return { valid: false, error: 'জন্ম তারিখ হিসাব করা যাচ্ছে না।' };
    }

    if (ageInfo.decimalYears < 15) {
        return {
            valid: false,
            error: `শিক্ষক বা স্টাফের বয়স কমপক্ষে ১৫ বছর হতে হবে (বর্তমান বয়স: ${ageInfo.formattedBng})।`
        };
    }

    if (ageInfo.decimalYears > 70) {
        return {
            valid: false,
            error: `বয়স ৭০ বছরের বেশি হতে পারবে না (${ageInfo.formattedBng})। অনুগ্রহ করে জন্মসাল যাচাই করুন।`
        };
    }

    return { valid: true, error: '', ageInfo };
}

/**
 * মাদ্রাসায় যোগদানের তারিখ যাচাই (জন্ম তারিখ থেকে কমপক্ষে ১৫ বছর পরের হতে হবে)
 */
export function validateJoiningDate(joiningDateString, dobString = '') {
    if (!joiningDateString) {
        return { valid: false, error: 'মাদ্রাসায় যোগদানের তারিখ প্রদান করা আবশ্যক।' };
    }

    const joinDate = new Date(joiningDateString);
    if (isNaN(joinDate.getTime())) {
        return { valid: false, error: 'সঠিক যোগদানের তারিখ নির্বাচন করুন।' };
    }

    if (joinDate.getFullYear() < 1970 || joinDate.getFullYear() > new Date().getFullYear() + 1) {
        return { valid: false, error: 'যোগদানের সালটি বাস্তবসম্মত নয়।' };
    }

    if (dobString) {
        const birthDate = new Date(dobString);
        if (!isNaN(birthDate.getTime())) {
            const ageAtJoining = (joinDate - birthDate) / (365.25 * 24 * 3600 * 1000);
            if (ageAtJoining < 15) {
                return {
                    valid: false,
                    error: 'জন্ম তারিখের সাথে যোগদানের তারিখ অসামঞ্জস্যপূর্ণ (যোগদানের সময় বয়স কমপক্ষে ১৫ বছর হতে হবে)।'
                };
            }
        }
    }

    return { valid: true, error: '' };
}

/* --------------------------------------------------------------------------
 * 5. MOBILE & EMERGENCY CONTACT VALIDATORS
 * -------------------------------------------------------------------------- */

/**
 * শিক্ষকের নিজস্ব ১১ ডিজিটের মোবাইল নম্বর যাচাই
 */
export function validateMobileNumber(phoneValue, fieldLabelBng = 'মোবাইল নম্বর') {
    let clean = extractPureDigits(phoneValue);

    // কেউ +8801... বা 8801... পেস্ট করলে স্বয়ংক্রিয়ভাবে ১১ ডিজিটে নিয়ে আসা
    if (clean.startsWith('8801') && clean.length === 13) {
        clean = clean.slice(2);
    }

    if (!clean) {
        return { valid: false, error: `${fieldLabelBng} প্রদান করা আবশ্যক।` };
    }

    if (clean.length !== 11) {
        return {
            valid: false,
            error: `${fieldLabelBng} অবশ্যই ১১ সংখ্যার হতে হবে (বর্তমানে আছে ${clean.length} সংখ্যা)।`
        };
    }

    if (!BD_MOBILE_REGEX.test(clean)) {
        return {
            valid: false,
            error: `সঠিক বাংলাদেশী মোবাইল নম্বর দিন (013 থেকে 019 দিয়ে শুরু হতে হবে)।`
        };
    }

    if (REPEATED_DIGITS_REGEX.test(clean.slice(3))) {
        return {
            valid: false,
            error: `প্রদত্ত ${fieldLabelBng}টি সঠিক মনে হচ্ছে না।`
        };
    }

    return { valid: true, error: '', cleanValue: clean };
}

/**
 * জরুরি যোগাযোগের মোবাইল নম্বর যাচাই (শিক্ষকের নিজের নম্বরের সাথে কখনোই মিলতে পারবে না)
 */
export function validateEmergencyPhone(emergencyPhoneValue, primaryPhoneValue) {
    const check = validateMobileNumber(emergencyPhoneValue, 'জরুরি যোগাযোগের নম্বর');
    if (!check.valid) return check;

    let cleanPrimary = extractPureDigits(primaryPhoneValue);
    if (cleanPrimary.startsWith('8801') && cleanPrimary.length === 13) {
        cleanPrimary = cleanPrimary.slice(2);
    }

    if (cleanPrimary && check.cleanValue === cleanPrimary) {
        return {
            valid: false,
            error: 'জরুরি যোগাযোগের নম্বরটি শিক্ষকের নিজের মোবাইল নম্বরের থেকে অবশ্যই আলাদা হতে হবে!'
        };
    }

    return { valid: true, error: '', cleanValue: check.cleanValue };
}

/* --------------------------------------------------------------------------
 * 6. DESIGNATION, BLOOD GROUP, ADDRESS & ACADEMIC GPA VALIDATORS
 * -------------------------------------------------------------------------- */

export function validateDesignation(designation) {
    const clean = sanitizeText(designation);
    const exists = DESIGNATION_LIST.some((d) => d.titleEng === clean);
    if (!exists) {
        return { valid: false, error: 'তালিকা থেকে সঠিক পদবী নির্বাচন করুন।' };
    }
    return { valid: true, error: '', cleanValue: clean };
}

export function validateBloodGroup(bloodGroup) {
    const clean = sanitizeText(bloodGroup);
    if (!BLOOD_GROUPS.includes(clean)) {
        return { valid: false, error: 'সঠিক রক্তের গ্রুপ নির্বাচন করুন (জানা না থাকলে N/A দিন)।' };
    }
    return { valid: true, error: '', cleanValue: clean };
}

export function validateAddressField(value, fieldLabelBng = 'ঠিকানা') {
    const clean = sanitizeText(value);
    if (!clean) {
        return { valid: false, error: `${fieldLabelBng} উল্লেখ করা আবশ্যক।` };
    }
    if (clean.length < 2 || clean.length > 80) {
        return { valid: false, error: `${fieldLabelBng} ২ থেকে ৮০ অক্ষরের মধ্যে হতে হবে।` };
    }
    if (!ADDRESS_LINE_REGEX.test(clean)) {
        return { valid: false, error: `${fieldLabelBng}-এ অবৈধ চিহ্ন ব্যবহার করা হয়েছে।` };
    }
    return { valid: true, error: '', cleanValue: clean };
}

/**
 * একক শিক্ষাগত যোগ্যতার রো (Row) যাচাই (র‍্যাংকিংয়ের জন্য GPA/CGPA সহ)
 */
export function validateAcademicEntry(entry) {
    const errors = {};
    if (!entry) return { valid: false, errors: { general: 'শিক্ষাগত তথ্য খালি।' } };

    const validDegree = DEGREE_LEVELS.some((d) => d.key === entry.degreeLevel);
    if (!validDegree) {
        errors.degreeLevel = 'ডিগ্রির স্তর নির্বাচন করুন।';
    }

    const cleanExamTitle = sanitizeText(entry.examTitle);
    if (!cleanExamTitle || cleanExamTitle.length < 2) {
        errors.examTitle = 'পরীক্ষা বা ডিগ্রির নাম লিখুন।';
    }

    const cleanBoard = sanitizeText(entry.boardOrUniversity);
    if (!cleanBoard || cleanBoard.length < 2) {
        errors.boardOrUniversity = 'বোর্ড বা বিশ্ববিদ্যালয়ের নাম লিখুন।';
    }

    const cleanSubject = sanitizeText(entry.majorOrGroup);
    if (!cleanSubject || cleanSubject.length < 2) {
        errors.majorOrGroup = 'বিভাগ বা বিষয় নির্বাচন করুন।';
    }

    if (['Fazil', 'Honours', 'Kamil', 'Masters'].includes(entry.degreeLevel) && !entry.courseDuration) {
        errors.courseDuration = 'কোর্সের মেয়াদ নির্বাচন করুন।';
    }

    const year = Number(toEnglishDigits(entry.passingYear));
    const currentYear = new Date().getFullYear();
    if (!year || year < 1965 || year > currentYear) {
        errors.passingYear = `পাসের সন ১৯৬৫ থেকে ${currentYear}-এর মধ্যে হতে হবে।`;
    }

    const hasLegacyGpa = !entry.resultType && entry.gpaOrCgpa !== '' && entry.gpaOrCgpa != null;
    const resultType = entry.resultType || (hasLegacyGpa ? 'GPA' : '');
    const resultTypes = ['GPA', 'CGPA', 'Division', 'Class', 'Passed'];
    if (!resultTypes.includes(resultType)) {
        errors.resultType = 'ফলাফলের ধরন নির্বাচন করুন।';
    } else if (resultType === 'GPA' || resultType === 'CGPA') {
        const scale = Number(entry.scale) === 4 ? 4 : 5;
        const gpa = Number(toEnglishDigits(entry.gpaOrCgpa));
        if (isNaN(gpa) || gpa < 1.0 || gpa > scale) {
            errors.gpaOrCgpa = `${resultType} অবশ্যই ১.০০ থেকে ${scale}.০০ এর মধ্যে হতে হবে।`;
        }
    } else if (resultType === 'Division' || resultType === 'Class') {
        if (!['First', 'Second', 'Third'].includes(entry.resultGrade)) {
            errors.resultGrade = 'বিভাগ বা শ্রেণির ফলাফল নির্বাচন করুন।';
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

/* --------------------------------------------------------------------------
 * 7. SQUARE 500x500 PHOTOGRAPH VALIDATOR
 * -------------------------------------------------------------------------- */

/**
 * ছবি আপলোডের সময় ফরম্যাট, ফাইল সাইজ (Max 10MB) এবং বর্গাকার (Square) কি না তা যাচাই
 */
export function validatePhotographFile(file, requireStrictSquare = false) {
    return new Promise((resolve) => {
        if (!file) {
            return resolve({ valid: false, error: 'স্পষ্ট পাসপোর্ট/স্কয়ার সাইজের ছবি আপলোড করা আবশ্যক।' });
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return resolve({ valid: false, error: 'শুধুমাত্র JPG, PNG অথবা WEBP ফরম্যাটের ছবি গ্রহণযোগ্য।' });
        }

        const maxBytes = 10 * 1024 * 1024; // 10MB
        if (file.size > maxBytes) {
            return resolve({ valid: false, error: 'ছবির ফাইল সাইজ সর্বোচ্চ ১০ মেগাবাইট (10MB) হতে পারবে।' });
        }

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const width = img.naturalWidth;
            const height = img.naturalHeight;

            if (width < 150 || height < 150) {
                return resolve({
                    valid: false,
                    error: `ছবির রেজোলিউশন খুবই কম (${width}×${height})। কমপক্ষে 300×300 পিক্সেলের ছবি দিন।`
                });
            }

            if (requireStrictSquare && width !== height) {
                return resolve({
                    valid: false,
                    error: `ছবিটি বর্গাকার (Square) নয় (${width}×${height})। প্রস্থ এবং উচ্চতা সমান হতে হবে।`
                });
            }

            return resolve({
                valid: true,
                error: '',
                dimensions: { width, height, isSquare: width === height }
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            return resolve({ valid: false, error: 'ছবির ফাইলটি ক্ষতিগ্রস্ত বা সঠিক নয়।' });
        };

        img.src = objectUrl;
    });
}
