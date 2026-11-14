/**
 * ARDM Enterprise ERP — Responsive 4-Step Ledger Stepper
 * - Desktop (md+): Classic Royal Emerald Vertical Sidebar Stepper + Live 10-Digit ID & Seniority Preview
 * - Mobile (<md): Compact Progress Bar + Touch-Friendly Horizontal Step Pills
 */

import React from 'react';
import { Check, Fingerprint, Award, Sparkles, Lock } from 'lucide-react';
import { cn } from '@utils/cn';
import { toBengaliDigits } from '@utils/formatters';

export default function RegistrationStepper({
    steps = [],
    currentStep = 0,
    completedSteps = {},
    onStepSelect,
    idPreview,
    rankPreview
}) {
    const progressPercent = Math.round(((currentStep + 1) / Math.max(steps.length, 1)) * 100);

    const handleStepClick = (targetIndex) => {
        if (!onStepSelect) return;
        // শুধুমাত্র পেছনের ধাপগুলোতে বা ইতিমধ্যে সম্পন্ন ধাপে সরাসরি ক্লিক করে যাওয়া যাবে
        if (targetIndex < currentStep || completedSteps[targetIndex]) {
            onStepSelect(targetIndex);
        }
    };

    return (
        <aside
            aria-label="Registration Progress"
            className="bg-gradient-to-b from-emerald-deep via-emerald to-emerald-deep text-[#EFE9D4] p-5 sm:p-6 md:p-7 flex flex-col justify-between select-none border-b md:border-b-0 md:border-r border-gold/20"
        >
            {/* =================================================================
                TOP SECTION: STEPPER NAVIGATION (Desktop Vertical & Mobile Compact)
               ================================================================= */}
            <div>
                {/* মোবাইল প্রোগ্রেস হেডার (শুধুমাত্র ছোট স্ক্রিনে দেখাবে) */}
                <div className="md:hidden mb-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bengali font-semibold text-gold-soft">
                            ধাপ {toBengaliDigits(currentStep + 1)} / {toBengaliDigits(steps.length)}:{' '}
                            <b className="text-white">{steps[currentStep]?.titleBng}</b>
                        </span>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gold-soft">
                            {progressPercent}%
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-gold to-gold-soft transition-all duration-500 rounded-full"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* পিসি সাইডবার সাব-হেডার */}
                <div className="hidden md:flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                    <div>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-gold-soft block">
                            Official Ledger
                        </span>
                        <h3 className="font-bengali text-sm font-bold text-white mt-0.5">
                            নিবন্ধন ধাপসমূহ ({toBengaliDigits(currentStep + 1)}/{toBengaliDigits(steps.length)})
                        </h3>
                    </div>
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-white/10 text-gold-soft border border-gold/25">
                        {progressPercent}%
                    </span>
                </div>

                {/* স্টেপ লিস্ট: মোবাইলে Horizontal Scrollable Pills, পিসিতে Vertical Timeline */}
                <div className="flex md:flex-col gap-2.5 md:gap-1 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                    {steps.map((step, index) => {
                        const isActive = index === currentStep;
                        const isDone = index < currentStep || Boolean(completedSteps[index]);
                        const isClickable = index < currentStep || Boolean(completedSteps[index]);

                        return (
                            <div
                                key={step.id}
                                onClick={() => handleStepClick(index)}
                                role={isClickable ? 'button' : undefined}
                                tabIndex={isClickable ? 0 : -1}
                                onKeyDown={(e) => {
                                    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        handleStepClick(index);
                                    }
                                }}
                                className={cn(
                                    'relative flex items-center md:items-start gap-3 px-3 py-2.5 md:px-2 md:py-3.5 rounded-xl transition-all duration-300 shrink-0 md:shrink',
                                    isActive
                                        ? 'opacity-100 bg-white/10 md:bg-transparent border border-gold/30 md:border-transparent'
                                        : isDone
                                            ? 'opacity-90 hover:opacity-100 cursor-pointer'
                                            : 'opacity-45 cursor-not-allowed'
                                )}
                            >
                                {/* পিসিতে ধাপগুলোর মাঝখানের ভার্টিক্যাল কানেক্টিং লাইন */}
                                {index < steps.length - 1 && (
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'hidden md:block absolute left-[24px] top-[46px] w-[1.5px] h-[calc(100%-24px)] transition-colors duration-300',
                                            isDone ? 'bg-gold-soft/70' : 'bg-white/20'
                                        )}
                                    />
                                )}

                                {/* স্টেপ নাম্বার সার্কেল (আপনার আগের ফর্মের ৩৪px সার্কেল ডিজাইন) */}
                                <div
                                    className={cn(
                                        'w-[34px] h-[34px] rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-all duration-300 border-[1.5px]',
                                        isActive &&
                                            'bg-gold border-gold text-emerald-deep shadow-[0_0_0_5px_rgba(198,156,61,0.24)] scale-105',
                                        !isActive && isDone &&
                                            'bg-white/15 border-gold-soft text-gold-soft',
                                        !isActive && !isDone &&
                                            'bg-transparent border-white/35 text-white/80'
                                    )}
                                >
                                    {isDone && !isActive ? (
                                        <Check className="w-4 h-4 stroke-[2.5]" />
                                    ) : (
                                        index + 1
                                    )}
                                </div>

                                {/* স্টেপ টেক্সট (ইংরেজি ও বাংলা) */}
                                <div className="pt-0.5 pr-1">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={cn(
                                                'text-xs sm:text-[13.5px] font-semibold tracking-wide leading-tight',
                                                isActive ? 'text-white' : 'text-[#EFE9D4]'
                                            )}
                                        >
                                            {step.titleEng}
                                        </span>
                                        {!isActive && !isDone && (
                                            <Lock className="w-3 h-3 opacity-50 hidden md:inline" />
                                        )}
                                    </div>
                                    <div className="font-bengali text-[11.5px] text-gold-soft/90 mt-0.5 leading-snug">
                                        {step.titleBng}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* =================================================================
                BOTTOM SECTION: LIVE 10-DIGIT TEACHER ID & RANK PREVIEW CARD
               ================================================================= */}
            {idPreview && (
                <div className="mt-4 md:mt-8 pt-4 border-t border-white/15">
                    <div className="p-3.5 rounded-xl bg-black/20 border border-gold/25 backdrop-blur-xs">
                        <div className="flex items-center justify-between text-[10px] font-mono text-gold-soft uppercase tracking-wider mb-1">
                            <span className="flex items-center gap-1">
                                <Fingerprint className="w-3.5 h-3.5 text-gold" />
                                10-Digit ID Preview
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-gold/20 text-gold-soft font-bold">
                                Op-A
                            </span>
                        </div>

                        <p className="font-mono text-lg font-bold tracking-widest text-white">
                            {idPreview.fullId}
                        </p>

                        {/* 10-Digit Segment Mini Bar: 10 + YY + BB + DD + SS */}
                        <div className="grid grid-cols-5 gap-1 mt-2 text-[9px] font-mono text-center">
                            <div className="bg-white/10 rounded py-0.5">
                                <span className="text-white font-bold">{idPreview.segments.teacherPrefix}</span>
                                <span className="block text-[7.5px] text-gold-soft/80">TCH</span>
                            </div>
                            <div className="bg-white/10 rounded py-0.5">
                                <span className="text-white font-bold">{idPreview.segments.joiningYear2D}</span>
                                <span className="block text-[7.5px] text-gold-soft/80">JOIN</span>
                            </div>
                            <div className="bg-white/10 rounded py-0.5">
                                <span className="text-white font-bold">{idPreview.segments.birthYear2D}</span>
                                <span className="block text-[7.5px] text-gold-soft/80">DOB</span>
                            </div>
                            <div className="bg-white/10 rounded py-0.5">
                                <span className="text-white font-bold">{idPreview.segments.designationCode2D}</span>
                                <span className="block text-[7.5px] text-gold-soft/80">POST</span>
                            </div>
                            <div className="bg-white/10 rounded py-0.5">
                                <span className="text-white font-bold">{idPreview.segments.serial2D}</span>
                                <span className="block text-[7.5px] text-gold-soft/80">SER</span>
                            </div>
                        </div>

                        {rankPreview && (
                            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                                <span className="font-bengali text-gold-soft flex items-center gap-1 truncate">
                                    <Award className="w-3.5 h-3.5 text-gold shrink-0" />
                                    {rankPreview.designationBng}
                                </span>
                                <span className="font-mono text-[10px] text-white/90 font-semibold shrink-0 ml-1">
                                    Base #{rankPreview.designationPriority}
                                </span>
                            </div>
                        )}
                    </div>

                    <p className="hidden md:flex items-center gap-1.5 mt-3 text-[11px] font-bengali text-[#EFE9D4]/70 leading-relaxed">
                        <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span>অটো-ড্রাফট চালু আছে; পেজ রিলোড হলেও তথ্য হারাবে না।</span>
                    </p>
                </div>
            )}
        </aside>
    );
}
