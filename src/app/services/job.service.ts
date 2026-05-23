import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface JobPhase {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface Job {
  id: number;
  userId: number;
  title: string;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
    description?: string;
    icon?: string;
  };
  description: string;
  location: string;
  budget: string;
  estimatedBudget?: number;
  timeline: string;
  attachments?: string;
  status: string;
  isBid?: boolean;  // True if job has received at least one bid
  assignedProId?: number;
  jobPhases?: JobPhase[] | string;  // JSON array of phases or string
  createdAt: string;
  updatedAt?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  // Phase 1A: Structured Address Fields
  serviceAddressHouse?: string;
  serviceAddressStreet1?: string;
  serviceAddressStreet2?: string;
  serviceAddressCity?: string;
  serviceAddressState?: string;
  serviceAddressCountry?: string;
  serviceAddressPIN?: string;
  // Contact Person Fields
  contactPersonName?: string;
  contactPersonPhone?: string;
  // Geolocation
  latitude?: number;
  longitude?: number;
  distanceKm?: number | null;
  user?: {
    id: number;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
  };
  assignedPro?: {
    id: number;
    firstName?: string;
    lastName?: string;
    proName?: string;
    businessName?: string;
    email?: string;
    phoneNumber?: string;
  };
}

export interface CreateJobRequest {
  title: string;
  categoryId?: number;
  description: string;
  location: string;
  budget: string;
  timeline: string;
  attachments?: string;
}

export interface JobBid {
  id: number;
  jobId: number;
  proId: number;
  bidMessage?: string;
  bidAmount?: number;
  quotedPrice?: number;
  commenceDate?: string | Date;
  expectedDurationDays?: number;
  materialsDescription?: string;
  expiresAt?: string | Date;
  status: string;
  createdAt: string;
  updatedAt?: string;
  isMessageExchange?: boolean;
  pro?: {
    id: number;
    proName?: string;
    businessName?: string;
    phoneNumber?: string;
    email?: string;
  };
}

export interface CreateJobBidRequest {
  bidMessage?: string;
  bidAmount?: number;
  quotedPrice?: number;
  commenceDate?: Date;
  expectedDurationDays?: number;
  materialsDescription?: string;
  expiresAt?: Date;
  message?: string;
}

export interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  senderType: string;  // "User" or "Pro"
  content: string;
  sentAt: string;
  isRead: boolean;
  readAt?: string;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AvailableJobsResult extends PagedResult<Job> {
  proximityFilterApplied: boolean;
  proLocationSet: boolean;
  radiusKm: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private apiUrl = `${environment.apiUrl}/jobs`;

  constructor(private http: HttpClient) {}

  private unwrapPagedResult<T>(response: any, page: number, pageSize: number): PagedResult<T> {
    const raw = response?.items;
    const items: T[] = Array.isArray(raw) ? raw : (raw?.$values ?? []);
    return { items, total: response?.total ?? 0, page: response?.page ?? page, pageSize: response?.pageSize ?? pageSize };
  }

  // Get all jobs posted by the current user (paginated)
  getMyJobs(page = 1, pageSize = 20, status?: string): Observable<PagedResult<Job>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${this.apiUrl}/my-jobs`, { params }).pipe(
      map(r => this.unwrapPagedResult<Job>(r, page, pageSize))
    );
  }

  // Get a specific job by ID
  getJob(id: number): Observable<Job> {
    return this.http.get<Job>(`${this.apiUrl}/${id}`);
  }

  // Create a new job
  createJob(jobData: CreateJobRequest): Observable<Job> {
    return this.http.post<Job>(this.apiUrl, jobData);
  }

  // Update an existing job
  updateJob(id: number, jobData: any): Observable<Job> {
    // Ensure id is included in the request body
    const dataWithId = { ...jobData, id };
    return this.http.put<Job>(`${this.apiUrl}/${id}`, dataWithId);
  }

  // Delete a job
  deleteJob(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Get jobs by category
  getJobsByCategory(category: string): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.apiUrl}/category/${category}`);
  }

  // Get available jobs (paginated, proximity-aware)
  getAvailableJobs(page = 1, pageSize = 20, categoryId?: number | null, filterRadiusKm?: number | null, search?: string): Observable<AvailableJobsResult> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (filterRadiusKm != null) params = params.set('filterRadiusKm', filterRadiusKm);
    if (categoryId) params = params.set('categoryId', categoryId);
    if (search) params = params.set('search', search);
    return this.http.get<any>(`${this.apiUrl}/available`, { params }).pipe(
      map(r => ({
        ...this.unwrapPagedResult<Job>(r, page, pageSize),
        proximityFilterApplied: r?.proximityFilterApplied ?? false,
        proLocationSet: r?.proLocationSet ?? false,
        radiusKm: r?.radiusKm ?? null
      }))
    );
  }

  // Submit a bid for a job
  submitJobBid(jobId: number, bidData: CreateJobBidRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/bid`, bidData);
  }

  // Get bids for a specific job
  getJobBids(jobId: number): Observable<JobBid[]> {
    return this.http.get<any>(`${this.apiUrl}/${jobId}/bids`).pipe(
      map(response => {
        // Handle wrapped response format with $values property (from ReferenceHandler.Preserve)
        if (response && response.$values && Array.isArray(response.$values)) {
          return response.$values;
        }
        // Handle direct array response
        if (Array.isArray(response)) {
          return response;
        }
        // Handle response.data wrapped format
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        // Return empty array if format not recognized
        return [];
      })
    );
  }

  // Accept a bid
  acceptBid(jobId: number, bidId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/bids/${bidId}/accept`, {});
  }

  // Reject a bid
  rejectBid(jobId: number, bidId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/bids/${bidId}/reject`, {});
  }

  // Withdraw a bid (Pro only, Pending bids only)
  withdrawBid(jobId: number, bidId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/bids/${bidId}/withdraw`, {});
  }

  // Cancel a job (User only, Open/Pending status)
  cancelJob(jobId: number, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/cancel`, { reason: reason ?? null });
  }

  // Get jobs assigned to the current Pro
  getAssignedJobs(): Observable<Job[]> {
    return this.http.get<any>(`${this.apiUrl}/assigned`).pipe(
      map(response => {
        // Handle wrapped response format with $values property (from ReferenceHandler.Preserve)
        if (response && response.$values && Array.isArray(response.$values)) {
          return response.$values;
        }
        // Handle direct array response
        if (Array.isArray(response)) {
          return response;
        }
        // Handle response.data wrapped format
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        // Return empty array if format not recognized
        return [];
      })
    );
  }

  // Mark a job as completed (Pro submits — awaits consumer verification)
  markJobCompleted(jobId: number, notes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${jobId}/complete`, { completionNotes: notes ?? null });
  }

  // Consumer verifies the pro's completion
  verifyJobCompletion(jobId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/completion/verify`, {});
  }

  // Consumer disputes the pro's completion
  disputeJobCompletion(jobId: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/completion/dispute`, { reason });
  }

  // Update job phases
  updateJobPhases(jobId: number, phases: JobPhase[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/${jobId}/phases`, { jobPhases: phases });
  }

  // Toggle phase completion
  togglePhaseCompletion(jobId: number, phaseId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/phases/${phaseId}/toggle`, {});
  }

  // Get messages for a job
  getJobMessages(jobId: number): Observable<Message[]> {
    return this.http.get<any>(`${environment.apiUrl}/messages/job/${jobId}`).pipe(
      map(response => {
        // Handle wrapped response format
        if (response && response.$values && Array.isArray(response.$values)) {
          return response.$values;
        }
        // Handle direct array response
        if (Array.isArray(response)) {
          return response;
        }
        // Handle response.data wrapped format
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        // Return empty array if format not recognized
        return [];
      })
    );
  }

  // Send a message and refresh chat history
  sendMessage(jobId: number, message: { content: string }, recipientId?: number): Observable<Message[]> {
    const payload = recipientId ? { ...message, recipientId } : message;
    return this.http.post<Message>(`${environment.apiUrl}/messages/job/${jobId}`, payload).pipe(
      // After sending, fetch the updated message list
      switchMap(() => this.getJobMessages(jobId))
    );
  }

  // Send a message to a bid professional
  sendMessageToBid(bidId: number, message: { content: string }): Observable<Message> {
    return this.http.post<Message>(`${environment.apiUrl}/messages/bid/${bidId}`, message);
  }

  // Get all messages for the current user
  getAllMessages(): Observable<Message[]> {
    return this.http.get<any>(`${environment.apiUrl}/messages`).pipe(
      map(response => {
        // Handle wrapped response format
        if (response && response.$values && Array.isArray(response.$values)) {
          return response.$values;
        }
        // Handle direct array response
        if (Array.isArray(response)) {
          return response;
        }
        // Handle response.data wrapped format
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        // Return empty array if format not recognized
        return [];
      })
    );
  }

  // Get conversation partners (paginated)
  getConversationPartners(userType: string, page = 1, pageSize = 20): Observable<PagedResult<any>> {
    const params = new HttpParams().set('userType', userType).set('page', page).set('pageSize', pageSize);
    return this.http.get<any>(`${environment.apiUrl}/messages/conversations`, { params }).pipe(
      map(r => this.unwrapPagedResult<any>(r, page, pageSize))
    );
  }

  // Get messages with a specific user (not job-related)
  getMessagesWithUser(userId: number): Observable<Message[]> {
    return this.http.get<any>(`${environment.apiUrl}/messages/user/${userId}`).pipe(
      map(response => {
        // Handle wrapped response format
        if (response && response.$values && Array.isArray(response.$values)) {
          return response.$values;
        }
        // Handle direct array response
        if (Array.isArray(response)) {
          return response;
        }
        // Handle response.data wrapped format
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        // Return empty array if format not recognized
        return [];
      })
    );
  }

  // Send a direct message to another user
  sendDirectMessage(message: Message): Observable<Message> {
    return this.http.post<Message>(`${environment.apiUrl}/messages/send`, {
      recipientId: message.recipientId,
      senderType: message.senderType,
      content: message.content
    });
  }

  // Mark a message as read
  markMessageAsRead(messageId: number): Observable<any> {
    return this.http.put(`${environment.apiUrl}/messages/${messageId}/read`, {});
  }}