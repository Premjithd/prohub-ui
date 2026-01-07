import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../core/services/user';
import { User, GetUserRequest} from '../../../core/models/user.model';
import { Auth } from '../../../core/services/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  imports: [ FormsModule, CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnInit {
  user: User = { id: 0, firstName: '', lastName: '', email: '', phoneNumber: '', isEmailVerified: false, isPhoneVerified: false, userType: '', createdAt: new Date(), updatedAt: new Date()
  }; 
  // user!: User;
  isEditing = false;
  userProfile = { id: 0 };
  userId = 0;
  // user1 = {
  //   id: 0,
  //   name: '',
  //   email: '',
  //   phoneNumber: '',
  //   isEmailVerified: false,
  //   isPhoneVerified: false,
  //   userType: '',
  //   createdAt: new Date(),
  //   updatedAt: new Date()
  // };
  constructor(private userService: UserService,
    public auth: Auth
   ) {}

  ngOnInit(): void {
    // this.userId = Number(this.auth.getUserId()); // ✅ replace with logged-in user ID (from JWT/localStorage)
    // if (this.userId) {
    //   this.loadUser(this.userId);
    // }

    this.initialLoadUser();
  }

  initialLoadUser() {
    this.userId = Number(this.auth.getUserId());
    if (this.userId) {
      this.loadUser(this.userId);
    }
  }
  

  //  loadUser(userData: GetUserRequest) {
  //   this.userService.getUser(userData).subscribe(
  //     (data) => {
  //       this.user = data;
  //     },
  //     (error) => {
  //       console.error('Error fetching user data', error);
  //     }
  //   );
  // }

  loadUser(userId: number) {
    this.userService.getUser(userId).subscribe({
      next: (response) => {
        this.user = response;
      },
      error: (error) => {
        console.error('Error fetching user data', error);
      }
    });
  }

  toggleEdit() {
    this.isEditing = true;
  }

  cancelEdit() {
    this.isEditing = false;
    this.loadUser(this.userId); // Reload original data
  }

  updateProfile(form: any) {
    if (form.valid) {
      this.userService.updateUser(form.value).subscribe(
        (updatedUser) => {
          console.log('Profile updated successfully:', updatedUser);
          this.user = updatedUser.data ? updatedUser.data : this.user;
          this.isEditing = false;
        },
        (error) => {
          console.error('Error updating profile', error);
        }
      );
    }
  }

  // updateProfile(form: any) {
  //   if (form.valid) {
  //     this.userService.updateUser(this.userModel).subscribe(
  //       (response) => {
  //         console.log('Profile updated successfully', response);
  //         this.isEditing = false;
  //       },
  //       (error) => {
  //         console.error('Error updating profile', error);
  //       }
  //     );
  //   }
  // }


  // registerUser(userData: RegisterUserRequest): Observable<ApiResponse<void>> {
  //   return this.api.post<void>('auth/user/register', userData);
  // }
}
