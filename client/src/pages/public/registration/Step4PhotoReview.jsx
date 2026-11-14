/**
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
                        placeholder={`খালি রাখলে ডিফল্ট: ${idPreview?.fullId || '10-Digit ID'}`}
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
                                    {formData.nidNumber ? `NID: ${formData.nidNumber}` : ''}
                                    {formData.nidNumber && formData.birthRegNumber ? ' | ' : ''}
                                    {formData.birthRegNumber ? `BRN: ${formData.birthRegNumber}` : ''}
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
                                                {q.examTitle} {q.majorOrGroup ? `(${q.majorOrGroup})` : ''}
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
                                style={{ width: `${Math.max(8, submittingState.uploadPercent)}%` }}
                            />
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
