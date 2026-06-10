import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { Auth } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { ProService } from '../../core/services/pro';
import { VerificationService } from '../../core/services/verification.service';
import { KycService, KycStatus } from '../../core/services/kyc.service';

type VerifStep = 'idle' | 'sending' | 'code-sent' | 'verifying';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, TranslateModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class SettingsComponent implements OnInit {
  userType: string | null = null;
  userEmail = '';
  userPhone = '';
  isEmailVerified = false;
  isPhoneVerified = false;
  isLoading = true;

  // Email verification
  emailStep: VerifStep = 'idle';
  emailCode = '';
  emailError = '';
  emailSuccess = '';

  // Phone verification
  phoneStep: VerifStep = 'idle';
  phoneCode = '';
  phoneError = '';
  phoneSuccess = '';

  // KYC (Pro only)
  kycStatus: KycStatus | null = null;
  kycLoading = false;
  kycError = '';
  kycSuccess = '';
  aadhaarUploading = false;
  panUploading = false;
  kycSubmitting = false;
  aadhaarPreview: string | null = null;
  panPreview: string | null = null;

  @ViewChild('aadhaarInput') aadhaarInput!: ElementRef<HTMLInputElement>;
  @ViewChild('panInput') panInput!: ElementRef<HTMLInputElement>;

  constructor(
    private auth: Auth,
    private userService: UserService,
    private proService: ProService,
    private verificationService: VerificationService,
    private kycService: KycService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userType = this.auth.getUserType();
    this.loadProfile();
  }

  get isPro(): boolean { return this.userType === 'Pro'; }

  private loadProfile(): void {
    const id = Number(this.auth.getUserId());
    if (this.isPro) {
      this.proService.getPro(id).subscribe({
        next: (response: any) => {
          const pro = response?.data || response;
          this.userEmail = pro.email;
          this.userPhone = pro.phoneNumber;
          this.isEmailVerified = pro.isEmailVerified;
          this.isPhoneVerified = pro.isPhoneVerified;
          this.isLoading = false;
          this.cdr.markForCheck();
          this.loadKycStatus();
        },
        error: () => { this.isLoading = false; this.cdr.markForCheck(); }
      });
    } else {
      this.userService.getUser(id).subscribe({
        next: (user) => {
          this.userEmail = user.email;
          this.userPhone = user.phoneNumber;
          this.isEmailVerified = user.isEmailVerified;
          this.isPhoneVerified = user.isPhoneVerified;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.isLoading = false; this.cdr.markForCheck(); }
      });
    }
  }

  private loadKycStatus(): void {
    this.kycLoading = true;
    this.kycService.getStatus().subscribe({
      next: (status) => {
        this.kycStatus = status;
        this.kycLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.kycLoading = false; this.cdr.markForCheck(); }
    });
  }

  // ── Email verification ─────────────────────────────────────────────────────

  sendEmailCode(): void {
    this.emailStep = 'sending';
    this.emailError = '';
    this.emailCode = '';
    const uType = this.isPro ? 'Pro' : 'User';
    this.verificationService.sendEmailCode(this.userEmail, uType).subscribe({
      next: () => { this.emailStep = 'code-sent'; this.cdr.markForCheck(); },
      error: (err) => {
        this.emailError = err?.error?.message || 'Failed to send verification email.';
        this.emailStep = 'idle';
        this.cdr.markForCheck();
      }
    });
  }

  confirmEmailCode(): void {
    if (!this.emailCode || this.emailCode.length !== 6) {
      this.emailError = 'Enter the 6-digit code sent to your email.';
      return;
    }
    this.emailStep = 'verifying';
    this.emailError = '';
    const uType = this.isPro ? 'Pro' : 'User';
    this.verificationService.verifyEmail(this.userEmail, this.emailCode, uType).subscribe({
      next: () => {
        this.isEmailVerified = true;
        this.emailStep = 'idle';
        this.emailSuccess = 'Email verified successfully!';
        this.cdr.markForCheck();
        setTimeout(() => { this.emailSuccess = ''; this.cdr.markForCheck(); }, 4000);
      },
      error: (err) => {
        this.emailError = err?.error?.message || 'Invalid or expired code.';
        this.emailStep = 'code-sent';
        this.cdr.markForCheck();
      }
    });
  }

  // ── Phone verification ─────────────────────────────────────────────────────

  sendPhoneCode(): void {
    this.phoneStep = 'sending';
    this.phoneError = '';
    this.phoneCode = '';
    const uType = this.isPro ? 'Pro' : 'User';
    this.verificationService.sendPhoneCode(this.userPhone, uType).subscribe({
      next: () => { this.phoneStep = 'code-sent'; this.cdr.markForCheck(); },
      error: (err) => {
        this.phoneError = err?.error?.message || 'Failed to send OTP.';
        this.phoneStep = 'idle';
        this.cdr.markForCheck();
      }
    });
  }

  confirmPhoneCode(): void {
    if (!this.phoneCode || this.phoneCode.length < 4) {
      this.phoneError = 'Enter the OTP sent to your phone.';
      return;
    }
    this.phoneStep = 'verifying';
    this.phoneError = '';
    const uType = this.isPro ? 'Pro' : 'User';
    this.verificationService.verifyPhone(this.userPhone, this.phoneCode, uType).subscribe({
      next: () => {
        this.isPhoneVerified = true;
        this.phoneStep = 'idle';
        this.phoneSuccess = 'Phone number verified successfully!';
        this.cdr.markForCheck();
        setTimeout(() => { this.phoneSuccess = ''; this.cdr.markForCheck(); }, 4000);
      },
      error: (err) => {
        this.phoneError = err?.error?.message || 'Invalid or expired OTP.';
        this.phoneStep = 'code-sent';
        this.cdr.markForCheck();
      }
    });
  }

  // ── KYC Documents ──────────────────────────────────────────────────────────

  triggerAadhaarUpload(): void { this.aadhaarInput.nativeElement.click(); }
  triggerPanUpload(): void { this.panInput.nativeElement.click(); }

  onAadhaarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!this.validateFile(file)) return;
    this.aadhaarUploading = true;
    this.kycError = '';
    this.setPreview(file, 'aadhaar');
    this.kycService.uploadAadhaar(file).subscribe({
      next: (res) => {
        this.aadhaarUploading = false;
        if (this.kycStatus) {
          this.kycStatus.aadhaarUploaded = true;
          this.kycStatus.aadhaarUrl = res.url;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.aadhaarUploading = false;
        this.kycError = err?.error?.message || 'Failed to upload Aadhaar document.';
        this.aadhaarPreview = null;
        this.cdr.markForCheck();
      }
    });
  }

  onPanSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!this.validateFile(file)) return;
    this.panUploading = true;
    this.kycError = '';
    this.setPreview(file, 'pan');
    this.kycService.uploadPan(file).subscribe({
      next: (res) => {
        this.panUploading = false;
        if (this.kycStatus) {
          this.kycStatus.panUploaded = true;
          this.kycStatus.panUrl = res.url;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.panUploading = false;
        this.kycError = err?.error?.message || 'Failed to upload PAN document.';
        this.panPreview = null;
        this.cdr.markForCheck();
      }
    });
  }

  submitKyc(): void {
    this.kycSubmitting = true;
    this.kycError = '';
    this.kycService.submitKyc().subscribe({
      next: () => {
        this.kycSubmitting = false;
        if (this.kycStatus) this.kycStatus.kycStatus = 'Submitted';
        this.kycSuccess = 'KYC submitted! You will be notified once verified.';
        this.cdr.markForCheck();
        setTimeout(() => { this.kycSuccess = ''; this.cdr.markForCheck(); }, 5000);
      },
      error: (err) => {
        this.kycSubmitting = false;
        this.kycError = err?.error?.message || 'Failed to submit KYC.';
        this.cdr.markForCheck();
      }
    });
  }

  private validateFile(file: File): boolean {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type)) {
      this.kycError = 'Only PDF, JPG, and PNG files are allowed.';
      this.cdr.markForCheck();
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.kycError = 'File size must not exceed 5 MB.';
      this.cdr.markForCheck();
      return false;
    }
    return true;
  }

  private setPreview(file: File, type: 'aadhaar' | 'pan'): void {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'aadhaar') this.aadhaarPreview = e.target?.result as string;
        else this.panPreview = e.target?.result as string;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    } else {
      if (type === 'aadhaar') this.aadhaarPreview = 'pdf';
      else this.panPreview = 'pdf';
    }
  }

  get canSubmitKyc(): boolean {
    return !!(this.kycStatus?.aadhaarUploaded && this.kycStatus?.panUploaded &&
      this.kycStatus?.kycStatus !== 'Approved');
  }

  kycStatusLabel(status: string): string {
    switch (status) {
      case 'Submitted': return 'Under Review';
      case 'Approved': return 'Approved';
      case 'Rejected': return 'Rejected — Please re-upload';
      default: return 'Not Submitted';
    }
  }

  kycStatusClass(status: string): string {
    switch (status) {
      case 'Submitted': return 'status-pending';
      case 'Approved': return 'status-approved';
      case 'Rejected': return 'status-rejected';
      default: return 'status-none';
    }
  }
}
