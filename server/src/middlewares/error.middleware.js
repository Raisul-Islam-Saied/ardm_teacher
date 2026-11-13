const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode || 500;
        const message = error.message || 'সার্ভারে একটি অপ্রত্যাশিত ত্রুটি ঘটেছে (Internal Server Error)';
        error = new ApiError(statusCode, message, [], false, err.stack);
    }

    if (err.name === 'CastError') {
        const message = `রিসোর্স খুঁজে পাওয়া যায়নি। ইনভ্যালিড আইডি ফরম্যাট: ${err.value}`;
        error = new ApiError(400, message);
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        const message = `ডুপ্লিকেট ডেটা! এই ${field} (${value}) দিয়ে ইতিমধ্যে একজন রেজিস্টার্ড আছেন।`;
        error = new ApiError(409, message);
    }

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((el) => ({
            field: el.path,
            message: el.message,
        }));
        error = new ApiError(400, 'ডেটা ভ্যালিডেশন ব্যর্থ হয়েছে', errors);
    }

    if (err.name === 'JsonWebTokenError') {
        error = new ApiError(401, 'ইনভ্যালিড সিকিউরিটি টোকেন! অনুগ্রহ করে আবার লগইন করুন।');
    }
    if (err.name === 'TokenExpiredError') {
        error = new ApiError(401, 'আপনার লগইন সেশনের মেয়াদ শেষ হয়ে গেছে! অনুগ্রহ করে আবার লগইন করুন।');
    }

    const response = {
        success: false,
        statusCode: error.statusCode,
        message: error.message,
        ...(error.errors.length > 0 && { errors: error.errors }),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    };

    return res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
