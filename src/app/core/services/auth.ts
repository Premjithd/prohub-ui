import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api';
import { LoginResponse, ApiResponse } from '../models/api.model';
import { LoginRequest, RegisterUserRequest } from '../models/user.model';
import { RegisterProRequest } from '../models/pro.model';
import { StorageService } from './storage';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private readonly AUTH_TOKEN_KEY         = 'auth_token';
  private readonly REFRESH_TOKEN_KEY      = 'refresh_token';
  private readonly USER_TYPE_KEY          = 'user_type';
  private readonly USER_NAME_KEY          = 'user_name';
  private readonly USER_ID_KEY            = 'user_id';
  private readonly IS_PROFILE_COMPLETE_KEY = 'is_profile_complete';

  // Keys used to preserve admin session while impersonating
  private readonly ADMIN_TOKEN_KEY   = 'admin_restore_token';
  private readonly ADMIN_REFRESH_KEY = 'admin_restore_refresh_token';
  private readonly ADMIN_TYPE_KEY    = 'admin_restore_type';
  private readonly ADMIN_NAME_KEY    = 'admin_restore_name';
  private readonly ADMIN_ID_KEY      = 'admin_restore_id';

  constructor(
    private api: ApiService,
    private storage: StorageService
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.api.loginUser('auth/user/login', credentials).pipe(
      tap(response => { if (response) this.storeSession(response); })
    );
  }

  loginPro(credentials: LoginRequest): Observable<LoginResponse> {
    return this.api.loginUser('auth/pro/login', credentials).pipe(
      tap(response => { if (response) this.storeSession(response); })
    );
  }

  registerUser(userData: RegisterUserRequest): Observable<ApiResponse<void>> {
    return this.api.post<void>('auth/user/register', userData);
  }

  registerUserStep1(data: { FirstName: string; LastName: string; Email: string; Password: string; PhoneNumber: string }): Observable<{ userId: number }> {
    return this.api.postRaw<{ userId: number }>('auth/user/register/draft', data);
  }

  registerUserStep2(userId: number, data: any): Observable<LoginResponse> {
    return this.api.postRaw<LoginResponse>(`auth/user/register/complete/${userId}`, data).pipe(
      tap(response => { if (response) this.storeSession(response); })
    );
  }

  registerPro(proData: RegisterProRequest): Observable<ApiResponse<void>> {
    return this.api.post<void>('auth/pro/register', proData);
  }

  registerProStep1(data: { Name: string; Email: string; Password: string; PhoneNumber: string; BusinessName: string }): Observable<{ proId: number }> {
    return this.api.postRaw<{ proId: number }>('auth/pro/register/draft', data);
  }

  registerProStep2(proId: number, data: any): Observable<LoginResponse> {
    return this.api.postRaw<LoginResponse>(`auth/pro/register/complete/${proId}`, data).pipe(
      tap(response => { if (response) this.storeSession(response); })
    );
  }

  logout(): void {
    this.storage.removeItem(this.AUTH_TOKEN_KEY);
    this.storage.removeItem(this.REFRESH_TOKEN_KEY);
    this.storage.removeItem(this.USER_TYPE_KEY);
    this.storage.removeItem(this.USER_NAME_KEY);
    this.storage.removeItem(this.USER_ID_KEY);
    this.storage.removeItem(this.IS_PROFILE_COMPLETE_KEY);
    // Clear any stale impersonation state
    this.storage.removeItem(this.ADMIN_TOKEN_KEY);
    this.storage.removeItem(this.ADMIN_REFRESH_KEY);
    this.storage.removeItem(this.ADMIN_TYPE_KEY);
    this.storage.removeItem(this.ADMIN_NAME_KEY);
    this.storage.removeItem(this.ADMIN_ID_KEY);
  }

  logoutOnServer(): Observable<any> {
    const refreshToken = this.storage.getItem(this.REFRESH_TOKEN_KEY);
    return this.api.post<any>('auth/logout', refreshToken ? { refreshToken } : {});
  }

  isAuthenticated(): boolean {
    try {
      return !!this.storage.getItem(this.AUTH_TOKEN_KEY);
    } catch {
      return false;
    }
  }

  getName(): string | null {
    try {
      return this.storage.getItem(this.USER_NAME_KEY);
    } catch {
      return null;
    }
  }

  getUserId(): string | null {
    return this.storage.getItem(this.USER_ID_KEY);
  }

  getToken(): string | null {
    return this.storage.getItem(this.AUTH_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.storage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getUserType(): string | null {
    return this.storage.getItem(this.USER_TYPE_KEY);
  }

  acceptAdminInvitation(
    token: string,
    firstName: string,
    lastName: string,
    password: string
  ): Observable<LoginResponse> {
    return this.api.loginUser('auth/accept-admin-invite', { token, firstName, lastName, password }).pipe(
      tap(response => { if (response) this.storeSession(response); })
    );
  }

  startImpersonation(token: string, userId: number, userType: string, displayName: string): void {
    // Back up admin session (including refresh token)
    const curr = {
      token:   this.storage.getItem(this.AUTH_TOKEN_KEY),
      refresh: this.storage.getItem(this.REFRESH_TOKEN_KEY),
      type:    this.storage.getItem(this.USER_TYPE_KEY),
      name:    this.storage.getItem(this.USER_NAME_KEY),
      id:      this.storage.getItem(this.USER_ID_KEY),
    };
    if (curr.token)   this.storage.setItem(this.ADMIN_TOKEN_KEY,   curr.token);
    if (curr.refresh) this.storage.setItem(this.ADMIN_REFRESH_KEY, curr.refresh);
    if (curr.type)    this.storage.setItem(this.ADMIN_TYPE_KEY,    curr.type);
    if (curr.name)    this.storage.setItem(this.ADMIN_NAME_KEY,    curr.name);
    if (curr.id)      this.storage.setItem(this.ADMIN_ID_KEY,      curr.id);

    // Switch to impersonated user — no refresh token for impersonation sessions
    this.storage.setItem(this.AUTH_TOKEN_KEY, token);
    this.storage.setItem(this.USER_TYPE_KEY,  userType);
    this.storage.setItem(this.USER_NAME_KEY,  displayName);
    this.storage.setItem(this.USER_ID_KEY,    userId.toString());
    this.storage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  exitImpersonation(): void {
    const adminToken = this.storage.getItem(this.ADMIN_TOKEN_KEY);
    if (!adminToken) return;

    this.storage.setItem(this.AUTH_TOKEN_KEY, adminToken);
    this.storage.setItem(this.USER_TYPE_KEY,  this.storage.getItem(this.ADMIN_TYPE_KEY) ?? 'Admin');
    this.storage.setItem(this.USER_NAME_KEY,  this.storage.getItem(this.ADMIN_NAME_KEY) ?? '');
    this.storage.setItem(this.USER_ID_KEY,    this.storage.getItem(this.ADMIN_ID_KEY)   ?? '');

    const adminRefresh = this.storage.getItem(this.ADMIN_REFRESH_KEY);
    if (adminRefresh) this.storage.setItem(this.REFRESH_TOKEN_KEY, adminRefresh);
    else this.storage.removeItem(this.REFRESH_TOKEN_KEY);

    this.storage.removeItem(this.ADMIN_TOKEN_KEY);
    this.storage.removeItem(this.ADMIN_REFRESH_KEY);
    this.storage.removeItem(this.ADMIN_TYPE_KEY);
    this.storage.removeItem(this.ADMIN_NAME_KEY);
    this.storage.removeItem(this.ADMIN_ID_KEY);
  }

  isImpersonating(): boolean {
    return !!this.storage.getItem(this.ADMIN_TOKEN_KEY);
  }

  isProfileComplete(): boolean {
    return this.storage.getItem(this.IS_PROFILE_COMPLETE_KEY) !== 'false';
  }

  private storeSession(response: LoginResponse): void {
    this.storage.setItem(this.AUTH_TOKEN_KEY, response.token);
    this.storage.setItem(this.USER_TYPE_KEY,  response.role);
    this.storage.setItem(this.USER_NAME_KEY,  response.firstName);
    this.storage.setItem(this.USER_ID_KEY,    response.id?.toString() ?? '');
    if (response.refreshToken) {
      this.storage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    }
    if (response.isProfileComplete === false) {
      this.storage.setItem(this.IS_PROFILE_COMPLETE_KEY, 'false');
    } else {
      this.storage.removeItem(this.IS_PROFILE_COMPLETE_KEY);
    }
  }
}
