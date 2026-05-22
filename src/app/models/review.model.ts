export interface Review {
  id: number;
  jobId: number;
  jobTitle?: string;
  reviewerId: number;
  reviewerName: string;
  proId: number;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface ProRatingSummary {
  proId: number;
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: number[];
}

export interface PlatformRatingStats {
  averageRating: number;
  totalReviews: number;
}
