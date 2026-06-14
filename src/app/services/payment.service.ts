import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Payment, PaymentOrder, CreatePaymentRequest, VerifyPaymentRequest, RateSplit,
         PaymentSummary, CreatePaymentRequestRequest } from '../models/payment.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  /**
   * Create a payment order for a job bid
   * @param request Create payment request with jobId, bidId, and amount
   * @returns Razorpay order details for checkout
   */
  createPaymentOrder(request: CreatePaymentRequest): Observable<PaymentOrder> {
    return this.http.post<PaymentOrder>(`${this.apiUrl}/create-order`, request);
  }

  /**
   * Verify payment after Razorpay checkout
   * @param request Verify payment request with Razorpay order, payment, and signature
   * @returns Payment verification response with updated job status
   */
  verifyPayment(request: VerifyPaymentRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify`, request);
  }

  /**
   * Get payment status for a specific job
   * @param jobId The job ID
   * @returns Payment details
   */
  getPaymentByJob(jobId: number): Observable<Payment> {
    return this.http.get<Payment>(`${this.apiUrl}/job/${jobId}`);
  }

  /**
   * Get the full payment summary for a job (agreed total, paid, remaining, history, active request).
   * Accessible to the job owner (consumer) and the assigned pro.
   */
  getPaymentSummary(jobId: number): Observable<PaymentSummary> {
    return this.http.get<PaymentSummary>(`${this.apiUrl}/job/${jobId}/summary`);
  }

  /**
   * Assigned Pro raises a payment request (None/Partial/Full). Returns the refreshed summary.
   */
  createPaymentRequest(body: CreatePaymentRequestRequest): Observable<PaymentSummary> {
    return this.http.post<PaymentSummary>(`${this.apiUrl}/request`, body);
  }

  /**
   * Pro cancels their pending payment request. Returns the refreshed summary.
   */
  cancelPaymentRequest(requestId: number): Observable<PaymentSummary> {
    return this.http.post<PaymentSummary>(`${this.apiUrl}/request/${requestId}/cancel`, {});
  }

  /**
   * Request refund for a completed payment
   * @param paymentId The payment ID to refund
   * @param reason Optional refund reason
   * @returns Refund processing response
   */
  requestRefund(paymentId: number, reason?: string): Observable<any> {
    const body = { reason: reason || 'Consumer requested refund' };
    return this.http.post<any>(`${this.apiUrl}/${paymentId}/refund`, body);
  }
}
