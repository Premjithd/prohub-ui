import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MaintenanceService } from '../../core/services/maintenance.service';

/**
 * Full-screen page shown while the API is in maintenance mode. The message comes
 * from the server (appsettings Maintenance:Message). If maintenance has been
 * lifted, visiting this page sends the user home.
 *
 * Styled with the yProHub design tokens (src/styles.scss) and brand lockup.
 */
@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="mnt-wrap">
      <div class="mnt-card">
        <!-- Brand banner header (app primary gradient) -->
        <div class="mnt-banner">
          <img src="assets/logo/logo-lockup-white.svg" alt="yProHub" class="mnt-logo" />
        </div>

        <div class="mnt-body">
          <div class="mnt-badge"><mat-icon>construction</mat-icon></div>

          <h1 class="mnt-title">We'll be right back</h1>
          <p class="mnt-message">{{ message }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mnt-wrap {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: var(--color-bg-light);
    }

    .mnt-card {
      width: 100%;
      max-width: 460px;
      text-align: center;
      background: #fff;
      border: 1px solid var(--color-border);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(102, 126, 234, 0.12);
    }

    .mnt-banner {
      background: var(--color-primary-gradient);
      padding: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mnt-logo {
      height: 30px;
      width: auto;
    }

    .mnt-body {
      padding: 2.25rem 2rem 2.5rem;
    }

    .mnt-badge {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.25rem;
      border-radius: 18px;
      background: var(--color-primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon { color: #fff; font-size: 32px; width: 32px; height: 32px; }
    }

    .mnt-title {
      margin: 0 0 0.75rem;
      font-size: var(--text-h1);
      font-weight: 700;
      color: var(--color-text);
    }

    .mnt-message {
      margin: 0;
      font-size: var(--text-body);
      color: var(--color-text-muted);
      line-height: 1.6;
    }
  `]
})
export class MaintenanceComponent implements OnInit {
  message = 'yProHub is undergoing scheduled maintenance. We\'ll be back shortly.';

  constructor(
    private maintenance: MaintenanceService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.maintenance.getStatus().subscribe({
      next: (status) => {
        if (!status.enabled) {
          this.router.navigate(['/']);
          return;
        }
        if (status.message) this.message = status.message;
        this.cdr.markForCheck();
      },
      // If the status call itself fails, just keep the default message.
      error: () => {}
    });
  }
}
