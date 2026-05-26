import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VerificationService {
  private apiUrl = `${environment.apiUrl}/verification`;

  constructor(private http: HttpClient) {}

  sendEmailCode(contact: string, userType: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-email-code`, { contact, userType });
  }

  verifyEmail(contact: string, code: string, userType: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-email`, { contact, code, userType });
  }
}
