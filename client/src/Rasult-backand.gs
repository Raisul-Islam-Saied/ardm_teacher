const SPREADSHEET_ID = '1jVz7roHr9d3eCEPzQ3dB2Di5Avm2QXGNOcAbIa-Ko2c';

/* =========================
   COMMON JSON RESPONSE
========================= */
function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =========================
   GET → ONLY SHEET LIST
   (NO DATA FOR SECURITY)
========================= */
function doGet(e) {
  try {
    const role = e.parameter.role || 'public';
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();let result = [];

    if (role === 'admin') {
      // 🔥 Admin → full data
      result = sheets.map(sheet => ({
        sheetName: sheet.getName(),
        data: sheet.getDataRange().getValues()
      }));
    } else {// 🌐 Public / Class Admin → sheet name only
      result = sheets.map(sheet => ({
        sheetName: sheet.getName()
      }));
    }

    return jsonOutput({
      status: "success",
      data: result
    });} catch (error) {
    return jsonOutput({
      status: "error",
      message: error.toString()
    });
  }
}

/* =========================
   POST HANDLER
========================= */
function doPost(e) {
  const ADMIN_SECRET = "ARDM_DELETE_2026";

  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === "upload") {if (payload.key !== ADMIN_SECRET) {
    return jsonOutput({ status: "error", message: "Unauthorized" });
  }
  return handleUpload(payload);
}


    if (action === "delete") {
  if (payload.key !== ADMIN_SECRET) {
    return jsonOutput({status: "error",
      message: "Unauthorized delete request"
    });
  }
  return handleDelete(payload.sheetName);
}


    if (action === "search") {
      return handleSearch(payload.sheetName, payload.key);
    }

    // 👇 নতুন: সার্চ হিস্ট্রি লগ করার লজিক এখানে যুক্ত করা হলো 👇
    if (action === "log_search") {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      let logSheet = ss.getSheetByName("Search_History");
      
      if (!logSheet) {
        logSheet = ss.insertSheet("Search_History");
        logSheet.appendRow(["তারিখ ও সময়", "সার্চকারীর নাম", "সার্চকারীর আইডি", "শ্রেণি", "পরীক্ষা", "সাল", "সার্চ ইনপুট", "শিক্ষার্থীর নাম", "রোল", "আইডি"]);
        logSheet.getRange("A1:J1").setFontWeight("bold").setBackground("#f3f4f6");
      }
      
      const timestamp = Utilities.formatDate(new Date(), "Asia/Dhaka", "dd-MMM-yyyy hh:mm:ss a");
      logSheet.appendRow([timestamp, payload.searcherName, payload.searcherId, payload.className, payload.examName, payload.year, payload.searchId, payload.stdName, payload.stdRoll, payload.stdId]);
      
      return jsonOutput({ status: 'success' });
    }
    // 👆 লগিং লজিক শেষ 👆

    // 👇 নতুন: এডমিন প্যানেলের জন্য হিস্ট্রি ফেচ করার লজিক 👇
    if (action === "get_logs") {
      if (payload.key !== ADMIN_SECRET) {
        return jsonOutput({ status: "error", message: "Unauthorized" });
      }
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      let logSheet = ss.getSheetByName("Search_History");
      
      if (!logSheet) {
        return jsonOutput({ status: 'success', data: [] });
      }
      
      const data = logSheet.getDataRange().getValues();
      return jsonOutput({ status: 'success', data: data });
    }
    // 👆 হিস্ট্রি ফেচ শেষ 👆

    return jsonOutput({
      status: "error",
      message: "Invalid action"
    });

  } catch (error) {
    return jsonOutput({
      status: "error",message: error.toString()
    });
  }
}

/* =========================
   SEARCH → RETURN ONLY ONE SHEET DATA
========================= */
function handleSearch(sheetName, key) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return jsonOutput({
      status: "error",
      message: "শিট পাওয়া যায়নি"
    });
  }

  // 👇 টাইম লক লজিক শুধু এখানে যুক্ত করা হলো 👇
  const parts = sheetName.split('][');
  if (parts.length >= 5) {
    const timestampStr = parts[4].replace(']', '');
    const publishTime = parseInt(timestampStr, 10);
    if (new Date().getTime() < publishTime && key !== "ARDM_DELETE_2026") {
      return jsonOutput({
        status: "error",
        message: "এই পরীক্ষার রেজাল্ট এখনো পাবলিশ হয়নি।"
      });
    }
  }
  // 👆 টাইম লক লজিক শেষ 👆

  const data = sheet.getDataRange().getValues();return jsonOutput({
    status: "success",
    data: data
  });
}

/* =========================
   UPLOAD CSV DATA
========================= */
function handleUpload(payload) {const sheetName = payload.sheetName;
  const data = payload.data;

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Extract base prefix: [Class][Exam][Year]
  const parts = sheetName.split('][');
  let basePrefix = null;

  if (parts.length >= 3) {basePrefix = parts[0] + '][' + parts[1] + '][' + parts[2] + ']';
  }

  // Duplicate check
  if (basePrefix) {
    const allSheets = ss.getSheets();

    for (let i = 0; i < allSheets.length; i++) {
      const currentName = allSheets[i].getName();if (currentName.indexOf(basePrefix) === 0) {
        return jsonOutput({
          status: "error",
          message: "এই ক্লাসের এই পরীক্ষাটি ইতিমধ্যেই আপলোড করা আছে!"
        });
      }
    }
  } else {
    const existing = ss.getSheetByName(sheetName);
    if (existing) {return jsonOutput({
        status: "error",
        message: "এই নামে একটি শিট ইতিমধ্যেই আছে!"
      });
    }
  }

  // Create new sheet
  const sheet = ss.insertSheet(sheetName);if (data && data.length > 0) {
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);

    // Header formatting
    sheet.getRange(1, 1, 1, data[0].length)
      .setFontWeight("bold")
      .setBackground("#f3f4f6");
  }

  return jsonOutput({status: "success",
    message: "সফলভাবে ডাটা সেভ হয়েছে"
  });
}

/* =========================
   DELETE SHEET
========================= */
function handleDelete(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return jsonOutput({
      status: "error",
      message: "শিট পাওয়া যায়নি"
    });
  }

  ss.deleteSheet(sheet);return jsonOutput({
    status: "success",
    message: "সফলভাবে ডিলিট করা হয়েছে"
  });
}

/* =========================
   OPTIONS (PREFLIGHT SAFE)
========================= */
function doOptions() {return ContentService.createTextOutput("");
}

