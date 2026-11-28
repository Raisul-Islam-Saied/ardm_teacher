const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload.middleware');
const {
    uploadImageToCloud,
    updateTeacherProfilePicture
} = require('../controllers/upload.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/system.constants');

// ০. পাবলিক + লগইন ইউজারদের জন্য ছবির ব্যাকগ্রাউন্ড রিমুভ (POST: /api/v1/upload/remove-bg)
router.post('/remove-bg', express.json({ limit: '10mb' }), async (req, res) => {
    try {
        const apiKey = process.env.CLIPDROP_API_KEY;
        if (!apiKey) {
            return res.status(503).json({
                success: false,
                message: 'ব্যাকগ্রাউন্ড রিমুভ সার্ভিস কনফিগার করা নেই।'
            });
        }

        const { imageBase64 } = req.body || {};
        if (!imageBase64 || typeof imageBase64 !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'সঠিক ছবি প্রদান করুন।'
            });
        }

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const formData = new FormData();
        formData.append('image_file', new Blob([imageBuffer], { type: 'image/jpeg' }), 'photo.jpg');

        const clipdropRes = await fetch('https://clipdrop-api.co/remove-background/v1', {
            method: 'POST',
            headers: { 'x-api-key': apiKey },
            body: formData
        });

        if (!clipdropRes.ok) {
            return res.status(clipdropRes.status).json({
                success: false,
                message: 'ব্যাকগ্রাউন্ড সাদা করা যায়নি। অনুগ্রহ করে সাদা ব্যাকগ্রাউন্ডের অন্য ছবি দিন।'
            });
        }

        const pngBuffer = Buffer.from(await clipdropRes.arrayBuffer());
        return res.json({
            success: true,
            data: {
                imageBase64: `data:image/png;base64,${pngBuffer.toString('base64')}`
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'সার্ভার ত্রুটির কারণে ব্যাকগ্রাউন্ড সাদা করা যায়নি।'
        });
    }
});

router.use(protect);

// ১. যেকোনো ছবি বা ডকুমেন্ট আপলোড করে URL নেওয়া (POST: /api/v1/upload/image)
router.post('/image', upload.single('file'), uploadImageToCloud);

// ২. নির্দিষ্ট শিক্ষকের প্রোফাইল ছবি সরাসরি পরিবর্তন ও ডাটাবেসে সেভ করা (PATCH: /api/v1/upload/profile-picture/:teacherId)
router.patch(
    '/profile-picture/:teacherId',
    restrictTo(ROLES.SUPER_ADMIN, ROLES.ADMIN),
    upload.single('file'),
    updateTeacherProfilePicture
);

module.exports = router;
