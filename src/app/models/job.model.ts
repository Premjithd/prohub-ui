// User info on Job
export interface UserInfo {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  userType?: string;
}

// Category info on Job
export interface CategoryInfo {
  id: number;
  name?: string;
  description?: string;
}

// Job Models with Phase 1A enhancements
export interface Job {
  id: number;
  userId: number;
  categoryId?: number;
  title: string;
  description: string;
  location: string;
  status: 'Open' | 'Bid Accepted' | 'Payment Made' | 'Pro Confirmed' | 'In Progress' | 'Completion Submitted' | 'Completed' | 'Cancelled';
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  budget?: string;
  estimatedBudget?: number;
  timeline?: string;
  createdAt: Date;
  updatedAt?: Date;
  category?: CategoryInfo;
  user?: UserInfo;
  // Phase 1A: Structured Address Fields
  serviceAddressHouse?: string;
  serviceAddressStreet1?: string;
  serviceAddressStreet2?: string;
  serviceAddressCity?: string;
  serviceAddressState?: string;
  serviceAddressCountry?: string;
  serviceAddressPIN?: string;
  // Contact Person Fields
  contactPersonName?: string;
  contactPersonPhone?: string;
  // Geolocation
  latitude?: number;
  longitude?: number;
  assignedProId?: number;
  isBid?: boolean;
}

export interface CreateJobRequest {
  title: string;
  description: string;
  categoryId: number;
  priority: string;
  budget: string;
  estimatedBudget?: number;
  timeline: string;
  location: string;
  // Structured Address
  serviceAddressHouse?: string;
  serviceAddressStreet1?: string;
  serviceAddressStreet2?: string;
  serviceAddressCity?: string;
  serviceAddressState?: string;
  serviceAddressCountry?: string;
  serviceAddressPIN?: string;
  // Contact Person
  contactPersonName?: string;
  contactPersonPhone?: string;
}

export interface UpdateJobRequest {
  title?: string;
  description?: string;
  priority?: string;
  budget?: string;
  estimatedBudget?: number;
  timeline?: string;
  location?: string;
  status?: string;
  serviceAddressStreet1?: string;
  serviceAddressCity?: string;
  serviceAddressState?: string;
  serviceAddressPIN?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
}

export interface JobDto extends Job {}

export interface JobLocation {
  latitude: number;
  longitude: number;
  serviceAddressStreet1: string;
  serviceAddressCity: string;
  serviceAddressState: string;
  serviceAddressPIN: string;
  serviceAddressCountry: string;
}
