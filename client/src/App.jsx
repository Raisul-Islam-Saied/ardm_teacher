import React, { useState } from 'react';
import {
    ShieldCheck,
    Printer,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    Smartphone,
    Monitor,
    Award
} from 'lucide-react';
import { INSTITUTION_INFO, DESIGNATION_LIST, BLOOD_GROUPS } from '@constants/app.constants';

export default function App() {
    const [sampleNameBn, setSampleNameBn] = useState('মোঃ রায়সুল ইসলাম সাঈদ');
    const [sampleDesignation, setSampleDesignation] = useState('Assistant Teacher');
    const [triggerErrorDemo, setTriggerErrorDemo] = useState(false);

    const selectedDesigObj = DESIGNATION_LIST.find(d => d.titleEng === sampleDesignation) || DESIGNATION_LIST[2];

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">

                {/* ১. রাজকীয় মাদ্রাসা ক্রেস্ট ও হেডার (Your Signature Crest & Typography) */}
                <div className="text-center mb-8 animate-fade-down">
                    <div className="flex justify-center mb-2">
                        <div className="madrasah-crest">
                            {INSTITUTION_INFO.crestLetterBng}
                        </div>
                    </div>
                    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-emerald-deep tracking-tight">
                        {INSTITUTION_INFO.nameEng}
                    </h1>
                    <p className="text-sm text-ink-soft mt-1">
                        Enterprise Design System &amp; Theme Engine &nbsp;·&nbsp;{' '}
                        <span className="font-bengali font-medium text-emerald">
                            {INSTITUTION_INFO.nameBng} ({INSTITUTION_INFO.postOfficeBng}, {INSTITUTION_INFO.upazilaBng})
                        </span>
                    </p>
                </div>

                {/* ২. মেইন লেজার কার্ড (Ledger Surface with Top Ribbon) */}
                <div className="ledger-surface p-6 sm:p-10 animate-fade-up">
                    {/* স্ট্যাটাস হেডার */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-ink-faint">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-subtle border border-emerald-border text-emerald text-xs font-mono font-bold uppercase tracking-wider">
                                <Sparkles className="w-3.5 h-3.5 text-gold-deep" />
                                Micro-Step 2 of 25 Completed
                            </div>
                            <h2 className="font-bengali text-xl sm:text-2xl font-bold text-emerald-deep mt-2">
                                রয়্যাল মাদ্রাসা থিম, টাইপোগ্রাফি ও প্রিন্ট ইঞ্জিন ক্যালিব্রেশন
                            </h2>
                        </div>

                        {/* অ্যানিমেটেড অফিসিয়াল সিলমোহর (Royal Seal) */}
                        <div className="royal-seal animate-seal-in">
                            <span className="font-mono text-[9px] tracking-widest opacity-75">ARDM · ERP</span>
                            <span className="font-serif font-bold text-xs text-emerald-deep">VERIFIED</span>
                            <span className="font-mono text-[10px] font-bold text-gold-deep">1026030301</span>
                        </div>
                    </div>

                    {/* ৩. ফন্ট এবং কালার প্যালেট পরীক্ষা */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="p-4 rounded-xl bg-paper border border-ink-faint">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
                                Bengali Serif Font
                            </span>
                            <p className="font-bengali text-lg font-bold text-emerald-deep">
                                আবদুর রাজ্জাক দাখিল মাদ্রাসা
                            </p>
                            <p className="font-bengali text-xs text-ink-soft mt-1">
                                ইউনিকোড বাংলা ও যুক্তাক্ষর রেন্ডারিং ১০০% নিখুঁত।
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-paper border border-ink-faint">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
                                Classical Serif &amp; Sans
                            </span>
                            <p className="font-serif text-xl font-bold text-emerald-deep">
                                Teacher Registry Ledger
                            </p>
                            <p className="font-sans text-xs text-ink-soft mt-1">
                                Amiri Display + Inter UI Typography
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-paper border border-ink-faint">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
                                Monospace 10-Digit ID &amp; Taka
                            </span>
                            <p className="font-mono text-lg font-bold text-emerald-deep tracking-wider">
                                ID: 1026030301
                            </p>
                            <p className="font-mono text-xs text-gold-deep font-semibold mt-1">
                                Per Day (31d): ৳645.16
                            </p>
                        </div>
                    </div>

                    {/* ৪. ইন্টারঅ্যাক্টিভ লেজার ইনপুট এবং শেক অ্যানিমেশন টেস্ট */}
                    <div className="p-5 sm:p-6 rounded-xl bg-paper/60 border border-ink-faint mb-8">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <h3 className="font-serif text-lg font-bold text-emerald-deep">
                                Live Form Field &amp; Shake Validation Preview
                            </h3>
                            <button
                                type="button"
                                onClick={() => setTriggerErrorDemo(!triggerErrorDemo)}
                                className="text-xs font-mono font-semibold px-3 py-1.5 rounded-full border border-danger/30 bg-danger-bg text-danger hover:bg-danger hover:text-white transition-colors no-print"
                            >
                                {triggerErrorDemo ? '✓ Clear Error State' : '⚡ Test Military Shake Error'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* বাংলা নাম ইনপুট ডেমো */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
                                    <span className="font-bengali text-xs">শিক্ষকের নাম (বাংলা)</span>{' '}
                                    <span className="text-gold">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={sampleNameBn}
                                    onChange={(e) => setSampleNameBn(e.target.value)}
                                    className={`ledger-input font-bengali text-base ${triggerErrorDemo ? 'ledger-input-error' : ''}`}
                                    placeholder="যেমনঃ মোঃ রায়হান উদ্দিন"
                                />
                                {triggerErrorDemo ? (
                                    <p className="text-xs text-danger font-medium mt-1.5 flex items-center gap-1 animate-shake font-bengali">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        বাংলা নামে শুধুমাত্র বাংলা অক্ষর ব্যবহার করুন।
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-ink-muted mt-1 font-bengali">
                                        সনদপত্র অনুযায়ী বাংলায় পূর্ণ নাম।
                                    </p>
                                )}
                            </div>

                            {/* ১৫টি পদবী ড্রপডাউন ডেমো (বাংলা ও ইংরেজি সহ) */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">
                                    Designation / <span className="font-bengali">পদবী ও র‍্যাংক কোড</span>{' '}
                                    <span className="text-gold">*</span>
                                </label>
                                <select
                                    value={sampleDesignation}
                                    onChange={(e) => setSampleDesignation(e.target.value)}
                                    className="ledger-input custom-select-arrow font-bengali text-sm"
                                >
                                    {DESIGNATION_LIST.map((d) => (
                                        <option key={d.code} value={d.titleEng}>
                                            [Rank #{d.rankPriority}] {d.titleBng} — ({d.titleEng})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-emerald font-mono mt-1.5">
                                    Selected Rank Priority: #{selectedDesigObj.rankPriority} · Category: {selectedDesigObj.staffCategory} · ID Code: {selectedDesigObj.code}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ৫. রেসপনসিভ ও প্রিন্ট ইঞ্জিন চেক বার */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-ink-faint no-print">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-bg text-success font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                Mobile &amp; PC Responsive Ready
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-subtle text-emerald-deep font-medium">
                                <Award className="w-4 h-4 text-gold-deep" />
                                Blood Groups: {BLOOD_GROUPS.join(', ')}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-gold to-gold-deep text-emerald-deep font-semibold text-xs shadow-sm hover:-translate-y-0.5 transition-all"
                            >
                                <Printer className="w-4 h-4" />
                                Test A4 Print View
                            </button>
                            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald to-emerald-deep text-white font-semibold text-xs shadow-emerald-glow">
                                <ShieldCheck className="w-4 h-4 text-gold-soft" />
                                Step 2 Complete
                            </div>
                        </div>
                    </div>
                </div>

                {/* ৬. ডেভেলপার ক্রেডিট ফুটার */}
                <p className="text-center mt-6 font-bengali text-xs text-ink-soft opacity-80">
                    {INSTITUTION_INFO.developerCreditBng}
                </p>
            </div>
        </div>
    );
}
