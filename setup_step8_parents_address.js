/**
 * ARDM Enterprise ERP — Step 8: Registration Step 2 (Bilingual Parents & Dynamic Academic GPA Ranking)
 * & Step 3 (Verified Mobile, Distinct Emergency Contact & Editable Sarafbhata Address)
 * Run from D:\ardm_teacher: node setup_step8_parents_address.js
 */

const fs = require('fs');
const path = require('path');

console.log('🎓 Initializing Step 8: Step 2 (Parents & Academic GPA Engine) & Step 3 (Address & Contact)...\n');

const clientDir = fs.existsSync(path.join(__dirname, 'src'))
    ? __dirname
    : path.join(__dirname, 'client');

if (!fs.existsSync(clientDir)) {
    console.error('❌ Error: client directory not found!');
    process.exit(1);
}

const files = {
    // =========================================================================
    // 1. STEP 2 COMPONENT: BILINGUAL PARENTS & DYNAMIC ACADEMIC QUALIFICATIONS
    // =========================================================================
    'src/pages/public/registration/Step2ParentsAcademic.jsx': `/**
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
                rowErr.passingYear = \`জন্মসাল (\${birthYear})-এর সাথে পাসের সন (\${passYear}) সামঞ্জস্যপূর্ণ নয়।\`;
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
        label: \`[Weight \${d.weight}] \${d.labelBng}\`
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
        const newId = \`acad_\${Date.now()}_\${Math.random().toString(36).slice(2, 6)}\`;
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
                                            const yr = toEnglishDigits(e.target.value).replace(/\\D/g, '').slice(0, 4);
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
}`,

    // =========================================================================
    // 2. STEP 3 COMPONENT: CONTACT, EMERGENCY & EDITABLE SARAFBHATA ADDRESS
    // =========================================================================
    'src/pages/public/registration/Step3AddressContact.jsx': `/**
 * ARDM Enterprise ERP — Registration Step 3: Contact, Emergency & Address
 * Enforces Military-Grade Validation on:
 * - Primary 11-Digit BD Mobile Number (auto-converts Bengali digits & +88)
 * - Emergency Contact Number (MUST be strictly different from Primary Mobile)
 * - Present & Permanent Address (Editable Default: Sarafbhata, 4360, Rangunia, Chittagong)
 */

import React, { useState } from 'react';
import {
    Phone,
    PhoneCall,
    Mail,
    MapPin,
    Home,
    Lock,
    Unlock,
    CopyCheck,
    ShieldAlert
} from 'lucide-react';
import { INSTITUTION_INFO } from '@constants/app.constants';
import { FormInput, FormSelect, Badge } from '@components/ui';
import {
    validateMobileNumber,
    validateEmergencyPhone,
    validateAddressField,
    sanitizeText
} from '@utils/validators';
import { extractPureDigits } from '@utils/formatters';
import { cn } from '@utils/cn';

const RELATIONSHIP_OPTIONS = [
    { value: 'Father', label: 'পিতা (Father)' },
    { value: 'Mother', label: 'মাতা (Mother)' },
    { value: 'Spouse', label: 'স্বামী / স্ত্রী (Spouse)' },
    { value: 'Brother', label: 'ভাই (Brother)' },
    { value: 'Guardian', label: 'অভিভাবক / আত্মীয় (Guardian)' },
    { value: 'Other', label: 'অন্যান্য (Other)' }
];

/**
 * পুরো Step 3-এর সকল ফিল্ড একসাথে ভ্যালিডেট করার এক্সপোর্টেড ফাংশন
 */
export function validateStep3AddressContactData(formData) {
    const errors = {};

    const phoneCheck = validateMobileNumber(formData.phone, 'শিক্ষকের মোবাইল নম্বর');
    if (!phoneCheck.valid) errors.phone = phoneCheck.error;

    const emName = sanitizeText(formData.emergencyContact?.contactName || '');
    if (!emName || emName.length < 2) {
        errors.emergencyContactName = 'জরুরি যোগাযোগের ব্যক্তির নাম উল্লেখ করা আবশ্যক।';
    }

    const emPhoneCheck = validateEmergencyPhone(
        formData.emergencyContact?.phone,
        formData.phone
    );
    if (!emPhoneCheck.valid) errors.emergencyPhone = emPhoneCheck.error;

    if (formData.email && String(formData.email).trim().length > 0) {
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        if (!emailRegex.test(String(formData.email).trim())) {
            errors.email = 'সঠিক ইমেইল অ্যাড্রেস প্রদান করুন (অথবা খালি রাখুন)।';
        }
    }

    const houseCheck = validateAddressField(
        formData.presentAddress?.houseOrRoad,
        'বাড়ি বা রাস্তার নাম'
    );
    if (!houseCheck.valid) errors.presentHouseOrRoad = houseCheck.error;

    const villageCheck = validateAddressField(
        formData.presentAddress?.village,
        'গ্রামের নাম'
    );
    if (!villageCheck.valid) errors.presentVillage = villageCheck.error;

    const postOfficeCheck = validateAddressField(
        formData.presentAddress?.postOffice,
        'ডাকঘর (Post Office)'
    );
    if (!postOfficeCheck.valid) errors.presentPostOffice = postOfficeCheck.error;

    const upazilaCheck = validateAddressField(
        formData.presentAddress?.upazila,
        'উপজেলা / থানা'
    );
    if (!upazilaCheck.valid) errors.presentUpazila = upazilaCheck.error;

    const districtCheck = validateAddressField(
        formData.presentAddress?.district,
        'জেলা'
    );
    if (!districtCheck.valid) errors.presentDistrict = districtCheck.error;

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

export default function Step3AddressContact({
    formData,
    onUpdateField,
    touchedFields = {},
    onBlurField,
    stepErrors = {}
}) {
    // সরফভাটা ডিফল্ট ঠিকানা এডিট আনলক স্টেট (অন্য ইউনিয়ন বা উপজেলার শিক্ষকদের জন্য)
    const [unlockDefaultRegion, setUnlockDefaultRegion] = useState(false);

    const phoneLive = validateMobileNumber(formData.phone, 'শিক্ষকের মোবাইল নম্বর');
    const emPhoneLive = validateEmergencyPhone(
        formData.emergencyContact?.phone,
        formData.phone
    );
    const houseLive = validateAddressField(
        formData.presentAddress?.houseOrRoad,
        'বাড়ি বা রাস্তার নাম'
    );
    const villageLive = validateAddressField(
        formData.presentAddress?.village,
        'গ্রামের নাম'
    );

    const getFieldError = (fieldKey, liveCheck, val) => {
        if (stepErrors[fieldKey]) return stepErrors[fieldKey];
        if ((touchedFields[fieldKey] || String(val || '').length > 0) && !liveCheck.valid) {
            return liveCheck.error;
        }
        return '';
    };

    // বর্তমান ঠিকানা আপডেট হ্যান্ডলার (sameAsPresentAddress চালু থাকলে স্থায়ী ঠিকানাও একসাথে আপডেট হবে)
    const handlePresentAddressChange = (subKey, value) => {
        const updatedPresent = {
            ...formData.presentAddress,
            [subKey]: value
        };
        onUpdateField('presentAddress', updatedPresent);

        if (formData.sameAsPresentAddress) {
            onUpdateField('permanentAddress', updatedPresent);
        }
    };

    const handleEmergencyChange = (subKey, value) => {
        onUpdateField('emergencyContact', {
            ...formData.emergencyContact,
            [subKey]: value
        });
    };

    // মোবাইল নম্বর ইনপুট নরমালাইজার (+8801... পেস্ট করলেও ১১ ডিজিট করে নেবে)
    const normalizePhoneInput = (rawVal) => {
        let digits = extractPureDigits(rawVal);
        if (digits.startsWith('8801') && digits.length >= 13) {
            digits = digits.slice(2);
        }
        return digits.slice(0, 11);
    };

    return (
        <div className="space-y-8 animate-fade-up">

            {/* =================================================================
                SECTION 1: VERIFIED MOBILE, EMAIL & DISTINCT EMERGENCY CONTACT
               ================================================================= */}
            <section>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-2 border-b border-ink-faint">
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald" />
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                            ১. নিজস্ব মোবাইল নম্বর ও জরুরি যোগাযোগ (ভিন্ন নম্বর বাধ্যতামূলক)
                        </h3>
                    </div>
                    <Badge variant="gold" size="sm">
                        লগইন ইউজারনেম হিসেবে ব্যবহৃত হবে
                    </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-1">
                    <FormInput
                        labelEng="Personal Mobile Number"
                        labelBng="শিক্ষকের নিজস্ব সচল মোবাইল নম্বর"
                        name="phone"
                        inputMode="tel"
                        leftIcon={Phone}
                        value={formData.phone}
                        onChange={(e) => onUpdateField('phone', normalizePhoneInput(e.target.value))}
                        onBlur={() => onBlurField('phone')}
                        placeholder="018XXXXXXXX"
                        required
                        isMonoText
                        showValidIcon
                        isValid={phoneLive.valid}
                        error={getFieldError('phone', phoneLive, formData.phone)}
                        hint="১১ সংখ্যার বাংলাদেশী নম্বর (বাংলা বা ইংরেজি যেকোনো সংখ্যায় লিখুন)।"
                    />

                    <FormInput
                        labelEng="Email Address (Optional)"
                        labelBng="ইমেইল অ্যাড্রেস (যদি থাকে — ঐচ্ছিক)"
                        name="email"
                        type="email"
                        leftIcon={Mail}
                        value={formData.email}
                        onChange={(e) => onUpdateField('email', e.target.value)}
                        onBlur={() => onBlurField('email')}
                        placeholder="teacher@example.com"
                        error={stepErrors.email || ''}
                        hint="পাসওয়ার্ড রিকভারি ও নোটিফিকেশনের জন্য (না থাকলে খালি রাখুন)।"
                    />
                </div>

                {/* জরুরি যোগাযোগের বক্স */}
                <div className="mt-2 p-4 sm:p-5 rounded-2xl bg-paper border border-ink-faint">
                    <div className="flex items-center gap-2 mb-3">
                        <PhoneCall className="w-4 h-4 text-gold-deep" />
                        <h4 className="font-bengali text-xs sm:text-sm font-bold text-emerald-deep">
                            জরুরি প্রয়োজনে পরিবারের যার সাথে যোগাযোগ করা যাবে (Emergency Contact)
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-1">
                        <FormInput
                            labelEng="Contact Person"
                            labelBng="অভিভাবক / ব্যক্তির নাম"
                            variant="erp"
                            value={formData.emergencyContact?.contactName || ''}
                            onChange={(e) => handleEmergencyChange('contactName', e.target.value)}
                            placeholder="যেমনঃ মোঃ রফিকুল ইসলাম"
                            required
                            isBengaliText
                            error={stepErrors.emergencyContactName || ''}
                        />

                        <FormSelect
                            labelEng="Relationship"
                            labelBng="সম্পর্ক"
                            variant="erp"
                            value={formData.emergencyContact?.relationship || 'Guardian'}
                            onChange={(e) => handleEmergencyChange('relationship', e.target.value)}
                            options={RELATIONSHIP_OPTIONS}
                            placeholder={false}
                            required
                        />

                        <FormInput
                            labelEng="Emergency Mobile"
                            labelBng="জরুরি মোবাইল নম্বর (ভিন্ন)"
                            variant="erp"
                            inputMode="tel"
                            value={formData.emergencyContact?.phone || ''}
                            onChange={(e) =>
                                handleEmergencyChange('phone', normalizePhoneInput(e.target.value))
                            }
                            onBlur={() => onBlurField('emergencyPhone')}
                            placeholder="017XXXXXXXX"
                            required
                            isMonoText
                            showValidIcon
                            isValid={emPhoneLive.valid}
                            error={getFieldError(
                                'emergencyPhone',
                                emPhoneLive,
                                formData.emergencyContact?.phone
                            )}
                        />
                    </div>

                    <p className="font-bengali text-[11px] text-ink-soft flex items-center gap-1.5 mt-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-gold-deep shrink-0" />
                        <span>
                            নিরাপত্তা নীতিমালা অনুযায়ী শিক্ষকের নিজের মোবাইল নম্বর এবং জরুরি যোগাযোগের নম্বর কখনোই এক হতে পারবে না।
                        </span>
                    </p>
                </div>
            </section>

            {/* =================================================================
                SECTION 2: PRESENT & PERMANENT ADDRESS (Sarafbhata Default + Editable)
               ================================================================= */}
            <section>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2 border-b border-ink-faint">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald" />
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                            ২. বর্তমান ও স্থায়ী ঠিকানা (সরফভাটা ডিফল্ট প্রি-সেট সহ)
                        </h3>
                    </div>

                    {/* অন্য ইউনিয়ন বা উপজেলার শিক্ষক হলে ডিফল্ট ঠিকানা আনলক করার বাটন */}
                    <button
                        type="button"
                        onClick={() => setUnlockDefaultRegion((prev) => !prev)}
                        className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bengali font-semibold border transition-all',
                            unlockDefaultRegion
                                ? 'bg-gold-subtle border-gold text-emerald-deep'
                                : 'bg-emerald-subtle border-emerald-border text-emerald hover:bg-emerald hover:text-white'
                        )}
                    >
                        {unlockDefaultRegion ? (
                            <>
                                <Unlock className="w-3.5 h-3.5" />
                                ডাকঘর ও উপজেলা এডিট চালু আছে
                            </>
                        ) : (
                            <>
                                <Lock className="w-3.5 h-3.5" />
                                অন্য ইউনিয়ন/উপজেলা হলে ক্লিক করে পরিবর্তন করুন
                            </>
                        )}
                    </button>
                </div>

                {/* বাড়ি/রাস্তা এবং গ্রাম */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-1">
                    <FormInput
                        labelEng="House / Road / Para"
                        labelBng="বাড়ির নাম / রাস্তার নাম / পাড়া"
                        name="presentHouseOrRoad"
                        leftIcon={Home}
                        value={formData.presentAddress?.houseOrRoad || ''}
                        onChange={(e) => handlePresentAddressChange('houseOrRoad', e.target.value)}
                        onBlur={() => onBlurField('presentHouseOrRoad')}
                        placeholder="যেমনঃ মীরেরখীল, সিকদার বাড়ি"
                        required
                        showValidIcon
                        isValid={houseLive.valid}
                        error={getFieldError(
                            'presentHouseOrRoad',
                            houseLive,
                            formData.presentAddress?.houseOrRoad
                        )}
                        hint="আপনার আগের ফর্মের মতো বাড়ি বা মহল্লার নাম লিখুন।"
                    />

                    <FormInput
                        labelEng="Village / Ward"
                        labelBng="গ্রাম / ওয়ার্ড"
                        name="presentVillage"
                        value={formData.presentAddress?.village || ''}
                        onChange={(e) => handlePresentAddressChange('village', e.target.value)}
                        onBlur={() => onBlurField('presentVillage')}
                        placeholder="যেমনঃ মীরেরখীল (Mirerkhil)"
                        required
                        showValidIcon
                        isValid={villageLive.valid}
                        error={getFieldError(
                            'presentVillage',
                            villageLive,
                            formData.presentAddress?.village
                        )}
                        hint="গ্রামের নাম বাংলা বা ইংরেজিতে লিখুন।"
                    />
                </div>

                {/* ডিফল্ট সরফভাটা, ৪৩৬০, রাঙ্গুনিয়া, চট্টগ্রাম (লক/আনলক সুবিধা সহ) */}
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-1 mt-1">
                    <FormInput
                        labelEng="Post Office"
                        labelBng="ডাকঘর"
                        variant="erp"
                        value={formData.presentAddress?.postOffice || INSTITUTION_INFO.postOffice}
                        onChange={(e) => handlePresentAddressChange('postOffice', e.target.value)}
                        readOnly={!unlockDefaultRegion}
                        required
                        error={stepErrors.presentPostOffice || ''}
                    />

                    <FormInput
                        labelEng="Post Code"
                        labelBng="পোস্ট কোড"
                        variant="erp"
                        inputMode="numeric"
                        value={formData.presentAddress?.postCode || INSTITUTION_INFO.postCode}
                        onChange={(e) =>
                            handlePresentAddressChange(
                                'postCode',
                                extractPureDigits(e.target.value).slice(0, 4)
                            )
                        }
                        readOnly={!unlockDefaultRegion}
                        isMonoText
                        required
                    />

                    <FormInput
                        labelEng="Upazila"
                        labelBng="উপজেলা / থানা"
                        variant="erp"
                        value={formData.presentAddress?.upazila || INSTITUTION_INFO.upazila}
                        onChange={(e) => handlePresentAddressChange('upazila', e.target.value)}
                        readOnly={!unlockDefaultRegion}
                        required
                        error={stepErrors.presentUpazila || ''}
                    />

                    <FormInput
                        labelEng="District"
                        labelBng="জেলা"
                        variant="erp"
                        value={formData.presentAddress?.district || INSTITUTION_INFO.district}
                        onChange={(e) => handlePresentAddressChange('district', e.target.value)}
                        readOnly={!unlockDefaultRegion}
                        required
                        error={stepErrors.presentDistrict || ''}
                    />
                </div>

                {/* স্থায়ী ঠিকানা ও বর্তমান ঠিকানা একই কি না তার চেকবক্স */}
                <div className="mt-3 pt-3 border-t border-ink-faint flex items-center justify-between flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={Boolean(formData.sameAsPresentAddress)}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                onUpdateField('sameAsPresentAddress', checked);
                                if (checked) {
                                    onUpdateField('permanentAddress', { ...formData.presentAddress });
                                }
                            }}
                            className="w-4 h-4 accent-emerald rounded cursor-pointer"
                        />
                        <span className="font-bengali text-xs sm:text-sm font-medium text-emerald-deep flex items-center gap-1.5">
                            <CopyCheck className="w-4 h-4 text-gold-deep" />
                            আমার স্থায়ী ঠিকানা এবং বর্তমান ঠিকানা একই
                        </span>
                    </label>

                    <span className="font-mono text-[11px] text-ink-muted">
                        Default: {INSTITUTION_INFO.postOffice} ({INSTITUTION_INFO.postCode}), {INSTITUTION_INFO.upazila}
                    </span>
                </div>
            </section>
        </div>
    );
}`,

    // =========================================================================
    // 3. UPDATE PublicRegistrationLedger.jsx TO PLUG IN STEPS 1, 2 & 3
    // =========================================================================
    'src/pages/public/registration/PublicRegistrationLedger.jsx': `/**
 * ARDM Enterprise ERP — Public Teacher Registration Master Ledger Shell (Updated in Step 8)
 * Integrates:
 * - Step 1: Personal & Identity (Step1PersonalIdentity)
 * - Step 2: Bilingual Parents & Dynamic Academic GPA Engine (Step2ParentsAcademic)
 * - Step 3: Verified Mobile, Distinct Emergency Contact & Address (Step3AddressContact)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    RotateCcw,
    ShieldCheck,
    CreditCard,
    Camera,
    CheckCircle2
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
import Step2ParentsAcademic, { validateStep2ParentsAcademicData } from './Step2ParentsAcademic';
import Step3AddressContact, { validateStep3AddressContactData } from './Step3AddressContact';

export default function PublicRegistrationLedger() {
    const toast = useToast();
    const ledgerTopRef = useRef(null);

    const savedDraft = loadRegistrationDraft();
    const [currentStep, setCurrentStep] = useState(savedDraft ? savedDraft.step : 0);
    const [formData, setFormData] = useState(
        savedDraft ? savedDraft.data : createInitialRegistrationData()
    );
    const [touchedFields, setTouchedFields] = useState({});
    const [stepErrors, setStepErrors] = useState({});
    const [completedSteps, setCompletedSteps] = useState({});
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

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

    // স্টেপ ১, ২ এবং ৩-এর জন্য কড়া মিলিটারি গেটকিপার চেক
    const handleNextStep = () => {
        if (currentStep === 0) {
            const check1 = validateStep1PersonalData(formData);
            if (!check1.valid) {
                setStepErrors(check1.errors);
                const firstMsg = Object.values(check1.errors)[0];
                toast.error(firstMsg || 'ধাপ ১-এর লাল চিহ্নিত ঘরগুলো সঠিকভাবে পূরণ করুন।');
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
                const firstMsg = Object.values(check3.errors)[0];
                toast.error(firstMsg || 'মোবাইল নম্বর ও ঠিকানার ঘরগুলো সঠিকভাবে পূরণ করুন।');
                return;
            }
        }

        setStepErrors({});
        setCompletedSteps((prev) => ({ ...prev, [currentStep]: true }));

        if (currentStep < REGISTRATION_STEPS.length - 1) {
            setCurrentStep((prev) => prev + 1);
            scrollToLedgerTop();
        } else {
            toast.success('পরবর্তী ধাপ ৯-এ ছবি ক্রপিং ও রিভিউ সাবমিশন যুক্ত হচ্ছে!');
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 0) {
            setStepErrors({});
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

                {/* ২. সংরক্ষিত রেজিস্ট্রি কার্ড ব্যানার */}
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

                {/* ৩. মেইন রেজিস্ট্রেশন লেজার কার্ড */}
                <main ref={ledgerTopRef} className="ledger-surface animate-fade-up">
                    <div className="grid grid-cols-1 md:grid-cols-[265px_1fr] min-h-[600px]">

                        {/* বাম পাশের রেসপনসিভ স্টেপার */}
                        <RegistrationStepper
                            steps={REGISTRATION_STEPS}
                            currentStep={currentStep}
                            completedSteps={completedSteps}
                            onStepSelect={(idx) => {
                                setStepErrors({});
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

                                {/* স্টেপ ২: পিতা-মাতা ও শিক্ষাগত যোগ্যতা (GPA র‍্যাংকিং ইঞ্জিন) */}
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

                                {/* স্টেপ ৪ প্লেসহোল্ডার (ধাপ ৯-এ যুক্ত হবে) */}
                                {currentStep === 3 && (
                                    <div className="p-6 rounded-2xl bg-paper border border-ink-faint text-center animate-fade-up">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-subtle text-emerald flex items-center justify-center">
                                            <Camera className="w-6 h-6" />
                                        </div>
                                        <Badge variant="success" size="md" dot className="mb-2">
                                            ধাপ ১, ২ এবং ৩ ভ্যালিডেশন শতভাগ উত্তীর্ণ!
                                        </Badge>
                                        <h3 className="font-bengali text-lg font-bold text-emerald-deep mt-1">
                                            পরবর্তী মাইক্রো-ধাপ ৯: ৫০০×৫০০ ছবি ক্রপার ও রিভিউ লেজার
                                        </h3>
                                        <p className="font-bengali text-xs text-ink-soft max-w-md mx-auto mt-1 leading-relaxed">
                                            ধাপ ৯-এ আমরা ৫০০×৫০০ পিক্সেল অটো-স্কয়ার ফটো আপলোডার, সকল তথ্যের রিভিউ সামারি এবং শপথনামা টিক দিয়ে ডাটাবেসে সাবমিট করার অংশটি সম্পন্ন করব।
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* বটম নেভিগেশন বার */}
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

console.log('\n🎉 Step 8 (Registration Step 2: Parents & Academic GPA + Step 3: Address & Contact) Completed!');