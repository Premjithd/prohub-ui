import { Injectable } from '@angular/core';
import { Observable, tap, map } from 'rxjs';
import { ApiService } from './api';
import { LoginResponse, ApiResponse, GetUserResponse } from '../models/api.model';
import { LoginRequest, GetUserRequest, User } from '../models/user.model';
import { RegisterProRequest } from '../models/pro.model';
import { StorageService } from './storage';

@Injectable({
  providedIn: 'root'
})

export class UserService {

  constructor(
    private api: ApiService,
    private storage: StorageService
  ) {}


  getUser(userId: Number): Observable<GetUserResponse> {
    return this.api.getUserById(`users/${userId}`);
  }

  updateUser(userData: any): Observable<ApiResponse<User>> {
    return this.api.put<User>(`users/${userData.id}`, userData);
  }
}
