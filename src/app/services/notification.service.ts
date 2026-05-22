import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JobNotification {
  id: number;
  jobId: number;
  proId: number;
  notificationType: string;
  message: string;
  isRead: boolean;
  deliveryStatus: string;
  createdAt: string;
  readAt: string | null;
  job?: { id: number; title: string; status: string };
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly base = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getNotifications(unreadOnly = false, page = 1, pageSize = 20): Observable<{ total: number; notifications: JobNotification[] }> {
    return this.http.get<any>(`${this.base}?unreadOnly=${unreadOnly}&page=${page}&pageSize=${pageSize}`);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/unread-count`);
  }

  markRead(id: number): Observable<any> {
    return this.http.put(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<any> {
    return this.http.put(`${this.base}/read-all`, {});
  }
}
