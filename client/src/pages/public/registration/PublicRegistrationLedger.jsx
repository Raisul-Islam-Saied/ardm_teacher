/**
 * ARDM Enterprise ERP — Public Teacher Registration Master Ledger Shell (Completed in Step 10)
 * Complete Part 2 Integration:
 * - 4-Step Military-Validated Registration Ledger
 * - Returning User Saved Digital ID Card Recovery (localStorage)
 * - Manual UID Lookup Modal (/teachers/public/registry-card/:uid)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    RotateCcw,
    ShieldCheck,
    CreditCard,
    Send,
    Search,
    Sparkles
} from 'lucide-react';
import { INSTITUTION_INFO, STORAGE_KEYS } from '@constants/app.constants';
import { Button, Badge, Modal, FormInput, ConfirmDialog } from '@components/ui';
import { useToast } from '@context/ToastContext';
import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';
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
import DigitalRegistryIdCard from './DigitalRegistryIdCard';

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

    const [submittingState, setSubmittingState] = useState({
        isSubmitting: false,
        stageText: '',
        uploadPercent: 0
    });

    // ডিজিটাল আইডি কার্ড ভিউ ও UID রিকভারি স্টেট
    const [submittedRegistryRecord, setSubmittedRegistryRecord] = useState(null);
    const [isRefreshingCard, setIsRefreshingCard] = useState(false);
    const [isUidModalOpen, setIsUidModalOpen] = useState(false);
    const [lookupUidInput, setLookupUidInput] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);

    const [serverMetadata, setServerMetadata] = useState({
        loaded: false,
        nextSuggestedBiometricDeviceId: null
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
                    nextSuggestedBiometricDeviceId: payload.nextSuggestedBiometricDeviceId || null
                });
            })
            .catch((error) => {
                if (!isMounted) return;
                setServerMetadata({ loaded: true, nextSuggestedBiometricDeviceId: null });
                toast.error(extractApiErrorMessage(error, 'নিবন্ধন তথ্য সার্ভার থেকে লোড করা যায়নি।'));
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // ব্যাকএন্ড থেকে UID দিয়ে লাইভ রেজিস্ট্রি কার্ড লোড করার ফাংশন
    const fetchRegistryCardByUid = async (targetUid) => {
        const cleanUid = String(targetUid || '').trim();
        if (!cleanUid) {
            toast.error('অনুগ্রহ করে সঠিক রেজিস্ট্রি UID প্রদান করুন।');
            return;
        }

        setLookupLoading(true);
        setIsRefreshingCard(true);
        try {
            const res = await axiosClient.get(`/teachers/public/registry-card/${cleanUid}`);
            const teacherDoc = res.data?.data;
            if (teacherDoc) {
                const recordObj = {
                    uid: teacherDoc.uid || cleanUid,
                    teacherId: teacherDoc.teacherCode,
                    registrationStatus: teacherDoc.registrationStatus,
                    photoUrl: teacherDoc.profilePicture?.url || '',
                    registeredAt: teacherDoc.createdAt,
                    teacher: teacherDoc
                };
                setSubmittedRegistryRecord(recordObj);
                setIsUidModalOpen(false);
                toast.success('ডিজিটাল রেজিস্ট্রি কার্ড সফলভাবে লোড হয়েছে!');
            }
        } catch (err) {
            toast.error(err.message || 'এই UID দিয়ে কোনো নিবন্ধিত কার্ড পাওয়া যায়নি।');
        } finally {
            setLookupLoading(false);
            setIsRefreshingCard(false);
        }
    };

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

    const idPreview = serverMetadata.nextSuggestedBiometricDeviceId && formData.dateOfBirth
        ? previewTenDigitTeacherId(
            formData.joiningDate,
            formData.dateOfBirth,
            formData.designation,
            String(serverMetadata.nextSuggestedBiometricDeviceId).padStart(2, '0')
        )
        : null;

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

    const handleFinalSubmit = async () => {
        if (!serverMetadata.loaded || !serverMetadata.nextSuggestedBiometricDeviceId || !idPreview) {
            toast.error('শিক্ষক আইডি তৈরির জন্য সার্ভারের নিবন্ধন তথ্য প্রয়োজন। পরে আবার চেষ্টা করুন।');
            return;
        }
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
            toast.error(Object.values(c4.errors)[0]);
            return;
        }

        setStepErrors({});
        setSubmittingState({
            isSubmitting: true,
            stageText: '১/২ · আপনার ৫০০×৫০০ বর্গাকার ছবি ক্লাউডিনারিতে আপলোড হচ্ছে...',
            uploadPercent: 10
        });

        try {
            let uploadedPhotoUrl = photoData.uploadedUrl || '';
            let uploadedPublicId = photoData.uploadedPublicId || '';

            if (!uploadedPhotoUrl) {
                const cloudRes = await uploadSquarePhotoToCloudinary(photoData.blob, {
                    publicId: `teacher_${idPreview.fullId}_${Date.now()}`,
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

            setSubmittingState({
                isSubmitting: true,
                stageText: '২/২ · মাদ্রাসার মূল ডাটাবেসে নিবন্ধন ও র‍্যাংকিং সংরক্ষিত হচ্ছে...',
                uploadPercent: 88
            });

            const cleanNid = extractPureDigits(formData.nidNumber);
            const cleanBirthReg = extractPureDigits(formData.birthRegNumber);

            const payload = {
                teacherCode: String(idPreview?.fullId || '').replace(/\D/g, '').slice(0, 10),
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

            const registryTokenObj = {
                uid: resultData.uid,
                teacherId: resultData.teacherId || resultData.teacher?.teacherCode || idPreview.fullId,
                editToken: resultData.editToken,
                fullNameBng: formData.fullNameBng,
                fullNameEng: formData.fullNameEng,
                designation: formData.designation,
                designationBng: rankPreview.designationBng,
                photoUrl: uploadedPhotoUrl,
                registeredAt: new Date().toISOString(),
                teacher: resultData.teacher || payload
            };

            try {
                localStorage.setItem(
                    STORAGE_KEYS.PUBLIC_REGISTRY,
                    JSON.stringify(registryTokenObj)
                );
            } catch (e) {
                // Ignore
            }

            clearRegistrationDraft();
            setSubmittingState({ isSubmitting: false, stageText: '', uploadPercent: 100 });
            setSubmittedRegistryRecord(registryTokenObj);
            setExistingRegistryToken(registryTokenObj);

            toast.success('আলহামদুলিল্লাহ! আপনার নিবন্ধন ও ডিজিটাল আইডি কার্ড তৈরি হয়েছে।');
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

                {/* ১. মাদ্রাসা ক্রেস্ট, হেডার ও কুইক অ্যাকশন বার */}
                <header className="text-center mb-7 sm:mb-8 animate-fade-down no-print">
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

                    {/* পূর্বে নিবন্ধিত কার্ড খোঁজার কুইক বার */}
                    <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsUidModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-paper-panel border border-ink-faint hover:border-gold text-xs font-bengali font-medium text-emerald-deep shadow-2xs transition-all"
                        >
                            <Search className="w-3.5 h-3.5 text-gold-deep" />
                            পূর্বে নিবন্ধিত? UID দিয়ে আইডি কার্ড খুঁজুন
                        </button>

                    </div>
                </header>

                {/* ২. ব্রাউজারে সংরক্ষিত কার্ড ব্যানার */}
                {existingRegistryToken && !submittedRegistryRecord && (
                    <div className="mb-6 p-4 rounded-2xl bg-emerald-subtle border border-emerald/25 flex flex-wrap items-center justify-between gap-4 animate-fade-up no-print">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald text-gold-soft flex items-center justify-center shrink-0">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                                    স্বাগতম, {existingRegistryToken.fullNameBng || 'সম্মানিত শিক্ষক'}! আপনার ডিজিটাল আইডি কার্ড সংরক্ষিত আছে
                                </h3>
                                <p className="font-mono text-xs text-ink-soft">
                                    10-Digit ID: <b className="text-emerald-deep">{existingRegistryToken.teacherId}</b>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="emerald"
                                size="xs"
                                onClick={() => setSubmittedRegistryRecord(existingRegistryToken)}
                            >
                                <span className="font-bengali">ডিজিটাল আইডি কার্ড ওপেন করুন</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setExistingRegistryToken(null)}
                            >
                                <span className="font-bengali">লুকান</span>
                            </Button>
                        </div>
                    </div>
                )}

                {/* ৩. যদি রেজিস্ট্রেশন সম্পন্ন হয় বা কার্ড ওপেন করা হয় তবে DigitalRegistryIdCard দেখাবে */}
                {submittedRegistryRecord ? (
                    <DigitalRegistryIdCard
                        registryRecord={submittedRegistryRecord}
                        isRefreshing={isRefreshingCard}
                        onRefreshFromServer={() => fetchRegistryCardByUid(submittedRegistryRecord.uid)}
                        onStartNewRegistration={() => setSubmittedRegistryRecord(null)}
                    />
                ) : (
                    /* ৪. মেইন ৪-ধাপের রেজিস্ট্রেশন লেজার কার্ড */
                    <main ref={ledgerTopRef} className="ledger-surface animate-fade-up">
                        <div className="grid grid-cols-1 md:grid-cols-[265px_1fr] min-h-[620px]">

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

                            <div className="p-5 sm:p-8 lg:p-9 flex flex-col justify-between bg-paper-panel">
                                <div>
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

                                    {currentStep === 0 && (
                                        <Step1PersonalIdentity
                                            formData={formData}
                                            onUpdateField={handleUpdateField}
                                            touchedFields={touchedFields}
                                            onBlurField={handleBlurField}
                                            stepErrors={stepErrors}
                                        />
                                    )}

                                    {currentStep === 1 && (
                                        <Step2ParentsAcademic
                                            formData={formData}
                                            onUpdateField={handleUpdateField}
                                            touchedFields={touchedFields}
                                            onBlurField={handleBlurField}
                                            stepErrors={stepErrors}
                                        />
                                    )}

                                    {currentStep === 2 && (
                                        <Step3AddressContact
                                            formData={formData}
                                            onUpdateField={handleUpdateField}
                                            touchedFields={touchedFields}
                                            onBlurField={handleBlurField}
                                            stepErrors={stepErrors}
                                        />
                                    )}

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
                )}

                <footer className="text-center mt-6 no-print">
                    <p className="font-bengali text-xs text-ink-soft opacity-80">
                        {INSTITUTION_INFO.developerCreditBng}
                    </p>
                </footer>

                {/* UID দিয়ে রেজিস্ট্রি কার্ড পুনরুদ্ধার মডাল */}
                <Modal
                    isOpen={isUidModalOpen}
                    onClose={() => setIsUidModalOpen(false)}
                    size="sm"
                    titleEng="Registry Card Recovery"
                    titleBng="UID দিয়ে ডিজিটাল আইডি কার্ড খুঁজুন"
                    subtitleBng="নিবন্ধনের সময় প্রাপ্ত রেজিস্ট্রি UID কোডটি নিচে প্রদান করুন"
                    footer={
                        <>
                            <Button variant="ghost" size="sm" onClick={() => setIsUidModalOpen(false)}>
                                <span className="font-bengali">বন্ধ করুন</span>
                            </Button>
                            <Button
                                variant="emerald"
                                size="sm"
                                isLoading={lookupLoading}
                                onClick={() => fetchRegistryCardByUid(lookupUidInput)}
                            >
                                <span className="font-bengali">কার্ড লোড করুন</span>
                            </Button>
                        </>
                    }
                >
                    <FormInput
                        labelEng="Verification UID"
                        labelBng="রেজিস্ট্রি ইউআইডি (UID)"
                        variant="erp"
                        value={lookupUidInput}
                        onChange={(e) => setLookupUidInput(e.target.value)}
                        placeholder="e.g. 550e8400-e29b-41d4-a716..."
                        isMonoText
                        required
                        hint="আপনার পূর্বে ডাউনলোড করা সনদে এই UID নম্বরটি উল্লেখ রয়েছে।"
                    />
                </Modal>

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
}
