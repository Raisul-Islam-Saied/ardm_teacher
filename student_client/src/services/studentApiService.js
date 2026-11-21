/**
 * ARDM Student Portal — API Service (Centralized ERP backend)
 * Endpoints: /auth/login, /auth/me, /auth/logout, /students, /students/:id,
 *            /students/public/verify/:studentCode, /students/metadata, /students/legacy-lookup/:code
 * Returns RAW server documents. Conversion to the original UI field names
 * (ID, StudentNameBn, ...) is done in models/studentModel.js.
 */
import axiosClient, {
    clearAuthSessionStorage,
    setAuthSessionStorage
} from './axiosClient';
import { ALLOWED_ROLES } from '../config/systemConfig';

// ---------------------------------------------------------------
// Portal access guard (spec §3): block Pending / inactive / other roles
// ---------------------------------------------------------------
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

// ---------------------------------------------------------------
// Auth
// ---------------------------------------------------------------
export const authApi = {
    /** POST /auth/login  { identifier, password } → { user, token } */
    async login(identifier, password) {
        const res = await axiosClient.post('/auth/login', {
            identifier: String(identifier || '').trim(),
            password: String(password || '').trim()
        });
        const body = res.data?.data || res.data || {};
        const token = body.token || body.accessToken;
        const user = body.teacher || body.user;
        if (!token || !user) {
            throw new Error('সার্ভার থেকে বৈধ লগইন সেশন পাওয়া যায়নি।');
        }
        assertPortalAccess(user); // সেশন সেভ করার আগেই ব্লক
        setAuthSessionStorage(token, user);
        return { user, token, message: res.data?.message };
    },

    /** GET /auth/me  (Bearer token) → user */
    async me() {
        const res = await axiosClient.get('/auth/me');
        const user = unwrapUser(res);
        assertPortalAccess(user);
        return user;
    },

    async logout() {
        try {
            await axiosClient.post('/auth/logout');
        } catch (e) {
            /* সার্ভার অফলাইন হলেও লোকাল সেশন মুছবে */
        } finally {
            clearAuthSessionStorage();
        }
    }
};

// ---------------------------------------------------------------
// Students
// ---------------------------------------------------------------
export const studentApi = {
    /** GET /students → raw Mongo docs (Deleted বাদে) */
    async list(params = {}) {
        const res = await axiosClient.get('/students', { params });
        return res.data?.data?.students || [];
    },

    /** GET /students/:id (ObjectId অথবা studentCode) → { student, siblings } */
    async getById(id) {
        const res = await axiosClient.get(`/students/${encodeURIComponent(id)}`);
        return res.data?.data || null;
    },

    /** POST /students */
    async create(payload) {
        const res = await axiosClient.post('/students', payload);
        return { student: res.data?.data, message: res.data?.message };
    },

    /** PATCH /students/:_id */
    async update(id, payload) {
        const res = await axiosClient.patch(`/students/${encodeURIComponent(id)}`, payload);
        return { student: res.data?.data, message: res.data?.message };
    },

    /** DELETE /students/:_id  (soft delete → status = 'Deleted') */
    async remove(id, statusReason = '') {
        const res = await axiosClient.delete(`/students/${encodeURIComponent(id)}`, {
            data: statusReason ? { statusReason } : {}
        });
        return { message: res.data?.message };
    },

    /** GET /students/public/verify/:studentCode  — লগইন ছাড়া (QR ভেরিফিকেশন) */
    async publicVerify(studentCode) {
        const res = await axiosClient.get(
            `/students/public/verify/${encodeURIComponent(studentCode)}`
        );
        return res.data?.data || null;
    },

    /** GET /students/metadata */
    async metadata() {
        const res = await axiosClient.get('/students/metadata');
        return res.data?.data || {};
    },

    /** GET /students/legacy-lookup/:studentCode  — পুরনো গুগল শিট থেকে মাইগ্রেশনের জন্য */
    async legacyLookup(studentCode) {
        const res = await axiosClient.get(
            `/students/legacy-lookup/${encodeURIComponent(studentCode)}`
        );
        return { ...(res.data?.data || {}), message: res.data?.message };
    }
};

export default studentApi;
