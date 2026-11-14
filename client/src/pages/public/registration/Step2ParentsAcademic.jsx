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
    Sparkles,
    CheckCircle2,
    AlertCircle,
    BookOpen
} from 'lucide-react';
import { DEGREE_LEVELS } from '@constants/app.constants';
import { FormInput, FormSelect, Button, Badge } from '@components/ui';
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

// ডিগ্রি লেভেল সিলেক্ট করলে দ্রুত কাজের জন্য স্মার্ট ডিফল্ট সাজেশন
const DEGREE_PRESET_SUGGESTIONS = {
    Kamil: { examTitle: 'কামিল (স্নাতকোত্তর সমমান)', board: 'ইসলামি আরবি বিশ্ববিদ্যালয়, ঢাকা', scale: 4 },
    Masters: { examTitle: 'মাস্টার্স (এম.এ / এম.এসসি / এম.এসএস)', board: 'জাতীয় বিশ্ববিদ্যালয়, গাজীপুর', scale: 4 },
    Fazil: { examTitle: 'ফাজিল (স্নাতক সমমান)', board: 'ইসলামি আরবি বিশ্ববিদ্যালয়, ঢাকা', scale: 4 },
    Honours: { examTitle: 'স্নাতক (অনার্স / ডিগ্রি পাস)', board: 'জাতীয় বিশ্ববিদ্যালয়, গাজীপুর', scale: 4 },
    Alim: { examTitle: 'আলিম (উচ্চ মাধ্যমিক সমমান)', board: 'বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ড, ঢাকা', scale: 5 },
    HSC: { examTitle: 'এইচএসসি (উচ্চ মাধ্যমিক)', board: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, চট্টগ্রাম', scale: 5 },
    Dakhil: { examTitle: 'দাখিল (মাধ্যমিক সমমান)', board: 'বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ড, ঢাকা', scale: 5 },
    SSC: { examTitle: 'এসএসসি (মাধ্যমিক)', board: 'মাধ্যমিক ও উচ্চ মাধ্যমিক শিক্ষা বোর্ড, চট্টগ্রাম', scale: 5 },
    JDC: { examTitle: 'জেডিসি / অষ্টম শ্রেণি', board: 'বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ড, ঢাকা', scale: 5 },
    Other: { examTitle: 'অন্যান্য সনদপত্র', board: 'সংশ্লিষ্ট শিক্ষা বোর্ড / প্রতিষ্ঠান', scale: 5 }
};

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

    const degreeOptions = DEGREE_LEVELS.map((d) => ({
        value: d.key,
        label: `[Weight ${d.weight}] ${d.labelBng}`
    }));

    const getFieldError = (fieldName, liveResult, currentVal) => {
        if (stepErrors[fieldName]) return stepErrors[fieldName];
        if ((touchedFields[fieldName] || String(currentVal || '').length > 0) && !liveResult.valid) {
            return liveResult.error;
        }
        return '';
    };

    // নতুন শিক্ষাগত যোগ্যতার রো (Row) যোগ করা
    const handleAddQualification = () => {
        if (qualifications.length >= 6) return;
        const newId = `acad_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const nextList = [
            ...qualifications,
            {
                id: newId,
                degreeLevel: 'Alim',
                examTitle: 'আলিম (উচ্চ মাধ্যমিক সমমান)',
                majorOrGroup: 'সাধারণ / বিজ্ঞান',
                boardOrUniversity: 'বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ড, ঢাকা',
                passingYear: '2018',
                gpaOrCgpa: '4.50',
                scale: 5
            }
        ];
        onUpdateField('academicQualifications', nextList);
    };

    // নির্দিষ্ট রো ডিলিট করা
    const handleRemoveQualification = (targetId) => {
        if (qualifications.length <= 1) return;
        const nextList = qualifications.filter((item) => item.id !== targetId);
        onUpdateField('academicQualifications', nextList);
    };

    // নির্দিষ্ট রো-এর ফিল্ড আপডেট করা
    const handleUpdateQualificationRow = (targetId, key, val) => {
        const nextList = qualifications.map((item) => {
            if (item.id !== targetId) return item;

            // যদি ডিগ্রির স্তর পরিবর্তন করা হয়, তবে স্মার্ট সাজেশন বসানো
            if (key === 'degreeLevel') {
                const preset = DEGREE_PRESET_SUGGESTIONS[val];
                if (preset) {
                    return {
                        ...item,
                        degreeLevel: val,
                        examTitle: preset.examTitle,
                        boardOrUniversity: preset.board,
                        scale: preset.scale
                    };
                }
            }

            return {
                ...item,
                [key]: val
            };
        });

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

            {/* =================================================================
                SECTION 2: ACADEMIC QUALIFICATIONS & AUTO-SENIORITY GPA ENGINE
               ================================================================= */}
            <section>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-2 border-b border-ink-faint">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="w-4.5 h-4.5 text-gold-deep" />
                        <div>
                            <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                                ২. শিক্ষাগত যোগ্যতা ও সিজিপিএ/জিপিএ (অটো-র‍্যাংকিং নির্ধারক)
                            </h3>
                        </div>
                    </div>

                    <Button
                        variant="gold"
                        size="xs"
                        leftIcon={Plus}
                        onClick={handleAddQualification}
                        disabled={qualifications.length >= 6}
                    >
                        <span className="font-bengali">আরও ডিগ্রি যোগ করুন ({toBengaliDigits(qualifications.length)}/৬)</span>
                    </Button>
                </div>

                {/* লাইভ সিনিয়রিটি ও র‍্যাংকিং ক্যালকুলেশন ব্যানার */}
                <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-deep via-emerald to-emerald-deep text-white border border-gold/30 shadow-card">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 border border-gold/30 flex items-center justify-center text-gold-soft shrink-0">
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="font-mono text-[10px] uppercase tracking-wider text-gold-soft block">
                                    Auto-Seniority &amp; Merit Engine
                                </span>
                                <h4 className="font-bengali text-sm sm:text-base font-bold text-white">
                                    সর্বোচ্চ ডিগ্রি: <span className="text-gold-soft">{liveRank.highestDegreeLabel}</span> (Weight: {liveRank.highestDegreeWeight})
                                </h4>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 font-mono text-xs">
                            <div className="px-3 py-1.5 rounded-xl bg-black/25 border border-white/10 text-center">
                                <span className="block text-[9px] text-gold-soft uppercase">Best GPA (5.00 Scale)</span>
                                <b className="text-sm text-white">{liveRank.highestNormalizedGpa.toFixed(2)}</b>
                            </div>
                            <div className="px-3 py-1.5 rounded-xl bg-gold/20 border border-gold/40 text-center">
                                <span className="block text-[9px] text-gold-soft uppercase">Composite Score</span>
                                <b className="text-sm text-gold-soft">{liveRank.compositeScore}</b>
                            </div>
                        </div>
                    </div>
                    <p className="font-bengali text-[11px] text-[#EFE9D4]/85 mt-2.5 pt-2 border-t border-white/10 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span>
                            একই পদবীর শিক্ষকদের মধ্যে সিনিয়রিটি নির্ধারিত হবে সর্বোচ্চ ডিগ্রির মান (কামিল/মাস্টার্স = ৫, ফাজিল/অনার্স = ৪) এবং GPA/CGPA অনুযায়ী।
                        </span>
                    </p>
                </div>

                {/* ডায়নামিক শিক্ষাগত যোগ্যতা কার্ডসমূহ */}
                <div className="space-y-4">
                    {qualifications.map((item, idx) => {
                        const rowErr = rowErrorsMap[item.id || idx] || {};
                        const scaleNum = Number(item.scale) === 4 ? 4 : 5;
                        const rawGpa = Number(toEnglishDigits(item.gpaOrCgpa));
                        const normalizedPreview =
                            !isNaN(rawGpa) && rawGpa > 0
                                ? scaleNum === 4
                                    ? ((rawGpa / 4) * 5).toFixed(2)
                                    : rawGpa.toFixed(2)
                                : '0.00';

                        return (
                            <div
                                key={item.id || idx}
                                className="p-4 sm:p-5 rounded-2xl bg-paper border border-ink-faint hover:border-gold/50 transition-all relative"
                            >
                                {/* কার্ড টপ বার */}
                                <div className="flex items-center justify-between gap-2 mb-4 pb-2.5 border-b border-ink-faint">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-emerald text-white font-mono text-xs font-bold flex items-center justify-center">
                                            {idx + 1}
                                        </span>
                                        <span className="font-bengali text-xs sm:text-sm font-bold text-emerald-deep">
                                            সনদপত্র / ডিগ্রি #{toBengaliDigits(idx + 1)}
                                        </span>
                                        <Badge variant="gold" size="sm" mono>
                                            5.00 Eqv: {normalizedPreview}
                                        </Badge>
                                    </div>

                                    {qualifications.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveQualification(item.id)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bengali text-danger hover:bg-danger-bg transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            মুছে ফেলুন
                                        </button>
                                    )}
                                </div>

                                {/* ডিগ্রির ইনপুট গ্রিড */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-1">
                                    <FormSelect
                                        labelEng="Degree Level"
                                        labelBng="ডিগ্রির স্তর"
                                        variant="erp"
                                        value={item.degreeLevel}
                                        onChange={(e) =>
                                            handleUpdateQualificationRow(item.id, 'degreeLevel', e.target.value)
                                        }
                                        options={degreeOptions}
                                        placeholder={false}
                                        required
                                        error={rowErr.degreeLevel}
                                    />

                                    <FormInput
                                        labelEng="Exam / Degree Title"
                                        labelBng="পরীক্ষা বা সনদের নাম"
                                        variant="erp"
                                        value={item.examTitle}
                                        onChange={(e) =>
                                            handleUpdateQualificationRow(item.id, 'examTitle', e.target.value)
                                        }
                                        placeholder="যেমনঃ কামিল / ফাজিল / বি.এসসি"
                                        required
                                        isBengaliText
                                        error={rowErr.examTitle}
                                    />

                                    <FormInput
                                        labelEng="Major / Group"
                                        labelBng="বিভাগ বা মূল বিষয়"
                                        variant="erp"
                                        value={item.majorOrGroup}
                                        onChange={(e) =>
                                            handleUpdateQualificationRow(item.id, 'majorOrGroup', e.target.value)
                                        }
                                        placeholder="যেমনঃ হাদিস / বিজ্ঞান / ইংরেজি"
                                        isBengaliText
                                    />

                                    <FormInput
                                        labelEng="Board / University"
                                        labelBng="বোর্ড বা বিশ্ববিদ্যালয়"
                                        variant="erp"
                                        value={item.boardOrUniversity}
                                        onChange={(e) =>
                                            handleUpdateQualificationRow(
                                                item.id,
                                                'boardOrUniversity',
                                                e.target.value
                                            )
                                        }
                                        placeholder="যেমনঃ মাদ্রাসা শিক্ষা বোর্ড / ইআবি"
                                        required
                                        isBengaliText
                                        error={rowErr.boardOrUniversity}
                                    />

                                    <FormInput
                                        labelEng="Passing Year"
                                        labelBng="পাসের সন (YYYY)"
                                        variant="erp"
                                        inputMode="numeric"
                                        value={item.passingYear}
                                        onChange={(e) => {
                                            const yr = toEnglishDigits(e.target.value).replace(/\D/g, '').slice(0, 4);
                                            handleUpdateQualificationRow(item.id, 'passingYear', yr);
                                        }}
                                        placeholder="যেমনঃ 2022"
                                        required
                                        isMonoText
                                        error={rowErr.passingYear}
                                    />

                                    {/* GPA/CGPA ও Scale (4.00 / 5.00) */}
                                    <div className="grid grid-cols-[1fr_110px] gap-2">
                                        <FormInput
                                            labelEng="GPA / CGPA"
                                            labelBng="প্রাপ্ত পয়েন্ট"
                                            variant="erp"
                                            inputMode="decimal"
                                            value={item.gpaOrCgpa}
                                            onChange={(e) => {
                                                const val = toEnglishDigits(e.target.value).replace(/[^0-9.]/g, '');
                                                handleUpdateQualificationRow(item.id, 'gpaOrCgpa', val);
                                            }}
                                            placeholder={scaleNum === 4 ? '3.75' : '5.00'}
                                            required
                                            isMonoText
                                            error={rowErr.gpaOrCgpa}
                                        />

                                        <FormSelect
                                            labelEng="Scale"
                                            labelBng="স্কেল"
                                            variant="erp"
                                            value={item.scale}
                                            onChange={(e) =>
                                                handleUpdateQualificationRow(item.id, 'scale', Number(e.target.value))
                                            }
                                            options={[
                                                { value: 5, label: 'out of 5.00' },
                                                { value: 4, label: 'out of 4.00' }
                                            ]}
                                            placeholder={false}
                                            isBengaliText={false}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
