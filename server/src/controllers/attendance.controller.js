const moment = require('moment-timezone');
const Attendance = require('../models/Attendance');
const SpecialDate = require('../models/SpecialDate');
const Teacher = require('../models/Teacher');
const {
    processBiometricPunch,
    parseAndSyncRawZKTecoLogs,
    runDailyEndOfDayAudit,
    evaluatePunchStatus
} = require('../services/attendance.service');
const { ATTENDANCE_STATUS, ATTENDANCE_RULES } = require('../constants/system.constants');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ১. স্পেশাল ইন-টাইম সেট করা
const setSpecialDateConfig = asyncHandler(async (req, res) => {
    let { date, title, isHoliday = false, customInTime = '09:00', customLateLimit, ignoreThirtyPercentRule = false } = req.body;

    if (!customLateLimit && customInTime) {
        const [h, m] = customInTime.split(':').map(Number);
        const lateHour = Math.min(23, h + 1);
        customLateLimit = `${String(lateHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const specialDate = await SpecialDate.findOneAndUpdate(
        { date },
        { $set: { date, title, isHoliday, customInTime, customLateLimit, ignoreThirtyPercentRule, createdBy: req.user._id } },
        { upsert: true, new: true, runValidators: true }
    );

    const existingAttendances = await Attendance.find({ date, punchTime: { $ne: null } });
    for (const record of existingAttendances) {
        const punchMoment = moment.tz(record.punchTime, 'Asia/Dhaka');
        const updatedEval = await evaluatePunchStatus(punchMoment, record.isLateExcused, record.excuseNote);
        record.appliedInTime = updatedEval.appliedInTime;
        record.status = updatedEval.status;
        record.deductionWeight = updatedEval.deductionWeight;
        record.directSalaryPenaltyDays = updatedEval.directSalaryPenaltyDays;
        record.remarks = `স্পেশাল ইন-টাইম (${customInTime}) অনুযায়ী পুনরায় সমন্বয়কৃত`;
        await record.save();
    }

    return res.status(200).json(
        new ApiResponse(200, `${date} তারিখের ইন-টাইম সফলভাবে ${customInTime} সেট করা হয়েছে!`, specialDate)
    );
});

const getSpecialDates = asyncHandler(async (req, res) => {
    const dates = await SpecialDate.find().sort({ date: -1 }).lean();
    return res.status(200).json(new ApiResponse(200, 'বিশেষ দিনগুলোর তালিকা', dates));
});

// ২. সিঙ্গেল পাঞ্চ রেকর্ড
const recordPunch = asyncHandler(async (req, res) => {
    const { biometricDeviceId, teacherId, punchTime } = req.body;
    if (!biometricDeviceId && !teacherId) {
        throw new ApiError(400, 'biometricDeviceId অথবা teacherId যেকোনো একটি প্রদান করা আবশ্যক!');
    }
    const result = await processBiometricPunch({ biometricDeviceId, teacherId, punchTime, source: 'ZKTeco_Device' });
    return res.status(result.alreadyPunched ? 200 : 201).json(
        new ApiResponse(result.alreadyPunched ? 200 : 201, result.message, result.attendance)
    );
});

// ৩. ZKTeco K40 ADMS অটো-রিসিভার (নেট না থেকে পরে একসাথে হাজারটা লগ পাঠালেও রিসিভ করবে)
const zkTecoHandshake = (req, res) => {
    res.set('Content-Type', 'text/plain');
    return res.status(200).send('GET OPTION FROM: ARDM_SERVER\nATTLOGStamp=None\nOPERLOGStamp=9999\nATTPHOTOStamp=None\nErrorDelay=30\nDelay=10\nTransTimes=00:00;14:05\nTransInterval=1\nTransFlag=1111000000\nTimeZone=6\nRealtime=1\nEncrypt=None');
};

const zkTecoReceiveLogs = asyncHandler(async (req, res) => {
    const rawBody = typeof req.body === 'string' ? req.body : '';
    const syncResult = await parseAndSyncRawZKTecoLogs(rawBody, 'ZKTeco_Device');
    res.set('Content-Type', 'text/plain');
    return res.status(200).send(`OK: ${syncResult.newlySyncedPunches}`);
});

// ৪. পেনড্রাইভে এক্সপোর্ট করা ফাইল (.dat / .txt / .csv) অথবা টেক্সট ফ্রন্টএন্ড থেকে আপলোড করার API
const uploadUsbAttendanceLogs = asyncHandler(async (req, res) => {
    let rawContent = '';

    if (req.file && req.file.buffer) {
        rawContent = req.file.buffer.toString('utf8');
    } else if (req.body && req.body.rawLogsText) {
        rawContent = req.body.rawLogsText;
    } else {
        throw new ApiError(400, 'পেনড্রাইভের ফাইল (.dat/.txt) অথবা লগ টেক্সট প্রদান করুন!');
    }

    const syncSummary = await parseAndSyncRawZKTecoLogs(rawContent, 'USB_Pendrive_Upload');

    return res.status(200).json(
        new ApiResponse(
            200,
            `পেনড্রাইভের ডেটা সফলভাবে সিঙ্ক হয়েছে! নতুন পাঞ্চ যুক্ত হয়েছে: ${syncSummary.newlySyncedPunches}টি।`,
            syncSummary
        )
    );
});

// ৫. কেউ কল করে বলে দেরি হবে বা সকালে মাদ্রাসার কাজে পাঠানো হলে তার লেট মওকুফ (Excuse Late / Official Duty)
const excuseTeacherLateOrDuty = asyncHandler(async (req, res) => {
    const {
        teacherId,
        date = moment.tz('Asia/Dhaka').format('YYYY-MM-DD'),
        mode = 'EXCUSE_LATE', // 'EXCUSE_LATE' অথবা 'OFFICIAL_DUTY'
        reason
    } = req.body;

    if (!reason) {
        throw new ApiError(400, 'দেরি মওকুফ বা অফিসিয়াল ডিউটির কারণ উল্লেখ করা আবশ্যক!');
    }

    const teacher = await Teacher.findById(teacherId).lean();
    if (!teacher) throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');

    const existing = await Attendance.findOne({ teacherId, date });

    if (mode === 'OFFICIAL_DUTY') {
        const updated = await Attendance.findOneAndUpdate(
            { teacherId, date },
            {
                $set: {
                    teacherId,
                    biometricDeviceId: teacher.biometricDeviceId,
                    date,
                    status: ATTENDANCE_STATUS.OFFICIAL_DUTY,
                    deductionWeight: 0,
                    directSalaryPenaltyDays: 0,
                    isLateExcused: true,
                    excuseNote: reason,
                    isIgnored: false,
                    source: 'Admin_Manual',
                    modifiedBy: req.user._id,
                    remarks: `মাদ্রাসার কাজে নিয়োজিত (Official Duty): ${reason}`
                }
            },
            { upsert: true, new: true }
        );
        return res.status(200).json(
            new ApiResponse(200, `${teacher.fullNameBng}-কে ${date} তারিখে 'Official Duty' মার্ক করা হয়েছে (কোনো লেট বা ছুটি কাটবে না)।`, updated)
        );
    }

    // যদি EXCUSE_LATE হয় (ফোন করে বলেছে দেরি হবে):
    // তিনি যদি ইতিমধ্যে পাঞ্চ করে Late হয়ে থাকেন, তবে সাথে সাথে Late (Excused) হয়ে যাবে। আর এখনো না এসে থাকলে, যখনই এসে পাঞ্চ করবেন তখন অটোমেটিক লেট মাফ হয়ে যাবে!
    const newStatus = (existing && existing.punchTime) ? ATTENDANCE_STATUS.EXCUSED_LATE : (existing ? existing.status : ATTENDANCE_STATUS.EXCUSED_LATE);

    const updated = await Attendance.findOneAndUpdate(
        { teacherId, date },
        {
            $set: {
                teacherId,
                biometricDeviceId: teacher.biometricDeviceId,
                date,
                status: newStatus,
                deductionWeight: 0,
                directSalaryPenaltyDays: 0,
                isLateExcused: true,
                excuseNote: reason,
                isIgnored: false,
                source: 'Admin_Manual',
                modifiedBy: req.user._id,
                remarks: `অনুমোদিত বিলম্ব (লেট মওকুফ): ${reason}`
            }
        },
        { upsert: true, new: true }
    );

    return res.status(200).json(
        new ApiResponse(200, `${teacher.fullNameBng}-এর ${date} তারিখের বিলম্ব (Late) মওকুফ করা হয়েছে!`, updated)
    );
});

// ৬. অ্যাডমিন কর্তৃক যেকোনো স্ট্যাটাস ম্যানুয়ালি ওভাররাইড করা (Present, Leave, Absent, Excused Late ইত্যাদি)
const adminOverrideAttendance = asyncHandler(async (req, res) => {
    const { teacherId, date, status, remarks } = req.body;
    const teacher = await Teacher.findById(teacherId).lean();
    if (!teacher) throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');

    let deductionWeight = 0;
    let directSalaryPenaltyDays = 0;

    if (status === ATTENDANCE_STATUS.LATE) {
        deductionWeight = ATTENDANCE_RULES.LATE_DEDUCTION_WEIGHT; // 0.5 কোটা কাটবে
    } else if (status === ATTENDANCE_STATUS.LEAVE) {
        deductionWeight = ATTENDANCE_RULES.LEAVE_DEDUCTION_WEIGHT; // 1.0 কোটা কাটবে
    } else if (status === ATTENDANCE_STATUS.ABSENT) {
        // বিনা অনুমতিতে অনুপস্থিত করলে কোটা কাটবে না, সরাসরি ১ দিনের বেতন কাটা যাবে!
        deductionWeight = 0;
        directSalaryPenaltyDays = ATTENDANCE_RULES.ABSENT_PENALTY_DAYS; // 1.0 দিন সরাসরি বেতন কর্তন
    }

    const updated = await Attendance.findOneAndUpdate(
        { teacherId, date },
        {
            $set: {
                teacherId,
                biometricDeviceId: teacher.biometricDeviceId,
                date,
                status,
                deductionWeight,
                directSalaryPenaltyDays,
                isLateExcused: status === ATTENDANCE_STATUS.EXCUSED_LATE,
                isIgnored: false,
                source: 'Admin_Manual',
                modifiedBy: req.user._id,
                remarks: remarks || `অ্যাডমিন কর্তৃক স্ট্যাটাস '${status}' করা হয়েছে`
            }
        },
        { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json(new ApiResponse(200, 'হাজিরা স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে!', updated));
});

// ৭. শিক্ষকের মাসিক সামারি (কোটা বনাম সরাসরি Absent পেনাল্টি আলাদা হিসাবসহ)
const getTeacherMonthlySummary = asyncHandler(async (req, res) => {
    const targetTeacherId = (req.user.role === 'Teacher') ? req.user._id : (req.query.teacherId || req.user._id);
    const now = moment.tz('Asia/Dhaka');
    const month = parseInt(req.query.month, 10) || (now.month() + 1);
    const year = parseInt(req.query.year, 10) || now.year();

    const teacher = await Teacher.findById(targetTeacherId).lean();
    if (!teacher) throw new ApiError(404, 'শিক্ষকের তথ্য পাওয়া যায়নি!');

    const startDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').startOf('month').format('YYYY-MM-DD');
    const endDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').endOf('month').format('YYYY-MM-DD');

    const logs = await Attendance.find({
        teacherId: targetTeacherId,
        date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 }).lean();

    let totalPresent = 0;
    let totalExcusedLateOrDuty = 0;
    let totalLateCount = 0;
    let totalLeaveCount = 0;
    let totalUnexcusedAbsentCount = 0;
    let totalApprovedLeaveCount = 0;
    let totalIgnoredDays = 0;

    let totalQuotaUsed = 0;              // Late(0.5) + Leave(1.0) -> ২ দিনের কোটা থেকে যাবে
    let directAbsentPenaltyDays = 0;     // Absent(1.0) -> কোটা থাকলেও সরাসরি বেতন কাটা যাবে!

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
            directAbsentPenaltyDays += (log.directSalaryPenaltyDays || 1.0);
        } else if (
            log.status === ATTENDANCE_STATUS.APPROVED_SICK_LEAVE ||
            log.status === ATTENDANCE_STATUS.APPROVED_CASUAL_LEAVE
        ) {
            totalApprovedLeaveCount++;
        }
    }

    const monthlyQuota = teacher.customLeaveQuota ?? ATTENDANCE_RULES.MONTHLY_PAID_LEAVE_QUOTA;
    const quotaRemaining = Math.max(0, monthlyQuota - totalQuotaUsed);
    const excessQuotaDays = Math.max(0, totalQuotaUsed - monthlyQuota);

    // মোট যত দিনের বেতন কাটা যাবে = (কোটার অতিরিক্ত দিন) + (বিনা অনুমতিতে Absent থাকা দিন)
    const totalSalaryCutDays = excessQuotaDays + directAbsentPenaltyDays;
    const daysInThisMonth = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').daysInMonth();
    const perDaySalary = Number((teacher.basicSalary / daysInThisMonth).toFixed(2));
    const estimatedSalaryDeduction = Math.round(totalSalaryCutDays * (teacher.basicSalary / daysInThisMonth));

    return res.status(200).json(
        new ApiResponse(200, 'মাসিক উপস্থিতির বিস্তারিত সামারি', {
            teacherInfo: { _id: teacher._id, teacherCode: teacher.teacherCode, fullNameBng: teacher.fullNameBng, basicSalary: teacher.basicSalary },
            period: { month, year, startDate, endDate },
            summary: {
                totalPresent,
                totalExcusedLateOrDuty,
                totalLateCount,
                totalLeaveCount,
                totalUnexcusedAbsentCount,
                totalApprovedLeaveCount,
                totalIgnoredDays,
                totalQuotaUsed,
                monthlyAllowedQuota: monthlyQuota,
                quotaRemaining,
                excessQuotaDays,
                directAbsentPenaltyDays,
                daysInThisMonth,
                perDaySalary,
                totalDaysForSalaryCut: totalSalaryCutDays,
                estimatedSalaryDeduction
            },
            dailyLogs: logs
        })
    );
});

const triggerEndOfDayAuditManually = asyncHandler(async (req, res) => {
    const result = await runDailyEndOfDayAudit(req.body.date);
    return res.status(200).json(new ApiResponse(200, result.message, result));
});

module.exports = {
    setSpecialDateConfig,
    getSpecialDates,
    recordPunch,
    zkTecoHandshake,
    zkTecoReceiveLogs,
    uploadUsbAttendanceLogs,
    excuseTeacherLateOrDuty,
    adminOverrideAttendance,
    getTeacherMonthlySummary,
    triggerEndOfDayAuditManually
};
