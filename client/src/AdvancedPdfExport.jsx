import React, { useState } from 'react';
import { FileText, X, CheckCircle, Table, List, Plus, Trash2, Printer, Type, Columns, Layers, Loader2 } from 'lucide-react';

// ==============================================
// ADVANCED PDF EXPORT COMPONENT (Blank PDF Fixed)
// ==============================================
const AdvancedPdfExport = ({ isOpen, onClose, dataToExport }) => {
  const [format, setFormat] = useState('table');
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfSubtitle, setPdfSubtitle] = useState('');
  const [rowHeight, setRowHeight] = useState('py-2');
  const [groupBy, setGroupBy] = useState('');
  const [plainCols, setPlainCols] = useState(3);
  const [separator, setSeparator] = useState(' - ');
  
  const [plainFieldsOrder, setPlainFieldsOrder] = useState([
    { field: 'roll', prefix: '' },
    { field: 'nameBn', prefix: '' }
  ]);
  
  const [isPreparing, setIsPreparing] = useState(false);

  const [tableColumns, setTableColumns] = useState([
    { id: 'col1', type: 'data', field: 'serial', label: 'ক্র.নং', width: '10', default: '' },
    { id: 'col2', type: 'data', field: 'nameBn', label: 'শিক্ষার্থীর নাম', width: '40', default: '' },
    { id: 'col3', type: 'data', field: 'roll', label: 'রোল', width: '15', default: '' },
    { id: 'col4', type: 'data', field: 'id', label: 'আইডি', width: '35', default: '' }
  ]);

  const e2b = (num) => String(num).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d] || d);

  const guessGender = (student) => {
    const g = student.Gender || student.gender || student.Sex || student.sex || student.লিঙ্গ || '';
    const str = g.toString().toLowerCase().trim();
    if (str === 'male' || str === 'm' || str === 'ছেলে' || str === 'ছাত্র' || str === 'বালক') return 'ছাত্র';
    if (str === 'female' || str === 'f' || str === 'মেয়ে' || str === 'ছাত্রী' || str === 'বালিকা') return 'ছাত্রী';
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

  const fieldOptions = [
    { val: 'serial', text: 'ক্রমিক নং (১. ২.)' },
    { val: 'nameBn', text: 'নাম (বাংলা)' },
    { val: 'id', text: 'আইডি (ID)' },
    { val: 'roll', text: 'রোল (Roll)' },
    { val: 'classBn', text: 'শ্রেণি' },
    { val: 'FatherNameBn', text: 'পিতার নাম (বাংলা)' },
    { val: 'MotherNameBn', text: 'মাতার নাম (বাংলা)' },
    { val: 'address', text: 'ঠিকানা (সম্পূর্ণ)' },
    { val: 'WhatsApp', text: 'মোবাইল নম্বর' },
    { val: 'age', text: 'বয়স' },
    { val: 'DOB', text: 'জন্ম তারিখ' },
    { val: 'BRN', text: 'জন্ম নিবন্ধন (BRN)' },
    { val: 'gender', text: 'লিঙ্গ' },
    { val: 'BloodGroup', text: 'রক্তের গ্রুপ' },
    { val: 'Session', text: 'সেশন' },
    { val: 'nameEn', text: 'নাম (ইংরেজি)' },
    { val: 'FatherNameEn', text: 'পিতার নাম (ইংরেজি)' },
    { val: 'MotherNameEn', text: 'মাতার নাম (ইংরেজি)' },
    { val: 'EmergencyNo', text: 'জরুরি নম্বর' }
  ];

  const plainFieldLabels = fieldOptions.reduce((acc, curr) => {
    acc[curr.val] = curr.text.split(' ')[0];
    return acc;
  }, {});

  const updateCol = (index, key, value) => {
    const newCols = [...tableColumns];
    newCols[index][key] = value;
    setTableColumns(newCols);
  };

  const addPdfColumn = (type) => {
    setTableColumns([...tableColumns, {
      id: 'col' + Date.now(),
      type: type,
      field: type === 'data' ? 'nameBn' : '',
      label: type === 'data' ? 'নতুন কলাম' : 'ফাঁকা কলাম',
      width: '15',
      default: ''
    }]);
  };

  const removePdfColumn = (index) => {
    const newCols = [...tableColumns];
    newCols.splice(index, 1);
    setTableColumns(newCols);
  };

  const totalWidth = tableColumns.reduce((acc, col) => acc + (parseInt(col.width) || 0), 0);
  let colorClass = totalWidth === 100 ? 'text-emerald-600' : (totalWidth > 100 ? 'text-red-500' : 'text-orange-500');

  const addPlainField = (val) => {
    if (!val) return;
    if (!plainFieldsOrder.find(item => item.field === val)) {
      setPlainFieldsOrder([...plainFieldsOrder, { field: val, prefix: '' }]);
    }
  };

  const updatePlainFieldPrefix = (index, newPrefix) => {
    const newOrder = [...plainFieldsOrder];
    newOrder[index].prefix = newPrefix;
    setPlainFieldsOrder(newOrder);
  };

  const removePlainField = (index) => {
    const newOrder = [...plainFieldsOrder];
    newOrder.splice(index, 1);
    setPlainFieldsOrder(newOrder);
  };

  const generateSuperPDF = () => {
    setIsPreparing(true);

    if (!dataToExport || dataToExport.length === 0) {
      alert('পিডিএফ করার মতো কোনো ডাটা খুঁজে পাওয়া যায়নি।');
      setIsPreparing(false);
      return;
    }

    const title = e2b(pdfTitle).replace(/(\/n|\\n)/g, '<br>');
    const subtitle = e2b(pdfSubtitle).replace(/(\/n|\\n)/g, '<br>');

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
        </style>
        <div class="pdf-body">
    `;

    if (format === 'table') {
      htmlContent += `
            ${title ? `<h1 style="text-align: center; font-size: 26px; font-family: 'Anek Bangla', sans-serif; font-weight: 800; margin-bottom: ${subtitle ? '5px' : '20px'}; color: #000;">${title}</h1>` : ''}
            ${subtitle ? `<h2 style="text-align: center; font-size: 18px; font-family: 'Noto Serif Bengali', serif; font-weight: 600; margin-bottom: 25px; color: #333;">${subtitle}</h2>` : ''}
        `;

      const pd = rowHeight === 'py-1' ? '6px 8px' : rowHeight === 'py-4' ? '14px 8px' : '10px 8px';

      let totalBoysAll = 0; let totalGirlsAll = 0;
      dataToExport.forEach(s => {
        const g = guessGender(s);
        if (g === 'ছাত্র') totalBoysAll++;
        if (g === 'ছাত্রী') totalGirlsAll++;
      });

      htmlContent += `<table class="official-table"><thead><tr>`;
      tableColumns.forEach(col => {
        let align = (col.field === 'serial' || col.field === 'roll' || col.type === 'blank') ? 'center' : 'left';
        htmlContent += `<th style="width: ${col.width}%; text-align: ${align};">${e2b(col.label)}</th>`;
      });
      htmlContent += `</tr></thead><tbody>`;

      dataToExport.forEach((s, index) => {
        htmlContent += `<tr>`;
        tableColumns.forEach(col => {
          let cellData = '';
          let align = (col.field === 'serial' || col.field === 'roll' || col.type === 'blank') ? 'center' : 'left';

          if (col.type === 'blank') {
            cellData = e2b(col.default || '');
          } else if (col.field === 'serial') {
            cellData = e2b(index + 1);
          } else {
            let fieldKey = col.field;
            let rawVal = '';

            if (fieldKey === 'nameBn') rawVal = s.StudentNameBn || s.nameBn || '-';
            else if (fieldKey === 'nameEn') rawVal = s.StudentNameEn || s.nameEn || '-';
            else if (fieldKey === 'classBn') rawVal = s.ClassBn || s.classBn || '-';
            else if (fieldKey === 'roll') rawVal = s.Roll || s.roll || '-';
            else if (fieldKey === 'id') rawVal = s.ID || s.id || '-';
            else if (fieldKey === 'gender') rawVal = guessGender(s);
            else if (fieldKey === 'address') {
              rawVal = [s.HouseNameBn, s.VillageBn, s.WardNo ? 'ওয়ার্ড: ' + e2b(s.WardNo) : '', s.UnionBn, s.UpazilaBn, s.DistrictBn].filter(Boolean).join(', ');
              if (!rawVal) rawVal = '-';
            }
            else if (fieldKey === 'age') {
              let a = calculateAge(s.DOB || s.dob);
              rawVal = a !== null ? a + ' বছর' : '-';
            }
            else if (fieldKey === 'DOB') {
              if (s.DOB || s.dob) rawVal = new Date(s.DOB || s.dob).toLocaleDateString('bn-BD');
              else rawVal = '-';
            }
            else {
              rawVal = s[fieldKey] || s[fieldKey.toLowerCase()] || s[fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1)] || '-';
            }

            cellData = e2b(rawVal);
          }

          htmlContent += `<td style="padding: ${pd}; text-align: ${align};">${cellData}</td>`;
        });
        htmlContent += `</tr>`;
      });

      htmlContent += `</tbody></table>
            <div class="hp-footer-summary">
                <div class="hp-total-text">সর্বমোট শিক্ষার্থী: ${e2b(dataToExport.length)} জন</div>
                <div class="hp-total-sub">মোট ছাত্র: ${e2b(totalBoysAll)} জন | মোট ছাত্রী: ${e2b(totalGirlsAll)} জন</div>
            </div>`;
    } else {
      // --- Plain View ---
      if (title || subtitle) {
        htmlContent += `<div class="hp-header">`;
        if (title) htmlContent += `<div class="hp-hall-no">${title}</div>`;
        if (subtitle) htmlContent += `<div class="hp-exam">${subtitle}</div>`;
        htmlContent += `</div>`;
      }

      let groupedData = {};
      if (groupBy) {
        dataToExport.forEach(s => {
          let keyVal = 'অন্যান্য';
          if (groupBy === 'age') {
            const age = calculateAge(s.DOB || s.dob);
            keyVal = age !== null ? age : 'অজানা';
          } else if (groupBy === 'gender') {
            keyVal = guessGender(s);
          } else {
            let actualField = groupBy === 'classBn' ? 'ClassBn' : groupBy;
            let val = s[actualField];
            if (val === undefined || val === null || val === '') {
              keyVal = (groupBy === 'BloodGroup') ? 'গ্রুপ অজানা' : 'অন্যান্য';
            } else {
              keyVal = val;
            }
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

      for (const groupName of sortedKeys) {
        const groupStudents = groupedData[groupName];

        htmlContent += `<div class="hp-class-section">`;

        if (groupBy) {
          let boysCount = 0; let girlsCount = 0;
          groupStudents.forEach(s => {
            const g = guessGender(s);
            if (g === 'ছাত্র') boysCount++;
            if (g === 'ছাত্রী') girlsCount++;
          });

          let genderText = (boysCount > 0 || girlsCount > 0) ? `(ছাত্র: ${e2b(boysCount)} জন | ছাত্রী: ${e2b(girlsCount)} জন)` : '';
          let displayGroupName = e2b(groupName);
          if (groupBy === 'classBn') displayGroupName += ' শ্রেণি';
          else if (groupBy === 'age' && groupName !== 'অজানা') displayGroupName = `বয়স ${displayGroupName}`;

          htmlContent += `
                    <div class="hp-class-header">
                        <div class="hp-class-name">${displayGroupName} - ${e2b(groupStudents.length)} জন</div>
                        <div class="hp-class-stats">${genderText}</div>
                    </div>
                `;
        }

        htmlContent += `<div class="hp-grid" style="column-count: ${plainCols};">`;

        let serialCount = 1;
        const hasSerial = plainFieldsOrder.some(item => item.field === 'serial');

        groupStudents.forEach(s => {
          let prefixHtml = "";
          let mainParts = [];

          plainFieldsOrder.forEach(item => {
            let f = item.field;
            let val = '';
            
            if (f === 'serial') val = e2b(serialCount) + '.';
            else if (f === 'gender') val = guessGender(s);
            else if (f === 'address') {
              val = [s.HouseNameBn, s.VillageBn, s.WardNo ? 'ওয়ার্ড: ' + e2b(s.WardNo) : '', s.UnionBn, s.UpazilaBn, s.DistrictBn].filter(Boolean).join(', ');
            }
            else if (f === 'age') {
              let a = calculateAge(s.DOB || s.dob);
              val = a !== null ? e2b(a) + ' বছর' : '';
            }
            else if (f === 'DOB') {
              let d = s.DOB || s.dob;
              val = d ? e2b(new Date(d).toLocaleDateString('bn-BD')) : '';
            }
            else if (f === 'nameBn') val = s.StudentNameBn || s.nameBn || '';
            else if (f === 'nameEn') val = s.StudentNameEn || s.nameEn || '';
            else if (f === 'classBn') val = s.ClassBn || s.classBn || '';
            else if (f === 'roll') val = s.Roll || s.roll || '';
            else if (f === 'id') val = s.ID || s.id || '';
            else val = s[f] || s[f.toLowerCase()] || '';

            if (val) {
              val = (f !== 'serial') ? e2b(val) : val;

              // Custom Prefix যুক্ত করার লজিক
              let displayVal = item.prefix ? item.prefix + val : val;

              if (f === 'serial') {
                prefixHtml += `<span class="hp-serial">${displayVal}</span>`;
              } else if (f === 'roll' && !mainParts.length && !hasSerial) {
                prefixHtml += `<span class="hp-roll">${displayVal}${separator}</span>`;
              } else {
                mainParts.push(displayVal);
              }
            }
          });

          let mainHtml = mainParts.join(separator);

          htmlContent += `
                    <div class="hp-item">
                        ${prefixHtml}
                        <span class="hp-name">${mainHtml}</span>
                    </div>
                `;
          serialCount++;
        });
        htmlContent += `</div></div>`;
      }

      let totalBoysAll = 0; let totalGirlsAll = 0;
      dataToExport.forEach(s => {
        const g = guessGender(s);
        if (g === 'ছাত্র') totalBoysAll++;
        if (g === 'ছাত্রী') totalGirlsAll++;
      });

      htmlContent += `
            <div class="hp-footer-summary">
                <div class="hp-total-text">এই লিস্টে মোট শিক্ষার্থী: ${e2b(dataToExport.length)} জন</div>
                <div class="hp-total-sub">মোট ছাত্র: ${e2b(totalBoysAll)} জন | মোট ছাত্রী: ${e2b(totalGirlsAll)} জন</div>
            </div>
        `;
    }

    htmlContent += `</div>`;

    // React Root Hiding Issue Fixed Here
    let printContainer = document.getElementById('advanced-print-engine');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'advanced-print-engine';
      document.body.appendChild(printContainer);
    }
    printContainer.innerHTML = htmlContent;

    setTimeout(() => {
      const originalTitle = document.title;
      let fileName = pdfSubtitle.trim();
      if (!fileName) fileName = pdfTitle.trim();

      if (fileName) {
        fileName = fileName.replace(/(\/n|\\n)/g, ' ').replace(/\s+/g, ' ').trim();
      } else {
        fileName = 'Student_Report';
      }

      document.title = fileName;
      window.print();
      document.title = originalTitle;
      
      setIsPreparing(false);
      onClose();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        /* PDF Engine hidden normally */
        #advanced-print-engine { display: none; }
        
        /* Magic CSS to hide React root and only show the PDF container */
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; height: auto; overflow: visible; }
          body > *:not(#advanced-print-engine) { display: none !important; }
          #advanced-print-engine { display: block !important; position: static; width: 100%; margin: 0; padding: 0; page-break-inside: avoid; }
          @page { margin: 15mm; size: A4; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
        }
      `}</style>

      {isOpen && (
        <div id="pdf-export-modal" className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md transition-opacity duration-300">
          <div id="pdf-modal-card" className="bg-slate-50 rounded-[24px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl transition-transform duration-300 relative animate-in zoom-in-95">

            <div className="px-6 py-4 bg-white rounded-t-[24px] border-b border-slate-200 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="text-red-500" size={24} /> অ্যাডভান্সড PDF এক্সপোর্ট
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">A4 পেজ সাইজে কাস্টমাইজড রিপোর্ট তৈরি করুন</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 active:scale-90 transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-indigo-600 mb-3 flex items-center gap-2">
                  <Type size={16} /> হেডলাইন্স (ঐচ্ছিক)
                </h3>
                <div className="space-y-3">
                  <input type="text" id="pdf-title" placeholder="প্রধান শিরোনাম (যেমন: বার্ষিক পরীক্ষার ফলাফল)" className="w-full bg-slate-50 text-slate-700 text-sm rounded-xl py-2.5 px-4 border border-slate-200 focus:border-indigo-400 focus:bg-white transition-all outline-none font-bold" value={pdfTitle} onChange={e => setPdfTitle(e.target.value)} />
                  <input type="text" id="pdf-subtitle" placeholder="সাব-টাইটেল (যেমন: শ্রেণি: ৬ষ্ঠ, বিষয়: গণিত)" className="w-full bg-slate-50 text-slate-700 text-sm rounded-xl py-2.5 px-4 border border-slate-200 focus:border-indigo-400 focus:bg-white transition-all outline-none" value={pdfSubtitle} onChange={e => setPdfSubtitle(e.target.value)} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3">রিপোর্টের ধরন নির্বাচন করুন:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setFormat('table')} id="btn-fmt-table" className={format === 'table' ? "border-2 border-indigo-600 bg-indigo-50 rounded-2xl p-4 text-center transition-all relative overflow-hidden" : "border-2 border-slate-200 bg-white rounded-2xl p-4 text-center hover:border-indigo-300 transition-all relative overflow-hidden"}>
                    <div className={format === 'table' ? "absolute top-2 right-2 text-indigo-600" : "absolute top-2 right-2 text-transparent"}>
                      <CheckCircle size={18} />
                    </div>
                    <Table size={32} className={format === 'table' ? "text-indigo-500 mx-auto mb-2" : "text-slate-400 mx-auto mb-2"} />
                    <h4 className={format === 'table' ? "font-bold text-slate-800" : "font-bold text-slate-600"}>টেবিল ভিউ</h4>
                    <p className="text-[10px] text-slate-500 mt-1">কাস্টম কলাম ও রো-হাইট</p>
                  </button>

                  <button onClick={() => setFormat('plain')} id="btn-fmt-plain" className={format === 'plain' ? "border-2 border-indigo-600 bg-indigo-50 rounded-2xl p-4 text-center transition-all relative overflow-hidden" : "border-2 border-slate-200 bg-white rounded-2xl p-4 text-center hover:border-indigo-300 transition-all relative overflow-hidden"}>
                    <div className={format === 'plain' ? "absolute top-2 right-2 text-indigo-600" : "absolute top-2 right-2 text-transparent"}>
                      <CheckCircle size={18} />
                    </div>
                    <List size={32} className={format === 'plain' ? "text-indigo-500 mx-auto mb-2" : "text-slate-400 mx-auto mb-2"} />
                    <h4 className={format === 'plain' ? "font-bold text-slate-800" : "font-bold text-slate-600"}>প্লেন ভিউ</h4>
                    <p className="text-[10px] text-slate-400 mt-1">গ্রুপিং ও কলাম অপশন</p>
                  </button>
                </div>
              </div>

              {format === 'table' ? (
                <div id="settings-table" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-indigo-600 flex items-center gap-1">
                      <Columns size={16} /> কলাম সেটিং (<span className={colorClass}>{e2b(totalWidth)}%</span> - ১০০%)
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={() => addPdfColumn('data')} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1.5 rounded-lg font-bold hover:bg-indigo-100 active:scale-95 flex items-center gap-1">
                        <Plus size={12} /> ডেটা কলাম
                      </button>
                      <button onClick={() => addPdfColumn('blank')} className="text-xs bg-slate-100 text-slate-600 px-2 py-1.5 rounded-lg font-bold hover:bg-slate-200 active:scale-95 flex items-center gap-1">
                        <Plus size={12} /> ফাঁকা কলাম
                      </button>
                    </div>
                  </div>

                  <div id="pdf-columns-container" className="space-y-2 mb-4 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {tableColumns.map((col, index) => (
                      <div key={col.id} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex-1">
                          <input type="text" value={col.label} onChange={(e) => updateCol(index, 'label', e.target.value)} placeholder="কলামের নাম (প্রিন্টে যা দেখাবে)" className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 outline-none font-bold text-slate-800 focus:border-indigo-500" />
                          {col.type === 'data' ? (
                            <select value={col.field} onChange={(e) => updateCol(index, 'field', e.target.value)} className="w-full bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-700 mt-1 px-2 py-1.5 rounded outline-none font-bold cursor-pointer">
                              {fieldOptions.map(opt => <option key={opt.val} value={opt.val}>{opt.text}</option>)}
                            </select>
                          ) : (
                            <input type="text" value={col.default} onChange={(e) => updateCol(index, 'default', e.target.value)} placeholder="ডিফল্ট ভ্যালু (যেমন: স্বাক্ষর)" className="w-full bg-white border border-slate-200 mt-1 rounded text-[11px] px-2 py-1.5 outline-none text-slate-500" />
                          )}
                        </div>
                        <div className="w-16">
                          <div className="relative">
                            <input type="number" value={col.width} onChange={(e) => updateCol(index, 'width', e.target.value)} className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 outline-none pr-5 text-center font-bold focus:border-indigo-500" />
                            <span className="absolute right-1.5 top-1.5 text-xs text-slate-400">%</span>
                          </div>
                        </div>
                        <button onClick={() => removePdfColumn(index)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-sm">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-600">রো (Row) এর সাইজ:</span>
                    <select id="pdf-row-height" value={rowHeight} onChange={(e) => setRowHeight(e.target.value)} className="bg-white border border-slate-300 text-xs rounded-lg px-3 py-1.5 outline-none text-slate-700 font-medium">
                      <option value="py-1">চিকন (Small)</option>
                      <option value="py-2">মাঝারি (Medium)</option>
                      <option value="py-4">চওড়া (Large)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div id="settings-plain" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-indigo-600 mb-2 flex items-center gap-1">
                      <Layers size={16} /> স্মার্ট গ্রুপিং
                    </h3>
                    <select id="pdf-group-by" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-indigo-400 font-medium">
                      <option value="">কোনো গ্রুপ নয় (সব একসাথে)</option>
                      <option value="classBn">শ্রেণী (Class) অনুযায়ী</option>
                      <option value="gender">লিঙ্গ (Gender) অনুযায়ী</option>
                      <option value="age">বয়স অনুযায়ী</option>
                      <option value="BloodGroup">ব্লাড গ্রুপ অনুযায়ী</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-600 mb-1">কলাম সংখ্যা</h3>
                      <input type="number" id="pdf-plain-cols" value={plainCols} min="1" max="6" onChange={(e) => setPlainCols(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-center font-bold" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-600 mb-1">তথ্য বিভাজন (Separator)</h3>
                      <input type="text" id="pdf-separator" value={separator} onChange={(e) => setSeparator(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-center font-bold" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-600 mb-2">কী কী তথ্য দেখাবেন? (পছন্দমতো সাজান)</h3>
                    
                    <div className="flex flex-wrap gap-2 mb-3" id="dynamic-plain-fields">
                      {plainFieldsOrder.map((item, index) => (
                        <div key={index} className="bg-indigo-50 border border-indigo-200 pl-3 pr-2 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                          <span className="text-xs font-bold text-indigo-700">{e2b(index + 1)}. {plainFieldLabels[item.field] || item.field}</span>
                          
                          <div className="flex items-center bg-white rounded border border-indigo-200 overflow-hidden h-6">
                            <input 
                              type="text" 
                              placeholder="উপসর্গ (যেমন: নাম: )" 
                              value={item.prefix}
                              onChange={(e) => updatePlainFieldPrefix(index, e.target.value)}
                              className="w-28 text-[11px] px-2 py-1 outline-none text-slate-700 font-bold placeholder-slate-300"
                            />
                          </div>

                          <button onClick={() => removePlainField(index)} className="text-red-400 hover:text-red-600 ml-1 outline-none">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <select id="plain-field-selector" value="" onChange={(e) => addPlainField(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-4 py-2.5 outline-none font-bold focus:border-indigo-400 text-slate-700">
                      <option value="">+ নতুন তথ্য যুক্ত করুন</option>
                      {fieldOptions.map(opt => (
                        <option key={opt.val} value={opt.val}>{opt.text}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-white rounded-b-[24px] border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">বাতিল</button>
              <button onClick={generateSuperPDF} id="btn-generate-pdf" disabled={isPreparing} className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2">
                {isPreparing ? <><Loader2 size={16} className="animate-spin" /> প্রস্তুত হচ্ছে...</> : <><Printer size={16} /> পিডিএফ তৈরি করুন</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdvancedPdfExport;
