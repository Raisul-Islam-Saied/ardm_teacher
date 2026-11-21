const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { STUDENT_CLASSES } = require('../constants/system.constants');

const isAdmin = (user) => ['SuperAdmin', 'Admin'].includes(user.role);

const getAppsScriptUrl = () => {
    const url = process.env.RESULTS_APPS_SCRIPT_URL;
    if (!url) {
        throw new ApiError(503, 'রেজাল্ট সার্ভিস কনফিগার করা হয়নি।');
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new ApiError(503, 'রেজাল্ট সার্ভিসের URL কনফিগারেশন সঠিক নয়।');
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new ApiError(503, 'রেজাল্ট সার্ভিসের URL কনফিগারেশন সঠিক নয়।');
    }
    return parsedUrl;
};

const getAdminKey = () => {
    if (!process.env.RESULTS_APPS_SCRIPT_ADMIN_KEY) {
        throw new ApiError(503, 'রেজাল্ট সার্ভিসের সার্ভার-সাইড ক্রেডেনশিয়াল কনফিগার করা হয়নি।');
    }
    return process.env.RESULTS_APPS_SCRIPT_ADMIN_KEY;
};

const parseRequestBody = (body) => {
    if (typeof body !== 'string') return body || {};
    try {
        return JSON.parse(body);
    } catch {
        throw new ApiError(400, 'অনুরোধের JSON তথ্য সঠিক নয়।');
    }
};

const callAppsScript = async ({ method = 'GET', query = {}, body, useAdminKey = false }) => {
    const url = getAppsScriptUrl();
    Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));

    let requestBody = body;
    if (useAdminKey) {
        requestBody = { ...body, key: getAdminKey() };
    }

    let response;
    try {
        response = await fetch(url, {
            method,
            ...(requestBody ? {
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(requestBody)
            } : {})
        });
    } catch {
        throw new ApiError(502, 'রেজাল্ট সার্ভিসে সংযোগ করা যায়নি।');
    }

    let result;
    try {
        result = await response.json();
    } catch {
        throw new ApiError(502, 'রেজাল্ট সার্ভিস থেকে সঠিক তথ্য পাওয়া যায়নি।');
    }

    if (!response.ok || result.status !== 'success') {
        const statusCode = response.status === 401 || response.status === 403 ? response.status : 502;
        throw new ApiError(statusCode, result.message || 'রেজাল্ট সার্ভিস অনুরোধটি সম্পন্ন করতে পারেনি।');
    }
    return result;
};

const getTeacherSheetPrefix = (user) => {
    const studentClass = STUDENT_CLASSES.find((item) => item.classBn === user.assignedClass);
    if (!studentClass) {
        throw new ApiError(403, 'আপনার অ্যাকাউন্টে কোনো শ্রেণি বরাদ্দ নেই।');
    }
    const className = ['Play', 'Nursery', 'KG'].includes(studentClass.classEn)
        ? studentClass.classEn
        : `Class ${studentClass.classEn}`;
    return `[${className}]`;
};

const validateSheetName = (sheetName) => {
    if (typeof sheetName !== 'string' || !sheetName.startsWith('[') || sheetName.length > 200) {
        throw new ApiError(400, 'রেজাল্ট শিটের নাম সঠিক নয়।');
    }
    return sheetName;
};

const getPublishTimestamp = (sheetName) => {
    const match = /^\[[^\]]+\]\[[^\]]+\]\[\d{4}\]\[[^\]]+\]\[(\d{13})\]/.exec(sheetName);
    return match ? Number(match[1]) : null;
};

const assertTeacherOwnsSheet = (user, sheetName) => {
    if (!isAdmin(user) && !sheetName.startsWith(getTeacherSheetPrefix(user))) {
        throw new ApiError(403, 'আপনি শুধু নিজের নির্ধারিত শ্রেণির রেজাল্ট দেখতে বা পরিবর্তন করতে পারবেন।');
    }
};

const assertTeacherCanManage = (user) => {
    if (!isAdmin(user) && !user.canEditAssignedClass) {
        throw new ApiError(403, 'আপনার নির্ধারিত শ্রেণির রেজাল্ট পরিবর্তনের অনুমতি নেই।');
    }
};

const getSheetNames = (result) => {
    if (!Array.isArray(result.data)) {
        throw new ApiError(502, 'রেজাল্ট সার্ভিস থেকে শিটের তালিকা সঠিকভাবে পাওয়া যায়নি।');
    }
    return result.data
        .filter((sheet) => sheet && typeof sheet.sheetName === 'string' && sheet.sheetName.startsWith('['))
        .map(({ sheetName }) => ({ sheetName }));
};

const listPublicExams = async (req, res) => {
    const result = await callAppsScript({ query: { role: 'public' } });
    const exams = getSheetNames(result);
    return res.status(200).json(new ApiResponse(200, 'প্রকাশিত রেজাল্টের তালিকা', {
        status: 'success',
        data: exams
    }));
};

const listExams = async (req, res) => {
    const result = await callAppsScript({ query: { role: 'public' } });
    let exams = getSheetNames(result);

    if (!isAdmin(req.user)) {
        const prefix = getTeacherSheetPrefix(req.user);
        exams = exams.filter((sheet) => sheet.sheetName.startsWith(prefix));
    }
    return res.status(200).json(new ApiResponse(200, 'রেজাল্টের তালিকা', {
        status: 'success',
        data: exams
    }));
};

const searchPublicSheet = async (req, res) => {
    const { sheetName } = parseRequestBody(req.body);
    const safeSheetName = validateSheetName(sheetName);
    const publishTimestamp = getPublishTimestamp(safeSheetName);
    if (!publishTimestamp || publishTimestamp > Date.now()) {
        throw new ApiError(403, 'এই পরীক্ষার রেজাল্ট এখনো প্রকাশিত হয়নি।');
    }

    const result = await callAppsScript({ query: { role: 'public' } });
    const isListed = getSheetNames(result).some((sheet) => sheet.sheetName === safeSheetName);
    if (!isListed) {
        throw new ApiError(404, 'রেজাল্ট শিটটি পাওয়া যায়নি।');
    }

    const sheet = await callAppsScript({
        method: 'POST',
        body: { action: 'search', sheetName: safeSheetName }
    });
    return res.status(200).json(new ApiResponse(200, 'রেজাল্ট শিটের তথ্য', sheet));
};

const performSheetAction = async (req, res) => {
    const payload = parseRequestBody(req.body);
    const { action } = payload;
    if (!['search', 'upload', 'delete'].includes(action)) {
        throw new ApiError(400, 'এই রেজাল্ট অপারেশনটি অনুমোদিত নয়।');
    }

    const sheetName = validateSheetName(payload.sheetName);
    assertTeacherOwnsSheet(req.user, sheetName);

    if (action === 'upload' && (!Array.isArray(payload.data) || payload.data.length === 0)) {
        throw new ApiError(400, 'আপলোড করার রেজাল্ট ডাটা পাওয়া যায়নি।');
    }

    if (action === 'upload' || action === 'delete') {
        assertTeacherCanManage(req.user);
    }

    if (action === 'delete') {
        const publishTimestamp = getPublishTimestamp(sheetName);
        if (!publishTimestamp || publishTimestamp <= Date.now()) {
            throw new ApiError(403, 'প্রকাশিত রেজাল্ট ডিলিট করা যাবে না।');
        }
    }

    const result = await callAppsScript({
        method: 'POST',
        body: { ...payload, sheetName, key: undefined },
        useAdminKey: true
    });
    return res.status(200).json(new ApiResponse(200, 'রেজাল্ট অপারেশন সম্পন্ন হয়েছে', result));
};

const logPublicSearch = async (req, res) => {
    const payload = parseRequestBody(req.body);
    if (payload.action !== 'log_search') {
        throw new ApiError(400, 'এই রেজাল্ট অপারেশনটি অনুমোদিত নয়।');
    }

    const result = await callAppsScript({
        method: 'POST',
        body: {
            action: 'log_search',
            searcherName: String(payload.searcherName || '').slice(0, 100),
            searcherId: String(payload.searcherId || '').slice(0, 30),
            className: String(payload.className || '').slice(0, 50),
            examName: String(payload.examName || '').slice(0, 100),
            year: String(payload.year || '').slice(0, 10),
            searchId: String(payload.searchId || '').slice(0, 50),
            stdName: String(payload.stdName || '').slice(0, 100),
            stdRoll: String(payload.stdRoll || '').slice(0, 30),
            stdId: String(payload.stdId || '').slice(0, 50)
        }
    });
    return res.status(200).json(new ApiResponse(200, 'সার্চ লগ সংরক্ষিত হয়েছে', result));
};

module.exports = {
    listPublicExams,
    listExams,
    searchPublicSheet,
    performSheetAction,
    logPublicSearch
};
