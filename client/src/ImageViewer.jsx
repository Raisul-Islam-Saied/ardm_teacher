// ============================================================
// ImageViewer.jsx — Premium Fullscreen Image Viewer
// WhatsApp-style • Next-level animations • Download support
// ============================================================
// 
// USAGE:
// 1. Import করুন:  import ImageViewer from './ImageViewer';
// 2. State যোগ করুন (Index component এ):
//      const [viewerImg, setViewerImg] = useState(null);
// 3. PremiumStudentCard এর img tag এ onClick যোগ করুন:
//      onClick={(e) => { e.stopPropagation(); setViewerImg(data.ImageURL || DEFAULT_IMAGE); }}
// 4. DetailView এর profile img tag এ onClick যোগ করুন:
//      onClick={() => setViewerImg(data.ImageURL || DEFAULT_IMAGE)}
// 5. Return JSX এর যেকোনো জায়গায় (toast এর আগে) যোগ করুন:
//      <ImageViewer src={viewerImg} onClose={() => setViewerImg(null)} />
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';

const ImageViewer = ({ src, onClose }) => {
  const [visible, setVisible]     = useState(false);
  const [closing, setClosing]     = useState(false);
  const [scale, setScale]         = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded]   = useState(false);

  // touch / drag state
  const touchStart  = useRef(null);
  const dragY       = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // ── mount / open ──
  useEffect(() => {
    if (!src) return;
    setVisible(false);
    setClosing(false);
    setScale(1);
    setDragOffset(0);
    setDownloaded(false);
    // micro-delay so the CSS transition fires from the start state
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }, [src]);

  // ── back-button support ──
  useEffect(() => {
    if (!src) return;
    window.history.pushState({ page: 'imageViewer' }, '');

    const handlePop = () => triggerClose();
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [src]);

  // ── body scroll lock ──
  useEffect(() => {
    if (src) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [src]);

  const triggerClose = useCallback(() => {
    setClosing(true);
    setVisible(false);
    setDragOffset(0);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 380);
  }, [onClose]);

  // ── download ──
  const handleDownload = async () => {
    if (downloading || downloaded) return;
    setDownloading(true);
    try {
      const res  = await fetch(src);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `student_photo_${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch {
      // fallback: direct link
      const a    = document.createElement('a');
      a.href     = src;
      a.target   = '_blank';
      a.download = 'student_photo.jpg';
      a.click();
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } finally {
      setDownloading(false);
    }
  };

  // ── touch drag-to-dismiss ──
  const onTouchStart = (e) => {
    if (scale > 1) return; // don't drag while zoomed
    touchStart.current = e.touches[0].clientY;
    dragY.current      = 0;
    setIsDragging(false);
  };

  const onTouchMove = (e) => {
    if (scale > 1 || touchStart.current === null) return;
    const delta = e.touches[0].clientY - touchStart.current;
    if (Math.abs(delta) > 8) setIsDragging(true);
    dragY.current = delta;
    setDragOffset(delta);
  };

  const onTouchEnd = () => {
    if (Math.abs(dragY.current) > 120) {
      triggerClose();
    } else {
      setDragOffset(0);
    }
    touchStart.current = null;
    setIsDragging(false);
  };

  if (!src && !closing) return null;

  // ── derived styles ──
  const absDrag    = Math.abs(dragOffset);
  const backdropOp = visible && !closing
    ? Math.max(0.1, 1 - absDrag / 350)
    : 0;

  const imgTransform = [
    `translateY(${dragOffset}px)`,
    `scale(${visible && !closing
        ? Math.max(0.75, 1 - absDrag / 700) * scale
        : closing ? 0.55 : 0.72
    })`,
  ].join(' ');

  const imgOpacity = visible && !closing
    ? Math.max(0.25, 1 - absDrag / 280)
    : 0;

  return (
    <>
      <style>{`
        @keyframes iv-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes iv-slide-up {
          from { transform: translateY(60px) scale(0.72); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @keyframes iv-btn-pop {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          65%  { transform: scale(1.18) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes iv-checkmark {
          0%   { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0;  }
        }
        @keyframes iv-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0px rgba(255,255,255,0.35); }
          50%       { box-shadow: 0 0 0 8px rgba(255,255,255,0);    }
        }
        @keyframes iv-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .iv-backdrop {
          position: fixed; inset: 0; z-index: 9000;
          background: rgba(0,0,0,${backdropOp});
          backdrop-filter: blur(${Math.max(0, 28 * backdropOp)}px);
          -webkit-backdrop-filter: blur(${Math.max(0, 28 * backdropOp)}px);
          transition: background 0.06s ease, backdrop-filter 0.06s ease;
        }
        .iv-image {
          max-width: 96vw;
          max-height: 80vh;
          width: auto;
          height: auto;
          border-radius: 18px;
          object-fit: contain;
          transform: ${imgTransform};
          opacity: ${imgOpacity};
          transition: ${isDragging ? 'none' : 'transform 0.38s cubic-bezier(0.22,1,0.36,1), opacity 0.38s ease, border-radius 0.2s ease'};
          will-change: transform, opacity;
          box-shadow: 0 32px 80px rgba(0,0,0,0.65), 0 8px 24px rgba(0,0,0,0.4);
          user-select: none;
          -webkit-user-drag: none;
          touch-action: none;
        }
        .iv-close-btn {
          animation: iv-btn-pop 0.5s cubic-bezier(0.22,1,0.36,1) 0.12s both;
          animation-play-state: ${visible ? 'running' : 'paused'};
        }
        .iv-dl-btn {
          animation: iv-btn-pop 0.5s cubic-bezier(0.22,1,0.36,1) 0.22s both;
          animation-play-state: ${visible ? 'running' : 'paused'};
        }
        .iv-hint {
          animation: iv-btn-pop 0.55s cubic-bezier(0.22,1,0.36,1) 0.35s both;
          animation-play-state: ${visible ? 'running' : 'paused'};
          opacity: ${visible && !closing ? 1 : 0};
          transition: opacity 0.3s ease;
        }
        .iv-dl-shimmer {
          background: linear-gradient(90deg, #ffffff22 0%, #ffffff55 40%, #ffffff22 60%);
          background-size: 200% 100%;
          animation: iv-shimmer 1.1s linear infinite;
        }
        .iv-checkmark-path {
          stroke-dasharray: 40;
          stroke-dashoffset: 0;
          animation: iv-checkmark 0.4s ease 0.05s both;
        }
        .iv-ring-pulse {
          animation: iv-ring-pulse 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* ── BACKDROP ── */}
      <div
        className="iv-backdrop flex flex-col items-center justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) triggerClose(); }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >

        {/* ── TOP BAR: CLOSE ── */}
        <div
          className="absolute top-0 left-0 right-0 flex justify-end px-4 pt-12 pb-4 z-10"
          style={{ opacity: visible && !closing ? Math.max(0, 1 - absDrag / 120) : 0, transition: 'opacity 0.2s ease' }}
        >
          <button
            className="iv-close-btn w-11 h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-90 transition-transform"
            onClick={(e) => { e.stopPropagation(); triggerClose(); }}
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}
          >
            <X size={20} color="white" strokeWidth={2.5} />
          </button>
        </div>

        {/* ── IMAGE ── */}
        <div className="relative flex items-center justify-center w-full flex-1">
          <img
            src={src}
            className="iv-image"
            alt="Student"
            draggable={false}
            onDoubleClick={() => setScale(s => s === 1 ? 2 : 1)}
          />

          {/* drag-to-dismiss hint pill */}
          {absDrag > 40 && scale === 1 && (
            <div
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full border border-white/20"
              style={{ pointerEvents: 'none' }}
            >
              ছেড়ে দিন বন্ধ হবে
            </div>
          )}
        </div>

        {/* ── BOTTOM BAR: DOWNLOAD ── */}
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4 pb-14 pt-6 z-10"
          style={{ opacity: visible && !closing ? Math.max(0, 1 - absDrag / 100) : 0, transition: 'opacity 0.2s ease' }}
        >
          {/* Download button */}
          <button
            className="iv-dl-btn iv-ring-pulse relative overflow-hidden flex items-center gap-3 px-8 py-4 rounded-2xl active:scale-95 transition-transform"
            style={{
              background: downloaded
                ? 'linear-gradient(135deg, #10B981, #059669)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.12))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              transition: 'background 0.35s ease',
              minWidth: 160,
              justifyContent: 'center',
            }}
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            disabled={downloading}
          >
            {/* shimmer while downloading */}
            {downloading && <div className="iv-dl-shimmer absolute inset-0 rounded-2xl" />}

            <div className="relative z-10 flex items-center gap-3">
              {downloading ? (
                <div
                  className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin"
                />
              ) : downloaded ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" strokeOpacity="0.4"/>
                  <path
                    className="iv-checkmark-path"
                    d="M7 12.5l3.5 3.5L17 9"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              ) : (
                <Download size={20} color="white" strokeWidth={2.2} />
              )}
              <span className="text-white font-black text-sm">
                {downloading ? 'Downloading…' : downloaded ? 'Downloaded!' : 'ছবি ডাউনলোড'}
              </span>
            </div>
          </button>

          {/* hint */}
          <p className="iv-hint text-white/40 text-[10px] font-bold tracking-wider">
            উপরে ← সোয়াইপ করুন বন্ধ করতে
          </p>
        </div>

      </div>
    </>
  );
};

export default ImageViewer;
