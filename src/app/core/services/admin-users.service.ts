import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';
import { Pro } from '../models/pro.model';

export interface Job {
  id: number;
  userId: number;
  userName?: string;
  title: string;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
  };
  description: string;
  location: string;
  budget: string;
  timeline: string;
  status: string;
  isBid?: boolean;
  assignedProId?: number;
  assignedProBusinessName?: string;
  jobPhases?: string;
  attachments?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ImpersonationData {
  token: string;
  userId: number;
  userType: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Search for users by email or name
  searchUsers(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/users/search`, {
      params: { query }
    });
  }

  // Search for pros by email or name
  searchPros(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/pros/search`, {
      params: { query }
    });
  }

  // Get user details
  getUserDetails(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${userId}`);
  }

  // Get pro details
  getProDetails(proId: number): Observable<Pro> {
    return this.http.get<Pro>(`${this.apiUrl}/pros/${proId}`);
  }

  // Get user's job history
  getUserJobs(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/jobs/users/${userId}/jobs`);
  }

  // Get pro's job history
  getProJobs(proId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/jobs/pros/${proId}/jobs`);
  }

  // Get user's messages/conversations
  getUserConversations(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/messages/conversations`, {
      params: { userId: userId.toString(), userType: 'User' }
    });
  }

  // Get pro's messages/conversations
  getProConversations(proId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/messages/conversations`, {
      params: { userId: proId.toString(), userType: 'Pro' }
    });
  }

  // Get messages for a specific conversation
  getMessages(userId1: number, userType1: string, userId2: number, userType2: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/messages`, {
      params: { 
        userId1: userId1.toString(),
        userType1: userType1,
        userId2: userId2.toString(),
        userType2: userType2
      }
    });
  }

  // Impersonate as a user
  impersonateUser(userId: number, userType: string): Observable<ImpersonationData> {
    return this.http.post<ImpersonationData>(`${this.apiUrl}/admin/impersonate`, {
      targetUserId: userId,
      targetUserType: userType
    });
  }

  // Invite a new admin
  inviteAdmin(email: string): Observable<any> {
    console.log('inviteAdmin service called with email:', email);
    const body = { email: email };
    console.log('Sending request body:', body);
    return this.http.post(`${this.apiUrl}/admin/invite`, body);
  }

  // Get admin invitations
  getAdminInvitations(pendingOnly: boolean = true): Observable<any> {
    return this.http.get(`${this.apiUrl}/admin/invitations`, {
      params: { pendingOnly: pendingOnly.toString() }
    });
  }

  // Resend admin invitation
  resendAdminInvitation(invitationId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/invitations/${invitationId}/resend`, {});
  }

  createUser(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/users`, payload);
  }

  createPro(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/pros`, payload);
  }

  geocodeBackfillPros(): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/pros/geocode-backfill`, {});
  }

  geocodeBackfillUsers(): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/users/geocode-backfill`, {});
  }

  updateProServiceRadius(proId: number, serviceRadiusKm: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/pros/${proId}/service-radius`, { serviceRadiusKm });
  }
}
