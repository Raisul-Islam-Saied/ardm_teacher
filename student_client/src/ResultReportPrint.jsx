import React, { useMemo, useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';

// ==============================================
// SELF-CONTAINED HELPERS & CONSTANTS
// ==============================================
const CLASS_HIERARCHY = ['Play', 'Nursery', 'KG', 'Class One', 'Class Two', 'Class Three', 'Class Four', 'Class Five', 'Class Six', 'Class Seven', 'Class Eight', 'Class Nine', 'Class Ten'];

const EDU_LEVELS = {
  'Pre-Primary': ['Play', 'Nursery', 'KG'],
  'Ebtedayee': ['Class One', 'Class Two', 'Class Three', 'Class Four', 'Class Five'],
  'Dakhil': ['Class Six', 'Class Seven', 'Class Eight', 'Class Nine', 'Class Ten']
};

const subjectsDB = [
  { name: 'কুরআন মাজিদ', short: 'Quran', def: 100 },
  { name: 'আকাইদ ও ফিকহ', short: 'Aqaid', def: 100 },
  { name: 'হাদিস শরীফ', short: 'Hadith', def: 100 },
  { name: 'আরবি ১ম পত্র', short: 'Arabic', def: 100 },
  { name: 'আরবি ২য় পত্র', short: 'Arabic 2nd', def: 50 },
  { name: 'বাংলা ১ম পত্র', short: 'Bangla', def: 100 },
  { name: 'বাংলা ২য় পত্র', short: 'Bangla 2nd', def: 50 },
  { name: 'ইংরেজি ১ম পত্র', short: 'English', def: 100 },
  { name: 'ইংরেজি ২য় পত্র', short: 'English 2nd', def: 50 },
  { name: 'গণিত', short: 'Math', def: 100 },
  { name: 'ইসলামের ইতিহাস', short: 'History', def: 100 },
  { name: 'বাংলাদেশ ও বিশ্বপরিচয়', short: 'BGS', def: 100 },
  { name: 'বিজ্ঞান', short: 'Science', def: 100 },
  { name: 'কৃষি শিক্ষা', short: 'Agriculture', def: 100 },
  { name: 'মানতিক', short: 'Mantiq', def: 100 },
  { name: 'তথ্য ও যোগাযোগ প্রযুক্তি', short: 'ICT', def: 50 }
];

const getSubjectSortIndex = (subName) => {
  const lowerName = subName.toLowerCase().trim();
  const idx = subjectsDB.findIndex(db => 
    db.name === subName.trim() || 
    db.short.toLowerCase() === lowerName ||
    (lowerName === 'agri' && db.short.toLowerCase() === 'agriculture')
  );
  return idx !== -1 ? idx : 999; 
};

const formatDateTime = (date) => {
  if (!date) return '';
  try {
    return date.toLocaleString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
  } catch (e) {
    return date.toLocaleString();
  }
};

const rankTop3 = (list) => [...list]
  .filter(s => s.resultStatus === 'Passed')
  .sort((a, b) => b.gpa - a.gpa || b.averageMarks - a.averageMarks || (Number(a.roll) || 0) - (Number(b.roll) || 0))
  .slice(0, 3);

const byClassThenRoll = (a, b) =>
  CLASS_HIERARCHY.indexOf(a.className) - CLASS_HIERARCHY.indexOf(b.className) || (Number(a.roll) || 0) - (Number(b.roll) || 0);

// ==========================================
// LOADING WRAPPER (Prevents UI Freeze)
// ==========================================
export default function ResultReportPrint(props) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 150ms delay allows the browser to paint the loading spinner 
    // before the heavy calculations block the main thread.
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#e5e5e5', fontFamily: 'sans-serif' }}>
        <div style={{ width: '45px', height: '45px', border: '4px solid #cbd5e1', borderTopColor: '#334155', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <h2 style={{ marginTop: '20px', color: '#334155', fontSize: '16px', fontWeight: 'bold' }}>অফিসিয়াল রিপোর্ট প্রস্তুত করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</h2>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <ResultReportPrintContent {...props} />;
}


// ==========================================
// MAIN REPORT COMPONENT
// ==========================================
function ResultReportPrintContent({
  students = [],
  examInfo = {},
  historicalData = [],
  madrasaName = 'Abdur Razzak Dakhil Madrasah',
  address = 'Sarfabhata, Rangunia, Chattogram',
  onClose
}) {
  const generatedAt = useMemo(() => new Date(), []);

  const displayExamName = useMemo(() => {
    const rawName = examInfo.examName || 'N/A';
    const lowerName = String(rawName).toLowerCase();
    if (lowerName.includes('exam') || lowerName.includes('result')) {
      return rawName;
    }
    return `${rawName} Exam`;
  }, [examInfo.examName]);

  // --- NEW: DYNAMIC PRINT TITLE FOR PDF SAVING (IN BENGALI) ---
  useEffect(() => {
    const originalTitle = document.title;
    const eName = examInfo.examName || 'অজানা_পরীক্ষা';
    const eYear = examInfo.year || '';
    document.title = `Result Analysis ${eName} ${eYear}`.replace(/\s+/g, '_');

    return () => {
      document.title = originalTitle; // Restore original title when closed
    };
  }, [examInfo.examName, examInfo.year]);

  const stats = useMemo(() => {
    const total = students.length;
    const absent = students.filter(s => s.resultStatus === 'Absent').length;
    const present = total - absent;
    const passed = students.filter(s => s.resultStatus === 'Passed').length;
    const failed = total - passed;
    const passRate = total ? ((passed / total) * 100).toFixed(2) : '0.00';
    const failRate = total ? ((failed / total) * 100).toFixed(2) : '0.00';
    const validGpas = students.filter(s => s.resultStatus === 'Passed').map(s => s.gpa);
    const avgGpa = validGpas.length ? (validGpas.reduce((a, b) => a + b, 0) / validGpas.length).toFixed(2) : '0.00';
    return { total, present, absent, passed, failed, passRate, failRate, avgGpa };
  }, [students]);

  // --- FIXED: ALWAYS SHOW FULL SEQUENCE EVEN IF EMPTY ---
  const trendTableData = useMemo(() => {
    const allTerms = [
      { id: '1st', title: '1st Terminal', keys: ['1st', 'প্রথম'] },
      { id: '2nd', title: '2nd Terminal', keys: ['2nd', 'দ্বিতীয়', '২য়'] },
      { id: 'half', title: 'Half Yearly', keys: ['half', 'অর্ধ'] },
      { id: 'annual', title: 'Annual Exam', keys: ['annual', 'বার্ষিক'] },
      { id: 'final', title: 'Final Result', keys: ['final', 'চূড়ান্ত', 'ফাইনাল'] }
    ];

    const safeExamName = String(examInfo.examName || '').toLowerCase();
    const checkMatch = (str, keys) => keys.some(k => str.includes(k) || str === k);

    // Detect track based on current exam and historical data
    const isHalfTrack = checkMatch(safeExamName, allTerms[2].keys) || historicalData.some(h => checkMatch(String(h.examName).toLowerCase(), allTerms[2].keys));

    let activeTerms = [];
    if (isHalfTrack) {
       // Track: Half Yearly + Annual + Final (Always 3 items)
       activeTerms = [allTerms[2], allTerms[3], allTerms[4]];
    } else {
       // Track: 1st + 2nd + Annual + Final (Always 4 items)
       activeTerms = [allTerms[0], allTerms[1], allTerms[3], allTerms[4]];
    }
    
    let prevPassRate = null;
    
    return activeTerms.map(term => {
       let currentMatch = checkMatch(safeExamName, term.keys);
       let dataRow = { total: '-', passed: '-', failed: '-', passRate: '-', avgGpa: '-', isCurrent: false };
       
       if (currentMatch) {
          dataRow = { total: stats.total, passed: stats.passed, failed: stats.failed, passRate: stats.passRate, avgGpa: stats.avgGpa, isCurrent: true };
       } else {
          const hist = (historicalData || []).find(h => checkMatch(String(h.examName || '').toLowerCase(), term.keys));
          if (hist) {
             const f = (!isNaN(hist.total) && !isNaN(hist.passed)) ? (Number(hist.total) - Number(hist.passed)) : '-';
             dataRow = { total: hist.total, passed: hist.passed, failed: f, passRate: hist.passRate, avgGpa: hist.avgGpa, isCurrent: false };
          }
       }

       let progress = '-';
       if (dataRow.passRate !== '-') {
          if (prevPassRate !== null) {
             const diff = parseFloat(dataRow.passRate) - prevPassRate;
             if (diff > 0) progress = `+${diff.toFixed(2)}% ▲`;
             else if (diff < 0) progress = `${diff.toFixed(2)}% ▼`;
             else progress = 'Same';
          }
          prevPassRate = parseFloat(dataRow.passRate);
       }
       return { label: term.title, ...dataRow, progress };
    });
  }, [examInfo.examName, stats, historicalData]);

  const gradeDist = useMemo(() => {
    const grades = { 'A+': 0, 'A': 0, 'A-': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0 };
    students.forEach(s => {
      if (grades[s.grade] !== undefined) grades[s.grade]++;
      else if (s.resultStatus === 'Absent') grades['F']++;
    });
    return grades;
  }, [students]);

  const eduLevelStats = useMemo(() => {
    const map = { 'Pre-Primary': [], 'Ebtedayee': [], 'Dakhil': [] };
    students.forEach(s => {
      const lvl = Object.keys(EDU_LEVELS).find(l => EDU_LEVELS[l].includes(s.className));
      if (lvl) map[lvl].push(s);
    });
    return Object.keys(map).filter(k => map[k].length > 0).map(lvl => {
      const list = map[lvl];
      const total = list.length;
      const passed = list.filter(s => s.resultStatus === 'Passed').length;
      const passRate = total ? ((passed / total) * 100).toFixed(2) : '0.00';
      const gpas = list.filter(s => s.resultStatus === 'Passed').map(s => s.gpa);
      const avgGpa = gpas.length ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2) : '0.00';
      return { label: lvl, total, passed, failed: total - passed, passRate, avgGpa };
    });
  }, [students]);

  const classAnalysis = useMemo(() => {
    const map = {};
    students.forEach(s => { if (!map[s.className]) map[s.className] = []; map[s.className].push(s); });
    return Object.keys(map).map(cls => {
      const list = map[cls];
      const total = list.length;
      const passed = list.filter(s => s.resultStatus === 'Passed').length;
      const failed = total - passed;
      const passRate = ((passed / total) * 100).toFixed(2);
      const gpas = list.filter(s => s.resultStatus === 'Passed').map(s => s.gpa);
      const avgGpa = gpas.length ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2) : '0.00';
      const maxGpa = gpas.length ? Math.max(...gpas).toFixed(2) : '0.00';
      return { cls, total, passed, failed, passRate, avgGpa, maxGpa };
    }).sort((a, b) => CLASS_HIERARCHY.indexOf(a.cls) - CLASS_HIERARCHY.indexOf(b.cls));
  }, [students]);

  const subjectAnalysis = useMemo(() => {
    const subMap = {};
    students.forEach(stu => {
      stu.subjects.forEach(sub => {
        if (!subMap[sub.name]) subMap[sub.name] = { present: 0, passed: 0, totalMarks: 0, fullMarks: sub.fullMarks };
        const d = subMap[sub.name];
        if (sub.status !== 'Absent') {
          d.present++;
          if (sub.status === 'Passed') d.passed++;
          d.totalMarks += sub.marks;
        }
      });
    });
    return Object.keys(subMap).map(name => {
      const d = subMap[name];
      const failed = d.present - d.passed;
      const passRate = d.present > 0 ? ((d.passed / d.present) * 100).toFixed(2) : '0.00';
      const avgMarks = d.present > 0 ? (d.totalMarks / d.present).toFixed(2) : '0.00';
      return { name, ...d, failed, passRate, avgMarks };
    });
  }, [students]);

  const gpa5List = useMemo(() =>
    students.filter(s => s.resultStatus === 'Passed' && s.gpa === 5.0).sort(byClassThenRoll)
  , [students]);

  const failAnalysis = useMemo(() => {
    const buckets = { 0: [], 1: [], 2: [], 3: [], 4: [], '5+': [], allSubjects: [] };
    students.forEach(s => {
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
    return buckets;
  }, [students]);

  const allSubjectsFailedList = useMemo(() =>
    [...failAnalysis.allSubjects].sort(byClassThenRoll)
  , [failAnalysis]);

  const absentList = useMemo(() =>
    students.filter(s => s.resultStatus === 'Absent').sort(byClassThenRoll)
  , [students]);

  const meritCategories = useMemo(() => [
    { label: 'Entire Madrasa — Overall', list: rankTop3(students) },
    { label: 'Entire Madrasa — Class 1 to 10', list: rankTop3(students.filter(s => !EDU_LEVELS['Pre-Primary'].includes(s.className))) },
    { label: 'Pre-Primary', list: rankTop3(students.filter(s => EDU_LEVELS['Pre-Primary'].includes(s.className))) },
    { label: 'Ebtedayee', list: rankTop3(students.filter(s => EDU_LEVELS['Ebtedayee'].includes(s.className))) },
    { label: 'Dakhil', list: rankTop3(students.filter(s => EDU_LEVELS['Dakhil'].includes(s.className))) }
  ], [students]);

  const classToppers = useMemo(() => {
    const map = {};
    students.forEach(s => { if (!map[s.className]) map[s.className] = []; map[s.className].push(s); });
    return Object.keys(map)
      .map(cls => ({ cls, top3: rankTop3(map[cls]) }))
      .filter(c => c.top3.length > 0)
      .sort((a, b) => CLASS_HIERARCHY.indexOf(a.cls) - CLASS_HIERARCHY.indexOf(b.cls));
  }, [students]);

  const failMatrix = useMemo(() => {
    const activeClasses = CLASS_HIERARCHY.filter(cls => students.some(s => s.className === cls));
    const subjectMap = {};
    const classMax = {};
    const classTotals = {};

    activeClasses.forEach(cls => { 
      classMax[cls] = 0; 
      classTotals[cls] = 0;
    });

    students.forEach(stu => {
      if (activeClasses.includes(stu.className)) {
        classTotals[stu.className]++;

        stu.subjects.forEach(sub => {
          let sName = sub.name.trim();
          if (sName.toLowerCase() === 'agri') sName = 'Agriculture';

          if (!subjectMap[sName]) subjectMap[sName] = {};
          if (subjectMap[sName][stu.className] === undefined) {
            subjectMap[sName][stu.className] = 0;
          }
          
          if (sub.status === 'Failed') {
            subjectMap[sName][stu.className]++;
            if (subjectMap[sName][stu.className] > classMax[stu.className]) {
              classMax[stu.className] = subjectMap[sName][stu.className];
            }
          }
        });
      }
    });

    const subjects = Object.keys(subjectMap).sort((a, b) => {
      const idxA = getSubjectSortIndex(a);
      const idxB = getSubjectSortIndex(b);
      if (idxA !== 999 && idxB !== 999) return idxA - idxB;
      if (idxA !== 999) return -1;
      if (idxB !== 999) return 1;
      return a.localeCompare(b);
    });

    return { subjects, subjectMap, classMax, classTotals, activeClasses };
  }, [students]);

  const missingClasses = useMemo(() => {
    const present = new Set(students.map(s => s.className));
    return CLASS_HIERARCHY.filter(c => !present.has(c) && c !== 'KG');
  }, [students]);

  if (!students || students.length === 0) {
    return <div className="rrp-empty">No data available — report could not be generated.</div>;
  }

  const SectionTitle = ({ no, children, count }) => (
    <h2 className="rrp-section-title">{no}. {children}{count !== undefined ? ` (${count} students)` : ''}</h2>
  );

  return (
    <div className="rrp-root">
      <div className="rrp-toolbar">
        <button onClick={() => window.print()} className="rrp-btn rrp-btn-primary"><Printer size={14} /> Print</button>
        {onClose && <button onClick={onClose} className="rrp-btn"><X size={14} /> Close</button>}
      </div>

      <div className="rrp-page">
        <header className="rrp-letterhead">
          <div className="rrp-madrasa-name">{String(madrasaName).toUpperCase()}</div>
          <div className="rrp-address">{address}</div>
          <div className="rrp-rule" />
          <div className="rrp-report-title">Result Analysis Report</div>
          <div className="rrp-exam-line">Exam: {displayExamName} &nbsp;|&nbsp; Year: {examInfo.year || 'N/A'}</div>
          <div className="rrp-generated">Generated on: {formatDateTime(generatedAt)}</div>
          <div className="rrp-prepared-by">Prepared By: Raisul Islam Saied</div>
          {missingClasses.length > 0 && (
            <p className="rrp-nb">N.B.: No data available for the following class(es) in this exam — {missingClasses.join(', ')}.</p>
          )}
        </header>

        {/* 1. GENERAL INFORMATION */}
        <section className="rrp-section">
          <SectionTitle no={1}>General Information</SectionTitle>
          <div className="rrp-info-wrapper">
            <div className="rrp-info-col">
              <div className="rrp-info-item"><span className="rrp-info-label">Exam Name</span><span className="rrp-info-colon">:</span><span className="rrp-info-value">{displayExamName}</span></div>
              <div className="rrp-info-item"><span className="rrp-info-label">Academic Year</span><span className="rrp-info-colon">:</span><span className="rrp-info-value">{examInfo.year || 'N/A'}</span></div>
              <div className="rrp-info-item"><span className="rrp-info-label">Total Examinees</span><span className="rrp-info-colon">:</span><span className="rrp-info-value">{stats.total}</span></div>
              <div className="rrp-info-item"><span className="rrp-info-label">Present Students</span><span className="rrp-info-colon">:</span><span className="rrp-info-value">{stats.present}</span></div>
              <div className="rrp-info-item"><span className="rrp-info-label">Absent Students</span><span className="rrp-info-colon">:</span><span className="rrp-info-value">{stats.absent}</span></div>
            </div>
            <div className="rrp-info-col">
              <div className="rrp-info-item"><span className="rrp-info-label">Passed Students</span><span className="rrp-info-colon">:</span><span className="rrp-info-value">{stats.passed}</span></div>
              <div className="rrp-info-item"><span className="rrp-info-label">Failed Students</span><span className="rrp-info-colon">:</span><span className="rrp-info-value">{stats.failed}</span></div>
              <div className="rrp-info-item"><span className="rrp-info-label">Overall Pass Rate</span><span className="rrp-info-colon">:</span><span className="rrp-info-value">{stats.passRate}%</span></div>
              <div className="rrp-info-item"><span className="rrp-info-label">Overall Fail Rate</span><span className="rrp-info-colon">:</span><span className="rrp-info-value">{stats.failRate}%</span></div>
              <div className="rrp-info-item"><span className="rrp-info-label">Average GPA</span><span className="rrp-info-colon">:</span><span className="rrp-info-value">{stats.avgGpa}</span></div>
            </div>
          </div>
        </section>

        {/* 2. GRADE DISTRIBUTION */}
        <section className="rrp-section">
          <SectionTitle no={2}>Grade Distribution</SectionTitle>
          <div className="rrp-plain-list">
            {Object.entries(gradeDist).map(([grade, count]) => {
              const pct = stats.total ? (count / stats.total) * 100 : 0;
              return (
                <div key={grade} className="rrp-plain-row">
                  <span className="rrp-plain-label">{grade}</span>
                  <span className="rrp-plain-bar"><span className="rrp-plain-bar-fill" style={{ width: `${pct}%` }} /></span>
                  <span className="rrp-plain-value">{count} students ({pct.toFixed(1)}%)</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. CLASS-WISE ANALYSIS */}
        <section className="rrp-section">
          <SectionTitle no={3}>Class-wise Analysis</SectionTitle>
          <table className="rrp-table rrp-zebra">
            <thead>
              <tr>
                <th>Class</th><th className="rrp-num">Total</th><th className="rrp-num">Passed</th>
                <th className="rrp-num">Failed</th><th className="rrp-num">Pass Rate</th>
                <th className="rrp-num">Avg GPA</th><th className="rrp-num">Max GPA</th>
              </tr>
            </thead>
            <tbody>
              {classAnalysis.map((row, idx) => (
                <tr key={idx}>
                  <td className="rrp-strong">{row.cls}</td>
                  <td className="rrp-num">{row.total}</td>
                  <td className="rrp-num">{row.passed}</td>
                  <td className="rrp-num">{row.failed}</td>
                  <td className="rrp-num">{row.passRate}%</td>
                  <td className="rrp-num">{row.avgGpa}</td>
                  <td className="rrp-num">{row.maxGpa}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="rrp-total-row">
                <td className="rrp-strong">Total</td>
                <td className="rrp-num">{stats.total}</td>
                <td className="rrp-num">{stats.passed}</td>
                <td className="rrp-num">{stats.failed}</td>
                <td className="rrp-num">{stats.passRate}%</td>
                <td className="rrp-num">{stats.avgGpa}</td>
                <td className="rrp-num">—</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* --- PAGE BREAK 1 --- */}
        <div className="rrp-page-break"></div>

        {/* 4. EDUCATION LEVEL SUMMARY */}
        {eduLevelStats.length > 0 && (
          <section className="rrp-section">
            <SectionTitle no={4}>Education Level Summary</SectionTitle>
            <table className="rrp-table">
              <thead><tr><th>Level</th><th className="rrp-num">Total</th><th className="rrp-num">Passed</th><th className="rrp-num">Failed</th><th className="rrp-num">Pass Rate</th><th className="rrp-num">Avg GPA</th></tr></thead>
              <tbody>
                {eduLevelStats.map((lvl, idx) => (
                  <tr key={idx}>
                    <td className="rrp-strong">{lvl.label}</td>
                    <td className="rrp-num">{lvl.total}</td>
                    <td className="rrp-num">{lvl.passed}</td>
                    <td className="rrp-num">{lvl.failed}</td>
                    <td className="rrp-num">{lvl.passRate}%</td>
                    <td className="rrp-num">{lvl.avgGpa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 5. COMPARATIVE PERFORMANCE TREND */}
        <section className="rrp-section">
          <SectionTitle no={5}>Comparative Performance Trend (Exam-to-Exam)</SectionTitle>
          <table className="rrp-table rrp-zebra">
            <thead>
              <tr>
                <th>Exam Name</th>
                <th className="rrp-num">Total Examinees</th>
                <th className="rrp-num">Passed</th>
                <th className="rrp-num">Failed</th>
                <th className="rrp-num">Pass Rate</th>
                <th className="rrp-num">Avg GPA</th>
                <th className="rrp-center">Progress</th>
              </tr>
            </thead>
            <tbody>
              {trendTableData.map((row, idx) => (
                <tr key={idx} className={row.isCurrent ? 'rrp-highlight-row' : ''}>
                  <td className="rrp-strong">{row.label} {row.isCurrent && <span className="rrp-muted">(Current)</span>}</td>
                  <td className="rrp-num">{row.total}</td>
                  <td className="rrp-num">{row.passed}</td>
                  <td className="rrp-num">{row.failed}</td>
                  <td className="rrp-num">{row.passRate !== '-' ? `${row.passRate}%` : '-'}</td>
                  <td className="rrp-num">{row.avgGpa}</td>
                  <td className={`rrp-center rrp-strong ${row.progress.includes('▲') ? 'rrp-text-green' : row.progress.includes('▼') ? 'rrp-text-red' : ''}`}>
                    {row.progress}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 6. UNIFIED MATRIX FAIL ANALYSIS */}
        {failMatrix.subjects.length > 0 && (
          <section className="rrp-section">
            <SectionTitle no={6}>Class & Subject-wise Fail Matrix</SectionTitle>
            <table className="rrp-table rrp-zebra">
              <thead>
                <tr>
                  <th>Subject</th>
                  {failMatrix.activeClasses.map(cls => (
                    <th key={cls} className="rrp-center">{cls.replace('Class ', '')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failMatrix.subjects.map(sub => (
                  <tr key={sub}>
                    <td className="rrp-strong">{sub}</td>
                    {failMatrix.activeClasses.map(cls => {
                      const count = failMatrix.subjectMap[sub][cls] || 0;
                      const isHighest = count > 0 && count === failMatrix.classMax[cls];
                      return (
                        <td key={cls} className={`rrp-num rrp-center ${isHighest ? 'rrp-text-red' : ''}`}>
                          {count > 0 ? count : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="rrp-total-row">
                  <td className="rrp-strong">Total Examinees</td>
                  {failMatrix.activeClasses.map(cls => (
                    <td key={cls} className="rrp-num rrp-center rrp-strong">{failMatrix.classTotals[cls]}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </section>
        )}

        {/* --- PAGE BREAK 2 --- */}
        <div className="rrp-page-break"></div>

        {/* 7. SUBJECT-WISE ANALYSIS */}
        <section className="rrp-section">
          <SectionTitle no={7}>Subject-wise Analysis</SectionTitle>
          <table className="rrp-table">
            <thead>
              <tr>
                <th>Subject (Full Marks)</th><th className="rrp-num">Present</th><th className="rrp-num">Passed</th>
                <th className="rrp-num">Failed</th><th className="rrp-num">Pass Rate</th><th className="rrp-num">Avg Marks</th>
              </tr>
            </thead>
            <tbody>
              {subjectAnalysis.map((row, idx) => (
                <tr key={idx}>
                  <td className="rrp-strong">{row.name} <span className="rrp-muted">({row.fullMarks})</span></td>
                  <td className="rrp-num">{row.present}</td>
                  <td className="rrp-num">{row.passed}</td>
                  <td className="rrp-num">{row.failed}</td>
                  <td className="rrp-num">{row.passRate}%</td>
                  <td className="rrp-num">{row.avgMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 8. MULTIPLE-SUBJECT FAILURE ANALYSIS */}
        <section className="rrp-section">
          <SectionTitle no={8}>Multiple Subject Failure Analysis</SectionTitle>
          <div className="rrp-plain-list">
            <div className="rrp-plain-row rrp-plain-row-simple"><span className="rrp-plain-label rrp-plain-label-wide">0 (All Pass)</span><span className="rrp-plain-value">{failAnalysis[0].length} students</span></div>
            {[1, 2, 3, 4, '5+'].map(num => (
              <div key={num} className="rrp-plain-row rrp-plain-row-simple"><span className="rrp-plain-label rrp-plain-label-wide">{num} Failed Subject(s)</span><span className="rrp-plain-value">{failAnalysis[num].length} students</span></div>
            ))}
            <div className="rrp-plain-row rrp-plain-row-simple rrp-plain-row-total"><span className="rrp-plain-label rrp-plain-label-wide">All Subjects Failed</span><span className="rrp-plain-value">{failAnalysis.allSubjects.length} students</span></div>
          </div>
        </section>

        {/* --- PAGE BREAK 3 --- */}
        <div className="rrp-page-break"></div>

        {/* 9. MERIT LIST — TOP 3 */}
        <section className="rrp-section">
          <SectionTitle no={9}>Merit List — Top 3</SectionTitle>
          {meritCategories.map((cat, ci) => (
            <div key={ci} className="rrp-merit-block">
              <div className="rrp-merit-label">{cat.label}</div>
              {cat.list.length === 0 ? (
                <p className="rrp-muted rrp-indent">No data found.</p>
              ) : (
                <table className="rrp-table rrp-sub-table">
                  <thead><tr><th className="rrp-num">Rank</th><th>Name</th><th className="rrp-num">ID</th><th className="rrp-num">Roll</th><th>Class</th><th className="rrp-num">GPA</th><th className="rrp-num">Avg Marks</th></tr></thead>
                  <tbody>
                    {cat.list.map((s, idx) => (
                      <tr key={idx}>
                        <td className="rrp-num rrp-strong">{idx + 1}</td>
                        <td className="rrp-strong">{s.name}</td>
                        <td className="rrp-strong">{s.id}</td>
                        <td className="rrp-num">{s.roll}</td>
                        <td>{s.className}{s.section !== '-' ? ` (${s.section})` : ''}</td>
                        <td className="rrp-num">{s.gpa.toFixed(2)}</td>
                        <td className="rrp-num">{s.averageMarks.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </section>

        {/* --- PAGE BREAK 4 --- */}
        <div className="rrp-page-break"></div>

        {/* 10. CLASS-WISE TOP STUDENTS */}
        <section className="rrp-section">
          <SectionTitle no={10}>Class-wise Top Students</SectionTitle>
          <table className="rrp-table rrp-sub-table">
            <thead><tr><th>Class</th><th className="rrp-num">Rank</th><th>Name</th><th className="rrp-num">Roll</th><th className="rrp-num">GPA</th><th className="rrp-num">Avg Marks</th></tr></thead>
            <tbody>
              {classToppers.map(({ cls, top3 }, ci) => (
                top3.map((s, idx) => (
                  <tr key={`${ci}-${idx}`} className="rrp-class-block">
                    {idx === 0 && <td rowSpan={top3.length} className="rrp-strong rrp-class-cell">{cls}</td>}
                    <td className="rrp-num">{idx + 1}</td>
                    <td className="rrp-strong">{s.name}</td>
                    <td className="rrp-num">{s.roll}</td>
                    <td className="rrp-num">{s.gpa.toFixed(2)}</td>
                    <td className="rrp-num">{s.averageMarks.toFixed(2)}</td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </section>

        {/* 11. GPA 5.00 ACHIEVERS */}
        <section className="rrp-section">
          <SectionTitle no={11} count={gpa5List.length}>GPA 5.00 Achievers</SectionTitle>
          {gpa5List.length === 0 ? (
            <p className="rrp-muted">No student achieved GPA 5.00 in this exam.</p>
          ) : (
            <table className="rrp-table rrp-zebra">
              <thead><tr><th className="rrp-num">#</th><th>Name</th><th>ID</th><th className="rrp-num">Roll</th><th>Class</th></tr></thead>
              <tbody>
                {gpa5List.map((s, idx) => (
                  <tr key={idx}>
                    <td className="rrp-num">{idx + 1}</td>
                    <td className="rrp-strong">{s.name}</td>
                    <td>{s.id}</td>
                    <td className="rrp-num">{s.roll}</td>
                    <td>{s.className}{s.section !== '-' ? ` (${s.section})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 12. FAILED IN ALL SUBJECTS */}
        <section className="rrp-section">
          <SectionTitle no={12} count={allSubjectsFailedList.length}>Failed in All Subjects</SectionTitle>
          {allSubjectsFailedList.length === 0 ? (
            <p className="rrp-muted">No student failed in all subjects in this exam.</p>
          ) : (
            <table className="rrp-table rrp-zebra">
              <thead><tr><th className="rrp-num">#</th><th>Name</th><th className="rrp-num">Roll</th><th>ID</th><th>Class</th></tr></thead>
              <tbody>
                {allSubjectsFailedList.map((s, idx) => (
                  <tr key={idx}>
                    <td className="rrp-num">{idx + 1}</td>
                    <td className="rrp-strong">{s.name}</td>
                    <td className="rrp-num">{s.roll}</td>
                    <td>{s.id}</td>
                    <td>{s.className}{s.section !== '-' ? ` (${s.section})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 13. ABSENT STUDENTS */}
        <section className="rrp-section">
          <SectionTitle no={13} count={absentList.length}>Absent Students</SectionTitle>
          {absentList.length === 0 ? (
            <p className="rrp-muted">No absent students in this exam.</p>
          ) : (
            <table className="rrp-table rrp-zebra">
              <thead><tr><th className="rrp-num">#</th><th>Name</th><th>ID</th><th className="rrp-num">Roll</th><th>Class</th></tr></thead>
              <tbody>
                {absentList.map((s, idx) => (
                  <tr key={idx}>
                    <td className="rrp-num">{idx + 1}</td>
                    <td className="rrp-strong">{s.name}</td>
                    <td>{s.id}</td>
                    <td className="rrp-num">{s.roll}</td>
                    <td>{s.className}{s.section !== '-' ? ` (${s.section})` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* SIGNATURE BLOCK */}
        <div className="rrp-signatures">
          <div className="rrp-sig"><div className="rrp-sig-space" />Prepared By</div>
          <div className="rrp-sig"><div className="rrp-sig-space" />Result Controller</div>
          <div className="rrp-sig"><div className="rrp-sig-space" />Superintendent</div>
        </div>

      </div>

      {/* STYLES */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap');

        .rrp-root { background: #e5e5e5; min-height: 100vh; padding: 24px 0 60px; }
        .rrp-root, .rrp-root * { box-sizing: border-box; }

        .rrp-toolbar { max-width: 210mm; margin: 0 auto 16px; padding: 0 12px; display: flex; gap: 10px; justify-content: flex-end; }
        .rrp-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 6px; border: 1px solid #000; background: #fff; color: #000; font-weight: 700; font-size: 12.5px; cursor: pointer; font-family: 'JetBrains Mono', monospace; }
        .rrp-btn-primary { background: #000; color: #fff; }

        .rrp-empty { padding: 60px 20px; text-align: center; font-weight: 700; color: #333; font-family: 'JetBrains Mono', monospace; }

        .rrp-page {
          max-width: 210mm;
          margin: 0 auto;
          background: #fff;
          padding: 16mm 14mm;
          box-shadow: 0 0 0 1px #ccc, 0 8px 30px rgba(0,0,0,0.15);
          color: #000;
          font-family: 'JetBrains Mono', 'Noto Sans Bengali', monospace;
          font-size: 12px;
          line-height: 1.55;
        }

        .rrp-letterhead { text-align: center; margin-bottom: 18px; }
        .rrp-madrasa-name { font-weight: 800; font-size: 22px; letter-spacing: 0.5px; text-transform: uppercase; }
        .rrp-address { font-family: 'Noto Sans Bengali', sans-serif; font-weight: 600; font-size: 11px; color: #333; margin-top: 2px; }
        .rrp-rule { border-top: 2px solid #000; margin: 8px 0 6px; }
        .rrp-report-title { font-weight: 700; font-size: 14.5px; margin-top: 4px; }
        .rrp-exam-line { font-size: 11.5px; margin-top: 4px; font-weight: 600; }
        .rrp-generated { font-size: 10px; color: #444; margin-top: 3px; }
        .rrp-prepared-by { font-size: 11px; font-weight: 600; color: #000; margin-top: 3px; }
        .rrp-nb { font-size: 10px; color: #333; font-style: italic; margin-top: 6px; }

        .rrp-section { margin-top: 20px; }
        .rrp-section-title { font-weight: 700; font-size: 12.5px; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 9px; break-after: avoid-page; }

        .rrp-info-wrapper { display: flex; justify-content: space-between; gap: 40px; padding: 4px 8px; }
        .rrp-info-col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .rrp-info-item { display: flex; align-items: baseline; font-size: 12.5px; line-height: 1.6; }
        .rrp-info-label { width: 140px; flex-shrink: 0; color: #333; font-weight: 600; }
        .rrp-info-colon { width: 15px; flex-shrink: 0; font-weight: 600; color: #333; text-align: center; }
        .rrp-info-value { flex: 1; font-weight: 800; color: #111; }

        .rrp-plain-list { display: flex; flex-direction: column; gap: 4px; }
        .rrp-plain-row { display: flex; align-items: center; gap: 10px; font-size: 11.5px; }
        .rrp-plain-label { width: 34px; flex-shrink: 0; font-weight: 700; }
        .rrp-plain-label-wide { width: 150px; font-weight: 500; }
        .rrp-plain-bar { flex: 1; height: 8px; border: 1px solid #000; background: #fff; }
        .rrp-plain-bar-fill { display: block; height: 100%; background: #000; }
        .rrp-plain-value { width: 150px; flex-shrink: 0; text-align: right; }
        .rrp-plain-row-simple { border-bottom: 1px dotted #bbb; padding-bottom: 4px; }
        .rrp-plain-row-total { border-top: 1.5px solid #000; border-bottom: none; padding-top: 6px; margin-top: 2px; font-weight: 700; }

        /* TABLE BORDER FIX FOR PRINT */
        .rrp-table { width: 99.8%; max-width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000; }
        .rrp-table th, .rrp-table td { border: 1px solid #000; padding: 5px 8px; text-align: left; vertical-align: middle; }
        .rrp-table thead { display: table-header-group; }
        .rrp-table tfoot { display: table-footer-group; }
        .rrp-table tr { break-inside: avoid; }
        .rrp-table th { background: #eee; font-weight: 700; font-size: 10.5px; }
        
        .rrp-zebra tbody tr:nth-child(even) { background: #f5f5f5; }
        .rrp-num { text-align: right; font-variant-numeric: tabular-nums; }
        .rrp-center { text-align: center !important; }
        .rrp-strong { font-weight: 700; }
        .rrp-muted { color: #444; font-size: 10.5px; }
        .rrp-indent { padding-left: 2px; }
        .rrp-text-red { color: #dc2626 !important; font-weight: 800; font-size: 12px; }
        .rrp-text-green { color: #16a34a !important; font-weight: 800; font-size: 12px; }
        .rrp-highlight-row { background-color: #f0fdf4 !important; }
        .rrp-total-row td { border-top: 2px solid #000; background: #eee; }

        .rrp-merit-block { margin-bottom: 14px; break-inside: avoid; }
        .rrp-merit-label { font-weight: 700; font-size: 11px; background: #eee; border: 1px solid #000; border-bottom: none; padding: 5px 8px; }
        .rrp-sub-table { margin-top: 0; }
        .rrp-class-cell { vertical-align: top; background: #f5f5f5; }
        .rrp-class-block { break-inside: avoid; }
        
        /* PAGE BREAK CLASS */
        .rrp-page-break { break-before: page; page-break-before: always; margin-top: 20px; }

        /* SIGNATURES UPDATE */
        .rrp-signatures { display: flex; justify-content: space-between; margin-top: 60px; break-inside: avoid; }
        .rrp-sig { width: 30%; text-align: center; font-size: 11px; font-weight: 700; color: #222; }
        .rrp-sig-space { margin-bottom: 8px; height: 32px; }

        @page { size: A4; margin: 14mm 12mm; }
        @media print {
          .rrp-toolbar { display: none !important; }
          .rrp-root { background: #fff; padding: 0; }
          .rrp-page { box-shadow: none; max-width: none; margin: 0; padding: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />
    </div>
  );
}
