/**
 * ARDM Student Portal — Main entry (VIEW wiring)
 * All data/state/RBAC lives in controllers/useStudentController.js,
 * exports in controllers/exportController.js, API in services/, adapters in models/.
 */
import {
  AlertCircle,
  Award,
  Check,
  ChevronLeft,
  Contact,
  Copy,
  FileText,
  Filter,
  Home,
  IdCard,
  Layers,
  Loader2,
  LogOut,
  Printer,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import AdvancedFilter from './AdvancedFilter';
import { CLASS_ORDER, CONFIG } from "./config/systemConfig";
import useStudentController from "./controllers/useStudentController";
import ImageViewer from './ImageViewer';
import PdfExportModal from './PdfExportModal';
import DetailView from "./views/DetailView";
import FullForm from "./views/FullForm";
import LoginView from "./views/LoginView";
import {
  AnimatedCount,
  GenderBar,
  Header,
  NavTab,
  PremiumStudentCard,
  PremiumStyles,
  SkeletonCard
} from "./views/UIComponents";

const Index = () => {
  const navigate = useNavigate();
 const {
    currentUser, authLoading, login, handleLogout,
    loading, processing, isSyncing, loadData,
    tab, setTab, detailData, setDetailData, isEdit, setIsEdit,
    searchText, setSearchText, classFilter, setClassFilter, sortConfig, setSortConfig,
    isFilterOpen, setIsFilterOpen, advancedFilteredData, setAdvancedFilteredData,
    isPdfModalOpen, setIsPdfModalOpen, showAllExports, setShowAllExports,
    viewerImg, setViewerImg, setScrollPos,
    toast, setToast, showToast, contactProgress,
    filteredList, siblingsOfDetail,
    students,
    handleSave, handleDelete,
    handleExportTablePDF, handleExportExcel, handleCopyAllIds,
    handleExportContacts, handleExportPDF, handleExportAllIDCards,
    checkExportPermission
  } = useStudentController();

  // RBAC: টিচার তখনই যোগ/এডিট করতে পারবে যখন সার্ভার প্রোফাইলে canEditAssignedClass = true
  const CAN_CLASS_TEACHER_EDIT = currentUser?.canEditAssignedClass === true;
  const roleFilteredStudents = students;

  // --- AUTH CHECK LOADING ---
  if(authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  // --- LOGIN PAGE ---
  if (!currentUser) {
    return <LoginView onLogin={login} />;
  }

  return (
    <div className="bg-gray-50 min-h-screen font-bangla text-slate-800 pb-24">
      {processing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex flex-col items-center justify-center text-white">
          <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
          <p className="font-bold">কাজ চলছে...</p>
        </div>
      )}
{contactProgress.show && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center px-6">
    <div className="bg-white rounded-3xl p-7 w-full max-w-xs text-center shadow-2xl">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#0E7490,#22D3EE)' }}>
        <Contact size={26} color="white" strokeWidth={2.2} />
      </div>
      <h3 className="font-black text-slate-800 text-sm mb-1">কন্টাক কার্ড তৈরি হচ্ছে</h3>
      <p className="text-[11px] font-bold text-slate-400 mb-4 truncate">
        {contactProgress.current < contactProgress.total
          ? contactProgress.name || 'শুরু হচ্ছে...'
          : 'ফাইল প্রস্তুত হচ্ছে...'}
      </p>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${contactProgress.total ? Math.round((contactProgress.current / contactProgress.total) * 100) : 0}%`,
            background: 'linear-gradient(90deg,#0E7490,#22D3EE)',
          }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] font-black text-slate-400">
        <span>{contactProgress.current} / {contactProgress.total}</span>
        <span>{contactProgress.total ? Math.round((contactProgress.current / contactProgress.total) * 100) : 0}%</span>
      </div>
    </div>
  </div>
)}
      {tab === 'home' && !detailData && (
  <>
    <PremiumStyles />
    <Header
      title="ARDM"
      action={
        <div className="flex gap-2">
          <button onClick={() => navigate("/result")} className="p-2 bg-amber-50 rounded-full active:bg-amber-100 text-amber-600">
            <Award size={20} />
          </button>
          <button onClick={() => loadData(true)} className="p-2 bg-gray-100 rounded-full active:bg-gray-200">
            <RefreshCw size={20} className={`transition-all duration-300 ${isSyncing ? 'animate-spin text-blue-600' : 'text-slate-600'}`}/>
          </button>
          <button onClick={handleLogout} className="p-2 bg-red-50 rounded-full active:bg-red-100 text-red-600">
            <LogOut size={20} />
          </button>
        </div>
      }
    />

    <div style={{ background: '#F0F4FF', minHeight: '100vh' }} className="pt-20 pb-28">

      {/* HERO */}
      <div className="px-4 pt-5">
        <div className="ardm-hero-bg relative rounded-[28px] overflow-hidden" style={{ padding: '28px 22px 24px' }}>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <svg className="ardm-pattern-spin absolute -right-20 -top-20 w-72 h-72 opacity-[0.04]" viewBox="0 0 200 200" fill="none">
              {[0,22.5,45,67.5,90,112.5,135,157.5].map((a, i) => (
                <rect key={i} x="97" y="5" width="6" height="190" rx="3" fill="white" transform={`rotate(${a} 100 100)`} />
              ))}
              <circle cx="100" cy="100" r="30" stroke="white" strokeWidth="2"/>
              <circle cx="100" cy="100" r="58" stroke="white" strokeWidth="1"/>
              <circle cx="100" cy="100" r="86" stroke="white" strokeWidth="0.5" strokeDasharray="5 9"/>
            </svg>
            <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, #D4A84340 0%, transparent 70%)' }} />
            <div className="absolute right-8 top-6 w-24 h-24 rounded-full" style={{ background: 'radial-gradient(circle, #60A5FA18 0%, transparent 70%)' }} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1.5 h-4 rounded-full bg-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {currentUser?.role === 'Admin' ? 'Admin Dashboard' : `Class ${currentUser?.classEn || ''} Dashboard`}
              </span>
            </div>

            <div className="flex items-end justify-between mb-6">
              <div>
                <AnimatedCount target={filteredList.length} />
                <p className="text-slate-400 text-xs font-bold mt-1.5 tracking-wide">মোট শিক্ষার্থী</p>
              </div>
              <div className="ardm-float ardm-glass rounded-2xl px-4 py-3 text-center">
                <div className="text-white text-xl font-black leading-none">
                  {[...new Set(filteredList.map(s => s.ClassBn))].length}
                </div>
                <div className="text-slate-400 text-[9px] font-bold mt-0.5 uppercase tracking-widest">Classes</div>
              </div>
            </div>

            <div className="space-y-3">
              <GenderBar label="Male" count={filteredList.filter(s => s.Gender === 'Male').length} total={filteredList.length} color="#60A5FA" delay="0.5s" />
              <GenderBar label="Female" count={filteredList.filter(s => s.Gender === 'Female').length} total={filteredList.length} color="#F472B6" delay="0.65s" />
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Session</span>
              <span className="text-[11px] font-black text-white">
                {[...new Set(filteredList.map(s => s.Session))].sort().join(', ') || '—'}
              </span>
              <span className="ml-auto text-[9px] font-black text-slate-500">
                Active <span className="text-emerald-400">{filteredList.filter(s => s.Status === 'Active').length}</span>
                {' / '}Inactive <span className="text-red-400">{filteredList.filter(s => s.Status !== 'Active').length}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

            {/* EXPORT */}
<div className="px-4 mt-4">
  <div className="bg-white rounded-[22px] p-5" style={{ boxShadow: '0 4px 20px rgba(6,13,31,0.055)', border: '1px solid rgba(6,13,31,0.05)' }}>
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.18em]">Export & Print</span>
      <div className="h-px flex-1 bg-slate-100" />
    </div>

    {(() => {
      const exportButtons = [
        { icon: FileText, label: 'Excel',     gradient: 'linear-gradient(135deg,#047857,#10B981)', glow: '#10B981', onClick: handleExportExcel },
        { icon: Printer,  label: 'PDF Info',  gradient: 'linear-gradient(135deg,#C2410C,#F97316)', glow: '#F97316', onClick: handleExportPDF },
        { icon: Layers,   label: 'Table',     gradient: 'linear-gradient(135deg,#1E3A8A,#3B82F6)', glow: '#3B82F6', onClick: handleExportTablePDF },
        { icon: IdCard,   label: 'ID Card',   gradient: 'linear-gradient(135deg,#5B21B6,#8B5CF6)', glow: '#8B5CF6', onClick: handleExportAllIDCards },
        { icon: Printer,  label: 'Smart PDF', gradient: 'linear-gradient(135deg,#4F46E5,#818CF8)', glow: '#818CF8', onClick: () => { if (checkExportPermission()) setIsPdfModalOpen(true); } },
        { icon: Contact,  label: 'Contact',   gradient: 'linear-gradient(135deg,#0E7490,#22D3EE)', glow: '#22D3EE', onClick: handleExportContacts },
      ];
      const mainButtons = exportButtons.slice(0, 4);
      const extraButtons = exportButtons.slice(4);

      const renderBtn = ({ icon: Icon, label, gradient, glow, onClick }, i) => (
        <button
          key={label}
          onClick={onClick}
          className="ardm-export-btn ardm-export-pop flex flex-col items-center gap-2"
          style={{ transition: 'transform 0.15s ease', animationDelay: `${i * 0.05}s` }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: gradient, boxShadow: `0 6px 18px ${glow}45` }}>
            <Icon size={22} color="white" strokeWidth={2.2} />
          </div>
          <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide text-center">{label}</span>
        </button>
      );

      return (
        <>
          <div className="grid grid-cols-4 gap-2">
            {mainButtons.map((btn, i) => renderBtn(btn, i))}
          </div>

          <div
            className="grid transition-all duration-350 ease-out"
            style={{
              gridTemplateRows: showAllExports ? '1fr' : '0fr',
              opacity: showAllExports ? 1 : 0,
              marginTop: showAllExports ? 12 : 0,
              transitionProperty: 'grid-template-rows, opacity, margin-top',
            }}
          >
            <div className="overflow-hidden">
              <div className="grid grid-cols-4 gap-2">
                {showAllExports && extraButtons.map((btn, i) => renderBtn(btn, i))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAllExports(v => !v)}
            className="w-full mt-3 py-2 rounded-xl text-[11px] font-black text-slate-400 flex items-center justify-center gap-1 active:scale-95"
            style={{ background: 'rgba(6,13,31,0.04)', transition: 'transform 0.15s ease' }}
          >
            {showAllExports ? 'Show Less' : 'See More'}
            <ChevronLeft
              size={12}
              className="transition-transform duration-300"
              style={{ transform: showAllExports ? 'rotate(90deg)' : 'rotate(-90deg)' }}
            />
          </button>
        </>
      );
    })()}
  </div>
</div>
      {/* FILTERS */}
      <div className="mt-5">
        <div className="flex gap-2 overflow-x-auto ardm-no-scrollbar pb-0.5 px-4">
          {['All', ...Object.keys(CLASS_ORDER)].map(cls => {
            const active = classFilter === cls;
            return (
              <button
                key={cls}
                onClick={() => setClassFilter(cls)}
                className="shrink-0 px-4 py-1.5 rounded-full text-[11px] font-black"
                style={{
                  transition: 'all 0.2s cubic-bezier(0.22,1,0.36,1)',
                  ...(active
                    ? { background: '#060D1F', color: '#D4A843', boxShadow: '0 4px 14px rgba(6,13,31,0.32)', border: '1px solid rgba(212,168,67,0.28)' }
                    : { background: 'rgba(6,13,31,0.07)', color: '#64748B', border: '1px solid transparent' }
                  ),
                }}
              >
                {cls === 'All' ? 'সকল' : cls}
              </button>
            );
          })}
        </div>

        <div className="px-4 flex gap-2 items-center mt-3">
          <div className="relative flex-1">
            <select
              value={`${sortConfig.field}_${sortConfig.order}`}
              onChange={e => { const [field, order] = e.target.value.split('_'); setSortConfig({ field, order }); }}
              className="w-full py-2.5 pl-3 pr-8 rounded-xl text-[11px] font-black text-slate-600 outline-none appearance-none"
              style={{ background: 'rgba(6,13,31,0.06)', border: '1px solid transparent' }}
            >
              <option value="_">Sort: Default</option>
              <option value="name_asc">Name A → Z</option>
              <option value="name_desc">Name Z → A</option>
              <option value="roll_asc">Roll ↑</option>
              <option value="roll_desc">Roll ↓</option>
              <option value="class_asc">Class ↑</option>
              <option value="class_desc">Class ↓</option>
              <option value="time_desc">Newest First</option>
              <option value="time_asc">Oldest First</option>
              <option value="dob_asc">Birthday</option>
              {currentUser?.role === 'Admin' && <option value="family_asc">Siblings Group</option>}
            </select>
            <ChevronLeft size={12} className="-rotate-90 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={() => { window.history.pushState({ page: 'filter' }, ''); setIsFilterOpen(true); }}
            className="px-4 py-2.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shrink-0"
            style={{
              transition: 'all 0.2s ease',
              ...(advancedFilteredData !== null
                ? { background: '#060D1F', color: '#D4A843', boxShadow: '0 4px 14px rgba(6,13,31,0.28)' }
                : { background: 'rgba(6,13,31,0.07)', color: '#64748B' }
              ),
            }}
          >
            <Filter size={14} />
            {advancedFilteredData !== null ? `(${advancedFilteredData.length})` : 'Filter'}
          </button>
          
          <button
            onClick={handleCopyAllIds}
            className="px-3 py-2.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shrink-0"
            style={{
              background: 'rgba(6,13,31,0.07)',
              color: '#64748B',
              transition: 'all 0.2s ease',
            }}
          >
            <Copy size={14} />
          </button>
        </div>

        <div className="px-4 mt-3 mb-2 flex items-center gap-2">
          <span className="text-[11px] font-black text-slate-400">{filteredList.length} জন শিক্ষার্থী</span>
          <div className="h-px flex-1 bg-slate-200/60" />
          {advancedFilteredData !== null && (
            <button onClick={() => setAdvancedFilteredData(null)} className="text-[10px] font-black text-red-400 flex items-center gap-1">
              <X size={10} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="px-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} index={i} />)
        ) : filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ background: 'rgba(6,13,31,0.05)' }}>
              <Users size={32} className="text-slate-300" />
            </div>
            <h3 className="font-black text-slate-400 text-sm">কোনো তথ্য পাওয়া যায়নি</h3>
            <p className="text-slate-300 text-xs mt-1 font-semibold">ফিল্টার বা সার্চ পরিবর্তন করুন</p>
          </div>
        ) : (
          filteredList.map((s, i) => (
            <PremiumStudentCard
              key={s.ID || i}
              data={s}
              index={i}
              showBirthdayCount={sortConfig.field === 'dob'}
              onImageClick={(img) => setViewerImg(img)}
              onClick={(data) => {
                window.history.pushState({ page: 'detail' }, '');
                setScrollPos(window.scrollY);
                setDetailData(data);
              }}
            />
          ))
        )}
      </div>

    </div>
  </>
)}

      {/* --- SEARCH VIEW --- */}
      {tab === 'search' && !detailData && (
        <div className="pt-6 px-4 h-screen flex flex-col">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-4 text-gray-400" size={20}/>
            <input 
              autoFocus
              className="w-full bg-white pl-12 pr-4 py-4 rounded-2xl border-none shadow-sm outline-none focus:ring-2 focus:ring-slate-900 font-bold text-lg placeholder:font-medium placeholder:text-gray-300"
              placeholder="Search by Name, ID or Roll..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto pb-24 px-1">
  {filteredList.map((s, i) => (
    <PremiumStudentCard
              key={s.ID || i}
              data={s}
              index={i}
              showBirthdayCount={sortConfig.field === 'dob'}
              onImageClick={(img) => setViewerImg(img)}
              onClick={(data) => {
                window.history.pushState({ page: 'detail' }, '');
                setScrollPos(window.scrollY);
                setDetailData(data);
              }}
            />
  ))}
</div>

        </div>
      )}

      {/* --- ADD/EDIT FORM VIEW --- */}
            {tab === 'add' && (
      (currentUser.role === "Visitor" || (currentUser.role === "Class" && !CAN_CLASS_TEACHER_EDIT))
    ? null
    : (

        <div className="pt-20 px-5 pb-10">
         <Header
  title={isEdit ? "Update Info" : "New Admission"}
  onBack={() => document.getElementById("formBackBtn")?.click()}
  action={<div/>}
/>

          <FullForm 
  initialData={isEdit ? detailData : null} 
  currentUser={currentUser}
  onSave={handleSave} 
  onCancel={() => { 
    if (isEdit) {
      setIsEdit(false);     // 👉 Detail এ ফিরবে
    } else {
      setTab('home');       // 👉 Add mode হলে Home
    }
  }}
  showToast={showToast}
  isAdmin={currentUser.role === 'Admin'}
/>
        </div>
   )   )}

      {/* --- DETAIL VIEW --- */}
      {detailData && !isEdit && (
  <DetailView
    data={detailData}
    onImageClick={(img) => setViewerImg(img)}
    currentUser={currentUser}
    siblings={siblingsOfDetail}
    onSelectSibling={(sib) => {
      window.history.pushState({ page: 'detail' }, '');
      setScrollPos(window.scrollY);
      setDetailData(sib);   // 👈 sibling-এর data দিয়ে detailData রিপ্লেস, DetailView সাথে সাথে তার প্রোফাইল দেখাবে
    }}
    onBack={() => {
      setDetailData(null);
      setTab('home');
    }}
    onEdit={() => {
      window.history.pushState({ page: "edit" }, "");
      setIsEdit(true);
      setTab('add');
    }}
    onDelete={() => handleDelete(detailData.ID)}
  />
)}

      {/* --- BOTTOM NAV --- */}
      {!detailData && tab !== 'add' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 border-t border-gray-100 h-20 px-6 flex justify-between items-end pb-3 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
           <NavTab icon={Home} label="Home" active={tab === 'home'} onClick={() => setTab('home')} />
                    {(currentUser.role === "Admin" || (currentUser.role === "Class" && CAN_CLASS_TEACHER_EDIT)) && (
 <NavTab icon={UserPlus} label="Add" main 

  onClick={() => {
    window.history.pushState({ page: "add" }, "");
    setIsEdit(false);
    setTab('add');
  }}
/>

)}

           <NavTab icon={Search} label="Search" active={tab === 'search'} onClick={() => {
    window.history.pushState({ page: "search" }, "");
    setTab('search');
  }}  />
        </div>
      )}
      <ImageViewer src={viewerImg} onClose={() => setViewerImg(null)} />
      {/* ============ PROFESSIONAL TOAST NOTIFICATION ============ */}
      {toast.show && (
        <>
          {/* Custom CSS for Animation - এটি এনিমেশন নিশ্চিত করবে */}
          <style>{`
            @keyframes slideDown {
              0% { transform: translateY(-100%) scale(0.8); opacity: 0; }
              60% { transform: translateY(10px) scale(1.02); opacity: 1; }
              100% { transform: translateY(0) scale(1); opacity: 1; }
            }
            @keyframes shrinkWidth {
              from { width: 100%; }
              to { width: 0%; }
            }
            .animate-toast-entry {
              animation: slideDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
            .animate-progress {
              animation: shrinkWidth 3s linear forwards;
            }
          `}</style>

          <div className="fixed top-0 left-0 right-0 z-[1000] flex justify-center pt-6 pointer-events-none">
            <div className="animate-toast-entry pointer-events-auto relative overflow-hidden bg-white/95 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl w-[90%] max-w-sm">
              
              {/* Main Content */}
              <div className="flex items-center gap-4 p-4">
                {/* Icon Box */}
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                  toast.type === 'success' 
                    ? 'bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-green-200' 
                    : 'bg-gradient-to-br from-red-400 to-pink-600 text-white shadow-red-200'
                }`}>
                  {toast.type === 'success' ? <Check size={24} strokeWidth={3} /> : <AlertCircle size={24} strokeWidth={3} />}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-black uppercase tracking-wider mb-0.5 ${
                    toast.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {toast.type === 'success' ? 'Success' : 'Attention'}
                  </h4>
                  <p className="text-slate-600 text-xs font-bold leading-relaxed">
                    {toast.msg}
                  </p>
                </div>

                {/* Close Button */}
                <button 
                  onClick={() => setToast(prev => ({ ...prev, show: false }))}
                  className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Progress Bar Line */}
              <div className={`h-1 w-full ${
                toast.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                <div className={`h-full animate-progress ${
                  toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                }`}></div>
              </div>

            </div>
          </div>
        </>
      )}
      {/* ============ END PROFESSIONAL TOAST ============ */}
      {/* ============ END PROFESSIONAL TOAST ============ */}

            {/* ============ ADVANCED FILTER MODAL ============ */}
      
            <AdvancedFilter
        isOpen={isFilterOpen}
        onClose={() => {
          // সরাসরি State চেঞ্জ না করে হিস্ট্রি ব্যাক করলেই অটোমেটিক handleBack ট্রিগার হয়ে মডাল ক্লোজ হবে
          if (window.history.state && window.history.state.page === "filter") {
            window.history.back();
          } else {
            setIsFilterOpen(false);
          }
        }}
        originalData={roleFilteredStudents}
        onApplyFilter={(result) => {
          if (result.length === roleFilteredStudents.length) {
            setAdvancedFilteredData(null);
          } else {
            setAdvancedFilteredData(result);
          }
        }}
      />
      {/* ============ ADVANCED PDF EXPORT MODAL ============ */}
      {/* ============ ADVANCED PDF EXPORT MODAL ============ */}
<PdfExportModal
  isOpen={isPdfModalOpen}
  onClose={() => setIsPdfModalOpen(false)}
  data={filteredList}
  appName={CONFIG.APP_NAME}
/>



    

    </div>
  );
};

export default Index;
