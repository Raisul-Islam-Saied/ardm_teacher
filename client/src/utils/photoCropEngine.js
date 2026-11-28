/**
 * ARDM Enterprise ERP — Precision Photo Crop & Pure White Background Engine
 * Zero external dependencies. 100% Client-side HTML5 Canvas + Exact Rotation Geometry.
 */

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_FILE_SIZE_MB = 12;
export const MIN_IMAGE_DIMENSION = 240;

// ৫টি জোন (ওপরের ২ কোনা বাধ্যতামূলক + ওপরের মাঝখান ও দুই পাশের প্রান্ত)
export const WHITE_CHECK_ZONES = [
    { id: 'topLeft', labelBng: 'ওপরের বাম কোনা', x1: 0.02, y1: 0.02, x2: 0.16, y2: 0.16, mandatory: true },
    { id: 'topRight', labelBng: 'ওপরের ডান কোনা', x1: 0.84, y1: 0.02, x2: 0.98, y2: 0.16, mandatory: true },
    { id: 'topCenter', labelBng: 'ওপরের মাঝখান', x1: 0.38, y1: 0.01, x2: 0.62, y2: 0.09, mandatory: false },
    { id: 'leftEdge', labelBng: 'বাম প্রান্ত', x1: 0.02, y1: 0.22, x2: 0.11, y2: 0.42, mandatory: false },
    { id: 'rightEdge', labelBng: 'ডান প্রান্ত', x1: 0.89, y1: 0.22, x2: 0.98, y2: 0.42, mandatory: false }
];

/**
 * ফাইল থেকে HTMLImageElement লোড ও প্রাথমিক যাচাই
 */
export function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('কোনো ছবি নির্বাচন করা হয়নি।'));
            return;
        }
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            reject(new Error('শুধুমাত্র JPG, PNG অথবা WEBP ফরম্যাটের ছবি আপলোড করুন।'));
            return;
        }
        if (file.size > MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024) {
            reject(new Error(`ছবির সাইজ সর্বোচ্চ ${MAX_IMAGE_FILE_SIZE_MB} MB হতে পারবে।`));
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.decoding = 'async';

        img.onload = () => {
            const width = img.naturalWidth || img.width;
            const height = img.naturalHeight || img.height;

            if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
                URL.revokeObjectURL(objectUrl);
                reject(
                    new Error(
                        `ছবির রেজোলিউশন খুব কম (${width}×${height}px)। কমপক্ষে ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}px স্পষ্ট ছবি দিন।`
                    )
                );
                return;
            }

            resolve({
                image: img,
                objectUrl,
                width,
                height,
                fileName: file.name || 'teacher-photo.jpg'
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('ছবিটি পড়া যায়নি। অনুগ্রহ করে অন্য একটি সঠিক ছবি নির্বাচন করুন।'));
        };

        img.src = objectUrl;
    });
}

/**
 * যেকোনো অ্যাঙ্গেলে (Rotate + Tilt) স্কয়ার ক্রপ বক্স পুরোপুরি ঢাকতে সর্বনিম্ন স্কেল হিসাব
 */
export function getMinCoverScale(imgW, imgH, boxSize, totalDeg) {
    const rad = (totalDeg * Math.PI) / 180;
    const coverFactor = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad));
    return Math.max((boxSize * coverFactor) / imgW, (boxSize * coverFactor) / imgH);
}

/**
 * প্যান (panX, panY) ক্ল্যাম্প করা যেন রোটেশন/জুম যাই হোক, ক্রপ বক্সের ভেতরে কখনো খালি গ্যাপ না পড়ে।
 * panX এবং panY হলো boxSize-এর সাপেক্ষে normalized মান।
 */
export function clampNormalizedPan(panX, panY, imgW, imgH, zoom, totalDeg) {
    const rad = (totalDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const coverFactor = Math.abs(cos) + Math.abs(sin);

    // ইউনিট বক্স (boxSize = 1) ধরে হিসাব
    const minScale = Math.max(coverFactor / imgW, coverFactor / imgH);
    const scale = minScale * Math.max(1, zoom);

    // ক্রপ বক্সের কেন্দ্রকে ইমেজের লোকাল এক্সিসে রূপান্তর
    const localX = (-panX * cos - panY * sin) / scale;
    const localY = (panX * sin - panY * cos) / scale;

    const maxLocalX = Math.max(0, imgW / 2 - coverFactor / (2 * scale));
    const maxLocalY = Math.max(0, imgH / 2 - coverFactor / (2 * scale));

    const clampedLocalX = Math.max(-maxLocalX, Math.min(maxLocalX, localX));
    const clampedLocalY = Math.max(-maxLocalY, Math.min(maxLocalY, localY));

    // আবার ভিউপোর্ট এক্সিসে ফেরত আনা
    const clampedPanX = -(clampedLocalX * cos - clampedLocalY * sin) * scale;
    const clampedPanY = -(clampedLocalX * sin + clampedLocalY * cos) * scale;

    return {
        panX: Number.isFinite(clampedPanX) ? clampedPanX : 0,
        panY: Number.isFinite(clampedPanY) ? clampedPanY : 0
    };
}

/**
 * বর্তমান ট্রান্সফর্ম অনুযায়ী নির্দিষ্ট সাইজের ক্যানভাসে (যেমন 160px লাইভ চেক বা 500px ফাইনাল আউটপুট) রেন্ডার করা
 */
export function renderCroppedCanvas(image, transform, outputSize = 500) {
    const { zoom = 1, panX = 0, panY = 0, rotate90 = 0, tilt = 0, flipX = false } = transform;
    const imgW = image.naturalWidth || image.width;
    const imgH = image.naturalHeight || image.height;
    const totalDeg = rotate90 + tilt;
    const rad = (totalDeg * Math.PI) / 180;

    const clamped = clampNormalizedPan(panX, panY, imgW, imgH, zoom, totalDeg);
    const minScale = getMinCoverScale(imgW, imgH, outputSize, totalDeg);
    const drawScale = minScale * Math.max(1, zoom);

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: outputSize <= 200 });

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // সাদা বেস ফিল
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outputSize, outputSize);

    ctx.save();
    ctx.translate(outputSize / 2 + clamped.panX * outputSize, outputSize / 2 + clamped.panY * outputSize);
    ctx.rotate(rad);
    if (flipX) {
        ctx.scale(-1, 1);
    }

    const drawW = imgW * drawScale;
    const drawH = imgH * drawScale;
    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    return canvas;
}

/**
 * মাল্টি-জোন পিউর হোয়াইট ব্যাকগ্রাউন্ড ভেরিফিকেশন ইঞ্জিন
 * - Luminance (উজ্জ্বলতা) ও Chroma (রঙের আভা) উভয়ই যাচাই করে
 * - ওপরের দুটি কোনা (Top-Left & Top-Right) সাদা হওয়া বাধ্যতামূলক
 */
export function analyzeWhiteBackground(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { data } = ctx.getImageData(0, 0, w, h);

    // স্টুডিও হোয়াইট থ্রেশহোল্ড (অফ-হোয়াইট ছায়া অ্যালাউ করবে, কিন্তু নীল/ধূসর/রঙিন ব্যাকগ্রাউন্ড ব্লক করবে)
    const MIN_LUMINANCE = 216;
    const MAX_CHROMA = 26;
    const MIN_CHANNEL = 198;
    const ZONE_PASS_RATIO = 0.80;

    const zoneResults = WHITE_CHECK_ZONES.map((zone) => {
        const startX = Math.max(0, Math.floor(zone.x1 * w));
        const endX = Math.min(w - 1, Math.ceil(zone.x2 * w));
        const startY = Math.max(0, Math.floor(zone.y1 * h));
        const endY = Math.min(h - 1, Math.ceil(zone.y2 * h));

        let totalPixels = 0;
        let whitePixels = 0;
        let sumLum = 0;
        let sumChroma = 0;

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const idx = (y * w + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                const maxC = Math.max(r, g, b);
                const minC = Math.min(r, g, b);
                const chroma = maxC - minC;

                totalPixels++;
                sumLum += lum;
                sumChroma += chroma;

                if (lum >= MIN_LUMINANCE && chroma <= MAX_CHROMA && minC >= MIN_CHANNEL) {
                    whitePixels++;
                }
            }
        }

        const whiteRatio = totalPixels > 0 ? whitePixels / totalPixels : 0;
        const avgLuminance = totalPixels > 0 ? Math.round(sumLum / totalPixels) : 0;
        const avgChroma = totalPixels > 0 ? Math.round(sumChroma / totalPixels) : 0;
        const passed = whiteRatio >= ZONE_PASS_RATIO;

        return {
            ...zone,
            whiteRatio,
            whitePercent: Math.round(whiteRatio * 100),
            avgLuminance,
            avgChroma,
            passed
        };
    });

    const topLeft = zoneResults.find((z) => z.id === 'topLeft');
    const topRight = zoneResults.find((z) => z.id === 'topRight');
    const secondaryZones = zoneResults.filter((z) => !z.mandatory);
    const secondaryPassedCount = secondaryZones.filter((z) => z.passed).length;

    const overallScore = Math.round(
        (zoneResults.reduce((acc, z) => acc + z.whiteRatio, 0) / zoneResults.length) * 100
    );

    const mandatoryPassed = Boolean(topLeft?.passed && topRight?.passed);
    const passed = mandatoryPassed && secondaryPassedCount >= 2 && overallScore >= 82;

    let message = 'ব্যাকগ্রাউন্ড সম্পূর্ণ সাদা হিসেবে যাচাই হয়েছে।';
    if (!passed) {
        if (!topLeft?.passed && !topRight?.passed) {
            message = 'ছবির ওপরের দুটি কোনাই সাদা নয়। অনুগ্রহ করে পিউর সাদা ব্যাকগ্রাউন্ডের ছবি ব্যবহার করুন।';
        } else if (!topLeft?.passed) {
            message = 'ছবির ওপরের বাম কোনা সাদা নয়। সাদা ব্যাকগ্রাউন্ড নিশ্চিত করে পুনরায় ক্রপ করুন।';
        } else if (!topRight?.passed) {
            message = 'ছবির ওপরের ডান কোনা সাদা নয়। সাদা ব্যাকগ্রাউন্ড নিশ্চিত করে পুনরায় ক্রপ করুন।';
        } else {
            const avgChromaAll = zoneResults.reduce((s, z) => s + z.avgChroma, 0) / zoneResults.length;
            message = avgChromaAll > MAX_CHROMA
                ? 'ব্যাকগ্রাউন্ডে রঙের আভা (নীল/সবুজ/হলুদ) রয়েছে। শুধুমাত্র পিউর সাদা ব্যাকগ্রাউন্ড গ্রহণযোগ্য।'
                : 'ব্যাকগ্রাউন্ড যথেষ্ট সাদা ও পরিষ্কার নয়। স্পষ্ট সাদা ব্যাকগ্রাউন্ডের ছবি আপলোড করুন।';
        }
    }

    return {
        passed,
        overallScore,
        zones: zoneResults,
        message
    };
}

/**
 * চূড়ান্ত ৫০০×৫০০ JPEG Blob ও মেটাডেটা এক্সপোর্ট করা (ব্যাকগ্রাউন্ড সাদা না হলে রিজেক্ট করবে)
 */
export function exportVerifiedSquarePhoto(image, transform, options = {}) {
    const { targetSize = 500, quality = 0.92 } = options;

    return new Promise((resolve, reject) => {
        const canvas = renderCroppedCanvas(image, transform, targetSize);
        const verification = analyzeWhiteBackground(canvas);

        if (!verification.passed) {
            reject(new Error(verification.message));
            return;
        }

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('ছবি এক্সপোর্ট করতে সমস্যা হয়েছে।'));
                    return;
                }
                resolve({
                    blob,
                    dataUrl,
                    width: targetSize,
                    height: targetSize,
                    originalWidth: image.naturalWidth || image.width,
                    originalHeight: image.naturalHeight || image.height,
                    sizeKB: Math.max(1, Math.round(blob.size / 1024)),
                    whiteBackgroundVerified: true,
                    whiteScore: verification.overallScore
                });
            },
            'image/jpeg',
            quality
        );
    });
}
