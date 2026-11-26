const moment = require('moment-timezone');
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const AttendanceDay = require('../models/AttendanceDay');
const SpecialDate = require('../models/SpecialDate');
const Teacher = require('../models/Teacher');
const SystemSettings = require('../models/SystemSettings');
const Salary = require('../models/Salary');
const {
    processBiometricPunch,
    parseAndSyncRawZKTecoLogs,
    runDailyEndOfDayAudit,
    evaluatePunchStatus
} = require('../services/attendance.service');
const { ATTENDANCE_STATUS, ATTENDANCE_RULES } = require('../constants/system.constants');
const {
    calculateTeacherMonthlyPayroll,
    isPayrollEditable
} = require('../services/payroll.service');
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
        record.quotaDeduction = updatedEval.deductionWeight;
        record.salaryDeduction = 0;
        record.directSalaryPenaltyDays = updatedEval.directSalaryPenaltyDays;
        record.isAutoMarked = false;
        record.remarks = isHoliday
            ? updatedEval.remarks
            : `স্পেশাল ইন-টাইম (${customInTime}) অনুযায়ী পুনরায় সমন্বয়কৃত`;
        await record.save();
    }

    await AttendanceDay.findOneAndUpdate(
        { date },
        {
            $set: {
                date,
                dayType: isHoliday ? 'HOLIDAY' : 'OPEN_OVERRIDE',
                reason: title || (isHoliday ? 'প্রাতিষ্ঠানিক ছুটি' : 'প্রাতিষ্ঠানিক কর্মদিবস'),
                isAutoResolved: false,
                updatedBy: req.user._id
            }
        },
        { upsert: true, new: true }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            isHoliday
                ? `${date} তারিখ সফলভাবে ছুটির দিন ঘোষণা করা হয়েছে!`
                : `${date} তারিখ সফলভাবে খোলা দিন ঘোষণা করা হয়েছে!`,
            specialDate
        )
    );
});

const getSpecialDates = asyncHandler(async (req, res) => {
    const dates = await SpecialDate.find().sort({ date: -1 }).lean();
    return res.status(200).json(new ApiResponse(200, 'বিশেষ দিনগুলোর তালিকা', dates));
});

const deleteSpecialDate = asyncHandler(async (req, res) => {
    const specialDate = await SpecialDate.findOne({ date: req.params.date });
    if (!specialDate || !specialDate.isHoliday) {
        throw new ApiError(404, 'ছুটির দিনটি খুঁজে পাওয়া যায়নি!');
    }
    specialDate.isHoliday = false;
    await specialDate.save();

    const attendanceRecords = await Attendance.find({
        date: req.params.date,
        punchTime: { $ne: null }
    });
    for (const record of attendanceRecords) {
        const evaluated = await evaluatePunchStatus(
            moment.tz(record.punchTime, 'Asia/Dhaka'),
            record.isLateExcused,
            record.excuseNote
        );
        record.appliedInTime = evaluated.appliedInTime;
        record.status = evaluated.status;
        record.deductionWeight = evaluated.deductionWeight;
        record.quotaDeduction = evaluated.deductionWeight;
        record.salaryDeduction = 0;
        record.directSalaryPenaltyDays = evaluated.directSalaryPenaltyDays;
        record.remarks = evaluated.remarks;
        await record.save();
    }
    await AttendanceDay.findOneAndUpdate(
        { date: req.params.date },
        {
            $set: {
                date: req.params.date,
                dayType: 'OPEN_OVERRIDE',
                reason: 'ছুটির ঘোষণা বাতিল করে খোলা কর্মদিবস করা হয়েছে',
                isAutoResolved: false,
                updatedBy: req.user._id
            }
        },
        { upsert: true, new: true }
    );
    return res.status(200).json(new ApiResponse(200, 'তারিখটি পুনরায় খোলা দিন হিসেবে ফিরিয়ে নেওয়া হয়েছে।', specialDate));
});

const getDailyAttendance = asyncHandler(async (req, res) => {
    const date = req.query.date || moment.tz('Asia/Dhaka').format('YYYY-MM-DD');
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
        throw new ApiError(400, 'তারিখ YYYY-MM-DD ফরম্যাটে হতে হবে।');
    }

    const monthStartDate = moment.tz(date, 'YYYY-MM-DD', 'Asia/Dhaka').startOf('month').format('YYYY-MM-DD');
    const [teachers, attendanceLogs, monthAttendanceLogs, specialDate, dayFlag, settings] = await Promise.all([
        Teacher.find({ isActive: true, registrationStatus: 'Approved' })
            .select('teacherCode fullNameBng fullNameEng designation biometricDeviceId customLeaveQuota')
            .sort({ teacherCode: 1 })
            .lean(),
        Attendance.find({ date }).lean(),
        Attendance.find({ date: { $gte: monthStartDate, $lt: date }, status: { $in: [ATTENDANCE_STATUS.LATE, ATTENDANCE_STATUS.LEAVE] }, isIgnored: false })
            .select('teacherId deductionWeight')
            .lean(),
        SpecialDate.findOne({ date }).lean(),
        AttendanceDay.findOne({ date }).lean(),
        SystemSettings.getSettings()
    ]);

    const logsByTeacherId = new Map(attendanceLogs.map((log) => [String(log.teacherId), log]));
    const monthlyQuotaByTeacherId = new Map();
    monthAttendanceLogs.forEach((log) => {
        const key = String(log.teacherId);
        monthlyQuotaByTeacherId.set(key, (monthlyQuotaByTeacherId.get(key) || 0) + (Number(log.deductionWeight) || 0));
    });
    const weekendDays = settings.attendancePolicy?.weekendDays || [5];
    const isHoliday = specialDate
        ? Boolean(specialDate.isHoliday)
        : weekendDays.includes(moment.tz(date, 'YYYY-MM-DD', 'Asia/Dhaka').day());

    const records = teachers.map((teacher) => {
        const log = logsByTeacherId.get(String(teacher._id));
        return {
            ...(log || {}),
            teacherId: teacher._id,
            teacher,
            date,
            status: log?.status || (isHoliday ? 'Holiday' : null),
            inTime24: log?.punchTime ? moment.tz(log.punchTime, 'Asia/Dhaka').format('HH:mm') : '',
            remarks: log?.remarks || specialDate?.title || '',
            monthlyQuotaUsedBefore: monthlyQuotaByTeacherId.get(String(teacher._id)) || 0,
            monthlyQuotaLimit: teacher.customLeaveQuota ?? settings.attendancePolicy?.monthlyPaidLeaveQuota ?? ATTENDANCE_RULES.MONTHLY_PAID_LEAVE_QUOTA
        };
    });

    return res.status(200).json(new ApiResponse(200, 'দৈনিক হাজিরার তালিকা', {
        date,
        isHoliday,
        isSpecialHoliday: Boolean(specialDate?.isHoliday),
        isOpenOverride: Boolean(specialDate && !specialDate.isHoliday),
        holidayTitle: specialDate?.title || '',
        dayFlag: dayFlag || null,
        records
    }));
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
    const { teacherId, date, status, remarks, punchTime } = req.body;
    const teacher = await Teacher.findById(teacherId).lean();
    if (!teacher) throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');

    const targetMoment = moment.tz(date, 'YYYY-MM-DD', 'Asia/Dhaka');
    const existingSalary = await Salary.findOne({
        teacherId,
        month: targetMoment.month() + 1,
        year: targetMoment.year()
    }).lean();
    if (existingSalary && !isPayrollEditable(existingSalary)) {
        throw new ApiError(403, 'বেতন শিট তৈরির ৩০ দিনের সংশোধন সময় শেষ হয়েছে; হাজিরা পরিবর্তন করা যাবে না।');
    }

    let deductionWeight = 0;
    let directSalaryPenaltyDays = 0;
    let quotaDeduction = 0;
    let salaryDeduction = 0;

    if (status === ATTENDANCE_STATUS.LATE) {
        deductionWeight = ATTENDANCE_RULES.LATE_DEDUCTION_WEIGHT; // 0.5 কোটা কাটবে
        quotaDeduction = ATTENDANCE_RULES.LATE_DEDUCTION_WEIGHT;
    } else if (status === ATTENDANCE_STATUS.LEAVE) {
        deductionWeight = ATTENDANCE_RULES.LEAVE_DEDUCTION_WEIGHT; // 1.0 কোটা কাটবে
        quotaDeduction = ATTENDANCE_RULES.LEAVE_DEDUCTION_WEIGHT;
    } else if (status === ATTENDANCE_STATUS.ABSENT) {
        // বিনা অনুমতিতে অনুপস্থিত করলে কোটা কাটবে না, সরাসরি ১ দিনের বেতন কাটা যাবে!
        deductionWeight = 0;
        quotaDeduction = 0;
        salaryDeduction = ATTENDANCE_RULES.ABSENT_PENALTY_DAYS;
        directSalaryPenaltyDays = ATTENDANCE_RULES.ABSENT_PENALTY_DAYS; // 1.0 দিন সরাসরি বেতন কর্তন
    } else if (status === ATTENDANCE_STATUS.OFFICIAL_DUTY) {
        deductionWeight = 0;
        quotaDeduction = 0;
        salaryDeduction = 0;
        directSalaryPenaltyDays = 0;
    }

    const updated = await Attendance.findOneAndUpdate(
        { teacherId, date },
        {
            $set: {
                teacherId,
                biometricDeviceId: teacher.biometricDeviceId,
                date,
                status,
                punchTime: [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.LATE, ATTENDANCE_STATUS.EXCUSED_LATE].includes(status) && punchTime
                    ? new Date(punchTime)
                    : null,
                deductionWeight,
                quotaDeduction,
                salaryDeduction,
                directSalaryPenaltyDays,
                isLateExcused: status === ATTENDANCE_STATUS.EXCUSED_LATE,
                isIgnored: false,
                isAutoMarked: false,
                isManuallyEdited: true,
                source: 'Admin_Manual',
                modifiedBy: req.user._id,
                remarks: remarks || `অ্যাডমিন কর্তৃক স্ট্যাটাস '${status}' করা হয়েছে`
            }
        },
        { upsert: true, new: true, runValidators: true }
    );

    let payrollRecalculated = false;

    if (existingSalary) {
        const payrollResult = await calculateTeacherMonthlyPayroll({
            teacher,
            month: targetMoment.month() + 1,
            year: targetMoment.year(),
            basicSalaryOverride: existingSalary.basicSalarySnapshot,
            includeBonus: existingSalary.includeBonus,
            bonusPercentage: existingSalary.bonusPercentage,
            bonusTitle: existingSalary.bonusTitle,
            bonusAmountOverride: existingSalary.bonusAmount,
            adjustmentMode: existingSalary.customAdjustment?.mode,
            adjustmentValue: existingSalary.customAdjustment?.value,
            adjustmentReason: existingSalary.customAdjustment?.reason,
            extraAllowance: existingSalary.extraAllowance,
            extraDeduction: existingSalary.extraDeduction,
            adjustmentNote: existingSalary.adjustmentNote,
            preparedOn: existingSalary.preparedOn,
            generatedBy: req.user._id
        });
        payrollRecalculated = !payrollResult.skipped;
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            payrollRecalculated
                ? 'হাজিরা আপডেট হয়েছে এবং সংশ্লিষ্ট মাসের বেতন পুনর্গণনা করা হয়েছে।'
                    : 'হাজিরা স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে!',
            updated,
            { payrollRecalculated }
        )
    );
});

// ৭. বাল্ক ম্যানুয়াল হাজিরা — তারিখের সক্রিয় শিক্ষক লিস্ট ও সেভ
const getBulkAttendanceForDate = asyncHandler(async (req, res) => {
    const date = req.query.date || moment.tz('Asia/Dhaka').format('YYYY-MM-DD');
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
        throw new ApiError(400, 'তারিখ YYYY-MM-DD ফরম্যাটে হতে হবে।');
    }

    const targetMoment = moment.tz(date, 'YYYY-MM-DD', 'Asia/Dhaka');
    const targetDateEnd = targetMoment.clone().endOf('day').toDate();
    const [teachers, logs, dayFlag] = await Promise.all([
        Teacher.find({
            isActive: true,
            registrationStatus: 'Approved',
            joiningDate: { $lte: targetDateEnd },
            $or: [
                { resignationDate: null },
                { resignationDate: { $exists: false } },
                { resignationDate: { $gt: targetDateEnd } }
            ]
        }).select('_id teacherCode biometricDeviceId fullNameBng fullNameEng designation').sort({ teacherCode: 1 }).lean(),
        Attendance.find({ date }).lean(),
        AttendanceDay.findOne({ date }).lean()
    ]);

    const logMap = new Map(logs.map((log) => [String(log.teacherId), log]));
    return res.status(200).json(new ApiResponse(200, 'বাল্ক হাজিরার তালিকা', {
        date,
        dayFlag: dayFlag || null,
        records: teachers.map((teacher) => {
            const log = logMap.get(String(teacher._id));
            return {
                teacher,
                status: log?.status || null,
                punchTime: log?.punchTime
                    ? moment.tz(log.punchTime, 'Asia/Dhaka').format('YYYY-MM-DDTHH:mm')
                    : '',
                source: log?.source || null,
                isManuallyEdited: Boolean(log?.isManuallyEdited),
                remarks: log?.remarks || ''
            };
        })
    }));
});

const saveBulkAttendanceForDate = asyncHandler(async (req, res) => {
    const { date, records = [] } = req.body;
    if (typeof date !== 'string' || !moment(date, 'YYYY-MM-DD', true).isValid()) {
        throw new ApiError(400, 'সঠিক তারিখ প্রদান করুন।');
    }
    if (!Array.isArray(records)) {
        throw new ApiError(400, 'হাজিরার তালিকা সঠিক নয়।');
    }

    const recordByTeacherId = new Map();
    for (const record of records) {
        if (!record || !mongoose.Types.ObjectId.isValid(record.teacherId)) {
            throw new ApiError(400, 'বাল্ক হাজিরায় একটি ভুল শিক্ষক আইডি পাওয়া গেছে।');
        }
        const teacherId = String(record.teacherId);
        if (recordByTeacherId.has(teacherId)) {
            throw new ApiError(400, 'একই শিক্ষককে একাধিকবার বাল্ক হাজিরায় পাঠানো হয়েছে।');
        }
        if (!['Present', 'Late'].includes(record.status)) {
            throw new ApiError(400, 'বাল্ক হাজিরার স্ট্যাটাস Present অথবা Late হতে হবে।');
        }
        recordByTeacherId.set(teacherId, record);
    }

    const targetMoment = moment.tz(date, 'YYYY-MM-DD', 'Asia/Dhaka');
    const [activeTeachers, specialDate, settings] = await Promise.all([
        Teacher.find({
            isActive: true,
            registrationStatus: 'Approved',
            joiningDate: { $lte: targetMoment.clone().endOf('day').toDate() },
            $or: [
                { resignationDate: null },
                { resignationDate: { $exists: false } },
                { resignationDate: { $gt: targetMoment.clone().endOf('day').toDate() } }
            ]
        }).lean(),
        SpecialDate.findOne({ date }).lean(),
        SystemSettings.getSettings()
    ]);

    if (activeTeachers.length === 0) {
        throw new ApiError(400, 'এই তারিখে কোনো সক্রিয় শিক্ষক নেই।');
    }
    const isConfiguredWeekend = (settings.attendancePolicy.weekendDays || [5]).includes(targetMoment.day()) && !specialDate;
    if (specialDate?.isHoliday || isConfiguredWeekend) {
        throw new ApiError(400, 'সাপ্তাহিক বা ঘোষিত ছুটির দিনে বাল্ক হাজিরা দেওয়া যাবে না। আগে দিনটিকে কর্মদিবস করুন।');
    }

    const activeTeacherIds = new Set(activeTeachers.map((teacher) => String(teacher._id)));
    for (const teacherId of recordByTeacherId.keys()) {
        if (!activeTeacherIds.has(teacherId)) {
            throw new ApiError(400, 'বাল্ক হাজিরায় নিষ্ক্রিয় বা তারিখে কর্মরত নন এমন শিক্ষক আছেন।');
        }
    }

    const bulkOps = [];
    let presentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    for (const teacher of activeTeachers) {
        const selected = recordByTeacherId.get(String(teacher._id));
        let status = ATTENDANCE_STATUS.LEAVE;
        let punchTime = null;
        let deductionWeight = settings.attendancePolicy.leaveDeductionWeight;
        let remarks = 'ম্যানুয়াল বাল্ক এন্ট্রি: পাঞ্চ সিলেক্ট হয়নি';

        if (selected) {
            const punchMoment = selected.punchTime
                ? moment.tz(selected.punchTime, 'Asia/Dhaka')
                : moment.tz(
                    `${date}T${selected.status === 'Late' ? '09:30' : '08:55'}:00`,
                    'Asia/Dhaka'
                );
            if (!punchMoment.isValid() || punchMoment.format('YYYY-MM-DD') !== date) {
                throw new ApiError(400, 'বাল্ক হাজিরার প্রবেশ সময় নির্বাচিত তারিখের সঙ্গে মিলছে না।');
            }
            const evaluation = await evaluatePunchStatus(
                punchMoment,
                false,
                null,
                { specialConfig: specialDate, settings }
            );
            status = evaluation.status;
            punchTime = punchMoment.toDate();
            deductionWeight = evaluation.deductionWeight;
            remarks = `ম্যানুয়াল বাল্ক এন্ট্রি: ${evaluation.remarks}`;
        }

        if (status === ATTENDANCE_STATUS.PRESENT || status === ATTENDANCE_STATUS.HOLIDAY_DUTY) {
            presentCount += 1;
        } else if (status === ATTENDANCE_STATUS.LATE) {
            lateCount += 1;
        } else {
            leaveCount += 1;
        }

        bulkOps.push({
            updateOne: {
                filter: { teacherId: teacher._id, date },
                update: {
                    $set: {
                        teacherId: teacher._id,
                        biometricDeviceId: teacher.biometricDeviceId,
                        date,
                        punchTime,
                        status,
                        appliedInTime: specialDate?.customInTime || settings.attendancePolicy.defaultInTime,
                        deductionWeight,
                        quotaDeduction: deductionWeight,
                        salaryDeduction: 0,
                        directSalaryPenaltyDays: 0,
                        isIgnored: false,
                        isAutoMarked: false,
                        isManuallyEdited: true,
                        source: 'Admin_Bulk_Manual',
                        modifiedBy: req.user._id,
                        remarks: selected?.remarks || remarks
                    }
                },
                upsert: true
            }
        });
    }

    await Attendance.bulkWrite(bulkOps);
    await AttendanceDay.findOneAndUpdate(
        { date },
        {
            $set: {
                date,
                dayType: 'WORKDAY',
                reason: 'অ্যাডমিন ম্যানুয়াল বাল্ক হাজিরা এন্ট্রি',
                isAutoResolved: false,
                updatedBy: req.user._id
            }
        },
        { upsert: true, new: true }
    );

    return res.status(200).json(new ApiResponse(200, 'বাল্ক হাজিরা সেভ হয়েছে', {
        date,
        present: presentCount,
        late: lateCount,
        leave: leaveCount
    }));
});

// ৮. শিক্ষকের মাসিক সামারি (কোটা বনাম সরাসরি Absent পেনাল্টি আলাদা হিসাবসহ)
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
    deleteSpecialDate,
    getDailyAttendance,
    recordPunch,
    zkTecoHandshake,
    zkTecoReceiveLogs,
    uploadUsbAttendanceLogs,
    excuseTeacherLateOrDuty,
    adminOverrideAttendance,
    getBulkAttendanceForDate,
    saveBulkAttendanceForDate,
    getTeacherMonthlySummary,
    triggerEndOfDayAuditManually
};
