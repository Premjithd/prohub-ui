// JobBid Models with Phase 1A enhancements
export interface JobBid {
  id: number;
  jobId: number;
  proId: number;
  bidMessage?: string;
  bidAmount?: number;
  quotedPrice?: number;
  commenceDate?: Date;
  expectedDurationDays?: number;
  materialsDescription?: string;
  expiresAt?: Date;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Expired' | 'Cancelled';
  isMessageExchange?: boolean;
  createdAt: Date;
  updatedAt?: Date;
  pro?: {
    id: number;
    proName?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phoneNumber: string;
    bio?: string;
    rating?: number;
    totalJobs?: number;
  };
}

export interface CreateJobBidRequest {
  jobId: number;
  bidMessage?: string;
  bidAmount?: number;
  quotedPrice?: number;
  commenceDate?: Date;
  expectedDurationDays?: number;
  materialsDescription?: string;
  expiresAt?: Date;
}

export interface UpdateJobBidRequest {
  quotedPrice?: number;
  commenceDate?: Date;
  expectedDurationDays?: number;
  materialsDescription?: string;
  expiresAt?: Date;
  status?: string;
}

export interface BidAcceptRequest {
  bidId: number;
  jobId: number;
}

export interface BidRejectRequest {
  bidId: number;
  jobId: number;
  rejectionReason?: string;
}

export interface JobBidDto extends JobBid {}
