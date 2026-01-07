import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api';
import { ApiResponse } from '../models/api.model';
import { SendVerificationCodeRequest, VerifyCodeRequest } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class VerificationService {
  constructor(private api: ApiService
  ) {}

  sendEmailVerificationCode(request: SendVerificationCodeRequest): Observable<ApiResponse<void>> {
    return this.api.post<void>('verification/send-email-code', request);
  }

  sendPhoneVerificationCode(request: SendVerificationCodeRequest): Observable<ApiResponse<void>> {
    return this.api.post<void>('verification/send-phone-code', request);
  }

  verifyEmailCode(request: VerifyCodeRequest): Observable<ApiResponse<void>> {
    return this.api.post<void>('verification/verify-email', request);
  }

  verifyPhoneCode(request: VerifyCodeRequest): Observable<ApiResponse<void>> {
    return this.api.post<void>('verification/verify-phone', request);
  }
}
