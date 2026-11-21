import { useEffect, useRef, useState } from "react";
import Img from "./assets/20260517_104125.jpg";

// ─── আপনার তথ্য এখানে পরিবর্তন করুন ───────────────────────
const DEV_INFO = {
  nameBn:    "রায়সুল ইসলাম সাঈদ",
  nameEn:    "Raisul Islam Saied",
  titleBn:   "ফুলস্ট্যাক ডেভেলপার",
  titleEn:   "Full-Stack Developer",
  tagline:   "শিক্ষা ও প্রযুক্তির সেতুবন্ধ তৈরি করি",
  bio:       "আবদুর রাজ্জাক দাখিল মাদ্রাসার Result Management System-এর ডিজাইন ও ডেভেলপমেন্ট আমার একক প্রচেষ্টায় তৈরি।  শিক্ষাপ্রতিষ্ঠানের ডিজিটাল রূপান্তরে আমি প্রতিশ্রুতিবদ্ধ।",
  photo:     Img, // ← আপনার ছবির URL এখানে বসান: "https://..."
  initials:  "রস",
  phone:     "8801610988489",  // country code সহ (WhatsApp & Call)
  facebookUrl: "https://facebook.com/raisulislamsaied", // ← আপনার Facebook URL
  email:     "raisulislamsaied@email.com", // ← আপনার ইমেইল
  skills:    ["React", "JavaScript", "Firebase", "Google Sheets API", "Tailwind CSS", "Node.js"],
  stats: [
    { label: "প্রজেক্ট", value: "১০+", icon: "💻" },
    { label: "অভিজ্ঞতা",  value: "৩ বছর", icon: "⚡" },
    { label: "শিক্ষার্থী",  value: "৫০০+", icon: "🎓" },
  ],
};
// ────────────────────────────────────────────────────────────

// ── Particles background (20 floating orbs) ─────────────────
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  size:  4 + Math.random() * 10,
  x:     Math.random() * 100,
  y:     Math.random() * 100,
  dur:   6 + Math.random() * 10,
  delay: Math.random() * 8,
  opacity: 0.08 + Math.random() * 0.18,
}));

// ── Social / Contact Button Data ─────────────────────────────
const makeButtons = (info) => [
  {
    id: "facebook",
    label: "Facebook",
    sublabel: "আমাকে ফলো করুন",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    gradient: "linear-gradient(135deg, #1877f2 0%, #0a5cbf 100%)",
    shadow: "rgba(24,119,242,0.45)",
    href: info.facebookUrl,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    sublabel: "মেসেজ করুন",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    ),
    gradient: "linear-gradient(135deg, #25d366 0%, #128c4e 100%)",
    shadow: "rgba(37,211,102,0.45)",
    href: `https://wa.me/${info.phone}`,
  },
  {
    id: "call",
    label: "কল করুন",
    sublabel: `+${info.phone}`,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.7 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012.58 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 8.48A16 16 0 0015.7 17.1l1.41-1.41a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 17.92z"/>
      </svg>
    ),
    gradient: "linear-gradient(135deg, #0f766e 0%, #064e3b 100%)",
    shadow: "rgba(15,118,110,0.45)",
    href: `tel:+${info.phone}`,
  },
  {
    id: "email",
    label: "ইমেইল",
    sublabel: "মেইল করুন",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    gradient: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
    shadow: "rgba(245,158,11,0.45)",
    href: `mailto:${info.email}`,
  },
];

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function DeveloperModal({ isOpen, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ripple, setRipple]   = useState(null);
  const cardRef = useRef(null);
  const buttons = makeButtons(DEV_INFO);

  // Mount → animate in
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      const t = setTimeout(() => { setMounted(false); }, 450);
      document.body.style.overflow = "";
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ESC key close
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Tilt effect on card
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 14;
    const y = ((e.clientY - rect.top)  / rect.height - 0.5) * -14;
    cardRef.current.style.transform = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) scale(1.01)`;
  };
  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "perspective(900px) rotateX(0) rotateY(0) scale(1)";
  };

  // Button press ripple
  const handleButtonClick = (href, e) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() });
    setTimeout(() => setRipple(null), 600);
    setTimeout(() => window.open(href, "_blank"), 180);
  };

  if (!mounted) return null;

  return (
    <>
      {/* ── CSS injected ── */}
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── Backdrop ── */}
      <div
        className="dm-backdrop"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />

      {/* ── Modal Shell ── */}
      <div className="dm-shell" style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}>

        {/* Floating particles */}
        <div className="dm-particles" aria-hidden>
          {PARTICLES.map(p => (
            <span key={p.id} className="dm-particle" style={{
              width:  p.size, height: p.size,
              left:   `${p.x}%`, top: `${p.y}%`,
              opacity: p.opacity,
              animationDuration:  `${p.dur}s`,
              animationDelay:     `${p.delay}s`,
            }} />
          ))}
        </div>

        {/* ── Card ── */}
        <div
          ref={cardRef}
          className="dm-card"
          style={{ transform: visible ? "translateY(0) scale(1)" : "translateY(60px) scale(0.88)", opacity: visible ? 1 : 0 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={e => e.stopPropagation()}
        >

          {/* Card inner glow */}
          <div className="dm-card-glow" aria-hidden />

          {/* ── Close button ── */}
          <button className="dm-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* ── HEADER HERO ── */}
          <div className="dm-hero">
            {/* Animated mesh background */}
            <div className="dm-hero-mesh" aria-hidden />

            {/* Avatar ring */}
            <div className="dm-avatar-ring" aria-hidden>
              <div className="dm-avatar-ring2" />
            </div>

            {/* Avatar */}
            <div className="dm-avatar">
              {DEV_INFO.photo
                ? <img src={DEV_INFO.photo} alt={DEV_INFO.nameEn} className="dm-avatar-img" />
                : <span className="dm-avatar-initials">{DEV_INFO.initials}</span>
              }
              <span className="dm-online-dot" title="Available" />
            </div>

            {/* Name & Title */}
            <h2 className="dm-name-en">{DEV_INFO.nameEn}</h2>
            <h3 className="dm-name-bn">{DEV_INFO.nameBn}</h3>

            <div className="dm-badge">
              <span className="dm-badge-dot" />
              {DEV_INFO.titleBn} · {DEV_INFO.titleEn}
            </div>

            <p className="dm-tagline">"{DEV_INFO.tagline}"</p>
          </div>

          

          <div className="dm-divider" />

          
          {/* ── CONTACT BUTTONS ── */}
          <div className="dm-btns">
            {buttons.map((btn, i) => (
              <a
                key={btn.id}
                href={btn.href}
                target="_blank"
                rel="noopener noreferrer"
                className="dm-btn"
                style={{
                  background: btn.gradient,
                  boxShadow: `0 8px 28px ${btn.shadow}`,
                  animationDelay: `${0.08 * i}s`,
                }}
                onClick={(e) => { e.preventDefault(); handleButtonClick(btn.href, e); }}
              >
                <span className="dm-btn-icon">{btn.icon}</span>
                <span className="dm-btn-text">
                  <strong>{btn.label}</strong>
                  <small>{btn.sublabel}</small>
                </span>
                {/* Ripple */}
                {ripple && (
                  <span className="dm-ripple" style={{ left: ripple.x, top: ripple.y }} />
                )}
              </a>
            ))}
          </div>

          {/* ── FOOTER ── */}
          
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// ALL STYLES
// ─────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');

/* ── Backdrop ── */
.dm-backdrop {
  position: fixed; inset: 0; z-index: 9998;
  background: rgba(2, 12, 20, 0.72);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: opacity 0.4s ease;
}

/* ── Shell (centers the card) ── */
.dm-shell {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  transition: opacity 0.4s ease;
}

/* ── Floating particles ── */
.dm-particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.dm-particle {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #4ade80, #0d9488);
  animation: dmFloat linear infinite;
}
@keyframes dmFloat {
  0%   { transform: translateY(0)   scale(1);   }
  50%  { transform: translateY(-28px) scale(1.12); }
  100% { transform: translateY(0)   scale(1);   }
}

/* ── Card ── */
.dm-card {
  position: relative;
  width: 100%; max-width: 440px;
  max-height: 92vh; overflow-y: auto; overflow-x: hidden;
  background: linear-gradient(160deg, #0d1f1a 0%, #0f2922 40%, #091c17 100%);
  border: 1px solid rgba(52,211,153,0.20);
  border-radius: 28px;
  box-shadow:
    0 40px 100px rgba(0,0,0,0.7),
    0 0 0 1px rgba(255,255,255,0.04) inset,
    0 0 80px rgba(20,184,166,0.08) inset;
  font-family: 'Plus Jakarta Sans', 'Hind Siliguri', sans-serif;
  transition: transform 0.35s cubic-bezier(.22,1,.36,1), opacity 0.4s ease;
  scrollbar-width: thin; scrollbar-color: #0d9488 transparent;
}
.dm-card::-webkit-scrollbar { width: 4px; }
.dm-card::-webkit-scrollbar-thumb { background: #0d9488; border-radius: 4px; }

/* Ambient inner glow */
.dm-card-glow {
  position: absolute; inset: 0; border-radius: 28px; pointer-events: none;
  background: radial-gradient(ellipse 70% 40% at 50% 0%, rgba(16,185,129,0.15), transparent);
}

/* ── Close Button ── */
.dm-close {
  position: absolute; top: 16px; right: 16px; z-index: 10;
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(8px);
  color: rgba(255,255,255,0.6);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all .25s;
}
.dm-close:hover { background: rgba(239,68,68,0.2); color: #fca5a5; border-color: rgba(239,68,68,0.4); transform: rotate(90deg); }

/* ── HERO ── */
.dm-hero {
  position: relative; text-align: center;
  padding: 44px 24px 28px;
  overflow: hidden;
}
.dm-hero-mesh {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 90% 60% at 50% -10%, rgba(16,185,129,0.22), transparent),
    radial-gradient(ellipse 60% 40% at 80% 80%, rgba(6,78,59,0.30), transparent),
    radial-gradient(ellipse 40% 50% at 10% 90%, rgba(20,184,166,0.15), transparent);
}

/* Avatar rings */
.dm-avatar-ring {
  position: absolute; top: 33px; left: 50%; transform: translateX(-50%);
  width: 108px; height: 108px; border-radius: 50%;
  background: conic-gradient(from 0deg, #10b981, #0d9488, #064e3b, #fbbf24, #10b981);
  
  filter: blur(1px);
}
.dm-avatar-ring2 {
  position: absolute; inset: 3px; border-radius: 50%;
  background: #0d1f1a;
}
@keyframes dmSpin { to { transform: rotate(360deg); } }

/* Avatar image/initials */
.dm-avatar {
  position: relative; display: inline-block; margin-bottom: 18px;
}
.dm-avatar-img, .dm-avatar-initials {
  display: block; width: 96px; height: 96px; border-radius: 50%;
  border: 3px solid rgba(16,185,129,0.35);
  box-shadow: 0 0 30px rgba(16,185,129,0.25);
}
.dm-avatar-img { object-fit: cover; }
.dm-avatar-initials {
  background: linear-gradient(135deg, #064e3b, #0f766e);
  color: #fff; font-size: 32px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Hind Siliguri', sans-serif;
  letter-spacing: -1px;
}
.dm-online-dot {
  position: absolute; bottom: 5px; right: 5px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #22c55e;
  border: 3px solid #0d1f1a;
  box-shadow: 0 0 10px #22c55e;
  animation: dmPulse 2s ease-in-out infinite;
}
@keyframes dmPulse {
  0%, 100% { box-shadow: 0 0 6px #22c55e; }
  50%       { box-shadow: 0 0 18px #22c55e, 0 0 30px rgba(34,197,94,0.4); }
}

.dm-name-en {
  font-size: 26px; font-weight: 900; letter-spacing: -0.5px;
  background: linear-gradient(135deg, #fff 30%, #6ee7b7 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 4px;
}
.dm-name-bn {
  font-family: 'Hind Siliguri', sans-serif;
  font-size: 17px; font-weight: 700;
  color: rgba(110,231,183,0.75);
  margin: 0 0 14px; letter-spacing: 0.3px;
}
.dm-badge {
  display: inline-flex; align-items: center; gap: 7px;
  background: rgba(16,185,129,0.12);
  border: 1px solid rgba(16,185,129,0.25);
  color: #6ee7b7; font-size: 12px; font-weight: 700;
  padding: 5px 14px; border-radius: 999px;
  letter-spacing: 0.3px; margin-bottom: 14px;
}
.dm-badge-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #10b981;
  animation: dmPulse 2s ease-in-out infinite;
}
.dm-tagline {
  color: rgba(255,255,255,0.40); font-size: 13px;
  font-style: italic; font-weight: 500; margin: 0;
  line-height: 1.6;
}

/* ── Stats ── */
.dm-stats {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 10px; padding: 0 20px 20px;
}
.dm-stat {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px; padding: 14px 8px;
  text-align: center; display: flex; flex-direction: column;
  align-items: center; gap: 4px;
  animation: dmSlideUp .5s both;
  transition: background .25s, border-color .25s;
}
.dm-stat:hover {
  background: rgba(16,185,129,0.08);
  border-color: rgba(16,185,129,0.25);
}
@keyframes dmSlideUp {
  from { opacity:0; transform:translateY(16px); }
  to   { opacity:1; transform:translateY(0); }
}
.dm-stat-icon { font-size: 20px; }
.dm-stat-val  { font-size: 20px; font-weight: 900; color: #fff; font-family: 'Hind Siliguri', sans-serif; }
.dm-stat-lbl  { font-size: 11px; color: rgba(255,255,255,0.45); font-weight: 700;
                font-family: 'Hind Siliguri', sans-serif; }

/* ── Divider ── */
.dm-divider {
  height: 1px; margin: 0 20px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
}

/* ── Bio ── */
.dm-bio {
  padding: 18px 22px 14px;
  color: rgba(255,255,255,0.58); font-size: 13.5px;
  font-family: 'Hind Siliguri', sans-serif;
  line-height: 1.75; margin: 0; text-align: center;
}

/* ── Skills ── */
.dm-skills {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 0 20px 20px; justify-content: center;
}
.dm-skill {
  background: rgba(20,184,166,0.10);
  border: 1px solid rgba(20,184,166,0.25);
  color: #5eead4; font-size: 11.5px; font-weight: 700;
  padding: 5px 13px; border-radius: 999px;
  letter-spacing: 0.3px;
  animation: dmSlideUp .4s both;
  transition: all .2s;
}
.dm-skill:hover {
  background: rgba(20,184,166,0.22);
  border-color: rgba(20,184,166,0.55);
  color: #fff; transform: translateY(-2px);
}

/* ── Contact Buttons ── */
.dm-btns {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px; padding: 20px;
}
.dm-btn {
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 11px;
  border-radius: 16px; padding: 14px 16px;
  text-decoration: none; cursor: pointer;
  border: none; outline: none;
  transition: transform .22s cubic-bezier(.22,1,.36,1), box-shadow .22s, filter .22s;
  animation: dmSlideUp .5s both;
}
.dm-btn:hover {
  transform: translateY(-3px) scale(1.025);
  filter: brightness(1.12);
}
.dm-btn:active { transform: scale(0.96); }

.dm-btn-icon {
  color: rgba(255,255,255,0.95); flex-shrink: 0;
  width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
}
.dm-btn-text {
  display: flex; flex-direction: column; text-align: left;
}
.dm-btn-text strong {
  color: #fff; font-size: 13px; font-weight: 800;
  display: block; line-height: 1.2; letter-spacing: 0.2px;
}
.dm-btn-text small {
  color: rgba(255,255,255,0.65); font-size: 10.5px; font-weight: 600;
  display: block; margin-top: 2px;
  font-family: 'Hind Siliguri', sans-serif;
}

/* Ripple on click */
.dm-ripple {
  position: absolute; border-radius: 50%;
  width: 80px; height: 80px;
  background: rgba(255,255,255,0.30);
  transform: translate(-50%, -50%) scale(0);
  animation: dmRipple .6s ease-out;
  pointer-events: none;
}
@keyframes dmRipple {
  to { transform: translate(-50%,-50%) scale(3.5); opacity: 0; }
}

/* ── Footer ── */
.dm-footer {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 14px 20px 22px;
  color: rgba(255,255,255,0.30); font-size: 12px; font-weight: 600;
}
.dm-heart { animation: dmHeartbeat 1.4s ease-in-out infinite; display: inline-block; }
@keyframes dmHeartbeat {
  0%, 100% { transform: scale(1); }
  14%       { transform: scale(1.35); }
  28%       { transform: scale(1); }
  42%       { transform: scale(1.2); }
  70%       { transform: scale(1); }
}
.dm-footer strong { color: rgba(110,231,183,0.8); }

/* Mobile tightening */
@media (max-width: 480px) {
  .dm-card { border-radius: 22px; }
  .dm-name-en { font-size: 22px; }
  .dm-btns { grid-template-columns: 1fr; }
  .dm-hero { padding: 40px 18px 22px; }
}
`;
