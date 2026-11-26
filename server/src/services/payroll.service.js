const moment = require('moment-timezone');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const LoanAdvance = require('../models/LoanAdvance');
const SystemSettings = require('../models/SystemSettings');
const {
    ATTENDANCE_STATUS,
    SALARY_ADJUSTMENT_MODES
} = require('../constants/system.constants');
const ApiError = require('../utils/ApiError');

const PAYROLL_EDIT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const isPayrollEditable = (salary, now = new Date()) => {
    const generatedAt = salary?.generatedAt || salary?.createdAt;
    if (!generatedAt) return false;
    const generatedTime = new Date(generatedAt).getTime();
    const age = now.getTime() - generatedTime;
    return Number.isFinite(generatedTime) && age >= 0 && age <= PAYROLL_EDIT_WINDOW_MS;
};

// নির্দিষ্ট মাস ও বছরে ক্যালেন্ডার অনুযায়ী মোট কত দিন (২৮, ২৯, ৩০ নাকি ৩১) তা বের করার হেল্পার
const getEffectiveDaysInMonth = (month, year, payrollPolicy = {}) => {
    const calendarDays = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').daysInMonth();
    if (payrollPolicy.useExactCalendarDays === false) {
        return payrollPolicy.daysInSalaryMonth || 30;
    }
    return calendarDays; // 28, 29, 30, or 31
};

// ১. ৬টি মোডে টাকার হিসাব বের করা (মাসের প্রকৃত দিন অনুযায়ী ১ দিনের বেতন হিসাব হবে)
const calculateAdjustmentByMode = (baseSalary, mode, value, daysInMonth = null) => {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) {
        throw new ApiError(400, 'অ্যাডজাস্টমেন্ট ভ্যালু অবশ্যই ০ এর চেয়ে বড় সংখ্যা হতে হবে!');
    }

    // যদি দিন সংখ্যা না দেওয়া থাকে, তবে চলতি মাসের ক্যালেন্ডার দিন নেবে
    const effectiveDays = daysInMonth || moment.tz('Asia/Dhaka').daysInMonth();
    const perDaySalary = baseSalary / effectiveDays;
    let changedAmount = 0;

    switch (mode) {
        case SALARY_ADJUSTMENT_MODES.INCREASE_AMOUNT:
            changedAmount = Math.round(numValue);
            break;
        case SALARY_ADJUSTMENT_MODES.DECREASE_AMOUNT:
            changedAmount = -Math.round(numValue);
            break;
        case SALARY_ADJUSTMENT_MODES.INCREASE_PERCENT:
            changedAmount = Math.round((baseSalary * numValue) / 100);
            break;
        case SALARY_ADJUSTMENT_MODES.DECREASE_PERCENT:
            changedAmount = -Math.round((baseSalary * numValue) / 100);
            break;
        case SALARY_ADJUSTMENT_MODES.INCREASE_DAYS:
            changedAmount = Math.round(perDaySalary * numValue);
            break;
        case SALARY_ADJUSTMENT_MODES.DECREASE_DAYS:
            changedAmount = -Math.round(perDaySalary * numValue);
            break;
        default:
            throw new ApiError(400, `সঠিক মোড নির্বাচন করুন: ${Object.values(SALARY_ADJUSTMENT_MODES).join(', ')}`);
    }

    const newSalary = Math.max(0, Math.round(baseSalary + changedAmount));
    return {
        previousSalary: baseSalary,
        daysDivisorUsed: effectiveDays,
        perDaySalary: Number(perDaySalary.toFixed(2)),
        changedAmount,
        newSalary
    };
};

// ২. মাসের মাঝখানে জয়েন বা রিজাইন করলে ওই মাসের প্রকৃত দিন (২৮/২৯/৩০/৩১) অনুযায়ী Pro-Rata হিসাব
const calculateProRataBasicSalary = (teacher, month, year, effectiveDaysInMonth, enableProRata = true) => {
    const monthStart = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').startOf('month');
    const monthEnd = monthStart.clone().endOf('month');
    const calendarDaysInMonth = monthEnd.date(); // 28, 29, 30, or 31

    if (!enableProRata) {
        return {
            isProRated: false,
            totalDaysInMonth: calendarDaysInMonth,
            activeDaysInMonth: calendarDaysInMonth,
            effectiveBasicSalary: teacher.basicSalary
        };
    }

    const joinMoment = teacher.joiningDate ? moment.tz(teacher.joiningDate, 'Asia/Dhaka').startOf('day') : null;
    const resignMoment = teacher.resignationDate ? moment.tz(teacher.resignationDate, 'Asia/Dhaka').endOf('day') : null;

    if (joinMoment && joinMoment.isAfter(monthEnd)) {
        return { isProRated: true, totalDaysInMonth: calendarDaysInMonth, activeDaysInMonth: 0, effectiveBasicSalary: 0 };
    }

    const effectiveStart = (joinMoment && joinMoment.isAfter(monthStart)) ? joinMoment : monthStart;
    const effectiveEnd = (resignMoment && resignMoment.isBefore(monthEnd)) ? resignMoment : monthEnd;

    if (effectiveEnd.isBefore(effectiveStart)) {
        return { isProRated: true, totalDaysInMonth: calendarDaysInMonth, activeDaysInMonth: 0, effectiveBasicSalary: 0 };
    }

    const activeCalendarDays = effectiveEnd.diff(effectiveStart, 'days') + 1;

    if (activeCalendarDays >= calendarDaysInMonth) {
        return {
            isProRated: false,
            totalDaysInMonth: calendarDaysInMonth,
            activeDaysInMonth: calendarDaysInMonth,
            effectiveBasicSalary: teacher.basicSalary
        };
    }

    // আনুপাতিক বেতন = (মূল বেতন / ওই মাসের মোট দিন) * সক্রিয় দিন
    const effectiveBasicSalary = Math.round((teacher.basicSalary / effectiveDaysInMonth) * activeCalendarDays);
    return {
        isProRated: true,
        totalDaysInMonth: calendarDaysInMonth,
        activeDaysInMonth: activeCalendarDays,
        effectiveBasicSalary
    };
};

// ৩. পূর্ণাঙ্গ মাসিক পে-রোল ক্যালকুলেশন
const calculateTeacherMonthlyPayroll = async ({
    teacher,
    month,
    year,
    basicSalaryOverride = null,
    manualDeductibleDays = null,
    includeBonus = false,
    bonusPercentage = null,
    bonusTitle = null,
    bonusAmountOverride = null,
    adjustmentMode = null,
    adjustmentValue = 0,
    adjustmentReason = null,
    extraAllowance = 0,
    extraDeduction = 0,
    adjustmentNote = null,
    preparedOn = '',
    generatedBy = null,
    adjustmentAmountOverride = null,
    persist = true
}) => {
    const settings = await SystemSettings.getSettings();
    const attPolicy = settings.attendancePolicy;
    const payPolicy = settings.payrollPolicy;

    const startDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').startOf('month').format('YYYY-MM-DD');
    const endDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').endOf('month').format('YYYY-MM-DD');
    const yearStartDate = `${year}-01-01`;

    // ওই মাসে ক্যালেন্ডার অনুযায়ী মোট কত দিন (২৮, ২৯, ৩০ বা ৩১ দিন)
    const daysDivisor = getEffectiveDaysInMonth(month, year, payPolicy);

    const logs = await Attendance.find({
        teacherId: teacher._id,
        date: { $gte: startDate, $lte: endDate }
    }).lean();

    let totalPresent = 0;
    let totalExcusedLateOrDuty = 0;
    let totalLateCount = 0;
    let totalLeaveCount = 0;
    let totalUnexcusedAbsentCount = 0;
    let totalApprovedLeaveCount = 0;
    let totalIgnoredDays = 0;

    let totalQuotaUsed = 0;
    let directAbsentPenaltyDays = 0;

    for (const log of logs) {
        if (log.isIgnored) {
            totalIgnoredDays++;
            continue;
        }
        if (log.status === ATTENDANCE_STATUS.PRESENT || log.status === ATTENDANCE_STATUS.HOLIDAY_DUTY) {
            totalPresent++;
        } else if (log.status === ATTENDANCE_STATUS.EXCUSED_LATE || log.status === ATTENDANCE_STATUS.OFFICIAL_DUTY) {
            totalPresent++;
            totalExcusedLateOrDuty++;
        } else if (log.status === ATTENDANCE_STATUS.LATE) {
            totalLateCount++;
            totalQuotaUsed += Number(log.quotaDeduction ?? log.deductionWeight) || 0;
        } else if (log.status === ATTENDANCE_STATUS.LEAVE) {
            totalLeaveCount++;
            totalQuotaUsed += Number(log.quotaDeduction ?? log.deductionWeight) || 0;
        } else if (log.status === ATTENDANCE_STATUS.ABSENT) {
            totalUnexcusedAbsentCount++;
            directAbsentPenaltyDays += (Number(log.salaryDeduction ?? log.directSalaryPenaltyDays) || attPolicy.absentPenaltyDays);
        } else if (
            log.status === ATTENDANCE_STATUS.APPROVED_SICK_LEAVE ||
            log.status === ATTENDANCE_STATUS.APPROVED_CASUAL_LEAVE
        ) {
            totalApprovedLeaveCount++;
        }
    }

    const monthlyPaidLeaveQuota = Math.max(
        0,
        Number(teacher.customLeaveQuota ?? attPolicy.monthlyPaidLeaveQuota) || 0
    );
    const joiningMoment = teacher.joiningDate
        ? moment.tz(teacher.joiningDate, 'Asia/Dhaka')
        : null;
    const resignationMoment = teacher.resignationDate
        ? moment.tz(teacher.resignationDate, 'Asia/Dhaka')
        : null;
    const joiningYear = joiningMoment?.isValid() ? joiningMoment.year() : Number(year) - 1;
    const resignationYear = resignationMoment?.isValid() ? resignationMoment.year() : Number(year) + 1;
    const firstQuotaMonth = joiningYear < Number(year)
        ? 1
        : joiningYear === Number(year)
            ? joiningMoment.month() + 1
            : 13;
    const lastQuotaMonth = resignationYear < Number(year)
        ? 0
        : resignationYear === Number(year)
            ? resignationMoment.month() + 1
            : 12;
    const accruedMonthsBefore = Math.max(
        0,
        Math.min(Number(month) - 1, lastQuotaMonth) - firstQuotaMonth + 1
    );
    const currentMonthQuota = Number(month) >= firstQuotaMonth && Number(month) <= lastQuotaMonth
        ? monthlyPaidLeaveQuota
        : 0;
    let quotaUsedBeforeMonth = 0;
    if (accruedMonthsBefore > 0) {
        const previousLogs = await Attendance.find({
            teacherId: teacher._id,
            date: { $gte: yearStartDate, $lt: startDate },
            status: { $in: [ATTENDANCE_STATUS.LATE, ATTENDANCE_STATUS.LEAVE] },
            isIgnored: { $ne: true }
        }).select('quotaDeduction deductionWeight').lean();
        quotaUsedBeforeMonth = previousLogs.reduce(
            (total, log) => total + (Number(log.quotaDeduction ?? log.deductionWeight) || 0),
            0
        );
    }
    const accruedQuotaBeforeMonth = monthlyPaidLeaveQuota * accruedMonthsBefore;
    const carryForwardQuota = Math.max(
        0,
        Number((accruedQuotaBeforeMonth - quotaUsedBeforeMonth).toFixed(2))
    );
    const allowedPaidQuota = Number((currentMonthQuota + carryForwardQuota).toFixed(2));
    const remainingPaidQuota = Math.max(0, Number((allowedPaidQuota - totalQuotaUsed).toFixed(2)));
    const excessQuotaDays = Math.max(0, Number((totalQuotaUsed - allowedPaidQuota).toFixed(2)));
    const totalDeductibleDays = excessQuotaDays + directAbsentPenaltyDays;

    const basicSalary = basicSalaryOverride == null
        ? teacher.basicSalary
        : Number(basicSalaryOverride);
    if (!Number.isFinite(basicSalary) || basicSalary < 0) {
        throw new ApiError(400, 'বেতনের মূল পরিমাণ শূন্য বা তার বেশি হতে হবে।');
    }
    // ওই মাসের প্রকৃত দিন (২৮/২৯/৩০/৩১) দিয়ে ভাগ করে ১ দিনের বেতন বের করা হচ্ছে
    const perDaySalary = Number((basicSalary / daysDivisor).toFixed(2));

    const proRataInfo = calculateProRataBasicSalary(
        { ...teacher, basicSalary },
        month,
        year,
        daysDivisor,
        payPolicy.enableProRataForMidMonthJoin
    );

    const effectiveDeductibleDays = manualDeductibleDays == null
        ? totalDeductibleDays
        : Number(manualDeductibleDays);
    if (
        !Number.isFinite(effectiveDeductibleDays) ||
        effectiveDeductibleDays < 0 ||
        effectiveDeductibleDays > daysDivisor
    ) {
        throw new ApiError(400, `কর্তনযোগ্য দিন ০ থেকে ${daysDivisor} দিনের মধ্যে হতে হবে।`);
    }
    const leaveAndAbsentDeductionAmount = Math.round(effectiveDeductibleDays * (basicSalary / daysDivisor));

    const finalBonusPercent = includeBonus
        ? Number(bonusPercentage ?? payPolicy.defaultBonusPercent)
        : 0;
    const calculatedBonusAmount = includeBonus ? Math.round((basicSalary * finalBonusPercent) / 100) : 0;
    const bonusAmount = bonusAmountOverride == null
        ? calculatedBonusAmount
        : Number(bonusAmountOverride);
    if (!Number.isFinite(bonusAmount) || bonusAmount < 0) {
        throw new ApiError(400, 'বোনাসের পরিমাণ শূন্য বা তার বেশি হতে হবে।');
    }

    let customAdjustmentObj = { mode: null, value: 0, amount: 0, reason: null };
    if (adjustmentAmountOverride != null) {
        const amount = Number(adjustmentAmountOverride);
        if (!Number.isFinite(amount) || Math.abs(amount) > 1000000000) {
            throw new ApiError(400, 'সমন্বয়ের পরিমাণ সঠিক নয়।');
        }
        customAdjustmentObj = {
            mode: amount > 0
                ? SALARY_ADJUSTMENT_MODES.INCREASE_AMOUNT
                : amount < 0
                    ? SALARY_ADJUSTMENT_MODES.DECREASE_AMOUNT
                    : null,
            value: Math.abs(amount),
            amount,
            reason: amount === 0 ? null : (adjustmentReason || 'মাসিক বিশেষ সমন্বয়')
        };
    } else if (adjustmentMode && Number(adjustmentValue) > 0) {
        const adj = calculateAdjustmentByMode(basicSalary, adjustmentMode, adjustmentValue, daysDivisor);
        customAdjustmentObj = {
            mode: adjustmentMode,
            value: Number(adjustmentValue),
            amount: adj.changedAmount,
            reason: adjustmentReason || 'মাসিক বিশেষ সমন্বয়'
        };
    }

    let loanDeductionObj = { loanId: null, installmentAmount: 0, remainingAfterThisMonth: 0 };
    if (payPolicy.autoDeductLoanInstallment) {
        const activeLoan = await LoanAdvance.findOne({
            teacherId: teacher._id,
            status: 'Active',
            remainingBalance: { $gt: 0 }
        }).sort({ createdAt: 1 }).lean();

        if (activeLoan) {
            const emiAmount = Math.min(activeLoan.monthlyInstallment, activeLoan.remainingBalance);
            loanDeductionObj = {
                loanId: activeLoan._id,
                installmentAmount: emiAmount,
                remainingAfterThisMonth: Math.max(0, activeLoan.remainingBalance - emiAmount)
            };
        }
    }

    const rawNetPayable =
        proRataInfo.effectiveBasicSalary -
        leaveAndAbsentDeductionAmount -
        loanDeductionObj.installmentAmount +
        (includeBonus ? bonusAmount : 0) +
        customAdjustmentObj.amount +
        Number(extraAllowance) -
        Number(extraDeduction);

    const netPayableSalary = Math.max(0, Math.round(rawNetPayable));

    const salaryValues = {
        teacherId: teacher._id,
        month,
        year,
        basicSalarySnapshot: basicSalary,
        proRataInfo,
        perDaySalary,
        attendanceBreakdown: {
            totalPresent,
            totalExcusedLateOrDuty,
            totalLateCount,
            totalLeaveCount,
            totalUnexcusedAbsentCount,
            totalApprovedLeaveCount,
            totalIgnoredDays,
            totalQuotaUsed,
            allowedPaidQuota,
            carryForwardQuota,
            remainingPaidQuota,
            excessQuotaDays,
            directAbsentPenaltyDays,
            totalDeductibleDays
        },
        leaveAndAbsentDeductionAmount,
        manualDeductibleDays: manualDeductibleDays == null ? null : effectiveDeductibleDays,
        preparedOn,
        loanDeduction: loanDeductionObj,
        includeBonus,
        bonusPercentage: finalBonusPercent,
        bonusTitle: includeBonus ? (bonusTitle || 'উৎসব বোনাস') : null,
        bonusAmount,
        customAdjustment: customAdjustmentObj,
        extraAllowance: Number(extraAllowance),
        extraDeduction: Number(extraDeduction),
        adjustmentNote,
        netPayableSalary,
        generatedBy
    };

    if (!persist) {
        return {
            skipped: false,
            salary: {
                ...salaryValues,
                originalBasicSalarySnapshot: teacher.basicSalary,
                generatedAt: null
            }
        };
    }

    const salaryRecord = await Salary.findOneAndUpdate(
        { teacherId: teacher._id, month, year },
        {
            $set: salaryValues,
            $setOnInsert: {
                generatedAt: new Date(),
                originalBasicSalarySnapshot: basicSalary
            }
        },
        { upsert: true, new: true, runValidators: true }
    );

    return { skipped: false, salary: salaryRecord };
};

module.exports = {
    getEffectiveDaysInMonth,
    calculateAdjustmentByMode,
    calculateRevisedSalary: calculateAdjustmentByMode,
    calculateProRataBasicSalary,
    isPayrollEditable,
    calculateTeacherMonthlyPayroll
};
