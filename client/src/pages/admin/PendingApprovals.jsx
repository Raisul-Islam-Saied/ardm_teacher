/**
 * ARDM Enterprise ERP — Dedicated Pending Teacher Registrations Approval Center
 */

import React, { useState, useEffect } from 'react';
import { UserCheck, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button, Badge, Modal, FormInput } from '@components/ui';
import { useToast } from '@context/ToastContext';
import { toBengaliDigits, formatBDT, formatPhoneDisplay, extractPureDigits } from '@utils/formatters';
import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';

export default function PendingApprovals() {
    const toast = useToast();
    const [applicants, setApplicants] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);
    const [activeApplicant, setActiveApplicant] = useState(null);
    const [salaryInput, setSalaryInput] = useState('');
    const [bioIdInput, setBioIdInput] = useState('');

    useEffect(() => {
        let isMounted = true;
        axiosClient.get('/teachers')
            .then((res) => {
                const teachers = res.data?.data?.teachers;
                if (!Array.isArray(teachers)) throw new Error('সার্ভার থেকে আবেদন তালিকা পাওয়া যায়নি।');
                if (isMounted) setApplicants(teachers.filter((teacher) => teacher.registrationStatus === 'Pending'));
            })
            .catch((error) => {
                if (isMounted) toast.error(extractApiErrorMessage(error, 'আবেদন তালিকা লোড করা যায়নি।'));
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });
        return () => { isMounted = false; };
    }, [toast]);

    const handleApprove = async () => {
        if (!activeApplicant) return;
        const basicSalary = Number(extractPureDigits(salaryInput));
        const biometricDeviceId = Number(extractPureDigits(bioIdInput));
        if (!Number.isFinite(basicSalary) || basicSalary < 0 || !Number.isInteger(biometricDeviceId) || biometricDeviceId < 1) {
            toast.error('সঠিক মূল বেতন ও বায়োমেট্রিক আইডি প্রদান করুন।');
            return;
        }
        setIsApproving(true);
        try {
            await axiosClient.patch(`/teachers/${activeApplicant._id}/approve`, {
                basicSalary,
                biometricDeviceId,
                customLeaveQuota: Number(activeApplicant.customLeaveQuota ?? 2)
            });
            setApplicants((prev) => prev.filter((item) => item._id !== activeApplicant._id));
            toast.success(`${activeApplicant.fullNameBng}-এর নিবন্ধন অনুমোদিত হয়েছে।`);
            setActiveApplicant(null);
        } catch (error) {
            toast.error(extractApiErrorMessage(error, 'নিবন্ধন অনুমোদন করা যায়নি।'));
        } finally {
            setIsApproving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-up">
            <div className="ledger-surface p-6 bg-paper-panel flex flex-wrap items-center justify-between gap-4">
                <div>
                    <Badge variant="gold" size="sm" mono className="mb-1">
                        ONBOARDING VERIFICATION CENTER
                    </Badge>
                    <h1 className="font-bengali text-xl sm:text-2xl font-bold text-emerald-deep">
                        পেন্ডিং শিক্ষক নিবন্ধন অনুমোদন কেন্দ্র ({toBengaliDigits(applicants.length)}টি আবেদন)
                    </h1>
                    <p className="font-bengali text-xs text-ink-soft mt-0.5">
                        পাবলিক নিবন্ধন ফর্মের মাধ্যমে জমা দেওয়া নতুন শিক্ষকদের সনদ যাচাই করে মূল বেতন ও বায়োমেট্রিক পিন বরাদ্দ করুন।
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="ledger-surface p-12 bg-paper-panel text-center font-bengali text-ink-soft">
                    আবেদন তালিকা লোড হচ্ছে…
                </div>
            ) : applicants.length === 0 ? (
                <div className="ledger-surface p-12 bg-paper-panel text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-success mb-3" />
                    <h3 className="font-bengali text-lg font-bold text-emerald-deep">
                        সকল আবেদন যাচাই ও অনুমোদন সম্পন্ন হয়েছে!
                    </h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {applicants.map((app) => (
                        <div key={app._id} className="ledger-surface p-6 bg-paper-panel flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between pb-3 mb-3 border-b border-ink-faint">
                                    <Badge variant="gold" size="sm" dot>
                                        Approval Pending
                                    </Badge>
                                    <span className="font-mono text-xs font-bold text-emerald-deep">
                                        ID: {app.teacherCode}
                                    </span>
                                </div>

                                <h3 className="font-bengali text-lg font-bold text-emerald-deep">
                                    {app.fullNameBng} ({app.fullNameEng})
                                </h3>
                                <p className="font-bengali text-xs font-semibold text-emerald mt-0.5">
                                    {app.designation} · বিষয়: {app.subject || '—'}
                                </p>

                                <div className="mt-3 p-3 rounded-xl bg-paper border border-ink-faint space-y-1 text-xs font-bengali">
                                    <p>সর্বোচ্চ ডিগ্রি: <b>{app.academicQualifications?.[0]?.examTitle || '—'}</b></p>
                                    <p>পরিচয়পত্র নম্বর: <b className="font-mono">{app.nidNumber || app.birthRegNumber || '—'}</b></p>
                                    <p>মোবাইল নম্বর: <b className="font-mono">{formatPhoneDisplay(app.phone)}</b></p>
                                </div>
                            </div>

                            <div className="mt-5 pt-3 border-t border-ink-faint flex justify-end">
                                <Button
                                    variant="emerald"
                                    size="sm"
                                    leftIcon={UserCheck}
                                    onClick={() => {
                                        setActiveApplicant(app);
                                        setSalaryInput(String(app.basicSalary || ''));
                                        setBioIdInput(String(app.biometricDeviceId || ''));
                                    }}
                                >
                                    <span className="font-bengali">মূল বেতন নির্ধারণ ও অনুমোদন দিন</span>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={Boolean(activeApplicant)}
                onClose={() => setActiveApplicant(null)}
                size="sm"
                titleEng="Approve Teacher Registration"
                titleBng="মূল বেতন ও বায়োমেট্রিক আইডি বরাদ্দ"
                footer={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => setActiveApplicant(null)}>
                            <span className="font-bengali">বাতিল</span>
                        </Button>
                        <Button variant="emerald" size="sm" leftIcon={ShieldCheck} isLoading={isApproving} onClick={handleApprove}>
                            <span className="font-bengali">অনুমোদন নিশ্চিত করুন</span>
                        </Button>
                    </>
                }
            >
                <FormInput
                    labelEng="Basic Salary (BDT)"
                    labelBng="মাসিক মূল বেতন (টাকা)"
                    variant="erp"
                    isMonoText
                    value={salaryInput}
                    onChange={(e) => setSalaryInput(extractPureDigits(e.target.value))}
                    required
                />
                <FormInput
                    labelEng="Biometric PIN"
                    labelBng="ZKTeco বায়োমেট্রিক আইডি"
                    variant="erp"
                    isMonoText
                    value={bioIdInput}
                    onChange={(e) => setBioIdInput(extractPureDigits(e.target.value))}
                    required
                />
            </Modal>
        </div>
    );
}
