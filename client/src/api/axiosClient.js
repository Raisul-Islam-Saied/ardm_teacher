/**
 * ARDM Enterprise ERP — Centralized Axios HTTP Client & Interceptors
 * Features:
 * - Automatic JWT Bearer Token injection
 * - Request duration & latency measurement (ms)
 * - Structured Bengali error normalization for all HTTP status codes
 * - Field-level validation error extraction from express-validator
 * - Automatic 401 Unauthorized session expiration broadcast
 */

import axios from 'axios';
import { STORAGE_KEYS } from '@constants/app.constants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const axiosClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // ৩০ সেকেন্ড টাইমআউট (বড় পেনড্রাইভ লগ বা ব্যাকআপের জন্য নিরাপদ)
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    withCredentials: true
});

/**
 * ১. Request Interceptor: প্রতিটি রিকোয়েস্টের আগে টোকেন ও টাইমস্ট্যাম্প যুক্ত করা
 */
axiosClient.interceptors.request.use(
    (config) => {
        // রিকোয়েস্টের শুরুর সময় রেকর্ড করা (লেটেন্সি মাপার জন্য)
        config.metadata = { startTime: performance.now() };

        try {
            const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (storageErr) {
            console.warn('LocalStorage token read warning:', storageErr);
        }

        return config;
    },
    (error) => {
        return Promise.reject(normalizeApiError(error));
    }
);

/**
 * ২. Response Interceptor: রেসপন্স টাইম হিসাব করা এবং যেকোনো এররকে বাংলায় সাজানো
 */
axiosClient.interceptors.response.use(
    (response) => {
        const startTime = response.config?.metadata?.startTime;
        const durationMs = startTime ? Math.round(performance.now() - startTime) : null;

        // ব্যাকএন্ডের ApiResponse স্ট্রাকচার ({ statusCode, data, message, success }) অক্ষুণ্ণ রেখে মেটাডেটা যুক্ত করা
        if (response.data && typeof response.data === 'object') {
            response.data._meta = {
                httpStatus: response.status,
                latencyMs: durationMs,
                timestamp: new Date().toISOString()
            };
        }

        return response;
    },
    (error) => {
        const normalized = normalizeApiError(error);

        // যদি টোকেন মেয়াদোত্তীর্ণ বা অবৈধ হয় (401), তবে গ্লোবাল ইভেন্ট ফায়ার করা (লগইন পেজে ছাড়া)
        if (normalized.statusCode === 401 && !window.location.pathname.includes('/login')) {
            try {
                localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
                localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
                window.dispatchEvent(new CustomEvent('ardm:auth-expired', { detail: normalized }));
            } catch (e) {
                // Ignore storage errors
            }
        }

        return Promise.reject(normalized);
    }
);

/**
 * ৩. যেকোনো নেটওয়ার্ক বা সার্ভার এররকে একটি প্রমিত (Standardized) অবজেক্টে রূপান্তর করার ফাংশন
 */
export function normalizeApiError(error) {
    // ক. ইন্টারনেট না থাকলে বা ব্যাকএন্ড সার্ভার বন্ধ থাকলে
    if (!error.response) {
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        const isTimeout = error.code === 'ECONNABORTED' || String(error.message).includes('timeout');

        return {
            isNormalizedError: true,
            statusCode: 0,
            errorCode: isOffline ? 'NETWORK_OFFLINE' : (isTimeout ? 'REQUEST_TIMEOUT' : 'SERVER_UNREACHABLE'),
            message: isOffline
                ? 'আপনার ইন্টারনেট সংযোগ বিচ্ছিন্ন রয়েছে। অনুগ্রহ করে ওয়াইফাই বা ডাটা সংযোগ চেক করুন।'
                : isTimeout
                    ? 'সার্ভার থেকে সাড়া পেতে বেশি সময় লাগছে (Timeout)। অনুগ্রহ করে আবার চেষ্টা করুন।'
                    : 'ব্যাকএন্ড সার্ভারের (Port 5000) সাথে সংযোগ স্থাপন করা যাচ্ছে না। সার্ভার চালু আছে কি না যাচাই করুন।',
            fieldErrors: {},
            rawErrors: [],
            timestamp: new Date().toISOString()
        };
    }

    // খ. সার্ভার থেকে রেসপন্স এসেছে কিন্তু স্ট্যাটাস কোড 4xx বা 5xx
    const status = error.response.status;
    const resData = error.response.data || {};
    const rawErrors = Array.isArray(resData.errors) ? resData.errors : [];

    // express-validator থেকে আসা ফিল্ড এররগুলোকে { fieldName: "Error Message" } ম্যাপে সাজানো
    const fieldErrors = {};
    rawErrors.forEach((errItem) => {
        const key = errItem.field || errItem.path || errItem.param;
        const msg = errItem.message || errItem.msg;
        if (key && msg && !fieldErrors[key]) {
            fieldErrors[key] = msg;
        }
    });

    // স্ট্যাটাস কোড অনুযায়ী ডিফল্ট বাংলা মেসেজ
    let fallbackMessage = 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
    if (status === 400) fallbackMessage = 'প্রদত্ত তথ্যে কিছু ত্রুটি রয়েছে। অনুগ্রহ করে লাল চিহ্নিত ঘরগুলো যাচাই করুন।';
    if (status === 401) fallbackMessage = 'আপনার লগইন সেশনের মেয়াদ শেষ হয়েছে অথবা পাসওয়ার্ড সঠিক নয়।';
    if (status === 403) fallbackMessage = 'এই কাজটি করার জন্য আপনার প্রয়োজনীয় অনুমতি (Permission) নেই।';
    if (status === 404) fallbackMessage = 'কাঙ্ক্ষিত তথ্য বা রেকর্ডটি সার্ভারে খুঁজে পাওয়া যায়নি।';
    if (status === 409) fallbackMessage = 'এই তথ্যটি (মোবাইল নম্বর, NID বা আইডি) ইতিমধ্যে সিস্টেমে নিবন্ধিত রয়েছে!';
    if (status === 423) fallbackMessage = 'একাধিকবার ভুল পাসওয়ার্ড দেওয়ার কারণে অ্যাকাউন্টটি সাময়িকভাবে লক করা হয়েছে।';
    if (status === 429) fallbackMessage = 'অতিরিক্ত রিকোয়েস্ট পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করে চেষ্টা করুন।';
    if (status >= 500) fallbackMessage = 'সার্ভারে অভ্যন্তরীণ সমস্যা হয়েছে। অনুগ্রহ করে কয়েক মুহূর্ত পর চেষ্টা করুন।';

    return {
        isNormalizedError: true,
        statusCode: status,
        errorCode: resData.errorCode || `HTTP_${status}`,
        message: resData.message || fallbackMessage,
        fieldErrors,
        rawErrors,
        lockRemainingMinutes: resData.data?.lockRemainingMinutes || null,
        timestamp: new Date().toISOString()
    };
}

/**
 * ৪. ব্যাকএন্ড সার্ভার চালু আছে কি না এবং ডাটাবেস কানেক্টেড কি না তা পরীক্ষা করার হেল্পার
 */
export async function checkBackendHealth() {
    const start = performance.now();
    try {
        const res = await axiosClient.get('/health');
        const latencyMs = Math.round(performance.now() - start);
        return {
            online: true,
            latencyMs,
            statusText: res.data?.message || 'Backend Server Active',
            serverData: res.data?.data || res.data
        };
    } catch (err) {
        return {
            online: false,
            latencyMs: Math.round(performance.now() - start),
            statusText: err.message || 'Backend Server Offline',
            error: err
        };
    }
}

export default axiosClient;
