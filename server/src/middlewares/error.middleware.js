const ApiError = require('../utils/ApiError');

const FIELD_LABELS = {
    // Teacher & Common Fields
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
    assignedClass: 'নির্ধারিত শ্রেণি',

    // Student Fields
    studentCode: 'স্টুডেন্ট আইডি',
    fullNameBng: 'নাম (বাংলা)',
    fullNameEng: 'নাম (ইংরেজি)',
    dateOfBirth: 'জন্ম তারিখ',
    gender: 'লিঙ্গ',
    religion: 'ধর্ম',
    bloodGroup: 'রক্তের গ্রুপ',
    brnNumber: 'জন্ম নিবন্ধন নম্বর (BRN)',
    medicalNote: 'মেডিকেল নোট',
    admissionDate: 'ভর্তির তারিখ',
    session: 'শিক্ষাবর্ষ (Session)',
    classBn: 'শ্রেণি',
    roll: 'রোল নম্বর',
    group: 'বিভাগ',
    fourthSubject: '৪র্থ বিষয়',
    boardRegNo: 'বোর্ড রেজিস্ট্রেশন নম্বর',
    fathersNameBng: 'পিতার নাম (বাংলা)',
    fathersNameEng: 'পিতার নাম (ইংরেজি)',
    fatherNid: 'পিতার NID নম্বর',
    fatherOccupation: 'পিতার পেশা',
    mothersNameBng: 'মাতার নাম (বাংলা)',
    mothersNameEng: 'মাতার নাম (ইংরেজি)',
    motherNid: 'মাতার NID নম্বর',
    motherOccupation: 'মাতার পেশা',
    'localGuardian.name': 'স্থানীয় অভিভাবকের নাম',
    'localGuardian.relation': 'স্থানীয় অভিভাবকের সম্পর্ক',
    'localGuardian.nid': 'স্থানীয় অভিভাবকের NID',
    'localGuardian.phone': 'স্থানীয় অভিভাবকের মোবাইল',
    annualIncome: 'বার্ষিক আয়',
    'emergencyContact.phone': 'জরুরি যোগাযোগের নম্বর',
    'presentAddress.houseNameBn': 'বর্তমান বাড়ির নাম (বাংলা)',
    'presentAddress.houseNameEn': 'বর্তমান বাড়ির নাম (ইংরেজি)',
    'presentAddress.villageBn': 'বর্তমান গ্রাম (বাংলা)',
    'presentAddress.villageEn': 'বর্তমান গ্রাম (ইংরেজি)',
    'presentAddress.unionBn': 'বর্তমান ইউনিয়ন (বাংলা)',
    'presentAddress.unionEn': 'বর্তমান ইউনিয়ন (ইংরেজি)',
    'presentAddress.wardNo': 'বর্তমান ওয়ার্ড নম্বর',
    'presentAddress.upazilaBn': 'বর্তমান উপজেলা (বাংলা)',
    'presentAddress.upazilaEn': 'বর্তমান উপজেলা (ইংরেজি)',
    'presentAddress.districtBn': 'বর্তমান জেলা (বাংলা)',
    'presentAddress.districtEn': 'বর্তমান জেলা (ইংরেজি)',
    'permanentAddress.houseNameBn': 'স্থায়ী বাড়ির নাম (বাংলা)',
    'permanentAddress.houseNameEn': 'স্থায়ী বাড়ির নাম (ইংরেজি)',
    'permanentAddress.villageBn': 'স্থায়ী গ্রাম (বাংলা)',
    'permanentAddress.villageEn': 'স্থায়ী গ্রাম (ইংরেজি)',
    'permanentAddress.unionBn': 'স্থায়ী ইউনিয়ন (বাংলা)',
    'permanentAddress.unionEn': 'স্থায়ী ইউনিয়ন (ইংরেজি)',
    'permanentAddress.wardNo': 'স্থায়ী ওয়ার্ড নম্বর',
    'permanentAddress.upazilaBn': 'স্থায়ী উপজেলা (বাংলা)',
    'permanentAddress.upazilaEn': 'স্থায়ী উপজেলা (ইংরেজি)',
    'permanentAddress.districtBn': 'স্থায়ী জেলা (বাংলা)',
    'permanentAddress.districtEn': 'স্থায়ী জেলা (ইংরেজি)',
    'feeDetails.monthlyFee': 'মাসিক বেতন',
    'feeDetails.feeCategory': 'বেতন ক্যাটাগরি',
    'feeDetails.siblingStudentCode': 'ভাই/বোনের স্টুডেন্ট আইডি',
    'profilePicture.url': 'শিক্ষার্থীর ছবি',
    status: 'স্ট্যাটাস',
    statusReason: 'স্ট্যাটাস পরিবর্তনের কারণ'
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

    if (err.name === 'StrictModeError') {
        const badField = err.path || 'unknown';
        error = new ApiError(
            400,
            `অননুমোদিত বা অজানা ফিল্ড (${badField}) পাঠানো হয়েছে!`,
            [{ field: badField, message: 'এই ফিল্ডটি সিস্টেমে অনুমোদিত নয়' }]
        );
    }

    if (err.name === 'CastError') {
        const field = err.path || '';
        const label = FIELD_LABELS[field] || 'তথ্যের ফরম্যাট';
        error = new ApiError(
            400,
            `${label} সঠিক ফরম্যাটে নেই। অনুগ্রহ করে আবার যাচাই করুন।`,
            field ? [{ field, message: `${label} সঠিক ফরম্যাটে দিন` }] : []
        );
    }

    if (err.code === 11000) {
        const keys = Object.keys(err.keyValue || {});
        if (keys.includes('session') && keys.includes('classBn') && keys.includes('roll')) {
            error = new ApiError(
                409,
                'এই সেশন ও শ্রেণিতে প্রদত্ত রোল নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে।',
                [{ field: 'roll', message: 'এই শ্রেণিতে এই রোল নম্বর আগে থেকেই আছে' }]
            );
        } else {
            const field = keys[0] || '';
            const label = FIELD_LABELS[field] || 'এই তথ্য';
            const message = `${label} দিয়ে আগে থেকেই একটি রেকর্ড রয়েছে।`;
            error = new ApiError(
                409,
                message,
                field ? [{ field, message: `এই ${label} ইতিমধ্যে ব্যবহৃত হয়েছে` }] : []
            );
        }
    }

    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((el) => {
            const label = FIELD_LABELS[el.path] || 'এই তথ্য';
            const msg = el.kind === 'required'
                ? `${label} অবশ্যই দিতে হবে।`
                : el.kind === 'enum'
                    ? `${label} থেকে সঠিক অপশন নির্বাচন করুন।`
                    : /[\u0980-\u09FF]/.test(el.message)
                        ? el.message
                        : `${label} সঠিক নয়।`;
            return { field: el.path, message: msg };
        });
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
