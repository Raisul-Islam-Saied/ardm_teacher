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
    if (data?.message) return data.message;
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
        return data.errors.map((e) => e.message || e.msg).join(' | ');
    }
    return error.message || fallbackMessage;
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

let __authMeCachePromise = null;
let __authMeLastTime = 0;
const __origGet = axiosClient.get.bind(axiosClient);

axiosClient.get = function (url, config) {
    if (typeof url === 'string' && url.includes('/auth/me')) {
        const now = Date.now();
        if (__authMeCachePromise && now - __authMeLastTime < 10000) {
            return __authMeCachePromise;
        }
        __authMeLastTime = now;
        __authMeCachePromise = __origGet(url, config).finally(() => {
            setTimeout(() => { __authMeCachePromise = null; }, 10000);
        });
        return __authMeCachePromise;
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
