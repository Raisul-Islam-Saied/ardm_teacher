import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';
import { Button, FormInput, FormSelect, Modal } from '@components/ui';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@context/ToastContext';
import { createInitialRegistrationData } from '@pages/public/registration/registration.schema';
import Step1PersonalIdentity, { validateStep1PersonalData } from '@pages/public/registration/Step1PersonalIdentity';
import Step2ParentsAcademic, { validateStep2ParentsAcademicData } from '@pages/public/registration/Step2ParentsAcademic';
import Step3AddressContact, { validateStep3AddressContactData } from '@pages/public/registration/Step3AddressContact';
import Step4PhotoReview from '@pages/public/registration/Step4PhotoReview';
import { extractPureDigits, toEnglishDigits } from '@utils/formatters';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { useMemo, useState } from 'react';

const ADDRESS_FIELDS = [
    'houseNameBn', 'houseNameEn', 'villageBn', 'villageEn', 'unionBn', 'unionEn', 'wardNo',
    'upazilaBn', 'upazilaEn', 'districtBn', 'districtEn', 'divisionBn', 'divisionEn',
    'houseOrRoad', 'village', 'postOffice', 'postCode', 'upazila', 'district'
];

const EDIT_STEPS = [
    { title: 'ব্যক্তিগত ও পরিচয়পত্র', component: Step1PersonalIdentity, validate: validateStep1PersonalData },
    { title: 'পিতা-মাতা ও শিক্ষাগত যোগ্যতা', component: Step2ParentsAcademic, validate: validateStep2ParentsAcademicData },
    { title: 'ঠিকানা ও যোগাযোগ', component: Step3AddressContact, validate: validateStep3AddressContactData },
    { title: 'প্রোফাইল ছবি', component: Step4PhotoReview },
    { title: 'চাকরি, বেতন ও অ্যাকাউন্ট কন্ট্রোল' }
];

const CLASS_OPTIONS = [
    { value: '', label: 'কোনো শ্রেণির ক্লাস টিচার নন (সাধারণ শিক্ষক / স্টাফ)' },
    'প্লে', 'নার্সারি', 'কেজি', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম'
];

function normalizeEnglishName(val = '') {
    const clean = String(val || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    return clean
        .toLowerCase()
        .replace(/(^|[\s.'-])([a-z])/g, (_, sep, char) => sep + char.toUpperCase());
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
    return {
        employmentType: teacher.employmentType || 'Non-MPO',
        resignationDate: dateInputValue(teacher.resignationDate),
        rejoiningDate: teacher.isActive === false ? dateInputValue(new Date()) : '',
        basicSalary: String(teacher.basicSalary ?? 0),
        biometricDeviceId: String(teacher.biometricDeviceId ?? 1),
        customLeaveQuota: String(teacher.customLeaveQuota ?? 2),
        paymentMethod: teacher.paymentMethod || 'Cash',
        bankDetails: {
            bankName: '',
            branchName: '',
            accountHolderName: '',
            accountNumber: '',
            routingNumber: '',
            ...(teacher.bankDetails || {})
        },
        assignedClass: teacher.assignedClass || '',
        canEditAssignedClass: Boolean(teacher.canEditAssignedClass),
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

export default function AdminTeacherProfileEditor({ teacher, onClose, onUpdated }) {
    const toast = useToast();
    const { isSuperAdmin } = useAuth();
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

    const isReturningTeacher = teacher.isActive === false
        && !['Pending', 'Rejected'].includes(teacher.registrationStatus);

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
            paymentMethod: adminFields.paymentMethod,
            bankDetails: Object.fromEntries(
                Object.entries(adminFields.bankDetails || {}).map(([k, v]) => [k, String(v || '').trim()])
            ),
            assignedClass: adminFields.assignedClass || '',
            canEditAssignedClass: Boolean(adminFields.assignedClass && adminFields.canEditAssignedClass),
            role: adminFields.role,
            registrationStatus: adminFields.registrationStatus,
            isActive: adminFields.isActive
        };

        setIsSaving(true);
        try {
            const response = await axiosClient.patch(`/teachers/${teacher._id}`, payload);
            let updatedTeacher = response.data?.data?.teacher || response.data?.data || teacher;
            onUpdated(updatedTeacher);

            if (photoData?.blob) {
                try {
                    const uploadData = new FormData();
                    uploadData.append('file', photoData.file || photoData.blob, 'teacher_photo_500x500.jpg');
                    const photoResponse = await axiosClient.patch(
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

    const ActiveStepComponent = EDIT_STEPS[activeStep].component;

    return (
        <Modal
            isOpen
            onClose={isSaving ? undefined : onClose}
            closeOnBackdrop={!isSaving}
            size="xl"
            titleEng={`UPDATE TEACHER · ${teacher.teacherCode || ''}`}
            titleBng={`শিক্ষকের সম্পূর্ণ তথ্য আপডেট · ${teacher.fullNameBng || ''}`}
            subtitleBng="রেজিস্ট্রেশন ফর্মের একই ধাপ, সিলেক্ট অপশন এবং সংরক্ষিত তথ্য ব্যবহার করুন।"
            footer={
                <>
                    {activeStep > 0 && (
                        <Button variant="ghost" size="sm" leftIcon={ArrowLeft} onClick={() => setActiveStep((current) => current - 1)} disabled={isSaving}>
                            <span className="font-bengali">আগের ধাপ</span>
                        </Button>
                    )}
                    {activeStep < EDIT_STEPS.length - 1 ? (
                        <Button variant="emerald" size="sm" rightIcon={ArrowRight} onClick={handleNext} disabled={isSaving}>
                            <span className="font-bengali">পরের ধাপ</span>
                        </Button>
                    ) : (
                        <Button variant="gold" size="sm" leftIcon={Save} isLoading={isSaving} loadingText="সংরক্ষণ হচ্ছে..." onClick={handleSave}>
                            <span className="font-bengali">সব তথ্য সংরক্ষণ করুন</span>
                        </Button>
                    )}
                </>
            }
        >
            <div className="mb-5 flex flex-wrap gap-2">
                {EDIT_STEPS.map((step, index) => (
                    <button
                        key={step.title}
                        type="button"
                        disabled={isSaving}
                        onClick={() => {
                            if (
                                index <= activeStep
                                || (index === activeStep + 1 && validateActiveStep())
                            ) {
                                setActiveStep(index);
                                setStepErrors({});
                            }
                        }}
                        className={`rounded-lg px-3 py-2 text-xs font-bengali disabled:opacity-50 ${index === activeStep ? 'bg-emerald text-white' : 'bg-paper-deep text-ink-soft hover:text-emerald-deep'}`}
                    >
                        {index < activeStep ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}
                        {index + 1}. {step.title}
                    </button>
                ))}
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
                    <div className="rounded-xl border border-ink-faint bg-paper px-4 py-3 font-bengali text-sm">
                        টিচার আইডি: <b className="font-mono">{teacher.teacherCode}</b>
                        <span className="mx-3 text-ink-faint">·</span>
                        বায়োমেট্রিক আইডি ও পোর্টাল অ্যাক্সেসের নিয়ন্ত্রণ এখান থেকে আপডেট হবে।
                    </div>

                    <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                        <FormSelect labelEng="Employment Type" labelBng="চাকরির ধরন" variant="erp" value={adminFields.employmentType} onChange={(event) => updateAdminField('employmentType', event.target.value)} options={['Non-MPO', 'MPO', 'Part-Time', 'Contractual']} />
                        <FormInput labelEng="Resignation Date" labelBng="চাকরি ছাড়ার তারিখ" type="date" variant="erp" value={adminFields.resignationDate} onChange={(event) => updateAdminField('resignationDate', event.target.value)} />
                        <FormInput labelEng="Monthly Basic Salary (BDT)" labelBng="মাসিক মূল বেতন (টাকা)" inputMode="decimal" isMonoText variant="erp" value={adminFields.basicSalary} error={stepErrors.basicSalary} onChange={(event) => updateAdminField('basicSalary', event.target.value)} required />
                        <FormInput labelEng="Biometric Device ID" labelBng="বায়োমেট্রিক ডিভাইস আইডি" inputMode="numeric" isMonoText variant="erp" value={adminFields.biometricDeviceId} error={stepErrors.biometricDeviceId} onChange={(event) => updateAdminField('biometricDeviceId', extractPureDigits(event.target.value))} required />
                        <FormInput labelEng="Monthly Leave Quota" labelBng="মাসিক ছুটির কোটা" inputMode="decimal" isMonoText variant="erp" value={adminFields.customLeaveQuota} error={stepErrors.customLeaveQuota} onChange={(event) => updateAdminField('customLeaveQuota', event.target.value)} required />
                        <FormSelect labelEng="Payment Method" labelBng="পেমেন্ট পদ্ধতি" variant="erp" value={adminFields.paymentMethod} onChange={(event) => updateAdminField('paymentMethod', event.target.value)} options={['Cash', 'Bank', 'Mobile Banking']} />
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
                            options={['Teacher', 'Admin', ...(isSuperAdmin ? ['SuperAdmin'] : [])]}
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

                    <div className="rounded-xl border border-ink-faint bg-paper p-4 space-y-3">
                        <FormSelect
                            labelEng="Assigned Class (Optional — Only for Class Teachers)"
                            labelBng="শ্রেণি শিক্ষক হিসেবে দায়িত্ব (সকল শিক্ষকের জন্য প্রযোজ্য নয়)"
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
                            <label className="flex items-center gap-2.5 rounded-lg border border-gold/40 bg-gold-subtle/20 px-3 py-2.5 font-bengali text-xs sm:text-sm text-emerald-deep cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={adminFields.canEditAssignedClass}
                                    onChange={(event) => updateAdminField('canEditAssignedClass', event.target.checked)}
                                />
                                <span>
                                    এই শিক্ষক তার নিজ নির্ধারিত শ্রেণির (<b>{adminFields.assignedClass}</b>) শিক্ষার্থীদের তথ্য যোগ ও সম্পাদনা করতে পারবেন
                                </span>
                            </label>
                        )}
                    </div>

                    <label className="flex items-center gap-2 rounded-xl border border-ink-faint bg-paper p-3 font-bengali text-sm cursor-pointer">
                        <input type="checkbox" checked={adminFields.isActive} onChange={(event) => updateAdminField('isActive', event.target.checked)} />
                        {isReturningTeacher ? 'শিক্ষক পুনরায় যোগদান করেছেন / অ্যাকাউন্ট সক্রিয়' : 'শিক্ষক অ্যাকাউন্ট সক্রিয়'}
                    </label>

                    {isReturningTeacher && adminFields.isActive && (
                        <div className="rounded-xl border border-emerald/20 bg-emerald-subtle/30 p-4">
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
                            <p className="font-bengali text-xs text-ink-soft">
                                পুরোনো শিক্ষক আইডি ও রেকর্ড অক্ষত থাকবে; নতুন চাকরির মেয়াদ আলাদা করে সংরক্ষিত হবে।
                            </p>
                        </div>
                    )}
                </section>
            )}
        </Modal>
    );
}