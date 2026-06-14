// Payment Models
export interface Payment {
  id: number;
  jobId: number;
  bidId: number;
  userId: number;
  amount: number;
  platformFee: number;
  proPayOut: number;
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  providerId: string;
  createdAt: Date;
  completedAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
  refundReason?: string;
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  consumerName: string;
  consumerEmail: string;
  consumerPhone: string;
  principalAmount: number;     // portion of the agreed bid being paid now
  bidAmount: number;           // full agreed bid amount
  remainingBefore: number;     // remaining balance before this payment
  platformFee: number;
  gstOnPlatformFee: number;
  proDeduction: number;
  totalAmount: number;
  proPayout: number;
  effectivePlatformFeePercent: number;
  effectiveProPayoutPercent: number;
}

export interface CreatePaymentRequest {
  jobId: number;
  bidId: number;
  amount: number;           // full agreed bid amount (context)
  principalAmount?: number; // portion to pay now; defaults to the full remaining server-side
}

// ── Pro-raised payment requests + per-job payment tracking ──────────────────

export type PaymentRequestType = 'None' | 'Partial' | 'Full';

export interface JobPaymentRequest {
  id: number;
  jobId: number;
  bidId?: number;
  proId: number;
  requestType: PaymentRequestType;
  requestedAmount: number;
  minPercent: number;
  minAmount: number;        // computed floor in ₹
  status: 'Pending' | 'Fulfilled' | 'Cancelled';
  note?: string;
  createdAt: string;
  fulfilledAt?: string;
}

export interface PaymentHistoryItem {
  id: number;
  principalAmount: number;
  amount: number;
  platformFee: number;
  proPayout: number;
  status: string;
  createdAt: string;
  completedAt?: string;
}

export interface PaymentSummary {
  jobId: number;
  bidAmount: number;
  totalPaidPrincipal: number;
  remaining: number;
  isFullyPaid: boolean;
  payments: PaymentHistoryItem[];
  activeRequest?: JobPaymentRequest | null;
}

export interface CreatePaymentRequestRequest {
  jobId: number;
  requestType: PaymentRequestType;
  requestedAmount: number;
  minPercent: number;
  note?: string;
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface RateSplit {
  bidAmount: number;
  platformFeePercent: number;
  platformFee: number;
  gstPercent: number;
  gstOnPlatformFee: number;
  proPayOut: number;
  effectivePlatformFeePercent: number;
}
