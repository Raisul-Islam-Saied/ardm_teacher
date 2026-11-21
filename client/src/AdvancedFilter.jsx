import React, { useState, useEffect } from 'react';
import { Filter, X, PlusCircle, CheckCheck, Trash2, ArrowDownToLine } from 'lucide-react';

const toEn = (n) => {
    if (n === undefined || n === null || n === '') return '-';
    const bnToEn = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
    return String(n).replace(/[০-৯]/g, d => bnToEn[d] || d);
};

const classOrderMap = { "প্লে": 1, "নার্সারি": 2, "কেজি": 3, "১ম": 4, "২য়": 5, "৩য়": 6, "৪র্থ": 7, "৫ম": 8, "৬ষ্ঠ": 9, "৭ম": 10, "৮ম": 11, "৯ম": 12, "১০ম": 13 };
const classOptions = ['প্লে', 'নার্সারি', 'কেজি', '১ম', '২য়', '৩য়', '৪র্থ', '৫ম', '৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম'];

// বয়স বের করার ফাংশন
const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate)) return null;
    const diffMs = Date.now() - birthDate.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
};

export default function AdvancedFilter({ isOpen, onClose, originalData, onApplyFilter }) {
    const [rules, setRules] = useState([]);

    useEffect(() => {
        if (isOpen && rules.length === 0) {
            addRule();
        }
    }, [isOpen]);

    const createNewRule = () => ({
        id: Date.now() + Math.random(),
        connector: '&&',
        field: 'Roll',
        operator: '==',
        value: '',
        min: '',
        max: ''
    });

    const addRule = () => setRules([...rules, createNewRule()]);

    const insertRuleAfter = (index) => {
        const newRules = [...rules];
        newRules.splice(index + 1, 0, createNewRule());
        setRules(newRules);
    };

    const removeRule = (id) => setRules(rules.filter(rule => rule.id !== id));

    const updateRule = (id, key, val) => {
        setRules(rules.map(rule => rule.id === id ? { ...rule, [key]: val } : rule));
    };

    const resetFilter = () => {
        setRules([createNewRule()]);
        onApplyFilter([...originalData]); 
        onClose();
    };

    const applyAdvancedFilter = () => {
        if (!originalData || originalData.length === 0) return;

        const validRules = rules.filter(rule => {
            if (rule.operator === 'empty' || rule.operator === 'not_empty') return true;
            if (rule.operator === 'between') return rule.min.trim() !== '' && rule.max.trim() !== '';
            return rule.value.trim() !== '';
        });

        if (validRules.length === 0) {
            onApplyFilter([...originalData]);
            onClose();
            return;
        }

        const filtered = originalData.filter(st => {
            let finalResult = false;
            let currentGroupResult = true;

            validRules.forEach((rule, index) => {
                let stVal = st[rule.field];
                
                // বয়সের জন্য স্পেশাল লজিক (কারন বয়স সেভ করা থাকে না, DOB থাকে)
                if (rule.field === 'Age') {
                    stVal = calculateAge(st.DOB);
                }

                if (stVal === undefined || stVal === null) stVal = "";

                let conditionMet = false;
                let numStVal = parseFloat(toEn(String(stVal)));
                let strStVal = String(stVal).toLowerCase();

                if (rule.operator === 'empty') { conditionMet = (strStVal === ""); }
                else if (rule.operator === 'not_empty') { conditionMet = (strStVal !== ""); }
                else if (rule.operator === 'between') {
                    if (rule.field === 'ClassBn') {
                        let stRank = classOrderMap[stVal] || 99;
                        let minRank = classOrderMap[rule.min] || 0;
                        let maxRank = classOrderMap[rule.max] || 99;
                        conditionMet = (stRank >= minRank && stRank <= maxRank);
                    } else {
                        let min = parseFloat(toEn(rule.min)); let max = parseFloat(toEn(rule.max));
                        if (!isNaN(numStVal) && !isNaN(min) && !isNaN(max)) { conditionMet = (numStVal >= min && numStVal <= max); }
                    }
                }
                else if (rule.operator === 'in_list') {
                    let listArr = rule.value.split(',').map(s => String(toEn(s)).trim().toLowerCase());
                    let targetVal = String(toEn(stVal)).trim().toLowerCase();
                    conditionMet = listArr.includes(targetVal);
                }
                else if (rule.operator === 'not_in_list') {
                    let listArr = rule.value.split(',').map(s => String(toEn(s)).trim().toLowerCase());
                    let targetVal = String(toEn(stVal)).trim().toLowerCase();
                    conditionMet = !listArr.includes(targetVal);
                }
                else {
                    let isClassCmp = rule.field === 'ClassBn';
                    let isNum = !isNaN(numStVal) && !isNaN(parseFloat(toEn(rule.value))) && !isClassCmp && rule.field !== 'StudentNameBn' && rule.field !== 'Gender' && rule.field !== 'BloodGroup';

                    let val1 = isClassCmp ? (classOrderMap[stVal] || 99) : (isNum ? numStVal : strStVal);
                    let val2 = isClassCmp ? (classOrderMap[rule.value] || 99) : (isNum ? parseFloat(toEn(rule.value)) : rule.value.toLowerCase());

                    // রক্তের গ্রুপ খালি থাকলে "n/a" হিসেবে মিলাও, যাতে N/A সিলেক্ট করে খালিগুলো খোঁজা যায়
                    if (rule.field === 'BloodGroup') {
                        val1 = strStVal === "" ? "n/a" : strStVal;
                        val2 = rule.value.toLowerCase();
                    }

                    switch (rule.operator) {
                        case '==': conditionMet = (val1 === val2); break;
                        case '!=': conditionMet = (val1 !== val2); break;
                        case '<': conditionMet = (val1 < val2); break;
                        case '>': conditionMet = (val1 > val2); break;
                        case '<=': conditionMet = (val1 <= val2); break;
                        case '>=': conditionMet = (val1 >= val2); break;
                        case 'contains': conditionMet = String(val1).includes(String(val2)); break;
                        case 'not_contains': conditionMet = !String(val1).includes(String(val2)); break;
                        default: break;
                    }
                }

                if (index === 0) { currentGroupResult = conditionMet; }
                else {
                    if (rule.connector === '||') {
                        finalResult = finalResult || currentGroupResult;
                        currentGroupResult = conditionMet;
                    } else {
                        currentGroupResult = currentGroupResult && conditionMet;
                    }
                }
            });
            return finalResult || currentGroupResult;
        });

        onApplyFilter(filtered);
        onClose();
    };

    const renderValueInput = (rule) => {
        if (rule.operator === 'empty' || rule.operator === 'not_empty') return null;

        if (rule.operator === 'between') {
            if (rule.field === 'ClassBn') {
                return (
                    <div className="flex gap-2">
                        <select className="w-1/2 border rounded p-1.5 text-sm outline-none" value={rule.min} onChange={(e) => updateRule(rule.id, 'min', e.target.value)}>
                            <option value="">Min</option>
                            {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select className="w-1/2 border rounded p-1.5 text-sm outline-none" value={rule.max} onChange={(e) => updateRule(rule.id, 'max', e.target.value)}>
                            <option value="">Max</option>
                            {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                );
            }
            return (
                <div className="flex gap-2">
                    <input type="text" className="w-1/2 border rounded p-1.5 text-sm outline-none" placeholder="Min" value={rule.min} onChange={(e) => updateRule(rule.id, 'min', e.target.value)} />
                    <input type="text" className="w-1/2 border rounded p-1.5 text-sm outline-none" placeholder="Max" value={rule.max} onChange={(e) => updateRule(rule.id, 'max', e.target.value)} />
                </div>
            );
        }

        if (rule.field === 'ClassBn' && ['==', '!=', '<', '>', '<=', '>='].includes(rule.operator)) {
            return (
                <select className="w-full border rounded p-1.5 text-sm font-bold text-[#005A34] outline-none" value={rule.value} onChange={(e) => updateRule(rule.id, 'value', e.target.value)}>
                    <option value="">সিলেক্ট করুন</option>
                    {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            );
        }

        if (rule.field === 'Gender' && ['==', '!='].includes(rule.operator)) {
            return (
                <select className="w-full border rounded p-1.5 text-sm font-bold text-[#005A34] outline-none" value={rule.value} onChange={(e) => updateRule(rule.id, 'value', e.target.value)}>
                    <option value="">সিলেক্ট করুন</option>
                    <option value="Male">ছেলে (Male)</option>
                    <option value="Female">মেয়ে (Female)</option>
                </select>
            );
        }
        
        if (rule.field === 'BloodGroup' && ['==', '!='].includes(rule.operator)) {
            return (
                <select className="w-full border rounded p-1.5 text-sm font-bold text-[#b91c1c] outline-none" value={rule.value} onChange={(e) => updateRule(rule.id, 'value', e.target.value)}>
                    <option value="">সিলেক্ট করুন</option>
                    <option value="N/A" style={{ color: '#6b7280', fontStyle: 'italic' }}>N/A (নেই)</option>
                    {['A+', 'B+', 'O+', 'AB+', 'A-', 'B-', 'O-', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
            );
        }

        let placeholder = (rule.operator === 'in_list' || rule.operator === 'not_in_list') ? "১, ২, ৩ (কমা দিয়ে)" : "Value...";
        let type = (rule.field === 'WhatsApp' || rule.field === 'EmergencyNo' || rule.field === 'BRN' || rule.field === 'Age') ? "number" : "text";

        return (
            <input type={type} className="w-full border rounded p-1.5 text-sm outline-none" placeholder={placeholder} value={rule.value} onChange={(e) => updateRule(rule.id, 'value', e.target.value)} />
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex justify-center items-center">
            <div className="bg-white w-11/12 max-w-lg rounded-xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
                <div className="bg-[#005A34] text-white p-3 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2 text-sm"><Filter className="w-4 h-4" /> মেইল মার্জ ফিল্টারিং রুলস</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3 scrollbar-thin scrollbar-thumb-gray-300">
                    {rules.map((rule, index) => (
                        <div key={rule.id} className="flex flex-col sm:flex-row gap-2 sm:items-center bg-white p-3 sm:p-2 border rounded-lg shadow-sm relative">
                            <div className={`w-full sm:w-24 ${index === 0 ? 'invisible hidden sm:block' : ''}`}>
                                <label className="block sm:hidden text-[10px] font-bold text-gray-500 mb-1">লজিক</label>
                                <select className="w-full border rounded p-1.5 text-xs font-bold text-gray-700 outline-none" value={rule.connector} onChange={(e) => updateRule(rule.id, 'connector', e.target.value)}>
                                    <option value="&&">AND (এবং)</option>
                                    <option value="||">OR (অথবা)</option>
                                </select>
                            </div>
                            
                            <div className="w-full sm:w-1/4">
                                <label className="block sm:hidden text-[10px] font-bold text-gray-500 mb-1">Field (ডাটা)</label>
                                <select className="w-full border rounded p-1.5 text-sm font-bold text-[#005A34] outline-none" value={rule.field} onChange={(e) => updateRule(rule.id, 'field', e.target.value)}>
                                    {/* ----- এখানে নতুন ফিল্ডগুলো যোগ করা হয়েছে ----- */}
                                    <option value="Roll">রোল (Roll)</option>
                                    <option value="ClassBn">শ্রেণি (Class)</option>
                                    <option value="StudentNameBn">নাম (Name)</option>
                                    <option value="ID">আইডি (ID)</option>
                                    <option value="Gender">লিঙ্গ (Gender)</option>
                                    <option value="Session">সেশন (Session)</option>
                                    <option value="Age" style={{color: 'purple'}}>বয়স (Age)</option>
                                    <option value="BloodGroup" style={{color: 'red'}}>রক্তের গ্রুপ (Blood)</option>
                                    <option value="WhatsApp" style={{color: 'green'}}>মোবাইল (Mobile)</option>
                                    <option value="EmergencyNo">জরুরি নম্বর</option>
                                    <option value="BRN">জন্ম নিবন্ধন (BRN)</option>
                                    <option value="VillageBn">গ্রাম (Village)</option>
                                    <option value="UnionBn">ইউনিয়ন (Union)</option>
                                </select>
                            </div>
                            
                            <div className="w-full sm:w-1/4">
                                <label className="block sm:hidden text-[10px] font-bold text-gray-500 mb-1">Condition (শর্ত)</label>
                                <select className="w-full border rounded p-1.5 text-sm outline-none" value={rule.operator} onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}>
                                    <option value="==">Equal to (=)</option>
                                    <option value="!=">Not equal to (≠)</option>
                                    <option value="<">Less than (&lt;)</option>
                                    <option value=">">Greater than (&gt;)</option>
                                    <option value="<=">Less or equal (&lt;=)</option>
                                    <option value=">=">Greater or equal (&gt;=)</option>
                                    <option value="contains">Contains</option>
                                    <option value="not_contains">Not contains</option>
                                    <option value="in_list" style={{ color: 'blue', fontWeight: 'bold' }}>লিস্টে আছে (১,২,৩)</option>
                                    <option value="not_in_list" style={{ color: 'orange', fontWeight: 'bold' }}>লিস্টে নেই (১,২,৩)</option>
                                    <option value="between" style={{ color: 'green', fontWeight: 'bold' }}>মাঝামাঝি (১০-২০)</option>
                                    <option value="empty">Is blank</option>
                                    <option value="not_empty">Is not blank</option>
                                </select>
                            </div>
                            
                            <div className="w-full sm:flex-1">
                                <label className="block sm:hidden text-[10px] font-bold text-gray-500 mb-1">Value (মান)</label>
                                {renderValueInput(rule)}
                            </div>
                            
                            <div className="w-full sm:w-16 flex justify-end gap-1 mt-2 sm:mt-0">
                                <button onClick={() => insertRuleAfter(index)} className="text-blue-500 hover:text-white bg-blue-50 hover:bg-blue-500 p-1.5 rounded-md transition-colors" title="নিচে রুল যোগ করুন">
                                    <ArrowDownToLine className="w-4 h-4" />
                                </button>
                                <button onClick={() => removeRule(rule.id)} className="text-red-500 hover:text-white bg-red-50 hover:bg-red-500 p-1.5 rounded-md transition-colors" title="মুছে ফেলুন">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-4 py-2 bg-gray-50 border-t flex justify-between items-center">
                    <button onClick={addRule} className="text-[#005A34] font-bold text-sm flex items-center gap-1 hover:text-[#1e40af] transition-colors">
                        <PlusCircle className="w-4 h-4" /> নতুন রুল যোগ করুন
                    </button>
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">প্রাপক: <span className="text-[#005A34]">{originalData?.length || 0}</span></span>
                </div>
                
                <div className="p-3 border-t bg-white flex gap-2">
                    <button onClick={resetFilter} className="w-1/3 bg-gray-200 text-gray-800 font-bold py-2 rounded-lg text-sm">রিসেট</button>
                    <button onClick={applyAdvancedFilter} className="w-2/3 bg-[#1e40af] text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2 text-sm">
                        <CheckCheck className="w-4 h-4" /> ফিল্টার এপ্লাই করুন
                    </button>
                </div>
            </div>
        </div>
    );
}
