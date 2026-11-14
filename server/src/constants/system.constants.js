const ROLES = Object.freeze({
    SUPER_ADMIN: 'SuperAdmin',
    ADMIN: 'Admin',
    TEACHER: 'Teacher'
});

const EMPLOYMENT_TYPES = Object.freeze({
    NON_MPO: 'Non-MPO',
    MPO: 'MPO',
    PART_TIME: 'Part-Time',
    CONTRACTUAL: 'Contractual'
});

const PAYMENT_METHODS = Object.freeze({
    CASH: 'Cash',
    BANK: 'Bank',
    MOBILE_BANKING: 'Mobile Banking'
});

const BLOOD_GROUPS = Object.freeze([
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'N/A'
]);

// ১৫টি নির্ধারিত পদবী (ইংরেজি, বাংলা, বেস র‍্যাংক এবং স্টাফ ক্যাটাগরি সহ)
const DESIGNATION_DETAILS = Object.freeze([
    { titleEng: 'Superintendent', titleBng: 'সুপারিনটেনডেন্ট (সুপার)', rankPriority: 1, code: '01', staffCategory: 'Teaching' },
    { titleEng: 'Assistant Superintendent', titleBng: 'সহকারী সুপারিনটেনডেন্ট (সহ-সুপার)', rankPriority: 2, code: '02', staffCategory: 'Teaching' },
    { titleEng: 'Assistant Teacher', titleBng: 'সহকারী শিক্ষক', rankPriority: 3, code: '03', staffCategory: 'Teaching' },
    { titleEng: 'Assistant Moulvi', titleBng: 'সহকারী মৌলভী', rankPriority: 4, code: '04', staffCategory: 'Teaching' },
    { titleEng: 'Ebtedayee Head Teacher', titleBng: 'ইবতেদায়ী প্রধান', rankPriority: 5, code: '05', staffCategory: 'Teaching' },
    { titleEng: 'Ebtedayee Assistant Teacher', titleBng: 'ইবতেদায়ী সহকারী শিক্ষক', rankPriority: 6, code: '06', staffCategory: 'Teaching' },
    { titleEng: 'Ebtedayee Qari', titleBng: 'ইবতেদায়ী ক্বারী', rankPriority: 7, code: '07', staffCategory: 'Teaching' },
    { titleEng: 'Assistant Librarian', titleBng: 'সহকারী গ্রন্থাগারিক', rankPriority: 8, code: '08', staffCategory: 'Non-Teaching' },
    { titleEng: 'Office Assistant cum Computer Operator', titleBng: 'অফিস সহকারী কাম কম্পিউটার অপারেটর', rankPriority: 9, code: '09', staffCategory: 'Non-Teaching' },
    { titleEng: 'Office Support Staff', titleBng: 'অফিস সহায়ক', rankPriority: 10, code: '10', staffCategory: 'Non-Teaching' },
    { titleEng: 'Security Guard', titleBng: 'নিরাপত্তা প্রহরী', rankPriority: 11, code: '11', staffCategory: 'Non-Teaching' },
    { titleEng: 'Night Guard', titleBng: 'নৈশ প্রহরী', rankPriority: 12, code: '12', staffCategory: 'Non-Teaching' },
    { titleEng: 'Cleaner', titleBng: 'পরিচ্ছন্নতাকর্মী', rankPriority: 13, code: '13', staffCategory: 'Non-Teaching' },
    { titleEng: 'Ayah', titleBng: 'আয়া', rankPriority: 14, code: '14', staffCategory: 'Non-Teaching' },
    { titleEng: 'Other', titleBng: 'অন্যান্য', rankPriority: 15, code: '15', staffCategory: 'Non-Teaching' }
]);

const DESIGNATIONS = Object.freeze(DESIGNATION_DETAILS.map(d => d.titleEng));

const DEGREE_LEVEL_WEIGHTS = Object.freeze({
    'PhD': 6,
    'Masters': 5,
    'Kamil': 5,
    'MA': 5,
    'MSc': 5,
    'MSS': 5,
    'MBA': 5,
    'Honours': 4,
    'Fazil': 4,
    'BA': 4,
    'BSc': 4,
    'BSS': 4,
    'BBA': 4,
    'HSC': 3,
    'Alim': 3,
    'Diploma': 3,
    'SSC': 2,
    'Dakhil': 2,
    'JDC': 1,
    'JSC': 1,
    'Eight': 1,
    'Other': 0
});

const ATTENDANCE_STATUS = Object.freeze({
    PRESENT: 'Present',
    EXCUSED_LATE: 'Late (Excused)',
    LATE: 'Late',
    LEAVE: 'Leave',
    ABSENT: 'Absent',
    OFFICIAL_DUTY: 'Official Duty',
    APPROVED_SICK_LEAVE: 'Approved Sick Leave',
    APPROVED_CASUAL_LEAVE: 'Approved Casual Leave',
    HOLIDAY_DUTY: 'Holiday Duty'
});

const ATTENDANCE_SOURCES = Object.freeze({
    BIOMETRIC: 'Biometric',
    MANUAL_ADMIN: 'Manual_Admin',
    SYSTEM_CRON: 'System_Cron'
});

const LEAVE_TYPES = Object.freeze({
    CASUAL: 'Casual Leave',
    SICK: 'Sick Leave',
    LATE_EXCUSE: 'Late Excuse',
    OFFICIAL_DUTY: 'Official Duty',
    WITHOUT_PAY: 'Leave Without Pay'
});

const LEAVE_APPROVAL_STATUS = Object.freeze({
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected'
});

const SALARY_ADJUSTMENT_MODES = Object.freeze({
    INCREASE_AMOUNT: 'INCREASE_AMOUNT',
    DECREASE_AMOUNT: 'DECREASE_AMOUNT',
    INCREASE_PERCENT: 'INCREASE_PERCENT',
    DECREASE_PERCENT: 'DECREASE_PERCENT',
    INCREASE_DAYS: 'INCREASE_DAYS',
    DECREASE_DAYS: 'DECREASE_DAYS'
});

const ATTENDANCE_RULES = Object.freeze({
    DEFAULT_IN_TIME: '09:00',
    DEFAULT_LATE_LIMIT: '10:00',
    LATE_DEDUCTION_WEIGHT: 0.5,
    LEAVE_DEDUCTION_WEIGHT: 1.0,
    ABSENT_PENALTY_DAYS: 1.0,
    MONTHLY_PAID_LEAVE_QUOTA: 2.0,
    AUTO_IGNORE_ATTENDANCE_THRESHOLD_PERCENT: 30
});

module.exports = {
    ROLES,
    EMPLOYMENT_TYPES,
    PAYMENT_METHODS,
    BLOOD_GROUPS,
    DESIGNATION_DETAILS,
    DESIGNATIONS,
    DEGREE_LEVEL_WEIGHTS,
    ATTENDANCE_STATUS,
    ATTENDANCE_SOURCES,
    LEAVE_TYPES,
    LEAVE_APPROVAL_STATUS,
    SALARY_ADJUSTMENT_MODES,
    ATTENDANCE_RULES
};
