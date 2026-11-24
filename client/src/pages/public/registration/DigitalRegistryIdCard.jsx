/**
 * ARDM Enterprise ERP — Official Digital Registry ID Card & Printable A4 Ledger Sheet
 * Features:
 * - Dual View Mode: "ID Card (Front & Back)" vs "Full A4 Registration Certificate"
 * - Royal Seal (ARDM · ERP), 10-Digit Teacher ID, Biometric Device ID, Blood Group Badge
 * - Dynamic SVG Barcode & Verification Matrix
 * - Live Backend Approval Status Sync (Pending / Approved / Rejected + Overall Madrasah Rank)
 * - 1-Click Copy ID/UID with Safe Clipboard Fallback & Clean A4 Print Layout
 */

import { Badge, Button } from '@components/ui';
import { DEGREE_LEVELS, INSTITUTION_INFO } from '@constants/app.constants';
import { useToast } from '@context/ToastContext';
import { cn } from '@utils/cn';
import {
    calculateLiveRankMetrics,
    formatAcademicResult,
    formatDisplayDate,
    formatPhoneDisplay,
    formatTeacherAddress,
    toBengaliDigits
} from '@utils/formatters';
import {
    Award,
    Check,
    Copy,
    Droplets,
    Printer,
    RefreshCw,
    ShieldCheck,
    UserPlus
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * ১০-ডিজিট টিচার আইডি থেকে ডায়নামিক ভিজ্যুয়াল বারকোড জেনারেটর (SVG)
 */
function TeacherBarcodeSvg({ code }) {
    const cleanCode = String(code || '').replace(/\D/g, '');
    if (cleanCode.length !== 10) return null;
    const bars = [];

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
            aria-label={`Barcode for Teacher ID ${cleanCode}`}
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

const STATUS_META = {
    Approved: {
        variant: 'success',
        badgeText: 'অ্যাডমিন কর্তৃক অনুমোদিত (Approved)',
        sealText: 'APPROVED'
    },
    Rejected: {
        variant: 'danger',
        badgeText: 'প্রত্যাখ্যাত (Rejected)',
        sealText: 'REJECTED'
    },
    Pending: {
        variant: 'gold',
        badgeText: 'অ্যাডমিন অনুমোদনের অপেক্ষায় (Pending)',
        sealText: 'REGISTERED'
    }
};

export default function DigitalRegistryIdCard({
    registryRecord,
    onRefreshFromServer,
    isRefreshing = false,
    onStartNewRegistration
}) {
    const toast = useToast();
    const [viewMode, setViewMode] = useState('BOTH'); // 'CARD_ONLY' | 'DOSSIER_ONLY' | 'BOTH'
    const [copiedKey, setCopiedKey] = useState('');
    const copyTimerRef = useRef(null);

    useEffect(() => () => {
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    }, []);

    if (!registryRecord) return null;

    const teacher = registryRecord.teacher || registryRecord;
    const teacherCode = String(registryRecord.teacherId || teacher.teacherCode || '—');
    const uid = String(registryRecord.uid || teacher.uid || '—');
    const photoUrl =
        registryRecord.photoUrl ||
        teacher.profilePicture?.url ||
        '';

    const fullNameBng = String(teacher.fullNameBng || registryRecord.fullNameBng || '—');
    const fullNameEng = String(teacher.fullNameEng || registryRecord.fullNameEng || '—');
    const designationEng = teacher.designation || registryRecord.designation || '—';
    const subject = teacher.subject || 'General';
    const bloodGroup = teacher.bloodGroup || '—';
    const phone = teacher.phone || '';
    const emergencyPhone = teacher.emergencyContact?.phone || '';
    const emergencyName = teacher.emergencyContact?.contactName || '';
    const biometricId = teacher.biometricDeviceId || '—';
    const registrationStatus = teacher.registrationStatus || registryRecord.registrationStatus || 'Pending';
    const statusInfo = STATUS_META[registrationStatus] || STATUS_META.Pending;
    const academicList = Array.isArray(teacher.academicQualifications)
        ? teacher.academicQualifications
        : [];

    const rankMetrics = calculateLiveRankMetrics(designationEng, academicList);
    const overallRank = teacher.rankingMetrics?.overallMadrasahRank || null;
    const presentAddr = teacher.presentAddress || {};

    const identityDisplay = [
        teacher.nidNumber && `NID: ${teacher.nidNumber}`,
        teacher.birthRegNumber && `BRN: ${teacher.birthRegNumber}`
    ].filter(Boolean).join(' | ') || '—';

    const displayUidShort = uid.length > 18 ? `${uid.slice(0, 18)}...` : uid;

    const handleCopyText = async (text, keyLabel) => {
        const cleanText = String(text || '').trim();
        if (!cleanText || cleanText === '—') return;

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(cleanText);
            } else {
                const tempInput = document.createElement('textarea');
                tempInput.value = cleanText;
                tempInput.style.position = 'fixed';
                tempInput.style.opacity = '0';
                document.body.appendChild(tempInput);
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
            }

            setCopiedKey(keyLabel);
            toast.success(`${keyLabel} ক্লিপবোর্ডে কপি করা হয়েছে!`);
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            copyTimerRef.current = setTimeout(() => setCopiedKey(''), 2200);
        } catch {
            toast.error('ক্লিপবোর্ডে কপি করা যায়নি, অনুগ্রহ করে ম্যানুয়ালি কপি করুন।');
        }
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
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-bengali text-base sm:text-lg font-bold text-emerald-deep">
                                অফিশিয়াল ডিজিটাল রেজিস্ট্রি কার্ড ও নিবন্ধন সনদ
                            </h2>
                            <Badge variant={statusInfo.variant} size="sm" dot>
                                {statusInfo.badgeText}
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
                    <div className="rounded-2xl overflow-hidden border-2 border-gold/50 bg-paper-panel shadow-ledger flex flex-col justify-between relative break-inside-avoid">
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
                                    {String(rankMetrics?.staffCategory || 'STAFF').toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* কার্ড বডি: ৫০০×৫০০ ছবি ও মূল পরিচয় */}
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
                                    {overallRank ? `Madrasah Rank #${overallRank}` : `Base Priority #${rankMetrics.designationPriority}`}
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
                    <div className="rounded-2xl overflow-hidden border-2 border-gold/50 bg-paper-panel shadow-ledger flex flex-col justify-between p-5 sm:p-6 relative break-inside-avoid">
                        <div>
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-ink-faint">
                                <div>
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-gold-deep font-bold block">
                                        Registry Verification &amp; Emergency
                                    </span>
                                    <h4 className="font-bengali text-sm font-bold text-emerald-deep">
                                        স্থায়ী নিবন্ধন ও জরুরি যোগাযোগের তথ্য
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
                                    <dt className="font-bengali text-ink-muted">পরিচয়পত্র (NID / BRN):</dt>
                                    <dd className="font-mono font-semibold text-ink text-right">
                                        {identityDisplay}
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
                                        {emergencyName ? `${emergencyName} — ` : ''}
                                        <span className="font-mono">{formatPhoneDisplay(emergencyPhone)}</span>
                                    </dd>
                                </div>

                                <div className="flex justify-between gap-3 py-1">
                                    <dt className="font-bengali text-ink-muted shrink-0">বর্তমান ঠিকানা:</dt>
                                    <dd className="font-bengali text-ink text-right">
                                        {formatTeacherAddress(presentAddr)}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        {/* নিচের অংশ: রাজকীয় সিলমোহর, UID এবং সুপারের স্বাক্ষর */}
                        <div className="mt-5 pt-4 border-t border-ink-faint flex items-end justify-between gap-4">
                            <div className="space-y-1">
                                <span className="font-mono text-[9.5px] uppercase text-ink-muted block">
                                    Registry Recovery UID:
                                </span>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-paper-deep border border-ink-faint font-mono text-[10.5px] text-ink-soft">
                                    <span>{displayUidShort}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyText(uid, 'রেজিস্ট্রি UID')}
                                        className="text-emerald hover:text-gold-deep no-print"
                                        title="সম্পূর্ণ UID কপি করুন"
                                    >
                                        {copiedKey === 'রেজিস্ট্রি UID' ? (
                                            <Check className="w-3.5 h-3.5 text-success" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                </div>
                                <p className="font-bengali text-[10.5px] text-ink-muted">
                                    এই কার্ডটি পাওয়া গেলে মাদ্রাসার অফিসে জমা দেওয়ার অনুরোধ করা হলো।
                                </p>
                            </div>

                            {/* অফিশিয়াল সিলমোহর (Royal Seal) */}
                            <div className="flex items-center gap-4">
                                <div className="royal-seal animate-seal-in shrink-0">
                                    <span className="font-mono text-[8px] tracking-widest">ARDM · ERP</span>
                                    <span className="font-serif font-bold text-[11px] text-emerald-deep">
                                        {statusInfo.sealText}
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
                3. FULL A4 PRINTABLE REGISTRATION DOSSIER (অফিশিয়াল নিবন্ধন সনদ)
               ================================================================= */}
            {(viewMode === 'BOTH' || viewMode === 'DOSSIER_ONLY') && (
                <div className="ledger-surface p-6 sm:p-10 bg-paper-panel break-inside-avoid">
                    {/* ডসিয়ার হেডার */}
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
                                সিনিয়রিটি স্কোর: {rankMetrics.compositeScore}
                            </span>
                        </div>
                    </div>

                    {/* ডসিয়ার মেইন গ্রিড */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-6 mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-xs sm:text-[13px]">
                            <div className="flex justify-between gap-2 border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">শিক্ষকের নাম (বাংলা):</span>
                                <span className="font-bengali font-bold text-ink text-right">{fullNameBng}</span>
                            </div>
                            <div className="flex justify-between gap-2 border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">Full Name (English):</span>
                                <span className="font-sans font-bold text-ink text-right">{fullNameEng}</span>
                            </div>
                            <div className="flex justify-between gap-2 border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">পদবী ও ক্যাটাগরি:</span>
                                <span className="font-bengali font-bold text-emerald-deep text-right">
                                    {rankMetrics.designationBng} ({rankMetrics.staffCategory})
                                </span>
                            </div>
                            <div className="flex justify-between gap-2 border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">পাঠদানের বিষয় / বিভাগ:</span>
                                <span className="font-bengali font-semibold text-ink text-right">{subject}</span>
                            </div>
                            <div className="flex justify-between gap-2 border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">পিতার নাম (বাংলা ও ইংরেজি):</span>
                                <span className="font-bengali font-semibold text-ink text-right">
                                    {teacher.fathersNameBng || '—'} ({teacher.fathersNameEng || '—'})
                                </span>
                            </div>
                            <div className="flex justify-between gap-2 border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">মাতার নাম (বাংলা ও ইংরেজি):</span>
                                <span className="font-bengali font-semibold text-ink text-right">
                                    {teacher.mothersNameBng || '—'} ({teacher.mothersNameEng || '—'})
                                </span>
                            </div>
                            <div className="flex justify-between gap-2 border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">জন্ম তারিখ ও রক্তের গ্রুপ:</span>
                                <span className="font-bengali font-semibold text-ink text-right">
                                    {formatDisplayDate(teacher.dateOfBirth, 'bn')} · Blood: <b className="font-mono text-danger">{bloodGroup}</b>
                                </span>
                            </div>
                            <div className="flex justify-between gap-2 border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">মাদ্রাসায় যোগদানের তারিখ:</span>
                                <span className="font-bengali font-semibold text-ink text-right">
                                    {formatDisplayDate(teacher.joiningDate, 'bn')}
                                </span>
                            </div>
                            <div className="flex justify-between gap-2 border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">জাতীয় পরিচয়পত্র / জন্ম নিবন্ধন:</span>
                                <span className="font-mono font-bold text-ink text-right">
                                    {identityDisplay}
                                </span>
                            </div>
                            <div className="flex justify-between gap-2 border-b border-ink-faint pb-1.5">
                                <span className="font-bengali text-ink-muted">মোবাইল ও জরুরি নম্বর:</span>
                                <span className="font-mono font-semibold text-ink text-right">
                                    {formatPhoneDisplay(phone)} | Emg: {formatPhoneDisplay(emergencyPhone)}
                                </span>
                            </div>
                            <div className="flex justify-between gap-2 border-b border-ink-faint pb-1.5 sm:col-span-2">
                                <span className="font-bengali text-ink-muted shrink-0">বর্তমান ঠিকানা:</span>
                                <span className="font-bengali font-semibold text-ink text-right">
                                    {formatTeacherAddress(presentAddr)}
                                </span>
                            </div>
                        </div>

                        {/* ডান পাশে অফিশিয়াল ৫০০×৫০০ ছবি ফ্রেম */}
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
                                শিক্ষাগত যোগ্যতা ও সিনিয়রিটি মূল্যায়ন ছক (Academic Qualifications):
                            </h4>
                            <div className="overflow-x-auto rounded-xl border border-ink-faint">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-paper-deep border-b border-ink-faint font-bengali text-emerald-deep">
                                            <th className="py-2 px-3">ডিগ্রির স্তর</th>
                                            <th className="py-2 px-3">পরীক্ষার নাম ও বিভাগ</th>
                                            <th className="py-2 px-3">বোর্ড / বিশ্ববিদ্যালয়</th>
                                            <th className="py-2 px-3 text-center">পাসের সন</th>
                                            <th className="py-2 px-3 text-right">ফলাফল</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-ink-faint font-bengali">
                                        {academicList.map((q, idx) => {
                                            const degObj = DEGREE_LEVELS.find((d) => d.key === q.degreeLevel);
                                            return (
                                                <tr key={q.id || idx}>
                                                    <td className="py-2 px-3 font-bold text-emerald-deep">
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
                                                    <td className="py-2 px-3">{q.boardOrUniversity}</td>
                                                    <td className="py-2 px-3 text-center font-mono">{q.passingYear}</td>
                                                    <td className="py-2 px-3 text-right font-mono font-bold">
                                                        {formatAcademicResult(q)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ডসিয়ার স্বাক্ষর ফুটার */}
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
}