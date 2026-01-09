import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {

    constructor(
      private auth: Auth,
      private router: Router
    ) {}
  
    onSubmit(form: any) {
      if (form.valid) {
        this.auth.login(form.value).subscribe({
          next: (response) => {
            //console.log('Login successful:', response);
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
