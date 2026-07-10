import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Auth } from '../../core/services/auth';
import { getHttpErrorMessage } from '../../core/utils/http-error';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  userType: string = 'user';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(private auth: Auth, private router: Router, private cdr: ChangeDetectorRef) {}

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
          this.router.navigate(['/']);
        } else if (response.role === 'Pro' && response.isProfileComplete === false) {
          this.router.navigate(['/auth/register/pro']);
        } else if (response.isProfileComplete === false) {
          this.router.navigate(['/auth/register/user']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = getHttpErrorMessage(
          error,
          error?.status === 401 ? 'Invalid email or password.' : 'Login failed. Please try again.'
        );
        this.cdr.markForCheck();
      }
    });
  }
}
