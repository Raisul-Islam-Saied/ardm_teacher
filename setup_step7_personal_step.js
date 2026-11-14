/**
 * ARDM Enterprise ERP — Step 7: Registration Step 1 (Personal & Identity Form with Military Validation)
 * Run from D:\ardm_teacher: node setup_step7_personal_step.js
 */

const fs = require('fs');
const path = require('path');

console.log('🛡️ Initializing Step 7: Registration Step 1 (Personal & Identity Form with Military Validation)...\n');

const clientDir = fs.existsSync(path.join(__dirname, 'src'))
    ? __dirname
    : path.join(__dirname, 'client');

if (!fs.existsSync(clientDir)) {
    console.error('❌ Error: client directory not found!');
    process.exit(1);
}

const files = {
    // =========================================================================
    // 1. STEP 1 COMPONENT: PERSONAL & IDENTITY FORM (Step1PersonalIdentity.jsx)
    // =========================================================================
    'src/pages/public/registration/Step1PersonalIdentity.jsx': `/**
 * ARDM Enterprise ERP — Registration Step 1: Personal & Identity Information
 * Enforces Military-Grade Validation on:
 * - Bilingual Teacher Names (English & Unicode Bengali)
 * - 15 Official Designations (with Base Rank #1-#15 & Teaching/Non-Teaching auto-detection)
 * - Blood Group (including "N/A"), Gender, Religion, Marital Status
 * - Flexible Identity Document (10/13/17-digit NID OR 17-digit Birth Registration)
 * - Date of Birth (Age 15–70) & Joining Date (Minimum 15y gap from DOB)
 */

import React from 'react';
import {
    User,
    Award,
    CreditCard,
    FileText,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    BookOpen,
    Hash
} from 'lucide-react';
import {
    DESIGNATION_LIST,
    BLOOD_GROUPS
} from '@constants/app.constants';
import { FormInput, FormSelect, Badge } from '@components/ui';
import {
    validateEnglishName,
    validateBengaliName,
    validateDesignation,
    validateBloodGroup,
    validateNidNumber,
    validateBirthRegNumber,
    validateIdentityDocuments,
    validateDateOfBirth,
    validateJoiningDate
} from '@utils/validators';
import {
    extractPureDigits,
    toBengaliDigits,
    calculateExactAge
} from '@utils/formatters';
import { cn } from '@utils/cn';

const GENDER_OPTIONS = [
    { value: 'Male', label: 'পুরুষ (Male)' },
    { value: 'Female', label: 'মহিলা (Female)' },
    { value: 'Other', label: 'অন্যান্য (Other)' }
];

const RELIGION_OPTIONS = [
    { value: 'Islam', label: 'ইসলাম (Islam)' },
    { value: 'Hinduism', label: 'হিন্দু (Hinduism)' },
    { value: 'Buddhism', label: 'বৌদ্ধ (Buddhism)' },
    { value: 'Christianity', label: 'খ্রিস্টান (Christianity)' },
    { value: 'Other', label: 'অন্যান্য (Other)' }
];

const MARITAL_STATUS_OPTIONS = [
    { value: 'Married', label: 'বিবাহিত (Married)' },
    { value: 'Single', label: 'অবিবাহিত (Single)' },
    { value: 'Widowed', label: 'বিপত্নীক / বিধবা (Widowed)' },
    { value: 'Divorced', label: 'তালাকপ্রাপ্ত (Divorced)' }
];

const IDENTITY_MODES = [
    {
        key: 'NID',
        labelBng: 'জাতীয় পরিচয়পত্র (NID আছে)',
        labelEng: 'National ID Card',
        descBng: '১০, ১৩ অথবা ১৭ সংখ্যার স্মার্ট/পুরাতন এনআইডি নম্বর'
    },
    {
        key: 'BIRTH_REG',
        labelBng: 'জন্ম নিবন্ধন (NID নেই)',
        labelEng: 'Birth Registration Only',
        descBng: 'এনআইডি কার্ড না থাকলে ১৭ সংখ্যার ডিজিটাল জন্ম নিবন্ধন নম্বর'
    },
    {
        key: 'BOTH',
        labelBng: 'উভয়ই আছে (NID + জন্ম নিবন্ধন)',
        labelEng: 'Both Documents',
        descBng: 'এনআইডি এবং জন্ম নিবন্ধন উভয় নম্বরই সংরক্ষণ করুন'
    }
];

/**
 * পুরো Step 1-এর সকল ফিল্ড একসাথে ভ্যালিডেট করার এক্সপোর্টেড ফাংশন (Next বাটনে ক্লিক করলে কল হবে)
 */
export function validateStep1PersonalData(formData) {
    const errors = {};

    const nameEngCheck = validateEnglishName(formData.fullNameEng, 'শিক্ষকের ইংরেজি নাম');
    if (!nameEngCheck.valid) errors.fullNameEng = nameEngCheck.error;

    const nameBngCheck = validateBengaliName(formData.fullNameBng, 'শিক্ষকের বাংলা নাম');
    if (!nameBngCheck.valid) errors.fullNameBng = nameBngCheck.error;

    const desigCheck = validateDesignation(formData.designation);
    if (!desigCheck.valid) errors.designation = desigCheck.error;

    const bloodCheck = validateBloodGroup(formData.bloodGroup);
    if (!bloodCheck.valid) errors.bloodGroup = bloodCheck.error;

    // পরিচয়পত্র মোড অনুযায়ী যাচাই (NID অথবা জন্ম নিবন্ধন — কমপক্ষে একটি বাধ্যতামূলক)
    const mode = formData.identityType || 'NID';
    if (mode === 'NID') {
        const nidRes = validateNidNumber(formData.nidNumber, true);
        if (!nidRes.valid) errors.nidNumber = nidRes.error;
    } else if (mode === 'BIRTH_REG') {
        const bRegRes = validateBirthRegNumber(formData.birthRegNumber, true);
        if (!bRegRes.valid) errors.birthRegNumber = bRegRes.error;
    } else {
        const combined = validateIdentityDocuments(formData.nidNumber, formData.birthRegNumber);
        if (!combined.valid) {
            if (combined.nidError) errors.nidNumber = combined.nidError;
            if (combined.birthRegError) errors.birthRegNumber = combined.birthRegError;
        }
    }

    const dobCheck = validateDateOfBirth(formData.dateOfBirth);
    if (!dobCheck.valid) errors.dateOfBirth = dobCheck.error;

    const joinCheck = validateJoiningDate(formData.joiningDate, formData.dateOfBirth);
    if (!joinCheck.valid) errors.joiningDate = joinCheck.error;

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

export default function Step1PersonalIdentity({
    formData,
    onUpdateField,
    touchedFields = {},
    onBlurField,
    stepErrors = {}
}) {
    // ১. সিলেক্ট করা পদবীর বিস্তারিত মেটাডেটা বের করা
    const selectedDesigObj =
        DESIGNATION_LIST.find((d) => d.titleEng === formData.designation) ||
        DESIGNATION_LIST[2];

    const designationOptions = DESIGNATION_LIST.map((d) => ({
        value: d.titleEng,
        label: \`[Rank #\${d.rankPriority}] \${d.titleBng} — (\${d.titleEng})\`
    }));

    const bloodGroupOptions = BLOOD_GROUPS.map((bg) => ({
        value: bg,
        label: bg === 'N/A' ? 'N/A (জানা নেই)' : \`\${bg} (ব্লাড গ্রুপ)\`
    }));

    // ২. লাইভ ফিল্ড ভ্যালিডেশন স্ট্যাটাস (টাইপ করার সাথে সাথে ফিডব্যাক দেওয়ার জন্য)
    const nameEngLive = validateEnglishName(formData.fullNameEng, 'শিক্ষকের ইংরেজি নাম');
    const nameBngLive = validateBengaliName(formData.fullNameBng, 'শিক্ষকের বাংলা নাম');
    const dobLive = validateDateOfBirth(formData.dateOfBirth);
    const joinLive = validateJoiningDate(formData.joiningDate, formData.dateOfBirth);

    const nidDigits = extractPureDigits(formData.nidNumber);
    const birthRegDigits = extractPureDigits(formData.birthRegNumber);

    const nidLive = validateNidNumber(
        nidDigits,
        formData.identityType === 'NID' || formData.identityType === 'BOTH'
    );
    const birthRegLive = validateBirthRegNumber(
        birthRegDigits,
        formData.identityType === 'BIRTH_REG' || formData.identityType === 'BOTH'
    );

    // চাকরিতে যোগদানের সময় বয়স কত ছিল তা হিসাব করা
    const ageAtJoiningInfo =
        formData.dateOfBirth && formData.joiningDate
            ? calculateExactAge(formData.dateOfBirth, formData.joiningDate)
            : null;

    // কোন ফিল্ডের এরর কখন দেখানো হবে (ব্লার করলে বা সাবমিট চাপলে অথবা অবৈধ অক্ষর টাইপ করলে)
    const getFieldError = (fieldName, liveResult, currentVal) => {
        if (stepErrors[fieldName]) return stepErrors[fieldName];
        if ((touchedFields[fieldName] || String(currentVal || '').length > 0) && !liveResult.valid) {
            return liveResult.error;
        }
        return '';
    };

    // পরিচয়পত্রের ট্যাব পরিবর্তন হ্যান্ডলার
    const handleIdentityModeSwitch = (newMode) => {
        onUpdateField('identityType', newMode);
        if (newMode === 'NID') {
            onUpdateField('birthRegNumber', '');
        } else if (newMode === 'BIRTH_REG') {
            onUpdateField('nidNumber', '');
        }
    };

    return (
        <div className="space-y-7 animate-fade-up">

            {/* =================================================================
                SECTION 1: BILINGUAL FULL NAME (English & Unicode Bengali)
               ================================================================= */}
            <section>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-ink-faint">
                    <User className="w-4 h-4 text-emerald" />
                    <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                        ১. শিক্ষকের পূর্ণ নাম (সনদপত্র ও পরিচয়পত্র অনুযায়ী)
                    </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-1">
                    <FormInput
                        labelEng="Full Name (English)"
                        labelBng="নাম (ইংরেজি বড়/ছোট হাতের অক্ষর)"
                        name="fullNameEng"
                        value={formData.fullNameEng}
                        onChange={(e) => onUpdateField('fullNameEng', e.target.value)}
                        onBlur={() => onBlurField('fullNameEng')}
                        placeholder="e.g. Mohmmad Raisul Islam Saied"
                        required
                        showValidIcon
                        isValid={nameEngLive.valid}
                        error={getFieldError('fullNameEng', nameEngLive, formData.fullNameEng)}
                        hint="শুধুমাত্র ইংরেজি অক্ষর (A-Z, ডট ও হাইফেন) গ্রহণযোগ্য।"
                    />

                    <FormInput
                        labelEng="Full Name (Bengali)"
                        labelBng="নাম (ইউনিকোড বাংলায়)"
                        name="fullNameBng"
                        value={formData.fullNameBng}
                        onChange={(e) => onUpdateField('fullNameBng', e.target.value)}
                        onBlur={() => onBlurField('fullNameBng')}
                        placeholder="যেমনঃ মোঃ রায়সুল ইসলাম সাঈদ"
                        required
                        isBengaliText
                        showValidIcon
                        isValid={nameBngLive.valid}
                        error={getFieldError('fullNameBng', nameBngLive, formData.fullNameBng)}
                        hint="শুধুমাত্র ইউনিকোড বাংলা অক্ষরে পূর্ণ নাম লিখুন।"
                    />
                </div>
            </section>

            {/* =================================================================
                SECTION 2: DESIGNATION (15 POSTS), SUBJECT & DEMOGRAPHICS
               ================================================================= */}
            <section>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-2 border-b border-ink-faint">
                    <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-gold-deep" />
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                            ২. প্রাতিষ্ঠানিক পদবী, ক্যাটাগরি ও ব্যক্তিগত তথ্য
                        </h3>
                    </div>

                    {/* সিলেক্ট করা পদবীর লাইভ র‍্যাংক ও ক্যাটাগরি ব্যাজ */}
                    <div className="flex items-center gap-2">
                        <Badge variant="emerald" size="sm" mono>
                            Base Rank #{selectedDesigObj.rankPriority}
                        </Badge>
                        <Badge
                            variant={selectedDesigObj.staffCategory === 'Teaching' ? 'gold' : 'info'}
                            size="sm"
                        >
                            {selectedDesigObj.staffCategory === 'Teaching'
                                ? 'শিক্ষক (Teaching Staff)'
                                : 'কর্মচারী (Non-Teaching Staff)'}
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-1">
                    <FormSelect
                        labelEng="Designation"
                        labelBng="পদবী নির্বাচন করুন"
                        name="designation"
                        value={formData.designation}
                        onChange={(e) => {
                            const newDesig = e.target.value;
                            onUpdateField('designation', newDesig);
                            const found = DESIGNATION_LIST.find((d) => d.titleEng === newDesig);
                            if (found && found.staffCategory === 'Non-Teaching') {
                                onUpdateField('subject', 'Administration / Support');
                            } else if (formData.subject === 'Administration / Support') {
                                onUpdateField('subject', 'General');
                            }
                        }}
                        options={designationOptions}
                        required
                        hint={\`১০-ডিজিট টিচার আইডিতে পদবীর কোড যুক্ত হবে: \${selectedDesigObj.code}\`}
                    />

                    <FormInput
                        labelEng="Subject / Department"
                        labelBng={
                            selectedDesigObj.staffCategory === 'Teaching'
                                ? 'পাঠদানের মূল বিষয় (Subject)'
                                : 'দায়িত্বের বিভাগ (Department)'
                        }
                        name="subject"
                        value={formData.subject}
                        onChange={(e) => onUpdateField('subject', e.target.value)}
                        placeholder="যেমনঃ আরবি / ইংরেজি / গণিত / আইসিটি"
                        leftIcon={BookOpen}
                        hint="প্রোফাইল ও হাজিরা শিটে পদবীর পাশে প্রদর্শিত হবে।"
                    />
                </div>

                {/* ব্লাড গ্রুপ (N/A সহ), লিঙ্গ, ধর্ম ও বৈবাহিক অবস্থা */}
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-1 mt-1">
                    <FormSelect
                        labelEng="Blood Group"
                        labelBng="রক্তের গ্রুপ"
                        name="bloodGroup"
                        value={formData.bloodGroup}
                        onChange={(e) => onUpdateField('bloodGroup', e.target.value)}
                        options={bloodGroupOptions}
                        required
                        isBengaliText={false}
                    />

                    <FormSelect
                        labelEng="Gender"
                        labelBng="লিঙ্গ"
                        name="gender"
                        value={formData.gender}
                        onChange={(e) => onUpdateField('gender', e.target.value)}
                        options={GENDER_OPTIONS}
                        required
                    />

                    <FormSelect
                        labelEng="Religion"
                        labelBng="ধর্ম"
                        name="religion"
                        value={formData.religion}
                        onChange={(e) => onUpdateField('religion', e.target.value)}
                        options={RELIGION_OPTIONS}
                        required
                    />

                    <FormSelect
                        labelEng="Marital Status"
                        labelBng="বৈবাহিক অবস্থা"
                        name="maritalStatus"
                        value={formData.maritalStatus}
                        onChange={(e) => onUpdateField('maritalStatus', e.target.value)}
                        options={MARITAL_STATUS_OPTIONS}
                        required
                    />
                </div>
            </section>

            {/* =================================================================
                SECTION 3: IDENTITY DOCUMENT (NID OR 17-DIGIT BIRTH REGISTRATION)
               ================================================================= */}
            <section className="p-4 sm:p-5 rounded-2xl bg-paper border border-ink-faint">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald" />
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                            ৩. পরিচয়পত্র নম্বর (NID অথবা জন্ম নিবন্ধন — যেকোনো একটি বাধ্যতামূলক)
                        </h3>
                    </div>
                    <span className="font-bengali text-[11px] text-gold-deep font-semibold">
                        * বাংলা বা ইংরেজি যেকোনো সংখ্যায় টাইপ করতে পারেন
                    </span>
                </div>

                {/* ৩টি পরিচয়পত্র মোড ট্যাব (NID | Birth Reg | Both) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
                    {IDENTITY_MODES.map((tab) => {
                        const isSelected = (formData.identityType || 'NID') === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => handleIdentityModeSwitch(tab.key)}
                                className={cn(
                                    'text-left p-3 rounded-xl border transition-all duration-200',
                                    isSelected
                                        ? 'bg-emerald-deep text-white border-gold shadow-sm'
                                        : 'bg-paper-panel text-ink hover:bg-paper-deep/60 border-ink-faint'
                                )}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="font-bengali text-xs font-bold">
                                        {tab.labelBng}
                                    </span>
                                    {isSelected && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-gold-soft shrink-0" />
                                    )}
                                </div>
                                <p
                                    className={cn(
                                        'font-bengali text-[10.5px] mt-0.5 leading-snug',
                                        isSelected ? 'text-gold-soft/90' : 'text-ink-muted'
                                    )}
                                >
                                    {tab.descBng}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {/* ইনপুট বক্স: NID এবং/অথবা জন্ম নিবন্ধন */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-1">
                    {(formData.identityType === 'NID' || formData.identityType === 'BOTH' || !formData.identityType) && (
                        <FormInput
                            labelEng="National ID (NID)"
                            labelBng="জাতীয় পরিচয়পত্র নম্বর (১০ / ১৩ / ১৭ ডিজিট)"
                            name="nidNumber"
                            inputMode="numeric"
                            value={formData.nidNumber}
                            onChange={(e) => {
                                const pure = extractPureDigits(e.target.value).slice(0, 17);
                                onUpdateField('nidNumber', pure);
                            }}
                            onBlur={() => onBlurField('nidNumber')}
                            placeholder="10, 13 or 17 digit NID number"
                            required={formData.identityType !== 'BIRTH_REG'}
                            isMonoText
                            showValidIcon
                            isValid={nidLive.valid && nidDigits.length > 0}
                            error={getFieldError('nidNumber', nidLive, nidDigits)}
                            rightElement={
                                <span
                                    className={cn(
                                        'font-mono text-[10.5px] px-1.5 py-0.5 rounded font-bold',
                                        [10, 13, 17].includes(nidDigits.length)
                                            ? 'bg-success-bg text-success'
                                            : 'bg-paper-deep text-ink-muted'
                                    )}
                                >
                                    {nidDigits.length} digits
                                </span>
                            }
                            hint="কার্ডে মুদ্রিত অবিকল ১০, ১৩ অথবা ১৭ সংখ্যার এনআইডি নম্বর দিন।"
                        />
                    )}

                    {(formData.identityType === 'BIRTH_REG' || formData.identityType === 'BOTH') && (
                        <FormInput
                            labelEng="Birth Registration No"
                            labelBng="ডিজিটাল জন্ম নিবন্ধন নম্বর (১৭ ডিজিট)"
                            name="birthRegNumber"
                            inputMode="numeric"
                            value={formData.birthRegNumber}
                            onChange={(e) => {
                                const pure = extractPureDigits(e.target.value).slice(0, 17);
                                onUpdateField('birthRegNumber', pure);
                            }}
                            onBlur={() => onBlurField('birthRegNumber')}
                            placeholder="যেমনঃ 20031591234567890"
                            required={formData.identityType === 'BIRTH_REG'}
                            isMonoText
                            showValidIcon
                            isValid={birthRegLive.valid && birthRegDigits.length === 17}
                            error={getFieldError('birthRegNumber', birthRegLive, birthRegDigits)}
                            rightElement={
                                <span
                                    className={cn(
                                        'font-mono text-[10.5px] px-1.5 py-0.5 rounded font-bold',
                                        birthRegDigits.length === 17
                                            ? 'bg-success-bg text-success'
                                            : 'bg-paper-deep text-ink-muted'
                                    )}
                                >
                                    {birthRegDigits.length}/17
                                </span>
                            }
                            hint="সনদের ১৭ সংখ্যার অনলাইন জন্ম নিবন্ধন নম্বর (প্রথম ৪ সংখ্যা জন্মসাল)।"
                        />
                    )}

                    {/* ইনডেক্স নম্বর (যদি কারো থাকে - সম্পূর্ণ ঐচ্ছিক) */}
                    <FormInput
                        labelEng="Index Number (Optional)"
                        labelBng="ইনডেক্স নম্বর (যদি থাকে — ঐচ্ছিক)"
                        name="indexNumber"
                        value={formData.indexNumber}
                        onChange={(e) => onUpdateField('indexNumber', e.target.value)}
                        placeholder="যেমনঃ N2104589 (না থাকলে খালি রাখুন)"
                        leftIcon={Hash}
                        isMonoText
                        hint="বেসরকারি/নন-এমপিও শিক্ষকদের ক্ষেত্রে এটি খালি রাখুন।"
                    />
                </div>
            </section>

            {/* =================================================================
                SECTION 4: DATE OF BIRTH, AGE VERIFICATION & JOINING DATE
               ================================================================= */}
            <section>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-ink-faint">
                    <Calendar className="w-4 h-4 text-emerald" />
                    <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                        ৪. জন্ম তারিখ ও মাদ্রাসায় যোগদানের তারিখ (১০-ডিজিট আইডি নির্ধারক)
                    </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-1">
                    <FormInput
                        labelEng="Date of Birth"
                        labelBng="জন্ম তারিখ (বয়স ১৫ – ৭০ বছর)"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => onUpdateField('dateOfBirth', e.target.value)}
                        onBlur={() => onBlurField('dateOfBirth')}
                        required
                        isMonoText
                        isValid={dobLive.valid}
                        error={getFieldError('dateOfBirth', dobLive, formData.dateOfBirth)}
                        hint="সনদপত্র অনুযায়ী সঠিক জন্ম তারিখ নির্বাচন করুন।"
                    />

                    <FormInput
                        labelEng="Date of Joining"
                        labelBng="মাদ্রাসায় যোগদানের তারিখ"
                        name="joiningDate"
                        type="date"
                        value={formData.joiningDate}
                        onChange={(e) => onUpdateField('joiningDate', e.target.value)}
                        onBlur={() => onBlurField('joiningDate')}
                        required
                        isMonoText
                        isValid={joinLive.valid}
                        error={getFieldError('joiningDate', joinLive, formData.joiningDate)}
                        hint="জন্ম তারিখ থেকে যোগদানের তারিখের ব্যবধান কমপক্ষে ১৫ বছর হতে হবে।"
                    />
                </div>

                {/* বয়স ও চাকরির যোগদান যাচাই স্ট্যাটাস কার্ড */}
                {formData.dateOfBirth && (
                    <div
                        className={cn(
                            'mt-2 p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs font-bengali transition-all',
                            dobLive.valid && joinLive.valid
                                ? 'bg-emerald-subtle border-emerald-border text-emerald-deep'
                                : 'bg-danger-bg border-danger-border text-danger'
                        )}
                    >
                        <div className="flex items-center gap-2">
                            {dobLive.valid && joinLive.valid ? (
                                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                            )}
                            <span>
                                বর্তমান বয়স:{' '}
                                <b>{dobLive.ageInfo ? dobLive.ageInfo.formattedBng : '—'}</b>
                                {ageAtJoiningInfo && (
                                    <>
                                        {' '}· যোগদানের সময় বয়স:{' '}
                                        <b>{ageAtJoiningInfo.formattedBng}</b>
                                    </>
                                )}
                            </span>
                        </div>

                        {dobLive.valid && joinLive.valid && (
                            <span className="font-mono text-[11px] font-semibold text-emerald flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-gold-deep" />
                                ID Year Segment: {formData.joiningDate.slice(2, 4)}
                                {formData.dateOfBirth.slice(2, 4)}
                            </span>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}`,

    // =========================================================================
    // 2. UPDATE PublicRegistrationLedger.jsx TO PLUG IN STEP 1 & GATEKEEPER
    // =========================================================================
    'src/pages/public/registration/PublicRegistrationLedger.jsx': `/**
 * ARDM Enterprise ERP — Public Teacher Registration Master Ledger Shell (Updated in Step 7)
 * Integrates Step1PersonalIdentity with strict step-gatekeeping validation.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    RotateCcw,
    ShieldCheck,
    CreditCard,
    Sparkles,
    GraduationCap,
    MapPin,
    Camera
} from 'lucide-react';
import { INSTITUTION_INFO } from '@constants/app.constants';
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
import Step1PersonalIdentity, { validateStep1PersonalData } from './Step1PersonalIdentity';

export default function PublicRegistrationLedger() {
    const toast = useToast();
    const ledgerTopRef = useRef(null);

    // ১. ড্রাফট অথবা ইনিশিয়াল স্টেট লোড করা
    const savedDraft = loadRegistrationDraft();
    const [currentStep, setCurrentStep] = useState(savedDraft ? savedDraft.step : 0);
    const [formData, setFormData] = useState(
        savedDraft ? savedDraft.data : createInitialRegistrationData()
    );
    const [touchedFields, setTouchedFields] = useState({});
    const [stepErrors, setStepErrors] = useState({});
    const [completedSteps, setCompletedSteps] = useState({});
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    // ২. ব্যাকএন্ড মেটাডেটা ও সংরক্ষিত আইডি কার্ড টোকেন
    const [serverMetadata, setServerMetadata] = useState({
        loaded: false,
        nextSuggestedBiometricDeviceId: 1
    });
    const [existingRegistryToken, setExistingRegistryToken] = useState(() =>
        getSavedRegistryToken()
    );

    // ৩. সেশন স্টোরেজে অটো-ড্রাফট সেভ
    useEffect(() => {
        saveRegistrationDraft(currentStep, formData);
    }, [currentStep, formData]);

    // ৪. ব্যাকএন্ড থেকে লাইভ মেটাডেটা লোড
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
            .catch(() => {});

        return () => {
            isMounted = false;
        };
    }, []);

    // ৫. ফিল্ড আপডেট এবং ব্লার হ্যান্ডলার
    const handleUpdateField = (fieldName, value) => {
        setFormData((prev) => ({
            ...prev,
            [fieldName]: value
        }));
        // ইউজার টাইপ করে সংশোধন করলে আগের এরর ক্লিয়ার করা
        if (stepErrors[fieldName]) {
            setStepErrors((prev) => {
                const next = { ...prev };
                delete next[fieldName];
                return next;
            });
        }
    };

    const handleBlurField = (fieldName) => {
        setTouchedFields((prev) => ({
            ...prev,
            [fieldName]: true
        }));
    };

    // ৬. ১০-ডিজিট টিচার আইডি ও র‍্যাংকিং লাইভ প্রিভিউ
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

    const scrollToLedgerTop = () => {
        if (ledgerTopRef.current) {
            const topPos = ledgerTopRef.current.getBoundingClientRect().top + window.scrollY - 20;
            window.scrollTo({ top: Math.max(0, topPos), behavior: 'smooth' });
        }
    };

    // ৭. বর্তমান ধাপের মিলিটারি ভ্যালিডেশন চেক করে পরবর্তী ধাপে যাওয়া
    const handleNextStep = () => {
        if (currentStep === 0) {
            const check = validateStep1PersonalData(formData);
            if (!check.valid) {
                setStepErrors(check.errors);
                const firstErrorMsg = Object.values(check.errors)[0];
                toast.error(firstErrorMsg || 'অনুগ্রহ করে লাল চিহ্নিত ঘরগুলো সঠিকভাবে পূরণ করুন।');
                return;
            }
            setStepErrors({});
        }

        setCompletedSteps((prev) => ({ ...prev, [currentStep]: true }));

        if (currentStep < REGISTRATION_STEPS.length - 1) {
            setCurrentStep((prev) => prev + 1);
            scrollToLedgerTop();
        } else {
            toast.success('সকল ধাপ প্রস্তুত হচ্ছে!');
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
        setTouchedFields({});
        setStepErrors({});
        setCompletedSteps({});
        setCurrentStep(0);
        setIsResetConfirmOpen(false);
        toast.info('ফর্মের সকল খসড়া তথ্য রিসেট করা হয়েছে।');
    };

    const activeStepMeta = REGISTRATION_STEPS[currentStep] || REGISTRATION_STEPS[0];

    return (
        <div className="min-h-screen py-7 sm:py-10 px-3.5 sm:px-6 lg:px-8">
            <div className="max-w-[1040px] mx-auto">

                {/* ১. মাদ্রাসা ক্রেস্ট ও হেডার */}
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

                {/* ২. সংরক্ষিত রেজিস্ট্রি কার্ড ব্যানার (থাকলে) */}
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
                                    Teacher ID: <b className="text-emerald-deep">{existingRegistryToken.teacherId}</b>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="emerald"
                                size="xs"
                                onClick={() => toast.info('ধাপ ১০-এ ডিজিটাল আইডি কার্ড ভিউ যুক্ত হবে!')}
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

                {/* ৩. মেইন রেজিস্ট্রেশন লেজার বডি */}
                <main ref={ledgerTopRef} className="ledger-surface animate-fade-up">
                    <div className="grid grid-cols-1 md:grid-cols-[265px_1fr] min-h-[580px]">

                        {/* বাম পাশের রেসপনসিভ স্টেপার */}
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

                        {/* ডান পাশের ফর্ম প্যানেল */}
                        <div className="p-5 sm:p-8 lg:p-9 flex flex-col justify-between bg-paper-panel">
                            <div>
                                {/* ফর্ম স্টেপ টাইটেল বার */}
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
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        রিসেট
                                    </button>
                                </div>

                                {/* =========================================================
                                    ACTIVE STEP CONTENT RENDERER
                                   ========================================================= */}
                                {currentStep === 0 && (
                                    <Step1PersonalIdentity
                                        formData={formData}
                                        onUpdateField={handleUpdateField}
                                        touchedFields={touchedFields}
                                        onBlurField={handleBlurField}
                                        stepErrors={stepErrors}
                                    />
                                )}

                                {currentStep > 0 && (
                                    <div className="p-6 rounded-2xl bg-paper border border-ink-faint text-center animate-fade-up">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-subtle text-emerald flex items-center justify-center">
                                            {currentStep === 1 && <GraduationCap className="w-6 h-6" />}
                                            {currentStep === 2 && <MapPin className="w-6 h-6" />}
                                            {currentStep === 3 && <Camera className="w-6 h-6" />}
                                        </div>
                                        <Badge variant="success" size="md" dot className="mb-2">
                                            ধাপ ১ (ব্যক্তিগত ও পরিচয়পত্র তথ্য) ভ্যালিডেশন উত্তীর্ণ!
                                        </Badge>
                                        <h3 className="font-bengali text-lg font-bold text-emerald-deep mt-1">
                                            {activeStepMeta.titleBng} ({activeStepMeta.titleEng})
                                        </h3>
                                        <p className="font-bengali text-xs text-ink-soft max-w-md mx-auto mt-1 leading-relaxed">
                                            পরবর্তী মাইক্রো-ধাপ ৮-এ আমরা পিতা-মাতার দ্বিভাষিক নাম, শিক্ষাগত যোগ্যতা (GPA/CGPA র‍্যাংকিং কার্ড) এবং সরফভাটা ঠিকানা ফর্ম যুক্ত করব।
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* বটম নেভিগেশন বাটন বার */}
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
                                    <span>
                                        ধাপ {toBengaliDigits(currentStep + 1)} /{' '}
                                        {toBengaliDigits(REGISTRATION_STEPS.length)}
                                    </span>
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
                                            : 'যাচাই করে পরবর্তী ধাপে যান'}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="text-center mt-6">
                    <p className="font-bengali text-xs text-ink-soft opacity-80">
                        {INSTITUTION_INFO.developerCreditBng}
                    </p>
                </footer>

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
}`
};

Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(clientDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
    console.log(`✅ Created/Updated File: client/${filePath}`);
});

console.log('\n🎉 Step 7 (Registration Step 1: Personal & Identity Form) Completed!');