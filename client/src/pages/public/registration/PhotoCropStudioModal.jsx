/**
 * ARDM Enterprise ERP — Next-Level Manual Photo Crop Studio
 * Features:
 * - Zero-Bug Exact Rotation & Pan Clamping (No blank edges ever)
 * - Mouse Drag, Mouse Wheel Zoom & Mobile 2-Finger Pinch-to-Zoom
 * - 90° Rotate, Fine Straighten (-15° to +15°), Horizontal Flip, Passport Head Guide
 * - Real-time 5-Zone Pure White Background Verification (Hard-Blocks non-white photos)
 */

import { Badge, Button } from '@components/ui';
import { cn } from '@utils/cn';
import {
    analyzeWhiteBackground,
    clampNormalizedPan,
    exportVerifiedSquarePhoto,
    getMinCoverScale,
    renderCroppedCanvas
} from '@utils/photoCropEngine';
import {
    AlertTriangle,
    Check,
    CheckCircle2,
    FlipHorizontal2,
    Grid3X3,
    Move,
    RotateCcw,
    RotateCw,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    UserCheck,
    X,
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

export default function PhotoCropStudioModal({
    isOpen,
    sourceImage, // { image, objectUrl, width, height, fileName }
    onClose,
    onConfirmCrop
}) {
    const viewportRef = useRef(null);
    const pointersRef = useRef(new Map());
    const dragStartRef = useRef(null);
    const pinchStartRef = useRef(null);

    const [viewportSize, setViewportSize] = useState(320);
    const [transform, setTransform] = useState(INITIAL_TRANSFORM);
    const [showGrid, setShowGrid] = useState(true);
    const [showFaceGuide, setShowFaceGuide] = useState(true);
    const [bgStatus, setBgStatus] = useState({
        passed: false,
        overallScore: 0,
        zones: [],
        message: 'ব্যাকগ্রাউন্ড যাচাই করা হচ্ছে...'
    });
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    // নতুন ছবি এলে রিসেট
    useEffect(() => {
        if (isOpen && sourceImage) {
            setTransform(INITIAL_TRANSFORM);
            setExportError('');
        }
    }, [isOpen, sourceImage]);

    // ভিউপোর্ট সাইজ মাপা (রেসপন্সিভ ডেস্কটপ + মোবাইল)
    useEffect(() => {
        if (!isOpen || !viewportRef.current) return undefined;
        const el = viewportRef.current;

        const updateSize = () => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0) setViewportSize(rect.width);
        };
        updateSize();

        const observer = new ResizeObserver(updateSize);
        observer.observe(el);
        return () => observer.disconnect();
    }, [isOpen]);

    // বডি স্ক্রল লক
    useEffect(() => {
        if (!isOpen) return undefined;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen]);

    // রিয়েল-টাইম হোয়াইট ব্যাকগ্রাউন্ড অ্যানালাইসিস (Debounced 90ms for 60fps smoothness)
    useEffect(() => {
        if (!isOpen || !sourceImage?.image) return undefined;

        const timer = setTimeout(() => {
            try {
                const checkCanvas = renderCroppedCanvas(sourceImage.image, transform, 160);
                const result = analyzeWhiteBackground(checkCanvas);
                setBgStatus(result);
            } catch {
                // Ignore transient errors
            }
        }, 90);

        return () => clearTimeout(timer);
    }, [isOpen, sourceImage, transform]);

    // নিরাপদ ট্রান্সফর্ম আপডেটার (সবসময় ক্ল্যাম্পড রাখবে)
    const updateTransform = useCallback(
        (updater) => {
            if (!sourceImage) return;
            setTransform((prev) => {
                const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
                const zoom = Math.max(1, Math.min(3.5, Number(next.zoom) || 1));
                const totalDeg = (next.rotate90 || 0) + (next.tilt || 0);
                const clamped = clampNormalizedPan(
                    next.panX,
                    next.panY,
                    sourceImage.width,
                    sourceImage.height,
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
        [sourceImage]
    );

    // মাউস হুইল জুম
    const handleWheel = useCallback(
        (e) => {
            e.preventDefault();
            const delta = -e.deltaY * 0.0018;
            updateTransform((prev) => ({
                ...prev,
                zoom: prev.zoom + delta
            }));
        },
        [updateTransform]
    );

    // Pointer Events (1-finger Drag + 2-finger Pinch-to-Zoom)
    const handlePointerDown = (e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
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
            const midX = (pts[0].x + pts[1].x) / 2;
            const midY = (pts[0].y + pts[1].y) / 2;
            pinchStartRef.current = {
                dist: Math.max(10, dist),
                midX,
                midY,
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

        const pts = Array.from(pointersRef.current.values());
        if (pts.length === 1 && dragStartRef.current) {
            const dx = (pts[0].x - dragStartRef.current.x) / viewportSize;
            const dy = (pts[0].y - dragStartRef.current.y) / viewportSize;
            updateTransform((prev) => ({
                ...prev,
                panX: dragStartRef.current.panX + dx,
                panY: dragStartRef.current.panY + dy
            }));
        } else if (pts.length === 2 && pinchStartRef.current) {
            const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            const midX = (pts[0].x + pts[1].x) / 2;
            const midY = (pts[0].y + pts[1].y) / 2;
            const scaleRatio = dist / pinchStartRef.current.dist;
            const dx = (midX - pinchStartRef.current.midX) / viewportSize;
            const dy = (midY - pinchStartRef.current.midY) / viewportSize;

            updateTransform((prev) => ({
                ...prev,
                zoom: pinchStartRef.current.zoom * scaleRatio,
                panX: pinchStartRef.current.panX + dx,
                panY: pinchStartRef.current.panY + dy
            }));
        }
    };

    const handlePointerUpOrCancel = (e) => {
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

    const handleSaveCrop = async () => {
        if (!sourceImage?.image || !bgStatus.passed || isExporting) return;
        setIsExporting(true);
        setExportError('');
        try {
            const result = await exportVerifiedSquarePhoto(sourceImage.image, transform, {
                targetSize: 500,
                quality: 0.92
            });
            onConfirmCrop(result);
        } catch (err) {
            setExportError(err.message || 'ছবি সংরক্ষণ করা যায়নি।');
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen || !sourceImage) return null;

    const totalDeg = transform.rotate90 + transform.tilt;
    const minScale = getMinCoverScale(sourceImage.width, sourceImage.height, viewportSize, totalDeg);
    const displayScale = minScale * transform.zoom;
    const displayW = sourceImage.width * displayScale;
    const displayH = sourceImage.height * displayScale;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-deep/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Photo Crop Studio"
        >
            <div className="w-full max-w-4xl rounded-2xl bg-paper-panel border border-gold/40 shadow-2xl overflow-hidden my-auto animate-pop-in">
                {/* হেডার */}
                <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-emerald-deep text-white border-b border-gold/30">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bengali text-sm sm:text-base font-bold text-gold-soft">
                                অফিশিয়াল ছবি ক্রপ ও সাদা ব্যাকগ্রাউন্ড যাচাই স্টুডিও
                            </span>
                            <Badge variant="gold" size="sm" mono>
                                500×500 PRO
                            </Badge>
                        </div>
                        <p className="font-bengali text-[11px] text-white/75 mt-0.5">
                            ছবিটি ড্র্যাগ ও জুম করে মুখ মাঝখানে বসান — ব্যাকগ্রাউন্ড সম্পূর্ণ সাদা হলেই সংরক্ষণ করা যাবে।
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isExporting}
                        className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="বন্ধ করুন"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* মেইন বডি: বাম পাশে ক্রপ ভিউপোর্ট, ডান পাশে কন্ট্রোল ও লাইভ ভেরিফিকেশন */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 p-5 sm:p-6">
                    {/* বাম কলাম: ইন্টারঅ্যাক্টিভ ক্রপ ভিউপোর্ট */}
                    <div className="flex flex-col items-center justify-center">
                        <div
                            ref={viewportRef}
                            onWheel={handleWheel}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUpOrCancel}
                            onPointerCancel={handlePointerUpOrCancel}
                            className={cn(
                                'relative w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing bg-neutral-900 shadow-ledger border-2 transition-colors',
                                bgStatus.passed ? 'border-success' : 'border-danger'
                            )}
                        >
                            {/* ইমেজ লেয়ার (1:1 Synced with Canvas Export Math) */}
                            <img
                                src={sourceImage.objectUrl}
                                alt="Crop Target"
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

                            {/* Rule of Thirds গ্রিড */}
                            {showGrid && (
                                <div className="pointer-events-none absolute inset-0">
                                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/35" />
                                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/35" />
                                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/35" />
                                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/35" />
                                </div>
                            )}

                            {/* পাসপোর্ট হেড ও শোল্ডার অ্যালাইনমেন্ট গাইড */}
                            {showFaceGuide && (
                                <svg
                                    viewBox="0 0 100 100"
                                    className="pointer-events-none absolute inset-0 w-full h-full"
                                >
                                    <ellipse
                                        cx="50"
                                        cy="40"
                                        rx="22"
                                        ry="27"
                                        fill="none"
                                        stroke="rgba(212, 175, 55, 0.85)"
                                        strokeWidth="0.8"
                                        strokeDasharray="2.5 2"
                                    />
                                    <path
                                        d="M 16 96 C 20 74, 34 68, 50 68 C 66 68, 80 74, 84 96"
                                        fill="none"
                                        stroke="rgba(212, 175, 55, 0.75)"
                                        strokeWidth="0.8"
                                        strokeDasharray="2.5 2"
                                    />
                                </svg>
                            )}

                            {/* ওপরের দুই কোনা লাইভ জোন ইন্ডিকেটর */}
                            {bgStatus.zones
                                .filter((z) => z.mandatory)
                                .map((zone) => (
                                    <div
                                        key={zone.id}
                                        style={{
                                            left: `${zone.x1 * 100}%`,
                                            top: `${zone.y1 * 100}%`,
                                            width: `${(zone.x2 - zone.x1) * 100}%`,
                                            height: `${(zone.y2 - zone.y1) * 100}%`
                                        }}
                                        className={cn(
                                            'pointer-events-none absolute rounded border-2 flex items-center justify-center transition-colors',
                                            zone.passed
                                                ? 'border-success bg-success/15'
                                                : 'border-danger bg-danger/25 animate-pulse'
                                        )}
                                    >
                                        {zone.passed ? (
                                            <Check className="w-3.5 h-3.5 text-success drop-shadow" />
                                        ) : (
                                            <X className="w-3.5 h-3.5 text-danger drop-shadow" />
                                        )}
                                    </div>
                                ))}

                            {/* নিচে হিন্ট ব্যাজ */}
                            <div className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bengali flex items-center gap-1.5 whitespace-nowrap">
                                <Move className="w-3 h-3 text-gold-soft" />
                                ড্র্যাগ করে সরান · জুম করতে স্ক্রল/পিঞ্চ করুন
                            </div>
                        </div>

                        {/* ভিউপোর্ট টগল বাটন বার */}
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowFaceGuide((v) => !v)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bengali border transition-colors',
                                    showFaceGuide
                                        ? 'bg-emerald-subtle border-emerald text-emerald-deep font-semibold'
                                        : 'bg-paper border-ink-faint text-ink-soft'
                                )}
                            >
                                <UserCheck className="w-3.5 h-3.5" />
                                ফেস গাইড
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowGrid((v) => !v)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bengali border transition-colors',
                                    showGrid
                                        ? 'bg-emerald-subtle border-emerald text-emerald-deep font-semibold'
                                        : 'bg-paper border-ink-faint text-ink-soft'
                                )}
                            >
                                <Grid3X3 className="w-3.5 h-3.5" />
                                গ্রিড লাইন
                            </button>
                            <button
                                type="button"
                                onClick={() => setTransform(INITIAL_TRANSFORM)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bengali bg-paper border border-ink-faint text-ink-soft hover:text-emerald-deep hover:border-gold transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                রিসেট
                            </button>
                        </div>
                    </div>

                    {/* ডান কলাম: প্রো কন্ট্রোল ও পিউর হোয়াইট ব্যাকগ্রাউন্ড মিটার */}
                    <div className="flex flex-col justify-between space-y-5">
                        <div className="space-y-4">
                            {/* ১. লাইভ পিউর হোয়াইট ব্যাকগ্রাউন্ড ভেরিফিকেশন প্যানেল */}
                            <div
                                className={cn(
                                    'p-4 rounded-xl border transition-colors',
                                    bgStatus.passed
                                        ? 'bg-success-bg border-success-border'
                                        : 'bg-danger-bg/60 border-danger/35'
                                )}
                            >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1.5 text-xs font-bengali font-bold',
                                            bgStatus.passed ? 'text-success' : 'text-danger'
                                        )}
                                    >
                                        {bgStatus.passed ? (
                                            <ShieldCheck className="w-4 h-4" />
                                        ) : (
                                            <ShieldAlert className="w-4 h-4" />
                                        )}
                                        সাদা ব্যাকগ্রাউন্ড যাচাই (বাধ্যতামূলক)
                                    </span>
                                    <span className="font-mono text-xs font-bold text-emerald-deep">
                                        {bgStatus.overallScore}%
                                    </span>
                                </div>

                                <p
                                    className={cn(
                                        'font-bengali text-xs leading-relaxed mb-3',
                                        bgStatus.passed ? 'text-emerald-deep' : 'text-danger font-medium'
                                    )}
                                >
                                    {bgStatus.message}
                                </p>

                                {/* ৫-জোন স্ট্যাটাস পিল */}
                                <div className="grid grid-cols-2 gap-1.5">
                                    {bgStatus.zones.map((z) => (
                                        <div
                                            key={z.id}
                                            className={cn(
                                                'flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-bengali border',
                                                z.passed
                                                    ? 'bg-white/80 border-success/30 text-emerald-deep'
                                                    : 'bg-white/90 border-danger/40 text-danger font-semibold'
                                            )}
                                        >
                                            <span className="truncate">{z.labelBng}</span>
                                            <span className="font-mono text-[10px] ml-1">
                                                {z.passed ? '✓' : '✕'} {z.whitePercent}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ২. জুম কন্ট্রোল */}
                            <div className="p-3.5 rounded-xl bg-paper border border-ink-faint space-y-3">
                                <div>
                                    <div className="flex items-center justify-between text-xs font-bengali mb-1.5">
                                        <span className="font-semibold text-emerald-deep flex items-center gap-1.5">
                                            <ZoomIn className="w-3.5 h-3.5 text-gold-deep" />
                                            জুম (Zoom)
                                        </span>
                                        <span className="font-mono text-[11px] text-ink-soft">
                                            {Math.round(transform.zoom * 100)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => updateTransform((p) => ({ ...p, zoom: p.zoom - 0.15 }))}
                                            className="p-1 rounded border border-ink-faint hover:border-gold text-ink-soft"
                                            aria-label="Zoom Out"
                                        >
                                            <ZoomOut className="w-3.5 h-3.5" />
                                        </button>
                                        <input
                                            type="range"
                                            min="1"
                                            max="3.5"
                                            step="0.01"
                                            value={transform.zoom}
                                            onChange={(e) =>
                                                updateTransform((p) => ({ ...p, zoom: parseFloat(e.target.value) }))
                                            }
                                            className="w-full accent-emerald cursor-pointer"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => updateTransform((p) => ({ ...p, zoom: p.zoom + 0.15 }))}
                                            className="p-1 rounded border border-ink-faint hover:border-gold text-ink-soft"
                                            aria-label="Zoom In"
                                        >
                                            <ZoomIn className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* ৩. ফাইন টিল্ট (সোজা করা) */}
                                <div>
                                    <div className="flex items-center justify-between text-xs font-bengali mb-1.5">
                                        <span className="font-semibold text-emerald-deep flex items-center gap-1.5">
                                            <SlidersHorizontal className="w-3.5 h-3.5 text-gold-deep" />
                                            ছবি সোজা করুন (Tilt)
                                        </span>
                                        <span className="font-mono text-[11px] text-ink-soft">
                                            {transform.tilt > 0 ? `+${transform.tilt}°` : `${transform.tilt}°`}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-15"
                                        max="15"
                                        step="0.5"
                                        value={transform.tilt}
                                        onChange={(e) =>
                                            updateTransform((p) => ({ ...p, tilt: parseFloat(e.target.value) }))
                                        }
                                        className="w-full accent-emerald cursor-pointer"
                                    />
                                </div>

                                {/* ৪. রোটেট ও ফ্লিপ বাটন */}
                                <div className="grid grid-cols-3 gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateTransform((p) => ({ ...p, rotate90: (p.rotate90 - 90) % 360 }))
                                        }
                                        className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-ink-faint hover:border-gold text-xs font-bengali text-emerald-deep bg-paper-panel"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" /> বামে ৯০°
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateTransform((p) => ({ ...p, rotate90: (p.rotate90 + 90) % 360 }))
                                        }
                                        className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-ink-faint hover:border-gold text-xs font-bengali text-emerald-deep bg-paper-panel"
                                    >
                                        <RotateCw className="w-3.5 h-3.5" /> ডানে ৯০°
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateTransform((p) => ({ ...p, flipX: !p.flipX }))}
                                        className={cn(
                                            'flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-bengali',
                                            transform.flipX
                                                ? 'border-emerald bg-emerald-subtle text-emerald-deep font-semibold'
                                                : 'border-ink-faint hover:border-gold text-emerald-deep bg-paper-panel'
                                        )}
                                    >
                                        <FlipHorizontal2 className="w-3.5 h-3.5" /> ফ্লিপ
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* এরর ও ফুটার অ্যাকশন বাটন */}
                        <div className="space-y-2.5 pt-2 border-t border-ink-faint">
                            {exportError && (
                                <p className="text-xs text-danger font-bengali flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{exportError}</span>
                                </p>
                            )}

                            <div className="flex items-center justify-end gap-2.5">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isExporting}
                                    onClick={onClose}
                                >
                                    <span className="font-bengali">বাতিল</span>
                                </Button>
                                <Button
                                    variant="emerald"
                                    size="sm"
                                    leftIcon={CheckCircle2}
                                    disabled={!bgStatus.passed || isExporting}
                                    isLoading={isExporting}
                                    loadingText="সংরক্ষণ হচ্ছে..."
                                    onClick={handleSaveCrop}
                                >
                                    <span className="font-bengali">
                                        {bgStatus.passed ? 'ক্রপ সংরক্ষণ করুন' : 'সাদা ব্যাকগ্রাউন্ড আবশ্যক'}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  }
