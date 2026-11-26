require('dotenv').config();
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const Salary = require('./src/models/Salary');
const { calculateTeacherMonthlyPayroll } = require('./src/services/payroll.service');
const { isProtectedManualAttendance } = require('./src/services/attendance.service');

async function runMonthlyPayrollReconciliation() {
    const teacherId = new mongoose.Types.ObjectId();
    const month = 2;
    const year = 2026;
    const datePrefix = `${year}-${String(month).padStart(2, '0')}`;
    const records = [];

    for (let day = 1; day <= 28; day += 1) {
        let status = 'Present';
        let deductionWeight = 0;
        let salaryDeduction = 0;
        let directSalaryPenaltyDays = 0;

        if (day <= 15 || day >= 27) {
            status = 'Present';
        } else if (day <= 17) {
            status = 'Late';
            deductionWeight = 0.5;
        } else if (day <= 22) {
            status = 'Leave';
            deductionWeight = 1;
        } else if (day <= 24) {
            status = 'Absent';
            salaryDeduction = 1;
            directSalaryPenaltyDays = 1;
        } else if (day === 25) {
            status = 'Official Duty';
        } else if (day === 26) {
            status = 'Approved Sick Leave';
        }

        records.push({
            teacherId,
            biometricDeviceId: 900000 + day,
            date: `${datePrefix}-${String(day).padStart(2, '0')}`,
            punchTime: status === 'Present' || status === 'Late'
                ? new Date(`${datePrefix}-${String(day).padStart(2, '0')}T09:30:00+06:00`)
                : null,
            status,
            deductionWeight,
            quotaDeduction: deductionWeight,
            salaryDeduction,
            directSalaryPenaltyDays,
            isIgnored: false,
            isManuallyEdited: status === 'Absent' || status === 'Official Duty',
            source: status === 'Absent' || status === 'Official Duty' ? 'Admin_Manual' : 'Auto_Cron_Job'
        });
    }

    try {
        await Attendance.insertMany(records);
        const result = await calculateTeacherMonthlyPayroll({
            teacher: {
                _id: teacherId,
                basicSalary: 30000,
                customLeaveQuota: 2,
                joiningDate: new Date('2020-01-01T00:00:00.000Z'),
                resignationDate: null
            },
            month,
            year
        });

        const payroll = result.salary;
        assert.equal(payroll.attendanceBreakdown.totalPresent, 18);
        assert.equal(payroll.attendanceBreakdown.totalExcusedLateOrDuty, 1);
        assert.equal(payroll.attendanceBreakdown.totalLateCount, 2);
        assert.equal(payroll.attendanceBreakdown.totalLeaveCount, 5);
        assert.equal(payroll.attendanceBreakdown.totalUnexcusedAbsentCount, 2);
        assert.equal(payroll.attendanceBreakdown.totalApprovedLeaveCount, 1);
        assert.equal(payroll.attendanceBreakdown.totalQuotaUsed, 6);
        assert.equal(payroll.attendanceBreakdown.carryForwardQuota, 2);
        assert.equal(payroll.attendanceBreakdown.allowedPaidQuota, 4);
        assert.equal(payroll.attendanceBreakdown.excessQuotaDays, 2);
        assert.equal(payroll.attendanceBreakdown.directAbsentPenaltyDays, 2);
        assert.equal(payroll.attendanceBreakdown.totalDeductibleDays, 4);
        const expectedDeduction = Math.round(4 * payroll.perDaySalary);
        assert.equal(payroll.leaveAndAbsentDeductionAmount, expectedDeduction);
        assert.equal(payroll.netPayableSalary, 30000 - expectedDeduction);

        assert.equal(
            isProtectedManualAttendance({ isManuallyEdited: true, status: 'Absent' }),
            true
        );
        assert.equal(
            isProtectedManualAttendance({ isManuallyEdited: true, status: 'Official Duty' }),
            true
        );
        assert.equal(
            isProtectedManualAttendance({ isManuallyEdited: true, status: 'Present' }),
            false
        );
        assert.equal(
            isProtectedManualAttendance({ isManuallyEdited: false, status: 'Absent' }),
            false
        );

        console.log(`Monthly attendance reconciliation passed: February carry-forward quota, 4 deductible days, ৳${expectedDeduction} deduction.`);
        console.log('Smart-merge manual protection checks passed for Absent/Official Duty versus Present.');
    } finally {
        await Attendance.deleteMany({ teacherId, date: { $regex: `^${datePrefix}-` } });
        await Salary.deleteMany({ teacherId, month, year });
    }
}

async function main() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ardm_enterprise_db';
    await mongoose.connect(uri);
    try {
        await runMonthlyPayrollReconciliation();
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(async (error) => {
    console.error('Monthly attendance reconciliation failed:', error);
    await mongoose.disconnect();
    process.exitCode = 1;
});
