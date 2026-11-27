const crypto = require('crypto');
const Teacher = require('../models/Teacher');
const ApiError = require('../utils/ApiError');
const {
    createSmtpTransport,
    getSafeSmtpFailureMessage,
    logSmtpFailure
} = require('./smtpTransport.service');

const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

const hashPasswordResetToken = (token) => crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

const createPasswordResetToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    return {
        token,
        tokenHash: hashPasswordResetToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS)
    };
};

const buildPasswordResetUrl = (token) => {
    const frontendOrigin = (process.env.CLIENT_URL || 'http://localhost:5173')
        .split(',')[0]
        .trim();
    let url;
    try {
        url = new URL('/password-recovery', frontendOrigin);
    } catch (error) {
        throw new ApiError(503, 'পাসওয়ার্ড রিসেট লিংকের জন্য CLIENT_URL সঠিকভাবে সেট করা নেই।');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new ApiError(503, 'পাসওয়ার্ড রিসেট লিংকের জন্য CLIENT_URL সঠিকভাবে সেট করা নেই।');
    }
    url.searchParams.set('token', token);
    return url.toString();
};

const sendPasswordResetEmail = async ({ transporter, from, email, token }) => {
    const resetUrl = buildPasswordResetUrl(token);
    const safeResetUrl = resetUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    await transporter.sendMail({
        from,
        to: email,
        subject: 'পোর্টাল পাসওয়ার্ড রিসেট',
        text: `আপনার পোর্টাল পাসওয়ার্ড রিসেট করতে এই লিংকটি ১৫ মিনিটের মধ্যে খুলুন:\n${resetUrl}\n\nআপনি অনুরোধ না করলে এই ইমেইল উপেক্ষা করুন।`,
        html: `<!doctype html><html lang="bn"><head><meta charset="utf-8"></head><body style="margin:0;padding:24px;background:#f1f5f9;font-family:'Noto Sans Bengali','Segoe UI',Arial,sans-serif;color:#0f172a;"><main style="max-width:560px;margin:0 auto;padding:28px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;"><h1 style="font-size:22px;margin:0 0 16px;">পাসওয়ার্ড রিসেট</h1><p style="line-height:1.7;">আপনার ARDM পোর্টাল অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার অনুরোধ এসেছে। নিচের বাটনটি ১৫ মিনিটের মধ্যে ব্যবহার করুন।</p><p style="margin:24px 0;"><a href="${safeResetUrl}" style="display:inline-block;padding:12px 20px;background:#047857;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">নতুন পাসওয়ার্ড সেট করুন</a></p><p style="font-size:13px;color:#475569;line-height:1.6;">আপনি এই অনুরোধ না করলে ইমেইলটি উপেক্ষা করুন। আপনার বর্তমান পাসওয়ার্ড পরিবর্তন হবে না।</p><p style="font-size:12px;color:#64748b;word-break:break-all;">বাটন কাজ না করলে লিংকটি কপি করুন:<br>${safeResetUrl}</p></main></body></html>`
    });
};

const requestPasswordReset = async (email) => {
    const { transporter, from } = createSmtpTransport();
    try {
        try {
            await transporter.verify();
        } catch (error) {
            logSmtpFailure('[PASSWORD_RESET_SMTP_VERIFY_FAILED]', error);
            throw new ApiError(502, getSafeSmtpFailureMessage(error));
        }

        const teacher = await Teacher.findOne({ email: String(email).trim().toLowerCase() })
            .select('+passwordResetTokenHash +passwordResetExpires');
        if (!teacher) return;

        const reset = createPasswordResetToken();
        teacher.passwordResetTokenHash = reset.tokenHash;
        teacher.passwordResetExpires = reset.expiresAt;
        await teacher.save({ validateBeforeSave: false });

        try {
            await sendPasswordResetEmail({
                transporter,
                from,
                email: teacher.email,
                token: reset.token
            });
        } catch (error) {
            logSmtpFailure('[PASSWORD_RESET_EMAIL_DELIVERY_FAILED]', error);
            teacher.passwordResetTokenHash = undefined;
            teacher.passwordResetExpires = undefined;
            await teacher.save({ validateBeforeSave: false });
            if (error instanceof ApiError) throw error;
            throw new ApiError(502, getSafeSmtpFailureMessage(error));
        }
    } finally {
        transporter.close();
    }
};

const resetPasswordWithToken = async ({ token, newPassword }) => {
    const teacher = await Teacher.findOne({
        passwordResetTokenHash: hashPasswordResetToken(token),
        passwordResetExpires: { $gt: new Date() }
    }).select('+password +passwordResetTokenHash +passwordResetExpires +failedLoginAttempts +lockUntil');

    if (!teacher) {
        throw new ApiError(400, 'পাসওয়ার্ড রিসেট লিংকটি ভুল বা মেয়াদোত্তীর্ণ। নতুন লিংক নিন।');
    }

    teacher.password = String(newPassword).trim();
    teacher.passwordResetTokenHash = undefined;
    teacher.passwordResetExpires = undefined;
    teacher.failedLoginAttempts = 0;
    teacher.lockUntil = null;
    await teacher.save();
};

module.exports = {
    PASSWORD_RESET_TTL_MS,
    hashPasswordResetToken,
    createPasswordResetToken,
    buildPasswordResetUrl,
    requestPasswordReset,
    resetPasswordWithToken
};
