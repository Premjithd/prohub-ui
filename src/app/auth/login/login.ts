import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  userType: string = 'user'; // 'user', 'pro', or 'admin'
  isLoading: boolean = false;

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  onSubmit(form: any) {
    if (form.valid) {
      console.log('Login attempt for email:', form.value.email);
      this.isLoading = true;
      
      // Use unified login that will determine user type from response
      const loginObservable = this.userType === 'pro'
        ? this.auth.loginPro(form.value)
        : this.auth.login(form.value);

      loginObservable.subscribe({
        next: (response) => {
          console.log('Login successful, response role:', response.role);
          const userType = response.role;
          console.log('User type from response:', userType);
          this.isLoading = false;
          
          // Navigate based on actual user type from response
          if (userType === 'Admin') {
            this.router.navigate(['/admin-users']);
          } else if (userType === 'Pro') {
            this.router.navigate(['/']);
          } else {
            this.router.navigate(['/']);
          }
        },
        error: (error) => {
          console.error('Login failed:', error);
          this.isLoading = false;
          alert('Login failed. Please try again.');
        },
        complete: () => {
          console.log('Login request completed');
        }
      });
    }
  }
}
