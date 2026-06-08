import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  userType = '';
  newPassword = '';
  confirmPassword = '';
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.userType = this.route.snapshot.queryParamMap.get('userType') ?? 'User';
    if (!this.token) {
      this.errorMessage = 'Invalid reset link. Please request a new one.';
    }
  }

  onSubmit(form: any): void {
    if (!form.valid) return;

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.api.post<{ message: string }>('auth/reset-password', {
      token: this.token,
      newPassword: this.newPassword
    }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.successMessage = res?.message ?? 'Password reset successfully.';
        setTimeout(() => this.router.navigate(['/auth/login']), 2500);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message ?? 'Invalid or expired reset token. Please request a new link.';
      }
    });
  }
}
