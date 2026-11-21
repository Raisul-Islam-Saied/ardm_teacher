import { useState } from 'react';
import { X, Plus, Trash2, Printer, List, Table as TableIcon, Check, ArrowUp, ArrowDown } from 'lucide-react';

// ── HELPERS (হুবহু মূল HTML অ্যাপের লজিক অনুযায়ী) ──
const e2b = (num) => String(num).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);

const guessGender = (student) => {
  const g = student.Gender || student.gender || '';
  const str = g.toString().toLowerCase().trim();
  if (['male', 'm', 'ছেলে', 'ছাত্র', 'বালক'].includes(str)) return 'ছাত্র';
  if (['female', 'f', 'মেয়ে', 'ছাত্রী', 'বালিকা'].includes(str)) return 'ছাত্রী';
  return 'অজানা';
};

const calculateAge = (dobStr) => {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const ageDifMs = Date.now() - dob.getTime();
  const ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
};

// টেবিল কলাম সিলেক্টর অপশন (মূল fieldOptions অনুযায়ী, ফিল্ড-নেম React অ্যাপের ডাটা অনুযায়ী)
const FIELD_OPTIONS = [
  { val: 'serial', text: 'ক্রমিক নং' },
  { val: 'StudentNameBn', text: 'নাম (বাংলা)' },
  { val: 'ID', text: 'আইডি (ID)' },
  { val: 'Roll', text: 'রোল (Roll)' },
  { val: 'ClassBn', text: 'শ্রেণি (Class)' },
  { val: 'FatherNameBn', text: 'পিতার নাম (বাংলা)' },
  { val: 'MotherNameBn', text: 'মাতার নাম (বাংলা)' },
  { val: 'address', text: 'ঠিকানা (সম্পূর্ণ)' },
  { val: 'WhatsApp', text: 'মোবাইল নম্বর' },
  { val: 'age', text: 'বয়স (Age)' },
  { val: 'DOB', text: 'জন্ম তারিখ' },
  { val: 'BRN', text: 'জন্ম নিবন্ধন (BRN)' },
  { val: 'gender', text: 'লিঙ্গ (Gender)' },
  { val: 'BloodGroup', text: 'রক্তের গ্রুপ' },
  { val: 'Session', text: 'সেশন (Session)' },
  { val: 'StudentNameEn', text: 'নাম (ইংরেজি)' },
  { val: 'FatherNameEn', text: 'পিতার নাম (ইংরেজি)' },
  { val: 'MotherNameEn', text: 'মাতার নাম (ইংরেজি)' },
  { val: 'EmergencyNo', text: 'জরুরি নম্বর' },
];

const PLAIN_FIELD_LABELS = {
  serial: 'সিরিয়াল', StudentNameBn: 'নাম', ID: 'আইডি', Roll: 'রোল', ClassBn: 'শ্রেণি',
  FatherNameBn: 'পিতা', MotherNameBn: 'মাতা', address: 'ঠিকানা', WhatsApp: 'মোবাইল',
  age: 'বয়স', DOB: 'জন্ম তারিখ', BRN: 'জন্ম নিবন্ধন', gender: 'লিঙ্গ', BloodGroup: 'রক্তের গ্রুপ',
  Session: 'সেশন', StudentNameEn: 'নাম (Eng)', FatherNameEn: 'পিতা (Eng)', MotherNameEn: 'মাতা (Eng)', EmergencyNo: 'জরুরি নম্বর'
};

let colIdCounter = 4;
let plainFieldIdCounter = 2;

const TITLE_HISTORY_KEY = 'pdfExport_titleHistory';
const SUBTITLE_HISTORY_KEY = 'pdfExport_subtitleHistory';

/**
 * Advanced PDF Export Modal
 * props:
 *  - isOpen: boolean
 *  - onClose: fn
 *  - data: array of student objects to export (আপনার filteredList / getFilteredData() পাঠাবেন)
 *  - appName: string (CONFIG.APP_NAME)
 */
const PdfExportModal = ({ isOpen, onClose, data, appName }) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [format, setFormat] = useState('table');
  const [tableColumns, setTableColumns] = useState([
    { id: 'col1', type: 'data', field: 'serial', label: 'ক্র.নং', width: '10', default: '' },
    { id: 'col2', type: 'data', field: 'StudentNameBn', label: 'শিক্ষার্থীর নাম', width: '40', default: '' },
    { id: 'col3', type: 'data', field: 'Roll', label: 'রোল', width: '15', default: '' },
    { id: 'col4', type: 'data', field: 'ID', label: 'আইডি', width: '35', default: '' },
  ]);
  const [rowHeight, setRowHeight] = useState('py-2');
  const [groupBy, setGroupBy] = useState('');
  const [plainCols, setPlainCols] = useState(3);
  const [separator, setSeparator] = useState(' - ');
  // প্রতিটা আইটেম: { id, field, prefix } — prefix হলো কাস্টম লেবেল, যেমন "রোল: "
  const [plainFieldsOrder, setPlainFieldsOrder] = useState([
    { id: 'pf1', field: 'Roll', prefix: '' },
    { id: 'pf2', field: 'StudentNameBn', prefix: '' },
  ]);
  const [showFooter, setShowFooter] = useState(true);
  const [titleHistory, setTitleHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TITLE_HISTORY_KEY)) || []; } catch { return []; }
  });
  const [subtitleHistory, setSubtitleHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SUBTITLE_HISTORY_KEY)) || []; } catch { return []; }
  });
  const [generating, setGenerating] = useState(false);

  const saveToHistory = (key, value, historyArr, setHistoryArr) => {
    const v = (value || '').trim();
    if (!v) return;
    const updated = [v, ...historyArr.filter(h => h !== v)].slice(0, 12);
    setHistoryArr(updated);
    try { localStorage.setItem(key, JSON.stringify(updated)); } catch {}
  };

  if (!isOpen) return null;

  const totalWidth = tableColumns.reduce((sum, c) => sum + (parseInt(c.width) || 0), 0);
  const widthColor = totalWidth === 100 ? 'text-emerald-600' : totalWidth > 100 ? 'text-red-500' : 'text-orange-500';

  const updateCol = (index, key, value) => {
    setTableColumns(prev => prev.map((c, i) => (i === index ? { ...c, [key]: value } : c)));
  };

  const removeCol = (index) => setTableColumns(prev => prev.filter((_, i) => i !== index));

  const addCol = (type) => {
    colIdCounter++;
    setTableColumns(prev => [...prev, {
      id: 'col' + colIdCounter,
      type,
      field: type === 'data' ? 'StudentNameBn' : '',
      label: type === 'data' ? 'নতুন কলাম' : 'ফাঁকা কলাম',
      width: '15',
      default: ''
    }]);
  };

  const addPlainField = (val) => {
    if (!val) return;
    setPlainFieldsOrder(prev => {
      if (prev.some(item => item.field === val)) return prev;
      plainFieldIdCounter++;
      return [...prev, { id: 'pf' + plainFieldIdCounter, field: val, prefix: '' }];
    });
  };
  const removePlainField = (index) => setPlainFieldsOrder(prev => prev.filter((_, i) => i !== index));
  const updatePlainFieldPrefix = (index, prefix) => {
    setPlainFieldsOrder(prev => prev.map((item, i) => (i === index ? { ...item, prefix } : item)));
  };
  const moveField = (index, direction) => {
    setPlainFieldsOrder(prev => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  };

  // ── টেবিল-ভিউ এর জন্য সেল ভ্যালু (মূল generateSuperPDF -> table branch অনুযায়ী) ──
  const getFieldValueForTable = (s, field, index) => {
    if (field === 'serial') return e2b(index + 1);
    if (field === 'gender') return e2b(guessGender(s));
    if (field === 'address') {
      const val = [s.HouseNameBn, s.VillageBn, s.WardNo ? 'ওয়ার্ড: ' + e2b(s.WardNo) : '', s.UnionBn, s.UpazilaBn, s.DistrictBn].filter(Boolean).join(', ');
      return e2b(val || '-');
    }
    if (field === 'age') {
      const a = calculateAge(s.DOB);
      return e2b(a !== null ? a + ' বছর' : '-');
    }
    if (field === 'DOB') {
      return e2b(s.DOB ? new Date(s.DOB).toLocaleDateString('bn-BD') : '-');
    }
    return e2b(s[field] || '-');
  };

  const generateSuperPDF = () => {
    if (!data || data.length === 0) return;
    setGenerating(true);

    saveToHistory(TITLE_HISTORY_KEY, title, titleHistory, setTitleHistory);
    saveToHistory(SUBTITLE_HISTORY_KEY, subtitle, subtitleHistory, setSubtitleHistory);

    const dataToExport = data;
    const finalTitle = e2b(title).replace(/(\/n|\\n)/g, '<br>');
    const finalSubtitle = e2b(subtitle).replace(/(\/n|\\n)/g, '<br>');

    // ── স্টাইল হুবহু মূল HTML অ্যাপের মতোই ──
    let htmlContent = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;600;700;800&family=Noto+Serif+Bengali:wght@500;600;700&display=swap');
        .pdf-body { font-family: 'Noto Serif Bengali', serif; padding: 0; color: #000; background: white; }
        .hp-header { text-align: center; padding-bottom: 20px; padding-top: 5px; }
        .hp-hall-no { font-family: 'Anek Bangla', sans-serif; font-size: 30px; font-weight: 800; color: #000; margin: 0; line-height: 1; }
        .hp-exam { font-family: 'Noto Serif Bengali', 'Anek Bangla', sans-serif; font-size: 22px; font-weight: 700; color: #222; margin-top: 10px; }
        .hp-class-section { margin-bottom: 20px; }
        .hp-class-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 8px; page-break-after: avoid; }
        .hp-class-name { font-family: 'Noto Serif Bengali', 'Anek Bangla', sans-serif; font-size: 20px; font-weight: 800; color: #000; }
        .hp-class-stats { font-family: 'Noto Serif Bengali', 'Anek Bangla', sans-serif; font-size: 18px; font-weight: 600; color: #222; }
        .hp-grid { column-gap: 10px; }
        .hp-item { display: flex; align-items: baseline; gap: 5px; padding: 3px 0; font-size: 16px; page-break-inside: avoid; }
        .hp-serial { flex-shrink: 0; min-width: 35px; font-weight: 700; font-family: 'Noto Serif Bengali', monospace; }
        .hp-roll { flex-shrink: 0; min-width: 35px; font-weight: 700; font-family: 'Noto Serif Bengali', monospace; }
        .hp-name { flex-grow: 1; font-weight: 600; line-height: 1.3; white-space: normal; word-wrap: break-word; }
        .hp-footer-summary { margin-top: 25px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px; text-align: center; page-break-inside: avoid; }
        .hp-total-text { font-family: 'Noto Serif Bengali', 'Anek Bangla', sans-serif; font-size: 20px; font-weight: 800; color: #000; margin-bottom: 2px; }
        .hp-total-sub { font-family: 'Noto Serif Bengali', 'Anek Bangla', sans-serif; font-size: 16px; font-weight: 600; color: #333; }
        .official-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: 'Noto Serif Bengali', serif; }
        .official-table th { background-color: #f1f5f9 !important; border: 1.5px solid #000; padding: 10px 8px; font-size: 16px; font-weight: 800; color: #000; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .official-table td { border: 1.5px solid #000; font-size: 16px; font-weight: 600; color: #111; vertical-align: middle; }
        .official-table tr:nth-child(even) td { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { margin: 15mm; }
      </style>
      <div class="pdf-body">
    `;

    if (format === 'table') {
      htmlContent += `
        ${finalTitle ? `<h1 style="text-align: center; font-size: 26px; font-family: 'Anek Bangla', sans-serif; font-weight: 800; margin-bottom: ${finalSubtitle ? '5px' : '10px'}; color: #000;">${finalTitle}</h1>` : ''}
        ${finalSubtitle ? `<h2 style="text-align: center; font-size: 18px; font-family: 'Noto Serif Bengali', serif; font-weight: 600; margin-bottom: 15px; color: #333;">${finalSubtitle}</h2>` : ''}
      `;

      const pd = rowHeight === 'py-1' ? '6px 8px' : rowHeight === 'py-4' ? '14px 8px' : '10px 8px';

      let totalBoysAll = 0, totalGirlsAll = 0;
      dataToExport.forEach(s => {
        const g = guessGender(s);
        if (g === 'ছাত্র') totalBoysAll++;
        if (g === 'ছাত্রী') totalGirlsAll++;
      });

      htmlContent += `<table class="official-table"><thead><tr>`;
      tableColumns.forEach(col => {
        const align = (col.field === 'serial' || col.field === 'Roll' || col.type === 'blank') ? 'center' : 'left';
        htmlContent += `<th style="width: ${col.width}%; text-align: ${align};">${e2b(col.label)}</th>`;
      });
      htmlContent += `</tr></thead><tbody>`;

      dataToExport.forEach((s, index) => {
        htmlContent += `<tr>`;
        tableColumns.forEach(col => {
          const align = (col.field === 'serial' || col.field === 'Roll' || col.type === 'blank') ? 'center' : 'left';
          let cellData = '';
          if (col.type === 'blank') {
            cellData = e2b(col.default || '');
          } else {
            cellData = getFieldValueForTable(s, col.field, index);
          }
          htmlContent += `<td style="padding: ${pd}; text-align: ${align};">${cellData}</td>`;
        });
        htmlContent += `</tr>`;
      });

      htmlContent += `</tbody></table>`;
      if (showFooter) {
        htmlContent += `
        <div class="hp-footer-summary">
          <div class="hp-total-text">সর্বমোট শিক্ষার্থী: ${e2b(dataToExport.length)} জন</div>
          <div class="hp-total-sub">মোট ছাত্র: ${e2b(totalBoysAll)} জন | মোট ছাত্রী: ${e2b(totalGirlsAll)} জন</div>
        </div>`;
      }
    } else {
      // ── প্লেন ভিউ (হুবহু মূল লজিক) ──
      const cols = parseInt(plainCols) || 3;

      if (finalTitle || finalSubtitle) {
        htmlContent += `<div class="hp-header">`;
        if (finalTitle) htmlContent += `<div class="hp-hall-no">${finalTitle}</div>`;
        if (finalSubtitle) htmlContent += `<div class="hp-exam">${finalSubtitle}</div>`;
        htmlContent += `</div>`;
      }

      let groupedData = {};
      if (groupBy) {
        dataToExport.forEach(s => {
          let keyVal = 'অন্যান্য';
          if (groupBy === 'age') {
            const age = calculateAge(s.DOB);
            keyVal = age !== null ? age : 'অজানা';
          } else if (groupBy === 'gender') {
            keyVal = guessGender(s);
          } else {
            const val = s[groupBy];
            keyVal = (val === undefined || val === null || val === '') ? (groupBy === 'BloodGroup' ? 'গ্রুপ অজানা' : 'অন্যান্য') : val;
          }
          if (!groupedData[keyVal]) groupedData[keyVal] = [];
          groupedData[keyVal].push(s);
        });
      } else {
        groupedData['All'] = dataToExport;
      }

      let sortedKeys = Object.keys(groupedData);
      if (groupBy === 'age') {
        sortedKeys.sort((a, b) => {
          if (a === 'অজানা') return 1;
          if (b === 'অজানা') return -1;
          return parseInt(a) - parseInt(b);
        });
      }

      const hasSerial = plainFieldsOrder.some(item => item.field === 'serial');

      sortedKeys.forEach(groupName => {
        const groupStudents = groupedData[groupName];
        htmlContent += `<div class="hp-class-section">`;

        if (groupBy) {
          let boysCount = 0, girlsCount = 0;
          groupStudents.forEach(s => {
            const g = guessGender(s);
            if (g === 'ছাত্র') boysCount++;
            if (g === 'ছাত্রী') girlsCount++;
          });
          const genderText = (boysCount > 0 || girlsCount > 0) ? `(ছাত্র: ${e2b(boysCount)} জন | ছাত্রী: ${e2b(girlsCount)} জন)` : '';
          let displayGroupName = e2b(groupName);
          if (groupBy === 'ClassBn') displayGroupName += ' শ্রেণি';
          else if (groupBy === 'age' && groupName !== 'অজানা') displayGroupName = `বয়স ${displayGroupName}`;

          htmlContent += `
            <div class="hp-class-header">
              <div class="hp-class-name">${displayGroupName} - ${e2b(groupStudents.length)} জন</div>
              <div class="hp-class-stats">${genderText}</div>
            </div>
          `;
        }

        htmlContent += `<div class="hp-grid" style="column-count: ${cols};">`;

        let serialCount = 1;
        groupStudents.forEach(s => {
          let prefixHtml = '';
          let mainParts = [];

          plainFieldsOrder.forEach(item => {
            const f = item.field;
            let val = '';
            if (f === 'serial') val = e2b(serialCount) + '.';
            else if (f === 'gender') val = guessGender(s);
            else if (f === 'address') {
              val = [s.HouseNameBn, s.VillageBn, s.WardNo ? 'ওয়ার্ড: ' + e2b(s.WardNo) : '', s.UnionBn, s.UpazilaBn, s.DistrictBn].filter(Boolean).join(', ');
            } else if (f === 'age') {
              const a = calculateAge(s.DOB);
              val = a !== null ? e2b(a) + ' বছর' : '';
            } else if (f === 'DOB') {
              val = s.DOB ? e2b(new Date(s.DOB).toLocaleDateString('bn-BD')) : '';
            } else {
              val = s[f] || '';
            }

            if (val) {
              val = (f !== 'serial') ? e2b(val) : val;
              const customPrefix = item.prefix ? e2b(item.prefix) : '';

              if (f === 'serial') {
                prefixHtml += `<span class="hp-serial">${customPrefix}${val}</span>`;
              } else if (!mainParts.length && !hasSerial && !prefixHtml) {
                // প্রথম ফিল্ড (যখন সিরিয়াল নেই) — বোল্ড প্রিফিক্স স্টাইলে দেখানো হবে
                prefixHtml += `<span class="hp-roll">${customPrefix}${val}${separator}</span>`;
              } else {
                mainParts.push(`${customPrefix}${val}`);
              }
            }
          });

          const mainHtml = mainParts.join(separator);
          htmlContent += `<div class="hp-item">${prefixHtml}<span class="hp-name">${mainHtml}</span></div>`;
          serialCount++;
        });

        htmlContent += `</div></div>`;
      });

      let totalBoysAll = 0, totalGirlsAll = 0;
      dataToExport.forEach(s => {
        const g = guessGender(s);
        if (g === 'ছাত্র') totalBoysAll++;
        if (g === 'ছাত্রী') totalGirlsAll++;
      });

      if (showFooter) {
        htmlContent += `
        <div class="hp-footer-summary">
          <div class="hp-total-text">এই লিস্টে মোট শিক্ষার্থী: ${e2b(dataToExport.length)} জন</div>
          <div class="hp-total-sub">মোট ছাত্র: ${e2b(totalBoysAll)} জন | মোট ছাত্রী: ${e2b(totalGirlsAll)} জন</div>
        </div>
      `;
      }
    }

    htmlContent += `</div>`;

    let fileName = subtitle.trim() || title.trim();
    fileName = fileName ? fileName.replace(/(\/n|\\n)/g, ' ').replace(/\s+/g, ' ').trim() : (appName ? `${appName}_Report` : 'Student_Report');

    const w = window.open('', '_blank');
    w.document.write(`
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${fileName}</title>
        </head>
        <body>${htmlContent}</body>
      </html>
    `);
    w.document.close();

    setTimeout(() => {
      w.focus();
      w.print();
      setGenerating(false);
      onClose();
    }, 700);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-50 rounded-[24px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative">

        <div className="px-6 py-4 bg-white rounded-t-[24px] border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Printer size={20} className="text-red-500" /> অ্যাডভান্সড PDF এক্সপোর্ট
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">A4 পেজ সাইজে কাস্টমাইজড রিপোর্ট তৈরি করুন</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-indigo-600 mb-3">হেডলাইন্স (ঐচ্ছিক)</h3>
            <div className="space-y-3">
              <input
                type="text"
                list="pdf-title-suggestions"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => saveToHistory(TITLE_HISTORY_KEY, title, titleHistory, setTitleHistory)}
                placeholder="প্রধান শিরোনাম (যেমন: বার্ষিক পরীক্ষার ফলাফল)"
                className="w-full bg-slate-50 text-slate-700 text-sm rounded-xl py-2.5 px-4 border border-slate-200 focus:border-indigo-400 focus:bg-white transition-all outline-none font-bold"
              />
              <datalist id="pdf-title-suggestions">
                {titleHistory.map((t, i) => <option key={i} value={t} />)}
              </datalist>
              <input
                type="text"
                list="pdf-subtitle-suggestions"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                onBlur={() => saveToHistory(SUBTITLE_HISTORY_KEY, subtitle, subtitleHistory, setSubtitleHistory)}
                placeholder="সাব-টাইটেল (যেমন: শ্রেণি: ৬ষ্ঠ, বিষয়: গণিত)"
                className="w-full bg-slate-50 text-slate-700 text-sm rounded-xl py-2.5 px-4 border border-slate-200 focus:border-indigo-400 focus:bg-white transition-all outline-none"
              />
              <datalist id="pdf-subtitle-suggestions">
                {subtitleHistory.map((t, i) => <option key={i} value={t} />)}
              </datalist>
              {(titleHistory.length > 0 || subtitleHistory.length > 0) && (
                <p className="text-[10px] text-slate-400 font-medium">💡 ইনপুট বক্সে ক্লিক করলে আগের লেখাগুলো সাজেশনে দেখাবে</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">রিপোর্টের ধরন নির্বাচন করুন:</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormat('table')}
                className={`border-2 rounded-2xl p-4 text-center relative overflow-hidden ${format === 'table' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
              >
                {format === 'table' && <div className="absolute top-2 right-2 text-indigo-600"><Check size={18} /></div>}
                <TableIcon size={30} className={`mx-auto mb-2 ${format === 'table' ? 'text-indigo-500' : 'text-slate-400'}`} />
                <h4 className={`font-bold ${format === 'table' ? 'text-slate-800' : 'text-slate-600'}`}>টেবিল ভিউ</h4>
                <p className="text-[10px] text-slate-500 mt-1">কাস্টম কলাম ও রো-হাইট</p>
              </button>
              <button
                onClick={() => setFormat('plain')}
                className={`border-2 rounded-2xl p-4 text-center relative overflow-hidden ${format === 'plain' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
              >
                {format === 'plain' && <div className="absolute top-2 right-2 text-indigo-600"><Check size={18} /></div>}
                <List size={30} className={`mx-auto mb-2 ${format === 'plain' ? 'text-indigo-500' : 'text-slate-400'}`} />
                <h4 className={`font-bold ${format === 'plain' ? 'text-slate-800' : 'text-slate-600'}`}>প্লেন ভিউ</h4>
                <p className="text-[10px] text-slate-500 mt-1">গ্রুপিং ও কলাম অপশন</p>
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-700">ফুটার সামারি দেখান</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">মোট শিক্ষার্থী + ছাত্র/ছাত্রী সংখ্যা নিচে দেখাবে</p>
            </div>
            <button
              onClick={() => setShowFooter(v => !v)}
              className={`relative w-12 h-6 rounded-full shrink-0 transition-colors ${showFooter ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showFooter ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {format === 'table' ? (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-indigo-600">
                  কলাম সেটিং (<span className={`${widthColor} font-extrabold`}>{e2b(totalWidth)}%</span> - ১০০%)
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => addCol('data')} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1.5 rounded-lg font-bold hover:bg-indigo-100 active:scale-95 flex items-center gap-1">
                    <Plus size={12} /> ডেটা কলাম
                  </button>
                  <button onClick={() => addCol('blank')} className="text-xs bg-slate-100 text-slate-600 px-2 py-1.5 rounded-lg font-bold hover:bg-slate-200 active:scale-95 flex items-center gap-1">
                    <Plus size={12} /> ফাঁকা কলাম
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4 max-h-[200px] overflow-y-auto pr-1">
                {tableColumns.map((col, index) => (
                  <div key={col.id} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={col.label}
                        onChange={e => updateCol(index, 'label', e.target.value)}
                        placeholder="কলামের নাম (প্রিন্টে যা দেখাবে)"
                        className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 outline-none font-bold text-slate-800 focus:border-indigo-500"
                      />
                      {col.type === 'data' ? (
                        <select
                          value={col.field}
                          onChange={e => updateCol(index, 'field', e.target.value)}
                          className="w-full bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-700 mt-1 px-2 py-1.5 rounded outline-none font-bold cursor-pointer"
                        >
                          {FIELD_OPTIONS.map(opt => <option key={opt.val} value={opt.val}>{opt.text}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={col.default}
                          onChange={e => updateCol(index, 'default', e.target.value)}
                          placeholder="ডিফল্ট ভ্যালু (যেমন: স্বাক্ষর)"
                          className="w-full bg-white border border-slate-200 mt-1 rounded text-[11px] px-2 py-1.5 outline-none text-slate-500"
                        />
                      )}
                    </div>
                    <div className="w-16">
                      <div className="relative">
                        <input
                          type="number"
                          value={col.width}
                          onChange={e => updateCol(index, 'width', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 outline-none pr-5 text-center font-bold focus:border-indigo-500"
                        />
                        <span className="absolute right-1.5 top-1.5 text-xs text-slate-400">%</span>
                      </div>
                    </div>
                    <button onClick={() => removeCol(index)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-sm shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-600">রো (Row) এর সাইজ:</span>
                <select value={rowHeight} onChange={e => setRowHeight(e.target.value)} className="bg-white border border-slate-300 text-xs rounded-lg px-3 py-1.5 outline-none text-slate-700 font-medium">
                  <option value="py-1">চিকন (Small)</option>
                  <option value="py-2">মাঝারি (Medium)</option>
                  <option value="py-4">চওড়া (Large)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-indigo-600 mb-2">স্মার্ট গ্রুপিং</h3>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-indigo-400 font-medium">
                  <option value="">কোনো গ্রুপ নয় (সব একসাথে)</option>
                  <option value="ClassBn">শ্রেণী (Class) অনুযায়ী</option>
                  <option value="gender">লিঙ্গ (Gender) অনুযায়ী</option>
                  <option value="age">বয়স অনুযায়ী</option>
                  <option value="BloodGroup">ব্লাড গ্রুপ অনুযায়ী</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-600 mb-1">কলাম সংখ্যা</h3>
                  <input type="number" value={plainCols} min="1" max="6" onChange={e => setPlainCols(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-center font-bold" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-600 mb-1">তথ্য বিভাজন (Separator)</h3>
                  <input type="text" value={separator} onChange={e => setSeparator(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-center font-bold" />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-600 mb-2">কী কী তথ্য দেখাবেন? (প্রতিটার আগে চাইলে কাস্টম লেবেল/প্রিফিক্স দিন)</h3>
                <div className="space-y-2 mb-3">
                  {plainFieldsOrder.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-2 shadow-sm">
                      <div className="flex flex-col shrink-0">
                        <button
                          onClick={() => moveField(index, -1)}
                          disabled={index === 0}
                          className="w-5 h-4 flex items-center justify-center text-indigo-500 disabled:text-slate-300 disabled:cursor-not-allowed"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          onClick={() => moveField(index, 1)}
                          disabled={index === plainFieldsOrder.length - 1}
                          className="w-5 h-4 flex items-center justify-center text-indigo-500 disabled:text-slate-300 disabled:cursor-not-allowed"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                      <span className="shrink-0 w-6 h-6 rounded-lg bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="shrink-0 text-xs font-bold text-indigo-700 bg-white px-2 py-1.5 rounded-lg border border-indigo-100 whitespace-nowrap">
                        {PLAIN_FIELD_LABELS[item.field] || item.field}
                      </span>
                      <input
                        type="text"
                        value={item.prefix}
                        onChange={e => updatePlainFieldPrefix(index, e.target.value)}
                        placeholder="কাস্টম প্রিফিক্স... (যেমন: রোল: )"
                        className="flex-1 min-w-0 bg-white border border-indigo-100 rounded-lg text-xs px-2 py-1.5 outline-none font-bold text-slate-700 focus:border-indigo-400"
                      />
                      <button onClick={() => removePlainField(index)} className="shrink-0 text-red-400 hover:text-white hover:bg-red-500 w-7 h-7 rounded-lg flex items-center justify-center transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <select
                  value=""
                  onChange={e => { addPlainField(e.target.value); e.target.value = ''; }}
                  className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-4 py-2.5 outline-none font-bold focus:border-indigo-400 text-slate-700"
                >
                  <option value="">+ নতুন তথ্য যুক্ত করুন</option>
                  <option value="serial">ক্রমিক নং (১. ২.)</option>
                  <option value="StudentNameBn">নাম (বাংলা)</option>
                  <option value="ID">আইডি (ID)</option>
                  <option value="Roll">রোল (Roll)</option>
                  <option value="ClassBn">শ্রেণি</option>
                  <option value="FatherNameBn">পিতার নাম (বাংলা)</option>
                  <option value="MotherNameBn">মাতার নাম (বাংলা)</option>
                  <option value="address">ঠিকানা (সম্পূর্ণ)</option>
                  <option value="WhatsApp">মোবাইল নম্বর</option>
                  <option value="age">বয়স</option>
                  <option value="DOB">জন্ম তারিখ</option>
                  <option value="BRN">জন্ম নিবন্ধন (BRN)</option>
                  <option value="gender">লিঙ্গ</option>
                  <option value="BloodGroup">রক্তের গ্রুপ</option>
                  <option value="Session">সেশন</option>
                  <option value="StudentNameEn">নাম (ইংরেজি)</option>
                  <option value="FatherNameEn">পিতার নাম (ইংরেজি)</option>
                  <option value="MotherNameEn">মাতার নাম (ইংরেজি)</option>
                  <option value="EmergencyNo">জরুরি নম্বর</option>
                </select>
              </div>
            </div>
          )}

        </div>

        <div className="px-6 py-4 bg-white rounded-b-[24px] border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">বাতিল</button>
          <button
            onClick={generateSuperPDF}
            disabled={generating}
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            <Printer size={16} /> {generating ? 'তৈরি হচ্ছে...' : 'পিডিএফ তৈরি করুন'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfExportModal;
