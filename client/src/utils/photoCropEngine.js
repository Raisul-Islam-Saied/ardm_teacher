/**
 * ARDM Enterprise ERP — Crash-Proof Photo Crop & White Background Engine
 */

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_FILE_SIZE_MB = 12;
export const MIN_IMAGE_DIMENSION = 200;

export const WHITE_CHECK_ZONES = [
    { id: 'topLeft', x1: 0.02, y1: 0.02, x2: 0.16, y2: 0.16, mandatory: true },
    { id: 'topRight', x1: 0.84, y1: 0.02, x2: 0.98, y2: 0.16, mandatory: true },
    { id: 'topCenter', x1: 0.38, y1: 0.01, x2: 0.62, y2: 0.09, mandatory: false },
    { id: 'leftEdge', x1: 0.02, y1: 0.22, x2: 0.11, y2: 0.42, mandatory: false },
    { id: 'rightEdge', x1: 0.89, y1: 0.22, x2: 0.98, y2: 0.42, mandatory: false }
];

export function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('ছবি নির্বাচন করা হয়নি।'));
            return;
        }
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            reject(new Error('শুধুমাত্র JPG, PNG অথবা WEBP ছবি দিন।'));
            return;
        }
        if (file.size > MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024) {
            reject(new Error(`ছবি সর্বোচ্চ ${MAX_IMAGE_FILE_SIZE_MB} MB হতে পারবে।`));
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            const width = img.naturalWidth || img.width || 0;
            const height = img.naturalHeight || img.height || 0;

            if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
                URL.revokeObjectURL(objectUrl);
                reject(new Error(`ছবি কমপক্ষে ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}px হতে হবে।`));
                return;
            }

            resolve({ image: img, objectUrl, width, height });
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('ছবিটি লোড করা যায়নি।'));
        };

        img.src = objectUrl;
    });
}

export function getMinCoverScale(imgW, imgH, boxSize, totalDeg = 0) {
    if (!imgW || !imgH || !boxSize) return 1;
    const rad = (totalDeg * Math.PI) / 180;
    const coverFactor = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad));
    return Math.max((boxSize * coverFactor) / imgW, (boxSize * coverFactor) / imgH);
}

export function clampNormalizedPan(panX, panY, imgW, imgH, zoom = 1, totalDeg = 0) {
    if (!imgW || !imgH) return { panX: 0, panY: 0 };

    const safeZoom = Math.max(1, Math.min(3.5, Number(zoom) || 1));
    const rad = (totalDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const coverFactor = Math.abs(cos) + Math.abs(sin);

    const minScale = Math.max(coverFactor / imgW, coverFactor / imgH);
    const scale = minScale * safeZoom;
    if (!scale || !Number.isFinite(scale)) return { panX: 0, panY: 0 };

    const safePanX = Number.isFinite(panX) ? panX : 0;
    const safePanY = Number.isFinite(panY) ? panY : 0;

    const localX = (-safePanX * cos - safePanY * sin) / scale;
    const localY = (safePanX * sin - safePanY * cos) / scale;

    const maxLocalX = Math.max(0, imgW / 2 - coverFactor / (2 * scale));
    const maxLocalY = Math.max(0, imgH / 2 - coverFactor / (2 * scale));

    const clampedLocalX = Math.max(-maxLocalX, Math.min(maxLocalX, localX));
    const clampedLocalY = Math.max(-maxLocalY, Math.min(maxLocalY, localY));

    const clampedPanX = -(clampedLocalX * cos - clampedLocalY * sin) * scale;
    const clampedPanY = -(clampedLocalX * sin + clampedLocalY * cos) * scale;

    return {
        panX: Number.isFinite(clampedPanX) ? clampedPanX : 0,
        panY: Number.isFinite(clampedPanY) ? clampedPanY : 0
    };
}

export function renderCroppedCanvas(image, transform, outputSize = 500) {
    const size = Math.max(64, Number(outputSize) || 500);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d', { willReadFrequently: size <= 200 });
    if (!ctx || !image) return canvas;

    const imgW = image.naturalWidth || image.width || 0;
    const imgH = image.naturalHeight || image.height || 0;
    if (!imgW || !imgH) return canvas;

    const { zoom = 1, panX = 0, panY = 0, rotate90 = 0, tilt = 0, flipX = false } = transform || {};
    const totalDeg = (Number(rotate90) || 0) + (Number(tilt) || 0);
    const rad = (totalDeg * Math.PI) / 180;

    const clamped = clampNormalizedPan(panX, panY, imgW, imgH, zoom, totalDeg);
    const minScale = getMinCoverScale(imgW, imgH, size, totalDeg);
    const drawScale = minScale * Math.max(1, Number(zoom) || 1);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(size / 2 + clamped.panX * size, size / 2 + clamped.panY * size);
    ctx.rotate(rad);
    if (flipX) ctx.scale(-1, 1);

    const drawW = imgW * drawScale;
    const drawH = imgH * drawScale;
    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    return canvas;
}

export function analyzeWhiteBackground(canvas) {
    if (!canvas || !canvas.width || !canvas.height) {
        return { passed: false, message: 'ব্যাকগ্রাউন্ড সাদা হতে হবে' };
    }

    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { passed: false, message: 'ব্যাকগ্রাউন্ড সাদা হতে হবে' };

    const { data } = ctx.getImageData(0, 0, w, h);

    const MIN_LUMINANCE = 216;
    const MAX_CHROMA = 26;
    const MIN_CHANNEL = 198;
    const ZONE_PASS_RATIO = 0.80;

    let topLeftPassed = false;
    let topRightPassed = false;
    let secondaryPassed = 0;
    let ratioSum = 0;

    for (const zone of WHITE_CHECK_ZONES) {
        const startX = Math.max(0, Math.floor(zone.x1 * w));
        const endX = Math.min(w - 1, Math.ceil(zone.x2 * w));
        const startY = Math.max(0, Math.floor(zone.y1 * h));
        const endY = Math.min(h - 1, Math.ceil(zone.y2 * h));

        let total = 0;
        let white = 0;

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const idx = (y * w + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                const minC = Math.min(r, g, b);
                const chroma = Math.max(r, g, b) - minC;

                total++;
                if (lum >= MIN_LUMINANCE && chroma <= MAX_CHROMA && minC >= MIN_CHANNEL) {
                    white++;
                }
            }
        }

        const ratio = total > 0 ? white / total : 0;
        const ok = ratio >= ZONE_PASS_RATIO;
        ratioSum += ratio;

        if (zone.id === 'topLeft') topLeftPassed = ok;
        else if (zone.id === 'topRight') topRightPassed = ok;
        else if (ok) secondaryPassed++;
    }

    const overallScore = Math.round((ratioSum / WHITE_CHECK_ZONES.length) * 100);
    const passed = topLeftPassed && topRightPassed && secondaryPassed >= 2 && overallScore >= 82;

    return {
        passed,
        overallScore,
        message: passed ? '' : 'ব্যাকগ্রাউন্ড সাদা হতে হবে'
    };
}

export function exportVerifiedSquarePhoto(image, transform, options = {}) {
    const { targetSize = 500, quality = 0.92 } = options;

    return new Promise((resolve, reject) => {
        const canvas = renderCroppedCanvas(image, transform, targetSize);
        const verification = analyzeWhiteBackground(canvas);

        if (!verification.passed) {
            reject(new Error('ব্যাকগ্রাউন্ড সাদা হতে হবে'));
            return;
        }

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('ছবি সংরক্ষণ করা যায়নি।'));
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
