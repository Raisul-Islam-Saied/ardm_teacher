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

// ০. পদবীর তালিকা (বাংলা ও ইংরেজি সহ) এবং মেটাডেটা পাওয়ার এন্ডপয়েন্ট
const getRegistrationMetadata = asyncHandler(async (req, res) => {
    const nextBioId = await getNextAvailableBiometricId();
    res.status(200).json(new ApiResponse(200, 'রেজিস্ট্রেশন মেটাডেটা সফলভাবে পাওয়া গেছে', {
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
        designation
    } = req.body;

    if (req.body.role === ROLES.SUPER_ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
        throw new ApiError(403, 'সুপার অ্যাডমিন অ্যাকাউন্ট তৈরির অনুমতি শুধু বর্তমান সুপার অ্যাডমিনের রয়েছে।');
    }

    // ডুপ্লিকেট চেক (ফোন, এনআইডি, জন্ম নিবন্ধন, ইমেইল, ইনডেক্স নম্বর)
    const orConditions = [{ phone }];
    if (nidNumber) orConditions.push({ nidNumber });
    if (birthRegNumber) orConditions.push({ birthRegNumber });
    if (email) orConditions.push({ email });
    if (indexNumber) orConditions.push({ indexNumber });

    const existingDuplicate = await Teacher.findOne({ $or: orConditions });
    if (existingDuplicate) {
        throw new ApiError(409, 'প্রদত্ত মোবাইল নম্বর, NID, জন্ম নিবন্ধন অথবা ইনডেক্স নম্বর দিয়ে ইতিমধ্যে একজন শিক্ষক নিবন্ধিত আছেন!');
    }

    // ১০ সংখ্যার টিচার আইডি ও বায়োমেট্রিক ডিভাইস আইডি অটো-জেনারেশন (যদি না দেওয়া থাকে)
    const finalTeacherCode = teacherCode || await generateTenDigitTeacherId(joiningDate, dateOfBirth, designation);
    const finalBiometricId = biometricDeviceId ? Number(biometricDeviceId) : await getNextAvailableBiometricId();

    const bioConflict = await Teacher.findOne({
        $or: [{ teacherCode: finalTeacherCode }, { biometricDeviceId: finalBiometricId }]
    });
    if (bioConflict) {
        throw new ApiError(409, `টিচার আইডি (${finalTeacherCode}) অথবা বায়োমেট্রিক আইডি (${finalBiometricId}) ইতিমধ্যে ব্যবহৃত হয়েছে!`);
    }

    const { uid, editToken } = generateRegistryTokens();

    const teacher = await Teacher.create({
        ...req.body,
        teacherCode: finalTeacherCode,
        biometricDeviceId: finalBiometricId,
        uid,
        editToken,
        role: req.body.role || ROLES.TEACHER,
        registrationStatus: 'Approved',
        isActive: true
    });

    // সমগ্র মাদ্রাসার র‍্যাংকিং (1, 2, 3...) পুনরায় সাজানো
    await recalculateAllTeachersRank();
    const updatedTeacher = await Teacher.findById(teacher._id);

    await AuditLog.recordLog({
        req,
        action: 'REGISTER_TEACHER',
        module: 'Teacher',
        targetId: String(teacher._id),
        description: `নতুন শিক্ষক নিবন্ধিত হয়েছেন: ${teacher.fullNameBng} (ID: ${finalTeacherCode}, Rank: #${updatedTeacher.rankingMetrics.overallMadrasahRank})`
    });

    res.status(201).json(new ApiResponse(201, 'শিক্ষক সফলভাবে নিবন্ধিত হয়েছেন এবং র‍্যাংক নির্ধারিত হয়েছে!', updatedTeacher));
});

// ২. পাবলিক সেল্ফ-রেজিস্ট্রেশন (লিংক থেকে শিক্ষক নিজে ফর্ম পূরণ করলে Pending মোডে থাকবে এবং ডিজিটাল আইডি কার্ড পাবে)
const publicSelfRegisterTeacher = asyncHandler(async (req, res) => {
    const {
        phone,
        nidNumber,
        birthRegNumber,
        email,
        dateOfBirth,
        joiningDate,
        designation
    } = req.body;

    const orConditions = [{ phone }];
    if (nidNumber) orConditions.push({ nidNumber });
    if (birthRegNumber) orConditions.push({ birthRegNumber });
    if (email) orConditions.push({ email });

    const existingDuplicate = await Teacher.findOne({ $or: orConditions });
    if (existingDuplicate) {
        throw new ApiError(409, 'প্রদত্ত মোবাইল নম্বর, NID অথবা জন্ম নিবন্ধন নম্বর দিয়ে ইতিমধ্যে নিবন্ধন করা হয়েছে!');
    }

    const finalTeacherCode = await generateTenDigitTeacherId(joiningDate, dateOfBirth, designation);
    const finalBiometricId = await getNextAvailableBiometricId();
    const { uid, editToken } = generateRegistryTokens();

    const teacher = await Teacher.create({
        ...req.body,
        teacherCode: finalTeacherCode,
        biometricDeviceId: finalBiometricId,
        uid,
        editToken,
        role: ROLES.TEACHER,
        basicSalary: 0, // অ্যাডমিন অ্যাপ্রুভ করার সময় মূল বেতন বসাবেন
        registrationStatus: 'Pending',
        isActive: false
    });

    res.status(201).json(new ApiResponse(201, 'আপনার নিবন্ধন সফলভাবে জমা হয়েছে এবং ডিজিটাল রেজিস্ট্রি কার্ড তৈরি হয়েছে!', {
        teacherId: teacher.teacherCode,
        uid: teacher.uid,
        editToken,
        registrationStatus: teacher.registrationStatus,
        teacher
    }));
});

// ৩. UID দিয়ে পাবলিক রেজিস্ট্রি কার্ড দেখা (আপনার আগের HTML ফর্মের Returning-user check এর জন্য)
const getPublicRegistryCardByUid = asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const teacher = await Teacher.findOne({ uid }).lean();
    if (!teacher) {
        throw new ApiError(404, 'এই UID দিয়ে কোনো নিবন্ধিত রেকর্ড পাওয়া যায়নি!');
    }
    res.status(200).json(new ApiResponse(200, 'রেজিস্ট্রি কার্ড সফলভাবে লোড হয়েছে', teacher));
});

// ৪. অ্যাডমিন কর্তৃক Pending শিক্ষকের রেজিস্ট্রেশন অনুমোদন ও মূল বেতন নির্ধারণ
const approvePendingTeacher = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { basicSalary, biometricDeviceId, customLeaveQuota, paymentMethod } = req.body;

    if (basicSalary === undefined || Number(basicSalary) < 0) {
        throw new ApiError(400, 'অনুমোদনের সময় শিক্ষকের মূল বেতন (basicSalary) প্রদান করা আবশ্যক!');
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }

    teacher.basicSalary = Number(basicSalary);
    if (biometricDeviceId) teacher.biometricDeviceId = Number(biometricDeviceId);
    if (customLeaveQuota !== undefined) teacher.customLeaveQuota = Number(customLeaveQuota);
    if (paymentMethod) teacher.paymentMethod = paymentMethod;
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
        description: `${teacher.fullNameBng}-এর নিবন্ধন অনুমোদন করা হয়েছে (বেতন: ${basicSalary} টাকা, Rank: #${updated.rankingMetrics.overallMadrasahRank})`
    });

    res.status(200).json(new ApiResponse(200, 'শিক্ষকের নিবন্ধন অনুমোদিত হয়েছে এবং র‍্যাংক নির্ধারিত হয়েছে!', updated));
});

// ৫. সকল শিক্ষক/স্টাফের তালিকা (র‍্যাংক অনুযায়ী সাজানো: সুপার ১, সহ-সুপার ২...)
const getAllTeachers = asyncHandler(async (req, res) => {
    const { isActive, designation, staffCategory, registrationStatus, search } = req.query;
    const filter = {};

    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (designation) filter.designation = designation;
    if (staffCategory) filter.staffCategory = staffCategory;
    if (registrationStatus) filter.registrationStatus = registrationStatus;

    if (search) {
        filter.$or = [
            { fullNameBng: { $regex: search, $options: 'i' } },
            { fullNameEng: { $regex: search, $options: 'i' } },
            { teacherCode: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
        ];
    }

    const teachers = await Teacher.find(filter)
        .sort({
            'rankingMetrics.overallMadrasahRank': 1,
            'rankingMetrics.designationPriority': 1,
            biometricDeviceId: 1
        })
        .lean();

    res.status(200).json(new ApiResponse(200, 'র‍্যাংক অনুযায়ী শিক্ষকদের তালিকা সফলভাবে পাওয়া গেছে', {
        totalCount: teachers.length,
        teachers
    }));
});

// ৬. এক ক্লিকে সবার র‍্যাংকিং পুনরায় ক্যালকুলেট করার এন্ডপয়েন্ট
const triggerRankRecalculation = asyncHandler(async (req, res) => {
    const totalRanked = await recalculateAllTeachersRank();
    res.status(200).json(new ApiResponse(200, 'সকল শিক্ষকের পদবী, শিক্ষাগত যোগ্যতা ও GPA অনুযায়ী র‍্যাংকিং সফলভাবে আপডেট করা হয়েছে!', { totalRanked }));
});

// ৭. একক শিক্ষকের বিস্তারিত প্রোফাইল
const getTeacherById = asyncHandler(async (req, res) => {
    if (req.user.role === ROLES.TEACHER && String(req.user._id) !== req.params.id) {
        throw new ApiError(403, 'আপনি শুধু নিজের শিক্ষকের তথ্য দেখতে পারবেন।');
    }
    const teacher = await Teacher.findById(req.params.id).lean();
    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }
    res.status(200).json(new ApiResponse(200, 'শিক্ষকের তথ্য পাওয়া গেছে', teacher));
});

const resetTeacherPassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.body;
    if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
        throw new ApiError(400, 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
    }

    const teacher = await Teacher.findById(req.params.id).select('+password');
    if (!teacher) throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    if (
        [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(teacher.role) &&
        req.user.role !== ROLES.SUPER_ADMIN
    ) {
        throw new ApiError(403, 'অ্যাডমিন অ্যাকাউন্টের পাসওয়ার্ড শুধু সুপার অ্যাডমিন পরিবর্তন করতে পারবেন।');
    }

    teacher.password = newPassword.trim();
    await teacher.save();
    await AuditLog.create({
        action: 'TEACHER_PASSWORD_RESET',
        module: 'Security',
        description: `${teacher.teacherCode} শিক্ষকের পোর্টাল পাসওয়ার্ড রিসেট করা হয়েছে`,
        performedBy: req.user._id,
        targetTeacherId: teacher._id,
        ipAddress: req.ip
    });

    return res.status(200).json(new ApiResponse(200, 'শিক্ষকের পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!'));
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
            throw new ApiError(400, 'চাকরি ছাড়ার তারিখ যোগদানের তারিখের আগে হতে পারবে না।');
        }
        history[openIndex].endDate = end;
    } else {
        const startDate = fallbackStartDate ? new Date(fallbackStartDate) : null;
        if (!startDate || Number.isNaN(startDate.getTime()) || startDate > end) {
            throw new ApiError(400, 'চাকরির মেয়াদের যোগদান ও ছাড়ার তারিখ সঠিক নয়।');
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
        throw new ApiError(400, 'পুনরায় সক্রিয় করার আগে নতুন যোগদানের তারিখ দিন।');
    }
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) {
        throw new ApiError(400, 'পুনরায় যোগদানের তারিখ সঠিক নয়।');
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
        throw new ApiError(400, 'পুনরায় যোগদানের তারিখ আগের চাকরির শেষ তারিখের পরের দিন বা তার পরে হতে হবে।');
    }

    history.push({ startDate: start, endDate: null });
    teacher.set('employmentHistory', history);
    teacher.joiningDate = start;
    teacher.resignationDate = null;
}

// ৮. শিক্ষকের তথ্য আপডেট এবং স্বয়ংক্রিয় র‍্যাংক পুনর্বিন্যাস
const updateTeacher = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }
    if (
        req.user.role !== ROLES.SUPER_ADMIN &&
        (teacher.role === ROLES.SUPER_ADMIN || req.body.role === ROLES.SUPER_ADMIN)
    ) {
        throw new ApiError(403, 'সুপার অ্যাডমিন অ্যাকাউন্ট পরিবর্তন বা নির্ধারণের অনুমতি শুধু সুপার অ্যাডমিনের রয়েছে।');
    }

    const wasActive = teacher.isActive !== false;
    const previousJoiningDate = teacher.joiningDate;
    const previousResignationDate = teacher.resignationDate;
    const editableFields = [
        'fullNameBng',
        'fullNameEng',
        'fathersNameBng',
        'fathersNameEng',
        'mothersNameBng',
        'mothersNameEng',
        'dateOfBirth',
        'gender',
        'religion',
        'bloodGroup',
        'maritalStatus',
        'nidNumber',
        'birthRegNumber',
        'indexNumber',
        'phone',
        'email',
        'designation',
        'subject',
        'assignedClass',
        'canEditAssignedClass',
        'employmentType',
        'joiningDate',
        'resignationDate',
        'academicQualifications',
        'basicSalary',
        'paymentMethod',
        'customLeaveQuota',
        'biometricDeviceId',
        'role',
        'registrationStatus',
        'isActive'
    ];

    editableFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            teacher.set(field, req.body[field]);
        }
    });

    const editableNestedFields = {
        emergencyContact: ['contactName', 'relationship', 'phone'],
        presentAddress: [
            'houseNameBn', 'houseNameEn', 'villageBn', 'villageEn', 'unionBn', 'unionEn', 'wardNo',
            'upazilaBn', 'upazilaEn', 'districtBn', 'districtEn', 'divisionBn', 'divisionEn',
            'houseOrRoad', 'village', 'postOffice', 'postCode', 'upazila', 'district'
        ],
        permanentAddress: [
            'houseNameBn', 'houseNameEn', 'villageBn', 'villageEn', 'unionBn', 'unionEn', 'wardNo',
            'upazilaBn', 'upazilaEn', 'districtBn', 'districtEn', 'divisionBn', 'divisionEn',
            'houseOrRoad', 'village', 'postOffice', 'postCode', 'upazila', 'district'
        ],
        bankDetails: ['bankName', 'branchName', 'accountHolderName', 'accountNumber', 'routingNumber']
    };

    Object.entries(editableNestedFields).forEach(([field, allowedFields]) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            const existingValue = teacher[field];
            const existing = existingValue?.toObject
                ? existingValue.toObject()
                : existingValue || {};
            const changes = Object.fromEntries(
                allowedFields
                    .filter((key) => Object.prototype.hasOwnProperty.call(req.body[field] || {}, key))
                    .map((key) => [key, req.body[field][key]])
            );
            teacher.set(field, { ...existing, ...changes });
        }
    });

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
        description: `${teacher.fullNameBng}-এর পূর্ণ প্রোফাইল ও অ্যাকাউন্ট কন্ট্রোল হালনাগাদ করা হয়েছে`
    });
    res.status(200).json(new ApiResponse(200, 'শিক্ষকের তথ্য ও র‍্যাংক সফলভাবে আপডেট করা হয়েছে', updated));
});

// ৯. শিক্ষককে নিষ্ক্রিয়/সক্রিয় করা (Soft Deactivate)
const toggleTeacherActiveStatus = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
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

    res.status(200).json(new ApiResponse(200, `শিক্ষকের অ্যাকাউন্ট এখন ${teacher.isActive ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'} করা হয়েছে`, teacher));
});

// ১০. শিক্ষক পোর্টাল (Self-Service): নিজের পূর্ণাঙ্গ ড্যাশবোর্ড এবং মাসের কোটা কতদিন খেয়েছে ও কতদিন বাকি আছে তার নিখুঁত হিসাব
const getMyPortalDashboard = asyncHandler(async (req, res) => {
    const teacherId = req.user._id;
    const now = moment.tz('Asia/Dhaka');
    const month = Number(req.query.month || (now.month() + 1));
    const year = Number(req.query.year || now.year());
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

    res.status(200).json(new ApiResponse(200, 'শিক্ষকের সেল্ফ-সার্ভিস পোর্টাল ড্যাশবোর্ড সফলভাবে লোড হয়েছে', {
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
            quotaUsed: Number(quotaUsed.toFixed(2)),       // মাসের কোটা থেকে কতদিন খেয়েছে
            quotaRemaining,                                // মাসের কোটা থেকে আর কতদিন বাকি আছে
            excessQuotaCutDays,                            // কোটা শেষ হয়ে অতিরিক্ত কতদিন কেটেছে
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
