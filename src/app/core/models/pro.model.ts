export interface Pro {
    id: number;
    proName: string;
    email: string;
    phoneNumber: string;
    businessName: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    houseNameNumber?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    country?: string;
    zipPostalCode?: string;
    serviceRadiusKm?: number;
    latitude?: number;
    longitude?: number;
    payoutMethod?: string;
    bankAccountHolderName?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    upiVpa?: string;
}

export interface ProBankDetails {
    payoutMethod?: string;
    bankAccountHolderName?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    upiVpa?: string;
    hasBankDetails: boolean;
}

export interface UpdateBankDetailsRequest {
    payoutMethod: string;
    bankAccountHolderName?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    upiVpa?: string;
}

export interface RegisterProRequest {
    Name: string;
    Email: string;
    Password: string;
    PhoneNumber: string;
    BusinessName: string;
    houseNameNumber?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    country?: string;
    zipPostalCode?: string;
    latitude?: number | null;
    longitude?: number | null;
}
