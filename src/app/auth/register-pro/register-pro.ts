import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-register-pro',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register-pro.html',
  styleUrls: ['./register-pro.scss']
})
export class RegisterProComponent {

  constructor(private auth: Auth, private router: Router) {}

  onSubmit(form: any) {
    if (form.valid) {
      this.auth.registerPro(form.value).subscribe({
        next: (response) => {
          console.log('Pro registration successful:', response);
          alert('Pro registered successfully!');
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('Pro registration failed:', error);
          alert('Registration failed. Please try again.');
        }
      });
    }
  }
}  

