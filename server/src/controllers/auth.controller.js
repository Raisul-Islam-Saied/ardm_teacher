const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../constants/system.constants');

const signToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '12h'
    });
};

const setupInitialSuperAdmin = asyncHandler(async (req, res) => {
    const existingCount = await Teacher.countDocuments();
    if (existingCount > 0) {
        throw new ApiError(403, 'সিস্টেমে ইতিমধ্যে ইউজার রয়েছে! প্রাথমিক সুপার অ্যাডমিন সেটআপ রাউটটি স্থায়ীভাবে লক করা হয়েছে।');
    }

    const superAdmin = await Teacher.create({
        ...req.body,
        role: ROLES.SUPER_ADMIN,
        isActive: true
    });

    const token = signToken(superAdmin._id, superAdmin.role);
    const adminResponse = superAdmin.toObject();
    delete adminResponse.password;

    return res.status(201).json(
        new ApiResponse(201, 'আলহামদুলিল্লাহ! সিস্টেমের প্রথম সুপার অ্যাডমিন সফলভাবে তৈরি হয়েছে।', { token, user: adminResponse })
    );
});

const login = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    const user = await Teacher.findOne({
        $or: [{ phone: identifier }, { teacherCode: identifier.toUpperCase() }]
    }).select('+password +failedLoginAttempts +lockUntil');

    if (!user) {
        throw new ApiError(401, 'ভুল মোবাইল নম্বর/আইডি অথবা পাসওয়ার্ড!');
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
        const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
        throw new ApiError(423, `একাউন্ট লক করা হয়েছে। অনুগ্রহ করে ${remainingMinutes} মিনিট পর চেষ্টা করুন।`);
    }

    if (!user.isActive) {
        throw new ApiError(403, 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।');
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= 5) {
            user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
            await user.save({ validateBeforeSave: false });
            throw new ApiError(423, 'পরপর ৫ বার ভুল পাসওয়ার্ড দেওয়ায় আপনার অ্যাকাউন্ট ১৫ মিনিটের জন্য লক করা হলো!');
        }
        await user.save({ validateBeforeSave: false });
        throw new ApiError(401, `ভুল পাসওয়ার্ড! আর ${5 - user.failedLoginAttempts} বার চেষ্টার সুযোগ রয়েছে।`);
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id, user.role);
    res.cookie('accessToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 12 * 60 * 60 * 1000
    });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.failedLoginAttempts;
    delete userObj.lockUntil;

    return res.status(200).json(new ApiResponse(200, 'লগইন সফল হয়েছে!', { token, user: userObj }));
});

const logout = asyncHandler(async (req, res) => {
    res.clearCookie('accessToken');
    return res.status(200).json(new ApiResponse(200, 'সফলভাবে লগআউট করা হয়েছে।'));
});

const getMe = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, 'প্রোফাইল তথ্য', req.user));
});

const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await Teacher.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
        throw new ApiError(401, 'আপনার বর্তমান পাসওয়ার্ডটি সঠিক নয়!');
    }
    user.password = newPassword;
    await user.save();
    const token = signToken(user._id, user.role);
    return res.status(200).json(new ApiResponse(200, 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!', { token }));
});

module.exports = { setupInitialSuperAdmin, login, logout, getMe, changePassword };
