/**
- ARDM Student Portal — API Service (Centralized ERP backend)
 */
import { ALLOWED_ROLES, syncPortalSettings } from '../config/systemConfig';
import axiosClient, {
    clearAuthSessionStorage,
    setAuthSessionStorage
} from './axiosClient';

export function assertPortalAccess(user) {
    if (!user || !(user._id || user.teacherCode)) {
        throw new Error('সার্ভার থেকে বৈধ ইউজার তথ্য পাওয়া যায়নি।');
    }
    if (user.registrationStatus === 'Pending') {
        throw new Error('আপনার রেজিস্ট্রেশন এখনও অনুমোদনের অপেক্ষায় আছে। অ্যাডমিনের সাথে যোগাযোগ করুন।');
    }
    if (user.registrationStatus === 'Rejected') {
        throw new Error('আপনার রেজিস্ট্রেশন বাতিল করা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।');
    }
    if (user.isActive === false) {
        throw new Error('আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।');
    }
    if (!ALLOWED_ROLES.includes(user.role)) {
        throw new Error('এই পোর্টালে প্রবেশের অনুমতি আপনার নেই।');
    }
    return true;
}

const unwrapUser = (res) =>
    res?.data?.data?.teacher || res?.data?.data?.user || res?.data?.data;

export const authApi = {
    async login(identifier, password) {
        const cleanId = String(identifier || '').trim();
        const res = await axiosClient.post('/auth/login', {
            phone: cleanId,
            identifier: cleanId,
            teacherCode: cleanId,
            password: String(password || '').trim()
        });
        const body = res.data?.data || res.data || {};
        const token = body.token || body.accessToken;
        const user = body.teacher || body.user;
        if (!token || !user) {
            throw new Error('সার্ভার থেকে বৈধ লগইন সেশন পাওয়া যায়নি।');
        }
        assertPortalAccess(user);
        setAuthSessionStorage(token, user);
        return { user, token, message: res.data?.message };
    },

    async me() {
        const res = await axiosClient.get('/auth/me');
        const user = unwrapUser(res);
        assertPortalAccess(user);
        return user;
    },

    async forgotPassword(email) {
        const res = await axiosClient.post('/auth/forgot-password', {
            email: String(email || '').trim().toLowerCase()
        });
        return res.data;
    },

    async resetPassword(token, newPassword) {
        const res = await axiosClient.post('/auth/reset-password', {
            token: String(token || '').trim(),
            newPassword: String(newPassword || '').trim()
        });
        return res.data;
    },

    async changePassword(currentPassword, newPassword) {
        const res = await axiosClient.patch('/auth/change-password', {
            currentPassword: String(currentPassword || '').trim(),
            newPassword: String(newPassword || '').trim()
        });
        return res.data;
    },

    async logout() {
        try {
            await axiosClient.post('/auth/logout');
        } catch (e) {
            /* অফলাইনে থাকলেও লোকাল সেশন মুছবে */
        } finally {
            clearAuthSessionStorage();
        }
    }
};

export const systemSettingsApi = {
    /** GET /system/settings/public (লগইন ছাড়াই পোর্টাল সেটিংস লোড) */
    async getPublicSettings() {
        const res = await axiosClient.get('/system/settings/public');
        const data = res.data?.data || res.data || {};
        if (data.studentPortal) {
            syncPortalSettings(data.studentPortal);
        }
        return data;
    },

    /** GET /system/settings (পূর্ণ গ্লোবাল সেটিংস) */
    async getSettings() {
        const res = await axiosClient.get('/system/settings');
        const data = res.data?.data || res.data || {};
        if (data.studentPortal) {
            syncPortalSettings(data.studentPortal);
        }
        return data;
    },

    /** PUT /system/settings (SuperAdmin / Admin আপডেট) */
    async updateSettings(payload) {
        const res = await axiosClient.put('/system/settings', payload);
        const data = res.data?.data || res.data || {};
        if (data.studentPortal) {
            syncPortalSettings(data.studentPortal);
        }
        return { data, message: res.data?.message };
    }
};

export const teacherPortalApi = {
    /** GET /teachers/my-portal/dashboard */
    async getMyDashboard(params = {}) {
        const res = await axiosClient.get('/teachers/my-portal/dashboard', { params });
        return res.data?.data || res.data || {};
    },

    /** GET /attendance/my-summary?month=MM&year=YYYY */
    async getMyMonthlyAttendance(month, year) {
        const res = await axiosClient.get('/attendance/my-summary', {
            params: { month, year }
        });
        return res.data?.data || res.data || {};
    },

    /** GET /payroll/sheets */
    async getMySalaryHistory(params = {}) {
        const res = await axiosClient.get('/payroll/sheets', { params });
        return res.data?.data || res.data || [];
    }
};

export const studentApi = {
    async list(params = {}) {
        const res = await axiosClient.get('/students', { params });
        return res.data?.data?.students || [];
    },

    async getById(id) {
        const res = await axiosClient.get(`/students/${encodeURIComponent(id)}`);
        return res.data?.data || null;
    },

    async create(payload) {
        const res = await axiosClient.post('/students', payload);
        return { student: res.data?.data, message: res.data?.message };
    },

    async update(id, payload) {
        const res = await axiosClient.patch(`/students/${encodeURIComponent(id)}`, payload);
        return { student: res.data?.data, message: res.data?.message };
    },

    async remove(id, statusReason = '') {
        const res = await axiosClient.delete(`/students/${encodeURIComponent(id)}`, {
            data: statusReason ? { statusReason } : {}
        });
        return { message: res.data?.message };
    },

    async publicVerify(studentCode) {
        const res = await axiosClient.get(
            `/students/public/verify/${encodeURIComponent(studentCode)}`
        );
        return res.data?.data || null;
    },

    async metadata() {
        const res = await axiosClient.get('/students/metadata');
        return res.data?.data || {};
    },

    async legacyLookup(studentCode) {
        const res = await axiosClient.get(
            `/students/legacy-lookup/${encodeURIComponent(studentCode)}`
        );
        return { ...(res.data?.data || {}), message: res.data?.message };
    }
};

export default studentApi;