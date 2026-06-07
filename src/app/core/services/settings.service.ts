import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSetting(key: string): Observable<string | null> {
    return this.http.get<{ key: string; value: string }>(`${this.baseUrl}/settings/${key}`).pipe(
      map(r => r.value),
      catchError(() => of(null))
    );
  }

  updateSetting(key: string, value: string): Observable<{ key: string; value: string }> {
    return this.http.put<{ key: string; value: string }>(`${this.baseUrl}/settings/${key}`, { value });
  }
}
