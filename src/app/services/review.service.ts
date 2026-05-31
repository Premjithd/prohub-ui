import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Review, ProRatingSummary, PlatformRatingStats, UserReview, UserRatingSummary } from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly base = `${environment.apiUrl}/reviews`;

  constructor(private http: HttpClient) {}

  submitReview(jobId: number, rating: number, comment?: string): Observable<Review> {
    return this.http.post<Review>(`${this.base}/jobs/${jobId}`, { rating, comment });
  }

  getJobReview(jobId: number): Observable<Review> {
    return this.http.get<Review>(`${this.base}/jobs/${jobId}`);
  }

  getProReviews(proId: number, page = 1, pageSize = 10): Observable<{ reviews: Review[]; total: number }> {
    return this.http.get<{ reviews: Review[]; total: number }>(
      `${this.base}/pros/${proId}`, { params: { page, pageSize } }
    );
  }

  getProRatingSummary(proId: number): Observable<ProRatingSummary> {
    return this.http.get<ProRatingSummary>(`${this.base}/pros/${proId}/summary`);
  }

  getPlatformStats(): Observable<PlatformRatingStats> {
    return this.http.get<PlatformRatingStats>(`${this.base}/stats`);
  }

  submitUserReview(jobId: number, rating: number, comment?: string): Observable<UserReview> {
    return this.http.post<UserReview>(`${this.base}/jobs/${jobId}/user`, { rating, comment });
  }

  getJobUserReview(jobId: number): Observable<UserReview> {
    return this.http.get<UserReview>(`${this.base}/jobs/${jobId}/user`);
  }

  getUserReviews(userId: number, page = 1, pageSize = 10): Observable<{ reviews: UserReview[]; total: number }> {
    return this.http.get<{ reviews: UserReview[]; total: number }>(
      `${this.base}/users/${userId}`, { params: { page, pageSize } }
    );
  }

  getUserRatingSummary(userId: number): Observable<UserRatingSummary> {
    return this.http.get<UserRatingSummary>(`${this.base}/users/${userId}/summary`);
  }
}
