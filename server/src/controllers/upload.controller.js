const cloudinary = require('../config/cloudinary');
const Teacher = require('../models/Teacher');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// বাফার থেকে ক্লাউডিনারিতে আপলোড করার হেল্পার
const uploadBufferToCloudinary = async (fileBuffer, mimetype, subFolder = 'general') => {
    const b64 = Buffer.from(fileBuffer).toString('base64');
    const dataURI = `data:${mimetype};base64,${b64}`;

    const options = {
        folder: `ardm_enterprise/${subFolder}`,
        resource_type: 'auto'
    };

    // যদি প্রিসেট দেওয়া থাকে তবে সেটিও ব্যবহার করবে
    if (process.env.CLOUDINARY_UPLOAD_PRESET) {
        options.upload_preset = process.env.CLOUDINARY_UPLOAD_PRESET;
    }

    return await cloudinary.uploader.upload(dataURI, options);
};

// ১. সাধারণ ফাইল/ছবি আপলোড (যেমন: নতুন শিক্ষক তৈরির সময় বা ছুটির আবেদনের মেডিকেল কাগজ)
const uploadImageToCloud = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'আপলোড করার জন্য কোনো ফাইল পাওয়া যায়নি! অনুগ্রহ করে file ফিল্ডে ছবি যুক্ত করুন।');
    }

    const folder = req.query.folder || 'documents';
    const uploadResponse = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype, folder);

    return res.status(200).json(
        new ApiResponse(200, 'ফাইল সফলভাবে ক্লাউডে আপলোড হয়েছে!', {
            url: uploadResponse.secure_url,
            publicId: uploadResponse.public_id,
            format: uploadResponse.format,
            size: uploadResponse.bytes
        })
    );
});

// ২. শিক্ষকের প্রোফাইল ছবি সরাসরি আপডেট করা (পুরনো ছবি ক্লাউড থেকে অটো ডিলিট করে নতুন ছবি বসানো)
const updateTeacherProfilePicture = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, 'প্রোফাইল ছবি আপলোড করার জন্য ফাইল নির্বাচন করুন!');
    }

    const teacherId = req.params.teacherId || req.user._id;
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
        throw new ApiError(404, 'শিক্ষক খুঁজে পাওয়া যায়নি!');
    }

    // আগে থেকে ক্লাউডিনারিতে ছবি থাকলে সেটি ডিলিট করে স্টোরেজ খালি করা
    if (teacher.profilePicture && teacher.profilePicture.publicId) {
        try {
            await cloudinary.uploader.destroy(teacher.profilePicture.publicId);
        } catch (err) {
            console.warn('⚠️ পুরনো ছবি ক্লাউড থেকে মুছতে মাইনর ত্রুটি:', err.message);
        }
    }

    // নতুন ছবি আপলোড করা
    const uploadResponse = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype, 'teachers');

    teacher.profilePicture = {
        url: uploadResponse.secure_url,
        publicId: uploadResponse.public_id
    };

    await teacher.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, `${teacher.fullNameBng}-এর প্রোফাইল ছবি সফলভাবে আপডেট হয়েছে!`, {
            profilePicture: teacher.profilePicture
        })
    );
});

module.exports = {
    uploadImageToCloud,
    updateTeacherProfilePicture
};
