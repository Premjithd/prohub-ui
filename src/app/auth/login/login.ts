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
  userType: string = 'user'; // 'user' or 'pro'

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  onSubmit(form: any) {
    if (form.valid) {
      const loginObservable = this.userType === 'pro'
        ? this.auth.loginPro(form.value)
        : this.auth.login(form.value);

      loginObservable.subscribe({
        next: (response) => {
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('Login failed:', error);
          alert('Login failed. Please try again.');
        },
        complete: () => {
          console.log('Request completed');
        }
      });
    }
  }
}
