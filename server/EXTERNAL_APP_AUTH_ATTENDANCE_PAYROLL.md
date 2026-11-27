# অন্য অ্যাপ থেকে ERP Login, Attendance ও Salary API

এই নথিতে অন্য একটি trusted application থেকে ARDM ERP-তে user হিসেবে login করে teacher profile, attendance এবং salary data পড়ার পদ্ধতি দেওয়া হয়েছে।

> **এটি `INTEGRATION_API_README.md`-এর app-token API থেকে আলাদা।** Integration API key দিয়ে teacher/student profile পড়া যায়, কিন্তু attendance বা payroll পড়া যায় না। Attendance ও salary endpoint-এ user login করে JWT পাঠাতে হবে।

## 1. সংযোগের নিয়ম

API base URL:

```text
Development: http://localhost:5000/api/v1
Production:  https://<আপনার-ERP-domain>/api/v1
```

Production-এ HTTPS ব্যবহার করুন। Production domain-এর CORS origin `server/.env`-এর `CLIENT_URL`-এ অনুমোদিত থাকতে হবে, যদি browser থেকে সরাসরি API call করা হয়। নিরাপদ পদ্ধতি হলো অন্য অ্যাপের **backend** থেকে ERP API call করা; এতে ERP password/JWT browser code বা mobile bundle-এ রাখতে হয় না।

## 2. User login ও JWT

### Request

`POST /auth/login`

```http
POST /api/v1/auth/login
Content-Type: application/json
Accept: application/json
```

```json
{
  "identifier": "teacher@example.com",
  "password": "<ERP account password>"
}
```

`identifier` হিসেবে অ্যাকাউন্টের নিবন্ধিত email, ১১-ডিজিটের mobile number, অথবা ১০-ডিজিটের `teacherCode` দেওয়া যায়।

এই endpoint `Teacher` account authenticate করে—অর্থাৎ `Teacher`, `Admin` ও `SuperAdmin` account। Student record-এর জন্য এই login endpoint ব্যবহার করা যায় না।

### Node.js backend উদাহরণ

```js
const ERP_BASE_URL = process.env.ARDM_ERP_BASE_URL;

async function loginToErp(identifier, password) {
    const response = await fetch(`${ERP_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identifier, password })
    });

    const body = await response.json();
    if (!response.ok) {
        throw new Error(`ERP login ${response.status}: ${body.message}`);
    }

    return {
        token: body.data.token,
        user: body.data.user
    };
}
```

অন্য অ্যাপের server-side secret/configuration-এ ERP account-এর credential রাখুন; Git, source code, URL, log বা public browser bundle-এ নয়। কোনো shared Super Admin password ব্যবহার না করে প্রত্যেক ব্যবহারকারীর নিজস্ব account ব্যবহার করুন।

### সফল response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "লগইন সফল হয়েছে!",
  "data": {
    "token": "<JWT>",
    "user": {
      "_id": "665012345678901234567890",
      "teacherCode": "2026000001",
      "fullNameBng": "উদাহরণ শিক্ষক",
      "fullNameEng": "Example Teacher",
      "email": "teacher@example.com",
      "role": "Teacher",
      "isActive": true
    }
  },
  "timestamp": "2026-11-27T06:00:00.000Z"
}
```

উদাহরণের `user` object সংক্ষিপ্ত। প্রকৃত response-এ নিচের **Teacher profile fields**-এর তালিকাভুক্ত field-গুলোও থাকতে পারে। Login response-এ profile-এর আর্থিক field, যেমন `basicSalary` ও `bankDetails`, অন্তর্ভুক্ত হতে পারে—এগুলো সংবেদনশীল।

JWT সাধারণত `JWT_EXPIRES_IN=90d` অনুযায়ী মেয়াদ পায়; server configuration-এ সময় ভিন্ন হতে পারে। Refresh-token endpoint নেই। Token-এর `exp` পার হলে আবার login করতে হবে। Password পরিবর্তন/reset হলে আগের JWT বাতিল হয়।

### পরের request-এ JWT পাঠানো

```http
Authorization: Bearer <JWT>
Accept: application/json
```

Node.js উদাহরণ:

```js
async function erpGet(path, token) {
    const response = await fetch(`${ERP_BASE_URL}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
        }
    });
    const body = await response.json();
    if (!response.ok) {
        throw new Error(`ERP API ${response.status}: ${body.message}`);
    }
    return body.data;
}

const profile = await erpGet('/auth/me', token);
```

`GET /auth/me`-এর `data` হলো login করা user-এর profile object। এটি `data.user` নয়।

`GET /teachers/{mongoId}`-এ login করা profile-এর `_id` দিয়ে পূর্ণ Teacher profile নেওয়া যায়। Teacher role-এ নিজের `_id`-ই দেখা যায়; Admin/SuperAdmin অন্য Teacher-এর `_id`-ও দেখতে পারেন। এই route-এর `data`-তেও profile-এর সংবেদনশীল field থাকতে পারে।

## 3. Role অনুযায়ী access

| Login role | নিজের attendance | Salary | অন্য শিক্ষকের data |
|---|---|---|---|
| `Teacher` | `GET /attendance/my-summary`—শুধু নিজের | `GET /payroll/sheets`—শুধু নিজের; `teacherId` filter উপেক্ষা হয় | দেখা যায় না |
| `Admin` | নিজের; `teacherId` দিলে নির্দিষ্ট শিক্ষক | `teacherId` ছাড়া সব salary; `teacherId` দিলে নির্দিষ্ট শিক্ষক | Attendance-এর admin endpoints-এ সব শিক্ষক |
| `SuperAdmin` | নিজের; `teacherId` দিলে নির্দিষ্ট শিক্ষক | `teacherId` ছাড়া সব salary; `teacherId` দিলে নির্দিষ্ট শিক্ষক | Attendance-এর admin endpoints-এ সব শিক্ষক |

`/attendance/daily`, `/attendance/bulk`, `/payroll/attendance-details` এবং `/payroll/sheets/periods` শুধুমাত্র `Admin`/`SuperAdmin`-এর জন্য। `Teacher` token-এ `teacherId` query পাঠিয়েও অন্য শিক্ষকের তথ্য পাওয়া যাবে না।

## 4. Attendance দেখা

### 4.1 নিজের/নির্দিষ্ট শিক্ষকের মাসিক attendance summary

`GET /attendance/my-summary?month=11&year=2026`

- `month`: 1–12; না দিলে বর্তমান Dhaka মাস।
- `year`: সাল; না দিলে বর্তমান Dhaka সাল।
- `teacherId`: শুধু Admin/SuperAdmin-এর ক্ষেত্রে ঐচ্ছিক। Teacher role-এ server নিজস্ব user ID-ই ব্যবহার করে।
- তারিখ ও মাসের হিসাব `Asia/Dhaka` timezone-এ হয়।

উদাহরণ:

```js
const attendance = await erpGet(
    '/attendance/my-summary?month=11&year=2026',
    token
);
console.log(attendance.summary, attendance.dailyLogs);
```

Response-এর `data`:

| Field | অর্থ |
|---|---|
| `teacherInfo` | `_id`, `teacherCode`, `fullNameBng`, `basicSalary` |
| `period` | `month`, `year`, `startDate`, `endDate` |
| `summary.totalPresent` | উপস্থিতির দিন; Present, excused late/duty এবং Holiday Duty-সহ |
| `summary.totalExcusedLateOrDuty` | মওকুফ করা Late বা Official Duty |
| `summary.totalLateCount` | Late count |
| `summary.totalLeaveCount` | Leave count |
| `summary.totalUnexcusedAbsentCount` | অনুমোদনহীন Absent count |
| `summary.totalApprovedLeaveCount` | Approved Sick/Casual Leave count |
| `summary.totalIgnoredDays` | হিসাব থেকে বাদ দেওয়া দিন |
| `summary.totalQuotaUsed` | Late/Leave থেকে ব্যবহৃত ছুটির quota |
| `summary.monthlyAllowedQuota` | মাসিক অনুমোদিত quota |
| `summary.quotaRemaining` | অবশিষ্ট quota |
| `summary.excessQuotaDays` | quota ছাড়ানো দিন |
| `summary.directAbsentPenaltyDays` | Absent-এর সরাসরি বেতন কর্তনের দিন |
| `summary.daysInThisMonth` | মাসে ক্যালেন্ডার দিনের সংখ্যা |
| `summary.perDaySalary` | আনুমানিক দৈনিক বেতন |
| `summary.totalDaysForSalaryCut` | মোট বেতন কর্তনের দিন |
| `summary.estimatedSalaryDeduction` | আনুমানিক বেতন কর্তন |
| `dailyLogs` | নির্বাচিত মাসের date অনুযায়ী সাজানো Attendance record-এর array |

`dailyLogs[]`-এর সব field:

| Field | অর্থ |
|---|---|
| `_id` | Attendance record ID |
| `teacherId` | সংশ্লিষ্ট Teacher-এর MongoDB ID |
| `biometricDeviceId` | Biometric device ID |
| `date` | `YYYY-MM-DD` |
| `punchTime` | পাঞ্চের timestamp অথবা `null` |
| `appliedInTime` | ঐ দিনের প্রযোজ্য অফিসে প্রবেশের সময় |
| `status` | নিচে দেওয়া Attendance status |
| `deductionWeight` | Leave quota-তে হিসাব হওয়া weight |
| `directSalaryPenaltyDays` | Absent-এর সরাসরি salary penalty |
| `quotaDeduction` | quota থেকে কর্তনের পরিমাণ |
| `salaryDeduction` | salary কর্তনের পরিমাণ |
| `isManuallyEdited` | Admin হাতে পরিবর্তন করেছেন কি না |
| `isAutoMarked` | Cron/system স্বয়ংক্রিয়ভাবে mark করেছে কি না |
| `lastImportedAt` | সর্বশেষ import timestamp অথবা `null` |
| `isLateExcused` | Late মওকুফ করা হয়েছে কি না |
| `excuseNote` | মওকুফের note অথবা `null` |
| `isIgnored` | salary/attendance গণনা থেকে বাদ কি না |
| `ignoreReason` | বাদ দেওয়ার কারণ অথবা `null` |
| `source` | রেকর্ডের উৎস, যেমন `ZKTeco_Device`, `Admin_Manual`, `USB_Pendrive_Upload`, `Auto_Cron_Job` |
| `modifiedBy` | পরিবর্তনকারী account-এর MongoDB ID অথবা `null` |
| `remarks` | মন্তব্য অথবা `null` |
| `createdAt`, `updatedAt` | record তৈরি ও পরিবর্তনের timestamp |

বর্তমান `status` মান: `Present`, `Late (Excused)`, `Late`, `Leave`, `Absent`, `Official Duty`, `Approved Sick Leave`, `Approved Casual Leave`, `Holiday Duty`।

Response উদাহরণ:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "মাসিক উপস্থিতির বিস্তারিত সামারি",
  "data": {
    "teacherInfo": {
      "_id": "665012345678901234567890",
      "teacherCode": "2026000001",
      "fullNameBng": "উদাহরণ শিক্ষক",
      "basicSalary": 30000
    },
    "period": {
      "month": 11,
      "year": 2026,
      "startDate": "2026-11-01",
      "endDate": "2026-11-30"
    },
    "summary": {
      "totalPresent": 20,
      "totalExcusedLateOrDuty": 1,
      "totalLateCount": 2,
      "totalLeaveCount": 1,
      "totalUnexcusedAbsentCount": 0,
      "totalApprovedLeaveCount": 1,
      "totalIgnoredDays": 0,
      "totalQuotaUsed": 2,
      "monthlyAllowedQuota": 2,
      "quotaRemaining": 0,
      "excessQuotaDays": 0,
      "directAbsentPenaltyDays": 0,
      "daysInThisMonth": 30,
      "perDaySalary": 1000,
      "totalDaysForSalaryCut": 0,
      "estimatedSalaryDeduction": 0
    },
    "dailyLogs": [
      {
        "_id": "665099999999999999999999",
        "teacherId": "665012345678901234567890",
        "biometricDeviceId": 15,
        "date": "2026-11-27",
        "punchTime": "2026-11-27T03:12:00.000Z",
        "appliedInTime": "09:00",
        "status": "Late",
        "deductionWeight": 0.5,
        "directSalaryPenaltyDays": 0,
        "quotaDeduction": 0.5,
        "salaryDeduction": 0,
        "isManuallyEdited": false,
        "isAutoMarked": false,
        "lastImportedAt": null,
        "isLateExcused": false,
        "excuseNote": null,
        "isIgnored": false,
        "ignoreReason": null,
        "source": "ZKTeco_Device",
        "modifiedBy": null,
        "remarks": null,
        "createdAt": "2026-11-27T03:12:00.000Z",
        "updatedAt": "2026-11-27T03:12:00.000Z"
      }
    ]
  },
  "timestamp": "2026-11-27T06:00:00.000Z"
}
```

সংখ্যাগুলো কেবল নমুনা; প্রকৃত data-তে `dailyLogs`-এ record থাকবে।

### 4.2 Admin-এর জন্য নির্দিষ্ট দিনের সব শিক্ষকের attendance

`GET /attendance/daily?date=2026-11-27`

Admin/SuperAdmin token আবশ্যক। `date` না দিলে বর্তমান Dhaka তারিখ ব্যবহৃত হয়। Response `data`-তে থাকে:

- `date`, `isHoliday`, `isSpecialHoliday`, `isOpenOverride`, `holidayTitle`
- `dayFlag`: ঐ তারিখের attendance-day record অথবা `null`
- `records[]`: সক্রিয় ও Approved শিক্ষকদের record। প্রতিটি item-এ `teacher`, attendance log-এর field (log থাকলে), `date`, `status`, `inTime24`, `remarks`, `monthlyQuotaUsedBefore`, `monthlyQuotaLimit` থাকে।
- `records[].teacher`: `_id`, `teacherCode`, `fullNameBng`, `fullNameEng`, `designation`, `biometricDeviceId`, `customLeaveQuota`
- কোনো log না থাকলে status `null`, holiday হলে `Holiday` হতে পারে।

`dayFlag`-এর field: `_id`, `date`, `dayType` (`WORKDAY`, `HOLIDAY`, `MACHINE_OFF`, `OPEN_OVERRIDE`), `reason`, `isAutoResolved`, `attendancePercentage`, `activeTeacherCount`, `punchedTeacherCount`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`।

### 4.3 Admin-এর জন্য মাসভিত্তিক attendance details

`POST /payroll/attendance-details` Admin/SuperAdmin token আবশ্যক।

```json
{
  "month": 11,
  "year": 2026,
  "teacherIds": ["665012345678901234567890"]
}
```

Response `data` হলো `{ "month", "year", "teachers" }`; `teachers[]`-এ `teacherId`, `teacherCode`, `fullNameBng`, `fullNameEng`, এবং `records[]` থাকে। প্রতিটি record-এ `date`, `status`, `punchTime`, `remarks` থাকে। এই endpoint Absent, Leave, Late, Late (Excused), Approved Sick Leave এবং Approved Casual Leave log ফেরত দেয়; ignored log বাদ থাকে।

## 5. Salary দেখা

### 5.1 Salary sheet

`GET /payroll/sheets?month=11&year=2026`

ঐচ্ছিক query:

| Parameter | ব্যবহার |
|---|---|
| `month` | নির্দিষ্ট মাস, 1–12 |
| `year` | নির্দিষ্ট সাল |
| `paymentStatus` | `Pending` অথবা `Paid` |
| `teacherId` | শুধু Admin/SuperAdmin-এর জন্য; নির্দিষ্ট শিক্ষক filter |

Teacher role-এ `teacherId` উপেক্ষা করে login করা শিক্ষকের salary-ই ফেরত আসে। Admin/SuperAdmin `teacherId` না দিলে filter অনুযায়ী সব শিক্ষকের salary পেতে পারেন। Query না দিলে ঐ role-এ সব সংরক্ষিত salary record আসতে পারে। এই endpoint-এ pagination নেই; নির্দিষ্ট month/year filter ব্যবহার করুন।

```js
const salaryData = await erpGet(
    '/payroll/sheets?month=11&year=2026',
    token
);
console.log(salaryData.totalRecords, salaryData.salaries);
```

Response `data`:

```json
{
  "totalRecords": 1,
  "grandTotalNetPayable": 28600,
  "salaries": [
    {
      "_id": "665088888888888888888888",
      "teacherId": {
        "_id": "665012345678901234567890",
        "teacherCode": "2026000001",
        "biometricDeviceId": 15,
        "fullNameBng": "উদাহরণ শিক্ষক",
        "fullNameEng": "Example Teacher",
        "designation": "Assistant Teacher",
        "rankingMetrics": {
          "overallMadrasahRank": 3,
          "designationPriority": 3
        },
        "indexNumber": "123456",
        "phone": "01812345678",
        "bankDetails": {
          "bankName": "উদাহরণ ব্যাংক",
          "branchName": "উদাহরণ শাখা",
          "accountHolderName": "Example Teacher",
          "accountNumber": "0000000000",
          "routingNumber": "000000000"
        }
      },
      "month": 11,
      "year": 2026,
      "basicSalarySnapshot": 30000,
      "originalBasicSalarySnapshot": null,
      "proRataInfo": {
        "isProRated": false,
        "activeDaysInMonth": 30,
        "effectiveBasicSalary": 30000
      },
      "perDaySalary": 1000,
      "attendanceBreakdown": {
        "totalPresent": 20,
        "totalExcusedLateOrDuty": 1,
        "totalLateCount": 2,
        "totalLeaveCount": 0,
        "totalUnexcusedAbsentCount": 0,
        "totalApprovedLeaveCount": 0,
        "totalIgnoredDays": 0,
        "totalQuotaUsed": 1,
        "allowedPaidQuota": 2,
        "carryForwardQuota": 0,
        "remainingPaidQuota": 1,
        "excessQuotaDays": 0,
        "directAbsentPenaltyDays": 0,
        "totalDeductibleDays": 0
      },
      "leaveAndAbsentDeductionAmount": 0,
      "manualDeductibleDays": null,
      "preparedOn": "প্রশাসন",
      "loanDeduction": {
        "loanId": null,
        "installmentAmount": 0,
        "remainingAfterThisMonth": 0
      },
      "includeBonus": false,
      "bonusPercentage": 0,
      "bonusTitle": null,
      "bonusAmount": 0,
      "customAdjustment": {
        "mode": null,
        "value": 0,
        "amount": 0,
        "reason": null
      },
      "extraAllowance": 0,
      "extraDeduction": 0,
      "adjustmentNote": null,
      "netPayableSalary": 30000,
      "paymentStatus": "Paid",
      "generatedAt": "2026-11-27T03:00:00.000Z",
      "paymentMethod": "Bank_Transfer",
      "transactionReference": "EXAMPLE-REF-001",
      "paidAt": "2026-11-27T03:30:00.000Z",
      "generatedBy": "665022222222222222222222",
      "paidBy": "665022222222222222222222",
      "createdAt": "2026-11-27T03:00:00.000Z",
      "updatedAt": "2026-11-27T03:30:00.000Z"
    }
  ]
}
```

প্রতিটি `salaries[]` item-এর সম্পূর্ণ field:

| Field | অর্থ |
|---|---|
| `_id` | Salary record ID |
| `teacherId` | populated Teacher object; includes `_id`, `teacherCode`, `biometricDeviceId`, নাম, `designation`, `rankingMetrics.overallMadrasahRank`, `rankingMetrics.designationPriority`, `indexNumber`, `phone`, `bankDetails` |
| `month`, `year` | বেতন period |
| `basicSalarySnapshot` | sheet তৈরির সময়কার মূল বেতন |
| `originalBasicSalarySnapshot` | আগের মূল বেতনের snapshot অথবা `null` |
| `proRataInfo.isProRated` | মাসের অংশবিশেষের জন্য pro-rata প্রয়োগ হয়েছে কি না |
| `proRataInfo.activeDaysInMonth` | ঐ মাসে সক্রিয় চাকরির দিন |
| `proRataInfo.effectiveBasicSalary` | pro-rata অনুযায়ী কার্যকর মূল বেতন |
| `perDaySalary` | দৈনিক বেতনের হিসাব |
| `attendanceBreakdown` | নিচের attendance ও quota breakdown |
| `leaveAndAbsentDeductionAmount` | Leave/Absent-এর জন্য মোট টাকা কর্তন |
| `manualDeductibleDays` | হাতে নির্ধারিত কর্তনযোগ্য দিন অথবা `null` |
| `preparedOn` | sheet-এ সংরক্ষিত প্রস্তুতকারীর নাম/লেবেল |
| `loanDeduction.loanId` | সংশ্লিষ্ট loan ID অথবা `null` |
| `loanDeduction.installmentAmount` | এই মাসের loan কিস্তি |
| `loanDeduction.remainingAfterThisMonth` | কিস্তির পর বাকি loan |
| `includeBonus`, `bonusPercentage`, `bonusTitle`, `bonusAmount` | বোনাস প্রযোজ্য কি না, হার, নাম ও টাকা |
| `customAdjustment.mode`, `.value`, `.amount`, `.reason` | custom adjustment-এর ধরন, input value, টাকা ও কারণ |
| `extraAllowance`, `extraDeduction` | অতিরিক্ত ভাতা ও কর্তন |
| `adjustmentNote` | adjustment note অথবা `null` |
| `netPayableSalary` | সব সংযোজন/কর্তনের পর প্রদেয় বেতন |
| `paymentStatus` | `Pending` অথবা `Paid` |
| `generatedAt` | sheet তৈরির timestamp অথবা `null` |
| `paymentMethod` | `Bank_Transfer`, `Cash`, `bKash_Nagad` |
| `transactionReference` | লেনদেন reference অথবা `null` |
| `paidAt` | পেমেন্ট timestamp অথবা `null` |
| `generatedBy`, `paidBy` | সংশ্লিষ্ট Teacher MongoDB ID; `paidBy` `null` হতে পারে |
| `createdAt`, `updatedAt` | record তৈরির ও সর্বশেষ পরিবর্তনের timestamp |

`attendanceBreakdown`-এর field:

`totalPresent`, `totalExcusedLateOrDuty`, `totalLateCount`, `totalLeaveCount`, `totalUnexcusedAbsentCount`, `totalApprovedLeaveCount`, `totalIgnoredDays`, `totalQuotaUsed`, `allowedPaidQuota`, `carryForwardQuota`, `remainingPaidQuota`, `excessQuotaDays`, `directAbsentPenaltyDays`, `totalDeductibleDays`।

`teacherId.bankDetails`-এর field: `bankName`, `branchName`, `accountHolderName`, `accountNumber`, `routingNumber`। এই তথ্য অত্যন্ত সংবেদনশীল; কেবল প্রয়োজনীয় অনুমোদিত user-কে দেখান এবং log/cache করবেন না।

### 5.2 Salary revision history

`GET /payroll/revision-history?teacherId=<Mongo-ID>`

Teacher role-এ শুধু নিজের revision history আসে। Admin/SuperAdmin-এর ক্ষেত্রে `teacherId` না দিলে সব revision, দিলে নির্দিষ্ট শিক্ষকের revision আসে। Response `data` হলো history array; প্রতিটি item-এ থাকে:

`_id`, `teacherId` (populated: `_id`, `teacherCode`, `fullNameBng`, `designation`), `previousSalary`, `adjustmentMode`, `adjustmentValue`, `changedAmount`, `newSalary`, `effectiveDate`, `reason`, `changedBy` (populated: `_id`, `fullNameBng`), `createdAt`, `updatedAt`।

`adjustmentMode`: `INCREASE_AMOUNT`, `DECREASE_AMOUNT`, `INCREASE_PERCENT`, `DECREASE_PERCENT`, `INCREASE_DAYS`, `DECREASE_DAYS`।

### 5.3 সংরক্ষিত salary period (Admin/SuperAdmin)

`GET /payroll/sheets/periods` response: `data.periods[]`; প্রতিটি item-এ `year`, `month`, `salaryCount`, `generatedAt` থাকে। Teacher role-এ endpointটি `403` দেয়।

## 6. এক request-এ teacher portal dashboard

`GET /teachers/my-portal/dashboard?month=11&year=2026` login করা user-এর নিজের dashboard দেয়। সাধারণত attendance ও salary-এর জন্য উপরের দুইটি নির্দিষ্ট endpoint ব্যবহার করাই ভালো; dashboard-এ profile/financial data-সহ অতিরিক্ত তথ্যও ফেরত আসে।

`data`-এর field:

- `profile`: সম্পূর্ণ Teacher profile।
- `todayStatus`: আজকের Attendance record; পাঞ্চ না থাকলে `{ date, status: "Not Punched Yet", inTime: null }`।
- `selectedMonthAttendance`: `month`, `year`, `daysInSelectedMonth`, `presentDays`, `lateDays`, `leaveDays`, `absentDays`, `allowedQuota`, `quotaUsed`, `quotaRemaining`, `excessQuotaCutDays`, `directPenaltyDays`, `totalDaysForSalaryCut`, `currentMonthEstimatedCut`, `logs[]`।
- `lifetimeFinancialSummary`: `currentBasicSalary`, `paymentMethod`, `perDaySalary`, `totalMonthsGenerated`, `lifetimeTotalEarned`, `lifetimeTotalPaidReceived`, `lifetimeTotalUnpaidPending`, `lifetimeTotalBonusEarned`, `lifetimeTotalLeaveAbsentCut`, `activeLoans[]`।
- `salarySheets[]`: login করা শিক্ষকের সব salary record; §5.1-এর Salary field-গুলো থাকে, তবে এখানে `teacherId` populate করা হয় না—এটি MongoDB ID। `/payroll/sheets` endpoint-এ `teacherId` populated Teacher object।
- `salaryRevisionHistory[]`: নিজের Salary revision record; §5.2-এর field-গুলো থাকে, তবে dashboard-এ `teacherId` ও `changedBy` populate করা হয় না—এগুলো MongoDB ID। `/payroll/revision-history` endpoint-এ এই দুই field populated।
- `myApplications[]`: সর্বশেষ ১৫টি আবেদন; `_id`, `teacherId`, `applicationType`, `startDate`, `endDate`, `targetMonth`, `targetYear`, `totalDays`, `reason`, `attachmentUrl`, `submittedByRole`, `status`, `approvalAction`, `reviewedBy`, `reviewedAt`, `adminRemarks`, `createdAt`, `updatedAt`।

`activeLoans[]`-এর field: `_id`, `teacherId`, `type`, `totalAmount`, `monthlyInstallment`, `totalPaidAmount`, `remainingBalance`, `status`, `reason`, `disbursedDate`, `repaymentHistory[]`, `approvedBy`, `createdAt`, `updatedAt`। `repaymentHistory[]`: `month`, `year`, `amountDeducted`, `salaryId`, `deductedAt`।

`profile` হলো Teacher model-এর full profile। এতে identity/contact/parents/address/employment/education/ranking/profile-picture fields-এর পাশাপাশি `basicSalary`, `paymentMethod`, `bankDetails` (`bankName`, `branchName`, `accountHolderName`, `accountNumber`, `routingNumber`) এবং `customLeaveQuota` থাকতে পারে। সম্পূর্ণ non-financial field ও address/academic nested-field inventory-এর জন্য [Trusted App API documentation](./INTEGRATION_API_README.md)-এর Teacher field table দেখুন; JWT profile-এ তার পাশাপাশি এই আর্থিক field-গুলোও থাকে।

## 7. Teacher profile field inventory

Login response-এর `data.user`, `/auth/me`-এর `data`, `/teachers/:id`-এর `data` এবং dashboard-এর `data.profile` Teacher document থেকে আসে। Optional field কোনো record-এ না থাকলে অনুপস্থিত বা `null` হতে পারে।

| Group | Root/nested field |
|---|---|
| Record/account | `_id`, `teacherCode`, `uid`, `biometricDeviceId`, `indexNumber`, `role`, `registrationStatus`, `isActive`, `createdAt`, `updatedAt` |
| নাম ও পরিচয় | `fullNameBng`, `fullNameEng`, `fathersNameBng`, `fathersNameEng`, `mothersNameBng`, `mothersNameEng`, `dateOfBirth`, `gender`, `religion`, `bloodGroup`, `maritalStatus`, `nidNumber`, `birthRegNumber` |
| যোগাযোগ | `phone`, `email`, `emergencyContact.contactName`, `emergencyContact.relationship`, `emergencyContact.phone` |
| ঠিকানা | `presentAddress` ও `permanentAddress`-এর প্রতিটিতে `houseNameBn`, `houseNameEn`, `villageBn`, `villageEn`, `unionBn`, `unionEn`, `wardNo`, `upazilaBn`, `upazilaEn`, `districtBn`, `districtEn`, `divisionBn`, `divisionEn`, `houseOrRoad`, `village`, `postOffice`, `postCode`, `upazila`, `district` |
| চাকরি | `designation`, `designationBng`, `staffCategory`, `subject`, `assignedClass`, `canEditAssignedClass`, `employmentType`, `joiningDate`, `resignationDate`, `employmentHistory[]` |
| চাকরির সময়কাল | `employmentHistory[].startDate`, `employmentHistory[].endDate` |
| শিক্ষাগত যোগ্যতা | `academicQualifications[]`: `degreeLevel`, `examTitle`, `majorOrGroup`, `boardOrUniversity`, `rollNumber`, `registrationNumber`, `passingYear`, `courseDuration`, `resultType`, `resultGrade`, `gpaOrCgpa`, `scale` |
| Ranking | `rankingMetrics.designationPriority`, `rankingMetrics.highestDegreeWeight`, `rankingMetrics.highestDegreeNormalizedGpa`, `rankingMetrics.averageNormalizedGpa`, `rankingMetrics.compositeRankScore`, `rankingMetrics.overallMadrasahRank` |
| বেতন/ব্যাংক | `basicSalary`, `paymentMethod`, `bankDetails.bankName`, `bankDetails.branchName`, `bankDetails.accountHolderName`, `bankDetails.accountNumber`, `bankDetails.routingNumber`, `customLeaveQuota` |
| ছবি | `profilePicture.url`, `profilePicture.publicId` |

`employmentHistory[]` ও `academicQualifications[]`-এর item-এ আলাদা `_id` থাকে না। Teacher document-এ `__v` version field-ও নেই।

API response-এ credential/internal field থাকে না: `password`, `editToken`, `passwordChangedAt`, `passwordResetTokenHash`, `passwordResetExpires`, `failedLoginAttempts`, `lockUntil`।

## 8. Error handling

Error response-এর সাধারণ format:

```json
{
  "success": false,
  "statusCode": 401,
  "message": "আপনি লগইন করা নেই!",
  "timestamp": "2026-11-27T06:00:00.000Z"
}
```

| Status | অর্থ |
|---|---|
| `400` | request body/query ভুল বা validation error |
| `401` | login credential ভুল, JWT invalid/expired, অথবা password পরিবর্তনের পর পুরোনো token |
| `403` | account inactive, অথবা role-এর অনুমতি নেই |
| `404` | requested teacher/record পাওয়া যায়নি |
| `423` | পাঁচবার ভুল password-এর পর account ১৫ মিনিটের জন্য locked; response-এ `meta.retryAfterSeconds` থাকতে পারে |
| `429` | global API rate limit অতিক্রম; পরে retry করুন |
| `500` | server-side error |

Success response-এর envelope: `success`, `statusCode`, `message`, `data`, `timestamp`; error response-এ সাধারণত `success`, `statusCode`, `message`, `timestamp`, optional `errors`/`meta` থাকে। সময় ISO-8601 UTC format-এ।

## 9. নিরাপত্তা ও API scope

1. Teacher token শুধু সেই Teacher-এর data দেখতে পারে। Admin/SuperAdmin token অন্য শিক্ষকের attendance/payroll দেখতে পারে—এটি উচ্চ-অনুমতির credential।
2. Admin credential বা JWT কখনো public frontend, mobile bundle, Git, URL অথবা log-এ রাখবেন না। অন্য অ্যাপের backend-এ token নিরাপদে রাখুন।
3. Salary response-এ বেতন, payment status, transaction reference এবং populated `bankDetails` থাকতে পারে। শুধু প্রয়োজনীয় field UI-তে দেখান।
4. Login response/profile-এ NID, জন্মনিবন্ধন, address, family/contact এবং bank information থাকতে পারে। অপ্রয়োজনীয়ভাবে response store বা log করবেন না।
5. Global API limiter প্রতি IP-তে ১৫ মিনিটে সর্বোচ্চ ৩০০ request অনুমোদন করে।
6. `/api/v1/integrations/*`-এর আলাদা app token এই attendance/payroll endpoint-এ কাজ করে না। Integration token-এর teacher/student field, setup ও ব্যবহার [INTEGRATION_API_README.md](./INTEGRATION_API_README.md)-এ দেখুন।
7. এই guide read-only attendance/payroll request দেখায়। External app থেকে attendance edit, payroll generate/confirm, payment change বা password পরিবর্তনের endpoint ব্যবহার করবেন না যদি না সেই কাজের প্রয়োজন ও role authorization আলাদা করে অনুমোদিত হয়।

## 10. Implementation reference

- Login: `server/src/controllers/auth.controller.js`, `server/src/routes/auth.routes.js`
- JWT verification/role check: `server/src/middlewares/auth.middleware.js`
- Attendance access: `server/src/routes/attendance.routes.js`, `server/src/controllers/attendance.controller.js`
- Salary access: `server/src/routes/payroll.routes.js`, `server/src/controllers/payroll.controller.js`
- Data schema: `server/src/models/Teacher.js`, `server/src/models/Attendance.js`, `server/src/models/Salary.js`, `server/src/models/SalaryHistory.js`
