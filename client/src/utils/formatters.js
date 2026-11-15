/**
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
    return toEnglishDigits(input).replace(/\D+/g, '');
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

    return `${prefix}${symbol}${finalDigits}`;
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
        formattedBng: `${toBengaliDigits(years)} বছর ${toBengaliDigits(months)} মাস`,
        formattedEng: `${years}y ${months}m`
    };
}

/**
 * ৮. ১০ সংখ্যার টিচার আইডি প্রিভিউ জেনারেটর (অপশন ক: 10 + YY + BB + DD + SS)
 */
export function previewTenDigitTeacherId(joiningDate, dateOfBirth, designation, serialPreview = '01') {
    const prefix = '10';
    const joinYear2D = joiningDate && /^\d{4}/.test(joiningDate)
        ? joiningDate.substring(2, 4)
        : String(new Date().getFullYear()).substring(2, 4);

    const birthYear2D = dateOfBirth && /^\d{4}/.test(dateOfBirth)
        ? dateOfBirth.substring(2, 4)
        : '00';

    const desigObj = DESIGNATION_LIST.find((d) => d.titleEng === designation)
        || DESIGNATION_LIST[DESIGNATION_LIST.length - 1];
    const desigCode = desigObj.code || '15';
    const serial = String(serialPreview).padStart(2, '0').slice(-2);

    const fullId = `${prefix}${joinYear2D}${birthYear2D}${desigCode}${serial}`;

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
        return `${toBengaliDigits(day)} ${BENGALI_MONTHS[monthIndex]}, ${toBengaliDigits(year)}`;
    }
    return `${day} ${ENGLISH_MONTHS[monthIndex]}, ${year}`;
}

/**
 * ১১. মোবাইল নম্বর সুন্দর ফরম্যাটে দেখানো (01812-345678)
 */
export function formatPhoneDisplay(phone, useBengali = false) {
    const clean = extractPureDigits(phone);
    if (clean.length !== 11) return phone || '—';
    const formatted = `${clean.slice(0, 5)}-${clean.slice(5)}`;
    return useBengali ? toBengaliDigits(formatted) : formatted;
}

/**
 * বাংলাদেশী টাকা (BDT) ফরম্যাটার (কমা সেপারেটর ও বাংলা/ইংরেজি সংখ্যা সহ)
 * উদাহরণ: formatBDT(25000, true) => "২৫,০০০ ৳"
 */
export function formatBDT(amount, useBengali = false) {
    const num = Number(amount);
    if (isNaN(num)) return useBengali ? '০ ৳' : '0 ৳';

    const formatted = new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0
    }).format(Math.round(num));

    const finalNum = useBengali
        ? formatted.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)])
        : formatted;

    return `${finalNum} ৳`;
}
