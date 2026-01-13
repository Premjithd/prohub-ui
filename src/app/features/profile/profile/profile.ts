import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { UserService } from '../../../core/services/user';
import { ProService } from '../../../core/services/pro';
import { User, GetUserRequest} from '../../../core/models/user.model';
import { Pro } from '../../../core/models/pro.model';
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
  pro: Pro = { id: 0, proName: '', email: '', phoneNumber: '', businessName: '', isEmailVerified: false, isPhoneVerified: false, createdAt: new Date(), updatedAt: new Date()
  };
  isEditing = false;
  userId = 0;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  userType: string | null = null;

  constructor(
    private userService: UserService,
    private proService: ProService,
    public auth: Auth,
    private cdr: ChangeDetectorRef
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
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error fetching user data', error);
      }
    });
  }

  loadPro(proId: number): void {
    this.proService.getPro(proId).subscribe({
      next: (response: any) => {
        this.pro = response?.data || response;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error fetching pro data', error);
      }
    });
  }

  toggleEdit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
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
        console.log('Profile updated successfully:', response);
        const updatedUser = response?.data || response;
        if (updatedUser) {
          this.user = updatedUser as User;
        }
        this.isEditing = false;
        this.isLoading = false;
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
      zipPostalCode: this.pro.zipPostalCode
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
