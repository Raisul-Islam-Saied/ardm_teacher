const ROLES = Object.freeze({
    SUPER_ADMIN: 'SuperAdmin',
    ADMIN: 'Admin',
    TEACHER: 'Teacher'
});

const GENDER = Object.freeze({
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other'
});

const BLOOD_GROUPS = Object.freeze(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

const MARITAL_STATUS = Object.freeze({
    SINGLE: 'Single',
    MARRIED: 'Married',
    WIDOWED: 'Widowed',
    DIVORCED: 'Divorced'
});

const EMPLOYMENT_TYPE = Object.freeze({
    MPO: 'MPO',
    NON_MPO: 'Non-MPO',
    PART_TIME: 'Part-Time',
    CONTRACTUAL: 'Contractual'
});

const ATTENDANCE_STATUS = Object.freeze({
    PRESENT: 'Present',
    LATE: 'Late',                                 // ০.৫ দিন কোটা কাটবে
    EXCUSED_LATE: 'Late (Excused)',               // কল করে বলে দেরি বা কাজে গেলে (কোনো কোটা বা বেতন কাটবে না)
    OFFICIAL_DUTY: 'Official Duty',               // মাদ্রাসার কাজে বাইরে থাকলে (কোনো কোটা বা বেতন কাটবে না)
    LEAVE: 'Leave',                               // অনুমোদিত বা ১০টার পরে আসলে (১.০ দিন কোটা থেকে কাটবে)
    ABSENT: 'Absent',                             // বিনা অনুমতিতে অনুপস্থিত (কোটা থাকলেও সরাসরি ১ দিনের বেতন কাটা যাবে!)
    APPROVED_SICK_LEAVE: 'Approved Sick Leave',   // বিশেষ মওকুফ ছুটি
    APPROVED_CASUAL_LEAVE: 'Approved Casual Leave',
    HOLIDAY_DUTY: 'Holiday Duty',
    WEEKEND: 'Weekend',
    HOLIDAY: 'Holiday'
});

// ৬ ধরনের বেতন ও পে-রোল অ্যাডজাস্টমেন্ট মোড (টাকা, পার্সেন্ট এবং দিন অনুযায়ী)
const SALARY_ADJUSTMENT_MODES = Object.freeze({
    INCREASE_AMOUNT: 'Increase ৳',
    DECREASE_AMOUNT: 'Decrease ৳',
    INCREASE_PERCENT: 'Increase %',
    DECREASE_PERCENT: 'Decrease %',
    INCREASE_DAYS: 'Increase Day',   // ১ দিন, ২ দিন অনুযায়ী বাড়ানো
    DECREASE_DAYS: 'Decrease Day'    // ১ দিন, ২ দিন অনুযায়ী কমানো
});

const PAYMENT_STATUS = Object.freeze({
    PENDING: 'Pending',
    PAID: 'Paid',
    CANCELLED: 'Cancelled'
});

const ATTENDANCE_POLICY = Object.freeze({
    DEFAULT_IN_TIME: '09:00',
    DEFAULT_LATE_LIMIT: '10:00',
    LATE_DEDUCTION_WEIGHT: 0.5,
    LEAVE_DEDUCTION_WEIGHT: 1.0,
    ABSENT_PENALTY_DAYS: 1.0,          // বিনা অনুমতিতে Absent হলে সরাসরি ১ দিনের বেতন কর্তন
    MONTHLY_PAID_LEAVE_QUOTA: 2.0,     // মাসে ২ দিন পেইড ছুটির কোটা (শুধুমাত্র Late ও Leave এর জন্য প্রযোজ্য)
    AUTO_IGNORE_THRESHOLD_PERCENT: 30,
    WEEKEND_DAY: 5
});

const PAYROLL_POLICY = Object.freeze({
    DEFAULT_BONUS_PERCENT: 50,
    DAYS_IN_SALARY_MONTH: 30
});

module.exports = {
    ROLES,
    GENDER,
    BLOOD_GROUPS,
    MARITAL_STATUS,
    EMPLOYMENT_TYPE,
    ATTENDANCE_STATUS,
    SALARY_ADJUSTMENT_MODES,
    PAYMENT_STATUS,
    ATTENDANCE_POLICY,
    PAYROLL_POLICY
};
