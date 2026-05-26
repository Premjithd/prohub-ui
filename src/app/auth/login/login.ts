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
  userType: string = 'user';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private auth: Auth, private router: Router) {}

  onSubmit(form: any) {
    if (!form.valid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const loginObservable = this.userType === 'pro'
      ? this.auth.loginPro(form.value)
      : this.auth.login(form.value);

    loginObservable.subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.role === 'Admin') {
          this.router.navigate(['/admin-users']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message ?? 'Login failed. Please try again.';
      }
    });
  }
}
