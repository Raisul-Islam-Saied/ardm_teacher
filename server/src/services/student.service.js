const crypto = require('crypto');
const moment = require('moment-timezone');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const ApiError = require('../utils/ApiError');
const { STUDENT_CLASSES } = require('../constants/system.constants');

const LEGACY_SHEET_API_URL =
    process.env.LEGACY_STUDENT_SHEET_API_URL ||
    'https://script.google.com/macros/s/AKfycbzlG01v-naEr4WZR__n4ZX9fPkQR9pE01A0n8W9fOMUfw5x3RIDNPD_ZyaDwsVz9fphFw/exec';

const generateTenDigitStudentId = async (session, dateOfBirth, classBn, roll) => {
    const year4D = String(session || moment.tz('Asia/Dhaka').year()).slice(0, 4);
    const dobYear2D = dateOfBirth
        ? moment.tz(dateOfBirth, 'Asia/Dhaka').format('YY')
        : '00';

    const classMeta = STUDENT_CLASSES.find(c => c.classBn === classBn);
    const classCode2D = classMeta ? classMeta.code : '00';
    const rollCode2D = String(roll).padStart(2, '0').slice(-2);

    let candidateId = `${year4D}${dobYear2D}${classCode2D}${rollCode2D}`;

    if (await Student.exists({ studentCode: candidateId })) {
        const prefix8 = `${year4D}${dobYear2D}${classCode2D}`;
        for (let seq = 1; seq <= 99; seq++) {
            const altId = `${prefix8}${String(seq).padStart(2, '0')}`;
            if (!(await Student.exists({ studentCode: altId }))) {
                candidateId = altId;
                break;
            }
        }
    }

    return candidateId;
};

const getNextAvailableStudentBiometricId = async () => {
    const [teachers, students] = await Promise.all([
        Teacher.find().select('biometricDeviceId').lean(),
        Student.find({ biometricDeviceId: { $ne: null } }).select('biometricDeviceId').lean()
    ]);

    const usedIds = new Set([
        ...teachers.map(t => Number(t.biometricDeviceId)),
        ...students.map(s => Number(s.biometricDeviceId))
    ]);

    let candidate = 1001;
    while (usedIds.has(candidate)) {
        candidate++;
    }
    return candidate;
};

const cleanPhone = (val) => {
    const digits = String(val || '').replace(/^'+/, '').replace(/\D/g, '');
    if (digits.startsWith('880')) return '0' + digits.slice(3);
    if (digits.length === 10 && digits.startsWith('1')) return '0' + digits;
    return digits;
};

const cleanDigits = (val) => String(val || '').replace(/^'+/, '').replace(/\D/g, '');

const parseSheetDate = (val) => {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(val).trim())) return String(val).trim();
    const m = moment.tz(val, 'Asia/Dhaka');
    return m.isValid() ? m.format('YYYY-MM-DD') : '';
};

const fetchLegacyStudentFromSheet = async (studentCode) => {
    const cleanId = String(studentCode || '').trim();
    if (!/^\d{10}$/.test(cleanId)) {
        throw new ApiError(400, 'স্টুডেন্ট আইডি অবশ্যই ১০ ডিজিটের সংখ্যা হতে হবে।');
    }

    const existingInDb = await Student.findOne({ studentCode: cleanId })
        .select('studentCode fullNameBng fullNameEng classBn roll session status')
        .lean();

    if (existingInDb) {
        return {
            alreadyMigrated: true,
            existingStudent: existingInDb,
            autoFillData: null
        };
    }

    let payload;
    try {
        const res = await fetch(`${LEGACY_SHEET_API_URL}?action=read&id=${encodeURIComponent(cleanId)}&t=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        payload = await res.json();
    } catch (err) {
        throw new ApiError(502, 'পুরনো গুগল শিট সার্ভারের সাথে সংযোগ করা যায়নি। ইন্টারনেট সংযোগ যাচাই করে আবার চেষ্টা করুন।');
    }

    if (!payload || payload.status !== 'success' || !payload.data) {
        throw new ApiError(404, `পুরনো গুগল শিটে '${cleanId}' আইডির কোনো শিক্ষার্থী পাওয়া যায়নি!`);
    }

    const row = payload.data;
    const addressBlock = {
        houseNameBn: String(row.HouseNameBn || '').trim(),
        houseNameEn: String(row.HouseNameEn || '').trim(),
        villageBn: String(row.VillageBn || '').trim(),
        villageEn: String(row.VillageEn || '').trim(),
        unionBn: String(row.UnionBn || '').trim(),
        unionEn: String(row.UnionEn || '').trim(),
        wardNo: String(row.WardNo || '').trim(),
        postOffice: 'Rangunia',
        postCode: '4360',
        upazilaBn: String(row.UpazilaBn || 'রাঙ্গুনিয়া').trim(),
        upazilaEn: String(row.UpazilaEn || 'Rangunia').trim(),
        districtBn: String(row.DistrictBn || 'চট্টগ্রাম').trim(),
        districtEn: String(row.DistrictEn || 'Chattogram').trim(),
        divisionBn: 'চট্টগ্রাম',
        divisionEn: 'Chattogram'
    };

    const autoFillData = {
        studentCode: String(row.ID || cleanId).trim(),
        migratedFromSheet: true,
        session: String(row.Session || '2026').trim(),
        admissionDate: parseSheetDate(row.Time) || moment.tz('Asia/Dhaka').format('YYYY-MM-DD'),
        fullNameBng: String(row.StudentNameBn || '').trim(),
        fullNameEng: String(row.StudentNameEn || '').trim(),
        gender: String(row.Gender || '').trim(),
        classBn: String(row.ClassBn || '').trim(),
        classEn: String(row.ClassEn || '').trim(),
        roll: Number(row.Roll) || '',
        group: '',
        fourthSubject: '',
        boardRegNo: '',
        brnNumber: cleanDigits(row.BRN),
        dateOfBirth: parseSheetDate(row.DOB),
        bloodGroup: String(row.BloodGroup || 'N/A').trim() || 'N/A',
        medicalNote: '',

        fathersNameBng: String(row.FatherNameBn || '').trim(),
        fathersNameEng: String(row.FatherNameEn || '').trim(),
        fatherNid: '',
        fatherOccupation: '',

        mothersNameBng: String(row.MotherNameBn || '').trim(),
        mothersNameEng: String(row.MotherNameEn || '').trim(),
        motherNid: '',
        motherOccupation: '',

        localGuardian: { name: '', relation: '', nid: '', phone: '' },
        annualIncome: '',

        phone: cleanPhone(row.WhatsApp),
        emergencyContact: {
            contactName: String(row.FatherNameBn || '').trim(),
            relationship: 'Father',
            phone: cleanPhone(row.EmergencyNo || row.WhatsApp)
        },

        presentAddress: addressBlock,
        permanentAddress: { ...addressBlock },

        feeDetails: {
            monthlyFee: '',
            feeCategory: 'Regular',
            siblingStudentCode: ''
        },

        profilePicture: {
            url: String(row.ImageURL || '').trim(),
            publicId: ''
        },
        status: row.Status === 'Inactive' ? 'Inactive' : 'Active'
    };

    return {
        alreadyMigrated: false,
        existingStudent: null,
        autoFillData
    };
};

const cleanFamilyName = (name) =>
    String(name || '')
        .replace(/মোঃ|মো\.?|মোহাম্মদ|মুহাম্মদ|md\.?|mr\.?/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

const findStudentSiblings = async (student) => {
    const fatherBn = cleanFamilyName(student.fathersNameBng);
    const motherBn = cleanFamilyName(student.mothersNameBng);
    const phone = String(student.phone || '').trim();

    const candidates = await Student.find({
        _id: { $ne: student._id },
        status: { $ne: 'Deleted' },
        $or: [
            ...(phone ? [{ phone }] : []),
            ...(student.fatherNid ? [{ fatherNid: student.fatherNid }] : []),
            ...(student.motherNid ? [{ motherNid: student.motherNid }] : []),
            { fathersNameBng: student.fathersNameBng }
        ]
    })
        .select('studentCode fullNameBng fullNameEng classBn classEn classOrder roll session dateOfBirth profilePicture status fatherNid motherNid fathersNameBng mothersNameBng phone')
        .lean();

    return candidates
        .filter((s) => {
            if (student.fatherNid && s.fatherNid === student.fatherNid) return true;
            if (student.motherNid && s.motherNid === student.motherNid) return true;

            let score = 0;
            if (fatherBn && cleanFamilyName(s.fathersNameBng) === fatherBn) score++;
            if (motherBn && cleanFamilyName(s.mothersNameBng) === motherBn) score++;
            if (phone && String(s.phone || '').trim() === phone) score++;
            return score >= 2;
        })
        .sort((a, b) => (a.classOrder || 99) - (b.classOrder || 99));
};

const generateStudentTokens = () => ({
    uid: crypto.randomUUID(),
    editToken: crypto.randomBytes(16).toString('hex')
});

module.exports = {
    generateTenDigitStudentId,
    getNextAvailableStudentBiometricId,
    fetchLegacyStudentFromSheet,
    findStudentSiblings,
    generateStudentTokens
};
