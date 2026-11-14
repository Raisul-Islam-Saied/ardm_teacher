/**
 * ARDM Enterprise ERP — Step 9: Registration Step 4 (500x500 Square Photo Cropper,
 * Full Ledger Review, Portal Password, Attestation & Backend Submission Engine)
 * Run from D:\ardm_teacher: node setup_step9_photo_review.js
 */

const fs = require('fs');
const path = require('path');

console.log('📸 Initializing Step 9: Registration Step 4 (500x500 Photo Studio, Review Ledger & Submission Engine)...\n');

const clientDir = fs.existsSync(path.join(__dirname, 'src'))
    ? __dirname
    : path.join(__dirname, 'client');

if (!fs.existsSync(clientDir)) {
    console.error('❌ Error: client directory not found!');
    process.exit(1);
}

const files = {
    // =========================================================================
    // 1. STEP 4 COMPONENT: 500x500 PHOTO CROPPER, REVIEW LEDGER & ATTESTATION
    // =========================================================================
    'src/pages/public/registration/Step4PhotoReview.jsx': `/**
 * ARDM Enterprise ERP — Registration Step 4: Photograph, Full Ledger Review & Attestation
 * Features:
 * - Client-side HTML5 Canvas 500x500 Square Photo Processor (Drag & Drop + File Picker)
 * - Optional Portal Password (defaults to 10-Digit Teacher ID if left blank)
 * - Complete Bilingual Ledger Summary of Steps 1, 2 & 3 with 1-Click "Edit Step" links
 * - Mandatory Official Attestation Checkbox with Military-Grade Validation
 */

import React, { useState, useRef } from 'react';
import {
    Camera,
    UploadCloud,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Edit3,
    Lock,
    ShieldCheck,
    User,
    Users,
    GraduationCap,
    MapPin,
    Sparkles,
    Image as ImageIcon,
    FileCheck2
} from 'lucide-react';
import { DEGREE_LEVELS } from '@constants/app.constants';
import { FormInput, Button, Badge } from '@components/ui';
import { processImageToSquare500 } from '@api/cloudinaryClient';
import {
    toBengaliDigits,
    formatDisplayDate,
    formatPhoneDisplay
} from '@utils/formatters';
import { cn } from '@utils/cn';

/**
 * পুরো Step 4 (ছবি, পাসওয়ার্ড ও শপথনামা) যাচাই করার এক্সপোর্টেড ফাংশন
 */
export function validateStep4PhotoReviewData(formData, photoData) {
    const errors = {};

    if (!photoData || (!photoData.blob && !photoData.uploadedUrl)) {
        errors.photo = 'নিবন্ধন সম্পন্ন করার জন্য আপনার স্পষ্ট পাসপোর্ট/স্কয়ার সাইজের ছবি আপলোড করা আবশ্যক।';
    }

    if (formData.password && String(formData.password).trim().length > 0) {
        if (String(formData.password).trim().length < 6) {
            errors.password = 'পাসওয়ার্ড দিলে তা কমপক্ষে ৬ অক্ষরের হতে হবে (অথবা ডিফল্ট আইডি পাসওয়ার্ডের জন্য খালি রাখুন)।';
        }
    }

    if (!formData.attestConfirmed) {
        errors.attestConfirmed = 'নিবন্ধন চূড়ান্ত করার পূর্বে অঙ্গীকারনামায় (শপথনামা) টিক চিহ্ন দেওয়া আবশ্যক।';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

export default function Step4PhotoReview({
    formData,
    onUpdateField,
    photoData,
    onUpdatePhoto,
    onJumpToStep,
    idPreview,
    rankPreview,
    stepErrors = {},
    submittingState = { isSubmitting: false, stageText: '', uploadPercent: 0 }
}) {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [photoProcessing, setPhotoProcessing] = useState(false);
    const [localPhotoError, setLocalPhotoError] = useState('');

    // ছবি সিলেক্ট বা ড্রপ করলে ৫০০×৫০০ স্কয়ারে প্রসেস করা
    const handleProcessSelectedFile = async (file) => {
        if (!file) return;
        setPhotoProcessing(true);
        setLocalPhotoError('');

        try {
            const processed = await processImageToSquare500(file, {
                targetSize: 500,
                quality: 0.92,
                enforceStrictSquareInput: false
            });
            onUpdatePhoto(processed);
        } catch (err) {
            setLocalPhotoError(err.message || 'ছবি প্রসেস করতে সমস্যা হয়েছে।');
        } finally {
            setPhotoProcessing(false);
        }
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleProcessSelectedFile(file);
        }
        e.target.value = '';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) {
            handleProcessSelectedFile(file);
        }
    };

    const activePhotoError = localPhotoError || stepErrors.photo || '';
    const qualifications = Array.isArray(formData.academicQualifications)
        ? formData.academicQualifications
        : [];

    return (
        <div className="space-y-8 animate-fade-up">

            {/* =================================================================
                SECTION 1: 500x500 SQUARE PHOTOGRAPH STUDIO
               ================================================================= */}
            <section>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2 border-b border-ink-faint">
                    <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-emerald" />
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                            ১. শিক্ষকের অফিশিয়াল ছবি আপলোড (অটো ৫০০×৫০০ পিক্সেল বর্গাকার ইঞ্জিন)
                        </h3>
                    </div>
                    <Badge variant="gold" size="sm" mono>
                        500 × 500 px Square
                    </Badge>
                </div>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        'p-5 sm:p-6 rounded-2xl border-2 border-dashed transition-all duration-200 bg-paper',
                        isDragging
                            ? 'border-gold bg-gold-subtle/30 scale-[1.01]'
                            : activePhotoError
                                ? 'border-danger bg-danger-bg/20'
                                : photoData?.dataUrl
                                    ? 'border-emerald/40 bg-emerald-subtle/20'
                                    : 'border-ink-faint hover:border-gold'
                    )}
                >
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* ৫০০×৫০০ স্কয়ার ফটো প্রিভিউ ফ্রেম */}
                        <div className="relative group shrink-0">
                            <div
                                className={cn(
                                    'w-36 h-36 sm:w-40 sm:h-40 rounded-2xl border-2 overflow-hidden flex flex-col items-center justify-center bg-paper-deep shadow-card transition-all',
                                    photoData?.dataUrl ? 'border-gold' : 'border-ink-faint'
                                )}
                            >
                                {photoData?.dataUrl ? (
                                    <img
                                        src={photoData.dataUrl}
                                        alt="Teacher 500x500 Preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-center p-3">
                                        <ImageIcon className="w-10 h-10 mx-auto text-ink-muted opacity-45 mb-1.5" />
                                        <span className="font-mono text-[10px] text-ink-muted block">
                                            500 × 500 px
                                        </span>
                                        <span className="font-bengali text-[11px] text-ink-soft">
                                            ছবি নেই
                                        </span>
                                    </div>
                                )}
                            </div>

                            {photoData?.dataUrl && (
                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-emerald-deep text-gold-soft font-mono text-[10px] font-bold border border-gold/40 shadow-sm whitespace-nowrap">
                                    500×500 READY
                                </span>
                            )}
                        </div>

                        {/* আপলোড কন্ট্রোল ও নির্দেশনা */}
                        <div className="flex-1 text-center sm:text-left">
                            <h4 className="font-bengali text-base font-bold text-emerald-deep">
                                {photoData?.dataUrl
                                    ? 'মাশাআল্লাহ! আপনার ছবিটি ৫০০×৫০০ বর্গাকারে প্রস্তুত হয়েছে'
                                    : 'স্পষ্ট পাসপোর্ট বা স্কয়ার সাইজের রঙিন ছবি নির্বাচন করুন'}
                            </h4>

                            <p className="font-bengali text-xs text-ink-soft mt-1 leading-relaxed">
                                যেকোনো মাপের ছবি দিলেই সিস্টেম স্বয়ংক্রিয়ভাবে মাঝখান থেকে কেটে নিখুঁত{' '}
                                <b className="font-mono text-emerald-deep">500×500px Square JPEG</b> বানিয়ে নেবে। এই ছবিটি আপনার ডিজিটাল আইডি কার্ড ও প্রোফাইলে ব্যবহৃত হবে।
                            </p>

                            {/* মেটাডেটা ব্যাজ (যদি ছবি প্রসেস হয়ে থাকে) */}
                            {photoData?.dataUrl && (
                                <div className="mt-3 p-2.5 rounded-xl bg-success-bg border border-success-border inline-flex flex-wrap items-center gap-3 text-xs font-bengali text-emerald-deep">
                                    <span className="flex items-center gap-1 font-bold text-success">
                                        <CheckCircle2 className="w-4 h-4" />
                                        অটো-স্কয়ার সম্পন্ন
                                    </span>
                                    <span className="font-mono text-[11px] text-ink-soft">
                                        Original: {photoData.originalWidth}×{photoData.originalHeight}px ➔{' '}
                                        <b className="text-emerald-deep">500×500px</b> ({toBengaliDigits(photoData.sizeKB)} KB)
                                    </span>
                                </div>
                            )}

                            {/* বাটন বার */}
                            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleFileInputChange}
                                    className="hidden"
                                />

                                <Button
                                    variant="emerald"
                                    size="sm"
                                    leftIcon={UploadCloud}
                                    isLoading={photoProcessing}
                                    loadingText="প্রসেস হচ্ছে..."
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <span className="font-bengali">
                                        {photoData?.dataUrl ? 'অন্য ছবি পরিবর্তন করুন' : 'ছবি নির্বাচন করুন (JPG / PNG)'}
                                    </span>
                                </Button>

                                {photoData?.dataUrl && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={Trash2}
                                        onClick={() => onUpdatePhoto(null)}
                                        className="text-danger hover:bg-danger-bg"
                                    >
                                        <span className="font-bengali">ছবি মুছে ফেলুন</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ছবি এরর মেসেজ */}
                    {activePhotoError && (
                        <p className="mt-3 pt-3 border-t border-danger/20 text-xs text-danger font-bengali font-semibold flex items-center gap-1.5 animate-shake">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{activePhotoError}</span>
                        </p>
                    )}
                </div>
            </section>

            {/* =================================================================
                SECTION 2: OPTIONAL PORTAL PASSWORD SETUP
               ================================================================= */}
            <section className="p-4 sm:p-5 rounded-2xl bg-paper border border-ink-faint">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gold-deep" />
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                            ২. শিক্ষক পোর্টাল পাসওয়ার্ড নির্ধারণ (ঐচ্ছিক)
                        </h3>
                    </div>
                    <Badge variant="emerald-subtle" size="sm" mono>
                        Default: {idPreview?.fullId}
                    </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-1 items-start">
                    <FormInput
                        labelEng="Custom Portal Password (Optional)"
                        labelBng="পছন্দের পাসওয়ার্ড (খালি রাখলে ১০-ডিজিট আইডিই পাসওয়ার্ড হবে)"
                        name="password"
                        type="password"
                        variant="erp"
                        leftIcon={Lock}
                        value={formData.password}
                        onChange={(e) => onUpdateField('password', e.target.value)}
                        placeholder={\`খালি রাখলে ডিফল্ট: \${idPreview?.fullId || '10-Digit ID'}\`}
                        isMonoText
                        error={stepErrors.password || ''}
                        containerClassName="mb-1"
                    />

                    <div className="p-3 rounded-xl bg-emerald-subtle/60 border border-emerald-border text-xs font-bengali text-ink-soft leading-relaxed sm:mt-5">
                        <Sparkles className="w-3.5 h-3.5 text-gold-deep inline mr-1" />
                        আপনি ভবিষ্যতে মোবাইল নম্বর এবং এই পাসওয়ার্ড দিয়ে <b>শিক্ষক সেল্ফ-সার্ভিস পোর্টালে</b> লগইন করে নিজের হাজিরা, ছুটির কোটা এবং বেতন স্লিপ দেখতে পারবেন।
                    </div>
                </div>
            </section>

            {/* =================================================================
                SECTION 3: COMPLETE BILINGUAL LEDGER REVIEW SUMMARY
               ================================================================= */}
            <section>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-2 border-b border-ink-faint">
                    <div className="flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-emerald" />
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                            ৩. আপনার প্রদত্ত সকল তথ্যের চূড়ান্ত খসড়া যাচাই (Review Ledger)
                        </h3>
                    </div>
                    <span className="font-bengali text-xs text-ink-muted">
                        কোনো ভুল থাকলে "সংশোধন" বাটনে ক্লিক করে ঠিক করুন
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* কার্ড ক: ব্যক্তিগত ও পরিচয়পত্র তথ্য (Step 1) */}
                    <div className="p-4 rounded-2xl bg-paper border border-ink-faint">
                        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-ink-faint">
                            <span className="font-bengali text-xs font-bold text-emerald-deep flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-gold-deep" />
                                ব্যক্তিগত ও পদবী তথ্য
                            </span>
                            <button
                                type="button"
                                onClick={() => onJumpToStep(0)}
                                className="inline-flex items-center gap-1 text-[11px] font-bengali font-semibold text-emerald hover:text-gold-deep"
                            >
                                <Edit3 className="w-3 h-3" /> সংশোধন
                            </button>
                        </div>

                        <dl className="space-y-1.5 text-xs">
                            <div className="flex justify-between gap-2">
                                <dt className="font-bengali text-ink-muted">নাম (বাংলা):</dt>
                                <dd className="font-bengali font-bold text-ink text-right">{formData.fullNameBng || '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="font-bengali text-ink-muted">নাম (ইংরেজি):</dt>
                                <dd className="font-sans font-semibold text-ink text-right">{formData.fullNameEng || '—'}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="font-bengali text-ink-muted">পদবী ও বিষয়:</dt>
                                <dd className="font-bengali font-semibold text-emerald-deep text-right">
                                    {rankPreview?.designationBng} ({formData.subject})
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="font-bengali text-ink-muted">এনআইডি / জন্ম নিবন্ধন:</dt>
                                <dd className="font-mono font-semibold text-ink text-right">
                                    {formData.nidNumber ? \`NID: \${formData.nidNumber}\` : ''}
                                    {formData.nidNumber && formData.birthRegNumber ? ' | ' : ''}
                                    {formData.birthRegNumber ? \`BRN: \${formData.birthRegNumber}\` : ''}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="font-bengali text-ink-muted">জন্ম ও যোগদানের তারিখ:</dt>
                                <dd className="font-bengali text-ink text-right">
                                    {formatDisplayDate(formData.dateOfBirth, 'bn')} · যোগদান: {formatDisplayDate(formData.joiningDate, 'bn')}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="font-bengali text-ink-muted">রক্তের গ্রুপ ও ধর্ম:</dt>
                                <dd className="font-mono text-ink text-right">
                                    {formData.bloodGroup} · {formData.religion} ({formData.maritalStatus})
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* কার্ড খ: পিতা-মাতা ও যোগাযোগের ঠিকানা (Step 2 & 3) */}
                    <div className="p-4 rounded-2xl bg-paper border border-ink-faint">
                        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-ink-faint">
                            <span className="font-bengali text-xs font-bold text-emerald-deep flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-gold-deep" />
                                পিতা-মাতা ও ঠিকানা
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onJumpToStep(1)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bengali font-semibold text-emerald hover:text-gold-deep"
                                >
                                    <Edit3 className="w-3 h-3" /> পিতা-মাতা
                                </button>
                                <span className="text-ink-faint">|</span>
                                <button
                                    type="button"
                                    onClick={() => onJumpToStep(2)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bengali font-semibold text-emerald hover:text-gold-deep"
                                >
                                    <Edit3 className="w-3 h-3" /> ঠিকানা
                                </button>
                            </div>
                        </div>

                        <dl className="space-y-1.5 text-xs">
                            <div className="flex justify-between gap-2">
                                <dt className="font-bengali text-ink-muted">পিতার নাম:</dt>
                                <dd className="font-bengali font-semibold text-ink text-right">
                                    {formData.fathersNameBng} ({formData.fathersNameEng})
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="font-bengali text-ink-muted">মাতার নাম:</dt>
                                <dd className="font-bengali font-semibold text-ink text-right">
                                    {formData.mothersNameBng} ({formData.mothersNameEng})
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="font-bengali text-ink-muted">নিজস্ব মোবাইল:</dt>
                                <dd className="font-mono font-bold text-emerald-deep text-right">
                                    {formatPhoneDisplay(formData.phone)}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="font-bengali text-ink-muted">জরুরি যোগাযোগ:</dt>
                                <dd className="font-bengali text-ink text-right">
                                    {formData.emergencyContact?.contactName} ({formData.emergencyContact?.relationship}) —{' '}
                                    <span className="font-mono font-semibold">
                                        {formatPhoneDisplay(formData.emergencyContact?.phone)}
                                    </span>
                                </dd>
                            </div>
                            <div className="flex justify-between gap-2">
                                <dt className="font-bengali text-ink-muted">বর্তমান ঠিকানা:</dt>
                                <dd className="font-bengali text-ink text-right">
                                    {formData.presentAddress?.houseOrRoad}, {formData.presentAddress?.village},{' '}
                                    {formData.presentAddress?.postOffice} ({formData.presentAddress?.postCode}),{' '}
                                    {formData.presentAddress?.upazila}, {formData.presentAddress?.district}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* শিক্ষাগত যোগ্যতা ও সিজিপিএ রিভিউ টেবিল */}
                <div className="mt-4 p-4 rounded-2xl bg-paper border border-ink-faint">
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-ink-faint">
                        <span className="font-bengali text-xs font-bold text-emerald-deep flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-gold-deep" />
                            শিক্ষাগত যোগ্যতা ও অটো-সিনিয়রিটি পয়েন্ট ({toBengaliDigits(qualifications.length)}টি সনদ)
                        </span>
                        <button
                            type="button"
                            onClick={() => onJumpToStep(1)}
                            className="inline-flex items-center gap-1 text-[11px] font-bengali font-semibold text-emerald hover:text-gold-deep"
                        >
                            <Edit3 className="w-3 h-3" /> ডিগ্রি সংশোধন
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-ink-faint text-ink-muted font-bengali">
                                    <th className="py-1.5 pr-3">ডিগ্রির স্তর</th>
                                    <th className="py-1.5 px-3">পরীক্ষার নাম ও বিষয়</th>
                                    <th className="py-1.5 px-3">বোর্ড / বিশ্ববিদ্যালয়</th>
                                    <th className="py-1.5 px-3 text-center">পাসের সন</th>
                                    <th className="py-1.5 pl-3 text-right">প্রাপ্ত GPA / CGPA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ink-faint/60">
                                {qualifications.map((q, idx) => {
                                    const degObj = DEGREE_LEVELS.find((d) => d.key === q.degreeLevel);
                                    return (
                                        <tr key={q.id || idx} className="font-bengali">
                                            <td className="py-2 pr-3 font-semibold text-emerald-deep">
                                                {degObj ? degObj.labelBng : q.degreeLevel}
                                            </td>
                                            <td className="py-2 px-3">
                                                {q.examTitle} {q.majorOrGroup ? \`(\${q.majorOrGroup})\` : ''}
                                            </td>
                                            <td className="py-2 px-3 text-ink-soft">{q.boardOrUniversity}</td>
                                            <td className="py-2 px-3 text-center font-mono">{q.passingYear}</td>
                                            <td className="py-2 pl-3 text-right font-mono font-bold text-emerald">
                                                {q.gpaOrCgpa} <span className="text-[10px] text-ink-muted font-normal">/ {q.scale}.00</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* =================================================================
                SECTION 4: OFFICIAL ATTESTATION (শপথনামা) & UPLOAD PROGRESS
               ================================================================= */}
            <section>
                <div
                    onClick={() => onUpdateField('attestConfirmed', !formData.attestConfirmed)}
                    className={cn(
                        'p-4 sm:p-5 rounded-2xl border-1.5 transition-all cursor-pointer select-none',
                        formData.attestConfirmed
                            ? 'bg-emerald-subtle border-emerald shadow-xs'
                            : stepErrors.attestConfirmed
                                ? 'bg-danger-bg/50 border-danger animate-shake'
                                : 'bg-paper border-ink-faint hover:border-gold'
                    )}
                >
                    <label className="flex items-start gap-3.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={Boolean(formData.attestConfirmed)}
                            onChange={(e) => onUpdateField('attestConfirmed', e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 w-4.5 h-4.5 accent-emerald rounded cursor-pointer shrink-0"
                        />
                        <div className="text-xs sm:text-[13px] font-bengali leading-relaxed text-ink">
                            <span className="font-bold text-emerald-deep block mb-0.5">
                                অফিশিয়াল প্রত্যয়ন ও অঙ্গীকারনামা (Official Attestation):
                            </span>
                            আমি সজ্ঞানে প্রত্যয়ন করছি যে, আবদুর রাজ্জাক দাখিল মাদ্রাসার শিক্ষক/কর্মচারী নিবন্ধন খাতায় আমার প্রদত্ত সকল ব্যক্তিগত তথ্য, জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন নম্বর এবং শিক্ষাগত সনদের জিপিএ/সিজিপিএ সম্পূর্ণ সত্য ও নির্ভুল। ভবিষ্যতে কোনো তথ্য ত্রুটিপূর্ণ প্রমাণিত হলে কর্তৃপক্ষ যেকোনো প্রশাসনিক ব্যবস্থা গ্রহণ করতে পারবে।
                        </div>
                    </label>
                </div>

                {stepErrors.attestConfirmed && (
                    <p className="mt-1.5 text-xs text-danger font-bengali font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{stepErrors.attestConfirmed}</span>
                    </p>
                )}

                {/* সাবমিশন চলাকালীন লাইভ ক্লাউডিনারি ও ডাটাবেস প্রোগ্রেস বার */}
                {submittingState.isSubmitting && (
                    <div className="mt-5 p-4 rounded-2xl bg-emerald-deep text-white border border-gold/40 shadow-ledger animate-pop-in">
                        <div className="flex items-center justify-between text-xs font-bengali mb-2">
                            <span className="flex items-center gap-2 font-semibold text-gold-soft">
                                <ShieldCheck className="w-4 h-4 animate-pulse" />
                                {submittingState.stageText || 'তথ্য ও ছবি সার্ভারে সংরক্ষিত হচ্ছে...'}
                            </span>
                            <span className="font-mono font-bold">
                                {submittingState.uploadPercent}%
                            </span>
                        </div>
                        <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-gold to-gold-soft transition-all duration-300 rounded-full"
                                style={{ width: \`\${Math.max(8, submittingState.uploadPercent)}%\` }}
                            />
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}`,

    // =========================================================================
    // 2. UPDATE PublicRegistrationLedger.jsx WITH FULL CLOUDINARY + API SUBMIT
    // =========================================================================
    'src/pages/public/registration/PublicRegistrationLedger.jsx': `/**
 * ARDM Enterprise ERP — Public Teacher Registration Master Ledger Shell (Updated in Step 9)
 * Integrates all 4 Steps + Cloudinary 500x500 Photo Upload + Backend Self-Registration API
 * + LocalStorage Digital Registry Card Token Persistence.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    RotateCcw,
    ShieldCheck,
    CreditCard,
    Send,
    CheckCircle2,
    Printer
} from 'lucide-react';
import { INSTITUTION_INFO, STORAGE_KEYS } from '@constants/app.constants';
import { Button, Badge, ConfirmDialog } from '@components/ui';
import { useToast } from '@context/ToastContext';
import axiosClient from '@api/axiosClient';
import { uploadSquarePhotoToCloudinary } from '@api/cloudinaryClient';
import {
    previewTenDigitTeacherId,
    calculateLiveRankMetrics,
    toBengaliDigits,
    toEnglishDigits,
    extractPureDigits
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
import Step2ParentsAcademic, { validateStep2ParentsAcademicData } from './Step2ParentsAcademic';
import Step3AddressContact, { validateStep3AddressContactData } from './Step3AddressContact';
import Step4PhotoReview, { validateStep4PhotoReviewData } from './Step4PhotoReview';

export default function PublicRegistrationLedger() {
    const toast = useToast();
    const ledgerTopRef = useRef(null);

    const savedDraft = loadRegistrationDraft();
    const [currentStep, setCurrentStep] = useState(savedDraft ? savedDraft.step : 0);
    const [formData, setFormData] = useState(
        savedDraft ? savedDraft.data : createInitialRegistrationData()
    );
    const [photoData, setPhotoData] = useState(null);
    const [touchedFields, setTouchedFields] = useState({});
    const [stepErrors, setStepErrors] = useState({});
    const [completedSteps, setCompletedSteps] = useState({});
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    // সাবমিশন প্রোগ্রেস ও সম্পন্ন হওয়া রেজিস্ট্রি রেকর্ড স্টেট
    const [submittingState, setSubmittingState] = useState({
        isSubmitting: false,
        stageText: '',
        uploadPercent: 0
    });
    const [submittedRegistryRecord, setSubmittedRegistryRecord] = useState(null);

    const [serverMetadata, setServerMetadata] = useState({
        loaded: false,
        nextSuggestedBiometricDeviceId: 1
    });
    const [existingRegistryToken, setExistingRegistryToken] = useState(() =>
        getSavedRegistryToken()
    );

    useEffect(() => {
        saveRegistrationDraft(currentStep, formData);
    }, [currentStep, formData]);

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

    const handleUpdateField = (fieldName, value) => {
        setFormData((prev) => ({
            ...prev,
            [fieldName]: value
        }));
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

    // =========================================================================
    // FINAL SUBMISSION ENGINE (Cloudinary 500x500 Upload -> Backend API Save)
    // =========================================================================
    const handleFinalSubmit = async () => {
        // চূড়ান্ত সাবমিশনের আগে ১ থেকে ৪ সব ধাপ আরেকবার ভ্যালিডেট করে নেওয়া
        const c1 = validateStep1PersonalData(formData);
        if (!c1.valid) {
            setStepErrors(c1.errors);
            setCurrentStep(0);
            toast.error('ধাপ ১-এর তথ্যে ত্রুটি রয়েছে, অনুগ্রহ করে যাচাই করুন।');
            return;
        }

        const c2 = validateStep2ParentsAcademicData(formData);
        if (!c2.valid) {
            setStepErrors(c2.errors);
            setCurrentStep(1);
            toast.error('ধাপ ২-এর পিতা-মাতা বা শিক্ষাগত যোগ্যতায় ত্রুটি রয়েছে।');
            return;
        }

        const c3 = validateStep3AddressContactData(formData);
        if (!c3.valid) {
            setStepErrors(c3.errors);
            setCurrentStep(2);
            toast.error('ধাপ ৩-এর মোবাইল নম্বর বা ঠিকানায় ত্রুটি রয়েছে।');
            return;
        }

        const c4 = validateStep4PhotoReviewData(formData, photoData);
        if (!c4.valid) {
            setStepErrors(c4.errors);
            const firstMsg = Object.values(c4.errors)[0];
            toast.error(firstMsg);
            return;
        }

        setStepErrors({});
        setSubmittingState({
            isSubmitting: true,
            stageText: '১/২ · আপনার ৫০০×৫০০ বর্গাকার ছবি ক্লাউডিনারিতে আপলোড হচ্ছে...',
            uploadPercent: 10
        });

        try {
            // ধাপ ক: ক্লাউডিনারিতে ছবি আপলোড (যদি ইতিমধ্যে আপলোড না হয়ে থাকে)
            let uploadedPhotoUrl = photoData.uploadedUrl || '';
            let uploadedPublicId = photoData.uploadedPublicId || '';

            if (!uploadedPhotoUrl) {
                const cloudRes = await uploadSquarePhotoToCloudinary(photoData.blob, {
                    publicId: \`teacher_\${idPreview.fullId}_\${Date.now()}\`,
                    onProgress: (pct) => {
                        setSubmittingState((prev) => ({
                            ...prev,
                            uploadPercent: Math.min(75, Math.round(pct * 0.75))
                        }));
                    }
                });
                uploadedPhotoUrl = cloudRes.url;
                uploadedPublicId = cloudRes.publicId;

                setPhotoData((prev) => ({
                    ...prev,
                    uploadedUrl: uploadedPhotoUrl,
                    uploadedPublicId: uploadedPublicId
                }));
            }

            // ধাপ খ: ব্যাকএন্ডের জন্য ক্লিন পেলোড প্রস্তুত করা
            setSubmittingState({
                isSubmitting: true,
                stageText: '২/২ · মাদ্রাসার মূল ডাটাবেসে নিবন্ধন ও র‍্যাংকিং সংরক্ষিত হচ্ছে...',
                uploadPercent: 88
            });

            const cleanNid = extractPureDigits(formData.nidNumber);
            const cleanBirthReg = extractPureDigits(formData.birthRegNumber);

            const payload = {
                fullNameEng: formData.fullNameEng.trim(),
                fullNameBng: formData.fullNameBng.trim(),
                fathersNameEng: formData.fathersNameEng.trim(),
                fathersNameBng: formData.fathersNameBng.trim(),
                mothersNameEng: formData.mothersNameEng.trim(),
                mothersNameBng: formData.mothersNameBng.trim(),
                designation: formData.designation,
                subject: formData.subject || 'General',
                gender: formData.gender,
                religion: formData.religion,
                bloodGroup: formData.bloodGroup,
                maritalStatus: formData.maritalStatus,
                nidNumber: cleanNid || undefined,
                birthRegNumber: cleanBirthReg || undefined,
                indexNumber: formData.indexNumber ? formData.indexNumber.trim() : undefined,
                dateOfBirth: formData.dateOfBirth,
                joiningDate: formData.joiningDate,
                phone: extractPureDigits(formData.phone),
                email: formData.email ? formData.email.trim().toLowerCase() : undefined,
                emergencyContact: {
                    contactName: formData.emergencyContact.contactName.trim(),
                    relationship: formData.emergencyContact.relationship,
                    phone: extractPureDigits(formData.emergencyContact.phone)
                },
                presentAddress: formData.presentAddress,
                permanentAddress: formData.sameAsPresentAddress
                    ? formData.presentAddress
                    : formData.permanentAddress,
                academicQualifications: formData.academicQualifications.map((q) => ({
                    degreeLevel: q.degreeLevel,
                    examTitle: q.examTitle.trim(),
                    majorOrGroup: q.majorOrGroup ? q.majorOrGroup.trim() : '',
                    boardOrUniversity: q.boardOrUniversity.trim(),
                    passingYear: Number(toEnglishDigits(q.passingYear)),
                    gpaOrCgpa: Number(toEnglishDigits(q.gpaOrCgpa)),
                    scale: Number(q.scale) === 4 ? 4 : 5
                })),
                profilePicture: {
                    url: uploadedPhotoUrl,
                    publicId: uploadedPublicId
                },
                password: formData.password ? formData.password.trim() : undefined
            };

            const apiRes = await axiosClient.post('/teachers/public/self-register', payload);
            const resultData = apiRes.data?.data || {};

            // লোকাল স্টোরেজে রেজিস্ট্রি কার্ড টোকেন স্থায়ীভাবে সংরক্ষণ করা
            const registryTokenObj = {
                uid: resultData.uid,
                teacherId: resultData.teacherId || resultData.teacher?.teacherCode || idPreview.fullId,
                editToken: resultData.editToken,
                fullNameBng: formData.fullNameBng,
                fullNameEng: formData.fullNameEng,
                designation: formData.designation,
                designationBng: rankPreview.designationBng,
                photoUrl: uploadedPhotoUrl,
                registeredAt: new Date().toISOString()
            };

            try {
                localStorage.setItem(
                    STORAGE_KEYS.PUBLIC_REGISTRY,
                    JSON.stringify(registryTokenObj)
                );
            } catch (e) {
                // Ignore quota error
            }

            clearRegistrationDraft();
            setSubmittingState({ isSubmitting: false, stageText: '', uploadPercent: 100 });
            setSubmittedRegistryRecord({
                ...registryTokenObj,
                teacher: resultData.teacher || payload
            });
            setExistingRegistryToken(registryTokenObj);

            toast.success('আলহামদুলিল্লাহ! আপনার নিবন্ধন সফলভাবে সম্পন্ন হয়েছে।');
            scrollToLedgerTop();
        } catch (err) {
            setSubmittingState({ isSubmitting: false, stageText: '', uploadPercent: 0 });
            if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
                setStepErrors(err.fieldErrors);
            }
            toast.error(err.message || 'নিবন্ধন জমা দিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        }
    };

    const handleNextStep = () => {
        if (currentStep === 0) {
            const check1 = validateStep1PersonalData(formData);
            if (!check1.valid) {
                setStepErrors(check1.errors);
                toast.error(Object.values(check1.errors)[0]);
                return;
            }
        } else if (currentStep === 1) {
            const check2 = validateStep2ParentsAcademicData(formData);
            if (!check2.valid) {
                setStepErrors(check2.errors);
                const firstMsg =
                    check2.errors.fathersNameEng ||
                    check2.errors.fathersNameBng ||
                    check2.errors.mothersNameEng ||
                    check2.errors.mothersNameBng ||
                    check2.errors.academicGeneral ||
                    'পিতা-মাতার নাম অথবা শিক্ষাগত যোগ্যতার ঘরগুলো সঠিকভাবে পূরণ করুন।';
                toast.error(firstMsg);
                return;
            }
        } else if (currentStep === 2) {
            const check3 = validateStep3AddressContactData(formData);
            if (!check3.valid) {
                setStepErrors(check3.errors);
                toast.error(Object.values(check3.errors)[0]);
                return;
            }
        } else if (currentStep === 3) {
            handleFinalSubmit();
            return;
        }

        setStepErrors({});
        setCompletedSteps((prev) => ({ ...prev, [currentStep]: true }));
        setCurrentStep((prev) => prev + 1);
        scrollToLedgerTop();
    };

    const handlePrevStep = () => {
        if (currentStep > 0 && !submittingState.isSubmitting) {
            setStepErrors({});
            setCurrentStep((prev) => prev - 1);
            scrollToLedgerTop();
        }
    };

    const handleResetDraft = () => {
        clearRegistrationDraft();
        setFormData(createInitialRegistrationData());
        setPhotoData(null);
        setTouchedFields({});
        setStepErrors({});
        setCompletedSteps({});
        setSubmittedRegistryRecord(null);
        setCurrentStep(0);
        setIsResetConfirmOpen(false);
        toast.info('ফর্মের সকল খসড়া তথ্য রিসেট করা হয়েছে।');
    };

    const activeStepMeta = REGISTRATION_STEPS[currentStep] || REGISTRATION_STEPS[0];

    return (
        <div className="min-h-screen py-7 sm:py-10 px-3.5 sm:px-6 lg:px-8">
            <div className="max-w-[1060px] mx-auto">

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

                {/* ২. সাবমিশন সফল হলে তাৎক্ষণিক কনফার্মেশন ব্যানার (ধাপ ১০-এ পূর্ণাঙ্গ আইডি কার্ড যুক্ত হবে) */}
                {submittedRegistryRecord ? (
                    <div className="ledger-surface p-8 text-center animate-pop-in">
                        <div className="royal-seal mx-auto mb-4 animate-seal-in">
                            <span className="font-mono text-[9px] tracking-widest">ARDM · REG</span>
                            <span className="font-serif font-bold text-xs text-emerald-deep">REGISTERED</span>
                            <span className="font-mono text-[10px] font-bold text-gold-deep">
                                {submittedRegistryRecord.teacherId}
                            </span>
                        </div>

                        <Badge variant="success" size="lg" dot className="mb-3">
                            নিবন্ধন সফলভাবে সম্পন্ন হয়েছে!
                        </Badge>

                        <h2 className="font-bengali text-2xl font-bold text-emerald-deep">
                            {submittedRegistryRecord.fullNameBng} ({submittedRegistryRecord.fullNameEng})
                        </h2>
                        <p className="font-mono text-sm text-gold-deep font-bold mt-1">
                            Official 10-Digit Teacher ID: {submittedRegistryRecord.teacherId}
                        </p>

                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <Button
                                variant="gold"
                                size="md"
                                leftIcon={Printer}
                                onClick={() => window.print()}
                            >
                                <span className="font-bengali">প্রিন্ট করুন (ধাপ ১০-এ পূর্ণাঙ্গ ডিজিটাল আইডি কার্ড আসছে)</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="md"
                                onClick={() => setSubmittedRegistryRecord(null)}
                            >
                                <span className="font-bengali">ফর্মে ফিরে যান</span>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ৩. মেইন রেজিস্ট্রেশন লেজার কার্ড */}
                        <main ref={ledgerTopRef} className="ledger-surface animate-fade-up">
                            <div className="grid grid-cols-1 md:grid-cols-[265px_1fr] min-h-[620px]">

                                {/* বাম পাশের রেসপনসিভ স্টেপার */}
                                <RegistrationStepper
                                    steps={REGISTRATION_STEPS}
                                    currentStep={currentStep}
                                    completedSteps={completedSteps}
                                    onStepSelect={(idx) => {
                                        if (!submittingState.isSubmitting) {
                                            setStepErrors({});
                                            setCurrentStep(idx);
                                            scrollToLedgerTop();
                                        }
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
                                                disabled={submittingState.isSubmitting}
                                                onClick={() => setIsResetConfirmOpen(true)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bengali font-medium text-ink-muted hover:text-danger hover:bg-danger-bg/60 transition-colors"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                রিসেট
                                            </button>
                                        </div>

                                        {/* স্টেপ ১: ব্যক্তিগত ও পরিচয়পত্র */}
                                        {currentStep === 0 && (
                                            <Step1PersonalIdentity
                                                formData={formData}
                                                onUpdateField={handleUpdateField}
                                                touchedFields={touchedFields}
                                                onBlurField={handleBlurField}
                                                stepErrors={stepErrors}
                                            />
                                        )}

                                        {/* স্টেপ ২: পিতা-মাতা ও শিক্ষাগত যোগ্যতা */}
                                        {currentStep === 1 && (
                                            <Step2ParentsAcademic
                                                formData={formData}
                                                onUpdateField={handleUpdateField}
                                                touchedFields={touchedFields}
                                                onBlurField={handleBlurField}
                                                stepErrors={stepErrors}
                                            />
                                        )}

                                        {/* স্টেপ ৩: ঠিকানা ও যোগাযোগ */}
                                        {currentStep === 2 && (
                                            <Step3AddressContact
                                                formData={formData}
                                                onUpdateField={handleUpdateField}
                                                touchedFields={touchedFields}
                                                onBlurField={handleBlurField}
                                                stepErrors={stepErrors}
                                            />
                                        )}

                                        {/* স্টেপ ৪: ৫০০×৫০০ ছবি ক্রপার, রিভিউ লেজার ও শপথনামা */}
                                        {currentStep === 3 && (
                                            <Step4PhotoReview
                                                formData={formData}
                                                onUpdateField={handleUpdateField}
                                                photoData={photoData}
                                                onUpdatePhoto={(newPhoto) => {
                                                    setPhotoData(newPhoto);
                                                    if (stepErrors.photo) {
                                                        setStepErrors((prev) => {
                                                            const next = { ...prev };
                                                            delete next.photo;
                                                            return next;
                                                        });
                                                    }
                                                }}
                                                onJumpToStep={(idx) => {
                                                    setCurrentStep(idx);
                                                    scrollToLedgerTop();
                                                }}
                                                idPreview={idPreview}
                                                rankPreview={rankPreview}
                                                stepErrors={stepErrors}
                                                submittingState={submittingState}
                                            />
                                        )}
                                    </div>

                                    {/* বটম নেভিগেশন বার */}
                                    <div className="flex items-center justify-between gap-4 mt-8 pt-5 border-t border-ink-faint">
                                        <Button
                                            variant="ghost"
                                            size="md"
                                            leftIcon={ArrowLeft}
                                            disabled={submittingState.isSubmitting}
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
                                            isLoading={submittingState.isSubmitting}
                                            loadingText="নিবন্ধন সংরক্ষিত হচ্ছে..."
                                            leftIcon={currentStep === REGISTRATION_STEPS.length - 1 ? Send : undefined}
                                            rightIcon={currentStep === REGISTRATION_STEPS.length - 1 ? undefined : ArrowRight}
                                            onClick={handleNextStep}
                                        >
                                            <span className="font-bengali">
                                                {currentStep === REGISTRATION_STEPS.length - 1
                                                    ? 'নিবন্ধন চূড়ান্ত ও সাবমিট করুন'
                                                    : 'যাচাই করে পরবর্তী ধাপে যান'}
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </main>
                    </>
                )}

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

console.log('\n🎉 Step 9 (Registration Step 4: 500x500 Photo Studio, Review Ledger & Submission Engine) Completed!');