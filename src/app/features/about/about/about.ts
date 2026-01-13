import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-about',
  imports: [],
  templateUrl: './about.html',
  styleUrl: './about.scss'
})
export class AboutComponent {
  constructor(private router: Router, private auth: Auth) {}

  navigateTo(path: string): void {
    // If navigating to find a professional, check authentication
    if (path === '/auth/login') {
      if (this.auth.isAuthenticated()) {
        // If user is logged in, redirect to services page
        this.router.navigate(['/services']);
      } else {
        // If user is not logged in, redirect to login
        this.router.navigate(['/auth/login']);
      }
    } else {
      this.router.navigate([path]);
    }
  }
}
