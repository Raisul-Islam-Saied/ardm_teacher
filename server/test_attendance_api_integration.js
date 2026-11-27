require('dotenv').config();
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const app = require('./src/app');
const Teacher = require('./src/models/Teacher');
const Attendance = require('./src/models/Attendance');
const AttendanceDay = require('./src/models/AttendanceDay');
const SpecialDate = require('./src/models/SpecialDate');
const SystemSettings = require('./src/models/SystemSettings');
const Salary = require('./src/models/Salary');
const { runDailyEndOfDayAudit } = require('./src/services/attendance.service');

async function findUnusedWeekdays(count, weekendDays) {
    const dates = [];
    let cursor = moment.tz('Asia/Dhaka').startOf('month').subtract(1, 'month').startOf('month');
    const earliestDate = moment.tz('2024-01-01', 'YYYY-MM-DD', 'Asia/Dhaka');

    while (dates.length < count && cursor.isSameOrAfter(earliestDate)) {
        if (!weekendDays.includes(cursor.day())) {
            const date = cursor.format('YYYY-MM-DD');
            const [attendance, day, holiday, salary] = await Promise.all([
                Attendance.exists({ date }),
                AttendanceDay.exists({ date }),
                SpecialDate.exists({ date }),
                Salary.exists({ month: cursor.month() + 1, year: cursor.year() })
            ]);
            if (!attendance && !day && !holiday && !salary) dates.push(date);
        }
        cursor.subtract(1, 'day');
    }

    if (dates.length < count) {
        throw new Error(`Could not find ${count} unused attendance dates in a closed payroll month.`);
    }

    return dates;
}

async function findEmptyPayrollPeriod() {
    let cursor = moment.tz('Asia/Dhaka').startOf('month').subtract(1, 'month').startOf('month');
    const earliestPeriod = moment.tz('2024-01-01', 'YYYY-MM-DD', 'Asia/Dhaka');

    while (cursor.isSameOrAfter(earliestPeriod)) {
        const month = cursor.month() + 1;
        const year = cursor.year();
        const startDate = cursor.format('YYYY-MM-DD');
        const endDate = cursor.clone().endOf('month').format('YYYY-MM-DD');
        const [attendance, salary] = await Promise.all([
            Attendance.exists({ date: { $gte: startDate, $lte: endDate } }),
            Salary.exists({ month, year })
        ]);
        if (!attendance && !salary) return { month, year };
        cursor.subtract(1, 'month');
    }

    throw new Error('Could not find a closed payroll month with no attendance for the no-attendance test.');
}

async function requestJson(baseUrl, token, path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...(options.headers || {})
        }
    });
    const body = await response.json();
    assert.equal(response.ok, true, `${options.method || 'GET'} ${path} failed: ${body.message}`);
    return body;
}

async function requestWithStatus(baseUrl, token, path, expectedStatus, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    const body = await response.json();
    assert.equal(response.status, expectedStatus, `${options.method || 'GET'} ${path}: ${body.message}`);
    return body;
}

async function main() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ardm_enterprise_db');

    const server = app.listen(0);
    const baseUrl = await new Promise((resolve) => {
        server.once('listening', () => resolve(`http://127.0.0.1:${server.address().port}`));
    });

    let testDates = [];
    const testSalaryIds = [];
    const testPayrollPeriods = [];
    let originalJoiningDates = [];
    let originalLastCronAuditDate;
    const originalIntegrationKeys = {
        results: process.env.RESULTS_APP_API_KEY,
        admitCard: process.env.ADMIT_CARD_APP_API_KEY
    };
    try {
        process.env.RESULTS_APP_API_KEY = 'test-results-api-key-32-characters-minimum';
        process.env.ADMIT_CARD_APP_API_KEY = 'test-admit-card-api-key-32-characters';
        const [admin, settings] = await Promise.all([
            Teacher.findOne({ role: { $in: ['Admin', 'SuperAdmin'] }, isActive: true }).select('_id role').lean(),
            SystemSettings.getSettings()
        ]);
        assert.ok(admin, 'An active admin account is required for API integration tests.');

        const unauthenticatedIntegrationResponse = await fetch(
            `${baseUrl}/api/v1/integrations/teachers?limit=1`
        );
        assert.equal(unauthenticatedIntegrationResponse.status, 401);
        const integrationResponse = await fetch(
            `${baseUrl}/api/v1/integrations/teachers?limit=1`,
            { headers: { Authorization: `Bearer ${process.env.RESULTS_APP_API_KEY}` } }
        );
        const integrationBody = await integrationResponse.json();
        assert.equal(integrationResponse.status, 200, integrationBody.message);
        assert.equal(integrationBody.data.teachers.length, 1);
        const integrationTeacher = integrationBody.data.teachers[0];
        assert.equal(Object.prototype.hasOwnProperty.call(integrationTeacher, 'password'), false);
        assert.equal(Object.prototype.hasOwnProperty.call(integrationTeacher, 'editToken'), false);
        assert.equal(Object.prototype.hasOwnProperty.call(integrationTeacher, 'passwordResetTokenHash'), false);
        assert.equal(Object.prototype.hasOwnProperty.call(integrationTeacher, 'passwordResetExpires'), false);
        assert.equal(Object.prototype.hasOwnProperty.call(integrationTeacher, 'bankDetails'), false);
        assert.equal(Object.prototype.hasOwnProperty.call(integrationTeacher, 'basicSalary'), false);
        const studentIntegrationResponse = await fetch(
            `${baseUrl}/api/v1/integrations/students?limit=1`,
            { headers: { Authorization: `Bearer ${process.env.ADMIT_CARD_APP_API_KEY}` } }
        );
        const studentIntegrationBody = await studentIntegrationResponse.json();
        assert.equal(studentIntegrationResponse.status, 200, studentIntegrationBody.message);
        if (studentIntegrationBody.data.students.length > 0) {
            const integrationStudent = studentIntegrationBody.data.students[0];
            assert.equal(Object.prototype.hasOwnProperty.call(integrationStudent, 'password'), false);
            assert.equal(Object.prototype.hasOwnProperty.call(integrationStudent, 'editToken'), false);
            assert.equal(Object.prototype.hasOwnProperty.call(integrationStudent, 'feeDetails'), true);
            assert.equal(Object.prototype.hasOwnProperty.call(integrationStudent, 'annualIncome'), true);
        }
        const allStudentsResponse = await fetch(
            `${baseUrl}/api/v1/integrations/students?all=true`,
            { headers: { Authorization: `Bearer ${process.env.ADMIT_CARD_APP_API_KEY}` } }
        );
        const allStudentsBody = await allStudentsResponse.json();
        assert.equal(allStudentsResponse.status, 200, allStudentsBody.message);
        assert.equal(allStudentsBody.data.all, true);
        assert.equal(allStudentsBody.data.totalCount, allStudentsBody.data.students.length);
        assert.equal(
            Object.prototype.hasOwnProperty.call(allStudentsBody.data.students[0] || {}, 'feeDetails'),
            allStudentsBody.data.students.length > 0
        );
        const invalidAllAndPaginationResponse = await fetch(
            `${baseUrl}/api/v1/integrations/students?all=true&page=1`,
            { headers: { Authorization: `Bearer ${process.env.ADMIT_CARD_APP_API_KEY}` } }
        );
        assert.equal(invalidAllAndPaginationResponse.status, 400);
        const publicRegistryTeacher = await Teacher.findById(integrationTeacher._id).select('uid').lean();
        if (publicRegistryTeacher?.uid) {
            const publicRegistryResponse = await fetch(
                `${baseUrl}/api/v1/teachers/public/registry-card/${encodeURIComponent(publicRegistryTeacher.uid)}`
            );
            const publicRegistryBody = await publicRegistryResponse.json();
            assert.equal(publicRegistryResponse.status, 200);
            assert.equal(Object.prototype.hasOwnProperty.call(publicRegistryBody.data, 'bankDetails'), false);
            assert.equal(Object.prototype.hasOwnProperty.call(publicRegistryBody.data, 'basicSalary'), false);
            assert.equal(Object.prototype.hasOwnProperty.call(publicRegistryBody.data, 'password'), false);
        }

        const toMinutes = (time) => {
            const [hours, minutes] = time.split(':').map(Number);
            return (hours * 60) + minutes;
        };
        const inTime = settings.attendancePolicy.defaultInTime || '09:00';
        const lateLimit = settings.attendancePolicy.defaultLateLimit || '10:00';
        assert.ok(
            toMinutes(lateLimit) > toMinutes(inTime),
            'Configured attendance late limit must be after in-time.'
        );

        const weekendDays = settings.attendancePolicy.weekendDays || [5];
        assert.ok(weekendDays.length > 0, 'At least one weekly holiday is required for this integration test.');
        const [bulkDate, usbDate, holidayDate, thresholdDate, machineOffDate] = await findUnusedWeekdays(
            5,
            weekendDays
        );
        const weekendDate = await findUnusedWeekdays(
            1,
            Array.from({ length: 7 }, (_, day) => day).filter((day) => !weekendDays.includes(day))
        ).then(([date]) => date);
        testDates = [bulkDate, usbDate, holidayDate, thresholdDate, machineOffDate, weekendDate];
        const testDateEnd = moment.tz(bulkDate, 'YYYY-MM-DD', 'Asia/Dhaka').endOf('day').toDate();
        const teachersJoiningAfterTestDate = await Teacher.find({
            isActive: true,
            registrationStatus: 'Approved',
            joiningDate: { $gt: testDateEnd }
        }).select('_id joiningDate').lean();
        originalJoiningDates = teachersJoiningAfterTestDate.map((teacher) => ({
            _id: teacher._id,
            joiningDate: teacher.joiningDate
        }));
        if (originalJoiningDates.length > 0) {
            const testJoiningDate = moment.tz(bulkDate, 'YYYY-MM-DD', 'Asia/Dhaka').startOf('day').toDate();
            await Promise.all(originalJoiningDates.map((teacher) => (
                Teacher.updateOne({ _id: teacher._id }, { $set: { joiningDate: testJoiningDate } })
            )));
        }
        originalLastCronAuditDate = settings.lastCronAuditDate;
        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '10m' });

        const currentPeriod = moment.tz('Asia/Dhaka');
        const unfinishedPeriod = { month: currentPeriod.month() + 1, year: currentPeriod.year() };
        const earlyGenerateResponse = await requestWithStatus(
            baseUrl,
            token,
            '/api/v1/payroll/generate',
            400,
            {
                method: 'POST',
                body: JSON.stringify(unfinishedPeriod)
            }
        );
        assert.match(earlyGenerateResponse.message, /মাস সম্পূর্ণ শেষ/);
        const earlyConfirmResponse = await requestWithStatus(
            baseUrl,
            token,
            '/api/v1/payroll/confirm',
            400,
            {
                method: 'POST',
                body: JSON.stringify({
                    ...unfinishedPeriod,
                    includeBonus: false,
                    rows: [{
                        teacherId: String(admin._id),
                        basicSalary: 0,
                        deductibleDays: 0,
                        bonusAmount: 0,
                        adjustmentAmount: 0
                    }]
                })
            }
        );
        assert.match(earlyConfirmResponse.message, /মাস সম্পূর্ণ শেষ/);

        const emptyPayrollPeriod = await findEmptyPayrollPeriod();
        const emptyPayrollResponse = await requestWithStatus(
            baseUrl,
            token,
            '/api/v1/payroll/generate',
            400,
            {
                method: 'POST',
                body: JSON.stringify(emptyPayrollPeriod)
            }
        );
        assert.match(emptyPayrollResponse.message, /কোনো হাজিরার রেকর্ড নেই/);
        assert.equal(await Salary.countDocuments(emptyPayrollPeriod), 0);

        const activeTeachers = await Teacher.find({
            isActive: true,
            registrationStatus: 'Approved',
            joiningDate: { $lte: moment.tz(bulkDate, 'YYYY-MM-DD', 'Asia/Dhaka').endOf('day').toDate() },
            $or: [
                { resignationDate: null },
                { resignationDate: { $exists: false } },
                { resignationDate: { $gt: moment.tz(bulkDate, 'YYYY-MM-DD', 'Asia/Dhaka').endOf('day').toDate() } }
            ]
        }).select('_id biometricDeviceId').sort({ teacherCode: 1 }).lean();
        assert.ok(activeTeachers.length >= 3, 'At least three active teachers are required for attendance integration tests.');

        const cronDateEnd = moment.tz(thresholdDate, 'YYYY-MM-DD', 'Asia/Dhaka').endOf('day').toDate();
        const cronTeachers = await Teacher.find({
            isActive: true,
            joiningDate: { $lte: cronDateEnd },
            $or: [
                { resignationDate: null },
                { resignationDate: { $exists: false } },
                { resignationDate: { $gt: cronDateEnd } }
            ]
        }).select('_id biometricDeviceId').lean();
        const thresholdPercent = settings.attendancePolicy.autoIgnoreThresholdPercent ?? 30;
        assert.ok(thresholdPercent > 0 && thresholdPercent <= 100, 'Attendance threshold must be between 1 and 100.');
        const punchesNeeded = Math.ceil((cronTeachers.length * thresholdPercent) / 100);
        assert.ok(cronTeachers.length > 0, 'At least one active teacher is required for cron integration tests.');
        await Attendance.create(cronTeachers.slice(0, punchesNeeded).map((teacher) => ({
            teacherId: teacher._id,
            biometricDeviceId: teacher.biometricDeviceId,
            date: thresholdDate,
            punchTime: moment.tz(`${thresholdDate} ${inTime}`, 'YYYY-MM-DD HH:mm', 'Asia/Dhaka').toDate(),
            status: 'Present',
            deductionWeight: 0,
            source: 'ZKTeco_Device'
        })));
        const thresholdAudit = await runDailyEndOfDayAudit(thresholdDate);
        assert.equal(thresholdAudit.action, 'AUDIT_COMPLETED_NORMALLY');
        assert.equal(thresholdAudit.punchedCount, punchesNeeded);
        assert.equal(thresholdAudit.autoLeaveMarked, cronTeachers.length - punchesNeeded);
        assert.equal(
            await Attendance.countDocuments({ date: thresholdDate, status: 'Leave', source: 'Auto_Cron_Job' }),
            cronTeachers.length - punchesNeeded
        );

        const machineOffAudit = await runDailyEndOfDayAudit(machineOffDate);
        assert.equal(machineOffAudit.action, 'MACHINE_OFF_UNDER_THRESHOLD');
        assert.equal(await Attendance.countDocuments({ date: machineOffDate }), 0);
        assert.equal((await AttendanceDay.findOne({ date: machineOffDate }).lean()).dayType, 'MACHINE_OFF');

        const weekendResponse = await fetch(`${baseUrl}/api/v1/attendance/bulk`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ date: weekendDate, records: [] })
        });
        const weekendBody = await weekendResponse.json();
        assert.equal(weekendResponse.status, 400, `Weekly holidays must be blocked by bulk attendance: ${weekendBody.message}`);

        const beyondLateLimit = moment.tz(`${bulkDate} ${lateLimit}`, 'YYYY-MM-DD HH:mm', 'Asia/Dhaka')
            .add(1, 'minute')
            .format('YYYY-MM-DDTHH:mm:ssZ');
        const exactLateLimit = moment.tz(`${bulkDate} ${lateLimit}`, 'YYYY-MM-DD HH:mm', 'Asia/Dhaka')
            .format('YYYY-MM-DDTHH:mm:ssZ');

        const bulkResponse = await requestJson(baseUrl, token, '/api/v1/attendance/bulk', {
            method: 'PUT',
            body: JSON.stringify({
                date: bulkDate,
                records: [
                    { teacherId: String(activeTeachers[0]._id), status: 'Late', punchTime: exactLateLimit },
                    { teacherId: String(activeTeachers[1]._id), status: 'Late', punchTime: beyondLateLimit }
                ]
            })
        });
        assert.equal(bulkResponse.data.late, 1, 'A punch exactly at the late limit should be Late.');
        assert.equal(bulkResponse.data.leave, activeTeachers.length - 1, 'After-limit punches and unchecked teachers should be Leave.');
        assert.equal(bulkResponse.data.present, 0);

        const bulkRecords = await Attendance.find({
            date: bulkDate,
            teacherId: { $in: activeTeachers.map((teacher) => teacher._id) }
        }).lean();
        const bulkByTeacher = new Map(bulkRecords.map((record) => [String(record.teacherId), record]));
        assert.equal(bulkByTeacher.get(String(activeTeachers[0]._id)).status, 'Late');
        assert.equal(
            bulkByTeacher.get(String(activeTeachers[0]._id)).quotaDeduction,
            settings.attendancePolicy.lateDeductionWeight ?? 0.5
        );
        assert.equal(bulkByTeacher.get(String(activeTeachers[1]._id)).status, 'Leave');
        assert.equal(bulkByTeacher.get(String(activeTeachers[1]._id)).quotaDeduction, settings.attendancePolicy.leaveDeductionWeight);
        assert.equal(bulkByTeacher.get(String(activeTeachers[2]._id)).status, 'Leave');
        assert.equal(bulkByTeacher.get(String(activeTeachers[2]._id)).source, 'Admin_Bulk_Manual');

        const payrollPeriod = moment.tz(bulkDate, 'YYYY-MM-DD', 'Asia/Dhaka');
        const draftPeriod = { month: payrollPeriod.month() + 1, year: payrollPeriod.year() };
        assert.equal(await Salary.countDocuments(draftPeriod), 0, 'Draft payroll test month must not already have a saved sheet.');
        testPayrollPeriods.push(draftPeriod);
        const draftResponse = await requestJson(baseUrl, token, '/api/v1/payroll/generate', {
            method: 'POST',
            body: JSON.stringify({ ...draftPeriod, forceGenerateWithPending: false })
        });
        assert.equal(draftResponse.data.isDraft, true);
        assert.ok(draftResponse.data.payrollRecords.length > 0);
        assert.equal(await Salary.countDocuments(draftPeriod), 0, 'Generating a payroll draft must not save salary documents.');
        const expectedRankedTeachers = await Teacher.find({
            isActive: true,
            registrationStatus: 'Approved'
        }).select('_id biometricDeviceId rankingMetrics').lean();
        expectedRankedTeachers.sort((first, second) => {
            const firstRank = Number(first.rankingMetrics?.overallMadrasahRank);
            const secondRank = Number(second.rankingMetrics?.overallMadrasahRank);
            const normalizedFirstRank = Number.isFinite(firstRank) && firstRank > 0 ? firstRank : Number.MAX_SAFE_INTEGER;
            const normalizedSecondRank = Number.isFinite(secondRank) && secondRank > 0 ? secondRank : Number.MAX_SAFE_INTEGER;
            return normalizedFirstRank - normalizedSecondRank ||
                (Number(first.rankingMetrics?.designationPriority) || 15) -
                (Number(second.rankingMetrics?.designationPriority) || 15) ||
                Number(first.biometricDeviceId || 0) - Number(second.biometricDeviceId || 0);
        });
        const expectedRankedTeacherIds = expectedRankedTeachers.map((teacher) => String(teacher._id));
        assert.deepEqual(
            draftResponse.data.payrollRecords.map((record) => String(record.teacherId._id)),
            expectedRankedTeacherIds,
            'Payroll draft rows should list the highest-ranked teacher first.'
        );

        const confirmResponse = await requestJson(baseUrl, token, '/api/v1/payroll/confirm', {
            method: 'POST',
            body: JSON.stringify({
                ...draftPeriod,
                includeBonus: false,
                preparedOn: '',
                rows: draftResponse.data.payrollRecords.map((record) => ({
                    teacherId: String(record.teacherId._id),
                    basicSalary: record.basicSalarySnapshot,
                    deductibleDays: record.attendanceBreakdown.totalDeductibleDays,
                    bonusAmount: record.bonusAmount,
                    adjustmentAmount: record.customAdjustment.amount
                }))
            })
        });
        assert.equal(confirmResponse.data.confirmedCount, draftResponse.data.generatedCount);
        assert.equal(await Salary.countDocuments(draftPeriod), draftResponse.data.generatedCount);
        const savedSheetResponse = await requestJson(
            baseUrl,
            token,
            `/api/v1/payroll/sheets?month=${draftPeriod.month}&year=${draftPeriod.year}`
        );
        assert.deepEqual(
            savedSheetResponse.data.salaries.map((salary) => String(salary.teacherId._id)),
            expectedRankedTeacherIds,
            'Saved payroll rows should retain rank order.'
        );
        const savedPeriodsResponse = await requestJson(
            baseUrl,
            token,
            '/api/v1/payroll/sheets/periods'
        );
        assert.ok(
            savedPeriodsResponse.data.periods.some((savedPeriod) => (
                savedPeriod.month === draftPeriod.month &&
                savedPeriod.year === draftPeriod.year &&
                savedPeriod.salaryCount === draftResponse.data.generatedCount
            )),
            'Saved payroll periods should include the newly confirmed month and row count.'
        );
        const attendanceDetailsResponse = await requestJson(
            baseUrl,
            token,
            '/api/v1/payroll/attendance-details',
            {
                method: 'POST',
                body: JSON.stringify({ ...draftPeriod, teacherIds: expectedRankedTeacherIds })
            }
        );
        assert.deepEqual(
            attendanceDetailsResponse.data.teachers.map((teacher) => teacher.teacherId),
            expectedRankedTeacherIds,
            'Attendance details should retain payroll rank order.'
        );
        const detailsByTeacherId = new Map(
            attendanceDetailsResponse.data.teachers.map((teacher) => [teacher.teacherId, teacher])
        );
        const firstTeacherRecords = detailsByTeacherId.get(String(activeTeachers[0]._id)).records;
        const secondTeacherRecords = detailsByTeacherId.get(String(activeTeachers[1]._id)).records;
        assert.ok(
            firstTeacherRecords.some((record) => (
                record.date === bulkDate && record.status === 'Late' && Boolean(record.punchTime)
            )),
            'Attendance details should include a teacher’s late date and punch time.'
        );
        assert.ok(
            secondTeacherRecords.some((record) => record.date === bulkDate && record.status === 'Leave'),
            'Attendance details should include a teacher’s leave date.'
        );
        assert.ok(
            attendanceDetailsResponse.data.teachers.every((teacher) => (
                teacher.records.every((record) => (
                    record.date.startsWith(`${draftPeriod.year}-${String(draftPeriod.month).padStart(2, '0')}-`)
                ))
            )),
            'Attendance details should be limited to the selected payroll month.'
        );
        await requestWithStatus(baseUrl, token, '/api/v1/payroll/confirm', 409, {
            method: 'POST',
            body: JSON.stringify({
                ...draftPeriod,
                includeBonus: false,
                preparedOn: '',
                rows: draftResponse.data.payrollRecords.map((record) => ({
                    teacherId: String(record.teacherId._id),
                    basicSalary: record.basicSalarySnapshot,
                    deductibleDays: record.attendanceBreakdown.totalDeductibleDays,
                    bonusAmount: record.bonusAmount,
                    adjustmentAmount: record.customAdjustment.amount
                }))
            })
        });
        await Salary.updateOne(
            { ...draftPeriod, teacherId: activeTeachers[0]._id },
            { $set: { paymentStatus: 'Paid' } }
        );
        const protectedDeleteResponse = await requestWithStatus(
            baseUrl,
            token,
            '/api/v1/payroll/sheets',
            409,
            {
                method: 'DELETE',
                body: JSON.stringify(draftPeriod)
            }
        );
        assert.match(protectedDeleteResponse.message, /পেমেন্ট সম্পন্ন/);
        await Salary.updateMany(draftPeriod, { $set: { paymentStatus: 'Pending' } });
        const deletedSheetResponse = await requestJson(baseUrl, token, '/api/v1/payroll/sheets', {
            method: 'DELETE',
            body: JSON.stringify(draftPeriod)
        });
        assert.equal(deletedSheetResponse.data.deletedCount, draftResponse.data.generatedCount);
        assert.equal(await Salary.countDocuments(draftPeriod), 0);
        const periodsAfterDeleteResponse = await requestJson(
            baseUrl,
            token,
            '/api/v1/payroll/sheets/periods'
        );
        assert.ok(
            !periodsAfterDeleteResponse.data.periods.some((savedPeriod) => (
                savedPeriod.month === draftPeriod.month && savedPeriod.year === draftPeriod.year
            )),
            'Deleted payroll months should no longer appear in saved payroll periods.'
        );
        testPayrollPeriods.pop();

        const payrollDivisor = settings.payrollPolicy.useExactCalendarDays === false
            ? settings.payrollPolicy.daysInSalaryMonth || 30
            : payrollPeriod.daysInMonth();
        const salaryFixture = await Salary.create({
            teacherId: activeTeachers[0]._id,
            month: payrollPeriod.month() + 1,
            year: payrollPeriod.year(),
            basicSalarySnapshot: 30000,
            proRataInfo: { effectiveBasicSalary: 30000 },
            perDaySalary: 1000,
            netPayableSalary: 30000,
            generatedAt: new Date(),
            paymentStatus: 'Pending',
            includeBonus: true,
            bonusPercentage: 10,
            bonusTitle: 'Integration test bonus',
            customAdjustment: {
                mode: 'INCREASE_AMOUNT',
                value: 500,
                amount: 500,
                reason: 'Integration test adjustment'
            },
            extraAllowance: 250,
            extraDeduction: 75,
            adjustmentNote: 'Preserve during attendance recalculation'
        });
        testSalaryIds.push(salaryFixture._id);
        const payrollEmailPreview = await requestJson(baseUrl, token, '/api/v1/payroll/email/preview', {
            method: 'POST',
            body: JSON.stringify({
                month: payrollPeriod.month() + 1,
                year: payrollPeriod.year(),
                teacherIds: [String(activeTeachers[0]._id)]
            })
        });
        assert.equal(payrollEmailPreview.data.selectedCount, 1);
        assert.equal(
            payrollEmailPreview.data.sendableCount + payrollEmailPreview.data.missingEmailCount,
            1
        );
        if (payrollEmailPreview.data.sendableCount === 1) {
            assert.match(payrollEmailPreview.data.messages[0].html, /বেতন বিবরণী/);
            assert.equal(payrollEmailPreview.data.messages[0].teacherId, String(activeTeachers[0]._id));
        }
        const secondSalaryFixture = await Salary.create({
            teacherId: activeTeachers[1]._id,
            month: payrollPeriod.month() + 1,
            year: payrollPeriod.year(),
            basicSalarySnapshot: 30000,
            proRataInfo: { effectiveBasicSalary: 30000 },
            perDaySalary: 1000,
            netPayableSalary: 30000,
            generatedAt: new Date()
        });
        testSalaryIds.push(secondSalaryFixture._id);

        const absentResponse = await requestJson(baseUrl, token, '/api/v1/attendance/override', {
            method: 'PUT',
            body: JSON.stringify({
                teacherId: String(activeTeachers[0]._id),
                date: bulkDate,
                status: 'Absent',
                remarks: 'Integration test monthly exception'
            })
        });
        assert.equal(absentResponse.meta.payrollRecalculated, true);
        const absentLog = await Attendance.findOne({ teacherId: activeTeachers[0]._id, date: bulkDate }).lean();
        const recalculatedSalary = await Salary.findById(salaryFixture._id).lean();
        assert.equal(absentLog.status, 'Absent');
        assert.equal(absentLog.quotaDeduction, 0);
        assert.equal(absentLog.salaryDeduction, 1);
        assert.equal(recalculatedSalary.attendanceBreakdown.totalUnexcusedAbsentCount, 1);
        assert.equal(recalculatedSalary.attendanceBreakdown.directAbsentPenaltyDays, 1);
        assert.equal(recalculatedSalary.includeBonus, true);
        assert.equal(recalculatedSalary.customAdjustment.mode, 'INCREASE_AMOUNT');
        assert.equal(recalculatedSalary.extraAllowance, 250);
        assert.equal(recalculatedSalary.extraDeduction, 75);

        await requestJson(baseUrl, token, '/api/v1/payroll/adjust-monthly-sheet', {
            method: 'POST',
            body: JSON.stringify({
                month: payrollPeriod.month() + 1,
                year: payrollPeriod.year(),
                applyToAll: true,
                adjustmentMode: 'INCREASE_DAYS',
                adjustmentValue: 3,
                reason: 'Integration test: bulk three-day increase'
            })
        });
        const bulkAdjustedSalaries = await Salary.find({
            _id: { $in: [salaryFixture._id, secondSalaryFixture._id] }
        }).lean();
        assert.equal(bulkAdjustedSalaries.length, 2);
        assert.ok(bulkAdjustedSalaries.every((salary) => (
            salary.customAdjustment.mode === 'INCREASE_DAYS' &&
            salary.customAdjustment.value === 3 &&
            salary.customAdjustment.amount === Math.round(
                (salary.basicSalarySnapshot / payrollPeriod.daysInMonth()) * 3
            )
        )), `Bulk three-day increase should update and persist every salary sheet: ${JSON.stringify(
            bulkAdjustedSalaries.map((salary) => ({
                mode: salary.customAdjustment.mode,
                value: salary.customAdjustment.value,
                basicSalary: salary.basicSalarySnapshot,
                amount: salary.customAdjustment.amount
            }))
        )}.`);
        assert.equal(
            bulkAdjustedSalaries.find((salary) => String(salary.teacherId) === String(activeTeachers[1]._id))
                .customAdjustment.amount,
            Math.round((30000 / payrollPeriod.daysInMonth()) * 3)
        );

        const preparedOn = '15 Mar 2098';
        const editedSheetResponse = await requestJson(baseUrl, token, '/api/v1/payroll/sheets/edits', {
            method: 'PUT',
            body: JSON.stringify({
                month: payrollPeriod.month() + 1,
                year: payrollPeriod.year(),
                includeBonus: true,
                preparedOn,
                rows: [
                    {
                        teacherId: String(activeTeachers[0]._id),
                        basicSalary: 30000,
                        deductibleDays: 1.5,
                        bonusAmount: 1500,
                        adjustmentAmount: 250
                    },
                    {
                        teacherId: String(activeTeachers[1]._id),
                        basicSalary: 30000,
                        deductibleDays: 0.5,
                        bonusAmount: 0,
                        adjustmentAmount: -500
                    }
                ]
            })
        });
        assert.equal(editedSheetResponse.data.updatedCount, 2);
        const savedEditedSheets = await Salary.find({
            _id: { $in: [salaryFixture._id, secondSalaryFixture._id] }
        }).lean();
        const savedEditedByTeacher = new Map(
            savedEditedSheets.map((salary) => [String(salary.teacherId), salary])
        );
        const firstEditedSheet = savedEditedByTeacher.get(String(activeTeachers[0]._id));
        const expectedFirstDeduction = Math.round((1.5 * 30000) / payrollDivisor);
        assert.equal(firstEditedSheet.manualDeductibleDays, 1.5);
        assert.equal(firstEditedSheet.leaveAndAbsentDeductionAmount, expectedFirstDeduction);
        assert.equal(firstEditedSheet.preparedOn, preparedOn);
        assert.equal(
            firstEditedSheet.netPayableSalary,
            Math.max(0, Math.round(
                30000 - expectedFirstDeduction - 0 + 1500 + 250 + 250 - 75
            ))
        );
        assert.equal(
            savedEditedByTeacher.get(String(activeTeachers[1]._id)).customAdjustment.amount,
            -500
        );

        const smsPreviewResponse = await requestJson(baseUrl, token, '/api/v1/payroll/sms/preview', {
            method: 'POST',
            body: JSON.stringify({
                month: payrollPeriod.month() + 1,
                year: payrollPeriod.year(),
                teacherIds: [String(activeTeachers[0]._id), String(activeTeachers[1]._id)]
            })
        });
        assert.equal(smsPreviewResponse.data.selectedCount, 2);
        assert.equal(
            smsPreviewResponse.data.totalNetPayable,
            savedEditedSheets.reduce((sum, salary) => sum + salary.netPayableSalary, 0)
        );

        await requestWithStatus(baseUrl, token, '/api/v1/payroll/generate', 409, {
            method: 'POST',
            body: JSON.stringify({
                month: payrollPeriod.month() + 1,
                year: payrollPeriod.year()
            })
        });
        const salaryAfterDuplicateAttempt = await Salary.findById(salaryFixture._id).lean();
        assert.equal(salaryAfterDuplicateAttempt.customAdjustment.mode, 'INCREASE_AMOUNT');
        assert.equal(salaryAfterDuplicateAttempt.customAdjustment.amount, 250);

        await Salary.updateOne(
            { _id: salaryFixture._id },
            { $set: { generatedAt: new Date(Date.now() - (31 * 24 * 60 * 60 * 1000)) } }
        );
        await requestWithStatus(baseUrl, token, '/api/v1/payroll/sheets/edits', 403, {
            method: 'PUT',
            body: JSON.stringify({
                month: payrollPeriod.month() + 1,
                year: payrollPeriod.year(),
                includeBonus: true,
                rows: [
                    {
                        teacherId: String(activeTeachers[0]._id),
                        basicSalary: 30000,
                        deductibleDays: 1.5,
                        bonusAmount: 1500,
                        adjustmentAmount: 250
                    },
                    {
                        teacherId: String(activeTeachers[1]._id),
                        basicSalary: 30000,
                        deductibleDays: 0.5,
                        bonusAmount: 0,
                        adjustmentAmount: -500
                    }
                ]
            })
        });
        await requestWithStatus(baseUrl, token, '/api/v1/attendance/override', 403, {
            method: 'PUT',
            body: JSON.stringify({
                teacherId: String(activeTeachers[0]._id),
                date: bulkDate,
                status: 'Present',
                punchTime: `${bulkDate}T08:55:00+06:00`
            })
        });
        const attendanceAfterExpiredEdit = await Attendance.findOne({
            teacherId: activeTeachers[0]._id,
            date: bulkDate
        }).lean();
        assert.equal(attendanceAfterExpiredEdit.status, 'Absent');

        const usbTestTeachers = activeTeachers.slice(0, 3);
        await Attendance.create([
            {
                teacherId: usbTestTeachers[0]._id,
                biometricDeviceId: usbTestTeachers[0].biometricDeviceId,
                date: usbDate,
                status: 'Leave',
                deductionWeight: 1,
                quotaDeduction: 1,
                source: 'Auto_Cron_Job',
                isAutoMarked: true,
                isManuallyEdited: false
            },
            {
                teacherId: usbTestTeachers[1]._id,
                biometricDeviceId: usbTestTeachers[1].biometricDeviceId,
                date: usbDate,
                status: 'Absent',
                deductionWeight: 0,
                quotaDeduction: 0,
                salaryDeduction: 1,
                directSalaryPenaltyDays: 1,
                source: 'Admin_Manual',
                isManuallyEdited: true
            },
            {
                teacherId: usbTestTeachers[2]._id,
                biometricDeviceId: usbTestTeachers[2].biometricDeviceId,
                date: usbDate,
                status: 'Official Duty',
                source: 'Admin_Manual',
                isManuallyEdited: true
            }
        ]);

        const usbPunchTime = `${lateLimit}:00`;
        const usbText = [
            `${usbTestTeachers[0].biometricDeviceId},${usbDate},${usbPunchTime}`,
            `${usbTestTeachers[0].biometricDeviceId},${usbDate},${usbPunchTime}`,
            `${usbTestTeachers[1].biometricDeviceId},${usbDate},${usbPunchTime}`,
            `${usbTestTeachers[2].biometricDeviceId},${usbDate},${usbPunchTime}`
        ].join('\n');
        const uploadForm = new FormData();
        uploadForm.append('file', new Blob([usbText], { type: 'text/csv' }), 'attendance-integration.csv');
        const uploadResponse = await requestJson(baseUrl, token, '/api/v1/attendance/upload-usb-logs', {
            method: 'POST',
            body: uploadForm
        });
        assert.equal(uploadResponse.data.newlySyncedPunches, 1);
        assert.equal(uploadResponse.data.skippedOrDuplicateLines, 3);

        const mergedRecords = await Attendance.find({
            date: usbDate,
            teacherId: { $in: usbTestTeachers.map((teacher) => teacher._id) }
        }).lean();
        const mergedByTeacher = new Map(mergedRecords.map((record) => [String(record.teacherId), record]));
        assert.equal(mergedByTeacher.get(String(usbTestTeachers[0]._id)).status, 'Late');
        assert.equal(mergedByTeacher.get(String(usbTestTeachers[0]._id)).source, 'USB_Pendrive_Upload');
        assert.equal(mergedByTeacher.get(String(usbTestTeachers[1]._id)).status, 'Absent');
        assert.equal(mergedByTeacher.get(String(usbTestTeachers[2]._id)).status, 'Official Duty');

        await AttendanceDay.create({
            date: holidayDate,
            dayType: 'MACHINE_OFF',
            reason: 'Integration test: simulated Machine-Off flag'
        });
        const holidayResponse = await requestJson(baseUrl, token, '/api/v1/attendance/special-date', {
            method: 'POST',
            body: JSON.stringify({
                date: holidayDate,
                title: 'Integration test: Machine Off day',
                isHoliday: true
            })
        });
        assert.equal(holidayResponse.data.isHoliday, true);
        const holidayFlag = await AttendanceDay.findOne({ date: holidayDate }).lean();
        assert.equal(holidayFlag.dayType, 'HOLIDAY');
        assert.equal(String(holidayFlag.updatedBy), String(admin._id));
        const holidayAudit = await runDailyEndOfDayAudit(holidayDate);
        assert.equal(holidayAudit.action, 'SKIPPED_HOLIDAY');

        console.log('Attendance/payroll API integration passed: cron threshold, Machine-Off, USB merge, bulk attendance, exceptions, closed-month payroll, sheet deletion, SMS/email previews, bulk adjustments, and 30-day edit enforcement.');
    } finally {
        if (testDates.length) {
            await Promise.all([
                Attendance.deleteMany({ date: { $in: testDates } }),
                AttendanceDay.deleteMany({ date: { $in: testDates } }),
                SpecialDate.deleteMany({ date: { $in: testDates } }),
                Salary.deleteMany({ _id: { $in: testSalaryIds } })
            ]);
        }
        if (testPayrollPeriods.length) {
            await Salary.deleteMany({
                $or: testPayrollPeriods.map(({ month, year }) => ({ month, year }))
            });
        }
        if (originalLastCronAuditDate !== undefined) {
            await SystemSettings.updateOne(
                { key: 'GLOBAL_SETTINGS' },
                { $set: { lastCronAuditDate: originalLastCronAuditDate } }
            );
        }
        if (originalJoiningDates.length > 0) {
            await Promise.all(originalJoiningDates.map((teacher) => (
                Teacher.updateOne({ _id: teacher._id }, { $set: { joiningDate: teacher.joiningDate } })
            )));
        }
        if (originalIntegrationKeys.results === undefined) delete process.env.RESULTS_APP_API_KEY;
        else process.env.RESULTS_APP_API_KEY = originalIntegrationKeys.results;
        if (originalIntegrationKeys.admitCard === undefined) delete process.env.ADMIT_CARD_APP_API_KEY;
        else process.env.ADMIT_CARD_APP_API_KEY = originalIntegrationKeys.admitCard;
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        await mongoose.disconnect();
    }
}

main().catch((error) => {
    console.error('Attendance API integration failed:', error);
    process.exitCode = 1;
});
