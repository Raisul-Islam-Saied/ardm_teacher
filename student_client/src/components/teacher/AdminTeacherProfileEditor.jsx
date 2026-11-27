import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';
import { Button, FormInput, FormSelect } from '@components/ui';
import { createInitialRegistrationData } from '@pages/public/registration/registration.schema';
import Step1PersonalIdentity, { validateStep1PersonalData } from '@pages/public/registration/Step1PersonalIdentity';
import Step2ParentsAcademic, { validateStep2ParentsAcademicData } from '@pages/public/registration/Step2ParentsAcademic';
import Step3AddressContact, { validateStep3AddressContactData } from '@pages/public/registration/Step3AddressContact';
import Step4PhotoReview from '@pages/public/registration/Step4PhotoReview';
import { extractPureDigits, toEnglishDigits } from '@utils/formatters';
import { ArrowLeft, ArrowRight, Briefcase, Camera, GraduationCap, MapPin, Save, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import './teacher-profile-editor.css';

const ADDRESS_FIELDS = [
    'houseNameBn', 'houseNameEn', 'villageBn', 'villageEn', 'unionBn', 'unionEn', 'wardNo',
    'upazilaBn', 'upazilaEn', 'districtBn', 'districtEn', 'divisionBn', 'divisionEn',
    'houseOrRoad', 'village', 'postOffice', 'postCode', 'upazila', 'district'
];

const EDIT_STEPS = [
    {
        title: 'ব্যক্তিগত ও পরিচয়পত্র',
        eyebrow: 'PERSONAL IDENTITY',
        description: 'নাম, পরিচয়পত্র, জন্ম ও যোগদানের তথ্য হালনাগাদ করুন।',
        icon: UserRound,
        component: Step1PersonalIdentity,
        validate: validateStep1PersonalData
    },
    {
        title: 'পিতা-মাতা ও শিক্ষাগত যোগ্যতা',
        eyebrow: 'FAMILY & QUALIFICATIONS',
        description: 'পরিবারের তথ্য এবং শিক্ষাগত যোগ্যতার রেকর্ড সম্পাদনা করুন।',
        icon: GraduationCap,
        component: Step2ParentsAcademic,
        validate: validateStep2ParentsAcademicData
    },
    {
        title: 'ঠিকানা ও যোগাযোগ',
        eyebrow: 'ADDRESS & CONTACT',
        description: 'বর্তমান ও স্থায়ী ঠিকানা, ফোন এবং জরুরি যোগাযোগ যাচাই করুন।',
        icon: MapPin,
        component: Step3AddressContact,
        validate: validateStep3AddressContactData
    },
    {
        title: 'প্রোফাইল ছবি',
        eyebrow: 'PROFILE PHOTOGRAPH',
        description: 'শিক্ষকের পরিচিতি ছবিটি পর্যালোচনা বা পরিবর্তন করুন।',
        icon: Camera,
        component: Step4PhotoReview
    },
    {
        title: 'চাকরি, বেতন ও অ্যাকাউন্ট কন্ট্রোল',
        eyebrow: 'EMPLOYMENT & ACCESS',
        description: 'চাকরি, বেতন, ব্যাংক, শ্রেণি-দায়িত্ব ও অ্যাকাউন্ট নিয়ন্ত্রণ করুন।',
        icon: Briefcase
    }
];

const CLASS_OPTIONS = [
    { value: '', label: 'কোনো শ্রেণির ক্লাস টিচার নন (সাধারণ শিক্ষক / স্টাফ)' },
    ...['প্লে', 'নার্সারি', 'কেজি', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম']
        .map((label) => ({ value: normalizeAssignedClass(label), label }))
];

function normalizeEnglishName(val = '') {
    const clean = String(val || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    return clean
        .toLowerCase()
        .replace(/(^|[\s.'-])([a-z])/g, (_, sep, char) => sep + char.toUpperCase());
}

function normalizeAssignedClass(val = '') {
    return String(val || '').replace(/\u09AF\u09BC/g, '\u09DF');
}

function toServerAssignedClass(val = '') {
    return normalizeAssignedClass(val).replace(/\u09DF/g, '\u09AF\u09BC');
}

function dateInputValue(value) {
    if (!value) return '';
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function mapAddress(address = {}) {
    const mapped = Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, address[field] ?? '']));
    mapped.houseNameBn = mapped.houseNameBn || address.houseOrRoad || '';
    mapped.villageBn = mapped.villageBn || address.village || '';
    mapped.upazilaBn = mapped.upazilaBn || address.upazila || '';
    mapped.districtBn = mapped.districtBn || address.district || '';
    return mapped;
}

function addressesMatch(first, second) {
    return ADDRESS_FIELDS.every((field) => String(first[field] ?? '') === String(second[field] ?? ''));
}

function mapTeacherToForm(teacher) {
    const initial = createInitialRegistrationData();
    const presentAddress = mapAddress(teacher.presentAddress);
    const permanentAddress = mapAddress(teacher.permanentAddress);
    const nidNumber = teacher.nidNumber || '';
    const birthRegNumber = teacher.birthRegNumber || '';

    return {
        ...initial,
        fullNameEng: teacher.fullNameEng || '',
        fullNameBng: teacher.fullNameBng || '',
        designation: teacher.designation || '',
        subject: teacher.subject || '',
        gender: teacher.gender || '',
        religion: teacher.religion || '',
        bloodGroup: teacher.bloodGroup || '',
        maritalStatus: teacher.maritalStatus || '',
        identityType: nidNumber && birthRegNumber ? 'BOTH' : birthRegNumber ? 'BIRTH_REG' : 'NID',
        nidNumber,
        birthRegNumber,
        dateOfBirth: dateInputValue(teacher.dateOfBirth),
        joiningDate: dateInputValue(teacher.joiningDate),
        indexNumber: teacher.indexNumber || '',
        fathersNameEng: teacher.fathersNameEng || '',
        fathersNameBng: teacher.fathersNameBng || '',
        mothersNameEng: teacher.mothersNameEng || '',
        mothersNameBng: teacher.mothersNameBng || '',
        academicQualifications: (teacher.academicQualifications || []).map((qualification, index) => ({
            ...qualification,
            id: `saved-${index}`,
            passingYear: String(qualification.passingYear || ''),
            gpaOrCgpa: qualification.gpaOrCgpa == null ? '' : String(qualification.gpaOrCgpa),
            resultType: qualification.resultType || (qualification.gpaOrCgpa ? 'GPA' : qualification.resultGrade ? 'Division' : 'Passed'),
            scale: String(qualification.scale || 5)
        })),
        phone: teacher.phone || '',
        email: teacher.email || '',
        emergencyContact: {
            ...initial.emergencyContact,
            ...(teacher.emergencyContact || {}),
            relationship: teacher.emergencyContact?.relationship || initial.emergencyContact.relationship
        },
        presentAddress,
        permanentAddress,
        sameAsPresentAddress: addressesMatch(presentAddress, permanentAddress)
    };
}

function mapAdminFields(teacher) {
    const assignedClass = normalizeAssignedClass(teacher.assignedClass);
    return {
        employmentType: teacher.employmentType || 'Non-MPO',
        resignationDate: dateInputValue(teacher.resignationDate),
        rejoiningDate: teacher.isActive === false ? dateInputValue(new Date()) : '',
        basicSalary: String(teacher.basicSalary ?? 0),
        biometricDeviceId: String(teacher.biometricDeviceId ?? 1),
        customLeaveQuota: String(teacher.customLeaveQuota ?? 2),
        bankDetails: {
            bankName: '',
            branchName: '',
            accountHolderName: '',
            accountNumber: '',
            routingNumber: '',
            ...(teacher.bankDetails || {})
        },
        assignedClass,
        canEditAssignedClass: Boolean(assignedClass && teacher.canEditAssignedClass),
        role: teacher.role || 'Teacher',
        registrationStatus: teacher.registrationStatus || 'Approved',
        isActive: teacher.isActive !== false
    };
}

function getLastEmploymentEndDate(teacher) {
    const history = teacher.employmentHistory || [];
    for (let index = history.length - 1; index >= 0; index -= 1) {
        if (history[index].endDate) return dateInputValue(history[index].endDate);
    }
    return dateInputValue(teacher.resignationDate);
}

function prepareAddress(address = {}) {
    const payload = Object.fromEntries(ADDRESS_FIELDS.map((field) => [
        field,
        String(address[field] || '').trim()
    ]));

    payload.wardNo = extractPureDigits(payload.wardNo).slice(0, 3);
    payload.postCode = extractPureDigits(payload.postCode).slice(0, 4);

    // নতুন আপডেট করা নামকে অগ্রাধিকার দেওয়া
    payload.houseOrRoad = payload.houseNameBn || payload.houseNameEn || payload.houseOrRoad;
    payload.village = payload.villageBn || payload.villageEn || payload.village;
    payload.upazila = payload.upazilaEn || payload.upazilaBn || payload.upazila;
    payload.district = payload.districtEn || payload.districtBn || payload.district;
    return payload;
}

function prepareQualifications(qualifications = []) {
    return qualifications.map((qualification) => {
        const fields = Object.fromEntries(
            Object.entries(qualification).filter(([key]) => !['id', '_id', '__v'].includes(key))
        );
        const resultType = fields.resultType || 'GPA';
        const isNumeric = ['GPA', 'CGPA'].includes(resultType);
        const isGrade = ['Division', 'Class'].includes(resultType);

        return {
            ...fields,
            examTitle: String(fields.examTitle || '').trim(),
            majorOrGroup: String(fields.majorOrGroup || '').trim(),
            boardOrUniversity: String(fields.boardOrUniversity || '').trim(),
            rollNumber: String(fields.rollNumber || '').trim(),
            registrationNumber: String(fields.registrationNumber || '').trim(),
            passingYear: Number(toEnglishDigits(String(fields.passingYear || ''))),
            resultType,
            resultGrade: isGrade ? (fields.resultGrade || undefined) : undefined,
            gpaOrCgpa: isNumeric && fields.gpaOrCgpa !== '' && fields.gpaOrCgpa != null
                ? Number(toEnglishDigits(String(fields.gpaOrCgpa)))
                : undefined,
            scale: Number(fields.scale) === 4 ? 4 : 5
        };
    });
}

function extractFirstError(errors = {}) {
    for (const value of Object.values(errors)) {
        if (typeof value === 'string' && value.trim()) return value;
    }
    return 'অনুগ্রহ করে চিহ্নিত ঘরগুলো সঠিকভাবে পূরণ করুন।';
}

export function TeacherProfileEditorForm({
    teacher,
    onClose,
    onUpdated,
    toast,
    isSuperAdmin = false,
    apiClient = axiosClient
}) {
    const [formData, setFormData] = useState(() => mapTeacherToForm(teacher));
    const [adminFields, setAdminFields] = useState(() => mapAdminFields(teacher));
    const [photoData, setPhotoData] = useState(() => teacher.profilePicture?.url ? {
        dataUrl: teacher.profilePicture.url,
        uploadedUrl: teacher.profilePicture.url,
        uploadedPublicId: teacher.profilePicture.publicId || ''
    } : null);
    const [activeStep, setActiveStep] = useState(0);
    const [stepErrors, setStepErrors] = useState({});
    const [touchedFields, setTouchedFields] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(mapTeacherToForm(teacher));
        setAdminFields(mapAdminFields(teacher));
        setPhotoData(teacher.profilePicture?.url ? {
            dataUrl: teacher.profilePicture.url,
            uploadedUrl: teacher.profilePicture.url,
            uploadedPublicId: teacher.profilePicture.publicId || ''
        } : null);
        setActiveStep(0);
        setStepErrors({});
    }, [teacher]);

    const isReturningTeacher = teacher.isActive === false
        && !['Pending', 'Rejected'].includes(teacher.registrationStatus);
    const isTargetSuperAdmin = teacher.role === 'SuperAdmin';

    const idPreview = useMemo(() => ({ fullId: teacher.teacherCode || '' }), [teacher.teacherCode]);

    const updateFormField = (field, value) => {
        setFormData((current) => ({ ...current, [field]: value }));
        setStepErrors((current) => ({ ...current, [field]: undefined }));
    };

    const updateAdminField = (field, value) => {
        setAdminFields((current) => ({ ...current, [field]: value }));
        setStepErrors((current) => ({ ...current, [field]: undefined }));
    };

    const validateActiveStep = () => {
        const validator = EDIT_STEPS[activeStep].validate;
        if (!validator) return true;
        const result = validator(formData);
        setStepErrors(result.errors);
        if (!result.valid) {
            toast.error(extractFirstError(result.errors));
        }
        return result.valid;
    };

    const handleJumpToStep = (targetStep) => {
        if (isSaving) return;

        if (targetStep < activeStep) {
            setActiveStep(targetStep);
            setStepErrors({});
            return;
        }

        if (targetStep > activeStep) {
            for (let stepIndex = 0; stepIndex < targetStep; stepIndex += 1) {
                const validator = EDIT_STEPS[stepIndex].validate;
                if (!validator) continue;

                const result = validator(formData);
                if (!result.valid) {
                    setActiveStep(stepIndex);
                    setStepErrors(result.errors);
                    toast.error(`ধাপ ${stepIndex + 1}: ${extractFirstError(result.errors)}`);
                    return;
                }
            }
        }

        setActiveStep(targetStep);
        setStepErrors({});
    };

    const handleNext = () => {
        if (validateActiveStep()) {
            setStepErrors({});
            setActiveStep((current) => Math.min(current + 1, EDIT_STEPS.length - 1));
        }
    };

    const handleSave = async () => {
        if (isSaving) return;

        // সেভ করার আগে ধাপ ১, ২ এবং ৩ পুনরায় যাচাই
        for (let stepIdx = 0; stepIdx <= 2; stepIdx += 1) {
            const check = EDIT_STEPS[stepIdx].validate(formData);
            if (!check.valid) {
                setStepErrors(check.errors);
                setActiveStep(stepIdx);
                toast.error(`ধাপ ${stepIdx + 1}: ${extractFirstError(check.errors)}`);
                return;
            }
        }

        const basicSalary = Number(toEnglishDigits(String(adminFields.basicSalary || '')));
        const biometricDeviceId = Number(extractPureDigits(String(adminFields.biometricDeviceId || '')));
        const customLeaveQuota = Number(toEnglishDigits(String(adminFields.customLeaveQuota || '')));

        if (!Number.isFinite(basicSalary) || basicSalary < 0) {
            setStepErrors({ basicSalary: 'মূল বেতন ০ বা তার বেশি হতে হবে।' });
            return;
        }
        if (!Number.isInteger(biometricDeviceId) || biometricDeviceId < 1) {
            setStepErrors({ biometricDeviceId: 'বায়োমেট্রিক আইডি ১ বা তার বেশি পূর্ণসংখ্যা হতে হবে।' });
            return;
        }
        if (!Number.isFinite(customLeaveQuota) || customLeaveQuota < 0 || customLeaveQuota > 15) {
            setStepErrors({ customLeaveQuota: 'ছুটির কোটা ০ থেকে ১৫ এর মধ্যে হতে হবে।' });
            return;
        }
        if (isReturningTeacher && adminFields.isActive) {
            const rejoiningDate = adminFields.rejoiningDate;
            const previousEndDate = getLastEmploymentEndDate(teacher);
            if (!rejoiningDate || (previousEndDate && rejoiningDate <= previousEndDate)) {
                setStepErrors({
                    rejoiningDate: 'পুনরায় যোগদানের তারিখ আগের চাকরির শেষ তারিখের পরের দিন বা তার পরে দিন।'
                });
                return;
            }
        }

        const permanentAddress = formData.sameAsPresentAddress
            ? formData.presentAddress
            : formData.permanentAddress;

        const payload = {
            fullNameEng: normalizeEnglishName(formData.fullNameEng),
            fullNameBng: formData.fullNameBng.trim(),
            designation: formData.designation,
            subject: formData.subject ? formData.subject.trim() : 'General',
            gender: formData.gender || undefined,
            religion: formData.religion || undefined,
            bloodGroup: formData.bloodGroup || undefined,
            maritalStatus: formData.maritalStatus || undefined,
            nidNumber: extractPureDigits(formData.nidNumber) || '',
            birthRegNumber: extractPureDigits(formData.birthRegNumber) || '',
            dateOfBirth: formData.dateOfBirth,
            joiningDate: isReturningTeacher && adminFields.isActive
                ? adminFields.rejoiningDate
                : formData.joiningDate,
            indexNumber: formData.indexNumber ? formData.indexNumber.trim() : '',
            fathersNameEng: normalizeEnglishName(formData.fathersNameEng),
            fathersNameBng: formData.fathersNameBng.trim(),
            mothersNameEng: normalizeEnglishName(formData.mothersNameEng),
            mothersNameBng: formData.mothersNameBng.trim(),
            phone: extractPureDigits(formData.phone),
            email: formData.email ? formData.email.trim().toLowerCase() : '',
            emergencyContact: {
                contactName: formData.emergencyContact.contactName.trim(),
                relationship: formData.emergencyContact.relationship || 'Guardian',
                phone: extractPureDigits(formData.emergencyContact.phone)
            },
            presentAddress: prepareAddress(formData.presentAddress),
            permanentAddress: prepareAddress(permanentAddress),
            academicQualifications: prepareQualifications(formData.academicQualifications),
            employmentType: adminFields.employmentType,
            resignationDate: adminFields.resignationDate || null,
            basicSalary,
            biometricDeviceId,
            customLeaveQuota,
            bankDetails: Object.fromEntries(
                Object.entries(adminFields.bankDetails || {}).map(([k, v]) => [k, String(v || '').trim()])
            ),
            assignedClass: toServerAssignedClass(adminFields.assignedClass),
            canEditAssignedClass: Boolean(adminFields.assignedClass && adminFields.canEditAssignedClass),
            role: adminFields.role,
            registrationStatus: adminFields.registrationStatus,
            isActive: adminFields.isActive
        };

        setIsSaving(true);
        try {
            const response = await apiClient.patch(`/teachers/${teacher._id}`, payload);
            const responseTeacher = response.data?.data?.teacher || response.data?.data;
            let updatedTeacher = {
                ...teacher,
                ...(responseTeacher && typeof responseTeacher === 'object' ? responseTeacher : {}),
                assignedClass: normalizeAssignedClass(payload.assignedClass),
                canEditAssignedClass: Boolean(payload.assignedClass && payload.canEditAssignedClass)
            };
            onUpdated(updatedTeacher);

            if (photoData?.blob) {
                try {
                    const uploadData = new FormData();
                    uploadData.append('file', photoData.file || photoData.blob, 'teacher_photo_500x500.jpg');
                    const photoResponse = await apiClient.patch(
                        `/upload/profile-picture/${teacher._id}`,
                        uploadData,
                        { headers: { 'Content-Type': 'multipart/form-data' } }
                    );
                    const profilePicture = photoResponse.data?.data?.profilePicture;
                    if (!profilePicture) {
                        throw new Error('সার্ভার থেকে ছবির তথ্য পাওয়া যায়নি।');
                    }
                    updatedTeacher = { ...updatedTeacher, profilePicture };
                    onUpdated(updatedTeacher);
                } catch (photoError) {
                    toast.error(`প্রোফাইলের তথ্য সংরক্ষিত হয়েছে, কিন্তু ছবি আপলোড হয়নি: ${extractApiErrorMessage(photoError, 'ছবি আপলোড ব্যর্থ হয়েছে।')}`);
                    return;
                }
            }

            toast.success('শিক্ষকের সম্পূর্ণ প্রোফাইল আপডেট হয়েছে।');
            onClose();
        } catch (error) {
            if (error.fieldErrors && Object.keys(error.fieldErrors).length > 0) {
                setStepErrors(error.fieldErrors);
            }
            toast.error(extractApiErrorMessage(error, 'প্রোফাইল আপডেট করা যায়নি।'));
        } finally {
            setIsSaving(false);
        }
    };

    const activeStepDetails = EDIT_STEPS[activeStep];
    const ActiveStepComponent = activeStepDetails.component;
    const ActiveStepIcon = activeStepDetails.icon;
    const progressPercent = Math.round(((activeStep + 1) / EDIT_STEPS.length) * 100);

    return (
        <section className="teacher-profile-editor space-y-5">
            <header className="relative overflow-hidden rounded-[26px] bg-[#060D1F] px-5 py-5 text-white shadow-xl sm:px-7 sm:py-6">
                <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#D4A843]/15 blur-3xl" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#F7E09A]/80 to-transparent" />
                <div className="relative flex flex-wrap items-start justify-between gap-5">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#F7E09A]/40 bg-white/10 shadow-lg">
                            {teacher.profilePicture?.url ? (
                                <img src={teacher.profilePicture.url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <UserRound className="h-7 w-7 text-[#F7E09A]" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.24em] text-[#F7E09A] sm:text-[10px]">
                                Teacher profile · Secure update
                            </p>
                            <h2 className="font-bengali text-xl font-black tracking-tight sm:text-2xl">
                                শিক্ষকের সম্পূর্ণ তথ্য হালনাগাদ
                            </h2>
                            <p className="mt-1 max-w-2xl font-bengali text-xs leading-5 text-slate-300 sm:text-sm">
                                ব্যক্তিগত পরিচয় থেকে চাকরি ও অ্যাকাউন্ট—প্রতিটি তথ্য ধাপে ধাপে যাচাই করে সংরক্ষণ করুন।
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={onClose}
                        aria-label="এডিট বন্ধ করুন"
                        title="এডিট বন্ধ করুন"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition hover:border-[#F7E09A]/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="relative mt-5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-white">
                        TEACHER ID · {teacher.teacherCode || 'N/A'}
                    </span>
                    <span className="rounded-full border border-[#F7E09A]/25 bg-[#F7E09A]/10 px-3 py-1.5 font-bengali text-[10px] font-bold text-[#F7E09A]">
                        {teacher.designationBng || teacher.designation || 'শিক্ষক'}
                    </span>
                    {teacher.assignedClass && (
                        <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 font-bengali text-[10px] font-bold text-emerald-100">
                            শ্রেণি শিক্ষক · {normalizeAssignedClass(teacher.assignedClass)}
                        </span>
                    )}
                    <span className="ml-auto font-bengali text-[11px] font-bold text-slate-300">
                        ধাপ {activeStep + 1} / {EDIT_STEPS.length}
                    </span>
                </div>
                <div
                    className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-label="তথ্য সম্পাদনার অগ্রগতি"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPercent}
                >
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#D4A843] via-[#F7E09A] to-[#D4A843] transition-[width] duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </header>

            <section className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_14px_40px_-28px_rgba(6,13,31,0.42)]">
                <div className="border-b border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                    <div className="grid grid-cols-5 gap-1.5">
                        {EDIT_STEPS.map((step, index) => {
                            const isActive = index === activeStep;
                            const isComplete = index < activeStep;
                            return (
                                <button
                                    key={step.title}
                                    type="button"
                                    aria-current={isActive ? 'step' : undefined}
                                    aria-label={`ধাপ ${index + 1}: ${step.title}`}
                                    title={step.title}
                                    disabled={isSaving}
                                    onClick={() => handleJumpToStep(index)}
                                    className="group flex min-w-0 flex-col items-center gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <span className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                                        isActive
                                            ? 'bg-[#D4A843] shadow-[0_0_8px_rgba(212,168,67,0.7)]'
                                            : isComplete
                                                ? 'bg-emerald-400'
                                                : 'bg-slate-200 group-hover:bg-slate-300'
                                    }`}>
                                    </span>
                                    <span className={`text-[9px] font-black tracking-tight transition-colors ${
                                        isActive
                                            ? 'text-[#9A6B0A]'
                                            : isComplete
                                                ? 'text-emerald-600'
                                                : 'text-slate-400 group-hover:text-slate-600'
                                    }`}>
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 sm:p-6 lg:p-7">
                    <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                        <div>
                            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.22em] text-[#A77D20]">
                                {activeStepDetails.eyebrow}
                            </p>
                            <h3 className="font-bengali text-lg font-black text-[#060D1F] sm:text-xl">
                                {activeStepDetails.title}
                            </h3>
                            <p className="mt-1 max-w-2xl font-bengali text-xs leading-5 text-slate-500">
                                {activeStepDetails.description}
                            </p>
                        </div>
                        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#D4A843]/25 bg-[#FFF9E8] text-[#9A6B0A] sm:flex">
                            <ActiveStepIcon className="h-5 w-5" />
                        </div>
                    </div>

                    {ActiveStepComponent ? (
                        <ActiveStepComponent
                            formData={formData}
                            onUpdateField={updateFormField}
                            touchedFields={touchedFields}
                            onBlurField={(field) => setTouchedFields((current) => ({ ...current, [field]: true }))}
                            photoData={photoData}
                            onUpdatePhoto={setPhotoData}
                            onJumpToStep={() => {}}
                            idPreview={idPreview}
                            photoOnly
                            allowPhotoRemove={false}
                            stepErrors={stepErrors}
                        />
                    ) : (
                        <section className="space-y-5">
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D4A843]/25 bg-gradient-to-r from-[#FFF9E8] to-white px-4 py-3">
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#9A6B0A]">Employment & access controls</p>
                                    <p className="mt-0.5 font-bengali text-xs text-slate-600">
                                        এই অংশের পরিবর্তনগুলো সরাসরি চাকরি ও পোর্টাল অনুমতিতে প্রভাব ফেলবে।
                                    </p>
                                </div>
                                <span className="rounded-full bg-[#060D1F] px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-[#F7E09A]">
                                    {teacher.teacherCode || 'NO ID'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                                <FormSelect labelEng="Employment Type" labelBng="চাকরির ধরন" variant="erp" value={adminFields.employmentType} onChange={(event) => updateAdminField('employmentType', event.target.value)} options={['Non-MPO', 'MPO', 'Part-Time', 'Contractual']} />
                                <FormInput labelEng="Resignation Date" labelBng="চাকরি ছাড়ার তারিখ" type="date" variant="erp" value={adminFields.resignationDate} onChange={(event) => updateAdminField('resignationDate', event.target.value)} />
                                <FormInput labelEng="Monthly Basic Salary (BDT)" labelBng="মাসিক মূল বেতন (টাকা)" inputMode="decimal" isMonoText variant="erp" value={adminFields.basicSalary} error={stepErrors.basicSalary} onChange={(event) => updateAdminField('basicSalary', event.target.value)} required />
                                <FormInput labelEng="Biometric Device ID" labelBng="বায়োমেট্রিক ডিভাইস আইডি" inputMode="numeric" isMonoText variant="erp" value={adminFields.biometricDeviceId} error={stepErrors.biometricDeviceId} onChange={(event) => updateAdminField('biometricDeviceId', extractPureDigits(event.target.value))} required />
                                <FormInput labelEng="Monthly Leave Quota" labelBng="মাসিক ছুটির কোটা" inputMode="decimal" isMonoText variant="erp" value={adminFields.customLeaveQuota} error={stepErrors.customLeaveQuota} onChange={(event) => updateAdminField('customLeaveQuota', event.target.value)} required />
                                {[
                                    ['bankName', 'Bank Name', 'ব্যাংকের নাম'],
                                    ['branchName', 'Branch Name', 'শাখা'],
                                    ['accountHolderName', 'Account Holder', 'হিসাবধারীর নাম'],
                                    ['accountNumber', 'Account Number', 'হিসাব নম্বর'],
                                    ['routingNumber', 'Routing Number', 'রাউটিং নম্বর']
                                ].map(([field, labelEng, labelBng]) => (
                                    <FormInput
                                        key={field}
                                        labelEng={labelEng}
                                        labelBng={labelBng}
                                        variant="erp"
                                        maxLength={100}
                                        isMonoText={field === 'accountNumber' || field === 'routingNumber'}
                                        value={adminFields.bankDetails[field] || ''}
                                        onChange={(event) => updateAdminField('bankDetails', {
                                            ...adminFields.bankDetails,
                                            [field]: event.target.value
                                        })}
                                    />
                                ))}
                                <FormSelect
                                    labelEng="System Access Role"
                                    labelBng="পোর্টাল অ্যাক্সেস রোল"
                                    variant="erp"
                                    value={adminFields.role}
                                    onChange={(event) => updateAdminField('role', event.target.value)}
                                    disabled={isTargetSuperAdmin && !isSuperAdmin}
                                    hint={isTargetSuperAdmin && !isSuperAdmin
                                        ? 'সুপার অ্যাডমিন অ্যাকাউন্টের রোল পরিবর্তন শুধু সুপার অ্যাডমিন করতে পারবেন।'
                                        : ''}
                                    options={[
                                        'Teacher',
                                        'Admin',
                                        ...(isSuperAdmin || isTargetSuperAdmin ? ['SuperAdmin'] : [])
                                    ]}
                                />
                                <FormSelect
                                    labelEng="Registration Status"
                                    labelBng="নিবন্ধনের অবস্থা"
                                    variant="erp"
                                    value={adminFields.registrationStatus}
                                    onChange={(event) => updateAdminField('registrationStatus', event.target.value)}
                                    options={['Approved', 'Pending', 'Rejected']}
                                />
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                                <div className="mb-3">
                                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Class teacher privileges</p>
                                    <p className="mt-0.5 font-bengali text-sm font-bold text-[#060D1F]">শ্রেণি-দায়িত্ব ও শিক্ষার্থী ব্যবস্থাপনা</p>
                                </div>
                                <FormSelect
                                    labelEng="Assigned Class"
                                    labelBng="যে শ্রেণির ক্লাস টিচার হিসেবে দায়িত্ব থাকবে"
                                    variant="erp"
                                    value={adminFields.assignedClass}
                                    onChange={(event) => {
                                        const selectedClass = event.target.value;
                                        updateAdminField('assignedClass', selectedClass);
                                        if (!selectedClass) {
                                            updateAdminField('canEditAssignedClass', false);
                                        }
                                    }}
                                    options={CLASS_OPTIONS}
                                />
                                {adminFields.assignedClass && (
                                    <label className="mt-1 flex cursor-pointer items-start gap-3 rounded-xl border border-[#D4A843]/35 bg-[#FFF9E8] px-4 py-3 font-bengali text-xs leading-5 text-slate-700 sm:text-sm">
                                        <input
                                            type="checkbox"
                                            checked={adminFields.canEditAssignedClass}
                                            onChange={(event) => updateAdminField('canEditAssignedClass', event.target.checked)}
                                            className="mt-1 h-4 w-4 accent-[#060D1F]"
                                        />
                                        <span>
                                            <b className="text-[#060D1F]">শ্রেণি-শিক্ষক সম্পাদনা অনুমতি</b>
                                            <span className="mt-0.5 block">
                                                {adminFields.assignedClass} শ্রেণির শিক্ষার্থীদের তথ্য যোগ ও সম্পাদনা করতে পারবেন।
                                            </span>
                                        </span>
                                    </label>
                                )}
                            </div>

                            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bengali text-sm font-bold text-slate-700 transition hover:border-[#D4A843]/50">
                                <input
                                    type="checkbox"
                                    checked={adminFields.isActive}
                                    onChange={(event) => updateAdminField('isActive', event.target.checked)}
                                    className="h-4 w-4 accent-[#060D1F]"
                                />
                                {isReturningTeacher ? 'শিক্ষক পুনরায় যোগদান করেছেন / অ্যাকাউন্ট সক্রিয়' : 'শিক্ষক অ্যাকাউন্ট সক্রিয়'}
                            </label>

                            {isReturningTeacher && adminFields.isActive && (
                                <div className="rounded-2xl border border-[#D4A843]/30 bg-[#FFF9E8] p-4 sm:p-5">
                                    <FormInput
                                        labelEng="Rejoining Date"
                                        labelBng="পুনরায় যোগদানের তারিখ"
                                        type="date"
                                        variant="erp"
                                        value={adminFields.rejoiningDate}
                                        error={stepErrors.rejoiningDate}
                                        onChange={(event) => updateAdminField('rejoiningDate', event.target.value)}
                                        required
                                    />
                                    <p className="font-bengali text-xs leading-5 text-slate-600">
                                        পুরোনো শিক্ষক আইডি ও রেকর্ড অক্ষত থাকবে; নতুন চাকরির মেয়াদ আলাদা করে সংরক্ষিত হবে।
                                    </p>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </section>

            <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-[0_16px_40px_-24px_rgba(6,13,31,0.55)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="hidden min-w-0 sm:block">
                    <p className="font-bengali text-xs font-bold text-[#060D1F]">পরিবর্তন এখনো সংরক্ষিত হয়নি</p>
                    <p className="mt-0.5 font-bengali text-[10px] text-slate-500">সেভ করলে প্রোফাইল ও অ্যাকাউন্টে প্রয়োগ হবে।</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" leftIcon={X} onClick={onClose} disabled={isSaving}>
                        <span className="font-bengali">বাতিল</span>
                    </Button>
                    {activeStep > 0 && (
                        <Button variant="outline" size="sm" leftIcon={ArrowLeft} onClick={() => setActiveStep((current) => current - 1)} disabled={isSaving}>
                            <span className="font-bengali">আগের ধাপ</span>
                        </Button>
                    )}
                    {activeStep < EDIT_STEPS.length - 1 ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleJumpToStep(EDIT_STEPS.length - 1)}
                                disabled={isSaving}
                            >
                                <span className="font-bengali">শেষ ধাপে যান</span>
                            </Button>
                            <Button variant="emerald" size="sm" rightIcon={ArrowRight} onClick={handleNext} disabled={isSaving}>
                                <span className="font-bengali">পরের ধাপ</span>
                            </Button>
                        </>
                    ) : (
                        <Button variant="gold" size="sm" leftIcon={Save} isLoading={isSaving} loadingText="সংরক্ষণ হচ্ছে..." onClick={handleSave}>
                            <span className="font-bengali">সব তথ্য সংরক্ষণ করুন</span>
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}

export default function AdminTeacherProfileEditor(props) {
    return <TeacherProfileEditorForm {...props} />;
}