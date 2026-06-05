export interface Payout {
    id: number;
    proId: number;
    proName?: string;
    paymentId: number;
    jobId: number;
    jobTitle?: string;
    amount: number;
    status: string;
    mode?: string;
    razorpayPayoutId?: string;
    failureReason?: string;
    createdAt: Date;
    processedAt?: Date;
}
