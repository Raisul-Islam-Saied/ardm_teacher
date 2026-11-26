const Salary = require('../models/Salary');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const {
    normalizeBangladeshPhone,
    sendSinglePayrollSms,
    sendBulkPayrollSms,
    getSmsGatewayBalance
} = require('../services/payrollSms.service');

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const getSmsRecipients = async ({ month, year, teacherIds }) => {
    if (!Array.isArray(teacherIds) || teacherIds.length === 0 || teacherIds.length > 500) {
        throw new ApiError(400, 'এক থেকে ৫০০ জন শিক্ষকের বেতন শিট নির্বাচন করুন।');
    }
    const uniqueTeacherIds = [...new Set(teacherIds.map(String))];
    if (uniqueTeacherIds.length !== teacherIds.length) {
        throw new ApiError(400, 'একই শিক্ষককে একাধিকবার SMS তালিকায় রাখা হয়েছে।');
    }

    const salaries = await Salary.find({
        month: Number(month),
        year: Number(year),
        teacherId: { $in: uniqueTeacherIds }
    })
        .populate('teacherId', 'fullNameBng fullNameEng teacherCode phone')
        .lean();
    if (salaries.length !== uniqueTeacherIds.length) {
        throw new ApiError(404, 'নির্বাচিত শিক্ষকের এক বা একাধিক সংরক্ষিত বেতন শিট পাওয়া যায়নি।');
    }

    return salaries.map((salary) => {
        const teacher = salary.teacherId || {};
        const phone = normalizeBangladeshPhone(teacher.phone);
        const deductibleDays = Number(
            salary.manualDeductibleDays ?? salary.attendanceBreakdown?.totalDeductibleDays
        ) || 0;
        const messageParts = [
            `Dear ${teacher.fullNameEng || teacher.fullNameBng || 'Teacher'}, your salary sheet for ${MONTH_NAMES[Number(month) - 1]} ${year} has been finalized.`,
            `Basic Salary: ${Number(salary.basicSalarySnapshot) || 0} BDT`
        ];

        const adjustment = Number(salary.customAdjustment?.amount) || 0;
        const deduction = Number(salary.leaveAndAbsentDeductionAmount) || 0;
        const loanDeduction = Number(salary.loanDeduction?.installmentAmount) || 0;
        const extraAllowance = Number(salary.extraAllowance) || 0;
        const extraDeduction = Number(salary.extraDeduction) || 0;
        const bonus = salary.includeBonus ? Number(salary.bonusAmount) || 0 : 0;
        if (deductibleDays > 0 && deduction > 0) {
            messageParts.push(`Absent Deduction (${deductibleDays} days): -${deduction} BDT`);
        }
        if (loanDeduction > 0) messageParts.push(`Loan Deduction: -${loanDeduction} BDT`);
        if (extraDeduction > 0) messageParts.push(`Other Deduction: -${extraDeduction} BDT`);
        if (extraAllowance > 0) messageParts.push(`Additional Allowance: +${extraAllowance} BDT`);
        if (adjustment > 0) messageParts.push(`Adjustment: +${adjustment} BDT`);
        else if (adjustment < 0) messageParts.push(`Adjustment: ${adjustment} BDT`);
        if (bonus > 0) messageParts.push(`Bonus: +${bonus} BDT`);
        messageParts.push(`Net Payable: ${Number(salary.netPayableSalary) || 0} BDT`);
        messageParts.push('- Abdur Razzaq Dakhil Madrasah');

        return {
            teacherId: String(teacher._id || salary.teacherId),
            teacherName: teacher.fullNameBng || teacher.fullNameEng || 'শিক্ষক',
            teacherCode: teacher.teacherCode || '',
            phone,
            netPayable: Number(salary.netPayableSalary) || 0,
            message: messageParts.join('\n')
        };
    });
};

const previewMonthlyPayrollSms = asyncHandler(async (req, res) => {
    const recipients = await getSmsRecipients(req.body);
    const messages = recipients.filter((recipient) => recipient.phone);
    const totalNetPayable = recipients.reduce((sum, recipient) => sum + recipient.netPayable, 0);

    return res.status(200).json(new ApiResponse(200, 'বেতন শিটের SMS প্রিভিউ প্রস্তুত।', {
        selectedCount: recipients.length,
        sendableCount: messages.length,
        missingPhoneCount: recipients.length - messages.length,
        totalNetPayable,
        messages
    }));
});

const sendMonthlyPayrollSms = asyncHandler(async (req, res) => {
    const recipients = await getSmsRecipients(req.body);
    const messages = recipients.filter((recipient) => recipient.phone);
    if (messages.length === 0) {
        throw new ApiError(400, 'নির্বাচিত শিক্ষকদের কোনো বৈধ মোবাইল নম্বর পাওয়া যায়নি।');
    }

    if (messages.length === 1) {
        await sendSinglePayrollSms(messages[0]);
    } else {
        await sendBulkPayrollSms(messages);
    }

    return res.status(200).json(new ApiResponse(200, 'SMS gateway বার্তাগুলো গ্রহণ করেছে।', {
        sentCount: messages.length,
        skippedNoPhoneCount: recipients.length - messages.length
    }));
});

const getMonthlyPayrollSmsBalance = asyncHandler(async (req, res) => {
    const balance = await getSmsGatewayBalance();
    return res.status(200).json(new ApiResponse(200, 'SMS gateway balance', { balance }));
});

module.exports = {
    previewMonthlyPayrollSms,
    sendMonthlyPayrollSms,
    getMonthlyPayrollSmsBalance
};
