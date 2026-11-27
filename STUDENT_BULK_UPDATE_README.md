# শিক্ষার্থী বাল্ক আপডেট — ক্লাস, রোল ও সেশন

শিক্ষার্থীদের ক্লাস, রোল এবং সেশন একসঙ্গে বদলের জন্য ERP-এর `/api/v1/students/promote` endpoint ব্যবহার করুন।

এই কাজটি শুধু `SuperAdmin` বা `Admin` করতে পারে।

## ১. আগে ব্যাকআপ নিন

MongoDB চালু থাকা অবস্থায় repository-এর `server` folder থেকে ব্যাকআপ নিন:

```powershell
cd D:\ardm_teacher\server
mongodump --uri="mongodb://127.0.0.1:27017/ardm_enterprise_db" --collection=students --out="D:\ardm_teacher\backup"
```

বাল্ক আপডেট শেষ হলে অন্তত একটি সারাংশ পরীক্ষা করুন:

```powershell
mongosh "mongodb://127.0.0.1:27017/ardm_enterprise_db" --eval "db.students.aggregate([{\u0024group:{_id:{session:'\u0024session',classBn:'\u0024classBn'},count:{\u0024sum:1}}},{\u0024sort:{'_id.session':1,'_id.classBn':1}}])"
```

## ২. আপডেট তালিকা তৈরি করুন

CSV ফাইলের একটি নমুনা:

```csv
studentId,nextClassBn,nextRoll,resultStatus,nextGroup
64f123456789abcdef123456,২য়,1,Promoted,
64f123456789abcdef123457,২য়,2,Promoted,
64f123456789abcdef123458,২য়,3,Promoted,
```

`studentId` অবশ্যই MongoDB Student `_id` হবে। ব্রাউজারের Student ID বা ১০-সংখ্যার `studentCode` নয়।

সঠিক ক্লাসের canonical লেখা ব্যবহার করুন:

```text
প্লে, নার্সারি, কেজি, ১ম, ২য়, ৩য়, ৪র্থ, ৫ম,
৬ষ্ঠ, ৭ম, ৮ম, ৯ম, ১০ম
```

`resultStatus` সাধারণত `Promoted`, `Repeated` বা `Studying` হতে পারে।

`৯ম` বা `১০ম` শ্রেণিতে `nextGroup` দিন:

```text
General, Science, Muzabbid
```

অন্যান্য শ্রেণির জন্য `nextGroup` খালি রাখুন।

## ৩. API দিয়ে বাল্ক আপডেট

সার্ভার চালু থাকলে:

```text
POST http://127.0.0.1:5000/api/v1/students/promote
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
Content-Type: application/json
```

PowerShell থেকে JSON পাঠানোর উদাহরণ:

```powershell
$body = @{
    targetSession = "2027"
    promotions = @(
        @{
            studentId = "64f123456789abcdef123456"
            nextClassBn = "২য়"
            nextRoll = 1
            resultStatus = "Promoted"
            nextGroup = ""
        },
        @{
            studentId = "64f123456789abcdef123457"
            nextClassBn = "২য়"
            nextRoll = 2
            resultStatus = "Promoted"
            nextGroup = ""
        }
    )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
    -Uri "http://127.0.0.1:5000/api/v1/students/promote" `
    -Method Post `
    -Headers @{ Authorization = "Bearer <ADMIN_ACCESS_TOKEN>" } `
    -ContentType "application/json" `
    -Body $body
```

একটি Student না থাকলে বা `Active` না হলে সে তালিকার আইটেমটি স্কিপ হবে।

## ৪. API কীভাবে কাজ করে

প্রত্যেক Student-এর জন্য endpoint:

1. Student `_id` দিয়ে রেকর্ড খুঁজে নেয়।
2. Student `Active` হলে পূর্বের academic history আপডেট করে।
3. নতুন `targetSession`, `nextClassBn`, `nextRoll` সংরক্ষণ করে।
4. নতুন academic history-তে `Studying` status যোগ করে।
5. সফলভাবে আপডেট করা Student-এর সংখ্যা ফিরিয়ে দেয়।

## ৫. CSV থেকে JSON তৈরি

CSV থেকে body তৈরি করার উদাহরণ:

```powershell
$csv = Import-Csv ".\student-promotion.csv"

$promotions = foreach ($row in $csv) {
    @{
        studentId = $row.studentId
        nextClassBn = $row.nextClassBn
        nextRoll = [int]$row.nextRoll
        resultStatus = $row.resultStatus
        nextGroup = $row.nextGroup
    }
}

$body = @{
    targetSession = "2027"
    promotions = $promotions
} | ConvertTo-Json -Depth 5

$body | Out-File ".\promotion-payload.json" -Encoding utf8
```

তৈরি হওয়া JSON আগে চেক করুন:

```powershell
Get-Content ".\promotion-payload.json"
```

তারপর পাঠান:

```powershell
$json = Get-Content ".\promotion-payload.json" -Raw

Invoke-RestMethod `
    -Uri "http://127.0.0.1:5000/api/v1/students/promote" `
    -Method Post `
    -Headers @{ Authorization = "Bearer <ADMIN_ACCESS_TOKEN>" } `
    -ContentType "application/json" `
    -Body $json
```

## ৬. MongoDB সরাসরি বাল্ক আপডেট

API endpoint ব্যর্থ হলে বা migration হিসেবে সরাসরি MongoDB ব্যবহার করতে হলে আগে ব্যাকআপ নিন।

প্রতিটি Student-এর পৃথক roll দিতে `bulkWrite` ব্যবহার করুন:

```javascript
db.students.bulkWrite([
    {
        updateOne: {
            filter: {
                _id: ObjectId("64f123456789abcdef123456"),
                status: { $in: ["Active", "Inactive"] }
            },
            update: {
                $set: {
                    session: "2027",
                    classBn: "২য়",
                    classEn: "Two",
                    classOrder: 5,
                    roll: 1
                }
            }
        }
    },
    {
        updateOne: {
            filter: {
                _id: ObjectId("64f123456789abcdef123457"),
                status: { $in: ["Active", "Inactive"] }
            },
            update: {
                $set: {
                    session: "2027",
                    classBn: "২য়",
                    classEn: "Two",
                    classOrder: 5,
                    roll: 2
                }
            }
        }
    }
]);
```

উল্লেখ্য: MongoDB update করলে API-এর academic history update হয় না। তাই সাধারণত উপরের `/promote` endpoint ব্যবহার করাই নিরাপদ।

## ৭. রোল ডুপ্লিকেট এড়ানোর নিয়ম

একই session ও শ্রেণিতে একই রোল একাধিকবার ব্যবহার করা যাবে না।

শুরু করার আগে:

```javascript
db.students.aggregate([
    {
        $match: {
            session: "2027",
            status: { $in: ["Active", "Inactive"] }
        }
    },
    {
        $group: {
            _id: { classBn: "$classBn", roll: "$roll" },
            count: { $sum: 1 }
        }
    },
    { $match: { count: { $gt: 1 } } }
]);
```

কোনো row পাওয়া গেলে রোল আগে বদলাতে হবে। SQL বা MongoDB shell-এর `updateMany` দিয়ে automatic রোল আদায় করবেন না।

## ৮. সমস্যার ক্ষেত্রে rollback

মোট পরিবর্তন চেক করুন:

```javascript
db.students.find({
    session: "2027",
    classBn: "২য়"
}).count();
```

পুরনো ব্যাকআপ restore করতে:

```powershell
mongorestore --uri="mongodb://127.0.0.1:27017/ardm_enterprise_db" --drop "D:\ardm_teacher\backup\ardm_enterprise_db\students"
```

Restore করার আগে backend/server বন্ধ রাখুন এবং ডাটাবেসে অন্যকোনো concurrent update হওয়া চলবে না।

## ৯. নিরাপত্তা ও যাচাই

- Production server না চললে localhost API ব্যবহার করবেন না।
- Admin bearer token/credentials README বা GitHub-এ রাখবেন না।
- প্রথমে একটি test/draft list দিয়ে ১-২টি Student-এ পরীক্ষা করুন।
- বাল্ক operation শেষে session, class, roll এবং duplicate রোল পরীক্ষা করুন।
- ৯ম/১০ম শ্রেণির `nextGroup` নির্ভুল আছে কি না নিশ্চিত করুন।
- `২য়/৩য়` নয়, সঠিক `২য়/৩য়` Unicode মান ব্যবহার করুন।
