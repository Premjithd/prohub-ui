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
  private readonly AUTH_TOKEN_KEY = 'auth_token';
  private readonly USER_TYPE_KEY = 'user_type';
  private readonly USER_NAME_KEY = 'user_name';
  private readonly USER_ID_KEY = 'user_id';

  // Keys used to preserve admin session while impersonating
  private readonly ADMIN_TOKEN_KEY = 'admin_restore_token';
  private readonly ADMIN_TYPE_KEY = 'admin_restore_type';
  private readonly ADMIN_NAME_KEY = 'admin_restore_name';
  private readonly ADMIN_ID_KEY = 'admin_restore_id';

  constructor(
    private api: ApiService,
    private storage: StorageService
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.api.loginUser('auth/user/login', credentials).pipe(
      tap(response => {
        if (response) {
          this.storage.setItem(this.AUTH_TOKEN_KEY, response.token);
          this.storage.setItem(this.USER_TYPE_KEY, response.role);
          this.storage.setItem(this.USER_NAME_KEY, response.firstName);
          this.storage.setItem(this.USER_ID_KEY, response?.id?.toString() || '');
        }
      })
    );
  }

  loginPro(credentials: LoginRequest): Observable<LoginResponse> {
    return this.api.loginUser('auth/pro/login', credentials).pipe(
      tap(response => {
        if (response) {
          this.storage.setItem(this.AUTH_TOKEN_KEY, response.token);
          this.storage.setItem(this.USER_TYPE_KEY, response.role);
          this.storage.setItem(this.USER_NAME_KEY, response.firstName);
          this.storage.setItem(this.USER_ID_KEY, response?.id?.toString() || '');
        }
      })
    );
  }

  registerUser(userData: RegisterUserRequest): Observable<ApiResponse<void>> {
    return this.api.post<void>('auth/user/register', userData);
  }

  registerPro(proData: RegisterProRequest): Observable<ApiResponse<void>> {
    return this.api.post<void>('auth/pro/register', proData);
  }

  logout(): void {
    this.storage.removeItem(this.AUTH_TOKEN_KEY);
    this.storage.removeItem(this.USER_TYPE_KEY);
    this.storage.removeItem(this.USER_NAME_KEY);
    this.storage.removeItem(this.USER_ID_KEY);
  }

  logoutOnServer(): Observable<any> {
    return this.api.post<any>('auth/logout', {});
  }

  isAuthenticated(): boolean {
    try {
      return !!this.storage.getItem(this.AUTH_TOKEN_KEY);
    } catch {
      console.log('Error accessing AUTH_TOKEN_KEY');
      return false;
    }
  }

  getName(): string | null {
    try {
      return this.storage.getItem(this.USER_NAME_KEY);
    } catch {
      console.log('Error accessing USER_NAME_KEY');
      return "null";
    }
  }

  getUserId(): string | null {
    return this.storage.getItem(this.USER_ID_KEY);
  }

  getToken(): string | null {
    return this.storage.getItem(this.AUTH_TOKEN_KEY);
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
    const payload = {
      token,
      firstName,
      lastName,
      password
    };

    return this.api.loginUser('auth/accept-admin-invite', payload).pipe(
      tap(response => {
        if (response) {
          this.storage.setItem(this.AUTH_TOKEN_KEY, response.token);
          this.storage.setItem(this.USER_TYPE_KEY, response.role);
          this.storage.setItem(this.USER_NAME_KEY, response.firstName);
          this.storage.setItem(this.USER_ID_KEY, response?.id?.toString() || '');
        }
      })
    );
  }

  startImpersonation(token: string, userId: number, userType: string, displayName: string): void {
    // Save current admin session so we can restore it later
    const currentToken = this.storage.getItem(this.AUTH_TOKEN_KEY);
    const currentType  = this.storage.getItem(this.USER_TYPE_KEY);
    const currentName  = this.storage.getItem(this.USER_NAME_KEY);
    const currentId    = this.storage.getItem(this.USER_ID_KEY);
    if (currentToken) this.storage.setItem(this.ADMIN_TOKEN_KEY, currentToken);
    if (currentType)  this.storage.setItem(this.ADMIN_TYPE_KEY,  currentType);
    if (currentName)  this.storage.setItem(this.ADMIN_NAME_KEY,  currentName);
    if (currentId)    this.storage.setItem(this.ADMIN_ID_KEY,    currentId);

    // Switch to impersonated user
    this.storage.setItem(this.AUTH_TOKEN_KEY, token);
    this.storage.setItem(this.USER_TYPE_KEY,  userType);
    this.storage.setItem(this.USER_NAME_KEY,  displayName);
    this.storage.setItem(this.USER_ID_KEY,    userId.toString());
  }

  exitImpersonation(): void {
    const adminToken = this.storage.getItem(this.ADMIN_TOKEN_KEY);
    if (!adminToken) return;

    this.storage.setItem(this.AUTH_TOKEN_KEY, adminToken);
    this.storage.setItem(this.USER_TYPE_KEY,  this.storage.getItem(this.ADMIN_TYPE_KEY) ?? 'Admin');
    this.storage.setItem(this.USER_NAME_KEY,  this.storage.getItem(this.ADMIN_NAME_KEY) ?? '');
    this.storage.setItem(this.USER_ID_KEY,    this.storage.getItem(this.ADMIN_ID_KEY)   ?? '');

    this.storage.removeItem(this.ADMIN_TOKEN_KEY);
    this.storage.removeItem(this.ADMIN_TYPE_KEY);
    this.storage.removeItem(this.ADMIN_NAME_KEY);
    this.storage.removeItem(this.ADMIN_ID_KEY);
  }

  isImpersonating(): boolean {
    return !!this.storage.getItem(this.ADMIN_TOKEN_KEY);
  }
}
