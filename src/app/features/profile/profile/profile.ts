import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../../../core/services/user';
import { User, GetUserRequest} from '../../../core/models/user.model';
import { Auth } from '../../../core/services/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-profile',
  imports: [ FormsModule, CommonModule, MatIconModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnInit {
  user: User = { id: 0, firstName: '', lastName: '', email: '', phoneNumber: '', isEmailVerified: false, isPhoneVerified: false, userType: '', createdAt: new Date(), updatedAt: new Date()
  }; 
  isEditing = false;
  userId = 0;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private userService: UserService,
    public auth: Auth,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    const userIdStr = this.auth.getUserId();
    if (userIdStr) {
      this.userId = Number(userIdStr);
      this.loadUser(this.userId);
    } else {
      console.warn('User ID not found in storage');
    }
  }

  loadUser(userId: number): void {
    this.userService.getUser(userId).subscribe({
      next: (response) => {
        this.user = response;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error fetching user data', error);
      }
    });
  }

  toggleEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.loadUser(this.userId);
  }

  updateProfile(form: any): void {
    if (form.valid) {
      this.isLoading = true;
      this.successMessage = '';
      this.errorMessage = '';

      const updateData = {
        id: this.user.id,
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        email: this.user.email,
        phoneNumber: this.user.phoneNumber
      };

      this.userService.updateUser(updateData).subscribe({
        next: (response: any) => {
          console.log('Profile updated successfully:', response);
          // Handle response - backend returns User directly in Ok(user)
          // But ApiService wraps it in ApiResponse
          const updatedUser = response?.data || response;
          if (updatedUser) {
            this.user = updatedUser as User;
          }
          this.isEditing = false;
          this.isLoading = false;
          this.successMessage = 'Profile updated successfully!';
          this.cdr.markForCheck();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.markForCheck();
          }, 3000);
        },
        error: (error: any) => {
          console.error('Error updating profile:', error);
          console.error('Error status:', error?.status);
          console.error('Error message:', error?.error?.message);
          this.isLoading = false;
          
          // Provide detailed error messages
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
          
          // Clear error message after 5 seconds
          setTimeout(() => {
            this.errorMessage = '';
            this.cdr.markForCheck();
          }, 5000);
        }
      });
    }
  }
}
