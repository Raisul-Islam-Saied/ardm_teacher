export function escapePrintHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function addressText(address = {}) {
    return {
        house: address.houseNameEn || address.houseNameBn || address.houseOrRoad || '',
        village: address.villageEn || address.villageBn || address.village || '',
        postOffice: address.postOffice || '',
        postCode: address.postCode || '',
        upazila: address.upazilaEn || address.upazilaBn || address.upazila || '',
        district: address.districtEn || address.districtBn || address.district || ''
    };
}

function exactDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' }).toUpperCase();
    return `${day} ${month} ${date.getFullYear()}`;
}

function phoneDigits(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('880')) return digits.slice(3);
    return digits.startsWith('0') ? digits.slice(1) : digits;
}

function buildPairs(teachers) {
    return teachers.map((teacher) => {
        const code = escapePrintHtml(teacher.teacherCode || '');
        const nameBn = escapePrintHtml(teacher.fullNameBng || '');
        const nameEn = escapePrintHtml(teacher.fullNameEng || '');
        const designation = escapePrintHtml(teacher.designation || '');
        const blood = escapePrintHtml(teacher.bloodGroup || 'N/A');
        const mobile = escapePrintHtml(phoneDigits(teacher.phone));
        const emergency = escapePrintHtml(phoneDigits(teacher.emergencyContact?.phone));
        const dob = escapePrintHtml(exactDate(teacher.dateOfBirth));
        const joining = escapePrintHtml(exactDate(teacher.joiningDate));
        const photo = escapePrintHtml(teacher.profilePicture?.url || 'https://placehold.co/400x400/ffffff/64748b?text=No+Photo');
        const address = addressText(teacher.permanentAddress || teacher.presentAddress);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://ardm.netlify.app/teacher/${encodeURIComponent(code)}`;

        return `
        <div class="id-pair">
          <div class="id-card">
            <svg class="header-graphic" viewBox="0 0 204 125" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="headerGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#0B192C"/>
                  <stop offset="1" stop-color="#1A365D"/>
                </linearGradient>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stop-color="#BF953F"/>
                  <stop offset=".25" stop-color="#FCF6BA"/>
                  <stop offset=".5" stop-color="#B38728"/>
                  <stop offset=".75" stop-color="#FBF5B7"/>
                  <stop offset="1" stop-color="#AA771C"/>
                </linearGradient>
              </defs>
              <polygon points="0,0 204,0 204,97.5 0,125" fill="url(#headerGradient)"/>
              <rect x="0" y="121" width="204" height="4" fill="url(#goldGradient)"/>
            </svg>
            <div class="header-content">
              <div class="inst-title">Abdur Razzak Dakhil Madrasah</div>
              <div class="inst-sub">Sarafbhata, Rangunia, Chattogram</div>
            </div>
            <div class="profile-area">
              <div class="photo-frame">
                <svg class="photo-gold-ring" viewBox="0 0 95 95" aria-hidden="true"><defs><linearGradient id="photoGold${code}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BF953F"/><stop offset=".5" stop-color="#FCF6BA"/><stop offset="1" stop-color="#AA771C"/></linearGradient></defs><rect x="0" y="0" width="95" height="95" rx="22" fill="none" stroke="url(#photoGold${code})" stroke-width="5"/></svg>
                <img src="${photo}" alt="Teacher Photo">
              </div>
            </div>
            <div class="person-info">
              <div class="name-en">${nameEn}</div>
              <div class="name-bn">${nameBn}</div>
              <div class="designation">${designation}</div>
            </div>
            <div class="details-table">
              <div class="d-lbl">Teacher ID</div><div class="d-col">:</div><div class="d-val">${code}</div>
              <div class="d-lbl">Mobile</div><div class="d-col">:</div><div class="d-val">0${mobile}</div>
              <div class="d-lbl">Blood Group</div><div class="d-col">:</div><div class="d-val blood">${blood} (Positive)</div>
              <div class="d-lbl">Date Of Birth</div><div class="d-col">:</div><div class="d-val">${dob}</div>
            </div>
            <div class="bottom-barcode"><div class="barcode-font">${code}</div></div>
            <svg class="card-footer-graphic" viewBox="0 0 204 11" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="0" width="204" height="2" fill="#D4AF37"/><rect x="0" y="2" width="204" height="9" fill="#0B192C"/></svg>
          </div>

          <div class="id-card">
            <div class="back-header">
              <svg class="back-header-graphic" viewBox="0 0 204 37" preserveAspectRatio="none" aria-hidden="true"><rect width="204" height="35" fill="#0B192C"/><rect y="35" width="204" height="2" fill="#D4AF37"/></svg>
              <h3>Abdur Razzak Dakhil Madrasah</h3>
            </div>
            <div class="back-body">
              <div class="address-box">
                <div class="s-title">Permanent Address</div>
                <div class="s-text">
                  <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">House: ${escapePrintHtml(address.house)},</div>
                  <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">Vill: ${escapePrintHtml(address.village)}, Post: ${escapePrintHtml(address.postOffice)} - ${escapePrintHtml(address.postCode)},</div>
                  Upazila: ${escapePrintHtml(address.upazila)}, District: ${escapePrintHtml(address.district)}.
                </div>
              </div>
              <div class="mid-section">
                <div class="qr-holder"><img src="${qrUrl}" alt="QR Code"></div>
                <div class="issue-info">
                  <div class="i-lbl">Date Of Join</div>
                  <div class="i-val">${joining}</div>
                  <div class="status-badge">${teacher.isActive === false ? 'Former Staff' : 'Active Staff'}</div>
                </div>
              </div>
              <div class="terms-box">
                <div class="s-title" style="border-bottom:1px solid #E2E8F0;padding-bottom:3px;margin-bottom:4px;">Terms &amp; Conditions</div>
                <ul>
                  <li>This card is property of the institution.</li>
                  <li>Must be worn visibly during duty hours.</li>
                  <li>If lost, inform the authority immediately.</li>
                </ul>
              </div>
              <div class="emergency-strip">
                <div class="em-lbl">Emergency Contact Number</div>
                <div class="em-num">0${emergency}</div>
              </div>
            </div>
            <div class="return-footer">
              <svg class="return-footer-graphic" viewBox="0 0 204 26" preserveAspectRatio="none" aria-hidden="true"><rect width="204" height="26" fill="#0B192C"/></svg>
              <span>If found, please return to the madrasah office.</span>
            </div>
          </div>
        </div>`;
    }).join('');
}

export function openOfficialIdCardsPrint(teachers) {
    const list = Array.isArray(teachers) ? teachers.filter(Boolean) : [];
    if (list.length === 0) return;
    const printWindow = window.open('', '_blank', 'width=1100,height=760');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ARDM - Print ID Cards</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Noto+Sans+Bengali:wght@500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
    :root{--primary:#0B192C;--secondary:#1A365D;--accent:#D4AF37;--text-main:#0F172A;--text-light:#64748B;--bg-color:#F8FAFC;--white:#FFFFFF;--danger:#E11D48;--gold-gradient:linear-gradient(135deg,#BF953F,#FCF6BA,#B38728,#FBF5B7,#AA771C)}
    *{box-sizing:border-box}
    body{margin:0;background:#f3f4f6;font-family:Poppins,'Noto Sans Bengali',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    #print-container{display:flex;flex-wrap:wrap;justify-content:space-between;align-content:flex-start;gap:0;row-gap:25px;column-gap:0;padding:24px}
    .id-pair{display:flex;gap:8px;break-inside:avoid;page-break-inside:avoid}
    .id-card{width:2.125in;height:3.375in;background:var(--white);position:relative;border-radius:10px;overflow:hidden;border:1px solid #E2E8F0;z-index:1;flex:0 0 auto}
    .id-card::before{content:'';position:absolute;inset:0;background-image:radial-gradient(var(--secondary) .5px,transparent .5px);background-size:12px 12px;opacity:.04;z-index:-2}
    .header-graphic{position:absolute;top:0;left:0;width:100%;height:125px;z-index:0}
    .header-content{position:relative;z-index:1;text-align:center;padding-top:15px;color:var(--white)}
    .inst-title{font-family:'Bebas Neue';font-size:17px;font-weight:normal;text-transform:uppercase;padding:0 10px;text-shadow:0 2px 4px rgba(0,0,0,.4);line-height:1.2}
    .inst-sub{font-family:Poppins;font-size:7px;font-weight:500;color:#CBD5E1;margin-top:0;letter-spacing:.8px;text-transform:uppercase}
    .profile-area{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;margin-top:10px}
    .photo-frame{width:90px;height:90px;background:var(--white);border-radius:20px;position:relative}
    .photo-frame::before{content:'';position:absolute;inset:-2.5px;background:var(--gold-gradient);border-radius:22px;z-index:-1}
    .photo-gold-ring{position:absolute;inset:-2.5px;width:95px;height:95px;z-index:1}
    .photo-frame img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:20px;display:block;margin:0;padding:0;z-index:2}
    .person-info{text-align:center;margin-top:8px;padding:0 10px}
    .name-en{font-size:12px;font-weight:800;color:var(--primary);text-transform:uppercase;letter-spacing:-.2px;line-height:1.1}
    .name-bn{font-size:11px;font-weight:600;color:var(--text-light);margin-top:1px}
    .designation{font-size:7px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1.2px;margin-top:2px;background:var(--primary);display:inline-block;padding:3px 10px;border-radius:4px}
    .details-table{width:85%;margin:8px auto 0;display:grid;grid-template-columns:68px 10px 1fr;row-gap:3.5px;font-size:9px;text-align:left}
    .d-lbl{font-weight:700;color:var(--text-light);text-transform:uppercase}.d-col{font-weight:700;color:var(--text-main);text-align:center}.d-val{font-weight:800;color:var(--text-main)}.d-val.blood{color:var(--danger);font-weight:900;font-size:9px}
    .bottom-barcode{position:absolute;bottom:8px;width:100%;text-align:center}
    .barcode-font{font-family:'Libre Barcode 128';font-size:27px;line-height:.8;letter-spacing:2px;color:var(--primary);opacity:.9}
    .card-footer-color{position:absolute;bottom:0;left:0;width:100%;height:11px;border-top:2px solid var(--accent);background:var(--primary)}
    .card-footer-graphic{position:absolute;bottom:0;left:0;width:100%;height:11px;z-index:3}
    .back-header{position:relative;background:var(--primary);padding:10px;text-align:center;border-bottom:2px solid var(--accent);min-height:37px}
    .back-header-graphic{position:absolute;inset:0;width:100%;height:100%;z-index:0}
    .back-header h3{position:relative;z-index:1;font-family:'Bebas Neue';color:var(--white);font-size:14px;font-weight:normal;text-transform:uppercase;letter-spacing:1px;line-height:1.2;margin:0}
    .back-body{padding:12px 14px;display:flex;flex-direction:column;height:calc(100% - 35px);text-align:left}
    .address-box{background:var(--bg-color);border:1px solid #E2E8F0;border-left:3px solid var(--primary);border-radius:4px;padding:8px;margin-bottom:7px}
    .s-title{font-size:8px;font-weight:800;color:var(--primary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
    .s-text{font-size:7px;text-transform:capitalize;color:var(--text-main);font-weight:600;line-height:1.4}
    .mid-section{display:flex;justify-content:left;gap:15px;align-items:center;margin-bottom:10px}
    .qr-holder{width:55px;height:55px;background:var(--white);padding:3px;border:1px solid #CBD5E1;border-radius:6px;box-shadow:0 2px 4px rgba(0,0,0,.05);flex:0 0 auto}
    .qr-holder img{width:100%;height:100%;display:block}
    .issue-info{text-align:left}.i-lbl{font-size:5.5px;color:var(--text-light);text-transform:uppercase;font-weight:700;letter-spacing:.5px}.i-val{font-size:10px;font-weight:800;color:var(--primary);margin-bottom:4px;line-height:1.1}
    .status-badge{background:#059669;color:var(--white);font-size:5.5px;padding:3px 8px;border-radius:5px;text-transform:uppercase;font-weight:800;letter-spacing:.5px;display:inline-block}
    .terms-box{margin-bottom:auto}.terms-box ul{padding-left:12px;margin:0}.terms-box li{font-size:6.5px;color:var(--text-light);font-weight:500;margin-bottom:3px;line-height:1.3}
    .emergency-strip{background:#FFF1F2;border:1px dashed #FECDD3;border-radius:6px;text-align:center;padding:8px;margin-bottom:25px}.em-lbl{font-size:6.5px;color:var(--danger);font-weight:800;text-transform:uppercase;letter-spacing:.5px}.em-num{font-size:12px;font-weight:900;color:#BE123C;margin-top:2px}
    .return-footer{position:absolute;bottom:0;left:0;width:100%;height:26px;background:var(--primary);color:#CBD5E1;font-size:10px;font-family:'Bebas Neue';text-align:center;padding:8px 0;font-weight:500;letter-spacing:.5px;text-transform:uppercase}
    .return-footer-graphic{position:absolute;inset:0;width:100%;height:26px;z-index:0}
    .return-footer span{position:relative;z-index:1}
    .loading-screen{position:fixed;top:0;left:0;width:100%;height:100%;background:white;display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:9999;font-family:sans-serif}
    @media print{
      body{background:none;padding:0;margin:0;display:block;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      #print-container{padding:0;min-height:auto;display:flex;flex-wrap:wrap;justify-content:space-between;align-content:flex-start;gap:0;row-gap:25px;column-gap:0}
      .id-pair{display:flex;gap:8px;break-inside:avoid;page-break-inside:avoid}
      .id-card{margin:0 5px;float:left;page-break-inside:avoid;box-shadow:none;border:.5px dashed #94A3B8;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      @page{size:A4 landscape;margin:.5in}
    }
  </style>
</head>
<body>
  <div id="loading" class="loading-screen">
    <h2 style="color:#0B192C;margin:0 0 8px">Preparing ID Cards for Print...</h2>
    <p style="color:#64748B;margin:0">Please wait while fonts and images load.</p>
  </div>
  <div id="print-container">${buildPairs(list)}</div>
  <script>
    async function waitForPrintAssets(){
      if(document.fonts && document.fonts.ready) await document.fonts.ready;
      await Promise.all(Array.from(document.images).map(function(img){
        if(img.complete) return Promise.resolve();
        return new Promise(function(resolve){
          img.onload=resolve; img.onerror=resolve;
        });
      }));
      await new Promise(function(resolve){ setTimeout(resolve,1000); });
    }
    window.onload=function(){
      waitForPrintAssets().then(function(){
        document.getElementById('loading').style.display='none';
        window.print();
      });
    };
  <\/script>
</body>
</html>`);
    printWindow.document.close();
}

export function openOfficialIdCardPrint(teacher) {
    openOfficialIdCardsPrint([teacher]);
}
