export interface SendVerificationCodeRequest {
    contact: string;
    userType: string;
}

export interface VerifyCodeRequest {
    contact: string;
    code: string;
    userType: string;
}

export interface ApiResponse<T> {
    data?: T;
    message?: string;
    error?: string;
}

export interface LoginResponse {
    token: string;
    email: string;
    id?: number;
    firstName: string;
    lastName: string;
    userType: string;
    role: string;
}

export interface GetUserResponse {
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
}