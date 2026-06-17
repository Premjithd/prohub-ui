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
      <span class="ann-text">{{ message }}</span>
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

    /* Classic marquee: text starts just past the right edge and scrolls left. */
    .ann-text {
      display: inline-block;
      padding-left: 100%;
      will-change: transform;
      animation: ann-marquee 20s linear infinite;
    }

    .ann-banner:hover .ann-text { animation-play-state: paused; }

    @keyframes ann-marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-100%); }
    }

    @media (prefers-reduced-motion: reduce) {
      .ann-text {
        animation: none;
        padding-left: 0;
        display: block;
        text-align: center;
        white-space: normal;
      }
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
