const moment = require('moment-timezone');
const SystemSettings = require('../models/SystemSettings');
const LoanAdvance = require('../models/LoanAdvance');
const AuditLog = require('../models/AuditLog');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const SalaryHistory = require('../models/SalaryHistory');
const LeaveRequest = require('../models/LeaveRequest');
const SpecialDate = require('../models/SpecialDate');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ATTENDANCE_STATUS } = require('../constants/system.constants');

const WEEKDAY_NAMES_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];
const MONTH_NAMES_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুল', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

// =========================================================================
// ⚙️ ১. ডায়নামিক সিস্টেম সেটিংস (No-Code Policy Update)
// =========================================================================
const getSystemSettings = asyncHandler(async (req, res) => {
    const settings = await SystemSettings.getSettings();
    return res.status(200).json(new ApiResponse(200, 'সিস্টেম কনফিগারেশন', settings));
});

const updateSystemSettings = asyncHandler(async (req, res) => {
    const current = await SystemSettings.getSettings();

    const updated = await SystemSettings.findOneAndUpdate(
        { key: 'GLOBAL_SETTINGS' },
        {
            $set: {
                madrasahNameBng: req.body.madrasahNameBng || current.madrasahNameBng,
                madrasahNameEng: req.body.madrasahNameEng || current.madrasahNameEng,
                addressBng: req.body.addressBng || current.addressBng,
                attendancePolicy: {
                    ...current.attendancePolicy,
                    ...(req.body.attendancePolicy || {})
                },
                payrollPolicy: {
                    ...current.payrollPolicy,
                    ...(req.body.payrollPolicy || {})
                },
                updatedBy: req.user._id
            }
        },
        { upsert: true, new: true }
    );

    await AuditLog.create({
        action: 'SETTINGS_UPDATED',
        module: 'System',
        description: 'সিস্টেম পলিসি ও সেটিংস আপডেট করা হয়েছে',
        performedBy: req.user._id,
        ipAddress: req.ip,
        metadata: req.body
    });

    return res.status(200).json(
        new ApiResponse(200, 'সিস্টেম সেটিংস সফলভাবে আপডেট করা হয়েছে! এখন থেকে নতুন নিয়ম কার্যকর হবে।', updated)
    );
});

// =========================================================================
// 💳 ২. অগ্রিম বেতন ও লোন ম্যানেজমেন্ট (Loan & Advance EMI)
// =========================================================================
const createLoanOrAdvance = asyncHandler(async (req, res) => {
    const { teacherId, type = 'Advance_Salary', totalAmount, monthlyInstallment, reason } = req.body;

    const teacher = await Teacher.findById(teacherId).lean();
    if (!teacher) throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');

    if (Number(monthlyInstallment) > Number(totalAmount)) {
        throw new ApiError(400, 'মাসিক কিস্তির পরিমাণ মোট লোনের চেয়ে বেশি হতে পারে না!');
    }

    const loan = await LoanAdvance.create({
        teacherId,
        type,
        totalAmount: Number(totalAmount),
        monthlyInstallment: Number(monthlyInstallment),
        remainingBalance: Number(totalAmount),
        reason,
        approvedBy: req.user._id
    });

    await AuditLog.create({
        action: 'LOAN_CREATED',
        module: 'Payroll',
        description: `${teacher.fullNameBng}-কে ${totalAmount}৳ লোন/অগ্রিম দেওয়া হয়েছে (মাসিক কিস্তি: ${monthlyInstallment}৳)`,
        performedBy: req.user._id,
        targetTeacherId: teacher._id,
        ipAddress: req.ip
    });

    return res.status(201).json(
        new ApiResponse(201, `${teacher.fullNameBng}-এর নামে ${totalAmount}৳ অগ্রিম/লোন এন্ট্রি হয়েছে। প্রতি মাসে ${monthlyInstallment}৳ স্বয়ংক্রিয়ভাবে কাটা হবে।`, loan)
    );
});

const getLoansAndAdvances = asyncHandler(async (req, res) => {
    const filter = req.user.role === 'Teacher' ? { teacherId: req.user._id } : {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.teacherId && req.user.role !== 'Teacher') filter.teacherId = req.query.teacherId;

    const loans = await LoanAdvance.find(filter)
        .populate('teacherId', 'teacherCode fullNameBng designation basicSalary')
        .populate('approvedBy', 'fullNameBng')
        .sort({ createdAt: -1 })
        .lean();

    return res.status(200).json(new ApiResponse(200, 'লোন ও অগ্রিম বেতনের তালিকা', loans));
});

const updateLoanStatus = asyncHandler(async (req, res) => {
    const { status, monthlyInstallment } = req.body;
    const loan = await LoanAdvance.findById(req.params.id);
    if (!loan) throw new ApiError(404, 'লোন রেকর্ড পাওয়া যায়নি!');

    if (status) loan.status = status;
    if (monthlyInstallment) loan.monthlyInstallment = Number(monthlyInstallment);
    await loan.save();

    return res.status(200).json(new ApiResponse(200, 'লোন স্ট্যাটাস আপডেট করা হয়েছে!', loan));
});

// =========================================================================
// 📊 ৩. মাস্টার ড্যাশবোর্ড অ্যানালিটিক্স (Admin Overview Dashboard)
// =========================================================================
const getAdminDashboardOverview = asyncHandler(async (req, res) => {
    const now = moment.tz('Asia/Dhaka');
    const todayStr = now.format('YYYY-MM-DD');
    const currentMonth = now.month() + 1;
    const currentYear = now.year();
    const schoolWeekStart = now.clone().subtract((now.day() + 1) % 7, 'days').startOf('day');
    const schoolWeekDates = Array.from({ length: 6 }, (_, index) =>
        schoolWeekStart.clone().add(index, 'days')
    );
    const schoolWeekEnd = moment.min(schoolWeekDates[5], now).format('YYYY-MM-DD');
    const payrollMonths = Array.from({ length: 6 }, (_, index) => {
        const monthDate = now.clone().subtract(5 - index, 'months');
        return { month: monthDate.month() + 1, year: monthDate.year() };
    });

    const [
        totalActiveTeachers,
        todayAttendances,
        pendingApplicationsCount,
        currentMonthSalaries,
        activeLoans,
        recentAuditLogs,
        schoolWeekAttendances,
        recentPayrollSheets
    ] = await Promise.all([
        Teacher.countDocuments({ isActive: true, registrationStatus: 'Approved' }),
        Attendance.find({ date: todayStr }).populate('teacherId', 'teacherCode fullNameBng designation').lean(),
        LeaveRequest.countDocuments({ status: 'Pending' }),
        Salary.find({ month: currentMonth, year: currentYear }).lean(),
        LoanAdvance.find({ status: 'Active' }).lean(),
        AuditLog.find().populate('performedBy', 'fullNameBng').sort({ createdAt: -1 }).limit(10).lean(),
        Attendance.find({
            date: { $gte: schoolWeekStart.format('YYYY-MM-DD'), $lte: schoolWeekEnd }
        }).select('date status').lean(),
        Salary.find({
            $or: payrollMonths.map(({ month, year }) => ({ month, year }))
        }).select('month year paymentStatus netPayableSalary leaveAndAbsentDeductionAmount').lean()
    ]);

    const todayPresent = todayAttendances.filter((a) => [
        ATTENDANCE_STATUS.PRESENT,
        ATTENDANCE_STATUS.OFFICIAL_DUTY,
        ATTENDANCE_STATUS.HOLIDAY_DUTY
    ].includes(a.status)).length;
    const todayLate = todayAttendances.filter((a) => [
        ATTENDANCE_STATUS.LATE,
        ATTENDANCE_STATUS.EXCUSED_LATE
    ].includes(a.status)).length;
    const todayLeave = todayAttendances.filter((a) => [
        ATTENDANCE_STATUS.LEAVE,
        ATTENDANCE_STATUS.APPROVED_SICK_LEAVE,
        ATTENDANCE_STATUS.APPROVED_CASUAL_LEAVE
    ].includes(a.status)).length;
    const todayAbsent = todayAttendances.filter((a) => a.status === ATTENDANCE_STATUS.ABSENT).length;

    const totalMonthlyPayroll = currentMonthSalaries.reduce((s, item) => s + item.netPayableSalary, 0);
    const totalPaidAmount = currentMonthSalaries
        .filter((s) => s.paymentStatus === 'Paid')
        .reduce((s, item) => s + item.netPayableSalary, 0);

    const totalActiveLoanBalance = activeLoans.reduce((s, l) => s + l.remainingBalance, 0);
    const weeklyAttendance = schoolWeekDates.map((date) => {
        const dayAttendances = schoolWeekAttendances.filter((attendance) => attendance.date === date.format('YYYY-MM-DD'));
        return {
            dayBng: WEEKDAY_NAMES_BN[date.day()],
            present: dayAttendances.filter((attendance) => [
                ATTENDANCE_STATUS.PRESENT,
                ATTENDANCE_STATUS.OFFICIAL_DUTY,
                ATTENDANCE_STATUS.HOLIDAY_DUTY
            ].includes(attendance.status)).length,
            late: dayAttendances.filter((attendance) => [
                ATTENDANCE_STATUS.LATE,
                ATTENDANCE_STATUS.EXCUSED_LATE
            ].includes(attendance.status)).length,
            leave: dayAttendances.filter((attendance) => [
                ATTENDANCE_STATUS.LEAVE,
                ATTENDANCE_STATUS.APPROVED_SICK_LEAVE,
                ATTENDANCE_STATUS.APPROVED_CASUAL_LEAVE
            ].includes(attendance.status)).length,
            absent: dayAttendances.filter((attendance) => attendance.status === ATTENDANCE_STATUS.ABSENT).length
        };
    });
    const payrollTrend = payrollMonths.map(({ month, year }) => {
        const monthSheets = recentPayrollSheets.filter((salary) => salary.month === month && salary.year === year);
        return {
            monthBng: `${MONTH_NAMES_BN[month - 1]} ${String(year).slice(-2)}`,
            netPaid: monthSheets
                .filter((salary) => salary.paymentStatus === 'Paid')
                .reduce((sum, salary) => sum + Number(salary.netPayableSalary || 0), 0),
            deduction: monthSheets.reduce((sum, salary) => sum + Number(salary.leaveAndAbsentDeductionAmount || 0), 0)
        };
    });

    return res.status(200).json(
        new ApiResponse(200, 'ড্যাশবোর্ড লাইভ ওভারভিউ', {
            todayDate: todayStr,
            teacherStats: {
                totalActiveTeachers,
                todayPresent,
                todayLate,
                todayLeave,
                todayAbsent,
                notPunchedYet: Math.max(0, totalActiveTeachers - todayAttendances.length)
            },
            pendingActions: {
                pendingLeaveOrLateApplications: pendingApplicationsCount
            },
            payrollOverview: {
                month: currentMonth,
                year: currentYear,
                generatedSheetsCount: currentMonthSalaries.length,
                totalMonthlyPayroll,
                totalPaidAmount,
                totalUnpaidAmount: totalMonthlyPayroll - totalPaidAmount
            },
            loanOverview: {
                activeLoansCount: activeLoans.length,
                totalActiveLoanBalance
            },
            todayLiveFeed: todayAttendances,
            recentAuditLogs,
            weeklyAttendance,
            payrollTrend
        })
    );
});

// =========================================================================
// 🏦 ৪. ব্যাংক ট্রান্সফার অ্যাডভাইস শিট (Bank Advice Sheet for Islami Bank/Others)
// =========================================================================
const getBankTransferAdviceSheet = asyncHandler(async (req, res) => {
    const now = moment.tz('Asia/Dhaka');
    const month = parseInt(req.query.month, 10) || (now.month() + 1);
    const year = parseInt(req.query.year, 10) || now.year();

    const [settings, salaries] = await Promise.all([
        SystemSettings.getSettings(),
        Salary.find({ month, year })
            .populate('teacherId', 'teacherCode fullNameBng fullNameEng designation indexNumber bankDetails phone')
            .lean()
    ]);

    const rows = salaries.map((s, idx) => ({
        serial: idx + 1,
        teacherCode: s.teacherId?.teacherCode,
        fullNameBng: s.teacherId?.fullNameBng,
        fullNameEng: s.teacherId?.fullNameEng,
        designation: s.teacherId?.designation,
        indexNumber: s.teacherId?.indexNumber || 'N/A',
        bankName: s.teacherId?.bankDetails?.bankName || 'N/A',
        branchName: s.teacherId?.bankDetails?.branchName || 'N/A',
        accountName: s.teacherId?.bankDetails?.accountName || s.teacherId?.fullNameEng,
        accountNumber: s.teacherId?.bankDetails?.accountNumber || 'N/A',
        netPayableSalary: s.netPayableSalary,
        paymentStatus: s.paymentStatus
    }));

    const totalBankTransferAmount = rows.reduce((sum, r) => sum + r.netPayableSalary, 0);

    return res.status(200).json(
        new ApiResponse(200, `${month}/${year} মাসের ব্যাংক ট্রান্সফার অ্যাডভাইস শিট`, {
            institution: {
                nameBng: settings.madrasahNameBng,
                nameEng: settings.madrasahNameEng,
                address: settings.addressBng
            },
            period: { month, year },
            totalTeachers: rows.length,
            totalBankTransferAmount,
            adviceRows: rows
        })
    );
});

// =========================================================================
// 💾 ৫. এক ক্লিকে ফুল ডাটাবেস ব্যাকআপ ও রিস্টোর (One-Click Disaster Recovery)
// =========================================================================
const exportFullDatabaseBackup = asyncHandler(async (req, res) => {
    const [
        settings,
        teachers,
        attendances,
        specialDates,
        leaveRequests,
        salaries,
        salaryHistories,
        loans
    ] = await Promise.all([
        SystemSettings.find().lean(),
        Teacher.find().lean(),
        Attendance.find().lean(),
        SpecialDate.find().lean(),
        LeaveRequest.find().lean(),
        Salary.find().lean(),
        SalaryHistory.find().lean(),
        LoanAdvance.find().lean()
    ]);

    const backupPayload = {
        backupVersion: '1.0-ENTERPRISE',
        exportedAt: moment.tz('Asia/Dhaka').format('YYYY-MM-DD hh:mm:ss A'),
        collections: {
            settings,
            teachers,
            attendances,
            specialDates,
            leaveRequests,
            salaries,
            salaryHistories,
            loans
        }
    };

    await AuditLog.create({
        action: 'BACKUP_EXPORTED',
        module: 'System',
        description: 'সম্পূর্ণ ডাটাবেস ব্যাকআপ ডাউনলোড করা হয়েছে',
        performedBy: req.user._id,
        ipAddress: req.ip
    });

    const fileName = `ARDM_Full_Backup_${moment.tz('Asia/Dhaka').format('YYYY_MM_DD')}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    return res.status(200).send(JSON.stringify(backupPayload, null, 2));
});

const getAuditLogs = asyncHandler(async (req, res) => {
    const logs = await AuditLog.find()
        .populate('performedBy', 'teacherCode fullNameBng role')
        .populate('targetTeacherId', 'teacherCode fullNameBng')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();

    return res.status(200).json(new ApiResponse(200, 'সিস্টেম সিকিউরিটি অডিট লগ', logs));
});

module.exports = {
    getSystemSettings,
    updateSystemSettings,
    createLoanOrAdvance,
    getLoansAndAdvances,
    updateLoanStatus,
    getAdminDashboardOverview,
    getBankTransferAdviceSheet,
    exportFullDatabaseBackup,
    getAuditLogs
};
