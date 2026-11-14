/**
 * ARDM Enterprise ERP — Teacher Registration Schema, Default State & Draft Engine
 * Synchronized with Backend Military-Grade Validation Rules
 */

import { INSTITUTION_INFO, STORAGE_KEYS } from '@constants/app.constants';

export const REGISTRATION_DRAFT_KEY = 'ardm_teacher_registration_draft_v1';

/**
 * ৪-ধাপের রেজিস্ট্রেশন স্টেপার কনফিগারেশন (ইংরেজি ও বাংলা শিরোনামসহ)
 */
export const REGISTRATION_STEPS = Object.freeze([
    {
        index: 0,
        id: 'step-personal',
        stepNumber: '01',
        titleEng: 'Personal & Identity',
        titleBng: 'ব্যক্তিগত ও পরিচয়পত্র',
        subtitleEng: 'Official Bilingual Name, Designation, NID or Birth Registration & Age Verification',
        subtitleBng: 'সনদপত্র অনুযায়ী বাংলা ও ইংরেজি নাম, পদবী, এনআইডি অথবা জন্ম নিবন্ধন এবং জন্ম ও যোগদানের তারিখ।'
    },
    {
        index: 1,
        id: 'step-parents-academic',
        stepNumber: '02',
        titleEng: 'Parents & Academic',
        titleBng: 'পিতা-মাতা ও শিক্ষাগত যোগ্যতা',
        subtitleEng: 'Bilingual Parents Info & Academic Qualifications with GPA/CGPA for Auto-Seniority Ranking',
        subtitleBng: 'পিতা ও মাতার বাংলা-ইংরেজি নাম এবং র‍্যাংকিং নির্ধারণের জন্য শিক্ষাগত যোগ্যতা ও জিপিএ/সিজিপিএ।'
    },
    {
        index: 2,
        id: 'step-address-contact',
        stepNumber: '03',
        titleEng: 'Address & Contact',
        titleBng: 'ঠিকানা ও যোগাযোগ',
        subtitleEng: 'Verified Mobile, Distinct Emergency Contact & Sarafbhata Default Address',
        subtitleBng: 'সচল মোবাইল নম্বর, ভিন্ন জরুরি যোগাযোগের নম্বর এবং বর্তমান ও স্থায়ী ঠিকানা।'
    },
    {
        index: 3,
        id: 'step-photo-review',
        stepNumber: '04',
        titleEng: 'Photograph & Review',
        titleBng: 'ছবি ও চূড়ান্ত পর্যালোচনা',
        subtitleEng: '500x500 Square Photograph Processing, Ledger Review & Official Attestation',
        subtitleBng: '৫০০×৫০০ পিক্সেল বর্গাকার ছবি আপলোড, সকল তথ্যের চূড়ান্ত যাচাই এবং শপথনামা।'
    }
]);

/**
 * সম্পূর্ণ রেজিস্ট্রেশন ফর্মের প্রারম্ভিক ডেটা স্ট্রাকচার
 */
export function createInitialRegistrationData() {
    const todayIso = new Date().toISOString().split('T')[0];

    return {
        // Step 1: Personal & Identity
        fullNameEng: '',
        fullNameBng: '',
        designation: 'Assistant Teacher',
        subject: 'General',
        gender: 'Male',
        religion: 'Islam',
        bloodGroup: 'O+',
        maritalStatus: 'Married',
        identityType: 'NID', // 'NID' | 'BIRTH_REG' | 'BOTH'
        nidNumber: '',
        birthRegNumber: '',
        dateOfBirth: '',
        joiningDate: todayIso,
        indexNumber: '',

        // Step 2: Parents (Bilingual) & Academic Qualifications
        fathersNameEng: '',
        fathersNameBng: '',
        mothersNameEng: '',
        mothersNameBng: '',
        academicQualifications: [
            {
                id: 'acad_initial_1',
                degreeLevel: 'Fazil',
                examTitle: 'ফাজিল (স্নাতক সমমান)',
                majorOrGroup: 'ইসলামিক স্টাডিজ',
                boardOrUniversity: 'ইসলামি আরবি বিশ্ববিদ্যালয়, ঢাকা',
                passingYear: '2022',
                gpaOrCgpa: '3.50',
                scale: 4
            }
        ],

        // Step 3: Contact & Address (Editable Default: Sarafbhata, 4360, Rangunia, Chittagong)
        phone: '',
        email: '',
        emergencyContact: {
            contactName: '',
            relationship: 'Guardian',
            phone: ''
        },
        presentAddress: {
            houseOrRoad: '',
            village: '',
            postOffice: INSTITUTION_INFO.postOffice,
            postCode: INSTITUTION_INFO.postCode,
            upazila: INSTITUTION_INFO.upazila,
            district: INSTITUTION_INFO.district
        },
        sameAsPresentAddress: true,
        permanentAddress: {
            houseOrRoad: '',
            village: '',
            postOffice: INSTITUTION_INFO.postOffice,
            postCode: INSTITUTION_INFO.postCode,
            upazila: INSTITUTION_INFO.upazila,
            district: INSTITUTION_INFO.district
        },

        // Step 4: Portal Password & Attestation
        password: '',
        attestConfirmed: false
    };
}

/**
 * সেশন স্টোরেজ থেকে সংরক্ষিত ড্রাফট পড়া (রিলোড প্রোটেকশন)
 */
export function loadRegistrationDraft() {
    try {
        const raw = sessionStorage.getItem(REGISTRATION_DRAFT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.data) {
            return {
                step: Number.isInteger(parsed.step) ? parsed.step : 0,
                data: {
                    ...createInitialRegistrationData(),
                    ...parsed.data
                },
                savedAt: parsed.savedAt || null
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * সেশন স্টোরেজে ড্রাফট সেভ করা
 */
export function saveRegistrationDraft(step, data) {
    try {
        const safeCopy = { ...data };
        // সিকিউরিটির জন্য পাসওয়ার্ড সেশন ড্রাফটে প্লেইন টেক্সটে না রাখা
        delete safeCopy.password;

        sessionStorage.setItem(
            REGISTRATION_DRAFT_KEY,
            JSON.stringify({
                step,
                data: safeCopy,
                savedAt: new Date().toISOString()
            })
        );
    } catch (e) {
        // Ignore storage quota errors
    }
}

/**
 * ড্রাফট মুছে ফেলা
 */
export function clearRegistrationDraft() {
    try {
        sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
    } catch (e) {
        // Ignore
    }
}

/**
 * লোকাল স্টোরেজ থেকে পূর্বে নিবন্ধিত শিক্ষকের রেজিস্ট্রি টোকেন পড়া
 */
export function getSavedRegistryToken() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.PUBLIC_REGISTRY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.uid && parsed.teacherId) {
            return parsed;
        }
        return null;
    } catch (e) {
        return null;
    }
}
