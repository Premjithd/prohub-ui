import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../../../core/services/user';
import { ProService } from '../../../core/services/pro';
import { User, GetUserRequest} from '../../../core/models/user.model';
import { Pro, ProBankDetails, UpdateBankDetailsRequest } from '../../../core/models/pro.model';
import { Auth } from '../../../core/services/auth';
import { VerificationService } from '../../../core/services/verification.service';
import { ReviewService } from '../../../services/review.service';
import { PayoutService } from '../../../services/payout.service';
import { Review, ProRatingSummary, UserReview, UserRatingSummary } from '../../../models/review.model';
import { Payout } from '../../../models/payout.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-profile',
  imports: [ FormsModule, CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnInit {
  user: User = { id: 0, firstName: '', lastName: '', email: '', phoneNumber: '', isEmailVerified: false, isPhoneVerified: false, userType: '', createdAt: new Date(), updatedAt: new Date()
  };
  pro: Pro = { id: 0, proName: '', email: '', phoneNumber: '', businessName: '', isEmailVerified: false, isPhoneVerified: false, createdAt: new Date(), updatedAt: new Date()
  };
  isEditing = false;
  userId = 0;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  userType: string | null = null;

  // Reviews (Pro only — reviews received from users)
  ratingSummary: ProRatingSummary | null = null;
  reviews: Review[] = [];
  reviewsLoading = false;
  reviewsPage = 1;
  reviewsTotal = 0;
  readonly reviewsPageSize = 5;
  readonly starsArray = [1, 2, 3, 4, 5];

  // User section nav (lazy-load)
  userSection: 'info' | 'payment' | 'reviews' = 'info';
  private userReviewsLoaded = false;

  // User reviews — reviews received from pros
  userRatingSummary: UserRatingSummary | null = null;
  userReviews: UserReview[] = [];
  userReviewsLoading = false;
  userReviewsPage = 1;
  userReviewsTotal = 0;

  // User payment details
  isEditingPayment = false;
  paymentUpiVpa = '';
  paymentSaveLoading = false;
  paymentSuccessMessage = '';
  paymentErrorMessage = '';

  // Email verification flow
  emailVerifStep: 'idle' | 'sending' | 'code-sent' | 'verifying' = 'idle';
  emailVerifCode = '';
  emailVerifError = '';

  // Pro section nav (lazy-load)
  proSection: 'info' | 'payout' | 'earnings' | 'reviews' = 'info';
  private bankDetailsLoaded = false;
  private payoutsLoaded = false;
  private reviewsLoaded = false;

  selectUserSection(section: 'info' | 'payment' | 'reviews'): void {
    this.userSection = section;
    if (section === 'reviews' && !this.userReviewsLoaded) {
      this.userReviewsLoaded = true;
      this.loadUserRatings(this.userId);
    }
  }

  selectProSection(section: 'info' | 'payout' | 'earnings' | 'reviews'): void {
    this.proSection = section;
    if (section === 'payout' && !this.bankDetailsLoaded) {
      this.bankDetailsLoaded = true;
      this.loadBankDetails(this.userId);
    }
    if (section === 'earnings' && !this.payoutsLoaded) {
      this.payoutsLoaded = true;
      this.loadPayouts();
    }
    if (section === 'reviews' && !this.reviewsLoaded) {
      this.reviewsLoaded = true;
      this.loadProRatings(this.userId);
    }
  }

  // Bank details (Pro only)
  bankDetails: ProBankDetails | null = null;
  bankDetailsLoading = false;
  isEditingBank = false;
  bankForm: UpdateBankDetailsRequest = { payoutMethod: 'Bank' };
  bankSaveLoading = false;
  bankSuccessMessage = '';
  bankErrorMessage = '';

  // Earnings / payouts (Pro only)
  payouts: Payout[] = [];
  payoutsLoading = false;

  constructor(
    private userService: UserService,
    private proService: ProService,
    public auth: Auth,
    private cdr: ChangeDetectorRef,
    private verificationService: VerificationService,
    private reviewService: ReviewService,
    private payoutService: PayoutService
  ) {}

  ngOnInit(): void {
    this.userType = this.auth.getUserType();
    this.loadProfile();
  }

  loadProfile(): void {
    const userIdStr = this.auth.getUserId();
    if (userIdStr) {
      this.userId = Number(userIdStr);
      if (this.userType === 'Pro') {
        this.loadPro(this.userId);
      } else {
        this.loadUser(this.userId);
      }
    } else {
      console.warn('User ID not found in storage');
    }
  }

  loadUser(userId: number): void {
    this.userService.getUser(userId).subscribe({
      next: (response) => {
        this.user = response;
        console.log('User data loaded:', this.user);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error fetching user data:', error);
        this.errorMessage = 'Failed to load user profile information';
      }
    });
  }

  loadPro(proId: number): void {
    this.proService.getPro(proId).subscribe({
      next: (response: any) => {
        // Backend returns plain Pro object, not wrapped in ApiResponse
        // The response could be the Pro object directly
        this.pro = response?.data || response;
        console.log('Pro data loaded:', this.pro);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error fetching pro data:', error);
        this.errorMessage = 'Failed to load professional profile information';
      }
    });
  }

  toggleEdit(): void {
    this.proSection = 'info';
    this.userSection = 'info';
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.isEditingPayment = false;
    this.loadProfile();
  }

  updateProfile(form: any): void {
    if (form.valid) {
      this.isLoading = true;
      this.successMessage = '';
      this.errorMessage = '';

      if (this.userType === 'Pro') {
        this.updateProProfile();
      } else {
        this.updateUserProfile();
      }
    }
  }

  private updateUserProfile(): void {
    const updateData = {
      id: this.user.id,
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      email: this.user.email,
      phoneNumber: this.user.phoneNumber,
      houseNameNumber: this.user.houseNameNumber,
      street1: this.user.street1,
      street2: this.user.street2,
      city: this.user.city,
      state: this.user.state,
      country: this.user.country,
      zipPostalCode: this.user.zipPostalCode
    };

    this.userService.updateUser(updateData).subscribe({
      next: (response: any) => {
        const updatedUser = response?.data || response;
        if (updatedUser) {
          this.user = updatedUser as User;
        }
        this.isEditing = false;
        this.isLoading = false;
        this.emailVerifStep = 'idle';
        this.emailVerifCode = '';
        this.emailVerifError = '';
        this.successMessage = 'Profile updated successfully!';
        this.cdr.markForCheck();
        
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 3000);
      },
      error: (error: any) => {
        console.error('Error updating profile:', error);
        this.isLoading = false;
        
        let errorMsg = 'Failed to update profile. Please try again.';
        if (error?.status === 401 || error?.status === 403) {
          errorMsg = 'Authorization failed. Please login again.';
        } else if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.statusText) {
          errorMsg = error.statusText;
        }
        
        this.errorMessage = errorMsg;
        this.cdr.markForCheck();
        
        setTimeout(() => {
          this.errorMessage = '';
          this.cdr.markForCheck();
        }, 5000);
      }
    });
  }

  // ── Email verification ────────────────────────────────────────────────────

  sendEmailVerification(): void {
    const email = this.userType === 'Pro' ? this.pro.email : this.user.email;
    const userType = this.userType === 'Pro' ? 'Pro' : 'User';
    this.emailVerifStep = 'sending';
    this.emailVerifError = '';
    this.emailVerifCode = '';
    this.verificationService.sendEmailCode(email, userType).subscribe({
      next: () => {
        this.emailVerifStep = 'code-sent';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.emailVerifError = err?.error?.message || 'Failed to send verification email. Please try again.';
        this.emailVerifStep = 'idle';
        this.cdr.markForCheck();
      }
    });
  }

  confirmEmailCode(): void {
    if (!this.emailVerifCode || this.emailVerifCode.length !== 6) {
      this.emailVerifError = 'Please enter the 6-digit code.';
      return;
    }
    const email = this.userType === 'Pro' ? this.pro.email : this.user.email;
    const userType = this.userType === 'Pro' ? 'Pro' : 'User';
    this.emailVerifStep = 'verifying';
    this.emailVerifError = '';
    this.verificationService.verifyEmail(email, this.emailVerifCode, userType).subscribe({
      next: () => {
        if (this.userType === 'Pro') {
          this.pro.isEmailVerified = true;
        } else {
          this.user.isEmailVerified = true;
        }
        this.emailVerifStep = 'idle';
        this.successMessage = 'Email verified successfully!';
        this.cdr.markForCheck();
        setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 4000);
      },
      error: (err) => {
        this.emailVerifError = err?.error?.message || 'Invalid or expired code. Please try again.';
        this.emailVerifStep = 'code-sent';
        this.cdr.markForCheck();
      }
    });
  }

  loadProRatings(proId: number): void {
    this.reviewsLoading = true;
    this.reviewService.getProRatingSummary(proId).subscribe({
      next: summary => { this.ratingSummary = summary; this.cdr.markForCheck(); },
      error: () => { this.cdr.markForCheck(); }
    });
    this.reviewService.getProReviews(proId, 1, this.reviewsPageSize).subscribe({
      next: result => {
        this.reviews = result.reviews ?? [];
        this.reviewsTotal = result.total ?? 0;
        this.reviewsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.reviewsLoading = false; this.cdr.markForCheck(); }
    });
  }

  loadMoreReviews(): void {
    this.reviewsPage++;
    this.reviewService.getProReviews(this.userId, this.reviewsPage, this.reviewsPageSize).subscribe({
      next: result => {
        this.reviews = [...this.reviews, ...(result.reviews ?? [])];
        this.reviewsTotal = result.total ?? 0;
        this.cdr.markForCheck();
      }
    });
  }

  loadUserRatings(userId: number): void {
    this.userReviewsLoading = true;
    this.reviewService.getUserRatingSummary(userId).subscribe({
      next: summary => { this.userRatingSummary = summary; this.cdr.markForCheck(); },
      error: () => { this.cdr.markForCheck(); }
    });
    this.reviewService.getUserReviews(userId, 1, this.reviewsPageSize).subscribe({
      next: result => {
        this.userReviews = result.reviews ?? [];
        this.userReviewsTotal = result.total ?? 0;
        this.userReviewsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.userReviewsLoading = false; this.cdr.markForCheck(); }
    });
  }

  loadMoreUserReviews(): void {
    this.userReviewsPage++;
    this.reviewService.getUserReviews(this.userId, this.userReviewsPage, this.reviewsPageSize).subscribe({
      next: result => {
        this.userReviews = [...this.userReviews, ...(result.reviews ?? [])];
        this.userReviewsTotal = result.total ?? 0;
        this.cdr.markForCheck();
      }
    });
  }

  starFilled(rating: number, index: number): boolean {
    return index + 1 <= Math.round(rating);
  }

  ratingBarWidth(count: number, total: number): string {
    return total ? `${Math.round((count / total) * 100)}%` : '0%';
  }

  cancelEmailVerification(): void {
    this.emailVerifStep = 'idle';
    this.emailVerifCode = '';
    this.emailVerifError = '';
  }

  // ── User payment details ──────────────────────────────────────────────────

  startEditPayment(): void {
    this.paymentUpiVpa = this.user.upiVpa ?? '';
    this.isEditingPayment = true;
    this.paymentSuccessMessage = '';
    this.paymentErrorMessage = '';
  }

  cancelEditPayment(): void {
    this.isEditingPayment = false;
  }

  savePaymentDetails(): void {
    this.paymentSaveLoading = true;
    this.paymentSuccessMessage = '';
    this.paymentErrorMessage = '';
    this.userService.savePaymentDetails(this.userId, this.paymentUpiVpa).subscribe({
      next: () => {
        this.user.upiVpa = this.paymentUpiVpa || undefined;
        this.isEditingPayment = false;
        this.paymentSaveLoading = false;
        this.paymentSuccessMessage = 'Payment details saved!';
        this.cdr.markForCheck();
        setTimeout(() => { this.paymentSuccessMessage = ''; this.cdr.markForCheck(); }, 4000);
      },
      error: (err: any) => {
        this.paymentSaveLoading = false;
        this.paymentErrorMessage = err?.error?.message ?? 'Failed to save payment details.';
        this.cdr.markForCheck();
      }
    });
  }

  // ── Bank details ─────────────────────────────────────────────────────────

  loadBankDetails(proId: number): void {
    this.bankDetailsLoading = true;
    this.proService.getBankDetails(proId).subscribe({
      next: (details: any) => {
        this.bankDetails = details?.data ?? details;
        this.bankDetailsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.bankDetailsLoading = false; this.cdr.markForCheck(); }
    });
  }

  startEditBank(): void {
    this.bankForm = {
      payoutMethod: this.bankDetails?.payoutMethod ?? 'Bank',
      bankAccountHolderName: this.bankDetails?.bankAccountHolderName ?? '',
      bankAccountNumber: this.bankDetails?.bankAccountNumber ?? '',
      bankIfsc: this.bankDetails?.bankIfsc ?? '',
      upiVpa: this.bankDetails?.upiVpa ?? ''
    };
    this.isEditingBank = true;
    this.bankSuccessMessage = '';
    this.bankErrorMessage = '';
  }

  cancelEditBank(): void {
    this.isEditingBank = false;
  }

  saveBankDetails(): void {
    this.bankSaveLoading = true;
    this.bankSuccessMessage = '';
    this.bankErrorMessage = '';
    this.proService.updateBankDetails(this.userId, this.bankForm).subscribe({
      next: () => {
        this.bankSaveLoading = false;
        this.isEditingBank = false;
        this.payoutsLoaded = false;
        this.loadBankDetails(this.userId);
        this.bankSuccessMessage = 'Bank details saved successfully!';
        this.cdr.markForCheck();
        setTimeout(() => { this.bankSuccessMessage = ''; this.cdr.markForCheck(); }, 4000);
      },
      error: (err: any) => {
        this.bankSaveLoading = false;
        this.bankErrorMessage = err?.error?.message ?? 'Failed to save bank details.';
        this.cdr.markForCheck();
      }
    });
  }

  // ── Payouts ───────────────────────────────────────────────────────────────

  loadPayouts(): void {
    this.payoutsLoading = true;
    this.payoutService.getMyPayouts().subscribe({
      next: (data) => {
        this.payouts = data;
        this.payoutsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.payoutsLoading = false; this.cdr.markForCheck(); }
    });
  }

  private updateProProfile(): void {
    const updateData = {
      id: this.pro.id,
      proName: this.pro.proName,
      email: this.pro.email,
      phoneNumber: this.pro.phoneNumber,
      businessName: this.pro.businessName,
      houseNameNumber: this.pro.houseNameNumber,
      street1: this.pro.street1,
      street2: this.pro.street2,
      city: this.pro.city,
      state: this.pro.state,
      country: this.pro.country,
      zipPostalCode: this.pro.zipPostalCode,
      serviceRadiusKm: this.pro.serviceRadiusKm ?? 25,
    };

    this.proService.updatePro(updateData).subscribe({
      next: (response: any) => {
        console.log('Pro profile updated successfully:', response);
        const updatedPro = response?.data || response;
        if (updatedPro) {
          this.pro = updatedPro as Pro;
        }
        this.isEditing = false;
        this.isLoading = false;
        this.emailVerifStep = 'idle';
        this.emailVerifCode = '';
        this.emailVerifError = '';
        this.successMessage = 'Profile updated successfully!';
        this.cdr.markForCheck();

        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 3000);
      },
      error: (error: any) => {
        console.error('Error updating pro profile:', error);
        this.isLoading = false;
        
        let errorMsg = 'Failed to update profile. Please try again.';
        if (error?.status === 401 || error?.status === 403) {
          errorMsg = 'Authorization failed. Please login again.';
        } else if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.statusText) {
          errorMsg = error.statusText;
        }
        
        this.errorMessage = errorMsg;
        this.cdr.markForCheck();
        
        setTimeout(() => {
          this.errorMessage = '';
          this.cdr.markForCheck();
        }, 5000);
      }
    });
  }
}
