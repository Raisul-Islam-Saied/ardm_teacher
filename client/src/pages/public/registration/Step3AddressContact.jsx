/**
 * ARDM Enterprise ERP — Registration Step 3: Contact, Emergency & Address
 * Enforces Military-Grade Validation on:
 * - Primary 11-Digit BD Mobile Number (auto-converts Bengali digits & +88)
 * - Emergency Contact Number (MUST be strictly different from Primary Mobile)
 * - Present & Permanent Address
 */

import { useEffect, useState } from 'react';
import {
    Phone,
    PhoneCall,
    Mail,
    MapPin,
    Home,
    CopyCheck,
    ShieldAlert
} from 'lucide-react';
import { FormInput, FormSelect, Button, Badge } from '@components/ui';
import {
    fetchDivisions,
    fetchDistricts,
    fetchUpazilas,
    fetchUnions
} from '@api/bdAddressApi';
import {
    validateMobileNumber,
    validateEmergencyPhone,
    validateAddressField,
    sanitizeText
} from '@utils/validators';
import { extractPureDigits } from '@utils/formatters';

const ADDRESS_TEXT_FIELDS = [
    ['houseNameBn', 'বাড়ির নাম (বাংলা)'],
    ['houseNameEn', 'বাড়ির নাম (ইংরেজি)'],
    ['villageBn', 'গ্রামের নাম (বাংলা)'],
    ['villageEn', 'গ্রামের নাম (ইংরেজি)'],
    ['unionBn', 'ইউনিয়নের নাম (বাংলা)'],
    ['unionEn', 'ইউনিয়নের নাম (ইংরেজি)'],
    ['upazilaBn', 'উপজেলার নাম (বাংলা)'],
    ['upazilaEn', 'উপজেলার নাম (ইংরেজি)'],
    ['districtBn', 'জেলার নাম (বাংলা)'],
    ['districtEn', 'জেলার নাম (ইংরেজি)'],
    ['divisionBn', 'বিভাগের নাম (বাংলা)'],
    ['divisionEn', 'বিভাগের নাম (ইংরেজি)'],
    ['postOffice', 'ডাকঘর'],
    ['postCode', 'পোস্ট কোড']
];

function findLocation(locations, nameEn, nameBn) {
    const englishName = String(nameEn || '').trim().toLowerCase();
    const banglaName = String(nameBn || '').trim();
    return locations.find((location) => (
        (englishName && location.nameEn.toLowerCase() === englishName)
        || (banglaName && location.nameBn === banglaName)
    )) || null;
}

const RELATIONSHIP_OPTIONS = [
    { value: 'Father', label: 'পিতা (Father)' },
    { value: 'Mother', label: 'মাতা (Mother)' },
    { value: 'Spouse', label: 'স্বামী / স্ত্রী (Spouse)' },
    { value: 'Brother', label: 'ভাই (Brother)' },
    { value: 'Guardian', label: 'অভিভাবক / আত্মীয় (Guardian)' },
    { value: 'Other', label: 'অন্যান্য (Other)' }
];

function validateAddressData(address, prefix, errors) {
    ADDRESS_TEXT_FIELDS.forEach(([field, label]) => {
        const check = validateAddressField(address?.[field], label);
        if (!check.valid) {
            const fieldName = `${prefix}${field[0].toUpperCase()}${field.slice(1)}`;
            errors[fieldName] = check.error;
        }
    });

    const wardNo = String(address?.wardNo || '').trim();
    if (!/^\d{1,3}$/.test(wardNo)) {
        errors[`${prefix}WardNo`] = 'ওয়ার্ড নম্বর ১ থেকে ৩ সংখ্যার মধ্যে হতে হবে।';
    }
}

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

    validateAddressData(formData.presentAddress, 'present', errors);
    if (!formData.sameAsPresentAddress) {
        validateAddressData(formData.permanentAddress, 'permanent', errors);
    }

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
    const presentAddress = formData.presentAddress || {};
    const permanentAddress = formData.permanentAddress || {};
    const [divisions, setDivisions] = useState([]);
    const [districtsByDivision, setDistrictsByDivision] = useState({});
    const [upazilasByDistrict, setUpazilasByDistrict] = useState({});
    const [unionsByUpazila, setUnionsByUpazila] = useState({});
    const [isLoadingLookups, setIsLoadingLookups] = useState(false);
    const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
    const [isLoadingUpazilas, setIsLoadingUpazilas] = useState(false);
    const [isLoadingUnions, setIsLoadingUnions] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [areaLookupError, setAreaLookupError] = useState('');
    const [lookupRetry, setLookupRetry] = useState(0);
    const presentDivision = findLocation(divisions, presentAddress.divisionEn, presentAddress.divisionBn);
    const permanentDivision = findLocation(divisions, permanentAddress.divisionEn, permanentAddress.divisionBn);
    const selectedDivisionIds = [...new Set(
        [presentDivision?.id, permanentDivision?.id].filter(Boolean)
    )];
    const getSelectedDistrict = (address, division) => {
        const districts = division ? districtsByDivision[division.id] || [] : [];
        return findLocation(districts, address.districtEn, address.districtBn);
    };
    const presentDistrict = getSelectedDistrict(presentAddress, presentDivision);
    const permanentDistrict = getSelectedDistrict(permanentAddress, permanentDivision);
    const selectedDistrictIds = [...new Set(
        [presentDistrict?.id, permanentDistrict?.id].filter(Boolean)
    )];
    const getSelectedUpazila = (address, district) => {
        const upazilas = district ? upazilasByDistrict[district.id] || [] : [];
        return findLocation(upazilas, address.upazilaEn, address.upazilaBn);
    };
    const presentUpazila = getSelectedUpazila(presentAddress, presentDistrict);
    const permanentUpazila = getSelectedUpazila(permanentAddress, permanentDistrict);
    const selectedUpazilaIds = [...new Set(
        [presentUpazila?.id, permanentUpazila?.id].filter(Boolean)
    )];

    useEffect(() => {
        const controller = new AbortController();
        setIsLoadingLookups(true);
        setLookupError('');

        fetchDivisions(controller.signal)
            .then(setDivisions)
            .catch((error) => {
                if (error.name !== 'AbortError') setLookupError(error.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoadingLookups(false);
            });

        return () => controller.abort();
    }, [lookupRetry]);

    useEffect(() => {
        const missingIds = selectedDivisionIds.filter((id) => !Object.prototype.hasOwnProperty.call(districtsByDivision, id));
        if (missingIds.length === 0) {
            setIsLoadingDistricts(false);
            return undefined;
        }
        const controller = new AbortController();
        setIsLoadingDistricts(true);
        setAreaLookupError('');

        Promise.all(missingIds.map(async (id) => [
            id,
            await fetchDistricts(id, controller.signal)
        ]))
            .then((entries) => setDistrictsByDivision((current) => ({
                ...current,
                ...Object.fromEntries(entries)
            })))
            .catch((error) => {
                if (error.name !== 'AbortError') setAreaLookupError(error.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoadingDistricts(false);
            });

        return () => controller.abort();
    }, [selectedDivisionIds.join(','), districtsByDivision, lookupRetry]);

    useEffect(() => {
        const missingIds = selectedDistrictIds.filter((id) => !Object.prototype.hasOwnProperty.call(upazilasByDistrict, id));
        if (missingIds.length === 0) {
            setIsLoadingUpazilas(false);
            return undefined;
        }
        const controller = new AbortController();
        setIsLoadingUpazilas(true);
        setAreaLookupError('');

        Promise.all(missingIds.map(async (id) => [
            id,
            await fetchUpazilas(id, controller.signal)
        ]))
            .then((entries) => setUpazilasByDistrict((current) => ({
                ...current,
                ...Object.fromEntries(entries)
            })))
            .catch((error) => {
                if (error.name !== 'AbortError') setAreaLookupError(error.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoadingUpazilas(false);
            });

        return () => controller.abort();
    }, [selectedDistrictIds.join(','), upazilasByDistrict, lookupRetry]);

    useEffect(() => {
        const missingIds = selectedUpazilaIds.filter((id) => !Object.prototype.hasOwnProperty.call(unionsByUpazila, id));
        if (missingIds.length === 0) {
            setIsLoadingUnions(false);
            return undefined;
        }
        const controller = new AbortController();
        setIsLoadingUnions(true);
        setAreaLookupError('');

        Promise.all(missingIds.map(async (id) => [
            id,
            await fetchUnions(id, controller.signal)
        ]))
            .then((entries) => setUnionsByUpazila((current) => ({
                ...current,
                ...Object.fromEntries(entries)
            })))
            .catch((error) => {
                if (error.name !== 'AbortError') setAreaLookupError(error.message);
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoadingUnions(false);
            });

        return () => controller.abort();
    }, [selectedUpazilaIds.join(','), unionsByUpazila, lookupRetry]);

    const phoneLive = validateMobileNumber(formData.phone, 'শিক্ষকের মোবাইল নম্বর');
    const emPhoneLive = validateEmergencyPhone(
        formData.emergencyContact?.phone,
        formData.phone
    );

    const getFieldError = (fieldKey, liveCheck, val) => {
        if (stepErrors[fieldKey]) return stepErrors[fieldKey];
        if ((touchedFields[fieldKey] || String(val || '').length > 0) && !liveCheck.valid) {
            return liveCheck.error;
        }
        return '';
    };

    const handleAddressChange = (addressKey, changes) => {
        const updatedAddress = {
            ...(formData[addressKey] || {}),
            ...changes
        };
        onUpdateField(addressKey, updatedAddress);

        if (addressKey === 'presentAddress' && formData.sameAsPresentAddress) {
            onUpdateField('permanentAddress', updatedAddress);
        }
    };

    const getAddressError = (address, prefix, field) => {
        const fieldName = `${prefix}${field[0].toUpperCase()}${field.slice(1)}`;
        if (stepErrors[fieldName]) return stepErrors[fieldName];
        const value = address[field] || '';
        const hasBeenEdited = touchedFields[fieldName] || String(value).length > 0;
        if (!hasBeenEdited) return '';

        if (field === 'wardNo') {
            return /^\d{1,3}$/.test(String(value).trim())
                ? ''
                : 'ওয়ার্ড নম্বর ১ থেকে ৩ সংখ্যার মধ্যে হতে হবে।';
        }

        const label = ADDRESS_TEXT_FIELDS.find(([key]) => key === field)?.[1] || 'ঠিকানা';
        const check = validateAddressField(value, label);
        return check.valid ? '' : check.error;
    };

    const handleDivisionChange = (addressKey, value) => {
        const selected = divisions.find((division) => division.nameEn === value);
        setAreaLookupError('');
        handleAddressChange(addressKey, {
            divisionEn: selected?.nameEn || '',
            divisionBn: selected?.nameBn || '',
            districtEn: '',
            districtBn: '',
            upazilaEn: '',
            upazilaBn: '',
            unionBn: '',
            unionEn: '',
            wardNo: ''
        });
    };

    const handleDistrictChange = (addressKey, value) => {
        const address = addressKey === 'presentAddress' ? presentAddress : permanentAddress;
        const division = findLocation(divisions, address.divisionEn, address.divisionBn);
        const selected = (division ? districtsByDivision[division.id] || [] : [])
            .find((district) => district.nameEn === value);
        setAreaLookupError('');
        handleAddressChange(addressKey, {
            districtEn: selected?.nameEn || '',
            districtBn: selected?.nameBn || '',
            upazilaEn: '',
            upazilaBn: '',
            unionBn: '',
            unionEn: '',
            wardNo: ''
        });
    };

    const renderAddressFields = (addressKey, title) => {
        const address = addressKey === 'presentAddress' ? presentAddress : permanentAddress;
        const prefix = addressKey === 'presentAddress' ? 'present' : 'permanent';
        const divisionOptions = divisions.map((division) => ({
            value: division.nameEn,
            label: `${division.nameBn} (${division.nameEn})`
        }));
        const selectedDivision = findLocation(divisions, address.divisionEn, address.divisionBn);
        const districtList = selectedDivision ? districtsByDivision[selectedDivision.id] || [] : [];
        const selectedDistrict = findLocation(districtList, address.districtEn, address.districtBn);
        const upazilaList = selectedDistrict ? upazilasByDistrict[selectedDistrict.id] || [] : [];
        const selectedUpazila = findLocation(upazilaList, address.upazilaEn, address.upazilaBn);
        const unionList = selectedUpazila ? unionsByUpazila[selectedUpazila.id] || [] : [];
        const districtOptions = districtList.map((district) => ({
            value: district.nameEn,
            label: `${district.nameBn} (${district.nameEn})`
        }));
        const upazilaOptions = upazilaList.map((upazila) => ({
            value: upazila.nameEn,
            label: `${upazila.nameBn} (${upazila.nameEn})`
        }));
        const unionOptions = unionList.map((union) => ({
            value: union.nameEn,
            label: `${union.nameBn} (${union.nameEn})`
        }));

        const renderInput = (field, labelEng, labelBng, options = {}) => {
            const fieldName = `${prefix}${field[0].toUpperCase()}${field.slice(1)}`;
            return (
                <FormInput
                    key={field}
                    labelEng={labelEng}
                    labelBng={labelBng}
                    name={fieldName}
                    variant="erp"
                    leftIcon={options.leftIcon}
                    inputMode={options.inputMode}
                    maxLength={options.maxLength || 80}
                    value={address[field] || ''}
                    onChange={(event) => handleAddressChange(addressKey, {
                        [field]: options.numeric
                            ? extractPureDigits(event.target.value).slice(0, options.maxLength || 3)
                            : event.target.value
                    })}
                    onBlur={() => onBlurField(fieldName)}
                    required
                    isBengaliText={options.isBengaliText}
                    error={getAddressError(address, prefix, field)}
                />
            );
        };

        const renderSelect = (field, labelEng, labelBng, options, disabled, onChange, selectedValue) => {
            const fieldName = `${prefix}${field[0].toUpperCase()}${field.slice(1)}`;
            return (
                <FormSelect
                    key={field}
                    labelEng={labelEng}
                    labelBng={labelBng}
                    name={fieldName}
                    variant="erp"
                    value={selectedValue ?? address[field] ?? ''}
                    onChange={onChange}
                    onBlur={() => onBlurField(fieldName)}
                    options={options}
                    placeholder="Select"
                    disabled={disabled}
                    required
                    error={stepErrors[fieldName] || ''}
                    isBengaliText={false}
                />
            );
        };

        return (
            <div className="rounded-xl border border-ink-faint bg-paper-panel p-4 sm:p-5">
                <h4 className="mb-3 font-bengali text-sm font-bold text-emerald-deep">{title}</h4>
                <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                    {renderSelect(
                        'divisionEn',
                        'Division',
                        'বিভাগ',
                        divisionOptions,
                        isLoadingLookups,
                        (event) => handleDivisionChange(addressKey, event.target.value),
                        selectedDivision?.nameEn || ''
                    )}
                    {renderSelect(
                        'districtEn',
                        'District',
                        'জেলা',
                        districtOptions,
                        isLoadingDistricts || !selectedDivision,
                        (event) => handleDistrictChange(addressKey, event.target.value),
                        selectedDistrict?.nameEn || ''
                    )}
                    {renderSelect(
                        'upazilaEn',
                        'Upazila',
                        'উপজেলা / থানা',
                        upazilaOptions,
                        isLoadingUpazilas || !selectedDistrict,
                        (event) => {
                            const selected = upazilaList.find((upazila) => upazila.nameEn === event.target.value);
                            setAreaLookupError('');
                            handleAddressChange(addressKey, {
                                upazilaEn: selected?.nameEn || '',
                                upazilaBn: selected?.nameBn || '',
                                unionBn: '',
                                unionEn: '',
                                wardNo: ''
                            });
                        },
                        selectedUpazila?.nameEn || ''
                    )}
                    {renderSelect(
                        'unionEn',
                        'Union',
                        'ইউনিয়ন',
                        unionOptions,
                        isLoadingUnions || !selectedUpazila,
                        (event) => {
                            const selected = unionList.find((union) => union.nameEn === event.target.value);
                            setAreaLookupError('');
                            handleAddressChange(addressKey, {
                                unionEn: selected?.nameEn || '',
                                unionBn: selected?.nameBn || '',
                                wardNo: ''
                            });
                        },
                        findLocation(unionList, address.unionEn, address.unionBn)?.nameEn || ''
                    )}
                    {renderInput('houseNameBn', 'House Name (Bangla)', 'বাড়ির নাম (বাংলা)', { leftIcon: Home, isBengaliText: true })}
                    {renderInput('houseNameEn', 'House Name (English)', 'বাড়ির নাম (ইংরেজি)', { isBengaliText: false })}
                    {renderInput('villageBn', 'Village (Bangla)', 'গ্রাম (বাংলা)', { isBengaliText: true })}
                    {renderInput('villageEn', 'Village (English)', 'গ্রাম (ইংরেজি)', { isBengaliText: false })}
                    {renderInput('wardNo', 'Ward No.', 'ওয়ার্ড নম্বর', { inputMode: 'numeric', maxLength: 3, numeric: true, isBengaliText: false })}
                    {renderInput('postOffice', 'Post Office', 'ডাকঘর', { isBengaliText: true })}
                    {renderInput('postCode', 'Post Code', 'পোস্ট কোড', { inputMode: 'numeric', maxLength: 4, numeric: true, isBengaliText: false })}
                </div>
            </div>
        );
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

                {(lookupError || areaLookupError) && (
                    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger-bg px-3 py-2">
                        <p className="font-bengali text-xs text-danger">{lookupError || areaLookupError}</p>
                        <Button variant="outline" size="xs" onClick={() => setLookupRetry((attempt) => attempt + 1)}>
                            আবার চেষ্টা করুন
                        </Button>
                    </div>
                )}
                {isLoadingLookups && (
                    <p className="font-bengali text-xs text-ink-soft">BD APIs v2.0 থেকে বিভাগের তালিকা লোড হচ্ছে...</p>
                )}
                {(isLoadingDistricts || isLoadingUpazilas || isLoadingUnions) && (
                    <p className="font-bengali text-xs text-ink-soft">এলাকার তালিকা লোড হচ্ছে...</p>
                )}

                <div className="space-y-4">
                    {renderAddressFields('presentAddress', 'বর্তমান ঠিকানা')}
                </div>

                {/* স্থায়ী ঠিকানা ও বর্তমান ঠিকানা একই কি না তার চেকবক্স */}
                <div className="mt-3 pt-3 border-t border-ink-faint flex items-center justify-between flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={Boolean(formData.sameAsPresentAddress)}
                            aria-expanded={!formData.sameAsPresentAddress}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                onUpdateField('sameAsPresentAddress', checked);
                                if (checked) {
                                    onUpdateField('permanentAddress', { ...presentAddress });
                                }
                            }}
                            className="w-4 h-4 accent-emerald rounded cursor-pointer"
                        />
                        <span className="font-bengali text-xs sm:text-sm font-medium text-emerald-deep flex items-center gap-1.5">
                            <CopyCheck className="w-4 h-4 text-gold-deep" />
                            আমার স্থায়ী ঠিকানা এবং বর্তমান ঠিকানা একই
                        </span>
                    </label>
                    <span className="font-bengali text-xs text-ink-soft">
                        আলাদা স্থায়ী ঠিকানা দিতে টিক তুলে দিন—নিচে ফর্মটি দেখাবে।
                    </span>
                </div>

                {!formData.sameAsPresentAddress && (
                    <div id="permanent-address-fields" className="mt-4">
                        {renderAddressFields('permanentAddress', 'স্থায়ী ঠিকানা')}
                    </div>
                )}

                <p className="mt-3 rounded-lg border border-emerald/15 bg-emerald-subtle/40 px-3 py-2 font-bengali text-xs leading-5 text-ink-soft">
                    বিভাগ, জেলা, উপজেলা ও ইউনিয়নের বাংলা-ইংরেজি তালিকা BD APIs v2.0 থেকে আসে। বাড়ি, গ্রাম, ওয়ার্ড, ডাকঘর ও পোস্ট কোডের তথ্য নিজে পূরণ করুন।
                </p>
            </section>
        </div>
    );
}
