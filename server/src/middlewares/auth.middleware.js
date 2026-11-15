const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }

    if (!token) {
        throw new ApiError(401, 'আপনি লগইন করা নেই! অনুগ্রহ করে আগে লগইন করুন।');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await Teacher.findById(decoded.id).select('+passwordChangedAt');

    if (!currentUser) {
        throw new ApiError(401, 'এই টোকেনের অন্তর্ভুক্ত ইউজার আর সিস্টেমে বিদ্যমান নেই!');
    }
    if (!currentUser.isActive) {
        throw new ApiError(403, 'আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় রয়েছে।');
    }
    if (currentUser.isPasswordChangedAfterTokenIssued(decoded.iat)) {
        throw new ApiError(401, 'সম্প্রতি আপনার পাসওয়ার্ড পরিবর্তন করা হয়েছে! অনুগ্রহ করে নতুন করে লগইন করুন।');
    }

    req.user = currentUser;
    next();
});

const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            throw new ApiError(403, 'অ্যাক্সেস ডিনাইড! এই কাজটি করার জন্য আপনার অ্যাডমিন পারমিশন নেই।');
        }
        next();
    };
};

module.exports = { protect, restrictTo };
