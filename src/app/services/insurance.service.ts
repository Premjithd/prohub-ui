import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InsuranceOption {
  coverageType: string;        // "basic" | "premium" | "comprehensive"
  description: string;
  premiumAmount: number;
  coverageAmount: number;
  coverageDaysAfterCompletion: number;
}

export interface InsuranceOptionsResponse {
  provider: string;
  amount: number;
  options: InsuranceOption[];
}

export interface JobInsurance {
  id: number;
  jobId: number;
  providerId?: string;
  coverageType?: string;
  amount: number;
  status?: string;             // "Pending" | "Active" | "Claimed" | ...
  policyNumber?: string;
  createdAt: string;
  expiresAt?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class InsuranceService {
  private base = `${environment.apiUrl}/jobs`;

  constructor(private http: HttpClient) {}

  /** Coverage tiers available for a job (priced off its estimated budget). */
  getOptions(jobId: number): Observable<InsuranceOptionsResponse> {
    return this.http.get<InsuranceOptionsResponse>(`${this.base}/${jobId}/insurance/options`);
  }

  /** Existing insurance record for a job, or 404 if none. */
  getInsurance(jobId: number): Observable<JobInsurance> {
    return this.http.get<JobInsurance>(`${this.base}/${jobId}/insurance`);
  }

  /** Activate a coverage tier for a job (job owner only). */
  purchase(jobId: number, coverageType: string): Observable<{ message: string; insurance: JobInsurance; premium: number }> {
    return this.http.post<{ message: string; insurance: JobInsurance; premium: number }>(
      `${this.base}/${jobId}/insurance/purchase`, { coverageType });
  }
}
