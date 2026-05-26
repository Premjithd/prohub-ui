import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPasswordComponent {
  email = '';
  userType = 'User';
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(private api: ApiService) {}

  onSubmit(form: any): void {
    if (!form.valid) return;
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.api.post<{ message: string }>('auth/forgot-password', {
      email: this.email,
      userType: this.userType
    }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.successMessage = res?.message ?? 'If an account with that email exists, you will receive a reset link.';
      },
      error: () => {
        this.isLoading = false;
        // Always show neutral message to prevent enumeration
        this.successMessage = 'If an account with that email exists, you will receive a reset link.';
      }
    });
  }
}
