import React from 'react';
import './SalaryStatement.css';

const formatNumber = (value) => (Number(value) || 0).toLocaleString('en-IN');

const formatAttendanceDate = (value) => {
    const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return value || 'তারিখ পাওয়া যায়নি';
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
    }).format(new Date(Date.UTC(year, month - 1, day)));
};

const formatPunchTime = (value) => {
    if (!value) return 'সময় পাওয়া যায়নি';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'সময় পাওয়া যায়নি';
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Dhaka'
    }).format(date);
};

const attendanceCategories = [
    { key: 'absent', label: 'অনুপস্থিত', statuses: ['Absent'] },
    {
        key: 'leave',
        label: 'ছুটি',
        statuses: ['Leave', 'Approved Sick Leave', 'Approved Casual Leave']
    },
    { key: 'late', label: 'বিলম্ব', statuses: ['Late', 'Late (Excused)'] }
];

const numberToWordsEnglish = (value) => {
    const number = Math.round(Number(value) || 0);
    if (number === 0) return 'Zero';
    const belowTwenty = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tensWords = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const threeDigits = (part) => {
        const words = [];
        if (part >= 100) {
            words.push(`${belowTwenty[Math.floor(part / 100)]} Hundred`);
            part %= 100;
        }
        if (part >= 20) {
            words.push(tensWords[Math.floor(part / 10)]);
            part %= 10;
        }
        if (part > 0) words.push(belowTwenty[part]);
        return words.join(' ');
    };

    let remaining = Math.max(0, number);
    const groups = [
        [10000000, 'Crore'],
        [100000, 'Lakh'],
        [1000, 'Thousand'],
        [1, '']
    ];
    const words = [];
    groups.forEach(([divisor, label]) => {
        const group = Math.floor(remaining / divisor);
        if (group > 0) {
            words.push(`${threeDigits(group)}${label ? ` ${label}` : ''}`);
            remaining %= divisor;
        }
    });
    return words.join(' ');
};

export default function SalaryStatement({
    rows,
    month,
    year,
    monthOptions,
    yearOptions,
    institution,
    bonusEnabled,
    onMonthChange,
    onYearChange,
    salaryEditUnlocked,
    isEditable,
    preparedOn,
    onPreparedOnChange,
    onUpdateRow,
    onAdjustRow,
    showAdjustments,
    totals,
    viewMode = 'salary',
    attendanceDetailsEnabled = false,
    attendanceDetails = [],
    attendanceDetailsLoading = false,
    attendanceDetailsError = '',
    onToggleAttendanceDetails,
    onRetryAttendanceDetails
}) {
    const hideAbsentOnPrint = bonusEnabled && showAdjustments;
    const attendanceRows = rows.filter((row) => {
        const breakdown = row.attendanceBreakdown || {};
        return (
            Number(breakdown.totalUnexcusedAbsentCount) > 0 ||
            Number(breakdown.totalLeaveCount) > 0 ||
            Number(breakdown.totalApprovedLeaveCount) > 0 ||
            Number(breakdown.totalLateCount) > 0
        );
    });
    const attendanceTeacherIds = new Set(attendanceRows.map((row) => row.teacherId));
    const attendanceDetailTeachers = attendanceDetails.filter((teacher) => (
        attendanceTeacherIds.has(String(teacher.teacherId)) &&
        (teacher.records || []).some((record) => (
            attendanceCategories.some((category) => category.statuses.includes(record.status))
        ))
    ));
    const attendanceTotals = attendanceRows.reduce((result, row) => {
        const breakdown = row.attendanceBreakdown || {};
        result.absent += Number(breakdown.totalUnexcusedAbsentCount) || 0;
        result.leave += (Number(breakdown.totalLeaveCount) || 0) +
            (Number(breakdown.totalApprovedLeaveCount) || 0);
        result.late += Number(breakdown.totalLateCount) || 0;
        result.quotaUsed += Number(breakdown.totalQuotaUsed) || 0;
        result.carryForward += Number(breakdown.carryForwardQuota) || 0;
        result.availableQuota += Number(breakdown.allowedPaidQuota) || 0;
        result.excess += Number(breakdown.excessQuotaDays) || 0;
        result.absentPenalty += Number(breakdown.directAbsentPenaltyDays) || 0;
        result.deductibleDays += Number(row.deductibleDays) || 0;
        return result;
    }, {
        absent: 0,
        leave: 0,
        late: 0,
        quotaUsed: 0,
        carryForward: 0,
        availableQuota: 0,
        excess: 0,
        absentPenalty: 0,
        deductibleDays: 0
    });

    return (
        <div
            id="salary-print-root"
            className={`document-container${viewMode === 'salary' && bonusEnabled ? ' show-bonus' : ''}${viewMode === 'salary' && showAdjustments ? ' show-adjust' : ''}${viewMode === 'salary' && hideAbsentOnPrint ? ' hide-absent-print' : ''}`}
        >
            <div className="text-center mb-8 no-print border-b-2 border-gray-200 pb-6">
                <h1 className="text-3xl font-bold text-gray-900 tracking-wide">{institution.nameEng}</h1>
                <p className="text-gray-600 mt-1 font-medium">
                    {institution.postOffice}, {institution.upazila}, Chattogram.
                </p>
            </div>

            <div className="salary-period-row no-print text-xl">
                <div>
                    Month:{' '}
                    <select
                        id="month-input"
                        className="inline-input"
                        value={month}
                        onChange={(event) => onMonthChange(event.target.value)}
                    >
                        {monthOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    Year:{' '}
                    <select
                        id="year-input"
                        className="inline-input"
                        value={year}
                        onChange={(event) => onYearChange(event.target.value)}
                    >
                        {yearOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="print-title-row text-center">
                <h2 id="statement-title" className="text-xl font-bold inline-block border-b-2 border-black pb-1 uppercase tracking-wider">
                    {viewMode === 'salary' ? 'Salary Statement' : 'Monthly Absence Statement'} of {monthOptions.find((option) => option.value === month)?.label} - {year}
                </h2>
            </div>

            {viewMode === 'attendance' ? (
                <table id="main-table" className="attendance-table">
                    <thead>
                        <tr>
                            <th style={{ width: '4%' }}>Sl.</th>
                            <th className="name-col" style={{ width: '21%', textAlign: 'left' }}>Name of Employee</th>
                            <th style={{ width: '8.333%' }}>Abs</th>
                            <th style={{ width: '8.333%' }}>Leave</th>
                            <th style={{ width: '8.333%' }}>Late</th>
                            <th style={{ width: '8.333%' }}>Quota Used</th>
                            <th style={{ width: '8.333%' }}>Carry Forward</th>
                            <th style={{ width: '8.333%' }}>Total Quota</th>
                            <th style={{ width: '8.333%' }}>Excess</th>
                            <th style={{ width: '8.333%' }}>Abs Penalty</th>
                            <th style={{ width: '8.333%' }}>Deduct Days</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceRows.map((row, index) => {
                            const breakdown = row.attendanceBreakdown || {};
                            return (
                                <tr key={row.teacherId} data-id={row.teacherId}>
                                    <td className="text-center">{index + 1}</td>
                                    <td className="name-col">{row.fullNameEng || row.fullNameBng}</td>
                                    <td className="text-center">{formatNumber(breakdown.totalUnexcusedAbsentCount)}</td>
                                    <td className="text-center">
                                        {formatNumber(
                                            (Number(breakdown.totalLeaveCount) || 0) +
                                            (Number(breakdown.totalApprovedLeaveCount) || 0)
                                        )}
                                    </td>
                                    <td className="text-center">{formatNumber(breakdown.totalLateCount)}</td>
                                    <td className="text-center">{formatNumber(breakdown.totalQuotaUsed)}</td>
                                    <td className="text-center">{formatNumber(breakdown.carryForwardQuota)}</td>
                                    <td className="text-center">{formatNumber(breakdown.allowedPaidQuota)}</td>
                                    <td className="text-center">{formatNumber(breakdown.excessQuotaDays)}</td>
                                    <td className="text-center">{formatNumber(breakdown.directAbsentPenaltyDays)}</td>
                                    <td className="text-center font-semibold">{formatNumber(row.deductibleDays)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={2} className="text-right font-bold">Total</td>
                            <td className="text-center font-bold">{formatNumber(attendanceTotals.absent)}</td>
                            <td className="text-center font-bold">{formatNumber(attendanceTotals.leave)}</td>
                            <td className="text-center font-bold">{formatNumber(attendanceTotals.late)}</td>
                            <td className="text-center font-bold">{formatNumber(attendanceTotals.quotaUsed)}</td>
                            <td className="text-center font-bold">{formatNumber(attendanceTotals.carryForward)}</td>
                            <td className="text-center font-bold">{formatNumber(attendanceTotals.availableQuota)}</td>
                            <td className="text-center font-bold">{formatNumber(attendanceTotals.excess)}</td>
                            <td className="text-center font-bold">{formatNumber(attendanceTotals.absentPenalty)}</td>
                            <td className="text-center font-bold">{formatNumber(attendanceTotals.deductibleDays)}</td>
                        </tr>
                    </tfoot>
                </table>
            ) : (
            <table
                id="main-table"
                className={`${bonusEnabled ? 'show-bonus ' : ''}${showAdjustments ? 'show-adjust ' : ''}${hideAbsentOnPrint ? 'hide-absent-print' : ''}`}
            >
                <thead>
                    <tr>
                        <th style={{ width: '3%' }}>Sl.</th>
                        <th style={{ width: '27%', textAlign: 'left' }}>Name of Employee</th>
                        <th style={{ width: '12%', textAlign: 'center' }}>Salary</th>
                        <th className="absent-col" style={{ width: '8%', textAlign: 'center' }}>Absent</th>
                        <th style={{ width: '11%', textAlign: 'center' }}>
                            <span id="deduct-header-label">{bonusEnabled || showAdjustments ? 'Deduct' : 'Deduction'}</span>
                        </th>
                        <th className="bonus-col" style={{ width: '10%', textAlign: 'center' }}>Bonus</th>
                        <th className="adjust-col" style={{ width: '10%', textAlign: 'center' }}>Adjust</th>
                        <th style={{ width: '11%', textAlign: 'center' }}>Total</th>
                        <th className="signature-col" style={{ width: '10%' }}>Signature</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={row.teacherId} data-id={row.teacherId}>
                            <td className="text-center">{index + 1}</td>
                            <td className="name-col">
                                {row.fullNameEng || row.fullNameBng}
                                <span className="desig-sub">{row.designationEng || row.designationBng}</span>
                            </td>
                            <td className="input-cell">
                                <input
                                    type="number"
                                    className="salary-input"
                                    data-field="salary"
                                    value={row.basicSalary}
                                    readOnly={!salaryEditUnlocked || !isEditable}
                                    onChange={(event) => onUpdateRow(row.teacherId, {
                                        basicSalary: event.target.value === '' ? '' : Math.max(0, Number(event.target.value) || 0)
                                    })}
                                />
                            </td>
                            <td className="input-cell absent-col">
                                <input
                                    type="number"
                                    className="absent-input"
                                    min="0"
                                    max={row.daysDivisor}
                                    step="0.5"
                                    value={row.deductibleDays || ''}
                                    readOnly={!isEditable}
                                    onChange={(event) => onUpdateRow(row.teacherId, {
                                        deductibleDays: event.target.value === ''
                                            ? ''
                                            : Math.min(row.daysDivisor, Math.max(0, Number(event.target.value) || 0))
                                    })}
                                />
                                <span className="absent-print-display">
                                    {row.deductibleDays > 0
                                        ? `${row.deductibleDays} ${Number(row.deductibleDays) === 1 ? 'day' : 'days'}`
                                        : ''}
                                </span>
                            </td>
                            <td className="input-cell">
                                <input
                                    type="number"
                                    className="extra-input"
                                    value={row.amounts.deduction || ''}
                                    readOnly
                                />
                            </td>
                            <td className="input-cell bonus-col">
                                <input
                                    type="number"
                                    className="bonus-input"
                                    placeholder="0"
                                    value={row.bonusAmount || ''}
                                    readOnly={!isEditable}
                                    onChange={(event) => onUpdateRow(row.teacherId, {
                                        bonusAmount: event.target.value === '' ? '' : Math.max(0, Number(event.target.value) || 0)
                                    })}
                                />
                            </td>
                            <td
                                className="input-cell adjust-col"
                                onClick={() => {
                                    if (isEditable) onAdjustRow(row);
                                }}
                            >
                                <input type="hidden" className="adjust-input" value={row.adjustmentAmount || ''} readOnly />
                                <span className={`adjust-display${row.adjustmentAmount > 0 ? ' is-plus' : row.adjustmentAmount < 0 ? ' is-minus' : ' is-empty'}`}>
                                    {row.adjustmentAmount > 0
                                        ? `+${formatNumber(row.adjustmentAmount)}`
                                        : row.adjustmentAmount < 0
                                            ? formatNumber(row.adjustmentAmount)
                                            : '—'}
                                </span>
                            </td>
                            <td className="text-right font-semibold total-col">
                                {formatNumber(row.amounts.netPayable)}
                            </td>
                            <td className="signature-col" />
                        </tr>
                    ))}
                </tbody>
            </table>
            )}

            {viewMode === 'attendance' ? (
                <div id="footer-block">
                    <div className="flex justify-end mt-4 pr-4">
                        <div className="text-xs font-semibold text-gray-700">
                            কোটা ব্যবহারে Leave ও Late অন্তর্ভুক্ত; Absent penalty আলাদা হিসেবে দেখানো হয়েছে।
                        </div>
                    </div>
                    <div className="flex justify-end mt-2 pr-4">
                        <div className="text-xs font-semibold text-gray-700">
                            Prepared on: {preparedOn}
                        </div>
                    </div>
                </div>
            ) : (
            <div id="footer-block">
                <div className="flex justify-end mt-4 pr-4">
                    <div className="text-base font-semibold text-gray-700 pb-1">
                        Total Basic : <span className="inline-block min-w-[100px] text-right">{formatNumber(totals.basicSalary)}</span>/=
                    </div>
                </div>
                {totals.bonus > 0 && (
                    <div className="flex justify-end pr-4">
                        <div className="text-base font-semibold text-emerald-600 pb-1">
                            Total Bonus : <span className="inline-block min-w-[100px] text-right">+{formatNumber(totals.bonus)}</span>/=
                        </div>
                    </div>
                )}
                {totals.adjustmentPlus > 0 && (
                    <div className="flex justify-end pr-4">
                        <div className="text-base font-semibold text-blue-600 pb-1">
                            Total Adjust (+) : <span className="inline-block min-w-[100px] text-right">+{formatNumber(totals.adjustmentPlus)}</span>/=
                        </div>
                    </div>
                )}
                {totals.adjustmentMinus < 0 && (
                    <div className="flex justify-end pr-4">
                        <div className="text-base font-semibold text-orange-600 pb-1">
                            Total Adjust (-) : <span className="inline-block min-w-[100px] text-right">{formatNumber(totals.adjustmentMinus)}</span>/=
                        </div>
                    </div>
                )}
                <div className="flex justify-end pr-4">
                    <div className="text-base font-semibold text-red-600 pb-1 border-b border-gray-400">
                        Total Deduction : <span className="inline-block min-w-[100px] text-right">{formatNumber(totals.deduction)}</span>/=
                    </div>
                </div>
                <div className="flex justify-end mt-4 pr-4">
                    <div className="text-lg font-bold text-black pb-1">
                        Net Payable Amount : <span className="inline-block min-w-[100px] text-right">{formatNumber(totals.netPayable)}</span>/=
                    </div>
                </div>
                <div className="flex justify-end pr-4">
                    <div className="text-xs font-semibold text-gray-700">
                        In Words: {numberToWordsEnglish(totals.netPayable)} Taka Only
                    </div>
                </div>
                <div className="flex justify-end mt-2 pr-4">
                    <div className="text-xs font-semibold text-gray-700">
                        Prepared on:{' '}
                        <input
                            className="inline-input prepared-datetime no-print"
                            type="text"
                            value={preparedOn}
                            maxLength={100}
                            onChange={(event) => onPreparedOnChange(event.target.value)}
                            disabled={!isEditable}
                        />
                        <span className="prepared-print-display">{preparedOn}</span>
                    </div>
                </div>
                <div className="signature-block flex justify-between text-center text-sm font-bold">
                    <div>
                        <div className="border-t border-black w-32 mx-auto mb-1" />
                        <p>Prepared By</p>
                        <p className="font-normal text-xs">(Signature &amp; Date)</p>
                    </div>
                    <div>
                        <div className="border-t border-black w-32 mx-auto mb-1" />
                        <p>Date of Payment</p>
                    </div>
                    <div>
                        <div className="border-t border-black w-40 mx-auto mb-1" />
                        <p>Superintendent</p>
                        <p className="font-normal text-xs">(Signature &amp; Seal)</p>
                    </div>
                </div>
            </div>
            )}

            {viewMode === 'attendance' && (
                <>
                    <div className="attendance-detail-controls no-print">
                        <button
                            type="button"
                            className="attendance-detail-toggle"
                            onClick={onToggleAttendanceDetails}
                            aria-pressed={attendanceDetailsEnabled}
                        >
                            {attendanceDetailsEnabled ? 'বিস্তারিত বন্ধ করুন' : 'শিক্ষকভিত্তিক বিস্তারিত দেখুন'}
                        </button>
                        <span>অন করলে প্রত্যেক শিক্ষকের অনুপস্থিতি, ছুটি ও বিলম্বের তারিখ দেখা যাবে।</span>
                    </div>

                    {attendanceDetailsEnabled && (
                        <section className="attendance-details" aria-live="polite">
                            {attendanceDetailsLoading ? (
                                <p className="attendance-details-message no-print">হাজিরার বিস্তারিত লোড হচ্ছে…</p>
                            ) : attendanceDetailsError ? (
                                <div className="attendance-details-error no-print" role="alert">
                                    <span>{attendanceDetailsError}</span>
                                    <button type="button" onClick={onRetryAttendanceDetails}>আবার চেষ্টা করুন</button>
                                </div>
                            ) : attendanceDetailTeachers.length === 0 ? (
                                <p className="attendance-details-message">এই মাসে দেখানোর মতো হাজিরার বিস্তারিত নেই।</p>
                            ) : (
                                <>
                                    <h3 className="attendance-details-title">শিক্ষকভিত্তিক হাজিরার বিস্তারিত</h3>
                                    {attendanceDetailTeachers.map((teacher) => (
                                        <article className="attendance-detail-teacher" key={teacher.teacherId}>
                                            <h4>{teacher.fullNameBng || teacher.fullNameEng || teacher.teacherCode}</h4>
                                            <div className="attendance-detail-categories">
                                                {attendanceCategories.map((category) => {
                                                    const records = (teacher.records || []).filter((record) => (
                                                        category.statuses.includes(record.status)
                                                    ));
                                                    return (
                                                        <div className="attendance-detail-category" key={category.key}>
                                                            <strong>{category.label} ({records.length})</strong>
                                                            {records.length > 0 ? (
                                                                <ul>
                                                                    {records.map((record) => (
                                                                        <li key={`${record.date}-${record.status}`}>
                                                                            <span>{formatAttendanceDate(record.date)}</span>
                                                                            {category.key === 'late' && (
                                                                                <span className="attendance-detail-time">
                                                                                    {formatPunchTime(record.punchTime)}
                                                                                    {record.status === 'Late (Excused)' ? ' · মওকুফ' : ''}
                                                                                </span>
                                                                            )}
                                                                            {category.key === 'leave' && record.status !== 'Leave' && (
                                                                                <span className="attendance-detail-status">{record.status}</span>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p>এই মাসে নেই</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </article>
                                    ))}
                                </>
                            )}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
