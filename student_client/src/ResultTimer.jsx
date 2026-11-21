import {
  Cpu,
  Database,
  FileText,
  Globe,
  ShieldAlert,
  Terminal,
  Wifi
} from 'lucide-react';
import { useEffect, useState } from 'react';

// ==========================================
// ⚙️ কনফিগারেশন সেকশন (এখানে এডিট করুন)
// ==========================================

// ফরম্যাট: "YYYY-MM-DDTHH:mm:ss" (২৪ ঘণ্টার ফরম্যাট)
// উদাহরণ: "2026-02-15T14:00:00" মানে ২০২৬ সালের ১৫ ফেব্রুয়ারি দুপুর ২টা


// ==========================================

const ResultTimer = ({targetDate}) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [logs, setLogs] = useState([]);
  const [serverLoad, setServerLoad] = useState(45);
  const [progress, setProgress] = useState(0);

  // সিস্টেম লগের বিশাল তালিকা
  const logMessages = [
  "Connecting to madrasa database...",
  "Secure connection verified...",
  "Play Group records syncing...",
  "Nursery attendance checking...",
  "KG student data updated...",
  "Class 1-3 records loading...",
  "Class 4-5 results merging...",
  "Class 6-8 marks verifying...",
  "Class 9 subject marks checking...",
  "Class 10 result calculating...",
  "Student ID data check passed...",
  "Optimizing database speed...",
  "Local server started...",
  "Scanning mark entry errors...",
  "Deploying result system...",
  "Clearing old cache...",
  "Generating marksheets (Play-10)...",
  "System running stable...",
  "Duplicate records scan done...",
  "Rechecking absent list (Class 10)...",
  "Updating Class 9-10 marks...",
  "Allocating system resources...",
  "Creating secure backup...",
  "Admin login successful...",
  "Updating all class records...",
  "Syncing class data...",
  "Verification completed...",
  "Preparing for result publish...",
  "Waiting for final approval...",
  "System ready for release..."
];


  // টাইমার লজিক
  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(targetDate) - +new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        window.location.reload();
      }
    };

    const timer = setInterval(calculateTime, 1000);
    calculateTime(); // initial call

    return () => clearInterval(timer);
  }, []);

  // ফেইক সিস্টেম সিমুলেশন
  useEffect(() => {
    const interval = setInterval(() => {
      // ১. প্রগ্রেস বার বাড়ানো (৯৯% এ গিয়ে থামবে)
      setProgress((prev) => {
        if (prev >= 99) return 99;
        return prev + (Math.random() * 0.5);
      });

      // ২. র‍্যান্ডম সার্ভার লোড
      setServerLoad(prev => Math.max(20, Math.min(100, prev + (Math.random() * 20 - 10))));

      // ৩. নতুন লগ তৈরি করা
      const randomMsg = logMessages[Math.floor(Math.random() * logMessages.length)];
      const type = Math.random() > 0.8 ? 'warning' : (Math.random() > 0.9 ? 'error' : 'success');
      
      const newLog = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        text: randomMsg,
        type: type
      };

      //setLogs(prev => [newLog, ...prev].slice(0, 8)); 
      // স্ক্রিনে সর্বোচ্চ ৮টি লগ দেখাবে
setLogs(prev => [...prev, newLog].slice(-8));

    }, 1200); // প্রতি ৮০০ মিলিসেকেন্ডে নতুন লগ

    return () => clearInterval(interval);
  }, []);

  // তারিখ ফরম্যাট করার ফাংশন (সুন্দর দেখানোর জন্য)
  const formattedDate = new Date(targetDate).toLocaleDateString('bn-BD', {
     year: 'numeric', month: 'long', day: 'numeric'
  });
  const formattedTime = new Date(targetDate).toLocaleTimeString('bn-BD', {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-[#050b14] text-slate-200 font-sans selection:bg-cyan-500 overflow-hidden relative flex flex-col">
      
      {/* ব্যাকগ্রাউন্ড অ্যানিমেশন (ম্যাট্রিক্স স্টাইল রেইন ইফেক্ট - CSS দিয়ে) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] z-0 pointer-events-none"></div>
      
      {/* হেডার */}
      <header className="relative z-20 border-b border-cyan-900/30 bg-[#0a1120]/90 backdrop-blur-md px-6 py-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-cyan-950 p-3 rounded-lg border border-cyan-500/30 relative overflow-hidden group">
              <div className="absolute inset-0 bg-cyan-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <FileText className="text-cyan-400 w-8 h-8 relative z-10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">রেজাল্ট পোর্টাল</h1>
              <p className="text-xs text-cyan-500 font-mono uppercase tracking-[0.3em]">abdur razzak dakhil madrasah</p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-6 text-xs font-mono">
             <div className="flex items-center gap-2 text-green-400 bg-green-900/20 px-3 py-1 rounded-full border border-green-500/30">
                <Wifi className="w-3 h-3 animate-pulse" /> SYSTEM ONLINE
             </div>
             <div className="flex items-center gap-2 text-slate-400 hidden sm:flex">
                <Globe className="w-3 h-3" /> Zone: BD-CHITTAGONG
             </div>
          </div>
        </div>
      </header>

      {/* মেইন কন্টেন্ট */}
      <main className="flex-grow relative z-10 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 lg:p-8 gap-8">
        
        {/* বাম পাশ: কাউন্টডাউন এবং নোটিশ */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center">
          
          <div className="bg-[#0f192b]/80 border border-cyan-500/20 rounded-2xl p-8 relative overflow-hidden shadow-2xl backdrop-blur-sm">
            {/* ডেকোরেটিভ কর্নার */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-2xl"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-cyan-500/50 rounded-br-2xl"></div>

            <div className="text-center mb-10">
              <div className="inline-block bg-cyan-500/10 text-cyan-300 px-4 py-1 rounded-full text-sm font-semibold mb-4 border border-cyan-500/20 animate-pulse">
                ফলাফল প্রকাশের সম্ভাব্য সময়
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-2">{formattedDate}</h2>
              <p className="text-xl text-slate-400 font-mono">সময়: {formattedTime}</p>
            </div>

            {/* টাইমার */}
            <div className="grid grid-cols-4 gap-2 md:gap-4 mb-10">
              {[
                { label: 'দিন', value: timeLeft.days },
                { label: 'ঘণ্টা', value: timeLeft.hours },
                { label: 'মিনিট', value: timeLeft.minutes },
                { label: 'সেকেন্ড', value: timeLeft.seconds }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center group">
                  <div className="relative w-full aspect-square max-w-[100px] bg-[#0a0f1c] rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden group-hover:border-cyan-500/50 transition-colors duration-300 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                    <span className="text-3xl md:text-5xl font-mono font-bold text-white z-10 tabular-nums">
                      {item.value < 10 ? `0${item.value}` : item.value}
                    </span>
                    {/* ব্যাকগ্রাউন্ড স্ক্যান লাইন */}
                    <div className="absolute w-full h-[2px] bg-cyan-500/50 top-0 animate-[scan_3s_linear_infinite] opacity-50"></div>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-slate-500 mt-3 font-semibold">{item.label}</span>
                </div>
              ))}
            </div>

            {/* ওয়ার্নিং মেসেজ */}
            <div className="bg-yellow-500/5 border-l-4 border-yellow-500 p-4">
               <div className="flex items-start gap-3">
                 <ShieldAlert className="w-6 h-6 text-yellow-500 shrink-0" />
                 <div>
                   <h4 className="text-yellow-500 font-bold text-sm uppercase mb-1">সতর্কবার্তা</h4>
                   <p className="text-xs text-slate-400 leading-relaxed">
                     ফলাফল প্রকাশের সময় সার্ভারে অতিরিক্ত চাপ থাকতে পারে। দয়া করে ধৈর্য ধরুন। অন্য কোনো ওয়েবসাইটে নিজের ব্যক্তিগত তথ্য বা রোল নম্বর শেয়ার করবেন না।
                   </p>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* ডান পাশ: সিস্টেম লগ টার্মিনাল এবং স্ট্যাটাস */}
     {/* <div className="w-full lg:w-1/2 flex flex-col gap-6">*/}
      <div className="hidden lg:flex w-full lg:w-1/2 flex-col gap-6">
          {/* স্ট্যাটাস গ্রিড */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0f192b] border border-slate-800 p-5 rounded-xl flex flex-col justify-between hover:border-cyan-500/30 transition-colors">
              <div className="flex justify-between text-slate-500 mb-2 text-xs font-mono uppercase">
                <span>Server Load</span>
                <Cpu className="w-4 h-4" />
              </div>
              <div className="text-3xl font-bold text-white font-mono">{serverLoad.toFixed(0)}%</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${serverLoad > 80 ? 'bg-red-500' : 'bg-cyan-500'}`} 
                  style={{width: `${serverLoad}%`}}
                ></div>
              </div>
            </div>

            <div className="bg-[#0f192b] border border-slate-800 p-5 rounded-xl flex flex-col justify-between hover:border-purple-500/30 transition-colors">
               <div className="flex justify-between text-slate-500 mb-2 text-xs font-mono uppercase">
                <span>Processed Data</span>
                <Database className="w-4 h-4" />
              </div>
              <div className="text-3xl font-bold text-white font-mono">{Math.floor(progress)}%</div>
              <div className="text-[10px] text-purple-400 mt-1 animate-pulse">Syncing clusters...</div>
            </div>
          </div>

          {/* টার্মিনাল / লগ বক্স */}
         <div className="h-[310px] lg:h-auto lg:flex-grow bg-black rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-2xl relative">

            {/* টার্মিনাল হেডার */}
            <div className="bg-[#1e1e1e] px-4 py-2 flex items-center justify-between border-b border-white/5">
               <div className="flex gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                 <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
               </div>
               <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
                 <Terminal className="w-3 h-3" /> bash --live
               </div>
            </div>

            {/* লগ কন্টেন্ট */}
            <div className="p-4 font-mono text-[11px] md:text-xs space-y-2 overflow-y-auto relative flex-grow flex flex-col justify-end lg:justify-start">

               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
               
               {logs.map((log) => (
                 <div key={log.id} className="flex gap-3 animate-fade-in-up">
                   <span className="text-slate-600 min-w-[70px] select-none">{log.time}</span>
                   <div className="flex-grow break-words">
                      <span className={`mr-2 font-bold ${
                        log.type === 'success' ? 'text-green-500' : 
                        log.type === 'error' ? 'text-red-500' : 
                        log.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                      }`}>
                        {log.type === 'success' ? '✔' : log.type === 'error' ? '✖' : '➜'}
                      </span>
                      <span className="text-slate-300">{log.text}</span>
                   </div>
                 </div>
               ))}
               
               {/* টাইপিং কার্সর */}
               <div className="mt-2 flex items-center gap-2 text-cyan-500 animate-pulse">
                 <span>SAIED@server:~$</span>
                 <span className="w-2 h-4 bg-cyan-500"></span>
               </div>
            </div>
          </div>

        </div>
      </main>

      {/* ফুটার */}
      <footer className="relative z-10 border-t border-white/5 bg-[#0a1120] py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-slate-500 text-xs font-mono">
           <p>&copy; {new Date().getFullYear()} Abdur Razzak Dakhil Madrasah. All rights reserved.</p>
           <div className="flex gap-4 mt-2 md:mt-0">
             <span>Developer: RAISUL ISLAM SAIED</span>
             <span className="text-green-500">System Status: OPERATIONAL</span>
           </div>
        </div>
      </footer>

      {/* কাস্টম অ্যানিমেশন CSS */}
      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          30% { opacity: 0.5; }
          100% { top: 100%; opacity: 0; }
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

export default ResultTimer;

