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
}
