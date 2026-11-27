const moment = require('moment-timezone');
const Teacher = require('../models/Teacher');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const SalaryHistory = require('../models/SalaryHistory');
const LeaveRequest = require('../models/LeaveRequest');
const LoanAdvance = require('../models/LoanAdvance');
const SystemSettings = require('../models/SystemSettings');
const AuditLog = require('../models/AuditLog');
const {
    ATTENDANCE_STATUS,
    DESIGNATION_DETAILS,
    BLOOD_GROUPS,
    PAYMENT_METHODS,
    ROLES
} = require('../constants/system.constants');
const {
    generateTenDigitTeacherId,
    getNextAvailableBiometricId,
    recalculateAllTeachersRank,
    generateRegistryTokens
} = require('../services/teacher.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// =========================================================================
// সিকিউরিটি ও ডাটা স্যানিটাইজেশন হেল্পারসমূহ
// =========================================================================

const OPTIONAL_ENUM_FIELDS = new Set(['gender', 'religion', 'bloodGroup', 'maritalStatus']);

const ADDRESS_ALLOWED_FIELDS = [
    'houseNameBn', 'houseNameEn', 'villageBn', 'villageEn', 'unionBn', 'unionEn', 'wardNo',
    'upazilaBn', 'upazilaEn', 'districtBn', 'districtEn', 'divisionBn', 'divisionEn',
    'houseOrRoad', 'village', 'postOffice', 'postCode', 'upazila', 'district'
];

const PUBLIC_REGISTER_ALLOWED_FIELDS = [
    'fullNameBng', 'fullNameEng',
    'fathersNameBng', 'fathersNameEng',
    'mothersNameBng', 'mothersNameEng',
    'dateOfBirth', 'gender', 'religion', 'bloodGroup', 'maritalStatus',
    'nidNumber', 'birthRegNumber', 'indexNumber',
    'phone', 'email', 'designation', 'subject', 'joiningDate',
    'academicQualifications'
];

const ADMIN_REGISTER_ALLOWED_FIELDS = [
    ...PUBLIC_REGISTER_ALLOWED_FIELDS,
    'assignedClass', 'canEditAssignedClass', 'employmentType',
    'basicSalary', 'paymentMethod', 'customLeaveQuota'
];

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sanitizeFieldValue = (field, value) => {
    if (OPTIONAL_ENUM_FIELDS.has(field) && (value === '' || value === null)) {
        return undefined;
    }
    return value;
};

const pickAllowed = (source = {}, allowedKeys = []) => {
    const result = {};
    for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
            const cleanVal = sanitizeFieldValue(key, source[key]);
            if (cleanVal !== undefined) {
                result[key] = cleanVal;
            }
        }
    }
    return result;
};

const pickNested = (source, allowedKeys) => {
    if (!source || typeof source !== 'object') return undefined;
    return pickAllowed(source, allowedKeys);
};

const stripSensitiveFields = (teacherDoc) => {
    const obj = teacherDoc?.toObject ? teacherDoc.toObject() : { ...teacherDoc };
    delete obj.password;
    delete obj.editToken;
    delete obj.passwordChangedAt;
    delete obj.failedLoginAttempts;
    delete obj.lockUntil;
    return obj;
};

// ০. পদবীর তালিকা (বাংলা ও ইংরেজি সহ) এবং মেটাডেটা পাওয়ার এন্ডপয়েন্ট
const getRegistrationMetadata = asyncHandler(async (req, res) => {
    const nextBioId = await getNextAvailableBiometricId();
    res.status(200).json(new ApiResponse(200, 'রেজিস্ট্রেশন মেটাডেটা সফলভাবে পাওয়া গেছে', {
        designations: DESIGNATION_DETAILS,
        bloodGroups: BLOOD_GROUPS,
        nextSuggestedBiometricDeviceId: nextBioId
    }));
});

// ১. অ্যাডমিন কর্তৃক নতুন শিক্ষক/স্টাফ নিবন্ধন (সরাসরি Approved)
const registerTeacher = asyncHandler(async (req, res) => {
    const {
        teacherCode,
        biometricDeviceId,
        phone,
        nidNumber,
        birthRegNumber,
        email,
        indexNumber,
        dateOfBirth,
        joiningDate,
        designation,
        password
    } = req.body;

    if (req.body.role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
        throw new ApiError(403, 'সুপার অ্যাডমিন অ্যাকাউন্ট তৈরির অনুমতি শুধু বর্তমান সুপার অ্যাডমিনের রয়েছে।');
    }

    // ডুপ্লিকেট চেক (ফোন, এনআইডি, জন্ম নিবন্ধন, ইমেইল, ইনডেক্স নম্বর)
    const orConditions = [{ phone }];
    if (nidNumber) orConditions.push({ nidNumber });
    if (birthRegNumber) orConditions.push({ birthRegNumber });
    if (email) orConditions.push({ email });
    if (indexNumber) orConditions.push({ indexNumber });

    const existingDuplicate = await Teacher.findOne({ $or: orConditions }).lean();
    if (existingDuplicate) {
        throw new ApiError(409, 'প্রদত্ত মোবাইল নম্বর, NID, জন্ম নিবন্ধন, ইমেইল অথবা ইনডেক্স নম্বর দিয়ে ইতিমধ্যে একজন শিক্ষক নিবন্ধিত আছেন!');
    }

    // ১০ সংখ্যার টিচার আইডি ও বায়োমেট্রিক ডিভাইস আইডি অটো-জেনারেশন (যদি না দেওয়া থাকে)
    const finalTeacherCode = teacherCode || await generateTenDigitTeacherId(joiningDate, dateOfBirth, designation);
    const finalBiometricId = biometricDeviceId ? Number(biometricDeviceId) : await getNextAvailableBiometricId();

    const bioConflict = await Teacher.findOne({
        $or: [{ teacherCode: finalTeacherCode }, { biometricDeviceId: finalBiometricId }]
    }).lean();
    if (bioConflict) {
        throw new ApiError(409, `টিচার আইডি (${finalTeacherCode}) অথবা বায়োমেট্রিক আইডি (${finalBiometricId}) ইতিমধ্যে ব্যবহৃত হয়েছে!`);
    }

    const { uid, editToken } = generateRegistryTokens();

    // শুধুমাত্র অনুমোদিত ফিল্ড গ্রহণ (Mass-Assignment প্রোটেকশন)
    const safePayload = {
        ...pickAllowed(req.body, ADMIN_REGISTER_ALLOWED_FIELDS),
        emergencyContact: pickNested(req.body.emergencyContact, ['contactName', 'relationship', 'phone']),
        presentAddress: pickNested(req.body.presentAddress, ADDRESS_ALLOWED_FIELDS),
        permanentAddress: pickNested(req.body.permanentAddress, ADDRESS_ALLOWED_FIELDS),
        bankDetails: pickNested(req.body.bankDetails, ['bankName', 'branchName', 'accountHolderName', 'accountNumber', 'routingNumber']),
        profilePicture: pickNested(req.body.profilePicture, ['url', 'publicId']),
        password: String(password).trim(),
        teacherCode: finalTeacherCode,
        biometricDeviceId: finalBiometricId,
        uid,
        editToken,
        role: req.body.role || ROLES.TEACHER,
        registrationStatus: 'Approved',
        isActive: true
    };

    const teacher = await Teacher.create(safePayload);

    // সমগ্র মাদ্রাসার র‍্যাংকিং (1, 2, 3...) পুনরায় সাজানো
    await recalculateAllTeachersRank();
    const updatedTeacher = await Teacher.findById(teacher._id);

    await AuditLog.recordLog({
        req,
        action: 'REGISTER_TEACHER',
        module: 'Teacher',
        targetId: String(teacher._id),
        description: `নতুন শিক্ষক নিবন্ধিত হয়েছেন: ${teacher.fullNameBng} (ID: ${finalTeacherCode}, Rank: #${updatedTeacher.rankingMetrics.overallMadrasahRank})`
    });

    res.status(201).json(new ApiResponse(201, 'শিক্ষক সফলভাবে নিবন্ধিত হয়েছেন এবং র‍্যাংক নির্ধারিত হয়েছে!', updatedTeacher));
});

// ২. পাবলিক সেল্ফ-রেজিস্ট্রেশন (Pending মোডে থাকবে এবং ডিজিটাল আইডি কার্ড পাবে)
const publicSelfRegisterTeacher = asyncHandler(async (req, res) => {
    const {
        phone,
        nidNumber,
        birthRegNumber,
        email,
        indexNumber,
        dateOfBirth,
        joiningDate,
        designation,
        password
    } = req.body;

    const orConditions = [{ phone }];
    if (nidNumber) orConditions.push({ nidNumber });
    if (birthRegNumber) orConditions.push({ birthRegNumber });
    if (email) orConditions.push({ email });
    if (indexNumber) orConditions.push({ indexNumber });

    const existingDuplicate = await Teacher.findOne({ $or: orConditions }).lean();
    if (existingDuplicate) {
        throw new ApiError(409, 'প্রদত্ত মোবাইল নম্বর, NID, জন্ম নিবন্ধন অথবা ইমেইল দিয়ে ইতিমধ্যে নিবন্ধন করা হয়েছে!');
    }

    const finalTeacherCode = await generateTenDigitTeacherId(joiningDate, dateOfBirth, designation);
    const finalBiometricId = await getNextAvailableBiometricId();
    const { uid, editToken } = generateRegistryTokens();

    // পাবলিক রিকোয়েস্টে কঠোর হোয়াইটলিস্টিং (রোল, বেতন, কোটা ইত্যাদি ইনজেকশন ব্লক)
    const safePayload = {
        ...pickAllowed(req.body, PUBLIC_REGISTER_ALLOWED_FIELDS),
        emergencyContact: pickNested(req.body.emergencyContact, ['contactName', 'relationship', 'phone']),
        presentAddress: pickNested(req.body.presentAddress, ADDRESS_ALLOWED_FIELDS),
        permanentAddress: pickNested(req.body.permanentAddress, ADDRESS_ALLOWED_FIELDS),
        profilePicture: pickNested(req.body.profilePicture, ['url', 'publicId']),
        password: String(password).trim(),
        teacherCode: finalTeacherCode,
        biometricDeviceId: finalBiometricId,
        uid,
        editToken,
        role: ROLES.TEACHER,
        basicSalary: 0, // অ্যাডমিন অ্যাপ্রুভ করার সময় মূল বেতন বসাবেন
        registrationStatus: 'Pending',
        isActive: false
    };

    const teacher = await Teacher.create(safePayload);

    res.status(201).json(new ApiResponse(201, 'আপনার নিবন্ধন সফলভাবে জমা হয়েছে এবং ডিজিটাল রেজিস্ট্রি কার্ড তৈরি হয়েছে!', {
        teacherId: teacher.teacherCode,
        uid: teacher.uid,
        editToken,
        registrationStatus: teacher.registrationStatus,
        teacher: stripSensitiveFields(teacher)
    }));
});

// ৩. UID দিয়ে পাবলিক রেজিস্ট্রি কার্ড দেখা
const getPublicRegistryCardByUid = asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const teacher = await Teacher.findOne({ uid })
        .select([
            'uid',
            'teacherCode',
            'biometricDeviceId',
            'fullNameBng',
            'fullNameEng',
            'fathersNameBng',
            'fathersNameEng',
            'mothersNameBng',
            'mothersNameEng',
            'dateOfBirth',
            'bloodGroup',
            'nidNumber',
            'birthRegNumber',
            'phone',
            'emergencyContact.contactName',
            'emergencyContact.phone',
            'designation',
            'subject',
            'joiningDate',
            'academicQualifications',
            'rankingMetrics.overallMadrasahRank',
            'presentAddress',
            'profilePicture.url',
            'registrationStatus',
            'createdAt'
        ].join(' '))
        .lean();
    if (!teacher) {
        throw new ApiError(404, 'এই UID দিয়ে কোনো নিবন্ধিত রেকর্ড পাওয়া যায়নি!');
    }
    res.status(200).json(new ApiResponse(200, 'রেজিস্ট্রি কার্ড সফলভাবে লোড হয়েছে', teacher));
});

// ৪. অ্যাডমিন কর্তৃক Pending শিক্ষকের রেজিস্ট্রেশন অনুমোদন ও মূল বেতন নির্ধারণ
const approvePendingTeacher = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        basicSalary,
        biometricDeviceId,
        customLeaveQuota,
        paymentMethod,
        employmentType,
        bankDetails,
        assignedClass,
        canEditAssignedClass,
        role
    } = req.body;

    const parsedSalary = Number(basicSalary);
    if (basicSalary === undefined || !Number.isFinite(parsedSalary) || parsedSalary < 0) {
        throw new ApiError(400, 'অনুমোদনের সময় শিক্ষকের সঠিক মূল বেতন (basicSalary) প্রদান করা আবশ্যক!');
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }

    if (
        req.user.role !== ROLES.SUPER_ADMIN
        && (teacher.role === ROLES.SUPER_ADMIN || role === ROLES.SUPER_ADMIN)
    ) {
        throw new ApiError(403, 'সুপার অ্যাডমিন অ্যাকাউন্ট পরিবর্তন বা নির্ধারণের অনুমতি শুধু সুপার অ্যাডমিনের রয়েছে।');
    }

    if (biometricDeviceId !== undefined && biometricDeviceId !== null && biometricDeviceId !== '') {
        const parsedBioId = Number(biometricDeviceId);
        if (!Number.isInteger(parsedBioId) || parsedBioId < 1) {
            throw new ApiError(400, 'বায়োমেট্রিক ডিভাইস আইডি অবশ্যই ১ বা তার বেশি পূর্ণসংখ্যা হতে হবে।');
        }
        const conflict = await Teacher.findOne({
            _id: { $ne: teacher._id },
            biometricDeviceId: parsedBioId
        }).lean();
        if (conflict) {
            throw new ApiError(409, `বায়োমেট্রিক আইডি (${parsedBioId}) ইতিমধ্যে অন্য শিক্ষকের জন্য ব্যবহৃত হয়েছে!`);
        }
        teacher.biometricDeviceId = parsedBioId;
    }

    if (customLeaveQuota !== undefined && customLeaveQuota !== null && customLeaveQuota !== '') {
        const parsedQuota = Number(customLeaveQuota);
        if (!Number.isFinite(parsedQuota) || parsedQuota < 0 || parsedQuota > 15) {
            throw new ApiError(400, 'ছুটির কোটা ০ থেকে ১৫ এর মধ্যে হতে হবে।');
        }
        teacher.customLeaveQuota = parsedQuota;
    }

    if (paymentMethod) {
        if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
            throw new ApiError(400, 'পেমেন্ট মেথড সঠিক নয়।');
        }
        teacher.paymentMethod = paymentMethod;
    }

    if (employmentType) teacher.employmentType = employmentType;
    if (assignedClass !== undefined) {
        teacher.assignedClass = assignedClass;
        teacher.canEditAssignedClass = Boolean(assignedClass && canEditAssignedClass);
    } else if (canEditAssignedClass !== undefined) {
        teacher.canEditAssignedClass = Boolean(teacher.assignedClass && canEditAssignedClass);
    }
    if (role) teacher.role = role;
    if (bankDetails && typeof bankDetails === 'object') {
        const existingBankDetails = teacher.bankDetails?.toObject
            ? teacher.bankDetails.toObject()
            : teacher.bankDetails || {};
        teacher.bankDetails = { ...existingBankDetails, ...bankDetails };
    }

    teacher.basicSalary = parsedSalary;
    teacher.registrationStatus = 'Approved';
    teacher.isActive = true;

    await teacher.save();
    await recalculateAllTeachersRank();

    const updated = await Teacher.findById(id);

    await AuditLog.recordLog({
        req,
        action: 'APPROVE_TEACHER_REGISTRATION',
        module: 'Teacher',
        targetId: String(teacher._id),
        description: `${teacher.fullNameBng}-এর নিবন্ধন অনুমোদন করা হয়েছে (বেতন: ${parsedSalary} টাকা, শ্রেণি: ${updated.assignedClass || 'নেই'}, অ্যাক্সেস: ${updated.role}, Rank: #${updated.rankingMetrics.overallMadrasahRank})`
    });

    res.status(200).json(new ApiResponse(200, 'শিক্ষকের নিবন্ধন অনুমোদিত হয়েছে এবং র‍্যাংক নির্ধারিত হয়েছে!', updated));
});

// ৫. সকল শিক্ষক/স্টাফের তালিকা (র‍্যাংক অনুযায়ী সাজানো)
const getAllTeachers = asyncHandler(async (req, res) => {
    const { isActive, designation, staffCategory, registrationStatus, search } = req.query;
    const filter = {};

    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (designation) filter.designation = designation;
    if (staffCategory) filter.staffCategory = staffCategory;
    if (registrationStatus) filter.registrationStatus = registrationStatus;

    if (search && String(search).trim()) {
        const safeRegex = escapeRegex(String(search).trim());
        filter.$or = [
            { fullNameBng: { $regex: safeRegex, $options: 'i' } },
            { fullNameEng: { $regex: safeRegex, $options: 'i' } },
            { teacherCode: { $regex: safeRegex, $options: 'i' } },
            { phone: { $regex: safeRegex, $options: 'i' } }
        ];
    }

    const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role);

    // সাধারণ শিক্ষকদের জন্য শুধুমাত্র সক্রিয় ও অনুমোদিত শিক্ষকদের সাধারণ তথ্য পাঠানো হবে
    if (!isAdmin) {
        filter.isActive = true;
        filter.registrationStatus = 'Approved';
    }

    const query = Teacher.find(filter)
        .sort({
            'rankingMetrics.overallMadrasahRank': 1,
            'rankingMetrics.designationPriority': 1,
            biometricDeviceId: 1
        });

    if (!isAdmin) {
        query.select([
            'teacherCode', 'uid', 'fullNameBng', 'fullNameEng',
            'gender', 'bloodGroup', 'phone', 'email',
            'designation', 'designationBng', 'staffCategory',
            'subject', 'assignedClass', 'joiningDate',
            'academicQualifications.degreeLevel', 'academicQualifications.examTitle',
            'academicQualifications.majorOrGroup', 'academicQualifications.boardOrUniversity',
            'academicQualifications.passingYear',
            'rankingMetrics.overallMadrasahRank', 'rankingMetrics.designationPriority',
            'profilePicture', 'isActive', 'registrationStatus'
        ].join(' '));
    }

    const teachers = await query.lean();

    res.status(200).json(new ApiResponse(200, 'র‍্যাংক অনুযায়ী শিক্ষকদের তালিকা সফলভাবে পাওয়া গেছে', {
        totalCount: teachers.length,
        teachers
    }));
});

// ৬. এক ক্লিকে সবার র‍্যাংকিং পুনরায় ক্যালকুলেট করার এন্ডপয়েন্ট
const triggerRankRecalculation = asyncHandler(async (req, res) => {
    const totalRanked = await recalculateAllTeachersRank();
    res.status(200).json(new ApiResponse(200, 'সকল শিক্ষকের পদবী, শিক্ষাগত যোগ্যতা ও GPA অনুযায়ী র‍্যাংকিং সফলভাবে আপডেট করা হয়েছে!', { totalRanked }));
});

// ৭. একক শিক্ষকের বিস্তারিত প্রোফাইল (অ্যাডমিন ও নিজের জন্য পূর্ণ তথ্য, অন্য শিক্ষকের জন্য সাধারণ তথ্য)
const getTeacherById = asyncHandler(async (req, res) => {
    const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role);
    const isSelf = String(req.user._id) === String(req.params.id);

    const query = Teacher.findById(req.params.id);

    if (!isAdmin && !isSelf) {
        query.select([
            'teacherCode', 'uid', 'fullNameBng', 'fullNameEng',
            'gender', 'bloodGroup', 'phone', 'email',
            'designation', 'designationBng', 'staffCategory',
            'subject', 'assignedClass', 'joiningDate',
            'academicQualifications.degreeLevel', 'academicQualifications.examTitle',
            'academicQualifications.majorOrGroup', 'academicQualifications.boardOrUniversity',
            'academicQualifications.passingYear',
            'rankingMetrics.overallMadrasahRank', 'rankingMetrics.designationPriority',
            'profilePicture', 'isActive', 'registrationStatus'
        ].join(' '));
    }

    const teacher = await query.lean();
    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }
    if (!isAdmin && !isSelf && (teacher.isActive === false || teacher.registrationStatus !== 'Approved')) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }

    res.status(200).json(new ApiResponse(200, 'শিক্ষকের তথ্য পাওয়া গেছে', teacher));
});

const resetTeacherPassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.body;
    const trimmedPassword = typeof newPassword === 'string' ? newPassword.trim() : '';
    if (trimmedPassword.length < 6 || trimmedPassword.length > 64) {
        throw new ApiError(400, 'নতুন পাসওয়ার্ড ৬ থেকে ৬৪ অক্ষরের মধ্যে হতে হবে।');
    }

    const teacher = await Teacher.findById(req.params.id)
        .select('+password +passwordResetTokenHash +passwordResetExpires +failedLoginAttempts +lockUntil');
    if (!teacher) throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    if (
        [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(teacher.role) &&
        req.user.role !== ROLES.SUPER_ADMIN
    ) {
        throw new ApiError(403, 'অ্যাডমিন অ্যাকাউন্টের পাসওয়ার্ড শুধু সুপার অ্যাডমিন পরিবর্তন করতে পারবেন।');
    }

    teacher.password = trimmedPassword;
    teacher.passwordResetTokenHash = undefined;
    teacher.passwordResetExpires = undefined;
    teacher.failedLoginAttempts = 0;
    teacher.lockUntil = null;
    await teacher.save();
    await AuditLog.create({
        action: 'TEACHER_PASSWORD_RESET',
        module: 'Security',
        description: `${teacher.teacherCode} শিক্ষকের পোর্টাল পাসওয়ার্ড রিসেট করা হয়েছে`,
        performedBy: req.user._id,
        targetTeacherId: teacher._id,
        ipAddress: req.ip
    });

    return res.status(200).json(new ApiResponse(200, 'শিক্ষকের পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!'));
});

function getEmploymentHistory(teacher) {
    return (teacher.employmentHistory || []).map((period) => ({
        startDate: period.startDate,
        endDate: period.endDate || null
    }));
}

function findOpenEmploymentPeriodIndex(history) {
    for (let index = history.length - 1; index >= 0; index -= 1) {
        if (!history[index].endDate) return index;
    }
    return -1;
}

function closeEmploymentPeriod(teacher, fallbackStartDate, endDate) {
    const history = getEmploymentHistory(teacher);
    const end = new Date(endDate);
    const openIndex = findOpenEmploymentPeriodIndex(history);

    if (openIndex >= 0) {
        if (new Date(history[openIndex].startDate) > end) {
            throw new ApiError(400, 'চাকরি ছাড়ার তারিখ যোগদানের তারিখের আগে হতে পারবে না।');
        }
        history[openIndex].endDate = end;
    } else {
        const startDate = fallbackStartDate ? new Date(fallbackStartDate) : null;
        if (!startDate || Number.isNaN(startDate.getTime()) || startDate > end) {
            throw new ApiError(400, 'চাকরির মেয়াদের যোগদান ও ছাড়ার তারিখ সঠিক নয়।');
        }
        history.push({ startDate, endDate: end });
    }

    teacher.set('employmentHistory', history);
}

function startEmploymentPeriod(
    teacher,
    startDate,
    fallbackPreviousJoiningDate = teacher.joiningDate,
    fallbackPreviousEndDate = teacher.resignationDate
) {
    if (!startDate) {
        throw new ApiError(400, 'পুনরায় সক্রিয় করার আগে নতুন যোগদানের তারিখ দিন।');
    }
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
        throw new ApiError(400, 'পুনরায় যোগদানের তারিখ সঠিক নয়।');
    }

    const history = getEmploymentHistory(teacher);
    if (history.length === 0 && fallbackPreviousJoiningDate && fallbackPreviousEndDate) {
        history.push({
            startDate: fallbackPreviousJoiningDate,
            endDate: fallbackPreviousEndDate
        });
    }
    const lastPeriod = history[history.length - 1];
    const previousEnd = lastPeriod?.endDate || fallbackPreviousEndDate;
    if (previousEnd && start <= new Date(previousEnd)) {
        throw new ApiError(400, 'পুনরায় যোগদানের তারিখ আগের চাকরির শেষ তারিখের পরের দিন বা তার পরে হতে হবে।');
    }

    history.push({ startDate: start, endDate: null });
    teacher.set('employmentHistory', history);
    teacher.joiningDate = start;
    teacher.resignationDate = null;
}

// ৮. শিক্ষকের তথ্য আপডেট এবং স্বয়ংক্রিয় র‍্যাংক পুনর্বিন্যাস
const updateTeacher = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }
    if (
        req.user.role !== ROLES.SUPER_ADMIN &&
        (teacher.role === ROLES.SUPER_ADMIN || req.body.role === ROLES.SUPER_ADMIN)
    ) {
        throw new ApiError(403, 'সুপার অ্যাডমিন অ্যাকাউন্ট পরিবর্তন বা নির্ধারণের অনুমতি শুধু সুপার অ্যাডমিনের রয়েছে।');
    }

    // ইউনিক ফিল্ডের ডুপ্লিকেট চেক (নিজেকে বাদ দিয়ে)
    const uniqueOrConditions = [];
    if (req.body.phone && req.body.phone !== teacher.phone) uniqueOrConditions.push({ phone: req.body.phone });
    if (req.body.nidNumber && req.body.nidNumber !== teacher.nidNumber) uniqueOrConditions.push({ nidNumber: req.body.nidNumber });
    if (req.body.birthRegNumber && req.body.birthRegNumber !== teacher.birthRegNumber) uniqueOrConditions.push({ birthRegNumber: req.body.birthRegNumber });
    if (req.body.email && req.body.email !== teacher.email) uniqueOrConditions.push({ email: req.body.email });
    if (req.body.indexNumber && req.body.indexNumber !== teacher.indexNumber) uniqueOrConditions.push({ indexNumber: req.body.indexNumber });
    if (req.body.biometricDeviceId && Number(req.body.biometricDeviceId) !== teacher.biometricDeviceId) {
        uniqueOrConditions.push({ biometricDeviceId: Number(req.body.biometricDeviceId) });
    }

    if (uniqueOrConditions.length > 0) {
        const duplicate = await Teacher.findOne({
            _id: { $ne: teacher._id },
            $or: uniqueOrConditions
        }).lean();
        if (duplicate) {
            throw new ApiError(409, 'প্রদত্ত মোবাইল নম্বর, NID, জন্ম নিবন্ধন, ইমেইল, ইনডেক্স অথবা বায়োমেট্রিক আইডি ইতিমধ্যে অন্য শিক্ষকের জন্য ব্যবহৃত হয়েছে!');
        }
    }

    const wasActive = teacher.isActive !== false;
    const previousJoiningDate = teacher.joiningDate;
    const previousResignationDate = teacher.resignationDate;

    const editableFields = [
        'fullNameBng', 'fullNameEng',
        'fathersNameBng', 'fathersNameEng',
        'mothersNameBng', 'mothersNameEng',
        'dateOfBirth', 'gender', 'religion', 'bloodGroup', 'maritalStatus',
        'nidNumber', 'birthRegNumber', 'indexNumber',
        'phone', 'email', 'designation', 'subject',
        'assignedClass', 'canEditAssignedClass', 'employmentType',
        'joiningDate', 'resignationDate', 'academicQualifications',
        'basicSalary', 'paymentMethod', 'customLeaveQuota',
        'biometricDeviceId', 'role', 'registrationStatus', 'isActive'
    ];

    editableFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            teacher.set(field, sanitizeFieldValue(field, req.body[field]));
        }
    });

    const editableNestedFields = {
        emergencyContact: ['contactName', 'relationship', 'phone'],
        presentAddress: ADDRESS_ALLOWED_FIELDS,
        permanentAddress: ADDRESS_ALLOWED_FIELDS,
        bankDetails: ['bankName', 'branchName', 'accountHolderName', 'accountNumber', 'routingNumber']
    };

    Object.entries(editableNestedFields).forEach(([field, allowedFields]) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field) && req.body[field] && typeof req.body[field] === 'object') {
            const existingValue = teacher[field];
            const existing = existingValue?.toObject
                ? existingValue.toObject()
                : existingValue || {};
            const changes = Object.fromEntries(
                allowedFields
                    .filter((key) => Object.prototype.hasOwnProperty.call(req.body[field], key))
                    .map((key) => [key, req.body[field][key]])
            );
            teacher.set(field, { ...existing, ...changes });
        }
    });

    // পার্শিয়াল আপডেটের পরও নিজস্ব নম্বর ও জরুরি নম্বর ভিন্ন থাকা নিশ্চিত করা
    if (
        teacher.phone
        && teacher.emergencyContact?.phone
        && String(teacher.phone).trim() === String(teacher.emergencyContact.phone).trim()
    ) {
        throw new ApiError(400, 'জরুরি যোগাযোগের নম্বরটি শিক্ষকের নিজের মোবাইল নম্বরের থেকে অবশ্যই আলাদা হতে হবে!');
    }

    if (req.body.isActive === false && wasActive) {
        if (!teacher.resignationDate) teacher.resignationDate = new Date();
        closeEmploymentPeriod(teacher, previousJoiningDate, teacher.resignationDate);
    } else if (req.body.isActive === true && !wasActive) {
        startEmploymentPeriod(
            teacher,
            req.body.joiningDate,
            previousJoiningDate,
            previousResignationDate
        );
    } else if (req.body.isActive === true) {
        teacher.resignationDate = null;
        if (req.body.joiningDate) {
            const history = getEmploymentHistory(teacher);
            const openIndex = findOpenEmploymentPeriodIndex(history);
            if (openIndex >= 0) {
                history[openIndex].startDate = teacher.joiningDate;
                teacher.set('employmentHistory', history);
            }
        }
    }

    await teacher.save();
    await recalculateAllTeachersRank();

    const updated = await Teacher.findById(req.params.id);
    await AuditLog.recordLog({
        req,
        action: 'UPDATE_TEACHER_PROFILE',
        module: 'Teacher',
        targetId: String(teacher._id),
        description: `${teacher.fullNameBng}-এর পূর্ণ প্রোফাইল ও অ্যাকাউন্ট কন্ট্রোল হালনাগাদ করা হয়েছে`
    });
    res.status(200).json(new ApiResponse(200, 'শিক্ষকের তথ্য ও র‍্যাংক সফলভাবে আপডেট করা হয়েছে', updated));
});

// ৯. শিক্ষককে নিষ্ক্রিয়/সক্রিয় করা (Soft Deactivate)
const toggleTeacherActiveStatus = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }

    if (teacher.isActive !== false) {
        const resignationDate = new Date();
        closeEmploymentPeriod(teacher, teacher.joiningDate, resignationDate);
        teacher.isActive = false;
        teacher.resignationDate = resignationDate;
    } else {
        startEmploymentPeriod(teacher, req.body.joiningDate);
        teacher.isActive = true;
    }
    await teacher.save();
    await recalculateAllTeachersRank();

    res.status(200).json(new ApiResponse(200, `শিক্ষকের অ্যাকাউন্ট এখন ${teacher.isActive ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'} করা হয়েছে`, teacher));
});

// ১০. শিক্ষক পোর্টাল (Self-Service): নিজের পূর্ণাঙ্গ ড্যাশবোর্ড
const getMyPortalDashboard = asyncHandler(async (req, res) => {
    const teacherId = req.user._id;
    const now = moment.tz('Asia/Dhaka');
    const parsedMonth = Number(req.query.month || (now.month() + 1));
    const parsedYear = Number(req.query.year || now.year());
    const month = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
        ? parsedMonth
        : (now.month() + 1);
    const year = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
        ? parsedYear
        : now.year();
    const todayStr = now.format('YYYY-MM-DD');

    const startDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').startOf('month').format('YYYY-MM-DD');
    const endDate = moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').endOf('month').format('YYYY-MM-DD');

    const settings = await SystemSettings.getSettings();

    const [
        teacherProfile,
        todayAttendance,
        monthlyLogs,
        allTimeSalaries,
        salaryRevisions,
        recentApplications,
        activeLoans
    ] = await Promise.all([
        Teacher.findById(teacherId).lean(),
        Attendance.findOne({ teacherId, date: todayStr }).lean(),
        Attendance.find({ teacherId, date: { $gte: startDate, $lte: endDate } }).sort({ date: -1 }).lean(),
        Salary.find({ teacherId }).sort({ year: -1, month: -1 }).lean(),
        SalaryHistory.find({ teacherId }).sort({ createdAt: -1 }).lean(),
        LeaveRequest.find({ teacherId }).sort({ createdAt: -1 }).limit(15).lean(),
        LoanAdvance.find({ teacherId, status: 'Active' }).lean()
    ]);

    if (!teacherProfile) {
        throw new ApiError(404, 'শিক্ষকের প্রোফাইল খুঁজে পাওয়া যায়নি!');
    }

    let presentDays = 0;
    let lateDays = 0;
    let leaveDays = 0;
    let absentDays = 0;
    let quotaUsed = 0;
    let directPenaltyDays = 0;

    for (const log of monthlyLogs) {
        if (log.isIgnored) continue;
        if (
            log.status === ATTENDANCE_STATUS.PRESENT ||
            log.status === ATTENDANCE_STATUS.EXCUSED_LATE ||
            log.status === ATTENDANCE_STATUS.OFFICIAL_DUTY ||
            log.status === ATTENDANCE_STATUS.HOLIDAY_DUTY
        ) {
            presentDays++;
        } else if (log.status === ATTENDANCE_STATUS.LATE) {
            lateDays++;
            quotaUsed += log.deductionWeight;
        } else if (log.status === ATTENDANCE_STATUS.LEAVE) {
            leaveDays++;
            quotaUsed += log.deductionWeight;
        } else if (log.status === ATTENDANCE_STATUS.ABSENT) {
            absentDays++;
            directPenaltyDays += (log.directSalaryPenaltyDays || 1.0);
        }
    }

    const allowedQuota = teacherProfile.customLeaveQuota ?? settings.attendancePolicy.monthlyPaidLeaveQuota;
    const quotaRemaining = Math.max(0, Number((allowedQuota - quotaUsed).toFixed(2)));
    const excessQuotaCutDays = Math.max(0, Number((quotaUsed - allowedQuota).toFixed(2)));
    const totalDaysForSalaryCut = Number((excessQuotaCutDays + directPenaltyDays).toFixed(2));

    const daysInSelectedMonth = settings.payrollPolicy?.useExactCalendarDays !== false
        ? moment.tz(`${year}-${String(month).padStart(2, '0')}-01`, 'Asia/Dhaka').daysInMonth()
        : (settings.payrollPolicy?.daysInSalaryMonth || 30);
    const perDaySalary = Number((teacherProfile.basicSalary / daysInSelectedMonth).toFixed(2));
    const currentMonthEstimatedCut = Math.round(totalDaysForSalaryCut * (teacherProfile.basicSalary / daysInSelectedMonth));

    let lifetimeTotalEarned = 0;
    let lifetimeTotalPaidReceived = 0;
    let lifetimeTotalUnpaidPending = 0;
    let lifetimeTotalBonusEarned = 0;
    let lifetimeTotalLeaveAbsentCut = 0;

    for (const sal of allTimeSalaries) {
        lifetimeTotalEarned += sal.netPayableSalary;
        lifetimeTotalBonusEarned += (sal.bonusAmount || 0);
        lifetimeTotalLeaveAbsentCut += (sal.leaveAndAbsentDeductionAmount || 0);
        if (sal.paymentStatus === 'Paid') {
            lifetimeTotalPaidReceived += sal.netPayableSalary;
        } else {
            lifetimeTotalUnpaidPending += sal.netPayableSalary;
        }
    }

    res.status(200).json(new ApiResponse(200, 'শিক্ষকের সেল্ফ-সার্ভিস পোর্টাল ড্যাশবোর্ড সফলভাবে লোড হয়েছে', {
        profile: teacherProfile,
        todayStatus: todayAttendance || {
            date: todayStr,
            status: 'Not Punched Yet',
            inTime: null
        },
        selectedMonthAttendance: {
            month,
            year,
            daysInSelectedMonth,
            presentDays,
            lateDays,
            leaveDays,
            absentDays,
            allowedQuota,
            quotaUsed: Number(quotaUsed.toFixed(2)),
            quotaRemaining,
            excessQuotaCutDays,
            directPenaltyDays,
            totalDaysForSalaryCut,
            currentMonthEstimatedCut,
            logs: monthlyLogs
        },
        lifetimeFinancialSummary: {
            currentBasicSalary: teacherProfile.basicSalary,
            paymentMethod: teacherProfile.paymentMethod,
            perDaySalary,
            totalMonthsGenerated: allTimeSalaries.length,
            lifetimeTotalEarned,
            lifetimeTotalPaidReceived,
            lifetimeTotalUnpaidPending,
            lifetimeTotalBonusEarned,
            lifetimeTotalLeaveAbsentCut,
            activeLoans
        },
        salarySheets: allTimeSalaries,
        salaryRevisionHistory: salaryRevisions,
        myApplications: recentApplications
    }));
});

module.exports = {
    getRegistrationMetadata,
    registerTeacher,
    publicSelfRegisterTeacher,
    getPublicRegistryCardByUid,
    approvePendingTeacher,
    getAllTeachers,
    triggerRankRecalculation,
    getTeacherById,
    resetTeacherPassword,
    updateTeacher,
    toggleTeacherActiveStatus,
    getMyPortalDashboard
};