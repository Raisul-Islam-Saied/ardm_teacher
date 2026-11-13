require('dotenv').config();
const moment = require('moment-timezone');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const initAttendanceCronJobs = require('./src/jobs/attendance.job');

process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION! Shutting down immediately...');
    console.error(err.name, err.message, err.stack);
    process.exit(1);
});

moment.tz.setDefault(process.env.TIMEZONE || 'Asia/Dhaka');

const PORT = process.env.PORT || 5000;
let server;

connectDB().then(() => {
    initAttendanceCronJobs();

    server = app.listen(PORT, () => {
        console.log(`🚀 ARDM Enterprise Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        console.log(`🕒 System Timezone locked to: ${moment.tz.guess()} (${moment().format('YYYY-MM-DD hh:mm:ss A')})`);
    });
});

process.on('unhandledRejection', (err) => {
    console.error('💥 UNHANDLED REJECTION! Shutting down gracefully...');
    console.error(err.name, err.message);
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});
