import React, { useState } from 'react';
import {
    Sparkles,
    UserCheck,
    Bell,
    Layers,
    Eye,
    Trash2,
    Send,
    Phone,
    Lock
} from 'lucide-react';
import { INSTITUTION_INFO, DESIGNATION_LIST, BLOOD_GROUPS } from '@constants/app.constants';
import {
    Button,
    FormInput,
    FormSelect,
    Badge,
    AttendanceStatusBadge,
    Modal,
    ConfirmDialog,
    TableSkeleton
} from '@components/ui';
import { useToast } from '@context/ToastContext';
import { validateBengaliName, validateMobileNumber } from '@utils/validators';

export default function App() {
    const toast = useToast();

    const [nameBn, setNameBn] = useState('মোঃ রায়সুল ইসলাম সাঈদ');
    const [phone, setPhone] = useState('01812345678');
    const [password, setPassword] = useState('1026030301');
    const [designation, setDesignation] = useState('Assistant Teacher');
    const [bloodGroup, setBloodGroup] = useState('O+');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [showSkeleton, setShowSkeleton] = useState(false);

    const nameCheck = validateBengaliName(nameBn, 'শিক্ষকের বাংলা নাম');
    const phoneCheck = validateMobileNumber(phone, 'মোবাইল নম্বর');

    const designationOptions = DESIGNATION_LIST.map((d) => ({
        value: d.titleEng,
        label: `[Rank #${d.rankPriority}] ${d.titleBng} — (${d.titleEng})`
    }));

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-8 animate-fade-down">
                    <div className="flex justify-center mb-2">
                        <div className="madrasah-crest">{INSTITUTION_INFO.crestLetterBng}</div>
                    </div>
                    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-emerald-deep">
                        {INSTITUTION_INFO.nameEng}
                    </h1>
                    <p className="font-bengali text-sm text-ink-soft mt-1">
                        ধাপ ৫ / ২৫ · কাস্টম অ্যাটমিক UI কম্পোনেন্ট লাইব্রেরি (পর্ব ১ সম্পন্ন!)
                    </p>
                </div>

                <div className="ledger-surface p-6 sm:p-8 animate-fade-up">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-ink-faint">
                        <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-subtle border border-emerald-border text-emerald text-xs font-mono font-bold uppercase">
                                <Sparkles className="w-3.5 h-3.5 text-gold-deep" />
                                Step 5 of 25: Core UI Kit 100% Ready
                            </span>
                            <h2 className="font-bengali text-xl font-bold text-emerald-deep mt-2">
                                কাস্টম ইনপুট, ড্রপডাউন, ব্যাজ, মডাল ও টোস্ট গ্যালারি
                            </h2>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="emerald"
                                size="sm"
                                leftIcon={Bell}
                                onClick={() => toast.success('মাশাআল্লাহ! টোস্ট নোটিফিকেশন সফলভাবে কাজ করছে।')}
                            >
                                সাকসেস টোস্ট
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => toast.error('ত্রুটি! জরুরি যোগাযোগের নম্বরটি ভিন্ন হতে হবে।')}
                            >
                                এরর টোস্ট
                            </Button>
                            <Button
                                variant="gold"
                                size="sm"
                                leftIcon={Layers}
                                onClick={() => setIsModalOpen(true)}
                            >
                                মডাল ওপেন করুন
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-6">
                        <FormInput
                            labelEng="Full Name (Bengali)"
                            labelBng="শিক্ষকের নাম (বাংলা)"
                            name="nameBn"
                            value={nameBn}
                            onChange={(e) => setNameBn(e.target.value)}
                            required
                            isBengaliText
                            showValidIcon
                            isValid={nameCheck.valid}
                            error={nameCheck.error}
                            hint="সনদপত্র অনুযায়ী শুধুমাত্র বাংলায় নাম লিখুন।"
                        />

                        <FormSelect
                            labelEng="Designation"
                            labelBng="পদবী ও বেস র‍্যাংক"
                            name="designation"
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            options={designationOptions}
                            required
                        />

                        <FormInput
                            labelEng="Mobile Number"
                            labelBng="মোবাইল নম্বর"
                            name="phone"
                            variant="erp"
                            leftIcon={Phone}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            isMonoText
                            showValidIcon
                            isValid={phoneCheck.valid}
                            error={phoneCheck.error}
                            hint="ERP Boxed Mode (ড্যাশবোর্ড ফিল্টার ও মডালে ব্যবহৃত হবে)"
                        />

                        <FormInput
                            labelEng="Portal Password"
                            labelBng="পাসওয়ার্ড (Show/Hide সহ)"
                            name="password"
                            type="password"
                            variant="erp"
                            leftIcon={Lock}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            isMonoText
                            hint="ডান পাশের চোখের আইকনে ক্লিক করে পাসওয়ার্ড দেখুন।"
                        />
                    </div>

                    <div className="p-5 rounded-xl bg-paper border border-ink-faint mb-6">
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep mb-3">
                            হাজিরা, পেমেন্ট এবং র‍্যাংকিং ব্যাজ:
                        </h3>
                        <div className="flex flex-wrap gap-2.5">
                            <Badge variant="emerald" mono>Rank #1 · সুপার</Badge>
                            <Badge variant="gold">Cash Payment (ক্যাশ বেতন)</Badge>
                            <AttendanceStatusBadge status="Present" />
                            <AttendanceStatusBadge status="Late" />
                            <AttendanceStatusBadge status="Leave" />
                            <AttendanceStatusBadge status="Late (Excused)" />
                            <AttendanceStatusBadge status="Absent" />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-ink-faint">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <Button variant="emerald" size="sm" leftIcon={Send}>
                                সাবমিট করুন
                            </Button>
                            <Button variant="gold" size="sm" leftIcon={UserCheck}>
                                বেতন অনুমোদন
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={Eye}
                                onClick={() => setShowSkeleton((s) => !s)}
                            >
                                {showSkeleton ? 'স্কেলেটন লুকান' : 'টেবিল স্কেলেটন দেখুন'}
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                leftIcon={Trash2}
                                onClick={() => setIsConfirmOpen(true)}
                            >
                                কনফার্ম ডায়ালগ টেস্ট
                            </Button>
                        </div>

                        <Badge variant="success" size="lg" dot>
                            পর্ব ১ (ধাপ ১–৫) শতভাগ সম্পন্ন!
                        </Badge>
                    </div>

                    {showSkeleton && (
                        <div className="mt-6 animate-fade-up">
                            <TableSkeleton rows={4} columns={5} />
                        </div>
                    )}
                </div>

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    titleEng="Teacher Salary & Quota Override"
                    titleBng="শিক্ষকের মূল বেতন ও ছুটির কোটা নির্ধারণ"
                    subtitleBng="আবদুর রাজ্জাক দাখিল মাদ্রাসা · অ্যাডমিন কন্ট্রোল প্যানেল"
                    footer={
                        <>
                            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                                বন্ধ করুন
                            </Button>
                            <Button
                                variant="emerald"
                                size="sm"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    toast.success('তথ্য সফলভাবে সংরক্ষিত হয়েছে!');
                                }}
                            >
                                সংরক্ষণ করুন
                            </Button>
                        </>
                    }
                >
                    <FormSelect
                        labelEng="Blood Group"
                        labelBng="রক্তের গ্রুপ (N/A সহ)"
                        variant="erp"
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        options={BLOOD_GROUPS}
                    />
                    <p className="font-bengali text-xs text-ink-soft">
                        কীবোর্ডের <b>ESC</b> বাটন চাপলে অথবা বাইরে ক্লিক করলে এই মডালটি স্মুথলি বন্ধ হয়ে যাবে।
                    </p>
                </Modal>

                <ConfirmDialog
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={() => {
                        setIsConfirmOpen(false);
                        toast.warning('রেকর্ডটি সফলভাবে আর্কাইভ করা হয়েছে।');
                    }}
                    variant="danger"
                    titleBng="আপনি কি এই রেকর্ডটি পরিবর্তন করতে চান?"
                    messageBng="একবার নিশ্চিত করলে এই মাসের হাজিরা ও বেতন শিট নতুন নিয়ম অনুযায়ী স্বয়ংক্রিয়ভাবে আপডেট হয়ে যাবে।"
                />

                <p className="text-center mt-6 font-bengali text-xs text-ink-soft opacity-80">
                    {INSTITUTION_INFO.developerCreditBng}
                </p>
            </div>
        </div>
    );
}
