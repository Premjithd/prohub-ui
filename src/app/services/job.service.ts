import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';import { map, switchMap } from 'rxjs/operators';import { environment } from '../../environments/environment';

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
  timeline: string;
  attachments?: string;
  status: string;
  isBid?: boolean;  // True if job has received at least one bid
  assignedProId?: number;
  jobPhases?: JobPhase[] | string;  // JSON array of phases or string
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: number;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
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
  status: string;
  createdAt: string;
  updatedAt?: string;
  pro?: {
    id: number;
    proName?: string;
    businessName?: string;
    phoneNumber?: string;
    email?: string;
  };
}

export interface Message {
  id: number;
  jobId: number;
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

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private apiUrl = `${environment.apiUrl}/jobs`;

  constructor(private http: HttpClient) {}

  // Get all jobs posted by the current user
  getMyJobs(): Observable<Job[]> {
    return this.http.get<any>(`${this.apiUrl}/my-jobs`).pipe(
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

  // Get all available jobs (not assigned to any pro)
  getAvailableJobs(): Observable<Job[]> {
    return this.http.get<any>(`${this.apiUrl}/available`).pipe(
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

  // Submit a bid for a job
  submitJobBid(jobId: number, bidData: { bidMessage?: string; bidAmount?: number }): Observable<any> {
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

  // Mark a job as completed
  markJobCompleted(jobId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${jobId}/complete`, {});
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
}
