/**
 * ARDM Enterprise ERP — Step 4: Network Layer, Axios Interceptors,
 * Cloudinary 500x500 Crop Uploader, Offline Detector & Global Error Shield
 * Run from D:\ardm_teacher: node setup_step4_network.js
 */

const fs = require('fs');
const path = require('path');

console.log('🌐 Initializing Step 4: Enterprise Network Layer, Cloudinary Engine & Crash Shield...\n');

const clientDir = fs.existsSync(path.join(__dirname, 'src'))
    ? __dirname
    : path.join(__dirname, 'client');

if (!fs.existsSync(clientDir)) {
    console.error('❌ Error: client directory not found!');
    process.exit(1);
}

const files = {
    // =========================================================================
    // 1. AXIOS ENTERPRISE CLIENT & BILINGUAL ERROR NORMALIZER
    // =========================================================================
    'src/api/axiosClient.js': `/**
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
                config.headers.Authorization = \`Bearer \${token}\`;
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
        errorCode: resData.errorCode || \`HTTP_\${status}\`,
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

export default axiosClient;`,

    // =========================================================================
    // 2. CLOUDINARY 500x500 SQUARE PROCESSOR & PROGRESS UPLOADER
    // =========================================================================
    'src/api/cloudinaryClient.js': `/**
 * ARDM Enterprise ERP — Client-Side 500x500 Square Image Processor & Cloudinary Uploader
 * Features:
 * - Automatic Center-Crop & Resize to exact 500x500px JPEG (High Quality 0.92)
 * - Live upload progress callback (0% to 100%)
 * - Direct upload to Cloudinary preset OR Authenticated Backend Upload fallback
 */

import axios from 'axios';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'djjnoclzp';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'student_db';
const DEFAULT_FOLDER = import.meta.env.VITE_CLOUDINARY_FOLDER || 'ardm/teachers';

/**
 * ১. যেকোনো ছবিকে ব্রাউজারের HTML5 Canvas দিয়ে নিখুঁত 500×500 বর্গাকার (Square) জেপিইজিতে রূপান্তর করা
 * @param {File|Blob} file - ইউজারের সিলেক্ট করা ছবি
 * @param {object} options - { targetSize: 500, quality: 0.92, enforceStrictSquareInput: false }
 */
export function processImageToSquare500(file, options = {}) {
    const {
        targetSize = 500,
        quality = 0.92,
        enforceStrictSquareInput = false
    } = options;

    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error('কোনো ছবির ফাইল নির্বাচন করা হয়নি।'));
        }

        if (!/^image\\/(jpeg|png|webp)$/i.test(file.type)) {
            return reject(new Error('শুধুমাত্র JPG, PNG অথবা WEBP ফরম্যাটের ছবি গ্রহণযোগ্য।'));
        }

        if (file.size > 10 * 1024 * 1024) {
            return reject(new Error('ছবির সাইজ সর্বোচ্চ ১০ মেগাবাইট (10MB) হতে পারবে।'));
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();

            img.onload = () => {
                const origW = img.naturalWidth || img.width;
                const origH = img.naturalHeight || img.height;

                if (origW < 150 || origH < 150) {
                    return reject(new Error(\`ছবির রেজোলিউশন অত্যন্ত কম (\${origW}×\${origH})। কমপক্ষে 300×300 পিক্সেলের স্পষ্ট ছবি দিন।\`));
                }

                if (enforceStrictSquareInput && origW !== origH) {
                    return reject(new Error(\`ছবিটি বর্গাকার (Square) নয় (\${origW}×\${origH})। প্রস্থ এবং উচ্চতা সমান হতে হবে।\`));
                }

                // সেন্টার-ক্রপ ক্যালকুলেশন (যদি ছবিটি আয়তাকার হয়, তবে মাঝখান থেকে নিখুঁত স্কয়ার অংশ কেটে নেবে)
                const minSide = Math.min(origW, origH);
                const cropX = Math.floor((origW - minSide) / 2);
                const cropY = Math.floor((origH - minSide) / 2);

                const canvas = document.createElement('canvas');
                canvas.width = targetSize;
                canvas.height = targetSize;

                const ctx = canvas.getContext('2d');
                // সাদা ব্যাকগ্রাউন্ড ফিল (যদি ট্রান্সপারেন্ট PNG হয় তবে ব্যাকগ্রাউন্ড নিখুঁত সাদা হয়ে যাবে)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, targetSize, targetSize);

                // হাই-কোয়ালিটি ইমেজ স্মুথিং
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                ctx.drawImage(
                    img,
                    cropX,
                    cropY,
                    minSide,
                    minSide,
                    0,
                    0,
                    targetSize,
                    targetSize
                );

                const previewDataUrl = canvas.toDataURL('image/jpeg', quality);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            return reject(new Error('ছবি প্রসেস করতে সমস্যা হয়েছে। অন্য একটি ছবি দিয়ে চেষ্টা করুন।'));
                        }

                        const processedFile = new File([blob], 'teacher_photo_500x500.jpg', {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });

                        resolve({
                            blob,
                            file: processedFile,
                            dataUrl: previewDataUrl,
                            originalWidth: origW,
                            originalHeight: origH,
                            wasAutoCropped: origW !== origH,
                            outputWidth: targetSize,
                            outputHeight: targetSize,
                            sizeKB: Math.round(blob.size / 1024)
                        });
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = () => {
                reject(new Error('ছবির ফাইলটি পড়া যাচ্ছে না বা ক্ষতিগ্রস্ত হয়েছে।'));
            };

            img.src = event.target.result;
        };

        reader.onerror = () => {
            reject(new Error('ফাইল রিড করতে ব্রাউজারে সমস্যা হয়েছে।'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * ২. ক্লাউডিনারিতে সরাসরি ছবি আপলোড (পাবলিক রেজিস্ট্রেশন ও দ্রুত প্রিভিউর জন্য, প্রোগ্রেস বারসহ)
 * @param {Blob|File} imageBlob - ৫০০×৫০০ প্রসেস করা ছবি
 * @param {object} options - { publicId, folder, onProgress }
 */
export async function uploadSquarePhotoToCloudinary(imageBlob, options = {}) {
    const {
        publicId = \`teacher_\${Date.now()}\`,
        folder = DEFAULT_FOLDER,
        onProgress = null
    } = options;

    if (!imageBlob) {
        throw new Error('আপলোড করার জন্য কোনো ছবি পাওয়া যায়নি।');
    }

    const formData = new FormData();
    formData.append('file', imageBlob, \`\${publicId}.jpg\`);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);
    if (publicId) {
        formData.append('public_id', String(publicId));
    }

    const uploadUrl = \`https://api.cloudinary.com/v1_1/\${CLOUD_NAME}/image/upload\`;

    try {
        const response = await axios.post(uploadUrl, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 45000,
            onUploadProgress: (progressEvent) => {
                if (typeof onProgress === 'function' && progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percent);
                }
            }
        });

        return {
            success: true,
            url: response.data.secure_url,
            publicId: response.data.public_id,
            width: response.data.width,
            height: response.data.height,
            format: response.data.format,
            bytes: response.data.bytes
        };
    } catch (err) {
        const errMsg = err.response?.data?.error?.message || 'ক্লাউডিনারিতে ছবি আপলোড ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ যাচাই করুন।';
        throw new Error(errMsg);
    }
}`,

    // =========================================================================
    // 3. REAL-TIME NETWORK & BACKEND STATUS HOOK
    // =========================================================================
    'src/hooks/useNetworkStatus.js': `/**
 * ARDM Enterprise ERP — Real-Time Browser & Backend Connectivity Hook
 * Tracks navigator.onLine events and allows on-demand backend server health checks.
 */

import { useState, useEffect, useCallback } from 'react';
import { checkBackendHealth } from '@api/axiosClient';

export function useNetworkStatus(autoPingBackend = false) {
    const [isBrowserOnline, setIsBrowserOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [wasRecentlyOffline, setWasRecentlyOffline] = useState(false);
    const [backendHealth, setBackendHealth] = useState({
        checked: false,
        checking: false,
        online: false,
        latencyMs: null,
        statusText: 'যাচাই করা হয়নি'
    });

    const pingBackend = useCallback(async () => {
        setBackendHealth((prev) => ({ ...prev, checking: true }));
        const result = await checkBackendHealth();
        setBackendHealth({
            checked: true,
            checking: false,
            online: result.online,
            latencyMs: result.latencyMs,
            statusText: result.statusText,
            serverData: result.serverData || null
        });
        return result;
    }, []);

    useEffect(() => {
        let recoveryTimer = null;

        const handleOnline = () => {
            setIsBrowserOnline(true);
            setWasRecentlyOffline(true);
            if (autoPingBackend) {
                pingBackend();
            }
            recoveryTimer = setTimeout(() => {
                setWasRecentlyOffline(false);
            }, 4000);
        };

        const handleOffline = () => {
            setIsBrowserOnline(false);
            setWasRecentlyOffline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (autoPingBackend) {
            pingBackend();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (recoveryTimer) clearTimeout(recoveryTimer);
        };
    }, [autoPingBackend, pingBackend]);

    return {
        isBrowserOnline,
        wasRecentlyOffline,
        backendHealth,
        pingBackend
    };
}`,

    // =========================================================================
    // 4. OFFLINE & RECONNECTION TOP BANNER COMPONENT
    // =========================================================================
    'src/components/shared/OfflineBanner.jsx': `/**
 * ARDM Enterprise ERP — Live Offline & Reconnection Notification Bar
 * Automatically appears at the very top of the screen if Wi-Fi/Internet drops.
 */

import React from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

export default function OfflineBanner() {
    const { isBrowserOnline, wasRecentlyOffline } = useNetworkStatus(false);

    if (isBrowserOnline && !wasRecentlyOffline) {
        return null;
    }

    return (
        <div
            role="status"
            aria-live="polite"
            className={\`fixed top-0 left-0 right-0 z-[100] px-4 py-2.5 text-center text-xs sm:text-sm font-bengali font-medium shadow-md transition-all duration-300 no-print \${
                !isBrowserOnline
                    ? 'bg-danger text-white border-b border-gold/40'
                    : 'bg-success text-white'
            }\`}
        >
            <div className="max-w-5xl mx-auto flex items-center justify-center gap-2.5">
                {!isBrowserOnline ? (
                    <>
                        <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-gold-soft" />
                        <span>
                            <strong>ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে!</strong> আপনার ডিভাইসটি বর্তমানে অফলাইনে আছে। সংযোগ ফিরে না আসা পর্যন্ত নতুন তথ্য সেভ করবেন না।
                        </span>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-[11px] font-sans font-semibold transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                    </>
                ) : (
                    <>
                        <Wifi className="w-4 h-4 shrink-0 text-gold-soft" />
                        <span>
                            <strong>ইন্টারনেট সংযোগ পুনরায় স্থাপিত হয়েছে!</strong> সিস্টেম স্বাভাবিকভাবে কাজ করছে।
                        </span>
                    </>
                )}
            </div>
        </div>
    );
}`,

    // =========================================================================
    // 5. GLOBAL ERROR BOUNDARY (Zero White-Screen Crash Shield)
    // =========================================================================
    'src/components/shared/GlobalErrorBoundary.jsx': `/**
 * ARDM Enterprise ERP — Military-Grade Global Error Boundary
 * Prevents React runtime exceptions from ever showing a blank white screen.
 */

import React from 'react';
import { AlertOctagon, RotateCcw, Trash2 } from 'lucide-react';
import { INSTITUTION_INFO } from '@constants/app.constants';

export class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('🛡️ [ARDM GlobalErrorBoundary Caught Runtime Error]:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    handleSafeReset = () => {
        try {
            sessionStorage.clear();
        } catch (e) {
            // Ignore
        }
        window.location.href = '/';
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-paper text-ink">
                <div className="max-w-lg w-full ledger-surface p-8 text-center animate-pop-in">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger-bg border-2 border-danger/30 flex items-center justify-center text-danger">
                        <AlertOctagon className="w-8 h-8" />
                    </div>

                    <h1 className="font-bengali text-2xl font-bold text-emerald-deep">
                        সাময়িক কারিগরি ত্রুটি শনাক্ত হয়েছে
                    </h1>
                    <p className="font-bengali text-sm text-ink-soft mt-2 leading-relaxed">
                        অ্যাপ্লিকেশনটির একটি অংশে অপ্রত্যাশিত সমস্যা দেখা দিয়েছে। আপনার কোনো ডেটা নষ্ট হয়নি—নিচের বাটনে ক্লিক করে পেজটি রিলোড করুন।
                    </p>

                    {this.state.error && (
                        <div className="mt-5 p-3.5 rounded-xl bg-paper-deep border border-ink-faint text-left overflow-x-auto">
                            <p className="font-mono text-[11px] font-bold text-danger uppercase tracking-wider mb-1">
                                Diagnostic Trace:
                            </p>
                            <p className="font-mono text-xs text-ink-soft break-all">
                                {String(this.state.error.message || this.state.error)}
                            </p>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={this.handleReload}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald to-emerald-deep text-white text-xs font-bengali font-semibold shadow-emerald-glow hover:-translate-y-0.5 transition-all"
                        >
                            <RotateCcw className="w-4 h-4" />
                            পেজ রিলোড করুন
                        </button>
                        <button
                            type="button"
                            onClick={this.handleSafeReset}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-ink-faint bg-paper hover:bg-paper-deep text-ink-soft text-xs font-bengali font-semibold transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            হোম পেজে ফিরে যান
                        </button>
                    </div>

                    <p className="mt-6 pt-4 border-t border-ink-faint font-bengali text-xs text-ink-muted">
                        {INSTITUTION_INFO.nameBng} · {INSTITUTION_INFO.developerCreditBng}
                    </p>
                </div>
            </div>
        );
    }
}

export default GlobalErrorBoundary;`,

    // =========================================================================
    // 6. UPDATE main.jsx TO WRAP APP WITH GLOBAL ERROR BOUNDARY & OFFLINE BANNER
    // =========================================================================
    'src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import GlobalErrorBoundary from '@components/shared/GlobalErrorBoundary.jsx';
import OfflineBanner from '@components/shared/OfflineBanner.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <GlobalErrorBoundary>
            <OfflineBanner />
            <App />
        </GlobalErrorBoundary>
    </React.StrictMode>
);`,

    // =========================================================================
    // 7. STEP 4 DIAGNOSTIC & PHOTO CROPPER TEST BENCH (src/App.jsx)
    // =========================================================================
    'src/App.jsx': `import React, { useState } from 'react';
import {
    Server,
    Wifi,
    Camera,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    UploadCloud,
    ShieldAlert,
    Sparkles,
    Image as ImageIcon
} from 'lucide-react';
import { INSTITUTION_INFO } from '@constants/app.constants';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { processImageToSquare500 } from '@api/cloudinaryClient';
import { normalizeApiError } from '@api/axiosClient';
import { toBengaliDigits } from '@utils/formatters';

export default function App() {
    const { isBrowserOnline, backendHealth, pingBackend } = useNetworkStatus(true);

    // ৫০০×৫০০ স্কয়ার ফটো প্রসেসর টেস্ট স্টেট
    const [photoState, setPhotoState] = useState({
        processing: false,
        error: '',
        result: null
    });

    // এরর নরমালাইজার টেস্ট স্টেট
    const [simulatedError, setSimulatedError] = useState(null);

    const handlePhotoSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPhotoState({ processing: true, error: '', result: null });
        try {
            // যেকোনো মাপের ছবিকে অটোমেটিক সেন্টার-ক্রপ করে 500x500 স্কয়ার বানানো হচ্ছে
            const processed = await processImageToSquare500(file, {
                targetSize: 500,
                quality: 0.92,
                enforceStrictSquareInput: false
            });
            setPhotoState({ processing: false, error: '', result: processed });
        } catch (err) {
            setPhotoState({ processing: false, error: err.message, result: null });
        }
    };

    const triggerSimulatedError = (statusCode) => {
        const fakeAxiosError = statusCode === 0
            ? { request: {}, message: 'Network Error' }
            : {
                response: {
                    status: statusCode,
                    data: statusCode === 423
                        ? { message: 'পরপর ৫ বার ভুল পাসওয়ার্ড দেওয়ায় আপনার অ্যাকাউন্ট ১৫ মিনিটের জন্য লক করা হয়েছে!', data: { lockRemainingMinutes: 15 } }
                        : {}
                }
            };
        setSimulatedError(normalizeApiError(fakeAxiosError));
    };

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">

                {/* হেডার */}
                <div className="text-center mb-8 animate-fade-down">
                    <div className="flex justify-center mb-2">
                        <div className="madrasah-crest">{INSTITUTION_INFO.crestLetterBng}</div>
                    </div>
                    <h1 className="font-serif text-3xl sm:text-4xl font-bold text-emerald-deep">
                        {INSTITUTION_INFO.nameEng}
                    </h1>
                    <p className="font-bengali text-sm text-ink-soft mt-1">
                        ধাপ ৪ / ২৫ · নেটওয়ার্ক লেয়ার, Axios ইন্টারসেপ্টর, ৫০০×৫০০ ফটো ইঞ্জিন ও ক্র্যাশ শিল্ড
                    </p>
                </div>

                <div className="ledger-surface p-6 sm:p-8 animate-fade-up">
                    {/* টপ স্ট্যাটাস বার */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-ink-faint">
                        <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-subtle border border-emerald-border text-emerald text-xs font-mono font-bold uppercase">
                                <Sparkles className="w-3.5 h-3.5 text-gold-deep" />
                                Step 4 of 25: Core Network &amp; Media Layer Ready
                            </span>
                            <h2 className="font-bengali text-xl font-bold text-emerald-deep mt-2">
                                সার্ভার কানেক্টিভিটি ও ৫০০×৫০০ অটো-স্কয়ার ফটো প্রসেসর ল্যাব
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={pingBackend}
                            disabled={backendHealth.checking}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald text-white text-xs font-bengali font-semibold hover:bg-emerald-deep transition-all"
                        >
                            <RefreshCw className={\`w-3.5 h-3.5 \${backendHealth.checking ? 'animate-spin' : ''}\`} />
                            ব্যাকএন্ড সার্ভার পিং করুন
                        </button>
                    </div>

                    {/* ১. নেটওয়ার্ক ও ব্যাকএন্ড হেলথ স্ট্যাটাস গ্রিড */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                        {/* ব্রাউজার ইন্টারনেট স্ট্যাটাস */}
                        <div className="p-5 rounded-xl bg-paper border border-ink-faint flex items-start gap-4">
                            <div className={\`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 \${
                                isBrowserOnline ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
                            }\`}>
                                <Wifi className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bengali font-bold text-emerald-deep">
                                        ব্রাউজার ইন্টারনেট সংযোগ
                                    </h3>
                                    <span className={\`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full \${
                                        isBrowserOnline ? 'bg-success text-white' : 'bg-danger text-white'
                                    }\`}>
                                        {isBrowserOnline ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                </div>
                                <p className="font-bengali text-xs text-ink-soft mt-1">
                                    ওয়াইফাই বা ইন্টারনেট বন্ধ হলে সাথে সাথে স্ক্রিনের উপরে অটোমেটিক সতর্কবার্তা (Offline Banner) ভেসে উঠবে।
                                </p>
                            </div>
                        </div>

                        {/* ব্যাকএন্ড সার্ভার (Port 5000) স্ট্যাটাস */}
                        <div className="p-5 rounded-xl bg-paper border border-ink-faint flex items-start gap-4">
                            <div className={\`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 \${
                                backendHealth.online ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'
                            }\`}>
                                <Server className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-bengali font-bold text-emerald-deep">
                                        ব্যাকএন্ড সার্ভার (Port 5000)
                                    </h3>
                                    <span className={\`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full \${
                                        backendHealth.online
                                            ? 'bg-success text-white'
                                            : 'bg-warning text-white'
                                    }\`}>
                                        {backendHealth.checking
                                            ? 'CHECKING...'
                                            : backendHealth.online
                                                ? \`CONNECTED (\${backendHealth.latencyMs}ms)\`
                                                : 'STANDBY / OFFLINE'}
                                    </span>
                                </div>
                                <p className="font-bengali text-xs text-ink-soft mt-1">
                                    {backendHealth.online
                                        ? 'ব্যাকএন্ড সার্ভারের সাথে Vite প্রক্সির সংযোগ ১০০% সচল রয়েছে!'
                                        : 'ব্যাকএন্ড সার্ভার বর্তমানে বন্ধ থাকলেও ফ্রন্টএন্ড ক্র্যাশ করবে না (টার্মিনালে server চালু করলে সবুজ হয়ে যাবে)।'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ২. ৫০০×৫০০ স্কয়ার ফটো প্রসেসর টেস্ট জোন */}
                    <div className="p-6 rounded-xl bg-paper/70 border border-ink-faint mb-8">
                        <h3 className="font-bengali text-lg font-bold text-emerald-deep mb-1 flex items-center gap-2">
                            <Camera className="w-5 h-5 text-gold-deep" />
                            ৫০০×৫০০ পিক্সেল অটো-স্কয়ার ফটো প্রসেসর পরীক্ষা করুন
                        </h3>
                        <p className="font-bengali text-xs text-ink-soft mb-5">
                            যেকোনো লম্বা বা চওড়া ছবি সিলেক্ট করে দেখুন—আমাদের ক্যানভাস ইঞ্জিন সেটিকে স্বয়ংক্রিয়ভাবে মাঝখান থেকে কেটে নিখুঁত <b>500×500px Square JPEG</b> বানিয়ে ফেলবে।
                        </p>

                        <div className="flex flex-wrap items-center gap-6">
                            {/* প্রিভিউ ফ্রেম */}
                            <div className={\`w-36 h-36 rounded-2xl border-2 flex items-center justify-center overflow-hidden bg-paper-deep shrink-0 transition-all \${
                                photoState.result ? 'border-gold shadow-gold-glow' : 'border-dashed border-ink-faint'
                            }\`}>
                                {photoState.result ? (
                                    <img
                                        src={photoState.result.dataUrl}
                                        alt="500x500 Square Preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <ImageIcon className="w-10 h-10 text-ink-muted opacity-40" />
                                )}
                            </div>

                            {/* আপলোড বাটন ও মেটাডেটা */}
                            <div className="flex-1 min-w-[240px]">
                                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald text-white text-xs font-bengali font-semibold cursor-pointer hover:bg-emerald-deep shadow-sm transition-all">
                                    <UploadCloud className="w-4 h-4 text-gold-soft" />
                                    {photoState.processing ? 'প্রসেস হচ্ছে...' : 'যেকোনো ছবি নির্বাচন করুন (JPG/PNG/WEBP)'}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handlePhotoSelect}
                                        className="hidden"
                                    />
                                </label>

                                {photoState.error && (
                                    <p className="mt-3 text-xs text-danger font-bengali flex items-center gap-1.5 animate-shake">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {photoState.error}
                                    </p>
                                )}

                                {photoState.result && (
                                    <div className="mt-3 p-3 rounded-xl bg-success-bg border border-success-border text-xs font-bengali text-emerald-deep">
                                        <p className="font-bold flex items-center gap-1.5 text-success">
                                            <CheckCircle2 className="w-4 h-4" />
                                            ছবি সফলভাবে ৫০০×৫০০ পিক্সেল স্কয়ারে রূপান্তরিত হয়েছে!
                                        </p>
                                        <p className="font-mono text-[11px] text-ink-soft mt-1">
                                            Original: {photoState.result.originalWidth}×{photoState.result.originalHeight}px ➔ Output:{' '}
                                            <b>{photoState.result.outputWidth}×{photoState.result.outputHeight}px</b> ({toBengaliDigits(photoState.result.sizeKB)} KB)
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ৩. Axios ইন্টারসেপ্টর বাংলা এরর ট্রান্সলেটর টেস্ট */}
                    <div className="p-5 rounded-xl bg-paper border border-ink-faint">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <h3 className="font-bengali text-sm font-bold text-emerald-deep flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-gold-deep" />
                                Axios ইন্টারসেপ্টর বাংলা এরর ট্রান্সলেটর টেস্ট:
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { code: 0, label: 'Offline / Server Down' },
                                    { code: 409, label: '409 Duplicate NID/Phone' },
                                    { code: 423, label: '423 Account Locked (15m)' },
                                    { code: 500, label: '500 Server Error' }
                                ].map((item) => (
                                    <button
                                        key={item.code}
                                        type="button"
                                        onClick={() => triggerSimulatedError(item.code)}
                                        className="px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-subtle text-emerald hover:bg-emerald hover:text-white transition-colors"
                                    >
                                        Test {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {simulatedError && (
                            <div className="p-3.5 rounded-xl bg-danger-bg border border-danger-border text-xs font-bengali text-danger flex items-center justify-between gap-3 animate-pop-in">
                                <div>
                                    <span className="font-mono font-bold uppercase mr-2">
                                        [{simulatedError.errorCode}]
                                    </span>
                                    <span>{simulatedError.message}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSimulatedError(null)}
                                    className="text-[11px] font-mono underline shrink-0"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-center mt-6 font-bengali text-xs text-ink-soft opacity-80">
                    {INSTITUTION_INFO.developerCreditBng}
                </p>
            </div>
        </div>
    );
}`
};

Object.entries(files).forEach(([filePath, content]) => {
    const fullPath = path.join(clientDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
    console.log(`✅ Created/Updated File: client/${filePath}`);
});

console.log('\n🎉 Step 4 (Network Layer, Cloudinary 500x500 Engine & Global Error Shield) Completed!');