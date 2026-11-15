/**
 * ARDM Enterprise ERP — Registration Step 3: Contact, Emergency & Address
 * Enforces Military-Grade Validation on:
 * - Primary 11-Digit BD Mobile Number (auto-converts Bengali digits & +88)
 * - Emergency Contact Number (MUST be strictly different from Primary Mobile)
 * - Present & Permanent Address
 */

import {
    Phone,
    PhoneCall,
    Mail,
    MapPin,
    Home,
    CopyCheck,
    ShieldAlert
} from 'lucide-react';
import { FormInput, FormSelect, Badge } from '@components/ui';
import {
    validateMobileNumber,
    validateEmergencyPhone,
    validateAddressField,
    sanitizeText
} from '@utils/validators';
import { extractPureDigits } from '@utils/formatters';

const RELATIONSHIP_OPTIONS = [
    { value: 'Father', label: 'পিতা (Father)' },
    { value: 'Mother', label: 'মাতা (Mother)' },
    { value: 'Spouse', label: 'স্বামী / স্ত্রী (Spouse)' },
    { value: 'Brother', label: 'ভাই (Brother)' },
    { value: 'Guardian', label: 'অভিভাবক / আত্মীয় (Guardian)' },
    { value: 'Other', label: 'অন্যান্য (Other)' }
];

/**
 * পুরো Step 3-এর সকল ফিল্ড একসাথে ভ্যালিডেট করার এক্সপোর্টেড ফাংশন
 */
export function validateStep3AddressContactData(formData) {
    const errors = {};

    const phoneCheck = validateMobileNumber(formData.phone, 'শিক্ষকের মোবাইল নম্বর');
    if (!phoneCheck.valid) errors.phone = phoneCheck.error;

    const emName = sanitizeText(formData.emergencyContact?.contactName || '');
    if (!emName || emName.length < 2) {
        errors.emergencyContactName = 'জরুরি যোগাযোগের ব্যক্তির নাম উল্লেখ করা আবশ্যক।';
    }

    const emPhoneCheck = validateEmergencyPhone(
        formData.emergencyContact?.phone,
        formData.phone
    );
    if (!emPhoneCheck.valid) errors.emergencyPhone = emPhoneCheck.error;

    if (formData.email && String(formData.email).trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(formData.email).trim())) {
            errors.email = 'সঠিক ইমেইল অ্যাড্রেস প্রদান করুন (অথবা খালি রাখুন)।';
        }
    }

    const houseCheck = validateAddressField(
        formData.presentAddress?.houseOrRoad,
        'বাড়ি বা রাস্তার নাম'
    );
    if (!houseCheck.valid) errors.presentHouseOrRoad = houseCheck.error;

    const villageCheck = validateAddressField(
        formData.presentAddress?.village,
        'গ্রামের নাম'
    );
    if (!villageCheck.valid) errors.presentVillage = villageCheck.error;

    const postOfficeCheck = validateAddressField(
        formData.presentAddress?.postOffice,
        'ডাকঘর (Post Office)'
    );
    if (!postOfficeCheck.valid) errors.presentPostOffice = postOfficeCheck.error;

    const upazilaCheck = validateAddressField(
        formData.presentAddress?.upazila,
        'উপজেলা / থানা'
    );
    if (!upazilaCheck.valid) errors.presentUpazila = upazilaCheck.error;

    const districtCheck = validateAddressField(
        formData.presentAddress?.district,
        'জেলা'
    );
    if (!districtCheck.valid) errors.presentDistrict = districtCheck.error;

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

export default function Step3AddressContact({
    formData,
    onUpdateField,
    touchedFields = {},
    onBlurField,
    stepErrors = {}
}) {
    const phoneLive = validateMobileNumber(formData.phone, 'শিক্ষকের মোবাইল নম্বর');
    const emPhoneLive = validateEmergencyPhone(
        formData.emergencyContact?.phone,
        formData.phone
    );
    const houseLive = validateAddressField(
        formData.presentAddress?.houseOrRoad,
        'বাড়ি বা রাস্তার নাম'
    );
    const villageLive = validateAddressField(
        formData.presentAddress?.village,
        'গ্রামের নাম'
    );

    const getFieldError = (fieldKey, liveCheck, val) => {
        if (stepErrors[fieldKey]) return stepErrors[fieldKey];
        if ((touchedFields[fieldKey] || String(val || '').length > 0) && !liveCheck.valid) {
            return liveCheck.error;
        }
        return '';
    };

    // বর্তমান ঠিকানা আপডেট হ্যান্ডলার (sameAsPresentAddress চালু থাকলে স্থায়ী ঠিকানাও একসাথে আপডেট হবে)
    const handlePresentAddressChange = (subKey, value) => {
        const updatedPresent = {
            ...formData.presentAddress,
            [subKey]: value
        };
        onUpdateField('presentAddress', updatedPresent);

        if (formData.sameAsPresentAddress) {
            onUpdateField('permanentAddress', updatedPresent);
        }
    };

    const handleEmergencyChange = (subKey, value) => {
        onUpdateField('emergencyContact', {
            ...formData.emergencyContact,
            [subKey]: value
        });
    };

    // মোবাইল নম্বর ইনপুট নরমালাইজার (+8801... পেস্ট করলেও ১১ ডিজিট করে নেবে)
    const normalizePhoneInput = (rawVal) => {
        let digits = extractPureDigits(rawVal);
        if (digits.startsWith('8801') && digits.length >= 13) {
            digits = digits.slice(2);
        }
        return digits.slice(0, 11);
    };

    return (
        <div className="space-y-8 animate-fade-up">

            {/* =================================================================
                SECTION 1: VERIFIED MOBILE, EMAIL & DISTINCT EMERGENCY CONTACT
               ================================================================= */}
            <section>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-2 border-b border-ink-faint">
                    <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald" />
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                            ১. নিজস্ব মোবাইল নম্বর ও জরুরি যোগাযোগ (ভিন্ন নম্বর বাধ্যতামূলক)
                        </h3>
                    </div>
                    <Badge variant="gold" size="sm">
                        লগইন ইউজারনেম হিসেবে ব্যবহৃত হবে
                    </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-1">
                    <FormInput
                        labelEng="Personal Mobile Number"
                        labelBng="শিক্ষকের নিজস্ব সচল মোবাইল নম্বর"
                        name="phone"
                        inputMode="tel"
                        leftIcon={Phone}
                        value={formData.phone}
                        onChange={(e) => onUpdateField('phone', normalizePhoneInput(e.target.value))}
                        onBlur={() => onBlurField('phone')}
                        placeholder="018XXXXXXXX"
                        required
                        isMonoText
                        showValidIcon
                        isValid={phoneLive.valid}
                        error={getFieldError('phone', phoneLive, formData.phone)}
                        hint="১১ সংখ্যার বাংলাদেশী নম্বর (বাংলা বা ইংরেজি যেকোনো সংখ্যায় লিখুন)।"
                    />

                    <FormInput
                        labelEng="Email Address (Optional)"
                        labelBng="ইমেইল অ্যাড্রেস (যদি থাকে — ঐচ্ছিক)"
                        name="email"
                        type="email"
                        leftIcon={Mail}
                        value={formData.email}
                        onChange={(e) => onUpdateField('email', e.target.value)}
                        onBlur={() => onBlurField('email')}
                        placeholder="teacher@example.com"
                        error={stepErrors.email || ''}
                        hint="পাসওয়ার্ড রিকভারি ও নোটিফিকেশনের জন্য (না থাকলে খালি রাখুন)।"
                    />
                </div>

                {/* জরুরি যোগাযোগের বক্স */}
                <div className="mt-2 p-4 sm:p-5 rounded-2xl bg-paper border border-ink-faint">
                    <div className="flex items-center gap-2 mb-3">
                        <PhoneCall className="w-4 h-4 text-gold-deep" />
                        <h4 className="font-bengali text-xs sm:text-sm font-bold text-emerald-deep">
                            জরুরি প্রয়োজনে পরিবারের যার সাথে যোগাযোগ করা যাবে (Emergency Contact)
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-1">
                        <FormInput
                            labelEng="Contact Person"
                            labelBng="অভিভাবক / ব্যক্তির নাম"
                            variant="erp"
                            value={formData.emergencyContact?.contactName || ''}
                            onChange={(e) => handleEmergencyChange('contactName', e.target.value)}
                            placeholder="যেমনঃ মোঃ রফিকুল ইসলাম"
                            required
                            isBengaliText
                            error={stepErrors.emergencyContactName || ''}
                        />

                        <FormSelect
                            labelEng="Relationship"
                            labelBng="সম্পর্ক"
                            variant="erp"
                            value={formData.emergencyContact?.relationship || 'Guardian'}
                            onChange={(e) => handleEmergencyChange('relationship', e.target.value)}
                            options={RELATIONSHIP_OPTIONS}
                            placeholder={false}
                            required
                        />

                        <FormInput
                            labelEng="Emergency Mobile"
                            labelBng="জরুরি মোবাইল নম্বর (ভিন্ন)"
                            variant="erp"
                            inputMode="tel"
                            value={formData.emergencyContact?.phone || ''}
                            onChange={(e) =>
                                handleEmergencyChange('phone', normalizePhoneInput(e.target.value))
                            }
                            onBlur={() => onBlurField('emergencyPhone')}
                            placeholder="017XXXXXXXX"
                            required
                            isMonoText
                            showValidIcon
                            isValid={emPhoneLive.valid}
                            error={getFieldError(
                                'emergencyPhone',
                                emPhoneLive,
                                formData.emergencyContact?.phone
                            )}
                        />
                    </div>

                    <p className="font-bengali text-[11px] text-ink-soft flex items-center gap-1.5 mt-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-gold-deep shrink-0" />
                        <span>
                            নিরাপত্তা নীতিমালা অনুযায়ী শিক্ষকের নিজের মোবাইল নম্বর এবং জরুরি যোগাযোগের নম্বর কখনোই এক হতে পারবে না।
                        </span>
                    </p>
                </div>
            </section>

            {/* =================================================================
                SECTION 2: PRESENT & PERMANENT ADDRESS
               ================================================================= */}
            <section>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-2 border-b border-ink-faint">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald" />
                        <h3 className="font-bengali text-sm font-bold text-emerald-deep">
                            ২. বর্তমান ও স্থায়ী ঠিকানা
                        </h3>
                    </div>
                </div>

                {/* বাড়ি/রাস্তা এবং গ্রাম */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-1">
                    <FormInput
                        labelEng="House / Road / Para"
                        labelBng="বাড়ির নাম / রাস্তার নাম / পাড়া"
                        name="presentHouseOrRoad"
                        leftIcon={Home}
                        value={formData.presentAddress?.houseOrRoad || ''}
                        onChange={(e) => handlePresentAddressChange('houseOrRoad', e.target.value)}
                        onBlur={() => onBlurField('presentHouseOrRoad')}
                        placeholder="যেমনঃ মীরেরখীল, সিকদার বাড়ি"
                        required
                        showValidIcon
                        isValid={houseLive.valid}
                        error={getFieldError(
                            'presentHouseOrRoad',
                            houseLive,
                            formData.presentAddress?.houseOrRoad
                        )}
                        hint="আপনার আগের ফর্মের মতো বাড়ি বা মহল্লার নাম লিখুন।"
                    />

                    <FormInput
                        labelEng="Village / Ward"
                        labelBng="গ্রাম / ওয়ার্ড"
                        name="presentVillage"
                        value={formData.presentAddress?.village || ''}
                        onChange={(e) => handlePresentAddressChange('village', e.target.value)}
                        onBlur={() => onBlurField('presentVillage')}
                        placeholder="যেমনঃ মীরেরখীল (Mirerkhil)"
                        required
                        showValidIcon
                        isValid={villageLive.valid}
                        error={getFieldError(
                            'presentVillage',
                            villageLive,
                            formData.presentAddress?.village
                        )}
                        hint="গ্রামের নাম বাংলা বা ইংরেজিতে লিখুন।"
                    />
                </div>

                {/* বর্তমান ঠিকানার এলাকা */}
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-1 mt-1">
                    <FormInput
                        labelEng="Post Office"
                        labelBng="ডাকঘর"
                        variant="erp"
                        value={formData.presentAddress?.postOffice || ''}
                        onChange={(e) => handlePresentAddressChange('postOffice', e.target.value)}
                        required
                        error={stepErrors.presentPostOffice || ''}
                    />

                    <FormInput
                        labelEng="Post Code"
                        labelBng="পোস্ট কোড"
                        variant="erp"
                        inputMode="numeric"
                        value={formData.presentAddress?.postCode || ''}
                        onChange={(e) =>
                            handlePresentAddressChange(
                                'postCode',
                                extractPureDigits(e.target.value).slice(0, 4)
                            )
                        }
                        isMonoText
                        required
                    />

                    <FormInput
                        labelEng="Upazila"
                        labelBng="উপজেলা / থানা"
                        variant="erp"
                        value={formData.presentAddress?.upazila || ''}
                        onChange={(e) => handlePresentAddressChange('upazila', e.target.value)}
                        required
                        error={stepErrors.presentUpazila || ''}
                    />

                    <FormInput
                        labelEng="District"
                        labelBng="জেলা"
                        variant="erp"
                        value={formData.presentAddress?.district || ''}
                        onChange={(e) => handlePresentAddressChange('district', e.target.value)}
                        required
                        error={stepErrors.presentDistrict || ''}
                    />
                </div>

                {/* স্থায়ী ঠিকানা ও বর্তমান ঠিকানা একই কি না তার চেকবক্স */}
                <div className="mt-3 pt-3 border-t border-ink-faint flex items-center justify-between flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={Boolean(formData.sameAsPresentAddress)}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                onUpdateField('sameAsPresentAddress', checked);
                                if (checked) {
                                    onUpdateField('permanentAddress', { ...formData.presentAddress });
                                }
                            }}
                            className="w-4 h-4 accent-emerald rounded cursor-pointer"
                        />
                        <span className="font-bengali text-xs sm:text-sm font-medium text-emerald-deep flex items-center gap-1.5">
                            <CopyCheck className="w-4 h-4 text-gold-deep" />
                            আমার স্থায়ী ঠিকানা এবং বর্তমান ঠিকানা একই
                        </span>
                    </label>

                </div>
            </section>
        </div>
    );
}
