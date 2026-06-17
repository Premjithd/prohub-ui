import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BannerStatus {
  enabled: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class BannerService {
  constructor(private http: HttpClient) {}

  /** Announcement banner state, controlled from appsettings (Banner:Enabled / Banner:Message). */
  getBanner(): Observable<BannerStatus> {
    return this.http.get<BannerStatus>(`${environment.apiUrl}/banner`);
  }
}
