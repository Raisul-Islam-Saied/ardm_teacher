const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const PAGE_SIZE_MAX = 500;
const teacherSensitiveProjection = [
    '-password',
    '-editToken',
    '-passwordChangedAt',
    '-passwordResetTokenHash',
    '-passwordResetExpires',
    '-failedLoginAttempts',
    '-lockUntil',
    '-bankDetails',
    '-basicSalary',
    '-paymentMethod',
    '-customLeaveQuota'
].join(' ');
const studentSensitiveProjection = [
    '-password',
    '-editToken'
].join(' ');

const getPagination = (query) => {
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? 100 : Number(query.limit);
    if (
        !Number.isInteger(page) || page < 1 ||
        !Number.isInteger(limit) || limit < 1 || limit > PAGE_SIZE_MAX
    ) {
        throw new ApiError(400, `page অবশ্যই ১ বা তার বেশি এবং limit ১ থেকে ${PAGE_SIZE_MAX} এর মধ্যে দিন।`);
    }
    return { page, limit, skip: (page - 1) * limit };
};

const sendPaginatedResponse = async ({ Model, filter, projection, sort, pagination, resource, res }) => {
    const [totalCount, records] = await Promise.all([
        Model.countDocuments(filter),
        Model.find(filter)
            .select(projection)
            .sort(sort)
            .skip(pagination.skip)
            .limit(pagination.limit)
            .lean()
    ]);

    return res.status(200).json(new ApiResponse(200, `${resource} তালিকা পাওয়া গেছে`, {
        page: pagination.page,
        limit: pagination.limit,
        totalCount,
        totalPages: Math.ceil(totalCount / pagination.limit),
        [resource]: records
    }));
};

const getIntegrationTeachers = asyncHandler(async (req, res) => sendPaginatedResponse({
    Model: Teacher,
    filter: {},
    projection: teacherSensitiveProjection,
    sort: { createdAt: 1, _id: 1 },
    pagination: getPagination(req.query),
    resource: 'teachers',
    res
}));

const getIntegrationTeacher = asyncHandler(async (req, res) => {
    const filter = mongoose.Types.ObjectId.isValid(req.params.id)
        ? { _id: req.params.id }
        : { teacherCode: req.params.id };
    const teacher = await Teacher.findOne(filter).select(teacherSensitiveProjection).lean();
    if (!teacher) throw new ApiError(404, 'শিক্ষকের তথ্য পাওয়া যায়নি।');
    return res.status(200).json(new ApiResponse(200, 'শিক্ষকের তথ্য পাওয়া গেছে', { teacher }));
});

const getIntegrationStudents = asyncHandler(async (req, res) => {
    const allRecords = req.query.all;
    if (allRecords !== undefined && !['true', 'false'].includes(allRecords)) {
        throw new ApiError(400, 'all query parameter true অথবা false হতে হবে।');
    }

    const filter = { status: { $ne: 'Deleted' } };
    const sort = { session: -1, classOrder: 1, roll: 1, _id: 1 };
    if (allRecords === 'true') {
        if (req.query.page !== undefined || req.query.limit !== undefined) {
            throw new ApiError(400, 'all=true ব্যবহার করলে page বা limit পাঠাবেন না।');
        }
        const students = await Student.find(filter)
            .select(studentSensitiveProjection)
            .sort(sort)
            .lean();
        return res.status(200).json(new ApiResponse(200, 'সব শিক্ষার্থীর তথ্য পাওয়া গেছে', {
            all: true,
            totalCount: students.length,
            students
        }));
    }

    return sendPaginatedResponse({
        Model: Student,
        filter,
        projection: studentSensitiveProjection,
        sort,
        pagination: getPagination(req.query),
        resource: 'students',
        res
    });
});

const getIntegrationStudent = asyncHandler(async (req, res) => {
    const filter = mongoose.Types.ObjectId.isValid(req.params.id)
        ? { _id: req.params.id }
        : { studentCode: req.params.id };
    const student = await Student.findOne({
        ...filter,
        status: { $ne: 'Deleted' }
    }).select(studentSensitiveProjection).lean();
    if (!student) throw new ApiError(404, 'শিক্ষার্থীর তথ্য পাওয়া যায়নি।');
    return res.status(200).json(new ApiResponse(200, 'শিক্ষার্থীর তথ্য পাওয়া গেছে', { student }));
});

module.exports = {
    getIntegrationTeachers,
    getIntegrationTeacher,
    getIntegrationStudents,
    getIntegrationStudent
};
