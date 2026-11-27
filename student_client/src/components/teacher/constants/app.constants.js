/**
 * ARDM Enterprise ERP — Frontend System Constants & Metadata
 * Synchronized with Backend Military-Grade Rules
 */

export const INSTITUTION_INFO = Object.freeze({
    nameBng: 'আবদুর রাজ্জাক দাখিল মাদ্রাসা',
    nameEng: 'Abdur Razzak Dakhil Madrasa',
    shortCode: 'ARDM',
    crestLetterBng: 'আ',
    postOffice: 'Sarafbhata',
    postOfficeBng: 'সরফভাটা',
    postCode: '4360',
    upazila: 'Rangunia',
    upazilaBng: 'রাঙ্গুনিয়া',
    district: 'Chittagong',
    districtBng: 'চট্টগ্রাম',
    developerCreditBng: 'ডিজাইন ও ডেভেলপমেন্ট: রায়সুল ইসলাম সাঈদ'
});

export const DESIGNATION_LIST = Object.freeze([
    { titleEng: 'Superintendent', titleBng: 'সুপারিনটেনডেন্ট (সুপার)', rankPriority: 1, code: '01', staffCategory: 'Teaching' },
    { titleEng: 'Assistant Superintendent', titleBng: 'সহকারী সুপারিনটেনডেন্ট (সহ-সুপার)', rankPriority: 2, code: '02', staffCategory: 'Teaching' },
    { titleEng: 'Assistant Teacher', titleBng: 'সহকারী শিক্ষক', rankPriority: 3, code: '03', staffCategory: 'Teaching' },
    { titleEng: 'Assistant Moulvi', titleBng: 'সহকারী মৌলভী', rankPriority: 4, code: '04', staffCategory: 'Teaching' },
    { titleEng: 'Ebtedayee Head Teacher', titleBng: 'ইবতেদায়ী প্রধান', rankPriority: 5, code: '05', staffCategory: 'Teaching' },
    { titleEng: 'Ebtedayee Assistant Teacher', titleBng: 'ইবতেদায়ী সহকারী শিক্ষক', rankPriority: 6, code: '06', staffCategory: 'Teaching' },
    { titleEng: 'Ebtedayee Qari', titleBng: 'ইবতেদায়ী ক্বারী', rankPriority: 7, code: '07', staffCategory: 'Teaching' },
    { titleEng: 'Assistant Librarian', titleBng: 'সহকারী গ্রন্থাগারিক', rankPriority: 8, code: '08', staffCategory: 'Non-Teaching' },
    { titleEng: 'Office Assistant cum Computer Operator', titleBng: 'অফিস সহকারী কাম কম্পিউটার অপারেটর', rankPriority: 9, code: '09', staffCategory: 'Non-Teaching' },
    { titleEng: 'Office Support Staff', titleBng: 'অফিস সহায়ক', rankPriority: 10, code: '10', staffCategory: 'Non-Teaching' },
    { titleEng: 'Security Guard', titleBng: 'নিরাপত্তা প্রহরী', rankPriority: 11, code: '11', staffCategory: 'Non-Teaching' },
    { titleEng: 'Night Guard', titleBng: 'নৈশ প্রহরী', rankPriority: 12, code: '12', staffCategory: 'Non-Teaching' },
    { titleEng: 'Cleaner', titleBng: 'পরিচ্ছন্নতাকর্মী', rankPriority: 13, code: '13', staffCategory: 'Non-Teaching' },
    { titleEng: 'Ayah', titleBng: 'আয়া', rankPriority: 14, code: '14', staffCategory: 'Non-Teaching' },
    { titleEng: 'Other', titleBng: 'অন্যান্য', rankPriority: 15, code: '15', staffCategory: 'Non-Teaching' }
]);

export const BLOOD_GROUPS = Object.freeze([
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'N/A'
]);

export const DEGREE_LEVELS = Object.freeze([
    { key: 'Kamil', labelBng: 'কামিল (Kamil)', labelEng: 'Kamil', weight: 5 },
    { key: 'Masters', labelBng: 'মাস্টার্স (Masters/MA/MSc/MSS/MBA)', labelEng: 'Masters', weight: 5 },
    { key: 'Fazil', labelBng: 'ফাজিল (Fazil)', labelEng: 'Fazil', weight: 4 },
    { key: 'Honours', labelBng: 'অনার্স / ডিগ্রি (Honours/BA/BSc/BSS)', labelEng: 'Honours', weight: 4 },
    { key: 'Alim', labelBng: 'আলিম (Alim)', labelEng: 'Alim', weight: 3 },
    { key: 'HSC', labelBng: 'এইচএসসি / সমমান (HSC/Diploma)', labelEng: 'HSC', weight: 3 },
    { key: 'Dakhil', labelBng: 'দাখিল (Dakhil)', labelEng: 'Dakhil', weight: 2 },
    { key: 'SSC', labelBng: 'এসএসসি / সমমান (SSC)', labelEng: 'SSC', weight: 2 },
    { key: 'JDC', labelBng: 'জেডিসি / অষ্টম শ্রেণি (JDC/JSC/Eight)', labelEng: 'JDC', weight: 1 },
    { key: 'Other', labelBng: 'অন্যান্য (Other)', labelEng: 'Other', weight: 0 }
]);

export const STORAGE_KEYS = Object.freeze({
    AUTH_TOKEN: 'ardm_erp_auth_token_v1',
    AUTH_USER: 'ardm_erp_auth_user_v1',
    PUBLIC_REGISTRY: 'ardm_teacher_registration_v1'
});
