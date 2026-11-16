/**
 * ARDM Enterprise ERP — Registration Step 2: Bilingual Parents & Academic Qualifications
 * Enforces Military-Grade Validation on:
 * - Father's Name (English & Unicode Bengali)
 * - Mother's Name (English & Unicode Bengali)
 * - Dynamic Academic Qualifications List (Degree Level Weight, GPA/CGPA on 4.00 or 5.00 scale, Passing Year vs DOB)
 */

import React from 'react';
import {
    Users,
    GraduationCap,
    Plus,
    Trash2,
    Award,
    AlertCircle,
    BookOpen
} from 'lucide-react';
import { DEGREE_LEVELS } from '@constants/app.constants';
import { FormInput, FormSelect, Button, Badge } from '@components/ui';
import academicQualificationOptions from '@/data/academicQualificationOptions.json';
import {
    validateEnglishName,
    validateBengaliName,
    validateAcademicEntry
} from '@utils/validators';
import {
    toEnglishDigits,
    toBengaliDigits,
    calculateLiveRankMetrics
} from '@utils/formatters';
import { cn } from '@utils/cn';

const ACADEMIC_QUALIFICATION_GROUPS = [
    { id: 'secondary', titleEng: 'SSC / Equivalent Level', titleBng: 'এসএসসি / দাখিল ও সমমান', levels: ['JDC', 'Dakhil', 'SSC'], defaultLevel: 'Dakhil', optionKey: 'secondary' },
    { id: 'higher-secondary', titleEng: 'HSC / Equivalent Level', titleBng: 'এইচএসসি / আলিম ও সমমান', levels: ['Alim', 'HSC'], defaultLevel: 'Alim', optionKey: 'higherSecondary' },
    { id: 'graduation', titleEng: 'Graduation / Equivalent Level', titleBng: 'স্নাতক / ফাজিল ও সমমান', levels: ['Fazil', 'Honours'], defaultLevel: 'Honours', optionKey: 'graduation' },
    { id: 'post-graduation', titleEng: 'Masters / Equivalent Level', titleBng: 'স্নাতকোত্তর / কামিল ও সমমান', levels: ['Kamil', 'Masters'], defaultLevel: 'Masters', optionKey: 'masters' }
];

const ALL_EXAMINATIONS = [
    ...academicQualificationOptions.secondary.examinations,
    ...academicQualificationOptions.higherSecondary.examinations,
    ...academicQualificationOptions.graduation.examinations,
    ...academicQualificationOptions.masters.examinations
].filter((option, index, list) => list.findIndex((item) => item.value === option.value) === index);

const ALL_INSTITUTIONS = [
    ...academicQualificationOptions.secondary.boards,
    ...academicQualificationOptions.higherSecondary.boards,
    ...academicQualificationOptions.universities
].filter((option, index, list) => list.findIndex((item) => item.value === option.value) === index);

const ALL_SUBJECTS = [
    ...academicQualificationOptions.secondary.subjects,
    ...academicQualificationOptions.higherSecondary.subjects,
    ...academicQualificationOptions.higherStudySubjects
].filter((option, index, list) => list.findIndex((item) => item.value === option.value) === index);

const ALL_RESULTS = [
    ...academicQualificationOptions.secondary.results,
    ...academicQualificationOptions.higherSecondary.results,
    ...academicQualificationOptions.graduation.results,
    ...academicQualificationOptions.masters.results
].filter((option, index, list) => list.findIndex((item) => item.value === option.value) === index);

const ALL_COURSE_DURATIONS = [
    ...academicQualificationOptions.graduation.courseDurations,
    ...academicQualificationOptions.masters.courseDurations
].filter((option, index, list) => list.findIndex((item) => item.value === option.value) === index);

const PASSING_YEAR_END = Math.max(academicQualificationOptions.passingYearEnd, new Date().getFullYear());
const PASSING_YEAR_OPTIONS = Array.from(
    { length: PASSING_YEAR_END - academicQualificationOptions.passingYearStart + 1 },
    (_, index) => {
        const year = String(academicQualificationOptions.passingYearStart + index);
        return { value: year, label: year };
    }
);

const HSC_SUBJECT_CATEGORIES_BY_EXAM = {
    '1': ['G', 'Z'],
    '2': ['G', 'Z'],
    '3': ['T', 'Z'],
    '4': ['T', 'Z'],
    '5': ['G', 'Z'],
    '6': ['G', 'Z'],
    '7': ['T', 'Z'],
    '8': ['V', 'Z'],
    '9': ['T', 'Z'],
    '10': ['T', 'Z']
};

function getGroupDropdownOptions(group) {
    if (group.id === 'unassigned') {
        return {
            examinations: ALL_EXAMINATIONS,
            institutions: ALL_INSTITUTIONS,
            subjects: ALL_SUBJECTS,
            results: ALL_RESULTS,
            courseDurations: ALL_COURSE_DURATIONS
        };
    }

    const data = academicQualificationOptions[group.optionKey];
    return {
        examinations: data.examinations,
        institutions: group.id === 'secondary' || group.id === 'higher-secondary'
            ? data.boards
            : academicQualificationOptions.universities,
        subjects: group.id === 'secondary' || group.id === 'higher-secondary'
            ? data.subjects
            : academicQualificationOptions.higherStudySubjects,
        results: data.results,
        courseDurations: data.courseDurations || []
    };
}

/**
 * পুরো Step 2-এর সকল ফিল্ড একসাথে ভ্যালিডেট করার এক্সপোর্টেড ফাংশন
 */
export function validateStep2ParentsAcademicData(formData) {
    const errors = {};
    const academicRowErrors = {};

    const fatherEng = validateEnglishName(formData.fathersNameEng, 'পিতার ইংরেজি নাম');
    if (!fatherEng.valid) errors.fathersNameEng = fatherEng.error;

    const fatherBng = validateBengaliName(formData.fathersNameBng, 'পিতার বাংলা নাম');
    if (!fatherBng.valid) errors.fathersNameBng = fatherBng.error;

    const motherEng = validateEnglishName(formData.mothersNameEng, 'মাতার ইংরেজি নাম');
    if (!motherEng.valid) errors.mothersNameEng = motherEng.error;

    const motherBng = validateBengaliName(formData.mothersNameBng, 'মাতার বাংলা নাম');
    if (!motherBng.valid) errors.mothersNameBng = motherBng.error;

    const quals = Array.isArray(formData.academicQualifications)
        ? formData.academicQualifications
        : [];

    if (quals.length === 0) {
        errors.academicGeneral = 'র‍্যাংকিং নির্ধারণের জন্য কমপক্ষে ১টি শিক্ষাগত যোগ্যতা যোগ করা আবশ্যক।';
    } else {
        const birthYear = formData.dateOfBirth ? Number(formData.dateOfBirth.slice(0, 4)) : null;

        quals.forEach((row, index) => {
            const check = validateAcademicEntry(row);
            const rowErr = { ...check.errors };

            // জন্মসালের সাথে পাসের সনের সামঞ্জস্যতা চেক (জন্মের কমপক্ষে ১০ বছর পর পাসের সন হতে হবে)
            const passYear = Number(toEnglishDigits(row.passingYear));
            if (birthYear && passYear && passYear - birthYear < 10) {
                rowErr.passingYear = `জন্মসাল (${birthYear})-এর সাথে পাসের সন (${passYear}) সামঞ্জস্যপূর্ণ নয়।`;
            }

            if (Object.keys(rowErr).length > 0) {
                academicRowErrors[row.id || index] = rowErr;
            }
        });

        if (Object.keys(academicRowErrors).length > 0) {
            errors.academicRows = academicRowErrors;
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

export default function Step2ParentsAcademic({
    formData,
    onUpdateField,
    touchedFields = {},
    onBlurField,
    stepErrors = {}
}) {
    const fatherEngLive = validateEnglishName(formData.fathersNameEng, 'পিতার ইংরেজি নাম');
    const fatherBngLive = validateBengaliName(formData.fathersNameBng, 'পিতার বাংলা নাম');
    const motherEngLive = validateEnglishName(formData.mothersNameEng, 'মাতার ইংরেজি নাম');
    const motherBngLive = validateBengaliName(formData.mothersNameBng, 'মাতার বাংলা নাম');

    const qualifications = Array.isArray(formData.academicQualifications)
        ? formData.academicQualifications
        : [];

    const liveRank = calculateLiveRankMetrics(formData.designation, qualifications);

    const qualificationGroups = qualifications.some(
        (item) => !ACADEMIC_QUALIFICATION_GROUPS.some((group) => group.levels.includes(item.degreeLevel))
    )
        ? [
            ...ACADEMIC_QUALIFICATION_GROUPS,
            {
                id: 'unassigned',
                titleEng: 'Unassigned Qualification',
                titleBng: 'স্তর নির্বাচন করা হয়নি',
                levels: [],
                defaultLevel: 'Other'
            }
        ]
        : ACADEMIC_QUALIFICATION_GROUPS;

    const getFieldError = (fieldName, liveResult, currentVal) => {
        if (stepErrors[fieldName]) return stepErrors[fieldName];
        if ((touchedFields[fieldName] || String(currentVal || '').length > 0) && !liveResult.valid) {
            return liveResult.error;
        }
        return '';
    };

    // নতুন শিক্ষাগত যোগ্যতার রো (Row) যোগ করা
    const handleAddQualification = (degreeLevel) => {
        if (qualifications.length >= 6) return;
        const newId = `acad_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const nextList = [
            ...qualifications,
            {
                id: newId,
                degreeLevel,
                examTitle: '',
                majorOrGroup: '',
                boardOrUniversity: '',
                rollNumber: '',
                passingYear: '',
                courseDuration: '',
                resultType: '',
                resultGrade: '',
                gpaOrCgpa: '',
                scale: ''
            }
        ];
        onUpdateField('academicQualifications', nextList);
    };

    // নির্দিষ্ট রো ডিলিট করা
    const handleRemoveQualification = (targetId) => {
        const nextList = qualifications.filter((item) => item.id !== targetId);
        onUpdateField('academicQualifications', nextList);
    };

    // নির্দিষ্ট রো-এর ফিল্ড আপডেট করা
    const handleUpdateQualificationRow = (targetId, key, val) => {
        const nextList = qualifications.map((item) => {
            if (item.id !== targetId) return item;

            return {
                ...item,
                [key]: val
            };
        });

        onUpdateField('academicQualifications', nextList);
    };

    const handleUpdateExamination = (targetId, group, examLabel) => {
        const examination = getGroupDropdownOptions(group).examinations
            .find((option) => option.label === examLabel);
        if (!examination) return;

        const degree = DEGREE_LEVELS.find((item) => item.key === examination.degreeLevel);
        const nextList = qualifications.map((item) => (
            item.id !== targetId
                ? item
                : {
                    ...item,
                    examTitle: examination.label,
                    degreeLevel: examination.degreeLevel,
                    majorOrGroup: '',
                    courseDuration: degree && degree.weight >= 4 ? item.courseDuration : ''
                }
        ));
        onUpdateField('academicQualifications', nextList);
    };

    const handleUpdateResult = (targetId, group, resultValue) => {
        const result = getGroupDropdownOptions(group).results
            .find((option) => option.value === resultValue);
        if (!result) return;

        const numericResult = result.resultType === 'GPA' || result.resultType === 'CGPA';
        const nextList = qualifications.map((item) => (
            item.id !== targetId
                ? item
                : {
                    ...item,
                    resultType: result.resultType,
                    resultGrade: result.resultGrade || '',
                    scale: result.scale || '',
                    gpaOrCgpa: numericResult ? item.gpaOrCgpa : ''
                }
        ));
        onUpdateField('academicQualifications', nextList);
    };

    const rowErrorsMap = stepErrors.academicRows || {};

    return (
        <div className="space-y-8 animate-fade-up">

            {/* =================================================================
                SECTION 1: BILINGUAL PARENTS INFORMATION (Father & Mother)
               ================================================================= */}
            <section>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-2 border-b border-ink-faint">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald" />
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                            ১. পিতা ও মাতার তথ্য (বাংলা ও ইংরেজি উভয় ভাষায় বাধ্যতামূলক)
                        </h3>
                    </div>
                    <Badge variant="emerald-subtle" size="sm">
                        দ্বিভাষিক সনদ যাচাই
                    </Badge>
                </div>

                {/* পিতার নাম (ইংরেজি ও বাংলা) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-1">
                    <FormInput
                        labelEng="Father's Name (English)"
                        labelBng="পিতার নাম (ইংরেজিতে)"
                        name="fathersNameEng"
                        value={formData.fathersNameEng}
                        onChange={(e) => onUpdateField('fathersNameEng', e.target.value)}
                        onBlur={() => onBlurField('fathersNameEng')}
                        placeholder="e.g. Md. Rafiqul Islam"
                        required
                        showValidIcon
                        isValid={fatherEngLive.valid}
                        error={getFieldError('fathersNameEng', fatherEngLive, formData.fathersNameEng)}
                        hint="শুধুমাত্র ইংরেজি অক্ষর (A-Z) ব্যবহার করুন।"
                    />

                    <FormInput
                        labelEng="Father's Name (Bengali)"
                        labelBng="পিতার নাম (ইউনিকোড বাংলায়)"
                        name="fathersNameBng"
                        value={formData.fathersNameBng}
                        onChange={(e) => onUpdateField('fathersNameBng', e.target.value)}
                        onBlur={() => onBlurField('fathersNameBng')}
                        placeholder="যেমনঃ মোঃ রফিকুল ইসলাম"
                        required
                        isBengaliText
                        showValidIcon
                        isValid={fatherBngLive.valid}
                        error={getFieldError('fathersNameBng', fatherBngLive, formData.fathersNameBng)}
                        hint="শুধুমাত্র ইউনিকোড বাংলা অক্ষরে পিতার পূর্ণ নাম।"
                    />

                    {/* মাতার নাম (ইংরেজি ও বাংলা) */}
                    <FormInput
                        labelEng="Mother's Name (English)"
                        labelBng="মাতার নাম (ইংরেজিতে)"
                        name="mothersNameEng"
                        value={formData.mothersNameEng}
                        onChange={(e) => onUpdateField('mothersNameEng', e.target.value)}
                        onBlur={() => onBlurField('mothersNameEng')}
                        placeholder="e.g. Nesha Begum"
                        required
                        showValidIcon
                        isValid={motherEngLive.valid}
                        error={getFieldError('mothersNameEng', motherEngLive, formData.mothersNameEng)}
                        hint="শুধুমাত্র ইংরেজি অক্ষর (A-Z) ব্যবহার করুন।"
                    />

                    <FormInput
                        labelEng="Mother's Name (Bengali)"
                        labelBng="মাতার নাম (ইউনিকোড বাংলায়)"
                        name="mothersNameBng"
                        value={formData.mothersNameBng}
                        onChange={(e) => onUpdateField('mothersNameBng', e.target.value)}
                        onBlur={() => onBlurField('mothersNameBng')}
                        placeholder="যেমনঃ নেশা বেগম"
                        required
                        isBengaliText
                        showValidIcon
                        isValid={motherBngLive.valid}
                        error={getFieldError('mothersNameBng', motherBngLive, formData.mothersNameBng)}
                        hint="শুধুমাত্র ইউনিকোড বাংলা অক্ষরে মাতার পূর্ণ নাম।"
                    />
                </div>
            </section>

            <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-faint pb-3">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-emerald-deep">
                            <GraduationCap className="h-5 w-5" />
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest">
                                Educational Qualifications
                            </span>
                        </div>
                        <h3 className="font-bengali text-base font-bold text-ink">
                            ২. শিক্ষাগত যোগ্যতার তথ্য
                        </h3>
                    </div>

                    <Badge variant="gold" size="sm">
                        {toBengaliDigits(qualifications.length)} / ৬টি সনদ
                    </Badge>
                </div>

                <div className="flex items-start gap-2.5 rounded-lg border border-emerald/15 bg-emerald-subtle/40 px-3.5 py-3">
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-emerald-deep" />
                    <p className="font-bengali text-xs leading-6 text-ink-soft">
                        SSC/দাখিল থেকে উচ্চতর পর্যায় পর্যন্ত প্রযোজ্য প্রতিটি সনদের তথ্য যোগ করুন। GPA/CGPA ফলাফল মেধাক্রমে ব্যবহৃত হবে; বিভাগ, শ্রেণি বা “উত্তীর্ণ” ফলাফল সংরক্ষিত হবে, তবে GPA-ভিত্তিক মেধাক্রমে গণনা হবে না।
                    </p>
                </div>

                {stepErrors.academicGeneral && (
                    <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-danger/20 bg-danger-bg px-3 py-2 text-xs font-bengali text-danger">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {stepErrors.academicGeneral}
                    </p>
                )}

                <div className="space-y-3">
                    {qualificationGroups.map((group) => {
                        const groupItems = qualifications
                            .map((item, index) => ({ item, index }))
                            .filter(({ item }) => (
                                group.id === 'unassigned'
                                    ? !ACADEMIC_QUALIFICATION_GROUPS.some((knownGroup) => knownGroup.levels.includes(item.degreeLevel))
                                    : group.levels.includes(item.degreeLevel)
                            ));

                        return (
                            <section
                                key={group.id}
                                className="overflow-hidden rounded-lg border border-ink-faint bg-paper-panel"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-faint bg-paper-deep/40 px-4 py-3">
                                    <div>
                                        <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-emerald-deep">
                                            {group.titleEng}
                                        </h4>
                                        <p className="font-bengali text-xs text-ink-soft">{group.titleBng}</p>
                                    </div>
                                    <Button
                                        variant="gold"
                                        size="xs"
                                        leftIcon={Plus}
                                        onClick={() => handleAddQualification(group.defaultLevel)}
                                        disabled={qualifications.length >= 6}
                                    >
                                        <span className="font-bengali">
                                            {group.id === 'post-graduation' ? 'প্রযোজ্য হলে যোগ করুন' : 'এই স্তরের তথ্য যোগ করুন'}
                                        </span>
                                    </Button>
                                </div>

                                <div className="space-y-3 p-3 sm:p-4">
                                    {groupItems.length === 0 && (
                                        <p className="px-1 py-2 font-bengali text-xs text-ink-muted">
                                            এই স্তরের কোনো সনদ যোগ করা হয়নি।
                                        </p>
                                    )}

                                    {groupItems.map(({ item, index }, groupIndex) => {
                                        const rowErr = rowErrorsMap[item.id || index] || {};
                                        const groupOptions = getGroupDropdownOptions(group);
                                        const isSchoolLevel = group.id === 'secondary' || group.id === 'higher-secondary';
                                        const isHigherStudy = group.id === 'graduation' || group.id === 'post-graduation';
                                        const scaleNum = Number(item.scale) === 4 ? 4 : 5;
                                        const resultType = item.resultType || (item.gpaOrCgpa ? 'GPA' : '');
                                        const isNumericResult = resultType === 'GPA' || resultType === 'CGPA';
                                        const rawGpa = Number(toEnglishDigits(item.gpaOrCgpa));
                                        const normalizedPreview =
                                            isNumericResult && !isNaN(rawGpa) && rawGpa > 0 && rawGpa <= scaleNum
                                                ? (scaleNum === 4 ? (rawGpa / 4) * 5 : rawGpa).toFixed(2)
                                                : '';
                                        const selectedDegree = DEGREE_LEVELS.find((degree) => degree.key === item.degreeLevel);
                                        const selectedResultValue = isNumericResult
                                            ? `${resultType}_${scaleNum}`
                                            : ['Division', 'Class'].includes(resultType)
                                                ? `${resultType}_${item.resultGrade}`
                                                : resultType;
                                        const selectedExamination = groupOptions.examinations.find((option) => option.label === item.examTitle);
                                        const subjectOptions = group.id === 'secondary'
                                            ? groupOptions.subjects.filter((option) => (
                                                /vocational/i.test(item.examTitle || '')
                                                    ? ['V', 'Z'].includes(option.category)
                                                    : ['G', 'Z'].includes(option.category)
                                            ))
                                            : group.id === 'higher-secondary'
                                                ? groupOptions.subjects.filter((option) => (
                                                    (HSC_SUBJECT_CATEGORIES_BY_EXAM[selectedExamination?.sourceValue] || ['G', 'Z'])
                                                        .includes(option.category)
                                                ))
                                                : groupOptions.subjects;

                                        const examinationField = (
                                            <FormSelect
                                                key="examination"
                                                labelEng="Examination"
                                                labelBng="পরীক্ষা"
                                                variant="erp"
                                                value={item.examTitle}
                                                onChange={(e) => handleUpdateExamination(item.id, group, e.target.value)}
                                                options={groupOptions.examinations}
                                                placeholder="Select"
                                                required
                                                error={rowErr.examTitle}
                                                isBengaliText={false}
                                            />
                                        );
                                        const rollField = (
                                            <FormInput
                                                key="roll"
                                                labelEng="Roll No."
                                                labelBng="রোল নম্বর"
                                                variant="erp"
                                                inputMode="numeric"
                                                value={item.rollNumber}
                                                onChange={(e) => handleUpdateQualificationRow(item.id, 'rollNumber', toEnglishDigits(e.target.value).slice(0, 50))}
                                                placeholder="Roll No."
                                            />
                                        );
                                        const institutionField = (
                                            <FormSelect
                                                key="institution"
                                                labelEng={isSchoolLevel ? 'Board' : 'University / Institute'}
                                                labelBng={isSchoolLevel ? 'বোর্ড' : 'বিশ্ববিদ্যালয় / প্রতিষ্ঠান'}
                                                variant="erp"
                                                value={item.boardOrUniversity}
                                                onChange={(e) => handleUpdateQualificationRow(item.id, 'boardOrUniversity', e.target.value)}
                                                options={groupOptions.institutions}
                                                placeholder="Select"
                                                required
                                                error={rowErr.boardOrUniversity}
                                                isBengaliText={false}
                                            />
                                        );
                                        const subjectField = (
                                            <FormSelect
                                                key="subject"
                                                labelEng={isSchoolLevel ? 'Group / Subject' : 'Subject / Degree'}
                                                labelBng={isSchoolLevel ? 'বিভাগ / বিষয়' : 'বিষয় / ডিগ্রি'}
                                                variant="erp"
                                                value={item.majorOrGroup}
                                                onChange={(e) => handleUpdateQualificationRow(item.id, 'majorOrGroup', e.target.value)}
                                                options={subjectOptions}
                                                placeholder="Select"
                                                required
                                                error={rowErr.majorOrGroup}
                                                isBengaliText={false}
                                            />
                                        );
                                        const yearField = (
                                            <FormSelect
                                                key="passing-year"
                                                labelEng="Passing Year"
                                                labelBng="পাসের সন"
                                                variant="erp"
                                                value={String(item.passingYear || '')}
                                                onChange={(e) => handleUpdateQualificationRow(item.id, 'passingYear', e.target.value)}
                                                options={PASSING_YEAR_OPTIONS}
                                                placeholder="Select"
                                                required
                                                error={rowErr.passingYear}
                                                isBengaliText={false}
                                            />
                                        );
                                        const resultField = (
                                            <FormSelect
                                                key="result"
                                                labelEng="Result"
                                                labelBng="ফলাফল"
                                                variant="erp"
                                                value={selectedResultValue}
                                                onChange={(e) => handleUpdateResult(item.id, group, e.target.value)}
                                                options={groupOptions.results}
                                                placeholder="Select"
                                                required
                                                error={rowErr.resultType || rowErr.resultGrade}
                                                isBengaliText={false}
                                            />
                                        );
                                        const scoreField = isNumericResult ? (
                                            <FormInput
                                                key="score"
                                                labelEng={resultType}
                                                labelBng="প্রাপ্ত ফলাফল"
                                                variant="erp"
                                                inputMode="decimal"
                                                value={item.gpaOrCgpa}
                                                onChange={(e) => {
                                                    const result = toEnglishDigits(e.target.value).replace(/[^0-9.]/g, '');
                                                    handleUpdateQualificationRow(item.id, 'gpaOrCgpa', result);
                                                }}
                                                placeholder={scaleNum === 4 ? '3.75' : '5.00'}
                                                required
                                                isMonoText
                                                error={rowErr.gpaOrCgpa}
                                                hint={normalizedPreview ? `৫.০০ স্কেলে সমমান: ${normalizedPreview} (মেধাক্রমে ব্যবহৃত হবে)` : ''}
                                                rightElement={<span className="font-mono text-[11px] text-ink-muted">/ {scaleNum}.00</span>}
                                            />
                                        ) : null;
                                        const durationField = isHigherStudy ? (
                                            <FormSelect
                                                key="course-duration"
                                                labelEng="Course Duration"
                                                labelBng="কোর্সের মেয়াদ"
                                                variant="erp"
                                                value={item.courseDuration || ''}
                                                onChange={(e) => handleUpdateQualificationRow(item.id, 'courseDuration', e.target.value)}
                                                options={groupOptions.courseDurations}
                                                placeholder="Select"
                                                required
                                                error={rowErr.courseDuration}
                                                isBengaliText={false}
                                            />
                                        ) : null;

                                        return (
                                            <article
                                                key={item.id || index}
                                                className="overflow-hidden rounded-lg border border-ink-faint bg-paper"
                                            >
                                                <div className="flex items-center justify-between gap-3 border-b border-ink-faint bg-paper-deep/40 px-4 py-3">
                                                    <div className="flex min-w-0 items-center gap-2.5">
                                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-deep font-mono text-xs font-bold text-white">
                                                            {toBengaliDigits(groupIndex + 1)}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bengali text-sm font-bold text-ink">
                                                                সনদ / ডিগ্রি {toBengaliDigits(groupIndex + 1)}
                                                            </h4>
                                                            {selectedDegree && (
                                                                <p className="truncate font-bengali text-[11px] text-ink-soft">
                                                                    {selectedDegree.labelBng}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveQualification(item.id)}
                                                        aria-label={`${group.titleBng} ${groupIndex + 1} মুছুন`}
                                                        className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 font-bengali text-xs text-danger transition-colors hover:bg-danger-bg"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        মুছুন
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 gap-x-5 px-4 pt-4 sm:grid-cols-2">
                                                    {examinationField}
                                                    {isSchoolLevel ? rollField : institutionField}
                                                    {isSchoolLevel ? subjectField : yearField}
                                                    {isSchoolLevel ? institutionField : subjectField}
                                                    {resultField}
                                                    {scoreField}
                                                    {isSchoolLevel ? yearField : durationField}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald/15 bg-white px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 shrink-0 text-emerald-deep" />
                        <div>
                            <p className="font-bengali text-xs font-semibold text-ink">স্বয়ংক্রিয় মেধাক্রম</p>
                            <p className="font-bengali text-[11px] text-ink-soft">
                                যোগ্যতা ও GPA/CGPA-এর ভিত্তিতে হিসাব করা হবে
                            </p>
                        </div>
                    </div>
                    <div className="text-right font-bengali text-xs text-ink-soft">
                        {liveRank.highestNormalizedGpa > 0 ? (
                            <>
                                <span>{liveRank.highestDegreeLabel}</span>
                                <span className="mx-1.5 text-ink-muted">·</span>
                                <span>সমমান GPA {liveRank.highestNormalizedGpa.toFixed(2)} / ৫.০০</span>
                            </>
                        ) : (
                            <span>GPA/CGPA দিলে এখানে দেখাবে</span>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
