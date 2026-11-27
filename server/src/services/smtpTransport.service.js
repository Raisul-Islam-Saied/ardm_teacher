const nodemailer = require('nodemailer');
const ApiError = require('../utils/ApiError');

const createSmtpTransport = () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const fromEmail = process.env.SMTP_FROM_EMAIL || user;
    if (!host || !user || !pass || !fromEmail || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new ApiError(503, 'ইমেইল SMTP কনফিগারেশন সার্ভারে সম্পূর্ণভাবে সেট করা নেই।');
    }

    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
    const fromName = process.env.SMTP_FROM_NAME || 'আবদুর রাজ্জাক দাখিল মাদ্রাসা';
    return {
        transporter: nodemailer.createTransport({
            host,
            port,
            secure,
            requireTLS: !secure,
            auth: { user, pass },
            connectionTimeout: 15000,
            greetingTimeout: 10000,
            socketTimeout: 30000
        }),
        from: `"${fromName.replace(/["\\]/g, '')}" <${fromEmail}>`
    };
};

const getSafeSmtpFailureMessage = (error) => {
    const code = String(error?.code || '').toUpperCase();
    const responseCode = Number(error?.responseCode) || 0;
    if (code === 'EAUTH' || [534, 535].includes(responseCode)) {
        return 'SMTP login ব্যর্থ। SMTP_USER-এ পুরো ইমেইল ঠিকানা এবং SMTP_PASSWORD-এ সঠিক App Password/SMTP password দিন; provider-এ SMTP অনুমতি চালু আছে কি না যাচাই করুন।';
    }
    if (code === 'ENOTFOUND') {
        return 'SMTP host পাওয়া যায়নি। SMTP_HOST-এর বানান ও provider-এর দেওয়া server address যাচাই করুন।';
    }
    if (code === 'ETLS' || /TLS/i.test(String(error?.message || ''))) {
        return 'SMTP নিরাপদ সংযোগ (TLS) ব্যর্থ। SMTP_PORT ও SMTP_SECURE provider-এর নির্দেশনা অনুযায়ী মিলিয়ে নিন।';
    }
    if (['ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET'].includes(code)) {
        return 'SMTP সার্ভারে সংযোগ করা যায়নি। SMTP_HOST, SMTP_PORT, SMTP_SECURE এবং সার্ভারের outbound connection যাচাই করুন।';
    }
    if (code === 'EENVELOPE' || [550, 553].includes(responseCode)) {
        return 'SMTP সার্ভার প্রেরক বা প্রাপকের ইমেইল গ্রহণ করেনি। SMTP_FROM_EMAIL এবং প্রাপকের ইমেইল যাচাই করুন।';
    }
    return 'SMTP সার্ভার ইমেইল গ্রহণ করেনি। সার্ভার লগে থাকা নিরাপদ SMTP error code দেখে configuration যাচাই করুন।';
};

const logSmtpFailure = (event, error, teacherId = null) => {
    console.error(event, {
        ...(teacherId ? { teacherId } : {}),
        code: String(error?.code || 'UNKNOWN').slice(0, 40),
        responseCode: Number(error?.responseCode) || null,
        command: typeof error?.command === 'string' ? error.command.slice(0, 40) : null
    });
};

module.exports = {
    createSmtpTransport,
    getSafeSmtpFailureMessage,
    logSmtpFailure
};
