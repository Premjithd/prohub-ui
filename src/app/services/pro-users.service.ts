import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LinkedUser {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

export interface LinkedPro {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  businessName: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProUsersService {
  private readonly base = `${environment.apiUrl}/prousers`;

  constructor(private http: HttpClient) {}

  getUsersUnderPro(proId: number): Observable<LinkedUser[]> {
    return this.http.get<LinkedUser[]>(`${this.base}/pro/${proId}/users`);
  }

  addUserToPro(proId: number, userId: number): Observable<any> {
    return this.http.post(`${this.base}/pro/${proId}/users`, { userId });
  }

  removeUserFromPro(proId: number, userId: number): Observable<any> {
    return this.http.delete(`${this.base}/pro/${proId}/users/${userId}`);
  }

  getProsForUser(userId: number): Observable<LinkedPro[]> {
    return this.http.get<LinkedPro[]>(`${this.base}/user/${userId}/pros`);
  }
}
