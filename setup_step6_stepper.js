/**
 * ARDM Enterprise ERP — Step 6: Public Registration Ledger Shell & Responsive 4-Step Stepper UI
 * Run from D:\ardm_teacher: node setup_step6_stepper.js
 */

const fs = require('fs');
const path = require('path');

console.log('📜 Initializing Step 6: Public Registration Ledger Shell & Responsive 4-Step Stepper UI...\n');

const clientDir = fs.existsSync(path.join(__dirname, 'src'))
    ? __dirname
    : path.join(__dirname, 'client');

if (!fs.existsSync(clientDir)) {
    console.error('❌ Error: client directory not found!');
    process.exit(1);
}

const files = {
    // =========================================================================
    // 1. REGISTRATION SCHEMA, STEPS DEFINITION & DRAFT PERSISTENCE ENGINE
    // =========================================================================
    'src/pages/public/registration/registration.schema.js': `/**
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
}`,

    // =========================================================================
    // 2. RESPONSIVE DUAL-MODE STEPPER COMPONENT (PC Vertical + Mobile Horizontal)
    // =========================================================================
    'src/pages/public/registration/RegistrationStepper.jsx': `/**
 * ARDM Enterprise ERP — Responsive 4-Step Ledger Stepper
 * - Desktop (md+): Classic Royal Emerald Vertical Sidebar Stepper + Live 10-Digit ID & Seniority Preview
 * - Mobile (<md): Compact Progress Bar + Touch-Friendly Horizontal Step Pills
 */

import React from 'react';
import { Check, Fingerprint, Award, Sparkles, Lock } from 'lucide-react';
import { cn } from '@utils/cn';
import { toBengaliDigits } from '@utils/formatters';

export default function RegistrationStepper({
    steps = [],
    currentStep = 0,
    completedSteps = {},
    onStepSelect,
    idPreview,
    rankPreview
}) {
    const progressPercent = Math.round(((currentStep + 1) / Math.max(steps.length, 1)) * 100);

    const handleStepClick = (targetIndex) => {
        if (!onStepSelect) return;
        // শুধুমাত্র পেছনের ধাপগুলোতে বা ইতিমধ্যে সম্পন্ন ধাপে সরাসরি ক্লিক করে যাওয়া যাবে
        if (targetIndex < currentStep || completedSteps[targetIndex]) {
            onStepSelect(targetIndex);
        }
    };

    return (
        <aside
            aria-label="Registration Progress"
            className="bg-gradient-to-b from-emerald-deep via-emerald to-emerald-deep text-[#EFE9D4] p-5 sm:p-6 md:p-7 flex flex-col justify-between select-none border-b md:border-b-0 md:border-r border-gold/20"
        >
            {/* =================================================================
                TOP SECTION: STEPPER NAVIGATION (Desktop Vertical & Mobile Compact)
               ================================================================= */}
            <div>
                {/* মোবাইল প্রোগ্রেস হেডার (শুধুমাত্র ছোট স্ক্রিনে দেখাবে) */}
                <div className="md:hidden mb-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bengali font-semibold text-gold-soft">
                            ধাপ {toBengaliDigits(currentStep + 1)} / {toBengaliDigits(steps.length)}:{' '}
                            <b className="text-white">{steps[currentStep]?.titleBng}</b>
                        </span>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gold-soft">
                            {progressPercent}%
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-gold to-gold-soft transition-all duration-500 rounded-full"
                            style={{ width: \`\${progressPercent}%\` }}
                        />
                    </div>
                </div>

                {/* পিসি সাইডবার সাব-হেডার */}
                <div className="hidden md:flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                    <div>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-gold-soft block">
                            Official Ledger
                        </span>
                        <h3 className="font-bengali text-sm font-bold text-white mt-0.5">
                            নিবন্ধন ধাপসমূহ ({toBengaliDigits(currentStep + 1)}/{toBengaliDigits(steps.length)})
                        </h3>
                    </div>
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-white/10 text-gold-soft border border-gold/25">
                        {progressPercent}%
                    </span>
                </div>

                {/* স্টেপ লিস্ট: মোবাইলে Horizontal Scrollable Pills, পিসিতে Vertical Timeline */}
                <div className="flex md:flex-col gap-2.5 md:gap-1 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                    {steps.map((step, index) => {
                        const isActive = index === currentStep;
                        const isDone = index < currentStep || Boolean(completedSteps[index]);
                        const isClickable = index < currentStep || Boolean(completedSteps[index]);

                        return (
                            <div
                                key={step.id}
                                onClick={() => handleStepClick(index)}
                                role={isClickable ? 'button' : undefined}
                                tabIndex={isClickable ? 0 : -1}
                                onKeyDown={(e) => {
                                    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        handleStepClick(index);
                                    }
                                }}
                                className={cn(
                                    'relative flex items-center md:items-start gap-3 px-3 py-2.5 md:px-2 md:py-3.5 rounded-xl transition-all duration-300 shrink-0 md:shrink',
                                    isActive
                                        ? 'opacity-100 bg-white/10 md:bg-transparent border border-gold/30 md:border-transparent'
                                        : isDone
                                            ? 'opacity-90 hover:opacity-100 cursor-pointer'
                                            : 'opacity-45 cursor-not-allowed'
                                )}
                            >
                                {/* পিসিতে ধাপগুলোর মাঝখানের ভার্টিক্যাল কানেক্টিং লাইন */}
                                {index < steps.length - 1 && (
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'hidden md:block absolute left-[24px] top-[46px] w-[1.5px] h-[calc(100%-24px)] transition-colors duration-300',
                                            isDone ? 'bg-gold-soft/70' : 'bg-white/20'
                                        )}
                                    />
                                )}

                                {/* স্টেপ নাম্বার সার্কেল (আপনার আগের ফর্মের ৩৪px সার্কেল ডিজাইন) */}
                                <div
                                    className={cn(
                                        'w-[34px] h-[34px] rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-all duration-300 border-[1.5px]',
                                        isActive &&
                                            'bg-gold border-gold text-emerald-deep shadow-[0_0_0_5px_rgba(198,156,61,0.24)] scale-105',
                                        !isActive && isDone &&
                                            'bg-white/15 border-gold-soft text-gold-soft',
                                        !isActive && !isDone &&
                                            'bg-transparent border-white/35 text-white/80'
                                    )}
                                >
                                    {isDone && !isActive ? (
                                        <Check className="w-4 h-4 stroke-[2.5]" />
                                    ) : (
                                        index + 1
                                    )}
                                </div>

                                {/* স্টেপ টেক্সট (ইংরেজি ও বাংলা) */}
                                <div className="pt-0.5 pr-1">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={cn(
                                                'text-xs sm:text-[13.5px] font-semibold tracking-wide leading-tight',
                                                isActive ? 'text-white' : 'text-[#EFE9D4]'
                                            )}
                                        >
                                            {step.titleEng}
                                        </span>
                                        {!isActive && !isDone && (
                                            <Lock className="w-3 h-3 opacity-50 hidden md:inline" />
                                        )}
                                    </div>
                                    <div className="font-bengali text-[11.5px] text-gold-soft/90 mt-0.5 leading-snug">
                                        {step.titleBng}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* =================================================================
                BOTTOM SECTION: LIVE 10-DIGIT TEACHER ID & RANK PREVIEW CARD
               ================================================================= */}
            {idPreview && (
                <div className="mt-4 md:mt-8 pt-4 border-t border-white/15">
                    <div className="p-3.5 rounded-xl bg-black/20 border border-gold/25 backdrop-blur-xs">
                        <div className="flex items-center justify-between text-[10px] font-mono text-gold-soft uppercase tracking-wider mb-1">
                            <span className="flex items-center gap-1">
                                <Fingerprint className="w-3.5 h-3.5 text-gold" />
                                10-Digit ID Preview
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-gold/20 text-gold-soft font-bold">
                                Op-A
                            </span>
                        </div>

                        <p className="font-mono text-lg font-bold tracking-widest text-white">
                            {idPreview.fullId}
                        </p>

                        {/* 10-Digit Segment Mini Bar: 10 + YY + BB + DD + SS */}
                        <div className="grid grid-cols-5 gap-1 mt-2 text-[9px] font-mono text-center">
                            <div className="bg-white/10 rounded py-0.5">
                                <span className="text-white font-bold">{idPreview.segments.teacherPrefix}</span>
                                <span className="block text-[7.5px] text-gold-soft/80">TCH</span>
                            </div>
                            <div className="bg-white/10 rounded py-0.5">
                                <span className="text-white font-bold">{idPreview.segments.joiningYear2D}</span>
                                <span className="block text-[7.5px] text-gold-soft/80">JOIN</span>
                            </div>
                            <div className="bg-white/10 rounded py-0.5">
                                <span className="text-white font-bold">{idPreview.segments.birthYear2D}</span>
                                <span className="block text-[7.5px] text-gold-soft/80">DOB</span>
                            </div>
                            <div className="bg-white/10 rounded py-0.5">
                                <span className="text-white font-bold">{idPreview.segments.designationCode2D}</span>
                                <span className="block text-[7.5px] text-gold-soft/80">POST</span>
                            </div>
                            <div className="bg-white/10 rounded py-0.5">
                                <span className="text-white font-bold">{idPreview.segments.serial2D}</span>
                                <span className="block text-[7.5px] text-gold-soft/80">SER</span>
                            </div>
                        </div>

                        {rankPreview && (
                            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                                <span className="font-bengali text-gold-soft flex items-center gap-1 truncate">
                                    <Award className="w-3.5 h-3.5 text-gold shrink-0" />
                                    {rankPreview.designationBng}
                                </span>
                                <span className="font-mono text-[10px] text-white/90 font-semibold shrink-0 ml-1">
                                    Base #{rankPreview.designationPriority}
                                </span>
                            </div>
                        )}
                    </div>

                    <p className="hidden md:flex items-center gap-1.5 mt-3 text-[11px] font-bengali text-[#EFE9D4]/70 leading-relaxed">
                        <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span>অটো-ড্রাফট চালু আছে; পেজ রিলোড হলেও তথ্য হারাবে না।</span>
                    </p>
                </div>
            )}
        </aside>
    );
}`,

    // =========================================================================
    // 3. PUBLIC REGISTRATION LEDGER SHELL (src/pages/public/registration/PublicRegistrationLedger.jsx)
    // =========================================================================
    'src/pages/public/registration/PublicRegistrationLedger.jsx': `/**
 * ARDM Enterprise ERP — Public Teacher Registration Master Ledger Shell (Step 6)
 * Orchestrates:
 * - Official Madrasah Crest & Bilingual Header
 * - Returning User Digital ID Card Banner Detection
 * - Responsive 2-Column Ledger Grid ([260px_1fr] on Desktop, Stacked on Mobile)
 * - Step-by-Step Navigation Bar & Draft Recovery Controls
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    RotateCcw,
    ShieldCheck,
    CreditCard,
    CheckCircle2,
    Sparkles,
    UserCheck,
    GraduationCap,
    MapPin,
    Camera
} from 'lucide-react';
import { INSTITUTION_INFO, DESIGNATION_LIST } from '@constants/app.constants';
import { Button, Badge, ConfirmDialog } from '@components/ui';
import { useToast } from '@context/ToastContext';
import axiosClient from '@api/axiosClient';
import {
    previewTenDigitTeacherId,
    calculateLiveRankMetrics,
    toBengaliDigits
} from '@utils/formatters';
import {
    REGISTRATION_STEPS,
    createInitialRegistrationData,
    loadRegistrationDraft,
    saveRegistrationDraft,
    clearRegistrationDraft,
    getSavedRegistryToken
} from './registration.schema';
import RegistrationStepper from './RegistrationStepper';

export default function PublicRegistrationLedger() {
    const toast = useToast();
    const ledgerTopRef = useRef(null);

    // ১. ড্রাফট অথবা নতুন ইনিশিয়াল স্টেট লোড করা
    const savedDraft = loadRegistrationDraft();
    const [currentStep, setCurrentStep] = useState(savedDraft ? savedDraft.step : 0);
    const [formData, setFormData] = useState(
        savedDraft ? savedDraft.data : createInitialRegistrationData()
    );
    const [completedSteps, setCompletedSteps] = useState({});
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    // ২. ব্যাকএন্ড মেটাডেটা এবং পূর্বে নিবন্ধিত আইডি কার্ড টোকেন স্টেট
    const [serverMetadata, setServerMetadata] = useState({
        loaded: false,
        nextSuggestedBiometricDeviceId: 1
    });
    const [existingRegistryToken, setExistingRegistryToken] = useState(() =>
        getSavedRegistryToken()
    );

    // ৩. প্রতিবার তথ্য বা ধাপ পরিবর্তনের সাথে সাথে সেশন ড্রাফটে অটো-সেভ করা
    useEffect(() => {
        saveRegistrationDraft(currentStep, formData);
    }, [currentStep, formData]);

    // ৪. ব্যাকএন্ড থেকে লাইভ মেটাডেটা (/teachers/public/metadata) লোড করা (সার্ভার চালু থাকলে)
    useEffect(() => {
        let isMounted = true;
        axiosClient
            .get('/teachers/public/metadata')
            .then((res) => {
                if (!isMounted) return;
                const payload = res.data?.data || {};
                setServerMetadata({
                    loaded: true,
                    nextSuggestedBiometricDeviceId: payload.nextSuggestedBiometricDeviceId || 1
                });
            })
            .catch(() => {
                // সার্ভার অফলাইন থাকলেও লোকাল কনস্ট্যান্ট দিয়ে ফর্ম ১০০% সচল থাকবে
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // ৫. ১০-ডিজিট টিচার আইডি ও র‍্যাংকিং লাইভ প্রিভিউ হিসাব
    const idPreview = previewTenDigitTeacherId(
        formData.joiningDate,
        formData.dateOfBirth || '2003-07-30',
        formData.designation,
        String(serverMetadata.nextSuggestedBiometricDeviceId).padStart(2, '0')
    );

    const rankPreview = calculateLiveRankMetrics(
        formData.designation,
        formData.academicQualifications
    );

    // ৬. স্টেপ পরিবর্তন ও স্মুথ স্ক্রল হ্যান্ডলার
    const scrollToLedgerTop = () => {
        if (ledgerTopRef.current) {
            const topPos = ledgerTopRef.current.getBoundingClientRect().top + window.scrollY - 24;
            window.scrollTo({ top: Math.max(0, topPos), behavior: 'smooth' });
        }
    };

    const handleNextStep = () => {
        setCompletedSteps((prev) => ({ ...prev, [currentStep]: true }));
        if (currentStep < REGISTRATION_STEPS.length - 1) {
            setCurrentStep((prev) => prev + 1);
            scrollToLedgerTop();
        } else {
            toast.success('পরবর্তী ধাপগুলোতে (ধাপ ৭–১০) সম্পূর্ণ ফর্ম সাবমিশন ও আইডি কার্ড যুক্ত হবে!');
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
            scrollToLedgerTop();
        }
    };

    const handleResetDraft = () => {
        clearRegistrationDraft();
        setFormData(createInitialRegistrationData());
        setCompletedSteps({});
        setCurrentStep(0);
        setIsResetConfirmOpen(false);
        toast.info('ফর্মের সকল খসড়া তথ্য রিসেট করা হয়েছে।');
    };

    const activeStepMeta = REGISTRATION_STEPS[currentStep] || REGISTRATION_STEPS[0];

    return (
        <div className="min-h-screen py-7 sm:py-10 px-3.5 sm:px-6 lg:px-8">
            <div className="max-w-[1020px] mx-auto">

                {/* =============================================================
                    1. OFFICIAL MADRASAH CREST & BILINGUAL HEADER
                   ============================================================= */}
                <header className="text-center mb-7 sm:mb-9 animate-fade-down">
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <div className="madrasah-crest">
                            {INSTITUTION_INFO.crestLetterBng}
                        </div>
                    </div>

                    <h1 className="font-serif text-2xl sm:text-4xl font-bold text-emerald-deep tracking-tight">
                        {INSTITUTION_INFO.nameEng}
                    </h1>

                    <p className="text-xs sm:text-sm text-ink-soft mt-1 tracking-wide">
                        Teacher Registration Register &nbsp;·&nbsp;{' '}
                        <span className="font-bengali font-semibold text-emerald">
                            শিক্ষক ও কর্মচারী তথ্য নিবন্ধন খাতা
                        </span>
                    </p>
                </header>

                {/* =============================================================
                    2. RETURNING USER SAVED REGISTRY CARD BANNER (If Exists)
                   ============================================================= */}
                {existingRegistryToken && (
                    <div className="mb-6 p-4 rounded-2xl bg-emerald-subtle border border-emerald/25 flex flex-wrap items-center justify-between gap-4 animate-fade-up">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald text-gold-soft flex items-center justify-center shrink-0">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                                    এই ব্রাউজারে একটি নিবন্ধিত ডিজিটাল আইডি কার্ড সংরক্ষিত আছে
                                </h3>
                                <p className="font-mono text-xs text-ink-soft">
                                    Teacher ID: <b className="text-emerald-deep">{existingRegistryToken.teacherId}</b> · UID: {existingRegistryToken.uid.slice(0, 12)}...
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="emerald"
                                size="xs"
                                onClick={() => toast.info('ধাপ ১০-এ ডিজিটাল আইডি কার্ড ভিউ যুক্ত হচ্ছে!')}
                            >
                                আইডি কার্ড দেখুন
                            </Button>
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setExistingRegistryToken(null)}
                            >
                                লুকান
                            </Button>
                        </div>
                    </div>
                )}

                {/* =============================================================
                    3. MAIN LEDGER CARD (Responsive 2-Column Layout: Stepper + Form Panel)
                   ============================================================= */}
                <main
                    ref={ledgerTopRef}
                    className="ledger-surface animate-fade-up"
                >
                    <div className="grid grid-cols-1 md:grid-cols-[265px_1fr] min-h-[560px]">

                        {/* বাম পাশের রেসপনসিভ স্টেপার (RegistrationStepper) */}
                        <RegistrationStepper
                            steps={REGISTRATION_STEPS}
                            currentStep={currentStep}
                            completedSteps={completedSteps}
                            onStepSelect={(idx) => {
                                setCurrentStep(idx);
                                scrollToLedgerTop();
                            }}
                            idPreview={idPreview}
                            rankPreview={rankPreview}
                        />

                        {/* ডান পাশের মেইন ফর্ম প্যানেল */}
                        <div className="p-5 sm:p-8 lg:p-9 flex flex-col justify-between bg-paper-panel">
                            <div>
                                {/* ফর্ম স্টেপ হেডার ও রিসেট বাটন */}
                                <div className="flex flex-wrap items-start justify-between gap-3 pb-5 mb-6 border-b border-ink-faint">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="gold" size="sm" mono>
                                                STEP {activeStepMeta.stepNumber} / 04
                                            </Badge>
                                            <Badge variant="emerald-subtle" size="sm">
                                                {activeStepMeta.titleBng}
                                            </Badge>
                                        </div>

                                        <h2 className="font-serif text-xl sm:text-2xl font-bold text-emerald-deep">
                                            {activeStepMeta.titleEng}
                                        </h2>
                                        <p className="font-bengali text-xs sm:text-[13px] text-ink-soft mt-1 leading-relaxed">
                                            {activeStepMeta.subtitleBng}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsResetConfirmOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bengali font-medium text-ink-muted hover:text-danger hover:bg-danger-bg/60 transition-colors"
                                        title="ফর্ম রিসেট করুন"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        রিসেট
                                    </button>
                                </div>

                                {/* =========================================================
                                    STEP CONTENT SLOT (Steps 7, 8, 9 will plug in right here)
                                   ========================================================= */}
                                <div key={activeStepMeta.id} className="animate-fade-up py-2">
                                    <div className="p-5 sm:p-6 rounded-2xl bg-paper border border-ink-faint">
                                        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-emerald">
                                                <Sparkles className="w-4 h-4 text-gold-deep" />
                                                Step 6 Ledger Shell Calibration
                                            </span>
                                            <span className="text-xs font-bengali text-success font-semibold flex items-center gap-1">
                                                <CheckCircle2 className="w-4 h-4" />
                                                পিসি ও মোবাইল লেআউট প্রস্তুত
                                            </span>
                                        </div>

                                        {/* বর্তমান অ্যাক্টিভ স্টেপের আর্কিটেকচার প্রিভিউ */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                            {[
                                                {
                                                    idx: 0,
                                                    icon: UserCheck,
                                                    title: 'ধাপ ৭ (স্টেপ ১): ব্যক্তিগত ও পরিচয়পত্র',
                                                    desc: 'বাংলা-ইংরেজি নাম, ১৫টি পদবী, ব্লাড গ্রুপ (N/A সহ), NID অথবা ১৭-ডিজিট জন্ম নিবন্ধন এবং জন্ম ও যোগদানের তারিখ।'
                                                },
                                                {
                                                    idx: 1,
                                                    icon: GraduationCap,
                                                    title: 'ধাপ ৮ (স্টেপ ২): পিতা-মাতা ও শিক্ষাগত যোগ্যতা',
                                                    desc: 'পিতা-মাতার দ্বিভাষিক নাম এবং র‍্যাংকিংয়ের জন্য একাধিক ডিগ্রি ও GPA/CGPA যোগ করার ডায়নামিক কার্ড।'
                                                },
                                                {
                                                    idx: 2,
                                                    icon: MapPin,
                                                    title: 'ধাপ ৮ (স্টেপ ৩): ঠিকানা ও যোগাযোগ',
                                                    desc: 'নিজস্ব মোবাইল, ভিন্ন জরুরি যোগাযোগের নম্বর এবং ডিফল্ট সরফভাটা (৪৩৬০) এডিটেবল ঠিকানা।'
                                                },
                                                {
                                                    idx: 3,
                                                    icon: Camera,
                                                    title: 'ধাপ ৯ (স্টেপ ৪): ৫০০×৫০০ ছবি ও রিভিউ',
                                                    desc: 'অটো-স্কয়ার ফটো ক্রপার, ক্লাউডিনারি আপলোড এবং শপথনামা টিক দিয়ে চূড়ান্ত রেজিস্ট্রেশন।'
                                                }
                                            ].map((card) => {
                                                const IconComp = card.icon;
                                                const isCurr = card.idx === currentStep;
                                                return (
                                                    <div
                                                        key={card.idx}
                                                        onClick={() => setCurrentStep(card.idx)}
                                                        className={\`p-4 rounded-xl border transition-all cursor-pointer \${
                                                            isCurr
                                                                ? 'bg-paper-panel border-gold shadow-gold-glow'
                                                                : 'bg-paper/60 border-ink-faint hover:bg-paper-panel'
                                                        }\`}
                                                    >
                                                        <div className="flex items-center gap-2.5 mb-1.5">
                                                            <div className={\`w-8 h-8 rounded-lg flex items-center justify-center \${
                                                                isCurr ? 'bg-emerald text-gold-soft' : 'bg-emerald-subtle text-emerald'
                                                            }\`}>
                                                                <IconComp className="w-4 h-4" />
                                                            </div>
                                                            <h4 className="font-bengali text-xs sm:text-sm font-bold text-emerald-deep">
                                                                {card.title}
                                                            </h4>
                                                        </div>
                                                        <p className="font-bengali text-xs text-ink-soft leading-relaxed">
                                                            {card.desc}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* লাইভ পদবী পরিবর্তন করে বাম পাশের ১০-ডিজিট আইডি ও র‍্যাংক প্রিভিউ টেস্ট */}
                                        <div className="pt-4 border-t border-ink-faint flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <label className="block font-bengali text-xs font-bold text-emerald-deep mb-1">
                                                    বাম পাশের ১০-ডিজিট আইডি ও র‍্যাংক প্রিভিউ টেস্ট করতে পদবী পরিবর্তন করুন:
                                                </label>
                                                <select
                                                    value={formData.designation}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            designation: e.target.value
                                                        }))
                                                    }
                                                    className="erp-input custom-select-arrow font-bengali text-xs py-2 max-w-xs"
                                                >
                                                    {DESIGNATION_LIST.map((d) => (
                                                        <option key={d.code} value={d.titleEng}>
                                                            [Rank #{d.rankPriority}] {d.titleBng} (Code: {d.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="text-right font-mono text-xs text-ink-soft">
                                                <span className="block text-[10px] uppercase text-ink-muted">
                                                    Next Biometric Device ID
                                                </span>
                                                <b className="text-emerald-deep text-sm">
                                                    #{serverMetadata.nextSuggestedBiometricDeviceId}
                                                </b>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* =============================================================
                                4. BOTTOM NAVIGATION BAR (← Back | Step Indicator | Next →)
                               ============================================================= */}
                            <div className="flex items-center justify-between gap-4 mt-8 pt-5 border-t border-ink-faint">
                                <Button
                                    variant="ghost"
                                    size="md"
                                    leftIcon={ArrowLeft}
                                    onClick={handlePrevStep}
                                    className={currentStep === 0 ? 'invisible pointer-events-none' : ''}
                                >
                                    <span className="font-bengali">পূর্ববর্তী ধাপ</span>
                                </Button>

                                <div className="hidden sm:flex items-center gap-1.5 text-xs font-bengali text-ink-muted">
                                    <ShieldCheck className="w-4 h-4 text-gold-deep" />
                                    <span>ধাপ {toBengaliDigits(currentStep + 1)} / {toBengaliDigits(REGISTRATION_STEPS.length)}</span>
                                </div>

                                <Button
                                    variant={currentStep === REGISTRATION_STEPS.length - 1 ? 'gold' : 'emerald'}
                                    size="md"
                                    rightIcon={currentStep === REGISTRATION_STEPS.length - 1 ? undefined : ArrowRight}
                                    onClick={handleNextStep}
                                >
                                    <span className="font-bengali">
                                        {currentStep === REGISTRATION_STEPS.length - 1
                                            ? 'নিবন্ধন চূড়ান্ত করুন'
                                            : 'পরবর্তী ধাপ'}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>

                {/* =============================================================
                    5. DEVELOPER CREDIT FOOTER
                   ============================================================= */}
                <footer className="text-center mt-6">
                    <p className="font-bengali text-xs text-ink-soft opacity-80">
                        {INSTITUTION_INFO.developerCreditBng}
                    </p>
                </footer>

                {/* ড্রাফট রিসেট কনফার্মেশন মডাল */}
                <ConfirmDialog
                    isOpen={isResetConfirmOpen}
                    onClose={() => setIsResetConfirmOpen(false)}
                    onConfirm={handleResetDraft}
                    variant="danger"
                    titleBng="আপনি কি ফর্মের সকল তথ্য মুছে নতুন করে শুরু করতে চান?"
                    messageBng="রিসেট করলে আপনার বর্তমান টাইপ করা খসড়া তথ্য মুছে যাবে এবং ফর্মটি আবার ১ নম্বর ধাপ থেকে শুরু হবে।"
                    confirmText="হ্যাঁ, রিসেট করুন"
                />
            </div>
        </div>
    );
}`,

    // =========================================================================
    // 4. MOUNT PublicRegistrationLedger IN src/App.jsx
    // =========================================================================
    'src/App.jsx': `import React from 'react';
import PublicRegistrationLedger from '@pages/public/registration/PublicRegistrationLedger';

export default function App() {
    return <PublicRegistrationLedger />;
}`
};

Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(clientDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
    console.log(`✅ Created/Updated File: client/${filePath}`);
});

console.log('\n🎉 Step 6 (Public Registration Ledger Shell & Responsive 4-Step Stepper UI) Completed!');