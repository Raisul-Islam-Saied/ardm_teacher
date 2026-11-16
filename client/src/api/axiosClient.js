import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'ardm_erp_jwt_token';
export const USER_STORAGE_KEY = 'ardm_erp_auth_user';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export function getStoredAuthToken() {
    try { return localStorage.getItem(TOKEN_STORAGE_KEY); } catch (e) { return null; }
}

export function getStoredAuthUser() {
    try {
        const raw = localStorage.getItem(USER_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

export function setAuthSessionStorage(token, user) {
    try {
        if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
        if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {}
}

export function clearAuthSessionStorage() {
    try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
    } catch (e) {}
}

export function extractApiErrorMessage(error, fallbackMessage = 'সার্ভারের সাথে সংযোগে সমস্যা হয়েছে।') {
    if (!error) return fallbackMessage;
    const data = error?.response?.data;
    if (data?.message || (Array.isArray(data?.errors) && data.errors.length > 0)) {
        const details = Array.isArray(data.errors)
            ? data.errors.map((item) => item.message || item.msg).filter(Boolean)
            : [];
        return [data.message, ...details.filter((detail) => detail !== data.message)]
            .filter(Boolean)
            .join(' ');
    }
    if (error.code === 'ECONNABORTED') {
        return 'সার্ভার থেকে উত্তর পেতে দেরি হচ্ছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।';
    }
    if (error.request || error.code === 'ERR_NETWORK') {
        return 'সার্ভারের সঙ্গে সংযোগ করা যাচ্ছে না। ইন্টারনেট বা সার্ভার চালু আছে কি না যাচাই করুন।';
    }
    if (!error.isAxiosError && error.message) return error.message;
    return fallbackMessage;
}

const axiosClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
    }
});

axiosClient.interceptors.request.use(
    (config) => {
        const token = getStoredAuthToken();
        if (token && token !== 'ardm_dev_session_token') {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);

let __authMeCache = null;
const __origGet = axiosClient.get.bind(axiosClient);

axiosClient.get = function (url, config) {
    if (typeof url === 'string' && url.includes('/auth/me')) {
        const token = getStoredAuthToken();
        if (__authMeCache?.token === token) {
            return __authMeCache.promise;
        }
        const cacheEntry = { token, promise: null };
        cacheEntry.promise = __origGet(url, config).finally(() => {
            if (__authMeCache === cacheEntry) {
                __authMeCache = null;
            }
        });
        __authMeCache = cacheEntry;
        return cacheEntry.promise;
    }
    return __origGet(url, config);
};

export async function checkBackendHealth() {
    try {
        const start = performance.now();
        await axiosClient.get('/system/settings', { timeout: 4000 });
        return {
            isOnline: true,
            status: 'connected',
            latencyMs: Math.round(performance.now() - start)
        };
    } catch (err) {
        if (err?.response) {
            return { isOnline: true, status: 'connected', latencyMs: 10 };
        }
        return { isOnline: false, status: 'disconnected', latencyMs: null };
    }
}

export default axiosClient;
