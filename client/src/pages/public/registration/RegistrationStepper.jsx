/**
 * ARDM Enterprise ERP — Teacher Registration Schema, Default State & Draft Engine
 * Synchronized with Backend Military-Grade Validation Rules
 */

import React from 'react';
import { Check } from 'lucide-react';
import { STORAGE_KEYS } from '@constants/app.constants';

export const REGISTRATION_DRAFT_KEY = 'ardm_teacher_registration_draft_v1';

function createEmptyAddress() {
    return {
        houseNameBn: '',
        houseNameEn: '',
        villageBn: '',
        villageEn: '',
        unionBn: '',
        unionEn: '',
        wardNo: '',
        upazilaBn: '',
        upazilaEn: '',
        districtBn: '',
        districtEn: '',
        divisionBn: '',
        divisionEn: '',
        houseOrRoad: '',
        village: '',
        postOffice: '',
        postCode: '',
        upazila: '',
        district: ''
    };
}

/**
 * ৪-ধাপের রেজিস্ট্রেশন স্টেপার কনফিগারেশন (ইংরেজি ও বাংলা শিরোনামসহ)
 */
export const REGISTRATION_STEPS = Object.freeze([
    {
        index: 0,
        id: 'step-personal',
        stepNumber: '01',
        titleEng: 'Personal & Identity',
        titleBng: 'ব্যক্তিগত ও পরিচয়পত্র',
        subtitleEng: 'Official Bilingual Name, Designation, NID or Birth Registration & Age Verification',
        subtitleBng: 'সনদপত্র অনুযায়ী বাংলা ও ইংরেজি নাম, পদবী, এনআইডি অথবা জন্ম নিবন্ধন এবং জন্ম ও যোগদানের তারিখ।'
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
        subtitleEng: 'Verified Mobile, Distinct Emergency Contact & Accurate Address',
        subtitleBng: 'সচল মোবাইল নম্বর, ভিন্ন জরুরি যোগাযোগের নম্বর এবং বর্তমান ও স্থায়ী ঠিকানা।'
    },
    {
        index: 3,
        id: 'step-photo-review',
        stepNumber: '04',
        titleEng: 'Photograph & Review',
        titleBng: 'ছবি ও চূড়ান্ত পর্যালোচনা',
        subtitleEng: '500x500 Square Photograph Processing, Ledger Review & Official Attestation',
        subtitleBng: '৫০০×৫০০ পিক্সেল বর্গাকার ছবি আপলোড, সকল তথ্যের চূড়ান্ত যাচাই এবং শপথনামা।'
    }
]);

/**
 * সম্পূর্ণ রেজিস্ট্রেশন ফর্মের প্রারম্ভিক ডেটা স্ট্রাকচার
 */
export function createInitialRegistrationData() {
    return {
        // Step 1: Personal & Identity
        fullNameEng: '',
        fullNameBng: '',
        designation: '',
        subject: '',
        gender: '',
        religion: '',
        bloodGroup: '',
        maritalStatus: '',
        identityType: 'NID', // 'NID' | 'BIRTH_REG' | 'BOTH'
        nidNumber: '',
        birthRegNumber: '',
        dateOfBirth: '',
        joiningDate: '',
        indexNumber: '',

        // Step 2: Parents (Bilingual) & Academic Qualifications
        fathersNameEng: '',
        fathersNameBng: '',
        mothersNameEng: '',
        mothersNameBng: '',
        academicQualifications: [],

        // Step 3: Contact & Address
        phone: '',
        email: '',
        emergencyContact: {
            contactName: '',
            relationship: 'Guardian',
            phone: ''
        },
        presentAddress: createEmptyAddress(),
        sameAsPresentAddress: true,
        permanentAddress: createEmptyAddress(),

        // Step 4: Portal Password & Attestation
        password: '',
        attestConfirmed: false
    };
}

/**
 * সেশন স্টোরেজ থেকে সংরক্ষিত ড্রাফট পড়া (রিলোড প্রোটেকশন)
 */
export function loadRegistrationDraft() {
    try {
        const raw = sessionStorage.getItem(REGISTRATION_DRAFT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object') {
            const initialData = createInitialRegistrationData();
            const maxStep = REGISTRATION_STEPS.length - 1;
            const safeStep = Number.isInteger(parsed.step)
                ? Math.min(Math.max(parsed.step, 0), maxStep)
                : 0;

            return {
                step: safeStep,
                data: {
                    ...initialData,
                    ...parsed.data,
                    emergencyContact: {
                        ...initialData.emergencyContact,
                        ...(parsed.data.emergencyContact && typeof parsed.data.emergencyContact === 'object'
                            ? parsed.data.emergencyContact
                            : {}),
                        relationship: parsed.data.emergencyContact?.relationship || initialData.emergencyContact.relationship
                    },
                    presentAddress: {
                        ...initialData.presentAddress,
                        ...(parsed.data.presentAddress && typeof parsed.data.presentAddress === 'object'
                            ? parsed.data.presentAddress
                            : {})
                    },
                    permanentAddress: {
                        ...initialData.permanentAddress,
                        ...(parsed.data.permanentAddress && typeof parsed.data.permanentAddress === 'object'
                            ? parsed.data.permanentAddress
                            : {})
                    },
                    academicQualifications: Array.isArray(parsed.data.academicQualifications)
                        ? parsed.data.academicQualifications
                        : [],
                    password: ''
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
        // সিকিউরিটির জন্য পাসওয়ার্ড সেশন ড্রাফটে প্লেইন টেক্সটে না রাখা
        delete safeCopy.password;

        const maxStep = REGISTRATION_STEPS.length - 1;
        const safeStep = Number.isInteger(step) ? Math.min(Math.max(step, 0), maxStep) : 0;

        sessionStorage.setItem(
            REGISTRATION_DRAFT_KEY,
            JSON.stringify({
                step: safeStep,
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
 * লোকাল স্টোরেজ থেকে পূর্বে নিবন্ধিত শিক্ষকের রেজিস্ট্রি টোকেন পড়া
 */
export function getSavedRegistryToken() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.PUBLIC_REGISTRY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.uid && parsed.teacherId) {
            if (parsed.teacher && typeof parsed.teacher === 'object') {
                delete parsed.teacher.password;
            }
            return parsed;
        }
        return null;
    } catch (e) {
        return null;
    }
}

export default function RegistrationStepper({
    steps = [],
    currentStep = 0,
    completedSteps = {},
    onStepSelect,
    idPreview,
    rankPreview
}) {
    return (
        <aside className="border-b border-ink-faint bg-emerald-deep p-5 text-white md:border-b-0 md:border-r md:border-gold/20">
            <div className="mb-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold-soft">ARDM Registry</p>
                <h2 className="mt-1 font-bengali text-lg font-bold">শিক্ষক নিবন্ধন</h2>
            </div>

            <nav className="space-y-2">
                {steps.map((step, index) => {
                    const isActive = index === currentStep;
                    const isCompleted = Boolean(completedSteps[index]);
                    return (
                        <button
                            key={step.id || index}
                            type="button"
                            onClick={() => onStepSelect?.(index)}
                            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                                isActive
                                    ? 'border-gold/60 bg-white/10'
                                    : 'border-transparent hover:border-white/10 hover:bg-white/5'
                            }`}
                        >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                isCompleted ? 'bg-gold text-emerald-deep' : isActive ? 'bg-white text-emerald-deep' : 'bg-white/10 text-gold-soft'
                            }`}>
                                {isCompleted ? <Check className="h-4 w-4" /> : step.stepNumber || index + 1}
                            </span>
                            <span className="min-w-0">
                                <span className="block font-bengali text-xs font-bold">{step.titleBng}</span>
                                <span className="mt-0.5 block truncate text-[10px] text-white/60">{step.titleEng}</span>
                            </span>
                        </button>
                    );
                })}
            </nav>

            {(idPreview || rankPreview) && (
                <div className="mt-6 rounded-xl border border-gold/20 bg-black/10 p-3 text-xs">
                    {idPreview?.fullId && (
                        <p className="font-mono text-gold-soft">ID: {idPreview.fullId}</p>
                    )}
                    {rankPreview?.designationBng && (
                        <p className="mt-1 font-bengali text-white/70">{rankPreview.designationBng}</p>
                    )}
                </div>
            )}
        </aside>
    );
}