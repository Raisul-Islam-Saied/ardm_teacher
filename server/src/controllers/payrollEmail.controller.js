const Salary = require('../models/Salary');
const Attendance = require('../models/Attendance');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ATTENDANCE_STATUS } = require('../constants/system.constants');
const { buildPayrollEmail, sendPayrollEmails } = require('../services/payrollEmail.service');

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const getPayrollEmailMessages = async ({ month, year, teacherIds }) => {
    if (!Array.isArray(teacherIds) || teacherIds.length === 0 || teacherIds.length > 500) {
        throw new ApiError(400, 'এক থেকে ৫০০ জন শিক্ষকের বেতন শিট নির্বাচন করুন।');
    }
    const uniqueTeacherIds = [...new Set(teacherIds.map(String))];
    if (uniqueTeacherIds.length !== teacherIds.length) {
        throw new ApiError(400, 'একই শিক্ষককে একাধিকবার ইমেইল তালিকায় রাখা হয়েছে।');
    }

    const selectedMonth = Number(month);
    const selectedYear = Number(year);
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(new Date(selectedYear, selectedMonth, 0).getDate()).padStart(2, '0')}`;
    const salaries = await Salary.find({
        month: selectedMonth,
        year: selectedYear,
        teacherId: { $in: uniqueTeacherIds }
    })
        .populate('teacherId', 'fullNameBng fullNameEng teacherCode email designationBng')
        .lean();
    if (salaries.length !== uniqueTeacherIds.length) {
        throw new ApiError(404, 'নির্বাচিত শিক্ষকের এক বা একাধিক সংরক্ষিত বেতন শিট পাওয়া যায়নি।');
    }

    const attendanceStatuses = [
        ATTENDANCE_STATUS.ABSENT,
        ATTENDANCE_STATUS.LEAVE,
        ATTENDANCE_STATUS.LATE,
        ATTENDANCE_STATUS.EXCUSED_LATE,
        ATTENDANCE_STATUS.APPROVED_SICK_LEAVE,
        ATTENDANCE_STATUS.APPROVED_CASUAL_LEAVE
    ];
    const attendance = await Attendance.find({
        teacherId: { $in: uniqueTeacherIds },
        date: { $gte: startDate, $lte: endDate },
        status: { $in: attendanceStatuses },
        isIgnored: { $ne: true }
    })
        .select('teacherId date status punchTime')
        .sort({ date: 1 })
        .lean();
    const attendanceByTeacher = new Map(uniqueTeacherIds.map((teacherId) => [teacherId, []]));
    for (const record of attendance) {
        attendanceByTeacher.get(String(record.teacherId))?.push(record);
    }

    return salaries.map((salary) => {
        const teacher = salary.teacherId || {};
        const teacherId = String(teacher._id || salary.teacherId);
        const email = String(teacher.email || '').trim().toLowerCase();
        const rendered = buildPayrollEmail({
            teacher,
            salary,
            month: selectedMonth,
            year: selectedYear,
            records: attendanceByTeacher.get(teacherId) || []
        });
        return {
            teacherId,
            teacherName: rendered.teacherName,
            email: isValidEmail(email) ? email : '',
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            netPayable: rendered.netPayable
        };
    });
};

const previewMonthlyPayrollEmail = asyncHandler(async (req, res) => {
    const recipients = await getPayrollEmailMessages(req.body);
    const messages = recipients.filter((recipient) => recipient.email);
    const missingEmailRecipients = recipients
        .filter((recipient) => !recipient.email)
        .map(({ teacherId, teacherName }) => ({ teacherId, teacherName }));
    return res.status(200).json(new ApiResponse(200, 'বেতন শিটের ইমেইল প্রিভিউ প্রস্তুত।', {
        selectedCount: recipients.length,
        sendableCount: messages.length,
        missingEmailCount: missingEmailRecipients.length,
        missingEmailRecipients,
        totalNetPayable: recipients.reduce((sum, recipient) => sum + recipient.netPayable, 0),
        messages
    }));
});

const sendMonthlyPayrollEmail = asyncHandler(async (req, res) => {
    const recipients = await getPayrollEmailMessages(req.body);
    const messages = recipients.filter((recipient) => recipient.email);
    if (messages.length === 0) {
        throw new ApiError(400, 'নির্বাচিত শিক্ষকদের কোনো বৈধ ইমেইল ঠিকানা পাওয়া যায়নি।');
    }

    const results = await sendPayrollEmails(messages);
    const accepted = results.filter((result) => result.accepted);
    const failed = results
        .filter((result) => !result.accepted)
        .map(({ teacherId, teacherName, reason }) => ({ teacherId, teacherName, reason }));
    const skippedNoEmailCount = recipients.length - messages.length;
    const message = failed.length
        ? `${accepted.length}টি ইমেইল SMTP সার্ভার গ্রহণ করেছে; ${failed.length}টি গ্রহণ করেনি।`
        : `${accepted.length}টি ইমেইল SMTP সার্ভার গ্রহণ করেছে।`;

    return res.status(200).json(new ApiResponse(200, message, {
        acceptedCount: accepted.length,
        failedCount: failed.length,
        failedRecipients: failed,
        skippedNoEmailCount
    }));
});

module.exports = {
    previewMonthlyPayrollEmail,
    sendMonthlyPayrollEmail
};
