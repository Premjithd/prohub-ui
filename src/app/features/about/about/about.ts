import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Auth } from '../../../core/services/auth';
import { ReviewService } from '../../../services/review.service';
import { PlatformRatingStats } from '../../../models/review.model';
import { TeamService, TeamMember } from '../../../core/services/team.service';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './about.html',
  styleUrl: './about.scss'
})
export class AboutComponent implements OnInit {
  platformStats: PlatformRatingStats | null = null;
  showTeam = false;
  teamMembers: TeamMember[] = [];

  constructor(
    private router: Router,
    private auth: Auth,
    private reviewService: ReviewService,
    private teamService: TeamService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.reviewService.getPlatformStats().subscribe({
      next: (stats) => { this.platformStats = stats; }
    });

    // "Our Team" is hidden unless an admin has explicitly enabled it.
    this.settingsService.getSetting('show_our_team').subscribe({
      next: (value) => {
        this.showTeam = value === 'true';
        if (this.showTeam) {
          this.teamService.getPublic().subscribe({
            next: (members) => { this.teamMembers = members ?? []; }
          });
        }
      },
      error: () => { this.showTeam = false; }
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
