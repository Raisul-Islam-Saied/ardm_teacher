const assert = require('node:assert/strict');
const {
    buildPayrollEmail,
    getSafeSmtpFailureMessage
} = require('./src/services/payrollEmail.service');

const email = buildPayrollEmail({
    teacher: {
        fullNameBng: 'শিক্ষক <script>alert("x")</script>',
        fullNameEng: 'Teacher',
        designationBng: 'সহকারী শিক্ষক'
    },
    salary: {
        basicSalarySnapshot: 30000,
        proRataInfo: { effectiveBasicSalary: 30000 },
        attendanceBreakdown: {
            totalUnexcusedAbsentCount: 1,
            totalLeaveCount: 1,
            totalApprovedLeaveCount: 0,
            totalLateCount: 1,
            allowedPaidQuota: 4,
            totalQuotaUsed: 2,
            remainingPaidQuota: 2
        },
        leaveAndAbsentDeductionAmount: 1000,
        loanDeduction: { installmentAmount: 500 },
        extraDeduction: 100,
        extraAllowance: 200,
        customAdjustment: { amount: 0 },
        includeBonus: false,
        netPayableSalary: 28600
    },
    month: 11,
    year: 2026,
    records: [
        { date: '2026-11-04', status: 'Absent' },
        { date: '2026-11-10', status: 'Leave' },
        { date: '2026-11-12', status: 'Late', punchTime: new Date('2026-11-12T03:30:00.000Z') }
    ]
});

assert.equal(email.subject, 'নভেম্বর 2026 মাসের বেতন বিবরণী');
assert.equal(email.netPayable, 28600);
assert.match(email.html, /12\/11\/2026/);
assert.match(email.html, /০৯:৩০ AM/);
assert.match(email.html, /নভেম্বর 2026/);
assert.match(email.html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
assert.doesNotMatch(email.html, /<script>/i);
assert.match(email.html, /ব্যবহৃত কোটা/);
assert.match(email.html, /৳ ২৮,৬০০/);
assert.match(getSafeSmtpFailureMessage({ code: 'EAUTH', responseCode: 535 }), /SMTP_USER/);
assert.match(getSafeSmtpFailureMessage({ code: 'ENOTFOUND' }), /SMTP_HOST/);

console.log('Payroll email rendering passed: personalized data, attendance, quota, salary, and HTML escaping.');
