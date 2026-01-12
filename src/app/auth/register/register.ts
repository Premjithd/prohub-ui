import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-register-user',
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterUserComponent {

  constructor(private auth: Auth, private router: Router) {}

  onSubmit(form: any) {
    if (form.valid) {
      this.auth.registerUser(form.value).subscribe({
        next: (response) => {
          console.log('User registration successful:', response);
          alert('User registered successfully!');
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('User registration failed:', error);
          alert('Registration failed. Please try again.');
        }
      });
    }
  }
}
