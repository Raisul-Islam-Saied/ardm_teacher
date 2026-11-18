import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Search, UserRound, Users } from 'lucide-react';
import { Badge } from '@components/ui';
import { useToast } from '@context/ToastContext';
import axiosClient, { extractApiErrorMessage } from '@api/axiosClient';
import { calculateLiveRankMetrics, formatPhoneDisplay } from '@utils/formatters';
import { openOfficialIdCardsPrint } from '@components/teacher/OfficialTeacherIdCard';

export function computeAutoSeniorityRanking(teachersArray = []) {
    const enriched = teachersArray.map((teacher) => {
        const metrics = calculateLiveRankMetrics(teacher.designation, teacher.academicQualifications);
        const joinTimestamp = teacher.joiningDate ? new Date(teacher.joiningDate).getTime() : Number.MAX_SAFE_INTEGER;
        const dobTimestamp = teacher.dateOfBirth ? new Date(teacher.dateOfBirth).getTime() : Number.MAX_SAFE_INTEGER;

        return {
            ...teacher,
            computedMetrics: metrics,
            _joinTs: Number.isNaN(joinTimestamp) ? Number.MAX_SAFE_INTEGER : joinTimestamp,
            _dobTs: Number.isNaN(dobTimestamp) ? Number.MAX_SAFE_INTEGER : dobTimestamp
        };
    });

    enriched.sort((first, second) => {
        if (first.computedMetrics.designationPriority !== second.computedMetrics.designationPriority) {
            return first.computedMetrics.designationPriority - second.computedMetrics.designationPriority;
        }
        if (second.computedMetrics.highestDegreeWeight !== first.computedMetrics.highestDegreeWeight) {
            return second.computedMetrics.highestDegreeWeight - first.computedMetrics.highestDegreeWeight;
        }
        if (second.computedMetrics.highestNormalizedGpa !== first.computedMetrics.highestNormalizedGpa) {
            return second.computedMetrics.highestNormalizedGpa - first.computedMetrics.highestNormalizedGpa;
        }
        if (first._joinTs !== second._joinTs) return first._joinTs - second._joinTs;
        return first._dobTs - second._dobTs;
    });

    return enriched.map((teacher, index) => ({ ...teacher, overallMadrasahRank: index + 1 }));
}

export default function TeacherDirectory() {
    const toast = useToast();
    const navigate = useNavigate();
    const [teachers, setTeachers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusView, setStatusView] = useState('ACTIVE');
    const [isLoading, setIsLoading] = useState(true);

    const fetchTeachers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axiosClient.get('/teachers');
            const list = response?.data?.data?.teachers || response?.data?.data;
            if (!Array.isArray(list)) throw new Error('শিক্ষক তালিকা পাওয়া যায়নি।');
            setTeachers(list);
        } catch (error) {
            setTeachers([]);
            toast.error(extractApiErrorMessage(error, 'শিক্ষক তালিকা লোড করা যায়নি।'));
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchTeachers();
    }, [fetchTeachers]);

    const eligibleTeachers = useMemo(
        () => teachers.filter((teacher) => !['Pending', 'Rejected'].includes(teacher.registrationStatus)),
        [teachers]
    );
    const activeCount = eligibleTeachers.filter((teacher) => teacher.isActive !== false).length;
    const formerCount = eligibleTeachers.length - activeCount;

    const filteredTeachers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return computeAutoSeniorityRanking(eligibleTeachers.filter((teacher) => (
            statusView === 'ACTIVE' ? teacher.isActive !== false : teacher.isActive === false
        ))).filter((teacher) => {
            if (!query) return true;
            return [
                teacher.fullNameBng,
                teacher.fullNameEng,
                teacher.teacherCode,
                teacher.phone,
                teacher.designation,
                teacher.subject
            ].some((value) => String(value || '').toLowerCase().includes(query));
        });
    }, [eligibleTeachers, searchQuery, statusView]);

    return (
        <main className="space-y-5 animate-fade-up">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-1 flex items-center gap-2 text-emerald-deep">
                        <Users className="h-5 w-5 text-gold-deep" />
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest">
                            Teacher Directory
                        </span>
                    </div>
                    <h1 className="font-bengali text-xl font-bold text-emerald-deep sm:text-2xl">
                        শিক্ষক ও কর্মচারী
                    </h1>
                    <p className="font-bengali text-xs text-ink-soft">
                        {filteredTeachers.length} জন · প্রোফাইল দেখতে কার্ডে ক্লিক করুন
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                        type="button"
                        disabled={filteredTeachers.length === 0}
                        onClick={() => openOfficialIdCardsPrint(filteredTeachers)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold/50 bg-emerald px-3.5 py-2.5 font-bengali text-xs font-bold text-white shadow-xs transition hover:bg-emerald-deep disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Printer className="h-4 w-4 text-gold-soft" />
                        সকল আইডি কার্ড প্রিন্ট
                    </button>
                    <div className="flex rounded-xl border border-ink-faint bg-paper-deep p-1">
                        {[
                            { key: 'ACTIVE', label: 'সক্রিয়', count: activeCount },
                            { key: 'FORMER', label: 'সাবেক', count: formerCount }
                        ].map((view) => (
                            <button
                                key={view.key}
                                type="button"
                                onClick={() => setStatusView(view.key)}
                                className={`rounded-lg px-3 py-2 font-bengali text-xs transition ${statusView === view.key ? 'bg-emerald text-white' : 'text-ink-soft hover:text-ink'}`}
                            >
                                {view.label} ({view.count})
                            </button>
                        ))}
                    </div>
                    <label className="relative block w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="নাম, আইডি বা মোবাইল নম্বর খুঁজুন"
                        className="erp-input pl-10 font-bengali text-sm"
                    />
                    </label>
                </div>
            </header>

            {isLoading ? (
                <div className="rounded-2xl border border-ink-faint bg-paper-panel p-8 text-center font-bengali text-sm text-ink-soft">
                    শিক্ষক তালিকা লোড হচ্ছে…
                </div>
            ) : filteredTeachers.length === 0 ? (
                <div className="rounded-2xl border border-ink-faint bg-paper-panel p-8 text-center">
                    <UserRound className="mx-auto mb-2 h-8 w-8 text-ink-muted" />
                    <p className="font-bengali text-sm text-ink-soft">
                        {teachers.length ? 'এই অনুসন্ধানের কোনো ফল পাওয়া যায়নি।' : 'কোনো শিক্ষক পাওয়া যায়নি।'}
                    </p>
                </div>
            ) : (
                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredTeachers.map((teacher) => (
                        <div
                            key={teacher._id}
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/admin/teachers/${teacher._id}`, { state: { teacher } })}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    navigate(`/admin/teachers/${teacher._id}`, { state: { teacher } });
                                }
                            }}
                            className="group flex w-full items-center gap-4 rounded-2xl border border-ink-faint bg-paper-panel p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-gold hover:shadow-ledger focus:outline-none focus:ring-2 focus:ring-gold"
                        >
                            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gold/40 bg-emerald text-2xl font-bold text-gold-soft">
                                {teacher.profilePicture?.url ? (
                                    <img
                                        src={teacher.profilePicture.url}
                                        alt={teacher.fullNameEng || teacher.fullNameBng}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    (teacher.fullNameBng || teacher.fullNameEng || '?').charAt(0)
                                )}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-bengali text-base font-bold text-emerald-deep group-hover:text-emerald">
                                    {teacher.fullNameBng || 'নাম নেই'}
                                </span>
                                <span className="mt-0.5 block truncate font-sans text-xs text-ink-soft">
                                    {teacher.fullNameEng || '—'}
                                </span>
                                <span className="mt-2 flex flex-wrap items-center gap-2">
                                    <Badge variant="gold" size="sm" mono>{teacher.teacherCode || 'No ID'}</Badge>
                                    {statusView === 'FORMER' && (
                                        <span className="rounded-full bg-paper-deep px-2 py-0.5 font-bengali text-[10px] text-ink-muted">
                                            সাবেক
                                        </span>
                                    )}
                                    <span className="font-mono text-[11px] text-ink-muted">
                                        {formatPhoneDisplay(teacher.phone)}
                                    </span>
                                </span>
                            </span>
                        </div>
                    ))}
                </section>
            )}
        </main>
    );
}
