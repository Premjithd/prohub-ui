import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { Auth } from '../../core/services/auth';
import { UserService } from '../../core/services/user';
import { ProService } from '../../core/services/pro';
import { VerificationService } from '../../core/services/verification.service';
import { KycService, KycStatus } from '../../core/services/kyc.service';
import { PaymentMethodService, PaymentMethod } from '../../core/services/payment-method.service';
import { BusinessService, BusinessSummary } from '../../core/services/business.service';

type VerifStep = 'idle' | 'sending' | 'code-sent' | 'verifying';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatProgressSpinnerModule, TranslateModule],
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

  // Editable contact details (all user types)
  userData: any = null; // full user object for non-pros (pros use proData)
  isEditingEmail = false;
  emailDraft = '';
  savingEmail = false;
  emailEditError = '';
  isEditingPhone = false;
  phoneDraft = '';
  savingPhone = false;
  phoneEditError = '';

  // Payment methods (all users)
  paymentMethods: PaymentMethod[] = [];
  pmLoading = false;
  showAddPm = false;
  pmType: 'UPI' | 'Bank' = 'UPI';
  pmUpiVpa = '';
  pmBankHolder = '';
  pmBankAccount = '';
  pmBankIfsc = '';
  pmLabel = '';
  pmIsDefault = false;
  pmSaving = false;
  pmSaveError = '';
  pmDeleteId: number | null = null;

  // Service area (Pro only)
  proData: any = null;
  proRadius: number | null = null;
  savingProRadius = false;
  proRadiusSaved = false;
  isEditingProRadius = false;
  private proRadiusBackup: number | null = null;

  // Businesses (Pro only) — editable service radius per owned business
  myBusinesses: BusinessSummary[] = [];
  businessesLoading = false;
  savingBizRadiusId: number | null = null;
  editingBizRadiusId: number | null = null;
  private bizRadiusBackup: number | null = null;

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
    private pmService: PaymentMethodService,
    private businessService: BusinessService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userType = this.auth.getUserType();
    this.loadProfile();
    this.loadPaymentMethods();
  }

  get isPro(): boolean { return this.userType === 'Pro'; }

  get ownsBusiness(): boolean {
    return this.myBusinesses.some(b => b.role === 'Owner');
  }

  get isBusinessMember(): boolean {
    return this.myBusinesses.length > 0 && !this.ownsBusiness;
  }

  get ownedBusinesses(): BusinessSummary[] {
    return this.myBusinesses.filter(b => b.role === 'Owner');
  }

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
          this.proData = pro;
          this.proRadius = pro.serviceRadiusKm ?? 25;
          this.isLoading = false;
          this.cdr.markForCheck();
          this.loadKycStatus();
          this.loadBusinesses();
        },
        error: () => { this.isLoading = false; this.cdr.markForCheck(); }
      });
    } else {
      this.userService.getUser(id).subscribe({
        next: (user) => {
          this.userData = user;
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

  // ── Service area (Pro) ─────────────────────────────────────────────────────

  startEditProRadius(): void {
    this.proRadiusBackup = this.proRadius;
    this.isEditingProRadius = true;
    this.proRadiusSaved = false;
  }

  cancelEditProRadius(): void {
    this.proRadius = this.proRadiusBackup;
    this.isEditingProRadius = false;
  }

  saveProRadius(): void {
    if (!this.proData || !this.proRadius) return;
    this.savingProRadius = true;
    this.proRadiusSaved = false;
    this.proService.updatePro({ ...this.proData, serviceRadiusKm: this.proRadius }).subscribe({
      next: () => {
        this.savingProRadius = false;
        this.isEditingProRadius = false;
        this.proRadiusSaved = true;
        this.cdr.markForCheck();
        setTimeout(() => { this.proRadiusSaved = false; this.cdr.markForCheck(); }, 3000);
      },
      error: () => { this.savingProRadius = false; this.cdr.markForCheck(); }
    });
  }

  loadBusinesses(): void {
    this.businessesLoading = true;
    this.businessService.getMyBusinesses().subscribe({
      next: (list) => {
        this.myBusinesses = (list ?? []).map(b => ({ ...b, serviceRadiusKm: b.serviceRadiusKm ?? 25 }));
        this.businessesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.businessesLoading = false; this.cdr.markForCheck(); }
    });
  }

  startEditBizRadius(biz: BusinessSummary): void {
    this.bizRadiusBackup = biz.serviceRadiusKm ?? null;
    this.editingBizRadiusId = biz.id;
  }

  cancelEditBizRadius(biz: BusinessSummary): void {
    biz.serviceRadiusKm = this.bizRadiusBackup;
    this.editingBizRadiusId = null;
  }

  saveBizRadius(biz: BusinessSummary): void {
    this.savingBizRadiusId = biz.id;
    this.businessService.updateBusiness(biz.id, { serviceRadiusKm: biz.serviceRadiusKm ?? undefined }).subscribe({
      next: () => { this.savingBizRadiusId = null; this.editingBizRadiusId = null; this.cdr.markForCheck(); },
      error: () => { this.savingBizRadiusId = null; this.cdr.markForCheck(); }
    });
  }

  // ── Edit contact details (email / phone) ───────────────────────────────────

  private get contactEntity(): any { return this.isPro ? this.proData : this.userData; }

  private saveContact(payload: any): Observable<any> {
    return this.isPro ? this.proService.updatePro(payload) : this.userService.updateUser(payload);
  }

  startEditEmail(): void {
    this.emailDraft = this.userEmail;
    this.isEditingEmail = true;
    this.emailEditError = '';
    this.emailSuccess = '';
    // collapse any in-progress verification flow for the old address
    this.emailStep = 'idle';
    this.emailCode = '';
    this.emailError = '';
  }

  cancelEditEmail(): void {
    this.isEditingEmail = false;
    this.emailEditError = '';
  }

  saveEmail(): void {
    const next = (this.emailDraft || '').trim();
    if (!next || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      this.emailEditError = 'Enter a valid email address.';
      return;
    }
    if (next.toLowerCase() === this.userEmail.toLowerCase()) {
      this.isEditingEmail = false;
      return;
    }
    this.savingEmail = true;
    this.emailEditError = '';
    this.saveContact({ ...this.contactEntity, email: next }).subscribe({
      next: (resp: any) => {
        const updated = resp?.data ?? resp ?? {};
        if (this.isPro) this.proData = { ...this.proData, email: next, isEmailVerified: false };
        else this.userData = { ...this.userData, email: next, isEmailVerified: false };
        this.userEmail = updated.email ?? next;
        this.isEmailVerified = false; // changing the email always resets verification
        this.savingEmail = false;
        this.isEditingEmail = false;
        this.emailStep = 'idle';
        this.emailCode = '';
        this.emailSuccess = 'Email updated — please verify your new address.';
        this.cdr.markForCheck();
        setTimeout(() => { this.emailSuccess = ''; this.cdr.markForCheck(); }, 5000);
      },
      error: (err: any) => {
        this.savingEmail = false;
        this.emailEditError = err?.error?.message || 'Failed to update email.';
        this.cdr.markForCheck();
      }
    });
  }

  startEditPhone(): void {
    this.phoneDraft = this.userPhone;
    this.isEditingPhone = true;
    this.phoneEditError = '';
    this.phoneSuccess = '';
    this.phoneStep = 'idle';
    this.phoneCode = '';
    this.phoneError = '';
  }

  cancelEditPhone(): void {
    this.isEditingPhone = false;
    this.phoneEditError = '';
  }

  savePhone(): void {
    const next = (this.phoneDraft || '').trim();
    if (!next || next.replace(/\D/g, '').length < 7) {
      this.phoneEditError = 'Enter a valid phone number.';
      return;
    }
    if (next === (this.userPhone || '')) {
      this.isEditingPhone = false;
      return;
    }
    this.savingPhone = true;
    this.phoneEditError = '';
    this.saveContact({ ...this.contactEntity, phoneNumber: next }).subscribe({
      next: (resp: any) => {
        const updated = resp?.data ?? resp ?? {};
        if (this.isPro) this.proData = { ...this.proData, phoneNumber: next, isPhoneVerified: false };
        else this.userData = { ...this.userData, phoneNumber: next, isPhoneVerified: false };
        this.userPhone = updated.phoneNumber ?? next;
        this.isPhoneVerified = false; // changing the phone always resets verification
        this.savingPhone = false;
        this.isEditingPhone = false;
        this.phoneStep = 'idle';
        this.phoneCode = '';
        this.phoneSuccess = 'Phone number updated — please verify your new number.';
        this.cdr.markForCheck();
        setTimeout(() => { this.phoneSuccess = ''; this.cdr.markForCheck(); }, 5000);
      },
      error: (err: any) => {
        this.savingPhone = false;
        this.phoneEditError = err?.error?.message || 'Failed to update phone number.';
        this.cdr.markForCheck();
      }
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

  // ── Payment Methods ────────────────────────────────────────────────────────

  loadPaymentMethods(): void {
    this.pmLoading = true;
    this.pmService.getAll().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        this.pmLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.pmLoading = false; this.cdr.markForCheck(); }
    });
  }

  addPaymentMethod(): void {
    this.pmSaveError = '';
    if (this.pmType === 'UPI' && !this.pmUpiVpa.trim()) {
      this.pmSaveError = 'UPI ID is required.'; return;
    }
    if (this.pmType === 'Bank' && (!this.pmBankAccount.trim() || !this.pmBankIfsc.trim())) {
      this.pmSaveError = 'Account number and IFSC code are required.'; return;
    }
    this.pmSaving = true;
    this.pmService.create({
      type: this.pmType,
      label: this.pmLabel.trim() || undefined,
      isDefault: this.pmIsDefault,
      upiVpa: this.pmType === 'UPI' ? this.pmUpiVpa.trim() : undefined,
      bankAccountHolderName: this.pmType === 'Bank' ? this.pmBankHolder.trim() : undefined,
      bankAccountNumber: this.pmType === 'Bank' ? this.pmBankAccount.trim() : undefined,
      bankIfsc: this.pmType === 'Bank' ? this.pmBankIfsc.trim() : undefined,
    }).subscribe({
      next: (pm) => {
        if (pm.isDefault) {
          this.paymentMethods = this.paymentMethods.map(m => ({ ...m, isDefault: false }));
        }
        this.paymentMethods = [...this.paymentMethods, pm];
        this.pmSaving = false;
        this.showAddPm = false;
        this.resetPmForm();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.pmSaveError = err?.error?.message || 'Failed to save payment method.';
        this.pmSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  deletePaymentMethod(id: number): void {
    this.pmDeleteId = id;
    this.pmService.delete(id).subscribe({
      next: () => {
        this.paymentMethods = this.paymentMethods.filter(m => m.id !== id);
        this.pmDeleteId = null;
        this.cdr.markForCheck();
      },
      error: () => { this.pmDeleteId = null; this.cdr.markForCheck(); }
    });
  }

  setDefaultPaymentMethod(id: number): void {
    this.pmService.setDefault(id).subscribe({
      next: () => {
        this.paymentMethods = this.paymentMethods.map(m => ({ ...m, isDefault: m.id === id }));
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  resetPmForm(): void {
    this.pmType = 'UPI';
    this.pmUpiVpa = '';
    this.pmBankHolder = '';
    this.pmBankAccount = '';
    this.pmBankIfsc = '';
    this.pmLabel = '';
    this.pmIsDefault = false;
    this.pmSaveError = '';
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
