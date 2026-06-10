import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface KycStatus {
  kycStatus: 'None' | 'Submitted' | 'Approved' | 'Rejected';
  kycSubmittedAt: string | null;
  aadhaarUploaded: boolean;
  panUploaded: boolean;
  aadhaarUrl: string | null;
  panUrl: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class KycService {
  private apiUrl = `${environment.apiUrl}/kyc`;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<KycStatus> {
    return this.http.get<KycStatus>(`${this.apiUrl}/status`);
  }

  uploadAadhaar(file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.apiUrl}/upload/aadhaar`, form);
  }

  uploadPan(file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.apiUrl}/upload/pan`, form);
  }

  submitKyc(): Observable<any> {
    return this.http.post(`${this.apiUrl}/submit`, {});
  }
}
