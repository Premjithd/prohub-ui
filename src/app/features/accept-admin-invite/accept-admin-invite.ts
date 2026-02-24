import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-accept-admin-invite',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './accept-admin-invite.html',
  styleUrls: ['./accept-admin-invite.scss']
})
export class AcceptAdminInviteComponent implements OnInit {
  invitationForm!: FormGroup;
  isLoading = false;
  isProcessing = false;
  errorMessage = '';
  successMessage = '';
  invitationToken = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Get token from URL query parameters
    this.route.queryParams.subscribe((params) => {
      this.invitationToken = params['token'] || '';
      console.log('Invitation token from URL:', this.invitationToken ? 'Present' : 'Missing');
      
      if (!this.invitationToken) {
        this.errorMessage = 'No invitation token provided. Please use the link from your invitation email.';
      }
    });
  }

  private initializeForm(): void {
    this.invitationForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(255)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  submitForm(): void {
    if (!this.invitationForm.valid) {
      this.errorMessage = 'Please fill out all required fields correctly';
      return;
    }

    if (!this.invitationToken) {
      this.errorMessage = 'Invalid or missing invitation token';
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { firstName, lastName, password } = this.invitationForm.value;

    this.authService.acceptAdminInvitation(
      this.invitationToken,
      firstName,
      lastName,
      password
    ).subscribe({
      next: (response) => {
        console.log('Invitation accepted successfully:', response);
        this.successMessage = 'Welcome! Your admin account has been created successfully. Redirecting...';
        this.isProcessing = false;
        
        // Redirect to admin dashboard after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/admin-users']);
        }, 2000);
      },
      error: (error) => {
        console.error('Error accepting invitation:', error);
        this.isProcessing = false;
        
        // Handle specific error messages from backend
        if (error.status === 400) {
          const errorData = error.error;
          if (typeof errorData === 'string') {
            this.errorMessage = errorData;
          } else if (errorData.message) {
            this.errorMessage = errorData.message;
          } else {
            this.errorMessage = 'Invalid invitation or the invitation has expired. Please request a new invitation.';
          }
        } else if (error.status === 404) {
          this.errorMessage = 'Invitation not found. Please check your invitation link.';
        } else if (error.status === 409) {
          this.errorMessage = 'This email is already registered as an admin. Please use a different account.';
        } else {
          this.errorMessage = 'An error occurred while processing your invitation. Please try again later.';
        }
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.invitationForm.get(fieldName);
    
    if (!field || !field.errors || !field.touched) {
      return '';
    }

    if (field.errors['required']) {
      return `${this.formatFieldName(fieldName)} is required`;
    }

    if (field.errors['minlength']) {
      const minLength = field.errors['minlength'].requiredLength;
      return `${this.formatFieldName(fieldName)} must be at least ${minLength} characters`;
    }

    if (field.errors['maxlength']) {
      const maxLength = field.errors['maxlength'].requiredLength;
      return `${this.formatFieldName(fieldName)} cannot exceed ${maxLength} characters`;
    }

    return '';
  }

  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  canSubmit(): boolean {
    return this.invitationForm.valid && !!this.invitationToken && !this.isProcessing;
  }
}
