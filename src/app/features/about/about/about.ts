import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Auth } from '../../../core/services/auth';
import { ReviewService } from '../../../services/review.service';
import { PlatformRatingStats } from '../../../models/review.model';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './about.html',
  styleUrl: './about.scss'
})
export class AboutComponent implements OnInit {
  platformStats: PlatformRatingStats | null = null;

  constructor(
    private router: Router,
    private auth: Auth,
    private reviewService: ReviewService
  ) {}

  ngOnInit(): void {
    this.reviewService.getPlatformStats().subscribe({
      next: (stats) => { this.platformStats = stats; }
    });
  }

  navigateTo(path: string): void {
    if (path === '/auth/login') {
      if (this.auth.isAuthenticated()) {
        this.router.navigate(['/services']);
      } else {
        this.router.navigate(['/auth/login']);
      }
    } else {
      this.router.navigate([path]);
    }
  }
}
