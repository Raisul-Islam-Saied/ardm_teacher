import {
    Cpu,
    Database,
    Lock,
    Mail,
    Rocket,
    ShieldCheck,
    Terminal,
    Wifi
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * ==========================================
 * UTILITY HOOKS & HELPER FUNCTIONS
 * ==========================================
 */

// মাউস পজিশন হুক (প্যারালাক্স ইফেক্টের জন্য)
const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (ev) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);

  return mousePosition;
};

// টাইপরাইটার ইফেক্ট হুক (টার্মিনাল লগের জন্য)
const useTypewriter = (text, speed = 50) => {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    let i = 0;
    setDisplayText('');
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return displayText;
};

/**
 * ==========================================
 * SUB-COMPONENTS
 * ==========================================
 */

// 1. Interactive Starfield Background (Canvas based)
const StarfieldBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let particles = [];
    const particleCount = 100;

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2;
        this.color = `rgba(${Math.random() * 100 + 155}, ${Math.random() * 100 + 155}, 255, ${Math.random() * 0.5 + 0.1})`;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(100, 200, 255, ${1 - distance / 100})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 bg-[#0f172a]" />;
};

// 2. System Status Terminal
const SystemTerminal = () => {
  const [logs, setLogs] = useState([
    { id: 1, text: "> সিস্টেম ইনিশিয়ালাইজেশন শুরু হয়েছে...", type: "info" },
    { id: 2, text: "> সার্ভার সংযোগ স্থাপন করা হচ্ছে [192.168.x.x]", type: "warning" },
    { id: 3, text: "> ডেটাবেস অপ্টিমাইজেশন চলছে (৮৫%)", type: "success" },
  ]);

  useEffect(() => {
    const messages = [
      { text: "> সিকিউরিটি প্রোটোকল চেক করা হচ্ছে...", type: "info" },
      { text: "> ফ্রন্টএন্ড অ্যাসেট কম্পাইল হচ্ছে...", type: "warning" },
      { text: "> CDN ক্যাশ ক্লিয়ার করা হয়েছে...", type: "success" },
      { text: "> ইউজার ডেটা এনক্রিপশন ভেরিফাইড।", type: "success" },
      { text: "> নতুন ফিচার ডিপ্লয়মেন্ট প্রসেস শুরু...", type: "info" }
    ];

    let msgIndex = 0;
    const interval = setInterval(() => {
      if (msgIndex < messages.length) {
        setLogs(prev => [...prev.slice(-4), { ...messages[msgIndex], id: Date.now() }]);
        msgIndex++;
      } else {
        msgIndex = 0; // Loop messages
      }
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-black/80 backdrop-blur-md rounded-lg border border-slate-700 p-4 font-mono text-xs md:text-sm h-48 overflow-hidden relative shadow-[0_0_15px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
        <Terminal size={14} className="text-green-500" />
        <span className="text-slate-400">root@server:~# updates</span>
      </div>
      <div className="flex flex-col gap-2">
        {logs.map((log) => (
          <div key={log.id} className={`flex items-start animate-fade-in-up`}>
            <span className={`mr-2 ${
              log.type === 'success' ? 'text-green-400' : 
              log.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
            }`}>
              {log.type === 'success' ? '✔' : log.type === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <span className="text-slate-300 font-light tracking-wide">{log.text}</span>
          </div>
        ))}
        <div className="animate-pulse text-green-500">_</div>
      </div>
      {/* Scan line effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/5 to-transparent h-[10px] w-full animate-scan"></div>
    </div>
  );
};

/**
 * ==========================================
 * MAIN APP COMPONENT
 * ==========================================
 */
const Mantainance = () => {
  const { x, y } = useMousePosition();
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState('idle'); // idle, loading, success
  
  // Countdown State
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  // 3D Tilt Logic
  useEffect(() => {
    const box = document.getElementById('main-card');
    if (!box) return;

    const rect = box.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rotateXValue = ((y - centerY) / (window.innerHeight / 2)) * -5; // Max 5 deg tilt
    const rotateYValue = ((x - centerX) / (window.innerWidth / 2)) * 5;

    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  }, [x, y]);

  // Countdown Timer Logic
  useEffect(() => {
    const target = new Date();
    target.setDate(target.getDate() + 5); // 5 days from now
    
    const timer = setInterval(() => {
      const now = new Date();
      const diff = target - now;

      if (diff > 0) {
        setTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff / (1000 * 60 * 60)) % 24),
          m: Math.floor((diff / 1000 / 60) % 60),
          s: Math.floor((diff / 1000) % 60),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubscribeStatus('loading');
    setTimeout(() => {
      setSubscribeStatus('success');
      setEmail('');
    }, 2000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center font-sans text-slate-200 selection:bg-cyan-500 selection:text-black">
      
      {/* 1. Background Layer */}
      <StarfieldBackground />
      
      {/* 2. Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow delay-1000"></div>
      </div>

      {/* 3. Main 3D Card Container */}
      <div 
        id="main-card"
        className="relative z-10 w-full max-w-6xl mx-auto p-4 md:p-8 perspective-1000"
        style={{
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative group">
          
          {/* Decorative Top Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            
            {/* Left Column: Information */}
            <div className="p-8 md:p-12 flex flex-col justify-center relative">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider w-max mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                Maintenance Mode v2.0
              </div>

              {/* Title with Gradient */}
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                  অভিজ্ঞতা বদলাচ্ছে।
                </span>
                <br />
                <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                  নতুন কিছু আসছে।
                </span>
              </h1>

              <p className="text-slate-400 text-lg mb-8 leading-relaxed border-l-2 border-slate-700 pl-4">
                আমাদের সিস্টেম বর্তমানে <span className="text-white font-semibold">Scheduled Upgrade</span>-এর মধ্যে আছে। আমরা ব্যাকএন্ড আর্কিটেকচার অপ্টিমাইজ করছি যাতে আপনি পান সুপারফাস্ট পারফরম্যান্স।
              </p>

              {/* Timer Grid */}
              <div className="grid grid-cols-4 gap-4 mb-10">
                {[
                  { l: 'দিন', v: timeLeft.d }, 
                  { l: 'ঘণ্টা', v: timeLeft.h }, 
                  { l: 'মিনিট', v: timeLeft.m }, 
                  { l: 'সেকেন্ড', v: timeLeft.s }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center bg-slate-800/50 rounded-xl p-3 border border-white/5 shadow-inner backdrop-blur-sm">
                    <span className="text-2xl md:text-3xl font-bold font-mono text-white">
                      {item.v < 10 ? `0${item.v}` : item.v}
                    </span>
                    <span className="text-[10px] md:text-xs uppercase tracking-widest text-slate-500 mt-1">{item.l}</span>
                  </div>
                ))}
              </div>

              {/* Subscription Form */}
              <div className="relative">
                 {subscribeStatus === 'success' ? (
                   <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 animate-fade-in">
                     <ShieldCheck className="w-6 h-6" />
                     <div>
                       <h4 className="font-bold text-sm">নোটিফিকেশন সেট করা হয়েছে!</h4>
                       <p className="text-xs opacity-80">সাইট লাইভ হওয়ার সাথে সাথেই আপনি ইমেল পাবেন।</p>
                     </div>
                   </div>
                 ) : (
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="আপনার ইমেল অ্যাড্রেস দিন..."
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={subscribeStatus === 'loading'}
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {subscribeStatus === 'loading' ? (
                        <span className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>
                          নোটিফাই করুন <Rocket className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </form>
                 )}
              </div>
            </div>

            {/* Right Column: Interactive Dashboard Visualization */}
            <div className="bg-slate-950/50 p-8 md:p-12 border-l border-white/5 relative overflow-hidden flex flex-col justify-between">
              
              {/* Dashboard Header */}
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> System Status
                </h3>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                </div>
              </div>

              {/* Progress Stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 hover:border-cyan-500/30 transition-colors group cursor-default">
                  <div className="flex justify-between items-start mb-2">
                    <Database className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs text-slate-500">মাইগ্রেশন</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">92%</div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 w-[92%] relative">
                      <div className="absolute inset-0 bg-white/30 w-full animate-shimmer"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 hover:border-cyan-500/30 transition-colors group cursor-default">
                  <div className="flex justify-between items-start mb-2">
                    <Lock className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs text-slate-500">সিকিউরিটি</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">100%</div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 w-full"></div>
                  </div>
                </div>
              </div>

              {/* The Terminal Component */}
              <div className="relative z-10">
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                   <Wifi className="w-3 h-3 animate-pulse text-green-500" /> লাইভ লগ স্ট্রিম
                </div>
                <SystemTerminal />
              </div>
              
              {/* Decorative Circle behind */}
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-cyan-500 rounded-full mix-blend-overlay filter blur-[64px] opacity-20 pointer-events-none"></div>

            </div>

          </div>
        </div>
        
        {/* Footer info */}
        <div className="mt-8 flex justify-between items-center text-slate-500 text-sm font-medium px-4">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-green-500 rounded-full"></div>
             All Systems Operational
          </div>
          <div>ID: #MNT-2024-X99</div>
        </div>

      </div>

      {/* Global CSS for custom animations */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200px); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Mantainance;