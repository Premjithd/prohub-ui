export interface Pro {
    id: number;
    ProName: string;
    email: string;
    phoneNumber: string;
    businessName: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface RegisterProRequest {
    ProName: string;
    email: string;
    password: string;
    phoneNumber: string;
    businessName: string;
}
