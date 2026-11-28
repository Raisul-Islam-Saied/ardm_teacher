/**
 * ARDM Enterprise ERP — Registration Step 4: Photograph, Password, Full Ledger Review & Attestation
 * Features:
 * - Next-Level Manual 500x500 Square Photo Crop Studio with Mandatory Pure White Background Check
 * - Mandatory Portal Password (6–64 chars) with Visibility Toggle
 * - Complete Bilingual Ledger Summary of Steps 1, 2 & 3 with 1-Click "Edit Step" links
 * - Mandatory Official Attestation Checkbox with Military-Grade Validation
 */

import { Badge, Button, FormInput } from '@components/ui';
import { DEGREE_LEVELS } from '@constants/app.constants';
import { cn } from '@utils/cn';
import {
    formatAcademicResult,
    formatDisplayDate,
    formatPhoneDisplay,
    formatTeacherAddress,
    toBengaliDigits
} from '@utils/formatters';
import { loadImageFromFile } from '@utils/photoCropEngine';
import {
    AlertCircle,
    Camera,
    CheckCircle2,
    Crop,
    Edit3,
    Eye,
    EyeOff,
    FileCheck2,
    GraduationCap,
    Image as ImageIcon,
    Lock,
    MapPin,
    ShieldCheck,
    Sparkles,
    Trash2,
    UploadCloud,
    User
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import PhotoCropStudioModal from './PhotoCropStudioModal';

/**
 * পুরো Step 4 (ছবি, পাসওয়ার্ড ও শপথনামা) যাচাই করার এক্সপোর্টেড ফাংশন
 */
export function validateStep4PhotoReviewData(formData, photoData) {
    const errors = {};

    if (!photoData || (!photoData.blob && !photoData.uploadedUrl)) {
        errors.photo = 'নিবন্ধন সম্পন্ন করার জন্য আপনার স্পষ্ট সাদা ব্যাকগ্রাউন্ডের ছবি ক্রপ করে আপলোড করা আবশ্যক।';
    }

    const trimmedPassword = String(formData.password || '').trim();
    if (!trimmedPassword) {
        errors.password = 'শিক্ষক পোর্টালে লগইনের জন্য পাসওয়ার্ড প্রদান করা আবশ্যক।';
    } else if (trimmedPassword.length < 6 || trimmedPassword.length > 64) {
        errors.password = 'পাসওয়ার্ড অবশ্যই ৬ থেকে ৬৪ অক্ষরের মধ্যে হতে হবে।';
    }

    if (!formData.attestConfirmed) {
        errors.attestConfirmed = 'নিবন্ধন চূড়ান্ত করার পূর্বে অঙ্গীকারনামায় (শপথনামা) টিক চিহ্ন দেওয়া আবশ্যক।';
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
    rankPreview,
    photoOnly = false,
    allowPhotoRemove = true,
    stepErrors = {},
    submittingState = { isSubmitting: false, stageText: '', uploadPercent: 0 }
}) {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [localPhotoError, setLocalPhotoError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // ম্যানুয়াল ক্রপ স্টুডিও স্টেট
    const [cropSource, setCropSource] = useState(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);

    const isSubmitting = Boolean(submittingState?.isSubmitting);

    // কম্পোনেন্ট আনমাউন্ট হলে ObjectURL ক্লিনআপ
    useEffect(() => {
        return () => {
            if (cropSource?.objectUrl) {
                URL.revokeObjectURL(cropSource.objectUrl);
            }
        };
    }, [cropSource]);

    // ছবি সিলেক্ট বা ড্রপ করলে ম্যানুয়াল ক্রপ স্টুডিও ওপেন করা
    const handleOpenCropperWithFile = async (file) => {
        if (!file || isSubmitting) return;
        setPhotoLoading(true);
        setLocalPhotoError('');

        try {
            const loaded = await loadImageFromFile(file);
            setCropSource((prev) => {
                if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
                return loaded;
            });
            setIsCropModalOpen(true);
        } catch (err) {
            setLocalPhotoError(err.message || 'ছবি লোড করতে সমস্যা হয়েছে।');
        } finally {
            setPhotoLoading(false);
        }
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleOpenCropperWithFile(file);
        }
        e.target.value = '';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isSubmitting) setIsDragging(true);
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
        if (isSubmitting) return;
        const file = e.dataTransfer?.files?.[0];
        if (file) {
            handleOpenCropperWithFile(file);
        }
    };

    const activePhotoError = localPhotoError || stepErrors.photo || '';
    const qualifications = Array.isArray(formData.academicQualifications)
        ? formData.academicQualifications
        : [];
    const trimmedPassword = String(formData.password || '').trim();
    const isPasswordValid = trimmedPassword.length >= 6 && trimmedPassword.length <= 64;

    return (
        <div className="space-y-8 animate-fade-up">

            {/* =================================================================
                SECTION 1: 500x500 MANUAL PHOTOGRAPH STUDIO (PURE WHITE REQUIRED)
               ================================================================= */}
            <section>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2 border-b border-ink-faint">
                    <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-emerald" />
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                            ১. শিক্ষকের অফিশিয়াল ছবি আপলোড (ম্যানুয়াল ক্রপ ও পিউর সাদা ব্যাকগ্রাউন্ড)
                        </h3>
                    </div>
                    <Badge variant="gold" size="sm" mono>
                        500 × 500 px · WHITE BG
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
                        {/* ৫০০×৫০০ স্কয়ার ফটো প্রিভিউ ফ্রেম */}
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
                                            সাদা ব্যাকগ্রাউন্ড
                                        </span>
                                    </div>
                                )}
                            </div>

                            {photoData?.dataUrl && (
                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-emerald-deep text-gold-soft font-mono text-[10px] font-bold border border-gold/40 shadow-sm whitespace-nowrap">
                                    WHITE BG VERIFIED
                                </span>
                            )}
                        </div>

                        {/* আপলোড কন্ট্রোল ও নির্দেশনা */}
                        <div className="flex-1 text-center sm:text-left">
                            <h4 className="font-bengali text-base font-bold text-emerald-deep">
                                {photoData?.dataUrl
                                    ? 'মাশাআল্লাহ! আপনার সাদা ব্যাকগ্রাউন্ডের ছবিটি ৫০০×৫০০ বর্গাকারে প্রস্তুত'
                                    : 'পিউর সাদা ব্যাকগ্রাউন্ডের রঙিন ছবি নির্বাচন করে ক্রপ করুন'}
                            </h4>

                            <p className="font-bengali text-xs text-ink-soft mt-1 leading-relaxed">
                                ছবি নির্বাচন করলে ক্রপ স্টুডিও ওপেন হবে। আপনি নিজেই ছবিটি জুম ও অ্যাডজাস্ট করে{' '}
                                <b className="font-mono text-emerald-deep">500×500px</b> আকারে ক্রপ করতে পারবেন।{' '}
                                <b className="text-emerald-deep">সাদা ব্যাকগ্রাউন্ড ছাড়া ছবি গ্রহণ করা হবে না।</b>
                            </p>

                            {/* মেটাডেটা ব্যাজ */}
                            {photoData?.dataUrl && (
                                <div className="mt-3 p-2.5 rounded-xl bg-success-bg border border-success-border inline-flex flex-wrap items-center gap-3 text-xs font-bengali text-emerald-deep">
                                    <span className="flex items-center gap-1 font-bold text-success">
                                        <CheckCircle2 className="w-4 h-4" />
                                        সাদা ব্যাকগ্রাউন্ড যাচাইকৃত
                                    </span>
                                    <span className="font-mono text-[11px] text-ink-soft">
                                        500×500px ({toBengaliDigits(photoData.sizeKB)} KB)
                                        {photoData.whiteScore ? ` · White: ${photoData.whiteScore}%` : ''}
                                    </span>
                                </div>
                            )}

                            {/* বাটন বার */}
                            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleFileInputChange}
                                    disabled={isSubmitting}
                                    className="hidden"
                                />

                                <Button
                                    variant="emerald"
                                    size="sm"
                                    leftIcon={UploadCloud}
                                    disabled={isSubmitting}
                                    isLoading={photoLoading}
                                    loadingText="লোড হচ্ছে..."
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <span className="font-bengali">
                                        {photoData?.dataUrl ? 'অন্য ছবি নির্বাচন করুন' : 'ছবি নির্বাচন করুন (JPG / PNG)'}
                                    </span>
                                </Button>

                                {photoData?.dataUrl && cropSource && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        leftIcon={Crop}
                                        disabled={isSubmitting}
                                        onClick={() => setIsCropModalOpen(true)}
                                    >
                                        <span className="font-bengali">পুনরায় ক্রপ করুন</span>
                                    </Button>
                                )}

                                {photoData?.dataUrl && allowPhotoRemove && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={Trash2}
                                        disabled={isSubmitting}
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

            {/* ম্যানুয়াল ক্রপ স্টুডিও মডাল */}
            <PhotoCropStudioModal
                isOpen={isCropModalOpen}
                sourceImage={cropSource}
                onClose={() => setIsCropModalOpen(false)}
                onConfirmCrop={(croppedResult) => {
                    onUpdatePhoto(croppedResult);
                    setLocalPhotoError('');
                    setIsCropModalOpen(false);
                }}
            />

            {!photoOnly && (
                <>
                    {/* =================================================================
                        SECTION 2: MANDATORY PORTAL PASSWORD SETUP (6–64 CHARS)
                       ================================================================= */}
                    <section className="p-4 sm:p-5 rounded-2xl bg-paper border border-ink-faint">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-gold-deep" />
                                <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                                    ২. শিক্ষক পোর্টাল পাসওয়ার্ড নির্ধারণ (আবশ্যক)
                                </h3>
                            </div>
                            <Badge variant={isPasswordValid ? 'success' : 'gold'} size="sm" mono>
                                {isPasswordValid ? '6–64 CHARS OK' : 'MIN 6 CHARS REQUIRED'}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-1 items-start">
                            <FormInput
                                labelEng="Portal Password"
                                labelBng="পোর্টাল লগইন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                maxLength={64}
                                variant="erp"
                                leftIcon={Lock}
                                value={formData.password}
                                disabled={isSubmitting}
                                onChange={(e) => onUpdateField('password', e.target.value)}
                                placeholder="কমপক্ষে ৬ অক্ষরের শক্তিশালী পাসওয়ার্ড দিন"
                                required
                                isMonoText
                                showValidIcon
                                isValid={isPasswordValid}
                                error={stepErrors.password || ''}
                                rightElement={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                                        className="p-1 text-ink-muted hover:text-emerald-deep transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                }
                                containerClassName="mb-1"
                            />

                            <div className="p-3 rounded-xl bg-emerald-subtle/60 border border-emerald-border text-xs font-bengali text-ink-soft leading-relaxed sm:mt-5">
                                <Sparkles className="w-3.5 h-3.5 text-gold-deep inline mr-1" />
                                আপনি ভবিষ্যতে আপনার মোবাইল নম্বর এবং এই পাসওয়ার্ড দিয়ে <b>শিক্ষক সেল্ফ-সার্ভিস পোর্টালে</b> লগইন করে নিজের হাজিরা, ছুটির কোটা এবং বেতন স্লিপ দেখতে পারবেন।
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
                                    ৩. আপনার প্রদত্ত সকল তথ্যের চূড়ান্ত খসড়া যাচাই (Review Ledger)
                                </h3>
                            </div>
                            <span className="font-bengali text-xs text-ink-muted">
                                কোনো ভুল থাকলে &quot;সংশোধন&quot; বাটনে ক্লিক করে ঠিক করুন
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* কার্ড ক: ব্যক্তিগত ও পরিচয়পত্র তথ্য (Step 1) */}
                            <div className="p-4 rounded-2xl bg-paper border border-ink-faint">
                                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-ink-faint">
                                    <span className="font-bengali text-xs font-bold text-emerald-deep flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-gold-deep" />
                                        ব্যক্তিগত ও পদবী তথ্য
                                    </span>
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => onJumpToStep(0)}
                                        className="inline-flex items-center gap-1 text-[11px] font-bengali font-semibold text-emerald hover:text-gold-deep disabled:opacity-50"
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
                                        <dt className="font-bengali text-ink-muted">পদবী ও বিষয়:</dt>
                                        <dd className="font-bengali font-semibold text-emerald-deep text-right">
                                            {rankPreview?.designationBng} ({formData.subject || 'General'})
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
                                            {formData.bloodGroup || '—'} · {formData.religion || '—'} ({formData.maritalStatus || '—'})
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
                                            disabled={isSubmitting}
                                            onClick={() => onJumpToStep(1)}
                                            className="inline-flex items-center gap-1 text-[11px] font-bengali font-semibold text-emerald hover:text-gold-deep disabled:opacity-50"
                                        >
                                            <Edit3 className="w-3 h-3" /> পিতা-মাতা
                                        </button>
                                        <span className="text-ink-faint">|</span>
                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => onJumpToStep(2)}
                                            className="inline-flex items-center gap-1 text-[11px] font-bengali font-semibold text-emerald hover:text-gold-deep disabled:opacity-50"
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
                                            {formData.emergencyContact?.contactName} ({formData.emergencyContact?.relationship || 'Guardian'}) —{' '}
                                            <span className="font-mono font-semibold">
                                                {formatPhoneDisplay(formData.emergencyContact?.phone)}
                                            </span>
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <dt className="font-bengali text-ink-muted">বর্তমান ঠিকানা:</dt>
                                        <dd className="font-bengali text-ink text-right">
                                            {formatTeacherAddress(formData.presentAddress)}
                                        </dd>
                                    </div>
                                    {!formData.sameAsPresentAddress && (
                                        <div className="flex justify-between gap-2">
                                            <dt className="font-bengali text-ink-muted">স্থায়ী ঠিকানা:</dt>
                                            <dd className="font-bengali text-ink text-right">
                                                {formatTeacherAddress(formData.permanentAddress)}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        </div>

                        {/* শিক্ষাগত যোগ্যতা ও সিজিপিএ রিভিউ টেবিল */}
                        <div className="mt-4 p-4 rounded-2xl bg-paper border border-ink-faint">
                            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-ink-faint">
                                <span className="font-bengali text-xs font-bold text-emerald-deep flex items-center gap-1.5">
                                    <GraduationCap className="w-4 h-4 text-gold-deep" />
                                    শিক্ষাগত যোগ্যতা ও অটো-সিনিয়রিটি পয়েন্ট ({toBengaliDigits(qualifications.length)}টি সনদ)
                                </span>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => onJumpToStep(1)}
                                    className="inline-flex items-center gap-1 text-[11px] font-bengali font-semibold text-emerald hover:text-gold-deep disabled:opacity-50"
                                >
                                    <Edit3 className="w-3 h-3" /> ডিগ্রি সংশোধন
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-ink-faint text-ink-muted font-bengali">
                                            <th className="py-1.5 pr-3">ডিগ্রির স্তর</th>
                                            <th className="py-1.5 px-3">পরীক্ষার নাম ও বিষয়</th>
                                            <th className="py-1.5 px-3">বোর্ড / বিশ্ববিদ্যালয়</th>
                                            <th className="py-1.5 px-3 text-center">পাসের সন</th>
                                            <th className="py-1.5 pl-3 text-right">ফলাফল</th>
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
                                                        {(q.rollNumber || q.registrationNumber || q.courseDuration) && (
                                                            <span className="mt-0.5 block text-[10px] text-ink-muted">
                                                                {[
                                                                    q.rollNumber && `রোল: ${q.rollNumber}`,
                                                                    q.registrationNumber && `রেজি: ${q.registrationNumber}`,
                                                                    q.courseDuration && `মেয়াদ: ${q.courseDuration} বছর`
                                                                ].filter(Boolean).join(' · ')}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-3 text-ink-soft">{q.boardOrUniversity}</td>
                                                    <td className="py-2 px-3 text-center font-mono">{q.passingYear}</td>
                                                    <td className="py-2 pl-3 text-right font-mono font-bold text-emerald">
                                                        {formatAcademicResult(q)}
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
                        <label
                            className={cn(
                                'flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl border-1.5 transition-all cursor-pointer select-none',
                                formData.attestConfirmed
                                    ? 'bg-emerald-subtle border-emerald shadow-xs'
                                    : stepErrors.attestConfirmed
                                        ? 'bg-danger-bg/50 border-danger animate-shake'
                                        : 'bg-paper border-ink-faint hover:border-gold',
                                isSubmitting && 'opacity-70 pointer-events-none'
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={Boolean(formData.attestConfirmed)}
                                disabled={isSubmitting}
                                onChange={(e) => onUpdateField('attestConfirmed', e.target.checked)}
                                className="mt-1 w-4.5 h-4.5 accent-emerald rounded cursor-pointer shrink-0"
                            />
                            <div className="text-xs sm:text-[13px] font-bengali leading-relaxed text-ink">
                                <span className="font-bold text-emerald-deep block mb-0.5">
                                    অফিশিয়াল প্রত্যয়ন ও অঙ্গীকারনামা (Official Attestation):
                                </span>
                                আমি সজ্ঞানে প্রত্যয়ন করছি যে, আবদুর রাজ্জাক দাখিল মাদ্রাসার শিক্ষক/কর্মচারী নিবন্ধন খাতায় আমার প্রদত্ত সকল ব্যক্তিগত তথ্য, জাতীয় পরিচয়পত্র/জন্ম নিবন্ধন নম্বর এবং শিক্ষাগত সনদের জিপিএ/সিজিপিএ সম্পূর্ণ সত্য ও নির্ভুল। ভবিষ্যতে কোনো তথ্য ত্রুটিপূর্ণ প্রমাণিত হলে কর্তৃপক্ষ যেকোনো প্রশাসনিক ব্যবস্থা গ্রহণ করতে পারবে।
                            </div>
                        </label>

                        {stepErrors.attestConfirmed && (
                            <p className="mt-1.5 text-xs text-danger font-bengali font-medium flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{stepErrors.attestConfirmed}</span>
                            </p>
                        )}

                        {/* সাবমিশন চলাকালীন লাইভ ক্লাউডিনারি ও ডাটাবেস প্রোগ্রেস বার */}
                        {isSubmitting && (
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
                </>
            )}
        </div>
    );
}
