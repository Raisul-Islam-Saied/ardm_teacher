import { Button } from '@components/ui';
import { cn } from '@utils/cn';
import {
    analyzeWhiteBackground,
    clampNormalizedPan,
    exportVerifiedSquarePhoto,
    getMinCoverScale,
    loadImageFromFile,
    renderCroppedCanvas
} from '@utils/photoCropEngine';
import {
    AlertCircle,
    Check,
    Crop,
    Image as ImageIcon,
    Trash2,
    UploadCloud,
    ZoomIn,
    ZoomOut
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const INITIAL_TRANSFORM = {
    zoom: 1,
    panX: 0,
    panY: 0,
    rotate90: 0,
    tilt: 0,
    flipX: false
};

export default function InlinePhotoCropper({
    photoData,
    onUpdatePhoto,
    disabled = false,
    allowPhotoRemove = true,
    error = ''
}) {
    const fileInputRef = useRef(null);
    const viewportRef = useRef(null);
    const pointersRef = useRef(new Map());
    const dragStartRef = useRef(null);
    const pinchStartRef = useRef(null);

    const [cropSource, setCropSource] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [transform, setTransform] = useState(INITIAL_TRANSFORM);
    const [viewportSize, setViewportSize] = useState(280);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [isLoadingFile, setIsLoadingFile] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [localError, setLocalError] = useState('');
    const [bgStatus, setBgStatus] = useState({ passed: true, message: '' });

    useEffect(() => {
        return () => {
            if (cropSource?.objectUrl) {
                URL.revokeObjectURL(cropSource.objectUrl);
            }
        };
    }, [cropSource]);

    useEffect(() => {
        if (!isEditing || !viewportRef.current) return undefined;
        const el = viewportRef.current;

        const updateSize = () => {
            const w = el.getBoundingClientRect().width;
            if (w >= 100) setViewportSize(w);
        };
        updateSize();

        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(updateSize);
            observer.observe(el);
            return () => observer.disconnect();
        }
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [isEditing]);

    const updateTransform = useCallback(
        (updater) => {
            if (!cropSource) return;
            setTransform((prev) => {
                const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
                const zoom = Math.max(1, Math.min(3.5, Number(next.zoom) || 1));
                const totalDeg = (Number(next.rotate90) || 0) + (Number(next.tilt) || 0);
                const clamped = clampNormalizedPan(
                    next.panX,
                    next.panY,
                    cropSource.width,
                    cropSource.height,
                    zoom,
                    totalDeg
                );
                return {
                    ...next,
                    zoom,
                    panX: clamped.panX,
                    panY: clamped.panY
                };
            });
        },
        [cropSource]
    );

    // মাউস হুইল জুম (non-passive listener যাতে পেজ স্ক্রল না হয়)
    useEffect(() => {
        if (!isEditing || !viewportRef.current) return undefined;
        const el = viewportRef.current;

        const onWheel = (e) => {
            e.preventDefault();
            const delta = -e.deltaY * 0.0018;
            updateTransform((prev) => ({ ...prev, zoom: prev.zoom + delta }));
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [isEditing, updateTransform]);

    // রিয়েল-টাইম সাদা ব্যাকগ্রাউন্ড চেক
    useEffect(() => {
        if (!isEditing || !cropSource?.image) return undefined;
        const timer = setTimeout(() => {
            try {
                const checkCanvas = renderCroppedCanvas(cropSource.image, transform, 160);
                setBgStatus(analyzeWhiteBackground(checkCanvas));
            } catch {
                setBgStatus({ passed: false, message: 'ব্যাকগ্রাউন্ড সাদা হতে হবে' });
            }
        }, 80);
        return () => clearTimeout(timer);
    }, [isEditing, cropSource, transform]);

    const handleFileSelect = async (file) => {
        if (!file || disabled) return;
        setIsLoadingFile(true);
        setLocalError('');
        try {
            const loaded = await loadImageFromFile(file);
            setCropSource((prev) => {
                if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
                return loaded;
            });
            setTransform(INITIAL_TRANSFORM);
            setIsEditing(true);
        } catch (err) {
            setLocalError(err.message || 'ছবি লোড করা যায়নি।');
        } finally {
            setIsLoadingFile(false);
        }
    };

    const handlePointerDown = (e) => {
        if (!isEditing || disabled) return;
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // Ignore pointer capture errors
        }
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        const pts = Array.from(pointersRef.current.values());
        if (pts.length === 1) {
            dragStartRef.current = {
                x: pts[0].x,
                y: pts[0].y,
                panX: transform.panX,
                panY: transform.panY
            };
            pinchStartRef.current = null;
        } else if (pts.length === 2) {
            const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            pinchStartRef.current = {
                dist: Math.max(10, dist),
                midX: (pts[0].x + pts[1].x) / 2,
                midY: (pts[0].y + pts[1].y) / 2,
                zoom: transform.zoom,
                panX: transform.panX,
                panY: transform.panY
            };
            dragStartRef.current = null;
        }
    };

    const handlePointerMove = (e) => {
        if (!pointersRef.current.has(e.pointerId)) return;
        e.preventDefault();
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        const safeSize = Math.max(100, viewportSize);
        const pts = Array.from(pointersRef.current.values());

        if (pts.length === 1 && dragStartRef.current) {
            const start = dragStartRef.current;
            const nextPanX = start.panX + (pts[0].x - start.x) / safeSize;
            const nextPanY = start.panY + (pts[0].y - start.y) / safeSize;
            updateTransform({ panX: nextPanX, panY: nextPanY });
        } else if (pts.length === 2 && pinchStartRef.current) {
            const start = pinchStartRef.current;
            const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            const midX = (pts[0].x + pts[1].x) / 2;
            const midY = (pts[0].y + pts[1].y) / 2;
            const nextZoom = start.zoom * (dist / start.dist);
            const nextPanX = start.panX + (midX - start.midX) / safeSize;
            const nextPanY = start.panY + (midY - start.midY) / safeSize;

            updateTransform({ zoom: nextZoom, panX: nextPanX, panY: nextPanY });
        }
    };

    const handlePointerUp = (e) => {
        pointersRef.current.delete(e.pointerId);
        const pts = Array.from(pointersRef.current.values());
        if (pts.length === 1) {
            dragStartRef.current = {
                x: pts[0].x,
                y: pts[0].y,
                panX: transform.panX,
                panY: transform.panY
            };
            pinchStartRef.current = null;
        } else {
            dragStartRef.current = null;
            pinchStartRef.current = null;
        }
    };

    const handleConfirmCrop = async () => {
        if (!cropSource?.image || !bgStatus.passed || isSaving) return;
        setIsSaving(true);
        setLocalError('');
        try {
            const cropped = await exportVerifiedSquarePhoto(cropSource.image, transform, {
                targetSize: 500,
                quality: 0.92
            });
            onUpdatePhoto(cropped);
            setIsEditing(false);
        } catch (err) {
            setLocalError(err.message || 'ব্যাকগ্রাউন্ড সাদা হতে হবে');
        } finally {
            setIsSaving(false);
        }
    };

    const isNonWhiteBg = isEditing && !bgStatus.passed;
    const activeError = localError || error || (isNonWhiteBg ? 'ব্যাকগ্রাউন্ড সাদা হতে হবে' : '');

    const totalDeg = (Number(transform.rotate90) || 0) + (Number(transform.tilt) || 0);
    const minScale = cropSource
        ? getMinCoverScale(cropSource.width, cropSource.height, viewportSize, totalDeg)
        : 1;
    const displayW = cropSource ? cropSource.width * minScale * transform.zoom : 0;
    const displayH = cropSource ? cropSource.height * minScale * transform.zoom : 0;

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                if (!disabled) setIsDraggingFile(true);
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
            }}
            onDrop={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
                if (!disabled) {
                    const file = e.dataTransfer?.files?.[0];
                    if (file) handleFileSelect(file);
                }
            }}
            className={cn(
                'p-4 sm:p-5 rounded-2xl border-2 border-dashed transition-colors bg-paper',
                isDraggingFile
                    ? 'border-gold bg-gold-subtle/20'
                    : activeError
                        ? 'border-danger bg-danger-bg/15'
                        : photoData?.dataUrl && !isEditing
                            ? 'border-emerald/40 bg-emerald-subtle/15'
                            : 'border-ink-faint'
            )}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                    e.target.value = '';
                }}
                disabled={disabled}
                className="hidden"
            />

            <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
                {/* বড় স্কয়ার ছবির বক্স */}
                {isEditing && cropSource ? (
                    <div
                        ref={viewportRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        className={cn(
                            'relative w-full max-w-[290px] sm:max-w-[320px] aspect-square shrink-0 rounded-2xl overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing bg-neutral-900 border-2 shadow-card',
                            bgStatus.passed ? 'border-emerald' : 'border-danger'
                        )}
                    >
                        <img
                            src={cropSource.objectUrl}
                            alt="Crop"
                            draggable={false}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: `${displayW}px`,
                                height: `${displayH}px`,
                                maxWidth: 'none',
                                maxHeight: 'none',
                                transform: `translate(-50%, -50%) translate(${transform.panX * viewportSize}px, ${transform.panY * viewportSize}px) rotate(${totalDeg}deg) scaleX(${transform.flipX ? -1 : 1})`,
                                transformOrigin: 'center center',
                                pointerEvents: 'none'
                            }}
                        />

                        {/* হালকা পাসপোর্ট গাইড */}
                        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 w-full h-full">
                            <ellipse
                                cx="50"
                                cy="40"
                                rx="22"
                                ry="27"
                                fill="none"
                                stroke="rgba(212, 175, 55, 0.8)"
                                strokeWidth="0.7"
                                strokeDasharray="2.5 2"
                            />
                        </svg>
                    </div>
                ) : (
                    <button
                        type="button"
                        disabled={disabled || isLoadingFile}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            'relative w-full max-w-[260px] sm:max-w-[280px] aspect-square shrink-0 rounded-2xl border-2 overflow-hidden flex flex-col items-center justify-center bg-paper-deep shadow-card transition-all cursor-pointer hover:border-gold focus:outline-none',
                            photoData?.dataUrl ? 'border-gold' : 'border-ink-faint'
                        )}
                    >
                        {photoData?.dataUrl ? (
                            <img
                                src={photoData.dataUrl}
                                alt="Teacher Photo"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-center p-4">
                                <ImageIcon className="w-12 h-12 mx-auto text-ink-muted opacity-45 mb-2" />
                                <span className="font-bengali text-xs font-semibold text-emerald-deep block">
                                    {isLoadingFile ? 'লোড হচ্ছে...' : 'ছবি নির্বাচন করুন'}
                                </span>
                                <span className="font-mono text-[10px] text-ink-muted mt-1 block">
                                    500 × 500 px
                                </span>
                            </div>
                        )}
                    </button>
                )}

                {/* ডান পাশের কন্ট্রোল প্যানেল */}
                <div className="flex-1 w-full space-y-3.5">
                    {isEditing && cropSource ? (
                        <>
                            {/* জুম স্লাইডার */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => updateTransform((p) => ({ ...p, zoom: p.zoom - 0.15 }))}
                                    className="p-1.5 rounded-lg border border-ink-faint hover:border-gold text-ink-soft"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <input
                                    type="range"
                                    min="1"
                                    max="3.5"
                                    step="0.01"
                                    value={transform.zoom}
                                    onChange={(e) => {
                                        const nextZoom = parseFloat(e.target.value);
                                        updateTransform({ zoom: nextZoom });
                                    }}
                                    className="w-full accent-emerald cursor-pointer"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateTransform((p) => ({ ...p, zoom: p.zoom + 0.15 }))}
                                    className="p-1.5 rounded-lg border border-ink-faint hover:border-gold text-ink-soft"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                            </div>

                            {/* সেভ ও পরিবর্তন বাটন */}
                            <div className="flex flex-wrap items-center gap-2.5 pt-1">
                                <Button
                                    variant="emerald"
                                    size="sm"
                                    leftIcon={Check}
                                    disabled={!bgStatus.passed || isSaving}
                                    isLoading={isSaving}
                                    loadingText="সংরক্ষণ হচ্ছে..."
                                    onClick={handleConfirmCrop}
                                >
                                    <span className="font-bengali">সংরক্ষণ করুন</span>
                                </Button>

                                <Button
                                    variant={isNonWhiteBg ? 'gold' : 'outline'}
                                    size={isNonWhiteBg ? 'md' : 'sm'}
                                    leftIcon={UploadCloud}
                                    disabled={isSaving}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        isNonWhiteBg && 'ring-2 ring-danger/50 shadow-md font-bold animate-pulse'
                                    )}
                                >
                                    <span className="font-bengali">
                                        {isNonWhiteBg ? 'অন্য ছবি নির্বাচন করুন' : 'অন্য ছবি'}
                                    </span>
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
                            <Button
                                variant="emerald"
                                size="sm"
                                leftIcon={UploadCloud}
                                disabled={disabled}
                                isLoading={isLoadingFile}
                                loadingText="লোড হচ্ছে..."
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <span className="font-bengali">
                                    {photoData?.dataUrl ? 'ছবি পরিবর্তন করুন' : 'ছবি নির্বাচন করুন'}
                                </span>
                            </Button>

                            {photoData?.dataUrl && cropSource && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={Crop}
                                    disabled={disabled}
                                    onClick={() => setIsEditing(true)}
                                >
                                    <span className="font-bengali">পুনরায় ক্রপ</span>
                                </Button>
                            )}

                            {photoData?.dataUrl && allowPhotoRemove && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={Trash2}
                                    disabled={disabled}
                                    onClick={() => {
                                        onUpdatePhoto(null);
                                        setLocalError('');
                                    }}
                                    className="text-danger hover:bg-danger-bg"
                                >
                                    <span className="font-bengali">মুছে ফেলুন</span>
                                </Button>
                            )}
                        </div>
                    )}

                    {/* শুধুমাত্র এরর বা ব্যাকগ্রাউন্ড সাদা না হলে দেখাবে */}
                    {activeError && (
                        <p className="text-xs text-danger font-bengali font-semibold flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{activeError}</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
