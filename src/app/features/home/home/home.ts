import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent {
  constructor(private router: Router, public auth: Auth) {}

  isProUser(): boolean {
    return this.auth.getUserType() === 'Pro';
  }

  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  navigateTo(path: string) {
    // For post-job path, check if user is logged in
    if (path === '/post-job') {
      if (!this.auth.isAuthenticated()) {
        // Redirect to login if not authenticated
        this.router.navigate(['/auth/login']);
      } else {
        // Navigate to post-job if authenticated
        this.router.navigate([path]);
      }
    } else if (path === '/add-service') {
      if (!this.auth.isAuthenticated()) {
        // Redirect to login if not authenticated
        this.router.navigate(['/auth/login']);
      } else {
        // Navigate to add-service if authenticated
        this.router.navigate([path]);
      }
    } else {
      // Use Angular router to navigate within the SPA for other paths
      this.router.navigate([path]);
    }
  }
}
