import {
  Activity,
  ArrowLeft, BookOpen,
  Calendar,
  CheckCircle,
  CreditCard,
  FileText,
  Home,
  Phone,
  Printer,
  School,
  Search,
  User,
  Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

// --- CONFIGURATION ---
const API_URL = "https://script.google.com/macros/s/AKfycbzlG01v-naEr4WZR__n4ZX9fPkQR9pE01A0n8W9fOMUfw5x3RIDNPD_ZyaDwsVz9fphFw/exec";
const INSTITUTE_NAME = "Abdur Razzak Dakhil Madrasah";
const INSTITUTE_TAGLINE = "Education for Dunya & Akhirah";

// --- UTILS ---
const formatDate = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
};

export default function Info() {
  const [loading, setLoading] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');

useEffect(() => {
  const pathId = window.location.pathname.substring(1);

  const params = new URLSearchParams(window.location.search);
  const queryId = params.get('id');

  const idFromUrl = pathId || queryId;
  setCurrentUrl(window.location.href);

  // 🔒 Only numeric ID allowed
  if (idFromUrl && /^\d+$/.test(idFromUrl)) {
    setSearchId(idFromUrl);
    fetchStudentData(idFromUrl);
  }
}, []);


  const fetchStudentData = async (id) => {
  if (!id) return;

  setLoading(true);
  setError('');

  try {
    const response = await fetch(`${API_URL}?action=read&id=${id}`);
    const result = await response.json();

    if (result.status === 'success') {

      // 🔥 Direct student object
      setStudent(result.data);

      const newUrl = `${window.location.origin}/${id}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      setCurrentUrl(newUrl);

    } else {
      setStudent(null);
      setError(result.message || 'শিক্ষার্থীর তথ্য পাওয়া যায়নি');
    }

  } catch (err) {
    console.error(err);
    setError("সার্ভার সংযোগ সমস্যা");
  } finally {
    setLoading(false);
  }
};


  const handleSearch = (e) => {
    e.preventDefault();
    fetchStudentData(searchId);
  };

  const handleReset = () => {
    setStudent(null);
    setSearchId('');
    setError('');
    // Reset URL to root path /
    window.history.pushState({}, '', '/');
  };

  // --- LOADING VIEW ---
  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-emerald-200 rounded-full animate-spin"></div>
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <School className="absolute inset-0 m-auto text-emerald-700 w-8 h-8" />
        </div>
        <p className="mt-6 text-emerald-800 font-bold animate-pulse">তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  // --- SEARCH VIEW ---
  if (!student) {
    return (
      <div className="min-h-screen bg-[#F0FDF4] relative overflow-hidden font-sans">
        {/* Decorative Background Pattern (Islamic Motif Concept) */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]"></div>
        
        {/* Top Header */}
        <header className="absolute top-0 w-full py-6 px-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-700 rounded-full flex items-center justify-center shadow-lg text-white">
               <School size={20} />
             </div>
             <span className="font-bold text-emerald-900 hidden sm:block">{INSTITUTE_NAME}</span>
          </div>
        </header>

        <main className="flex flex-col items-center justify-center min-h-screen px-4 relative z-10">
          
          <div className="w-full max-w-xl bg-white/80 backdrop-blur-xl border border-white p-8 md:p-12 rounded-3xl shadow-[0_20px_50px_rgba(0,128,96,0.15)] text-center">
            
            <div className="mb-8">
              <div className="inline-block p-4 bg-emerald-100 rounded-full mb-4 animate-bounce-slow">
                <BookOpen className="w-12 h-12 text-emerald-700" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-emerald-950 mb-2">{INSTITUTE_NAME}</h1>
              <p className="text-emerald-600 font-medium">{INSTITUTE_TAGLINE}</p>
            </div>

            <form onSubmit={handleSearch} className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative flex items-center bg-white border border-emerald-100 rounded-xl p-2 shadow-lg">
                <Search className="w-6 h-6 text-emerald-400 ml-3" />
                <input
                  type="number"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="শিক্ষার্থীর আইডি নম্বর লিখুন..."
                  className="w-full bg-transparent text-gray-800 px-4 py-3 text-lg focus:outline-none placeholder-gray-400"
                  autoFocus
                />
                <button 
                  type="submit"
                  disabled={!searchId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-all transform active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
                >
                  সার্চ
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center justify-center gap-2 text-sm font-medium animate-shake">
                <CheckCircle className="w-4 h-4 text-red-500" />
                {error}
              </div>
            )}
            
            <div className="mt-10 border-t border-emerald-100 pt-6">
              <p className="text-xs text-gray-400">© 2024 Digital Madrasah Management System</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- PROFILE VIEW ---
  return (
    <div className="min-h-screen bg-gray-100 print:bg-white text-gray-800 font-sans">
      
      {/* NAVBAR (No Print) */}
      <nav className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <ArrowLeft className="text-gray-600 w-5 h-5" />
            <span className="font-bold text-emerald-800 sm:block">অন্য সার্চ করুন</span>
          </div>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-full font-bold shadow-lg shadow-emerald-200 transition-all"
          >
            <Printer className="w-4 h-4" /> প্রিন্ট করুন
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4 md:p-8 print:p-0 print:max-w-none print:w-full">
        
        {/* MAIN CARD */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none border border-gray-200 print:border-none">
          
          {/* HEADER (Letterhead Style) */}
          <div className="bg-emerald-900 text-white p-8 print:bg-white print:text-black print:border-b-2 print:border-emerald-800 print:p-0 print:pb-2 print:mb-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 print:flex-row print:justify-between">
              <div className="flex items-center gap-4">
                 {/* Logo removed as requested */}
                 <div className="text-center md:text-left print:text-left">
                   <h1 className="text-3xl font-bold uppercase tracking-wide print:text-3xl">{INSTITUTE_NAME}</h1>
                   <p className="text-emerald-200 print:text-gray-600 font-medium">{INSTITUTE_TAGLINE}</p>
                   <p className="text-xs text-emerald-400 print:text-gray-500 mt-1">স্থাপিত: ২০১৮ ইং </p>
                 </div>
              </div>
              
              {/* QR Code */}
              <div className="bg-white p-2 rounded-lg print:border print:border-gray-300">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}&color=064e3b`}
                  alt="Student QR"
                  className="w-24 h-24 print:w-16 print:h-16"
                />
                <p className="text-[10px] text-center text-gray-500 mt-1 font-bold">SCAN ME</p>
              </div>
            </div>
          </div>

          <div className="p-8 print:p-0">
            
            {/* STUDENT IDENTITY SECTION */}
            <div className="flex flex-col md:flex-row gap-8 mb-8 items-start border-b border-gray-200 pb-8 print:pb-2 print:mb-2 print:flex-row print:gap-6">
              
              {/* Photo Area */}
              <div className="w-full md:w-auto flex flex-col items-center print:w-auto">
                <div className="w-40 h-48 bg-gray-200 border-4 border-white shadow-lg print:border-gray-800 print:shadow-none mb-3 overflow-hidden rounded-md print:w-32 print:h-40">
                   <img 
                      src={student.ImageURL} 
                      onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"}
                      alt="Student"
                      className="w-full h-full object-cover"
                   />
                </div>
                <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase ${student.Status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} print:border print:border-black print:bg-transparent print:text-black`}>
                  {student.Status}
                </span>
              </div>

              {/* Main Info */}
              <div className="flex-1 w-full">
                <h2 className="text-3xl font-bold text-gray-900 mb-1 print:text-2xl">{student.StudentNameEn}</h2>
                <h3 className="text-xl text-emerald-700 font-medium mb-6 font-bangla print:text-black print:mb-4">{student.StudentNameBn}</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                  <StatBox label="Student ID" value={student.ID} icon={<CreditCard />} />
                  <StatBox label="Class" value={`${student.ClassEn} (${student.ClassBn})`} icon={<BookOpen />} />
                  <StatBox label="Roll No" value={student.Roll} icon={<Activity />} />
                  <StatBox label="Session" value={student.Session} icon={<Calendar />} />
                </div>
              </div>
            </div>

            {/* DETAILED INFO GRID */}
            {/* Changed to 2 columns in Print for compactness */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 print:grid print:grid-cols-2 print:gap-x-6 print:gap-y-2 print:text-sm">
              
              {/* Personal Information */}
              <div className="break-inside-avoid print:mb-2">
                <Section title="ব্যক্তিগত তথ্য (Personal Info)" icon={<User />}>
                  <InfoRow label="জন্ম নিবন্ধন (BRN)" value={student.BRN} />
                  <InfoRow label="জন্ম তারিখ" value={formatDate(student.DOB)} />
                  <InfoRow label="লিঙ্গ" value={student.Gender} />
                  <InfoRow label="রক্তের গ্রুপ" value={student.BloodGroup} />
                  <InfoRow label="ধর্ম" value="Islam" /> 
                </Section>
              </div>

              {/* Guardian Information */}
              <div className="break-inside-avoid print:mb-2">
                <Section title="অভিভাবকের তথ্য (Guardian Info)" icon={<Users />}>
                  <InfoRow label="পিতার নাম (En)" value={student.FatherNameEn} />
                  <InfoRow label="পিতার নাম (Bn)" value={student.FatherNameBn} />
                  <InfoRow label="মাতার নাম (En)" value={student.MotherNameEn} />
                  <InfoRow label="মাতার নাম (Bn)" value={student.MotherNameBn} />
                </Section>
              </div>

              {/* Contact Information */}
              <div className="break-inside-avoid print:mb-2">
                <Section title="যোগাযোগের তথ্য (Contact Info)" icon={<Phone />}>
                  <InfoRow label="মোবাইল (WhatsApp)" value={student.WhatsApp} />
                  <InfoRow label="জরুরি মোবাইল" value={student.EmergencyNo} />
                </Section>
              </div>

              {/* Address Information */}
              <div className="break-inside-avoid print:mb-0">
                <Section title="ঠিকানা (Address Details)" icon={<Home />}>
                  <div className="space-y-2">
                    <AddressRow label="বাড়ির নাম" valEn={student.HouseNameEn} valBn={student.HouseNameBn} />
                    <AddressRow label="গ্রাম/মহল্লা" valEn={student.VillageEn} valBn={student.VillageBn} />
                    <AddressRow label="ইউনিয়ন/ওয়ার্ড" valEn={`${student.UnionEn} (Word: ${student.WardNo})`} valBn={student.UnionBn} />
                    <AddressRow label="উপজেলা" valEn={student.UpazilaEn} valBn={student.UpazilaBn} />
                    <AddressRow label="জেলা" valEn={student.DistrictEn} valBn={student.DistrictBn} />
                  </div>
                </Section>
              </div>

              {/* System Info */}
               <div className="break-inside-avoid print:col-span-2 ">
                <Section title="অফিসিয়াল তথ্য (Office Use)" icon={<FileText />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
                    <InfoRow label="Last Updated" value={student.LastUpdated} />
                    <InfoRow label="Verification URL" value={currentUrl} className="break-all text-xs text-blue-600 print:text-black" />
                  </div>
                </Section>
               </div>

            </div>

            {/* PRINT FOOTER */}
            <div className="hidden print:flex mt-2 justify-between items-end print:mt-6">
              <div className="text-center">
                 <div className="w-40 border-t border-black mb-2"></div>
                 <p className="font-bold text-sm">অভিভাবকের স্বাক্ষর</p>
              </div>
              <div className="text-center">
                 <div className="w-40 border-t border-black mb-2"></div>
                 <p className="font-bold text-sm">সুপারিনটেনডেন্ট স্বাক্ষর</p>
               
              </div>
            </div>

            <div className="mt-8 text-center border-t border-gray-100 pt-4 print:mt-4 print:pt-2">
              <p className="text-xs text-gray-400">This is a system generated document. No signature is required for online verification.</p>
              <p className="text-xs text-gray-400 print:text-black">Generated on: {new Date().toLocaleString()}</p>
            </div>

          </div>
        </div>
      </div>
      
      {/* Styles for Printing */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600&family=Inter:wght@400;600;700&display=swap');
        
        body { font-family: 'Inter', sans-serif; }
        .font-bangla { font-family: 'Noto Sans Bengali', sans-serif; }

        @media print {
          @page { margin: 0.8cm; size: A4; }
          body { -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:flex { display: flex !important; }
          .print\\:block { display: block !important; }
          .print\\:grid { display: grid !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:text-black { color: black !important; }
          .print\\:w-full { width: 100% !important; }
        }
      `}</style>
      
    </div>
  );
}

// --- SUB COMPONENTS ---

const StatBox = ({ label, value, icon }) => (
  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 print:bg-white print:border-gray-300">
    <div className="flex items-center gap-2 mb-1 text-emerald-700 print:text-black">
      {React.cloneElement(icon, { size: 16 })}
      <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
    </div>
    <div className="font-bold text-gray-800 text-sm md:text-base break-words print:text-black">{value || '-'}</div>
  </div>
);

const Section = ({ title, children, icon }) => (
  <div className="mb-2">
    <h3 className="flex items-center gap-2 text-lg font-bold text-emerald-900 border-b-2 border-emerald-100 pb-2 mb-4 print:text-black print:border-gray-300 print:text-base print:mb-2">
      <span className="bg-emerald-100 p-1.5 rounded text-emerald-700 print:hidden">{React.cloneElement(icon, { size: 18 })}</span>
      {title}
    </h3>
    <div className="space-y-3 pl-2 print:space-y-1">
      {children}
    </div>
  </div>
);

const InfoRow = ({ label, value, className = "" }) => (
  <div className="flex justify-between items-start border-b border-dashed border-gray-100 pb-1 last:border-0 hover:bg-gray-50 transition-colors print:hover:bg-transparent print:border-gray-300">
    <span className="text-sm text-gray-500 font-medium w-1/3 print:text-gray-600 print:text-xs">{label}</span>
    <span className={`text-sm font-semibold text-gray-800 w-2/3 text-right font-bangla print:text-black print:text-sm ${className}`}>{value || "N/A"}</span>
  </div>
);

const AddressRow = ({ label, valEn, valBn }) => (
  <div className="flex flex-col border-b border-dashed border-gray-100 pb-2 last:border-0 print:border-gray-300 print:pb-1">
    <span className="text-xs text-gray-400 font-bold uppercase mb-1 print:text-black">{label}</span>
    <div className="flex justify-between items-center">
       <span className="text-sm font-semibold text-gray-800 print:text-black">{valEn || "-"}</span>
       <span className="text-sm text-gray-500 font-bangla print:text-black">{valBn || ""}</span>
    </div>
  </div>
);
