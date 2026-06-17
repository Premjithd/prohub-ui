import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BannerService } from '../../core/services/banner.service';

/**
 * Configurable running (marquee) announcement banner. Shows nothing unless the
 * server reports Banner:Enabled = true (appsettings). The message scrolls
 * continuously and is duplicated so the loop has no visible gap.
 * Styled with the yProHub design tokens (src/styles.scss).
 */
@Component({
  selector: 'app-announcement-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ann-banner" *ngIf="enabled && message" role="status" aria-live="polite">
      <div class="ann-track">
        <span class="ann-item">{{ message }}</span>
        <span class="ann-item" aria-hidden="true">{{ message }}</span>
      </div>
    </div>
  `,
  styles: [`
    .ann-banner {
      background: var(--color-primary-gradient);
      color: #fff;
      overflow: hidden;
      white-space: nowrap;
      padding: 0.55rem 0;
      font-size: var(--text-small);
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .ann-track {
      display: inline-flex;
      will-change: transform;
      animation: ann-marquee 22s linear infinite;
    }

    .ann-item { padding: 0 3rem; }

    .ann-banner:hover .ann-track { animation-play-state: paused; }

    @keyframes ann-marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }

    @media (prefers-reduced-motion: reduce) {
      .ann-track { animation: none; }
      .ann-banner { text-align: center; white-space: normal; }
      .ann-item:nth-child(2) { display: none; }
    }
  `]
})
export class AnnouncementBannerComponent implements OnInit {
  enabled = false;
  message = '';

  constructor(private banner: BannerService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.banner.getBanner().subscribe({
      next: (b) => {
        this.enabled = b.enabled;
        this.message = b.message;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }
}
