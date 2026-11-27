/**
- ARDM Student Portal — State & RBAC Controller (MVC "controller")
- - ERP session (shared JWT with Teacher client) + dynamic RBAC settings
- - student CRUD against the centralized backend
- - search / class filter / sort + React Router URL sync
 */
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CLASS_ORDER, DEFAULT_IMAGE, getPortalSettings } from '../config/systemConfig';
import {
  canCreateStudent,
  canDeleteStudent,
  canEditStudent,
  findSiblings,
  getDaysUntilBirthday,
  toServerPayload,
  toUiStudents,
  toUiUser
} from '../models/studentModel';
import { extractFieldErrors } from '../services/apiErrors';
import {
  clearAuthSessionStorage,
  extractApiErrorMessage,
  getStoredAuthToken,
  getStoredAuthUser
} from '../services/axiosClient';
import { uploadSquarePhotoToCloudinary } from '../services/cloudinaryClient';
import { authApi, studentApi, systemSettingsApi } from '../services/studentApiService';
import { createExportController } from './exportController';

const STUDENTS_CACHE_KEY = 'ardm_students_cache_v2';

export default function useStudentController() {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId } = useParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [portalSettings, setPortalSettings] = useState(() => getPortalSettings());
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewerImg, setViewerImg] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [advancedFilteredData, setAdvancedFilteredData] = useState(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [showAllExports, setShowAllExports] = useState(false);
  const [scrollPos, setScrollPos] = useState(0);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const [contactProgress, setContactProgress] = useState({ show: false, current: 0, total: 0, name: '' });

  const [sortConfig, setSortConfig] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sortConfig")) || { field: '', order: '' }; }
    catch { return { field: '', order: '' }; }
  });

  const [classFilter, setClassFilter] = useState('All');

  // URL পাথ থেকে স্বয়ংক্রিয়ভাবে বর্তমান ভিউ (tab, isEdit, detailData) নির্ধারণ
  const pathname = location.pathname;
  const isEdit = pathname.includes('/edit') && Boolean(studentId);
  const tab = useMemo(() => {
    if (pathname === '/profile') return 'profile';
    if (pathname === '/promote') return 'promote';
    if (pathname === '/search') return 'search';
    if (pathname.startsWith('/admission') || isEdit) return 'add';
    return 'home';
  }, [pathname, isEdit]);

  const detailData = useMemo(() => {
    if (!studentId || students.length === 0) return null;
    return students.find((s) => String(s.ID) === String(studentId) || String(s._id) === String(studentId)) || null;
  }, [studentId, students]);

  useEffect(() => {
    setAdvancedFilteredData(null);
  }, [students]);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "Class" && currentUser.classBn) {
        setClassFilter(currentUser.classBn);
      } else {
        setClassFilter(localStorage.getItem("classFilter") || 'All');
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (classFilter) localStorage.setItem("classFilter", classFilter);
  }, [classFilter]);

  useEffect(() => {
    localStorage.setItem("sortConfig", JSON.stringify(sortConfig));
  }, [sortConfig]);

  // 1. ERP SESSION CHECK ON BOOT
  useEffect(() => {
    try { localStorage.removeItem('cachedStudents'); } catch (e) {}

    let cancelled = false;
    const token = getStoredAuthToken();
    if (!token) {
      setCurrentUser(null);
      setAuthLoading(false);
      return undefined;
    }

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
          if (!err?.response && stored) return;
          setCurrentUser(null);
        } else {
          clearAuthSessionStorage();
          setCurrentUser(null);
          alert(err.message || extractApiErrorMessage(err));
        }
      })
      .finally(() => { if (!cancelled) setAuthLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // সার্ভার থেকে ডায়নামিক সিস্টেম সেটিংস সিঙ্ক রাখা
  useEffect(() => {
    if (!currentUser) return undefined;
    let cancelled = false;
    systemSettingsApi
      .getSettings()
      .then(() => {
        if (!cancelled) setPortalSettings(getPortalSettings());
      })
      .catch(() => {
        if (!cancelled) setPortalSettings(getPortalSettings());
      });
    return () => { cancelled = true; };
  }, [currentUser?._id, pathname]);

  const login = async (identifier, password) => {
    try {
      const { user } = await authApi.login(identifier, password);
      setCurrentUser(toUiUser(user));
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        status: err?.response?.status,
        retryAfterSeconds: Number(err?.response?.data?.meta?.retryAfterSeconds) || 0,
        message: extractApiErrorMessage(err, 'লগিন ব্যর্থ হয়েছে')
      };
    }
  };

  const handleLogout = async () => {
    if (window.confirm("আপনি কি লগআউট করতে চান?")) {
      await authApi.logout();
      setCurrentUser(null);
      setStudents([]);
      navigate('/', { replace: true });
    }
  };

  // 2. LOAD DATA ON LOGIN
  const loadData = async (showLoader = true) => {
    setIsSyncing(true);

    let cachedData = null;
    try { cachedData = localStorage.getItem(STUDENTS_CACHE_KEY); } catch (e) {}

    if (cachedData && students.length === 0) {
      try { setStudents(JSON.parse(cachedData)); } catch (e) {}
    }

    if (!cachedData && showLoader) {
      setLoading(true);
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
      setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (currentUser) loadData(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?._id, currentUser?.teacherCode]);

  // হোম পেজে ফিরলে আগের স্ক্রল পজিশন রিস্টোর করা
  useEffect(() => {
    if (pathname === '/') {
      window.scrollTo({ top: scrollPos, behavior: "instant" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);

  const roleFilteredStudents = useMemo(() => {
    if (!currentUser) return [];
    return students;
  }, [students, currentUser]);

  useEffect(() => {
    if (tab !== 'search') {
      setSearchText('');
    }
  }, [tab]);

  // মডাল খোলা থাকলে মোবাইলের ব্যাক বাটনে মডাল বন্ধ হবে
  useEffect(() => {
    const handleModalBack = () => {
      if (viewerImg) { setViewerImg(null); return; }
      if (isPdfModalOpen) { setIsPdfModalOpen(false); return; }
      if (isFilterOpen) { setIsFilterOpen(false); return; }
    };
    window.addEventListener("popstate", handleModalBack);
    return () => window.removeEventListener("popstate", handleModalBack);
  }, [isFilterOpen, viewerImg, isPdfModalOpen]);

  // 3. CREATE / UPDATE (Dynamic RBAC enforced)
  const handleSave = async (formData, extra = {}) => {
    if (isEdit) {
      if (!canEditStudent(currentUser, detailData, portalSettings)) {
        showToast("আপনার এই শিক্ষার্থীর তথ্য পরিবর্তন করার অনুমতি নেই", "error");
        return { ok: false };
      }
      if (formData.classBn && !canEditStudent(currentUser, { ClassBn: formData.classBn }, portalSettings)) {
        showToast("নির্বাচিত শ্রেণিতে তথ্য পরিবর্তন করার অনুমতি আপনার নেই", "error");
        return { ok: false };
      }
    } else {
      if (!canCreateStudent(currentUser, formData.classBn || null, portalSettings)) {
        showToast("নির্বাচিত শ্রেণিতে নতুন শিক্ষার্থী ভর্তি করার অনুমতি আপনার নেই", "error");
        return { ok: false };
      }
    }

    const exists = students.find(s =>
      s.ClassBn === formData.classBn &&
      String(s.Session) === String(formData.sessionYear) &&
      String(s.Roll) === String(formData.roll) &&
      s.ID !== (isEdit ? detailData?.ID : null) &&
      s.Status !== 'Deleted'
    );
    if (exists) {
      showToast("এই ক্লাসে এই রোল নম্বর আগে থেকেই আছে!", "error");
      return { ok: false, fieldErrors: [{ field: 'roll', message: `'${exists.StudentNameBn}'-এর রোল ইতিমধ্যে ${formData.roll}` }] };
    }

    setProcessing(true);

    try {
      let imgUrl = formData.imageUrl || DEFAULT_IMAGE;
      let publicId;

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
        localStorage.removeItem("ardm_admission_draft_v2");
      }
      await loadData(false);
      showToast(result.message || "সফল হয়েছে", "success");

      // এডিট হলে ওই শিক্ষার্থীর ডিটেইল পেজে, আর নতুন হলে হোম পেজে নিয়ে যাবে
      if (isEdit && detailData?.ID) {
        navigate(`/students/${detailData.ID}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
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

  // 4. SOFT DELETE (Dynamic RBAC enforced)
  const handleDelete = async (id) => {
    const target = students.find(s => s.ID === id) || detailData;
    if (!canDeleteStudent(currentUser, target, portalSettings)) {
      showToast("আপনার এই শিক্ষার্থীর ডাটা ডিলিট করার অনুমতি নেই", "error");
      return;
    }

    if (!window.confirm("আপনি কি নিশ্চিত এই ডাটা ডিলিট করতে চান?")) return;

    setProcessing(true);
    try {
      const result = await studentApi.remove(target._id, 'পোর্টাল থেকে ডিলিট করা হয়েছে');
      setStudents(prev => prev.filter(s => s.ID !== id));
      showToast(result.message || "ডিলিট সফল হয়েছে", "success");
      navigate('/', { replace: true });
      loadData(false);
    } catch (error) {
      showToast(extractApiErrorMessage(error, "ডিলিট করা যায়নি"), "error");
    } finally {
      setProcessing(false);
    }
  };

  // 5. SIBLINGS + FILTER / SORT
  const siblingsOfDetail = useMemo(
    () => findSiblings(roleFilteredStudents, detailData),
    [detailData, roleFilteredStudents]
  );

  const filteredList = useMemo(() => {
    let list = advancedFilteredData !== null ? advancedFilteredData : roleFilteredStudents;

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

    if (classFilter !== 'All') {
      list = list.filter(s => s.ClassBn === classFilter);
    }

    const { field, order } = sortConfig;
    if (field === 'family') {
      const clean = (name) =>
        (name || '')
          .replace(/মোঃ|মো\.?|মোহাম্মদ|মুহাম্মদ|md\.?|MD\.?/gi, '')
          .replace(/\s+/g, ' ')
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
            const key = fatherA || motherA || phoneA;
            familyKey[a.ID] = key;
            familyKey[b.ID] = key;
          }
        }
      }

      list = result.filter((v, i, a) => a.indexOf(v) === i);
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
            ? (CLASS_ORDER[a.ClassBn] || 0) - (CLASS_ORDER[b.ClassBn] || 0)
            : (CLASS_ORDER[b.ClassBn] || 0) - (CLASS_ORDER[a.ClassBn] || 0);
        if (classDiff !== 0) return classDiff;
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
        if (dA === null) return 1;
        if (dB === null) return -1;
        return dA - dB;
      });
    }
    return list;
  }, [roleFilteredStudents, searchText, sortConfig, classFilter, currentUser, advancedFilteredData]);

  // 6. EXPORTS
  const exportsApi = createExportController({ filteredList, currentUser, showToast, setContactProgress, portalSettings });

  return {
    currentUser, authLoading, portalSettings, login, handleLogout,
    students, loading, processing, isSyncing, loadData,
    tab, detailData, isEdit, studentId,
    searchText, setSearchText, classFilter, setClassFilter, sortConfig, setSortConfig,
    isFilterOpen, setIsFilterOpen, advancedFilteredData, setAdvancedFilteredData,
    isPdfModalOpen, setIsPdfModalOpen, showAllExports, setShowAllExports,
    viewerImg, setViewerImg, scrollPos, setScrollPos,
    toast, setToast, showToast, contactProgress,
    filteredList, siblingsOfDetail,
    handleSave, handleDelete,
    ...exportsApi
  };
}