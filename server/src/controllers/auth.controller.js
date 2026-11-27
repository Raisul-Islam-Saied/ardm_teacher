const Teacher = require('../models/Teacher');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../constants/system.constants');
const {
    signAccessToken,
    setAccessTokenCookie,
    clearAccessTokenCookie
} = require('../services/authSession.service');
const {
    requestPasswordReset: sendPasswordResetRequest,
    resetPasswordWithToken
} = require('../services/passwordReset.service');

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

    const token = signAccessToken(superAdmin._id, superAdmin.role);
    setAccessTokenCookie(res, token);
    const adminResponse = superAdmin.toObject();
    delete adminResponse.password;

    return res.status(201).json(
        new ApiResponse(201, 'আলহামদুলিল্লাহ! সিস্টেমের প্রথম সুপার অ্যাডমিন সফলভাবে তৈরি হয়েছে।', { token, user: adminResponse })
    );
});

const login = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const normalizedIdentifier = String(identifier).trim();
    const userQuery = normalizedIdentifier.includes('@')
        ? { email: normalizedIdentifier.toLowerCase() }
        : {
            $or: [
                { phone: normalizedIdentifier },
                { teacherCode: normalizedIdentifier.toUpperCase() }
            ]
        };

    const user = await Teacher.findOne(userQuery)
        .select('+password +failedLoginAttempts +lockUntil');

    if (!user) {
        throw new ApiError(401, 'ভুল ইমেইল/মোবাইল নম্বর/আইডি অথবা পাসওয়ার্ড!');
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
        const retryAfterSeconds = Math.max(1, Math.ceil((user.lockUntil - Date.now()) / 1000));
        const remainingMinutes = Math.floor(retryAfterSeconds / 60);
        const remainingSeconds = retryAfterSeconds % 60;
        throw new ApiError(
            423,
            `অ্যাকাউন্টটি সাময়িকভাবে লক আছে। আবার চেষ্টা করতে ${remainingMinutes} মিনিট ${remainingSeconds} সেকেন্ড অপেক্ষা করুন।`,
            [],
            true,
            '',
            { retryAfterSeconds }
        );
    }
    if (user.lockUntil) {
        user.lockUntil = null;
        user.failedLoginAttempts = 0;
    }

    if (!user.isActive) {
        throw new ApiError(403, 'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।');
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= 5) {
            const retryAfterSeconds = 15 * 60;
            user.lockUntil = new Date(Date.now() + retryAfterSeconds * 1000);
            await user.save({ validateBeforeSave: false });
            throw new ApiError(
                423,
                'পরপর ৫ বার ভুল পাসওয়ার্ড দেওয়ায় অ্যাকাউন্টটি ১৫ মিনিটের জন্য সাময়িকভাবে লক করা হয়েছে।',
                [],
                true,
                '',
                { retryAfterSeconds }
            );
        }
        await user.save({ validateBeforeSave: false });
        throw new ApiError(401, `ভুল পাসওয়ার্ড! আর ${5 - user.failedLoginAttempts} বার চেষ্টার সুযোগ রয়েছে।`);
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signAccessToken(user._id, user.role);
    setAccessTokenCookie(res, token);

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.failedLoginAttempts;
    delete userObj.lockUntil;

    return res.status(200).json(new ApiResponse(200, 'লগইন সফল হয়েছে!', { token, user: userObj }));
});

const logout = asyncHandler(async (req, res) => {
    clearAccessTokenCookie(res);
    return res.status(200).json(new ApiResponse(200, 'সফলভাবে লগআউট করা হয়েছে।'));
});

const getMe = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, 'প্রোফাইল তথ্য', req.user));
});

const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await Teacher.findById(req.user._id)
        .select('+password +passwordResetTokenHash +passwordResetExpires');
    if (!(await user.comparePassword(currentPassword))) {
        throw new ApiError(401, 'আপনার বর্তমান পাসওয়ার্ডটি সঠিক নয়!');
    }
    user.password = newPassword;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    const token = signAccessToken(user._id, user.role);
    setAccessTokenCookie(res, token);
    return res.status(200).json(new ApiResponse(200, 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!', { token }));
});

const requestPasswordReset = asyncHandler(async (req, res) => {
    await sendPasswordResetRequest(req.body.email);
    return res.status(200).json(new ApiResponse(
        200,
        'ইমেইলটি কোনো পোর্টাল অ্যাকাউন্টের সঙ্গে মিললে পাসওয়ার্ড রিসেটের নির্দেশনা পাঠানো হবে।'
    ));
});

const resetPassword = asyncHandler(async (req, res) => {
    await resetPasswordWithToken({
        token: req.body.token,
        newPassword: req.body.newPassword
    });
    return res.status(200).json(new ApiResponse(
        200,
        'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
    ));
});

module.exports = {
    setupInitialSuperAdmin,
    login,
    logout,
    getMe,
    changePassword,
    requestPasswordReset,
    resetPassword
};
