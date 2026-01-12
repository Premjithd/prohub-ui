import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Job {
  id: number;
  userId: number;
  title: string;
  category: string;
  description: string;
  location: string;
  budget: string;
  timeline: string;
  attachments?: string;
  status: string;
  assignedProId?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateJobRequest {
  title: string;
  category: string;
  description: string;
  location: string;
  budget: string;
  timeline: string;
  attachments?: string;
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
    return this.http.get<Job[]>(`${this.apiUrl}/my-jobs`);
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
  updateJob(id: number, jobData: Partial<CreateJobRequest>): Observable<Job> {
    return this.http.put<Job>(`${this.apiUrl}/${id}`, jobData);
  }

  // Delete a job
  deleteJob(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Get jobs by category
  getJobsByCategory(category: string): Observable<Job[]> {
    return this.http.get<Job[]>(`${this.apiUrl}/category/${category}`);
  }
}
