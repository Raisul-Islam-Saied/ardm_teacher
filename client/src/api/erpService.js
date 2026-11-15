/**
 * ARDM Enterprise ERP — Unified Frontend API Service Layer (Step 21)
 * Connects Admin Command Center & Teacher Portal to Express/MongoDB Backend
 */

import axiosClient from './axiosClient';

export const erpService = {
    // ১. শিক্ষক ও সিনিয়রিটি ডিরেক্টরি এপিআই
    getAllTeachers: async (params = {}) => {
        const res = await axiosClient.get('/teachers', { params });
        return res.data?.data?.teachers || res.data?.data || [];
    },

    getTeacherById: async (id) => {
        const res = await axiosClient.get(`/teachers/${id}`);
        return res.data?.data?.teacher || res.data?.data || null;
    },

    updateTeacherProfile: async (id, payload) => {
        const res = await axiosClient.patch(`/teachers/${id}`, payload);
        return res.data?.data?.teacher || res.data?.data;
    },

    approvePendingTeacher: async (id, payload) => {
        const res = await axiosClient.patch(`/teachers/${id}/approve`, payload);
        return res.data?.data?.teacher || res.data?.data;
    },

    adminResetTeacherPassword: async (id, newPassword) => {
        const res = await axiosClient.patch(`/teachers/${id}/reset-password`, { newPassword });
        return res.data;
    },

    // ২. দৈনিক বায়োমেট্রিক হাজিরা ও ZKTeco K40 এপিআই
    getDailyAttendance: async (dateStr) => {
        const res = await axiosClient.get('/attendance/daily', { params: { date: dateStr } });
        return res.data?.data?.records || res.data?.data || [];
    },

    overrideAttendanceRow: async (payload) => {
        const res = await axiosClient.put('/attendance/override', payload);
        return res.data?.data;
    },

    // ৩. মাসিক পে-রোল ও ক্যাশ ভাউচার এপিআই
    getMonthlyPayrollSheet: async (year, month) => {
        const res = await axiosClient.get('/payroll/sheets', { params: { year, month } });
        return res.data?.data?.salaries || [];
    },

    disburseCashSalary: async (salaryId, payload) => {
        const res = await axiosClient.patch(`/payroll/sheets/${salaryId}/pay`, payload);
        return res.data?.data;
    },

    // ৪. সিস্টেম সেটিংস ও ছুটির নীতিমালা এপিআই
    getSystemSettings: async () => {
        const res = await axiosClient.get('/system/settings');
        return res.data?.data || {};
    },

    saveSystemSettings: async (policyPayload) => {
        const res = await axiosClient.put('/system/settings', {
            madrasahNameBng: policyPayload.madrasahNameBng,
            madrasahNameEng: policyPayload.madrasahNameEng,
            attendancePolicy: {
                defaultInTime: policyPayload.gateCutoffTime24,
                defaultLateLimit: policyPayload.defaultLateLimit,
                weekendDays: policyPayload.weekendDays.map(Number),
                lateDeductionWeight: Number(policyPayload.lateQuotaWeight),
                leaveDeductionWeight: Number(policyPayload.leaveQuotaWeight),
                absentPenaltyDays: Number(policyPayload.unexcusedAbsentDeductionDays),
                monthlyPaidLeaveQuota: Number(policyPayload.defaultMonthlyFreeQuota)
            },
            payrollPolicy: {
                useExactCalendarDays: Boolean(policyPayload.useExactCalendarDays),
                daysInSalaryMonth: Number(policyPayload.salaryMonthDivisor)
            }
        });
        return res.data?.data;
    },

    getSpecialDates: async () => {
        const res = await axiosClient.get('/attendance/special-date');
        return res.data?.data || [];
    },

    saveSpecialDate: async (payload) => {
        const res = await axiosClient.post('/attendance/special-date', payload);
        return res.data?.data;
    },

    deleteSpecialDate: async (date) => {
        const res = await axiosClient.delete(`/attendance/special-date/${date}`);
        return res.data;
    },

    getDatabaseBackup: async () => {
        const res = await axiosClient.get('/system/backup');
        return res.data;
    }
};

export default erpService;
