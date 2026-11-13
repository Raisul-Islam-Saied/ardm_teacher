const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload.middleware');
const {
    uploadImageToCloud,
    updateTeacherProfilePicture
} = require('../controllers/upload.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/system.constants');

router.use(protect);

// ১. যেকোনো ছবি বা ডকুমেন্ট আপলোড করে URL নেওয়া (POST: /api/v1/upload/image)
router.post('/image', upload.single('file'), uploadImageToCloud);

// ২. নির্দিষ্ট শিক্ষকের প্রোফাইল ছবি সরাসরি পরিবর্তন ও ডাটাবেসে সেভ করা (PATCH: /api/v1/upload/profile-picture/:teacherId)
router.patch(
    '/profile-picture/:teacherId',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    upload.single('file'),
    updateTeacherProfilePicture
);

module.exports = router;
