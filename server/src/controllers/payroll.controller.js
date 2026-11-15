const moment = require('moment-timezone');
const Teacher = require('../models/Teacher');
const Salary = require('../models/Salary');
const SalaryHistory = require('../models/SalaryHistory');
const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');
const LoanAdvance = require('../models/LoanAdvance');
const AuditLog = require('../models/AuditLog');
const {
    calculateAdjustmentByMode,
    calculateTeacherMonthlyPayroll
} = require('../services/payroll.service');
const {
    PAYROLL_POLICY,
    PAYMENT_STATUS,
    ATTENDANCE_STATUS,
    ATTENDANCE_RULES
} = require('../constants/system.constants');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

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

    const filter = { month: Number(month), year: Number(year), paymentStatus: PAYMENT_STATUS.PENDING };
    if (!applyToAll) {
        if (Array.isArray(teacherIds) && teacherIds.length > 0) filter.teacherId = { $in: teacherIds };
        else if (teacherId) filter.teacherId = teacherId;
        else throw new ApiError(400, 'একজনের জন্য teacherId দিন, অথবা সবার জন্য applyToAll: true পাঠান!');
    }

    const salarySheets = await Salary.find(filter).populate('teacherId', 'fullNameBng');
    if (salarySheets.length === 0) {
        throw new ApiError(404, 'এই মাসের কোনো অপরিশোধিত (Pending) স্যালারি শিট পাওয়া যায়নি!');
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

    const teachers = await Teacher.find(query).lean();
    if (teachers.length === 0) throw new ApiError(404, 'কোনো সক্রিয় শিক্ষক পাওয়া যায়নি!');

    const generatedList = [];
    let skippedPaidCount = 0;

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
            generatedBy: req.user._id
        });

        if (result.skipped) skippedPaidCount++;
        else generatedList.push(result.salary);
    }

    const totalPayrollAmount = generatedList.reduce((sum, item) => sum + item.netPayableSalary, 0);

    return res.status(200).json(
        new ApiResponse(
            200,
            `${month}/${year} মাসের পে-রোল জেনারেট হয়েছে! মোট প্রদেয়: ${totalPayrollAmount}৳।`,
            {
                month: Number(month),
                year: Number(year),
                pendingApplicationsWarningCount: pendingAppsCount,
                generatedCount: generatedList.length,
                skippedAlreadyPaidCount: skippedPaidCount,
                totalPayrollAmount,
                payrollRecords: generatedList
            }
        )
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
        .populate('teacherId', 'teacherCode biometricDeviceId fullNameBng fullNameEng designation rankingMetrics.overallMadrasahRank indexNumber phone bankDetails')
        .sort({ createdAt: -1 })
        .lean();

    const grandTotalNetPayable = salaries.reduce((sum, s) => sum + s.netPayableSalary, 0);

    return res.status(200).json(
        new ApiResponse(200, 'মাসিক বেতন বিবরণী', {
            totalRecords: salaries.length,
            grandTotalNetPayable,
            salaries
        })
    );
});

// ৫. বেতন পরিশোধ (Paid) মার্ক করলে লোনের কিস্তি স্বয়ংক্রিয়ভাবে লোনের আসল ব্যালেন্স থেকে কেটে নেওয়া!
const markSalaryAsPaid = asyncHandler(async (req, res) => {
    const { paymentMethod = 'Bank_Transfer', transactionReference = null } = req.body;
    const salary = await Salary.findById(req.params.id).populate('teacherId', 'fullNameBng');
    if (!salary) throw new ApiError(404, 'স্যালারি রেকর্ড খুঁজে পাওয়া যায়নি!');
    if (salary.paymentStatus === PAYMENT_STATUS.PAID) {
        throw new ApiError(400, 'এই বেতনটি ইতিমধ্যে পরিশোধ (Paid) করা হয়েছে!');
    }

    // যদি এই মাসের বেতন থেকে লোন বা অগ্রিমের কিস্তি কাটা হয়ে থাকে, তবে লোনের ব্যালেন্স আপডেট করা
    if (salary.loanDeduction && salary.loanDeduction.loanId && salary.loanDeduction.installmentAmount > 0) {
        const loan = await LoanAdvance.findById(salary.loanDeduction.loanId);
        if (loan && loan.status === 'Active') {
            loan.totalPaidAmount += salary.loanDeduction.installmentAmount;
            loan.remainingBalance = Math.max(0, loan.remainingBalance - salary.loanDeduction.installmentAmount);
            if (loan.remainingBalance === 0) {
                loan.status = 'Completed';
            }
            loan.repaymentHistory.push({
                month: salary.month,
                year: salary.year,
                amountDeducted: salary.loanDeduction.installmentAmount,
                salaryId: salary._id,
                deductedAt: new Date()
            });
            await loan.save();
        }
    }

    salary.paymentStatus = PAYMENT_STATUS.PAID;
    salary.paymentMethod = paymentMethod;
    salary.transactionReference = transactionReference;
    salary.paidAt = new Date();
    salary.paidBy = req.user._id;
    await salary.save();

    return res.status(200).json(
        new ApiResponse(200, `${salary.teacherId.fullNameBng}-এর বেতন পরিশোধিত (Paid) হিসেবে লক করা হয়েছে!`, salary)
    );
});

module.exports = {
    reviseTeacherBasicSalary: reviseBasicSalaryBulkOrSingle,
    reviseBasicSalaryBulkOrSingle,
    adjustMonthlyPayrollBulkOrSingle,
    getSalaryRevisionHistory,
    generateMonthlyPayroll,
    getMonthlySalaries,
    markSalaryAsPaid,
    applyForLeave,
    getMonthlyApplicationReviewDesk,
    getLeaveRequests: getMonthlyApplicationReviewDesk,
    reviewLeaveRequest,
    bulkReviewApplications
};
