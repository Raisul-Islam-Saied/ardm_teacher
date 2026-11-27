import { CONFIG, DEFAULT_IMAGE } from '../config/systemConfig';

// ================================================================
// HELPERS
// ================================================================
const cleanPhone = (p) => String(p || '').replace(/[^\d+]/g, '');

const toISODate = (dStr) => {
  if (!dStr) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(String(dStr))) return String(dStr).slice(0, 10);
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fmtDate = (d) => {
  if (!d) return 'N/A';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const fmtAddressBn = (addr) => {
  if (!addr) return 'N/A';
  const parts = [
    addr.houseNameBn || addr.houseOrRoad,
    addr.villageBn || addr.village,
    addr.unionBn,
    addr.wardNo ? `ওয়ার্ড-${addr.wardNo}` : '',
    addr.postOffice ? `ডাকঘর: ${addr.postOffice}${addr.postCode ? `-${addr.postCode}` : ''}` : '',
    addr.upazilaBn || addr.upazila,
    addr.districtBn || addr.district,
    addr.divisionBn
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'N/A';
};

const fmtAddressEn = (addr) => {
  if (!addr) return 'N/A';
  const parts = [
    addr.houseNameEn || addr.houseOrRoad,
    addr.villageEn || addr.village,
    addr.unionEn,
    addr.wardNo ? `Ward-${addr.wardNo}` : '',
    addr.postOffice ? `PO: ${addr.postOffice}${addr.postCode ? `-${addr.postCode}` : ''}` : '',
    addr.upazilaEn || addr.upazila,
    addr.districtEn || addr.district,
    addr.divisionEn
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'N/A';
};

const fmtQualificationLine = (q) => {
  if (!q) return '';
  const res =
    ['GPA', 'CGPA'].includes(q.resultType) && q.gpaOrCgpa
      ? `${q.resultType} ${q.gpaOrCgpa}/${q.scale || 5}`
      : q.resultGrade
      ? `${q.resultGrade} ${q.resultType}`
      : q.resultType || '';
  return [
    q.examTitle || q.degreeLevel,
    q.majorOrGroup ? `(${q.majorOrGroup})` : '',
    q.boardOrUniversity,
    q.passingYear,
    res ? `[${res}]` : ''
  ]
    .filter(Boolean)
    .join(' · ');
};

const fmtAllQualifications = (quals = []) => {
  if (!Array.isArray(quals) || quals.length === 0) return 'N/A';
  return quals.map(fmtQualificationLine).join(' | ');
};

const fmtBankSummary = (b) => {
  if (!b) return 'N/A';
  const parts = [
    b.bankName,
    b.branchName ? `Branch: ${b.branchName}` : '',
    b.accountHolderName ? `A/C Name: ${b.accountHolderName}` : '',
    b.accountNumber ? `A/C No: ${b.accountNumber}` : '',
    b.routingNumber ? `Routing: ${b.routingNumber}` : ''
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'N/A';
};

// ================================================================
// 1. vCard (.vcf) EXPORT — Base64 Photo + Progress + ALL Data
// ================================================================
const vcardEscape = (str) => {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

const foldLine = (line) => {
  if (line.length <= 75) return line;
  let out = '';
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (count === 75) {
      out += '\r\n ';
      count = 0;
    }
    out += line[i];
    count++;
  }
  return out;
};

const fetchAsBase64 = async (url) => {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('bad status');
    const blob = await res.blob();
    const type = blob.type || 'image/jpeg';
    const buf = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return { base64: btoa(binary), type };
  } catch {
    return null;
  }
};

const buildTeacherVCard = async (t, index) => {
  const rank = t.rankingMetrics?.overallMadrasahRank ?? (index + 1);
  const rankStr = String(rank).padStart(2, '0');
  const vcardName = `T${rankStr} ${t.fullNameEng || t.fullNameBng || ''}`.trim();
  const imgUrl = t.profilePicture?.url || '';
  const photoData = imgUrl ? await fetchAsBase64(imgUrl) : null;

  const pAddr = t.presentAddress || {};
  const street = [pAddr.houseNameEn || pAddr.houseOrRoad, pAddr.villageEn || pAddr.village]
    .filter(Boolean)
    .join(', ');
  const adrLine = `;;${vcardEscape(street)};${vcardEscape(pAddr.upazilaEn || pAddr.upazila || '')};${vcardEscape(
    pAddr.unionEn || ''
  )};${vcardEscape(pAddr.postCode || '')};${vcardEscape(pAddr.districtEn || pAddr.district || '')}`;

  const noteLines = [
    `নাম: ${t.fullNameBng || 'N/A'}`,
    `Rank: #${rank} | Teacher ID: ${t.teacherCode || 'N/A'}`,
    `Biometric ID: ${t.biometricDeviceId ?? 'N/A'} | Index No: ${t.indexNumber || 'N/A'}`,
    `Designation: ${t.designationBng || ''} (${t.designation || ''})`,
    `Category: ${t.staffCategory || 'N/A'} | Type: ${t.employmentType || 'N/A'}`,
    `Subject: ${t.subject || 'N/A'} | Assigned Class: ${t.assignedClass || 'N/A'}`,
    `Joining Date: ${fmtDate(t.joiningDate)}`,
    `Father: ${t.fathersNameBng || ''} / ${t.fathersNameEng || ''}`,
    `Mother: ${t.mothersNameBng || ''} / ${t.mothersNameEng || ''}`,
    `Gender: ${t.gender || 'N/A'} | Religion: ${t.religion || 'N/A'} | Marital: ${t.maritalStatus || 'N/A'}`,
    `Blood Group: ${t.bloodGroup || 'N/A'}`,
    `NID: ${t.nidNumber || 'N/A'} | BRN: ${t.birthRegNumber || 'N/A'}`,
    `Emergency: ${t.emergencyContact?.contactName || 'N/A'} (${t.emergencyContact?.relationship || 'N/A'}) - ${
      t.emergencyContact?.phone || 'N/A'
    }`,
    `Basic Salary: ${t.basicSalary ?? 0} BDT | Payment: ${t.paymentMethod || 'N/A'} | Leave Quota: ${
      t.customLeaveQuota ?? 'N/A'
    }`,
    `Bank: ${fmtBankSummary(t.bankDetails)}`,
    `Qualifications: ${fmtAllQualifications(t.academicQualifications)}`,
    `Present Address: ${fmtAddressBn(t.presentAddress)}`,
    `Permanent Address: ${fmtAddressBn(t.permanentAddress)}`
  ];

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    foldLine(`FN:${vcardEscape(vcardName)}`),
    foldLine(`N:${vcardEscape(vcardName)};;;;`)
  ];

  if (t.phone) lines.push(foldLine(`TEL;TYPE=CELL,VOICE:${vcardEscape(cleanPhone(t.phone))}`));
  if (t.emergencyContact?.phone && cleanPhone(t.emergencyContact.phone) !== cleanPhone(t.phone)) {
    lines.push(foldLine(`TEL;TYPE=HOME,VOICE:${vcardEscape(cleanPhone(t.emergencyContact.phone))}`));
  }
  if (t.email) lines.push(foldLine(`EMAIL;TYPE=INTERNET:${vcardEscape(t.email)}`));
  lines.push(foldLine(`ADR;TYPE=HOME:${adrLine}`));
  const dobIso = toISODate(t.dateOfBirth);
  if (dobIso) lines.push(`BDAY:${dobIso}`);
  lines.push(foldLine(`ORG:${vcardEscape(CONFIG.APP_NAME)} (${vcardEscape(t.employmentType || 'Staff')})`));
  lines.push(foldLine(`TITLE:${vcardEscape(t.designation || '')}${t.subject ? ` - ${vcardEscape(t.subject)}` : ''}`));
  lines.push(foldLine(`CATEGORIES:ARDM,Teachers,${vcardEscape(t.staffCategory || 'Teaching')}`));
  lines.push(foldLine(`NOTE:${vcardEscape(noteLines.join('\n'))}`));

  if (photoData) {
    const subtype = (photoData.type.split('/')[1] || 'JPEG').toUpperCase();
    lines.push(foldLine(`PHOTO;ENCODING=b;TYPE=${subtype}:${photoData.base64}`));
  } else if (imgUrl) {
    lines.push(foldLine(`PHOTO;VALUE=URI:${imgUrl}`));
  }

  lines.push(`REV:${new Date().toISOString()}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
};

export const downloadTeacherContactsVCF = async (teachers = [], setContactProgress = null) => {
  if (!teachers.length) return;
  setContactProgress?.({ show: true, current: 0, total: teachers.length, name: '' });
  try {
    const cards = [];
    for (let i = 0; i < teachers.length; i++) {
      const t = teachers[i];
      setContactProgress?.({
        show: true,
        current: i,
        total: teachers.length,
        name: t.fullNameEng || t.fullNameBng || ''
      });
      cards.push(await buildTeacherVCard(t, i));
    }
    setContactProgress?.({ show: true, current: teachers.length, total: teachers.length, name: '' });

    const blob = new Blob([cards.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARDM_Teacher_Contacts_${teachers.length}_${new Date().toISOString().slice(0, 10)}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } finally {
    setTimeout(() => setContactProgress?.({ show: false, current: 0, total: 0, name: '' }), 300);
  }
};

// ================================================================
// 2. EXCEL (.csv UTF-8 BOM) — 100% ALL TEACHER SCHEMA COLUMNS
// ================================================================
export const downloadTeacherExcel = (teachers = []) => {
  if (!teachers.length) return;
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'Rank', 'Composite Score', 'Teacher ID', 'UID', 'Biometric ID', 'Index No',
    'Name (Bn)', 'Name (En)', 'Father (Bn)', 'Father (En)', 'Mother (Bn)', 'Mother (En)',
    'Date of Birth', 'Gender', 'Religion', 'Blood Group', 'Marital Status',
    'NID Number', 'Birth Reg No',
    'Phone', 'Email', 'Emergency Contact Name', 'Emergency Relation', 'Emergency Phone',
    'Designation (Bn)', 'Designation (En)', 'Staff Category', 'Subject', 'Assigned Class',
    'Can Edit Class', 'Employment Type', 'Joining Date', 'Resignation Date',
    'Basic Salary (BDT)', 'Payment Method', 'Leave Quota',
    'Bank Name', 'Branch Name', 'Account Holder', 'Account Number', 'Routing Number',
    'Academic Qualifications', 'Highest Degree Weight', 'Best Normalized GPA', 'Avg Normalized GPA',
    'Present House (Bn)', 'Present House (En)', 'Present Village (Bn)', 'Present Village (En)',
    'Present Union (Bn)', 'Present Union (En)', 'Present Ward', 'Present Post Office', 'Present Post Code',
    'Present Upazila (Bn)', 'Present Upazila (En)', 'Present District (Bn)', 'Present District (En)',
    'Present Division (Bn)', 'Present Division (En)',
    'Permanent House (Bn)', 'Permanent House (En)', 'Permanent Village (Bn)', 'Permanent Village (En)',
    'Permanent Union (Bn)', 'Permanent Union (En)', 'Permanent Ward', 'Permanent Post Office', 'Permanent Post Code',
    'Permanent Upazila (Bn)', 'Permanent Upazila (En)', 'Permanent District (Bn)', 'Permanent District (En)',
    'Permanent Division (Bn)', 'Permanent Division (En)',
    'Portal Role', 'Registration Status', 'Is Active', 'Image URL', 'Created At'
  ];

  const rows = teachers.map((t, i) => {
    const p = t.presentAddress || {};
    const pm = t.permanentAddress || {};
    const b = t.bankDetails || {};
    const rm = t.rankingMetrics || {};
    return [
      rm.overallMadrasahRank ?? (i + 1),
      rm.compositeRankScore ?? '',
      `'${t.teacherCode || ''}`,
      t.uid || '',
      t.biometricDeviceId ?? '',
      t.indexNumber ? `'${t.indexNumber}` : '',
      t.fullNameBng || '',
      t.fullNameEng || '',
      t.fathersNameBng || '',
      t.fathersNameEng || '',
      t.mothersNameBng || '',
      t.mothersNameEng || '',
      toISODate(t.dateOfBirth),
      t.gender || '',
      t.religion || '',
      t.bloodGroup || 'N/A',
      t.maritalStatus || '',
      t.nidNumber ? `'${t.nidNumber}` : '',
      t.birthRegNumber ? `'${t.birthRegNumber}` : '',
      `'${t.phone || ''}`,
      t.email || '',
      t.emergencyContact?.contactName || '',
      t.emergencyContact?.relationship || '',
      t.emergencyContact?.phone ? `'${t.emergencyContact.phone}` : '',
      t.designationBng || '',
      t.designation || '',
      t.staffCategory || '',
      t.subject || '',
      t.assignedClass || '',
      t.canEditAssignedClass ? 'Yes' : 'No',
      t.employmentType || '',
      toISODate(t.joiningDate),
      toISODate(t.resignationDate),
      t.basicSalary ?? 0,
      t.paymentMethod || '',
      t.customLeaveQuota ?? '',
      b.bankName || '',
      b.branchName || '',
      b.accountHolderName || '',
      b.accountNumber ? `'${b.accountNumber}` : '',
      b.routingNumber ? `'${b.routingNumber}` : '',
      fmtAllQualifications(t.academicQualifications),
      rm.highestDegreeWeight ?? '',
      rm.highestDegreeNormalizedGpa ?? '',
      rm.averageNormalizedGpa ?? '',
      p.houseNameBn || p.houseOrRoad || '',
      p.houseNameEn || p.houseOrRoad || '',
      p.villageBn || p.village || '',
      p.villageEn || p.village || '',
      p.unionBn || '',
      p.unionEn || '',
      p.wardNo || '',
      p.postOffice || '',
      p.postCode || '',
      p.upazilaBn || p.upazila || '',
      p.upazilaEn || p.upazila || '',
      p.districtBn || p.district || '',
      p.districtEn || p.district || '',
      p.divisionBn || '',
      p.divisionEn || '',
      pm.houseNameBn || pm.houseOrRoad || '',
      pm.houseNameEn || pm.houseOrRoad || '',
      pm.villageBn || pm.village || '',
      pm.villageEn || pm.village || '',
      pm.unionBn || '',
      pm.unionEn || '',
      pm.wardNo || '',
      pm.postOffice || '',
      pm.postCode || '',
      pm.upazilaBn || pm.upazila || '',
      pm.upazilaEn || pm.upazila || '',
      pm.districtBn || pm.district || '',
      pm.districtEn || pm.district || '',
      pm.divisionBn || '',
      pm.divisionEn || '',
      t.role || '',
      t.registrationStatus || '',
      t.isActive !== false ? 'Active' : 'Inactive',
      t.profilePicture?.url || '',
      toISODate(t.createdAt)
    ];
  });

  const csvContent = '\uFEFF' + [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Teacher_Data_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ================================================================
// 3. TABLE REGISTER PDF (Student Register Style · B&W Institutional · ALL DATA)
// ================================================================
export const printTeacherTable = (teachers = []) => {
  if (!teachers.length) return;
  const w = window.open('', '_blank');
  const maleCount = teachers.filter((t) => t.gender === 'Male').length;
  const femaleCount = teachers.filter((t) => t.gender === 'Female').length;
  const teachingCount = teachers.filter((t) => t.staffCategory !== 'Non-Teaching').length;
  const nonTeachingCount = teachers.filter((t) => t.staffCategory === 'Non-Teaching').length;
  const mpoCount = teachers.filter((t) => t.employmentType === 'MPO').length;

  w.document.write(`
    <html>
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
      <title>${CONFIG.APP_NAME} - Teacher Register</title>
      <style>
        @media print { @page { size: A4 landscape; margin: 10mm 7mm 8mm; } }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { font-family: 'Hind Siliguri', sans-serif; font-size: 11px; color: #000; margin: 0; }
        h2 { text-align: center; margin: 0 0 3px; font-size: 18px; text-transform: uppercase; }
        .sub { text-align: center; font-size: 11.5px; font-weight: 700; margin: 2px 0 8px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10.5px; }
        th, td { border: 1px solid #000; padding: 3.5px 4px; vertical-align: top; word-wrap: break-word; }
        th { background: #eee; text-align: center; font-weight: 700; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        .col-img { width: 8.5%; padding: 2px; vertical-align: middle; text-align: center; }
        .col-name { width: 18%; }
        .col-job { width: 18%; }
        .col-family { width: 18.5%; }
        .col-qual { width: 18%; }
        .col-addr { width: 19%; }
        .photo { width: 100%; height: 100%; min-height: 82px; object-fit: cover; object-position: center top; display: block; }
        .lbl { font-weight: 700; }
        .block div { line-height: 1.3; margin-bottom: 1px; }
      </style>
    </head>
    <body>
      <h2>${CONFIG.APP_NAME} - Teacher & Staff Register</h2>
      <p class="sub">
        Total: ${teachers.length} | Teaching: ${teachingCount} | Non-Teaching: ${nonTeachingCount} |
        MPO: ${mpoCount} | Male: ${maleCount} | Female: ${femaleCount}
      </p>

      <table>
        <thead>
          <tr>
            <th class="col-img">Photo</th>
            <th class="col-name">Identity & Personal</th>
            <th class="col-job">Job, Salary & Bank</th>
            <th class="col-family">Family & Contact</th>
            <th class="col-qual">Academic Qualifications</th>
            <th class="col-addr">Present & Permanent Address</th>
          </tr>
        </thead>
        <tbody>
          ${teachers
            .map((t, idx) => {
              const rank = t.rankingMetrics?.overallMadrasahRank ?? (idx + 1);
              return `
              <tr>
                <td class="col-img">
                  <img class="photo" src="${t.profilePicture?.url || DEFAULT_IMAGE}" />
                </td>
                <td class="col-name block">
                  <div><span class="lbl">${t.fullNameBng || ''}</span></div>
                  <div><span class="lbl">${t.fullNameEng || ''}</span></div>
                  <div><span class="lbl">ID:</span> ${t.teacherCode || 'N/A'} | <span class="lbl">Bio:</span> ${t.biometricDeviceId ?? 'N/A'}</div>
                  ${t.indexNumber ? `<div><span class="lbl">Index:</span> ${t.indexNumber}</div>` : ''}
                  <div><span class="lbl">NID:</span> ${t.nidNumber || 'N/A'}</div>
                  ${t.birthRegNumber ? `<div><span class="lbl">BRN:</span> ${t.birthRegNumber}</div>` : ''}
                  <div><span class="lbl">DOB:</span> ${fmtDate(t.dateOfBirth)}</div>
                  <div><span class="lbl">Blood:</span> ${t.bloodGroup || 'N/A'} | ${t.gender || 'N/A'} | ${t.religion || 'N/A'} | ${t.maritalStatus || 'N/A'}</div>
                </td>
                <td class="col-job block">
                  <div><span class="lbl">${t.designationBng || ''}</span> (${t.designation || ''})</div>
                  <div><span class="lbl">Category:</span> ${t.staffCategory || 'N/A'} | <span class="lbl">Type:</span> ${t.employmentType || 'N/A'}</div>
                  <div><span class="lbl">Subject:</span> ${t.subject || 'N/A'} | <span class="lbl">Class:</span> ${t.assignedClass || 'N/A'}</div>
                  <div><span class="lbl">Joining:</span> ${fmtDate(t.joiningDate)}</div>
                  ${t.resignationDate ? `<div><span class="lbl">Resigned:</span> ${fmtDate(t.resignationDate)}</div>` : ''}
                  <div><span class="lbl">Salary:</span> ৳${t.basicSalary ?? 0} (${t.paymentMethod || 'Cash'}) | <span class="lbl">Leave:</span> ${t.customLeaveQuota ?? 2}d</div>
                  ${fmtBankSummary(t.bankDetails) !== 'N/A' ? `<div><span class="lbl">Bank:</span> ${fmtBankSummary(t.bankDetails)}</div>` : ''}
                  <div><span class="lbl">Role:</span> ${t.role || 'Teacher'} | <span class="lbl">Status:</span> ${t.isActive !== false ? 'Active' : 'Inactive'}</div>
                </td>
                <td class="col-family block">
                  <div><span class="lbl">পিতা:</span> ${t.fathersNameBng || 'N/A'} (${t.fathersNameEng || ''})</div>
                  <div><span class="lbl">মাতা:</span> ${t.mothersNameBng || 'N/A'} (${t.mothersNameEng || ''})</div>
                  <div><span class="lbl">Mobile:</span> ${t.phone || 'N/A'}</div>
                  <div><span class="lbl">Email:</span> ${t.email || 'N/A'}</div>
                  <div><span class="lbl">Emergency:</span> ${t.emergencyContact?.phone || 'N/A'}</div>
                  <div><span class="lbl">Em. Person:</span> ${t.emergencyContact?.contactName || 'N/A'} (${t.emergencyContact?.relationship || 'N/A'})</div>
                </td>
                <td class="col-qual block">
                  ${
                    Array.isArray(t.academicQualifications) && t.academicQualifications.length > 0
                      ? t.academicQualifications
                          .map((q, qi) => `<div><span class="lbl">${qi + 1}.</span> ${fmtQualificationLine(q)}</div>`)
                          .join('')
                      : '<div>N/A</div>'
                  }
                </td>
                <td class="col-addr block">
                  <div><span class="lbl">বর্তমান:</span> ${fmtAddressBn(t.presentAddress)}</div>
                  <div style="margin-top:3px;"><span class="lbl">স্থায়ী:</span> ${fmtAddressBn(t.permanentAddress)}</div>
                </td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
      <script>
        window.onload = function () { setTimeout(() => window.print(), 700); };
      </script>
    </body>
    </html>
  `);
  w.document.close();
};

// ================================================================
// 4. PDF INFO SHEET (1 FULL A4 PAGE PER TEACHER · B&W INSTITUTIONAL · ALL DATA)
// ================================================================
export const printTeacherPdfInfo = (teachers = []) => {
  if (!teachers.length) return;
  const w = window.open('', '_blank', 'height=950,width=1100');
  if (!w) return alert('পপআপ ব্লক হয়েছে!');
  const issuedOn = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const pagesHtml = teachers
    .map((t, idx) => {
      const rank = t.rankingMetrics?.overallMadrasahRank ?? (idx + 1);
      const b = t.bankDetails || {};
      const quals = Array.isArray(t.academicQualifications) ? t.academicQualifications : [];
      const history = Array.isArray(t.employmentHistory) ? t.employmentHistory : [];

      return `
      <div class="page">
        <div class="sheet">
          <!-- INSTITUTIONAL LETTERHEAD (B&W) -->
          <div class="header">
            <h1>${CONFIG.APP_NAME}</h1>
            <p class="bn-inst">আবদুর রাজ্জাক দাখিল মাদরাসা · সরফভাটা, রাঙ্গুনিয়া, চট্টগ্রাম</p>
            <div class="doc-title">OFFICIAL TEACHER / STAFF INFORMATION SHEET</div>
          </div>

          <div class="meta-bar">
            <span>Madrasah Rank: <b>#${rank}</b></span>
            <span>Teacher ID: <b>${t.teacherCode || 'N/A'}</b></span>
            <span>Biometric ID: <b>${t.biometricDeviceId ?? 'N/A'}</b></span>
            <span>Index No: <b>${t.indexNumber || 'N/A'}</b></span>
            <span>Status: <b>${t.isActive !== false ? 'Active' : 'Inactive'} (${t.registrationStatus || 'Approved'})</b></span>
          </div>

          <!-- TOP IDENTITY + PHOTO -->
          <div class="top-row">
            <div class="photo-box">
              <img src="${t.profilePicture?.url || DEFAULT_IMAGE}" />
              <div class="photo-cap">Rank #${rank}</div>
              <div class="photo-sub">${t.employmentType || 'Non-MPO'}</div>
            </div>

            <table class="info-table">
              <tr>
                <td class="lbl">নাম (বাংলা)</td><td class="val bold">${t.fullNameBng || 'N/A'}</td>
                <td class="lbl">Full Name (En)</td><td class="val bold">${t.fullNameEng || 'N/A'}</td>
              </tr>
              <tr>
                <td class="lbl">পিতার নাম (বাংলা)</td><td class="val">${t.fathersNameBng || 'N/A'}</td>
                <td class="lbl">Father's Name (En)</td><td class="val">${t.fathersNameEng || 'N/A'}</td>
              </tr>
              <tr>
                <td class="lbl">মাতার নাম (বাংলা)</td><td class="val">${t.mothersNameBng || 'N/A'}</td>
                <td class="lbl">Mother's Name (En)</td><td class="val">${t.mothersNameEng || 'N/A'}</td>
              </tr>
              <tr>
                <td class="lbl">জন্ম তারিখ (DOB)</td><td class="val">${fmtDate(t.dateOfBirth)}</td>
                <td class="lbl">রক্তের গ্রুপ (Blood)</td><td class="val bold">${t.bloodGroup || 'N/A'}</td>
              </tr>
              <tr>
                <td class="lbl">লিঙ্গ ও ধর্ম</td><td class="val">${t.gender || 'N/A'} · ${t.religion || 'N/A'}</td>
                <td class="lbl">বৈবাহিক অবস্থা</td><td class="val">${t.maritalStatus || 'N/A'}</td>
              </tr>
              <tr>
                <td class="lbl">NID নম্বর</td><td class="val mono">${t.nidNumber || 'N/A'}</td>
                <td class="lbl">জন্ম নিবন্ধন (BRN)</td><td class="val mono">${t.birthRegNumber || 'N/A'}</td>
              </tr>
            </table>
          </div>

          <!-- INSTITUTIONAL & JOB DETAILS -->
          <div class="sec-title">১. প্রাতিষ্ঠানিক ও চাকরির তথ্য (Institutional & Service Information)</div>
          <table class="info-table">
            <tr>
              <td class="lbl">পদবি (বাংলা)</td><td class="val bold">${t.designationBng || 'N/A'}</td>
              <td class="lbl">Designation (En)</td><td class="val">${t.designation || 'N/A'}</td>
            </tr>
            <tr>
              <td class="lbl">স্টাফ ক্যাটাগরি</td><td class="val">${t.staffCategory || 'N/A'}</td>
              <td class="lbl">চাকরির ধরন</td><td class="val">${t.employmentType || 'N/A'}</td>
            </tr>
            <tr>
              <td class="lbl">পাঠদানের বিষয়</td><td class="val">${t.subject || 'N/A'}</td>
              <td class="lbl">নির্ধারিত শ্রেণি</td><td class="val">${t.assignedClass || 'নেই'}${t.canEditAssignedClass ? ' (Edit Allowed)' : ''}</td>
            </tr>
            <tr>
              <td class="lbl">যোগদানের তারিখ</td><td class="val">${fmtDate(t.joiningDate)}</td>
              <td class="lbl">চাকরি ছাড়ার তারিখ</td><td class="val">${t.resignationDate ? fmtDate(t.resignationDate) : 'কর্মরত (Running)'}</td>
            </tr>
            <tr>
              <td class="lbl">পোর্টাল রোল</td><td class="val">${t.role || 'Teacher'}</td>
              <td class="lbl">মাসিক ছুটির কোটা</td><td class="val">${t.customLeaveQuota ?? 2} দিন</td>
            </tr>
            ${
              history.length > 0
                ? `<tr><td class="lbl">চাকরির মেয়াদকাল</td><td colspan="3" class="val">${history
                    .map((h) => `${fmtDate(h.startDate)} → ${h.endDate ? fmtDate(h.endDate) : 'Present'}`)
                    .join(' | ')}</td></tr>`
                : ''
            }
          </table>

          <!-- CONTACT & EMERGENCY -->
          <div class="sec-title">২. যোগাযোগ ও জরুরি তথ্য (Contact & Emergency Information)</div>
          <table class="info-table">
            <tr>
              <td class="lbl">মোবাইল নম্বর</td><td class="val mono bold">${t.phone || 'N/A'}</td>
              <td class="lbl">ইমেইল ঠিকানা</td><td class="val">${t.email || 'N/A'}</td>
            </tr>
            <tr>
              <td class="lbl">জরুরি ব্যক্তির নাম</td><td class="val">${t.emergencyContact?.contactName || 'N/A'} (${t.emergencyContact?.relationship || 'N/A'})</td>
              <td class="lbl">জরুরি মোবাইল</td><td class="val mono bold">${t.emergencyContact?.phone || 'N/A'}</td>
            </tr>
          </table>

          <!-- ADDRESSES -->
          <div class="sec-title">৩. ঠিকানা (Present & Permanent Address)</div>
          <table class="info-table">
            <tr>
              <td class="lbl">বর্তমান ঠিকানা (বাংলা)</td><td colspan="3" class="val">${fmtAddressBn(t.presentAddress)}</td>
            </tr>
            <tr>
              <td class="lbl">Present Address (En)</td><td colspan="3" class="val">${fmtAddressEn(t.presentAddress)}</td>
            </tr>
            <tr>
              <td class="lbl">স্থায়ী ঠিকানা (বাংলা)</td><td colspan="3" class="val">${fmtAddressBn(t.permanentAddress)}</td>
            </tr>
            <tr>
              <td class="lbl">Permanent Address (En)</td><td colspan="3" class="val">${fmtAddressEn(t.permanentAddress)}</td>
            </tr>
          </table>

          <!-- ACADEMIC QUALIFICATIONS -->
          <div class="sec-title">৪. শিক্ষাগত যোগ্যতা (Academic Qualifications)</div>
          <table class="info-table qual-table">
            <thead>
              <tr>
                <th style="width:14%;">ডিগ্রি / স্তর</th>
                <th style="width:20%;">পরীক্ষার নাম</th>
                <th style="width:16%;">বিভাগ / বিষয়</th>
                <th style="width:24%;">বোর্ড / বিশ্ববিদ্যালয়</th>
                <th style="width:8%;">সন</th>
                <th style="width:18%;">ফলাফল / রোল</th>
              </tr>
            </thead>
            <tbody>
              ${
                quals.length > 0
                  ? quals
                      .map((q) => {
                        const res =
                          ['GPA', 'CGPA'].includes(q.resultType) && q.gpaOrCgpa
                            ? `${q.resultType}: ${q.gpaOrCgpa}/${q.scale || 5}`
                            : q.resultGrade
                            ? `${q.resultGrade} ${q.resultType}`
                            : q.resultType || 'Passed';
                        return `
                        <tr>
                          <td>${q.degreeLevel || ''}</td>
                          <td>${q.examTitle || ''}</td>
                          <td>${q.majorOrGroup || '—'}</td>
                          <td>${q.boardOrUniversity || ''}</td>
                          <td class="tc">${q.passingYear || ''}</td>
                          <td>${res}${q.rollNumber ? `<br/>Roll: ${q.rollNumber}` : ''}</td>
                        </tr>`;
                      })
                      .join('')
                  : `<tr><td colspan="6" class="tc">কোনো শিক্ষাগত যোগ্যতা যুক্ত করা হয়নি</td></tr>`
              }
            </tbody>
          </table>

          <!-- SALARY & BANK DETAILS -->
          <div class="sec-title">৫. বেতন ও ব্যাংক তথ্য (Payroll & Bank Details)</div>
          <table class="info-table">
            <tr>
              <td class="lbl">মূল বেতন (Basic Salary)</td><td class="val bold mono">৳ ${Number(t.basicSalary || 0).toLocaleString('en-IN')} /-</td>
              <td class="lbl">পেমেন্ট পদ্ধতি</td><td class="val">${t.paymentMethod || 'Cash'}</td>
            </tr>
            <tr>
              <td class="lbl">ব্যাংকের নাম ও শাখা</td><td class="val">${b.bankName || 'N/A'}${b.branchName ? `, ${b.branchName}` : ''}</td>
              <td class="lbl">অ্যাকাউন্ট হোল্ডার</td><td class="val">${b.accountHolderName || 'N/A'}</td>
            </tr>
            <tr>
              <td class="lbl">অ্যাকাউন্ট নম্বর</td><td class="val mono">${b.accountNumber || 'N/A'}</td>
              <td class="lbl">রাউটিং নম্বর</td><td class="val mono">${b.routingNumber || 'N/A'}</td>
            </tr>
          </table>

          <!-- SIGNATURES FOOTER -->
          <div class="footer">
            <div class="sign">শিক্ষক / কর্মচারীর স্বাক্ষর<br/><span>Teacher / Staff Signature</span></div>
            <div class="issued">Print Date: ${issuedOn}</div>
            <div class="sign">সুপারিনটেনডেন্টের স্বাক্ষর ও সিল<br/><span>Superintendent Signature & Seal</span></div>
          </div>
        </div>
      </div>`;
    })
    .join('');

  w.document.write(`
    <html>
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
      <title>Teacher Information Sheet - ${CONFIG.APP_NAME}</title>
      <style>
        @media print {
          @page { size: A4 portrait; margin: 9mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        * { box-sizing: border-box; }
        body { font-family: 'Hind Siliguri', Arial, sans-serif; color: #000; background: #fff; margin: 0; font-size: 11px; }
        .page { page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .sheet {
          border: 2px solid #000;
          padding: 10px 12px;
          min-height: 277mm;
          display: flex;
          flex-direction: column;
        }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
        .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.8px; }
        .header .bn-inst { margin: 1px 0 4px; font-size: 12.5px; font-weight: 600; }
        .header .doc-title { display: inline-block; border: 1.5px solid #000; background: #eee; padding: 2px 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; }
        .meta-bar { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid #000; padding: 4px 2px; margin-bottom: 8px; font-size: 10.5px; }
        .top-row { display: flex; gap: 10px; align-items: stretch; margin-bottom: 6px; }
        .photo-box { width: 102px; flex-shrink: 0; border: 1px solid #000; padding: 4px; text-align: center; display: flex; flex-direction: column; justify-content: center; }
        .photo-box img { width: 92px; height: 108px; object-fit: cover; border: 1px solid #000; margin: 0 auto 4px; display: block; }
        .photo-cap { font-weight: 700; font-size: 11px; border-top: 1px solid #000; padding-top: 2px; }
        .photo-sub { font-size: 9.5px; font-weight: 600; }
        .sec-title { background: #eee; border: 1px solid #000; border-bottom: none; padding: 3px 7px; font-weight: 700; font-size: 11px; margin-top: 7px; }
        .info-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        .info-table th, .info-table td { border: 1px solid #000; padding: 3px 6px; vertical-align: top; }
        .info-table th { background: #f3f3f3; text-align: left; font-weight: 700; font-size: 10px; }
        .lbl { width: 18%; font-weight: 700; background: #fafafa; }
        .val { width: 32%; }
        .bold { font-weight: 700; }
        .mono { font-family: monospace; font-size: 10.5px; }
        .tc { text-align: center; }
        .footer { margin-top: auto; padding-top: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
        .sign { border-top: 1.5px solid #000; width: 185px; text-align: center; padding-top: 3px; font-size: 10.5px; font-weight: 700; }
        .sign span { font-size: 9px; font-weight: 400; }
        .issued { font-size: 9.5px; color: #333; }
      </style>
    </head>
    <body>
      ${pagesHtml}
      <script>
        window.onload = function () { setTimeout(() => window.print(), 700); };
      </script>
    </body>
    </html>
  `);
  w.document.close();
};

// ================================================================
// 5. TEACHER ID CARDS PRINT (USER'S EXACT DESIGN — 100% VERBATIM)
// ================================================================
const formatIdCardDate = (dStr) => {
  if (!dStr) return '';
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dStr;
  }
};

const formatIdCardPhone = (val) => {
  const digits = String(val || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('880')) return '0' + digits.slice(3);
  if (digits.startsWith('0')) return digits;
  return '0' + digits;
};

const formatIdCardBlood = (bg) => {
  const clean = String(bg || '').trim();
  if (!clean || clean === 'N/A') return 'N/A';
  if (clean.endsWith('+')) return `${clean} (Positive)`;
  if (clean.endsWith('-')) return `${clean} (Negative)`;
  return clean;
};

export const printTeacherIDCards = (teachersToPrint = []) => {
  if (!teachersToPrint.length) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return alert('পপআপ ব্লক হয়েছে!');

  let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ARDM - Print ID Cards</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Noto+Sans+Bengali:wght@500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@400;500;600;700;800;900&family=Noto+Sans+Bengali:wght@500;600;700&display=swap');
        
        :root {
          --primary: #0B192C;       
          --secondary: #1A365D;     
          --accent: #D4AF37;        
          --accent-light: #FBECA1;  
          --text-main: #0F172A;     
          --text-light: #64748B;    
          --bg-color: #F8FAFC;      
          --white: #FFFFFF;
          --danger: #E11D48;
          --gold-gradient: linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Poppins', 'Noto Sans Bengali', sans-serif;
          background: #D1D5DB;
        }

        /* Container for the cards on screen */
        #print-container {
          display: flex;
          justify-content:space-between;
          align-items: flex-start;
          gap: 40px;
          padding: 50px;
          min-height: 100vh;
          flex-wrap: wrap;
        }

        .id-card {
          width: 2.125in;
          height: 3.375in;
          background: var(--white);
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #E2E8F0;
          z-index: 1;
        }

        .id-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(var(--secondary) 0.5px, transparent 0.5px);
          background-size: 12px 12px;
          opacity: 0.04;
          z-index: -2;
        }

        .header-bg {
          position: absolute;
          top: 0; left: 0; width: 100%;
          height: 125px;
          background: linear-gradient(145deg, var(--primary) 0%, var(--secondary) 100%);
          clip-path: polygon(0 0, 100% 0, 100% 78%, 0% 100%);
          z-index: 0;
        }

        .header-bg::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; width: 100%; height: 4px;
          background: var(--gold-gradient);
        }

        .header-content {
          position: relative;
          z-index: 1;
          text-align: center;
          padding-top: 15px;
          color: var(--white);
        }

        .inst-title {
          font-family: 'Bebas Neue';
          font-size: 17px;
          font-weight: normal;
          text-transform: uppercase;
          padding: 0 10px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.4);
        }

        .inst-sub {
          font-family: 'Poppins', sans-serif;
          font-size: 7px;
          font-weight: 500;
          color: #CBD5E1;
          margin-top: 0px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .profile-area {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 10px;
        }

        .photo-frame {
          width: 90px;
          height: 90px;
          background: var(--white);
          border-radius: 20px; 
          position: relative;
        }

        .photo-frame::before {
          content: '';
          position: absolute;
          inset: -2.5px;
          background: var(--gold-gradient);
          border-radius: 22px;
          z-index: -1;
        }

        .photo-frame img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 20px;
          display: block;
          margin: 0;
          padding: 0;
        }

        .person-info {
          text-align: center;
          margin-top: 8px;
          padding: 0 10px;
        }

        .name-en {
          font-size: 12px; 
          font-weight: 800;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: -0.2px;
          line-height: 1.1;
        }

        .name-bn {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-light);
          margin-top: 1px;
        }

        .designation {
          font-size: 7px;
          font-weight: 700;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin-top: 2px;
          background: var(--primary);
          display: inline-block;
          padding: 3px 10px;
          border-radius: 4px;
        }

        .details-table {
          width: 85%;
          margin: 8px auto 0;
          display: grid;
          grid-template-columns: 68px 10px 1fr;
          row-gap: 3.5px;
          font-size: 9px;
        }

        .d-lbl { font-weight: 700; color: var(--text-light); text-transform: uppercase; }
        .d-col { font-weight: 700; color: var(--text-main); text-align: center;}
        .d-val { font-weight: 800; color: var(--text-main); }
        .d-val.blood { color: var(--danger); font-weight: 900; font-size: 9px; }

        .bottom-barcode {
          position: absolute;
          bottom: 8px;
          width: 100%;
          text-align: center;
        }

        .barcode-font {
          font-family: 'Libre Barcode 128', cursive;
          font-size: 27px;
          line-height: 0.8;
          letter-spacing: 2px;
          color: var(--primary);
          opacity: 0.9;
        }

        .card-footer-color {
          position: absolute;
          bottom: 0; left: 0; width: 100%; height: 11px;
          border-top: 2px solid var(--accent);
          background: var(--primary);
        }

        /* BACK SIDE DESIGN */
        .back-header {
          background: var(--primary);
          padding: 10px 10px;
          text-align: center;
          border-bottom: 2px solid var(--accent);
        }

        .back-header h3 {
          font-family: 'Bebas Neue', sans-serif;
          color: var(--white);
          font-size: 14px;
          font-weight: normal;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .back-body {
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          height: calc(100% - 35px);
        }

        .address-box {
          background: var(--bg-color);
          border: 1px solid #E2E8F0;
          border-left: 3px solid var(--primary);
          border-radius: 4px;
          padding: 8px;
          margin-bottom: 7px;
        }

        .s-title {
          font-size: 8px;
          font-weight: 800;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }

        .s-text {
          font-size: 7px;
          text-transform: capitalize;
          color: var(--text-main);
          font-weight: 600;
          line-height: 1.4;
        }

        .mid-section {
          display: flex;
          justify-content:left;
          gap:15px;
          align-items: center;
          margin-bottom: 10px;
        }

        .qr-holder {
          width: 55px;
          height: 55px;
          background: var(--white);
          padding: 3px;
          border: 1px solid #CBD5E1;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .qr-holder img { width: 100%; height: 100%; display: block; }

        .issue-info { text-align: left; }
        .i-lbl { font-size: 5.5px; color: var(--text-light); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;}
        .i-val { font-size: 10px; font-weight: 800; color: var(--primary); margin-bottom: 4px;}
        .status-badge {
          background: #059669; color: var(--white); font-size: 5.5px; padding: 3px 8px; 
          border-radius: 5px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;
        }

        .terms-box { margin-bottom: auto; }
        .terms-box ul { padding-left: 12px; margin: 0; }
        .terms-box li { font-size: 6.5px; color: var(--text-light); font-weight: 500; margin-bottom: 3px; line-height: 1.3;}

        .emergency-strip {
          background: #FFF1F2;
          border: 1px dashed #FECDD3;
          border-radius: 6px;
          text-align: center;
          padding: 8px;
          margin-top: 0px;
          margin-bottom: 25px;
        }
        .em-lbl { font-size: 6.5px; color: var(--danger); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;}
        .em-num { font-size: 12px; font-weight: 900; color: #BE123C; margin-top: 2px;}

        .return-footer {
          position: absolute;
          bottom: 0; left: 0; width: 100%;
          background: var(--primary);
          color: #CBD5E1;
          font-size: 10px;
          font-family:'Bebas Neue';
          text-align: center;
          padding: 8px 0;
          font-weight: 500;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        /* PRINT SPECIFICATIONS - A4 Landscape, 4 pairs per page */
        @media print {
          body {
            background: none;
            padding: 0;
            margin: 0;
            display: block;
          }
          #print-container {
            padding: 0;
            min-height: auto;
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-content: flex-start;
            gap: 0;
            row-gap: 25px;
            column-gap: 0;
          }
          .id-pair {
            display: flex;
            gap: 8px;
          }
          .id-card {
            margin: 0px 5px;
            float: left;
            page-break-inside: avoid;
            box-shadow: none;
            border: 0.5px dashed #94A3B8; 
          }
          @page {
            size: A4 landscape;
            margin: 0.5in;
          }
        }
        
        .loading-screen {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          font-family: sans-serif;
        }
      </style>
    </head>
    <body>
      <div id="loading" class="loading-screen">
        <h2 style="color: #0B192C;">Preparing ID Cards for Print...</h2>
        <p style="color: #64748B;">Please wait while fonts and images load.</p>
      </div>
      <div id="print-container">
  `;

  teachersToPrint.forEach((t) => {
    const photo = t.profilePicture?.url || 'https://placehold.co/400x400/ffffff/64748b?text=No+Photo';
    const tid = t.teacherCode || '';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://ardm.netlify.app/teacher/${tid}`;
    const dobFormat = formatIdCardDate(t.dateOfBirth);
    const joinFormat = formatIdCardDate(t.joiningDate);

    const addr = (t.permanentAddress && (t.permanentAddress.houseNameEn || t.permanentAddress.houseOrRoad || t.permanentAddress.villageEn || t.permanentAddress.village))
      ? t.permanentAddress
      : (t.presentAddress || {});

    const house = addr.houseNameEn || addr.houseOrRoad || '';
    const village = addr.villageEn || addr.village || '';
    const postOffice = addr.postOffice || '';
    const postCode = addr.postCode || '';
    const upazila = addr.upazilaEn || addr.upazila || '';
    const district = addr.districtEn || addr.district || '';

    htmlContent += `
      <!-- FRONT -->
      <div class="id-pair">
        <div class="id-card">
          <div class="header-bg"></div>
          <div class="header-content">
            <div class="inst-title">Abdur Razzak Dakhil Madrasah</div>
            <div class="inst-sub">Sarafbhata, Rangunia, Chattogram</div>
          </div>
          <div class="profile-area">
            <div class="photo-frame">
              <img src="${photo}" alt="Teacher Photo">
            </div>
          </div>
          <div class="person-info">
            <div class="name-en">${t.fullNameEng || ''}</div>
            <div class="name-bn">${t.fullNameBng || ''}</div>
            <div class="designation">${t.designation || ''}</div>
          </div>
          <div class="details-table">
            <div class="d-lbl">Teacher ID</div><div class="d-col">:</div><div class="d-val">${tid}</div>
            <div class="d-lbl">Mobile</div><div class="d-col">:</div><div class="d-val">${formatIdCardPhone(t.phone)}</div>
            <div class="d-lbl">Blood Group</div><div class="d-col">:</div><div class="d-val blood">${formatIdCardBlood(t.bloodGroup)}</div>
            <div class="d-lbl">Date Of Birth</div><div class="d-col">:</div><div class="d-val">${dobFormat}</div>
          </div>
          <div class="bottom-barcode">
            <div class="barcode-font">${tid}</div>
          </div>
          <div class="card-footer-color"></div>
        </div>

        <!-- BACK -->
        <div class="id-card">
          <div class="back-header">
            <h3>Abdur Razzak Dakhil Madrasah</h3>
          </div>
          <div class="back-body">
            <div class="address-box">
              <div class="s-title">Permanent Address</div>
              <div class="s-text">
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">House: ${house},</div>
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;"> Vill: ${village}, Post: ${postOffice} - ${postCode}, </div>
                Upazila: ${upazila}, District: ${district}.
              </div>
            </div>

            <div class="mid-section">
              <div class="qr-holder">
                <img src="${qrUrl}" alt="QR Code">
              </div>
              <div class="issue-info">
                <div class="i-lbl">Date Of Join</div>
                <div class="i-val">${joinFormat}</div>
                <div class="status-badge">Active Staff</div>
              </div>
            </div>
            <div class="terms-box">
              <div class="s-title" style="border-bottom: 1px solid #E2E8F0; padding-bottom: 3px; margin-bottom: 4px;">Terms & Conditions</div>
              <ul>
                <li>This card is property of the institution.</li>
                <li>Must be worn visibly during duty hours.</li>
                <li>If lost, inform the authority immediately.</li>
              </ul>
            </div>
            <div class="emergency-strip">
              <div class="em-lbl">Emergency Contact Number</div>
              <div class="em-num">${formatIdCardPhone(t.emergencyContact?.phone)}</div>
            </div>
          </div>
          <div class="return-footer">
            If found, please return to the madrasah office.
          </div>
        </div>
      </div>
    `;
  });

  htmlContent += `
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            document.getElementById('loading').style.display = 'none';
            window.print();
          }, 1000);
        }
      <\/script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};