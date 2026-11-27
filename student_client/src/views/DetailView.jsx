import {
  ChevronLeft, CreditCard, Edit3, FileText,
  MessageCircle, Phone,
  Trash2
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import signImg from '../assets/principal-sign.png';
import { CONFIG, DEFAULT_IMAGE } from '../config/systemConfig';
import { canDeleteStudent, canEditStudent } from '../models/studentModel';
import { CLASS_PALETTE } from './UIComponents';

// ================================================================
// PREMIUM DETAIL VIEW — Desktop (2-Col Sticky Dashboard) + Mobile
// All Student Schema Fields · Untouched Exports · Untouched Siblings
// ================================================================
const DetailView = ({ data, currentUser, portalSettings, onBack, onEdit, onDelete, onImageClick, siblings = [], onSelectSibling }) => {
  const canEdit = canEditStudent(currentUser, data, portalSettings);
  const canDelete = canDeleteStudent(currentUser, data, portalSettings);
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
  }, []);

  // ভাইবোনের প্রোফাইলে ক্লিক করে চলে গেলে স্ক্রল টপে রিসেট হবে
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [data.ID]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatBDT = (amount) => {
    if (amount === undefined || amount === null || amount === '' || Number(amount) === 0) return '৳ ০';
    return `৳ ${new Intl.NumberFormat('bn-BD').format(Number(amount))}`;
  };

  const calculateAge = (dobStr) => {
    if (!dobStr) return null;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
      years--;
      months += 12;
    }
    if (years < 0) return null;
    return months > 0 ? `${years} বছর ${months} মাস` : `${years} বছর`;
  };

  const { color: classColor, bg: classBg } = CLASS_PALETTE[data.ClassBn] || { color: '#3B5BDB', bg: '#EEF2FF' };
  const isActive = data.Status === 'Active';
  const studentAge = calculateAge(data.DOB);

  // Permanent Address vs Present Address comparison
  const perm = data.PermanentAddress || null;
  const isSameAddress = useMemo(() => {
    if (!perm) return true;
    const cleanStr = (v) => String(v || '').trim().toLowerCase();
    return (
      cleanStr(perm.houseNameBn) === cleanStr(data.HouseNameBn) &&
      cleanStr(perm.villageBn) === cleanStr(data.VillageBn) &&
      cleanStr(perm.unionBn) === cleanStr(data.UnionBn) &&
      cleanStr(perm.upazilaBn) === cleanStr(data.UpazilaBn) &&
      cleanStr(perm.districtBn) === cleanStr(data.DistrictBn)
    );
  }, [perm, data]);

  const lg = data.LocalGuardian || {};
  const hasLocalGuardian = Boolean(lg.name || lg.phone || lg.relation || lg.nid);
  const fee = data.FeeDetails || { monthlyFee: 0, feeCategory: 'Regular', siblingStudentCode: '' };

  const delay = (i) => `${i * 0.07}s`;

  // ── PRINT / ACTION HANDLERS (100% UNCHANGED VERBATIM) ──
const handlePrintIDCard = () => {
  // QR Code Data preparation
  const qrData = `${window.location.origin}/${data.ID}`;
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

  const w = window.open('', '_blank');
  w.document.write(`
    <html>
      <head>
        <title>ID Card: ${data.ID}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap');
          
          @media print {
          @page {
  size: A4 ;
  margin: 5mm;
}

            body { 
              background: white; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
            }
            .print-container {
                margin: 20px;
            }
          }

          body {
            font-family: 'Noto Sans Bengali', sans-serif;
            background: white;
            margin: 0;
            display: flex;
            justify-content: left;
            padding-left: 20px;
            padding-top: 20px;
          }

          .print-container {
            display: flex;
            gap: 20px;
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

          /* --- FRONT DESIGN (ORIGINAL) --- */
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
            font-size: 12px;
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
        width: 100px;
        height: 100px;
  margin: -10px auto 0;
  position: relative;
  z-index: 2;
  background: white;
  padding: 1px;
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

          .info-table {
            width: 92%;
            margin: 0 auto;
            border-collapse: collapse;
          }
          
          .info-table td {
             font-size: 10.5px;
             padding: 1.5px 5px;
             color: #0f172a;
             vertical-align: middle;
          }
          
          .info-table .lbl {
             font-weight: 700;
             color: #64748b;
             width: 40px;
             text-align: left;
          }
          
          .info-table .val {
             font-weight: 600;
             text-align: left;
          }
          
          .info-table .row-border {
             border-bottom: 1px dotted #cbd5e1;
          }

          .signature-area {
            position: absolute;
            bottom: 8px;
            right: 15px;
            text-align: center;
          }
          .sig-line {
             width: 60px;
             border-top: 1px solid #0f172a;
             margin-bottom: 2px;
          }
          .sig-text {
             font-size: 6px;
             font-weight: 700;
             color: #0f172a;
          }

          /* --- BACK DESIGN (PROFESSIONAL) --- */
          .back-container {
             height: 100%;
             display: flex;
             flex-direction: column;
             background: #fff;
             position: relative;
          }

          .back-top-strip {
             height: 30px;
             background: #0f172a;
             width: 100%;
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

          /* Watermark Effect */
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

          .address-text {
             font-size: 9px;
             color: #334155;
             line-height: 1.3;
             font-weight: 500;
          }

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

          .qr-img {
             width: 55px;
             height: 55px;
             display: block;
          }

          .validity-info {
             flex: 1;
             text-align: left;
          }

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

          .rules-list {
             width: 100%;
             text-align: left;
             margin-bottom: auto;
          }
          .rules-list ul {
             margin: 0;
             padding-left: 12px;
          }
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
        <div class="print-container">
          
          <!-- FRONT SIDE (ORIGINAL) -->
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
                   <td class="val">: ${data.ClassEn }  |  Roll: ${data.Roll}</td>
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

          <!-- BACK SIDE (PROFESSIONAL) -->
          <div class="id-card-box">
             <div class="back-container">
            
             
             
            <div class="front-header" style="height: 50px;">
                <h2>${CONFIG.APP_NAME}</h2>
               
                
             </div>
                
                
                
                <div class="back-content">
                   <div class="watermark-logo">
  ${CONFIG.APP_NAME
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')}
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
<span class="section-title">Blood Group : <span style="color:#ef4444; font-weight:800;">${data.BloodGroup || 'N/A'}</span> </span>
      

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
      </body>
    </html>
  `);
  w.document.close();
};

const handlePrintProfile = () => {
  const w = window.open('', '_blank');
  const origin = window.location.origin;
  const logoUrl = `${origin}/logo.png`;
  const verifyUrl = `${origin}/${data.ID}`;
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&color=1A2332&data=${encodeURIComponent(verifyUrl)}`;
  const issuedOn = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const row = (label, value, mono) => `
    <div class="row">
      <span class="row-label">${label}</span>
      <span class="row-dots"></span>
      <span class="row-value${mono ? ' mono' : ''}">${value || 'N/A'}</span>
    </div>`;

  const section = (title, titleBn, rowsHtml) => `
    <div class="section">
      <div class="section-head">
        <span class="section-title">${title}</span>
        <span class="section-title-bn">${titleBn}</span>
      </div>
      <div class="section-body">${rowsHtml}</div>
    </div>`;

  const academic = section('Academic Information', 'একাডেমিক তথ্য', [
    row('Student ID', data.ID, true),
    row('Class', `${data.ClassEn || ''}  (${data.ClassBn || ''})`),
    row('Roll Number', data.Roll),
    row('Session', data.Session),
    row('Status', data.Status === 'Active' ? 'Active' : 'Inactive'),
  ].join(''));

  const personal = section('Personal Information', 'ব্যক্তিগত তথ্য', [
    row('Date of Birth', formatDate(data.DOB)),
    row('Gender', data.Gender),
    row('Blood Group', data.BloodGroup),
    row('Birth Reg. No.', data.BRN, true),
  ].join(''));

  const guardian = section('Guardian Information', 'অভিভাবকের তথ্য', [
    row('Father\u2019s Name (En)', data.FatherNameEn),
    row('পিতার নাম', data.FatherNameBn),
    row('Mother\u2019s Name (En)', data.MotherNameEn),
    row('মাতার নাম', data.MotherNameBn),
  ].join(''));

  const contact = section('Contact Information', 'যোগাযোগ', [
    row('Mobile / WhatsApp', data.WhatsApp, true),
    row('Emergency Number', data.EmergencyNo, true),
  ].join(''));

  const addressBn = [
    row('বাড়ির নাম', data.HouseNameBn),
    row('গ্রাম', data.VillageBn),
    row('ইউনিয়ন', data.UnionBn),
    row('উপজেলা', data.UpazilaBn),
    row('জেলা', data.DistrictBn),
    row('ওয়ার্ড নং', data.WardNo),
  ].join('');

  const addressEn = [
    row('House Name', data.HouseNameEn),
    row('Village', data.VillageEn),
    row('Union', data.UnionEn),
    row('Upazila', data.UpazilaEn),
    row('District', data.DistrictEn),
    row('Ward No.', data.WardNo),
  ].join('');

  // ── SIBLINGS ──
  const ageOf = (dobStr) => {
    if (!dobStr) return '\u2014';
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return '\u2014';
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return `${age}`;
  };

  const hasSiblings = siblings && siblings.length > 0;

  const siblingRows = (siblings || []).map((sib, i) =>
    row(
      `${i + 1}. ${sib.StudentNameEn || ''} (${sib.StudentNameBn || ''})`,
      `Class ${sib.ClassEn || sib.ClassBn || ''} \u2022 Roll ${sib.Roll || ''} \u2022 Age ${ageOf(sib.DOB)} \u2022 ID ${sib.ID || ''}`
    )
  ).join('');

  const siblingsBlock = hasSiblings ? `
    <div class="address">
      <div class="address-head"><span class="section-title">Siblings at ${CONFIG.APP_NAME}</span><span class="section-title-bn">ভাই-বোন</span></div>
      <div class="sib-list">${siblingRows}</div>
    </div>` : '';

  const declarationBlock = !hasSiblings ? `
    <div class="declaration">
      This is an official, computer-generated academic record issued by the administration of ${CONFIG.APP_NAME}.
      It certifies that the information above reflects the student's details as recorded in the institution's official register.
    </div>` : '';

  w.document.write(`
<html>
<head>
<title>Student Record - ${data.ID}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;900&family=Noto+Serif+Bengali:wght@500;600;700&family=Noto+Sans+Bengali:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');

  @page { size: A4; margin: 10mm; }
- { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Inter', 'Noto Sans Bengali', sans-serif; color: #1A2332; }

  .page {
    border: 1.5pt solid #C9B98A;
    padding: 10mm;
    padding-bottom : 5mm !important;
    min-height: calc(297mm - 20mm - 3pt);
    display: flex;
    flex-direction: column;
  }

  /* ── letterhead ── */
  .letterhead { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 1.4pt solid #1A2332; }
  .letterhead img { width: 58px; height: 58px; object-fit: contain; }
  .letterhead-text { flex: 1; text-align: center; }
  .inst-name {
    margin: 0; font-family: 'Playfair Display', serif; font-weight: 900;
    font-size: 23px; letter-spacing: 1.8px; text-transform: uppercase;
  }
  .inst-name-bn { margin: 4px 0 0; font-family: 'Noto Serif Bengali', serif; font-weight: 600; font-size: 20px; color: #4A5262; }

  .ref-strip { display: flex; justify-content: space-between; padding: 11px 0; margin-bottom: 4px; border-bottom: 0.5pt solid #D8DCE3; font-size: 10px; color: #5B6472; letter-spacing: 0.3px; }
  .ref-strip b { color: #1A2332; font-family: 'Inter', monospace; font-weight: 600; }

  /* ── identity block ── */
  .identity { display: flex; gap: 22px; align-items: flex-start; padding: 24px 0 22px; border-bottom: 0.5pt solid #D8DCE3; }
  .photo { width: 104px; height: 124px; object-fit: cover; border: 0.9pt solid #1A2332; flex-shrink: 0; }
  .id-main { flex: 1; padding-top: 4px; }
  .id-main .name-en { margin: 0; font-family: 'Playfair Display', serif; font-weight: 700; font-size: 25px; }
  .id-main .name-bn { margin: 3px 0 14px; font-family: 'Noto Serif Bengali', serif; font-weight: 600; font-size: 16px; color: #4A5262; }
  .fact-line { display: flex; flex-wrap: wrap; gap: 0; font-size: 11px; }
  .fact-line span { padding-right: 16px; margin-right: 16px; border-right: 0.5pt solid #D8DCE3; color: #4A5262; }
  .fact-line span:last-child { border-right: none; }
  .fact-line b { color: #1A2332; font-weight: 700; }

  .seal { width: 104px; text-align: center; flex-shrink: 0; }
  .seal-ring img { width: 100%; height: 100%; }

  /* ── sections ── */
  .sections { display: grid; grid-template-columns: 1fr 1fr; column-gap: 34px; }
  .section { padding: 18px 0 6px; }
  .section-head { display: flex; align-items: baseline; gap: 9px; margin-bottom: 8px; }
  .section-title { font-size: 10.5px; font-weight: 700; letter-spacing: 1.3px; text-transform: uppercase; color: #1A2332; white-space: nowrap; }
  .section-title-bn { font-family: 'Noto Sans Bengali', sans-serif; font-size: 9.5px; color: #9C7A3C; font-weight: 600; }
  .section-head::after { content: ''; flex: 1; height: 0.5pt; background: #D8DCE3; align-self: center; }

  .row { display: flex; align-items: baseline; padding: 6px 0; }
  .row-label { font-size: 10px; color: #5B6472; white-space: nowrap; }
  .row-dots { flex: 1; border-bottom: 0.5pt dotted #C7CCD5; margin: 0 7px 3px; }
  .row-value { font-size: 11px; font-weight: 600; color: #1A2332; text-align: right; max-width: 58%; }
  .row-value.mono { font-family: 'Inter', monospace; letter-spacing: 0.3px; }

  /* ── address / siblings (shares the same block style) ── */
  .address { margin-top: 6px; padding-top: 16px; border-top: 0.5pt solid #D8DCE3; }
  .address-head { display: flex; align-items: baseline; gap: 9px; margin-bottom: 6px; }
  .address-head::after { content: ''; flex: 1; height: 0.5pt; background: #D8DCE3; align-self: center; }
  .address-cols { display: grid; grid-template-columns: 1fr 1fr; column-gap: 34px; }
  .sib-list .row-label { white-space: normal; }
  .sib-list .row-value { max-width: 62%; }

  /* ── declaration ── */
  .declaration {
    margin-top: 12px; padding: 14px 26px; border-top: 0.5pt solid #D8DCE3; border-bottom: 0.5pt solid #D8DCE3;
    text-align: center; font-size: 9.5px; font-style: italic; color: #5B6472; line-height: 1.6;
  }

  .footer { margin-top: auto; }
  .meta-strip {
    margin-top: 0px; padding-top: 0px; 
    display: flex; justify-content: space-between; font-size: 8px; color: #9AA1AC; letter-spacing: 0.3px; font-weight: 500;
  }
</style>
</head>
<body>
  <div class="page">

    <div class="letterhead">
      <img src="${logoUrl}" onerror="this.style.visibility='hidden'"/>
      <div class="letterhead-text">
        <h1 class="inst-name">${CONFIG.APP_NAME}</h1>
        <p class="inst-name-bn">আবদুর রাজ্জাক দাখিল মাদরাসা</p>
      </div>
    </div>

    <div class="ref-strip">
      <span>Document Ref: <b>SR-${data.ID}</b></span>
      <span>Session: <b>${data.Session || ''}</b></span>
      <span>Issued: <b>${issuedOn}</b></span>
    </div>

    <div class="identity">
      <img class="photo" src="${data.ImageURL || DEFAULT_IMAGE}"/>
      <div class="id-main">
        <h2 class="name-en">${data.StudentNameEn || ''}</h2>
        <p class="name-bn">${data.StudentNameBn || ''}</p>
        <div class="fact-line">
          <span>Class <b>${data.ClassEn || ''}</b></span>
          <span>Roll <b>${data.Roll || ''}</b></span>
          <span>Gender <b>${data.Gender || ''}</b></span>
          <span>Status <b>${data.Status === 'Active' ? 'Active' : 'Inactive'}</b></span>
        </div>
      </div>
      <div class="seal">
        <div class="seal-ring"><img src="${qrImage}"/></div>
      </div>
    </div>

    <div class="sections">
      ${academic}
      ${personal}
      ${guardian}
      ${contact}
    </div>

    <div class="address">
      <div class="address-head"><span class="section-title">Permanent Address</span><span class="section-title-bn">ঠিকানা</span></div>
      <div class="address-cols">
        <div>${addressBn}</div>
        <div>${addressEn}</div>
      </div>
    </div>

    ${siblingsBlock}

    ${declarationBlock}

    <div class="footer">
      <div class="meta-strip">
        <span>Verify online at ${verifyUrl}</span>
        <span>ডিজাইন ও ডেভেলপমেন্ট: রায়সুল ইসলাম সাঈদ</span>
      </div>
    </div>

  </div>
  <script>
    window.onload = function () { setTimeout(() => window.print(), 700); };
  <\/script>
</body>
</html>
  `);
  w.document.close();
};

const handleWhatsApp = () => {
  const phone = data.WhatsApp?.replace(/['"\s-]/g,'');
  
  if(!phone) return alert("নম্বর নেই");
if (currentUser?.role === "Visitor") {
    window.open(`https://wa.me/+88${phone}`);
    return;
  }
  const waLink = `${window.location.origin}/${data.ID}`;
const msg = `
———————————————————————
  *ABDUR RAZZAK DAKHIL MADRASAH*
———————————————————————

👤 *STUDENT PROFILE*
- Name  : ${data.StudentNameEn} 
- নাম  : ${data.StudentNameBn}
- ID          : ${data.ID}
- Class       : ${data.ClassEn}
- Roll        : ${data.Roll}
- Session     : ${data.Session}
- Date of Birth : ${formatDate(data.DOB)}
- Blood Group : ${data.BloodGroup}
- Gender      : ${data.Gender}
- BRN         : ${data.BRN}

👪 *GUARDIAN DETAILS*
- Father : ${data.FatherNameEn}
- পিতা :  ${data.FatherNameBn}
- Mother : ${data.MotherNameEn}
- মাতা : ${data.MotherNameBn}

📞 *CONTACT INFO*
- Mobile    : ${data.WhatsApp}
- Emergency : ${data.EmergencyNo}

🏠 *ADDRESS*
${data.HouseNameEn}, ${data.VillageEn}, ${data.UnionEn}, ${data.UpazilaEn}, ${data.DistrictEn}.— ${data.HouseNameBn}, ${data.VillageBn}, ${data.UnionBn}, ${data.UpazilaBn}, ${data.DistrictBn}।

✅ *REGISTRATION SUCCESSFUL*
Your student profile has been created.
${waLink}`.trim();
let finalmsg = ""; 
if (currentUser?.role === "Admin") {
    const idmsg = `

*প্রিয় ${data.StudentNameBn},*

আনন্দের সাথে জানানো যাচ্ছে যে, তোমার স্টুডেন্ট আইডি কার্ডটি প্রস্তুত হয়েছে! 🎉

স্টুডেন্ট আইডি নম্বর: ${data.ID}
আইডি কার্ড ফি: ১০০/- (একশত টাকা)

আগামীকাল মাদরাসা চলাকালীন সময়ে নির্ধারিত ফি পরিশোধ করে তোমার আইডি কার্ডটি সংগ্রহ করো। 

ডিজিটাল কপি ও বিস্তারিত তথ্যের জন্য নিচের লিংকে ক্লিক করো:
🔗 ${waLink}

ধন্যবাদান্তে,
আবদুর রাজ্জাক দাখিল মাদরাসা`.trim();
  finalmsg = idmsg;
  }else {
  finalmsg = msg;
  }
    
  window.open(`https://wa.me/+88${phone}?text=${encodeURIComponent(`প্রিয় ${data.StudentNameBn}`)}`);
};

  // Reusable Action Buttons Grid (used in both Mobile floating card & Desktop sidebar)
  const quickActionButtons = [
    {
      icon: Phone,
      label: 'Call',
      gradient: 'linear-gradient(135deg, #059669, #10B981)',
      glow: 'rgba(16,185,129,0.35)',
      onClick: () => window.open(`tel:${data.WhatsApp?.replace(/['"]/g, '')}`)
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      gradient: 'linear-gradient(135deg, #15803d, #22C55E)',
      glow: 'rgba(34,197,94,0.35)',
      onClick: handleWhatsApp
    },
    {
      icon: CreditCard,
      label: 'ID Card',
      gradient: 'linear-gradient(135deg, #4338CA, #6366F1)',
      glow: 'rgba(99,102,241,0.35)',
      onClick: handlePrintIDCard
    },
    {
      icon: FileText,
      label: 'Print',
      gradient: 'linear-gradient(135deg, #0F172A, #334155)',
      glow: 'rgba(15,23,42,0.35)',
      onClick: handlePrintProfile
    },
  ];

  // Academic Info Rows (All schema fields)
  const academicItems = [
    { label: 'Student ID', value: data.ID, mono: true, highlight: true },
    { label: 'Class', value: `${data.ClassEn || ''} (${data.ClassBn || ''})`, color: classColor },
    { label: 'Roll Number', value: data.Roll },
    { label: 'Session', value: data.Session },
    { label: 'Admission Date (ভর্তির তারিখ)', value: data.AdmissionDate ? formatDate(data.AdmissionDate) : 'N/A' },
    ...(data.Group ? [{ label: 'Group (বিভাগ)', value: data.Group, color: '#0F766E' }] : []),
    ...(data.FourthSubject ? [{ label: '4th Subject (চতুর্থ বিষয়)', value: data.FourthSubject }] : []),
    ...(data.BoardRegNo ? [{ label: 'Board Reg. No.', value: data.BoardRegNo, mono: true }] : []),
    ...(data.BiometricId ? [{ label: 'Biometric Device ID', value: data.BiometricId, mono: true, color: '#0369A1' }] : []),
    { label: 'Record Source (উৎস)', value: data.MigratedFromSheet ? 'Legacy Sheet Migrated' : 'Direct ERP Entry', color: data.MigratedFromSheet ? '#D97706' : '#059669' },
    { label: 'Status', value: isActive ? 'Active ✓' : `${data.Status || 'Inactive'} ✗`, color: isActive ? '#10B981' : '#EF4444' },
    ...(data.StatusReason ? [{ label: 'Status Reason (কারণ)', value: data.StatusReason, color: '#DC2626' }] : []),
  ];

  // Personal & Medical Info Rows
  const personalItems = [
    { label: 'Date of Birth (জন্ম তারিখ)', value: formatDate(data.DOB) },
    ...(studentAge ? [{ label: 'Age (বয়স)', value: studentAge, color: '#4F46E5' }] : []),
    { label: 'Gender (লিঙ্গ)', value: data.Gender === 'Male' ? 'Male (ছাত্র)' : data.Gender === 'Female' ? 'Female (ছাত্রী)' : (data.Gender || 'N/A'), color: data.Gender === 'Male' ? '#3B82F6' : '#EC4899' },
    { label: 'Religion (ধর্ম)', value: data.Religion || 'Islam' },
    { label: 'Blood Group (রক্তের গ্রুপ)', value: data.BloodGroup || 'N/A', color: '#EF4444' },
    { label: 'Birth Reg. No. (BRN)', value: data.BRN || 'N/A', mono: true },
    { label: 'Medical Note (স্বাস্থ্য তথ্য)', value: data.MedicalNote || 'কোনো সমস্যা নেই', color: data.MedicalNote ? '#D97706' : '#64748B' },
  ];

  // Parents & Family Info Rows
  const guardianItems = [
    { label: 'পিতার নাম (বাংলা)', value: data.FatherNameBn },
    { label: "Father's Name (En)", value: data.FatherNameEn },
    { label: 'পিতার NID নম্বর', value: data.FatherNid || 'N/A', mono: Boolean(data.FatherNid) },
    { label: 'পিতার পেশা', value: data.FatherOccupation || 'N/A' },
    { label: 'মাতার নাম (বাংলা)', value: data.MotherNameBn },
    { label: "Mother's Name (En)", value: data.MotherNameEn },
    { label: 'মাতার NID নম্বর', value: data.MotherNid || 'N/A', mono: Boolean(data.MotherNid) },
    { label: 'মাতার পেশা', value: data.MotherOccupation || 'N/A' },
    { label: 'পারিবারিক বার্ষিক আয়', value: data.AnnualIncome ? formatBDT(data.AnnualIncome) : 'N/A', color: data.AnnualIncome ? '#059669' : '#64748B' },
  ];

  // Contact & Emergency Info Rows
  const contactItems = [
    { label: 'Mobile / WhatsApp', value: data.WhatsApp, mono: true, highlight: true },
    { label: 'Emergency Phone', value: data.EmergencyNo, mono: true },
    { label: 'Emergency Contact Name', value: data.EmergencyContactName || data.FatherNameBn || 'N/A' },
    { label: 'Relationship (সম্পর্ক)', value: data.EmergencyRelationship || 'Father', color: '#0284C7' },
  ];

  // Local Guardian Info Rows
  const localGuardianItems = hasLocalGuardian
    ? [
        { label: 'অভিভাবকের নাম', value: lg.name || 'N/A' },
        { label: 'সম্পর্ক (Relation)', value: lg.relation || 'N/A', color: '#7C3AED' },
        { label: 'মোবাইল নম্বর', value: lg.phone || 'N/A', mono: Boolean(lg.phone) },
        { label: 'NID নম্বর', value: lg.nid || 'N/A', mono: Boolean(lg.nid) },
      ]
    : [
        { label: 'অবস্থা (Status)', value: 'আলাদা স্থানীয় অভিভাবক যুক্ত নেই', color: '#64748B' }
      ];

  // Fee & Waiver Info Rows
  const feeCategoryColor =
    fee.feeCategory === 'Full Free' || fee.feeCategory === 'Orphan'
      ? '#059669'
      : fee.feeCategory === 'Half Free' || fee.feeCategory === 'Sibling Waiver'
      ? '#D97706'
      : '#0F172A';

  const feeItems = [
    { label: 'Fee Category (বেতন ক্যাটাগরি)', value: fee.feeCategory || 'Regular', color: feeCategoryColor, highlight: true },
    { label: 'Monthly Fee (মাসিক বেতন)', value: formatBDT(fee.monthlyFee), color: '#059669' },
    ...(fee.siblingStudentCode
      ? [{ label: 'Sibling Ref. ID (ভাই/বোন আইডি)', value: fee.siblingStudentCode, mono: true, color: '#4F46E5' }]
      : []),
  ];

  return (
    <>
      <style>{`
        @keyframes dv-hero-gradient {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes dv-photo-ring {
          0%, 100% { box-shadow: 0 0 0 0px rgba(212,168,67,0.5), 0 0 0 8px rgba(212,168,67,0.15), 0 24px 60px rgba(0,0,0,0.5); }
          50%       { box-shadow: 0 0 0 6px rgba(212,168,67,0.3), 0 0 0 14px rgba(212,168,67,0.08), 0 24px 60px rgba(0,0,0,0.5); }
        }
        @keyframes dv-slide-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dv-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes dv-scale-in {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes dv-badge-pop {
          0%   { transform: scale(0) rotate(-8deg); opacity: 0; }
          70%  { transform: scale(1.12) rotate(1deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes dv-status-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.4); }
        }
        @keyframes dv-bar-slide {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes dv-shimmer {
          from { background-position: -300px 0; }
          to   { background-position: 300px 0; }
        }
        @keyframes dv-float {
          0%, 10% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-6px) rotate(0.5deg); }
          66%       { transform: translateY(-3px) rotate(-0.5deg); }
        }

        .dv-hero-bg {
          background: linear-gradient(-45deg, #060D1F 0%, #0D1B3A 30%, #121C35 60%, #060D1F 100%);
          background-size: 300% 300%;
          animation: dv-hero-gradient 10s ease infinite;
        }
        .dv-photo-ring { animation: dv-photo-ring 3s ease-in-out infinite; }
        .dv-float      { animation: dv-float 6s ease-in-out infinite; }

        .dv-slide-up   { animation: dv-slide-up 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .dv-fade-in    { animation: dv-fade-in  0.5s ease both; }
        .dv-scale-in   { animation: dv-scale-in 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .dv-badge-pop  { animation: dv-badge-pop 0.5s cubic-bezier(0.22,1,0.36,1) both; }

        .dv-status-dot { animation: dv-status-pulse 2s ease-in-out infinite; }
        .dv-bar        { transform-origin: left; animation: dv-bar-slide 1.2s cubic-bezier(0.22,1,0.36,1) 0.5s both; }

        .dv-glass-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(12px);
        }
        .dv-action-btn {
          transition: transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s ease;
        }
        .dv-action-btn:hover { transform: translateY(-1px); }
        .dv-action-btn:active { transform: scale(0.92) !important; }

        .dv-row-item {
          transition: background 0.2s ease;
        }
        .dv-row-item:hover { background: rgba(212,168,67,0.06) !important; }
        .dv-row-item:active { background: rgba(212,168,67,0.1) !important; }

        .dv-section-card {
          animation: dv-slide-up 0.6s cubic-bezier(0.22,1,0.36,1) both;
        }

        .dv-gold-text {
          background: linear-gradient(135deg, #D4A843 0%, #F7E09A 40%, #C9962A 70%, #F0C96E 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: dv-hero-gradient 4s ease infinite;
        }
        .dv-shimmer-line {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
          background-size: 300px 100%;
          animation: dv-shimmer 2.5s linear infinite;
        }
        .dv-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .dv-no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div
        ref={scrollRef}
        className="fixed inset-0 z-[100] overflow-y-auto dv-no-scrollbar font-bangla"
        style={{ background: '#F0F4FF' }}
      >
        {/* ══════════════════════════════════════
            DESKTOP STICKY TOP NAVIGATION BAR (lg+)
        ══════════════════════════════════════ */}
        <div className="hidden lg:block sticky top-0 z-40 bg-[#060D1F]/95 backdrop-blur-xl border-b border-white/10 shadow-md">
          <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="dv-action-btn px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center gap-1.5 border border-white/10"
              >
                <ChevronLeft size={16} /> ড্যাশবোর্ডে ফিরুন
              </button>
              <div className="h-5 w-px bg-white/15" />
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-black text-[#F7E09A]">{data.StudentNameBn || data.StudentNameEn}</span>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                  ID: {data.ID}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                  border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}
              >
                <span className={`w-2 h-2 rounded-full dv-status-dot ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-emerald-300' : 'text-red-300'}`}>
                  {isActive ? 'Active' : (data.Status || 'Inactive')}
                </span>
              </div>

              {canEdit && (
                <button
                  onClick={onEdit}
                  className="dv-action-btn px-4 py-2 rounded-xl bg-[#D4A843] hover:bg-[#e1b752] text-[#060D1F] text-xs font-black flex items-center gap-1.5 shadow-sm"
                >
                  <Edit3 size={14} /> Edit Profile
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(data.ID)}
                  className="dv-action-btn px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-600 text-red-200 hover:text-white border border-red-400/30 text-xs font-black flex items-center gap-1.5"
                  title="Delete Student"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            RESPONSIVE WORKSPACE WRAPPER
            Mobile: Single Column Full Bleed
            Desktop (lg+): 12-Col Grid (4 Sticky Left + 8 Right)
        ══════════════════════════════════════ */}
        <div className="lg:max-w-7xl lg:mx-auto lg:px-8 lg:py-7">
          <div className="lg:grid lg:grid-cols-12 lg:gap-7 lg:items-start">

            {/* ══════════════════════════════════════
                LEFT COLUMN (4 COLS ON DESKTOP · STICKY)
                HERO + FLOATING ACTION BUTTONS
            ══════════════════════════════════════ */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 lg:space-y-4">
              {/* HERO SECTION */}
              <div
                className="dv-hero-bg relative overflow-hidden lg:rounded-[30px] lg:shadow-2xl lg:border lg:border-[#D4A843]/25"
                style={{ paddingBottom: 90 }}
              >
                {/* Decorative background elements */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <img
                    src={data.ImageURL || DEFAULT_IMAGE}
                    className="absolute inset-0 w-full h-full object-cover opacity-[0.07]"
                    style={{ filter: 'blur(40px)', transform: 'scale(1.2)' }}
                    alt=""
                  />
                  <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full"
                    style={{ border: '1px solid rgba(212,168,67,0.08)' }} />
                  <div className="absolute -right-16 -top-16 w-60 h-60 rounded-full"
                    style={{ border: '1px solid rgba(212,168,67,0.12)' }} />
                  <div className="absolute -left-20 bottom-0 w-56 h-56 rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(212,168,67,0.06) 0%, transparent 70%)' }} />
                  <div className="dv-shimmer-line absolute left-0 right-0 h-px" style={{ top: '35%' }} />
                </div>

                {/* Mobile Back Bar (Hidden on Desktop where Sticky Top Bar handles it) */}
                <div
                  className="dv-fade-in relative z-20 flex lg:hidden items-center gap-3 px-5 pt-14 pb-6"
                  style={{ animationDelay: '0s' }}
                >
                  <button
                    onClick={onBack}
                    className="dv-action-btn w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <ChevronLeft size={20} color="white" />
                  </button>
                  <div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Student Profile</p>
                    <p className="text-[13px] font-black text-white/80 leading-tight">{data.ID}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{
                      background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    }}
                  >
                    <span className={`w-2 h-2 rounded-full dv-status-dot ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-emerald-300' : 'text-red-300'}`}>
                      {isActive ? 'Active' : (data.Status || 'Inactive')}
                    </span>
                  </div>
                </div>

                {/* Photo + Name */}
                <div className="relative z-10 flex flex-col items-center px-5 lg:pt-8">
                  <div
                    className="dv-scale-in relative cursor-pointer"
                    style={{ animationDelay: '0.1s' }}
                    onClick={() => onImageClick && onImageClick(data.ImageURL || DEFAULT_IMAGE)}
                  >
                    <div
                      className="dv-photo-ring w-36 h-36 lg:w-32 lg:h-32 rounded-[32px] overflow-hidden"
                      style={{ border: '3px solid rgba(212,168,67,0.5)' }}
                    >
                      <img
                        src={data.ImageURL || DEFAULT_IMAGE}
                        className="w-full h-full object-cover"
                        alt={data.StudentNameEn}
                      />
                    </div>
                    <div
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(212,168,67,0.9)', backdropFilter: 'blur(8px)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" fill="white"/>
                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="white" strokeWidth="1.5"/>
                      </svg>
                    </div>
                  </div>

                  {/* Name + Class */}
                  <div className="mt-5 text-center dv-slide-up" style={{ animationDelay: '0.15s' }}>
                    <h1 className="text-3xl lg:text-2xl font-black text-white leading-tight tracking-tight">
                      {data.StudentNameEn}
                    </h1>
                    <p className="text-lg lg:text-base font-bold mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      {data.StudentNameBn}
                    </p>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap justify-center gap-2 mt-4 dv-slide-up" style={{ animationDelay: '0.22s' }}>
                    {[
                      { label: `Class ${data.ClassEn}`, color: classColor, bg: 'rgba(255,255,255,0.1)', border: `${classColor}40` },
                      { label: `Roll ${data.Roll}`, color: '#D4A843', bg: 'rgba(212,168,67,0.12)', border: 'rgba(212,168,67,0.3)' },
                      data.Group && { label: data.Group, color: '#2DD4BF', bg: 'rgba(45,212,191,0.12)', border: 'rgba(45,212,191,0.3)' },
                      data.BloodGroup && { label: `🩸 ${data.BloodGroup}`, color: '#F87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
                      { label: data.Gender === 'Male' ? '♂ Male' : '♀ Female', color: data.Gender === 'Male' ? '#60A5FA' : '#F472B6', bg: data.Gender === 'Male' ? 'rgba(96,165,250,0.12)' : 'rgba(244,114,182,0.12)', border: data.Gender === 'Male' ? 'rgba(96,165,250,0.3)' : 'rgba(244,114,182,0.3)' },
                    ].filter(Boolean).map((badge, i) => (
                      <span
                        key={i}
                        className="dv-badge-pop text-[11px] font-black px-3 py-1.5 rounded-full"
                        style={{
                          color: badge.color,
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          animationDelay: `${0.28 + i * 0.06}s`,
                        }}
                      >
                        {badge.label}
                      </span>
                    ))}
                  </div>

                  {/* Session strip */}
                  <div
                    className="mt-5 w-full max-w-xs dv-glass-card rounded-2xl px-4 py-3 flex items-center gap-3 dv-fade-in"
                    style={{ animationDelay: '0.5s' }}
                  >
                    <div className="text-center flex-1">
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Session</p>
                      <p className="dv-gold-text text-sm font-black mt-0.5">{data.Session}</p>
                    </div>
                    <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.12)' }} />
                    <div className="text-center flex-1">
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Class</p>
                      <p className="text-sm font-black mt-0.5" style={{ color: classColor }}>{data.ClassBn}</p>
                    </div>
                    <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.12)' }} />
                    <div className="text-center flex-1">
                      <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Roll</p>
                      <p className="text-sm font-black text-white mt-0.5">{data.Roll}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS — floating over hero */}
              <div
                className="relative z-20 px-5 lg:px-3 -mt-10 lg:-mt-14 dv-slide-up"
                style={{ animationDelay: '0.4s' }}
              >
                <div
                  className="rounded-[24px] p-4 grid grid-cols-4 gap-3"
                  style={{
                    background: 'rgba(255,255,255,0.96)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 60px rgba(6,13,31,0.16), 0 4px 16px rgba(6,13,31,0.08)',
                    border: '1px solid rgba(255,255,255,0.9)',
                  }}
                >
                  {quickActionButtons.map(({ icon: Icon, label, gradient, glow, onClick }, i) => (
                    <button
                      key={label}
                      onClick={onClick}
                      className="dv-action-btn flex flex-col items-center gap-2"
                      style={{ animationDelay: `${0.45 + i * 0.06}s` }}
                    >
                      <div
                        className="w-14 h-14 lg:w-12 lg:h-12 rounded-[18px] flex items-center justify-center"
                        style={{
                          background: gradient,
                          boxShadow: `0 8px 24px ${glow}`,
                        }}
                      >
                        <Icon size={21} color="white" strokeWidth={2} />
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* DESKTOP QUICK RECORD INFO & ACTIONS CARD */}
              <div className="hidden lg:block bg-white rounded-[24px] p-4 border border-slate-200/70 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="font-bold text-slate-400">Fee Category</span>
                  <span className="font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {fee.feeCategory || 'Regular'} · {formatBDT(fee.monthlyFee)}
                  </span>
                </div>
                {data.LastUpdated && (
                  <div className="flex items-center justify-between text-[11px] px-1 pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-400">সর্বশেষ আপডেট</span>
                    <span className="font-mono font-bold text-slate-500 text-[10px]">{data.LastUpdated}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════
                RIGHT COLUMN (8 COLS ON DESKTOP)
                ALL STUDENT DATA SECTIONS (2-COL GRID ON XL)
            ══════════════════════════════════════ */}
            <div className="lg:col-span-8 px-4 lg:px-0 pt-4 lg:pt-0 pb-40 lg:pb-16">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">

                {/* ── 1. Academic Info ── */}
                <PremiumSection
                  title="Academic Info · একাডেমিক তথ্য"
                  icon="🎓"
                  delay="0.45s"
                  accent={classColor}
                  items={academicItems}
                />

                {/* ── 2. Personal & Medical Info ── */}
                <PremiumSection
                  title="Personal & Medical · ব্যক্তিগত তথ্য"
                  icon="👤"
                  delay="0.52s"
                  accent="#6366F1"
                  items={personalItems}
                />

                {/* ── 3. Parents & Family Info ── */}
                <PremiumSection
                  title="Parents & Family · পিতা-মাতা ও পরিবার"
                  icon="👪"
                  delay="0.58s"
                  accent="#F59E0B"
                  items={guardianItems}
                />

                {/* ── 4. Contact & Emergency Info ── */}
                <div className="space-y-4">
                  <PremiumSection
                    title="Contact & Emergency · যোগাযোগ"
                    icon="📞"
                    delay="0.64s"
                    accent="#10B981"
                    items={contactItems}
                    extra={
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => window.open(`tel:${data.WhatsApp?.replace(/['"]/g, '')}`)}
                          className="dv-action-btn flex-1 py-3 rounded-2xl text-xs font-black text-emerald-600 flex items-center justify-center gap-2"
                          style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}
                        >
                          <Phone size={14} /> Call Now
                        </button>
                        <button
                          onClick={handleWhatsApp}
                          className="dv-action-btn flex-1 py-3 rounded-2xl text-xs font-black text-white flex items-center justify-center gap-2"
                          style={{ background: 'linear-gradient(135deg,#15803d,#22C55E)', boxShadow: '0 6px 20px rgba(34,197,94,0.3)' }}
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </button>
                      </div>
                    }
                  />

                  {/* ── 5. Fee & Waiver Details ── */}
                  <PremiumSection
                    title="Fee & Waiver · বেতন ও ফি"
                    icon="💳"
                    delay="0.70s"
                    accent="#0EA5E9"
                    items={feeItems}
                  />
                </div>

                {/* ── 6. Local Guardian Info ── */}
                <div className="xl:col-span-2">
                  <PremiumSection
                    title="Local Guardian · স্থানীয় অভিভাবক"
                    icon="🛡️"
                    delay="0.74s"
                    accent="#8B5CF6"
                    items={localGuardianItems}
                  />
                </div>

                {/* ── 7. Present & Permanent Address (Full Width on Desktop) ── */}
                <div
                  className="xl:col-span-2 dv-section-card rounded-[24px] overflow-hidden"
                  style={{
                    animationDelay: '0.80s',
                    background: 'white',
                    boxShadow: '0 4px 24px rgba(6,13,31,0.07), 0 1px 4px rgba(6,13,31,0.04)',
                    border: '1px solid rgba(6,13,31,0.05)',
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: '#FEF2F2' }}>
                        🏠
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                          Address · বর্তমান ও স্থায়ী ঠিকানা
                        </h3>
                        <div className="h-0.5 w-8 rounded-full mt-1" style={{ background: '#EF4444' }} />
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${isSameAddress ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                      {isSameAddress ? 'বর্তমান ও স্থায়ী একই' : 'আলাদা স্থায়ী ঠিকানা'}
                    </span>
                  </div>

                  <div className={`mx-4 mb-4 grid grid-cols-1 ${!isSameAddress ? 'md:grid-cols-2' : ''} gap-3.5`}>
                    {/* Present Address Box */}
                    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
                      <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#F7E09A]">বর্তমান ঠিকানা (Present)</span>
                        {data.DivisionBn && <span className="text-[10px] font-bold text-slate-300">{data.DivisionBn}</span>}
                      </div>
                      <div className="px-4 py-3" style={{ background: '#F8FAFC' }}>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">বাংলা ঠিকানা</p>
                        <p className="text-sm font-bold text-slate-800 leading-relaxed">
                          {[data.HouseNameBn, data.VillageBn, data.UnionBn, data.UpazilaBn, data.DistrictBn, data.DivisionBn].filter(Boolean).join(', ')}।
                        </p>
                      </div>
                      <div className="h-px" style={{ background: '#E2E8F0' }} />
                      <div className="px-4 py-3 bg-white">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">English Address</p>
                        <p className="text-sm font-bold text-slate-600 leading-relaxed">
                          {[data.HouseNameEn, data.VillageEn, data.UnionEn, data.UpazilaEn, data.DistrictEn, data.DivisionEn].filter(Boolean).join(', ')}.
                        </p>
                      </div>
                      <div className="h-px" style={{ background: '#E2E8F0' }} />
                      <div className="px-4 py-2.5 grid grid-cols-3 gap-2 text-center" style={{ background: '#F8FAFC' }}>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Post Office</span>
                          <span className="text-xs font-black text-slate-800">{data.PostOffice || 'N/A'}</span>
                        </div>
                        <div className="border-x border-slate-200">
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Post Code</span>
                          <span className="text-xs font-mono font-black text-slate-800">{data.PostCode || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block">Ward No</span>
                          <span className="text-xs font-black text-slate-800">{data.WardNo || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Permanent Address Box (Only if different from Present Address) */}
                    {!isSameAddress && perm && (
                      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #C7D2FE' }}>
                        <div className="px-4 py-2.5 bg-indigo-950 text-white flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200">স্থায়ী ঠিকানা (Permanent)</span>
                          {perm.divisionBn && <span className="text-[10px] font-bold text-indigo-300">{perm.divisionBn}</span>}
                        </div>
                        <div className="px-4 py-3" style={{ background: '#EEF2FF' }}>
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">বাংলা ঠিকানা</p>
                          <p className="text-sm font-bold text-slate-800 leading-relaxed">
                            {[perm.houseNameBn, perm.villageBn, perm.unionBn, perm.upazilaBn, perm.districtBn, perm.divisionBn].filter(Boolean).join(', ')}।
                          </p>
                        </div>
                        <div className="h-px" style={{ background: '#E0E7FF' }} />
                        <div className="px-4 py-3 bg-white">
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">English Address</p>
                          <p className="text-sm font-bold text-slate-600 leading-relaxed">
                            {[perm.houseNameEn, perm.villageEn, perm.unionEn, perm.upazilaEn, perm.districtEn, perm.divisionEn].filter(Boolean).join(', ')}.
                          </p>
                        </div>
                        <div className="h-px" style={{ background: '#E0E7FF' }} />
                        <div className="px-4 py-2.5 grid grid-cols-3 gap-2 text-center" style={{ background: '#F8FAFC' }}>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block">Post Office</span>
                            <span className="text-xs font-black text-slate-800">{perm.postOffice || 'N/A'}</span>
                          </div>
                          <div className="border-x border-slate-200">
                            <span className="text-[9px] font-black text-slate-400 uppercase block">Post Code</span>
                            <span className="text-xs font-mono font-black text-slate-800">{perm.postCode || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase block">Ward No</span>
                            <span className="text-xs font-black text-slate-800">{perm.wardNo || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 7.5 ACADEMIC HISTORY (সেশনভিত্তিক একাডেমিক ইতিহাস) ── */}
                {Array.isArray(data.AcademicHistory) && data.AcademicHistory.length > 0 && (
                  <div
                    className="xl:col-span-2 dv-section-card rounded-[24px] overflow-hidden"
                    style={{
                      animationDelay: '0.85s',
                      background: 'white',
                      boxShadow: '0 4px 24px rgba(6,13,31,0.07), 0 1px 4px rgba(6,13,31,0.04)',
                      border: '1px solid rgba(6,13,31,0.05)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: '#EFF6FF' }}>
                          📚
                        </div>
                        <div>
                          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                            Academic History · একাডেমিক ইতিহাস
                          </h3>
                          <div className="h-0.5 w-8 rounded-full mt-1" style={{ background: '#2563EB' }} />
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {data.AcademicHistory.length} session{data.AcademicHistory.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[...data.AcademicHistory].reverse().map((hist, idx) => {
                        const st = hist.resultStatus || 'Studying';
                        const badgeStyle =
                          st === 'Promoted'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : st === 'Failed'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : st === 'Transferred'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200';
                        return (
                          <div
                            key={`${hist.session}-${hist.classBn}-${idx}`}
                            className="px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-800">
                                সেশন {hist.session} · {hist.classBn} {hist.classEn ? `(${hist.classEn})` : ''}
                              </p>
                              <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                                রোল: {hist.roll}{hist.group ? ` · গ্রুপ: ${hist.group}` : ''}
                              </p>
                            </div>
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 ${badgeStyle}`}>
                              {st}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── 8. SIBLINGS SECTION (100% UNCHANGED ORIGINAL STRUCTURE) ── */}
                {siblings && siblings.length > 0 && (
                  <div
                    className="xl:col-span-2 dv-section-card rounded-[24px] overflow-hidden"
                    style={{
                      animationDelay: '0.9s',
                      background: 'white',
                      boxShadow: '0 4px 24px rgba(6,13,31,0.07), 0 1px 4px rgba(6,13,31,0.04)',
                      border: '1px solid rgba(6,13,31,0.05)',
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: '#FEF3E2' }}>
                        👨‍👩‍👧‍👦
                      </div>
                      <div>
                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Siblings</h3>
                        <div className="h-0.5 w-8 rounded-full mt-1" style={{ background: '#D97706' }} />
                      </div>
                      <span className="ml-auto text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        {siblings.length} found
                      </span>
                    </div>

                    {/* Clickable sibling rows */}
                    <div className="px-4 pb-4 space-y-2">
                      {siblings.map((sib) => {
                        const { color, bg } = CLASS_PALETTE[sib.ClassBn] || { color: '#3B5BDB', bg: '#EEF2FF' };
                        return (
                          <button
                            key={sib.ID}
                            onClick={() => onSelectSibling && onSelectSibling(sib)}
                            className="dv-row-item w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left"
                            style={{ background: '#F8FAFC', border: '1px solid transparent' }}
                          >
                            <img
                              src={sib.ImageURL || DEFAULT_IMAGE}
                              className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
                              style={{ border: `2px solid ${color}30` }}
                              alt=""
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-black text-slate-900 truncate">{sib.StudentNameEn}</p>
                              <p className="text-[11px] font-semibold text-slate-400 truncate">{sib.StudentNameBn}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-md" style={{ background: bg, color }}>
                                {sib.ClassEn}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">Roll {sib.Roll}</span>
                            </div>
                            <ChevronLeft size={14} className="rotate-180 text-slate-300 flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mobile Last Updated Footer */}
                {data.LastUpdated && (
                  <div className="lg:hidden xl:col-span-2 text-center pt-1 pb-2">
                    <p className="text-[10px] font-bold text-slate-400">
                      সর্বশেষ আপডেট: <span className="font-mono">{data.LastUpdated}</span>
                    </p>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════
            MOBILE STICKY BOTTOM — Edit / Delete (Dynamic RBAC)
        ══════════════════════════════════════ */}
        {(canEdit || canDelete) && (
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-8 pt-4 dv-slide-up"
            style={{
              animationDelay: '0.9s',
              background: 'linear-gradient(to top, rgba(240,244,255,1) 60%, rgba(240,244,255,0) 100%)',
            }}
          >
            <div className="flex gap-3">
              {canEdit && (
                <button
                  onClick={onEdit}
                  className="dv-action-btn flex-1 flex items-center justify-center gap-2.5 py-4 rounded-[20px] font-black text-sm text-white"
                  style={{
                    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                    boxShadow: '0 12px 40px rgba(6,13,31,0.35)',
                  }}
                >
                  <Edit3 size={18} />
                  Edit Profile
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(data.ID)}
                  className={`dv-action-btn ${canEdit ? 'w-16' : 'flex-1 gap-2 text-sm font-black'} py-4 rounded-[20px] flex items-center justify-center`}
                  style={{
                    background: '#FEF2F2',
                    border: '1.5px solid #FECACA',
                    color: '#EF4444',
                    boxShadow: '0 4px 16px rgba(239,68,68,0.15)',
                  }}
                >
                  <Trash2 size={22} />
                  {!canEdit && <span>Delete Student</span>}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
};

// ── PREMIUM SECTION CARD ──
const PremiumSection = ({ title, icon, delay: animDelay, accent, items, extra }) => (
  <div
    className="dv-section-card rounded-[24px] overflow-hidden"
    style={{
      animationDelay: animDelay,
      background: 'white',
      boxShadow: '0 4px 24px rgba(6,13,31,0.07), 0 1px 4px rgba(6,13,31,0.04)',
      border: '1px solid rgba(6,13,31,0.05)',
    }}
  >
    {/* Section Header */}
    <div className="flex items-center gap-3 px-5 pt-5 pb-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
        style={{ background: `${accent}14` }}>
        {icon}
      </div>
      <div>
        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{title}</h3>
        <div className="h-0.5 w-8 rounded-full mt-1" style={{ background: accent }} />
      </div>
    </div>

    {/* Items */}
    <div className="px-4 pb-4 space-y-1">
      {items.map((item, i) => (
        <div
          key={i}
          className="dv-row-item flex items-center justify-between px-3 py-3 rounded-2xl"
          style={{
            background: i % 2 === 0 ? '#F8FAFC' : 'white',
            border: item.highlight ? `1px solid ${accent}22` : 'none',
          }}
        >
          <span className="text-[11px] font-bold text-slate-400 flex-1 pr-2">{item.label}</span>
          <span
            className={`text-[13px] font-black text-right ml-2 break-words ${item.mono ? 'font-mono tracking-tight' : ''}`}
            style={{ color: item.color || '#0F172A', maxWidth: '58%' }}
          >
            {item.value || 'N/A'}
          </span>
        </div>
      ))}
      {extra}
    </div>
  </div>
);

const ActionBtn = ({ icon: Icon, label, bg, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-2 group">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition group-active:scale-90 ${bg}`}>
      <Icon size={24} />
    </div>
    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
  </button>
);

export default DetailView;