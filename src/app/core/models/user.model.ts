export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    userType: string;
    createdAt: Date;
    updatedAt: Date;
    houseNameNumber?: string;
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    country?: string;
    zipPostalCode?: string;
    latitude?: number;
    longitude?: number;
    upiVpa?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber: string;
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

export interface GetUserRequest {
    id: number;
}