require('dotenv').config();
const mongoose = require('mongoose');
const Attendance = require('./src/models/Attendance');
const SystemSettings = require('./src/models/SystemSettings');

async function migrate() {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ardm_enterprise_db';
    await mongoose.connect(uri);

    await SystemSettings.updateOne(
        { key: 'GLOBAL_SETTINGS' },
        {
            $set: {
                'attendancePolicy.defaultInTime': '09:00',
                'attendancePolicy.defaultLateLimit': '10:00'
            }
        },
        { upsert: true }
    );

    const records = await Attendance.find({});
    let updated = 0;

    for (const record of records) {
        const updates = {
            isManuallyEdited: record.source === 'Admin_Manual'
                || record.source === 'Admin_Bulk_Manual'
                || record.isManuallyEdited === true,
            isAutoMarked: record.source === 'Auto_Cron_Job'
                || record.isAutoMarked === true
        };

        if (record.status === 'Absent') {
            updates.quotaDeduction = 0;
            updates.salaryDeduction = 1;
            updates.deductionWeight = 0;
            updates.directSalaryPenaltyDays = 1;
        } else if (record.status === 'Late') {
            updates.quotaDeduction = record.deductionWeight || 0.5;
            updates.salaryDeduction = 0;
        } else if (record.status === 'Leave') {
            updates.quotaDeduction = record.deductionWeight || 1;
            updates.salaryDeduction = 0;
        } else {
            updates.quotaDeduction = record.status === 'Present' ? (record.deductionWeight || 0) : 0;
            updates.salaryDeduction = 0;
        }

        await Attendance.updateOne({ _id: record._id }, { $set: updates });
        updated += 1;
    }

    console.log(`Attendance schema migration completed. Updated ${updated} records.`);
    await mongoose.disconnect();
}

migrate().catch(async (error) => {
    console.error('Attendance schema migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
});
