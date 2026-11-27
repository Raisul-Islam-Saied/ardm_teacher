const ApiError = require('../utils/ApiError');
const SystemSettings = require('../models/SystemSettings');

const DEFAULT_STUDENT_PORTAL_SETTINGS = Object.freeze({
    onlyAdminResults: true,
    maintenanceMode: false,
    resultPublishTime: '2026-08-17T19:30:00+06:00',
    classTeacherPermissions: {
        ownClass: { add: true, edit: true, delete: true, export: true },
        otherClass: { add: false, edit: false, delete: false, export: false }
    },
    nonClassTeacherPermissions: { add: false, edit: false, delete: false, export: false }
});

const getStudentPortalSettings = async () => {
    const systemSettings = await SystemSettings.getSettings();
    const saved = systemSettings.studentPortal || {};
    const savedClassTeacher = saved.classTeacherPermissions || {};

    return {
        ...DEFAULT_STUDENT_PORTAL_SETTINGS,
        ...saved,
        classTeacherPermissions: {
            ownClass: {
                ...DEFAULT_STUDENT_PORTAL_SETTINGS.classTeacherPermissions.ownClass,
                ...(savedClassTeacher.ownClass || {})
            },
            otherClass: {
                ...DEFAULT_STUDENT_PORTAL_SETTINGS.classTeacherPermissions.otherClass,
                ...(savedClassTeacher.otherClass || {})
            }
        },
        nonClassTeacherPermissions: {
            ...DEFAULT_STUDENT_PORTAL_SETTINGS.nonClassTeacherPermissions,
            ...(saved.nonClassTeacherPermissions || {})
        }
    };
};

const validatePermissions = (permissions, fieldName) => {
    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
        throw new ApiError(400, `${fieldName} সঠিকভাবে দিতে হবে।`);
    }

    const result = {};
    for (const action of ['add', 'edit', 'delete', 'export']) {
        if (typeof permissions[action] !== 'boolean') {
            throw new ApiError(400, `${fieldName}.${action} অবশ্যই true অথবা false হতে হবে।`);
        }
        result[action] = permissions[action];
    }

    return result;
};

const validateStudentPortalSettings = (input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new ApiError(400, 'পোর্টাল সেটিংস সঠিকভাবে দিতে হবে।');
    }

    if (typeof input.onlyAdminResults !== 'boolean' || typeof input.maintenanceMode !== 'boolean') {
        throw new ApiError(400, 'রেজাল্ট ও মেইনটেন্যান্স সেটিং true অথবা false হতে হবে।');
    }

    if (typeof input.resultPublishTime !== 'string' || Number.isNaN(Date.parse(input.resultPublishTime))) {
        throw new ApiError(400, 'রেজাল্ট প্রকাশের বৈধ তারিখ ও সময় দিতে হবে।');
    }

    const classTeacherPermissions = input.classTeacherPermissions;
    if (!classTeacherPermissions || typeof classTeacherPermissions !== 'object') {
        throw new ApiError(400, 'ক্লাস শিক্ষকের অনুমতি দিতে হবে।');
    }

    return {
        onlyAdminResults: input.onlyAdminResults,
        maintenanceMode: input.maintenanceMode,
        resultPublishTime: input.resultPublishTime,
        classTeacherPermissions: {
            ownClass: validatePermissions(classTeacherPermissions.ownClass, 'নিজের ক্লাসের অনুমতি'),
            otherClass: validatePermissions(classTeacherPermissions.otherClass, 'অন্য ক্লাসের অনুমতি')
        },
        nonClassTeacherPermissions: validatePermissions(
            input.nonClassTeacherPermissions,
            'ক্লাস বরাদ্দ নেই এমন শিক্ষকের অনুমতি'
        )
    };
};

const updateStudentPortalSettings = async (input, updatedBy) => {
    const studentPortal = validateStudentPortalSettings(input);
    await SystemSettings.findOneAndUpdate(
        { key: 'GLOBAL_SETTINGS' },
        {
            $set: {
                studentPortal,
                updatedBy
            }
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return studentPortal;
};

module.exports = {
    DEFAULT_STUDENT_PORTAL_SETTINGS,
    getStudentPortalSettings,
    updateStudentPortalSettings
};
