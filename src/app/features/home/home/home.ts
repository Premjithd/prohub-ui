import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Auth } from '../../../core/services/auth';
import { AnnouncementBannerComponent } from '../announcement-banner.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, TranslateModule, AnnouncementBannerComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent {
  constructor(private router: Router, public auth: Auth) {}

  isProUser(): boolean {
    return this.auth.getUserType() === 'Pro';
  }

  isAdmin(): boolean {
    return this.auth.getUserType() === 'Admin';
  }

  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  navigateTo(path: string, queryParams?: Record<string, string>) {
    const extras = queryParams ? { queryParams } : {};
    if (path === '/post-job' || path === '/add-service') {
      if (!this.auth.isAuthenticated()) {
        this.router.navigate(['/auth/login']);
      } else {
        this.router.navigate([path], extras);
      }
    } else {
      this.router.navigate([path], extras);
    }
  }
}
