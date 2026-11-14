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
    includeBonus = false,
    bonusPercentage = null,
    bonusTitle = null,
    adjustmentMode = null,
    adjustmentValue = 0,
    adjustmentReason = null,
    extraAllowance = 0,
    extraDeduction = 0,
    adjustmentNote = null,
    generatedBy = null
}) => {
    const settings = await SystemSettings.getSettings();
    const attPolicy = settings.attendancePolicy;
    const payPolicy = settings.payrollPolicy;

    const startDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').startOf('month').format('YYYY-MM-DD');
    const endDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').endOf('month').format('YYYY-MM-DD');

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
            totalQuotaUsed += log.deductionWeight;
        } else if (log.status === ATTENDANCE_STATUS.LEAVE) {
            totalLeaveCount++;
            totalQuotaUsed += log.deductionWeight;
        } else if (log.status === ATTENDANCE_STATUS.ABSENT) {
            totalUnexcusedAbsentCount++;
            directAbsentPenaltyDays += (log.directSalaryPenaltyDays || attPolicy.absentPenaltyDays);
        } else if (
            log.status === ATTENDANCE_STATUS.APPROVED_SICK_LEAVE ||
            log.status === ATTENDANCE_STATUS.APPROVED_CASUAL_LEAVE
        ) {
            totalApprovedLeaveCount++;
        }
    }

    const allowedPaidQuota = teacher.customLeaveQuota ?? attPolicy.monthlyPaidLeaveQuota;
    const remainingPaidQuota = Math.max(0, Number((allowedPaidQuota - totalQuotaUsed).toFixed(2)));
    const excessQuotaDays = Math.max(0, Number((totalQuotaUsed - allowedPaidQuota).toFixed(2)));
    const totalDeductibleDays = excessQuotaDays + directAbsentPenaltyDays;

    const basicSalary = teacher.basicSalary;
    // ওই মাসের প্রকৃত দিন (২৮/২৯/৩০/৩১) দিয়ে ভাগ করে ১ দিনের বেতন বের করা হচ্ছে
    const perDaySalary = Number((basicSalary / daysDivisor).toFixed(2));

    const proRataInfo = calculateProRataBasicSalary(
        teacher,
        month,
        year,
        daysDivisor,
        payPolicy.enableProRataForMidMonthJoin
    );

    const leaveAndAbsentDeductionAmount = Math.round(totalDeductibleDays * (basicSalary / daysDivisor));

    const finalBonusPercent = includeBonus
        ? Number(bonusPercentage ?? payPolicy.defaultBonusPercent)
        : 0;
    const bonusAmount = includeBonus ? Math.round((basicSalary * finalBonusPercent) / 100) : 0;

    let customAdjustmentObj = { mode: null, value: 0, amount: 0, reason: null };
    if (adjustmentMode && Number(adjustmentValue) > 0) {
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
        bonusAmount +
        customAdjustmentObj.amount +
        Number(extraAllowance) -
        Number(extraDeduction);

    const netPayableSalary = Math.max(0, Math.round(rawNetPayable));

    const existingSalary = await Salary.findOne({ teacherId: teacher._id, month, year });
    if (existingSalary && existingSalary.paymentStatus === 'Paid') {
        return { skipped: true, salary: existingSalary };
    }

    const salaryRecord = await Salary.findOneAndUpdate(
        { teacherId: teacher._id, month, year },
        {
            $set: {
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
                    remainingPaidQuota,
                    excessQuotaDays,
                    directAbsentPenaltyDays,
                    totalDeductibleDays
                },
                leaveAndAbsentDeductionAmount,
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
    calculateTeacherMonthlyPayroll
};
