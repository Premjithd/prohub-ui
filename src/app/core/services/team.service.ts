import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TeamMember {
  id: number;
  name: string;
  role?: string | null;
  bio?: string | null;
  initials?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private base = `${environment.apiUrl}/team`;

  constructor(private http: HttpClient) {}

  /** Public: active team members for the /about page. */
  getPublic(): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(this.base);
  }

  /** Admin: all members (including inactive). */
  getAll(): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(`${this.base}/all`);
  }

  create(req: Partial<TeamMember>): Observable<TeamMember> {
    return this.http.post<TeamMember>(this.base, req);
  }

  update(id: number, req: Partial<TeamMember>): Observable<TeamMember> {
    return this.http.put<TeamMember>(`${this.base}/${id}`, req);
  }

  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
