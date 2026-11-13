const moment = require('moment-timezone');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const SalaryHistory = require('../models/SalaryHistory');
const LeaveRequest = require('../models/LeaveRequest');
const LoanAdvance = require('../models/LoanAdvance');
const SystemSettings = require('../models/SystemSettings');
const { ATTENDANCE_STATUS } = require('../constants/system.constants');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// =========================================================================
// 📱 শিক্ষকের নিজস্ব পোর্টাল মাস্টার ড্যাশবোর্ড (Teacher Self-Service Hub)
// =========================================================================
const getTeacherSelfPortalDashboard = asyncHandler(async (req, res) => {
    const teacherId = req.user._id;
    const now = moment.tz('Asia/Dhaka');
    const todayStr = now.format('YYYY-MM-DD');
    const month = parseInt(req.query.month, 10) || (now.month() + 1);
    const year = parseInt(req.query.year, 10) || now.year();

    const startDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').startOf('month').format('YYYY-MM-DD');
    const endDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').endOf('month').format('YYYY-MM-DD');

    const [
        teacherProfile,
        settings,
        todayAttendance,
        monthlyAttendanceLogs,
        allSalaries,
        salaryRevisions,
        myApplications,
        myLoans
    ] = await Promise.all([
        Teacher.findById(teacherId).lean(),
        SystemSettings.getSettings(),
        Attendance.findOne({ teacherId, date: todayStr }).lean(),
        Attendance.find({ teacherId, date: { $gte: startDate, $lte: endDate } }).sort({ date: -1 }).lean(),
        Salary.find({ teacherId }).sort({ year: -1, month: -1 }).lean(),
        SalaryHistory.find({ teacherId }).sort({ createdAt: -1 }).lean(),
        LeaveRequest.find({ teacherId }).sort({ createdAt: -1 }).limit(30).lean(),
        LoanAdvance.find({ teacherId }).sort({ createdAt: -1 }).lean()
    ]);

    if (!teacherProfile) {
        throw new ApiError(404, 'আপনার প্রোফাইল খুঁজে পাওয়া যায়নি!');
    }

    // ১. চলতি মাসের হাজিরা, লেট, লিভ, অ্যাবসেন্ট ও কোটার হিসাব
    let totalPresent = 0;
    let totalExcusedLateOrDuty = 0;
    let totalLateCount = 0;
    let totalLeaveCount = 0;
    let totalUnexcusedAbsentCount = 0;
    let totalApprovedLeaveCount = 0;
    let totalIgnoredDays = 0;
    let totalQuotaUsed = 0;
    let directAbsentPenaltyDays = 0;

    for (const log of monthlyAttendanceLogs) {
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
            totalQuotaUsed += log.deductionWeight; // 0.5
        } else if (log.status === ATTENDANCE_STATUS.LEAVE) {
            totalLeaveCount++;
            totalQuotaUsed += log.deductionWeight; // 1.0
        } else if (log.status === ATTENDANCE_STATUS.ABSENT) {
            totalUnexcusedAbsentCount++;
            directAbsentPenaltyDays += (log.directSalaryPenaltyDays || 1.0);
        } else if (
            log.status === ATTENDANCE_STATUS.APPROVED_SICK_LEAVE ||
            log.status === ATTENDANCE_STATUS.APPROVED_CASUAL_LEAVE
        ) {
            totalApprovedLeaveCount++;
        }
    }

    const monthlyAllowedQuota = teacherProfile.customLeaveQuota ?? settings.attendancePolicy.monthlyPaidLeaveQuota;
    const quotaRemaining = Math.max(0, monthlyAllowedQuota - totalQuotaUsed);
    const excessQuotaDays = Math.max(0, totalQuotaUsed - monthlyAllowedQuota);
    const totalDaysForSalaryCut = excessQuotaDays + directAbsentPenaltyDays;
    const perDaySalary = Number((teacherProfile.basicSalary / (settings.payrollPolicy.daysInSalaryMonth || 30)).toFixed(2));
    const currentMonthEstimatedCut = Math.round(totalDaysForSalaryCut * perDaySalary);

    // ২. সর্বমোট আয়, সর্বমোট কর্তন ও বোনাস (Lifetime & Yearly Financial Analytics)
    let lifetimeTotalEarned = 0;         // আজ পর্যন্ত মোট কত টাকা বেতন পেয়েছেন (Paid + Pending)
    let lifetimeTotalPaidCash = 0;       // হাতে পাওয়া মোট পরিশোধিত টাকা (Paid)
    let lifetimeTotalPendingCash = 0;    // বকেয়া বেতন (Pending)
    let lifetimeTotalLeaveAbsentCut = 0; // আজ পর্যন্ত লেট, লিভ ও অ্যাবসেন্টের কারণে মোট কত টাকা কাটা গেছে
    let lifetimeTotalBonusReceived = 0;  // আজ পর্যন্ত মোট কত টাকা বোনাস পেয়েছেন
    let lifetimeTotalLoanDeducted = 0;   // বেতন থেকে আজ পর্যন্ত মোট কত টাকা লোন কিস্তি কাটা হয়েছে

    for (const sal of allSalaries) {
        lifetimeTotalEarned += (sal.netPayableSalary || 0);
        if (sal.paymentStatus === 'Paid') {
            lifetimeTotalPaidCash += (sal.netPayableSalary || 0);
        } else if (sal.paymentStatus === 'Pending') {
            lifetimeTotalPendingCash += (sal.netPayableSalary || 0);
        }
        lifetimeTotalLeaveAbsentCut += (sal.leaveAndAbsentDeductionAmount || sal.leaveDeductionAmount || 0);
        lifetimeTotalBonusReceived += (sal.bonusAmount || 0);
        lifetimeTotalLoanDeducted += (sal.loanDeduction?.installmentAmount || 0);
    }

    // ৩. লোনের বর্তমান অবস্থা
    const activeLoans = myLoans.filter((l) => l.status === 'Active');
    const totalRemainingLoanBalance = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0);

    // ৪. দরখাস্তের সামারি
    const applicationStats = {
        totalSubmitted: myApplications.length,
        pending: myApplications.filter((a) => a.status === 'Pending').length,
        approved: myApplications.filter((a) => a.status === 'Approved').length,
        rejected: myApplications.filter((a) => a.status === 'Rejected').length
    };

    return res.status(200).json(
        new ApiResponse(200, `স্বাগতম, ${teacherProfile.fullNameBng}! আপনার ব্যক্তিগত ড্যাশবোর্ড প্রস্তুত।`, {
            profile: teacherProfile,
            todayLiveStatus: {
                date: todayStr,
                hasPunchedToday: !!(todayAttendance && todayAttendance.punchTime),
                punchTime: todayAttendance?.punchTime
                    ? moment.tz(todayAttendance.punchTime, 'Asia/Dhaka').format('hh:mm:ss A')
                    : null,
                status: todayAttendance?.status || 'এখনো পাঞ্চ করেননি',
                remarks: todayAttendance?.remarks || null
            },
            selectedMonthAttendance: {
                month,
                year,
                totalPresent,
                totalExcusedLateOrDuty,
                totalLateCount,
                totalLeaveCount,
                totalUnexcusedAbsentCount,
                totalApprovedLeaveCount,
                totalIgnoredDays,
                quotaBreakdown: {
                    monthlyAllowedQuota,
                    totalQuotaUsed,
                    quotaRemaining,
                    excessQuotaDays,
                    directAbsentPenaltyDays,
                    totalDaysForSalaryCut,
                    perDaySalary,
                    currentMonthEstimatedCut
                },
                dailyHistory: monthlyAttendanceLogs
            },
            financialOverview: {
                currentBasicSalary: teacherProfile.basicSalary,
                perDaySalary,
                lifetimeTotalEarned,          // মোট অর্জিত বেতন
                lifetimeTotalPaidCash,        // মোট পরিশোধিত (হাতে পেয়েছেন)
                lifetimeTotalPendingCash,     // মোট বকেয়া (Pending)
                lifetimeTotalLeaveAbsentCut,  // লেট/ছুটি/অ্যাবসেন্টের কারণে মোট কর্তনকৃত টাকা
                lifetimeTotalBonusReceived,   // মোট প্রাপ্ত বোনাস
                lifetimeTotalLoanDeducted,    // বেতন থেকে কেটে নেওয়া মোট লোন কিস্তি
                totalRemainingLoanBalance,    // এখনো লোনের যত টাকা শোধ করা বাকি
                monthlyPayslips: allSalaries, // প্রতি মাসের বিস্তারিত বেতন শিট
                salaryIncrementHistory: salaryRevisions // কবে কত টাকা বেতন বেড়েছে বা কমেছে তার হিস্ট্রি
            },
            applicationsHub: {
                stats: applicationStats,
                recentApplications: myApplications // তার জমা দেওয়া সব দরখাস্ত ও স্ট্যাটাস
            },
            loansHistory: myLoans
        })
    );
});

// =========================================================================
// 🛠️ অ্যাডমিন কর্তৃক শিক্ষক ম্যানেজমেন্ট ফাংশনসমূহ
// =========================================================================
const createTeacher = asyncHandler(async (req, res) => {
    const newTeacher = await Teacher.create(req.body);
    const teacherData = newTeacher.toObject();
    delete teacherData.password;
    return res.status(201).json(new ApiResponse(201, 'নতুন শিক্ষক সফলভাবে যুক্ত হয়েছেন!', teacherData));
});

const getAllTeachers = asyncHandler(async (req, res) => {
    const { search, isActive, employmentType, designation, page = 1, limit = 50 } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (employmentType) query.employmentType = employmentType;
    if (designation) query.designation = designation;
    if (search) {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
            { fullNameEng: searchRegex },
            { fullNameBng: searchRegex },
            { phone: searchRegex },
            { teacherCode: searchRegex },
            { indexNumber: searchRegex }
        ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [teachers, totalCount] = await Promise.all([
        Teacher.find(query).sort({ biometricDeviceId: 1 }).skip(skip).limit(limitNum).lean(),
        Teacher.countDocuments(query)
    ]);

    return res.status(200).json(
        new ApiResponse(200, 'শিক্ষকদের তালিকা', teachers, {
            totalTeachers: totalCount,
            currentPage: pageNum,
            totalPages: Math.ceil(totalCount / limitNum)
        })
    );
});

const getTeacherById = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id).lean();
    if (!teacher) throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    return res.status(200).json(new ApiResponse(200, 'শিক্ষকের বিস্তারিত তথ্য', teacher));
});

const updateTeacher = asyncHandler(async (req, res) => {
    if (req.body.password) delete req.body.password;
    const updatedTeacher = await Teacher.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
    ).lean();
    if (!updatedTeacher) throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    return res.status(200).json(new ApiResponse(200, 'শিক্ষকের তথ্য আপডেট করা হয়েছে!', updatedTeacher));
});

const toggleTeacherStatus = asyncHandler(async (req, res) => {
    const { isActive, resignationDate, remarks } = req.body;
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');

    teacher.isActive = typeof isActive === 'boolean' ? isActive : !teacher.isActive;
    if (!teacher.isActive && resignationDate) teacher.resignationDate = resignationDate;
    if (remarks !== undefined) teacher.remarks = remarks;
    await teacher.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, 'শিক্ষকের স্ট্যাটাস পরিবর্তন করা হয়েছে।', teacher));
});

const adminResetTeacherPassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        throw new ApiError(400, 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!');
    }
    const teacher = await Teacher.findById(req.params.id).select('+password +failedLoginAttempts +lockUntil');
    if (!teacher) throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');

    teacher.password = newPassword;
    teacher.failedLoginAttempts = 0;
    teacher.lockUntil = null;
    await teacher.save();

    return res.status(200).json(new ApiResponse(200, `${teacher.fullNameBng}-এর পাসওয়ার্ড রিসেট করা হয়েছে।`));
});

module.exports = {
    getTeacherSelfPortalDashboard,
    createTeacher,
    getAllTeachers,
    getTeacherById,
    updateTeacher,
    toggleTeacherStatus,
    adminResetTeacherPassword
};
