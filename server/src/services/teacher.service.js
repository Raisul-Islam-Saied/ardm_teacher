const crypto = require('crypto');
const moment = require('moment-timezone');
const Teacher = require('../models/Teacher');
const { DESIGNATION_DETAILS } = require('../constants/system.constants');

/**
 * ১. ১০ সংখ্যার ইউনিক টিচার আইডি জেনারেটর (অপশন ক অনুযায়ী)
 * ফরম্যাট: 10 (টিচার প্রিফিক্স) + YY (যোগদানের সাল) + BB (জন্মসাল) + DD (পদবী কোড 01-15) + SS (সিরিয়াল 01-99)
 * উদাহরণ: 1026030301 (১০ ডিজিট)
 */
const generateTenDigitTeacherId = async (joiningDate, dateOfBirth, designation) => {
    const prefix = '10'; // স্টুডেন্ট ২০ দিয়ে শুরু হয়, তাই টিচার ১০ দিয়ে শুরু
    const joinYear2D = joiningDate
        ? moment.tz(joiningDate, 'Asia/Dhaka').format('YY')
        : moment.tz('Asia/Dhaka').format('YY');
    const birthYear2D = dateOfBirth
        ? moment.tz(dateOfBirth, 'Asia/Dhaka').format('YY')
        : '00';

    const desigInfo = DESIGNATION_DETAILS.find(d => d.titleEng === designation)
        || DESIGNATION_DETAILS[DESIGNATION_DETAILS.length - 1];
    const desigCode2D = desigInfo.code; // '01' to '15'

    const base8Digits = `${prefix}${joinYear2D}${birthYear2D}${desigCode2D}`;

    // ওই একই বেসের অধীনে কতজন আছেন তা খুঁজে পরবর্তী ২ ডিজিট সিরিয়াল (01, 02...) বসানো
    const existingTeachers = await Teacher.find({
        teacherCode: { $regex: `^${base8Digits}\\d{2}$` }
    }).select('teacherCode').lean();

    let maxSerial = 0;
    for (const t of existingTeachers) {
        const serialNum = parseInt(t.teacherCode.slice(-2), 10);
        if (!isNaN(serialNum) && serialNum > maxSerial) {
            maxSerial = serialNum;
        }
    }

    let nextSerial = maxSerial + 1;
    let candidateId = `${base8Digits}${String(nextSerial).padStart(2, '0')}`;

    // শতভাগ ইউনিক নিশ্চিত করা
    while (await Teacher.exists({ teacherCode: candidateId })) {
        nextSerial++;
        candidateId = `${base8Digits}${String(nextSerial % 100).padStart(2, '0')}`;
    }

    return candidateId;
};

/**
 * ২. পরবর্তী খালি থাকা বায়োমেট্রিক ডিভাইস আইডি (1, 2, 3...) স্বয়ংক্রিয়ভাবে বের করা
 */
const getNextAvailableBiometricId = async () => {
    const teachers = await Teacher.find().select('biometricDeviceId').sort({ biometricDeviceId: 1 }).lean();
    const usedIds = new Set(teachers.map(t => Number(t.biometricDeviceId)));
    let candidate = 1;
    while (usedIds.has(candidate)) {
        candidate++;
    }
    return candidate;
};

/**
 * ৩. সমগ্র মাদ্রাসার শিক্ষকদের র‍্যাংকিং (1, 2, 3...) স্বয়ংক্রিয়ভাবে সাজানো
 * নিয়ম:
 * ক) সুপারের র‍্যাংক ১, সহ-সুপারের র‍্যাংক ২, এরপর পদবীর ক্রম অনুযায়ী (designationPriority ছোট থেকে বড়)।
 * খ) পদবী একই হলে: সর্বোচ্চ ডিগ্রির মান (highestDegreeWeight বড় থেকে ছোট)।
 * গ) ডিগ্রিও একই হলে: সর্বোচ্চ ডিগ্রির GPA/CGPA (বড় থেকে ছোট)।
 * ঘ) সেটিও সমান হলে: গড় GPA/CGPA ➔ চাকরিতে যোগদানের তারিখ (যিনি আগে জয়েন করেছেন) ➔ বয়স (যিনি বয়সে বড়)।
 */
const recalculateAllTeachersRank = async () => {
    const activeTeachers = await Teacher.find({ isActive: true, registrationStatus: 'Approved' }).lean();

    activeTeachers.sort((a, b) => {
        const pA = a.rankingMetrics?.designationPriority ?? 15;
        const pB = b.rankingMetrics?.designationPriority ?? 15;
        if (pA !== pB) return pA - pB; // ছোট সংখ্যা মানে উচ্চ পদবী (1 = Super)

        const degA = a.rankingMetrics?.highestDegreeWeight ?? 0;
        const degB = b.rankingMetrics?.highestDegreeWeight ?? 0;
        if (degB !== degA) return degB - degA; // উচ্চতর ডিগ্রি আগে

        const gpaA = a.rankingMetrics?.highestDegreeNormalizedGpa ?? 0;
        const gpaB = b.rankingMetrics?.highestDegreeNormalizedGpa ?? 0;
        if (gpaB !== gpaA) return gpaB - gpaA; // বেশি GPA/CGPA আগে

        const avgA = a.rankingMetrics?.averageNormalizedGpa ?? 0;
        const avgB = b.rankingMetrics?.averageNormalizedGpa ?? 0;
        if (avgB !== avgA) return avgB - avgA;

        const joinA = a.joiningDate ? new Date(a.joiningDate).getTime() : Number.MAX_SAFE_INTEGER;
        const joinB = b.joiningDate ? new Date(b.joiningDate).getTime() : Number.MAX_SAFE_INTEGER;
        if (joinA !== joinB) return joinA - joinB; // আগে যোগদানকারী সিনিয়র

        const dobA = a.dateOfBirth ? new Date(a.dateOfBirth).getTime() : Number.MAX_SAFE_INTEGER;
        const dobB = b.dateOfBirth ? new Date(b.dateOfBirth).getTime() : Number.MAX_SAFE_INTEGER;
        return dobA - dobB; // বয়সে বড় যিনি
    });

    const bulkOps = activeTeachers.map((teacher, index) => ({
        updateOne: {
            filter: { _id: teacher._id },
            update: { $set: { 'rankingMetrics.overallMadrasahRank': index + 1 } }
        }
    }));

    if (bulkOps.length > 0) {
        await Teacher.bulkWrite(bulkOps);
    }

    return activeTeachers.length;
};

const generateRegistryTokens = () => ({
    uid: crypto.randomUUID(),
    editToken: crypto.randomBytes(16).toString('hex')
});

module.exports = {
    generateTenDigitTeacherId,
    getNextAvailableBiometricId,
    recalculateAllTeachersRank,
    generateRegistryTokens
};
