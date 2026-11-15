const ApiError = require('../utils/ApiError');

const FIELD_LABELS = {
    phone: 'মোবাইল নম্বর',
    nidNumber: 'জাতীয় পরিচয়পত্র নম্বর',
    birthRegNumber: 'জন্ম নিবন্ধন নম্বর',
    email: 'ইমেইল',
    teacherCode: 'শিক্ষক আইডি',
    biometricDeviceId: 'বায়োমেট্রিক আইডি',
    indexNumber: 'ইনডেক্স নম্বর',
    uid: 'রেজিস্ট্রি আইডি',
    password: 'পাসওয়ার্ড',
    basicSalary: 'মূল বেতন',
    customLeaveQuota: 'মাসিক ছুটির কোটা',
    designation: 'পদবী',
    bloodGroup: 'রক্তের গ্রুপ',
    dateOfBirth: 'জন্মতারিখ',
    joiningDate: 'যোগদানের তারিখ'
};

const errorHandler = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
        const messages = {
            400: 'অনুরোধের তথ্য সঠিক নয়। দেওয়া তথ্যগুলো যাচাই করুন।',
            401: 'এই কাজটি করতে লগইন করতে হবে।',
            403: 'এই কাজটি করার অনুমতি আপনার নেই।',
            404: 'অনুরোধ করা তথ্য বা API রুটটি পাওয়া যায়নি।',
            409: 'এই তথ্যের সঙ্গে আগে থেকেই একটি রেকর্ড রয়েছে।',
            413: 'পাঠানো ফাইল বা তথ্যের আকার অনুমোদিত সীমার চেয়ে বড়।',
            429: 'অনেকবার অনুরোধ করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।',
            500: 'সার্ভারে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।'
        };
        const message = messages[statusCode] || messages[500];
        error = new ApiError(statusCode, message, [], false);
    }

    if (err.name === 'CastError') {
        error = new ApiError(400, 'আইডিটি সঠিক ফরম্যাটে নেই। অনুগ্রহ করে আবার যাচাই করুন।');
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        const label = FIELD_LABELS[field] || 'এই তথ্য';
        const message = `${label} দিয়ে আগে থেকেই একটি রেকর্ড রয়েছে।`;
        error = new ApiError(409, message);
    }

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((el) => ({
            field: el.path,
            message: el.kind === 'required'
                ? `${FIELD_LABELS[el.path] || 'এই তথ্য'} অবশ্যই দিতে হবে।`
                : el.kind === 'enum'
                    ? `${FIELD_LABELS[el.path] || 'এই তথ্য'} থেকে সঠিক অপশন নির্বাচন করুন।`
                    : /[\u0980-\u09FF]/.test(el.message)
                        ? el.message
                        : `${FIELD_LABELS[el.path] || 'এই তথ্য'} সঠিক নয়।`,
        }));
        error = new ApiError(400, 'ডেটা ভ্যালিডেশন ব্যর্থ হয়েছে', errors);
    }

    if (err.name === 'MulterError') {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'ফাইলটি ৫ MB সীমার চেয়ে বড়। ছোট ফাইল নির্বাচন করুন।'
            : 'ফাইল আপলোডের তথ্য সঠিক নয়। ফাইলটি আবার নির্বাচন করুন।';
        error = new ApiError(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, message);
    }

    if (err.name === 'JsonWebTokenError') {
        error = new ApiError(401, 'ইনভ্যালিড সিকিউরিটি টোকেন! অনুগ্রহ করে আবার লগইন করুন।');
    }
    if (err.name === 'TokenExpiredError') {
        error = new ApiError(401, 'আপনার লগইন সেশনের মেয়াদ শেষ হয়ে গেছে! অনুগ্রহ করে আবার লগইন করুন।');
    }

    if (error.statusCode >= 500) {
        console.error('[API ERROR]', {
            method: req.method,
            path: req.path,
            errorName: err.name,
            errorMessage: err.message,
            stack: err.stack
        });
    }
    if (error.meta?.retryAfterSeconds) {
        res.set('Retry-After', String(error.meta.retryAfterSeconds));
    }

    const response = {
        success: false,
        statusCode: error.statusCode,
        message: error.message,
        timestamp: new Date().toISOString(),
        ...(error.meta && { meta: error.meta }),
        ...(error.errors.length > 0 && { errors: error.errors }),
    };

    return res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
