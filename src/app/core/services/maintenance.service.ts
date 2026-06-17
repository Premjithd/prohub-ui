import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MaintenanceStatus {
  enabled: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  constructor(private http: HttpClient) {}

  /** Always reachable, even while maintenance is on (the endpoint is allow-listed server-side). */
  getStatus(): Observable<MaintenanceStatus> {
    return this.http.get<MaintenanceStatus>(`${environment.apiUrl}/maintenance/status`);
  }
}
