const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const extractedErrors = errors.array().map((err) => ({
            field: err.path,
            message: err.msg,
            rejectedValue: err.value
        }));

        throw new ApiError(
            400,
            'প্রদত্ত তথ্যে ভুল রয়েছে! অনুগ্রহ করে প্রতিটি ঘর সঠিকভাবে পূরণ করুন।',
            extractedErrors
        );
    }
    next();
};

module.exports = validateRequest;
