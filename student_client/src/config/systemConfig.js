// ==============================================
// ARDM Student Portal — System Configuration
// ==============================================

export const ONLY_ADMIN = true;
export const MAINTAINANCE_MODE = false;  // true হলে মেইনটেন্যান্স মোডে যাবে, false হলে নরমাল মোডে থাকবে

export const RESULT_PUBLISH_TIME = "2026-08-17T19:30:00+06:00";

// ---------- Centralized ERP backend ----------
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// Shared with the Teacher ERP client so the session is common
export const TOKEN_STORAGE_KEY = "ardm_erp_jwt_token";
export const USER_STORAGE_KEY = "ardm_erp_auth_user";

// Roles allowed to enter the student portal
export const ALLOWED_ROLES = ["SuperAdmin", "Admin", "Teacher"];

export const CLASS_ORDER = {
  'প্লে': 1, 'নার্সারি': 2, 'কেজি': 3,
  '১ম': 4, '২য়': 5, '৩য়': 6, '৪র্থ': 7, '৫ম': 8,
  '৬ষ্ঠ': 9, '৭ম': 10, '৮ম': 11, '৯ম': 12, '১০ম': 13
};

export const CONFIG = {
  CLOUD_NAME: "djjnoclzp",
  UPLOAD_PRESET: "student_db",
  APP_NAME: "Abdur Razzak Dakhil Madrasah "
};

export const DEFAULT_IMAGE = "https://res.cloudinary.com/djjnoclzp/image/upload/v1769562330/yqbvj37lzjbokc2vw6wu.jpg";
