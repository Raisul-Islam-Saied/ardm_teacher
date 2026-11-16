const BD_API_BASE_URL = 'https://bdapis.pro.bd/geo/v2.0';

async function fetchAddressData(path, signal) {
    let response;
    try {
        response = await fetch(`${BD_API_BASE_URL}${path}`, {
            headers: { Accept: 'application/json' },
            signal
        });
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error('BD APIs-এ সংযোগ করা যায়নি। ইন্টারনেট সংযোগ যাচাই করে আবার চেষ্টা করুন।');
    }

    if (!response.ok) {
        throw new Error(`BD APIs থেকে ঠিকানার তথ্য লোড করা যায়নি (${response.status})।`);
    }

    let payload;
    try {
        payload = await response.json();
    } catch {
        throw new Error('BD APIs-এর response পড়া যায়নি। পরে আবার চেষ্টা করুন।');
    }

    if (!payload || payload.success !== true || !Array.isArray(payload.data)) {
        throw new Error(payload?.message || 'BD APIs থেকে অপ্রত্যাশিত ঠিকানার তথ্য পাওয়া গেছে।');
    }

    return payload.data
        .filter((item) => item?.id != null && item?.name && item?.bn_name)
        .map((item) => ({
            id: String(item.id),
            nameEn: item.name,
            nameBn: item.bn_name
        }));
}

function requireLocationId(id) {
    const value = String(id ?? '').trim();
    if (!/^\d+$/.test(value)) {
        throw new Error('ঠিকানার তালিকা লোড করতে একটি বৈধ এলাকা নির্বাচন করুন।');
    }
    return encodeURIComponent(value);
}

export function fetchDivisions(signal) {
    return fetchAddressData('/divisions', signal);
}

export function fetchDistricts(divisionId, signal) {
    return fetchAddressData(`/districts/${requireLocationId(divisionId)}`, signal);
}

export function fetchUpazilas(districtId, signal) {
    return fetchAddressData(`/upazilas/${requireLocationId(districtId)}`, signal);
}

export function fetchUnions(upazilaId, signal) {
    return fetchAddressData(`/unions/${requireLocationId(upazilaId)}`, signal);
}
