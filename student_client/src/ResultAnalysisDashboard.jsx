import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BarChart3, Users, CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus,
  Search, Printer, Filter, BookOpen, Award, AlertCircle,
  PieChart, User, UserX, ShieldAlert, GraduationCap, Layers, Trophy,
  Calendar, Loader2, ArrowUpRight, ArrowUpDown, Download, Info
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import ResultReportPrint from './ResultReportPrint';

// FIREBASE IMPORTS
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ==============================================
// 1. FIREBASE & CONFIGURATION
// ==============================================
const firebaseConfig = {
  apiKey: "AIzaSyCrmkkxixxtiLON5JGqSU3Rsx5WVgQaUDw",
  authDomain: "central-pod-376117.firebaseapp.com",
  projectId: "central-pod-376117",
  storageBucket: "central-pod-376117.firebasestorage.app",
  messagingSenderId: "1003594162237",
  appId: "1:1003594162237:web:c7b377ab71e90c102d0a54",
  measurementId: "G-QETBDY6355"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const USER_ROLES = { "admin@ardm.com": { role: "Admin" } };
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoQM0Xf5SrusbRuCwe4b3s92rK7e014DYkgiuM3yOLs9KKZ773MUkmysrM3PcxyCbpbw/exec';
const ADMIN_SECRET = "ARDM_DELETE_2026";

// ==============================================
// 2. HELPERS & CONSTANTS
// ==============================================
const toBnNum = (num) => {
  if (num === undefined || num === null || isNaN(num)) return num;
  return String(num).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
};

const CLASS_HIERARCHY = ['Play', 'Nursery', 'KG', 'Class One', 'Class Two', 'Class Three', 'Class Four', 'Class Five', 'Class Six', 'Class Seven', 'Class Eight', 'Class Nine', 'Class Ten'];

const EDU_LEVELS = {
  'Pre-Primary': ['Play', 'Nursery', 'KG'],
  'Ebtedayee': ['Class One', 'Class Two', 'Class Three', 'Class Four', 'Class Five'],
  'Dakhil': ['Class Six', 'Class Seven', 'Class Eight', 'Class Nine', 'Class Ten']
};
const EDU_LEVEL_LABELS = { 'Pre-Primary': 'প্রাক-প্রাথমিক', 'Ebtedayee': 'ইবতেদায়ী', 'Dakhil': 'দাখিল', 'Other': 'অন্যান্য' };
const getEduLevel = (className) => {
  for (const [lvl, list] of Object.entries(EDU_LEVELS)) { if (list.includes(className)) return lvl; }
  return 'Other';
};

const parseSheetName = (name) => {
  const parts = String(name).split('][').map(s => s.replace('[', '').replace(']', ''));
  return { className: parts[0] || 'অজানা', examName: parts[1] || 'অজানা', year: parts[2] || 'অজানা' };
};

const formatBnDateTime = (date) => {
  if (!date) return '';
  try {
    return date.toLocaleString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
  } catch (e) {
    return date.toLocaleString();
  }
};

// Fetch raw sheet payloads from the backend for a given list of sheet objects
async function fetchSheetsRaw(targetSheets) {
  const fetchPromises = targetSheets.map(async (sheetObj) => {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'search', sheetName: sheetObj.sheetName, key: ADMIN_SECRET })
    });
    const result = await response.json();
    return result.status === 'success' ? { sheetInfo: parseSheetName(sheetObj.sheetName), data: result.data } : null;
  });
  return (await Promise.all(fetchPromises)).filter(Boolean);
}

// Pure transform: raw sheet rows -> unified student records
function parseStudentsFromSheets(sheetsData) {
  let allStudents = [];

  sheetsData.forEach(({ sheetInfo, data }) => {
    if (!data || data.length < 2) return;
    const headersLower = data[0].map(h => String(h).toLowerCase().trim());
    const originalHeaders = data[0];

    const idIdx = headersLower.findIndex(h => h.includes('id') && !h.includes('name'));
    const nameBnIdx = headersLower.findIndex(h => h.includes('namebn'));
const nameEnIdx = headersLower.findIndex(h => h === 'name' || h.includes('nameen'));

    const rollIdx = headersLower.findIndex(h => h.includes('roll'));
    const gpaIdx = headersLower.findIndex(h => h === 'gpa');
    const avgIdx = headersLower.findIndex(h => h.includes('average') || h.includes('avg'));
    const totalIdx = headersLower.findIndex(h => h.includes('total') || h === 'total marks');
    const statusIdx = headersLower.findIndex(h => h === 'status');
    const genderIdx = headersLower.findIndex(h => h === 'gender' || h === 'sex');
    const sectionIdx = headersLower.findIndex(h => h === 'section');

    // Dynamically find Subject Columns looking for [FullMarks] e.g. "ICT [50]"
    const subjectColumns = [];
    originalHeaders.forEach((headerText, idx) => {
      const hStr = String(headerText).trim();
      const match = hStr.match(/(.*?)\s*\[(\d+)\]/);
      if (match) {
        subjectColumns.push({ index: idx, name: match[1].trim(), fullMarks: parseInt(match[2], 10) });
      }
    });

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] && !row[1] && !row[2]) continue; // Skip empty rows

      const status = String(row[statusIdx] || '').toLowerCase();
      const gpa = parseFloat(row[gpaIdx]) || 0;
      const avg = parseFloat(row[avgIdx]) || 0;
      let total = parseFloat(row[totalIdx]) || 0;
      const isPassed = status.includes('pass') || status === 'pass' || status === '-';

      let overallGrade = 'F';
      if (isPassed) {
        if (gpa >= 5.0) overallGrade = 'A+';
        else if (gpa >= 4.0) overallGrade = 'A';
        else if (gpa >= 3.5) overallGrade = 'A-';
        else if (gpa >= 3.0) overallGrade = 'B';
        else if (gpa >= 2.0) overallGrade = 'C';
        else if (gpa >= 1.0) overallGrade = 'D';
      }

      const student = {
        id: idIdx !== -1 ? row[idIdx] : `N/A-${i}`,
        name: nameBnIdx !== -1 && row[nameBnIdx] ? row[nameBnIdx] : (nameEnIdx !== -1 ? row[nameEnIdx] : 'Unknown'), // ড্যাশবোর্ডের জন্য বাংলা
nameEn: nameEnIdx !== -1 && row[nameEnIdx] ? row[nameEnIdx] : 'Unknown', // প্রিন্টের জন্য ইংরেজি

        roll: rollIdx !== -1 ? row[rollIdx] : i,
        className: sheetInfo.className,
        section: sectionIdx !== -1 ? row[sectionIdx] : '-',
        gender: genderIdx !== -1 ? row[genderIdx] : 'Unknown',
        gpa: gpa,
        grade: overallGrade,
        averageMarks: avg,
        totalMarks: total,
        resultStatus: isPassed ? 'Passed' : 'Failed',
        subjects: [],
        failedCount: 0
      };

      let calculatedTotal = 0;
      subjectColumns.forEach(subInfo => {
        const marksStr = String(row[subInfo.index] || '').toLowerCase();
        const isAbsent = marksStr.includes('abs') || marksStr === 'a' || marksStr === '';
        const marks = parseFloat(row[subInfo.index]) || 0;
        calculatedTotal += marks;

        let subGrade = 'F'; let subGp = 0;
        if (!isAbsent && subInfo.fullMarks > 0) {
          const percentage = (marks / subInfo.fullMarks) * 100;
          if (percentage >= 80) { subGrade = 'A+'; subGp = 5.0; }
          else if (percentage >= 70) { subGrade = 'A'; subGp = 4.0; }
          else if (percentage >= 60) { subGrade = 'A-'; subGp = 3.5; }
          else if (percentage >= 50) { subGrade = 'B'; subGp = 3.0; }
          else if (percentage >= 40) { subGrade = 'C'; subGp = 2.0; }
          else if (percentage >= 33) { subGrade = 'D'; subGp = 1.0; }
        }

        if (subGrade === 'F') student.failedCount++;

        student.subjects.push({
          name: subInfo.name,
          marks: isAbsent ? 0 : marks,
          status: isAbsent ? 'Absent' : (subGrade === 'F' ? 'Failed' : 'Passed'),
          grade: subGrade,
          gradePoint: subGp,
          fullMarks: subInfo.fullMarks
        });
      });

      if (totalIdx === -1) student.totalMarks = calculatedTotal;

      // Absent Logic: If total marks in all subjects is 0, consider as absent
      if (calculatedTotal === 0) {
        student.resultStatus = 'Absent';
        student.grade = 'F';
        student.gpa = 0;
        student.subjects.forEach(sub => { sub.status = 'Absent'; sub.grade = 'F'; sub.marks = 0; });
      }

      allStudents.push(student);
    }
  });

  return allStudents;
}

// Given the exam currently being viewed, resolve the "previous" exam reference for trend comparison
const getPreviousExamRef = (curExam, curYear) => {
  if (curExam === '2nd Terminal') return { examName: '1st Terminal', year: curYear };
  if (curExam === 'Annual') return { examName: '2nd Terminal', year: curYear };
  if (curExam === '1st Terminal') return { examName: 'Annual', year: String(Number(curYear) - 1) };
  return null;
};

// ==========================================
// 3. MAIN DASHBOARD COMPONENT
// ==========================================
export default function ResultAnalysisDashboard() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Data Fetching States
  const [publishedExams, setPublishedExams] = useState([]);
  const [isFetchingExams, setIsFetchingExams] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false); // নতুন লাইন

  // Form States
  const [examName, setExamName] = useState('1st Terminal');
  const [year, setYear] = useState('2026');
  const [targetClass, setTargetClass] = useState('All');

  // Process States
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedAt, setGeneratedAt] = useState(null);

  // REAL DATA STATE (Unified Student Array)
  const [rawData, setRawData] = useState(null);
  const [previousStats, setPreviousStats] = useState(null);

  // UI Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [viewClass, setViewClass] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [meritLevel, setMeritLevel] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'roll', dir: 'asc' });
  const [showAllFollowup, setShowAllFollowup] = useState(false);
  const [showAllDirectory, setShowAllDirectory] = useState(false);
  const LIST_PREVIEW_COUNT = 10;
  const [showOfficialReport, setShowOfficialReport] = useState(false);
  const [historicalData, setHistoricalData] = useState([]); // নতুন লাইন

  // --- AUTH & INITIAL FETCH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && USER_ROLES[user.email]?.role === 'Admin') {
        setIsAdmin(true);
        fetchAllExams();
      } else {
        alert("শুধুমাত্র এডমিনদের এই পেজে এক্সেস রয়েছে।");
        navigate("/");
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchAllExams = async () => {
    setIsFetchingExams(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL + '?role=admin');
      const result = await response.json();
      if (result.status === 'success') {
        const validExams = (result.data || []).filter(sheet => String(sheet.sheetName).startsWith('['));
        setPublishedExams(validExams);
      }
    } catch (error) {
      console.error("Failed to fetch exam list", error);
    } finally {
      setIsFetchingExams(false);
    }
  };

  // Best-effort fetch of the previous exam for trend comparison. Never blocks the main flow.
  const fetchPreviousStats = async (cls, curExam, curYear, examsList) => {
    setPreviousStats(null);
    try {
      const ref = getPreviousExamRef(curExam, curYear);
      if (!ref) return;
      const prevSheets = examsList.filter(exam => {
        const info = parseSheetName(exam.sheetName);
        if (info.examName !== ref.examName || info.year !== ref.year) return false;
        if (cls !== 'All' && info.className !== cls) return false;
        return true;
      });
      if (prevSheets.length === 0) return;
      const sheetsData = await fetchSheetsRaw(prevSheets);
      if (sheetsData.length === 0) return;
      const students = parseStudentsFromSheets(sheetsData);
      if (students.length === 0) return;
      const passed = students.filter(s => s.resultStatus === 'Passed').length;
      const passRate = ((passed / students.length) * 100).toFixed(2);
      const gpas = students.filter(s => s.resultStatus === 'Passed').map(s => s.gpa);
      const avgGpa = gpas.length ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2) : '0.00';
      setPreviousStats({ examLabel: `${ref.examName} ${ref.year}`, passRate, avgGpa, total: students.length });
    } catch (e) {
      // Silent — trend comparison is a nice-to-have, never surfaced as an error.
    }
  };

  const fetchHistoricalData = async (cls, curYear, examsList) => {
    setIsFetchingHistory(true); // ডেটা লোড হওয়ার শুরুতে ট্রু
    setHistoricalData([]);
    try {
      // এখানে দুই ধরনের সিকুয়েন্সই কাভার করা হলো
      const terms = ['1st Terminal', '2nd Terminal', 'Half Yearly', 'Annual', 'Final Result'];
      const promises = terms.map(async (term) => {
        const termSheets = examsList.filter(exam => {
          const info = parseSheetName(exam.sheetName);
          if (info.examName !== term || info.year !== curYear) return false;
          if (cls !== 'All' && info.className !== cls) return false;
          return true;
        });
        if (termSheets.length === 0) return null;
        const sheetsData = await fetchSheetsRaw(termSheets);
        if (sheetsData.length === 0) return null;
        const students = parseStudentsFromSheets(sheetsData);
        if (students.length === 0) return null;
        
        const total = students.length;
        const passed = students.filter(s => s.resultStatus === 'Passed').length;
        const passRate = ((passed / total) * 100).toFixed(2);
        const gpas = students.filter(s => s.resultStatus === 'Passed').map(s => s.gpa);
        const avgGpa = gpas.length ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2) : '0.00';
        
        return { examName: term, total, passed, passRate, avgGpa };
      });
  
      const results = await Promise.all(promises);
      setHistoricalData(results.filter(Boolean));
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingHistory(false); // ডেটা লোড শেষে ফলস
    }
  };

  // --- CORE DATA PROCESSING ---
  const handleGenerateAnalysis = async () => {
    setErrorMessage('');
    setRawData(null);
    setPreviousStats(null);
    setSearchQuery('');
    setViewClass('All');
    setSortConfig({ key: 'roll', dir: 'asc' });
    setShowAllFollowup(false);
    setShowAllDirectory(false);
    setIsProcessing(true);

    try {
      const targetSheets = publishedExams.filter(exam => {
        const info = parseSheetName(exam.sheetName);
        if (info.examName !== examName || info.year !== year) return false;
        if (targetClass !== 'All' && info.className !== targetClass) return false;
        return true;
      });

      if (targetSheets.length === 0) throw new Error("এই প্যারামিটারে কোনো রেজাল্ট শিট সার্ভারে পাওয়া যায়নি।");

      const sheetsData = await fetchSheetsRaw(targetSheets);
      if (sheetsData.length === 0) throw new Error("ডাটাবেজ থেকে ডাটা পড়তে ব্যর্থ হয়েছে।");

      const allStudents = parseStudentsFromSheets(sheetsData);
      setRawData({ examInfo: { examName, year }, students: allStudents });
      setGeneratedAt(new Date());

      // Fire-and-forget trend comparison against the previous exam
      fetchPreviousStats(targetClass, examName, year, publishedExams);
      fetchHistoricalData(targetClass, year, publishedExams); // নতুন লাইন

    } catch (err) {
      setErrorMessage(err.message || "সার্ভারে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseReport = () => {
    setRawData(null);
    setPreviousStats(null);
    setSearchQuery('');
    setViewClass('All');
    setMeritLevel('All');
    setGeneratedAt(null);
    setShowAllFollowup(false);
    setShowAllDirectory(false);
  };

  const handleExportCSV = () => {
    if (!rawData) return;
    const headers = ['ID', 'Name', 'Roll', 'Class', 'Section', 'Gender', 'GPA', 'Grade', 'Total Marks', 'Status'];
    const rows = filteredStudents.map(s => [s.id, s.name, s.roll, s.className, s.section, s.gender, s.gpa.toFixed(2), s.grade, s.totalMarks, s.resultStatus]);
    const csvContent = [headers, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const clsTag = viewClass !== 'All' ? `_${viewClass}` : '';
    link.download = `ARDM_Result_${examName}_${year}${clsTag}.csv`.replace(/\s+/g, '-');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- LONG-PRESS TO COPY STUDENT IDs ---
  const [copyToast, setCopyToast] = useState(null);
  const pressTimerRef = useRef(null);

  useEffect(() => {
    if (!copyToast) return;
    const t = setTimeout(() => setCopyToast(null), 2400);
    return () => clearTimeout(t);
  }, [copyToast]);

  const copyIdsToClipboard = (students, label) => {
    if (!students || students.length === 0) return;
    const ids = students.map(s => s.id).join(', ');
    const showResult = (ok) => setCopyToast(ok ? `${label} — ${students.length} জনের আইডি কপি হয়েছে` : 'আইডি কপি করতে সমস্যা হয়েছে');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(ids).then(() => showResult(true)).catch(() => showResult(false));
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = ids;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showResult(true);
      } catch (e) {
        showResult(false);
      }
    }
  };

  const startLongPress = (students, label) => {
    clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => copyIdsToClipboard(students, label), 550);
  };
  const endLongPress = () => clearTimeout(pressTimerRef.current);

  // ==========================================
  // 4. DYNAMIC CALCULATIONS for UI
  // ==========================================
  const availableClasses = useMemo(() => {
    if (!rawData) return [];
    return [...new Set(rawData.students.map(s => s.className))].sort((a, b) => CLASS_HIERARCHY.indexOf(a) - CLASS_HIERARCHY.indexOf(b));
  }, [rawData]);

  const filteredStudents = useMemo(() => {
    if (!rawData) return [];
    let list = rawData.students;
    if (viewClass !== 'All') list = list.filter(s => s.className === viewClass);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        String(s.name).toLowerCase().includes(q) ||
        String(s.id).toLowerCase().includes(q) ||
        String(s.roll).includes(q)
      );
    }
    return list;
  }, [rawData, viewClass, searchQuery]);

  const stats = useMemo(() => {
    if (!filteredStudents.length) return null;
    const total = filteredStudents.length;
    const absent = filteredStudents.filter(s => s.resultStatus === 'Absent').length;
    const present = total - absent;

    const passed = filteredStudents.filter(s => s.resultStatus === 'Passed').length;
    const failed = total - passed;

    const passRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;
    const failRate = total > 0 ? ((failed / total) * 100).toFixed(2) : 0;
    const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

    const validGpas = filteredStudents.filter(s => s.resultStatus === 'Passed').map(s => s.gpa);
    const avgGpa = validGpas.length > 0 ? (validGpas.reduce((a, b) => a + b, 0) / validGpas.length).toFixed(2) : '0.00';
    const maxGpa = validGpas.length > 0 ? Math.max(...validGpas).toFixed(2) : '0.00';
    const gpa5Count = validGpas.filter(g => g === 5.0).length;

    const validMarks = filteredStudents.filter(s => s.resultStatus !== 'Absent').map(s => s.totalMarks);
    const avgMarks = validMarks.length > 0 ? (validMarks.reduce((a, b) => a + b, 0) / validMarks.length).toFixed(2) : '0.00';

    let highestMarksStudent = null;
    filteredStudents.filter(s => s.resultStatus === 'Passed').forEach(s => {
      if (!highestMarksStudent || s.averageMarks > highestMarksStudent.averageMarks) highestMarksStudent = s;
    });

    const grades = { 'A+': 0, 'A': 0, 'A-': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    filteredStudents.forEach(s => {
      if (grades[s.grade] !== undefined) grades[s.grade]++;
      else if (s.resultStatus === 'Absent') grades['F']++;
    });

    return { total, present, absent, passed, failed, passRate, failRate, attendanceRate, avgGpa, maxGpa, gpa5Count, avgMarks, highestMarksStudent, grades };
  }, [filteredStudents]);

  const educationLevelStats = useMemo(() => {
    if (!rawData) return [];
    const map = {};
    rawData.students.forEach(s => {
      const lvl = getEduLevel(s.className);
      if (!map[lvl]) map[lvl] = [];
      map[lvl].push(s);
    });
    return Object.keys(map).map(lvl => {
      const list = map[lvl];
      const total = list.length;
      const passed = list.filter(s => s.resultStatus === 'Passed').length;
      const passRate = total ? ((passed / total) * 100).toFixed(2) : '0.00';
      const gpas = list.filter(s => s.resultStatus === 'Passed').map(s => s.gpa);
      const avgGpa = gpas.length ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2) : '0.00';
      return { level: lvl, label: EDU_LEVEL_LABELS[lvl] || lvl, total, passed, failed: total - passed, passRate, avgGpa };
    }).sort((a, b) => ['Pre-Primary', 'Ebtedayee', 'Dakhil', 'Other'].indexOf(a.level) - ['Pre-Primary', 'Ebtedayee', 'Dakhil', 'Other'].indexOf(b.level));
  }, [rawData]);

  const classAnalysis = useMemo(() => {
    if (!rawData) return [];
    const classMap = {};
    rawData.students.forEach(s => {
      if (!classMap[s.className]) classMap[s.className] = [];
      classMap[s.className].push(s);
    });

    return Object.keys(classMap).map(cls => {
      const clsStudents = classMap[cls];
      const total = clsStudents.length;
      const passed = clsStudents.filter(s => s.resultStatus === 'Passed').length;
      const failed = total - passed;
      const passRate = ((passed / total) * 100).toFixed(2);

      const passedGpas = clsStudents.filter(s => s.resultStatus === 'Passed').map(s => s.gpa);
      const avgGpa = passedGpas.length > 0 ? (passedGpas.reduce((a, b) => a + b, 0) / passedGpas.length).toFixed(2) : '0.00';
      const maxGpa = passedGpas.length > 0 ? Math.max(...passedGpas).toFixed(2) : '0.00';

      return { cls, total, passed, failed, passRate, avgGpa, maxGpa };
    }).sort((a, b) => CLASS_HIERARCHY.indexOf(a.cls) - CLASS_HIERARCHY.indexOf(b.cls));
  }, [rawData]);

  const classToppers = useMemo(() => {
    if (!rawData) return [];
    const map = {};
    rawData.students.forEach(s => {
      if (!map[s.className]) map[s.className] = [];
      map[s.className].push(s);
    });
    return Object.keys(map).map(cls => {
      const top3 = map[cls].filter(s => s.resultStatus === 'Passed')
        .sort((a, b) => b.gpa - a.gpa || b.totalMarks - a.totalMarks)
        .slice(0, 3);
      return { cls, top3 };
    }).filter(c => c.top3.length > 0)
      .sort((a, b) => CLASS_HIERARCHY.indexOf(a.cls) - CLASS_HIERARCHY.indexOf(b.cls));
  }, [rawData]);

  const sectionAnalysis = useMemo(() => {
    if (!filteredStudents.length) return [];
    const hasSections = filteredStudents.some(s => s.section && s.section !== '-');
    if (!hasSections) return [];
    const map = {};
    filteredStudents.forEach(s => {
      const key = `${s.className}__${s.section}`;
      if (!map[key]) map[key] = { className: s.className, section: s.section, students: [] };
      map[key].students.push(s);
    });
    return Object.values(map).map(({ className, section, students }) => {
      const total = students.length;
      const passed = students.filter(s => s.resultStatus === 'Passed').length;
      const passRate = total ? ((passed / total) * 100).toFixed(2) : '0.00';
      const gpas = students.filter(s => s.resultStatus === 'Passed').map(s => s.gpa);
      const avgGpa = gpas.length ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2) : '0.00';
      return { className, section, total, passed, failed: total - passed, passRate, avgGpa };
    }).sort((a, b) => CLASS_HIERARCHY.indexOf(a.className) - CLASS_HIERARCHY.indexOf(b.className) || String(a.section).localeCompare(String(b.section)));
  }, [filteredStudents]);

  const subjectAnalysis = useMemo(() => {
    if (!filteredStudents.length) return [];
    const subMap = {};
    filteredStudents.forEach(stu => {
      stu.subjects.forEach(sub => {
        if (!subMap[sub.name]) {
          subMap[sub.name] = { total: 0, present: 0, passed: 0, totalMarks: 0, fullMarks: sub.fullMarks, grades: { 'A+': 0, 'A': 0, 'A-': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 }, topper: null };
        }
        const d = subMap[sub.name];
        d.total++;
        if (sub.status !== 'Absent') {
          d.present++;
          if (sub.status === 'Passed') d.passed++;
          d.totalMarks += sub.marks;
          if (d.grades[sub.grade] !== undefined) d.grades[sub.grade]++;
          if (!d.topper || sub.marks > d.topper.marks) {
            d.topper = { name: stu.name, roll: stu.roll, className: stu.className, marks: sub.marks };
          }
        } else {
          d.grades['F']++;
        }
      });
    });

    return Object.keys(subMap).map(subName => {
      const d = subMap[subName];
      const failed = d.present - d.passed;
      const passRate = d.present > 0 ? ((d.passed / d.present) * 100).toFixed(2) : 0;
      const avgMarks = d.present > 0 ? (d.totalMarks / d.present).toFixed(2) : 0;
      return { sub: subName, ...d, failed, passRate, avgMarks };
    });
  }, [filteredStudents]);

  const topStudents = useMemo(() => {
    if (!filteredStudents.length) return [];
    let list = filteredStudents.filter(s => s.resultStatus === 'Passed');

    if (meritLevel === 'ClassOneToTen') list = list.filter(s => !EDU_LEVELS['Pre-Primary'].includes(s.className));
    else if (meritLevel === 'Pre-Primary') list = list.filter(s => EDU_LEVELS['Pre-Primary'].includes(s.className));
    else if (meritLevel === 'Ebtedayee') list = list.filter(s => EDU_LEVELS['Ebtedayee'].includes(s.className));
    else if (meritLevel === 'Dakhil') list = list.filter(s => EDU_LEVELS['Dakhil'].includes(s.className));

    return list.sort((a, b) => b.gpa - a.gpa || b.averageMarks - a.averageMarks || (Number(a.roll) || 0) - (Number(b.roll) || 0)).slice(0, 20);
  }, [filteredStudents, meritLevel]);

  const multipleFailAnalysis = useMemo(() => {
    if (!filteredStudents.length) return { counts: {}, buckets: {} };
    const buckets = { 0: [], 1: [], 2: [], 3: [], 4: [], '5+': [], allSubjects: [] };
    filteredStudents.forEach(s => {
      if (s.resultStatus === 'Absent') {
        buckets['5+'].push(s);
      } else {
        if (s.failedCount === 0) buckets[0].push(s);
        else if (s.failedCount === 1) buckets[1].push(s);
        else if (s.failedCount === 2) buckets[2].push(s);
        else if (s.failedCount === 3) buckets[3].push(s);
        else if (s.failedCount === 4) buckets[4].push(s);
        else buckets['5+'].push(s);
        if (s.subjects.length > 0 && s.failedCount === s.subjects.length) buckets.allSubjects.push(s);
      }
    });
    const counts = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length]));
    return { counts, buckets };
  }, [filteredStudents]);

  const riskAnalysis = useMemo(() => {
    if (!filteredStudents.length) return {};
    const cats = {
      excellent: { label: 'অতি উত্তম (GPA ৪.৫০-৫.০০)', students: [], color: 'bg-emerald-500' },
      good: { label: 'উত্তম (GPA ৩.৫০-৪.৪৯)', students: [], color: 'bg-blue-500' },
      average: { label: 'গড় (GPA ২.৫০-৩.৪৯)', students: [], color: 'bg-amber-500' },
      weak: { label: 'বিশেষ মনোযোগ প্রয়োজন (২.৫০ এর নিচে / ফেল)', students: [], color: 'bg-rose-500' }
    };
    filteredStudents.forEach(s => {
      if (s.resultStatus === 'Failed' || s.resultStatus === 'Absent') cats.weak.students.push(s);
      else if (s.gpa >= 4.5) cats.excellent.students.push(s);
      else if (s.gpa >= 3.5) cats.good.students.push(s);
      else if (s.gpa >= 2.5) cats.average.students.push(s);
      else cats.weak.students.push(s);
    });
    return cats;
  }, [filteredStudents]);

  const genderAnalysis = useMemo(() => {
    if (!filteredStudents.length) return [];
    const gMap = {};
    filteredStudents.forEach(s => {
      const gen = s.gender || 'Unknown';
      if (gen === 'Unknown' || gen === 'N/A') return;
      if (!gMap[gen]) gMap[gen] = [];
      gMap[gen].push(s);
    });

    return Object.keys(gMap).map(gen => {
      const stus = gMap[gen];
      const total = stus.length;
      const passed = stus.filter(s => s.resultStatus === 'Passed').length;
      const passedGpas = stus.filter(s => s.resultStatus === 'Passed').map(s => s.gpa);
      const passRate = ((passed / total) * 100).toFixed(2);
      const avgGpa = passedGpas.length > 0 ? (passedGpas.reduce((a, b) => a + b, 0) / passedGpas.length).toFixed(2) : '0.00';
      const gpa5 = passedGpas.filter(g => g === 5.0).length;
      return { gender: gen, total, passed, failed: total - passed, passRate, avgGpa, gpa5 };
    });
  }, [filteredStudents]);

  const absentees = useMemo(() => {
    if (!filteredStudents.length) return [];
    return filteredStudents.filter(s => s.resultStatus === 'Absent')
      .sort((a, b) => CLASS_HIERARCHY.indexOf(a.className) - CLASS_HIERARCHY.indexOf(b.className) || (Number(a.roll) || 0) - (Number(b.roll) || 0));
  }, [filteredStudents]);

  const atRiskList = useMemo(() => {
    if (!filteredStudents.length) return [];
    return filteredStudents.filter(s => s.resultStatus === 'Failed')
      .map(s => ({ ...s, failedSubjects: s.subjects.filter(sub => sub.status === 'Failed').map(sub => sub.name) }))
      .sort((a, b) => b.failedCount - a.failedCount || (Number(a.roll) || 0) - (Number(b.roll) || 0));
  }, [filteredStudents]);

  const sortedDirectory = useMemo(() => {
    const list = [...filteredStudents];
    const { key, dir } = sortConfig;
    list.sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === 'roll' || key === 'gpa' || key === 'totalMarks') {
        av = Number(av) || 0; bv = Number(bv) || 0;
        return dir === 'asc' ? av - bv : bv - av;
      }
      av = String(av); bv = String(bv);
      return dir === 'asc' ? av.localeCompare(bv, 'bn') : bv.localeCompare(av, 'bn');
    });
    return list;
  }, [filteredStudents, sortConfig]);

  const toggleSort = (key) => setSortConfig(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: 'smooth' });
  };

  const StatCard = ({ title, value, icon: Icon, iconBg, iconColor, subtitle, trend }) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-bold text-slate-500">{title}</h4>
        <div className={`p-2 rounded-lg ${iconBg} shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <h2 className="text-2xl font-black text-slate-800">{value}</h2>
        {subtitle && <span className="text-xs font-bold text-slate-400">{subtitle}</span>}
      </div>
      {trend && <div className="mt-1.5">{trend}</div>}
    </div>
  );

  const TrendBadge = ({ current, previous, suffix = '' }) => {
    const diff = parseFloat(current) - parseFloat(previous);
    if (isNaN(diff)) return null;
    if (Math.abs(diff) < 0.005) {
      return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400"><Minus className="w-3 h-3" /> আগের পরীক্ষার সমান</span>;
    }
    const up = diff > 0;
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-black ${up ? 'text-emerald-700' : 'text-rose-700'}`}>
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {toBnNum(Math.abs(diff).toFixed(2))}{suffix} {up ? 'বৃদ্ধি' : 'হ্রাস'}
      </span>
    );
  };

  const SortHeader = ({ label, sortKey, align = 'left' }) => (
    <th
      onClick={() => toggleSort(sortKey)}
      className={`px-4 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-[#8A6A24] transition-colors ${align === 'right' ? 'text-right' : ''}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === sortKey ? 'opacity-100 text-[#B08D3F]' : 'opacity-30'}`} />
      </span>
    </th>
  );

  const StatusBadge = ({ status }) => {
    const map = {
      Passed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Failed: 'bg-rose-50 text-rose-700 border-rose-200',
      Absent: 'bg-slate-100 text-slate-500 border-slate-200'
    };
    const label = { Passed: 'উত্তীর্ণ', Failed: 'অনুত্তীর্ণ', Absent: 'অনুপস্থিত' };
    return <span className={`inline-block px-2.5 py-1 text-[11px] font-black rounded-lg border ${map[status]}`}>{label[status]}</span>;
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="animate-spin text-[#0B1B33] mb-4" size={48} />
        <p className="text-slate-600 font-bold">অ্যাডমিন এক্সেস যাচাই করা হচ্ছে...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  if (showOfficialReport && rawData) {
    // প্রিন্ট ফাইলে পাঠানোর আগে স্টুডেন্টদের নাম ইংরেজিতে পরিবর্তন করে দেওয়া হচ্ছে
    const printStudents = rawData.students.map(s => ({
      ...s,
      name: s.nameEn && s.nameEn !== 'Unknown' ? s.nameEn : s.name
    }));

    return (
      <ResultReportPrint
        students={printStudents}
        examInfo={rawData.examInfo}
        historicalData={historicalData}
        onClose={() => setShowOfficialReport(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 pb-20 relative">

      {/* NEW: FULL SCREEN LOADING OVERLAY FOR MAIN FETCH */}
      {isProcessing && !rawData && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <Loader2 className="w-12 h-12 animate-spin text-white mb-4" />
          <h2 className="text-xl md:text-2xl font-black text-white">ডাটা প্রসেস করা হচ্ছে...</h2>
          <p className="text-sm font-bold text-slate-300 mt-2">অনুগ্রহ করে অপেক্ষা করুন</p>
        </div>
      )}

      {/* STICKY HEADER */}
      <header className="bg-[#0B1B33] border-b-2 border-[#B08D3F]/40 sticky top-0 z-40 shadow-lg shadow-black/10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center py-3.5 gap-3">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-11 h-11 bg-gradient-to-br from-[#C9A227] to-[#8A6A24] rounded-lg flex items-center justify-center shadow-md shrink-0">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <h1 className="text-[17px] font-black text-white tracking-tight font-serif-bn">আব্দুর রাজ্জাক দাখিল মাদ্রাসা</h1>
                <p className="text-[10.5px] font-bold text-[#D4B96A] uppercase tracking-widest mt-0.5">রেজাল্ট এনালাইসিস ও রিপোর্টিং সিস্টেম</p>
              </div>
            </div>

            {rawData && (
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 hide-scrollbar">
                <button onClick={() => scrollTo('overall')} className="px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 rounded-md whitespace-nowrap">সারসংক্ষেপ</button>
                <button onClick={() => scrollTo('trends')} className="px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 rounded-md whitespace-nowrap">ট্রেন্ড</button>
                <button onClick={() => scrollTo('classes')} className="px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 rounded-md whitespace-nowrap">শ্রেণি</button>
                <button onClick={() => scrollTo('subjects')} className="px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 rounded-md whitespace-nowrap">বিষয়</button>
                <button onClick={() => scrollTo('followup')} className="px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 rounded-md whitespace-nowrap">ফলোআপ</button>
                <button onClick={() => scrollTo('merit')} className="px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 rounded-md whitespace-nowrap">মেধা তালিকা</button>
                <button onClick={() => scrollTo('directory')} className="px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10 rounded-md whitespace-nowrap">সকল শিক্ষার্থী</button>
                <div className="w-px h-5 bg-white/15 mx-1 shrink-0" />
                <button onClick={() => setShowOfficialReport(true)} title="A4 অফিসিয়াল রিপোর্ট" className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap">
                  <BookOpen className="w-3.5 h-3.5" /> অফিসিয়াল রিপোর্ট
                </button>
                <button onClick={handleExportCSV} title="CSV ফরম্যাটে ডাউনলোড করুন" className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-gradient-to-r from-[#C9A227] to-[#8A6A24] hover:brightness-110 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-md transition-all whitespace-nowrap">
                  <Printer className="w-3.5 h-3.5" /> প্রিন্ট
                </button>
                <button onClick={handleCloseReport} className="px-2 py-2 text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 rounded-lg shrink-0">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* PRINT LETTERHEAD */}
      <div className="hidden print:block text-center mb-6 pb-4 border-b-2 border-[#0B1B33] pt-6">
        <h1 className="text-3xl font-black text-[#0B1B33] mb-1 font-serif-bn">আব্দুর রাজ্জাক দাখিল মাদ্রাসা</h1>
        <p className="text-xs font-bold text-slate-500 mb-1 tracking-wide">সরফাভাটা, রাঙ্গুনিয়া, চট্টগ্রাম</p>
        <h2 className="text-xl font-bold text-slate-700">ফলাফল বিশ্লেষণ প্রতিবেদন</h2>
        <p className="text-sm font-bold text-slate-500 mt-2">
          একাডেমিক বর্ষ: {toBnNum(rawData?.examInfo?.year)} | পরীক্ষা: {rawData?.examInfo?.examName}
          {viewClass !== 'All' ? ` | ক্লাস: ${viewClass}` : (targetClass !== 'All' ? ` | ক্লাস: ${targetClass}` : ' | সকল শ্রেণি')}
        </p>
        {generatedAt && <p className="text-[11px] font-bold text-slate-400 mt-1">প্রস্তুতকৃত তারিখ ও সময়: {formatBnDateTime(generatedAt)}</p>}
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* FILTER FORM */}
        {!rawData && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-[#B08D3F] max-w-4xl mx-auto animate-fade-in mt-10">
            <h2 className="text-2xl font-black text-slate-800 mb-2 font-serif-bn">ডেটাবেজ থেকে রিপোর্ট তৈরি করুন</h2>
            <p className="text-sm font-bold text-slate-500 mb-8">বছর, পরীক্ষা এবং ক্লাস অনুযায়ী রিয়েল ফায়ারবেস ডেটা থেকে সম্পূর্ণ বিশ্লেষণ জেনারেট করুন।</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 pl-1"><BookOpen className="w-3.5 h-3.5 inline mb-0.5" /> পরীক্ষা</label>
                <select value={examName} onChange={e => setExamName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-[#B08D3F] focus:bg-white transition-all">
                  <option value="1st Terminal">প্রথম সাময়িক পরিক্ষা</option>
                  <option value="2nd Terminal">দ্বিতীয় সাময়িক পরিক্ষা</option>
                  <option value="Annual">বার্ষিক পরীক্ষা</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 pl-1"><Calendar className="w-3.5 h-3.5 inline mb-0.5" /> সাল</label>
                <select value={year} onChange={e => setYear(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-[#B08D3F] focus:bg-white transition-all">
                  <option value="2025">2025</option><option value="2026">2026</option><option value="2027">2027</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 pl-1"><Users className="w-3.5 h-3.5 inline mb-0.5" /> ক্লাস ফিল্টার</label>
                <select value={targetClass} onChange={e => setTargetClass(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-[#B08D3F] focus:bg-white transition-all">
                  <option value="All">সকল ক্লাস (সম্পূর্ণ প্রতিষ্ঠান)</option>
                  {CLASS_HIERARCHY.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-bold flex gap-3 items-center animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" /> <p>{errorMessage}</p>
              </div>
            )}

            <button onClick={handleGenerateAnalysis} disabled={isProcessing || isFetchingExams} className="w-full bg-gradient-to-r from-[#0B1B33] to-[#1C3A63] hover:brightness-110 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all shadow-md shadow-slate-900/10">
              {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> ডাটা প্রসেস হচ্ছে, অপেক্ষা করুন...</> : <><PieChart className="w-5 h-5" /> এনালাইসিস রিপোর্ট জেনারেট করুন</>}
            </button>
          </div>
        )}

        {/* DASHBOARD UI */}
        {rawData && stats && (
          <div className="space-y-10 animate-fade-in">

            {/* FILTER BAR: Search + Class drill-down */}
            <div className="flex flex-col md:flex-row gap-3 print:hidden">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center flex-1">
                <Search className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
                <input
                  type="text"
                  placeholder="শিক্ষার্থীর নাম, রোল বা আইডি দিয়ে খুঁজুন..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-none outline-none px-3 text-sm font-bold text-slate-700"
                />
              </div>
              {availableClasses.length > 1 && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 md:w-64">
                  <Layers className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
                  <select value={viewClass} onChange={(e) => setViewClass(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-700 cursor-pointer">
                    <option value="All">সব শ্রেণি একত্রে দেখুন</option>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>

            {previousStats && (
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2.5 w-fit shadow-sm">
                <Info className="w-3.5 h-3.5 text-[#B08D3F] shrink-0" /> তুলনা করা হয়েছে <span className="text-slate-700">{previousStats.examLabel}</span> পরীক্ষার সাথে ({toBnNum(previousStats.total)} জন)
              </div>
            )}

            {/* SECTION 1: OVERALL SUMMARY */}
            <section id="overall" className="space-y-5">
              <h3 className="text-lg font-black text-slate-800 border-l-4 border-[#B08D3F] pl-3 leading-none font-serif-bn">০১. সার্বিক ফলাফল সারসংক্ষেপ</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <StatCard title="মোট পরীক্ষার্থী" value={toBnNum(stats.total)} icon={Users} iconBg="bg-[#0B1B33]/10" iconColor="text-[#0B1B33]" />
                <StatCard title="উপস্থিত" value={toBnNum(stats.present)} icon={CheckCircle2} iconBg="bg-emerald-500/10" iconColor="text-emerald-600" subtitle={`${toBnNum(stats.attendanceRate)}%`} />
                <StatCard title="উত্তীর্ণ" value={toBnNum(stats.passed)} icon={TrendingUp} iconBg="bg-emerald-700/10" iconColor="text-emerald-700" />
                <StatCard title="অনুত্তীর্ণ" value={toBnNum(stats.failed)} icon={XCircle} iconBg="bg-rose-600/10" iconColor="text-rose-600" />
                <StatCard
                  title="পাসের হার" value={`${toBnNum(stats.passRate)}%`} icon={PieChart} iconBg="bg-teal-600/10" iconColor="text-teal-600"
                  trend={previousStats && <TrendBadge current={stats.passRate} previous={previousStats.passRate} suffix="%" />}
                />
                <StatCard
                  title="গড় GPA" value={toBnNum(stats.avgGpa)} icon={Award} iconBg="bg-[#B08D3F]/10" iconColor="text-[#8A6A24]" subtitle="/ ৫.০০"
                  trend={previousStats && <TrendBadge current={stats.avgGpa} previous={previousStats.avgGpa} />}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
                  <h4 className="text-sm font-black text-slate-600 mb-2 uppercase tracking-wider">গ্রেড ডিস্ট্রিবিউশন</h4>
                  <div className="flex gap-2 items-end justify-between px-2 w-full mt-auto" style={{ height: '180px' }}>
                    {Object.entries(stats.grades).map(([grade, count]) => {
                      const max = Math.max(...Object.values(stats.grades), 1);
                      const heightPct = count > 0 ? (count / max) * 100 : 0;
                      const isFail = grade === 'F';
                      return (
                        <div key={grade} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                          <span className="text-xs font-bold text-slate-500 mb-2 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-100 px-2 py-1 rounded shadow-sm">{toBnNum(count)}</span>
                          <div
                            className={`w-full max-w-[40px] rounded-t-lg transition-all duration-700 ${isFail ? 'bg-rose-400' : 'bg-[#0B1B33]'}`}
                            style={{ height: count > 0 ? `${heightPct}%` : '4px', minHeight: '4px' }}
                          ></div>
                          <span className={`text-sm font-black mt-2 ${isFail ? 'text-rose-600' : 'text-slate-700'}`}>{grade}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-7 pt-6 border-t border-slate-100 space-y-3.5">
                    {Object.entries(stats.grades).map(([grade, count]) => {
                      const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                      const gradeStyles = {
                        'A+': { bar: 'bg-gradient-to-r from-[#D4B96A] to-[#8A6A24]', chip: 'bg-[#F4EBD5] text-[#8A6A24]' },
                        'A': { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700' },
                        'A-': { bar: 'bg-teal-500', chip: 'bg-teal-50 text-teal-700' },
                        'B': { bar: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700' },
                        'C': { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700' },
                        'D': { bar: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700' },
                        'F': { bar: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700' }
                      };
                      const st = gradeStyles[grade] || gradeStyles['F'];
                      return (
                        <div key={grade} className="flex items-center gap-3">
                          <span className={`w-11 shrink-0 text-center text-xs font-black py-1.5 rounded-lg ${st.chip}`}>{grade}</span>
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${st.bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="w-16 shrink-0 text-right text-xs font-black text-slate-700">{toBnNum(count)} জন</span>
                          <span className="w-12 shrink-0 text-right text-[11px] font-bold text-slate-400">{toBnNum(pct.toFixed(1))}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h4 className="text-sm font-black text-slate-600 mb-2 uppercase tracking-wider">কী হাইলাইটস</h4>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">সর্বোচ্চ GPA</span>
                    <span className="text-lg font-black text-[#8A6A24]">{toBnNum(stats.maxGpa)}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-slate-600 block">সর্বোচ্চ গড় নম্বর</span>
                      {stats.highestMarksStudent && <span className="text-[11px] font-bold text-slate-400 truncate block">{stats.highestMarksStudent.name}</span>}
                    </div>
                    <span className="text-lg font-black text-emerald-600 shrink-0">{stats.highestMarksStudent ? toBnNum(stats.highestMarksStudent.averageMarks.toFixed(2)) : toBnNum('0.00')}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-600">GPA ৫.০০ প্রাপ্ত</span>
                    <span className="text-lg font-black text-[#0B1B33]">{toBnNum(stats.gpa5Count)} জন</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-emerald-700">পাসের হার</span>
                    <span className="text-lg font-black text-emerald-700">{toBnNum(stats.passRate)}%</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-rose-700">ফেল করার হার</span>
                    <span className="text-lg font-black text-rose-700">{toBnNum(stats.failRate)}%</span>
                  </div>
                  <div className="pt-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                      <span>উপস্থিতির হার</span>
                      <span>{toBnNum(stats.attendanceRate)}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-100">
                      <div className="h-full bg-emerald-500" style={{ width: `${stats.attendanceRate}%` }}></div>
                      <div className="h-full bg-rose-300" style={{ width: `${100 - stats.attendanceRate}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                      <span>উপস্থিত {toBnNum(stats.present)}</span>
                      <span>অনুপস্থিত {toBnNum(stats.absent)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* NEW SECTION 1.5: COMPARATIVE TREND */}
            {(historicalData.length > 1 || isFetchingHistory) && (
              <section id="trends" className="space-y-5 pt-4">
                 <h3 className="text-lg font-black text-slate-800 border-l-4 border-indigo-500 pl-3 leading-none font-serif-bn">Comparative Performance Trend (Exam-to-Exam)</h3>
                 <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[140px] flex flex-col justify-center">
                    {isFetchingHistory ? (
                       <div className="flex flex-col items-center justify-center text-slate-400 gap-3 py-4">
                          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                          <span className="text-sm font-bold">পূর্ববর্তী পরীক্ষার ডাটা লোড হচ্ছে...</span>
                       </div>
                    ) : (
                       <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full overflow-x-auto hide-scrollbar">
                         {historicalData.map((data, idx) => {
                            const termNames = {
                              '1st Terminal': '১ম সাময়িক',
                              '2nd Terminal': '২য় সাময়িক',
                              'Half Yearly': 'অর্ধ-বার্ষিক',
                              'Annual': 'বার্ষিক',
                              'Final Result': 'ফাইনাল রেজাল্ট'
                            };
                            return (
                               <React.Fragment key={idx}>
                                 <div className="flex flex-col items-center min-w-[150px] bg-slate-50 border border-slate-100 p-5 rounded-xl shadow-sm relative">
                                   <div className="text-[11px] font-black text-indigo-600 mb-3 uppercase tracking-wide bg-indigo-100/50 px-3 py-1 rounded-lg border border-indigo-200">{termNames[data.examName] || data.examName}</div>
                                   <div className="text-2xl font-black text-slate-800 leading-none">{toBnNum(data.passRate)}%</div>
                                   <div className="text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-widest">পাসের হার</div>
                                   <div className="w-full h-px bg-slate-200 my-3"></div>
                                   <div className="text-xl font-black text-[#8A6A24] leading-none">{toBnNum(data.avgGpa)}</div>
                                   <div className="text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-widest">গড় GPA</div>
                                 </div>
                                 {idx < historicalData.length - 1 && (
                                   <div className="hidden md:flex flex-col items-center shrink-0">
                                     <ArrowUpRight className="w-6 h-6 text-slate-300" />
                                   </div>
                                 )}
                               </React.Fragment>
                            );
                         })}
                       </div>
                    )}
                 </div>
              </section>
            )}

            {/* SECTION: EDUCATION LEVEL BREAKDOWN */}
            {educationLevelStats.length > 1 && (
              <section id="levels" className="space-y-5">
                <h3 className="text-lg font-black text-slate-800 border-l-4 border-[#B08D3F] pl-3 leading-none font-serif-bn">০২. শিক্ষাস্তরভিত্তিক সারসংক্ষেপ</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {educationLevelStats.map((lvl, idx) => (
                    <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-[#0B1B33]/10"><GraduationCap className="w-5 h-5 text-[#0B1B33]" /></div>
                        <h4 className="font-black text-slate-800">{lvl.label}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><div className="text-slate-400 font-bold text-xs">মোট শিক্ষার্থী</div><div className="font-black text-slate-800 text-lg">{toBnNum(lvl.total)}</div></div>
                        <div><div className="text-slate-400 font-bold text-xs">পাসের হার</div><div className="font-black text-teal-600 text-lg">{toBnNum(lvl.passRate)}%</div></div>
                        <div><div className="text-slate-400 font-bold text-xs">উত্তীর্ণ</div><div className="font-black text-emerald-600 text-lg">{toBnNum(lvl.passed)}</div></div>
                        <div><div className="text-slate-400 font-bold text-xs">গড় GPA</div><div className="font-black text-[#8A6A24] text-lg">{toBnNum(lvl.avgGpa)}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION: CLASS-WISE ANALYSIS + TOPPERS */}
            <section id="classes" className="space-y-5">
              <h3 className="text-lg font-black text-slate-800 border-l-4 border-[#0B1B33] pl-3 leading-none font-serif-bn">{educationLevelStats.length > 1 ? '০৩' : '০২'}. শ্রেণিভিত্তিক বিশ্লেষণ</h3>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">ক্লাস</th>
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">শিক্ষার্থী</th>
                      <th className="px-5 py-3.5 text-xs font-black text-emerald-600 uppercase tracking-wide">পাস</th>
                      <th className="px-5 py-3.5 text-xs font-black text-rose-500 uppercase tracking-wide">ফেল</th>
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">পাসের হার</th>
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">গড় GPA</th>
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">সর্বোচ্চ GPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classAnalysis.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-black text-slate-800">{row.cls}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-600">{toBnNum(row.total)}</td>
                        <td className="px-5 py-3.5 font-black text-emerald-600">{toBnNum(row.passed)}</td>
                        <td className="px-5 py-3.5 font-black text-rose-500">{toBnNum(row.failed)}</td>
                        <td className="px-5 py-3.5 font-black text-slate-800">
                          <div className="flex items-center gap-2">
                            {toBnNum(row.passRate)}%
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block"><div className="h-full bg-emerald-500" style={{ width: `${row.passRate}%` }}></div></div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-600">{toBnNum(row.avgGpa)}</td>
                        <td className="px-5 py-3.5 font-black text-[#8A6A24]">{toBnNum(row.maxGpa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {classToppers.length > 1 && (
                <div>
                  <h4 className="text-sm font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-[#B08D3F]" /> শ্রেণিভিত্তিক শীর্ষ শিক্ষার্থী</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classToppers.map(({ cls, top3 }, idx) => (
                      <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{cls}</div>
                        <div className="space-y-2">
                          {top3.map((s, i) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-black border ${i === 0 ? 'bg-[#F4EBD5] text-[#8A6A24] border-[#B08D3F]/40' : i === 1 ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>{toBnNum(i + 1)}</span>
                                <span className="text-sm font-bold text-slate-700 truncate">{s.name}</span>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs font-black text-[#8A6A24]">{toBnNum(s.gpa.toFixed(2))}</div>
                                <div className="text-[10px] font-bold text-slate-400">{toBnNum(s.totalMarks)} নম্বর</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* SECTION: SECTION-WISE ANALYSIS */}
            {sectionAnalysis.length > 0 && (
              <section id="sections" className="space-y-5">
                <h3 className="text-lg font-black text-slate-800 border-l-4 border-blue-500 pl-3 leading-none font-serif-bn">শাখাভিত্তিক বিশ্লেষণ</h3>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">ক্লাস</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">শাখা</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">শিক্ষার্থী</th>
                        <th className="px-5 py-3.5 text-xs font-black text-emerald-600 uppercase tracking-wide">পাস</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">পাসের হার</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">গড় GPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sectionAnalysis.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-black text-slate-800">{row.className}</td>
                          <td className="px-5 py-3 font-bold text-slate-600">{row.section}</td>
                          <td className="px-5 py-3 font-bold text-slate-600">{toBnNum(row.total)}</td>
                          <td className="px-5 py-3 font-black text-emerald-600">{toBnNum(row.passed)}</td>
                          <td className="px-5 py-3 font-black text-slate-800">{toBnNum(row.passRate)}%</td>
                          <td className="px-5 py-3 font-bold text-slate-600">{toBnNum(row.avgGpa)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* SECTION: SUBJECT-WISE ANALYSIS */}
            <section id="subjects" className="space-y-5">
              <h3 className="text-lg font-black text-slate-800 border-l-4 border-blue-500 pl-3 leading-none font-serif-bn">বিষয়ভিত্তিক বিশ্লেষণ</h3>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">বিষয়</th>
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">উপস্থিত</th>
                      <th className="px-5 py-3.5 text-xs font-black text-emerald-600 uppercase tracking-wide">পাস</th>
                      <th className="px-5 py-3.5 text-xs font-black text-rose-500 uppercase tracking-wide">ফেল</th>
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">পাসের হার</th>
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">গড় নম্বর</th>
                      <th className="px-5 py-3.5 text-xs font-black text-[#8A6A24] uppercase tracking-wide">সর্বোচ্চ প্রাপ্ত (শিক্ষার্থী)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjectAnalysis.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-black text-slate-800">{row.sub} <span className="text-xs text-slate-400 font-bold">({toBnNum(row.fullMarks)})</span></td>
                        <td className="px-5 py-3 font-bold text-slate-600">{toBnNum(row.present)}</td>
                        <td className="px-5 py-3 font-black text-emerald-600">{toBnNum(row.passed)}</td>
                        <td className="px-5 py-3 font-black text-rose-500">{toBnNum(row.failed)}</td>
                        <td className="px-5 py-3 font-black text-slate-800">{toBnNum(row.passRate)}%</td>
                        <td className="px-5 py-3 font-bold text-slate-600">{toBnNum(row.avgMarks)}</td>
                        <td className="px-5 py-3 font-bold text-[#8A6A24]">
                          {row.topper ? <>{toBnNum(row.topper.marks)} <span className="text-slate-500 font-medium">— {row.topper.name}</span></> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* SECTIONS: FAIL COUNT, PERFORMANCE CATEGORIES, GENDER */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2">

              <section id="fail-analysis" className="space-y-5">
                <h3 className="text-lg font-black text-slate-800 border-l-4 border-rose-500 pl-3 leading-none font-serif-bn">মাল্টিপল বিষয়ে ফেল এনালাইসিস</h3>
                <p className="text-[11px] font-bold text-slate-400 -mt-2">টিপ: যেকোনো সারিতে চেপে ধরুন (Long Press) — তাদের সবার আইডি কমা দিয়ে কপি হয়ে যাবে।</p>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">ফেল করা বিষয় সংখ্যা</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide text-right">শিক্ষার্থী সংখ্যা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr
                        className="hover:bg-emerald-50/50 active:bg-emerald-100 cursor-pointer select-none transition-colors"
                        onTouchStart={() => startLongPress(multipleFailAnalysis.buckets[0], 'কোনো বিষয়ে ফেল নেই')}
                        onTouchEnd={endLongPress} onTouchMove={endLongPress}
                        onMouseDown={() => startLongPress(multipleFailAnalysis.buckets[0], 'কোনো বিষয়ে ফেল নেই')}
                        onMouseUp={endLongPress} onMouseLeave={endLongPress}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <td className="px-5 py-3.5 font-black text-emerald-600">কোনো বিষয়ে ফেল নেই (All Pass)</td>
                        <td className="px-5 py-3.5 font-black text-emerald-600 text-right">{toBnNum(multipleFailAnalysis.counts[0])}</td>
                      </tr>
                      {[1, 2, 3, 4, '5+'].map(num => (
                        <tr
                          key={num}
                          className="hover:bg-rose-50/50 active:bg-rose-100 cursor-pointer select-none transition-colors"
                          onTouchStart={() => startLongPress(multipleFailAnalysis.buckets[num], `${num} টি বিষয়ে ফেল`)}
                          onTouchEnd={endLongPress} onTouchMove={endLongPress}
                          onMouseDown={() => startLongPress(multipleFailAnalysis.buckets[num], `${num} টি বিষয়ে ফেল`)}
                          onMouseUp={endLongPress} onMouseLeave={endLongPress}
                          onContextMenu={(e) => e.preventDefault()}
                        >
                          <td className="px-5 py-3.5 font-bold text-slate-700">{toBnNum(num)} টি বিষয়ে ফেল</td>
                          <td className="px-5 py-3.5 font-black text-rose-500 text-right">{toBnNum(multipleFailAnalysis.counts[num])}</td>
                        </tr>
                      ))}
                      <tr
                        className="hover:bg-rose-100/60 active:bg-rose-200 bg-rose-50/40 border-t-2 border-rose-200 cursor-pointer select-none transition-colors"
                        onTouchStart={() => startLongPress(multipleFailAnalysis.buckets.allSubjects, 'সব বিষয়ে ফেল')}
                        onTouchEnd={endLongPress} onTouchMove={endLongPress}
                        onMouseDown={() => startLongPress(multipleFailAnalysis.buckets.allSubjects, 'সব বিষয়ে ফেল')}
                        onMouseUp={endLongPress} onMouseLeave={endLongPress}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <td className="px-5 py-3.5 font-black text-rose-700">সব বিষয়ে ফেল</td>
                        <td className="px-5 py-3.5 font-black text-rose-700 text-right">{toBnNum(multipleFailAnalysis.counts.allSubjects)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="performance" className="space-y-5">
                <h3 className="text-lg font-black text-slate-800 border-l-4 border-amber-500 pl-3 leading-none font-serif-bn">পারফরম্যান্স ক্যাটাগরি</h3>
                <p className="text-[11px] font-bold text-slate-400 -mt-2">টিপ: যেকোনো ক্যাটাগরিতে চেপে ধরুন (Long Press) — তাদের সবার আইডি কমা দিয়ে কপি হয়ে যাবে।</p>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-center gap-5">
                  {Object.values(riskAnalysis).map((cat, idx) => {
                    const pct = stats.total > 0 ? ((cat.students.length / stats.total) * 100).toFixed(1) : 0;
                    return (
                      <div
                        key={idx}
                        className="space-y-1.5 cursor-pointer select-none rounded-xl px-1 py-0.5 -mx-1 active:bg-slate-100 transition-colors"
                        onTouchStart={() => startLongPress(cat.students, cat.label)}
                        onTouchEnd={endLongPress} onTouchMove={endLongPress}
                        onMouseDown={() => startLongPress(cat.students, cat.label)}
                        onMouseUp={endLongPress} onMouseLeave={endLongPress}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        <div className="flex justify-between items-end text-sm">
                          <span className="font-bold text-slate-600">{cat.label}</span>
                          <span className="font-black text-slate-800">{toBnNum(cat.students.length)} জন <span className="text-slate-400 font-medium">({toBnNum(pct)}%)</span></span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

            </div>

            {/* GENDER ANALYSIS */}
            {genderAnalysis.length > 0 && (
              <section id="gender" className="space-y-5 pt-4">
                <h3 className="text-lg font-black text-slate-800 border-l-4 border-fuchsia-500 pl-3 leading-none font-serif-bn">জেন্ডারভিত্তিক বিশ্লেষণ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {genderAnalysis.map((g, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${g.gender.toLowerCase().includes('female') || g.gender === 'ছাত্রী' ? 'bg-fuchsia-100 text-fuchsia-600' : 'bg-blue-100 text-blue-600'}`}>
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-lg mb-0.5">{g.gender}</h4>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">মোট: {toBnNum(g.total)} জন | GPA ৫: {toBnNum(g.gpa5)} জন</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-800">{toBnNum(g.passRate)}%</div>
                        <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5">পাসের হার</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ABSENTEE LIST */}
            {absentees.length > 0 && (
              <section id="absentees" className="space-y-5 pt-4">
                <h3 className="text-lg font-black text-slate-800 border-l-4 border-slate-400 pl-3 leading-none font-serif-bn flex items-center gap-2">
                  <UserX className="w-5 h-5 text-slate-400" /> অনুপস্থিত শিক্ষার্থী তালিকা <span className="text-sm font-bold text-slate-400">({toBnNum(absentees.length)} জন)</span>
                </h3>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">নাম</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">রোল</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">ক্লাস</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">শাখা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {absentees.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedStudent(s)}>
                          <td className="px-5 py-3 font-black text-slate-800">{s.name}</td>
                          <td className="px-5 py-3 font-bold text-slate-600">{toBnNum(s.roll)}</td>
                          <td className="px-5 py-3 font-bold text-slate-600">{s.className}</td>
                          <td className="px-5 py-3 font-bold text-slate-500">{s.section !== '-' ? s.section : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* FOLLOW-UP LIST (AT-RISK) */}
            {atRiskList.length > 0 && (
              <section id="followup" className="space-y-5 pt-4">
                <h3 className="text-lg font-black text-slate-800 border-l-4 border-rose-500 pl-3 leading-none font-serif-bn flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" /> মনোযোগ প্রয়োজন — ফলোআপ তালিকা <span className="text-sm font-bold text-slate-400">({toBnNum(atRiskList.length)} জন)</span>
                </h3>
                <p className="text-xs font-bold text-slate-500 -mt-2">অনুত্তীর্ণ শিক্ষার্থীদের তালিকা, কোন কোন বিষয়ে অতিরিক্ত সহায়তা প্রয়োজন তা সহ — শিক্ষক ও অভিভাবকদের ফলোআপের জন্য.</p>
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">নাম</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">রোল / ক্লাস</th>
                        <th className="px-5 py-3.5 text-xs font-black text-rose-500 uppercase tracking-wide">ফেল বিষয় সংখ্যা</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">যেসব বিষয়ে ফেল</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {atRiskList.map((s, idx) => (
                        <tr
                          key={idx}
                          onClick={() => setSelectedStudent(s)}
                          className={`hover:bg-rose-50/40 cursor-pointer transition-colors ${idx >= LIST_PREVIEW_COUNT && !showAllFollowup ? 'hidden print:table-row' : ''}`}
                        >
                          <td className="px-5 py-3 font-black text-slate-800">{s.name}</td>
                          <td className="px-5 py-3">
                            <div className="font-bold text-slate-700">রোল: {toBnNum(s.roll)}</div>
                            <div className="text-xs font-bold text-slate-400">{s.className}</div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-block px-2.5 py-1 bg-rose-50 text-rose-700 font-black rounded-lg border border-rose-100 text-xs">{toBnNum(s.failedCount)} টি</span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {s.failedSubjects.map((sub, i) => (
                                <span key={i} className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">{sub}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {atRiskList.length > LIST_PREVIEW_COUNT && (
                    <button
                      onClick={() => setShowAllFollowup(v => !v)}
                      className="print:hidden w-full py-3 text-xs font-black text-rose-600 bg-rose-50/60 hover:bg-rose-50 border-t border-rose-100 transition-colors"
                    >
                      {showAllFollowup ? 'সংক্ষিপ্ত করুন' : `আরও দেখুন (বাকি ${toBnNum(atRiskList.length - LIST_PREVIEW_COUNT)} জন)`}
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* MERIT LIST (TOP STUDENTS) */}
            <section id="merit" className="space-y-5 pt-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <h3 className="text-lg font-black text-slate-800 border-l-4 border-[#B08D3F] pl-3 leading-none whitespace-nowrap font-serif-bn flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#B08D3F]" /> মেধা তালিকা (শীর্ষ ২০)
                </h3>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm w-full md:w-auto">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                      value={meritLevel}
                      onChange={(e) => setMeritLevel(e.target.value)}
                      className="bg-transparent text-sm font-bold text-slate-700 outline-none w-full cursor-pointer"
                    >
                      <option value="All">সব (All)</option>
                      <option value="ClassOneToTen">সব (১ম - ১০ম)</option>
                      <option value="Pre-Primary">প্রাক-প্রাথমিক</option>
                      <option value="Ebtedayee">ইবতেদায়ী</option>
                      <option value="Dakhil">দাখিল</option>
                    </select>
                  </div>
                  <span className="hidden md:flex text-xs font-bold text-[#8A6A24] bg-[#F4EBD5] px-3 py-2 rounded-xl print:hidden items-center gap-1 whitespace-nowrap">
                    <ArrowUpRight className="w-3 h-3" /> সম্পূর্ণ মার্কশিটের জন্য ক্লিক করুন
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">মেধা স্থান</th>
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">শিক্ষার্থীর নাম</th>
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">রোল ও ক্লাস</th>
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide text-right">গড় নম্বর</th>
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide text-right">GPA</th>
                      <th className="px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide text-center">গ্রেড</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topStudents.length === 0 ? (
                      <tr><td colSpan="6" className="px-5 py-10 text-center text-slate-500 font-bold">কোনো পাস করা শিক্ষার্থী পাওয়া যায়নি</td></tr>
                    ) : (
                      topStudents.map((student, idx) => (
                        <tr key={idx} onClick={() => setSelectedStudent(student)} className="hover:bg-[#F4EBD5]/40 cursor-pointer transition-colors group">
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm border
                              ${idx === 0 ? 'bg-[#F4EBD5] text-[#8A6A24] border-[#B08D3F] shadow-[0_0_10px_rgba(176,141,63,0.25)]' :
                                idx === 1 ? 'bg-slate-200 text-slate-700 border-slate-400' :
                                idx === 2 ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                'bg-white text-slate-600 border-slate-200'}
                            `}>{toBnNum(idx + 1)}</span>
                          </td>
                          <td className="px-5 py-3 font-black text-slate-800">{student.name}</td>
                          <td className="px-5 py-3">
                            <div className="font-bold text-slate-700">রোল: {toBnNum(student.roll)}</div>
                            <div className="text-xs font-bold text-slate-400">{student.className} {student.section !== '-' ? `(শাখা: ${student.section})` : ''}</div>
                          </td>
                          <td className="px-5 py-3 font-black text-emerald-600 text-right">{toBnNum(student.averageMarks.toFixed(2))}</td>
                          <td className="px-5 py-3 font-black text-[#8A6A24] text-right">{toBnNum(student.gpa.toFixed(2))}</td>
                          <td className="px-5 py-3 text-center">
                            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-black rounded-lg border border-emerald-100">{student.grade}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* FULL STUDENT DIRECTORY */}
            <section id="directory" className="space-y-5 pt-4 print:break-before-page">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
                <h3 className="text-lg font-black text-slate-800 border-l-4 border-slate-400 pl-3 leading-none font-serif-bn">সকল শিক্ষার্থীর তালিকা <span className="text-sm font-bold text-slate-400">({toBnNum(sortedDirectory.length)} জন)</span></h3>
                <button onClick={handleExportCSV} className="print:hidden flex items-center gap-2 text-xs font-bold text-[#8A6A24] bg-[#F4EBD5] hover:brightness-95 px-3 py-2 rounded-xl transition-all">
                  <Download className="w-3.5 h-3.5" /> CSV ডাউনলোড করুন
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <SortHeader label="নাম" sortKey="name" />
                      <SortHeader label="রোল" sortKey="roll" />
                      <SortHeader label="ক্লাস" sortKey="className" />
                      <th className="px-4 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide">শাখা</th>
                      <SortHeader label="GPA" sortKey="gpa" align="right" />
                      <SortHeader label="মোট নম্বর" sortKey="totalMarks" align="right" />
                      <th className="px-4 py-3.5 text-xs font-black text-slate-500 uppercase tracking-wide text-center">অবস্থা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedDirectory.length === 0 ? (
                      <tr><td colSpan="7" className="px-5 py-10 text-center text-slate-500 font-bold">কোনো শিক্ষার্থী পাওয়া যায়নি</td></tr>
                    ) : (
                      sortedDirectory.map((s, idx) => (
                        <tr
                          key={idx}
                          onClick={() => setSelectedStudent(s)}
                          className={`hover:bg-slate-50 cursor-pointer transition-colors ${idx >= LIST_PREVIEW_COUNT && !showAllDirectory ? 'hidden print:table-row' : ''}`}
                        >
                          <td className="px-4 py-2.5 font-bold text-slate-800">{s.name}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-600">{toBnNum(s.roll)}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-600">{s.className}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-500">{s.section !== '-' ? s.section : '—'}</td>
                          <td className="px-4 py-2.5 font-black text-[#8A6A24] text-right">{toBnNum(s.gpa.toFixed(2))}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-700 text-right">{toBnNum(s.totalMarks)}</td>
                          <td className="px-4 py-2.5 text-center"><StatusBadge status={s.resultStatus} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {sortedDirectory.length > LIST_PREVIEW_COUNT && (
                  <button
                    onClick={() => setShowAllDirectory(v => !v)}
                    className="print:hidden w-full py-3 text-xs font-black text-slate-600 bg-slate-50 hover:bg-slate-100 border-t border-slate-200 transition-colors"
                  >
                    {showAllDirectory ? 'সংক্ষিপ্ত করুন' : `আরও দেখুন (বাকি ${toBnNum(sortedDirectory.length - LIST_PREVIEW_COUNT)} জন)`}
                  </button>
                )}
              </div>
            </section>
          </div>
        )}

        {/* PRINT SIGNATURE BLOCK */}
        {rawData && (
          <div className="hidden print:flex justify-between items-end mt-16 px-4 pb-10 break-inside-avoid">
            <div className="text-center">
              <div className="w-48 border-t-2 border-slate-800 pt-2 text-xs font-bold text-slate-700">শ্রেণি শিক্ষকের স্বাক্ষর</div>
            </div>
            <div className="text-center">
              <div className="w-48 border-t-2 border-slate-800 pt-2 text-xs font-bold text-slate-700">ফলাফল নিয়ন্ত্রকের স্বাক্ষর</div>
            </div>
            <div className="text-center">
              <div className="w-48 border-t-2 border-slate-800 pt-2 text-xs font-bold text-slate-700">প্রধান শিক্ষকের স্বাক্ষর ও সীল</div>
            </div>
          </div>
        )}
      </main>

      {/* DEVELOPER FOOTER */}
      <footer className="print:hidden text-center py-6">
        <p className="text-[11px] font-bold text-slate-400">© {toBnNum(new Date().getFullYear())} আব্দুর রাজ্জাক দাখিল মাদ্রাসা — সিস্টেম ডেভেলপার: রায়সুল ইসলাম সাঈদ</p>
      </footer>

      {/* ==========================================
          MODAL: STUDENT DETAILS (Marksheet)
          ========================================== */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:absolute print:inset-0 print:bg-white print:p-0">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto print:shadow-none print:max-w-full print:max-h-full animate-slide-up border border-slate-200 custom-scrollbar">

            <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10 print:static print:bg-transparent">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 font-serif-bn"><BookOpen className="w-5 h-5 text-[#0B1B33]" /> একাডেমিক ট্রান্সক্রিপ্ট</h2>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => window.print()} className="p-2 text-slate-400 hover:text-[#0B1B33] hover:bg-slate-100 rounded-xl transition-all"><Printer className="w-5 h-5" /></button>
                <button onClick={() => setSelectedStudent(null)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><XCircle className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">{selectedStudent.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span className="bg-slate-100 px-2.5 py-1.5 rounded-lg text-slate-700">রোল: {toBnNum(selectedStudent.roll)}</span>
                    <span className="bg-slate-100 px-2.5 py-1.5 rounded-lg text-slate-700">ক্লাস: {selectedStudent.className}</span>
                    <span className="bg-slate-100 px-2.5 py-1.5 rounded-lg text-slate-700">আইডি: {toBnNum(selectedStudent.id)}</span>
                    {selectedStudent.section && selectedStudent.section !== '-' && <span className="bg-slate-100 px-2.5 py-1.5 rounded-lg text-slate-700">শাখা: {selectedStudent.section}</span>}
                  </div>
                </div>

                <div className="text-left md:text-right flex flex-col md:items-end">
                  <span className={`inline-block px-5 py-2 rounded-xl text-sm font-black border-2 mb-2 ${selectedStudent.resultStatus === 'Passed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {selectedStudent.resultStatus === 'Passed' ? 'উত্তীর্ণ (PASSED)' : selectedStudent.resultStatus === 'Absent' ? 'অনুপস্থিত (ABSENT)' : 'অনুত্তীর্ণ (FAILED)'}
                  </span>
                  <div className="text-slate-500 font-bold text-sm">
                    GPA: <span className={`text-2xl font-black ml-1 ${selectedStudent.resultStatus === 'Passed' ? 'text-[#8A6A24]' : 'text-rose-600'}`}>{toBnNum(selectedStudent.gpa.toFixed(2))}</span>
                  </div>
                </div>
              </div>

              {selectedStudent.resultStatus === 'Failed' && selectedStudent.subjects.some(s => s.status === 'Failed') && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-xs font-bold text-rose-700">নিম্নে চিহ্নিত বিষয়গুলোতে অতিরিক্ত সহায়তা প্রয়োজন।</p>
                </div>
              )}

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">বিষয়</th>
                      <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">পূর্ণমান</th>
                      <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">প্রাপ্ত নম্বর</th>
                      <th className="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">গ্রেড</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedStudent.subjects.map((sub, idx) => (
                      <tr key={idx} className={sub.status === 'Failed' || sub.status === 'Absent' ? 'bg-rose-50/40' : ''}>
                        <td className="px-5 py-3.5 font-bold text-slate-700">{sub.name}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-400 text-center">{toBnNum(sub.fullMarks)}</td>
                        <td className="px-5 py-3.5 font-black text-slate-900 text-center">
                          {sub.status === 'Absent' ? <span className="text-rose-500 text-xs uppercase tracking-widest bg-rose-100 px-2 py-1 rounded">abs</span> : toBnNum(sub.marks)}
                        </td>
                        <td className={`px-5 py-3.5 font-black text-center text-lg ${sub.status === 'Failed' || sub.status === 'Absent' ? 'text-rose-600' : 'text-emerald-600'}`}>{sub.grade}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#0B1B33] text-white border-t-4 border-slate-900">
                      <td colSpan="2" className="px-5 py-4 font-black text-right tracking-widest uppercase text-xs text-slate-400">সর্বমোট প্রাপ্ত নম্বর</td>
                      <td className="px-5 py-4 font-black text-center text-2xl text-[#D4B96A]">{toBnNum(selectedStudent.totalMarks)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COPY-TO-CLIPBOARD TOAST */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] print:hidden px-4 w-full flex justify-center pointer-events-none">
          <div className="bg-[#0B1B33] text-white text-sm font-bold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-fade-in max-w-full">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{copyToast}</span>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700;900&family=Noto+Serif+Bengali:wght@600;700;800&display=swap');
        .font-sans { font-family: 'Hind Siliguri', sans-serif; }
        .font-serif-bn { font-family: 'Noto Serif Bengali', serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        @media print {
          body { background: white; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:flex { display: flex !important; }
          .print\\:break-before-page { break-before: page; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
          .border { border-color: #cbd5e1 !important; }
          section { page-break-inside: avoid; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />
    </div>
  );
}
