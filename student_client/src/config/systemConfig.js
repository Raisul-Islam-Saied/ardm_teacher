// ==============================================
// ARDM Student Portal — System Configuration (Dynamic + Fallback)
// ==============================================

export const PORTAL_SETTINGS_CACHE_KEY = "ardm_portal_settings_v1";

export const DEFAULT_PORTAL_SETTINGS = {
  onlyAdminResults: true,
  maintenanceMode: false,
  resultPublishTime: "2026-08-17T19:30:00+06:00",
  classTeacherPermissions: {
    ownClass: {
      add: true,
      edit: true,
      delete: true,
      export: true
    },
    otherClass: {
      add: false,
      edit: false,
      delete: false,
      export: false
    }
  },
  nonClassTeacherPermissions: {
    add: false,
    edit: false,
    delete: false,
    export: false
  }
};

function mergePortalSettings(raw = {}) {
  const sp = raw?.studentPortal || raw || {};
  const ctp = sp.classTeacherPermissions || {};
  const own = ctp.ownClass || {};
  const other = ctp.otherClass || {};
  const nonClass = sp.nonClassTeacherPermissions || {};

  return {
    onlyAdminResults: sp.onlyAdminResults ?? DEFAULT_PORTAL_SETTINGS.onlyAdminResults,
    maintenanceMode: sp.maintenanceMode ?? DEFAULT_PORTAL_SETTINGS.maintenanceMode,
    resultPublishTime: sp.resultPublishTime || DEFAULT_PORTAL_SETTINGS.resultPublishTime,
    classTeacherPermissions: {
      ownClass: {
        add: own.add ?? DEFAULT_PORTAL_SETTINGS.classTeacherPermissions.ownClass.add,
        edit: own.edit ?? DEFAULT_PORTAL_SETTINGS.classTeacherPermissions.ownClass.edit,
        delete: own.delete ?? DEFAULT_PORTAL_SETTINGS.classTeacherPermissions.ownClass.delete,
        export: own.export ?? DEFAULT_PORTAL_SETTINGS.classTeacherPermissions.ownClass.export
      },
      otherClass: {
        add: other.add ?? DEFAULT_PORTAL_SETTINGS.classTeacherPermissions.otherClass.add,
        edit: other.edit ?? DEFAULT_PORTAL_SETTINGS.classTeacherPermissions.otherClass.edit,
        delete: other.delete ?? DEFAULT_PORTAL_SETTINGS.classTeacherPermissions.otherClass.delete,
        export: other.export ?? DEFAULT_PORTAL_SETTINGS.classTeacherPermissions.otherClass.export
      }
    },
    nonClassTeacherPermissions: {
      add: nonClass.add ?? DEFAULT_PORTAL_SETTINGS.nonClassTeacherPermissions.add,
      edit: nonClass.edit ?? DEFAULT_PORTAL_SETTINGS.nonClassTeacherPermissions.edit,
      delete: nonClass.delete ?? DEFAULT_PORTAL_SETTINGS.nonClassTeacherPermissions.delete,
      export: nonClass.export ?? DEFAULT_PORTAL_SETTINGS.nonClassTeacherPermissions.export
    }
  };
}

let cachedSettings = (() => {
  try {
    const saved = localStorage.getItem(PORTAL_SETTINGS_CACHE_KEY);
    return saved ? mergePortalSettings(JSON.parse(saved)) : mergePortalSettings();
  } catch {
    return mergePortalSettings();
  }
})();

export const getPortalSettings = () => cachedSettings;

export const syncPortalSettings = (serverPayload) => {
  cachedSettings = mergePortalSettings(serverPayload);
  try {
    localStorage.setItem(PORTAL_SETTINGS_CACHE_KEY, JSON.stringify(cachedSettings));
  } catch {
    // Ignore storage quota errors
  }
  return cachedSettings;
};

// ব্যাকওয়ার্ড কমপ্যাটিবিলিটির জন্য (পুরনো ফাইলগুলোতে ব্যবহৃত কনস্ট্যান্ট)
export const ONLY_ADMIN = cachedSettings.onlyAdminResults;
export const MAINTAINANCE_MODE = cachedSettings.maintenanceMode;
export const RESULT_PUBLISH_TIME = cachedSettings.resultPublishTime;

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
  '১ম': 4, '২য়': 5, '৩য়': 6, '৪র্থ': 7, '৫ম': 8,
  '৬ষ্ঠ': 9, '৭ম': 10, '৮ম': 11, '৯ম': 12, '১০ম': 13
};

export const CONFIG = {
  CLOUD_NAME: "djjnoclzp",
  UPLOAD_PRESET: "student_db",
  APP_NAME: "Abdur Razzak Dakhil Madrasah "
};

export const DEFAULT_IMAGE = "https://res.cloudinary.com/djjnoclzp/image/upload/v1769562330/yqbvj37lzjbokc2vw6wu.jpg";