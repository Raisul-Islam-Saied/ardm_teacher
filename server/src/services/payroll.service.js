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

// ১. ৬টি মোডে টাকার হিসাব বের করা
const calculateAdjustmentByMode = (baseSalary, mode, value, daysInMonth = 30) => {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) {
        throw new ApiError(400, 'অ্যাডজাস্টমেন্ট ভ্যালু অবশ্যই ০ এর চেয়ে বড় সংখ্যা হতে হবে!');
    }

    const perDaySalary = baseSalary / daysInMonth;
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
    return { previousSalary: baseSalary, changedAmount, newSalary };
};

// ২. মাসের মাঝখানে জয়েন বা রিজাইন করলে Pro-Rata (আনুপাতিক) বেতন হিসাব করা
const calculateProRataBasicSalary = (teacher, month, year, daysInSalaryMonth = 30, enableProRata = true) => {
    const monthStart = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').startOf('month');
    const monthEnd = monthStart.clone().endOf('month');
    const calendarDaysInMonth = monthEnd.date();

    if (!enableProRata) {
        return {
            isProRated: false,
            activeDaysInMonth: daysInSalaryMonth,
            effectiveBasicSalary: teacher.basicSalary
        };
    }

    const joinMoment = teacher.joiningDate ? moment.tz(teacher.joiningDate, 'Asia/Dhaka').startOf('day') : null;
    const resignMoment = teacher.resignationDate ? moment.tz(teacher.resignationDate, 'Asia/Dhaka').endOf('day') : null;

    // যদি ওই মাসের পরের মাসে জয়েন করে থাকে
    if (joinMoment && joinMoment.isAfter(monthEnd)) {
        return { isProRated: true, activeDaysInMonth: 0, effectiveBasicSalary: 0 };
    }

    const effectiveStart = (joinMoment && joinMoment.isAfter(monthStart)) ? joinMoment : monthStart;
    const effectiveEnd = (resignMoment && resignMoment.isBefore(monthEnd)) ? resignMoment : monthEnd;

    if (effectiveEnd.isBefore(effectiveStart)) {
        return { isProRated: true, activeDaysInMonth: 0, effectiveBasicSalary: 0 };
    }

    const activeCalendarDays = effectiveEnd.diff(effectiveStart, 'days') + 1;

    if (activeCalendarDays >= calendarDaysInMonth) {
        return {
            isProRated: false,
            activeDaysInMonth: daysInSalaryMonth,
            effectiveBasicSalary: teacher.basicSalary
        };
    }

    // আনুপাতিক বেতন = (মূল বেতন / ৩০) * সক্রিয় দিন
    const effectiveBasicSalary = Math.round((teacher.basicSalary / daysInSalaryMonth) * activeCalendarDays);
    return {
        isProRated: true,
        activeDaysInMonth: activeCalendarDays,
        effectiveBasicSalary
    };
};

// ৩. পূর্ণাঙ্গ মাসিক পে-রোল ক্যালকুলেশন (Pro-Rata + Quota + Absent Penalty + Auto Loan EMI + Bonus)
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
    const excessQuotaDays = Math.max(0, totalQuotaUsed - allowedPaidQuota);
    const totalDeductibleDays = excessQuotaDays + directAbsentPenaltyDays;

    const basicSalary = teacher.basicSalary;
    const daysDivisor = payPolicy.daysInSalaryMonth || 30;
    const perDaySalary = Number((basicSalary / daysDivisor).toFixed(2));

    // Pro-Rata হিসাব (মাসের মাঝখানে জয়েন করলে)
    const proRataInfo = calculateProRataBasicSalary(
        teacher,
        month,
        year,
        daysDivisor,
        payPolicy.enableProRataForMidMonthJoin
    );

    const leaveAndAbsentDeductionAmount = Math.round(totalDeductibleDays * perDaySalary);

    // বোনাস হিসাব
    const finalBonusPercent = includeBonus
        ? Number(bonusPercentage ?? payPolicy.defaultBonusPercent)
        : 0;
    const bonusAmount = includeBonus ? Math.round((basicSalary * finalBonusPercent) / 100) : 0;

    // কাস্টম অ্যাডজাস্টমেন্ট (যদি থাকে)
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

    // অটোমেটিক লোন বা অগ্রিম বেতনের কিস্তি (EMI) চেক করা
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
    calculateAdjustmentByMode,
    calculateRevisedSalary: calculateAdjustmentByMode,
    calculateProRataBasicSalary,
    calculateTeacherMonthlyPayroll
};
