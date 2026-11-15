const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');

const OPTIONAL_UNIQUE_TEACHER_FIELDS = [
    'uid',
    'indexNumber',
    'nidNumber',
    'birthRegNumber',
    'email'
];

const cleanupOptionalUniqueTeacherFields = async () => {
    let cleanedCount = 0;

    for (const field of OPTIONAL_UNIQUE_TEACHER_FIELDS) {
        const nullResult = await Teacher.collection.updateMany(
            { [field]: { $type: 10 } },
            { $unset: { [field]: 1 } }
        );
        const blankResult = await Teacher.collection.updateMany(
            { [field]: { $type: 'string', $regex: /^\s*$/ } },
            { $unset: { [field]: 1 } }
        );

        cleanedCount += nullResult.modifiedCount + blankResult.modifiedCount;
    }

    if (cleanedCount > 0) {
        console.log(`✅ ঐচ্ছিক ইউনিক ফিল্ডের ${cleanedCount}টি ফাঁকা মান পরিষ্কার করা হয়েছে।`);
    }
};

const connectDB = async () => {
    try {
        mongoose.set('strictQuery', true);

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            maxPoolSize: 10,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
        await cleanupOptionalUniqueTeacherFields();

        mongoose.connection.on('error', (err) => {
            console.error(`❌ MongoDB Runtime Error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB Disconnected! Attempting to reconnect...');
        });

    } catch (error) {
        console.error(`❌ MongoDB Initial Connection Failed: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
