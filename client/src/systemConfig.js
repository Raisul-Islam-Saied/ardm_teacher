export const ONLY_ADMIN = true;
export const MAINTAINANCE_MODE = false;  // true হলে মেইনটেনেন্স মোডে যাবে, false হলে নরমাল মোডে থাকবে

export const RESULT_PUBLISH_TIME = "2027-08-17T19:30:00+06:00";


// ==============================================
// 1. FIREBASE & APP CONFIGURATION
// ==============================================

export const firebaseConfig = {
  apiKey: "AIzaSyCrmkkxixxtiLON5JGqSU3Rsx5WVgQaUDw",
  authDomain: "central-pod-376117.firebaseapp.com",
  projectId: "central-pod-376117",
  storageBucket: "central-pod-376117.firebasestorage.app",
  messagingSenderId: "1003594162237",
  appId: "1:1003594162237:web:c7b377ab71e90c102d0a54",
  measurementId: "G-QETBDY6355"
};

export const CLASS_ORDER = {
  'প্লে': 1, 'নার্সারি': 2, 'কেজি': 3,
  '১ম': 4, '২য়': 5, '৩য়': 6, '৪র্থ': 7, '৫ম': 8,
  '৬ষ্ঠ': 9, '৭ম': 10, '৮ম': 11, '৯ম': 12, '১০ম': 13
};


export const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzlG01v-naEr4WZR__n4ZX9fPkQR9pE01A0n8W9fOMUfw5x3RIDNPD_ZyaDwsVz9fphFw/exec",
  CLOUD_NAME: "djjnoclzp", 
  UPLOAD_PRESET: "student_db", 
  APP_NAME: "Abdur Razzak Dakhil Madrasah "
};
export const DEFAULT_IMAGE = "https://res.cloudinary.com/djjnoclzp/image/upload/v1769562330/yqbvj37lzjbokc2vw6wu.jpg";
//export const DEFAULT_IMAGE = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrGR7ji-byWjJtRM4pf7KZnK1zqJIyRBV_uw0rLSW6QA&s=10.jpg";

// ROLE MAPPING (Email to Role)
export const USER_ROLES = {
  "admin@ardm.com": { role: "Admin" },
  "visitor@ardm.com": { role: "Visitor" },   // 👈 NEW
  "play@ardm.com":    { role: "Class", classBn: "প্লে",    classEn: "Play" },
  "nursery@ardm.com": { role: "Class", classBn: "নার্সারি", classEn: "Nursery" },
  "kg@ardm.com":      { role: "Class", classBn: "কেজি",    classEn: "KG" },

  "class1@ardm.com":  { role: "Class", classBn: "১ম", classEn: "One" },
  "class2@ardm.com":  { role: "Class", classBn: "২য়", classEn: "Two" },
  "class3@ardm.com":  { role: "Class", classBn: "৩য়", classEn: "Three" },
  "class4@ardm.com":  { role: "Class", classBn: "৪র্থ", classEn: "Four" },
  "class5@ardm.com":  { role: "Class", classBn: "৫ম", classEn: "Five" },
  "class6@ardm.com":  { role: "Class", classBn: "৬ষ্ঠ", classEn: "Six" },
  "class7@ardm.com":  { role: "Class", classBn: "৭ম", classEn: "Seven" },
  "class8@ardm.com":  { role: "Class", classBn: "৮ম", classEn: "Eight" },
  "class9@ardm.com":  { role: "Class", classBn: "৯ম", classEn: "Nine" },
  "class10@ardm.com": { role: "Class", classBn: "১০ম", classEn: "Ten" },
};
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoQM0Xf5SrusbRuCwe4b3s92rK7e014DYkgiuM3yOLs9KKZ773MUkmysrM3PcxyCbpbw/exec';
export const ADMIN_SECRET = "ARDM_DELETE_2026";
