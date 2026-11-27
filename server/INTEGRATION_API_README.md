# ARDM Trusted App API

এই API দিয়ে অনুমোদিত Result ও Admit Card অ্যাপ ERP-র শিক্ষক/শিক্ষার্থীর তথ্য পড়তে পারবে। ERP-তে কোনো শিক্ষক বা শিক্ষার্থীকে login করাতে হয় না; তবে অ্যাপের **backend**-কে আলাদা API token দিয়ে request authenticate করতে হবে।

অন্য অ্যাপ থেকে user হিসেবে login করে Attendance/Salary পড়ার JWT পদ্ধতি এই token API থেকে আলাদা। সেই flow ও data field-এর জন্য [External App Login, Attendance and Payroll guide](./EXTERNAL_APP_AUTH_ATTENDANCE_PAYROLL.md) দেখুন।

> **গুরুত্বপূর্ণ:** API-তে শিক্ষার্থীর fee ও অন্যান্য আর্থিক তথ্য (`feeDetails`, `annualIncome`) অন্তর্ভুক্ত। এই তথ্য শিক্ষার্থী অপ্রাপ্তবয়স্ক হলেও ব্যক্তিগত; তাই API token কখনো browser, mobile app bundle, public JavaScript, Git বা chat-এ রাখবেন না। শুধু trusted app-এর server-side environment-এ রাখুন এবং HTTPS ব্যবহার করুন।

## 1. API base URL

Development:

```text
http://localhost:5000/api/v1
```

Production-এ ERP backend-এর HTTPS domain ব্যবহার করুন, যেমন:

```text
https://erp.example.com/api/v1
```

`erp.example.com` উদাহরণ; আপনার নিজের domain বসাবেন।

## 2. অ্যাপের token তৈরি ও configure করা

প্রতিটি অ্যাপের জন্য আলাদা, cryptographically secure key তৈরি করুন। `server` directory-তে এই command **দুইবার** চালালে দুইটি আলাদা 64-character hexadecimal key তৈরি হবে:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

ERP backend-এর `server/.env`-এ key দুটো রাখুন:

```env
RESULTS_APP_API_KEY=<Result app-এর জন্য তৈরি key>
ADMIT_CARD_APP_API_KEY=<Admit Card app-এর জন্য তৈরি key>
```

তারপর ERP backend restart করুন। `.env.example` কেবল configuration-এর নমুনা; বাস্তব key সেখানে বা source control-এ রাখবেন না।

অন্য অ্যাপের **backend**-এ ERP-তে ব্যবহৃত সংশ্লিষ্ট একই key রাখুন। সেখানে variable-এর নাম আলাদা হতে পারে:

```env
ARDM_ERP_BASE_URL=https://erp.example.com/api/v1
ARDM_ERP_API_TOKEN=<এই অ্যাপের নির্ধারিত key>
```

প্রতিটি key কমপক্ষে 32 অক্ষরের হতে হবে এবং দুই অ্যাপের key এক হতে পারবে না। Key হারালে বা প্রকাশ পেলে সেটি rotate করে ERP ও সংশ্লিষ্ট app server—দুই জায়গাতেই নতুন key দিন।

## 3. Authentication

প্রতিটি request-এ HTTP `Authorization` header-এ Bearer token পাঠাতে হবে:

```http
Authorization: Bearer <API_TOKEN>
Accept: application/json
```

এটি **app-to-app authentication**—ERP user login/JWT নয়। Token যার কাছে থাকবে, সে সংশ্লিষ্ট integration API দিয়ে তথ্য পড়তে পারবে। তাই token কেবল server-to-server request-এ ব্যবহার করুন; user-এর browser থেকে সরাসরি call করবেন না।

বর্তমানে Results ও Admit Card—দুই token-ই শিক্ষক ও শিক্ষার্থী read endpoint ব্যবহার করতে পারে।

## 4. Endpoint তালিকা

| Method | Path | ফলাফল |
|---|---|---|
| `GET` | `/integrations/teachers?page=1&limit=100` | শিক্ষক তালিকার একটি page |
| `GET` | `/integrations/teachers/{id}` | এক শিক্ষক; `{id}` Mongo `_id` অথবা `teacherCode` |
| `GET` | `/integrations/students?all=true` | এক request-এ সব non-deleted শিক্ষার্থী |
| `GET` | `/integrations/students?page=1&limit=100` | মুছে না-ফেলা শিক্ষার্থীদের তালিকার একটি page |
| `GET` | `/integrations/students/{id}` | এক শিক্ষার্থী; `{id}` Mongo `_id` অথবা `studentCode` |

সম্পূর্ণ URL-এ `/api/v1` prefix যোগ হবে। উদাহরণ:

```text
https://erp.example.com/api/v1/integrations/students?page=1&limit=100
```

এগুলো সব `GET` endpoint। Request body লাগে না। বর্তমানে তালিকার জন্য `page`, `limit` এবং students endpoint-এর `all` ছাড়া search/filter query parameter নেই।

### এক request-এ সব শিক্ষার্থী

Admit Card বা Result app থেকে একবারে সব non-deleted শিক্ষার্থী পেতে:

```text
GET /api/v1/integrations/students?all=true
```

`all=true` ব্যবহার করলে `page` বা `limit` দেবেন না। Response-এ `data.students` array-তে সব non-deleted record থাকবে এবং `data.totalCount` array-এর দৈর্ঘ্যের সমান হবে। `status: "Deleted"` record এই endpoint-এ আসে না। `all` না দিলে আগের pagination চালু থাকবে; `all=false`-ও pagination-এর সমান।

একসঙ্গে সব record আনার response বড় হতে পারে। একবারে সব record সত্যিই দরকার হলে `all=true` ব্যবহার করুন; নিয়মিত ছোট update বা বড় database-এর জন্য pagination সুবিধাজনক।

### Pagination

- `page`: 1 থেকে শুরু; default `1`
- `limit`: প্রতি request-এ রেকর্ড সংখ্যা; default `100`, সর্বোচ্চ `500`
- পৃষ্ঠা শেষ হলে `data.page` ও `data.totalPages` দেখে পরের page নিন।
- Teacher list sort হয় record তৈরির সময় ও `_id` অনুযায়ী।
- Student list sort হয় নতুন session আগে, তারপর class, roll ও `_id` অনুযায়ী।
- Teacher list-এ active/inactive/pending—সব teacher record আসে। Student list-এ `Deleted` status বাদ; বাকি status-এর record আসে।

## 5. cURL request উদাহরণ

PowerShell-এ token environment variable-এ রেখে student list আনুন:

```powershell
$env:ARDM_ERP_API_TOKEN = "<আপনার Admit Card app token>"
curl.exe "https://erp.example.com/api/v1/integrations/students?all=true" `
  -H "Authorization: Bearer $env:ARDM_ERP_API_TOKEN" `
  -H "Accept: application/json"
```

Pagination চাইলে:

```powershell
curl.exe -G "https://erp.example.com/api/v1/integrations/students" `
  -H "Authorization: Bearer $env:ARDM_ERP_API_TOKEN" `
  -H "Accept: application/json" `
  --data-urlencode "page=1" `
  --data-urlencode "limit=100"
```

একজন শিক্ষার্থী `studentCode` দিয়ে:

```powershell
curl.exe "https://erp.example.com/api/v1/integrations/students/2026000001" `
  -H "Authorization: Bearer $env:ARDM_ERP_API_TOKEN" `
  -H "Accept: application/json"
```

একজন শিক্ষক `teacherCode` দিয়ে:

```powershell
curl.exe "https://erp.example.com/api/v1/integrations/teachers/2026000001" `
  -H "Authorization: Bearer $env:ARDM_ERP_API_TOKEN" `
  -H "Accept: application/json"
```

Code-গুলোর উপরের মানগুলো কেবল উদাহরণ; বাস্তব ID ব্যবহার করুন।

## 6. Server-side JavaScript request উদাহরণ

```js
const baseUrl = process.env.ARDM_ERP_BASE_URL;
const token = process.env.ARDM_ERP_API_TOKEN;

async function requestErp(path) {
    const response = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json'
        }
    });

    const body = await response.json();
    if (!response.ok) {
        throw new Error(`ARDM API ${response.status}: ${body.message}`);
    }

    return body.data;
}

async function getAllStudents() {
    return requestErp('/integrations/students?all=true');
}

async function getStudents(page = 1, limit = 100) {
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit)
    });
    return requestErp(`/integrations/students?${query}`);
}

const all = await getAllStudents();
console.log(all.totalCount, all.students);

const firstPage = await getStudents(1, 100);
console.log(firstPage.totalCount, firstPage.students);
```

এই code trusted application-এর backend-এ চালান; frontend-এ নয়।

## 7. সফল response-এর format

সব response JSON। সফল response-এর সাধারণ envelope:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "তথ্য পাওয়া গেছে",
  "data": {},
  "timestamp": "2026-11-27T05:30:00.000Z"
}
```

সময় ISO-8601 UTC format-এ। MongoDB `_id` এবং reference ID JSON-এ string হিসেবে আসে।

### Teacher list response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "teachers তালিকা পাওয়া গেছে",
  "data": {
    "page": 1,
    "limit": 100,
    "totalCount": 1,
    "totalPages": 1,
    "teachers": [
      {
        "_id": "665012345678901234567890",
        "teacherCode": "2026000001",
        "fullNameBng": "উদাহরণ শিক্ষক",
        "fullNameEng": "Example Teacher",
        "designation": "Assistant Teacher",
        "phone": "01XXXXXXXXX",
        "email": "teacher@example.com",
        "isActive": true
      }
    ]
  },
  "timestamp": "2026-11-27T05:30:00.000Z"
}
```

এটি শুধু format বোঝানোর নমুনা; প্রকৃত response-এ teacher schema-তে থাকা আরও non-financial profile fields আসতে পারে।

### Teacher object-এর সম্পূর্ণ field তালিকা

বর্তমান `Teacher` model অনুযায়ী teacher integration response-এ আসতে পারে এমন সব field:

| JSON field | Type / অর্থ |
|---|---|
| `_id` | MongoDB document ID, string |
| `teacherCode` | ১০-ডিজিটের teacher ID, string |
| `uid` | Optional registry UID, string |
| `biometricDeviceId` | Biometric device ID, number |
| `indexNumber` | Optional index number, string |
| `fullNameBng`, `fullNameEng` | বাংলা ও ইংরেজি নাম, string |
| `fathersNameBng`, `fathersNameEng` | পিতার বাংলা ও ইংরেজি নাম, string |
| `mothersNameBng`, `mothersNameEng` | মাতার বাংলা ও ইংরেজি নাম, string |
| `dateOfBirth` | জন্মতারিখ, ISO date string |
| `gender` | `Male`, `Female`, `Other`, অথবা অনুপস্থিত |
| `religion` | `Islam`, `Hinduism`, `Buddhism`, `Christianity`, `Other`, অথবা অনুপস্থিত |
| `bloodGroup` | Blood group enum, অথবা অনুপস্থিত |
| `maritalStatus` | `Single`, `Married`, `Widowed`, `Divorced`, অথবা অনুপস্থিত |
| `nidNumber`, `birthRegNumber` | জাতীয় পরিচয়/জন্মনিবন্ধন নম্বর, optional string |
| `phone` | Teacher-এর ফোন নম্বর, string |
| `email` | Optional email, string |
| `emergencyContact` | জরুরি যোগাযোগের nested object |
| `emergencyContact.contactName` | যোগাযোগের ব্যক্তির নাম, string |
| `emergencyContact.relationship` | সম্পর্ক, string |
| `emergencyContact.phone` | জরুরি ফোন নম্বর, string |
| `presentAddress` | বর্তমান ঠিকানা object |
| `permanentAddress` | স্থায়ী ঠিকানা object |
| `presentAddress.houseNameBn`, `permanentAddress.houseNameBn` | বাড়ির নাম (বাংলা), string |
| `presentAddress.houseNameEn`, `permanentAddress.houseNameEn` | বাড়ির নাম (ইংরেজি), string |
| `presentAddress.villageBn`, `permanentAddress.villageBn` | গ্রামের নাম (বাংলা), string |
| `presentAddress.villageEn`, `permanentAddress.villageEn` | গ্রামের নাম (ইংরেজি), string |
| `presentAddress.unionBn`, `permanentAddress.unionBn` | ইউনিয়নের নাম (বাংলা), string |
| `presentAddress.unionEn`, `permanentAddress.unionEn` | ইউনিয়নের নাম (ইংরেজি), string |
| `presentAddress.wardNo`, `permanentAddress.wardNo` | ওয়ার্ড নম্বর, string |
| `presentAddress.upazilaBn`, `permanentAddress.upazilaBn` | উপজেলা (বাংলা), string |
| `presentAddress.upazilaEn`, `permanentAddress.upazilaEn` | উপজেলা (ইংরেজি), string |
| `presentAddress.districtBn`, `permanentAddress.districtBn` | জেলা (বাংলা), string |
| `presentAddress.districtEn`, `permanentAddress.districtEn` | জেলা (ইংরেজি), string |
| `presentAddress.divisionBn`, `permanentAddress.divisionBn` | বিভাগ (বাংলা), string |
| `presentAddress.divisionEn`, `permanentAddress.divisionEn` | বিভাগ (ইংরেজি), string |
| `presentAddress.houseOrRoad`, `permanentAddress.houseOrRoad` | বাড়ি/রাস্তা, string |
| `presentAddress.village`, `permanentAddress.village` | গ্রামের নাম, string |
| `presentAddress.postOffice`, `permanentAddress.postOffice` | ডাকঘর, string |
| `presentAddress.postCode`, `permanentAddress.postCode` | পোস্টকোড, string |
| `presentAddress.upazila`, `permanentAddress.upazila` | উপজেলা, string |
| `presentAddress.district`, `permanentAddress.district` | জেলা, string |
| `designation` | ইংরেজি পদবি, designation enum |
| `designationBng` | বাংলা পদবি, string |
| `staffCategory` | `Teaching` অথবা `Non-Teaching` |
| `subject` | বিষয়, string |
| `assignedClass` | নির্ধারিত শ্রেণি, string |
| `canEditAssignedClass` | Assigned class edit permission, boolean |
| `employmentType` | `MPO`, `Non-MPO`, `Part-Time`, অথবা `Contractual` |
| `joiningDate` | যোগদানের তারিখ, ISO date string |
| `resignationDate` | পদত্যাগের তারিখ অথবা `null` |
| `employmentHistory` | চাকরির সময়কালের array |
| `employmentHistory[].startDate` | চাকরির সময়কালের শুরু, ISO date string |
| `employmentHistory[].endDate` | চাকরির সময়কালের শেষ, ISO date string অথবা `null` |
| `academicQualifications` | শিক্ষাগত যোগ্যতার array |
| `academicQualifications[].degreeLevel` | Degree level enum |
| `academicQualifications[].examTitle` | পরীক্ষার নাম, string |
| `academicQualifications[].majorOrGroup` | বিষয়/group, string |
| `academicQualifications[].boardOrUniversity` | Board/university, string |
| `academicQualifications[].rollNumber` | পরীক্ষার roll, string |
| `academicQualifications[].registrationNumber` | পরীক্ষার registration number, string |
| `academicQualifications[].passingYear` | পাশের বছর, number |
| `academicQualifications[].courseDuration` | কোর্সের মেয়াদ, string |
| `academicQualifications[].resultType` | `GPA`, `CGPA`, `Division`, `Class`, `Passed` |
| `academicQualifications[].resultGrade` | `First`, `Second`, `Third`, অথবা অনুপস্থিত |
| `academicQualifications[].gpaOrCgpa` | GPA/CGPA, number অথবা অনুপস্থিত |
| `academicQualifications[].scale` | GPA scale `4` অথবা `5` |
| `rankingMetrics` | Ranking-এর nested object |
| `rankingMetrics.designationPriority` | পদভিত্তিক অগ্রাধিকার, number |
| `rankingMetrics.highestDegreeWeight` | সর্বোচ্চ degree-এর weight, number |
| `rankingMetrics.highestDegreeNormalizedGpa` | সর্বোচ্চ degree-এর normalized GPA, number |
| `rankingMetrics.averageNormalizedGpa` | গড় normalized GPA, number |
| `rankingMetrics.compositeRankScore` | Composite rank score, number |
| `rankingMetrics.overallMadrasahRank` | সামগ্রিক rank, number অথবা `null` |
| `profilePicture.url` | ছবির URL, string |
| `profilePicture.publicId` | Image provider-এর public ID, string |
| `role` | System role, string |
| `registrationStatus` | `Approved`, `Pending`, `Rejected` |
| `isActive` | Active status, boolean |
| `createdAt`, `updatedAt` | তৈরি ও সর্বশেষ update timestamp, ISO date-time string |

Teacher address এবং `employmentHistory`/`academicQualifications` subdocument-এ আলাদা `_id` থাকে না। Teacher schema-র version key-ও বন্ধ, তাই `__v` আসে না।

### Student list response — fee ও আর্থিক তথ্যসহ

```json
{
  "success": true,
  "statusCode": 200,
  "message": "সব শিক্ষার্থীর তথ্য পাওয়া গেছে",
  "data": {
    "all": true,
    "totalCount": 1,
    "students": [
      {
        "_id": "665098765432109876543210",
        "studentCode": "2026000002",
        "fullNameBng": "উদাহরণ শিক্ষার্থী",
        "fullNameEng": "Example Student",
        "session": "2026",
        "classBn": "৬ষ্ঠ",
        "roll": 12,
        "status": "Active",
        "phone": "01XXXXXXXXX",
        "feeDetails": {
          "monthlyFee": 500,
          "feeCategory": "Regular",
          "siblingStudentCode": ""
        },
        "annualIncome": 180000
      }
    ]
  },
  "timestamp": "2026-11-27T05:30:00.000Z"
}
```

`all=true` response-এ সব student object এই array-তে থাকবে। উদাহরণে একটি object দেখানো হয়েছে; বাস্তব response-এ `totalCount` সংখ্যক object থাকবে। `feeDetails.monthlyFee`, `feeDetails.feeCategory`, `feeDetails.siblingStudentCode` এবং `annualIncome` প্রতিটি record-এ থাকবে। Record-এ কোনো মান না থাকলে schema default বা `null`/খালি মান আসতে পারে।

### Student object-এর সম্পূর্ণ field তালিকা

নিচে বর্তমান `Student` model অনুযায়ী integration response-এ আসতে পারে এমন **প্রতিটি root ও nested field** দেওয়া হয়েছে। Optional field কোনো record-এ সেট না থাকলে JSON-এ অনুপস্থিত হতে পারে। Date field ISO-8601 string হিসেবে আসে। Nested address এবং `academicHistory` subdocument-এ আলাদা `_id` থাকে না।

| JSON field | Type / অর্থ |
|---|---|
| `_id` | MongoDB document ID, string |
| `studentCode` | ১০-ডিজিটের student ID, string |
| `uid` | Optional unique registry UID, string |
| `biometricDeviceId` | Optional biometric device ID, number |
| `fullNameBng` | শিক্ষার্থীর বাংলা নাম, string |
| `fullNameEng` | শিক্ষার্থীর ইংরেজি নাম, string |
| `dateOfBirth` | জন্মতারিখ, ISO date string |
| `gender` | `Male` অথবা `Female` |
| `religion` | `Islam`, `Hinduism`, `Buddhism`, `Christianity`, `Other`; default `Islam` |
| `bloodGroup` | `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`, `N/A`; default `N/A` |
| `brnNumber` | ১৭-ডিজিটের জন্মনিবন্ধন নম্বর, string |
| `medicalNote` | Medical note, string; default empty string |
| `admissionDate` | ভর্তির তারিখ, ISO date string |
| `session` | শিক্ষাবর্ষ, ৪-ডিজিটের string |
| `classBn` | বাংলা শ্রেণি: `প্লে`, `নার্সারি`, `কেজি`, `১ম`, `২য়`, `৩য়`, `৪র্থ`, `৫ম`, `৬ষ্ঠ`, `৭ম`, `৮ম`, `৯ম`, `১০ম` |
| `classEn` | ইংরেজি শ্রেণি: `Play`, `Nursery`, `KG`, `One`, `Two`, `Three`, `Four`, `Five`, `Six`, `Seven`, `Eight`, `Nine`, `Ten` |
| `classOrder` | শ্রেণির sorting order, number; default `99` |
| `roll` | শ্রেণির রোল, number |
| `group` | `General`, `Science`, `Muzabbid`, অথবা empty string |
| `fourthSubject` | ৪র্থ বিষয়, string; ৯ম/১০ম ছাড়া অন্য শ্রেণিতে empty হতে পারে |
| `boardRegNo` | Optional board registration number, string |
| `fathersNameBng` | পিতার বাংলা নাম, string |
| `fathersNameEng` | পিতার ইংরেজি নাম, string |
| `fatherNid` | পিতার NID, string; default empty string |
| `fatherOccupation` | পিতার পেশা, string; default empty string |
| `mothersNameBng` | মাতার বাংলা নাম, string |
| `mothersNameEng` | মাতার ইংরেজি নাম, string |
| `motherNid` | মাতার NID, string; default empty string |
| `motherOccupation` | মাতার পেশা, string; default empty string |
| `localGuardian` | স্থানীয় অভিভাবকের nested object; নিচের চারটি field থাকে |
| `localGuardian.name` | অভিভাবকের নাম, string; default empty string |
| `localGuardian.relation` | শিক্ষার্থীর সঙ্গে সম্পর্ক, string; default empty string |
| `localGuardian.nid` | অভিভাবকের NID, string; default empty string |
| `localGuardian.phone` | অভিভাবকের ফোন, string; default empty string |
| `annualIncome` | পরিবারের বার্ষিক আয়, non-negative number; default `0` |
| `phone` | অভিভাবকের ফোন নম্বর, string |
| `emergencyContact` | জরুরি যোগাযোগের nested object |
| `emergencyContact.contactName` | জরুরি যোগাযোগের ব্যক্তির নাম, string; default empty string |
| `emergencyContact.relationship` | সম্পর্ক, string; default `Guardian` |
| `emergencyContact.phone` | জরুরি ফোন নম্বর, string |
| `presentAddress` | বর্তমান ঠিকানার nested object; এর সব field নিচে তালিকাভুক্ত |
| `permanentAddress` | স্থায়ী ঠিকানার nested object; একই address field-গুলো থাকে |
| `presentAddress.houseNameBn`, `permanentAddress.houseNameBn` | বাড়ির নাম (বাংলা), string |
| `presentAddress.houseNameEn`, `permanentAddress.houseNameEn` | বাড়ির নাম (ইংরেজি), string |
| `presentAddress.villageBn`, `permanentAddress.villageBn` | গ্রামের নাম (বাংলা), string |
| `presentAddress.villageEn`, `permanentAddress.villageEn` | গ্রামের নাম (ইংরেজি), string |
| `presentAddress.unionBn`, `permanentAddress.unionBn` | ইউনিয়নের নাম (বাংলা), string |
| `presentAddress.unionEn`, `permanentAddress.unionEn` | ইউনিয়নের নাম (ইংরেজি), string |
| `presentAddress.wardNo`, `permanentAddress.wardNo` | ওয়ার্ড নম্বর, string |
| `presentAddress.postOffice`, `permanentAddress.postOffice` | ডাকঘর, string |
| `presentAddress.postCode`, `permanentAddress.postCode` | পোস্টকোড, string |
| `presentAddress.upazilaBn`, `permanentAddress.upazilaBn` | উপজেলা (বাংলা), string |
| `presentAddress.upazilaEn`, `permanentAddress.upazilaEn` | উপজেলা (ইংরেজি), string |
| `presentAddress.districtBn`, `permanentAddress.districtBn` | জেলা (বাংলা), string |
| `presentAddress.districtEn`, `permanentAddress.districtEn` | জেলা (ইংরেজি), string |
| `presentAddress.divisionBn`, `permanentAddress.divisionBn` | বিভাগ (বাংলা), string |
| `presentAddress.divisionEn`, `permanentAddress.divisionEn` | বিভাগ (ইংরেজি), string |
| `feeDetails` | Fee/financial nested object; নিচের তিনটি field থাকে |
| `feeDetails.monthlyFee` | মাসিক ফি, non-negative number; default `0` |
| `feeDetails.feeCategory` | `Regular`, `Sibling Waiver`, `Half Free`, `Full Free`, `Orphan`; default `Regular` |
| `feeDetails.siblingStudentCode` | Sibling waiver-এর sibling student code, string; default empty string |
| `profilePicture` | Profile image-এর nested object |
| `profilePicture.url` | ছবির URL, string |
| `profilePicture.publicId` | Image provider-এর public ID, string; default empty string |
| `role` | Student role, string; default `Student` |
| `status` | `Active`, `Inactive`, `Transferred`, `Deleted`; list endpoint-এ `Deleted` record বাদ |
| `statusReason` | Status পরিবর্তনের কারণ, string; default empty string |
| `isActive` | Active status boolean |
| `migratedFromSheet` | পুরনো sheet থেকে migrate হয়েছে কি না, boolean |
| `academicHistory` | আগের/বর্তমান session ও class-এর array; প্রতিটি item-এর field নিচে |
| `academicHistory[].session` | শিক্ষাবর্ষ, string |
| `academicHistory[].classBn` | বাংলা শ্রেণি, string |
| `academicHistory[].classEn` | ইংরেজি শ্রেণি, string |
| `academicHistory[].roll` | ঐ session-এর roll, number |
| `academicHistory[].group` | ঐ session-এর group, string; default empty string |
| `academicHistory[].resultStatus` | `Studying`, `Promoted`, `Failed`, `Transferred`; default `Studying` |
| `academicHistory[].recordedAt` | রেকর্ডের সময়, ISO date-time string |
| `createdBy` | রেকর্ড তৈরি করা Teacher-এর Mongo ID অথবা `null` |
| `updatedBy` | সর্বশেষ update করা Teacher-এর Mongo ID অথবা `null` |
| `createdAt` | তৈরি হওয়ার timestamp, ISO date-time string |
| `updatedAt` | সর্বশেষ update timestamp, ISO date-time string |

এই API-তে ইচ্ছাকৃতভাবে শুধু `password` ও `editToken` বাদ দেওয়া হয়; Student model-এর অন্য field, বিশেষত fee/financial data-ও response-এ থাকে। Schema ভবিষ্যতে বদলালে এই inventory-ও আপডেট করতে হবে।

### Single-record response

একজন শিক্ষক:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "শিক্ষকের তথ্য পাওয়া গেছে",
  "data": {
    "teacher": {
      "_id": "665012345678901234567890",
      "teacherCode": "2026000001",
      "fullNameBng": "উদাহরণ শিক্ষক"
    }
  },
  "timestamp": "2026-11-27T05:30:00.000Z"
}
```

একজন শিক্ষার্থীর জন্য একই format-এ `data.student` থাকবে; এতে `feeDetails` ও `annualIncome`-ও অন্তর্ভুক্ত।

## 8. কোন তথ্য আসে / বাদ থাকে

### শিক্ষক

Teacher schema-র সাধারণ profile, পরিচিতি, যোগাযোগ, ঠিকানা, পদ/কর্মসংস্থান, academic qualification, ranking, profile picture ও account status-এর মতো non-financial তথ্য আসে।

নিচের field-গুলো integration API-তে আসে না:

- `password`, `editToken`, `passwordChangedAt`, `passwordResetTokenHash`, `passwordResetExpires`, `failedLoginAttempts`, `lockUntil`
- `bankDetails`
- `basicSalary`, `paymentMethod`, `customLeaveQuota`

Salary/payroll collection এই endpoints দিয়ে ফেরত দেওয়া হয় না।

### শিক্ষার্থী

`Deleted` status ছাড়া student record-এর profile, পরিচয়, অভিভাবক/যোগাযোগ, ঠিকানা, academic history এবং fee/financial তথ্য আসে; এর মধ্যে `feeDetails` ও `annualIncome` রয়েছে।

নিচের credential field-গুলো আসে না:

- `password`
- `editToken`

## 9. Error response ও status code

Error response-ও JSON:

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Trusted app API token প্রয়োজন।",
  "timestamp": "2026-11-27T05:30:00.000Z"
}
```

| Status | অর্থ | করণীয় |
|---|---|---|
| `400` | `page`/`limit` invalid, `all` true/false নয়, অথবা `all=true`-এর সঙ্গে `page`/`limit` পাঠানো | `page >= 1`, `1 <= limit <= 500` দিন; all-record request-এ শুধু `all=true` দিন |
| `401` | token নেই বা ভুল | সঠিক app token ও `Bearer` header যাচাই করুন |
| `403` | app-এর permission নেই | app scope/configuration যাচাই করুন |
| `404` | single record পাওয়া যায়নি | Mongo `_id`, `teacherCode` বা `studentCode` যাচাই করুন |
| `429` | API rate limit অতিক্রম | কিছুক্ষণ পরে retry করুন |
| `503` | server-এ token configure হয়নি, key ছোট, বা দুই app-এ একই key | `server/.env`-এ আলাদা 32+ character key দিয়ে backend restart করুন |

## 10. নিরাপত্তা ও ব্যবহারবিধি

1. Production-এ শুধু HTTPS ব্যবহার করুন।
2. Token শুধু app backend-এর secret/environment manager-এ রাখুন—frontend bundle, mobile app, Git, logs বা URL/query string-এ নয়।
3. Result app-এ `RESULTS_APP_API_KEY`-এর মান এবং Admit Card app-এ `ADMIT_CARD_APP_API_KEY`-এর মান ব্যবহার করুন।
4. `password`, `editToken`, password-reset token/expiry কখনো client-এ পাঠাবেন না; API এগুলো ফেরত দেয় না।
5. Student fee ও family financial data সংবেদনশীল। App-এ কেবল প্রয়োজনীয় কর্মীদের access দিন এবং অপ্রয়োজনীয়ভাবে response log/cache করবেন না।
6. API key rotate করলে ERP ও সংশ্লিষ্ট app backend—দুই জায়গায় একসঙ্গে update করুন।
7. এই document-এর integration endpoints token-protected। ERP-তে থাকা আলাদা public verification/registry-card routes-এর access policy এখানে পরিবর্তিত হয় না।

## 11. Implementation reference

- Router: `server/src/routes/integration.routes.js`
- Controller/projection: `server/src/controllers/integration.controller.js`
- Token validation: `server/src/middlewares/integrationAuth.middleware.js`
- Environment template: `server/.env.example`
