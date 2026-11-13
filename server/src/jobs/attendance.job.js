const cron = require('node-cron');
const moment = require('moment-timezone');
const {
    runDailyEndOfDayAudit,
    recoverMissedDailyAuditsOnBoot
} = require('../services/attendance.service');

const initAttendanceCronJobs = async () => {
    // ১. সার্ভার স্টার্ট হওয়ার সাথে সাথে চেক করবে বিগত কোনো দিনের অডিট মিস হয়েছে কি না (কম্পিউটার বন্ধ থাকার কারণে)
    await recoverMissedDailyAuditsOnBoot();

    // ২. প্রতিদিন রাত ১১:৫৯ মিনিটে স্বয়ংক্রিয়ভাবে রান হবে
    cron.schedule(
        '59 23 * * *',
        async () => {
            const today = moment.tz('Asia/Dhaka').format('YYYY-MM-DD');
            console.log(`⏰ [CRON 11:59 PM] Starting automatic attendance audit for ${today}...`);
            try {
                const result = await runDailyEndOfDayAudit(today);
                console.log(`✅ [CRON RESULT]: ${result.message}`);
            } catch (error) {
                console.error('❌ [CRON ERROR]:', error.message);
            }
        },
        { scheduled: true, timezone: process.env.TIMEZONE || 'Asia/Dhaka' }
    );

    console.log('⏱️  Automated 11:59 PM Cron & Self-Healing Boot Recovery Active (Asia/Dhaka)');
};

module.exports = initAttendanceCronJobs;
