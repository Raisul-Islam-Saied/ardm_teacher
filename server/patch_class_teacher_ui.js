/**
 * Auto-patch AdminTeacherProfileEditor.jsx to include Assigned Class & Permission toggles.
 * Run inside: ardm_teacher-main/server (or root, adjusted path)
 */
const fs = require('fs');
const path = require('path');

const editorPath = path.join(__dirname, '..', 'client', 'src', 'pages', 'admin', 'AdminTeacherProfileEditor.jsx');

if (!fs.existsSync(editorPath)) {
    console.error('❌ ত্রুটি: AdminTeacherProfileEditor.jsx ফাইলটি পাওয়া যায়নি!');
    process.exit(1);
}

let code = fs.readFileSync(editorPath, 'utf8');

// ১. mapAdminFields-এ assignedClass ও canEditAssignedClass যুক্ত করা
if (!code.includes('assignedClass:')) {
    code = code.replace(
        "function mapAdminFields(teacher) {\n    return {",
        `function mapAdminFields(teacher) {\n    return {\n        assignedClass: teacher.assignedClass || '',\n        canEditAssignedClass: Boolean(teacher.canEditAssignedClass),`
    );
}

// ২. payload অবজেক্টে assignedClass ও canEditAssignedClass যুক্ত করা
if (!code.includes('assignedClass,')) {
    code = code.replace(
        "            role: adminFields.role,",
        "            assignedClass: adminFields.assignedClass || '',\n            canEditAssignedClass: Boolean(adminFields.canEditAssignedClass),\n            role: adminFields.role,"
    );
}

// ৩. JSX ফর্মে শ্রেণি সিলেক্ট ড্রপডাউন ও চেকবক্স UI যুক্ত করা
const classTeacherUiSnippet = `
                        <FormSelect
                            labelEng="Assigned Class (Class Teacher)"
                            labelBng="শ্রেণি শিক্ষক হিসেবে দায়িত্ব (Assigned Class)"
                            variant="erp"
                            value={adminFields.assignedClass}
                            onChange={(event) => {
                                const val = event.target.value;
                                updateAdminField('assignedClass', val);
                                if (!val) updateAdminField('canEditAssignedClass', false);
                            }}
                            options={[
                                { value: '', label: 'কোনো শ্রেণির ক্লাস টিচার নন (সাধারণ শিক্ষক / স্টাফ)' },
                                'প্লে', 'নার্সারি', 'কেজি', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম'
                            ]}
                        />
                        {adminFields.assignedClass && (
                            <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold-subtle/20 p-3 font-bengali text-sm text-emerald-deep">
                                <input
                                    type="checkbox"
                                    checked={adminFields.canEditAssignedClass}
                                    onChange={(event) => updateAdminField('canEditAssignedClass', event.target.checked)}
                                />
                                <span>এই শিক্ষক তার নিজ নির্ধারিত শ্রেণির (\${adminFields.assignedClass}) শিক্ষার্থীদের প্রোফাইল ও তথ্য এডিট করতে পারবেন</span>
                            </label>
                        )}`;

if (!code.includes('Assigned Class (Class Teacher)')) {
    code = code.replace(
        '<FormSelect labelEng="Employment Type"',
        classTeacherUiSnippet + '\n                        <FormSelect labelEng="Employment Type"'
    );
}

fs.writeFileSync(editorPath, code, 'utf8');
console.log('✅ AdminTeacherProfileEditor.jsx সফলভাবে প্যাচ করা হয়েছে!');