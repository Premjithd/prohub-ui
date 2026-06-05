import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Payout } from '../models/payout.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PayoutService {
  private apiUrl = `${environment.apiUrl}/payouts`;

  constructor(private http: HttpClient) {}

  getMyPayouts(): Observable<Payout[]> {
    return this.http.get<Payout[]>(this.apiUrl);
  }

  getAdminPayouts(proId?: number, status?: string): Observable<Payout[]> {
    const params: Record<string, string> = {};
    if (proId) params['proId'] = proId.toString();
    if (status) params['status'] = status;
    return this.http.get<Payout[]>(`${this.apiUrl}/admin`, { params });
  }

  retryPayout(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/retry`, {});
  }
}
