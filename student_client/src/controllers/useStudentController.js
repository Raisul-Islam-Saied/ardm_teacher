/**
 * ARDM Student Portal — State & RBAC Controller (MVC "controller")
 * - ERP session (shared JWT with Teacher client) + role mapping
 * - student CRUD against the centralized backend
 * - search / class filter / sort (verbatim logic from the original Index.jsx)
 */
import { useEffect, useMemo, useState } from 'react';
import { authApi, studentApi } from '../services/studentApiService';
import {
  clearAuthSessionStorage,
  extractApiErrorMessage,
  getStoredAuthToken,
  getStoredAuthUser
} from '../services/axiosClient';
import { extractFieldErrors } from '../services/apiErrors';
import { uploadSquarePhotoToCloudinary } from '../services/cloudinaryClient';
import { CLASS_ORDER, DEFAULT_IMAGE } from '../config/systemConfig';
import {
  canCreateStudent,
  canManageStudent,
  findSiblings,
  getDaysUntilBirthday,
  toUiStudents,
  toUiUser,
  toServerPayload
} from '../models/studentModel';
import { createExportController } from './exportController';

const STUDENTS_CACHE_KEY = 'ardm_students_cache_v2';

export default function useStudentController() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState('home');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewerImg, setViewerImg] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [advancedFilteredData, setAdvancedFilteredData] = useState(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  // যখন ডাটাবেস থেকে নতুন ডাটা লোড হবে, তখন ফিল্টার রিসেট করার জন্য:
  useEffect(() => {
    setAdvancedFilteredData(null);
  }, [students]);
  const [showAllExports, setShowAllExports] = useState(false);
  const [scrollPos, setScrollPos] = useState(0);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const [contactProgress, setContactProgress] = useState({ show: false, current: 0, total: 0, name: '' });
  const [sortConfig, setSortConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sortConfig")) || { field: '', order: '' }; }
    catch { return { field: '', order: '' }; }
  });

  const [classFilter, setClassFilter] = useState('All');

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    // ৩ সেকেন্ড পর অটোমেটিক বন্ধ হবে
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // ইউজার লগিন করার পর টিচারদের নিজস্ব ক্লাস (assignedClass) ডিফল্টভাবে সিলেক্ট হবে
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "Class" && currentUser.classBn) {
        setClassFilter(currentUser.classBn); // টিচারের জন্য তার নিজের ক্লাস
      } else {
        setClassFilter(localStorage.getItem("classFilter") || 'All'); // এডমিন (বা ক্লাসবিহীন টিচার) — All
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (classFilter) localStorage.setItem("classFilter", classFilter);
  }, [classFilter]);

  useEffect(() => {
    localStorage.setItem("sortConfig", JSON.stringify(sortConfig));
  }, [sortConfig]);

  // ------------------------------------------------------------------
  // 1. ERP SESSION CHECK ON BOOT  (GET /auth/me)
  // ------------------------------------------------------------------
  useEffect(() => {
    // পুরনো গুগল-শিট ক্যাশ কখনোই নতুন ডাটার সাথে মিশবে না
    try { localStorage.removeItem('cachedStudents'); } catch (e) {}

    let cancelled = false;
    const token = getStoredAuthToken();
    if (!token) {
      setCurrentUser(null);
      setAuthLoading(false);
      return undefined;
    }

    // দ্রুত UI-র জন্য সংরক্ষিত ইউজার, তারপর সার্ভারে যাচাই
    const stored = getStoredAuthUser();
    if (stored) setCurrentUser(toUiUser(stored));

    authApi.me()
      .then((user) => {
        if (cancelled) return;
        localStorage.setItem('ardm_erp_auth_user', JSON.stringify(user));
        setCurrentUser(toUiUser(user));
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403 || !err?.response) {
          if (status === 401 || status === 403) clearAuthSessionStorage();
          if (!err?.response && stored) return; // অফলাইনে সংরক্ষিত সেশন দিয়েই চলবে
          setCurrentUser(null);
        } else {
          // Pending / নিষ্ক্রিয় / অননুমোদিত রোল
          clearAuthSessionStorage();
          setCurrentUser(null);
          alert(err.message || extractApiErrorMessage(err));
        }
      })
      .finally(() => { if (!cancelled) setAuthLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const login = async (identifier, password) => {
    try {
      const { user } = await authApi.login(identifier, password);
      setCurrentUser(toUiUser(user));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: extractApiErrorMessage(err, 'লগিন ব্যর্থ হয়েছে') };
    }
  };

  const handleLogout = async () => {
    if (window.confirm("আপনি কি লগআউট করতে চান?")) {
      await authApi.logout();
      setCurrentUser(null);
      setStudents([]);
      setDetailData(null);
      setTab('home');
    }
  };

  // ------------------------------------------------------------------
  // 2. LOAD DATA ON LOGIN  (GET /students)
  // ------------------------------------------------------------------
  const loadData = async (showLoader = true) => {
    setIsSyncing(true); // ব্যাকগ্রাউন্ড সিঙ্ক শুরু হলো (উপরের আইকন ঘুরবে)

    let cachedData = null;
    try { cachedData = localStorage.getItem(STUDENTS_CACHE_KEY); } catch (e) {}

    if (cachedData && students.length === 0) {
      try { setStudents(JSON.parse(cachedData)); } catch (e) {} // চোখের পলকে লিস্ট দেখাবে
    }

    if (!cachedData && showLoader) {
      setLoading(true); // কোনো ডাটা না থাকলে শুধু প্রথমবার বড় লোডার দেখাবে
    }

    try {
      const docs = await studentApi.list();
      const list = toUiStudents(docs);
      setStudents(list);
      try { localStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(list)); } catch (e) {}
    } catch (e) {
      console.error("Data fetch error:", e);
      if (e?.response?.status === 401) {
        clearAuthSessionStorage();
        setCurrentUser(null);
        showToast("সেশন শেষ হয়েছে, আবার লগইন করুন", "error");
      } else if (!cachedData) {
        showToast(extractApiErrorMessage(e, "ইন্টারনেট সংযোগ চেক করুন!"), "error");
      }
    } finally {
      setLoading(false); // বড় লোডার বন্ধ
      setIsSyncing(false); // ব্যাকগ্রাউন্ড সিঙ্ক শেষ (উপরের আইকন থেমবে)
    }
  };

  useEffect(() => {
    if (currentUser) loadData(true); // true মানে প্রথমবার লোডার কল হবে
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?._id, currentUser?.teacherCode]);

  useEffect(() => {
    if (!detailData) {
      window.scrollTo({
        top: scrollPos,
        behavior: "instant" // চাইলে "smooth"
      });
    }
  }, [detailData]);

  const roleFilteredStudents = useMemo(() => {
    if (!currentUser) return [];
    // সার্ভার যে ডাটা দেয় সেটাই দেখানো হবে; এডিট/এক্সপোর্ট RBAC আলাদাভাবে চেক হয়
    return students;
  }, [students, currentUser]);

  // যখনই ট্যাব পরিবর্তন হবে, তখন যদি সেটি 'search' ট্যাব না হয়, তবে সার্চ টেক্সট ক্লিয়ার করে দিবে
  useEffect(() => {
    if (tab !== 'search') {
      setSearchText('');
    }
  }, [tab]);

useEffect(() => {
  const handleBack = () => {
// ✅ এটি সবার আগে যোগ করুন
    if (viewerImg) {
      setViewerImg(null);
      return;
    }
    if (isPdfModalOpen) {
  setIsPdfModalOpen(false);
  return;
    }
    // ১. যদি ফিল্টার মডাল ওপেন থাকে, তাহলে আগে সেটা ক্লোজ হবে
    if (isFilterOpen) {
      setIsFilterOpen(false);
      return;
    }

    // Edit → Detail
    if (isEdit) {
      setIsEdit(false);
      setTab('home');
      return;
    }

    // Detail → Home
    if (detailData) {
      setDetailData(null);
      return;
    }

    // Add → Home
    if (tab === 'add') {
      setTab('home');
      return;
    }

    // Search → Home
    if (tab !== 'home') {
      setTab('home');
      return;
    }

    // Home → Exit
    if (window.confirm("আপনি কি অ্যাপ থেকে বের হতে চান?")) {
      window.history.back();
    } else {
      window.history.pushState(null, "", window.location.href);
    }
  };

  window.addEventListener("popstate", handleBack);
  return () => window.removeEventListener("popstate", handleBack);
}, [tab, detailData, isEdit, isFilterOpen, viewerImg, isPdfModalOpen]); // <--- এখানে isFilterOpen যুক্ত করা হয়েছে

  // ------------------------------------------------------------------
  // 3. CREATE / UPDATE  (POST /students, PATCH /students/:_id)
  //    returns { ok, fieldErrors?, message? } so FullForm can show inline errors
  // ------------------------------------------------------------------
  const handleSave = async (formData, extra = {}) => {
    if (isEdit ? !canManageStudent(currentUser, detailData) : !canCreateStudent(currentUser)) {
      showToast("আপনার ডাটা অ্যাড বা এডিট করার অনুমতি নেই", "error");
      return { ok: false };
    }

    // রোল ডুপ্লিকেট চেক (সেশন + ক্লাস + রোল) — সার্ভারও আবার যাচাই করে
    const exists = students.find(s =>
      s.ClassBn === formData.classBn &&
      String(s.Session) === String(formData.sessionYear) &&
      String(s.Roll) === String(formData.roll) &&
      s.ID !== (isEdit ? detailData.ID : null) &&
      s.Status !== 'Deleted'
    );
    if (exists) {
      showToast("এই ক্লাসে এই রোল নম্বর আগে থেকেই আছে!", "error");
      return { ok: false, fieldErrors: [{ field: 'roll', message: `'${exists.StudentNameBn}'-এর রোল ইতিমধ্যে ${formData.roll}` }] };
    }

    if (currentUser.role === "Class" && formData.classBn !== currentUser.classBn) {
      alert("আপনি শুধু নিজের ক্লাসে ডাটা দিতে পারবেন");
      return { ok: false };
    }

    setProcessing(true);

    try {
      let imgUrl = formData.imageUrl || DEFAULT_IMAGE;
      let publicId;

      // নতুন ছবি (data URL) হলে ক্লাউডিনারিতে আপলোড, তারপর সার্ভারে সেভ
      if (imgUrl && imgUrl.startsWith('data:')) {
        const up = await uploadSquarePhotoToCloudinary(imgUrl, { publicId: `student_${Date.now()}` });
        imgUrl = up.url;
        publicId = up.publicId;
      }

      const payload = toServerPayload(formData, {
        isUpdate: isEdit,
        imageUrl: imgUrl,
        publicId,
        migration: extra.migration || null
      });

      const result = isEdit
        ? await studentApi.update(detailData._id, payload)
        : await studentApi.create(payload);

      if (!isEdit) {
        localStorage.removeItem("draftStudentForm");
      }
      await loadData(false);
      setTab('home');
      setDetailData(null);
      setIsEdit(false);
      showToast(result.message || "সফল হয়েছে", "success");
      return { ok: true };
    } catch (error) {
      const fieldErrors = extractFieldErrors(error);
      if (error?.response?.status === 401) {
        clearAuthSessionStorage();
        setCurrentUser(null);
      }
      showToast(extractApiErrorMessage(error, "Save failed"), "error");
      return { ok: false, fieldErrors };
    } finally {
      setProcessing(false);
    }
  };

  // ------------------------------------------------------------------
  // 4. SOFT DELETE  (DELETE /students/:_id)
  // ------------------------------------------------------------------
  const handleDelete = async (id) => {
    const target = students.find(s => s.ID === id) || detailData;
    if (!canManageStudent(currentUser, target)) {
      showToast("আপনার এই ডাটা ডিলিট করার অনুমতি নেই", "error");
      return;
    }

    if (!window.confirm("আপনি কি নিশ্চিত এই ডাটা ডিলিট করতে চান?")) return;

    setProcessing(true);
    try {
      const result = await studentApi.remove(target._id, 'পোর্টাল থেকে ডিলিট করা হয়েছে');
      setStudents(prev => prev.filter(s => s.ID !== id));
      setDetailData(null);
      showToast(result.message || "ডিলিট সফল হয়েছে", "success");
      loadData(false);
    } catch (error) {
      showToast(extractApiErrorMessage(error, "ডিলিট করা যায়নি"), "error");
    } finally {
      setProcessing(false);
    }
  };

  // ------------------------------------------------------------------
  // 5. SIBLINGS + FILTER / SORT (verbatim original logic)
  // ------------------------------------------------------------------
  const siblingsOfDetail = useMemo(
    () => findSiblings(roleFilteredStudents, detailData),
    [detailData, roleFilteredStudents]
  );

  const filteredList = useMemo(() => {
  // যদি অ্যাডভান্সড ফিল্টার করা থাকে, তবে সেটি নেবে, নাহলে রেগুলার ডাটা
  let list = advancedFilteredData !== null ? advancedFilteredData : roleFilteredStudents;
  
  // SEARCH FILTER
if (searchText) {
  const lower = searchText.toLowerCase();
  list = list.filter(s =>
    (s.StudentNameBn && s.StudentNameBn.toLowerCase().includes(lower)) ||
    (s.StudentNameEn && s.StudentNameEn.toLowerCase().includes(lower)) ||
    (s.ID && s.ID.toString().includes(lower)) ||
    (s.Roll && s.Roll.toString().includes(lower)) ||
    (s.WhatsApp && s.WhatsApp.includes(lower))
  );
}

  // শুধু Admin এর জন্য Class filter
  // সবার জন্যই Class filter কাজ করবে
  if (classFilter !== 'All') {
    list = list.filter(s => s.ClassBn === classFilter);
  }



  const { field, order } = sortConfig;
   if (field === 'family') {

  const clean = (name) =>
    (name || '')
      .replace(/মোঃ|মো\.?|মোহাম্মদ|মুহাম্মদ|md\.?|MD\.?/gi,'')
      .replace(/\s+/g,' ')
      .trim()
      .toLowerCase();

  const result = [];
  const familyKey = {};

  for (let i = 0; i < list.length; i++) {

    for (let j = i + 1; j < list.length; j++) {

      const a = list[i];
      const b = list[j];

      let score = 0;

      const fatherA = clean(a.FatherNameBn);
      const fatherB = clean(b.FatherNameBn);

      const motherA = clean(a.MotherNameBn);
      const motherB = clean(b.MotherNameBn);

      const phoneA = (a.WhatsApp || '').trim();
      const phoneB = (b.WhatsApp || '').trim();

      if (fatherA && fatherA === fatherB) score++;
      if (motherA && motherA === motherB) score++;
      if (phoneA && phoneA === phoneB) score++;

      if (score >= 2) {

        result.push(a);
        result.push(b);

        const key =
          fatherA || motherA || phoneA;

        familyKey[a.ID] = key;
        familyKey[b.ID] = key;
      }

    }
  }

  // duplicate remove
  list = result.filter((v, i, a) => a.indexOf(v) === i);

  // siblings together
  list.sort((a, b) => {
    const ka = familyKey[a.ID] || '';
    const kb = familyKey[b.ID] || '';
    return ka.localeCompare(kb);
  });

}
  if (field === 'name') {
    list = [...list].sort((a, b) =>
      order === 'asc'
        ? a.StudentNameEn.localeCompare(b.StudentNameEn)
        : b.StudentNameEn.localeCompare(a.StudentNameEn)
    );
  }

  if (field === 'roll') {
    list = [...list].sort((a, b) =>
      order === 'asc' ? a.Roll - b.Roll : b.Roll - a.Roll
    );
  }

 if (field === 'class') {
  list = [...list].sort((a, b) => {
    const classDiff =
      order === 'asc'
        ? (CLASS_ORDER[a.ClassBn] || 0) -
          (CLASS_ORDER[b.ClassBn] || 0)
        : (CLASS_ORDER[b.ClassBn] || 0) -
          (CLASS_ORDER[a.ClassBn] || 0);

    // যদি class আলাদা হয়
    if (classDiff !== 0) return classDiff;

    // class same হলে সবসময় roll ascending
    return (a.Roll || 0) - (b.Roll || 0);
  });
  }

  if (field === 'time') {
    list = [...list].sort((a, b) =>
      order === 'asc'
        ? new Date(a.Time) - new Date(b.Time)
        : new Date(b.Time) - new Date(a.Time)
    );
  }
   if (field === 'dob') {
    list = [...list].sort((a, b) => {
      const dA = getDaysUntilBirthday(a.DOB);
      const dB = getDaysUntilBirthday(b.DOB);
      if (dA === null && dB === null) return 0;
      if (dA === null) return 1;   // DOB না থাকলে নিচে
      if (dB === null) return -1;
      return dA - dB; // আজ (0) সবার আগে, তারপর কাল (1), তারপর ক্রমান্বয়ে
    });
  }
  return list;
}, [roleFilteredStudents, searchText, sortConfig, classFilter, currentUser, advancedFilteredData]); // <--- এখানে classFilter হবে

  // ------------------------------------------------------------------
  // 6. EXPORTS (templates are verbatim — see exportController.js)
  // ------------------------------------------------------------------
  const exportsApi = createExportController({ filteredList, currentUser, showToast, setContactProgress });

  return {
    // auth
    currentUser, authLoading, login, handleLogout,
    // data
    students, loading, processing, isSyncing, loadData,
    // ui state
    tab, setTab, detailData, setDetailData, isEdit, setIsEdit,
    searchText, setSearchText, classFilter, setClassFilter, sortConfig, setSortConfig,
    isFilterOpen, setIsFilterOpen, advancedFilteredData, setAdvancedFilteredData,
    isPdfModalOpen, setIsPdfModalOpen, showAllExports, setShowAllExports,
    viewerImg, setViewerImg, scrollPos, setScrollPos,
    toast, setToast, showToast, contactProgress,
    // derived
    filteredList, siblingsOfDetail,
    // crud
    handleSave, handleDelete,
    // exports
    ...exportsApi
  };
}
