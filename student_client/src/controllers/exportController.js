/**
- ARDM Student Portal — Export Controller
- Excel CSV · 2-per-page PDF Info Sheet · A4 Table Register · Bulk CR80 ID Cards ·
- vCard (.vcf) · Copy IDs.
 *
- ⚠️ প্রিন্ট/এক্সপোর্ট টেমপ্লেটগুলো মূল Index.jsx থেকে অক্ষরে অক্ষরে কপি করা —
-    এগুলো কখনো পরিবর্তন করা যাবে না।
 */
import signImg from '../assets/principal-sign.png';
import { CONFIG, DEFAULT_IMAGE, getPortalSettings } from '../config/systemConfig';
import { canExportStudents, formatDate, toISODate } from '../models/studentModel';

// ── vCard EXPORT HELPERS (ported from register→contact tool) ──
const CONTACT_CLASS_CODE = {
  "Play": "00", "Nursery": "0", "KG": "0K", "Kg": "0K",
  "One": "1", "Two": "2", "Three": "3", "Four": "4",
  "Five": "5", "Six": "6", "Seven": "7", "Eight": "8", "Nine": "9", "Ten": "10"
};

const vcardEscape = (str) => {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
};

const foldLine = (line) => {
  if (line.length <= 75) return line;
  let out = "";
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (count === 75) { out += "\r\n "; count = 0; }
    out += line[i];
    count++;
  }
  return out;
};

const fetchAsBase64 = async (url) => {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("bad status");
    const blob = await res.blob();
    const type = blob.type || "image/jpeg";
    const buf = await blob.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return { base64: btoa(binary), type };
  } catch (err) {
    return null;
  }
};

const buildContactAddress = (s) => {
  const street = [s.houseEn, s.villageEn].filter(Boolean).join(", ");
  return `;;${vcardEscape(street)};${vcardEscape(s.upazilaEn)};${vcardEscape(s.unionEn)};;${vcardEscape(s.districtEn)}`;
};

const buildContactNote = (s) => {
  const lines = [
    `নাম: ${s.nameBn}`,
    `Student ID: ${s.id}`,
    `Father: ${s.fatherEn}`,
    `পিতা: ${s.fatherBn ? ` ${s.fatherBn}` : ""}`,
    `Mother: ${s.motherEn}`,
    `মাতা: ${s.motherBn ? ` ${s.motherBn}` : ""}`,
    `Blood Group: ${s.blood || "N/A"}`,
    `BRN: ${s.brn || "N/A"}`,
    `Class: ${s.classEn} · Roll ${s.roll}`
  ];
  return lines.join("\n");
};

const normalizeForVCard = (data) => {
  const rawClass = (data.ClassEn || "").trim();
  const code = CONTACT_CLASS_CODE[rawClass] || "0";
  const nameEn = data.StudentNameEn || "";
  return {
    id: data.ID,
    code,
    classEn: data.ClassEn,
    roll: data.Roll,
    nameEn,
    nameBn: data.StudentNameBn,
    brn: data.BRN,
    dob: toISODate(data.DOB),
    session: data.Session,
    blood: data.BloodGroup,
    fatherEn: data.FatherNameEn, fatherBn: data.FatherNameBn,
    motherEn: data.MotherNameEn, motherBn: data.MotherNameBn,
    mobile: data.WhatsApp, emergency: data.EmergencyNo,
    houseEn: data.HouseNameEn, villageEn: data.VillageEn,
    unionEn: data.UnionEn, upazilaEn: data.UpazilaEn, districtEn: data.DistrictEn,
    imageUrl: data.ImageURL,
    vcardName: `${code} ${nameEn}`.trim()
  };
};

const buildContactVCard = async (data) => {
  const s = normalizeForVCard(data);
  let photoData = null;
  if (s.imageUrl) photoData = await fetchAsBase64(s.imageUrl);

  const lines = [];
  lines.push("BEGIN:VCARD");
  lines.push("VERSION:3.0");
  lines.push(foldLine(`FN:${vcardEscape(s.vcardName)}`));
  lines.push(foldLine(`N:${vcardEscape(s.vcardName)};;;;`));
  if (s.mobile) lines.push(foldLine(`TEL;TYPE=CELL,VOICE:${vcardEscape(s.mobile)}`));
  if (s.emergency && s.emergency !== s.mobile) lines.push(foldLine(`TEL;TYPE=HOME,VOICE:${vcardEscape(s.emergency)}`));
  lines.push(foldLine(`ADR;TYPE=HOME:${buildContactAddress(s)}`));
  if (s.dob) lines.push(`BDAY:${s.dob}`);
  lines.push(foldLine(`ORG:Class ${vcardEscape(s.classEn)} (Roll: ${vcardEscape(s.roll)}) Session: ${vcardEscape(s.session)}`));
  lines.push(foldLine(`TITLE:Student`));
  lines.push(foldLine(`CATEGORIES:ARDM,Class ${vcardEscape(s.classEn)}`));
  lines.push(foldLine(`NOTE:${vcardEscape(buildContactNote(s))}`));
  if (photoData) {
    const subtype = (photoData.type.split("/")[1] || "JPEG").toUpperCase();
    lines.push(foldLine(`PHOTO;ENCODING=b;TYPE=${subtype}:${photoData.base64}`));
  } else if (s.imageUrl) {
    lines.push(foldLine(`PHOTO;VALUE=URI:${s.imageUrl}`));
  }
  lines.push(`REV:${new Date().toISOString()}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
};

/**
- ctx = { filteredList, currentUser, showToast, setContactProgress, portalSettings }
- (filteredList = বর্তমানে স্ক্রিনে দেখানো লিস্ট)
 */
export const createExportController = ({ filteredList, currentUser, showToast, setContactProgress, portalSettings }) => {
  // --- EXPORT FUNCTIONS (FULL RESTORED) ---
  const getFilteredData = () => {
    return filteredList;
  };

  const checkExportPermission = () => {
    if (!currentUser || currentUser?.role === 'Visitor') {
      showToast("ভিজিটরদের ডাটা ডাউনলোড করার অনুমতি নেই!", "error");
      return false;
    }

    const activeSettings = portalSettings || getPortalSettings();

    // যদি ফিল্টার করা লিস্টে কোনো ডাটা থাকে, প্রতিটি শিক্ষার্থীর শ্রেণির এক্সপোর্ট অনুমতি যাচাই করা হবে
    if (Array.isArray(filteredList) && filteredList.length > 0) {
      const hasUnauthorized = filteredList.some(
        (s) => !canExportStudents(currentUser, s.ClassBn, activeSettings)
      );
      if (hasUnauthorized) {
        showToast(
          currentUser.classBn
            ? `আপনি শুধুমাত্র অনুমোদিত শ্রেণি (${currentUser.classBn}) এর ডাটা ডাউনলোড করতে পারবেন!`
            : "আপনার শিক্ষার্থীর তথ্য এক্সপোর্ট করার অনুমতি নেই!",
          "error"
        );
        return false;
      }
      return true;
    }

    // লিস্ট খালি থাকলে সাধারণ এক্সপোর্ট অনুমতি যাচাই
    if (!canExportStudents(currentUser, null, activeSettings)) {
      showToast("আপনার শিক্ষার্থীর তথ্য এক্সপোর্ট করার অনুমতি নেই!", "error");
      return false;
    }

    return true;
  };

  const handleExportTablePDF = () => {
    if (!checkExportPermission()) return;

    const data = getFilteredData();
    if (!data || data.length === 0) {
      showToast("লিস্ট প্রিন্ট করার জন্য কোনো ডাটা নেই", "error");
      return;
    }

    const w = window.open('', '_blank');
    w.document.write(`
    <html>
    <head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
      <title>${CONFIG.APP_NAME} - Register</title>
      <style>
        @media print { @page { size: A4; margin: 12mm 8mm 8mm; } }
        body { font-family: 'Hind Siliguri', sans-serif; font-size: 15px; }
        h2 { text-align:center; margin-bottom:5px; }
        table { width:100%; font-size: 14px; border-collapse: collapse; table-layout: fixed; }
        th, td { border:1px solid #000; padding:3px 5px; vertical-align: top; }
        th { background:#eee; text-align:center; }
        thead { display: table-header-group; }

      .col-img {width : 11%; padding: 3px;}
        .col-small { width: 13.5%; }
        .col-name { width: 27%; }
        .col-family { width: 27%; }
        .col-address { width: 21.5%; }
        img { width: 100%; height: 100%; object-fit: contain; object-position: center center; }
        .block div { margin:0 0; }
        .label { font-weight:bold; }

      </style>
    </head>
 <body>
  <h2>${CONFIG.APP_NAME} - Student Register</h2>
  <p style="text-align:center; font-size:13px; font-weight:bold; margin:4px 0; margin-bottom :0px;">
  Total: ${data.length} | 
  Male: ${data.filter(s => s.Gender === 'Male').length} | 
  Female: ${data.filter(s => s.Gender === 'Female').length}
</p>

<p style="text-align:center; font-size:13.5px; font-weight:bold; margin-bottom:5px;">
  ${[...new Set(data.map(s => s.ClassEn))].length === 1 
    ? `Class: ${data[0].ClassEn}` 
    : [...new Set(data.map(s => s.ClassEn))]
        .map(c => `${c}: ${data.filter(s => s.ClassEn === c).length}`)
        .join(' | ')
  }
</p>

  <table>
    <thead>
      <tr>
        <th class="col-small">Photo</th>
        <th class="col-name">Name Info</th>
        <th class="col-small">Class Info</th>
        <th class="col-family">Family & Phone</th>
        <th class="col-address">Address</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(s => `
        <tr>
          <td class="col-img">
            <img src="${s.ImageURL || DEFAULT_IMAGE }" />
          </td>
          <td class="col-name block">
            <div><span class="label"> ${s.StudentNameBn || ''}</span></div>
            <div><span class="label"> ${s.StudentNameEn || ''}</span></div>
            <div><span class="label"> ID: ${s.ID || ''}</span></div>
          <div><span class="label"> BRN: ${s.BRN || ''}</span></div>
       
          </td>
          <td class="col-small block">
            <div><span class="label">Class:</span> ${s.ClassEn || s.ClassBn || ''}</div>
            <div><span class="label">Roll:</span> ${s.Roll || ''}</div>
            <div><span class="label">Blood:</span> ${s.BloodGroup || ''}</div>
            <div><span class="label">${s.Gender || ''}</span> </div>
            
          </td>
          <td class="col-family block">
            <div><span class="label">পিতা:</span> ${s.FatherNameBn || ''}</div>
            <div><span class="label">মাতা:</span> ${s.MotherNameBn || ''}</div>
            <div><span class="label">Phone:</span> ${s.WhatsApp || ''}</div>
         <div><span class="label">DOB:</span> ${formatDate(s.DOB) || ''}</div>
         
          </td>
          <td class="col-address block">
            <div>
              ${s.HouseNameBn || ''}, ${s.VillageBn || ''}, 
              ${s.UnionBn || ''}, ${s.UpazilaBn || ''}, 
              ${s.DistrictBn || ''}
            </div>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
 <script>
  window.onload = function () {
    setTimeout(() => {
      window.print();
    }, 800); // QR + photo load হওয়ার সময় দেয়
  };
</script>

</body>

    </html>
    `);
    w.document.close();
  };

  const handleExportExcel = () => {
    if (!checkExportPermission()) return;

    const dataToExport = getFilteredData();
    if (dataToExport.length === 0)  return showToast("এক্সেল ডাউনলোড করার জন্য কোনো ডাটা নেই!", "error");

    const headers = [
      "ID", "Time", "Session", "Name (Bn)", "Name (En)", "Roll", "Class (Bn)", "Class (En)", 
      "BRN", "DOB", "Blood", "Gender","Father (Bn)", "Father (En)", "Mother (Bn)", "Mother (En)", 
      "Mobile", "Emergency", "House (Bn)", "House (En)", "Village (Bn)", "Village (En)", 
      "Union (Bn)", "Union (En)", "Ward", "Upazila (Bn)", "Upazila (En)", 
      "District (Bn)", "District (En)", "Image URL", "Status"
    ];

    const rows = dataToExport.map(s => [
          s.ID, s.Time, s.Session, s.StudentNameBn, s.StudentNameEn, s.Roll, s.ClassBn, s.ClassEn,
          `'${s.BRN}`, s.DOB, s.BloodGroup, s.Gender,s.FatherNameBn, s.FatherNameEn, s.MotherNameBn, s.MotherNameEn,
          `'${s.WhatsApp}`, `'${s.EmergencyNo}`, s.HouseNameBn, s.HouseNameEn, s.VillageBn, s.VillageEn,
          s.UnionBn, s.UnionEn, s.WardNo, s.UpazilaBn, s.UpazilaEn, s.DistrictBn, s.DistrictEn,
          s.ImageURL, s.Status
        ].map(f => `"${f || ''}"`).join(",")
    );

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `Student_Data_${new Date().toLocaleDateString()}.csv`;

    link.click();
  };

  const handleCopyAllIds = async () => {
    const list = filteredList;
    if (!list || list.length === 0) {
      return showToast("কপি করার জন্য কোনো আইডি নেই", "error");
    }
    const idsText = list.map(s => s.ID).filter(Boolean).join(', ');
    try {
      await navigator.clipboard.writeText(idsText);
      showToast(`${list.length}টি স্টুডেন্ট আইডি কপি হয়েছে`, "success");
    } catch (e) {
      showToast("কপি করা যায়নি", "error");
    }
  };

  const handleExportContacts = async () => {
    if (!checkExportPermission()) return;

    const list = getFilteredData();
    if (!list || list.length === 0) {
      return showToast("কন্টাক ডাউনলোড করার জন্য কোনো ডাটা নেই", "error");
    }

    setContactProgress({ show: true, current: 0, total: list.length, name: '' });

    try {
      const cards = [];
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        setContactProgress({ show: true, current: i, total: list.length, name: s.StudentNameEn || s.StudentNameBn || '' });
        cards.push(await buildContactVCard(s));
      }
      setContactProgress({ show: true, current: list.length, total: list.length, name: '' });

      const vcfText = cards.join("\r\n");
      const blob = new Blob([vcfText], { type: "text/vcard;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ARDM_Contacts_${list.length}_${new Date().toISOString().slice(0,10)}.vcf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`${list.length} টি কন্টাক কার্ড ডাউনলোড হয়েছে`, "success");
    } catch (e) {
      showToast("কন্টাক তৈরি করতে সমস্যা হয়েছে", "error");
    } finally {
      setTimeout(() => setContactProgress({ show: false, current: 0, total: 0, name: '' }), 300);
    }
  };

  const handleExportPDF = () => {
    if (!checkExportPermission()) return;

    const dataToExport = getFilteredData();
    if (dataToExport.length === 0) return showToast("ইনফো শিটের জন্য কোনো ডাটা পাওয়া যায়নি!", "error");

    const printWindow = window.open('', '_blank', 'height=900,width=1100');
    if (!printWindow) {
      return alert("পপআপ ব্লক হয়েছে!");
    }

    printWindow.document.write(`
    <html>
    <head>
      <title>Student Information Sheet</title>
      <style>
        @media print {
          @page { size: A4; margin: 10mm; }
        }

        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          margin: 0;
        }

        .page {
          page-break-after: always;
        }

        .student-card {
          border: 2px solid #000;
          padding: 8px;
          margin-bottom: 38px;
          height: 48%;
          box-sizing: border-box;
        }

        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          margin-bottom: 6px;
        }

        .header h2 {
          margin: 0;
          font-size: 20px;
        }

        .header p {
          margin: 0;
          font-size: 15px;
        }

        .top-row {
          display: flex;
          gap: 10px;
        }

        .photo-box {
          width: 110px;
          text-align: center;
        }

        .photo-box img {
          width: 100px;
          height: 110px;
          border: 1px solid #000;
        }

        table {
        font-size : 13px;
          width: 100%;
          border-collapse: collapse;
        }

        td {
          border: 1px solid #000;
          padding: 3px;
          vertical-align: top;
        }

        .label {
          width: 35%;
          font-weight: bold;
        }

        .footer {
          margin-top: 28px;
          display: flex;
          justify-content: space-between;
        }

        .sign {
          border-top: 1px solid #000;
          width: 150px;
          text-align: center;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
    `);

    dataToExport.forEach((s, i) => {
      if (i % 2 === 0) printWindow.document.write(`<div class="page">`);

      printWindow.document.write(`
        <div class="student-card">
          <div class="header">
            <h2>${CONFIG.APP_NAME}</h2>
            <p>Student Information Form</p>
          </div>

          <div class="top-row">
            <div class="photo-box">
              <img src="${s.ImageURL || DEFAULT_IMAGE}">
              <div>Roll: ${s.Roll}</div>
              <div>Class: ${s.ClassEn || s.ClassBn}</div>
            </div>

            <table>
              <tr><td class="label">শিক্ষার্থীর নাম :</td><td>${s.StudentNameBn}</td></tr>
              <tr><td class="label">Student's Name :</td><td>${s.StudentNameEn}</td></tr>
               <tr><td class="label">Student ID :</td><td>${s.ID}</td></tr>
              <tr><td class="label">জন্ম নিবন্ধন নং :</td><td>${s.BRN}</td></tr>
              <tr><td class="label">Date of Birth :</td><td>${formatDate(s.DOB)}</td></tr>
              <tr><td class="label">Blood Group :</td><td>${s.BloodGroup}</td></tr>
                <tr><td class="label">Gender :</td><td>${s.Gender}</td></tr>
              <tr><td class="label">Session :</td><td>${s.Session}</td></tr>

              <tr><td class="label">পিতার নাম :</td><td>${s.FatherNameBn}</td></tr>
              <tr><td class="label">Father's Name :</td><td>${s.FatherNameEn}</td></tr>
              <tr><td class="label">মাতার নাম :</td><td>${s.MotherNameBn}</td></tr>
              <tr><td class="label">Mother's Name :</td><td>${s.MotherNameEn}</td></tr>

              <tr><td class="label">মোবাইল :</td><td>${s.WhatsApp}</td></tr>
              <tr><td class="label">জরুরী নম্বর :</td><td>${s.EmergencyNo}</td></tr>

              <tr><td class="label">ঠিকানা (বাংলা) :</td>
                <td>${s.HouseNameBn || ''}, ${s.VillageBn || ''}, ${s.UnionBn || ''}, ${s.UpazilaBn || ''}, ${s.DistrictBn || ''}</td>
              </tr>

              <tr><td class="label">Address (English) :</td>
                <td>${s.HouseNameEn || ''}, ${s.VillageEn || ''}, ${s.UnionEn || ''}, ${s.UpazilaEn || ''}, ${s.DistrictEn || ''}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <div class="sign">Guardian's Signature</div>
            <div class="sign">Head Teacher</div>
          </div>
        </div>
      `);

      if (i % 2 === 1 || i === dataToExport.length - 1)
        printWindow.document.write(`</div>`);
    });

    printWindow.document.write(`
      <script>
        window.onload = function() {
          window.print();
        }
      <\/script>
    </body></html>
    `);

    printWindow.document.close();
  };

  const handleExportAllIDCards = () => {
    if (!checkExportPermission()) return;

    const list = getFilteredData();
    if (list.length === 0) return showToast("আইডি কার্ডের জন্য কোনো ডাটা নেই", "error");

    const w = window.open('', '_blank');

    w.document.write(`
    <html>
    <head>
      <title>All ID Cards</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');

        @media print {
          @page { size: A4 landscape; margin: 0mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }

        body {
          font-family: 'Noto Sans Bengali', sans-serif;
          margin: 0;
        }

        
  .page {
    width: 297mm;
    height: 210mm;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 20px;
    justify-items: center;
    align-items: center;
    page-break-after: always;
    
  }
        .print-container {
          display: flex;
          gap: 2px;
          align-items: flex-start;
        }

        .id-card-box {
          width: 2.125in;
          height: 3.375in;
          position: relative;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #ddd;
          box-sizing: border-box;
        }

        .front-header {
          background: linear-gradient(to bottom, #0f172a 0%, #1e293b 100%);
          height: 65px;
          color: white;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .curve {
          position: absolute;
          bottom: -30px;
          left: 0;
          width: 100%;
          height: 30px;
          background: #1e293b;
          border-radius: 0 0 50% 50%;
          z-index: -1;
        }

        .front-header h2 {
          font-size: 11.5px;
          margin: 0;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: 'Oswald', sans-serif;
          padding: 0 5px;
        }

        .front-header p {
          font-size: 9px;
          margin: 2px 0 0;
          opacity: 0.8;
        }

        .photo-box {
          width: 72px;
          height: 72px;
          margin: -10px auto 0;
          position: relative;
          z-index: 2;
          background: white;
          padding: 3px;
          border-radius: 6px;
          box-shadow: 0 3px 8px rgba(0,0,0,0.15);
        }

        .photo-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4px;
          display: block;
        }

        .student-info {
          text-align: center;
          margin-top: 7px;
          margin-bottom: 7px;
        }

        .s-name-en { font-size: 12px; font-weight: 800; color: #1e293b; text-transform: uppercase; line-height: 1.2; }
        .s-name-bn { font-size: 11px; font-weight: 600; color: #334155; }

        .id-pill {
          background: #0f172a;
          color: white;
          font-size: 9px;
          padding: 1px 8px;
          border-radius: 10px;
          display: inline-block;
          margin: 2px 0 2px;
          font-weight: bold;
        }

        .info-table { width: 92%; margin: 0 auto; border-collapse: collapse; }

        .info-table td {
          font-size: 10.5px;
          padding: 1.5px 5px;
          color: #0f172a;
          vertical-align: middle;
        }

        .info-table .lbl { font-weight: 700; color: #64748b; width: 40px; text-align: left; }
        .info-table .val { font-weight: 600; text-align: left; }
        .info-table .row-border { border-bottom: 1px dotted #cbd5e1; }

        .signature-area {
          position: absolute;
          bottom: 8px;
          right: 15px;
          text-align: center;
        }

        .sig-line { width: 60px; border-top: 1px solid #0f172a; margin-bottom: 2px; }
        .sig-text { font-size: 6px; font-weight: 700; color: #0f172a; }

        .back-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #fff;
          position: relative;
        }

        .back-content {
          flex: 1;
          padding: 10px 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 1;
        }

        .watermark-logo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 60px;
          opacity: 0.05;
          color: #000;
          z-index: 0;
          font-weight: bold;
          pointer-events: none;
          white-space: nowrap;
        }

        .guardian-card {
          width: 100%;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 6px;
          padding: 6px;
          margin-bottom: 8px;
          text-align: left;
          box-sizing: border-box;
        }

        .section-title {
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 3px;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 2px;
          display: block;
        }

        .address-text { font-size: 9px; color: #334155; line-height: 1.3; font-weight: 500; }

        .qr-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 5px 0 8px;
          width: 100%;
          background: #fff;
          padding: 4px;
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          box-sizing: border-box;
        }

        .qr-img { width: 55px; height: 55px; display: block; }

        .validity-info { flex: 1; text-align: left; }

        .valid-label { font-size: 7px; color: #64748b; text-transform: uppercase; font-weight: 700; }
        .valid-year {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          font-family: 'Oswald', sans-serif;
          display: block;
          margin-top: -2px;
        }

        .scan-hint { font-size: 6px; color: #94a3b8; margin-top: 2px; }

        .rules-list { width: 100%; text-align: left; margin-bottom: auto; }

        .rules-list ul { margin: 0; padding-left: 12px; }

        .rules-list li {
          font-size: 7px;
          color: #475569;
          margin-bottom: 2px;
          line-height: 1.2;
        }

        .emergency-footer {
          width: 100%;
          margin-top: 5px;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 4px;
          padding: 4px;
          text-align: center;
          box-sizing: border-box;
        }

        .emergency-label { font-size: 7px; color: #dc2626; font-weight: 700; text-transform: uppercase; }
        .emergency-num { font-size: 10px; font-weight: 800; color: #b91c1c; }

        .return-strip {
          background: #0f172a;
          color: white;
          font-size: 7px;
          text-align: center;
          padding: 4px 0;
          width: 100%;
          margin-top: 5px;
        }
      </style>
    </head>
    <body>
    `);

    list.forEach((data, i) => {
      const qrData = `${window.location.origin}/${data.ID}`;
      const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

      if (i % 4 === 0) {
        if (i !== 0) w.document.write(`</div>`);
        w.document.write(`<div class="page">`);
      }

      w.document.write(`
        <div class="print-container">

          <!-- FRONT -->
          <div class="id-card-box">
            <div class="front-header">
              <h2>${CONFIG.APP_NAME}</h2>
              <p>Sarafbhata, Rangunia, Chattogram</p>
              <div class="curve"></div>
            </div>

            <div class="photo-box">
              <img src="${data.ImageURL || 'https://via.placeholder.com/150'}" />
            </div>

            <div class="student-info">
              <div class="s-name-en">${data.StudentNameEn}</div>
              <div class="s-name-bn">${data.StudentNameBn}</div>
              <div class="id-pill">ID: ${data.ID}</div>
            </div>

            <table class="info-table">
              <tr class="row-border">
                <td class="lbl">Class</td>
                <td class="val">: ${data.ClassEn} | Roll: ${data.Roll}</td>
              </tr>
              <tr class="row-border">
                <td class="lbl">Father</td>
                <td class="val">: ${data.FatherNameBn}</td>
              </tr>
              <tr class="row-border">
                <td class="lbl">Mother</td>
                <td class="val">: ${data.MotherNameBn}</td>
              </tr>
              <tr class="row-border">
                <td class="lbl">DOB</td>
                <td class="val">: <span style="font-weight:800;">${formatDate(data.DOB)}</span></td>
              </tr>
              <tr class="row-border">
                <td class="lbl">Blood</td>
                <td class="val">: <span style="color:#ef4444; font-weight:800;">${data.BloodGroup || 'N/A'}</span></td>
              </tr>
              <tr>
                <td class="lbl">Mobile</td>
                <td class="val">: ${data.WhatsApp}</td>
              </tr>
            </table>

            <div class="signature-area">
              <img src="${signImg}" style="width:60px; display:block; margin-bottom:-23px;" />
              <div class="sig-line"></div>
              <div class="sig-text">Superintendent</div>
            </div>
          </div>

          <!-- BACK -->
          <div class="id-card-box">
            <div class="back-container">

              <div class="front-header" style="height: 50px;">
                <h2>${CONFIG.APP_NAME}</h2>
              </div>

              <div class="back-content">
                <div class="watermark-logo">
                  ${CONFIG.APP_NAME.split(' ').map(w => w.charAt(0).toUpperCase()).join('')}
                </div>

                <div class="guardian-card">
                  <span class="section-title">Permanent Address</span>
             <div class="address-text">
    ${
      [
        data.HouseNameBn,
        data.VillageBn,
        data.UnionBn,
        data.UpazilaBn,
        data.DistrictBn
      ]
      .filter(Boolean)
      .join(', ')
    }।
  </div>

                </div>

                <div class="qr-wrapper">
                  <img src="${qrImage}" class="qr-img" />
                  <div class="validity-info">
                    <div class="valid-label">Academic Session</div>
                    <div class="valid-year">${data.Session} - ${parseInt(data.Session)+1}</div>
                    <div class="scan-hint">Scan to verify student profile</div>
                  </div>
                </div>

                <div class="rules-list">
                  <span class="section-title">Instructions</span>
                  <ul>
                    <li>This card is non-transferable.</li>
                    <li>Must be worn during institution hours.</li>
                    <li>Report lost card immediately to office.</li>
                    <li>Phone : 01865415088 | 01837713062</li>
                    <li>Email : raisulislamsaied@gmail.com</li>
                  </ul>
                </div>

                <div class="emergency-footer">
                  <div class="emergency-label">this id card is valid until
  </div>
                  <div class="emergency-num" style="text-transform: uppercase;">31 January 2027</div>
                </div>

              </div>

              <div class="return-strip">
                If found, please return to the madrasah office.
              </div>
            </div>
          </div>

        </div>
      `);
    });

    if (list.length > 0) {
      w.document.write(`</div>`);
    }

    w.document.write(`
    <script>
    window.onload = function () {
      setTimeout(() => {
        window.print();
      }, 700);
    };
    </script>
    </body>
    </html>
    `);

    w.document.close();
  };

  return {
    handleExportTablePDF,
    handleExportExcel,
    handleCopyAllIds,
    handleExportContacts,
    handleExportPDF,
    handleExportAllIDCards,
    checkExportPermission
  };
};