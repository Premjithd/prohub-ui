import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaymentMethod {
  id: number;
  type: 'UPI' | 'Bank';
  label: string | null;
  isDefault: boolean;
  upiVpa: string | null;
  bankAccountHolderName: string | null;
  bankAccountNumber: string | null; // masked: "****1234"
  bankIfsc: string | null;
  createdAt: string;
  ownerType: 'User' | 'Pro' | 'Business';
}

export interface CheckoutContext {
  paymentMethods: PaymentMethod[];
  billingAddress: {
    id: number;
    houseNameNumber: string | null;
    street1: string | null;
    street2: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    country: string | null;
    zipPostalCode: string | null;
  } | null;
}

export interface PaymentMethodRequest {
  type: 'UPI' | 'Bank';
  label?: string;
  isDefault?: boolean;
  upiVpa?: string;
  bankAccountHolderName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  businessId?: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentMethodService {
  private readonly base = `${environment.apiUrl}/payment-methods`;

  constructor(private http: HttpClient) {}

  getAll(businessId?: number): Observable<PaymentMethod[]> {
    let params = new HttpParams();
    if (businessId) params = params.set('businessId', businessId);
    return this.http.get<PaymentMethod[]>(this.base, { params });
  }

  getCheckoutContext(): Observable<CheckoutContext> {
    return this.http.get<CheckoutContext>(`${this.base}/checkout-context`);
  }

  create(req: PaymentMethodRequest): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>(this.base, req);
  }

  update(id: number, req: PaymentMethodRequest): Observable<PaymentMethod> {
    return this.http.put<PaymentMethod>(`${this.base}/${id}`, req);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  setDefault(id: number): Observable<PaymentMethod> {
    return this.http.put<PaymentMethod>(`${this.base}/${id}/set-default`, {});
  }
}
