const mongoose = require('mongoose');
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const {
    ROLES,
    BLOOD_GROUPS,
    STUDENT_CLASSES,
    STUDENT_GROUPS,
    FEE_CATEGORIES,
    STUDENT_STATUSES
} = require('../constants/system.constants');
const {
    generateTenDigitStudentId,
    getNextAvailableStudentBiometricId,
    fetchLegacyStudentFromSheet,
    findStudentSiblings,
    generateStudentTokens
} = require('../services/student.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const assertCanManageStudentClass = (user, targetClassBn) => {
    if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user.role)) return true;

    if (user.role === ROLES.TEACHER) {
        if (!user.assignedClass || !user.canEditAssignedClass) {
            throw new ApiError(403, 'আপনার শিক্ষার্থী যোগ বা সম্পাদনা করার প্রশাসনিক অনুমতি নেই!');
        }
        if (user.assignedClass !== targetClassBn) {
            throw new ApiError(403, `আপনি শুধুমাত্র আপনার নির্ধারিত শ্রেণির (${user.assignedClass}) শিক্ষার্থীর তথ্য ব্যবস্থাপনা করতে পারবেন!`);
        }
        return true;
    }

    throw new ApiError(403, 'অননুমোদিত অ্যাক্সেস!');
};

const verifySiblingExistsIfWaiver = async (feeDetails, selfStudentCode = null) => {
    if (feeDetails?.feeCategory === 'Sibling Waiver') {
        const sibCode = String(feeDetails.siblingStudentCode || '').trim();
        if (!sibCode) {
            throw new ApiError(400, 'Sibling Waiver ক্যাটাগরির জন্য ভাই/বোনের স্টুডেন্ট আইডি আবশ্যক!', [{ field: 'feeDetails.siblingStudentCode', message: 'ভাই/বোনের ১০ ডিজিটের স্টুডেন্ট আইডি দিন' }]);
        }
        if (selfStudentCode && sibCode === selfStudentCode) {
            throw new ApiError(400, 'নিজের আইডি ভাই/বোনের রেফারেন্স হিসেবে দেওয়া যাবে না!', [{ field: 'feeDetails.siblingStudentCode', message: 'অন্য ভাই/বোনের আইডি দিন' }]);
        }
        const siblingDoc = await Student.findOne({
            studentCode: sibCode,
            status: 'Active'
        }).select('studentCode fullNameBng classBn').lean();

        if (!siblingDoc) {
            throw new ApiError(404, `ভাই/বোনের স্টুডেন্ট আইডি (${sibCode}) পাওয়া যায়নি!`, [{ field: 'feeDetails.siblingStudentCode', message: 'সক্রিয় ভাই/বোনের সঠিক আইডি দিন' }]);
        }
    }
};

const getStudentMetadata = asyncHandler(async (req, res) => {
    const nextBioId = await getNextAvailableStudentBiometricId();
    res.status(200).json(new ApiResponse(200, 'স্টুডেন্ট মেটাডাটা পাওয়া গেছে', {
        classes: STUDENT_CLASSES,
        groups: STUDENT_GROUPS.filter(Boolean),
        feeCategories: FEE_CATEGORIES,
        statuses: STUDENT_STATUSES,
        bloodGroups: BLOOD_GROUPS,
        nextSuggestedBiometricDeviceId: nextBioId
    }));
});

const lookupLegacyStudentById = asyncHandler(async (req, res) => {
    const { studentCode } = req.params;

    // পূর্বে ডিলিট করা (status: 'Deleted') কোনো রেকর্ড থাকলে স্থায়ীভাবে পরিষ্কার করা
    await Student.deleteMany({ studentCode: String(studentCode).trim(), status: 'Deleted' });

    const result = await fetchLegacyStudentFromSheet(studentCode);

    if (result.alreadyMigrated) {
        return res.status(200).json(new ApiResponse(
            200,
            `এই শিক্ষার্থী (${result.existingStudent.fullNameBng}) ইতিমধ্যে নতুন ডাটাবেজে যুক্ত আছেন!`,
            result
        ));
    }

    return res.status(200).json(new ApiResponse(
        200,
        'পুরনো গুগল শিট থেকে শিক্ষার্থীর তথ্য পাওয়া গেছে! এখন নতুন ফিল্ডগুলো পূরণ করে সংরক্ষণ করুন।',
        result
    ));
});

const registerStudent = asyncHandler(async (req, res) => {
    const {
        studentCode,
        migratedFromSheet = false,
        session,
        classBn,
        roll,
        brnNumber,
        boardRegNo,
        dateOfBirth,
        biometricDeviceId,
        feeDetails
    } = req.body;

    assertCanManageStudentClass(req.user, classBn);
    await verifySiblingExistsIfWaiver(feeDetails, studentCode);

    const uniqueOr = [{ brnNumber }];
    if (boardRegNo) uniqueOr.push({ boardRegNo });
    if (studentCode) uniqueOr.push({ studentCode });

    // আগে ডিলিট করা কোনো রেকর্ডে একই ID/BRN/BoardReg থাকলে তা স্থায়ীভাবে মুছে ফেলা
    await Student.deleteMany({
        status: 'Deleted',
        $or: uniqueOr
    });

    const duplicateIdentity = await Student.findOne({
        status: { $ne: 'Deleted' },
        $or: uniqueOr
    }).lean();

    if (duplicateIdentity) {
        if (studentCode && duplicateIdentity.studentCode === studentCode) {
            throw new ApiError(409, `স্টুডেন্ট আইডি (${studentCode}) ইতিমধ্যে নিবন্ধিত আছে!`, [{ field: 'studentCode', message: 'এই স্টুডেন্ট আইডি ইতিমধ্যে ব্যবহৃত হয়েছে' }]);
        }
        if (duplicateIdentity.brnNumber === brnNumber) {
            throw new ApiError(409, `জন্ম নিবন্ধন নম্বর (${brnNumber}) ইতিমধ্যে নিবন্ধিত!`, [{ field: 'brnNumber', message: `ইতিমধ্যে '${duplicateIdentity.fullNameBng}'-এর নামে নিবন্ধিত` }]);
        }
        throw new ApiError(409, 'বোর্ড রেজিস্ট্রেশন নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে!', [{ field: 'boardRegNo', message: 'এই বোর্ড রেজিস্ট্রেশন নম্বর আগে ব্যবহৃত হয়েছে' }]);
    }

    const duplicateRoll = await Student.findOne({
        session,
        classBn,
        roll: Number(roll),
        status: { $in: ['Active', 'Inactive'] }
    }).lean();

    if (duplicateRoll) {
        throw new ApiError(409, `${classBn} শ্রেণিতে রোল ${roll} ইতিমধ্যে বরাদ্দ আছে!`, [{ field: 'roll', message: `'${duplicateRoll.fullNameBng}'-এর রোল ইতিমধ্যে ${roll}` }]);
    }

    const finalStudentCode = studentCode
        ? String(studentCode).trim()
        : await generateTenDigitStudentId(session, dateOfBirth, classBn, roll);

    const finalBiometricId = biometricDeviceId
        ? Number(biometricDeviceId)
        : await getNextAvailableStudentBiometricId();

    const { uid, editToken } = generateStudentTokens();
    const permanentAddress = req.body.permanentAddress?.houseNameBn
        ? req.body.permanentAddress
        : req.body.presentAddress;

    const student = await Student.create({
        ...req.body,
        studentCode: finalStudentCode,
        migratedFromSheet: Boolean(migratedFromSheet),
        biometricDeviceId: finalBiometricId,
        uid,
        editToken,
        permanentAddress,
        createdBy: req.user._id
    });

    await AuditLog.recordLog({
        req,
        action: migratedFromSheet ? 'MIGRATE_LEGACY_STUDENT' : 'REGISTER_STUDENT',
        module: 'Student',
        targetId: String(student._id),
        description: `${migratedFromSheet ? 'পুরনো শিট থেকে মাইগ্রেট' : 'নতুন শিক্ষার্থী ভর্তি'}: ${student.fullNameBng} (ID: ${student.studentCode}, শ্রেণি: ${student.classBn}, রোল: ${student.roll})`
    });

    return res.status(201).json(new ApiResponse(
        201,
        migratedFromSheet
            ? 'পুরনো শিক্ষার্থীর তথ্য সফলভাবে নতুন ডাটাবেজে সংরক্ষিত হয়েছে!'
            : 'নতুন শিক্ষার্থী সফলভাবে ভর্তি নিবন্ধিত হয়েছে!',
        student
    ));
});

const getAllStudents = asyncHandler(async (req, res) => {
    const {
        session,
        classBn,
        status,
        gender,
        bloodGroup,
        feeCategory,
        search,
        includeDeleted
    } = req.query;

    const filter = {};
    if (includeDeleted !== 'true') {
        filter.status = status || { $ne: 'Deleted' };
    } else if (status) {
        filter.status = status;
    }

    if (session) filter.session = session;
    if (classBn && classBn !== 'All') filter.classBn = classBn;
    if (gender) filter.gender = gender;
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (feeCategory) filter['feeDetails.feeCategory'] = feeCategory;

    if (search) {
        const regex = { $regex: search.trim(), $options: 'i' };
        filter.$or = [
            { fullNameBng: regex },
            { fullNameEng: regex },
            { studentCode: regex },
            { phone: regex },
            { brnNumber: regex },
            { fathersNameBng: regex },
            ...(/^\d+$/.test(search.trim()) ? [{ roll: Number(search.trim()) }] : [])
        ];
    }

    const students = await Student.find(filter)
        .sort({ classOrder: 1, roll: 1, createdAt: -1 })
        .lean();

    return res.status(200).json(new ApiResponse(200, 'শিক্ষার্থীদের তালিকা পাওয়া গেছে', {
        totalCount: students.length,
        students
    }));
});

const getStudentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : { studentCode: id };

    const student = await Student.findOne(query).lean();
    if (!student || student.status === 'Deleted') {
        throw new ApiError(404, 'শিক্ষার্থীর তথ্য খুঁজে পাওয়া যায়নি!');
    }

    const siblings = await findStudentSiblings(student);

    return res.status(200).json(new ApiResponse(200, 'শিক্ষার্থীর প্রোফাইল পাওয়া গেছে', {
        student,
        siblings
    }));
});

const getPublicStudentVerification = asyncHandler(async (req, res) => {
    const { studentCode } = req.params;
    if (!/^\d{10}$/.test(studentCode)) {
        throw new ApiError(400, 'সঠিক ১০ ডিজিটের স্টুডেন্ট আইডি প্রদান করুন।');
    }

    const student = await Student.findOne({
        studentCode,
        status: { $ne: 'Deleted' }
    })
        .select('studentCode fullNameBng fullNameEng classBn classEn roll session gender bloodGroup dateOfBirth fathersNameBng mothersNameBng presentAddress.villageBn presentAddress.unionBn presentAddress.upazilaBn presentAddress.districtBn profilePicture.url status')
        .lean();

    if (!student) {
        throw new ApiError(404, 'এই আইডি নম্বরে কোনো বৈধ শিক্ষার্থী নিবন্ধিত নেই!');
    }

    return res.status(200).json(new ApiResponse(200, 'শিক্ষার্থীর পরিচয় যাচাই সফল', student));
});

const updateStudent = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);
    if (!student || student.status === 'Deleted') {
        throw new ApiError(404, 'শিক্ষার্থী খুঁজে পাওয়া যায়নি!');
    }

    assertCanManageStudentClass(req.user, student.classBn);
    if (req.body.classBn && req.body.classBn !== student.classBn) {
        assertCanManageStudentClass(req.user, req.body.classBn);
    }

    const nextFeeDetails = req.body.feeDetails
        ? { ...student.feeDetails.toObject(), ...req.body.feeDetails }
        : student.feeDetails.toObject();
    await verifySiblingExistsIfWaiver(nextFeeDetails, student.studentCode);

    const nextSession = req.body.session || student.session;
    const nextClass = req.body.classBn || student.classBn;
    const nextRoll = req.body.roll !== undefined ? Number(req.body.roll) : student.roll;
    const nextDob = req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : student.dateOfBirth;
    const nextBrn = req.body.brnNumber || student.brnNumber;

    // আপডেটের সময়ও BRN-এর প্রথম ৪ ডিজিট ও জন্মসালের মিল নিশ্চিত করা
    if (String(nextBrn).slice(0, 4) !== String(nextDob.getFullYear())) {
        throw new ApiError(400, 'জন্ম নিবন্ধন নম্বর ও জন্মসাল মিলছে না!', [{ field: 'brnNumber', message: `BRN-এর প্রথম ৪ সংখ্যা জন্মসাল (${nextDob.getFullYear()}) হতে হবে` }]);
    }

    const rollConflict = await Student.findOne({
        _id: { $ne: student._id },
        session: nextSession,
        classBn: nextClass,
        roll: nextRoll,
        status: { $in: ['Active', 'Inactive'] }
    }).lean();

    if (rollConflict) {
        throw new ApiError(409, `${nextClass} শ্রেণিতে রোল ${nextRoll} ইতিমধ্যে আছে!`, [{ field: 'roll', message: `'${rollConflict.fullNameBng}'-এর রোল ইতিমধ্যে ${nextRoll}` }]);
    }

    if (req.body.brnNumber && req.body.brnNumber !== student.brnNumber) {
        await Student.deleteMany({ status: 'Deleted', brnNumber: req.body.brnNumber });
        const brnConflict = await Student.findOne({
            _id: { $ne: student._id },
            status: { $ne: 'Deleted' },
            brnNumber: req.body.brnNumber
        }).lean();
        if (brnConflict) {
            throw new ApiError(409, 'এই জন্ম নিবন্ধন নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে!', [{ field: 'brnNumber', message: 'অন্য শিক্ষার্থীর প্রোফাইলে ব্যবহৃত' }]);
        }
    }

    const editableFields = [
        'admissionDate', 'session', 'fullNameBng', 'fullNameEng', 'dateOfBirth',
        'gender', 'religion', 'bloodGroup', 'brnNumber', 'medicalNote',
        'classBn', 'roll', 'group', 'fourthSubject', 'boardRegNo',
        'fathersNameBng', 'fathersNameEng', 'fatherNid', 'fatherOccupation',
        'mothersNameBng', 'mothersNameEng', 'motherNid', 'motherOccupation',
        'annualIncome', 'phone', 'biometricDeviceId', 'status', 'statusReason'
    ];

    editableFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            student.set(field, req.body[field]);
        }
    });

    if (req.body.localGuardian) {
        student.localGuardian = { ...student.localGuardian.toObject(), ...req.body.localGuardian };
    }
    if (req.body.emergencyContact) {
        student.emergencyContact = { ...student.emergencyContact.toObject(), ...req.body.emergencyContact };
    }
    if (req.body.presentAddress) {
        student.presentAddress = { ...student.presentAddress.toObject(), ...req.body.presentAddress };
    }
    if (req.body.permanentAddress) {
        student.permanentAddress = { ...student.permanentAddress.toObject(), ...req.body.permanentAddress };
    }
    if (req.body.feeDetails) {
        student.feeDetails = nextFeeDetails;
    }
    if (req.body.profilePicture?.url) {
        student.profilePicture = {
            url: req.body.profilePicture.url,
            publicId: req.body.profilePicture.publicId ?? student.profilePicture.publicId
        };
    }

    student.updatedBy = req.user._id;
    await student.save();

    await AuditLog.recordLog({
        req,
        action: 'UPDATE_STUDENT',
        module: 'Student',
        targetId: String(student._id),
        description: `শিক্ষার্থীর তথ্য হালনাগাদ: ${student.fullNameBng} (ID: ${student.studentCode})`
    });

    return res.status(200).json(new ApiResponse(200, 'শিক্ষার্থীর তথ্য সফলভাবে হালনাগাদ হয়েছে!', student));
});

const deleteStudent = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id).lean();
    if (!student || student.status === 'Deleted') {
        throw new ApiError(404, 'শিক্ষার্থী খুঁজে পাওয়া যায়নি!');
    }

    assertCanManageStudentClass(req.user, student.classBn);

    const reason = req.body?.statusReason || 'প্রশাসনিকভাবে মুছে ফেলা হয়েছে';

    await Student.findByIdAndUpdate(
        student._id,
        {
            $set: {
                status: 'Deleted',
                isActive: false,
                statusReason: reason,
                updatedBy: req.user._id
            }
        },
        { runValidators: false }
    );

    await AuditLog.recordLog({
        req,
        action: 'DELETE_STUDENT',
        module: 'Student',
        targetId: String(student._id),
        description: `শিক্ষার্থী ডিলিট: ${student.fullNameBng} (ID: ${student.studentCode}) — কারণ: ${reason}`
    });

    return res.status(200).json(new ApiResponse(200, 'শিক্ষার্থীর রেকর্ড সফলভাবে ডিলিট করা হয়েছে।'));
});

const promoteStudentsBulk = asyncHandler(async (req, res) => {
    const { promotions, targetSession } = req.body;
    if (!Array.isArray(promotions) || promotions.length === 0 || !/^20\d{2}$/.test(String(targetSession))) {
        throw new ApiError(400, 'সঠিক সেশন এবং প্রমোশন তালিকা প্রদান করুন।');
    }

    let promotedCount = 0;
    for (const item of promotions) {
        const student = await Student.findById(item.studentId);
        if (!student || student.status !== 'Active') continue;

        const currentHist = student.academicHistory.find(
            h => h.session === student.session && h.classBn === student.classBn
        );
        if (currentHist) {
            currentHist.resultStatus = item.resultStatus || 'Promoted';
        }

        student.session = String(targetSession);
        student.classBn = item.nextClassBn;
        student.roll = Number(item.nextRoll);
        if (item.nextGroup !== undefined) student.group = item.nextGroup;
        student.updatedBy = req.user._id;

        student.academicHistory.push({
            session: String(targetSession),
            classBn: item.nextClassBn,
            classEn: '',
            roll: Number(item.nextRoll),
            group: item.nextGroup || '',
            resultStatus: 'Studying'
        });

        await student.save();
        promotedCount++;
    }

    return res.status(200).json(new ApiResponse(
        200,
        `মোট ${promotedCount} জন শিক্ষার্থীকে ${targetSession} সেশনে প্রমোশন দেওয়া হয়েছে!`,
        { promotedCount }
    ));
});

module.exports = {
    getStudentMetadata,
    lookupLegacyStudentById,
    registerStudent,
    getAllStudents,
    getStudentById,
    getPublicStudentVerification,
    updateStudent,
    deleteStudent,
    promoteStudentsBulk
};