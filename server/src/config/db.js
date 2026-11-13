const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        mongoose.set('strictQuery', true);

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            maxPoolSize: 10,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);

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
