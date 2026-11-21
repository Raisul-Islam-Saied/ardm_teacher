/**
 * SCHOOL APP BACKEND - FINAL ULTRA SECURE
 */

function doGet(e){ return handleRequest(e); }
function doPost(e){ return handleRequest(e); }

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return response({ status: "error", message:"Server busy, try again" });

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rows = sheet.getDataRange().getValues();

    if (rows.length === 0 || rows[0][0] === "") {
      sheet.appendRow([
        "ID","Time","Session",
        "StudentNameBn","StudentNameEn","Gender","Roll","ClassBn","ClassEn","BRN","DOB","BloodGroup",
        "FatherNameBn","FatherNameEn","MotherNameBn","MotherNameEn",
        "WhatsApp","EmergencyNo",
        "HouseNameBn","HouseNameEn","VillageBn","VillageEn",
        "UnionBn","UnionEn","WardNo",
        "UpazilaBn","UpazilaEn","DistrictBn","DistrictEn","ImageURL","Status","LastUpdated"
      ]);
      rows = sheet.getDataRange().getValues();
    }

    var params = e.parameter;
    var postData = e.postData ? JSON.parse(e.postData.contents) : {};
    var action = params.action || postData.action;

    if(!action) return response({status:"error",message:"No action provided"});

   // 🔐 SECURITY KEY (read ছাড়া সব action এ লাগবে)
if(action !== "read" && postData.key !== "ARDM-SCHOOL-2026")
  return response({status:"error",message:"Unauthorized access"});


    function normalizeEn(str){
  if(!str) return "";
  return str
    .toLowerCase()
    .replace(/\b[a-z]/g, function(letter){
      return letter.toUpperCase();
    })
    .trim()
    .replace(/\s+/g, ' ');
}

    function getClassEn(bn){
      var map = {
        'প্লে':'Play','নার্সারি':'Nursery','কেজি':'KG',
        '১ম':'One','২য়':'Two','৩য়':'Three','৪র্থ':'Four','৫ম':'Five',
        '৬ষ্ঠ':'Six','৭ম':'Seven','৮ম':'Eight','৯ম':'Nine','১০ম':'Ten'
      };
      return map[bn] || bn;
    }

    function getTime(){
      return Utilities.formatDate(new Date(), "Asia/Dhaka", "dd MMM yyyy hh:mm a");
    }

    // ================= READ =================
    if(action === "read"){
      var data = [];
      var headers = rows[0];
      var searchId = params.id || postData.id;

      if(searchId){
        for(var i=1;i<rows.length;i++){
          if(rows[i][0] == searchId && rows[i][30] !== "Deleted"){
            var obj = {};
            for(var j=0;j<headers.length;j++) obj[headers[j]] = rows[i][j];
            return response({status:"success", data:obj});
          }
        }
        return response({status:"error", message:"Student ID not found"});
      }

      for(var i=1;i<rows.length;i++){
        if(rows[i][30] === "Deleted") continue;
        var obj = {};
        for(var j=0;j<headers.length;j++) obj[headers[j]] = rows[i][j];
        data.push(obj);
      }
      return response({status:"success", data:data.reverse()});
    }

    // ================= CREATE (FULL STRICT) =================
if(action === "create"){

  // Bangla name
  if(!/^[\u0980-\u09FF\s.]{2,50}$/.test(postData.studentNameBn))
    return response({status:"error",message:"Invalid Bangla name"});

  // English names
  if(!/^[A-Za-z .]{3,50}$/.test(postData.studentNameEn))
    return response({status:"error",message:"Student name (English) invalid"});

  // Parents Bangla REQUIRED
  if(!/^[\u0980-\u09FF\s.]{2,50}$/.test(postData.fatherNameBn))
    return response({status:"error",message:"Father name (Bangla) required"});

  if(!/^[\u0980-\u09FF\s.]{2,50}$/.test(postData.motherNameBn))
    return response({status:"error",message:"Mother name (Bangla) required"});

  // Parents English REQUIRED
  if(!/^[A-Za-z .]{3,50}$/.test(postData.fatherNameEn))
    return response({status:"error",message:"Father name (English) invalid"});

  if(!/^[A-Za-z .]{3,50}$/.test(postData.motherNameEn))
    return response({status:"error",message:"Mother name (English) invalid"});

  // Class
  var validClasses = ["প্লে","নার্সারি","কেজি","১ম","২য়","৩য়","৪র্থ","৫ম","৬ষ্ঠ","৭ম","৮ম","৯ম","১০ম"];
  if(!validClasses.includes(postData.classBn))
    return response({status:"error",message:"Invalid class"});

  // Roll
  if(!postData.roll || isNaN(postData.roll) || postData.roll < 1 || postData.roll > 200)
    return response({status:"error",message:"Roll must be 1-200"});

  // Gender
  if(postData.gender !== "Male" && postData.gender !== "Female")
    return response({status:"error",message:"Gender must be Male or Female"});

  // BRN
  if(!/^\d{17}$/.test(postData.brn))
    return response({status:"error",message:"BRN must be exactly 17 digits"});

  // Mobile REQUIRED
  if(!/^01[3-9]\d{8}$/.test(postData.whatsappNumber))
    return response({status:"error",message:"Invalid mobile number"});

  // Emergency REQUIRED
  if(!/^01[3-9]\d{8}$/.test(postData.emergencyNumber))
    return response({status:"error",message:"Invalid emergency number"});

  // DOB age check
  var dob = new Date(postData.dob);
  var age = (new Date() - dob)/(365*24*60*60*1000);
  if(age <  2 || age > 20)
    return response({status:"error",message:"Invalid date of birth"});

  // Blood
  var validBlood = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

if(postData.bloodGroup && !validBlood.includes(postData.bloodGroup))
  return response({status:"error",message:"Invalid blood group"});

  // Session
  if(!/^\d{4}$/.test(postData.sessionYear))
    return response({status:"error",message:"Invalid session year"});

  // Address Bangla REQUIRED
  if(!/^[\u0980-\u09FF\s.]{2,80}$/.test(postData.houseNameBn))
    return response({status:"error",message:"House name (Bangla) required"});

  if(!/^[\u0980-\u09FF\s.]{2,80}$/.test(postData.villageBn))
    return response({status:"error",message:"Village (Bangla) required"});

  if(!/^[\u0980-\u09FF\s.]{2,80}$/.test(postData.unionBn))
    return response({status:"error",message:"Union (Bangla) required"});

  if(!/^[\u0980-\u09FF\s.]{2,80}$/.test(postData.upazilaBn))
    return response({status:"error",message:"Upazila (Bangla) required"});

  if(!/^[\u0980-\u09FF\s.]{2,80}$/.test(postData.districtBn))
    return response({status:"error",message:"District (Bangla) required"});

  // Address English REQUIRED
  if(!/^[A-Za-z .]{2,80}$/.test(postData.houseNameEn))
    return response({status:"error",message:"House name (English) required"});

  if(!/^[A-Za-z .]{2,80}$/.test(postData.villageEn))
    return response({status:"error",message:"Village (English) required"});

  if(!/^[A-Za-z .]{2,80}$/.test(postData.unionEn))
    return response({status:"error",message:"Union (English) required"});

  if(!/^[A-Za-z .]{2,80}$/.test(postData.upazilaEn))
    return response({status:"error",message:"Upazila (English) required"});

  if(!/^[A-Za-z .]{2,80}$/.test(postData.districtEn))
    return response({status:"error",message:"District (English) required"});

  // Ward REQUIRED
  if(!postData.wardNo || isNaN(postData.wardNo))
    return response({status:"error",message:"Ward number required"});

  // Image REQUIRED
  if(!postData.imageUrl || !postData.imageUrl.startsWith("http"))
    return response({status:"error",message:"Student image required"});

  // Duplicate check
  for (var i = 1; i < rows.length; i++) {
if(rows[i][30] === "Deleted") continue;
    if (String(rows[i][7]).trim() === String(postData.classBn).trim() &&
        String(rows[i][6]) === String(postData.roll))
      return response({ status: "error", message: "Duplicate roll in this class" });

    if (rows[i][9] == "'"+postData.brn)
      return response({ status: "error", message: "BRN already exists" });

  

    if(rows[i][0] == postData.studentId)
      return response({status:"error",message:"Student ID already exists"});
  }

  var ts = getTime();
  var classEn = getClassEn(postData.classBn);

  sheet.appendRow([
    postData.studentId, ts, postData.sessionYear,
    postData.studentNameBn, normalizeEn(postData.studentNameEn),
    postData.gender,
    postData.roll, postData.classBn, classEn,
    "'"+postData.brn, postData.dob, postData.bloodGroup,
    postData.fatherNameBn, normalizeEn(postData.fatherNameEn),
    postData.motherNameBn, normalizeEn(postData.motherNameEn),
    "'"+postData.whatsappNumber, "'"+postData.emergencyNumber,
    postData.houseNameBn, normalizeEn(postData.houseNameEn),
    postData.villageBn, normalizeEn(postData.villageEn),
    postData.unionBn, normalizeEn(postData.unionEn),
    postData.wardNo,
    postData.upazilaBn, normalizeEn(postData.upazilaEn),
    postData.districtBn, normalizeEn(postData.districtEn),
    postData.imageUrl, "Active", ts
  ]);

  return response({status:"success",message:"Student saved successfully"});
}

// ================= UPDATE (ALL FIELDS REQUIRED + ID LOCKED) =================
if(action === "update"){

  // ===== REQUIRED CHECK (সব field বাধ্যতামূলক) =====
  var required = [
    "studentNameBn","studentNameEn","gender","roll","classBn","brn","dob",
    "fatherNameBn","fatherNameEn","motherNameBn","motherNameEn",
    "whatsappNumber","emergencyNumber",
    "houseNameBn","houseNameEn",
    "villageBn","villageEn",
    "unionBn","unionEn",
    "wardNo",
    "upazilaBn","upazilaEn",
    "districtBn","districtEn",
    "sessionYear","imageUrl"
  ];

  for (var r=0; r<required.length; r++){
    if(!postData[required[r]] || String(postData[required[r]]).trim() === "")
      return response({status:"error",message: required[r] + " is required"});
  }

  // ===== NAME VALIDATION =====
  if(!/^[\u0980-\u09FF\s.]{2,50}$/.test(postData.studentNameBn))
    return response({status:"error",message:"Invalid Bangla name"});

  if(!/^[A-Za-z .]{3,50}$/.test(postData.studentNameEn))
    return response({status:"error",message:"Student name (English) invalid"});

  if(!/^[A-Za-z .]{3,50}$/.test(postData.fatherNameEn))
    return response({status:"error",message:"Father name (English) invalid"});

  if(!/^[A-Za-z .]{3,50}$/.test(postData.motherNameEn))
    return response({status:"error",message:"Mother name (English) invalid"});

  // ===== CLASS =====
  var validClasses = ["প্লে","নার্সারি","কেজি","১ম","২য়","৩য়","৪র্থ","৫ম","৬ষ্ঠ","৭ম","৮ম","৯ম","১০ম"];
  if(!validClasses.includes(postData.classBn))
    return response({status:"error",message:"Invalid class"});

  // ===== ROLL =====
  if(isNaN(postData.roll) || postData.roll < 1 || postData.roll > 200)
    return response({status:"error",message:"Roll must be 1-200"});

  // ===== GENDER =====
  if(postData.gender !== "Male" && postData.gender !== "Female")
    return response({status:"error",message:"Gender must be Male or Female"});

  // ===== BRN =====
  if(!/^\d{17}$/.test(postData.brn))
    return response({status:"error",message:"BRN must be exactly 17 digits"});

  // ===== MOBILE =====
  if(!/^01[3-9]\d{8}$/.test(postData.whatsappNumber))
    return response({status:"error",message:"Invalid mobile number"});

  if(!/^01[3-9]\d{8}$/.test(postData.emergencyNumber))
    return response({status:"error",message:"Invalid emergency number"});

  // ===== DOB AGE CHECK =====
  var dob = new Date(postData.dob);
  var age = (new Date() - dob)/(365*24*60*60*1000);
  if(age < 2 || age > 20)
    return response({status:"error",message:"Invalid date of birth"});

  // ===== BLOOD =====
  var validBlood = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

if(postData.bloodGroup && !validBlood.includes(postData.bloodGroup))
  return response({status:"error",message:"Invalid blood group"});


  // ===== SESSION =====
  if(!/^\d{4}$/.test(postData.sessionYear))
    return response({status:"error",message:"Invalid session year"});

  // ===== IMAGE =====
  if(!postData.imageUrl.startsWith("http"))
    return response({status:"error",message:"Invalid image URL"});

  // ===== WARD =====
  if(isNaN(postData.wardNo))
    return response({status:"error",message:"Ward must be numeric"});

  // ===== DUPLICATE CHECK (নিজেকে বাদ দিয়ে) =====
  for (var i = 1; i < rows.length; i++) {
if(rows[i][30] === "Deleted") continue;
    if(rows[i][0] != postData.id){

      if (String(rows[i][7]).trim() === String(postData.classBn).trim() &&
          String(rows[i][6]) === String(postData.roll))
        return response({ status: "error", message: "Duplicate roll in this class" });

      if (rows[i][9] == "'"+postData.brn)
        return response({ status: "error", message: "BRN already exists" });

    
    }
  }

  // ===== FIND ROW =====
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == postData.id) {

      var ts = getTime();
      var classEn = getClassEn(postData.classBn);

      // 🔒 ID LOCKED
      var oldID = rows[i][0];

      sheet.getRange(i+1,1,1,32).setValues([[
        oldID, rows[i][1], postData.sessionYear,
        postData.studentNameBn, normalizeEn(postData.studentNameEn),
        postData.gender,
        postData.roll, postData.classBn, classEn,
        "'"+postData.brn, postData.dob, postData.bloodGroup,
        postData.fatherNameBn, normalizeEn(postData.fatherNameEn),
        postData.motherNameBn, normalizeEn(postData.motherNameEn),
        "'"+postData.whatsappNumber, "'"+postData.emergencyNumber,
        postData.houseNameBn, normalizeEn(postData.houseNameEn),
        postData.villageBn, normalizeEn(postData.villageEn),
        postData.unionBn, normalizeEn(postData.unionEn),
        postData.wardNo,
        postData.upazilaBn, normalizeEn(postData.upazilaEn),
        postData.districtBn, normalizeEn(postData.districtEn),
        postData.imageUrl, "Active", ts
      ]]);

      return response({status:"success",message:"Student updated successfully"});
    }
  }

  return response({status:"error",message:"Student ID not found"});
}


    // ================= DELETE =================
    if(action === "delete"){
      for(var i=1;i<rows.length;i++){
        if(rows[i][0] == postData.id){
          var ts = getTime();
          sheet.getRange(i+1,31).setValue("Deleted");
          sheet.getRange(i+1,32).setValue(ts);
          return response({status:"success",message:"Student deleted"});
        }
      }
      return response({status:"error",message:"Student ID not found"});
    }

  } catch(e){
    return response({status:"error",message:e.toString()});
  } finally {
    lock.releaseLock();
  }
}

function response(data){
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
