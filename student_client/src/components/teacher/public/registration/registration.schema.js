function createEmptyAddress() {
    return {
        houseNameBn: '',
        houseNameEn: '',
        villageBn: '',
        villageEn: '',
        unionBn: '',
        unionEn: '',
        wardNo: '',
        upazilaBn: '',
        upazilaEn: '',
        districtBn: '',
        districtEn: '',
        divisionBn: '',
        divisionEn: '',
        houseOrRoad: '',
        village: '',
        postOffice: '',
        postCode: '',
        upazila: '',
        district: ''
    };
}

export function createInitialRegistrationData() {
    return {
        fullNameEng: '',
        fullNameBng: '',
        designation: '',
        subject: '',
        gender: '',
        religion: '',
        bloodGroup: '',
        maritalStatus: '',
        identityType: 'NID',
        nidNumber: '',
        birthRegNumber: '',
        dateOfBirth: '',
        joiningDate: '',
        indexNumber: '',
        fathersNameEng: '',
        fathersNameBng: '',
        mothersNameEng: '',
        mothersNameBng: '',
        academicQualifications: [],
        phone: '',
        email: '',
        emergencyContact: {
            contactName: '',
            relationship: 'Guardian',
            phone: ''
        },
        presentAddress: createEmptyAddress(),
        sameAsPresentAddress: true,
        permanentAddress: createEmptyAddress(),
        password: '',
        attestConfirmed: false
    };
}
