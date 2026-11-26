const nodemailer = require('nodemailer');
const ApiError = require('../utils/ApiError');

const MONTH_NAMES_BN = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const numberValue = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value) => numberValue(value).toLocaleString('bn-BD', {
    maximumFractionDigits: 2
});

const formatDate = (value) => {
    const [year, month, day] = String(value || '').split('-');
    return year && month && day ? `${day}/${month}/${year}` : '—';
};

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('bn-BD', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Dhaka'
    });
};

const renderAttendanceRows = (records, color, includeTime = false) => {
    if (!records.length) {
        return '<div style="color:#64748b;">এই মাসে কোনো তথ্য নেই</div>';
    }

    return records.map((record, index) => {
        const time = includeTime ? formatTime(record.punchTime) : '';
        return `<div style="font-weight:600;color:${color};">${index + 1}. ${escapeHtml(formatDate(record.date))}${time ? ` <span style="font-size:12px;font-weight:500;color:#64748b;">(${escapeHtml(time)})</span>` : ''}</div>`;
    }).join('');
};

const renderAttendanceSection = ({ label, total, records, background, badge, color, includeTime }) => `
    <tr>
      <td valign="top" style="width:42%;padding:14px 16px;background-color:${background};border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <span style="display:inline-block;background-color:${badge};color:${color};font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;">${escapeHtml(label)}</span>
        <p style="margin:6px 0 0;font-size:12px;color:${color};">মোট ${formatNumber(total)} দিন</p>
      </td>
      <td valign="top" style="width:58%;padding:14px 16px;background-color:#fff;border-bottom:1px solid #e2e8f0;color:#1e293b;line-height:1.8;">
        ${renderAttendanceRows(records, color, includeTime)}
      </td>
    </tr>`;

const renderLedgerRows = (salary) => {
    const attendanceDeduction = numberValue(salary.leaveAndAbsentDeductionAmount);
    const loanDeduction = numberValue(salary.loanDeduction?.installmentAmount);
    const extraDeduction = numberValue(salary.extraDeduction);
    const adjustment = numberValue(salary.customAdjustment?.amount);
    const bonus = salary.includeBonus ? numberValue(salary.bonusAmount) : 0;
    const allowance = numberValue(salary.extraAllowance);
    const effectiveBasic = numberValue(
        salary.proRataInfo?.effectiveBasicSalary ?? salary.basicSalarySnapshot
    );
    const items = [
        { label: 'কার্যকর মূল বেতন', amount: effectiveBasic, kind: 'base' },
        { label: 'অনুপস্থিতি ও ছুটি বাবদ কর্তন', amount: -attendanceDeduction, kind: 'deduction' },
        { label: 'ঋণ / অগ্রিম বেতন কর্তন', amount: -loanDeduction, kind: 'deduction' },
        { label: 'অন্যান্য কর্তন', amount: -extraDeduction, kind: 'deduction' }
    ];

    if (allowance > 0) items.push({ label: 'অতিরিক্ত ভাতা', amount: allowance, kind: 'addition' });
    if (adjustment !== 0) {
        items.push({
            label: escapeHtml(salary.customAdjustment?.reason || 'বিশেষ সমন্বয়'),
            amount: adjustment,
            kind: adjustment > 0 ? 'addition' : 'deduction'
        });
    }
    if (bonus > 0) items.push({ label: escapeHtml(salary.bonusTitle || 'বোনাস'), amount: bonus, kind: 'addition' });

    const rows = items.map((item, index) => {
        const isDeduction = item.kind === 'deduction';
        const amountColor = isDeduction ? '#dc2626' : '#0f172a';
        const background = isDeduction ? '#fef2f2' : (index % 2 ? '#f8fafc' : '#fff');
        const sign = isDeduction ? '− ' : (item.kind === 'addition' ? '+ ' : '');
        return `<tr style="background-color:${background};"><td style="padding:13px 16px;border-bottom:1px solid #e2e8f0;color:#334155;">${item.label}</td><td align="right" style="padding:13px 16px;border-bottom:1px solid #e2e8f0;font-weight:600;color:${amountColor};">${sign}৳ ${formatNumber(Math.abs(item.amount))}</td></tr>`;
    }).join('');

    const totalDeductions = attendanceDeduction + loanDeduction + extraDeduction + Math.max(0, -adjustment);
    return {
        rows,
        totalDeductions,
        netPayable: numberValue(salary.netPayableSalary)
    };
};

const buildPayrollEmail = ({ teacher, salary, month, year, records = [] }) => {
    const monthName = MONTH_NAMES_BN[Number(month) - 1];
    if (!monthName) throw new ApiError(400, 'বেতনের মাস সঠিক নয়।');
    const attendance = salary.attendanceBreakdown || {};
    const absentRecords = records.filter((record) => record.status === 'Absent');
    const leaveRecords = records.filter((record) => (
        ['Leave', 'Approved Sick Leave', 'Approved Casual Leave'].includes(record.status)
    ));
    const lateRecords = records.filter((record) => record.status === 'Late');
    const attendanceSections = [
        renderAttendanceSection({
            label: 'অনুপস্থিত (Absent)',
            total: attendance.totalUnexcusedAbsentCount,
            records: absentRecords,
            background: '#fef2f2',
            badge: '#fee2e2',
            color: '#b91c1c'
        }),
        renderAttendanceSection({
            label: 'অনুমোদিত / সাধারণ ছুটি',
            total: numberValue(attendance.totalLeaveCount) + numberValue(attendance.totalApprovedLeaveCount),
            records: leaveRecords,
            background: '#eff6ff',
            badge: '#dbeafe',
            color: '#1d4ed8'
        }),
        renderAttendanceSection({
            label: 'বিলম্বে উপস্থিতি (Late)',
            total: attendance.totalLateCount,
            records: lateRecords,
            background: '#fffbeb',
            badge: '#fef3c7',
            color: '#b45309',
            includeTime: true
        })
    ].join('');
    const quota = [
        { label: 'মোট কোটা', english: 'Total Quota', value: attendance.allowedPaidQuota, background: '#f8fafc', color: '#0f172a' },
        { label: 'ব্যবহৃত কোটা', english: 'Quota Used', value: attendance.totalQuotaUsed, background: '#fffbeb', color: '#d97706' },
        { label: 'অবশিষ্ট কোটা', english: 'Remaining Quota', value: attendance.remainingPaidQuota, background: '#f0fdf4', color: '#16a34a' }
    ].map((item) => `
      <td width="32%" style="background-color:${item.background};border:1px solid #e2e8f0;border-radius:8px;padding:14px 10px;text-align:center;">
        <p style="margin:0;font-size:12px;font-weight:600;color:#64748b;">${item.label}</p>
        <p style="margin:2px 0 8px;font-size:10px;color:#94a3b8;">${item.english}</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:${item.color};">${formatNumber(item.value)}</p>
      </td>`).join('<td width="2%">&nbsp;</td>');
    const ledger = renderLedgerRows(salary);
    const teacherName = teacher.fullNameBng || teacher.fullNameEng || 'শিক্ষক';
    const designation = teacher.designationBng || '';
    const subject = `${monthName} ${year} মাসের বেতন বিবরণী`;
    const html = `<!doctype html>
<html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#eef2f6;font-family:'Noto Sans Bengali','Hind Siliguri','Segoe UI',Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef2f6;padding:24px 10px;">
    <tr><td align="center">
      <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;width:100%;background-color:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="height:5px;background-color:#059669;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="background-color:#0f172a;padding:28px 30px;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:1px;color:#34d399;font-weight:600;">অফিসিয়াল পে-স্লিপ ও বেতন বিবরণী</p>
          <h1 style="margin:0;font-size:23px;color:#fff;">আবদুর রাজ্জাক দাখিল মাদ্রাসা</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#cbd5e1;">হিসাব ও অর্থ শাখা &nbsp;•&nbsp; বেতন মাস: <strong style="color:#fff;">${escapeHtml(monthName)} ${Number(year)}</strong></p>
        </td></tr>
        <tr><td style="padding:28px 30px 18px;">
          <p style="margin:0 0 8px;font-size:17px;font-weight:700;color:#0f172a;">প্রিয় ${escapeHtml(teacherName)},</p>
          ${designation ? `<p style="margin:0 0 8px;font-size:13px;color:#64748b;">${escapeHtml(designation)}</p>` : ''}
          <p style="margin:0;font-size:14px;line-height:1.75;color:#475569;">আসসালামু আলাইকুম। আপনার <strong>${escapeHtml(monthName)} ${Number(year)}</strong> মাসের বেতন বিবরণী প্রস্তুত করা হয়েছে। নিচে উপস্থিতি, ছুটির কোটা এবং বেতন-কর্তনের হিসাব দেওয়া হলো।</p>
        </td></tr>
        <tr><td style="padding:0 30px 22px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;">
            <tr><td style="padding:17px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
                <td><p style="margin:0;font-size:12px;font-weight:600;color:#047857;">নীট প্রদেয় বেতন (Net Payable)</p><p style="margin:4px 0 0;font-size:12px;color:#065f46;">সকল কর্তন ও সংযোজনের পর</p></td>
                <td align="right"><p style="margin:0;font-size:24px;font-weight:800;color:#065f46;">৳ ${formatNumber(ledger.netPayable)}</p></td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 30px 22px;">
          <h2 style="margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;font-size:15px;color:#0f172a;">১. উপস্থিতি ও ছুটির বিস্তারিত</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-collapse:separate;border-spacing:0;font-size:14px;">${attendanceSections}</table>
        </td></tr>
        <tr><td style="padding:0 30px 24px;">
          <h2 style="margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;font-size:15px;color:#0f172a;">২. ছুটির কোটা সারসংক্ষেপ</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>${quota}</tr></table>
        </td></tr>
        <tr><td style="padding:0 30px 26px;">
          <h2 style="margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;font-size:15px;color:#0f172a;">৩. বেতন ও কর্তনের হিসাব</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-collapse:collapse;font-size:14px;">
            ${ledger.rows}
            <tr style="background-color:#f8fafc;"><td style="padding:13px 16px;border-bottom:1px solid #cbd5e1;font-weight:600;color:#334155;">মোট কর্তন</td><td align="right" style="padding:13px 16px;border-bottom:1px solid #cbd5e1;font-weight:700;color:#dc2626;">− ৳ ${formatNumber(ledger.totalDeductions)}</td></tr>
            <tr style="background-color:#0f172a;"><td style="padding:15px 16px;font-size:15px;font-weight:700;color:#fff;">নীট প্রদেয় বেতন</td><td align="right" style="padding:15px 16px;font-size:17px;font-weight:800;color:#34d399;">৳ ${formatNumber(ledger.netPayable)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 30px 26px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-left:4px solid #0f172a;">
            <tr><td style="padding:15px 18px;"><p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f172a;">বেতন সংগ্রহের নির্দেশনা</p><p style="margin:0;font-size:13px;line-height:1.65;color:#475569;">বেতন বা উপস্থিতির হিসাব সংক্রান্ত কোনো প্রশ্ন থাকলে অনুগ্রহ করে অফিস কর্তৃপক্ষের সঙ্গে যোগাযোগ করুন।</p></td></tr>
          </table>
        </td></tr>
        <tr><td style="background-color:#f1f5f9;padding:22px 30px;border-top:1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td style="font-size:13px;color:#475569;line-height:1.6;"><strong style="color:#0f172a;">বিনীত,</strong><br>অফিস প্রশাসন ও হিসাব শাখা<br>আবদুর রাজ্জাক দাখিল মাদ্রাসা</td>
            <td align="right" valign="bottom" style="font-size:11px;color:#94a3b8;">স্বয়ংক্রিয় ইমেইল বিবরণী<br>© ${Number(year)} সর্বস্বত্ব সংরক্ষিত</td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    return {
        subject,
        html,
        text: `${subject}\nপ্রিয় ${teacherName}, আপনার নীট প্রদেয় বেতন ৳ ${formatNumber(ledger.netPayable)}। বিস্তারিত বিবরণী HTML ইমেইলে দেখুন।`,
        teacherName,
        netPayable: ledger.netPayable
    };
};

const createPayrollEmailTransport = () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const fromEmail = process.env.SMTP_FROM_EMAIL || user;
    if (!host || !user || !pass || !fromEmail || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new ApiError(503, 'ইমেইল SMTP কনফিগারেশন সার্ভারে সম্পূর্ণভাবে সেট করা নেই।');
    }
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
    const fromName = process.env.SMTP_FROM_NAME || 'আবদুর রাজ্জাক দাখিল মাদ্রাসা';
    return {
        transporter: nodemailer.createTransport({
            host,
            port,
            secure,
            requireTLS: !secure,
            auth: { user, pass },
            connectionTimeout: 15000,
            greetingTimeout: 10000,
            socketTimeout: 30000
        }),
        from: `"${fromName.replace(/["\\]/g, '')}" <${fromEmail}>`
    };
};

const getSafeSmtpFailureMessage = (error) => {
    const code = String(error?.code || '').toUpperCase();
    const responseCode = Number(error?.responseCode) || 0;
    if (code === 'EAUTH' || [534, 535].includes(responseCode)) {
        return 'SMTP login ব্যর্থ। SMTP_USER-এ পুরো ইমেইল ঠিকানা এবং SMTP_PASSWORD-এ সঠিক App Password/SMTP password দিন; provider-এ SMTP অনুমতি চালু আছে কি না যাচাই করুন।';
    }
    if (code === 'ENOTFOUND') {
        return 'SMTP host পাওয়া যায়নি। SMTP_HOST-এর বানান ও provider-এর দেওয়া server address যাচাই করুন।';
    }
    if (code === 'ETLS' || /TLS/i.test(String(error?.message || ''))) {
        return 'SMTP নিরাপদ সংযোগ (TLS) ব্যর্থ। SMTP_PORT ও SMTP_SECURE provider-এর নির্দেশনা অনুযায়ী মিলিয়ে নিন।';
    }
    if (['ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET'].includes(code)) {
        return 'SMTP সার্ভারে সংযোগ করা যায়নি। SMTP_HOST, SMTP_PORT, SMTP_SECURE এবং সার্ভারের outbound connection যাচাই করুন।';
    }
    if (code === 'EENVELOPE' || [550, 553].includes(responseCode)) {
        return 'SMTP সার্ভার প্রেরক বা প্রাপকের ঠিকানা গ্রহণ করেনি। SMTP_FROM_EMAIL এবং শিক্ষকের profile email যাচাই করুন।';
    }
    return 'SMTP সার্ভার ইমেইল গ্রহণ করেনি। সার্ভার লগে থাকা নিরাপদ SMTP error code দেখে configuration যাচাই করুন।';
};

const logSmtpFailure = (event, error, teacherId = null) => {
    console.error(event, {
        ...(teacherId ? { teacherId } : {}),
        code: String(error?.code || 'UNKNOWN').slice(0, 40),
        responseCode: Number(error?.responseCode) || null,
        command: typeof error?.command === 'string' ? error.command.slice(0, 40) : null
    });
};

const sendPayrollEmails = async (messages) => {
    const { transporter, from } = createPayrollEmailTransport();
    try {
        await transporter.verify();
    } catch (error) {
        transporter.close();
        logSmtpFailure('[PAYROLL_EMAIL_SMTP_VERIFY_FAILED]', error);
        throw new ApiError(502, getSafeSmtpFailureMessage(error));
    }

    const results = new Array(messages.length);
    let nextIndex = 0;
    const sendWorker = async () => {
        while (nextIndex < messages.length) {
            const index = nextIndex++;
            const message = messages[index];
            try {
                await transporter.sendMail({
                    from,
                    to: message.email,
                    subject: message.subject,
                    html: message.html,
                    text: message.text
                });
                results[index] = {
                    teacherId: message.teacherId,
                    teacherName: message.teacherName,
                    accepted: true
                };
            } catch (error) {
                logSmtpFailure('[PAYROLL_EMAIL_DELIVERY_FAILED]', error, message.teacherId);
                results[index] = {
                    teacherId: message.teacherId,
                    teacherName: message.teacherName,
                    accepted: false,
                    reason: getSafeSmtpFailureMessage(error)
                };
            }
        }
    };

    try {
        await Promise.all(Array.from({ length: Math.min(3, messages.length) }, sendWorker));
        return results;
    } finally {
        transporter.close();
    }
};

module.exports = {
    buildPayrollEmail,
    sendPayrollEmails,
    getSafeSmtpFailureMessage
};
