const moment = require('moment-timezone');
const Teacher = require('../models/Teacher');
const Salary = require('../models/Salary');
const SalaryHistory = require('../models/SalaryHistory');
const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const SystemSettings = require('../models/SystemSettings');
const {
    calculateAdjustmentByMode,
    calculateTeacherMonthlyPayroll,
    isPayrollEditable,
    getEffectiveDaysInMonth
} = require('../services/payroll.service');
const {
    PAYROLL_POLICY,
    ATTENDANCE_STATUS,
    ATTENDANCE_RULES,
    PAYMENT_STATUS
} = require('../constants/system.constants');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const ensurePayrollMonthIsClosed = (month, year) => {
    const monthStartDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = moment.tz(monthStartDate, 'YYYY-MM-DD', 'Asia/Dhaka').endOf('month');
    if (!moment.tz('Asia/Dhaka').isAfter(monthEnd)) {
        throw new ApiError(400, 'বেতন শিট তৈরি বা সংরক্ষণের আগে মাস সম্পূর্ণ শেষ হওয়া পর্যন্ত অপেক্ষা করুন।');
    }
};

const compareTeachersByRank = (first, second) => {
    const firstRank = Number(first.rankingMetrics?.overallMadrasahRank);
    const secondRank = Number(second.rankingMetrics?.overallMadrasahRank);
    const normalizedFirstRank = Number.isFinite(firstRank) && firstRank > 0 ? firstRank : Number.MAX_SAFE_INTEGER;
    const normalizedSecondRank = Number.isFinite(secondRank) && secondRank > 0 ? secondRank : Number.MAX_SAFE_INTEGER;
    if (normalizedFirstRank !== normalizedSecondRank) return normalizedFirstRank - normalizedSecondRank;

    const firstPriority = Number(first.rankingMetrics?.designationPriority) || 15;
    const secondPriority = Number(second.rankingMetrics?.designationPriority) || 15;
    if (firstPriority !== secondPriority) return firstPriority - secondPriority;
    return Number(first.biometricDeviceId || 0) - Number(second.biometricDeviceId || 0);
};

const compareSalaryRowsByTeacherRank = (first, second) => (
    compareTeachersByRank(
        {
            rankingMetrics: first.teacherId?.rankingMetrics,
            biometricDeviceId: first.teacherId?.biometricDeviceId
        },
        {
            rankingMetrics: second.teacherId?.rankingMetrics,
            biometricDeviceId: second.teacherId?.biometricDeviceId
        }
    )
);

// ১. দরখাস্ত জমা দেওয়া
const applyForLeave = asyncHandler(async (req, res) => {
    const {
        teacherId,
        applicationType = req.body.leaveType || 'Casual Leave',
        startDate,
        endDate = startDate,
        reason,
        attachmentUrl
    } = req.body;

    const targetTeacherId = (req.user.role === 'Teacher') ? req.user._id : (teacherId || req.user._id);
    const start = moment.tz(startDate, 'YYYY-MM-DD', 'Asia/Dhaka');
    const end = moment.tz(endDate, 'YYYY-MM-DD', 'Asia/Dhaka');

    if (end.isBefore(start)) {
        throw new ApiError(400, 'শেষের তারিখ শুরুর তারিখের আগে হতে পারে না!');
    }

    const totalDays = end.diff(start, 'days') + 1;
    const targetMonth = start.month() + 1;
    const targetYear = start.year();

    const application = await LeaveRequest.create({
        teacherId: targetTeacherId,
        applicationType,
        startDate,
        endDate,
        targetMonth,
        targetYear,
        totalDays,
        reason,
        attachmentUrl,
        submittedByRole: req.user.role === 'Teacher' ? 'Teacher' : 'Admin'
    });

    return res.status(201).json(
        new ApiResponse(
            201,
            `আপনার '${applicationType}' সংক্রান্ত দরখাস্তটি সফলভাবে জমা হয়েছে! মাস শেষে বেতন তৈরির সময় এটি যাচাই করা হবে।`,
            application
        )
    );
});

// ২. মাস শেষে সব দরখাস্ত ও হাজিরা পর্যালোচনার ডেস্ক
const getMonthlyApplicationReviewDesk = asyncHandler(async (req, res) => {
    const now = moment.tz('Asia/Dhaka');
    const month = parseInt(req.query.month, 10) || (now.month() + 1);
    const year = parseInt(req.query.year, 10) || now.year();
    const statusFilter = req.query.status;

    const startDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').startOf('month').format('YYYY-MM-DD');
    const endDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').endOf('month').format('YYYY-MM-DD');

    const appQuery = {
        $or: [
            { targetMonth: month, targetYear: year },
            { startDate: { $gte: startDate, $lte: endDate } }
        ]
    };

    if (req.user.role === 'Teacher') appQuery.teacherId = req.user._id;
    else if (req.query.teacherId) appQuery.teacherId = req.query.teacherId;
    if (statusFilter) appQuery.status = statusFilter;

    const applications = await LeaveRequest.find(appQuery)
        .populate('teacherId', 'teacherCode biometricDeviceId fullNameBng designation phone basicSalary')
        .populate('reviewedBy', 'fullNameBng')
        .sort({ status: 1, startDate: 1 })
        .lean();

    const attendanceQuery = {
        date: { $gte: startDate, $lte: endDate },
        status: {
            $in: [
                ATTENDANCE_STATUS.ABSENT,
                ATTENDANCE_STATUS.LATE,
                ATTENDANCE_STATUS.LEAVE,
                ATTENDANCE_STATUS.EXCUSED_LATE
            ]
        },
        isIgnored: false
    };
    if (req.user.role === 'Teacher') attendanceQuery.teacherId = req.user._id;
    else if (req.query.teacherId) attendanceQuery.teacherId = req.query.teacherId;

    const flaggedAttendances = await Attendance.find(attendanceQuery)
        .populate('teacherId', 'teacherCode fullNameBng designation')
        .sort({ date: 1 })
        .lean();

    const pendingCount = applications.filter((a) => a.status === 'Pending').length;
    const approvedCount = applications.filter((a) => a.status === 'Approved').length;
    const rejectedCount = applications.filter((a) => a.status === 'Rejected').length;

    return res.status(200).json(
        new ApiResponse(200, `${month}/${year} মাসের সকল দরখাস্ত ও হাজিরা পর্যালোচনার ডেস্ক`, {
            period: { month, year, startDate, endDate },
            applicationSummary: {
                totalApplications: applications.length,
                pendingCount,
                approvedCount,
                rejectedCount,
                readyForPayroll: pendingCount === 0
            },
            applications,
            flaggedAttendances
        })
    );
});

// ৩. দরখাস্ত অনুমোদন ও হাজিরা রূপান্তর
const reviewLeaveRequest = asyncHandler(async (req, res) => {
    const { status, countAsQuotaLeave = true, adminRemarks } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
        throw new ApiError(400, 'স্ট্যাটাস অবশ্যই Approved অথবা Rejected হতে হবে!');
    }

    const application = await LeaveRequest.findById(req.params.id).populate('teacherId');
    if (!application) throw new ApiError(404, 'দরখাস্তটি খুঁজে পাওয়া যায়নি!');

    application.status = status;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    application.adminRemarks = adminRemarks || null;

    const start = moment.tz(application.startDate, 'YYYY-MM-DD', 'Asia/Dhaka');
    const end = moment.tz(application.endDate, 'YYYY-MM-DD', 'Asia/Dhaka');

    if (status === 'Approved') {
        const bulkOps = [];
        for (let m = start.clone(); m.isSameOrBefore(end); m.add(1, 'days')) {
            const dateStr = m.format('YYYY-MM-DD');

            if (application.applicationType === 'Late Excuse') {
                application.approvalAction = 'EXCUSE_LATE';
                bulkOps.push({
                    updateOne: {
                        filter: { teacherId: application.teacherId._id, date: dateStr },
                        update: {
                            $set: {
                                teacherId: application.teacherId._id,
                                biometricDeviceId: application.teacherId.biometricDeviceId,
                                date: dateStr,
                                status: ATTENDANCE_STATUS.EXCUSED_LATE,
                                deductionWeight: 0,
                                directSalaryPenaltyDays: 0,
                                isLateExcused: true,
                                excuseNote: application.reason,
                                isIgnored: false,
                                source: 'Leave_Approval',
                                modifiedBy: req.user._id,
                                remarks: `দরখাস্তের প্রেক্ষিতে লেট মওকুফকৃত (${application.reason})`
                            }
                        },
                        upsert: true
                    }
                });
            } else if (application.applicationType === 'Official Duty') {
                application.approvalAction = 'OFFICIAL_DUTY';
                bulkOps.push({
                    updateOne: {
                        filter: { teacherId: application.teacherId._id, date: dateStr },
                        update: {
                            $set: {
                                teacherId: application.teacherId._id,
                                biometricDeviceId: application.teacherId.biometricDeviceId,
                                date: dateStr,
                                status: ATTENDANCE_STATUS.OFFICIAL_DUTY,
                                deductionWeight: 0,
                                directSalaryPenaltyDays: 0,
                                isLateExcused: true,
                                isIgnored: false,
                                source: 'Leave_Approval',
                                modifiedBy: req.user._id,
                                remarks: `অফিসিয়াল ডিউটি অনুমোদিত (${application.reason})`
                            }
                        },
                        upsert: true
                    }
                });
            } else {
                const shouldUseQuota = countAsQuotaLeave !== false;
                application.approvalAction = shouldUseQuota ? 'COUNT_AS_LEAVE_QUOTA' : 'FULLY_WAIVED_FREE';
                const targetStatus = shouldUseQuota
                    ? ATTENDANCE_STATUS.LEAVE
                    : (application.applicationType === 'Sick Leave'
                        ? ATTENDANCE_STATUS.APPROVED_SICK_LEAVE
                        : ATTENDANCE_STATUS.APPROVED_CASUAL_LEAVE);

                bulkOps.push({
                    updateOne: {
                        filter: { teacherId: application.teacherId._id, date: dateStr },
                        update: {
                            $set: {
                                teacherId: application.teacherId._id,
                                biometricDeviceId: application.teacherId.biometricDeviceId,
                                date: dateStr,
                                status: targetStatus,
                                deductionWeight: shouldUseQuota ? ATTENDANCE_RULES.LEAVE_DEDUCTION_WEIGHT : 0,
                                directSalaryPenaltyDays: 0,
                                isIgnored: false,
                                source: 'Leave_Approval',
                                modifiedBy: req.user._id,
                                remarks: `দরখাস্ত অনুমোদিত (${application.applicationType}): ${application.reason}`
                            }
                        },
                        upsert: true
                    }
                });
            }
        }
        if (bulkOps.length > 0) await Attendance.bulkWrite(bulkOps);
    }

    await application.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            status === 'Approved'
                ? `${application.teacherId.fullNameBng}-এর দরখাস্ত অনুমোদন হয়েছে এবং হাজিরা শিট আপডেট হয়েছে!`
                : `${application.teacherId.fullNameBng}-এর দরখাস্ত বাতিল করা হয়েছে।`,
            application
        )
    );
});

const bulkReviewApplications = asyncHandler(async (req, res) => {
    const { applicationIds, status = 'Approved', countAsQuotaLeave = true, adminRemarks } = req.body;
    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
        throw new ApiError(400, 'কমপক্ষে একটি দরখাস্তের আইডি সিলেক্ট করুন!');
    }

    let processedCount = 0;
    for (const id of applicationIds) {
        const appDoc = await LeaveRequest.findById(id).populate('teacherId');
        if (!appDoc) continue;
        appDoc.status = status;
        appDoc.reviewedBy = req.user._id;
        appDoc.reviewedAt = new Date();
        appDoc.adminRemarks = adminRemarks || 'মাসিক বাল্ক রিভিউতে অনুমোদিত';

        if (status === 'Approved') {
            const start = moment.tz(appDoc.startDate, 'YYYY-MM-DD', 'Asia/Dhaka');
            const end = moment.tz(appDoc.endDate, 'YYYY-MM-DD', 'Asia/Dhaka');
            const bulkOps = [];
            for (let m = start.clone(); m.isSameOrBefore(end); m.add(1, 'days')) {
                const dateStr = m.format('YYYY-MM-DD');
                const isLateApp = appDoc.applicationType === 'Late Excuse';
                const isDutyApp = appDoc.applicationType === 'Official Duty';
                const shouldUseQuota = countAsQuotaLeave !== false;

                bulkOps.push({
                    updateOne: {
                        filter: { teacherId: appDoc.teacherId._id, date: dateStr },
                        update: {
                            $set: {
                                teacherId: appDoc.teacherId._id,
                                biometricDeviceId: appDoc.teacherId.biometricDeviceId,
                                date: dateStr,
                                status: isLateApp
                                    ? ATTENDANCE_STATUS.EXCUSED_LATE
                                    : isDutyApp
                                        ? ATTENDANCE_STATUS.OFFICIAL_DUTY
                                        : (shouldUseQuota ? ATTENDANCE_STATUS.LEAVE : ATTENDANCE_STATUS.APPROVED_SICK_LEAVE),
                                deductionWeight: (isLateApp || isDutyApp) ? 0 : (shouldUseQuota ? 1.0 : 0),
                                directSalaryPenaltyDays: 0,
                                isLateExcused: isLateApp || isDutyApp,
                                source: 'Leave_Approval',
                                modifiedBy: req.user._id,
                                remarks: `বাল্ক অনুমোদন (${appDoc.applicationType}): ${appDoc.reason}`
                            }
                        },
                        upsert: true
                    }
                });
            }
            if (bulkOps.length > 0) await Attendance.bulkWrite(bulkOps);
        }
        await appDoc.save();
        processedCount++;
    }

    return res.status(200).json(new ApiResponse(200, `মোট ${processedCount}টি দরখাস্ত একসাথে '${status}' করা হয়েছে!`));
});

// ৪. মূল বেতন পরিবর্তন (Audit Log সহ)
const reviseBasicSalaryBulkOrSingle = asyncHandler(async (req, res) => {
    const { applyToAll = false, teacherId, teacherIds, adjustmentMode, adjustmentValue, reason, effectiveDate } = req.body;

    let filter = { isActive: true, registrationStatus: 'Approved' };
    if (!applyToAll) {
        if (Array.isArray(teacherIds) && teacherIds.length > 0) filter._id = { $in: teacherIds };
        else if (teacherId) filter._id = teacherId;
        else throw new ApiError(400, 'একজনের জন্য teacherId দিন, অথবা সবার জন্য applyToAll: true পাঠান!');
    }

    const teachers = await Teacher.find(filter);
    if (teachers.length === 0) throw new ApiError(404, 'কোনো শিক্ষক পাওয়া যায়নি!');

    const updatedResults = [];
    for (const teacher of teachers) {
        const calc = calculateAdjustmentByMode(teacher.basicSalary, adjustmentMode, adjustmentValue);
        teacher.basicSalary = calc.newSalary;
        await teacher.save({ validateBeforeSave: false });

        const historyLog = await SalaryHistory.create({
            teacherId: teacher._id,
            previousSalary: calc.previousSalary,
            adjustmentMode,
            adjustmentValue: Number(adjustmentValue),
            changedAmount: calc.changedAmount,
            newSalary: calc.newSalary,
            effectiveDate: effectiveDate || new Date(),
            reason,
            changedBy: req.user._id
        });

        updatedResults.push({
            teacherId: teacher._id,
            fullNameBng: teacher.fullNameBng,
            previousSalary: calc.previousSalary,
            changedAmount: calc.changedAmount,
            newSalary: calc.newSalary,
            historyId: historyLog._id
        });
    }

    await AuditLog.create({
        action: 'SALARY_REVISION',
        module: 'Payroll',
        description: `${updatedResults.length} জন শিক্ষকের মূল বেতন (${adjustmentMode}: ${adjustmentValue}) পরিবর্তন করা হয়েছে। কারণ: ${reason}`,
        performedBy: req.user._id,
        ipAddress: req.ip
    });

    return res.status(200).json(
        new ApiResponse(200, `মোট ${updatedResults.length} জন শিক্ষকের মূল বেতন সফলভাবে আপডেট করা হয়েছে!`, updatedResults)
    );
});

const adjustMonthlyPayrollBulkOrSingle = asyncHandler(async (req, res) => {
    const { month, year, applyToAll = false, teacherId, teacherIds, adjustmentMode, adjustmentValue, reason } = req.body;

    const filter = { month: Number(month), year: Number(year) };
    if (!applyToAll) {
        if (Array.isArray(teacherIds) && teacherIds.length > 0) filter.teacherId = { $in: teacherIds };
        else if (teacherId) filter.teacherId = teacherId;
        else throw new ApiError(400, 'একজনের জন্য teacherId দিন, অথবা সবার জন্য applyToAll: true পাঠান!');
    }

    const salarySheets = await Salary.find(filter).populate('teacherId', 'fullNameBng');
    if (salarySheets.length === 0) {
        throw new ApiError(404, 'এই মাসের সংরক্ষিত স্যালারি শিট পাওয়া যায়নি!');
    }
    if (salarySheets.some((sheet) => !isPayrollEditable(sheet))) {
        throw new ApiError(403, 'বেতন শিট তৈরির ৩০ দিনের সংশোধন সময় শেষ হয়েছে; এই শিট আর পরিবর্তন করা যাবে না।');
    }

    const updatedSheets = [];
    for (const sheet of salarySheets) {
        const daysInTargetMonth = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').daysInMonth();
        const calc = calculateAdjustmentByMode(sheet.basicSalarySnapshot, adjustmentMode, adjustmentValue, daysInTargetMonth);
        sheet.customAdjustment = {
            mode: adjustmentMode,
            value: Number(adjustmentValue),
            amount: calc.changedAmount,
            reason: reason || 'অ্যাডমিন কর্তৃক মাসিক বেতন সমন্বয়'
        };

        const effectiveBase = sheet.proRataInfo?.effectiveBasicSalary ?? sheet.basicSalarySnapshot;
        const loanCut = sheet.loanDeduction?.installmentAmount || 0;

        const rawNet =
            effectiveBase -
            sheet.leaveAndAbsentDeductionAmount -
            loanCut +
            sheet.bonusAmount +
            calc.changedAmount +
            sheet.extraAllowance -
            sheet.extraDeduction;

        sheet.netPayableSalary = Math.max(0, Math.round(rawNet));
        await sheet.save();
        updatedSheets.push(sheet);
    }

    return res.status(200).json(
        new ApiResponse(200, `${updatedSheets.length} জন শিক্ষকের প্রদেয় বেতন সমন্বয় করা হয়েছে!`, updatedSheets)
    );
});

const saveMonthlyPayrollSheetEdits = asyncHandler(async (req, res) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    const rows = req.body.rows;
    const includeBonus = req.body.includeBonus === true || req.body.includeBonus === 'true';
    const preparedOn = String(req.body.preparedOn || '').trim();

    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 500) {
        throw new ApiError(400, 'বেতন শিটে ১ থেকে ৫০০টি সারি থাকতে হবে।');
    }

    const salarySheets = await Salary.find({ month, year });
    if (salarySheets.length === 0) {
        throw new ApiError(404, 'এই মাসের সংরক্ষিত বেতন শিট পাওয়া যায়নি।');
    }
    if (salarySheets.some((sheet) => !isPayrollEditable(sheet))) {
        throw new ApiError(403, 'বেতন শিট তৈরির ৩০ দিনের সংশোধন সময় শেষ হয়েছে; এই শিট আর পরিবর্তন করা যাবে না।');
    }
    if (rows.length !== salarySheets.length) {
        throw new ApiError(400, 'সেভ করার সারির সংখ্যা সংরক্ষিত বেতন শিটের সঙ্গে মিলছে না। শিট রিফ্রেশ করে আবার চেষ্টা করুন।');
    }

    const payrollPolicy = (await SystemSettings.getSettings()).payrollPolicy;
    const daysInMonth = getEffectiveDaysInMonth(month, year, payrollPolicy);
    const sheetByTeacherId = new Map(
        salarySheets.map((sheet) => [String(sheet.teacherId), sheet])
    );
    const submittedTeacherIds = new Set();
    const operations = [];

    for (const row of rows) {
        const teacherId = String(row?.teacherId || '');
        const sheet = sheetByTeacherId.get(teacherId);
        if (!sheet || submittedTeacherIds.has(teacherId)) {
            throw new ApiError(400, 'বেতন শিটে অজানা বা পুনরাবৃত্ত শিক্ষক পাওয়া গেছে।');
        }
        submittedTeacherIds.add(teacherId);

        const basicSalary = Number(row.basicSalary);
        const deductibleDays = Number(row.deductibleDays);
        const bonusAmount = Number(row.bonusAmount);
        const adjustmentAmount = Number(row.adjustmentAmount);
        if (
            !Number.isFinite(basicSalary) || basicSalary < 0 || basicSalary > 1000000000 ||
            !Number.isFinite(deductibleDays) || deductibleDays < 0 || deductibleDays > daysInMonth ||
            !Number.isFinite(bonusAmount) || bonusAmount < 0 || bonusAmount > 1000000000 ||
            !Number.isFinite(adjustmentAmount) || Math.abs(adjustmentAmount) > 1000000000
        ) {
            throw new ApiError(400, 'বেতন, কর্তনযোগ্য দিন, বোনাস বা সমন্বয়ের পরিমাণ সঠিক নয়।');
        }

        const perDaySalary = Number((basicSalary / daysInMonth).toFixed(2));
        const deductionAmount = Math.round(deductibleDays * basicSalary / daysInMonth);
        const activeDays = sheet.proRataInfo?.activeDaysInMonth ?? daysInMonth;
        const effectiveBasicSalary = sheet.proRataInfo?.isProRated
            ? Math.round((basicSalary / daysInMonth) * activeDays)
            : basicSalary;
        const loanDeduction = Number(sheet.loanDeduction?.installmentAmount) || 0;
        const extraAllowance = Number(sheet.extraAllowance) || 0;
        const extraDeduction = Number(sheet.extraDeduction) || 0;
        const appliedBonus = includeBonus ? bonusAmount : 0;
        const netPayableSalary = Math.max(0, Math.round(
            effectiveBasicSalary -
            deductionAmount -
            loanDeduction +
            appliedBonus +
            adjustmentAmount +
            extraAllowance -
            extraDeduction
        ));
        const adjustmentMode = adjustmentAmount > 0
            ? 'INCREASE_AMOUNT'
            : adjustmentAmount < 0
                ? 'DECREASE_AMOUNT'
                : null;

        operations.push({
            updateOne: {
                filter: { _id: sheet._id, teacherId: sheet.teacherId, month, year },
                update: {
                    $set: {
                        basicSalarySnapshot: basicSalary,
                        perDaySalary,
                        'proRataInfo.effectiveBasicSalary': effectiveBasicSalary,
                        manualDeductibleDays: deductibleDays,
                        leaveAndAbsentDeductionAmount: deductionAmount,
                        includeBonus,
                        bonusAmount,
                        customAdjustment: {
                            mode: adjustmentMode,
                            value: Math.abs(adjustmentAmount),
                            amount: adjustmentAmount,
                            reason: adjustmentAmount === 0 ? null : 'বেতন শিটে ম্যানুয়াল সমন্বয়'
                        },
                        preparedOn,
                        netPayableSalary,
                        adjustmentNote: adjustmentAmount === 0 ? null : 'বেতন শিটে ম্যানুয়াল সমন্বয়'
                    }
                }
            }
        });
    }

    if (submittedTeacherIds.size !== salarySheets.length) {
        throw new ApiError(400, 'সেভ করার সারিগুলো সম্পূর্ণ বেতন শিটের সঙ্গে মিলছে না।');
    }

    await Salary.bulkWrite(operations);
    await AuditLog.create({
        action: 'MONTHLY_PAYROLL_SHEET_EDIT',
        module: 'Payroll',
        description: `${month}/${year} মাসের বেতন শিটে ${operations.length}টি সারির পরিবর্তন সংরক্ষণ করা হয়েছে।`,
        performedBy: req.user._id,
        ipAddress: req.ip
    });

    return res.status(200).json(
        new ApiResponse(200, 'মাসিক বেতন শিটের পরিবর্তন ডাটাবেইসে সংরক্ষিত হয়েছে।', {
            month,
            year,
            updatedCount: operations.length,
            preparedOn
        })
    );
});

const getSalaryRevisionHistory = asyncHandler(async (req, res) => {
    const targetTeacherId = (req.user.role === 'Teacher') ? req.user._id : (req.query.teacherId || null);
    const filter = targetTeacherId ? { teacherId: targetTeacherId } : {};

    const history = await SalaryHistory.find(filter)
        .populate('teacherId', 'teacherCode fullNameBng designation')
        .populate('changedBy', 'fullNameBng')
        .sort({ createdAt: -1 })
        .lean();

    return res.status(200).json(new ApiResponse(200, 'বেতন পরিবর্তনের ইতিহাস', history));
});

const generateMonthlyPayroll = asyncHandler(async (req, res) => {
    const {
        month,
        year,
        teacherId,
        includeBonus = false,
        bonusPercentage = null,
        bonusTitle = null,
        adjustmentMode = null,
        adjustmentValue = 0,
        adjustmentReason = null,
        extraAllowance = 0,
        extraDeduction = 0,
        adjustmentNote = null,
        forceGenerateWithPending = true
    } = req.body;

    ensurePayrollMonthIsClosed(month, year);

    const existingSheetsCount = await Salary.countDocuments({
        month: Number(month),
        year: Number(year)
    });
    if (existingSheetsCount > 0) {
        throw new ApiError(409, 'এই মাসের বেতন শিট আগে থেকেই তৈরি ও সংরক্ষিত আছে। একই মাসের শিট দ্বিতীয়বার তৈরি করা যাবে না; আগের শিটটি খুলে দেখুন বা ৩০ দিনের মধ্যে সংশোধন করুন।');
    }

    const pendingAppsCount = await LeaveRequest.countDocuments({
        targetMonth: Number(month),
        targetYear: Number(year),
        status: 'Pending',
        ...(teacherId && { teacherId })
    });

    if (pendingAppsCount > 0 && !forceGenerateWithPending) {
        throw new ApiError(
            400,
            `সতর্কবার্তা: ${month}/${year} মাসের ${pendingAppsCount}টি দরখাস্ত এখনো অনির্ধারিত (Pending) অবস্থায় আছে!`
        );
    }

    const query = { isActive: true, registrationStatus: 'Approved' };
    if (teacherId) query._id = teacherId;

    const teachers = (await Teacher.find(query).lean()).sort(compareTeachersByRank);
    if (teachers.length === 0) throw new ApiError(404, 'কোনো সক্রিয় শিক্ষক পাওয়া যায়নি!');

    const monthStartDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka')
        .startOf('month')
        .format('YYYY-MM-DD');
    const monthEndDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka')
        .endOf('month')
        .format('YYYY-MM-DD');
    const attendanceCount = await Attendance.countDocuments({
        teacherId: { $in: teachers.map((teacher) => teacher._id) },
        date: { $gte: monthStartDate, $lte: monthEndDate },
        isIgnored: { $ne: true }
    });
    if (attendanceCount === 0) {
        throw new ApiError(400, 'এই মাসে কোনো হাজিরার রেকর্ড নেই; হাজিরা ছাড়া বেতন শিট তৈরি করা যাবে না।');
    }

    const generatedList = [];

    for (const teacher of teachers) {
        const result = await calculateTeacherMonthlyPayroll({
            teacher,
            month: Number(month),
            year: Number(year),
            includeBonus,
            bonusPercentage,
            bonusTitle,
            adjustmentMode,
            adjustmentValue,
            adjustmentReason,
            extraAllowance: teacherId ? extraAllowance : 0,
            extraDeduction: teacherId ? extraDeduction : 0,
            adjustmentNote: teacherId ? adjustmentNote : null,
            generatedBy: req.user._id,
            persist: false
        });

        generatedList.push({
            ...result.salary,
            teacherId: {
                _id: String(teacher._id),
                teacherCode: teacher.teacherCode,
                fullNameBng: teacher.fullNameBng,
                fullNameEng: teacher.fullNameEng,
                designation: teacher.designation,
                designationEng: teacher.designationEng
            }
        });
    }

    const totalPayrollAmount = generatedList.reduce((sum, item) => sum + item.netPayableSalary, 0);

    return res.status(200).json(
        new ApiResponse(
            200,
            `${month}/${year} মাসের বেতন খসড়া তৈরি হয়েছে। নিশ্চিত না করা পর্যন্ত এটি সংরক্ষিত হবে না।`,
            {
                month: Number(month),
                year: Number(year),
                pendingApplicationsWarningCount: pendingAppsCount,
                generatedCount: generatedList.length,
                totalPayrollAmount,
                payrollRecords: generatedList,
                isDraft: true
            }
        )
    );
});

const confirmMonthlyPayrollSheet = asyncHandler(async (req, res) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    const rows = req.body.rows;
    const includeBonus = req.body.includeBonus === true || req.body.includeBonus === 'true';
    const preparedOn = String(req.body.preparedOn || '').trim();

    ensurePayrollMonthIsClosed(month, year);

    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 500) {
        throw new ApiError(400, 'বেতন শিটে ১ থেকে ৫০০টি সারি থাকতে হবে।');
    }

    const existingSheetsCount = await Salary.countDocuments({ month, year });
    if (existingSheetsCount > 0) {
        throw new ApiError(409, 'এই মাসের বেতন শিট ইতিমধ্যে নিশ্চিত ও সংরক্ষিত হয়েছে।');
    }

    const teachers = (await Teacher.find({
        isActive: true,
        registrationStatus: 'Approved'
    }).lean()).sort(compareTeachersByRank);
    if (teachers.length === 0) throw new ApiError(404, 'কোনো সক্রিয় শিক্ষক পাওয়া যায়নি।');
    if (rows.length !== teachers.length) {
        throw new ApiError(400, 'খসড়ার শিক্ষক তালিকা পরিবর্তিত হয়েছে; শিটটি আবার তৈরি করুন।');
    }

    const monthStartDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka')
        .startOf('month')
        .format('YYYY-MM-DD');
    const monthEndDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka')
        .endOf('month')
        .format('YYYY-MM-DD');
    const attendanceCount = await Attendance.countDocuments({
        teacherId: { $in: teachers.map((teacher) => teacher._id) },
        date: { $gte: monthStartDate, $lte: monthEndDate },
        isIgnored: { $ne: true }
    });
    if (attendanceCount === 0) {
        throw new ApiError(400, 'এই মাসে কোনো হাজিরার রেকর্ড নেই; হাজিরা ছাড়া বেতন নিশ্চিত করা যাবে না।');
    }

    const settings = await SystemSettings.getSettings();
    const daysInMonth = getEffectiveDaysInMonth(month, year, settings.payrollPolicy);
    const rowByTeacherId = new Map();
    for (const row of rows) {
        const teacherId = String(row?.teacherId || '');
        if (rowByTeacherId.has(teacherId)) {
            throw new ApiError(400, 'খসড়ায় একই শিক্ষক একাধিকবার রয়েছে।');
        }
        rowByTeacherId.set(teacherId, row);
    }

    const teacherIds = new Set(teachers.map((teacher) => String(teacher._id)));
    if ([...rowByTeacherId.keys()].some((teacherId) => !teacherIds.has(teacherId))) {
        throw new ApiError(400, 'খসড়ায় অকার্যকর শিক্ষক রয়েছে; শিটটি আবার তৈরি করুন।');
    }

    const confirmationTime = new Date();
    const salaryDocuments = [];
    for (const teacher of teachers) {
        const row = rowByTeacherId.get(String(teacher._id));
        if (!row) throw new ApiError(400, 'খসড়ায় একজন বা একাধিক শিক্ষক অনুপস্থিত।');

        const basicSalary = Number(row.basicSalary);
        const deductibleDays = Number(row.deductibleDays);
        const bonusAmount = Number(row.bonusAmount);
        const adjustmentAmount = Number(row.adjustmentAmount);
        if (
            !Number.isFinite(basicSalary) || basicSalary < 0 || basicSalary > 1000000000 ||
            !Number.isFinite(deductibleDays) || deductibleDays < 0 || deductibleDays > daysInMonth ||
            !Number.isFinite(bonusAmount) || bonusAmount < 0 || bonusAmount > 1000000000 ||
            !Number.isFinite(adjustmentAmount) || Math.abs(adjustmentAmount) > 1000000000
        ) {
            throw new ApiError(400, 'খসড়ার বেতন, কর্তনযোগ্য দিন, বোনাস বা সমন্বয়ের পরিমাণ সঠিক নয়।');
        }

        const result = await calculateTeacherMonthlyPayroll({
            teacher,
            month,
            year,
            basicSalaryOverride: basicSalary,
            manualDeductibleDays: deductibleDays,
            includeBonus,
            bonusAmountOverride: bonusAmount,
            adjustmentAmountOverride: adjustmentAmount,
            preparedOn,
            generatedBy: req.user._id,
            persist: false
        });
        salaryDocuments.push({
            ...result.salary,
            originalBasicSalarySnapshot: teacher.basicSalary,
            generatedAt: confirmationTime,
            paymentStatus: 'Pending'
        });
    }

    await Salary.insertMany(salaryDocuments, { ordered: true });
    await AuditLog.create({
        action: 'MONTHLY_PAYROLL_SHEET_CONFIRMED',
        module: 'Payroll',
        description: `${month}/${year} মাসের ${salaryDocuments.length}টি বেতন সারি নিশ্চিত করে সংরক্ষণ করা হয়েছে।`,
        performedBy: req.user._id,
        ipAddress: req.ip
    });

    return res.status(201).json(
        new ApiResponse(201, 'বেতন শিট নিশ্চিত করে ডাটাবেইসে সংরক্ষণ করা হয়েছে।', {
            month,
            year,
            confirmedCount: salaryDocuments.length,
            generatedAt: confirmationTime
        })
    );
});

const getMonthlySalaries = asyncHandler(async (req, res) => {
    const { month, year, paymentStatus } = req.query;
    const filter = {};

    if (req.user.role === 'Teacher') filter.teacherId = req.user._id;
    else if (req.query.teacherId) filter.teacherId = req.query.teacherId;

    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const salaries = await Salary.find(filter)
        .populate('teacherId', 'teacherCode biometricDeviceId fullNameBng fullNameEng designation rankingMetrics.overallMadrasahRank rankingMetrics.designationPriority indexNumber phone bankDetails')
        .lean();
    salaries.sort(compareSalaryRowsByTeacherRank);

    const grandTotalNetPayable = salaries.reduce((sum, s) => sum + s.netPayableSalary, 0);

    return res.status(200).json(
        new ApiResponse(200, 'মাসিক বেতন বিবরণী', {
            totalRecords: salaries.length,
            grandTotalNetPayable,
            salaries
        })
    );
});

const getSavedPayrollPeriods = asyncHandler(async (req, res) => {
    const periods = await Salary.aggregate([
        {
            $group: {
                _id: { year: '$year', month: '$month' },
                salaryCount: { $sum: 1 },
                generatedAt: { $max: '$generatedAt' }
            }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        {
            $project: {
                _id: 0,
                year: '$_id.year',
                month: '$_id.month',
                salaryCount: 1,
                generatedAt: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, 'সংরক্ষিত বেতন শিটের মাসসমূহ', { periods })
    );
});

const deleteMonthlyPayrollSheet = asyncHandler(async (req, res) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    const sheetFilter = { month, year };
    const existingCount = await Salary.countDocuments(sheetFilter);

    if (existingCount === 0) {
        throw new ApiError(404, 'এই মাসের কোনো সংরক্ষিত বেতন শিট পাওয়া যায়নি।');
    }

    const nonPendingCount = await Salary.countDocuments({
        ...sheetFilter,
        paymentStatus: { $ne: PAYMENT_STATUS.PENDING }
    });
    if (nonPendingCount > 0) {
        throw new ApiError(409, 'পেমেন্ট সম্পন্ন বা পেন্ডিং নয় এমন বেতন শিট মুছে ফেলা যাবে না।');
    }

    const deletionResult = await Salary.deleteMany(sheetFilter);
    if (deletionResult.deletedCount !== existingCount) {
        throw new ApiError(409, 'বেতন শিটের তথ্য পরিবর্তিত হয়েছে; আবার লোড করে চেষ্টা করুন।');
    }

    await AuditLog.create({
        action: 'MONTHLY_PAYROLL_SHEET_DELETED',
        module: 'Payroll',
        description: `${month}/${year} মাসের ${deletionResult.deletedCount}টি সংরক্ষিত বেতন সারি মুছে ফেলা হয়েছে।`,
        performedBy: req.user._id,
        ipAddress: req.ip,
        metadata: { month, year, deletedCount: deletionResult.deletedCount }
    });

    return res.status(200).json(
        new ApiResponse(200, `${month}/${year} মাসের বেতন শিট মুছে ফেলা হয়েছে। হাজিরার তথ্য অপরিবর্তিত আছে।`, {
            month,
            year,
            deletedCount: deletionResult.deletedCount
        })
    );
});

const getMonthlyAttendanceDetails = asyncHandler(async (req, res) => {
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    const teacherIds = req.body.teacherIds.map(String);
    const uniqueTeacherIds = [...new Set(teacherIds)];
    if (teacherIds.length !== uniqueTeacherIds.length) {
        throw new ApiError(400, 'শিক্ষক তালিকায় একই আইডি একাধিকবার দেওয়া হয়েছে।');
    }

    const monthStartDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka')
        .startOf('month')
        .format('YYYY-MM-DD');
    const monthEndDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka')
        .endOf('month')
        .format('YYYY-MM-DD');
    const attendanceStatuses = [
        ATTENDANCE_STATUS.ABSENT,
        ATTENDANCE_STATUS.LEAVE,
        ATTENDANCE_STATUS.LATE,
        ATTENDANCE_STATUS.EXCUSED_LATE,
        ATTENDANCE_STATUS.APPROVED_SICK_LEAVE,
        ATTENDANCE_STATUS.APPROVED_CASUAL_LEAVE
    ];

    const [teachers, logs] = await Promise.all([
        Teacher.find({ _id: { $in: uniqueTeacherIds } })
            .select('_id teacherCode fullNameBng fullNameEng rankingMetrics biometricDeviceId')
            .lean(),
        Attendance.find({
            teacherId: { $in: uniqueTeacherIds },
            date: { $gte: monthStartDate, $lte: monthEndDate },
            status: { $in: attendanceStatuses },
            isIgnored: { $ne: true }
        })
            .select('teacherId date status punchTime remarks')
            .sort({ date: 1 })
            .lean()
    ]);

    if (teachers.length !== uniqueTeacherIds.length) {
        throw new ApiError(404, 'বেতন শিটের একজন বা একাধিক শিক্ষককে পাওয়া যায়নি।');
    }

    teachers.sort(compareTeachersByRank);
    const logsByTeacherId = new Map(uniqueTeacherIds.map((teacherId) => [teacherId, []]));
    for (const log of logs) {
        logsByTeacherId.get(String(log.teacherId))?.push({
            date: log.date,
            status: log.status,
            punchTime: log.punchTime,
            remarks: log.remarks || ''
        });
    }

    const teacherDetails = teachers.map((teacher) => ({
        teacherId: String(teacher._id),
        teacherCode: teacher.teacherCode,
        fullNameBng: teacher.fullNameBng,
        fullNameEng: teacher.fullNameEng,
        records: logsByTeacherId.get(String(teacher._id)) || []
    }));

    return res.status(200).json(
        new ApiResponse(200, `${month}/${year} মাসের শিক্ষকভিত্তিক হাজিরা বিস্তারিত`, {
            month,
            year,
            teachers: teacherDetails
        })
    );
});

module.exports = {
    reviseTeacherBasicSalary: reviseBasicSalaryBulkOrSingle,
    reviseBasicSalaryBulkOrSingle,
    adjustMonthlyPayrollBulkOrSingle,
    saveMonthlyPayrollSheetEdits,
    getSalaryRevisionHistory,
    generateMonthlyPayroll,
    confirmMonthlyPayrollSheet,
    getMonthlySalaries,
    getSavedPayrollPeriods,
    deleteMonthlyPayrollSheet,
    getMonthlyAttendanceDetails,
    applyForLeave,
    getMonthlyApplicationReviewDesk,
    getLeaveRequests: getMonthlyApplicationReviewDesk,
    reviewLeaveRequest,
    bulkReviewApplications
};
