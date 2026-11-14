/**
 * ARDM Enterprise ERP — Step 10: Print-Ready Digital Registry ID Card,
 * A4 Official Dossier & Browser/UID Recovery Engine (Completes Part 2!)
 * Run from D:\ardm_teacher: node setup_step10_idcard.js
 */

const fs = require('fs');
const path = require('path');

console.log('🪪 Initializing Step 10: Digital Registry ID Card, A4 Print Dossier & UID Recovery Engine...\n');

const clientDir = fs.existsSync(path.join(__dirname, 'src'))
    ? __dirname
    : path.join(__dirname, 'client');

if (!fs.existsSync(clientDir)) {
    console.error('❌ Error: client directory not found!');
    process.exit(1);
}

const files = {
    // =========================================================================
    // 1. DIGITAL REGISTRY ID CARD & A4 DOSSIER COMPONENT
    // =========================================================================
    'src/pages/public/registration/DigitalRegistryIdCard.jsx': `/**
 * ARDM Enterprise ERP — Official Digital Registry ID Card & Printable A4 Ledger Sheet
 * Features:
 * - Dual View Mode: "ID Card (Front & Back)" vs "Full A4 Registration Certificate"
 * - Royal Seal (ARDM · REGISTRY), 10-Digit Teacher ID, Biometric Device ID, Blood Group Badge
 * - Dynamic SVG Barcode & Verification Matrix
 * - Live Backend Approval Status Sync (Pending -> Approved + Overall Madrasah Rank)
 * - 1-Click Copy ID/UID & Clean A4 Print Layout
 */

import React, { useState } from 'react';
import {
    Printer,
    Copy,
    Check,
    RefreshCw,
    CreditCard,
    FileText,
    ShieldCheck,
    Clock,
    Award,
    Phone,
    MapPin,
    Calendar,
    Droplets,
    Fingerprint,
    UserPlus,
    GraduationCap,
    Sparkles
} from 'lucide-react';
import { INSTITUTION_INFO, DEGREE_LEVELS } from '@constants/app.constants';
import { Button, Badge } from '@components/ui';
import { useToast } from '@context/ToastContext';
import {
    toBengaliDigits,
    formatDisplayDate,
    formatPhoneDisplay,
    calculateLiveRankMetrics
} from '@utils/formatters';
import { cn } from '@utils/cn';

/**
 * ১০-ডিজিট টিচার আইডি থেকে ডায়নামিক ভিজ্যুয়াল বারকোড জেনারেটর (SVG)
 */
function TeacherBarcodeSvg({ code = '1026030301' }) {
    const cleanCode = String(code || '1026030301').replace(/\\D/g, '').padEnd(10, '0');
    const bars = [];

    // প্রতিটি ডিজিট থেকে ইউনিক বার প্যাটার্ন তৈরি
    for (let i = 0; i < cleanCode.length; i++) {
        const digit = Number(cleanCode[i]) || 0;
        bars.push(
            { width: (digit % 3) + 1.5, gap: 1.5 },
            { width: ((digit + 2) % 4) + 1, gap: 2 },
            { width: digit > 5 ? 3 : 1.5, gap: 1.5 }
        );
    }

    let currentX = 4;
    return (
        <svg
            viewBox="0 0 220 36"
            className="w-full h-8 text-emerald-deep"
            aria-label={\`Barcode for Teacher ID \${cleanCode}\`}
        >
            {/* Start Guard Bars */}
            <rect x="0" y="2" width="2" height="32" fill="currentColor" />
            <rect x="4" y="2" width="1.5" height="32" fill="currentColor" />
            {bars.map((b, idx) => {
                currentX += b.width + b.gap;
                if (currentX > 208) return null;
                return (
                    <rect
                        key={idx}
                        x={currentX}
                        y="2"
                        width={b.width}
                        height="28"
                        fill="currentColor"
                    />
                );
            })}
            {/* End Guard Bars */}
            <rect x="213" y="2" width="1.5" height="32" fill="currentColor" />
            <rect x="217" y="2" width="2" height="32" fill="currentColor" />
        </svg>
    );
}

export default function DigitalRegistryIdCard({
    registryRecord,
    onRefreshFromServer,
    isRefreshing = false,
    onStartNewRegistration,
    onLoadSampleDemo
}) {
    const toast = useToast();
    const [viewMode, setViewMode] = useState('BOTH'); // 'CARD_ONLY' | 'DOSSIER_ONLY' | 'BOTH'
    const [copiedKey, setCopiedKey] = useState('');

    if (!registryRecord) return null;

    const teacher = registryRecord.teacher || registryRecord;
    const teacherCode =
        registryRecord.teacherId ||
        teacher.teacherCode ||
        '1026030301';
    const uid = registryRecord.uid || teacher.uid || 'ardm-verified-uid';
    const photoUrl =
        registryRecord.photoUrl ||
        teacher.profilePicture?.url ||
        '';

    const fullNameBng = teacher.fullNameBng || registryRecord.fullNameBng || '—';
    const fullNameEng = teacher.fullNameEng || registryRecord.fullNameEng || '—';
    const designationEng = teacher.designation || registryRecord.designation || 'Assistant Teacher';
    const subject = teacher.subject || 'General';
    const bloodGroup = teacher.bloodGroup || 'O+';
    const phone = teacher.phone || '';
    const emergencyPhone = teacher.emergencyContact?.phone || '';
    const emergencyName = teacher.emergencyContact?.contactName || '';
    const biometricId = teacher.biometricDeviceId || 1;
    const registrationStatus = teacher.registrationStatus || registryRecord.registrationStatus || 'Pending';
    const academicList = Array.isArray(teacher.academicQualifications)
        ? teacher.academicQualifications
        : [];

    const rankMetrics = calculateLiveRankMetrics(designationEng, academicList);
    const overallRank = teacher.rankingMetrics?.overallMadrasahRank || null;

    const presentAddr = teacher.presentAddress || {
        houseOrRoad: 'মীরেরখীল',
        village: 'সরফভাটা',
        postOffice: INSTITUTION_INFO.postOffice,
        postCode: INSTITUTION_INFO.postCode,
        upazila: INSTITUTION_INFO.upazila,
        district: INSTITUTION_INFO.district
    };

    const handleCopyText = (text, keyLabel) => {
        if (!text) return;
        navigator.clipboard?.writeText(String(text));
        setCopiedKey(keyLabel);
        toast.success(\`\${keyLabel} ক্লিপবোর্ডে কপি করা হয়েছে!\`);
        setTimeout(() => setCopiedKey(''), 2200);
    };

    return (
        <div className="space-y-7 animate-fade-up">

            {/* =================================================================
                1. TOP CONTROL BAR (Hidden during A4 Print)
               ================================================================= */}
            <div className="ledger-surface p-4 sm:p-5 bg-paper-panel flex flex-wrap items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald text-gold-soft flex items-center justify-center shrink-0 shadow-xs">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bengali text-base sm:text-lg font-bold text-emerald-deep">
                                অফিশিয়াল ডিজিটাল রেজিস্ট্রি কার্ড ও নিবন্ধন সনদ
                            </h2>
                            <Badge
                                variant={registrationStatus === 'Approved' ? 'success' : 'gold'}
                                size="sm"
                                dot
                            >
                                {registrationStatus === 'Approved'
                                    ? 'অ্যাডমিন কর্তৃক অনুমোদিত (Approved)'
                                    : 'অ্যাডমিন অনুমোদনের অপেক্ষায় (Pending)'}
                            </Badge>
                        </div>
                        <p className="font-bengali text-xs text-ink-soft mt-0.5">
                            ১০ সংখ্যার টিচার আইডি এবং সিলমোহরসহ এই কার্ডটি প্রিন্ট বা পিডিএফ হিসেবে সংরক্ষণ করুন।
                        </p>
                    </div>
                </div>

                {/* ভিউ সুইচার ও অ্যাকশন বাটনসমূহ */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-full p-1 bg-paper-deep border border-ink-faint">
                        {[
                            { key: 'BOTH', label: 'কার্ড + সনদ' },
                            { key: 'CARD_ONLY', label: 'শুধু আইডি কার্ড' },
                            { key: 'DOSSIER_ONLY', label: 'A4 নিবন্ধন সনদ' }
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setViewMode(tab.key)}
                                className={cn(
                                    'px-3 py-1 rounded-full text-xs font-bengali font-semibold transition-all',
                                    viewMode === tab.key
                                        ? 'bg-emerald text-white shadow-xs'
                                        : 'text-ink-soft hover:text-ink'
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {onRefreshFromServer && (
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={RefreshCw}
                            isLoading={isRefreshing}
                            loadingText="যাচাই হচ্ছে..."
                            onClick={onRefreshFromServer}
                        >
                            <span className="font-bengali">স্ট্যাটাস রিফ্রেশ</span>
                        </Button>
                    )}

                    <Button
                        variant="gold"
                        size="sm"
                        leftIcon={Printer}
                        onClick={() => window.print()}
                    >
                        <span className="font-bengali">প্রিন্ট / PDF সেভ করুন</span>
                    </Button>

                    {onStartNewRegistration && (
                        <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={UserPlus}
                            onClick={onStartNewRegistration}
                        >
                            <span className="font-bengali">নতুন নিবন্ধন</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* =================================================================
                2. DUAL PVC-STYLE DIGITAL ID CARDS (FRONT & BACK SIDE)
               ================================================================= */}
            {(viewMode === 'BOTH' || viewMode === 'CARD_ONLY') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

                    {/* ---------------------------------------------------------
                        CARD FRONT SIDE (Royal Emerald & Gold Identity Badge)
                       --------------------------------------------------------- */}
                    <div className="rounded-2xl overflow-hidden border-2 border-gold/50 bg-paper-panel shadow-ledger flex flex-col justify-between relative">
                        {/* কার্ড হেডার ব্যানার */}
                        <div className="bg-gradient-to-r from-emerald-deep via-emerald to-emerald-deep text-white p-5 border-b-2 border-gold relative overflow-hidden">
                            <div className="flex items-center justify-between gap-3 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-full border-2 border-gold bg-paper-panel text-emerald-deep font-serif font-bold text-xl flex items-center justify-center shrink-0 shadow-sm">
                                        {INSTITUTION_INFO.crestLetterBng}
                                    </div>
                                    <div>
                                        <span className="font-mono text-[9.5px] uppercase tracking-widest text-gold-soft block">
                                            Official Staff Identity Card
                                        </span>
                                        <h3 className="font-serif text-lg font-bold text-white leading-tight">
                                            {INSTITUTION_INFO.nameEng}
                                        </h3>
                                        <p className="font-bengali text-xs text-gold-soft/95">
                                            {INSTITUTION_INFO.nameBng} · {INSTITUTION_INFO.postOfficeBng}, {INSTITUTION_INFO.upazilaBng}
                                        </p>
                                    </div>
                                </div>

                                <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-gold/30 font-mono text-[10px] font-bold text-gold-soft shrink-0">
                                    {rankMetrics.staffCategory.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* কার্ড বডি: ৫০০×৫০০ ছবি ও মূল পরিচয় */}
                        <div className="p-5 sm:p-6 flex-1 flex flex-col sm:flex-row items-center sm:items-start gap-5 bg-paper-panel">
                            {/* ছবি ও ব্লাড গ্রুপ ব্যাজ */}
                            <div className="flex flex-col items-center shrink-0">
                                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-gold shadow-gold-glow overflow-hidden bg-paper-deep flex items-center justify-center">
                                    {photoUrl ? (
                                        <img
                                            src={photoUrl}
                                            alt={fullNameEng}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="font-serif text-4xl font-bold text-emerald">
                                            {fullNameBng.charAt(0)}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2.5 flex items-center gap-1.5">
                                    <Badge variant="danger" size="sm" mono>
                                        <Droplets className="w-3 h-3 inline mr-0.5" />
                                        {bloodGroup}
                                    </Badge>
                                    <Badge variant="emerald-subtle" size="sm" mono>
                                        Bio #{biometricId}
                                    </Badge>
                                </div>
                            </div>

                            {/* নাম, পদবী ও ১০-ডিজিট টিচার আইডি */}
                            <div className="flex-1 text-center sm:text-left w-full">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold-subtle border border-gold/40 text-[#5E450B] font-mono text-[10.5px] font-bold mb-1">
                                    <Award className="w-3 h-3 text-gold-deep" />
                                    {overallRank ? \`Madrasah Rank #\${overallRank}\` : \`Base Priority #\${rankMetrics.designationPriority}\`}
                                </div>

                                <h4 className="font-bengali text-xl font-bold text-emerald-deep leading-snug">
                                    {fullNameBng}
                                </h4>
                                <p className="font-sans text-xs font-semibold text-ink-soft uppercase tracking-wide">
                                    {fullNameEng}
                                </p>

                                <div className="mt-2 pt-2 border-t border-ink-faint">
                                    <p className="font-bengali text-sm font-bold text-emerald">
                                        {rankMetrics.designationBng}
                                    </p>
                                    <p className="font-sans text-xs text-ink-muted">
                                        {designationEng} · Subject: <b className="text-ink">{subject}</b>
                                    </p>
                                </div>

                                {/* ১০-ডিজিট টিচার আইডি হাইলাইট বক্স */}
                                <div className="mt-3 p-2.5 rounded-xl bg-emerald-deep text-white border border-gold/40 flex items-center justify-between gap-2">
                                    <div className="text-left">
                                        <span className="font-mono text-[9px] uppercase tracking-widest text-gold-soft block">
                                            10-Digit Teacher ID
                                        </span>
                                        <span className="font-mono text-base sm:text-lg font-bold tracking-widest text-white">
                                            {teacherCode}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyText(teacherCode, '১০-ডিজিট টিচার আইডি')}
                                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-gold-soft transition-colors no-print"
                                        title="আইডি কপি করুন"
                                    >
                                        {copiedKey === '১০-ডিজিট টিচার আইডি' ? (
                                            <Check className="w-4 h-4 text-success" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* কার্ড ফুটার: বারকোড ও মোবাইল নম্বর */}
                        <div className="px-5 py-3 bg-paper-deep border-t border-ink-faint flex items-center justify-between gap-4">
                            <div className="text-xs">
                                <span className="font-bengali text-[10.5px] text-ink-muted block">
                                    নিজস্ব মোবাইল নম্বর:
                                </span>
                                <span className="font-mono font-bold text-emerald-deep">
                                    {formatPhoneDisplay(phone)}
                                </span>
                            </div>

                            <div className="w-44">
                                <TeacherBarcodeSvg code={teacherCode} />
                            </div>
                        </div>
                    </div>

                    {/* ---------------------------------------------------------
                        CARD BACK SIDE (Verification Details, Royal Seal & Signature)
                       --------------------------------------------------------- */}
                    <div className="rounded-2xl overflow-hidden border-2 border-gold/50 bg-paper-panel shadow-ledger flex flex-col justify-between p-5 sm:p-6 relative">
                        <div>
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-ink-faint">
                                <div>
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-gold-deep font-bold block">
                                        Registry Verification &amp; Emergency
                                    </span>
                                    <h4 className="font-bengali text-sm font-bold text-emerald-deep">
                                        স্থায়ী নিবন্ধন ও জরুরি যোগাযোগের তথ্য
                                    </h4>
                                </div>

                                <Badge variant="emerald-subtle" size="sm" mono>
                                    ID: {teacherCode}
                                </Badge>
                            </div>

                            <dl className="space-y-2 text-xs">
                                <div className="flex justify-between gap-3 py-1 border-b border-ink-faint/50">
                                    <dt className="font-bengali text-ink-muted">পিতার নাম:</dt>
                                    <dd className="font-bengali font-semibold text-ink text-right">
                                        {teacher.fathersNameBng || '—'} ({teacher.fathersNameEng || '—'})
                                    </dd>
                                </div>

                                <div className="flex justify-between gap-3 py-1 border-b border-ink-faint/50">
                                    <dt className="font-bengali text-ink-muted">মাতার নাম:</dt>
                                    <dd className="font-bengali font-semibold text-ink text-right">
                                        {teacher.mothersNameBng || '—'} ({teacher.mothersNameEng || '—'})
                                    </dd>
                                </div>

                                <div className="flex justify-between gap-3 py-1 border-b border-ink-faint/50">
                                    <dt className="font-bengali text-ink-muted">পরিচয়পত্র (NID / BRN):</dt>
                                    <dd className="font-mono font-semibold text-ink text-right">
                                        {teacher.nidNumber ? \`NID: \${teacher.nidNumber}\` : ''}
                                        {teacher.nidNumber && teacher.birthRegNumber ? ' | ' : ''}
                                        {teacher.birthRegNumber ? \`BRN: \${teacher.birthRegNumber}\` : ''}
                                    </dd>
                                </div>

                                <div className="flex justify-between gap-3 py-1 border-b border-ink-faint/50">
                                    <dt className="font-bengali text-ink-muted">জন্ম ও যোগদানের তারিখ:</dt>
                                    <dd className="font-bengali text-ink text-right">
                                        {formatDisplayDate(teacher.dateOfBirth, 'bn')} · যোগদান: {formatDisplayDate(teacher.joiningDate, 'bn')}
                                    </dd>
                                </div>

                                <div className="flex justify-between gap-3 py-1 border-b border-ink-faint/50">
                                    <dt className="font-bengali text-ink-muted">জরুরি যোগাযোগ (ভিন্ন নম্বর):</dt>
                                    <dd className="font-bengali font-semibold text-danger text-right">
                                        {emergencyName} — <span className="font-mono">{formatPhoneDisplay(emergencyPhone)}</span>
                                    </dd>
                                </div>

                                <div className="flex justify-between gap-3 py-1">
                                    <dt className="font-bengali text-ink-muted shrink-0">বর্তমান ঠিকানা:</dt>
                                    <dd className="font-bengali text-ink text-right">
                                        {presentAddr.houseOrRoad}, {presentAddr.village}, {presentAddr.postOffice} ({presentAddr.postCode}), {presentAddr.upazila}, {presentAddr.district}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {/* নিচের অংশ: রাজকীয় সিলমোহর, UID এবং সুপারের স্বাক্ষর */}
                        <div className="mt-5 pt-4 border-t border-ink-faint flex items-end justify-between gap-4">
                            <div className="space-y-1">
                                <span className="font-mono text-[9.5px] uppercase text-ink-muted block">
                                    Registry Recovery UID:
                                </span>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-paper-deep border border-ink-faint font-mono text-[10.5px] text-ink-soft">
                                    <span>{String(uid).slice(0, 18)}...</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyText(uid, 'রেজিস্ট্রি UID')}
                                        className="text-emerald hover:text-gold-deep no-print"
                                        title="সম্পূর্ণ UID কপি করুন"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <p className="font-bengali text-[10.5px] text-ink-muted">
                                    এই কার্ডটি পাওয়া গেলে মাদ্রাসার অফিসে জমা দেওয়ার অনুরোধ করা হলো।
                                </p>
                            </div>

                            {/* অফিশিয়াল সিলমোহর (Royal Seal) */}
                            <div className="flex items-center gap-4">
                                <div className="royal-seal animate-seal-in shrink-0">
                                    <span className="font-mono text-[8px] tracking-widest">ARDM · ERP</span>
                                    <span className="font-serif font-bold text-[11px] text-emerald-deep">
                                        {registrationStatus === 'Approved' ? 'APPROVED' : 'REGISTERED'}
                                    </span>
                                    <span className="font-mono text-[9px] font-bold text-gold-deep">
                                        {teacherCode.slice(-4)}
                                    </span>
                                </div>

                                <div className="text-center pt-6 border-t border-ink-soft/40 min-w-[110px]">
                                    <span className="font-bengali text-[11px] font-bold text-emerald-deep block">
                                        সুপারিনটেনডেন্ট
                                    </span>
                                    <span className="font-bengali text-[9.5px] text-ink-muted">
                                        আবদুর রাজ্জাক দাখিল মাদ্রাসা
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================================
                3. FULL A4 PRINTABLE REGISTRATION DOSSIER (অফিশিয়াল নিবন্ধন সনদ)
               ================================================================= */}
            {(viewMode === 'BOTH' || viewMode === 'DOSSIER_ONLY') && (
                <div className="ledger-surface p-6 sm:p-10 bg-paper-panel">
                    {/* ডসিয়ার হেডার */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 mb-6 border-b-2 border-emerald/20">
                        <div className="flex items-center gap-4 text-center sm:text-left">
                            <div className="madrasah-crest shrink-0">
                                {INSTITUTION_INFO.crestLetterBng}
                            </div>
                            <div>
                                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-emerald-deep">
                                    {INSTITUTION_INFO.nameEng}
                                </h2>
                                <p className="font-bengali text-sm font-semibold text-emerald">
                                    {INSTITUTION_INFO.nameBng} · ডাকঘর: {INSTITUTION_INFO.postOfficeBng} ({toBengaliDigits(INSTITUTION_INFO.postCode)}), উপজেলা: {INSTITUTION_INFO.upazilaBng}, জেলা: {INSTITUTION_INFO.districtBng}
                                </p>
                                <p className="font-mono text-[11px] text-ink-muted mt-0.5">
                                    OFFICIAL TEACHER &amp; STAFF REGISTRATION DOSSIER · FORM REG-10
                                </p>
                            </div>
                        </div>

                        <div className="text-center sm:text-right font-mono">
                            <span className="text-[10px] uppercase tracking-wider text-ink-muted block">
                                10-Digit Official ID
                            </span>
                            <span className="text-xl font-bold text-emerald-deep tracking-wider">
                                {teacherCode}
                            </span>
                            <span className="block text-[11px] font-bengali text-gold-deep font-bold">
                                সিনিয়রিটি স্কোর: {rankMetrics.compositeScore}
                            </span>
                        </div>
                    </div>

                    {/* ডসিয়ার মেইন গ্রিড */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-6 mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-xs sm:text-[13px]">
                            <div className="flex justify-between border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">শিক্ষকের নাম (বাংলা):</span>
                                <span className="font-bengali font-bold text-ink">{fullNameBng}</span>
                            </div>
                            <div className="flex justify-between border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">Full Name (English):</span>
                                <span className="font-sans font-bold text-ink">{fullNameEng}</span>
                            </div>
                            <div className="flex justify-between border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">পদবী ও ক্যাটাগরি:</span>
                                <span className="font-bengali font-bold text-emerald-deep">
                                    {rankMetrics.designationBng} ({rankMetrics.staffCategory})
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">পাঠদানের বিষয় / বিভাগ:</span>
                                <span className="font-bengali font-semibold text-ink">{subject}</span>
                            </div>
                            <div className="flex justify-between border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">পিতার নাম (বাংলা ও ইংরেজি):</span>
                                <span className="font-bengali font-semibold text-ink">
                                    {teacher.fathersNameBng} ({teacher.fathersNameEng})
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">মাতার নাম (বাংলা ও ইংরেজি):</span>
                                <span className="font-bengali font-semibold text-ink">
                                    {teacher.mothersNameBng} ({teacher.mothersNameEng})
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">জন্ম তারিখ ও রক্তের গ্রুপ:</span>
                                <span className="font-bengali font-semibold text-ink">
                                    {formatDisplayDate(teacher.dateOfBirth, 'bn')} · Blood: <b className="font-mono text-danger">{bloodGroup}</b>
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">মাদ্রাসায় যোগদানের তারিখ:</span>
                                <span className="font-bengali font-semibold text-ink">
                                    {formatDisplayDate(teacher.joiningDate, 'bn')}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">জাতীয় পরিচয়পত্র / জন্ম নিবন্ধন:</span>
                                <span className="font-mono font-bold text-ink">
                                    {teacher.nidNumber || teacher.birthRegNumber || '—'}
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">মোবাইল ও জরুরি নম্বর:</span>
                                <span className="font-mono font-semibold text-ink">
                                    {formatPhoneDisplay(phone)} | Emg: {formatPhoneDisplay(emergencyPhone)}
                                </span>
                            </div>
                        </div>

                        {/* ডান পাশে অফিশিয়াল ৫০০×৫০০ ছবি ফ্রেম */}
                        <div className="flex flex-col items-center justify-start">
                            <div className="w-36 h-36 rounded-2xl border-2 border-gold overflow-hidden bg-paper-deep shadow-sm flex items-center justify-center">
                                {photoUrl ? (
                                    <img
                                        src={photoUrl}
                                        alt={fullNameEng}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="font-serif text-4xl font-bold text-emerald">
                                        {fullNameBng.charAt(0)}
                                    </span>
                                )}
                            </div>
                            <span className="mt-2 font-mono text-[10px] text-ink-muted">
                                Biometric Device ID: #{biometricId}
                            </span>
                        </div>
                    </div>

                    {/* শিক্ষাগত যোগ্যতা ও সিজিপিএ ছক */}
                    {academicList.length > 0 && (
                        <div className="mb-6">
                            <h4 className="font-bengali text-xs font-bold text-emerald-deep uppercase tracking-wider mb-2">
                                শিক্ষাগত যোগ্যতা ও সিনিয়রিটি মূল্যায়ন ছক (Academic Qualifications):
                            </h4>
                            <div className="overflow-x-auto rounded-xl border border-ink-faint">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-paper-deep border-b border-ink-faint font-bengali text-emerald-deep">
                                            <th className="py-2 px-3">ডিগ্রির স্তর</th>
                                            <th className="py-2 px-3">পরীক্ষার নাম ও বিভাগ</th>
                                            <th className="py-2 px-3">বোর্ড / বিশ্ববিদ্যালয়</th>
                                            <th className="py-2 px-3 text-center">পাসের সন</th>
                                            <th className="py-2 px-3 text-right">প্রাপ্ত GPA / CGPA</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-ink-faint font-bengali">
                                        {academicList.map((q, idx) => {
                                            const degObj = DEGREE_LEVELS.find((d) => d.key === q.degreeLevel);
                                            return (
                                                <tr key={idx}>
                                                    <td className="py-2 px-3 font-bold text-emerald-deep">
                                                        {degObj ? degObj.labelBng : q.degreeLevel}
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        {q.examTitle} {q.majorOrGroup ? \`(\${q.majorOrGroup})\` : ''}
                                                    </td>
                                                    <td className="py-2 px-3">{q.boardOrUniversity}</td>
                                                    <td className="py-2 px-3 text-center font-mono">{q.passingYear}</td>
                                                    <td className="py-2 px-3 text-right font-mono font-bold">
                                                        {q.gpaOrCgpa} / {q.scale}.00
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ডসিয়ার স্বাক্ষর ফুটার */}
                    <div className="mt-10 pt-6 border-t border-ink-faint flex flex-wrap items-end justify-between gap-6">
                        <div className="text-xs font-bengali text-ink-soft">
                            <p>নিবন্ধনের তারিখ: {formatDisplayDate(registryRecord.registeredAt || new Date(), 'bn')}</p>
                            <p className="font-mono text-[10px] text-ink-muted mt-0.5">
                                Digital Verification UID: {uid}
                            </p>
                        </div>

                        <div className="flex items-center gap-12">
                            <div className="text-center border-t border-ink-soft/50 pt-2 min-w-[130px]">
                                <span className="font-bengali text-xs font-bold text-ink block">
                                    শিক্ষকের স্বাক্ষর
                                </span>
                            </div>
                            <div className="text-center border-t border-ink-soft/50 pt-2 min-w-[150px]">
                                <span className="font-bengali text-xs font-bold text-emerald-deep block">
                                    সুপারিনটেনডেন্টের স্বাক্ষর ও সিল
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}`,

    // =========================================================================
    // 2. UPDATE PublicRegistrationLedger.jsx WITH UID RECOVERY & DEMO CARD PREVIEW
    // =========================================================================
    'src/pages/public/registration/PublicRegistrationLedger.jsx': `/**
 * ARDM Enterprise ERP — Public Teacher Registration Master Ledger Shell (Completed in Step 10)
 * Complete Part 2 Integration:
 * - 4-Step Military-Validated Registration Ledger
 * - Returning User Saved Digital ID Card Recovery (localStorage)
 * - Manual UID Lookup Modal (/teachers/public/registry-card/:uid)
 * - Instant Sample ID Card Preview Mode for testing Print & Barcode
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
    Sparkles,
    Eye
} from 'lucide-react';
import { INSTITUTION_INFO, STORAGE_KEYS } from '@constants/app.constants';
import { Button, Badge, Modal, FormInput, ConfirmDialog } from '@components/ui';
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
import DigitalRegistryIdCard from './DigitalRegistryIdCard';

// তাৎক্ষণিক প্রিন্ট ও ডিজাইন চেক করার জন্য একটি নমুনা (Sample) ভেরিফায়েড রেজিস্ট্রি রেকর্ড
function createSampleVerifiedRecord() {
    return {
        uid: 'ardm-2026-sample-verified-uid-1026030301',
        teacherId: '1026030301',
        registrationStatus: 'Approved',
        registeredAt: new Date().toISOString(),
        teacher: {
            teacherCode: '1026030301',
            biometricDeviceId: 3,
            fullNameBng: 'মোঃ রায়সুল ইসলাম সাঈদ',
            fullNameEng: 'Mohmmad Raisul Islam Saied',
            fathersNameBng: 'মোঃ রফিকুল ইসলাম',
            fathersNameEng: 'Md. Rafiqul Islam',
            mothersNameBng: 'নেশা বেগম',
            mothersNameEng: 'Nesha Begum',
            designation: 'Assistant Teacher',
            subject: 'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)',
            bloodGroup: 'O+',
            gender: 'Male',
            religion: 'Islam',
            maritalStatus: 'Single',
            nidNumber: '2003159700123',
            dateOfBirth: '2003-07-30',
            joiningDate: '2026-08-01',
            phone: '01812345678',
            emergencyContact: {
                contactName: 'মোঃ রফিকুল ইসলাম',
                relationship: 'Father',
                phone: '01711223344'
            },
            presentAddress: {
                houseOrRoad: 'মীরেরখীল',
                village: 'সরফভাটা',
                postOffice: 'Sarafbhata',
                postCode: '4360',
                upazila: 'Rangunia',
                district: 'Chittagong'
            },
            academicQualifications: [
                {
                    degreeLevel: 'Honours',
                    examTitle: 'বি.এসসি (অনার্স)',
                    majorOrGroup: 'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)',
                    boardOrUniversity: 'জাতীয় বিশ্ববিদ্যালয়',
                    passingYear: 2025,
                    gpaOrCgpa: 3.75,
                    scale: 4
                },
                {
                    degreeLevel: 'HSC',
                    examTitle: 'এইচএসসি',
                    majorOrGroup: 'বিজ্ঞান',
                    boardOrUniversity: 'চট্টগ্রাম বোর্ড',
                    passingYear: 2021,
                    gpaOrCgpa: 5.00,
                    scale: 5
                }
            ],
            rankingMetrics: {
                overallMadrasahRank: 3
            }
        }
    };
}

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
            const res = await axiosClient.get(\`/teachers/public/registry-card/\${cleanUid}\`);
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

    const handleFinalSubmit = async () => {
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

                    {/* পূর্বে নিবন্ধিত কার্ড খোঁজা বা ডেমো আইডি কার্ড দেখার কুইক বার */}
                    <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsUidModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-paper-panel border border-ink-faint hover:border-gold text-xs font-bengali font-medium text-emerald-deep shadow-2xs transition-all"
                        >
                            <Search className="w-3.5 h-3.5 text-gold-deep" />
                            পূর্বে নিবন্ধিত? UID দিয়ে আইডি কার্ড খুঁজুন
                        </button>

                        {!submittedRegistryRecord && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSubmittedRegistryRecord(createSampleVerifiedRecord());
                                    toast.info('নমুনা (Sample) ডিজিটাল রেজিস্ট্রি আইডি কার্ড ও সনদ লোড হয়েছে!');
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-subtle border border-emerald-border hover:bg-emerald hover:text-white text-xs font-bengali font-semibold text-emerald transition-all"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                নমুনা ডিজিটাল আইডি কার্ড দেখুন
                            </button>
                        )}
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
                        onRefreshFromServer={() => {
                            if (submittedRegistryRecord.uid?.startsWith('ardm-2026-sample')) {
                                toast.info('এটি একটি নমুনা (Sample) কার্ড। আসল নিবন্ধনের ক্ষেত্রে সার্ভার থেকে লাইভ স্ট্যাটাস আপডেট হবে।');
                                return;
                            }
                            fetchRegistryCardByUid(submittedRegistryRecord.uid);
                        }}
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
}`
};

Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(clientDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
    console.log(`✅ Created/Updated File: client/${filePath}`);
});

console.log('\n🎉 Step 10 (Digital Registry ID Card, A4 Print Dossier & UID Recovery) Completed!');