/**
 * ARDM Enterprise ERP — Step 3: Military-Grade Validation & Formatting Engine
 * Run from D:\ardm_teacher: node setup_step3_validators.js
 */

const fs = require('fs');
const path = require('path');

console.log('🛡️ Initializing Step 3: Military-Grade Validation & Bilingual Formatting Engine...\n');

const clientDir = fs.existsSync(path.join(__dirname, 'src'))
    ? __dirname
    : path.join(__dirname, 'client');

if (!fs.existsSync(clientDir)) {
    console.error('❌ Error: client directory not found!');
    process.exit(1);
}

const files = {
    // =========================================================================
    // 1. BILINGUAL FORMATTERS, CALENDAR DAY & RANKING CALCULATOR
    // =========================================================================
    'src/utils/formatters.js': `/**
 * ARDM Enterprise ERP — Precision Bilingual Formatters & Calculators
 * Handles Bengali/English numerals, BDT currency, Exact Calendar Days (28/29/30/31),
 * 10-Digit Teacher ID preview, and GPA/CGPA Normalization.
 */

import { DESIGNATION_LIST, DEGREE_LEVELS } from '@constants/app.constants';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const BENGALI_MONTHS = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];
const ENGLISH_MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * ১. যেকোনো বাংলা সংখ্যাকে ইংরেজি সংখ্যায় রূপান্তর (ইনপুট বক্সে টাইপ করার সময় কাজের জন্য)
 * যেমন: "০১৮১২-৩৪৫৬৭৮" -> "01812-345678"
 */
export function toEnglishDigits(input) {
    if (input === null || input === undefined) return '';
    return String(input).replace(/[০-৯]/g, (char) => {
        const index = BENGALI_DIGITS.indexOf(char);
        return index !== -1 ? String(index) : char;
    });
}

/**
 * ২. যেকোনো ইংরেজি সংখ্যাকে বাংলা সংখ্যায় রূপান্তর (ড্যাশবোর্ড ও প্রিন্ট শিটে দেখানোর জন্য)
 * যেমন: "2026" -> "২০২৬"
 */
export function toBengaliDigits(input) {
    if (input === null || input === undefined) return '';
    return String(input).replace(/[0-9]/g, (char) => BENGALI_DIGITS[Number(char)]);
}

/**
 * ৩. শুধুমাত্র সংখ্যা (Digits) বের করে আনা (বাংলা বা ইংরেজি যেকোনো ইনপুট থেকে)
 */
export function extractPureDigits(input) {
    return toEnglishDigits(input).replace(/\\D+/g, '');
}

/**
 * ৪. বাংলাদেশী টাকা (BDT) ফরম্যাটার — ভারতীয়/বাংলাদেশী কমা সিস্টেম (লক্ষ, হাজার) সহ
 * @param {number|string} amount
 * @param {object} options - { useBengaliDigits: true, showSymbol: true, decimals: 0 }
 */
export function formatCurrencyBDT(amount, options = {}) {
    const {
        useBengaliDigits = true,
        showSymbol = true,
        decimals = 0
    } = options;

    const cleanNum = Number(toEnglishDigits(amount));
    if (isNaN(cleanNum)) {
        return showSymbol ? (useBengaliDigits ? '৳০' : '৳0') : (useBengaliDigits ? '০' : '0');
    }

    const isNegative = cleanNum < 0;
    const absVal = Math.abs(cleanNum);

    const formattedNumber = absVal.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    const finalDigits = useBengaliDigits ? toBengaliDigits(formattedNumber) : formattedNumber;
    const prefix = isNegative ? '-' : '';
    const symbol = showSymbol ? '৳' : '';

    return \`\${prefix}\${symbol}\${finalDigits}\`;
}

/**
 * ৫. নির্দিষ্ট মাস ও বছরে ক্যালেন্ডার অনুযায়ী প্রকৃতপক্ষে কত দিন (২৮, ২৯, ৩০ নাকি ৩১ দিন) তা বের করা
 * @param {number} month - 1 to 12
 * @param {number} year - e.g. 2026
 */
export function getExactDaysInMonth(month, year) {
    const m = Number(month);
    const y = Number(year);
    if (!m || !y || m < 1 || m > 12) {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }
    // JavaScript Date-এ day 0 দিলে আগের মাসের শেষ দিন (অর্থাৎ কাঙ্ক্ষিত মাসের মোট দিন) পাওয়া যায়
    return new Date(y, m, 0).getDate();
}

/**
 * ৬. ওই মাসের প্রকৃত দিন (২৮/২৯/৩০/৩১) অনুযায়ী ১ দিনের বেতন এবং কর্তন হিসাব করা
 */
export function calculateCalendarMonthPerDaySalary(basicSalary, month, year, useExactCalendarDays = true) {
    const base = Number(toEnglishDigits(basicSalary)) || 0;
    const exactDays = getExactDaysInMonth(month, year);
    const divisor = useExactCalendarDays ? exactDays : 30;
    const perDay = divisor > 0 ? Number((base / divisor).toFixed(2)) : 0;

    return {
        basicSalary: base,
        exactCalendarDays: exactDays,
        divisorUsed: divisor,
        perDaySalary: perDay,
        perDayFormattedBng: formatCurrencyBDT(perDay, { useBengaliDigits: true, decimals: 2 }),
        perDayFormattedEng: formatCurrencyBDT(perDay, { useBengaliDigits: false, decimals: 2 })
    };
}

/**
 * ৭. জন্ম তারিখ থেকে নিখুঁত বয়স (বছর, মাস, দিন) বের করা
 */
export function calculateExactAge(dobString, referenceDateString = null) {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const refDate = referenceDateString ? new Date(referenceDateString) : new Date();

    if (isNaN(birthDate.getTime()) || isNaN(refDate.getTime())) return null;

    let years = refDate.getFullYear() - birthDate.getFullYear();
    let months = refDate.getMonth() - birthDate.getMonth();
    let days = refDate.getDate() - birthDate.getDate();

    if (days < 0) {
        months -= 1;
        const prevMonthDays = new Date(refDate.getFullYear(), refDate.getMonth(), 0).getDate();
        days += prevMonthDays;
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }

    const decimalYears = (refDate - birthDate) / (365.25 * 24 * 3600 * 1000);

    return {
        years,
        months,
        days,
        decimalYears: Number(decimalYears.toFixed(2)),
        formattedBng: \`\${toBengaliDigits(years)} বছর \${toBengaliDigits(months)} মাস\`,
        formattedEng: \`\${years}y \${months}m\`
    };
}

/**
 * ৮. ১০ সংখ্যার টিচার আইডি প্রিভিউ জেনারেটর (অপশন ক: 10 + YY + BB + DD + SS)
 */
export function previewTenDigitTeacherId(joiningDate, dateOfBirth, designation, serialPreview = '01') {
    const prefix = '10';
    const joinYear2D = joiningDate && /^\\d{4}/.test(joiningDate)
        ? joiningDate.substring(2, 4)
        : String(new Date().getFullYear()).substring(2, 4);

    const birthYear2D = dateOfBirth && /^\\d{4}/.test(dateOfBirth)
        ? dateOfBirth.substring(2, 4)
        : '00';

    const desigObj = DESIGNATION_LIST.find((d) => d.titleEng === designation)
        || DESIGNATION_LIST[DESIGNATION_LIST.length - 1];
    const desigCode = desigObj.code || '15';
    const serial = String(serialPreview).padStart(2, '0').slice(-2);

    const fullId = \`\${prefix}\${joinYear2D}\${birthYear2D}\${desigCode}\${serial}\`;

    return {
        fullId,
        segments: {
            teacherPrefix: prefix,
            joiningYear2D: joinYear2D,
            birthYear2D: birthYear2D,
            designationCode2D: desigCode,
            serial2D: serial
        },
        designationInfo: desigObj
    };
}

/**
 * ৯. শিক্ষকের পদবী, সর্বোচ্চ ডিগ্রি এবং GPA/CGPA অনুযায়ী লাইভ র‍্যাংকিং মেট্রিক্স ক্যালকুলেটর
 */
export function calculateLiveRankMetrics(designation, academicQualifications = []) {
    const desigObj = DESIGNATION_LIST.find((d) => d.titleEng === designation)
        || DESIGNATION_LIST[DESIGNATION_LIST.length - 1];

    let highestDegreeWeight = 0;
    let highestDegreeLabel = 'N/A';
    let highestNormalizedGpa = 0;
    let sumNormalizedGpa = 0;
    let validCount = 0;

    if (Array.isArray(academicQualifications)) {
        academicQualifications.forEach((item) => {
            const degInfo = DEGREE_LEVELS.find((d) => d.key === item.degreeLevel);
            const weight = degInfo ? degInfo.weight : 0;
            const rawGpa = Number(toEnglishDigits(item.gpaOrCgpa));
            const scale = Number(item.scale) === 4 ? 4 : 5;

            if (!isNaN(rawGpa) && rawGpa >= 1 && rawGpa <= scale) {
                const normalizedGpa = scale === 4
                    ? Number(((rawGpa / 4) * 5).toFixed(3))
                    : Number(rawGpa.toFixed(3));

                sumNormalizedGpa += normalizedGpa;
                validCount += 1;

                if (
                    weight > highestDegreeWeight ||
                    (weight === highestDegreeWeight && normalizedGpa > highestNormalizedGpa)
                ) {
                    highestDegreeWeight = weight;
                    highestDegreeLabel = degInfo ? degInfo.labelBng : item.degreeLevel;
                    highestNormalizedGpa = normalizedGpa;
                }
            }
        });
    }

    const averageNormalizedGpa = validCount > 0
        ? Number((sumNormalizedGpa / validCount).toFixed(3))
        : 0;

    const compositeScore = Number(
        (
            (16 - desigObj.rankPriority) * 1000 +
            highestDegreeWeight * 50 +
            highestNormalizedGpa * 10 +
            averageNormalizedGpa
        ).toFixed(2)
    );

    return {
        designationPriority: desigObj.rankPriority,
        designationBng: desigObj.titleBng,
        staffCategory: desigObj.staffCategory,
        highestDegreeWeight,
        highestDegreeLabel,
        highestNormalizedGpa,
        averageNormalizedGpa,
        compositeScore
    };
}

/**
 * ১০. তারিখ সুন্দরভাবে বাংলা বা ইংরেজিতে দেখানোর ফাংশন
 */
export function formatDisplayDate(dateInput, lang = 'bn') {
    if (!dateInput) return '—';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const day = d.getDate();
    const monthIndex = d.getMonth();
    const year = d.getFullYear();

    if (lang === 'bn') {
        return \`\${toBengaliDigits(day)} \${BENGALI_MONTHS[monthIndex]}, \${toBengaliDigits(year)}\`;
    }
    return \`\${day} \${ENGLISH_MONTHS[monthIndex]}, \${year}\`;
}

/**
 * ১১. মোবাইল নম্বর সুন্দর ফরম্যাটে দেখানো (01812-345678)
 */
export function formatPhoneDisplay(phone, useBengali = false) {
    const clean = extractPureDigits(phone);
    if (clean.length !== 11) return phone || '—';
    const formatted = \`\${clean.slice(0, 5)}-\${clean.slice(5)}\`;
    return useBengali ? toBengaliDigits(formatted) : formatted;
}`,

    // =========================================================================
    // 2. MILITARY-GRADE VALIDATION ENGINE (Every Rule Explicitly Checked)
    // =========================================================================
    'src/utils/validators.js': `/**
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
const ENGLISH_NAME_REGEX = /^[A-Za-z][A-Za-z\\s.'-]{2,59}$/;

// বাংলা নাম: ইউনিকোড বাংলা পরিসর (\\u0980-\\u09FF), স্পেস, ডট (.), বিসর্গ, চন্দ্রবিন্দু ও হাইফেন
const BENGALI_NAME_REGEX = /^[\\u0980-\\u09FF][\\u0980-\\u09FF\\s.'-]{1,59}$/;

// বাংলাদেশী মোবাইল নম্বর: 013, 014, 015, 016, 017, 018, 019 দিয়ে শুরু ১১ ডিজিট
const BD_MOBILE_REGEX = /^01[3-9]\\d{8}$/;

// ঠিকানা (বাড়ি/গ্রাম): বাংলা, ইংরেজি, সংখ্যা, কমা, স্ল্যাশ ও হাইফেন (২ থেকে ৮০ অক্ষর)
const ADDRESS_LINE_REGEX = /^[A-Za-z0-9\\u0980-\\u09FF\\s,./#()-]{2,80}$/;

// ভুয়া রিপিটেড ডিজিট চেক (যেমন: 1111111111 বা 99999999999999999)
const REPEATED_DIGITS_REGEX = /^(\\d)\\1+$/;

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
        .replace(/[\\u0000-\\u001F\\u007F-\\u009F]/g, ' ') // অদৃশ্য কন্ট্রোল ক্যারেক্টার মুছে ফেলা
        .replace(/\\s+/g, ' ') // একাধিক স্পেসকে এক স্পেসে আনা
        .trim();
}

/**
 * লাইভ টাইপিং স্যানিটাইজার (যাতে টাইপ করার সময় স্পেস বার কাজ করে কিন্তু ক্ষতিকর কোড না ঢোকে)
 */
export function sanitizeLiveInput(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/<[^>]*>/g, '')
        .replace(/\\s{2,}/g, ' ');
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
        return { valid: false, error: \`\${fieldLabelBng} প্রদান করা আবশ্যক।\` };
    }
    if (/[\\u0980-\\u09FF]/.test(clean)) {
        return { valid: false, error: \`\${fieldLabelBng}-এ বাংলা অক্ষর ব্যবহার করা যাবে না, শুধুমাত্র ইংরেজি অক্ষর (A-Z) লিখুন।\` };
    }
    if (/\\d/.test(clean)) {
        return { valid: false, error: \`\${fieldLabelBng}-এ কোনো সংখ্যা (0-9) ব্যবহার করা যাবে না।\` };
    }
    if (clean.length < 3) {
        return { valid: false, error: \`\${fieldLabelBng} কমপক্ষে ৩ অক্ষরের হতে হবে।\` };
    }
    if (clean.length > 60) {
        return { valid: false, error: \`\${fieldLabelBng} সর্বোচ্চ ৬০ অক্ষরের মধ্যে হতে হবে।\` };
    }
    if (!ENGLISH_NAME_REGEX.test(clean)) {
        return { valid: false, error: \`\${fieldLabelBng}-এ শুধুমাত্র বৈধ ইংরেজি অক্ষর, ডট (.) বা হাইফেন (-) ব্যবহার করুন।\` };
    }

    return { valid: true, error: '', cleanValue: clean };
}

/**
 * বাংলা নাম যাচাই (শিক্ষক, পিতা অথবা মাতা)
 */
export function validateBengaliName(value, fieldLabelBng = 'বাংলা নাম') {
    const clean = sanitizeText(value);

    if (!clean) {
        return { valid: false, error: \`\${fieldLabelBng} প্রদান করা আবশ্যক।\` };
    }
    if (/[A-Za-z]/.test(clean)) {
        return { valid: false, error: \`\${fieldLabelBng}-এ ইংরেজি অক্ষর (A-Z) ব্যবহার করা যাবে না, ইউনিকোড বাংলায় লিখুন।\` };
    }
    if (/[0-9০-৯]/.test(clean)) {
        return { valid: false, error: \`\${fieldLabelBng}-এ কোনো সংখ্যা ব্যবহার করা যাবে না।\` };
    }
    if (clean.length < 2) {
        return { valid: false, error: \`\${fieldLabelBng} কমপক্ষে ২ অক্ষরের হতে হবে।\` };
    }
    if (clean.length > 60) {
        return { valid: false, error: \`\${fieldLabelBng} সর্বোচ্চ ৬০ অক্ষরের মধ্যে হতে হবে।\` };
    }
    if (!BENGALI_NAME_REGEX.test(clean)) {
        return { valid: false, error: \`\${fieldLabelBng} শুধুমাত্র বাংলা অক্ষরে সনদপত্র অনুযায়ী লিখুন।\` };
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
            error: \`NID নম্বর অবশ্যই ১০, ১৩ অথবা ১৭ সংখ্যার হতে হবে (আপনি দিয়েছেন \${cleanDigits.length} সংখ্যা)।\`
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
            error: \`জন্ম নিবন্ধন নম্বর অবশ্যই ১৭ সংখ্যার হতে হবে (আপনি দিয়েছেন \${cleanDigits.length} সংখ্যা)।\`
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
            error: \`শিক্ষক বা স্টাফের বয়স কমপক্ষে ১৫ বছর হতে হবে (বর্তমান বয়স: \${ageInfo.formattedBng})।\`
        };
    }

    if (ageInfo.decimalYears > 70) {
        return {
            valid: false,
            error: \`বয়স ৭০ বছরের বেশি হতে পারবে না (\${ageInfo.formattedBng})। অনুগ্রহ করে জন্মসাল যাচাই করুন।\`
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
        return { valid: false, error: \`\${fieldLabelBng} প্রদান করা আবশ্যক।\` };
    }

    if (clean.length !== 11) {
        return {
            valid: false,
            error: \`\${fieldLabelBng} অবশ্যই ১১ সংখ্যার হতে হবে (বর্তমানে আছে \${clean.length} সংখ্যা)।\`
        };
    }

    if (!BD_MOBILE_REGEX.test(clean)) {
        return {
            valid: false,
            error: \`সঠিক বাংলাদেশী মোবাইল নম্বর দিন (013 থেকে 019 দিয়ে শুরু হতে হবে)।\`
        };
    }

    if (REPEATED_DIGITS_REGEX.test(clean.slice(3))) {
        return {
            valid: false,
            error: \`প্রদত্ত \${fieldLabelBng}টি সঠিক মনে হচ্ছে না।\`
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
        return { valid: false, error: \`\${fieldLabelBng} উল্লেখ করা আবশ্যক।\` };
    }
    if (clean.length < 2 || clean.length > 80) {
        return { valid: false, error: \`\${fieldLabelBng} ২ থেকে ৮০ অক্ষরের মধ্যে হতে হবে।\` };
    }
    if (!ADDRESS_LINE_REGEX.test(clean)) {
        return { valid: false, error: \`\${fieldLabelBng}-এ অবৈধ চিহ্ন ব্যবহার করা হয়েছে।\` };
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

    const year = Number(toEnglishDigits(entry.passingYear));
    const currentYear = new Date().getFullYear();
    if (!year || year < 1965 || year > currentYear) {
        errors.passingYear = \`পাসের সন ১৯৬৫ থেকে \${currentYear}-এর মধ্যে হতে হবে।\`;
    }

    const scale = Number(entry.scale) === 4 ? 4 : 5;
    const gpa = Number(toEnglishDigits(entry.gpaOrCgpa));
    if (isNaN(gpa) || gpa < 1.0 || gpa > scale) {
        errors.gpaOrCgpa = \`GPA/CGPA অবশ্যই ১.০০ থেকে \${scale}.০০ এর মধ্যে হতে হবে।\`;
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
                    error: \`ছবির রেজোলিউশন খুবই কম (\${width}×\${height})। কমপক্ষে 300×300 পিক্সেলের ছবি দিন।\`
                });
            }

            if (requireStrictSquare && width !== height) {
                return resolve({
                    valid: false,
                    error: \`ছবিটি বর্গাকার (Square) নয় (\${width}×\${height})। প্রস্থ এবং উচ্চতা সমান হতে হবে।\`
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
}`,

    // =========================================================================
    // 3. INTERACTIVE MILITARY VALIDATION & RANKING TEST BENCH (src/App.jsx)
    // =========================================================================
    'src/App.jsx': `import React, { useState } from 'react';
import {
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    Calculator,
    Award,
    Fingerprint,
    Calendar,
    PhoneCall
} from 'lucide-react';
import { INSTITUTION_INFO, DESIGNATION_LIST, DEGREE_LEVELS } from '@constants/app.constants';
import {
    validateEnglishName,
    validateBengaliName,
    validateIdentityDocuments,
    validateDateOfBirth,
    validateJoiningDate,
    validateMobileNumber,
    validateEmergencyPhone
} from '@utils/validators';
import {
    toEnglishDigits,
    previewTenDigitTeacherId,
    calculateLiveRankMetrics,
    calculateCalendarMonthPerDaySalary,
    formatCurrencyBDT
} from '@utils/formatters';

export default function App() {
    // ১. টেস্ট স্টেট (আপনার মাদ্রাসার রিয়েল সিনারিও দিয়ে ডিফল্ট টেস্ট ভ্যালু)
    const [form, setForm] = useState({
        fullNameEng: 'Mohmmad Raisul Islam Saied',
        fullNameBng: 'মোঃ রায়সুল ইসলাম সাঈদ',
        fathersNameBng: 'মোঃ রফিকুল ইসলাম',
        fathersNameEng: 'Md. Rafiqul Islam',
        designation: 'Assistant Teacher',
        nidNumber: '',
        birthRegNumber: '20031591234567890',
        dateOfBirth: '2003-07-30',
        joiningDate: '2026-08-01',
        phone: '০১৮১২৩৪৫৬৭৮', // বাংলা ডিজিট দিলেও অটো ইংরেজি হয়ে ভ্যালিডেট হবে!
        emergencyPhone: '01711223344',
        degreeLevel: 'Honours',
        gpaOrCgpa: '3.75',
        scale: 4,
        basicSalary: 18500,
        testMonth: 2 // February (28 days)
    });

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    // ২. রিয়েল-টাইম মিলিটারি ভ্যালিডেশন ফলাফল
    const nameEngCheck = validateEnglishName(form.fullNameEng, 'শিক্ষকের ইংরেজি নাম');
    const nameBngCheck = validateBengaliName(form.fullNameBng, 'শিক্ষকের বাংলা নাম');
    const fatherBngCheck = validateBengaliName(form.fathersNameBng, 'পিতার বাংলা নাম');
    const idCheck = validateIdentityDocuments(form.nidNumber, form.birthRegNumber);
    const dobCheck = validateDateOfBirth(form.dateOfBirth);
    const joinCheck = validateJoiningDate(form.joiningDate, form.dateOfBirth);
    const phoneCheck = validateMobileNumber(form.phone, 'শিক্ষকের মোবাইল নম্বর');
    const emergencyCheck = validateEmergencyPhone(form.emergencyPhone, form.phone);

    // ৩. ১০-ডিজিট টিচার আইডি প্রিভিউ, র‍্যাংকিং স্কোর এবং ক্যালেন্ডার ডে বেতন হিসাব
    const idPreview = previewTenDigitTeacherId(form.joiningDate, form.dateOfBirth, form.designation, '01');
    const rankPreview = calculateLiveRankMetrics(form.designation, [
        { degreeLevel: form.degreeLevel, gpaOrCgpa: form.gpaOrCgpa, scale: form.scale }
    ]);
    const salaryPreview = calculateCalendarMonthPerDaySalary(form.basicSalary, form.testMonth, 2026, true);

    const allValid =
        nameEngCheck.valid &&
        nameBngCheck.valid &&
        fatherBngCheck.valid &&
        idCheck.valid &&
        dobCheck.valid &&
        joinCheck.valid &&
        phoneCheck.valid &&
        emergencyCheck.valid;

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">

                {/* হেডার */}
                <div className="text-center mb-8 animate-fade-down">
                    <div className="flex justify-center mb-2">
                        <div className="madrasah-crest">{INSTITUTION_INFO.crestLetterBng}</div>
                    </div>
                    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-emerald-deep">
                        {INSTITUTION_INFO.nameEng}
                    </h1>
                    <p className="font-bengali text-sm text-ink-soft mt-1">
                        ধাপ ৩ / ২৫ · মিলিটারি-গ্রেড ভ্যালিডেশন, ১০-ডিজিট আইডি ও র‍্যাংকিং ইঞ্জিন ল্যাবরেটরি
                    </p>
                </div>

                <div className="ledger-surface p-6 sm:p-8 animate-fade-up">
                    {/* টপ স্ট্যাটাস বার */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-ink-faint">
                        <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-subtle border border-emerald-border text-emerald text-xs font-mono font-bold uppercase">
                                <ShieldCheck className="w-4 h-4 text-gold-deep" />
                                Step 3 of 25: Validation &amp; Formatter Engine Ready
                            </span>
                            <h2 className="font-bengali text-xl font-bold text-emerald-deep mt-2">
                                লাইভ ভ্যালিডেশন ও স্মার্ট ক্যালকুলেটর টেস্ট বেঞ্চ
                            </h2>
                        </div>

                        <div className={\`px-4 py-2 rounded-xl border text-xs font-bengali font-semibold flex items-center gap-2 \${
                            allValid
                                ? 'bg-success-bg border-success-border text-success'
                                : 'bg-danger-bg border-danger-border text-danger animate-shake'
                        }\`}>
                            {allValid ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    সকল মিলিটারি ভ্যালিডেশন উত্তীর্ণ!
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="w-4 h-4" />
                                    ফর্মে ত্রুটি রয়েছে, নিচে লাল চিহ্নিত ঘর দেখুন
                                </>
                            )}
                        </div>
                    </div>

                    {/* ৩টি লাইভ অটো-জেনারেটেড আউটপুট কার্ড (ID, Rank, Calendar Salary) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {/* কার্ড ১: ১০ সংখ্যার টিচার আইডি ব্রেকডাউন */}
                        <div className="p-4 rounded-xl bg-emerald-deep text-paper border border-gold/30 shadow-card">
                            <div className="flex items-center justify-between text-xs font-mono text-gold-soft mb-1">
                                <span className="flex items-center gap-1">
                                    <Fingerprint className="w-3.5 h-3.5" /> 10-DIGIT TEACHER ID
                                </span>
                                <span>AUTO</span>
                            </div>
                            <p className="font-mono text-2xl font-bold tracking-widest text-white my-1">
                                {idPreview.fullId}
                            </p>
                            <div className="grid grid-cols-5 gap-1 text-[10px] font-mono text-center mt-2 pt-2 border-t border-white/15">
                                <div className="bg-white/10 rounded py-1" title="Teacher Prefix">
                                    10<span className="block text-[8px] text-gold-soft">TCH</span>
                                </div>
                                <div className="bg-white/10 rounded py-1" title="Joining Year">
                                    {idPreview.segments.joiningYear2D}<span className="block text-[8px] text-gold-soft">JOIN</span>
                                </div>
                                <div className="bg-white/10 rounded py-1" title="Birth Year">
                                    {idPreview.segments.birthYear2D}<span className="block text-[8px] text-gold-soft">DOB</span>
                                </div>
                                <div className="bg-white/10 rounded py-1" title="Designation Code">
                                    {idPreview.segments.designationCode2D}<span className="block text-[8px] text-gold-soft">POST</span>
                                </div>
                                <div className="bg-white/10 rounded py-1" title="Serial">
                                    {idPreview.segments.serial2D}<span className="block text-[8px] text-gold-soft">SER</span>
                                </div>
                            </div>
                        </div>

                        {/* কার্ড ২: অটো-র‍্যাংকিং ও সিনিয়রিটি মেট্রিক্স */}
                        <div className="p-4 rounded-xl bg-paper border border-ink-faint">
                            <div className="flex items-center justify-between text-xs font-mono text-ink-muted mb-1">
                                <span className="flex items-center gap-1">
                                    <Award className="w-3.5 h-3.5 text-gold-deep" /> SENIORITY ENGINE
                                </span>
                                <span className="text-emerald font-bold">{rankPreview.staffCategory}</span>
                            </div>
                            <p className="font-bengali text-base font-bold text-emerald-deep">
                                {rankPreview.designationBng} (Base #{rankPreview.designationPriority})
                            </p>
                            <p className="font-mono text-xs text-ink-soft mt-1">
                                Normalized GPA (5.00): <b className="text-emerald">{rankPreview.highestNormalizedGpa}</b> · Score: <b>{rankPreview.compositeScore}</b>
                            </p>
                        </div>

                        {/* কার্ড ৩: ক্যালেন্ডার ডে (২৮/২৯/৩০/৩১) বেতন হিসাব */}
                        <div className="p-4 rounded-xl bg-paper border border-ink-faint">
                            <div className="flex items-center justify-between text-xs font-mono text-ink-muted mb-1">
                                <span className="flex items-center gap-1">
                                    <Calculator className="w-3.5 h-3.5 text-emerald" /> EXACT CALENDAR DIVISOR
                                </span>
                                <select
                                    value={form.testMonth}
                                    onChange={(e) => handleChange('testMonth', Number(e.target.value))}
                                    className="bg-emerald-subtle text-emerald font-bold rounded px-1.5 py-0.5 text-[11px] outline-none"
                                >
                                    <option value={2}>Feb 2026 (28d)</option>
                                    <option value={11}>Nov 2026 (30d)</option>
                                    <option value={12}>Dec 2026 (31d)</option>
                                </select>
                            </div>
                            <p className="font-bengali text-base font-bold text-emerald-deep">
                                মূল বেতন: {formatCurrencyBDT(form.basicSalary)} ÷ {salaryPreview.divisorUsed} দিন
                            </p>
                            <p className="font-bengali text-xs text-gold-deep font-bold mt-1">
                                ১ দিনের বেতন = {salaryPreview.perDayFormattedBng} ({salaryPreview.perDayFormattedEng})
                            </p>
                        </div>
                    </div>

                    {/* ৪. ইনপুট ভ্যালিডেশন পরীক্ষা গ্রিড */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* ইংরেজি নাম */}
                        <div>
                            <label className="block text-xs font-semibold uppercase text-ink-soft mb-1">
                                Full Name (English Only) <span className="text-gold">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.fullNameEng}
                                onChange={(e) => handleChange('fullNameEng', e.target.value)}
                                className={\`ledger-input \${!nameEngCheck.valid ? 'ledger-input-error' : ''}\`}
                            />
                            {!nameEngCheck.valid && (
                                <p className="text-xs text-danger font-bengali mt-1 animate-shake">{nameEngCheck.error}</p>
                            )}
                        </div>

                        {/* বাংলা নাম */}
                        <div>
                            <label className="block text-xs font-semibold text-ink-soft mb-1 font-bengali">
                                শিক্ষকের নাম (শুধুমাত্র বাংলা) <span className="text-gold">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.fullNameBng}
                                onChange={(e) => handleChange('fullNameBng', e.target.value)}
                                className={\`ledger-input font-bengali \${!nameBngCheck.valid ? 'ledger-input-error' : ''}\`}
                            />
                            {!nameBngCheck.valid && (
                                <p className="text-xs text-danger font-bengali mt-1 animate-shake">{nameBngCheck.error}</p>
                            )}
                        </div>

                        {/* NID নম্বর (ঐচ্ছিক যদি জন্ম নিবন্ধন থাকে) */}
                        <div>
                            <label className="block text-xs font-semibold text-ink-soft mb-1 font-bengali">
                                জাতীয় পরিচয়পত্র (NID: 10 / 13 / 17 ডিজিট)
                            </label>
                            <input
                                type="text"
                                value={form.nidNumber}
                                onChange={(e) => handleChange('nidNumber', e.target.value)}
                                placeholder="খালি রাখলে জন্ম নিবন্ধন দিয়ে কাজ চলবে"
                                className={\`ledger-input font-mono \${idCheck.nidError ? 'ledger-input-error' : ''}\`}
                            />
                            {idCheck.nidError && (
                                <p className="text-xs text-danger font-bengali mt-1 animate-shake">{idCheck.nidError}</p>
                            )}
                        </div>

                        {/* জন্ম নিবন্ধন নম্বর (১৭ ডিজিট) */}
                        <div>
                            <label className="block text-xs font-semibold text-ink-soft mb-1 font-bengali">
                                জন্ম নিবন্ধন নম্বর (১৭ ডিজিট — NID না থাকলে বাধ্যতামূলক)
                            </label>
                            <input
                                type="text"
                                value={form.birthRegNumber}
                                onChange={(e) => handleChange('birthRegNumber', e.target.value)}
                                placeholder="যেমন: 20031591234567890"
                                className={\`ledger-input font-mono \${idCheck.birthRegError ? 'ledger-input-error' : ''}\`}
                            />
                            {idCheck.birthRegError && (
                                <p className="text-xs text-danger font-bengali mt-1 animate-shake">{idCheck.birthRegError}</p>
                            )}
                        </div>

                        {/* জন্ম তারিখ ও যোগদানের তারিখ */}
                        <div>
                            <label className="block text-xs font-semibold text-ink-soft mb-1 font-bengali">
                                জন্ম তারিখ (বয়স ১৫–৭০) ও যোগদানের তারিখ <span className="text-gold">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="date"
                                    value={form.dateOfBirth}
                                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                                    className={\`ledger-input text-sm \${!dobCheck.valid ? 'ledger-input-error' : ''}\`}
                                />
                                <input
                                    type="date"
                                    value={form.joiningDate}
                                    onChange={(e) => handleChange('joiningDate', e.target.value)}
                                    className={\`ledger-input text-sm \${!joinCheck.valid ? 'ledger-input-error' : ''}\`}
                                />
                            </div>
                            {(!dobCheck.valid || !joinCheck.valid) ? (
                                <p className="text-xs text-danger font-bengali mt-1 animate-shake">
                                    {dobCheck.error || joinCheck.error}
                                </p>
                            ) : (
                                <p className="text-[11px] text-emerald font-bengali mt-1">
                                    বর্তমান বয়স: {dobCheck.ageInfo?.formattedBng}
                                </p>
                            )}
                        </div>

                        {/* মোবাইল বনাম জরুরি যোগাযোগ (একই নম্বর দিলে এরর দেবে) */}
                        <div>
                            <label className="block text-xs font-semibold text-ink-soft mb-1 font-bengali">
                                নিজস্ব মোবাইল ও জরুরি যোগাযোগ (বাংলা/ইংরেজি ডিজিট সাপোর্টেড)
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={form.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    placeholder="নিজের মোবাইল"
                                    className={\`ledger-input font-mono text-sm \${!phoneCheck.valid ? 'ledger-input-error' : ''}\`}
                                />
                                <input
                                    type="text"
                                    value={form.emergencyPhone}
                                    onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                                    placeholder="জরুরি নম্বর (ভিন্ন)"
                                    className={\`ledger-input font-mono text-sm \${!emergencyCheck.valid ? 'ledger-input-error' : ''}\`}
                                />
                            </div>
                            {(!phoneCheck.valid || !emergencyCheck.valid) ? (
                                <p className="text-xs text-danger font-bengali mt-1 animate-shake">
                                    {phoneCheck.error || emergencyCheck.error}
                                </p>
                            ) : (
                                <p className="text-[11px] text-emerald font-mono mt-1">
                                    Normalized: {toEnglishDigits(form.phone)} | Emergency: {toEnglishDigits(form.emergencyPhone)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <p className="text-center mt-6 font-bengali text-xs text-ink-soft opacity-80">
                    {INSTITUTION_INFO.developerCreditBng}
                </p>
            </div>
        </div>
    );
}`
};

Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(clientDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
    console.log(`✅ Created/Updated File: client/${filePath}`);
});

console.log('\n🎉 Step 3 (Military-Grade Validation & Bilingual Formatter Engine) Completed!');