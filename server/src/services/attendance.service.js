const moment = require('moment-timezone');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const AttendanceDay = require('../models/AttendanceDay');
const SpecialDate = require('../models/SpecialDate');
const SystemSettings = require('../models/SystemSettings');
const { ATTENDANCE_STATUS } = require('../constants/system.constants');
const ApiError = require('../utils/ApiError');

const timeStringToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + minutes;
};

const isProtectedManualAttendance = (record) => Boolean(
    record?.isManuallyEdited
    && [
        ATTENDANCE_STATUS.ABSENT,
        ATTENDANCE_STATUS.OFFICIAL_DUTY
    ].includes(record.status)
);

// ১. ডায়নামিক সেটিংস ও স্পেশাল ডেট অনুযায়ী পাঞ্চ মূল্যায়ন
const evaluatePunchStatus = async (
    punchMoment,
    isLateExcused = false,
    excuseNote = null,
    attendanceContext = null
) => {
    const dateStr = punchMoment.format('YYYY-MM-DD');
    const dayOfWeek = punchMoment.day();

    const [specialConfig, settings] = attendanceContext
        ? [attendanceContext.specialConfig, attendanceContext.settings]
        : await Promise.all([
            SpecialDate.findOne({ date: dateStr }).lean(),
            SystemSettings.getSettings()
        ]);

    const policy = settings.attendancePolicy;

    if (specialConfig && specialConfig.isHoliday) {
        return {
            status: ATTENDANCE_STATUS.HOLIDAY_DUTY,
            deductionWeight: 0,
            directSalaryPenaltyDays: 0,
            appliedInTime: specialConfig.customInTime || policy.defaultInTime,
            remarks: `ছুটির দিনে উপস্থিত (${specialConfig.title})`
        };
    }

    if (policy.weekendDays.includes(dayOfWeek) && !specialConfig) {
        return {
            status: ATTENDANCE_STATUS.HOLIDAY_DUTY,
            deductionWeight: 0,
            directSalaryPenaltyDays: 0,
            appliedInTime: policy.defaultInTime,
            remarks: 'সাপ্তাহিক ছুটির দিনে উপস্থিত'
        };
    }

    const targetInTime = specialConfig ? specialConfig.customInTime : policy.defaultInTime;
    const targetLateLimit = specialConfig ? specialConfig.customLateLimit : policy.defaultLateLimit;

    const punchMinutes = (punchMoment.hours() * 60) + punchMoment.minutes();
    const inTimeMinutes = timeStringToMinutes(targetInTime);
    const lateLimitMinutes = timeStringToMinutes(targetLateLimit);

    if (punchMinutes <= inTimeMinutes) {
        return {
            status: ATTENDANCE_STATUS.PRESENT,
            deductionWeight: 0,
            directSalaryPenaltyDays: 0,
            appliedInTime: targetInTime,
            remarks: 'সময়মতো উপস্থিত'
        };
    }

    if (isLateExcused) {
        return {
            status: ATTENDANCE_STATUS.EXCUSED_LATE,
            deductionWeight: 0,
            directSalaryPenaltyDays: 0,
            appliedInTime: targetInTime,
            remarks: excuseNote ? `অনুমোদিত বিলম্ব: ${excuseNote}` : 'কর্তৃপক্ষের অনুমতিতে বিলম্বে উপস্থিত (লেট মওকুফ)'
        };
    }

    if (punchMinutes > inTimeMinutes && punchMinutes <= lateLimitMinutes) {
        return {
            status: ATTENDANCE_STATUS.LATE,
            deductionWeight: policy.lateDeductionWeight,
            directSalaryPenaltyDays: 0,
            appliedInTime: targetInTime,
            remarks: `বিলম্বে উপস্থিত (নির্ধারিত সময় ${targetInTime})`
        };
    }

    return {
        status: ATTENDANCE_STATUS.LEAVE,
        deductionWeight: policy.leaveDeductionWeight,
        directSalaryPenaltyDays: 0,
        appliedInTime: targetInTime,
        remarks: `অতি বিলম্বে পাঞ্চ (${targetLateLimit} এর পরে আসায় ১ দিন ছুটি হিসেবে গণ্য)`
    };
};

// ২. বায়োমেট্রিক পাঞ্চ প্রসেস করা
const processBiometricPunch = async ({ biometricDeviceId, teacherId, punchTime, source = 'ZKTeco_Device' }) => {
    let teacher;
    if (teacherId) {
        teacher = await Teacher.findById(teacherId).lean();
    } else if (biometricDeviceId !== undefined) {
        teacher = await Teacher.findOne({ biometricDeviceId: Number(biometricDeviceId) }).lean();
    }

    if (!teacher) {
        throw new ApiError(404, `বায়োমেট্রিক আইডি (${biometricDeviceId || teacherId}) দিয়ে কোনো শিক্ষক খুঁজে পাওয়া যায়নি!`);
    }

    const punchMoment = punchTime ? moment.tz(punchTime, 'Asia/Dhaka') : moment.tz('Asia/Dhaka');
    if (!punchMoment.isValid()) {
        throw new ApiError(400, 'পাঞ্চ টাইম ফরম্যাট সঠিক নয়!');
    }

    const dateStr = punchMoment.format('YYYY-MM-DD');
    const existingRecord = await Attendance.findOne({ teacherId: teacher._id, date: dateStr });

    // Absent and Official Duty are protected manual exceptions.
    // Manual Present/Late may be reconciled by a real USB/device punch.
    if (isProtectedManualAttendance(existingRecord)) {
        if (source === 'USB_Pendrive_Upload' || source === 'ZKTeco_Device') {
            return {
                alreadyPunched: true,
                attendance: existingRecord,
                message: `${teacher.fullNameBng} (${dateStr})-এর রেকর্ড অ্যাডমিন এডিট; বায়োমেট্রিক পাঞ্চ দিয়ে পরিবর্তন করা হয়নি।`
            };
        }
    }

    if (existingRecord && existingRecord.punchTime) {
        const existingMoment = moment.tz(existingRecord.punchTime, 'Asia/Dhaka');
        if (punchMoment.isSameOrAfter(existingMoment)) {
            return {
                alreadyPunched: true,
                attendance: existingRecord,
                message: `${teacher.fullNameBng} (${dateStr}) ইতিমধ্যে ${existingMoment.format('hh:mm A')} মিনিটে পাঞ্চ করেছেন।`
            };
        }
    }

    const isLateExcused = existingRecord ? existingRecord.isLateExcused : false;
    const excuseNote = existingRecord ? existingRecord.excuseNote : null;

    if (
        existingRecord &&
        [
            ATTENDANCE_STATUS.OFFICIAL_DUTY,
            ATTENDANCE_STATUS.APPROVED_SICK_LEAVE,
            ATTENDANCE_STATUS.APPROVED_CASUAL_LEAVE
        ].includes(existingRecord.status)
    ) {
        existingRecord.punchTime = punchMoment.toDate();
        existingRecord.directSalaryPenaltyDays = 0;
        existingRecord.deductionWeight = 0;
        await existingRecord.save();
        return {
            alreadyPunched: false,
            attendance: existingRecord,
            message: `পাঞ্চ টাইম রেকর্ড হয়েছে (${existingRecord.status} বহাল আছে)।`
        };
    }

    const evaluation = await evaluatePunchStatus(punchMoment, isLateExcused, excuseNote);

    const attendance = await Attendance.findOneAndUpdate(
        { teacherId: teacher._id, date: dateStr },
        {
            $set: {
                teacherId: teacher._id,
                biometricDeviceId: teacher.biometricDeviceId,
                date: dateStr,
                punchTime: punchMoment.toDate(),
                appliedInTime: evaluation.appliedInTime,
                status: evaluation.status,
                deductionWeight: evaluation.deductionWeight,
                quotaDeduction: evaluation.status === ATTENDANCE_STATUS.LATE
                    || evaluation.status === ATTENDANCE_STATUS.LEAVE
                    ? evaluation.deductionWeight
                    : 0,
                salaryDeduction: 0,
                directSalaryPenaltyDays: 0,
                isLateExcused,
                excuseNote,
                isAutoMarked: false,
                isManuallyEdited: false,
                source,
                remarks: evaluation.remarks
            }
        },
        { upsert: true, new: true, runValidators: true }
    );

    return {
        alreadyPunched: false,
        attendance,
        message: `পাঞ্চ সফল! শিক্ষক: ${teacher.fullNameBng}, তারিখ: ${dateStr}, স্ট্যাটাস: ${evaluation.status}`
    };
};

// ৩. অফলাইন ও পেনড্রাইভের লগ পার্সিং
const parseAndSyncRawZKTecoLogs = async (rawTextContent, source = 'ZKTeco_Device') => {
    const lines = rawTextContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
    let processedCount = 0;
    let skippedCount = 0;
    const affectedDates = new Set();

    for (const line of lines) {
        const trimmed = line.trim();
        const whitespaceMatch = trimmed.match(/^(\d+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)/);
        const separatorMatch = trimmed.match(/^(\d+)[,\t;]\s*(\d{4}[-/.]\d{2}[-/.]\d{2})[,\t;\s]+\s*(\d{2}:\d{2}(?::\d{2})?)/);
        const match = whitespaceMatch || separatorMatch;

        if (match) {
            const pin = parseInt(match[1], 10);
            const timeStr = separatorMatch
                ? `${match[2].replace(/[/.]/g, '-')} ${match[3]}`
                : match[2];
            const datePart = timeStr.split(/\s+/)[0];

            try {
                const res = await processBiometricPunch({
                    biometricDeviceId: pin,
                    punchTime: timeStr,
                    source
                });
                if (!res.alreadyPunched) {
                    processedCount++;
                    affectedDates.add(datePart);
                } else {
                    skippedCount++;
                }
            } catch (err) {
                skippedCount++;
            }
        } else {
            skippedCount++;
        }
    }

    const todayStr = moment.tz('Asia/Dhaka').format('YYYY-MM-DD');
    for (const dateStr of affectedDates) {
        if (dateStr < todayStr) {
            await runDailyEndOfDayAudit(dateStr);
        }
    }

    return {
        totalLinesRead: lines.length,
        newlySyncedPunches: processedCount,
        skippedOrDuplicateLines: skippedCount,
        affectedDates: Array.from(affectedDates)
    };
};

const recalculatePastDateIgnoreStatus = async (dateStr) => {
    const settings = await SystemSettings.getSettings();
    const threshold = settings.attendancePolicy.autoIgnoreThresholdPercent;

    const activeTeachersCount = await Teacher.countDocuments({ isActive: true });
    if (activeTeachersCount === 0) return;

    const records = await Attendance.find({ date: dateStr });
    const punchedCount = records.filter((r) => r.punchTime !== null).length;
    const percentage = (punchedCount / activeTeachersCount) * 100;

    if (percentage >= threshold) {
        await Attendance.updateMany(
            { date: dateStr, isIgnored: true },
            { $set: { isIgnored: false, ignoreReason: null } }
        );
    }
};

// ৪. রাত ১১:৫৯ মিনিটের অটো-অডিট (ডায়নামিক সেটিংস অনুযায়ী)
const runDailyEndOfDayAudit = async (targetDateStr = null) => {
    const dateStr = targetDateStr || moment.tz('Asia/Dhaka').format('YYYY-MM-DD');
    const targetMoment = moment.tz(dateStr, 'YYYY-MM-DD', 'Asia/Dhaka');
    const dayOfWeek = targetMoment.day();

    const [specialConfig, settings] = await Promise.all([
        SpecialDate.findOne({ date: dateStr }).lean(),
        SystemSettings.getSettings()
    ]);

    const policy = settings.attendancePolicy;

    await SystemSettings.updateOne(
        { key: 'GLOBAL_SETTINGS' },
        { $set: { lastCronAuditDate: dateStr } }
    );

    if (specialConfig && specialConfig.isHoliday) {
        await AttendanceDay.findOneAndUpdate(
            { date: dateStr },
            { $set: { date: dateStr, dayType: 'HOLIDAY', reason: specialConfig.title, isAutoResolved: true } },
            { upsert: true, new: true }
        );
        return { date: dateStr, action: 'SKIPPED_HOLIDAY', message: `${dateStr} ছুটি ঘোষণা করা হয়েছে।` };
    }

    if (policy.weekendDays.includes(dayOfWeek) && !specialConfig) {
        await AttendanceDay.findOneAndUpdate(
            { date: dateStr },
            { $set: { date: dateStr, dayType: 'HOLIDAY', reason: 'সাপ্তাহিক ছুটি', isAutoResolved: true } },
            { upsert: true, new: true }
        );
        return { date: dateStr, action: 'SKIPPED_WEEKEND', message: `${dateStr} সাপ্তাহিক ছুটি হওয়ায় অটো-অডিট স্কিপ করা হলো।` };
    }

    const targetDateEnd = targetMoment.clone().endOf('day').toDate();
    const activeTeachers = await Teacher.find({
        isActive: true,
        joiningDate: { $lte: targetDateEnd },
        $or: [
            { resignationDate: null },
            { resignationDate: { $exists: false } },
            { resignationDate: { $gt: targetDateEnd } }
        ]
    }).select('_id biometricDeviceId fullNameBng').lean();

    const totalActiveCount = activeTeachers.length;
    if (totalActiveCount === 0) return { date: dateStr, action: 'NO_ACTIVE_TEACHERS', message: 'কোনো সক্রিয় শিক্ষক নেই।' };

    const todayRecords = await Attendance.find({ date: dateStr });
    const activeTeacherIds = new Set(activeTeachers.map((teacher) => String(teacher._id)));
    const punchedCount = todayRecords.filter(
        (record) => record.punchTime !== null && activeTeacherIds.has(String(record.teacherId))
    ).length;
    const attendancePercentage = totalActiveCount > 0
        ? (punchedCount / totalActiveCount) * 100
        : 0;
    const threshold = settings.attendancePolicy?.autoIgnoreThresholdPercent ?? 30;

    if (attendancePercentage < threshold) {
        await Attendance.deleteMany({
            date: dateStr,
            status: ATTENDANCE_STATUS.LEAVE,
            punchTime: null,
            source: 'Auto_Cron_Job',
            isManuallyEdited: { $ne: true }
        });
        await AttendanceDay.findOneAndUpdate(
            { date: dateStr },
            {
                $set: {
                    date: dateStr,
                    dayType: 'MACHINE_OFF',
                    reason: `পাঞ্চের হার ${attendancePercentage.toFixed(1)}% (${threshold}% এর নিচে); মেশিন বা নেট সমস্যা হতে পারে`,
                    isAutoResolved: true,
                    attendancePercentage: Number(attendancePercentage.toFixed(2)),
                    activeTeacherCount: totalActiveCount,
                    punchedTeacherCount: punchedCount
                }
            },
            { upsert: true, new: true }
        );
        return {
            date: dateStr,
            action: 'MACHINE_OFF_UNDER_THRESHOLD',
            attendancePercentage: Number(attendancePercentage.toFixed(2)),
            punchedCount,
            activeTeacherCount: totalActiveCount,
            message: `(${dateStr}) উপস্থিতির হার ${attendancePercentage.toFixed(1)}%, threshold ${threshold}% এর নিচে। কোনো Leave মার্ক করা হয়নি; দিনটি Machine Off হিসেবে ফ্ল্যাগ করা হয়েছে।`
        };
    }

    await AttendanceDay.findOneAndUpdate(
        { date: dateStr },
        {
            $set: {
                date: dateStr,
                dayType: 'WORKDAY',
                reason: 'স্বাভাবিক কর্মদিবস',
                isAutoResolved: true,
                attendancePercentage: Number(attendancePercentage.toFixed(2)),
                activeTeacherCount: totalActiveCount,
                punchedTeacherCount: punchedCount
            }
        },
        { upsert: true, new: true }
    );

    const recordedTeacherIds = new Set(todayRecords.map((r) => r.teacherId.toString()));
    const unrecordedTeachers = activeTeachers.filter((t) => !recordedTeacherIds.has(t._id.toString()));
    const appliedInTime = specialConfig ? specialConfig.customInTime : policy.defaultInTime;

    if (unrecordedTeachers.length > 0) {
        const bulkLeaveOps = unrecordedTeachers.map((teacher) => ({
            updateOne: {
                filter: { teacherId: teacher._id, date: dateStr },
                update: {
                    $setOnInsert: {
                        teacherId: teacher._id,
                        biometricDeviceId: teacher.biometricDeviceId,
                        date: dateStr,
                        punchTime: null,
                        appliedInTime,
                        status: ATTENDANCE_STATUS.LEAVE,
                        deductionWeight: policy.leaveDeductionWeight,
                        quotaDeduction: policy.leaveDeductionWeight,
                        salaryDeduction: 0,
                        directSalaryPenaltyDays: 0,
                        isIgnored: false,
                        isAutoMarked: true,
                        isManuallyEdited: false,
                        source: 'Auto_Cron_Job',
                        remarks: 'পাঞ্চ না পাওয়া গেছে; স্বয়ংক্রিয় Leave'
                    }
                },
                upsert: true
            }
        }));
        await Attendance.bulkWrite(bulkLeaveOps);
    }

    return {
        date: dateStr,
        action: 'AUDIT_COMPLETED_NORMALLY',
        punchedCount,
        activeTeacherCount: totalActiveCount,
        attendancePercentage: Number(attendancePercentage.toFixed(2)),
        autoLeaveMarked: unrecordedTeachers.length,
        unexcusedAbsentMarked: 0,
        message: `(${dateStr}) অডিট সম্পন্ন! পাঞ্চ: ${punchedCount}/${totalActiveCount} (${attendancePercentage.toFixed(1)}%), স্বয়ংক্রিয় Leave: ${unrecordedTeachers.length} জন।`
    };
};

// ৫. সার্ভার বন্ধ থাকার কারণে মিস হয়ে যাওয়া বিগত দিনগুলোর অডিট স্বয়ংক্রিয়ভাবে রিকভার করা (Self-Healing Boot Recovery)
const recoverMissedDailyAuditsOnBoot = async () => {
    try {
        const today = moment.tz('Asia/Dhaka').startOf('day');
        // বিগত ৭ দিনের মধ্যে কোনো কার্যদিবসে অডিট মিস হয়ে থাকলে তা রিকভার করবে
        for (let i = 1; i <= 7; i++) {
            const pastDateStr = today.clone().subtract(i, 'days').format('YYYY-MM-DD');
            const existingCount = await Attendance.countDocuments({ date: pastDateStr });
            if (existingCount === 0) {
                const res = await runDailyEndOfDayAudit(pastDateStr);
                if (res.action === 'AUDIT_COMPLETED_NORMALLY') {
                    console.log(`🔄 [BOOT AUTO-RECOVERY]: Completed missed attendance audit for ${pastDateStr}`);
                }
            }
        }
    } catch (err) {
        console.error('⚠️ Boot Audit Recovery Warning:', err.message);
    }
};

module.exports = {
    timeStringToMinutes,
    isProtectedManualAttendance,
    evaluatePunchStatus,
    processBiometricPunch,
    parseAndSyncRawZKTecoLogs,
    runDailyEndOfDayAudit,
    recoverMissedDailyAuditsOnBoot
};
