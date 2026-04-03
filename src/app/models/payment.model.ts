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
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  consumerName: string;
  consumerEmail: string;
  consumerPhone: string;
  platformFee: number;
  gstOnPlatformFee: number;
  totalAmount: number;
  proPayout: number;
  effectivePlatformFeePercent: number;
}

export interface CreatePaymentRequest {
  jobId: number;
  bidId: number;
  amount: number;
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
