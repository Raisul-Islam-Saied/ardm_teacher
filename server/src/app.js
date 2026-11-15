const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const ApiError = require('./utils/ApiError');
const errorHandler = require('./middlewares/error.middleware');

const authRoutes = require('./routes/auth.routes');
const teacherRoutes = require('./routes/teacher.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const payrollRoutes = require('./routes/payroll.routes');
const uploadRoutes = require('./routes/upload.routes');
const systemRoutes = require('./routes/system.routes');
const { zkTecoHandshake, zkTecoReceiveLogs } = require('./controllers/attendance.controller');

const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: {
        success: false,
        statusCode: 429,
        message: 'অতিরিক্ত রিকোয়েস্ট পাঠানো হয়েছে! ১৫ মিনিট পর চেষ্টা করুন।'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(express.text({ type: ['text/plain', 'application/octet-stream'], limit: '200kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'ARDM Zero-Maintenance Enterprise ERP Server is healthy 🛡️',
        activeRoutes: [
            '/api/v1/auth',
            '/api/v1/teachers',
            '/api/v1/attendance',
            '/api/v1/payroll',
            '/api/v1/upload',
            '/api/v1/system',
            '/iclock/cdata'
        ],
        timezone: process.env.TIMEZONE,
        serverTime: new Date().toLocaleString('en-US', { timeZone: process.env.TIMEZONE })
    });
});

// ZKTeco K40 Native ADMS Routes
app.get('/iclock/cdata', zkTecoHandshake);
app.post('/iclock/cdata', zkTecoReceiveLogs);
app.get('/iclock/getrequest', (req, res) => {
    res.status(200).type('text/plain').send('OK');
});

// Enterprise API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/system', systemRoutes);

app.all('*', (req, res, next) => {
    next(new ApiError(404, `আপনি যে রাউটটি খুঁজছেন (${req.method} ${req.originalUrl}) তা এই সার্ভারে বিদ্যমান নেই!`));
});

app.use(errorHandler);

module.exports = app;
