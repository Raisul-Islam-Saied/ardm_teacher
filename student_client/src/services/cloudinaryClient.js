/**
 * ARDM Student Portal — Client-side 500x500 square image processor & Cloudinary uploader.
 * Mirrors D:\ardm_teacher\client\src\api\cloudinaryClient.js (cloud "djjnoclzp", preset "student_db"),
 * with student-specific defaults (folder + file names) and an optional `squareTolerance`
 * that keeps the original student form rule: non-square photos are rejected, not cropped.
 */
import axios from 'axios';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'djjnoclzp';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'student_db';
const DEFAULT_FOLDER = import.meta.env.VITE_CLOUDINARY_STUDENT_FOLDER || 'ardm/students';

/**
 * ছবিকে ৫০০×৫০০ স্কয়ার JPEG-এ রূপান্তর (Canvas)।
 * options: { targetSize = 500, quality = 0.92, enforceStrictSquareInput = false, squareTolerance = null }
 *  - squareTolerance: সংখ্যা দিলে |width - height| তার চেয়ে বেশি হলে ছবি বাতিল (মূল ফর্মে ২০)
 */
export function processImageToSquare500(file, options = {}) {
    const {
        targetSize = 500,
        quality = 0.92,
        enforceStrictSquareInput = false,
        squareTolerance = null
    } = options;

    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('কোনো ছবির ফাইল নির্বাচন করা হয়নি।'));

        if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
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
                    return reject(new Error(`ছবির রেজোলিউশন অত্যন্ত কম (${origW}×${origH})। কমপক্ষে 300×300 পিক্সেলের স্পষ্ট ছবি দিন।`));
                }
                if (enforceStrictSquareInput && origW !== origH) {
                    return reject(new Error(`ছবিটি বর্গাকার (Square) নয় (${origW}×${origH})। প্রস্থ এবং উচ্চতা সমান হতে হবে।`));
                }
                if (typeof squareTolerance === 'number' && Math.abs(origW - origH) > squareTolerance) {
                    return reject(new Error('দুঃখিত! ছবিটি অবশ্যই স্কয়ার হতে হবে'));
                }

                const minSide = Math.min(origW, origH);
                const cropX = Math.floor((origW - minSide) / 2);
                const cropY = Math.floor((origH - minSide) / 2);

                const canvas = document.createElement('canvas');
                canvas.width = targetSize;
                canvas.height = targetSize;

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, targetSize, targetSize);
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, cropX, cropY, minSide, minSide, 0, 0, targetSize, targetSize);

                const previewDataUrl = canvas.toDataURL('image/jpeg', quality);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            return reject(new Error('ছবি প্রসেস করতে সমস্যা হয়েছে। অন্য একটি ছবি দিয়ে চেষ্টা করুন।'));
                        }
                        const processedFile = new File([blob], 'student_photo_500x500.jpg', {
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

            img.onerror = () => reject(new Error('ছবির ফাইলটি পড়া যাচ্ছে না বা ক্ষতিগ্রস্ত হয়েছে।'));
            img.src = event.target.result;
        };

        reader.onerror = () => reject(new Error('ফাইল রিড করতে ব্রাউজারে সমস্যা হয়েছে।'));
        reader.readAsDataURL(file);
    });
}

/**
 * ক্লাউডিনারিতে সরাসরি আপলোড (প্রোগ্রেস কলব্যাকসহ)।
 * imageBlob: Blob/File অথবা data:image/... URL string (500×500 প্রসেস করা)
 */
export async function uploadSquarePhotoToCloudinary(imageBlob, options = {}) {
    const {
        publicId = `student_${Date.now()}`,
        folder = DEFAULT_FOLDER,
        onProgress = null
    } = options;

    if (!imageBlob) throw new Error('আপলোড করার জন্য কোনো ছবি পাওয়া যায়নি।');

    const formData = new FormData();
    if (typeof imageBlob === 'string') {
        formData.append('file', imageBlob);
    } else {
        formData.append('file', imageBlob, `${publicId}.jpg`);
    }
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);
    if (publicId) formData.append('public_id', String(publicId));

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    try {
        const response = await axios.post(uploadUrl, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 45000,
            onUploadProgress: (progressEvent) => {
                if (typeof onProgress === 'function' && progressEvent.total) {
                    onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
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
        const errMsg = err.response?.data?.error?.message || 'ক্লাউডিনারিতে ছবি আপলোড ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ যাচাই করুন।';
        throw new Error(errMsg);
    }
}
